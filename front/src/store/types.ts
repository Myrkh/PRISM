/**
 * store/types.ts — PRISM Store Type Definitions
 *
 * Navigation types, state interface, and tab definitions.
 * Extracted from appStore.ts for clarity.
 */
import type { Session, User } from '@supabase/supabase-js'
import type {
  ComponentTemplate,
  ComponentTemplateUpsertInput,
  ProjectAccessSnapshot,
  ProjectMemberStatus,
  ProjectPermissionKey,
  Project, SIF, SIFSubsystem, SIFComponent,
  ProofTestProcedure, TestCampaign, OperationalEvent, HAZOPTrace,
  OAuthProviderName, PasswordSignUpResult, SIFRevision, UserProfile,
} from '@/core/types'
import type { AppPreferences } from '@/core/models/appPreferences'

// ─── Navigation ───────────────────────────────────────────────────────────
export type SettingsSection = 'general' | 'workspace' | 'engine' | 'shortcuts'

export const SETTINGS_SECTIONS: readonly SettingsSection[] = ['general', 'workspace', 'engine', 'shortcuts']

export type CanonicalSIFTab =
  | 'cockpit'
  | 'history'
  | 'context'
  | 'architecture'
  | 'verification'
  | 'exploitation'
  | 'report'

export type LegacySIFTabAlias = 'overview' | 'analysis' | 'compliance' | 'prooftest'
export type SIFTab = CanonicalSIFTab | LegacySIFTabAlias

export const CANONICAL_SIF_TABS: readonly CanonicalSIFTab[] = [
  'cockpit',
  'history',
  'context',
  'architecture',
  'verification',
  'exploitation',
  'report',
]

export const SIF_PHASE_TABS: readonly Exclude<CanonicalSIFTab, 'report'>[] = [
  'cockpit',
  'history',
  'context',
  'architecture',
  'verification',
  'exploitation',
]

export const SIF_TAB_META: Readonly<Record<CanonicalSIFTab, {
  label: string
  hint: string
  accent: string
  stepLabel: string
}>> = {
  cockpit: {
    label: 'Cockpit',
    hint: 'Etat global et prochaines actions',
    accent: '#4FD1C5',
    stepLabel: 'Cockpit',
  },
  history: {
    label: 'Historique',
    hint: 'Révisions publiées, comparaison et artefacts figés',
    accent: '#94A3B8',
    stepLabel: 'Historique',
  },
  context: {
    label: 'Contexte',
    hint: 'Identification et HAZOP / LOPA',
    accent: '#60A5FA',
    stepLabel: '1 Contexte',
  },
  architecture: {
    label: 'Architecture',
    hint: 'Loop editor et composants',
    accent: '#F59E0B',
    stepLabel: '2 Architecture',
  },
  verification: {
    label: 'Verification',
    hint: 'Calculs, ecarts et preuves',
    accent: '#A78BFA',
    stepLabel: '3 Verification',
  },
  exploitation: {
    label: 'Exploitation',
    hint: 'Proof test et operations',
    accent: '#34D399',
    stepLabel: '4 Exploitation',
  },
  report: {
    label: 'Publier',
    hint: 'Dossier de preuve et PDF',
    accent: '#F97316',
    stepLabel: 'Publier',
  },
}

const LEGACY_SIF_TAB_ALIASES: Readonly<Record<LegacySIFTabAlias, CanonicalSIFTab>> = {
  overview: 'cockpit',
  analysis: 'verification',
  compliance: 'verification',
  prooftest: 'exploitation',
}

export function normalizeSIFTab(tab: SIFTab | string | null | undefined): CanonicalSIFTab {
  if (!tab) return 'cockpit'
  if (tab in LEGACY_SIF_TAB_ALIASES) return LEGACY_SIF_TAB_ALIASES[tab as LegacySIFTabAlias]
  return CANONICAL_SIF_TABS.includes(tab as CanonicalSIFTab) ? (tab as CanonicalSIFTab) : 'cockpit'
}

export type AppView =
  | { type: 'home' }
  | { type: 'projects' }
  | { type: 'note'; noteId: string }
  | { type: 'workspace-file'; nodeId: string }
  | { type: 'search' }
  | { type: 'planning' }
  | {
      type: 'library'
      templateId?: string
      origin?: 'builtin' | 'project' | 'user'
      libraryName?: string | null
    }
  | { type: 'settings'; section: SettingsSection }
  | { type: 'docs' }
  | { type: 'audit-log' }
  | { type: 'sif-history' }
  | { type: 'engine' }
  | { type: 'hazop' }
  | { type: 'sif-dashboard'; projectId: string; sifId: string; tab: SIFTab }

export type RightPanelSection = 'analysis' | 'compliance' | 'prooftest' | 'verification' | 'exploitation'
export type RightPanelTabsState = Record<RightPanelSection, string | null>

