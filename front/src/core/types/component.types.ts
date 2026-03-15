/**
 * core/types/component.types.ts — PRISM
 *
 * Component-level types: parameters, subsystems, channels.
 * The building blocks of a SIF architecture.
 */
import type { Architecture } from './sil.types'

// ─── Component parameters ─────────────────────────────────────────────────
export type SubsystemType = 'sensor' | 'logic' | 'actuator'
export type ParamMode = 'factorized' | 'developed'
export type TestType = 'stopped' | 'online' | 'partial' | 'none'
export type NatureType = 'instrument' | 'valve' | 'relay' | 'controller' | 'other'
export type InstrumentCategory = 'transmitter' | 'switch' | 'valve' | 'positioner' | 'controller' | 'relay' | 'other'
export type DeterminedCharacter = 'TYPE_A' | 'TYPE_B' | 'NON_TYPE_AB'
export type VoteType = 'S' | 'A' | 'M'
export type CCFMethod = 'MIN' | 'MAX' | 'AVERAGE' | 'GEOMETRIC' | 'QUADRATIC'
export type BetaAssessmentMode = 'manual' | 'iec61508'
export type BetaAssessmentProfile = 'logic' | 'field'
export type BetaDiagnosticIntervalUnit = 'min' | 'hr' | 'day'

export interface FactorizedParams {
  lambda: number           // total λ [h⁻¹ × 10⁻⁶]
  lambdaDRatio: number     // λD/λ  [0–1]
  DCd: number              // DC dangerous [0–1]
  DCs: number              // DC safe [0–1]
}

export interface DevelopedParams {
  lambda_DU: number        // [FIT = 10⁻⁹ h⁻¹]
  lambda_DD: number
  lambda_SU: number
  lambda_SD: number
}

export interface TestParams {
  testType: TestType
  T1: number               // Proof test interval [hr]
  T1Unit: 'hr' | 'yr'
  T0: number               // Time of first test
  T0Unit: 'hr' | 'yr'
}

export interface PartialTestParams {
  enabled: boolean
  duration: number
  detectedFaultsPct: number
  numberOfTests: number
}

export interface AdvancedParams {
  MTTR: number
  gamma: number
  lambdaStar: number
  lambdaStarEqualToLambda: boolean
  sigma: number
  omega1: number
  omega2: number
  proofTestCoverage: number
  lifetime: number | null
  DCalarmedOnly: number
  partialTest: PartialTestParams
}

export interface BetaAssessmentConfig {
  mode: BetaAssessmentMode
  profile: BetaAssessmentProfile
  selectedMeasureIds: string[]
  diagnosticCoveragePct: number
  diagnosticInterval: number
  diagnosticIntervalUnit: BetaDiagnosticIntervalUnit
  allowZCredit: boolean
  mooN_M: number
  mooN_N: number
}

export interface SubsystemCCF {
  beta: number
  betaD: number
  method: CCFMethod
  assessment?: BetaAssessmentConfig
}

export interface SIFComponent {
  id: string
  tagName: string
  nature: NatureType
  instrumentCategory: InstrumentCategory
  instrumentType: string
  manufacturer: string
  dataSource: string
  description: string
  subsystemType: SubsystemType
  determinedCharacter: DeterminedCharacter
  paramMode: ParamMode
  factorized: FactorizedParams
  developed: DevelopedParams
  test: TestParams
  advanced: AdvancedParams
  /** Sub-elements within this component (e.g. solenoid + actuator inside a valve) */
  subComponents?: SubElement[]
}

/** Sub-element within a component (e.g. solenoid valve, pilot, actuator body) */
export interface SubElement {
  id: string
  tagName: string
  label: string
  instrumentType: string
  manufacturer: string
  /** Own failure rates — contributes to parent component's total λ */
  factorized: FactorizedParams
}

// ─── Subsystem & Architecture ─────────────────────────────────────────────
export type BooleanGate = 'AND' | 'OR'

export interface CustomBooleanArch {
  gate: BooleanGate
  expression: string
  manualHFT: number
}

export interface LibraryComponent {
  libraryId: string
  name: string
  subsystemType: SubsystemType
  instrumentCategory: InstrumentCategory
  instrumentType: string
  manufacturer: string
  dataSource: string
  factorized: Pick<FactorizedParams, 'lambda' | 'lambdaDRatio' | 'DCd' | 'DCs'>
  test: Pick<TestParams, 'T1' | 'T1Unit'>
  isCustom: boolean
}

export interface SIFChannel {
  id: string
  label: string
  components: SIFComponent[]
  /** Channel-level voting (kooN) when a channel has multiple components. Defaults to '1oo1'. */
  architecture?: Architecture
  /** CCF β within this channel (between components). Default 0. */
  beta?: number
  /** CCF βD within this channel. Default 0. */
  betaD?: number
}

export interface SIFSubsystem {
  id: string
  type: SubsystemType
  label: string
  architecture: Architecture
  voteType: VoteType
  ccf: SubsystemCCF
  customBooleanArch?: CustomBooleanArch
  channels: SIFChannel[]
}
