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
import { DEFAULT_PROJECT, DEFAULT_SIF } from '@/core/models/defaults'
import {
  dbCreateProject, dbUpdateProject, dbDeleteProject,
  dbCreateSIF, dbUpdateSIF, dbDeleteSIF,
  dbFetchRevisions, dbCreateRevision,
} from '@/lib/db'
import type { SIFRevision } from '@/core/types'
import type { AppState } from './types'
import { selectSIF } from './selectors'

// Re-export types for backward compatibility
export type { AppView, SIFTab, SettingsSection, AppState } from './types'
export { SETTINGS_SECTIONS } from './types'
export { selectProject, selectSIF, selectCurrentSIF } from './selectors'

// ─── Debounced architecture sync ───────────────────────────────────────────
const archSyncTimers = new Map<string, ReturnType<typeof setTimeout>>()

function scheduleArchSync(sifId: string, getSIF: () => ReturnType<typeof selectSIF>) {
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

// ─── Helper: find SIF with path traversal ──────────────────────────────────
// Reusable inside immer mutations (where state is a Draft)
const findSIF = (s: AppState, projectId: string, sifId: string) =>
  s.projects.find(p => p.id === projectId)?.sifs.find(sf => sf.id === sifId)

const findChannel = (s: AppState, projectId: string, sifId: string, subsystemId: string, channelId: string) =>
  findSIF(s, projectId, sifId)
    ?.subsystems.find(sub => sub.id === subsystemId)
    ?.channels.find(ch => ch.id === channelId)

// ─── Store ─────────────────────────────────────────────────────────────────
export const useAppStore = create<AppState>()(
  devtools(
    immer((set, get) => ({

      // ══════════════════════════════════════════════════════════════════════
      // INITIAL STATE
      // ══════════════════════════════════════════════════════════════════════
      projects: [],
      revisions: {},
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

      // ══════════════════════════════════════════════════════════════════════
      // NAVIGATION
      // ══════════════════════════════════════════════════════════════════════
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
        set(s => {
          const p = s.projects.find(p => p.id === projectId)
          if (p) { p.sifs.push(sif); p.updatedAt = new Date().toISOString() }
        })
        try { await dbCreateSIF(id, sif) }
        catch (err: unknown) {
          set(s => { const p = s.projects.find(p => p.id === projectId); if (p) p.sifs = p.sifs.filter(sf => sf.id !== id) })
          set(s => { s.syncError = err instanceof Error ? err.message : String(err) })
          throw err
        }
        return sif
      },

      updateSIF: async (projectId, sifId, data) => {
        set(s => { const sif = findSIF(s, projectId, sifId); if (sif) Object.assign(sif, data) })
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
        try { await dbDeleteSIF(sifId) }
        catch (err: unknown) {
          if (snapshot) set(s => { const p = s.projects.find(p => p.id === projectId); if (p) p.sifs.push(snapshot); s.pinnedSIFIds = pinnedSnapshot })
          set(s => { s.syncError = err instanceof Error ? err.message : String(err) })
          throw err
        }
      },

      // ══════════════════════════════════════════════════════════════════════
      // ARCHITECTURE (local + debounced Supabase)
      // ══════════════════════════════════════════════════════════════════════
      addSubsystem: (projectId, sifId, subsystem) => {
        set(s => { findSIF(s, projectId, sifId)?.subsystems.push(subsystem) })
        scheduleArchSync(sifId, () => selectSIF(get(), projectId, sifId))
      },

      updateSubsystem: (projectId, sifId, subsystem) => {
        set(s => {
          const sif = findSIF(s, projectId, sifId)
          if (sif) { const idx = sif.subsystems.findIndex(sub => sub.id === subsystem.id); if (idx >= 0) sif.subsystems[idx] = subsystem }
        })
        scheduleArchSync(sifId, () => selectSIF(get(), projectId, sifId))
      },

      removeSubsystem: (projectId, sifId, subsystemId) => {
        set(s => { const sif = findSIF(s, projectId, sifId); if (sif) sif.subsystems = sif.subsystems.filter(sub => sub.id !== subsystemId) })
        scheduleArchSync(sifId, () => selectSIF(get(), projectId, sifId))
      },

      addChannel: (projectId, sifId, subsystemId) => {
        set(s => {
          const sub = findSIF(s, projectId, sifId)?.subsystems.find(sub => sub.id === subsystemId)
          if (sub) sub.channels.push({ id: crypto.randomUUID(), label: `Channel ${sub.channels.length + 1}`, components: [] })
        })
        scheduleArchSync(sifId, () => selectSIF(get(), projectId, sifId))
      },

      removeChannel: (projectId, sifId, subsystemId, channelId) => {
        set(s => {
          const sub = findSIF(s, projectId, sifId)?.subsystems.find(sub => sub.id === subsystemId)
          if (sub) sub.channels = sub.channels.filter(ch => ch.id !== channelId)
        })
        scheduleArchSync(sifId, () => selectSIF(get(), projectId, sifId))
      },

      // ══════════════════════════════════════════════════════════════════════
      // COMPONENTS (local + debounced Supabase)
      // ══════════════════════════════════════════════════════════════════════
      selectComponent: id => set(s => { s.selectedComponentId = id }),

      addComponent: (projectId, sifId, subsystemId, channelId, component) => {
        set(s => { findChannel(s, projectId, sifId, subsystemId, channelId)?.components.push(component) })
        scheduleArchSync(sifId, () => selectSIF(get(), projectId, sifId))
      },

      updateComponent: (projectId, sifId, subsystemId, channelId, component) => {
        set(s => {
          const ch = findChannel(s, projectId, sifId, subsystemId, channelId)
          if (ch) { const idx = ch.components.findIndex(c => c.id === component.id); if (idx >= 0) ch.components[idx] = component }
        })
        scheduleArchSync(sifId, () => selectSIF(get(), projectId, sifId))
      },

      removeComponent: (projectId, sifId, subsystemId, channelId, componentId) => {
        set(s => {
          const ch = findChannel(s, projectId, sifId, subsystemId, channelId)
          if (ch) ch.components = ch.components.filter(c => c.id !== componentId)
        })
        scheduleArchSync(sifId, () => selectSIF(get(), projectId, sifId))
      },

      moveComponent: (projectId, sifId, fromSubId, fromChannelId, fromIndex, toSubId, toChannelId, toIndex) => {
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
      updateProofTestProcedure: (projectId, sifId, procedure) => {
        set(s => { const sif = findSIF(s, projectId, sifId); if (sif) sif.proofTestProcedure = procedure })
        dbUpdateSIF(sifId, { proofTestProcedure: procedure }).catch(console.error)
      },

      addTestCampaign: (projectId, sifId, campaign) => {
        set(s => {
          const sif = findSIF(s, projectId, sifId)
          if (sif) { if (!sif.testCampaigns) sif.testCampaigns = []; sif.testCampaigns.unshift(campaign) }
        })
        const sif = selectSIF(get(), projectId, sifId)
        if (sif) dbUpdateSIF(sifId, { testCampaigns: sif.testCampaigns }).catch(console.error)
      },

      updateTestCampaign: (projectId, sifId, campaign) => {
        set(s => {
          const sif = findSIF(s, projectId, sifId)
          if (sif?.testCampaigns) { const idx = sif.testCampaigns.findIndex(c => c.id === campaign.id); if (idx >= 0) sif.testCampaigns[idx] = campaign }
        })
        const sif = selectSIF(get(), projectId, sifId)
        if (sif) dbUpdateSIF(sifId, { testCampaigns: sif.testCampaigns }).catch(console.error)
      },

      removeTestCampaign: (projectId, sifId, campaignId) => {
        set(s => {
          const sif = findSIF(s, projectId, sifId)
          if (sif?.testCampaigns) sif.testCampaigns = sif.testCampaigns.filter(c => c.id !== campaignId)
        })
        const sif = selectSIF(get(), projectId, sifId)
        if (sif) dbUpdateSIF(sifId, { testCampaigns: sif.testCampaigns }).catch(console.error)
      },

      addOperationalEvent: (projectId, sifId, event) => {
        set(s => {
          const sif = findSIF(s, projectId, sifId)
          if (sif) { if (!sif.operationalEvents) sif.operationalEvents = []; sif.operationalEvents.unshift(event) }
        })
        const sif = selectSIF(get(), projectId, sifId)
        if (sif) dbUpdateSIF(sifId, { operationalEvents: sif.operationalEvents }).catch(console.error)
      },

      removeOperationalEvent: (projectId, sifId, eventId) => {
        set(s => {
          const sif = findSIF(s, projectId, sifId)
          if (sif?.operationalEvents) sif.operationalEvents = sif.operationalEvents.filter(e => e.id !== eventId)
        })
        const sif = selectSIF(get(), projectId, sifId)
        if (sif) dbUpdateSIF(sifId, { operationalEvents: sif.operationalEvents }).catch(console.error)
      },

      updateHAZOPTrace: (projectId, sifId, trace) => {
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
        }
        set(s => { s.revisions[sifId] = [revision, ...(s.revisions[sifId] ?? [])] })
        try { await dbCreateRevision(revision) }
        catch (err: unknown) {
          set(s => { s.revisions[sifId] = (s.revisions[sifId] ?? []).filter(r => r.id !== id) })
          set(s => { s.syncError = err instanceof Error ? err.message : String(err) })
          throw err
        }
      },

    })),
    { name: 'PRISM-store' },
  ),
)
