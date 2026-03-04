import { create } from 'zustand'
import { persist, devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { nanoid } from 'nanoid'
import type { Project, SIF, SIFSubsystem, SIFComponent } from '@/core/types'
import { DEFAULT_PROJECT, DEFAULT_SIF } from '@/core/models/defaults'

// ─── Navigation state ────────────────────────────────────────────────────
export type AppView =
  | { type: 'projects' }
  | { type: 'sif-list'; projectId: string }
  | { type: 'sif-dashboard'; projectId: string; sifId: string; tab: SIFTab }

export type SIFTab = 'overview' | 'architecture' | 'analysis' | 'compliance' | 'report'

// ─── Store ────────────────────────────────────────────────────────────────
interface AppState {
  // Data
  projects: Project[]
  isDark: boolean

  // Navigation
  view: AppView

  // UI
  selectedComponentId: string | null
  isProjectModalOpen: boolean
  editingProjectId: string | null
  isSIFModalOpen: boolean
  editingSIFId: string | null

  // Actions — navigation
  navigate: (view: AppView) => void
  setTab: (tab: SIFTab) => void
  toggleTheme: () => void
  setTheme: (isDark: boolean) => void

  // Actions — projects
  openNewProject: () => void
  openEditProject: (id: string) => void
  closeProjectModal: () => void
  createProject: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'sifs'>) => Project
  updateProject: (id: string, data: Partial<Project>) => void
  deleteProject: (id: string) => void

  // Actions — SIFs
  openNewSIF: () => void
  openEditSIF: (id: string) => void
  closeSIFModal: () => void
  createSIF: (projectId: string, data: Partial<SIF>) => SIF
  updateSIF: (projectId: string, sifId: string, data: Partial<SIF>) => void
  deleteSIF: (projectId: string, sifId: string) => void

  // Actions — architecture
  addSubsystem: (projectId: string, sifId: string, subsystem: SIFSubsystem) => void
  updateSubsystem: (projectId: string, sifId: string, subsystem: SIFSubsystem) => void
  removeSubsystem: (projectId: string, sifId: string, subsystemId: string) => void
  addChannel: (projectId: string, sifId: string, subsystemId: string) => void
  removeChannel: (projectId: string, sifId: string, subsystemId: string, channelId: string) => void

  // Actions — components
  selectComponent: (id: string | null) => void
  addComponent: (projectId: string, sifId: string, subsystemId: string, channelId: string, component: SIFComponent) => void
  updateComponent: (projectId: string, sifId: string, subsystemId: string, channelId: string, component: SIFComponent) => void
  removeComponent: (projectId: string, sifId: string, subsystemId: string, channelId: string, componentId: string) => void
  moveComponent: (
    projectId: string, sifId: string,
    fromSubId: string, fromChannelId: string, fromIndex: number,
    toSubId: string, toChannelId: string, toIndex: number
  ) => void
}

// ─── Selectors ────────────────────────────────────────────────────────────
export const selectProject = (state: AppState, id: string) =>
  state.projects.find(p => p.id === id)

export const selectSIF = (state: AppState, projectId: string, sifId: string) =>
  state.projects.find(p => p.id === projectId)?.sifs.find(s => s.id === sifId)

export const selectCurrentSIF = (state: AppState): SIF | undefined => {
  if (state.view.type !== 'sif-dashboard') return undefined
  return selectSIF(state, state.view.projectId, state.view.sifId)
}

