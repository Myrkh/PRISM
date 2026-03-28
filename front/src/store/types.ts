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
  Project, SIF, SIFSubsystem, SIFComponent, Architecture,
  ProofTestProcedure, TestCampaign, OperationalEvent, HAZOPTrace,
  OAuthProviderName, PasswordSignUpResult, SIFRevision, UserProfile,
} from '@/core/types'
import type { AppPreferences } from '@/core/models/appPreferences'
import type { PrismFile, PrismProjectPayload } from '@/lib/prismFormat'

// ─── Navigation ───────────────────────────────────────────────────────────
export type AppSettingsSection = 'general' | 'workspace' | 'engine' | 'shortcuts' | 'export' | 'ai'
export type ProfileSettingsSection = 'account' | 'session'
export type SettingsSection = AppSettingsSection | ProfileSettingsSection

export const APP_SETTINGS_SECTIONS: readonly AppSettingsSection[] = ['general', 'workspace', 'engine', 'shortcuts', 'export', 'ai']
export const PROFILE_SETTINGS_SECTIONS: readonly ProfileSettingsSection[] = ['account', 'session']
export const SETTINGS_SECTIONS: readonly SettingsSection[] = [...APP_SETTINGS_SECTIONS, ...PROFILE_SETTINGS_SECTIONS]

export function isProfileSettingsSection(section: SettingsSection | string | null | undefined): section is ProfileSettingsSection {
  return typeof section === 'string' && PROFILE_SETTINGS_SECTIONS.includes(section as ProfileSettingsSection)
}

export function isAppSettingsSection(section: SettingsSection | string | null | undefined): section is AppSettingsSection {
  return typeof section === 'string' && APP_SETTINGS_SECTIONS.includes(section as AppSettingsSection)
}

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
      action?: 'create-sensor' | 'create-logic' | 'create-actuator'
    }
  | { type: 'settings'; section: SettingsSection }
  | { type: 'docs' }
  | { type: 'audit-log' }
  | { type: 'sif-history' }
  | { type: 'engine' }
  | { type: 'hazop' }
  | { type: 'lopa'; projectId?: string; studyId?: string }
  | { type: 'sif-dashboard'; projectId: string; sifId: string; tab: SIFTab }
  | { type: 'prism-file'; filename: PrismEditableFile | 'sif-registry.md' }

// ─── .prism/ workspace intelligence files ─────────────────────────────────
export type PrismEditableFile = 'context.md' | 'conventions.md' | 'standards.md'
export const PRISM_EDITABLE_FILES: readonly PrismEditableFile[] = [
  'context.md',
  'conventions.md',
  'standards.md',
]
export const DEFAULT_PRISM_FILES: Record<PrismEditableFile, string> = {
  'context.md': '',
  'conventions.md': '',
  'standards.md': '',
}
export const PRISM_FILE_META: Readonly<Record<PrismEditableFile, { label: string; hint: string; placeholder: string }>> = {
  'context.md': {
    label: 'Contexte projet',
    hint: 'Décrivez le projet, le site, les enjeux de sécurité, les parties prenantes…',
    placeholder: [
      '# Contexte projet',
      '',
      '## Site et installation',
      '<!-- Nom du site, localisation, type d\'installation (raffinerie, chimie, pharma...) -->',
      '',
      '## Responsables',
      '<!-- Ingénieur SIS responsable, client, bureau d\'études -->',
      '',
      '## Contraintes particulières',
      '<!-- Ex: pas de redondance >2oo3, mission time 20 ans, SEVESO seuil haut... -->',
      '',
      '## Standards supplémentaires applicables',
      '<!-- Ex: EN 50156-1 pour fours, API 14C pour offshore... -->',
    ].join('\n'),
  },
  'conventions.md': {
    label: 'Conventions',
    hint: 'Nomenclature, unités, valeurs par défaut du projet…',
    placeholder: [
      '# Conventions d\'ingénierie',
      '',
      '## Nomenclature SIF',
      '<!-- Exemple: SIF-XXX où XXX = numéro séquentiel sur 3 chiffres -->',
      '',
      '## Unités',
      '- λD : toujours en /h (heures)',
      '- PST : en secondes',
      '- PFD : notation scientifique 10⁻ⁿ',
      '',
      '## Valeurs β par défaut',
      '- Même fournisseur, même ligne : 10%',
      '- Fournisseurs différents : 5%',
      '- Séparation totale + diversité : 2%',
      '',
      '## SFF minimum requis',
      '<!-- Ex: SFF ≥ 60% pour tous les composants de ce projet -->',
    ].join('\n'),
  },
  'standards.md': {
    label: 'Normes applicables',
    hint: 'Normes, réglementation, SIL maximum autorisé sur ce site…',
    placeholder: [
      '# Normes et réglementation',
      '',
      '## Normes de référence',
      '- IEC 61511-1:2016 + Amendment 1:2017',
      '- IEC 61508-2:2010 (pour les composants)',
      '',
      '## Réglementation',
      '<!-- Ex: ICPE rubrique 4XXX, Directive SEVESO III, arrêté ministériel... -->',
      '',
      '## SIL maximum autorisé sur ce site',
      '<!-- Ex: SIL max = 2 (politique entreprise) -->',
      '',
      '## Critères de risque tolérable (LOPA)',
      '- Décès unique : 10⁻⁴ /an',
      '- Décès multiple : 10⁻⁵ /an',
      '',
      '## Sources de données λD',
      '<!-- Ex: exida SERH 2019, données fabricant certifiées IEC 61508 -->',
    ].join('\n'),
  },
}

