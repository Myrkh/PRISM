import type { Architecture, Project, SILLevel, SIFStatus } from '@/core/types'
import type {
  AIProposalCommand,
  AISIFDraftFieldKey,
  AISIFDraftFieldState,
  AISIFDraftFields,
  AISIFDraftProposal,
  AISIFDraftSubsystemArchitecture,
} from './types'

const ALLOWED_ARCHITECTURES = new Set(['1oo1', '1oo2', '2oo2', '2oo3', '1oo2D', 'custom'])
const ALLOWED_STATUSES = new Set(['draft', 'in_review', 'verified', 'approved', 'archived'])
const ALLOWED_FIELD_STATES = new Set(['provided', 'missing', 'uncertain', 'conflict'])
const ALLOWED_FIELD_STATUS_KEYS = new Set<AISIFDraftFieldKey>([
  'sif_number',
  'title',
  'process_tag',
  'hazardous_event',
  'target_sil',
  'demand_rate',
  'rrf_required',
  'process_safety_time',
  'sif_response_time',
  'safe_state',
  'sensor_architecture',
  'logic_architecture',
  'actuator_architecture',
])

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map(entry => typeof entry === 'string' ? entry.trim() : '')
    .filter(Boolean)
}

function coerceFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').trim()
    if (!normalized) return undefined
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function coerceSilLevel(value: unknown): SILLevel | undefined {
  const parsed = coerceFiniteNumber(value)
  if (parsed === undefined) return undefined
  return [0, 1, 2, 3, 4].includes(parsed) ? (parsed as SILLevel) : undefined
}

function coerceStatus(value: unknown): SIFStatus | undefined {
  return typeof value === 'string' && ALLOWED_STATUSES.has(value) ? (value as SIFStatus) : undefined
}

function coerceArchitecture(value: unknown): Architecture | undefined {
  return typeof value === 'string' && ALLOWED_ARCHITECTURES.has(value)
    ? value as Architecture
    : undefined
}

export function extractJsonPayload(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced?.[1]?.trim()) return fenced[1].trim()

  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1)
  return trimmed
}

function sanitizeSubsystemArchitecture(value: unknown): AISIFDraftSubsystemArchitecture | undefined {
  if (!value || typeof value !== 'object') return undefined
  const raw = value as Record<string, unknown>
  const next: AISIFDraftSubsystemArchitecture = {
    sensor: coerceArchitecture(raw.sensor),
    logic: coerceArchitecture(raw.logic),
    actuator: coerceArchitecture(raw.actuator),
  }
  return next.sensor || next.logic || next.actuator ? next : undefined
}

function sanitizeFieldStatus(value: unknown): Partial<Record<AISIFDraftFieldKey, AISIFDraftFieldState>> {
  if (!value || typeof value !== 'object') return {}
  const raw = value as Record<string, unknown>
  const next: Partial<Record<AISIFDraftFieldKey, AISIFDraftFieldState>> = {}

  Object.entries(raw).forEach(([key, fieldValue]) => {
    if (!ALLOWED_FIELD_STATUS_KEYS.has(key as AISIFDraftFieldKey)) return
    if (typeof fieldValue !== 'string' || !ALLOWED_FIELD_STATES.has(fieldValue)) return
    next[key as AISIFDraftFieldKey] = fieldValue as AISIFDraftFieldState
  })

  return next
}

