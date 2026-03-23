/**
 * store/appStore.ts — PRISM v3 (refactored)
 *
 * Zustand store with Immer middleware.
 * Types in store/types.ts, selectors in store/selectors.ts.
 *
 * Pattern: optimistic local update → async Supabase persist → rollback on error.
 * Architecture mutations use debounced sync (1s silence).
 */
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { DEFAULT_CHANNEL, DEFAULT_PROJECT, DEFAULT_SIF } from '@/core/models/defaults'
import {
  clearLocalSIFAssumptions,
  saveLocalSIFAssumptions,
} from '@/core/models/sifAssumptions'
import {
  dbCreateProject, dbUpdateProject, dbDeleteProject,
  dbCreateSIF, dbUpdateSIF, dbDeleteSIF,
  dbUpsertProcedure,
  dbCreateCampaign, dbUpdateCampaign, dbDeleteCampaign,
  dbFetchRevisions, dbCreateRevision, dbDeleteRevision,
} from '@/lib/db'
import { uploadRevisionArtifact, removeRevisionArtifact } from '@/lib/revisionArtifacts'
import {
  createDefaultRevisionArtifact,
  buildRevisionArtifactPath,
  incrementRevisionLabel,
} from '@/core/models/revisionWorkflow'
import {
  buildProofTestCampaignArtifactPath,
  createDefaultProofTestCampaignArtifact,
} from '@/core/models/proofTestCampaignWorkflow'
import { calcSIF } from '@/core/math/pfdCalc'
import {
  DEFAULT_SIF_ANALYSIS_SETTINGS,
  analysisSettingsToMissionTimeHours,
  loadSIFAnalysisSettings,
} from '@/core/models/analysisSettings'
import {
  DEFAULT_APP_PREFERENCES,
  applyAppPreferencesToDocument,
  loadAppPreferences,
  resolveAppPreferences,
  saveAppPreferences,
} from '@/core/models/appPreferences'
import { buildSILReportPdfBlob } from '@/components/report/silReportPdf'
import { buildProofTestPdfBlob } from '@/components/prooftest/proofTestPdf'
import {
  fetchProfile,
  getCurrentSession,
  requestPasswordReset,
  signInWithOAuthProvider,
  signInWithPasswordCredentials,
  signOutCurrentUser,
  signUpWithPasswordCredentials,
  subscribeToAuthState,
  upsertProfileFromUser,
} from '@/lib/auth'
import {
  dbArchiveComponentTemplate,
  dbDeleteComponentTemplate,
  dbFetchComponentTemplates,
  dbSaveComponentTemplate,
  dbUpsertComponentTemplates,
} from '@/lib/componentTemplates'
import {
  dbAddProjectMemberByEmail,
  dbCreateProjectRole,
  dbDeleteProjectRole,
  dbFetchProjectAccess,
  dbInitializeProjectAccess,
  dbRemoveProjectMember,
  dbSetProjectRolePermission,
  dbUpdateProjectMemberRole,
  dbUpdateProjectMemberStatus,
  dbUpdateProjectRole,
} from '@/lib/projectAccess'
import type {
  ComponentTemplate,
  Project,
  ProjectAccessSnapshot,
  ProjectMemberStatus,
  ProjectPermissionKey,
  SIF,
  SIFRevision,
} from '@/core/types'
import { normalizeSIFTab, type AppState } from './types'
import { selectSIF } from './selectors'
import type { Subscription } from '@supabase/supabase-js'

// Re-export types for backward compatibility
export type { AppView, SIFTab, SettingsSection, AppState } from './types'
export { SETTINGS_SECTIONS, normalizeSIFTab } from './types'
export {
  selectProject,
  selectSIF,
  selectCurrentSIF,
  selectSIFCalc,
  selectSIFEngineResult,
  selectCurrentSIFCalc,
  selectCurrentSIFEngineResult,
} from './selectors'

// ─── Debounced architecture sync ───────────────────────────────────────────
const archSyncTimers = new Map<string, ReturnType<typeof setTimeout>>()
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
let authSubscription: Subscription | null = null
let authInitPromise: Promise<void> | null = null

function isUuid(value: string | null | undefined): value is string {
  return !!value && UUID_RE.test(value)
}

function ensureUuid(value: string | null | undefined): string {
  return isUuid(value) ? value : crypto.randomUUID()
}

function scheduleArchSync(sifId: string, getSIF: () => ReturnType<typeof selectSIF>) {
  const existing = archSyncTimers.get(sifId)
  if (existing) clearTimeout(existing)

  archSyncTimers.set(sifId, setTimeout(async () => {
    archSyncTimers.delete(sifId)
    const sif = getSIF()
    if (!sif || sif.revisionLockedAt) return
    try {
      await dbUpdateSIF(sifId, { subsystems: sif.subsystems })
    } catch (err) {
      console.error('[PRISM] Architecture sync failed:', err)
    }
  }, 1000))
}

// ─── Helper: find SIF with path traversal ──────────────────────────────────
// Reusable inside immer mutations (where state is a Draft)
const findSIF = (s: AppState, projectId: string, sifId: string) =>
  s.projects.find(p => p.id === projectId)?.sifs.find(sf => sf.id === sifId)

const findChannel = (s: AppState, projectId: string, sifId: string, subsystemId: string, channelId: string) =>
  findSIF(s, projectId, sifId)
    ?.subsystems.find(sub => sub.id === subsystemId)
    ?.channels.find(ch => ch.id === channelId)

function relabelChannels<T extends { label: string }>(channels: T[]): T[] {
  return channels.map((channel, index) => ({
    ...channel,
    label: `Channel ${index + 1}`,
  }))
}

function getProjectAndSIF(state: AppState, projectId: string, sifId: string): { project: Project; sif: SIF } | null {
  const project = state.projects.find(entry => entry.id === projectId)
  const sif = project?.sifs.find(entry => entry.id === sifId)
  return project && sif ? { project, sif } : null
}

function ensureSIFEditable(
  get: () => AppState,
  set: (recipe: (state: AppState) => void) => void,
  projectId: string,
  sifId: string,
): boolean {
  const found = getProjectAndSIF(get(), projectId, sifId)
  if (!found) return false
  if (!found.sif.revisionLockedAt) return true

  const message = `Revision ${found.sif.revision} is locked. Create a new revision to modify this SIF.`
  set(s => { s.syncError = message })
  return false
}

function ensureProofTestCampaignWritable(
  get: () => AppState,
  set: (recipe: (state: AppState) => void) => void,
  projectId: string,
  sifId: string,
): boolean {
  const found = getProjectAndSIF(get(), projectId, sifId)
  if (!found) return false
  if (!found.sif.proofTestProcedure) {
    set(s => { s.syncError = 'No proof test procedure is linked to this SIF.' })
    return false
  }
  if (!found.sif.revisionLockedAt) return true
  if (found.sif.proofTestProcedure.status === 'approved') return true

  const message = `Revision ${found.sif.revision} is locked and its proof test procedure is not approved.`
  set(s => { s.syncError = message })
  return false
}

