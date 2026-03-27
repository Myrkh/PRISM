import type { ComponentTemplateUpsertInput, Project, SIFComponent, SubsystemType } from '@/core/types'
import {
  analyzeComponentTemplateImport,
  COMPONENT_TEMPLATE_EXPORT_FORMAT,
  COMPONENT_TEMPLATE_SCHEMA_VERSION,
} from '@/features/library'
import type {
  AILibraryDraftFieldKey,
  AILibraryDraftFile,
  AILibraryDraftProposal,
  AILibraryDraftTemplateFileEntry,
  AISIFDraftFieldState,
} from './types'
import { extractJsonPayload } from './sifDraftProposal'

const ALLOWED_FIELD_STATES = new Set<AISIFDraftFieldState>(['provided', 'missing', 'uncertain', 'conflict'])
const ALLOWED_LIBRARY_FIELD_KEYS = new Set<AILibraryDraftFieldKey>([
  'template_name',
  'template_scope',
  'target_project',
  'library_name',
  'review_status',
  'source_reference',
  'tags',
  'subsystem_type',
  'instrument_category',
  'instrument_type',
  'manufacturer',
  'data_source',
  'determined_character',
  'component_description',
  'factorized_lambda',
  'factorized_lambda_d_ratio',
  'factorized_dcd',
  'factorized_dcs',
  'lambda_du',
  'lambda_dd',
  'lambda_su',
  'lambda_sd',
  'test_t1',
  'test_t0',
  'test_type',
  'proof_test_coverage',
  'lifetime',
])

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map(entry => typeof entry === 'string' ? entry.trim() : '')
    .filter(Boolean)
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null
}

function isSubsystemType(value: unknown): value is SubsystemType {
  return value === 'sensor' || value === 'logic' || value === 'actuator'
}

function buildCanonicalTemplateEntry(templateInput: ComponentTemplateUpsertInput): AILibraryDraftTemplateFileEntry {
  const snapshot = JSON.parse(JSON.stringify(templateInput.componentSnapshot)) as SIFComponent
  return {
    name: templateInput.name,
    description: templateInput.description ?? '',
    subsystemType: snapshot.subsystemType,
    libraryName: templateInput.libraryName ?? null,
    sourceReference: templateInput.sourceReference ?? null,
    tags: [...(templateInput.tags ?? [])],
    reviewStatus: templateInput.reviewStatus ?? 'draft',
    componentSnapshot: snapshot,
  }
}

function buildCanonicalLibraryDraftFile(
  record: Record<string, unknown>,
  templateInput: ComponentTemplateUpsertInput,
  targetScope: 'user' | 'project',
  targetProject: Project | null,
): AILibraryDraftFile {
  return {
    format: COMPONENT_TEMPLATE_EXPORT_FORMAT,
    version: COMPONENT_TEMPLATE_SCHEMA_VERSION,
    exportedAt: typeof record.exportedAt === 'string' && record.exportedAt.trim()
      ? record.exportedAt.trim()
      : new Date().toISOString(),
    exportedByProfileId: null,
    projectId: targetScope === 'project' ? (targetProject?.id ?? null) : null,
    libraryName: templateInput.libraryName
      ?? (typeof record.libraryName === 'string' && record.libraryName.trim() ? record.libraryName.trim() : null),
    templates: [buildCanonicalTemplateEntry(templateInput)],
  }
}

function inferFieldStatus(
  templateInput: ComponentTemplateUpsertInput,
  targetScope: 'user' | 'project',
  targetProject: Project | null,
): Partial<Record<AILibraryDraftFieldKey, AISIFDraftFieldState>> {
  const snapshot = templateInput.componentSnapshot
  const status: Partial<Record<AILibraryDraftFieldKey, AISIFDraftFieldState>> = {
    template_name: templateInput.name.trim() ? 'provided' : 'missing',
    template_scope: 'provided',
    target_project: targetScope === 'project'
      ? (targetProject ? 'provided' : 'missing')
      : 'provided',
    library_name: (templateInput.libraryName ?? '').trim() ? 'provided' : 'uncertain',
    review_status: templateInput.reviewStatus ? 'provided' : 'uncertain',
    source_reference: (templateInput.sourceReference ?? '').trim() ? 'provided' : 'uncertain',
    tags: (templateInput.tags ?? []).length > 0 ? 'provided' : 'uncertain',
    subsystem_type: isSubsystemType(snapshot.subsystemType) ? 'provided' : 'missing',
    instrument_category: snapshot.instrumentCategory ? 'provided' : 'missing',
    instrument_type: snapshot.instrumentType?.trim() ? 'provided' : 'missing',
    manufacturer: snapshot.manufacturer?.trim() ? 'provided' : 'uncertain',
    data_source: snapshot.dataSource?.trim() ? 'provided' : 'uncertain',
    determined_character: snapshot.determinedCharacter?.trim() ? 'provided' : 'uncertain',
    component_description: snapshot.description?.trim() ? 'provided' : 'uncertain',
    test_type: snapshot.test.testType ? 'provided' : 'uncertain',
    test_t1: Number.isFinite(snapshot.test.T1) && snapshot.test.T1 > 0 ? 'provided' : 'uncertain',
    test_t0: Number.isFinite(snapshot.test.T0) && snapshot.test.T0 >= 0 ? 'provided' : 'uncertain',
    proof_test_coverage: Number.isFinite(snapshot.advanced.proofTestCoverage) && snapshot.advanced.proofTestCoverage > 0 ? 'provided' : 'uncertain',
    lifetime: snapshot.advanced.lifetime !== null && Number.isFinite(snapshot.advanced.lifetime) && snapshot.advanced.lifetime > 0 ? 'provided' : 'uncertain',
  }

  if (snapshot.paramMode === 'factorized') {
    status.factorized_lambda = Number.isFinite(snapshot.factorized.lambda) && snapshot.factorized.lambda > 0 ? 'provided' : 'uncertain'
    status.factorized_lambda_d_ratio = Number.isFinite(snapshot.factorized.lambdaDRatio) ? 'provided' : 'uncertain'
    status.factorized_dcd = Number.isFinite(snapshot.factorized.DCd) ? 'provided' : 'uncertain'
    status.factorized_dcs = Number.isFinite(snapshot.factorized.DCs) ? 'provided' : 'uncertain'
  } else {
    status.lambda_du = Number.isFinite(snapshot.developed.lambda_DU) && snapshot.developed.lambda_DU > 0 ? 'provided' : 'uncertain'
    status.lambda_dd = Number.isFinite(snapshot.developed.lambda_DD) ? 'provided' : 'uncertain'
    status.lambda_su = Number.isFinite(snapshot.developed.lambda_SU) ? 'provided' : 'uncertain'
    status.lambda_sd = Number.isFinite(snapshot.developed.lambda_SD) ? 'provided' : 'uncertain'
  }

  return status
}

