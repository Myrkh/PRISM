import type { AIProjectDraftPreviewInput, AIProjectDraftPreview } from '@/store/types'
import { parseProjectDraftProposalRecord } from './projectDraftProposal'

const AI_PROJECT_DRAFT_DOCUMENT_KIND = 'prism.ai.project-draft'
const AI_PROJECT_DRAFT_DOCUMENT_VERSION = 1

interface AIProjectDraftWorkspaceMeta {
  document_kind: typeof AI_PROJECT_DRAFT_DOCUMENT_KIND
  version: typeof AI_PROJECT_DRAFT_DOCUMENT_VERSION
  message_id: string
  command: AIProjectDraftPreview['command']
}

export interface AIProjectDraftWorkspaceDocument {
  kind: 'project_draft'
  summary: string
  assumptions: string[]
  missing_data: string[]
  uncertain_data: string[]
  conflicts: string[]
  prism_file: AIProjectDraftPreviewInput['prismFile']
  _prism: AIProjectDraftWorkspaceMeta
}

export interface AIProjectDraftWorkspaceMetaInfo {
  messageId: string
  command: AIProjectDraftPreview['command']
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseWorkspaceMeta(record: Record<string, unknown>): { ok: true; meta: AIProjectDraftWorkspaceMeta } | { ok: false; error: string } {
  const metaRecord = isRecord(record._prism)
    ? record._prism
    : isRecord(record.prism_meta) && typeof record.message_id === 'string'
      ? {
          document_kind: AI_PROJECT_DRAFT_DOCUMENT_KIND,
          version: AI_PROJECT_DRAFT_DOCUMENT_VERSION,
          message_id: record.message_id,
          command: record.command,
        }
      : null

  if (!metaRecord) {
    return { ok: false, error: 'Les métadonnées PRISM du draft projet sont manquantes.' }
  }
  if (metaRecord.document_kind !== AI_PROJECT_DRAFT_DOCUMENT_KIND) {
    return { ok: false, error: 'Type de document JSON non supporté pour un draft projet PRISM AI.' }
  }
  if (metaRecord.version !== AI_PROJECT_DRAFT_DOCUMENT_VERSION) {
    return { ok: false, error: 'Version de document JSON non supportée.' }
  }

  const messageId = typeof metaRecord.message_id === 'string' ? metaRecord.message_id.trim() : ''
  if (!messageId) {
    return { ok: false, error: 'Le champ _prism.message_id est manquant.' }
  }

  if (metaRecord.command !== 'create_project') {
    return { ok: false, error: 'La commande du brouillon projet est invalide.' }
  }

  return {
    ok: true,
    meta: {
      document_kind: AI_PROJECT_DRAFT_DOCUMENT_KIND,
      version: AI_PROJECT_DRAFT_DOCUMENT_VERSION,
      message_id: messageId,
      command: 'create_project',
    },
  }
}

export function deriveAIProjectDraftWorkspaceFilename(preview: Pick<AIProjectDraftPreview, 'prismFile'>): string {
  const projectMeta = preview.prismFile.payload.projectMeta
  const stem = projectMeta.ref?.trim() || projectMeta.name.trim() || 'ai-project-draft'
  const safeStem = stem
    .replace(/[^a-zA-Z0-9\-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return `${safeStem || 'ai-project-draft'}.json`
}

export function buildAIProjectDraftWorkspaceDocument(preview: AIProjectDraftPreview): AIProjectDraftWorkspaceDocument {
  return {
    kind: 'project_draft',
    summary: preview.summary,
    assumptions: [...preview.assumptions],
    missing_data: [...preview.missingData],
    uncertain_data: [...preview.uncertainData],
    conflicts: [...preview.conflicts],
    prism_file: JSON.parse(JSON.stringify(preview.prismFile)) as AIProjectDraftPreviewInput['prismFile'],
    _prism: {
      document_kind: AI_PROJECT_DRAFT_DOCUMENT_KIND,
      version: AI_PROJECT_DRAFT_DOCUMENT_VERSION,
      message_id: preview.messageId,
      command: preview.command,
    },
  }
}

export function serializeAIProjectDraftWorkspaceDocument(preview: AIProjectDraftPreview): string {
  return JSON.stringify(buildAIProjectDraftWorkspaceDocument(preview), null, 2)
}

export function readAIProjectDraftWorkspaceMeta(raw: string): AIProjectDraftWorkspaceMetaInfo | null {
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

export function parseAIProjectDraftWorkspaceDocument(
  raw: string,
  options?: { expectedMessageId?: string },
): { ok: true; input: AIProjectDraftPreviewInput } | { ok: false; error: string } {
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
  if (record.kind !== 'project_draft') {
    return { ok: false, error: 'Type de document JSON non supporté pour un draft projet PRISM AI.' }
  }

  const metaResult = parseWorkspaceMeta(record)
  if (!metaResult.ok) return metaResult
  const { meta } = metaResult

  if (options?.expectedMessageId && meta.message_id !== options.expectedMessageId) {
    return { ok: false, error: 'Le document JSON ne correspond pas au brouillon projet IA attendu.' }
  }

  const parsedProposal = parseProjectDraftProposalRecord({
    summary: record.summary,
    assumptions: record.assumptions,
    missing_data: record.missing_data,
    uncertain_data: record.uncertain_data,
    conflicts: record.conflicts,
    prism_file: record.prism_file,
  })

  if (!parsedProposal.ok) return { ok: false, error: parsedProposal.error }

  return {
    ok: true,
    input: {
      messageId: meta.message_id,
      command: 'create_project',
      summary: parsedProposal.proposal.summary,
      assumptions: parsedProposal.proposal.assumptions,
      missingData: parsedProposal.proposal.missingData,
      uncertainData: parsedProposal.proposal.uncertainData,
      conflicts: parsedProposal.proposal.conflicts,
      prismFile: parsedProposal.proposal.prismFile,
    },
  }
}