// ─── State interface ───────────────────────────────────────────────────────
export interface AppState {
  // ── Data ──
  projects: Project[]
  revisions: Record<string, SIFRevision[]>
  isDark: boolean
  preferences: AppPreferences
  authSession: Session | null
  authUser: User | null
  profile: UserProfile | null
  authLoading: boolean
  authError: string | null
  componentTemplates: ComponentTemplate[]
  componentTemplatesLoading: boolean
  componentTemplatesError: string | null
  projectAccessByProject: Record<string, ProjectAccessSnapshot>
  projectAccessLoading: boolean
  projectAccessError: string | null
  projectAccessProjectId: string | null

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

  // ── Layout panels ──
  leftPanelOpen: boolean
  rightPanelOpen: boolean
  focusMode: boolean

  // ── Split view ──
  // null = split closed  |  projectId/sifId null = split open, no SIF selected yet
  secondSlot: { projectId: string | null; sifId: string | null; tab: CanonicalSIFTab } | null

  // ── Actions: Navigation ──
  navigate: (view: AppView) => void
  setTab: (tab: SIFTab) => void
  togglePinnedSIF: (sifId: string) => void
  setRightPanelTab: (section: RightPanelSection, tab: string | null) => void
  toggleTheme: () => void
  setTheme: (isDark: boolean) => void
  updateAppPreferences: (patch: Partial<AppPreferences>) => void
  resetAppPreferences: () => void

  // ── Actions: Layout panels ──
  toggleLeftPanel: () => void
  toggleRightPanel: () => void
  setRightPanelOpen: (open: boolean) => void
  toggleFocusMode: () => void
  toggleStatusBar: () => void
  toggleActivityBar: () => void
  togglePanelsInverted: () => void
  toggleCenteredLayout: () => void
  setCommandPalettePosition: (pos: 'top' | 'center') => void
  setKeybinding: (id: string, keybinding: string) => void
  resetKeybinding: (id: string) => void

  // ── Actions: Split view ──
  openSecondSlot: () => void
  closeSecondSlot: () => void
  resetSecondSlot: () => void
  loadSIFInSecondSlot: (projectId: string, sifId: string) => void
  setSecondSlotTab: (tab: CanonicalSIFTab) => void
  initializeAuth: () => Promise<void>
  refreshProfile: () => Promise<void>
  signInWithOAuth: (provider: OAuthProviderName) => Promise<void>
  signInWithPassword: (email: string, password: string) => Promise<void>
  signUpWithPassword: (
    email: string,
    password: string,
    fullName: string,
    metadata?: { company?: string; jobTitle?: string },
  ) => Promise<PasswordSignUpResult>
  requestPasswordReset: (email: string) => Promise<void>
  signOut: () => Promise<void>
  fetchComponentTemplates: (includeArchived?: boolean) => Promise<void>
  saveComponentTemplate: (input: ComponentTemplateUpsertInput) => Promise<ComponentTemplate>
  importComponentTemplates: (inputs: ComponentTemplateUpsertInput[]) => Promise<ComponentTemplate[]>
  archiveComponentTemplate: (templateId: string) => Promise<void>
  deleteComponentTemplate: (templateId: string) => Promise<void>
  openProjectAccess: (projectId: string) => void
  closeProjectAccess: () => void
  fetchProjectAccess: (projectId: string) => Promise<void>
  initializeProjectAccess: (projectId: string) => Promise<void>
  createProjectRole: (
    projectId: string,
    input: { roleKey: string; name: string; description: string; color: string; sortOrder: number },
  ) => Promise<void>
  updateProjectRole: (
    projectId: string,
    roleId: string,
    patch: { name?: string; description?: string; color?: string; sortOrder?: number },
  ) => Promise<void>
  deleteProjectRole: (projectId: string, roleId: string) => Promise<void>
  setProjectRolePermission: (
    projectId: string,
    roleId: string,
    permission: ProjectPermissionKey,
    enabled: boolean,
  ) => Promise<void>
  addProjectMemberByEmail: (projectId: string, email: string, roleId: string) => Promise<void>
  updateProjectMemberRole: (projectId: string, memberId: string, roleId: string) => Promise<void>
  updateProjectMemberStatus: (projectId: string, memberId: string, status: ProjectMemberStatus) => Promise<void>
  removeProjectMember: (projectId: string, memberId: string) => Promise<void>

  // ── Actions: Data ──
  setProjects: (projects: Project[]) => void
  setSyncError: (err: string | null) => void
  setAuthError: (err: string | null) => void
  setComponentTemplatesError: (err: string | null) => void
  setProjectAccessError: (err: string | null) => void

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
  publishRevision: (
    projectId: string,
    sifId: string,
    data: { changeDescription: string; createdBy: string },
  ) => Promise<void>
  startNextRevision: (projectId: string, sifId: string) => Promise<void>
}
