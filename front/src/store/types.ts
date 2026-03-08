/**
 * store/types.ts — PRISM Store Type Definitions
 *
 * Navigation types, state interface, and tab definitions.
 * Extracted from appStore.ts for clarity.
 */
import type {
  Project, SIF, SIFSubsystem, SIFComponent,
  ProofTestProcedure, TestCampaign, OperationalEvent, HAZOPTrace,
  SIFRevision,
} from '@/core/types'

// ─── Navigation ───────────────────────────────────────────────────────────
export type SettingsSection =
  | 'general'
  | 'calculation'
  | 'validation'
  | 'data'
  | 'security'
  | 'reports'

export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  'general', 'calculation', 'validation', 'data', 'security', 'reports',
]

export type AppView =
  | { type: 'projects' }
  | { type: 'settings'; section: SettingsSection }
  | { type: 'review-queue' }
  | { type: 'audit-log' }
  | { type: 'sif-history' }
  | { type: 'hazop' }
  | { type: 'sif-dashboard'; projectId: string; sifId: string; tab: SIFTab }

export type SIFTab = 'overview' | 'architecture' | 'analysis' | 'compliance' | 'prooftest' | 'report'
export type RightPanelSection = 'analysis' | 'compliance' | 'prooftest'
export type RightPanelTabsState = Record<RightPanelSection, string | null>

// ─── State interface ───────────────────────────────────────────────────────
export interface AppState {
  // ── Data ──
  projects: Project[]
  revisions: Record<string, SIFRevision[]>
  isDark: boolean

  // ── Sync ──
  isSyncing: boolean
  syncError: string | null

  // ── Navigation ──
  view: AppView

  // ── UI ──
  selectedComponentId: string | null
  pinnedSIFIds: string[]
  rightPanelTabs: RightPanelTabsState
  isProjectModalOpen: boolean
  editingProjectId: string | null
  isSIFModalOpen: boolean
  editingSIFId: string | null
  newSIFProjectId: string | null

  // ── Actions: Navigation ──
  navigate: (view: AppView) => void
  setTab: (tab: SIFTab) => void
  togglePinnedSIF: (sifId: string) => void
  setRightPanelTab: (section: RightPanelSection, tab: string | null) => void
  toggleTheme: () => void
  setTheme: (isDark: boolean) => void

  // ── Actions: Data ──
  setProjects: (projects: Project[]) => void
  setSyncError: (err: string | null) => void

  // ── Actions: Projects ──
  openNewProject: () => void
  openEditProject: (id: string) => void
  closeProjectModal: () => void
  createProject: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'sifs'>) => Promise<Project>
  updateProject: (id: string, data: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>

  // ── Actions: SIFs ──
  openNewSIF: (projectId?: string) => void
  openEditSIF: (id: string) => void
  closeSIFModal: () => void
  createSIF: (projectId: string, data: Partial<SIF>) => Promise<SIF>
  updateSIF: (projectId: string, sifId: string, data: Partial<SIF>) => Promise<void>
  deleteSIF: (projectId: string, sifId: string) => Promise<void>

  // ── Actions: Architecture ──
  addSubsystem: (projectId: string, sifId: string, subsystem: SIFSubsystem) => void
  updateSubsystem: (projectId: string, sifId: string, subsystem: SIFSubsystem) => void
  removeSubsystem: (projectId: string, sifId: string, subsystemId: string) => void
  addChannel: (projectId: string, sifId: string, subsystemId: string) => void
  removeChannel: (projectId: string, sifId: string, subsystemId: string, channelId: string) => void

  // ── Actions: Components ──
  selectComponent: (id: string | null) => void
  addComponent: (projectId: string, sifId: string, subsystemId: string, channelId: string, component: SIFComponent) => void
  updateComponent: (projectId: string, sifId: string, subsystemId: string, channelId: string, component: SIFComponent) => void
  removeComponent: (projectId: string, sifId: string, subsystemId: string, channelId: string, componentId: string) => void
  moveComponent: (
    projectId: string, sifId: string,
    fromSubId: string, fromChannelId: string, fromIndex: number,
    toSubId: string, toChannelId: string, toIndex: number,
  ) => void

  // ── Actions: Proof Test ──
  updateProofTestProcedure: (projectId: string, sifId: string, procedure: ProofTestProcedure) => Promise<void>

  // ── Actions: Campaigns ──
  addTestCampaign: (projectId: string, sifId: string, campaign: TestCampaign) => Promise<void>
  updateTestCampaign: (projectId: string, sifId: string, campaign: TestCampaign) => Promise<void>
  removeTestCampaign: (projectId: string, sifId: string, campaignId: string) => Promise<void>

  // ── Actions: Events ──
  addOperationalEvent: (projectId: string, sifId: string, event: OperationalEvent) => void
  removeOperationalEvent: (projectId: string, sifId: string, eventId: string) => void

  // ── Actions: HAZOP ──
  updateHAZOPTrace: (projectId: string, sifId: string, trace: HAZOPTrace) => void

  // ── Actions: Revisions ──
  fetchRevisions: (sifId: string) => Promise<void>
  createRevision: (
    projectId: string, sifId: string,
    data: { revisionLabel: string; changeDescription: string; createdBy: string },
  ) => Promise<void>
}
