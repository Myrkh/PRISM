import type {
  EngineRun,
  EngineRunBatch,
  EngineRunBatchUpsertInput,
  EngineRunUpsertInput,
} from '@/core/types'
import { supabase } from './supabase'

type EngineRunRow = Record<string, unknown>
type EngineRunBatchRow = Record<string, unknown>

function asJsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function asNullableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function asCount(value: unknown): number {
  return asNullableNumber(value) ?? 0
}

function rowToEngineRunBatch(row: EngineRunBatchRow): EngineRunBatch {
  return {
    id: String(row.id),
    projectId: typeof row.project_id === 'string' ? row.project_id : '',
    createdBy: typeof row.created_by === 'string' ? row.created_by : '',
    label: typeof row.label === 'string' ? row.label : '',
    scope: row.scope === 'under_target' || row.scope === 'published' || row.scope === 'selection' ? row.scope : 'project',
    status: row.status === 'running' || row.status === 'done' || row.status === 'error' || row.status === 'cancelled' ? row.status : 'queued',
    totalRuns: asCount(row.total_runs),
    doneRuns: asCount(row.done_runs),
    failedRuns: asCount(row.failed_runs),
    startedAt: typeof row.started_at === 'string' ? row.started_at : null,
    finishedAt: typeof row.finished_at === 'string' ? row.finished_at : null,
    createdAt: typeof row.created_at === 'string' ? row.created_at : null,
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : null,
  }
}

function rowToEngineRun(row: EngineRunRow): EngineRun {
  return {
    id: String(row.id),
    batchId: typeof row.batch_id === 'string' ? row.batch_id : null,
    projectId: typeof row.project_id === 'string' ? row.project_id : '',
    sifId: typeof row.sif_id === 'string' ? row.sif_id : '',
    createdBy: typeof row.created_by === 'string' ? row.created_by : '',
    triggerKind: row.trigger_kind === 'compare' || row.trigger_kind === 'batch' ? row.trigger_kind : 'manual',
    requestedMode: row.requested_mode === 'MARKOV' ? 'MARKOV' : 'AUTO',
    status: row.status === 'running' || row.status === 'done' || row.status === 'error' || row.status === 'cancelled' ? row.status : 'queued',
    backendVersion: typeof row.backend_version === 'string' ? row.backend_version : null,
    payloadHash: typeof row.payload_hash === 'string' ? row.payload_hash : null,
    inputDigest: asJsonObject(row.input_digest),
    runtimeMs: asNullableNumber(row.runtime_ms),
    startedAt: typeof row.started_at === 'string' ? row.started_at : null,
    finishedAt: typeof row.finished_at === 'string' ? row.finished_at : null,
    warningCount: asCount(row.warning_count),
    errorMessage: typeof row.error_message === 'string' ? row.error_message : null,
    resultSummary: asJsonObject(row.result_summary),
    requestPayload: asJsonObject(row.request_payload),
    responsePayload: row.response_payload && typeof row.response_payload === 'object' && !Array.isArray(row.response_payload)
      ? row.response_payload as Record<string, unknown>
      : null,
    createdAt: typeof row.created_at === 'string' ? row.created_at : null,
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : null,
  }
}

function batchInputToRow(input: EngineRunBatchUpsertInput): Record<string, unknown> {
  return {
    id: input.id ?? crypto.randomUUID(),
    project_id: input.projectId,
    created_by: input.createdBy,
    label: input.label.trim(),
    scope: input.scope,
    status: input.status ?? 'queued',
    total_runs: input.totalRuns ?? 0,
    done_runs: input.doneRuns ?? 0,
    failed_runs: input.failedRuns ?? 0,
    started_at: input.startedAt ?? null,
    finished_at: input.finishedAt ?? null,
  }
}

function batchPatchToRow(patch: Partial<EngineRunBatchUpsertInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (patch.projectId !== undefined) row.project_id = patch.projectId
  if (patch.createdBy !== undefined) row.created_by = patch.createdBy
  if (patch.label !== undefined) row.label = patch.label.trim()
  if (patch.scope !== undefined) row.scope = patch.scope
  if (patch.status !== undefined) row.status = patch.status
  if (patch.totalRuns !== undefined) row.total_runs = patch.totalRuns
  if (patch.doneRuns !== undefined) row.done_runs = patch.doneRuns
  if (patch.failedRuns !== undefined) row.failed_runs = patch.failedRuns
  if (patch.startedAt !== undefined) row.started_at = patch.startedAt
  if (patch.finishedAt !== undefined) row.finished_at = patch.finishedAt
  return row
}

function runInputToRow(input: EngineRunUpsertInput): Record<string, unknown> {
  return {
    id: input.id ?? crypto.randomUUID(),
    batch_id: input.batchId ?? null,
    project_id: input.projectId,
    sif_id: input.sifId,
    created_by: input.createdBy,
    trigger_kind: input.triggerKind,
    requested_mode: input.requestedMode,
    status: input.status ?? 'queued',
    backend_version: input.backendVersion ?? null,
    payload_hash: input.payloadHash ?? null,
    input_digest: input.inputDigest ?? {},
    runtime_ms: input.runtimeMs ?? null,
    started_at: input.startedAt ?? null,
    finished_at: input.finishedAt ?? null,
    warning_count: input.warningCount ?? 0,
    error_message: input.errorMessage ?? null,
    result_summary: input.resultSummary ?? {},
    request_payload: input.requestPayload ?? {},
    response_payload: input.responsePayload ?? null,
  }
}

