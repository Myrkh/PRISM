/**
 * src/store/appStore.ts — PRISM v3
 *
 * Changements vs version précédente :
 *  – Suppression du middleware `persist` (localStorage)
 *  – IDs via crypto.randomUUID() (compatible UUID Supabase)
 *  – CRUD projet/SIF : optimiste local + Supabase async
 *  – Mutations architecture : sync local + Supabase debounce (1 s)
 *  – Nouveau state : isSyncing, syncError, setProjects
 *  – openNewSIF accepte un projectId optionnel
 *  – deleteProject / deleteSIF : async (confirmation DB)
 */
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type {
  Project, SIF, SIFSubsystem, SIFComponent,
  ProofTestProcedure, TestCampaign, OperationalEvent, HAZOPTrace,
} from '@/core/types'
import { DEFAULT_PROJECT, DEFAULT_SIF } from '@/core/models/defaults'
import {
  dbCreateProject, dbUpdateProject, dbDeleteProject,
  dbCreateSIF, dbUpdateSIF, dbDeleteSIF,
} from '@/lib/db'

// ─── Navigation ───────────────────────────────────────────────────────────
export type SettingsSection =
  | 'general'
  | 'calculation'
  | 'validation'
  | 'data'
  | 'security'
  | 'reports'

export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  'general',
  'calculation',
  'validation',
  'data',
  'security',
  'reports',
]

export type AppView =
  | { type: 'projects' }
  | { type: 'settings'; section: SettingsSection }
  | { type: 'review-queue' }
  | { type: 'audit-log' }
  | { type: 'sif-dashboard'; projectId: string; sifId: string; tab: SIFTab }

export type SIFTab = 'overview' | 'architecture' | 'analysis' | 'compliance' | 'prooftest' | 'report'

// ─── State interface ───────────────────────────────────────────────────────
interface AppState {
  // Data
  projects: Project[]
  isDark: boolean

  // Sync status
  isSyncing: boolean
  syncError: string | null

  // Navigation
  view: AppView

  // UI
  selectedComponentId: string | null
  pinnedSIFIds: string[]
  isProjectModalOpen: boolean
  editingProjectId: string | null
  isSIFModalOpen: boolean
  editingSIFId: string | null
  newSIFProjectId: string | null    // projet cible pour une nouvelle SIF

  // ── Actions navigation ──
  navigate: (view: AppView) => void
  setTab: (tab: SIFTab) => void
  togglePinnedSIF: (sifId: string) => void
  toggleTheme: () => void
  setTheme: (isDark: boolean) => void

  // ── Actions données ──
  setProjects: (projects: Project[]) => void
  setSyncError: (err: string | null) => void

  // ── Projects ──
  openNewProject: () => void
  openEditProject: (id: string) => void
  closeProjectModal: () => void
  createProject: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'sifs'>) => Promise<Project>
  updateProject: (id: string, data: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>

  // ── SIFs ──
  /** projectId : projet cible — si omis, utilise newSIFProjectId ou le 1er projet */
  openNewSIF: (projectId?: string) => void
  openEditSIF: (id: string) => void
  closeSIFModal: () => void
  createSIF: (projectId: string, data: Partial<SIF>) => Promise<SIF>
  updateSIF: (projectId: string, sifId: string, data: Partial<SIF>) => Promise<void>
  deleteSIF: (projectId: string, sifId: string) => Promise<void>

  // ── Architecture (sync local + debounced Supabase) ──
  addSubsystem: (projectId: string, sifId: string, subsystem: SIFSubsystem) => void
  updateSubsystem: (projectId: string, sifId: string, subsystem: SIFSubsystem) => void
  removeSubsystem: (projectId: string, sifId: string, subsystemId: string) => void
  addChannel: (projectId: string, sifId: string, subsystemId: string) => void
  removeChannel: (projectId: string, sifId: string, subsystemId: string, channelId: string) => void

  // ── Components (sync local + debounced Supabase) ──
  selectComponent: (id: string | null) => void
  addComponent: (projectId: string, sifId: string, subsystemId: string, channelId: string, component: SIFComponent) => void
  updateComponent: (projectId: string, sifId: string, subsystemId: string, channelId: string, component: SIFComponent) => void
  removeComponent: (projectId: string, sifId: string, subsystemId: string, channelId: string, componentId: string) => void
  moveComponent: (
    projectId: string, sifId: string,
    fromSubId: string, fromChannelId: string, fromIndex: number,
    toSubId: string, toChannelId: string, toIndex: number
  ) => void

  // ── Proof Test ──
  updateProofTestProcedure: (projectId: string, sifId: string, procedure: ProofTestProcedure) => void

  // ── Test Campaigns ──
  addTestCampaign: (projectId: string, sifId: string, campaign: TestCampaign) => void
  updateTestCampaign: (projectId: string, sifId: string, campaign: TestCampaign) => void
  removeTestCampaign: (projectId: string, sifId: string, campaignId: string) => void

  // ── Operational Events ──
  addOperationalEvent: (projectId: string, sifId: string, event: OperationalEvent) => void
  removeOperationalEvent: (projectId: string, sifId: string, eventId: string) => void

  // ── HAZOP ──
  updateHAZOPTrace: (projectId: string, sifId: string, trace: HAZOPTrace) => void
}

