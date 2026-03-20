export type EngineRunTriggerKind = 'manual' | 'compare' | 'batch'
export type EngineRunRequestedMode = 'AUTO' | 'MARKOV'
export type EngineRunStatus = 'queued' | 'running' | 'done' | 'error' | 'cancelled'
export type EngineRunBatchScope = 'project' | 'under_target' | 'published' | 'selection'
export type EngineRunBatchStatus = EngineRunStatus

export interface EngineRunBatch {
  id: string
  projectId: string
  createdBy: string
  label: string
  scope: EngineRunBatchScope
  status: EngineRunBatchStatus
  totalRuns: number
  doneRuns: number
  failedRuns: number
  startedAt: string | null
  finishedAt: string | null
  createdAt: string | null
  updatedAt: string | null
}

export interface EngineRun {
  id: string
  batchId: string | null
  projectId: string
  sifId: string
  createdBy: string
  triggerKind: EngineRunTriggerKind
  requestedMode: EngineRunRequestedMode
  status: EngineRunStatus
  backendVersion: string | null
  payloadHash: string | null
  inputDigest: Record<string, unknown>
  runtimeMs: number | null
  startedAt: string | null
  finishedAt: string | null
  warningCount: number
  errorMessage: string | null
  resultSummary: Record<string, unknown>
  requestPayload: Record<string, unknown>
  responsePayload: Record<string, unknown> | null
  createdAt: string | null
  updatedAt: string | null
}

export interface EngineRunBatchUpsertInput {
  id?: string
  projectId: string
  createdBy: string
  label: string
  scope: EngineRunBatchScope
  status?: EngineRunBatchStatus
  totalRuns?: number
  doneRuns?: number
  failedRuns?: number
  startedAt?: string | null
  finishedAt?: string | null
}

export interface EngineRunUpsertInput {
  id?: string
  batchId?: string | null
  projectId: string
  sifId: string
  createdBy: string
  triggerKind: EngineRunTriggerKind
  requestedMode: EngineRunRequestedMode
  status?: EngineRunStatus
  backendVersion?: string | null
  payloadHash?: string | null
  inputDigest?: Record<string, unknown>
  runtimeMs?: number | null
  startedAt?: string | null
  finishedAt?: string | null
  warningCount?: number
  errorMessage?: string | null
  resultSummary?: Record<string, unknown>
  requestPayload?: Record<string, unknown>
  responsePayload?: Record<string, unknown> | null
}