function applySIFPatch(state: AppState, projectId: string, sifId: string, patch: Partial<SIF>) {
  const sif = findSIF(state, projectId, sifId)
  if (sif) Object.assign(sif, patch)
}

function upsertComponentTemplates(
  current: ComponentTemplate[],
  incoming: ComponentTemplate[],
): ComponentTemplate[] {
  const next = [...current]
  for (const template of incoming) {
    const idx = next.findIndex(entry => entry.id === template.id)
    if (idx >= 0) next[idx] = template
    else next.unshift(template)
  }
  return next.sort((a, b) => {
    const left = a.updatedAt ?? a.createdAt ?? ''
    const right = b.updatedAt ?? b.createdAt ?? ''
    return right.localeCompare(left)
  })
}

async function syncProjectAccessIntoState(
  set: (recipe: (state: AppState) => void) => void,
  projectId: string,
): Promise<ProjectAccessSnapshot> {
  const snapshot = await dbFetchProjectAccess(projectId)
  set(state => {
    state.projectAccessByProject[projectId] = snapshot
    state.projectAccessLoading = false
    state.projectAccessError = null
  })
  return snapshot
}

async function resolveProfileFromAuthState(user: AppState['authUser']) {
  if (!user) return null
  try {
    return await upsertProfileFromUser(user)
  } catch {
    return await fetchProfile(user.id)
  }
}

const INITIAL_APP_PREFERENCES = loadAppPreferences()