// ─── Store implementation ─────────────────────────────────────────────────
export const useAppStore = create<AppState>()(
  devtools(
    persist(
      immer((set, get) => ({
        projects: [],
        isDark: false,
        view: { type: 'projects' },
        selectedComponentId: null,
        isProjectModalOpen: false,
        editingProjectId: null,
        isSIFModalOpen: false,
        editingSIFId: null,

        // Navigation
        navigate: view => set(s => { s.view = view }),

        setTab: tab => set(s => {
          if (s.view.type === 'sif-dashboard') s.view.tab = tab
        }),

        toggleTheme: () => set(s => { s.isDark = !s.isDark }),
        setTheme: (isDark) => set(s => { s.isDark = isDark }),

        // Projects
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

        createProject: data => {
          const project: Project = {
            ...DEFAULT_PROJECT(),
            ...data,
            id: nanoid(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            sifs: [],
          }
          set(s => { s.projects.push(project) })
          return project
        },

        updateProject: (id, data) => set(s => {
          const p = s.projects.find(p => p.id === id)
          if (p) Object.assign(p, data, { updatedAt: new Date().toISOString() })
        }),

        deleteProject: id => set(s => {
          s.projects = s.projects.filter(p => p.id !== id)
          if (s.view.type === 'sif-list' && s.view.projectId === id) {
            s.view = { type: 'projects' }
          }
        }),

        // SIFs
        openNewSIF: () => set(s => {
          s.isSIFModalOpen = true
          s.editingSIFId = null
        }),
        openEditSIF: id => set(s => {
          s.isSIFModalOpen = true
          s.editingSIFId = id
        }),
        closeSIFModal: () => set(s => {
          s.isSIFModalOpen = false
          s.editingSIFId = null
        }),

        createSIF: (projectId, data) => {
          const project = get().projects.find(p => p.id === projectId)
          const nextNum = String(((project?.sifs.length ?? 0) + 1)).padStart(3, '0')
          const sif: SIF = {
            ...DEFAULT_SIF(projectId, `SIF-${nextNum}`),
            ...data,
            id: nanoid(),
            projectId,
          }
          set(s => {
            const p = s.projects.find(p => p.id === projectId)
            if (p) {
              p.sifs.push(sif)
              p.updatedAt = new Date().toISOString()
            }
          })
          return sif
        },

        updateSIF: (projectId, sifId, data) => set(s => {
          const p = s.projects.find(p => p.id === projectId)
          const sif = p?.sifs.find(s => s.id === sifId)
          if (sif) Object.assign(sif, data)
        }),

        deleteSIF: (projectId, sifId) => set(s => {
          const p = s.projects.find(p => p.id === projectId)
          if (p) p.sifs = p.sifs.filter(s => s.id !== sifId)
          if (s.view.type === 'sif-dashboard' && s.view.sifId === sifId) {
            s.view = { type: 'sif-list', projectId }
          }
        }),

        // Architecture
        addSubsystem: (projectId, sifId, subsystem) => set(s => {
          const sif = s.projects.find(p => p.id === projectId)?.sifs.find(s => s.id === sifId)
          if (sif) sif.subsystems.push(subsystem)
        }),

        updateSubsystem: (projectId, sifId, subsystem) => set(s => {
          const sif = s.projects.find(p => p.id === projectId)?.sifs.find(s => s.id === sifId)
          if (sif) {
            const idx = sif.subsystems.findIndex(sub => sub.id === subsystem.id)
            if (idx >= 0) sif.subsystems[idx] = subsystem
          }
        }),

        removeSubsystem: (projectId, sifId, subsystemId) => set(s => {
          const sif = s.projects.find(p => p.id === projectId)?.sifs.find(s => s.id === sifId)
          if (sif) sif.subsystems = sif.subsystems.filter(sub => sub.id !== subsystemId)
        }),

        addChannel: (projectId, sifId, subsystemId) => set(s => {
          const sif = s.projects.find(p => p.id === projectId)?.sifs.find(s => s.id === sifId)
          const sub = sif?.subsystems.find(sub => sub.id === subsystemId)
          if (sub) {
            const idx = sub.channels.length
            sub.channels.push({
              id: nanoid(),
              label: `Channel ${idx + 1}`,
              components: [],
            })
          }
        }),

        removeChannel: (projectId, sifId, subsystemId, channelId) => set(s => {
          const sif = s.projects.find(p => p.id === projectId)?.sifs.find(s => s.id === sifId)
          const sub = sif?.subsystems.find(sub => sub.id === subsystemId)
          if (sub) sub.channels = sub.channels.filter(ch => ch.id !== channelId)
        }),

        // Components
        selectComponent: id => set(s => { s.selectedComponentId = id }),

        addComponent: (projectId, sifId, subsystemId, channelId, component) => set(s => {
          const sif = s.projects.find(p => p.id === projectId)?.sifs.find(s => s.id === sifId)
          const ch = sif?.subsystems.find(sub => sub.id === subsystemId)?.channels.find(ch => ch.id === channelId)
          if (ch) ch.components.push(component)
        }),

        updateComponent: (projectId, sifId, subsystemId, channelId, component) => set(s => {
          const sif = s.projects.find(p => p.id === projectId)?.sifs.find(s => s.id === sifId)
          const ch = sif?.subsystems.find(sub => sub.id === subsystemId)?.channels.find(ch => ch.id === channelId)
          if (ch) {
            const idx = ch.components.findIndex(c => c.id === component.id)
            if (idx >= 0) ch.components[idx] = component
          }
        }),

        removeComponent: (projectId, sifId, subsystemId, channelId, componentId) => set(s => {
          const sif = s.projects.find(p => p.id === projectId)?.sifs.find(s => s.id === sifId)
          const ch = sif?.subsystems.find(sub => sub.id === subsystemId)?.channels.find(ch => ch.id === channelId)
          if (ch) ch.components = ch.components.filter(c => c.id !== componentId)
        }),

        moveComponent: (projectId, sifId, fromSubId, fromChannelId, fromIndex, toSubId, toChannelId, toIndex) =>
          set(s => {
            const sif = s.projects.find(p => p.id === projectId)?.sifs.find(s => s.id === sifId)
            if (!sif) return

            const fromSub = sif.subsystems.find(sub => sub.id === fromSubId)
            const toSub   = sif.subsystems.find(sub => sub.id === toSubId)
            const fromCh  = fromSub?.channels.find(ch => ch.id === fromChannelId)
            const toCh    = toSub?.channels.find(ch => ch.id === toChannelId)
            if (!fromCh || !toCh) return

            const [moved] = fromCh.components.splice(fromIndex, 1)
            if (moved) {
              moved.subsystemType = toSub!.type
              toCh.components.splice(toIndex, 0, moved)
            }
          }),
      })),
      {
        name: 'safeloop-store',
        partialize: state => ({ projects: state.projects, isDark: state.isDark }),
      }
    )
  )
)
