import type { ProjectStatus } from '@/core/types'
import {
  parsePrismFile,
  type PrismFile,
  type PrismProjectPayload,
} from '@/lib/prismFormat'
import type { AIProjectDraftProposal, PrismProjectDraftFile } from './types'
import { extractJsonPayload } from './sifDraftProposal'

const ALLOWED_PROJECT_STANDARDS = new Set(['IEC61511', 'IEC61508', 'ISA84'])
const ALLOWED_PROJECT_STATUSES = new Set<ProjectStatus>(['active', 'completed', 'archived'])

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map(entry => typeof entry === 'string' ? entry.trim() : '')
    .filter(Boolean)
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null
}

function sanitizeProjectDraftFile(value: unknown): { ok: true; prismFile: PrismProjectDraftFile } | { ok: false; error: string } {
  if (!value || typeof value != 'object') {
    return { ok: false, error: 'Le champ prism_file est manquant.' }
  }

  let prismFile: PrismFile
  try {
    prismFile = parsePrismFile(JSON.stringify(value))
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Le contrat .prism projet est invalide.',
    }
  }

  if (prismFile.type !== 'project') {
    return { ok: false, error: 'Le contrat .prism doit être de type project.' }
  }

  const payload = asRecord(prismFile.payload)
  const projectMeta = asRecord(payload?.projectMeta)
  const sifs = payload?.sifs
  if (!projectMeta) {
    return { ok: false, error: 'Le champ payload.projectMeta est manquant.' }
  }
  if (!Array.isArray(sifs)) {
    return { ok: false, error: 'Le champ payload.sifs doit être un tableau.' }
  }

  const name = typeof projectMeta.name === 'string' ? projectMeta.name.trim() : ''
  const standard = typeof projectMeta.standard === 'string' ? projectMeta.standard.trim() : ''
  const status = typeof projectMeta.status === 'string' ? projectMeta.status.trim() : ''
  if (!name) {
    return { ok: false, error: 'Le nom du projet est obligatoire dans prism_file.payload.projectMeta.name.' }
  }
  if (!ALLOWED_PROJECT_STANDARDS.has(standard)) {
    return { ok: false, error: 'Le standard projet doit être IEC61511, IEC61508 ou ISA84.' }
  }
  if (!ALLOWED_PROJECT_STATUSES.has(status as ProjectStatus)) {
    return { ok: false, error: 'Le statut projet doit être active, completed ou archived.' }
  }

  for (const sif of sifs) {
    if (!asRecord(sif)) {
      return { ok: false, error: 'Chaque entrée de payload.sifs doit être un objet JSON.' }
    }
  }

  const normalizedPayload: PrismProjectPayload = {
    projectMeta: {
      name,
      ref: typeof projectMeta.ref === 'string' ? projectMeta.ref.trim() : '',
      client: typeof projectMeta.client === 'string' ? projectMeta.client.trim() : '',
      site: typeof projectMeta.site === 'string' ? projectMeta.site.trim() : '',
      unit: typeof projectMeta.unit === 'string' ? projectMeta.unit.trim() : '',
      standard: standard as PrismProjectPayload['projectMeta']['standard'],
      revision: typeof projectMeta.revision === 'string' ? projectMeta.revision.trim() : '',
      description: typeof projectMeta.description === 'string' ? projectMeta.description.trim() : '',
      status: status as ProjectStatus,
    },
    sifs: sifs as PrismProjectPayload['sifs'],
  }

  return {
    ok: true,
    prismFile: {
      ...prismFile,
      type: 'project',
      payload: normalizedPayload,
    },
  }
}

export function parseProjectDraftProposalRecord(
  record: Record<string, unknown>,
): { ok: true; proposal: AIProjectDraftProposal } | { ok: false; error: string } {
  const summary = typeof record.summary === 'string' ? record.summary.trim() : ''
  if (!summary) {
    return { ok: false, error: 'Le champ summary est manquant.' }
  }

  const prismFileResult = sanitizeProjectDraftFile(record.prism_file ?? record.prismFile)
  if (!prismFileResult.ok) return prismFileResult

  return {
    ok: true,
    proposal: {
      kind: 'project_draft',
      command: 'create_project',
      summary,
      assumptions: asStringArray(record.assumptions),
      missingData: asStringArray(record.missing_data ?? record.missingData),
      uncertainData: asStringArray(record.uncertain_data ?? record.uncertainData),
      conflicts: asStringArray(record.conflicts),
      prismFile: prismFileResult.prismFile,
    },
  }
}

export function parseProjectDraftProposalResponse(
  raw: string,
): { ok: true; proposal: AIProjectDraftProposal } | { ok: false; error: string } {
  const payload = extractJsonPayload(raw)
  if (!payload) {
    return { ok: false, error: 'Réponse JSON vide.' }
  }

  let data: unknown
  try {
    data = JSON.parse(payload)
  } catch (error) {
    return {
      ok: false,
      error: `JSON invalide: ${error instanceof Error ? error.message : String(error)}`,
    }
  }

  if (!data || typeof data !== 'object') {
    return { ok: false, error: 'La réponse n’est pas un objet JSON.' }
  }

  return parseProjectDraftProposalRecord(data as Record<string, unknown>)
}