function sanitizeDraftFields(value: unknown): AISIFDraftFields {
  if (!value || typeof value !== 'object') return {}
  const raw = value as Record<string, unknown>
  const initArchitecture = coerceArchitecture(raw.init_architecture ?? raw.initArchitecture)
  return {
    sifNumber: typeof raw.sif_number === 'string'
      ? raw.sif_number.trim()
      : typeof raw.sifNumber === 'string'
        ? raw.sifNumber.trim()
        : undefined,
    title: typeof raw.title === 'string' ? raw.title.trim() : undefined,
    description: typeof raw.description === 'string' ? raw.description.trim() : undefined,
    pid: typeof raw.pid === 'string' ? raw.pid.trim() : undefined,
    location: typeof raw.location === 'string' ? raw.location.trim() : undefined,
    processTag: typeof raw.process_tag === 'string'
      ? raw.process_tag.trim()
      : typeof raw.processTag === 'string'
        ? raw.processTag.trim()
        : undefined,
    hazardousEvent: typeof raw.hazardous_event === 'string'
      ? raw.hazardous_event.trim()
      : typeof raw.hazardousEvent === 'string'
        ? raw.hazardousEvent.trim()
        : undefined,
    demandRate: coerceFiniteNumber(raw.demand_rate ?? raw.demandRate),
    targetSIL: coerceSilLevel(raw.target_sil ?? raw.targetSIL),
    rrfRequired: coerceFiniteNumber(raw.rrf_required ?? raw.rrfRequired),
    madeBy: typeof raw.made_by === 'string'
      ? raw.made_by.trim()
      : typeof raw.madeBy === 'string'
        ? raw.madeBy.trim()
        : undefined,
    verifiedBy: typeof raw.verified_by === 'string'
      ? raw.verified_by.trim()
      : typeof raw.verifiedBy === 'string'
        ? raw.verifiedBy.trim()
        : undefined,
    approvedBy: typeof raw.approved_by === 'string'
      ? raw.approved_by.trim()
      : typeof raw.approvedBy === 'string'
        ? raw.approvedBy.trim()
        : undefined,
    date: typeof raw.date === 'string' ? raw.date.trim() : undefined,
    processSafetyTime: coerceFiniteNumber(raw.process_safety_time ?? raw.processSafetyTime),
    sifResponseTime: coerceFiniteNumber(raw.sif_response_time ?? raw.sifResponseTime),
    safeState: typeof raw.safe_state === 'string'
      ? raw.safe_state.trim()
      : typeof raw.safeState === 'string'
        ? raw.safeState.trim()
        : undefined,
    status: coerceStatus(raw.status),
    subsystemArchitecture: sanitizeSubsystemArchitecture(raw.subsystem_architecture ?? raw.subsystemArchitecture),
    initArchitecture,
  }
}

