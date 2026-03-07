/**
 * core/types/calc.types.ts — PRISM
 *
 * Calculation result types — output of the PFD engine.
 * Also defines the future CalcRequest for the Python backend API.
 */
import type { SILLevel } from './sil.types'
import type { SubsystemType } from './component.types'

// ─── Component-level result ──────────────────────────────────────────────
export interface ComponentCalcResult {
  componentId: string
  lambda_DU: number
  lambda_DD: number
  lambda_SU: number
  lambda_SD: number
  SFF: number
  DC: number
  PFD_avg: number
  RRF: number
  SIL: SILLevel
}

// ─── Subsystem-level result ──────────────────────────────────────────────
export interface SubsystemCalcResult {
  subsystemId: string
  type: SubsystemType
  PFD_avg: number
  SFF: number
  DC: number
  HFT: number
  SIL: SILLevel
  RRF: number
  components: ComponentCalcResult[]
}

// ─── SIF-level result ────────────────────────────────────────────────────
export interface SIFCalcResult {
  PFD_avg: number
  RRF: number
  SIL: SILLevel
  meetsTarget: boolean
  subsystems: SubsystemCalcResult[]
  chartData: PFDChartPoint[]
}

// ─── Chart data point ────────────────────────────────────────────────────
export interface PFDChartPoint {
  t: number
  total: number
  [key: string]: number
}

// ─── Future: Backend CalcRequest / CalcResponse ──────────────────────────
// These will be used when the Python FastAPI moteur de calcul is ready.
// Keeping them here as a contract definition.
//
// export interface CalcRequest {
//   subsystems: SubsystemInput[]
//   method: 'simplified' | 'markov' | 'monte_carlo' | 'fault_tree'
//   missionTime: number
//   demandMode: 'low' | 'high' | 'continuous'
// }
//
// export interface CalcResponse extends SIFCalcResult {
//   uncertaintyBounds?: { lower: number; upper: number }
//   complianceChecks: ComplianceCheck[]
// }