function runPatchToRow(patch: Partial<EngineRunUpsertInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (patch.batchId !== undefined) row.batch_id = patch.batchId
  if (patch.projectId !== undefined) row.project_id = patch.projectId
  if (patch.sifId !== undefined) row.sif_id = patch.sifId
  if (patch.createdBy !== undefined) row.created_by = patch.createdBy
  if (patch.triggerKind !== undefined) row.trigger_kind = patch.triggerKind
  if (patch.requestedMode !== undefined) row.requested_mode = patch.requestedMode
  if (patch.status !== undefined) row.status = patch.status
  if (patch.backendVersion !== undefined) row.backend_version = patch.backendVersion
  if (patch.payloadHash !== undefined) row.payload_hash = patch.payloadHash
  if (patch.inputDigest !== undefined) row.input_digest = patch.inputDigest
  if (patch.runtimeMs !== undefined) row.runtime_ms = patch.runtimeMs
  if (patch.startedAt !== undefined) row.started_at = patch.startedAt
  if (patch.finishedAt !== undefined) row.finished_at = patch.finishedAt
  if (patch.warningCount !== undefined) row.warning_count = patch.warningCount
  if (patch.errorMessage !== undefined) row.error_message = patch.errorMessage
  if (patch.resultSummary !== undefined) row.result_summary = patch.resultSummary
  if (patch.requestPayload !== undefined) row.request_payload = patch.requestPayload
  if (patch.responsePayload !== undefined) row.response_payload = patch.responsePayload
  return row
}

export async function dbFetchEngineRunBatches(filters?: {
  projectId?: string
  limit?: number
}): Promise<EngineRunBatch[]> {
  let query = supabase
    .from('prism_engine_run_batches')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters?.projectId) query = query.eq('project_id', filters.projectId)
  if (filters?.limit) query = query.limit(filters.limit)

  const { data, error } = await query
  if (error) throw new Error(`Engine run batches: ${error.message}`)
  return (data ?? []).map(row => rowToEngineRunBatch(row as EngineRunBatchRow))
}

export async function dbFetchEngineRuns(filters?: {
  projectId?: string
  sifId?: string
  batchId?: string
  limit?: number
}): Promise<EngineRun[]> {
  let query = supabase
    .from('prism_engine_runs')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters?.projectId) query = query.eq('project_id', filters.projectId)
  if (filters?.sifId) query = query.eq('sif_id', filters.sifId)
  if (filters?.batchId) query = query.eq('batch_id', filters.batchId)
  if (filters?.limit) query = query.limit(filters.limit)

  const { data, error } = await query
  if (error) throw new Error(`Engine runs: ${error.message}`)
  return (data ?? []).map(row => rowToEngineRun(row as EngineRunRow))
}

export async function dbSaveEngineRunBatch(input: EngineRunBatchUpsertInput): Promise<EngineRunBatch> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) throw new Error(`Save engine run batch: ${userError.message}`)
  if (!user) throw new Error('Save engine run batch: no authenticated user')

  const { data, error } = await supabase
    .from('prism_engine_run_batches')
    .upsert(batchInputToRow({ ...input, createdBy: user.id }), { onConflict: 'id' })
    .select('*')
    .single()

  if (error) throw new Error(`Save engine run batch: ${error.message}`)
  return rowToEngineRunBatch(data as EngineRunBatchRow)
}

export async function dbUpdateEngineRunBatch(
  batchId: string,
  patch: Partial<EngineRunBatchUpsertInput>,
): Promise<EngineRunBatch> {
  const { data, error } = await supabase
    .from('prism_engine_run_batches')
    .update(batchPatchToRow(patch))
    .eq('id', batchId)
    .select('*')
    .single()

  if (error) throw new Error(`Update engine run batch: ${error.message}`)
  return rowToEngineRunBatch(data as EngineRunBatchRow)
}

export async function dbSaveEngineRun(input: EngineRunUpsertInput): Promise<EngineRun> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) throw new Error(`Save engine run: ${userError.message}`)
  if (!user) throw new Error('Save engine run: no authenticated user')

  const { data, error } = await supabase
    .from('prism_engine_runs')
    .upsert(runInputToRow({ ...input, createdBy: user.id }), { onConflict: 'id' })
    .select('*')
    .single()

  if (error) throw new Error(`Save engine run: ${error.message}`)
  return rowToEngineRun(data as EngineRunRow)
}

export async function dbUpdateEngineRun(
  runId: string,
  patch: Partial<EngineRunUpsertInput>,
): Promise<EngineRun> {
  const { data, error } = await supabase
    .from('prism_engine_runs')
    .update(runPatchToRow(patch))
    .eq('id', runId)
    .select('*')
    .single()

  if (error) throw new Error(`Update engine run: ${error.message}`)
  return rowToEngineRun(data as EngineRunRow)
}