export type RightPanelSection = 'analysis' | 'compliance' | 'prooftest' | 'verification' | 'exploitation'
export type RightPanelTabsState = Record<RightPanelSection, string | null>

export type AISIFDraftCommand = 'create_sif' | 'draft_sif'
export type AIProjectDraftCommand = 'create_project'

export type AILibraryDraftCommand = 'create_library'

export type AISIFDraftFieldState = 'provided' | 'missing' | 'uncertain' | 'conflict'
export type AISIFDraftFieldKey =
  | 'sif_number'
  | 'title'
  | 'process_tag'
  | 'hazardous_event'
  | 'target_sil'
  | 'demand_rate'
  | 'rrf_required'
  | 'process_safety_time'
  | 'sif_response_time'
  | 'safe_state'
  | 'sensor_architecture'
  | 'logic_architecture'
  | 'actuator_architecture'

export type AILibraryDraftFieldKey =
  | 'template_name'
  | 'template_scope'
  | 'target_project'
  | 'library_name'
  | 'review_status'
  | 'source_reference'
  | 'tags'
  | 'subsystem_type'
  | 'instrument_category'
  | 'instrument_type'
  | 'manufacturer'
  | 'data_source'
  | 'determined_character'
  | 'component_description'
  | 'factorized_lambda'
  | 'factorized_lambda_d_ratio'
  | 'factorized_dcd'
  | 'factorized_dcs'
  | 'lambda_du'
  | 'lambda_dd'
  | 'lambda_su'
  | 'lambda_sd'
  | 'test_t1'
  | 'test_t0'
  | 'test_type'
  | 'proof_test_coverage'
  | 'lifetime'

export interface AILibraryDraftTemplateFileEntry {
  id?: string
  name: string
  description: string
  subsystemType: SIFComponent['subsystemType']
  libraryName: string | null
  sourceReference: string | null
  tags: string[]
  reviewStatus: 'draft' | 'review' | 'approved'
  componentSnapshot: SIFComponent
}

export interface AILibraryDraftFile {
  format: 'prism.component-templates'
  version: number
  exportedAt: string
  exportedByProfileId: string | null
  projectId: string | null
  libraryName: string | null
  templates: AILibraryDraftTemplateFileEntry[]
}

export interface AISIFDraftSubsystemArchitecture {
  sensor?: Architecture
  logic?: Architecture
  actuator?: Architecture
}

export interface AISIFDraftSeed {
  sifNumber?: string
  title?: string
  description?: string
  pid?: string
  location?: string
  processTag?: string
  hazardousEvent?: string
  demandRate?: number
  targetSIL?: 0 | 1 | 2 | 3 | 4
  rrfRequired?: number
  madeBy?: string
  verifiedBy?: string
  approvedBy?: string
  date?: string
  processSafetyTime?: number
  sifResponseTime?: number
  safeState?: string
  status?: SIF['status']
  subsystemArchitecture?: AISIFDraftSubsystemArchitecture
  initArchitecture?: Architecture
}

export type PrismProjectDraftFile = PrismFile & {
  type: 'project'
  payload: PrismProjectPayload
}

export interface AISIFDraftPreviewInput {
  messageId: string
  command: AISIFDraftCommand
  projectId: string
  summary: string
  assumptions: string[]
  missingData: string[]
  uncertainData: string[]
  conflicts: string[]
  fieldStatus: Partial<Record<AISIFDraftFieldKey, AISIFDraftFieldState>>
  draft: AISIFDraftSeed
}

export interface AISIFDraftPreview {
  messageId: string
  command: AISIFDraftCommand
  projectId: string
  projectName: string
  sifId: string
  summary: string
  assumptions: string[]
  missingData: string[]
  uncertainData: string[]
  conflicts: string[]
  fieldStatus: Partial<Record<AISIFDraftFieldKey, AISIFDraftFieldState>>
  draft: AISIFDraftSeed
}

export interface AISIFDraftResult {
  messageId: string
  projectId: string
  sifId: string
}

export interface AIProjectDraftPreviewInput {
  messageId: string
  command: AIProjectDraftCommand
  summary: string
  assumptions: string[]
  missingData: string[]
  uncertainData: string[]
  conflicts: string[]
  prismFile: PrismProjectDraftFile
}

export interface AIProjectDraftPreview {
  messageId: string
  command: AIProjectDraftCommand
  summary: string
  assumptions: string[]
  missingData: string[]
  uncertainData: string[]
  conflicts: string[]
  prismFile: PrismProjectDraftFile
}