// ─── Selectors ─────────────────────────────────────────────────────────────
export const selectProject = (state: AppState, id: string) =>
  state.projects.find(p => p.id === id)

export const selectSIF = (state: AppState, projectId: string, sifId: string) =>
  state.projects.find(p => p.id === projectId)?.sifs.find(s => s.id === sifId)

export const selectCurrentSIF = (state: AppState): SIF | undefined => {
  if (state.view.type !== 'sif-dashboard') return undefined
  return selectSIF(state, state.view.projectId, state.view.sifId)
}

// ─── Debounced architecture sync ───────────────────────────────────────────
// On ne veut pas envoyer une requête Supabase pour chaque
// micro-interaction (déplacement de nœud ReactFlow).
// → 1 requête après 1 s de silence par SIF.
const archSyncTimers = new Map<string, ReturnType<typeof setTimeout>>()

function scheduleArchSync(sifId: string, getSIF: () => SIF | undefined) {
  const existing = archSyncTimers.get(sifId)
  if (existing) clearTimeout(existing)

  archSyncTimers.set(sifId, setTimeout(async () => {
    archSyncTimers.delete(sifId)
    const sif = getSIF()
    if (!sif) return
    try {
      await dbUpdateSIF(sifId, { subsystems: sif.subsystems })
    } catch (err) {
      console.error('[PRISM] Architecture sync failed:', err)
    }
  }, 1000))
}

