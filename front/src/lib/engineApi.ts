import type { EngineInput } from '@/engine/types/engine'
import type { CalcAdapterOptions } from '@/core/math/pfdCalc'
import { buildEngineInput } from '@/core/math/pfdCalc'
import type { SIF } from '@/core/types'

export type BackendRuntimeMode = 'AUTO' | 'ANALYTICAL' | 'MARKOV'

export interface SILBackendRuntimeOptions {
  calculationMode?: BackendRuntimeMode
  includeComponentResults?: boolean
  includeChannelResults?: boolean
  includeCurve?: boolean
}

export interface SILBackendRequest {
  input: EngineInput
  runtime?: SILBackendRuntimeOptions
}

export interface SILBackendReportMeta {
  projectName?: string
  projectRef?: string
  sifNumber?: string
  sifTitle?: string
  targetSIL?: number
  title?: string
  docRef?: string
  version?: string
  scope?: string
  hazardDescription?: string
  assumptions?: string
  recommendations?: string
  preparedBy?: string
  checkedBy?: string
  approvedBy?: string
  confidentialityLabel?: string
  showPFDChart?: boolean
  showSubsystemTable?: boolean
  showComponentTable?: boolean
  showComplianceMatrix?: boolean
  showAssumptions?: boolean
  showRecommendations?: boolean
}

export interface SILBackendReportRequest extends SILBackendRequest {
  report?: SILBackendReportMeta
}

export interface SILBackendWarning {
  code: string
  severity: 'INFO' | 'WARNING' | 'ERROR'
  message: string
  affected?: string | null
}

export interface SILBackendComponentResult {
  componentId: string
  pfdavg: number | null
  pfh: number | null
  lambdaDU: number
  lambdaDD: number
  lambdaSU: number
  lambdaSD: number
  sff: number
  tce: number
}

export interface SILBackendChannelResult {
  channelId: string
  pfdavg: number | null
  pfh: number | null
  componentResults: SILBackendComponentResult[]
}

export interface SILBackendSubsystemResult {
  pfdavg: number | null
  pfh: number | null
  contributionPct: number
  silFromPFD: number | null
  silArchitectural: number | null
  hft: number
  sff: number
  pfd_ccf: number | null
  pfd_independent: number | null
  channelResults: SILBackendChannelResult[]
}

export interface SILBackendCurvePoint {
  t: number
  pfd: number
  pfdavg: number
}

export interface SILBackendResponse {
  result: {
    sifId: string
    pfdavg: number
    pfh: number
    str: number | null
    mttps: number | null
    rrf: number | null
    silFromPFD: number | null
    silArchitectural: {
      sensors: number | null
      solver: number | null
      actuators: number | null
    }
    silAchieved: number | null
    contributions: {
      sensors: SILBackendSubsystemResult
      solver: SILBackendSubsystemResult
      actuators: SILBackendSubsystemResult
    }
    curve: SILBackendCurvePoint[] | null
    warnings: SILBackendWarning[]
  }
  backend: {
    service: string
    serviceVersion: string
    runtimeMs: number
    inputDigest: string
    requestedMode: BackendRuntimeMode
    subsystems: Record<string, {
      architecture: string
      effectiveArchitecture: string
      requestedMode: BackendRuntimeMode
      pfdEngine: string | null
      pfhEngine: string | null
      lambdaT1: number | null
      thresholdUsed: number | null
      markovTriggered: boolean | null
      heterogeneousChannels: boolean
    }>
  }
}

export function buildSILBackendRequest(
  sif: SIF,
  options?: CalcAdapterOptions,
  runtime?: SILBackendRuntimeOptions,
): SILBackendRequest {
  return {
    input: buildEngineInput(sif, options),
    runtime,
  }
}

export function buildSILBackendReportRequest(
  sif: SIF,
  options?: CalcAdapterOptions,
  runtime?: SILBackendRuntimeOptions,
  report?: SILBackendReportMeta,
): SILBackendReportRequest {
  return {
    input: buildEngineInput(sif, options),
    runtime,
    report,
  }
}

export async function computeSILWithBackend(payload: SILBackendRequest): Promise<SILBackendResponse> {
  const response = await fetch('/api/engine/sil/compute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Backend SIL compute failed: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<SILBackendResponse>
}

function parseDownloadFilename(disposition: string | null, fallback: string): string {
  if (!disposition) return fallback
  const match = disposition.match(/filename="([^"]+)"/i)
  return match?.[1] ?? fallback
}

export async function buildSILBackendReportPdf(payload: SILBackendReportRequest): Promise<{ blob: Blob; fileName: string }> {
  const response = await fetch('/api/engine/sil/report', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Backend SIL report failed: ${response.status} ${response.statusText}`)
  }

  return {
    blob: await response.blob(),
    fileName: parseDownloadFilename(response.headers.get('Content-Disposition'), 'prism_backend_sil_report.pdf'),
  }
}