export interface AIProjectDraftResult {
  messageId: string
  projectId: string
  firstSifId: string | null
}

export interface AILibraryDraftPreviewInput {
  messageId: string
  command: AILibraryDraftCommand
  targetScope: 'user' | 'project'
  targetProjectId: string | null
  targetProjectName: string | null
  summary: string
  assumptions: string[]
  missingData: string[]
  uncertainData: string[]
  conflicts: string[]
  fieldStatus: Partial<Record<AILibraryDraftFieldKey, AISIFDraftFieldState>>
  libraryFile: AILibraryDraftFile
  templateInput: ComponentTemplateUpsertInput
}

export interface AILibraryDraftPreview {
  messageId: string
  command: AILibraryDraftCommand
  targetScope: 'user' | 'project'
  targetProjectId: string | null
  targetProjectName: string | null
  summary: string
  assumptions: string[]
  missingData: string[]
  uncertainData: string[]
  conflicts: string[]
  fieldStatus: Partial<Record<AILibraryDraftFieldKey, AISIFDraftFieldState>>
  libraryFile: AILibraryDraftFile
  templateInput: ComponentTemplateUpsertInput
}

export interface AILibraryDraftResult {
  messageId: string
  templateId: string
  origin: 'project' | 'user'
  libraryName: string | null
}

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
  keybindingsReturnView: AppView | null
  userCommandsReturnView: AppView | null

  // ── UI ──
  selectedComponentId: string | null
  pinnedSIFIds: string[]
  rightPanelTabs: RightPanelTabsState
  isProjectModalOpen: boolean
  editingProjectId: string | null
  isSIFModalOpen: boolean
  editingSIFId: string | null
  newSIFProjectId: string | null
  projectSidebarPinnedCollapsed: boolean
  projectSidebarProjectsCollapsed: boolean

  // ── Layout panels ──
  leftPanelOpen: boolean
  rightPanelOpen: boolean
  focusMode: boolean
  chatPanelOpen: boolean

  // ── .prism/ workspace intelligence files ──
  prismFiles: Record<PrismEditableFile, string>
  aiDraftPreview: AISIFDraftPreview | null
  aiDraftResults: Record<string, AISIFDraftResult>
  aiProjectDraftPreview: AIProjectDraftPreview | null
  aiProjectDraftResults: Record<string, AIProjectDraftResult>
  aiLibraryDraftPreview: AILibraryDraftPreview | null
  aiLibraryDraftResults: Record<string, AILibraryDraftResult>

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
  toggleProjectSidebarPinnedCollapsed: () => void
  toggleProjectSidebarProjectsCollapsed: () => void

  // ── Actions: Layout panels ──
  toggleLeftPanel: () => void
  toggleRightPanel: () => void
  setRightPanelOpen: (open: boolean) => void
  toggleChatPanel: () => void
  setChatPanelOpen: (open: boolean) => void
  setPrismFile: (filename: PrismEditableFile, content: string) => void
  replacePrismFiles: (files: Record<PrismEditableFile, string>) => void
  openAISIFDraftPreview: (input: AISIFDraftPreviewInput) => AISIFDraftPreview | null
  replaceAISIFDraftPreview: (input: AISIFDraftPreviewInput) => AISIFDraftPreview | null
  discardAISIFDraftPreview: () => void
  applyAISIFDraftPreview: () => Promise<AISIFDraftResult | null>
  clearAISIFDraftResult: (messageId: string) => void
  openAIProjectDraftPreview: (input: AIProjectDraftPreviewInput) => AIProjectDraftPreview | null
  replaceAIProjectDraftPreview: (input: AIProjectDraftPreviewInput) => AIProjectDraftPreview | null
  discardAIProjectDraftPreview: () => void
  applyAIProjectDraftPreview: () => Promise<AIProjectDraftResult | null>
  clearAIProjectDraftResult: (messageId: string) => void
  openAILibraryDraftPreview: (input: AILibraryDraftPreviewInput) => AILibraryDraftPreview | null
  replaceAILibraryDraftPreview: (input: AILibraryDraftPreviewInput) => AILibraryDraftPreview | null
  discardAILibraryDraftPreview: () => void
  applyAILibraryDraftPreview: () => Promise<AILibraryDraftResult | null>
  clearAILibraryDraftResult: (messageId: string) => void
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

  // ── Actions: LOPA ──
  createLOPAStudy: (projectId: string, name?: string) => string
  addLOPAScenario: (projectId: string, studyId: string, scenario: import('@/core/types').LOPAScenario) => void
  updateLOPAScenario: (projectId: string, studyId: string, scenarioId: string, updates: Partial<import('@/core/types').LOPAScenario>) => void
  deleteLOPAScenario: (projectId: string, studyId: string, scenarioId: string) => void
  reorderLOPAScenarios: (projectId: string, studyId: string, orderedIds: string[]) => void

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