// ─── Store ─────────────────────────────────────────────────────────────────
export const useAppStore = create<AppState>()(
  devtools(
    immer((set, get) => ({
      projects: [],
      isDark: true,
      isSyncing: false,
      syncError: null,
      view: { type: 'projects' },
      selectedComponentId: null,
      pinnedSIFIds: [],
      isProjectModalOpen: false,
      editingProjectId: null,
      isSIFModalOpen: false,
      editingSIFId: null,
      newSIFProjectId: null,

      // ── Navigation ──────────────────────────────────────────────────────
      navigate: view => set(s => { s.view = view }),

      setTab: tab => set(s => {
        if (s.view.type === 'sif-dashboard') s.view.tab = tab
      }),

      togglePinnedSIF: sifId => set(s => {
        const idx = s.pinnedSIFIds.indexOf(sifId)
        if (idx >= 0) s.pinnedSIFIds.splice(idx, 1)
        else s.pinnedSIFIds.unshift(sifId)
      }),

      toggleTheme: () => set(s => { s.isDark = !s.isDark }),
      setTheme: isDark => set(s => { s.isDark = isDark }),

      // ── Data ────────────────────────────────────────────────────────────
      setProjects: projects => set(s => {
        s.projects = projects
        s.pinnedSIFIds = s.pinnedSIFIds.filter(id =>
          projects.some(p => p.sifs.some(sif => sif.id === id)),
        )
      }),
      setSyncError: err => set(s => { s.syncError = err }),

      // ── Projects ────────────────────────────────────────────────────────
      openNewProject: () => set(s => {
        s.isProjectModalOpen = true
        s.editingProjectId = null
      }),
      openEditProject: id => set(s => {
        s.isProjectModalOpen = true
        s.editingProjectId = id
      }),
      closeProjectModal: () => set(s => {
        s.isProjectModalOpen = false
        s.editingProjectId = null
      }),

      createProject: async (data) => {
        const id = crypto.randomUUID()
        const project: Project = {
          ...DEFAULT_PROJECT(),
          ...data,
          id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sifs: [],
        }
        // 1. Optimistic local update
        set(s => { s.projects.push(project) })
        // 2. Persist to Supabase
        try {
          await dbCreateProject(id, data)
        } catch (err: unknown) {
          // Rollback
          set(s => { s.projects = s.projects.filter(p => p.id !== id) })
          const msg = err instanceof Error ? err.message : String(err)
          set(s => { s.syncError = msg })
          throw err
        }
        return project
      },

      updateProject: async (id, data) => {
        // Optimistic
        set(s => {
          const p = s.projects.find(p => p.id === id)
          if (p) Object.assign(p, data, { updatedAt: new Date().toISOString() })
        })
        // Supabase
        try {
          await dbUpdateProject(id, data)
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err)
          set(s => { s.syncError = msg })
          throw err
        }
      },

      deleteProject: async (id) => {
        const snapshot = get().projects.find(p => p.id === id)
        const pinnedSnapshot = [...get().pinnedSIFIds]
        // Optimistic
        set(s => {
          s.projects = s.projects.filter(p => p.id !== id)
          s.pinnedSIFIds = s.pinnedSIFIds.filter(sifId =>
            !snapshot?.sifs.some(s => s.id === sifId),
          )
          if (s.view.type === 'sif-dashboard' && s.view.projectId === id) {
            s.view = { type: 'projects' }
          }
        })
        // Supabase
        try {
          await dbDeleteProject(id)
        } catch (err: unknown) {
          // Rollback
          if (snapshot) {
            set(s => {
              s.projects.push(snapshot)
              s.pinnedSIFIds = pinnedSnapshot
            })
          }
          const msg = err instanceof Error ? err.message : String(err)
          set(s => { s.syncError = msg })
          throw err
        }
      },

      // ── SIFs ────────────────────────────────────────────────────────────
      openNewSIF: (projectId) => set(s => {
        s.isSIFModalOpen = true
        s.editingSIFId = null
        s.newSIFProjectId = projectId ?? null
      }),
      openEditSIF: id => set(s => {
        s.isSIFModalOpen = true
        s.editingSIFId = id
        s.newSIFProjectId = null
      }),
      closeSIFModal: () => set(s => {
        s.isSIFModalOpen = false
        s.editingSIFId = null
        s.newSIFProjectId = null
      }),

      createSIF: async (projectId, data) => {
        const project = get().projects.find(p => p.id === projectId)
        if (!project) throw new Error(`Projet introuvable: ${projectId}`)
        const nextNum = String((project.sifs.length + 1)).padStart(3, '0')
        const id = crypto.randomUUID()
        const sif: SIF = {
          ...DEFAULT_SIF(projectId, `SIF-${nextNum}`),
          ...data,
          id,
          projectId,
        }
        // Optimistic
        set(s => {
          const p = s.projects.find(p => p.id === projectId)
          if (p) {
            p.sifs.push(sif)
            p.updatedAt = new Date().toISOString()
          }
        })
        // Supabase
        try {
          await dbCreateSIF(id, sif)
        } catch (err: unknown) {
          // Rollback
          set(s => {
            const p = s.projects.find(p => p.id === projectId)
            if (p) p.sifs = p.sifs.filter(s => s.id !== id)
          })
          const msg = err instanceof Error ? err.message : String(err)
          set(s => { s.syncError = msg })
          throw err
        }
        return sif
      },

      updateSIF: async (projectId, sifId, data) => {
        // Optimistic
        set(s => {
          const sif = s.projects.find(p => p.id === projectId)?.sifs.find(s => s.id === sifId)
          if (sif) Object.assign(sif, data)
        })
        // Supabase
        try {
          await dbUpdateSIF(sifId, data)
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err)
          set(s => { s.syncError = msg })
          throw err
        }
      },

      deleteSIF: async (projectId, sifId) => {
        const snapshot = get().projects
          .find(p => p.id === projectId)?.sifs.find(s => s.id === sifId)
        const pinnedSnapshot = [...get().pinnedSIFIds]
        // Optimistic
        set(s => {
          const p = s.projects.find(p => p.id === projectId)
          if (p) p.sifs = p.sifs.filter(s => s.id !== sifId)
          s.pinnedSIFIds = s.pinnedSIFIds.filter(id => id !== sifId)
          if (s.view.type === 'sif-dashboard' && s.view.sifId === sifId) {
            s.view = { type: 'projects' }
          }
        })
        // Supabase
        try {
          await dbDeleteSIF(sifId)
        } catch (err: unknown) {
          // Rollback
          if (snapshot) {
            set(s => {
              const p = s.projects.find(p => p.id === projectId)
              if (p) p.sifs.push(snapshot)
              s.pinnedSIFIds = pinnedSnapshot
            })
          }
          const msg = err instanceof Error ? err.message : String(err)
          set(s => { s.syncError = msg })
          throw err
        }
      },

      // ── Architecture (local + debounced Supabase) ────────────────────────
      addSubsystem: (projectId, sifId, subsystem) => {
        set(s => {
          const sif = s.projects.find(p => p.id === projectId)?.sifs.find(s => s.id === sifId)
          if (sif) sif.subsystems.push(subsystem)
        })
        scheduleArchSync(sifId, () => selectSIF(get(), projectId, sifId))
      },

      updateSubsystem: (projectId, sifId, subsystem) => {
        set(s => {
          const sif = s.projects.find(p => p.id === projectId)?.sifs.find(s => s.id === sifId)
          if (sif) {
            const idx = sif.subsystems.findIndex(sub => sub.id === subsystem.id)
            if (idx >= 0) sif.subsystems[idx] = subsystem
          }
        })
        scheduleArchSync(sifId, () => selectSIF(get(), projectId, sifId))
      },

      removeSubsystem: (projectId, sifId, subsystemId) => {
        set(s => {
          const sif = s.projects.find(p => p.id === projectId)?.sifs.find(s => s.id === sifId)
          if (sif) sif.subsystems = sif.subsystems.filter(sub => sub.id !== subsystemId)
        })
        scheduleArchSync(sifId, () => selectSIF(get(), projectId, sifId))
      },

      addChannel: (projectId, sifId, subsystemId) => {
        set(s => {
          const sub = s.projects.find(p => p.id === projectId)
            ?.sifs.find(s => s.id === sifId)
            ?.subsystems.find(sub => sub.id === subsystemId)
          if (sub) {
            sub.channels.push({
              id: crypto.randomUUID(),
              label: `Channel ${sub.channels.length + 1}`,
              components: [],
            })
          }
        })
        scheduleArchSync(sifId, () => selectSIF(get(), projectId, sifId))
      },

      removeChannel: (projectId, sifId, subsystemId, channelId) => {
        set(s => {
          const sub = s.projects.find(p => p.id === projectId)
            ?.sifs.find(s => s.id === sifId)
            ?.subsystems.find(sub => sub.id === subsystemId)
          if (sub) sub.channels = sub.channels.filter(ch => ch.id !== channelId)
        })
        scheduleArchSync(sifId, () => selectSIF(get(), projectId, sifId))
      },

      // ── Components ──────────────────────────────────────────────────────
      selectComponent: id => set(s => { s.selectedComponentId = id }),

      addComponent: (projectId, sifId, subsystemId, channelId, component) => {
        set(s => {
          const ch = s.projects.find(p => p.id === projectId)
            ?.sifs.find(s => s.id === sifId)
            ?.subsystems.find(sub => sub.id === subsystemId)
            ?.channels.find(ch => ch.id === channelId)
          if (ch) ch.components.push(component)
        })
        scheduleArchSync(sifId, () => selectSIF(get(), projectId, sifId))
      },

      updateComponent: (projectId, sifId, subsystemId, channelId, component) => {
        set(s => {
          const ch = s.projects.find(p => p.id === projectId)
            ?.sifs.find(s => s.id === sifId)
            ?.subsystems.find(sub => sub.id === subsystemId)
            ?.channels.find(ch => ch.id === channelId)
          if (ch) {
            const idx = ch.components.findIndex(c => c.id === component.id)
            if (idx >= 0) ch.components[idx] = component
          }
        })
        scheduleArchSync(sifId, () => selectSIF(get(), projectId, sifId))
      },

      removeComponent: (projectId, sifId, subsystemId, channelId, componentId) => {
        set(s => {
          const ch = s.projects.find(p => p.id === projectId)
            ?.sifs.find(s => s.id === sifId)
            ?.subsystems.find(sub => sub.id === subsystemId)
            ?.channels.find(ch => ch.id === channelId)
          if (ch) ch.components = ch.components.filter(c => c.id !== componentId)
        })
        scheduleArchSync(sifId, () => selectSIF(get(), projectId, sifId))
      },

      moveComponent: (projectId, sifId, fromSubId, fromChannelId, fromIndex, toSubId, toChannelId, toIndex) => {
        set(s => {
          const sif = s.projects.find(p => p.id === projectId)?.sifs.find(s => s.id === sifId)
          if (!sif) return
          const fromCh = sif.subsystems.find(sub => sub.id === fromSubId)?.channels.find(ch => ch.id === fromChannelId)
          const toCh   = sif.subsystems.find(sub => sub.id === toSubId)?.channels.find(ch => ch.id === toChannelId)
          const toSub  = sif.subsystems.find(sub => sub.id === toSubId)
          if (!fromCh || !toCh) return
          const [moved] = fromCh.components.splice(fromIndex, 1)
          if (moved) {
            moved.subsystemType = toSub!.type
            toCh.components.splice(toIndex, 0, moved)
          }
        })
        scheduleArchSync(sifId, () => selectSIF(get(), projectId, sifId))
      },

      // ── Proof Test ──────────────────────────────────────────────────────
      updateProofTestProcedure: (projectId, sifId, procedure) => {
        set(s => {
          const sif = s.projects.find(p => p.id === projectId)?.sifs.find(s => s.id === sifId)
          if (sif) sif.proofTestProcedure = procedure
        })
        // Fire-and-forget
        dbUpdateSIF(sifId, { proofTestProcedure: procedure }).catch(console.error)
      },

      // ── Test Campaigns ──────────────────────────────────────────────────
      addTestCampaign: (projectId, sifId, campaign) => {
        set(s => {
          const sif = s.projects.find(p => p.id === projectId)?.sifs.find(s => s.id === sifId)
          if (sif) { if (!sif.testCampaigns) sif.testCampaigns = []; sif.testCampaigns.unshift(campaign) }
        })
        const sif = selectSIF(get(), projectId, sifId)
        if (sif) dbUpdateSIF(sifId, { testCampaigns: sif.testCampaigns }).catch(console.error)
      },
      updateTestCampaign: (projectId, sifId, campaign) => {
        set(s => {
          const sif = s.projects.find(p => p.id === projectId)?.sifs.find(s => s.id === sifId)
          if (sif?.testCampaigns) {
            const idx = sif.testCampaigns.findIndex(c => c.id === campaign.id)
            if (idx >= 0) sif.testCampaigns[idx] = campaign
          }
        })
        const sif = selectSIF(get(), projectId, sifId)
        if (sif) dbUpdateSIF(sifId, { testCampaigns: sif.testCampaigns }).catch(console.error)
      },
      removeTestCampaign: (projectId, sifId, campaignId) => {
        set(s => {
          const sif = s.projects.find(p => p.id === projectId)?.sifs.find(s => s.id === sifId)
          if (sif?.testCampaigns) sif.testCampaigns = sif.testCampaigns.filter(c => c.id !== campaignId)
        })
        const sif = selectSIF(get(), projectId, sifId)
        if (sif) dbUpdateSIF(sifId, { testCampaigns: sif.testCampaigns }).catch(console.error)
      },

      // ── Operational Events ──────────────────────────────────────────────
      addOperationalEvent: (projectId, sifId, event) => {
        set(s => {
          const sif = s.projects.find(p => p.id === projectId)?.sifs.find(s => s.id === sifId)
          if (sif) { if (!sif.operationalEvents) sif.operationalEvents = []; sif.operationalEvents.unshift(event) }
        })
        const sif = selectSIF(get(), projectId, sifId)
        if (sif) dbUpdateSIF(sifId, { operationalEvents: sif.operationalEvents }).catch(console.error)
      },
      removeOperationalEvent: (projectId, sifId, eventId) => {
        set(s => {
          const sif = s.projects.find(p => p.id === projectId)?.sifs.find(s => s.id === sifId)
          if (sif?.operationalEvents) sif.operationalEvents = sif.operationalEvents.filter(e => e.id !== eventId)
        })
        const sif = selectSIF(get(), projectId, sifId)
        if (sif) dbUpdateSIF(sifId, { operationalEvents: sif.operationalEvents }).catch(console.error)
      },

      // ── HAZOP ────────────────────────────────────────────────────────────
      updateHAZOPTrace: (projectId, sifId, trace) => {
        set(s => {
          const sif = s.projects.find(p => p.id === projectId)?.sifs.find(s => s.id === sifId)
          if (sif) sif.hazopTrace = trace
        })
        dbUpdateSIF(sifId, { hazopTrace: trace }).catch(console.error)
      },
    })),
    { name: 'PRISM-store' }
  )
)
