import type { Project } from '@/core/types'
import type { AILibraryDraftPreview, AILibraryDraftPreviewInput } from '@/store/types'
import { parseLibraryDraftProposalRecord } from './libraryDraftProposal'

const AI_LIBRARY_DRAFT_DOCUMENT_KIND = 'prism.ai.library-draft'
const AI_LIBRARY_DRAFT_DOCUMENT_VERSION = 1

interface AILibraryDraftWorkspaceMeta {
  document_kind: typeof AI_LIBRARY_DRAFT_DOCUMENT_KIND
  version: typeof AI_LIBRARY_DRAFT_DOCUMENT_VERSION
  message_id: string
  command: AILibraryDraftPreview['command']
}

export interface AILibraryDraftWorkspaceDocument {
  kind: 'library_draft'
  target_scope: 'user' | 'project'
  target_project_id: string | null
  target_project_name: string | null
  summary: string
  assumptions: string[]
  missing_data: string[]
  uncertain_data: string[]
  conflicts: string[]
  field_status: AILibraryDraftPreview['fieldStatus']
  library_file: AILibraryDraftPreviewInput['libraryFile']
  _prism: AILibraryDraftWorkspaceMeta
}

export interface AILibraryDraftWorkspaceMetaInfo {
  messageId: string
  command: AILibraryDraftPreview['command']
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseWorkspaceMeta(record: Record<string, unknown>): { ok: true; meta: AILibraryDraftWorkspaceMeta } | { ok: false; error: string } {
  const metaRecord = isRecord(record._prism)
    ? record._prism
    : null

  if (!metaRecord) {
    return { ok: false, error: 'Les métadonnées PRISM du draft Library sont manquantes.' }
  }
  if (metaRecord.document_kind !== AI_LIBRARY_DRAFT_DOCUMENT_KIND) {
    return { ok: false, error: 'Type de document JSON non supporté pour un draft Library PRISM AI.' }
  }
  if (metaRecord.version !== AI_LIBRARY_DRAFT_DOCUMENT_VERSION) {
    return { ok: false, error: 'Version de document JSON non supportée.' }
  }

  const messageId = typeof metaRecord.message_id === 'string' ? metaRecord.message_id.trim() : ''
  if (!messageId) {
    return { ok: false, error: 'Le champ _prism.message_id est manquant.' }
  }

  if (metaRecord.command !== 'create_library') {
    return { ok: false, error: 'La commande du brouillon Library est invalide.' }
  }

  return {
    ok: true,
    meta: {
      document_kind: AI_LIBRARY_DRAFT_DOCUMENT_KIND,
      version: AI_LIBRARY_DRAFT_DOCUMENT_VERSION,
      message_id: messageId,
      command: 'create_library',
    },
  }
}

function buildTargetProject(targetProjectId: string | null, targetProjectName: string | null): Project | null {
  if (!targetProjectId) return null
  return {
    id: targetProjectId,
    name: targetProjectName ?? 'Project',
    ref: '',
    client: '',
    site: '',
    unit: '',
    standard: 'IEC61511',
    revision: '',
    description: '',
    status: 'active',
    createdAt: '',
    updatedAt: '',
    sifs: [],
  }
}

export function deriveAILibraryDraftWorkspaceFilename(preview: Pick<AILibraryDraftPreview, 'templateInput'>): string {
  const stem = preview.templateInput.name.trim() || 'ai-library-draft'
  const safeStem = stem
    .replace(/[^a-zA-Z0-9\-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return `${safeStem || 'ai-library-draft'}.json`
}

export function buildAILibraryDraftWorkspaceDocument(preview: AILibraryDraftPreview): AILibraryDraftWorkspaceDocument {
  return {
    kind: 'library_draft',
    target_scope: preview.targetScope,
    target_project_id: preview.targetProjectId,
    target_project_name: preview.targetProjectName,
    summary: preview.summary,
    assumptions: [...preview.assumptions],
    missing_data: [...preview.missingData],
    uncertain_data: [...preview.uncertainData],
    conflicts: [...preview.conflicts],
    field_status: { ...preview.fieldStatus },
    library_file: JSON.parse(JSON.stringify(preview.libraryFile)) as AILibraryDraftPreviewInput['libraryFile'],
    _prism: {
      document_kind: AI_LIBRARY_DRAFT_DOCUMENT_KIND,
      version: AI_LIBRARY_DRAFT_DOCUMENT_VERSION,
      message_id: preview.messageId,
      command: preview.command,
    },
  }
}

export function serializeAILibraryDraftWorkspaceDocument(preview: AILibraryDraftPreview): string {
  return JSON.stringify(buildAILibraryDraftWorkspaceDocument(preview), null, 2)
}

export function readAILibraryDraftWorkspaceMeta(raw: string): AILibraryDraftWorkspaceMetaInfo | null {
  try {
    const parsed = JSON.parse(raw)
    if (!isRecord(parsed)) return null
    const metaResult = parseWorkspaceMeta(parsed)
    if (!metaResult.ok) return null
    return {
      messageId: metaResult.meta.message_id,
      command: metaResult.meta.command,
    }
  } catch {
    return null
  }
}

export function parseAILibraryDraftWorkspaceDocument(
  raw: string,
  options?: { expectedMessageId?: string },
): { ok: true; input: AILibraryDraftPreviewInput } | { ok: false; error: string } {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch (error) {
    return {
      ok: false,
      error: `JSON invalide: ${error instanceof Error ? error.message : String(error)}`,
    }
  }

  if (!isRecord(data)) {
    return { ok: false, error: 'Le document JSON doit être un objet.' }
  }

  const record = data as Record<string, unknown>
  if (record.kind !== 'library_draft') {
    return { ok: false, error: 'Type de document JSON non supporté pour un draft Library PRISM AI.' }
  }

  const metaResult = parseWorkspaceMeta(record)
  if (!metaResult.ok) return metaResult
  const { meta } = metaResult

  if (options?.expectedMessageId && meta.message_id !== options.expectedMessageId) {
    return { ok: false, error: 'Le document JSON ne correspond pas au brouillon Library IA attendu.' }
  }

  const targetScope = record.target_scope === 'project' ? 'project' : 'user'
  const targetProjectId = typeof record.target_project_id === 'string' && record.target_project_id.trim()
    ? record.target_project_id.trim()
    : null
  const targetProjectName = typeof record.target_project_name === 'string' && record.target_project_name.trim()
    ? record.target_project_name.trim()
    : null

  const parsedProposal = parseLibraryDraftProposalRecord({
    summary: record.summary,
    assumptions: record.assumptions,
    missing_data: record.missing_data,
    uncertain_data: record.uncertain_data,
    conflicts: record.conflicts,
    field_status: record.field_status,
    target_scope: targetScope,
    library_file: record.library_file,
  }, buildTargetProject(targetProjectId, targetProjectName))

  if (!parsedProposal.ok) return { ok: false, error: parsedProposal.error }

  return {
    ok: true,
    input: {
      messageId: meta.message_id,
      command: 'create_library',
      targetScope,
      targetProjectId,
      targetProjectName,
      summary: parsedProposal.proposal.summary,
      assumptions: parsedProposal.proposal.assumptions,
      missingData: parsedProposal.proposal.missingData,
      uncertainData: parsedProposal.proposal.uncertainData,
      conflicts: parsedProposal.proposal.conflicts,
      fieldStatus: parsedProposal.proposal.fieldStatus,
      libraryFile: parsedProposal.proposal.libraryFile,
      templateInput: parsedProposal.proposal.templateInput,
    },
  }
}