function sanitizeFieldStatus(
  value: unknown,
  templateInput: ComponentTemplateUpsertInput,
  targetScope: 'user' | 'project',
  targetProject: Project | null,
): Partial<Record<AILibraryDraftFieldKey, AISIFDraftFieldState>> {
  const fallback = inferFieldStatus(templateInput, targetScope, targetProject)
  const record = asRecord(value)
  if (!record) return fallback

  const sanitized: Partial<Record<AILibraryDraftFieldKey, AISIFDraftFieldState>> = { ...fallback }
  for (const [key, rawState] of Object.entries(record)) {
    if (!ALLOWED_LIBRARY_FIELD_KEYS.has(key as AILibraryDraftFieldKey)) continue
    if (typeof rawState !== 'string' || !ALLOWED_FIELD_STATES.has(rawState as AISIFDraftFieldState)) continue
    sanitized[key as AILibraryDraftFieldKey] = rawState as AISIFDraftFieldState
  }
  return sanitized
}

function sanitizeLibraryDraftFile(
  value: unknown,
  targetScope: 'user' | 'project',
  targetProject: Project | null,
): { ok: true; libraryFile: AILibraryDraftFile; templateInput: ComponentTemplateUpsertInput } | { ok: false; error: string } {
  const record = asRecord(value)
  if (!record) {
    return { ok: false, error: 'Le champ library_file est manquant.' }
  }

  const preview = analyzeComponentTemplateImport(
    JSON.stringify(record),
    targetScope,
    targetScope === 'project' ? (targetProject?.id ?? null) : null,
    [],
    typeof record.libraryName === 'string' ? record.libraryName : null,
  )

  if (preview.entries.length !== 1) {
    return { ok: false, error: 'Le contrat library_file doit contenir exactement un template.' }
  }

  const [entry] = preview.entries
  if (!entry.template) {
    const issues = entry.issues.map(issue => issue.message).join(' ')
    return {
      ok: false,
      error: issues || 'Le template Library proposé est invalide.',
    }
  }

  return {
    ok: true,
    templateInput: entry.template,
    libraryFile: buildCanonicalLibraryDraftFile(record, entry.template, targetScope, targetProject),
  }
}

function parseTargetScope(record: Record<string, unknown>, targetProject: Project | null): 'user' | 'project' {
  const raw = record.target_scope ?? record.targetScope
  if (raw === 'user' || raw === 'project') return raw
  return targetProject ? 'project' : 'user'
}

export function parseLibraryDraftProposalRecord(
  record: Record<string, unknown>,
  targetProject: Project | null,
): { ok: true; proposal: AILibraryDraftProposal } | { ok: false; error: string } {
  const summary = typeof record.summary === 'string' ? record.summary.trim() : ''
  if (!summary) {
    return { ok: false, error: 'Le champ summary est manquant.' }
  }

  const targetScope = parseTargetScope(record, targetProject)
  if (targetScope === 'project' && !targetProject) {
    return { ok: false, error: 'La commande create_library en portée projet exige un project:... explicite.' }
  }

  const libraryFileResult = sanitizeLibraryDraftFile(record.library_file ?? record.libraryFile, targetScope, targetProject)
  if (!libraryFileResult.ok) return libraryFileResult

  return {
    ok: true,
    proposal: {
      kind: 'library_draft',
      command: 'create_library',
      targetScope,
      targetProjectId: targetScope === 'project' ? (targetProject?.id ?? null) : null,
      targetProjectName: targetScope === 'project' ? (targetProject?.name ?? null) : null,
      summary,
      assumptions: asStringArray(record.assumptions),
      missingData: asStringArray(record.missing_data ?? record.missingData),
      uncertainData: asStringArray(record.uncertain_data ?? record.uncertainData),
      conflicts: asStringArray(record.conflicts),
      fieldStatus: sanitizeFieldStatus(record.field_status ?? record.fieldStatus, libraryFileResult.templateInput, targetScope, targetProject),
      libraryFile: libraryFileResult.libraryFile,
      templateInput: libraryFileResult.templateInput,
    },
  }
}

export function parseLibraryDraftProposalResponse(
  raw: string,
  targetProject: Project | null,
): { ok: true; proposal: AILibraryDraftProposal } | { ok: false; error: string } {
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

  return parseLibraryDraftProposalRecord(data as Record<string, unknown>, targetProject)
}