function hasText(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

function hasSubsystemArchitectureValue(
  draft: AISIFDraftFields,
  subsystem: keyof NonNullable<AISIFDraftFields['subsystemArchitecture']>,
): boolean {
  return Boolean(draft.subsystemArchitecture?.[subsystem] ?? draft.initArchitecture)
}

function inferFieldStatus(
  draft: AISIFDraftFields,
  explicitFieldStatus: Partial<Record<AISIFDraftFieldKey, AISIFDraftFieldState>>,
): Partial<Record<AISIFDraftFieldKey, AISIFDraftFieldState>> {
  const next: Partial<Record<AISIFDraftFieldKey, AISIFDraftFieldState>> = { ...explicitFieldStatus }

  const checks: Array<{ key: AISIFDraftFieldKey; hasValue: boolean }> = [
    { key: 'sif_number', hasValue: hasText(draft.sifNumber) },
    { key: 'title', hasValue: hasText(draft.title) },
    { key: 'process_tag', hasValue: hasText(draft.processTag) },
    { key: 'hazardous_event', hasValue: hasText(draft.hazardousEvent) },
    { key: 'target_sil', hasValue: typeof draft.targetSIL === 'number' },
    { key: 'demand_rate', hasValue: typeof draft.demandRate === 'number' },
    { key: 'rrf_required', hasValue: typeof draft.rrfRequired === 'number' },
    { key: 'process_safety_time', hasValue: typeof draft.processSafetyTime === 'number' },
    { key: 'sif_response_time', hasValue: typeof draft.sifResponseTime === 'number' },
    { key: 'safe_state', hasValue: hasText(draft.safeState) },
    { key: 'sensor_architecture', hasValue: hasSubsystemArchitectureValue(draft, 'sensor') },
    { key: 'logic_architecture', hasValue: hasSubsystemArchitectureValue(draft, 'logic') },
    { key: 'actuator_architecture', hasValue: hasSubsystemArchitectureValue(draft, 'actuator') },
  ]

  for (const check of checks) {
    if (!next[check.key]) next[check.key] = check.hasValue ? 'provided' : 'missing'
  }

  return next
}

function validateFieldStatusCoverage(
  draft: AISIFDraftFields,
  fieldStatus: Partial<Record<AISIFDraftFieldKey, AISIFDraftFieldState>>,
): string | null {
  const checks: Array<{ key: AISIFDraftFieldKey; hasValue: boolean }> = [
    { key: 'process_tag', hasValue: hasText(draft.processTag) },
    { key: 'target_sil', hasValue: typeof draft.targetSIL === 'number' },
    { key: 'demand_rate', hasValue: typeof draft.demandRate === 'number' },
    { key: 'rrf_required', hasValue: typeof draft.rrfRequired === 'number' },
    { key: 'process_safety_time', hasValue: typeof draft.processSafetyTime === 'number' },
    { key: 'sif_response_time', hasValue: typeof draft.sifResponseTime === 'number' },
    { key: 'safe_state', hasValue: hasText(draft.safeState) },
    { key: 'sensor_architecture', hasValue: hasSubsystemArchitectureValue(draft, 'sensor') },
    { key: 'logic_architecture', hasValue: hasSubsystemArchitectureValue(draft, 'logic') },
    { key: 'actuator_architecture', hasValue: hasSubsystemArchitectureValue(draft, 'actuator') },
  ]

  for (const check of checks) {
    const state = fieldStatus[check.key]
    if (!check.hasValue) {
      if (state === 'provided') {
        return `Le statut ${check.key}=provided est incohérent: aucune valeur n'est fournie.`
      }
      continue
    }
    if (!state) {
      return `Le champ critique ${check.key} a une valeur mais aucun field_status associé.`
    }
    if (state !== 'provided') {
      return `Le champ critique ${check.key} ne peut pas avoir de valeur quand son field_status vaut ${state}.`
    }
  }

  return null
}

export function parseSifDraftProposalRecord(
  record: Record<string, unknown>,
  command: Extract<AIProposalCommand, 'create_sif' | 'draft_sif'>,
  targetProject: Project,
): { ok: true; proposal: AISIFDraftProposal } | { ok: false; error: string } {
  const draft = sanitizeDraftFields(record.sif_draft ?? record.sifDraft ?? record.draft)
  const summary = typeof record.summary === 'string' ? record.summary.trim() : ''
  const assumptions = asStringArray(record.assumptions)
  const missingData = asStringArray(record.missing_data ?? record.missingData)
  const uncertainData = asStringArray(record.uncertain_data ?? record.uncertainData)
  const conflicts = asStringArray(record.conflicts)
  const fieldStatus = inferFieldStatus(
    draft,
    sanitizeFieldStatus(record.field_status ?? record.fieldStatus),
  )

  if (!summary) {
    return { ok: false, error: 'Le champ summary est manquant.' }
  }

  const fieldStatusError = validateFieldStatusCoverage(draft, fieldStatus)
  if (fieldStatusError) {
    return { ok: false, error: fieldStatusError }
  }

  if (!draft.title && !draft.hazardousEvent && !draft.description) {
    return { ok: false, error: 'Le brouillon SIF ne contient aucun contenu métier exploitable.' }
  }

  return {
    ok: true,
    proposal: {
      kind: 'sif_draft',
      command,
      targetProjectId: targetProject.id,
      targetProjectName: targetProject.name,
      summary,
      assumptions,
      missingData,
      uncertainData,
      conflicts,
      fieldStatus,
      draft,
    },
  }
}

export function parseSifDraftProposalResponse(
  raw: string,
  command: Extract<AIProposalCommand, 'create_sif' | 'draft_sif'>,
  targetProject: Project,
): { ok: true; proposal: AISIFDraftProposal } | { ok: false; error: string } {
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

  return parseSifDraftProposalRecord(data as Record<string, unknown>, command, targetProject)
}
