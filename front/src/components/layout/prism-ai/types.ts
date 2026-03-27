import type { Architecture, ComponentTemplateUpsertInput, Project, SIFComponent, SIFStatus, SILLevel, SubsystemType } from '@/core/types'
import type { PrismFile, PrismProjectPayload } from '@/lib/prismFormat'

export type AIProposalCommand = 'create_project' | 'create_sif' | 'draft_sif' | 'create_library'
export type AIProjectDraftCommand = 'create_project'
export type AILibraryDraftCommand = 'create_library'
export type AISubsystemDraftKey = 'sensor' | 'logic' | 'actuator'
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
  subsystemType: SubsystemType
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

export interface AISIFDraftFields {
  sifNumber?: string
  title?: string
  description?: string
  pid?: string
  location?: string
  processTag?: string
  hazardousEvent?: string
  demandRate?: number
  targetSIL?: SILLevel
  rrfRequired?: number
  madeBy?: string
  verifiedBy?: string
  approvedBy?: string
  date?: string
  processSafetyTime?: number
  sifResponseTime?: number
  safeState?: string
  status?: SIFStatus
  subsystemArchitecture?: AISIFDraftSubsystemArchitecture
  initArchitecture?: Architecture
}

export interface AISIFDraftProposal {
  kind: 'sif_draft'
  command: Extract<AIProposalCommand, 'create_sif' | 'draft_sif'>
  targetProjectId: string
  targetProjectName: string
  summary: string
  assumptions: string[]
  missingData: string[]
  uncertainData: string[]
  conflicts: string[]
  fieldStatus: Partial<Record<AISIFDraftFieldKey, AISIFDraftFieldState>>
  draft: AISIFDraftFields
}

export type PrismProjectDraftFile = PrismFile & {
  type: 'project'
  payload: PrismProjectPayload
}

export interface AIProjectDraftProposal {
  kind: 'project_draft'
  command: AIProjectDraftCommand
  summary: string
  assumptions: string[]
  missingData: string[]
  uncertainData: string[]
  conflicts: string[]
  prismFile: PrismProjectDraftFile
}

export interface AILibraryDraftProposal {
  kind: 'library_draft'
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

export type AIProposal = AISIFDraftProposal | AIProjectDraftProposal | AILibraryDraftProposal

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  proposal?: AIProposal | null
}

export interface ChatConversation {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: ChatMessage[]
  contextSIFId?: string
  contextSIFName?: string
  attachedWorkspaceItems?: AttachedWorkspaceItem[]
  assistantNoteIds?: Record<string, string>
  strictMode?: boolean
}

export interface AttachedContext {
  sifId: string
  sifName: string
}

export interface AttachedWorkspaceItem {
  nodeId: string
  nodeName: string
  nodeType: 'note' | 'pdf' | 'image' | 'json'
}

export type AttachableSIF = {
  sifId: string
  sifName: string
  sifNumber: string
  projectName: string
}

export interface ChatConfig {
  model: string
  systemPrompt: string
}

export type ChatResponseMode = 'default' | 'draft_note' | 'create_project' | 'create_sif' | 'draft_sif' | 'create_library'

export type ChatInputMenuItem = {
  id: string
  badge: string
  badgeColor: string
  label: string
  meta: string
  active?: boolean
  onSelect: () => void
}

export interface ParsedProjectScopedCommand {
  kind: AIProposalCommand
  projectQuery: string | null
  prompt: string
}

export type ProjectResolutionResult =
  | { status: 'ok'; project: Project }
  | { status: 'missing' }
  | { status: 'not_found'; query: string }
  | { status: 'ambiguous'; query: string; matches: Project[] }
