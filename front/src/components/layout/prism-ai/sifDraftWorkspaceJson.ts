import type { Project } from '@/core/types'
import type { AISIFDraftPreviewInput, AISIFDraftPreview } from '@/store/types'
import { parseSifDraftProposalRecord } from './sifDraftProposal'

const AI_SIF_DRAFT_DOCUMENT_KIND = 'prism.ai.sif-draft'
const AI_SIF_DRAFT_DOCUMENT_VERSION = 1

interface AISIFDraftWorkspaceMeta {
  document_kind: typeof AI_SIF_DRAFT_DOCUMENT_KIND
  version: typeof AI_SIF_DRAFT_DOCUMENT_VERSION
  message_id: string
  command: AISIFDraftPreview['command']
  target_project: {
    id: string
    name: string
  }
}

export interface AISIFDraftWorkspaceDocument {
  kind: 'sif_draft'
  summary: string
  assumptions: string[]
  missing_data: string[]
  uncertain_data: string[]
  conflicts: string[]
  field_status: AISIFDraftPreviewInput['fieldStatus']
  sif_draft: AISIFDraftPreviewInput['draft']
  _prism: AISIFDraftWorkspaceMeta
}

export interface AISIFDraftWorkspaceMetaInfo {
  messageId: string
  command: AISIFDraftPreview['command']
  projectId: string
  projectName: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseWorkspaceMeta(record: Record<string, unknown>): { ok: true; meta: AISIFDraftWorkspaceMeta } | { ok: false; error: string } {
  const metaRecord = isRecord(record._prism)
    ? record._prism
    : isRecord(record.target_project) && typeof record.message_id === 'string' && typeof record.command === 'string'
      ? {
          document_kind: AI_SIF_DRAFT_DOCUMENT_KIND,
          version: AI_SIF_DRAFT_DOCUMENT_VERSION,
          message_id: record.message_id,
          command: record.command,
          target_project: record.target_project,
        }
      : null

  if (!metaRecord) {
    return { ok: false, error: 'Les métadonnées PRISM du draft sont manquantes.' }
  }

  if (metaRecord.document_kind !== AI_SIF_DRAFT_DOCUMENT_KIND) {
    return { ok: false, error: 'Type de document JSON non supporté pour un draft SIF PRISM AI.' }
  }
  if (metaRecord.version !== AI_SIF_DRAFT_DOCUMENT_VERSION) {
    return { ok: false, error: 'Version de document JSON non supportée.' }
  }

  const messageId = typeof metaRecord.message_id === 'string' ? metaRecord.message_id.trim() : ''
  if (!messageId) {
    return { ok: false, error: 'Le champ _prism.message_id est manquant.' }
  }

  const command = metaRecord.command === 'create_sif' || metaRecord.command === 'draft_sif'
    ? metaRecord.command
    : null
  if (!command) {
    return { ok: false, error: 'La commande du brouillon SIF est invalide.' }
  }

  const targetProjectRecord = isRecord(metaRecord.target_project) ? metaRecord.target_project : null
  const targetProjectId = typeof targetProjectRecord?.id === 'string' ? targetProjectRecord.id.trim() : ''
  const targetProjectName = typeof targetProjectRecord?.name === 'string' ? targetProjectRecord.name.trim() : ''
  if (!targetProjectId || !targetProjectName) {
    return { ok: false, error: 'Le projet cible du draft est incomplet.' }
  }

  return {
    ok: true,
    meta: {
      document_kind: AI_SIF_DRAFT_DOCUMENT_KIND,
      version: AI_SIF_DRAFT_DOCUMENT_VERSION,
      message_id: messageId,
      command,
      target_project: {
        id: targetProjectId,
        name: targetProjectName,
      },
    },
  }
}

export function deriveAISIFDraftWorkspaceFilename(preview: Pick<AISIFDraftPreview, 'command' | 'draft'>): string {
  const stem = preview.draft.sifNumber?.trim() || preview.draft.title?.trim() || preview.command
  const safeStem = stem
    .replace(/[^a-zA-Z0-9\-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return `${safeStem || 'ai-sif-draft'}.json`
}

export function buildAISIFDraftWorkspaceDocument(preview: AISIFDraftPreview): AISIFDraftWorkspaceDocument {
  return {
    kind: 'sif_draft',
    summary: preview.summary,
    assumptions: [...preview.assumptions],
    missing_data: [...preview.missingData],
    uncertain_data: [...preview.uncertainData],
    conflicts: [...preview.conflicts],
    field_status: { ...preview.fieldStatus },
    sif_draft: {
      ...preview.draft,
      subsystemArchitecture: preview.draft.subsystemArchitecture
        ? { ...preview.draft.subsystemArchitecture }
        : undefined,
    },
    _prism: {
      document_kind: AI_SIF_DRAFT_DOCUMENT_KIND,
      version: AI_SIF_DRAFT_DOCUMENT_VERSION,
      message_id: preview.messageId,
      command: preview.command,
      target_project: {
        id: preview.projectId,
        name: preview.projectName,
      },
    },
  }
}

export function serializeAISIFDraftWorkspaceDocument(preview: AISIFDraftPreview): string {
  return JSON.stringify(buildAISIFDraftWorkspaceDocument(preview), null, 2)
}

export function readAISIFDraftWorkspaceMeta(raw: string): AISIFDraftWorkspaceMetaInfo | null {
  try {
    const parsed = JSON.parse(raw)
    if (!isRecord(parsed)) return null
    const metaResult = parseWorkspaceMeta(parsed)
    if (!metaResult.ok) return null
    return {
      messageId: metaResult.meta.message_id,
      command: metaResult.meta.command,
      projectId: metaResult.meta.target_project.id,
      projectName: metaResult.meta.target_project.name,
    }
  } catch {
    return null
  }
}

export function parseAISIFDraftWorkspaceDocument(
  raw: string,
  projects: Project[],
  options?: { expectedMessageId?: string },
): { ok: true; input: AISIFDraftPreviewInput } | { ok: false; error: string } {
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
  const isLegacyEnvelope = record.kind === AI_SIF_DRAFT_DOCUMENT_KIND
  const isCanonicalDraft = record.kind === 'sif_draft'

  if (!isLegacyEnvelope && !isCanonicalDraft) {
    return { ok: false, error: 'Type de document JSON non supporté pour un draft SIF PRISM AI.' }
  }

  const metaResult = parseWorkspaceMeta(record)
  if (!metaResult.ok) return metaResult
  const { meta } = metaResult

  if (options?.expectedMessageId && meta.message_id !== options.expectedMessageId) {
    return { ok: false, error: 'Le document JSON ne correspond pas au brouillon IA attendu.' }
  }

  const project = projects.find(entry => entry.id === meta.target_project.id)
  if (!project) {
    return { ok: false, error: 'Le projet cible du draft n’existe plus dans PRISM.' }
  }

  const parsedProposal = parseSifDraftProposalRecord({
    summary: record.summary,
    assumptions: record.assumptions,
    missing_data: record.missing_data,
    uncertain_data: record.uncertain_data,
    conflicts: record.conflicts,
    field_status: record.field_status,
    sif_draft: record.sif_draft,
  }, meta.command, project)

  if (!parsedProposal.ok) {
    return { ok: false, error: parsedProposal.error }
  }

  return {
    ok: true,
    input: {
      messageId: meta.message_id,
      command: meta.command,
      projectId: project.id,
      summary: parsedProposal.proposal.summary,
      assumptions: parsedProposal.proposal.assumptions,
      missingData: parsedProposal.proposal.missingData,
      uncertainData: parsedProposal.proposal.uncertainData,
      conflicts: parsedProposal.proposal.conflicts,
      fieldStatus: parsedProposal.proposal.fieldStatus,
      draft: parsedProposal.proposal.draft,
    },
  }
}
