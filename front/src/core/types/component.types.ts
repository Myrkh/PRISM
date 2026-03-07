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
  paramMode: ParamMode
  factorized: FactorizedParams
  developed: DevelopedParams
  test: TestParams
  advanced: AdvancedParams
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
}

export interface SIFSubsystem {
  id: string
  type: SubsystemType
  label: string
  architecture: Architecture
  customBooleanArch?: CustomBooleanArch
  channels: SIFChannel[]
}