// ─── Store ─────────────────────────────────────────────────────────────────
export const useAppStore = create<AppState>()(
  devtools(
    immer((set, get) => ({

      // ══════════════════════════════════════════════════════════════════════
      // INITIAL STATE
      // ══════════════════════════════════════════════════════════════════════
      projects: [],
      revisions: {},
      isDark: INITIAL_APP_PREFERENCES.theme === 'dark',
      preferences: INITIAL_APP_PREFERENCES,
      authSession: null,
      authUser: null,
      profile: null,
      authLoading: true,
      authError: null,
      componentTemplates: [],
      componentTemplatesLoading: false,
      componentTemplatesError: null,
      projectAccessByProject: {},
      projectAccessLoading: false,
      projectAccessError: null,
      projectAccessProjectId: null,
      isSyncing: false,
      syncError: null,
      view: { type: 'projects' },
      selectedComponentId: null,
      pinnedSIFIds: [],
      rightPanelTabs: {
        analysis: null,
        compliance: null,
        prooftest: null,
        verification: null,
        exploitation: null,
      },
      isProjectModalOpen: false,
      editingProjectId: null,
      isSIFModalOpen: false,
      editingSIFId: null,
      newSIFProjectId: null,

      // Layout panels
      leftPanelOpen: true,
      rightPanelOpen: true,
      focusMode: false,

      // Split view
      secondSlot: null,

      // ══════════════════════════════════════════════════════════════════════
      // NAVIGATION
      // ══════════════════════════════════════════════════════════════════════
      navigate: view => {
        set(s => {
          if (view.type === 'sif-dashboard') {
            s.view = { ...view, tab: normalizeSIFTab(view.tab) }
            return
          }
          s.view = view
        })
        // Desktop mode: signal the Launcher to record this project access
        if (view.type === 'sif-dashboard') {
          const project = get().projects.find(p => p.id === view.projectId)
          if (project) {
            ;(window as { prismDesktop?: { recordRecentProject?: (d: unknown) => void } })
              .prismDesktop?.recordRecentProject?.({
                id:       project.id,
                name:     project.name,
                standard: project.standard,
                sifCount: project.sifs.length,
                openedAt: new Date().toISOString(),
              })
          }
        }
      },

      setTab: tab => set(s => {
        if (s.view.type === 'sif-dashboard') s.view.tab = normalizeSIFTab(tab)
      }),

      togglePinnedSIF: sifId => set(s => {
        const idx = s.pinnedSIFIds.indexOf(sifId)
        if (idx >= 0) s.pinnedSIFIds.splice(idx, 1)
        else s.pinnedSIFIds.unshift(sifId)
      }),

      setRightPanelTab: (section, tab) => set(s => {
        s.rightPanelTabs[section] = tab
      }),

      toggleTheme: () => {
        const nextPreferences = resolveAppPreferences({
          ...get().preferences,
          theme: get().preferences.theme === 'dark' ? 'light' : 'dark',
        })
        saveAppPreferences(nextPreferences)
        applyAppPreferencesToDocument(nextPreferences)
        set(s => {
          s.preferences = nextPreferences
          s.isDark = nextPreferences.theme === 'dark'
        })
      },
      setTheme: isDark => {
        const nextPreferences = resolveAppPreferences({
          ...get().preferences,
          theme: isDark ? 'dark' : 'light',
        })
        saveAppPreferences(nextPreferences)
        applyAppPreferencesToDocument(nextPreferences)
        set(s => {
          s.preferences = nextPreferences
          s.isDark = nextPreferences.theme === 'dark'
        })
      },
      updateAppPreferences: patch => {
        const nextPreferences = resolveAppPreferences({
          ...get().preferences,
          ...patch,
        })
        saveAppPreferences(nextPreferences)
        applyAppPreferencesToDocument(nextPreferences)
        set(s => {
          s.preferences = nextPreferences
          s.isDark = nextPreferences.theme === 'dark'
        })
      },
      resetAppPreferences: () => {
        const nextPreferences = DEFAULT_APP_PREFERENCES
        saveAppPreferences(nextPreferences)
        applyAppPreferencesToDocument(nextPreferences)
        set(s => {
          s.preferences = nextPreferences
          s.isDark = nextPreferences.theme === 'dark'
        })
      },

      // ── Layout panels ──────────────────────────────────────────────────────
      toggleLeftPanel: () => set(s => { s.leftPanelOpen = !s.leftPanelOpen }),
      toggleRightPanel: () => set(s => { s.rightPanelOpen = !s.rightPanelOpen }),
      setRightPanelOpen: (open) => set(s => { s.rightPanelOpen = open }),
      toggleFocusMode: () => set(s => {
        s.focusMode = !s.focusMode
        // Exit focus mode always restores both panels
        if (!s.focusMode) {
          s.leftPanelOpen = true
          s.rightPanelOpen = true
        }
      }),

      // ── Split view ─────────────────────────────────────────────────────────
      openSecondSlot: () => set(s => {
        s.secondSlot = { projectId: null, sifId: null, tab: 'cockpit' }
      }),
      closeSecondSlot: () => set(s => { s.secondSlot = null }),
      resetSecondSlot: () => set(s => {
        if (s.secondSlot) { s.secondSlot.projectId = null; s.secondSlot.sifId = null; s.secondSlot.tab = 'cockpit' }
      }),
      loadSIFInSecondSlot: (projectId, sifId) => set(s => {
        if (s.secondSlot) {
          s.secondSlot.projectId = projectId
          s.secondSlot.sifId     = sifId
          s.secondSlot.tab       = 'cockpit'
        } else {
          s.secondSlot = { projectId, sifId, tab: 'cockpit' }
        }
      }),
      setSecondSlotTab: (tab) => set(s => {
        if (s.secondSlot) s.secondSlot.tab = tab
      }),
      initializeAuth: async () => {
        if (authInitPromise) return authInitPromise

        set(s => {
          s.authLoading = true
          s.authError = null
        })

        authInitPromise = (async () => {
          if (!authSubscription) {
            authSubscription = subscribeToAuthState((_event, session) => {
              void (async () => {
                try {
                  const profile = await resolveProfileFromAuthState(session?.user ?? null)
                  set(s => {
                    s.authSession = session
                    s.authUser = session?.user ?? null
                    s.profile = profile
                    s.authLoading = false
                    s.authError = null
                    if (!session?.user) {
                      s.componentTemplates = []
                      s.componentTemplatesError = null
                      s.componentTemplatesLoading = false
                      s.projectAccessByProject = {}
                      s.projectAccessError = null
                      s.projectAccessLoading = false
                      s.projectAccessProjectId = null
                    }
                  })
                } catch (err: unknown) {
                  set(s => {
                    s.authSession = session
                    s.authUser = session?.user ?? null
                    s.profile = null
                    s.authLoading = false
                    s.authError = err instanceof Error ? err.message : String(err)
                    if (!session?.user) {
                      s.componentTemplates = []
                      s.componentTemplatesError = null
                      s.componentTemplatesLoading = false
                      s.projectAccessByProject = {}
                      s.projectAccessError = null
                      s.projectAccessLoading = false
                      s.projectAccessProjectId = null
                    }
                  })
                }
              })()
            })
          }

          try {
            const session = await getCurrentSession()
            const profile = await resolveProfileFromAuthState(session?.user ?? null)
            set(s => {
              s.authSession = session
              s.authUser = session?.user ?? null
              s.profile = profile
              s.authLoading = false
              s.authError = null
              if (!session?.user) {
                s.componentTemplates = []
                s.componentTemplatesError = null
                s.componentTemplatesLoading = false
                s.projectAccessByProject = {}
                s.projectAccessError = null
                s.projectAccessLoading = false
                s.projectAccessProjectId = null
              }
            })
          } catch (err: unknown) {
            set(s => {
              s.authLoading = false
              s.authError = err instanceof Error ? err.message : String(err)
            })
          }
        })().finally(() => {
          authInitPromise = null
        })

        return authInitPromise
      },
      refreshProfile: async () => {
        const user = get().authUser
        if (!user) {
          set(s => { s.profile = null })
          return
        }

        set(s => { s.authError = null })
        try {
          const profile = await resolveProfileFromAuthState(user)
          set(s => { s.profile = profile })
        } catch (err: unknown) {
          set(s => { s.authError = err instanceof Error ? err.message : String(err) })
          throw err
        }
      },
      signInWithOAuth: async (provider) => {
        set(s => {
          s.authError = null
          s.authLoading = true
        })
        try {
          await signInWithOAuthProvider(provider)
        } catch (err: unknown) {
          set(s => {
            s.authLoading = false
            s.authError = err instanceof Error ? err.message : String(err)
          })
          throw err
        }
      },
      signInWithPassword: async (email, password) => {
        set(s => {
          s.authError = null
          s.authLoading = true
        })
        try {
          await signInWithPasswordCredentials(email, password)
        } catch (err: unknown) {
          set(s => {
            s.authLoading = false
            s.authError = err instanceof Error ? err.message : String(err)
          })
          throw err
        }
      },
      signUpWithPassword: async (email, password, fullName, metadata) => {
        set(s => {
          s.authError = null
          s.authLoading = true
        })
        try {
          const result = await signUpWithPasswordCredentials(email, password, fullName, metadata)
          if (result === 'pending_confirmation') {
            set(s => {
              s.authLoading = false
            })
          }
          return result
        } catch (err: unknown) {
          set(s => {
            s.authLoading = false
            s.authError = err instanceof Error ? err.message : String(err)
          })
          throw err
        }
      },
      requestPasswordReset: async (email) => {
        set(s => { s.authError = null })
        try {
          await requestPasswordReset(email)
        } catch (err: unknown) {
          set(s => { s.authError = err instanceof Error ? err.message : String(err) })
          throw err
        }
      },
      signOut: async () => {
        set(s => { s.authError = null })
        try {
          await signOutCurrentUser()
          set(s => {
            s.authSession = null
            s.authUser = null
            s.profile = null
            s.authLoading = false
            s.componentTemplates = []
            s.componentTemplatesError = null
            s.componentTemplatesLoading = false
            s.projectAccessByProject = {}
            s.projectAccessError = null
            s.projectAccessLoading = false
            s.projectAccessProjectId = null
          })
        } catch (err: unknown) {
          set(s => { s.authError = err instanceof Error ? err.message : String(err) })
          throw err
        }
      },
      fetchComponentTemplates: async (includeArchived = false) => {
        set(s => {
          s.componentTemplatesLoading = true
          s.componentTemplatesError = null
        })
        try {
          const templates = await dbFetchComponentTemplates(includeArchived)
          set(s => {
            s.componentTemplates = templates
            s.componentTemplatesLoading = false
            s.componentTemplatesError = null
          })
        } catch (err: unknown) {
          set(s => {
            s.componentTemplatesLoading = false
            s.componentTemplatesError = err instanceof Error ? err.message : String(err)
          })
          throw err
        }
      },
      saveComponentTemplate: async (input) => {
        set(s => { s.componentTemplatesError = null })
        try {
          const template = await dbSaveComponentTemplate(input)
          set(s => {
            s.componentTemplates = upsertComponentTemplates(s.componentTemplates, [template])
          })
          return template
        } catch (err: unknown) {
          set(s => { s.componentTemplatesError = err instanceof Error ? err.message : String(err) })
          throw err
        }
      },
      importComponentTemplates: async (inputs) => {
        set(s => {
          s.componentTemplatesLoading = true
          s.componentTemplatesError = null
        })
        try {
          const imported = await dbUpsertComponentTemplates(inputs)
          set(s => {
            s.componentTemplates = upsertComponentTemplates(s.componentTemplates, imported)
            s.componentTemplatesLoading = false
          })
          return imported
        } catch (err: unknown) {
          set(s => {
            s.componentTemplatesLoading = false
            s.componentTemplatesError = err instanceof Error ? err.message : String(err)
          })
          throw err
        }
      },
      archiveComponentTemplate: async (templateId) => {
        set(s => { s.componentTemplatesError = null })
        try {
          const archived = await dbArchiveComponentTemplate(templateId)
          set(s => {
            s.componentTemplates = upsertComponentTemplates(s.componentTemplates, [archived])
          })
        } catch (err: unknown) {
          set(s => { s.componentTemplatesError = err instanceof Error ? err.message : String(err) })
          throw err
        }
      },
      deleteComponentTemplate: async (templateId) => {
        set(s => { s.componentTemplatesError = null })
        try {
          await dbDeleteComponentTemplate(templateId)
          set(s => {
            s.componentTemplates = s.componentTemplates.filter(template => template.id !== templateId)
          })
        } catch (err: unknown) {
          set(s => { s.componentTemplatesError = err instanceof Error ? err.message : String(err) })
          throw err
        }
      },
      openProjectAccess: (projectId) => set(s => {
        s.projectAccessProjectId = projectId
        s.projectAccessError = null
      }),
      closeProjectAccess: () => set(s => {
        s.projectAccessProjectId = null
        s.projectAccessError = null
      }),
      fetchProjectAccess: async (projectId) => {
        set(s => {
          s.projectAccessLoading = true
          s.projectAccessError = null
        })
        try {
          await syncProjectAccessIntoState(set, projectId)
        } catch (err: unknown) {
          set(s => {
            s.projectAccessLoading = false
            s.projectAccessError = err instanceof Error ? err.message : String(err)
          })
          throw err
        }
      },
      initializeProjectAccess: async (projectId) => {
        set(s => {
          s.projectAccessLoading = true
          s.projectAccessError = null
        })
        try {
          await dbInitializeProjectAccess(projectId)
          await syncProjectAccessIntoState(set, projectId)
        } catch (err: unknown) {
          set(s => {
            s.projectAccessLoading = false
            s.projectAccessError = err instanceof Error ? err.message : String(err)
          })
          throw err
        }
      },
      createProjectRole: async (projectId, input) => {
        set(s => {
          s.projectAccessLoading = true
          s.projectAccessError = null
        })
        try {
          await dbCreateProjectRole({ projectId, ...input })
          await syncProjectAccessIntoState(set, projectId)
        } catch (err: unknown) {
          set(s => {
            s.projectAccessLoading = false
            s.projectAccessError = err instanceof Error ? err.message : String(err)
          })
          throw err
        }
      },
      updateProjectRole: async (projectId, roleId, patch) => {
        set(s => {
          s.projectAccessLoading = true
          s.projectAccessError = null
        })
        try {
          await dbUpdateProjectRole(roleId, patch)
          await syncProjectAccessIntoState(set, projectId)
        } catch (err: unknown) {
          set(s => {
            s.projectAccessLoading = false
            s.projectAccessError = err instanceof Error ? err.message : String(err)
          })
          throw err
        }
      },
      deleteProjectRole: async (projectId, roleId) => {
        set(s => {
          s.projectAccessLoading = true
          s.projectAccessError = null
        })
        try {
          await dbDeleteProjectRole(roleId)
          await syncProjectAccessIntoState(set, projectId)
        } catch (err: unknown) {
          set(s => {
            s.projectAccessLoading = false
            s.projectAccessError = err instanceof Error ? err.message : String(err)
          })
          throw err
        }
      },
      setProjectRolePermission: async (projectId, roleId, permission, enabled) => {
        set(s => {
          s.projectAccessLoading = true
          s.projectAccessError = null
        })
        try {
          await dbSetProjectRolePermission(roleId, permission, enabled)
          await syncProjectAccessIntoState(set, projectId)
        } catch (err: unknown) {
          set(s => {
            s.projectAccessLoading = false
            s.projectAccessError = err instanceof Error ? err.message : String(err)
          })
          throw err
        }
      },
      addProjectMemberByEmail: async (projectId, email, roleId) => {
        set(s => {
          s.projectAccessLoading = true
          s.projectAccessError = null
        })
        try {
          await dbAddProjectMemberByEmail(projectId, email, roleId)
          await syncProjectAccessIntoState(set, projectId)
        } catch (err: unknown) {
          set(s => {
            s.projectAccessLoading = false
            s.projectAccessError = err instanceof Error ? err.message : String(err)
          })
          throw err
        }
      },
      updateProjectMemberRole: async (projectId, memberId, roleId) => {
        set(s => {
          s.projectAccessLoading = true
          s.projectAccessError = null
        })
        try {
          await dbUpdateProjectMemberRole(memberId, roleId)
          await syncProjectAccessIntoState(set, projectId)
        } catch (err: unknown) {
          set(s => {
            s.projectAccessLoading = false
            s.projectAccessError = err instanceof Error ? err.message : String(err)
          })
          throw err
        }
      },
      updateProjectMemberStatus: async (projectId, memberId, status) => {
        set(s => {
          s.projectAccessLoading = true
          s.projectAccessError = null
        })
        try {
          await dbUpdateProjectMemberStatus(memberId, status)
          await syncProjectAccessIntoState(set, projectId)
        } catch (err: unknown) {
          set(s => {
            s.projectAccessLoading = false
            s.projectAccessError = err instanceof Error ? err.message : String(err)
          })
          throw err
        }
      },
      removeProjectMember: async (projectId, memberId) => {
        set(s => {
          s.projectAccessLoading = true
          s.projectAccessError = null
        })
        try {
          await dbRemoveProjectMember(memberId)
          await syncProjectAccessIntoState(set, projectId)
        } catch (err: unknown) {
          set(s => {
            s.projectAccessLoading = false
            s.projectAccessError = err instanceof Error ? err.message : String(err)
          })
          throw err
        }
      },

      // ══════════════════════════════════════════════════════════════════════
      // DATA
      // ══════════════════════════════════════════════════════════════════════
      setProjects: projects => set(s => {
        s.projects = projects
        s.pinnedSIFIds = s.pinnedSIFIds.filter(id =>
          projects.some(p => p.sifs.some(sif => sif.id === id)),
        )
      }),
      setSyncError: err => set(s => { s.syncError = err }),
      setAuthError: err => set(s => { s.authError = err }),
      setComponentTemplatesError: err => set(s => { s.componentTemplatesError = err }),
      setProjectAccessError: err => set(s => { s.projectAccessError = err }),

      // ══════════════════════════════════════════════════════════════════════
      // PROJECTS CRUD (optimistic + Supabase)
      // ══════════════════════════════════════════════════════════════════════
      openNewProject: () => set(s => { s.isProjectModalOpen = true; s.editingProjectId = null }),
      openEditProject: id => set(s => { s.isProjectModalOpen = true; s.editingProjectId = id }),
      closeProjectModal: () => set(s => { s.isProjectModalOpen = false; s.editingProjectId = null }),

      createProject: async (data) => {
        const id = crypto.randomUUID()
        const project = { ...DEFAULT_PROJECT(), ...data, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), sifs: [] }
        set(s => { s.projects.push(project) })
        try {
          await dbCreateProject(id, data)
          try {
            await dbInitializeProjectAccess(id)
            await syncProjectAccessIntoState(set, id)
          } catch (accessErr: unknown) {
            set(s => {
              s.projectAccessError = accessErr instanceof Error ? accessErr.message : String(accessErr)
            })
          }
        } catch (err: unknown) {
          set(s => { s.projects = s.projects.filter(p => p.id !== id) })
          set(s => { s.syncError = err instanceof Error ? err.message : String(err) })
          throw err
        }
        return project
      },

      updateProject: async (id, data) => {
        set(s => {
          const p = s.projects.find(p => p.id === id)
          if (p) Object.assign(p, data, { updatedAt: new Date().toISOString() })
        })
        try { await dbUpdateProject(id, data) }
        catch (err: unknown) {
          set(s => { s.syncError = err instanceof Error ? err.message : String(err) })
          throw err
        }
      },

      deleteProject: async (id) => {
        const snapshot = get().projects.find(p => p.id === id)
        const pinnedSnapshot = [...get().pinnedSIFIds]
        set(s => {
          s.projects = s.projects.filter(p => p.id !== id)
          s.pinnedSIFIds = s.pinnedSIFIds.filter(sifId => !snapshot?.sifs.some(sf => sf.id === sifId))
          if (s.view.type === 'sif-dashboard' && s.view.projectId === id) s.view = { type: 'projects' }
        })
        try { await dbDeleteProject(id) }
        catch (err: unknown) {
          if (snapshot) set(s => { s.projects.push(snapshot); s.pinnedSIFIds = pinnedSnapshot })
          set(s => { s.syncError = err instanceof Error ? err.message : String(err) })
          throw err
        }
      },

      // ══════════════════════════════════════════════════════════════════════
      // SIFS CRUD (optimistic + Supabase)
      // ══════════════════════════════════════════════════════════════════════
      openNewSIF: (projectId) => set(s => { s.isSIFModalOpen = true; s.editingSIFId = null; s.newSIFProjectId = projectId ?? null }),
      openEditSIF: id => set(s => { s.isSIFModalOpen = true; s.editingSIFId = id; s.newSIFProjectId = null }),
      closeSIFModal: () => set(s => { s.isSIFModalOpen = false; s.editingSIFId = null; s.newSIFProjectId = null }),

      createSIF: async (projectId, data) => {
        const project = get().projects.find(p => p.id === projectId)
        if (!project) throw new Error(`Projet introuvable: ${projectId}`)
        const nextNum = String((project.sifs.length + 1)).padStart(3, '0')
        const id = crypto.randomUUID()
        const sif = { ...DEFAULT_SIF(projectId, `SIF-${nextNum}`), ...data, id, projectId }
        saveLocalSIFAssumptions(id, sif.assumptions)
        set(s => {
          const p = s.projects.find(p => p.id === projectId)
          if (p) { p.sifs.push(sif); p.updatedAt = new Date().toISOString() }
        })
        try { await dbCreateSIF(id, sif) }
        catch (err: unknown) {
          clearLocalSIFAssumptions(id)
          set(s => { const p = s.projects.find(p => p.id === projectId); if (p) p.sifs = p.sifs.filter(sf => sf.id !== id) })
          set(s => { s.syncError = err instanceof Error ? err.message : String(err) })
          throw err
        }
        return sif
      },

      updateSIF: async (projectId, sifId, data) => {
        if (!ensureSIFEditable(get, set, projectId, sifId)) {
          throw new Error(`Revision is locked for SIF ${sifId}`)
        }
        if (data.assumptions !== undefined) {
          saveLocalSIFAssumptions(sifId, data.assumptions)
        }
        set(s => { applySIFPatch(s, projectId, sifId, data) })
        try { await dbUpdateSIF(sifId, data) }
        catch (err: unknown) {
          set(s => { s.syncError = err instanceof Error ? err.message : String(err) })
          throw err
        }
      },

      deleteSIF: async (projectId, sifId) => {
        const snapshot = selectSIF(get(), projectId, sifId)
        const pinnedSnapshot = [...get().pinnedSIFIds]
        set(s => {
          const p = s.projects.find(p => p.id === projectId)
          if (p) p.sifs = p.sifs.filter(sf => sf.id !== sifId)
          s.pinnedSIFIds = s.pinnedSIFIds.filter(id => id !== sifId)
          if (s.view.type === 'sif-dashboard' && s.view.sifId === sifId) s.view = { type: 'projects' }
        })
        try {
          await dbDeleteSIF(sifId)
          clearLocalSIFAssumptions(sifId)
        }
        catch (err: unknown) {
          if (snapshot) {
            saveLocalSIFAssumptions(sifId, snapshot.assumptions)
            set(s => { const p = s.projects.find(p => p.id === projectId); if (p) p.sifs.push(snapshot); s.pinnedSIFIds = pinnedSnapshot })
          }
          set(s => { s.syncError = err instanceof Error ? err.message : String(err) })
          throw err
        }
      },

      // ══════════════════════════════════════════════════════════════════════
      // ARCHITECTURE (local + debounced Supabase)
      // ══════════════════════════════════════════════════════════════════════
      addSubsystem: (projectId, sifId, subsystem) => {
        if (!ensureSIFEditable(get, set, projectId, sifId)) return
        set(s => { findSIF(s, projectId, sifId)?.subsystems.push(subsystem) })
        scheduleArchSync(sifId, () => selectSIF(get(), projectId, sifId))
      },

      updateSubsystem: (projectId, sifId, subsystem) => {
        if (!ensureSIFEditable(get, set, projectId, sifId)) return
        set(s => {
          const sif = findSIF(s, projectId, sifId)
          if (sif) { const idx = sif.subsystems.findIndex(sub => sub.id === subsystem.id); if (idx >= 0) sif.subsystems[idx] = subsystem }
        })
        scheduleArchSync(sifId, () => selectSIF(get(), projectId, sifId))
      },

      removeSubsystem: (projectId, sifId, subsystemId) => {
        if (!ensureSIFEditable(get, set, projectId, sifId)) return
        set(s => { const sif = findSIF(s, projectId, sifId); if (sif) sif.subsystems = sif.subsystems.filter(sub => sub.id !== subsystemId) })
        scheduleArchSync(sifId, () => selectSIF(get(), projectId, sifId))
      },

      addChannel: (projectId, sifId, subsystemId) => {
        if (!ensureSIFEditable(get, set, projectId, sifId)) return
        set(s => {
          const sif = findSIF(s, projectId, sifId)
          const sub = sif?.subsystems.find(sub => sub.id === subsystemId)
          if (!sif || !sub) return
          sub.channels = relabelChannels([
            ...sub.channels,
            DEFAULT_CHANNEL(sub.type, sub.channels.length, sif.sifNumber),
          ])
        })
        scheduleArchSync(sifId, () => selectSIF(get(), projectId, sifId))
      },

      removeChannel: (projectId, sifId, subsystemId, channelId) => {
        if (!ensureSIFEditable(get, set, projectId, sifId)) return
        set(s => {
          const sub = findSIF(s, projectId, sifId)?.subsystems.find(sub => sub.id === subsystemId)
          if (!sub) return
          if (sub.channels.length <= 1) return
          sub.channels = relabelChannels(sub.channels.filter(ch => ch.id !== channelId))
        })
        scheduleArchSync(sifId, () => selectSIF(get(), projectId, sifId))
      },

      // ══════════════════════════════════════════════════════════════════════
      // COMPONENTS (local + debounced Supabase)
      // ══════════════════════════════════════════════════════════════════════
      selectComponent: id => set(s => { s.selectedComponentId = id }),

      addComponent: (projectId, sifId, subsystemId, channelId, component) => {
        if (!ensureSIFEditable(get, set, projectId, sifId)) return
        set(s => { findChannel(s, projectId, sifId, subsystemId, channelId)?.components.push(component) })
        scheduleArchSync(sifId, () => selectSIF(get(), projectId, sifId))
      },

      updateComponent: (projectId, sifId, subsystemId, channelId, component) => {
        if (!ensureSIFEditable(get, set, projectId, sifId)) return
        set(s => {
          const ch = findChannel(s, projectId, sifId, subsystemId, channelId)
          if (ch) { const idx = ch.components.findIndex(c => c.id === component.id); if (idx >= 0) ch.components[idx] = component }
        })
        scheduleArchSync(sifId, () => selectSIF(get(), projectId, sifId))
      },

      removeComponent: (projectId, sifId, subsystemId, channelId, componentId) => {
        if (!ensureSIFEditable(get, set, projectId, sifId)) return
        set(s => {
          const ch = findChannel(s, projectId, sifId, subsystemId, channelId)
          if (ch) ch.components = ch.components.filter(c => c.id !== componentId)
        })
        scheduleArchSync(sifId, () => selectSIF(get(), projectId, sifId))
      },

      moveComponent: (projectId, sifId, fromSubId, fromChannelId, fromIndex, toSubId, toChannelId, toIndex) => {
        if (!ensureSIFEditable(get, set, projectId, sifId)) return
        set(s => {
          const sif = findSIF(s, projectId, sifId)
          if (!sif) return
          const fromCh = sif.subsystems.find(sub => sub.id === fromSubId)?.channels.find(ch => ch.id === fromChannelId)
          const toCh   = sif.subsystems.find(sub => sub.id === toSubId)?.channels.find(ch => ch.id === toChannelId)
          const toSub  = sif.subsystems.find(sub => sub.id === toSubId)
          if (!fromCh || !toCh) return
          const [moved] = fromCh.components.splice(fromIndex, 1)
          if (moved) { moved.subsystemType = toSub!.type; toCh.components.splice(toIndex, 0, moved) }
        })
        scheduleArchSync(sifId, () => selectSIF(get(), projectId, sifId))
      },

      // ══════════════════════════════════════════════════════════════════════
      // PROOF TEST / CAMPAIGNS / EVENTS / HAZOP (fire-and-forget sync)
      // ══════════════════════════════════════════════════════════════════════
      updateProofTestProcedure: async (projectId, sifId, procedure) => {
        if (!ensureSIFEditable(get, set, projectId, sifId)) {
          throw new Error(`Revision is locked for SIF ${sifId}`)
        }
        const persistedProcedure = { ...procedure, id: ensureUuid(procedure.id) }
        const snapshot = selectSIF(get(), projectId, sifId)?.proofTestProcedure
        set(s => { const sif = findSIF(s, projectId, sifId); if (sif) sif.proofTestProcedure = persistedProcedure })
        try {
          await dbUpsertProcedure({
            id: persistedProcedure.id,
            sifId,
            projectId,
            ref: persistedProcedure.ref,
            revision: persistedProcedure.revision,
            status: persistedProcedure.status,
            periodicityMonths: persistedProcedure.periodicityMonths,
            categories: persistedProcedure.categories,
            steps: persistedProcedure.steps,
            responseChecks: persistedProcedure.responseChecks,
            madeBy: persistedProcedure.madeBy,
            madeByDate: persistedProcedure.madeByDate,
            verifiedBy: persistedProcedure.verifiedBy,
            verifiedByDate: persistedProcedure.verifiedByDate,
            approvedBy: persistedProcedure.approvedBy,
            approvedByDate: persistedProcedure.approvedByDate,
            notes: persistedProcedure.notes,
          })
        } catch (err: unknown) {
          set(s => { const sif = findSIF(s, projectId, sifId); if (sif) sif.proofTestProcedure = snapshot })
          set(s => { s.syncError = err instanceof Error ? err.message : String(err) })
          throw err
        }
      },

      addTestCampaign: async (projectId, sifId, campaign) => {
        if (!ensureProofTestCampaignWritable(get, set, projectId, sifId)) {
          throw new Error(`Proof test campaigns are not writable for SIF ${sifId}`)
        }
        const found = getProjectAndSIF(get(), projectId, sifId)
        if (!found?.sif.proofTestProcedure?.id) {
          const err = new Error('Sauvegarde campagne: aucune procédure de proof test associée à cette SIF')
          set(s => { s.syncError = err.message })
          throw err
        }
        const { project, sif: sifSnapshot } = found
        const currentProcedure = sifSnapshot.proofTestProcedure!
        const campaignId = ensureUuid(campaign.id)
        const procedureSnapshot = campaign.procedureSnapshot
          ? JSON.parse(JSON.stringify(campaign.procedureSnapshot))
          : JSON.parse(JSON.stringify(currentProcedure))
        const closedAt = campaign.closedAt ?? null
        const baseArtifact: ReturnType<typeof createDefaultProofTestCampaignArtifact> = {
          ...createDefaultProofTestCampaignArtifact(),
          ...(campaign.pdfArtifact ?? {}),
        }
        const campaignPath = closedAt
          ? buildProofTestCampaignArtifactPath({
              project,
              sif: sifSnapshot,
              campaignId,
              campaignDate: campaign.date || closedAt.split('T')[0],
            })
          : null
        const initialArtifact: ReturnType<typeof createDefaultProofTestCampaignArtifact> = closedAt && campaignPath
          ? {
              ...baseArtifact,
              bucket: 'prism_prooftest',
              path: campaignPath.path,
              fileName: campaignPath.fileName,
              status: 'pending' as const,
              error: null,
            }
          : baseArtifact
        const persistedCampaign = {
          ...campaign,
          id: campaignId,
          procedureSnapshot,
          closedAt,
          pdfArtifact: initialArtifact,
        }
        const previousCampaigns = [...(sifSnapshot.testCampaigns ?? [])]
        set(s => {
          const sif = findSIF(s, projectId, sifId)
          if (sif) { if (!sif.testCampaigns) sif.testCampaigns = []; sif.testCampaigns.unshift(persistedCampaign) }
        })
        let uploadedArtifact: typeof persistedCampaign.pdfArtifact = persistedCampaign.pdfArtifact
        try {
          let finalizedCampaign = persistedCampaign

          if (closedAt) {
            const proofTestPdf = await buildProofTestPdfBlob({
              project,
              sif: {
                ...sifSnapshot,
                proofTestProcedure: procedureSnapshot,
                testCampaigns: [persistedCampaign],
              },
              procedure: procedureSnapshot,
              campaigns: [persistedCampaign],
            })
            uploadedArtifact = await uploadRevisionArtifact(persistedCampaign.pdfArtifact, proofTestPdf.blob)
            finalizedCampaign = { ...persistedCampaign, pdfArtifact: uploadedArtifact }
          }

          await dbCreateCampaign({
            id: finalizedCampaign.id,
            procedureId: finalizedCampaign.procedureSnapshot?.id || currentProcedure.id,
            sifId,
            projectId,
            date: finalizedCampaign.date,
            team: finalizedCampaign.team,
            verdict: finalizedCampaign.verdict,
            notes: finalizedCampaign.notes,
            conductedBy: finalizedCampaign.conductedBy,
            witnessedBy: finalizedCampaign.witnessedBy,
            stepResults: finalizedCampaign.stepResults,
            responseMeasurements: finalizedCampaign.responseMeasurements,
            procedureSnapshot: finalizedCampaign.procedureSnapshot,
            pdfArtifact: finalizedCampaign.pdfArtifact,
            closedAt: finalizedCampaign.closedAt,
          })
          set(s => {
            const sif = findSIF(s, projectId, sifId)
            if (!sif?.testCampaigns) return
            const idx = sif.testCampaigns.findIndex(entry => entry.id === finalizedCampaign.id)
            if (idx >= 0) sif.testCampaigns[idx] = finalizedCampaign
          })
        } catch (err: unknown) {
          if (uploadedArtifact.status === 'ready') {
            await removeRevisionArtifact(uploadedArtifact)
          }
          set(s => { const sif = findSIF(s, projectId, sifId); if (sif) sif.testCampaigns = previousCampaigns })
          set(s => { s.syncError = err instanceof Error ? err.message : String(err) })
          throw err
        }
      },

      updateTestCampaign: async (projectId, sifId, campaign) => {
        if (!ensureProofTestCampaignWritable(get, set, projectId, sifId)) {
          throw new Error(`Proof test campaigns are not writable for SIF ${sifId}`)
        }
        const sifSnapshot = selectSIF(get(), projectId, sifId)
        if (!sifSnapshot?.proofTestProcedure?.id) {
          const err = new Error('Sauvegarde campagne: aucune procédure de proof test associée à cette SIF')
          set(s => { s.syncError = err.message })
          throw err
        }
        if (campaign.closedAt && campaign.pdfArtifact?.status === 'ready') {
          const err = new Error('This proof test campaign is closed and cannot be modified.')
          set(s => { s.syncError = err.message })
          throw err
        }
        const shouldCreate = !isUuid(campaign.id)
        const persistedCampaign = { ...campaign, id: ensureUuid(campaign.id) }
        const previousCampaigns = [...(selectSIF(get(), projectId, sifId)?.testCampaigns ?? [])]
        set(s => {
          const sif = findSIF(s, projectId, sifId)
          if (sif?.testCampaigns) {
            const idx = sif.testCampaigns.findIndex(c => c.id === campaign.id)
            if (idx >= 0) sif.testCampaigns[idx] = persistedCampaign
          }
        })
        try {
          if (shouldCreate) {
            await dbCreateCampaign({
              id: persistedCampaign.id,
              procedureId: sifSnapshot.proofTestProcedure.id,
              sifId,
              projectId,
              date: persistedCampaign.date,
              team: persistedCampaign.team,
              verdict: persistedCampaign.verdict,
              notes: persistedCampaign.notes,
              conductedBy: persistedCampaign.conductedBy,
              witnessedBy: persistedCampaign.witnessedBy,
              stepResults: persistedCampaign.stepResults,
              responseMeasurements: persistedCampaign.responseMeasurements,
              procedureSnapshot: persistedCampaign.procedureSnapshot,
              pdfArtifact: persistedCampaign.pdfArtifact,
              closedAt: persistedCampaign.closedAt,
            })
          } else {
            await dbUpdateCampaign(persistedCampaign.id, {
              date: persistedCampaign.date,
              verdict: persistedCampaign.verdict,
              team: persistedCampaign.team,
              notes: persistedCampaign.notes,
              conductedBy: persistedCampaign.conductedBy,
              witnessedBy: persistedCampaign.witnessedBy,
              stepResults: persistedCampaign.stepResults,
              responseMeasurements: persistedCampaign.responseMeasurements,
              procedureSnapshot: persistedCampaign.procedureSnapshot,
              pdfArtifact: persistedCampaign.pdfArtifact,
              closedAt: persistedCampaign.closedAt,
            })
          }
        } catch (err: unknown) {
          set(s => { const sif = findSIF(s, projectId, sifId); if (sif) sif.testCampaigns = previousCampaigns })
          set(s => { s.syncError = err instanceof Error ? err.message : String(err) })
          throw err
        }
      },

      removeTestCampaign: async (projectId, sifId, campaignId) => {
        if (!ensureSIFEditable(get, set, projectId, sifId)) {
          throw new Error(`Revision is locked for SIF ${sifId}`)
        }
        const previousCampaigns = [...(selectSIF(get(), projectId, sifId)?.testCampaigns ?? [])]
        set(s => {
          const sif = findSIF(s, projectId, sifId)
          if (sif?.testCampaigns) sif.testCampaigns = sif.testCampaigns.filter(c => c.id !== campaignId)
        })
        try {
          await dbDeleteCampaign(campaignId)
        } catch (err: unknown) {
          set(s => { const sif = findSIF(s, projectId, sifId); if (sif) sif.testCampaigns = previousCampaigns })
          set(s => { s.syncError = err instanceof Error ? err.message : String(err) })
          throw err
        }
      },

      addOperationalEvent: (projectId, sifId, event) => {
        if (!ensureSIFEditable(get, set, projectId, sifId)) return
        set(s => {
          const sif = findSIF(s, projectId, sifId)
          if (sif) { if (!sif.operationalEvents) sif.operationalEvents = []; sif.operationalEvents.unshift(event) }
        })
        const sif = selectSIF(get(), projectId, sifId)
        if (sif) dbUpdateSIF(sifId, { operationalEvents: sif.operationalEvents }).catch(console.error)
      },

      removeOperationalEvent: (projectId, sifId, eventId) => {
        if (!ensureSIFEditable(get, set, projectId, sifId)) return
        set(s => {
          const sif = findSIF(s, projectId, sifId)
          if (sif?.operationalEvents) sif.operationalEvents = sif.operationalEvents.filter(e => e.id !== eventId)
        })
        const sif = selectSIF(get(), projectId, sifId)
        if (sif) dbUpdateSIF(sifId, { operationalEvents: sif.operationalEvents }).catch(console.error)
      },

      updateHAZOPTrace: (projectId, sifId, trace) => {
        if (!ensureSIFEditable(get, set, projectId, sifId)) return
        set(s => { const sif = findSIF(s, projectId, sifId); if (sif) sif.hazopTrace = trace })
        dbUpdateSIF(sifId, { hazopTrace: trace }).catch(console.error)
      },

      // ══════════════════════════════════════════════════════════════════════
      // SIF REVISIONS (lazy-loaded from Supabase)
      // ══════════════════════════════════════════════════════════════════════
      fetchRevisions: async (sifId) => {
        if (get().revisions[sifId]) return
        try {
          const revs = await dbFetchRevisions(sifId)
          set(s => { s.revisions[sifId] = revs })
        } catch (err: unknown) {
          set(s => { s.syncError = err instanceof Error ? err.message : String(err) })
        }
      },

      createRevision: async (projectId, sifId, data) => {
        const sif = selectSIF(get(), projectId, sifId)
        if (!sif) throw new Error(`SIF introuvable: ${sifId}`)
        const id = crypto.randomUUID()
        const revision: SIFRevision = {
          id, sifId, projectId,
          revisionLabel: data.revisionLabel,
          status: sif.status,
          changeDescription: data.changeDescription,
          createdBy: data.createdBy,
          createdAt: new Date().toISOString(),
          snapshot: JSON.parse(JSON.stringify(sif)) as SIFRevision['snapshot'],
          reportArtifact: createDefaultRevisionArtifact('prism_report'),
          proofTestArtifact: createDefaultRevisionArtifact('prism_prooftest'),
          reportConfigSnapshot: null,
        }
        set(s => { s.revisions[sifId] = [revision, ...(s.revisions[sifId] ?? [])] })
        try { await dbCreateRevision(revision) }
        catch (err: unknown) {
          set(s => { s.revisions[sifId] = (s.revisions[sifId] ?? []).filter(r => r.id !== id) })
          set(s => { s.syncError = err instanceof Error ? err.message : String(err) })
          throw err
        }
      },

      publishRevision: async (projectId, sifId, data) => {
        const found = getProjectAndSIF(get(), projectId, sifId)
        if (!found) throw new Error(`SIF introuvable: ${sifId}`)
        const { project, sif } = found
        if (sif.revisionLockedAt) throw new Error(`Revision ${sif.revision} is already locked.`)

        const revisionId = crypto.randomUUID()
        const createdAt = new Date().toISOString()
        const previousSIF = JSON.parse(JSON.stringify(sif)) as SIF
        const publishedProcedure = sif.proofTestProcedure
          ? {
              ...sif.proofTestProcedure,
              revision: sif.revision,
              status: 'approved' as const,
              approvedBy: sif.proofTestProcedure.approvedBy || sif.approvedBy,
              approvedByDate: sif.proofTestProcedure.approvedByDate || createdAt.split('T')[0],
            }
          : sif.proofTestProcedure
        const analysisSettings = loadSIFAnalysisSettings(sif.id) ?? DEFAULT_SIF_ANALYSIS_SETTINGS
        const result = calcSIF(sif, {
          projectStandard: project.standard,
          missionTimeHours: analysisSettingsToMissionTimeHours(analysisSettings),
          curvePoints: analysisSettings.chart.curvePoints,
        })
        const reportPdf = await buildSILReportPdfBlob({ project, sif, result })
        const proofTestPdf = await buildProofTestPdfBlob({
          sif,
          project,
          procedure: publishedProcedure,
          campaigns: sif.testCampaigns,
        })

        const reportPath = buildRevisionArtifactPath({
          bucket: 'prism_report',
          project,
          sif,
          revisionId,
          revisionLabel: sif.revision,
          kind: 'report',
        })
        const proofTestPath = buildRevisionArtifactPath({
          bucket: 'prism_prooftest',
          project,
          sif,
          revisionId,
          revisionLabel: sif.revision,
          kind: 'prooftest',
        })

        let uploadedReport = createDefaultRevisionArtifact('prism_report')
        let uploadedProofTest = createDefaultRevisionArtifact('prism_prooftest')
        let revisionPersisted = false
        const pendingArchSync = archSyncTimers.get(sifId)
        if (pendingArchSync) {
          clearTimeout(pendingArchSync)
          archSyncTimers.delete(sifId)
        }

        try {
          uploadedReport = await uploadRevisionArtifact({
            ...uploadedReport,
            path: reportPath.path,
            fileName: reportPath.fileName,
            status: 'pending',
          }, reportPdf.blob)

          uploadedProofTest = await uploadRevisionArtifact({
            ...uploadedProofTest,
            path: proofTestPath.path,
            fileName: proofTestPath.fileName,
            status: 'pending',
          }, proofTestPdf.blob)

          const revision: SIFRevision = {
            id: revisionId,
            sifId,
            projectId,
            revisionLabel: sif.revision,
            status: 'approved',
            changeDescription: data.changeDescription,
            createdBy: data.createdBy,
            createdAt,
            snapshot: JSON.parse(JSON.stringify({
              ...sif,
              status: 'approved',
              proofTestProcedure: publishedProcedure,
            })) as SIFRevision['snapshot'],
            reportArtifact: uploadedReport,
            proofTestArtifact: uploadedProofTest,
            reportConfigSnapshot: reportPdf.cfg as unknown as Record<string, unknown>,
          }

          set(s => {
            applySIFPatch(s, projectId, sifId, {
              status: 'approved',
              revisionLockedAt: createdAt,
              lockedRevisionId: revisionId,
              proofTestProcedure: publishedProcedure,
            })
            s.revisions[sifId] = [revision, ...(s.revisions[sifId] ?? [])]
          })

          await dbCreateRevision(revision)
          revisionPersisted = true
          await dbUpdateSIF(sifId, {
            status: 'approved',
            revisionLockedAt: createdAt,
            lockedRevisionId: revisionId,
            proofTestProcedure: publishedProcedure,
          })
        } catch (err: unknown) {
          if (revisionPersisted) {
            await dbDeleteRevision(revisionId).catch(deleteErr => {
              console.error('[PRISM] Failed to rollback published revision:', deleteErr)
            })
          }
          await removeRevisionArtifact(uploadedProofTest)
          await removeRevisionArtifact(uploadedReport)
          set(s => {
            s.revisions[sifId] = (s.revisions[sifId] ?? []).filter(revision => revision.id !== revisionId)
            applySIFPatch(s, projectId, sifId, previousSIF)
            s.syncError = err instanceof Error ? err.message : String(err)
          })
          throw err
        }
      },

      startNextRevision: async (projectId, sifId) => {
        const found = getProjectAndSIF(get(), projectId, sifId)
        if (!found) throw new Error(`SIF introuvable: ${sifId}`)
        const { sif } = found
        if (!sif.revisionLockedAt) return

        const previousSIF = JSON.parse(JSON.stringify(sif)) as SIF
        const nextRevision = incrementRevisionLabel(sif.revision)
        const nextDate = new Date().toISOString().split('T')[0]
        const nextProcedure = sif.proofTestProcedure
          ? {
              ...sif.proofTestProcedure,
              revision: nextRevision,
              status: 'draft' as const,
              verifiedBy: '',
              verifiedByDate: '',
              approvedBy: '',
              approvedByDate: '',
            }
          : sif.proofTestProcedure

        const patch: Partial<SIF> = {
          revision: nextRevision,
          status: 'draft',
          date: nextDate,
          revisionLockedAt: null,
          lockedRevisionId: null,
          verifiedBy: '',
          approvedBy: '',
          proofTestProcedure: nextProcedure,
        }

        set(s => { applySIFPatch(s, projectId, sifId, patch) })
        try {
          await dbUpdateSIF(sifId, patch)
        } catch (err: unknown) {
          set(s => {
            applySIFPatch(s, projectId, sifId, previousSIF)
            s.syncError = err instanceof Error ? err.message : String(err)
          })
          throw err
        }
      },

    })),
    { name: 'PRISM-store' },
  ),
)
