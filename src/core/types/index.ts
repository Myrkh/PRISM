// ─── SIL ───────────────────────────────────────────────────────────────────
export type SILLevel = 0 | 1 | 2 | 3 | 4

export interface SILMeta {
  sil: SILLevel
  label: string
  color: string
  bgLight: string
  bgDark: string
  borderLight: string
  borderDark: string
  pfdMin: number
  pfdMax: number
}

export const SIL_META: Record<SILLevel, SILMeta> = {
  0: { sil:0, label:'N/A',   color:'#6B7280', bgLight:'#F9FAFB', bgDark:'#111827', borderLight:'#E5E7EB', borderDark:'#374151', pfdMin:1e-1,  pfdMax:1 },
  1: { sil:1, label:'SIL 1', color:'#16A34A', bgLight:'#F0FDF4', bgDark:'#052E16', borderLight:'#BBF7D0', borderDark:'#15803D', pfdMin:1e-2,  pfdMax:1e-1 },
  2: { sil:2, label:'SIL 2', color:'#2563EB', bgLight:'#EFF6FF', bgDark:'#0F1B3D', borderLight:'#BFDBFE', borderDark:'#1D4ED8', pfdMin:1e-3,  pfdMax:1e-2 },
  3: { sil:3, label:'SIL 3', color:'#D97706', bgLight:'#FFFBEB', bgDark:'#1A1000', borderLight:'#FDE68A', borderDark:'#B45309', pfdMin:1e-4,  pfdMax:1e-3 },
  4: { sil:4, label:'SIL 4', color:'#7C3AED', bgLight:'#F5F3FF', bgDark:'#1E0540', borderLight:'#DDD6FE', borderDark:'#7C3AED', pfdMin:1e-5,  pfdMax:1e-4 },
}

// ─── Architecture ─────────────────────────────────────────────────────────
export type Architecture = '1oo1' | '1oo2' | '2oo2' | '2oo3' | '1oo2D'

export interface ArchitectureMeta {
  label: string
  desc: string
  HFT: number
  channels: number
}

export const ARCHITECTURE_META: Record<Architecture, ArchitectureMeta> = {
  '1oo1':  { label:'1oo1',  desc:'Single channel',                HFT:0, channels:1 },
  '1oo2':  { label:'1oo2',  desc:'1-out-of-2 (fail-safe)',        HFT:1, channels:2 },
  '2oo2':  { label:'2oo2',  desc:'2-out-of-2 (high avail.)',      HFT:0, channels:2 },
  '2oo3':  { label:'2oo3',  desc:'2-out-of-3 (voted)',            HFT:1, channels:3 },
  '1oo2D': { label:'1oo2D', desc:'1oo2 with diagnostics',         HFT:1, channels:2 },
}

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
  channels: SIFChannel[]
}

// ─── SIF ──────────────────────────────────────────────────────────────────
export type SIFStatus = 'draft' | 'in_review' | 'verified' | 'approved'

export interface SIF {
  id: string
  projectId: string
  sifNumber: string
  revision: string
  title: string
  description: string
  pid: string
  location: string
  processTag: string
  hazardousEvent: string
  demandRate: number
  targetSIL: SILLevel
  rrfRequired: number
  madeBy: string
  verifiedBy: string
  approvedBy: string
  date: string
  status: SIFStatus
  subsystems: SIFSubsystem[]
}

// ─── Project ──────────────────────────────────────────────────────────────
export type ProjectStatus = 'active' | 'completed' | 'archived'

export interface Project {
  id: string
  name: string
  ref: string
  client: string
  site: string
  unit: string
  standard: 'IEC61511' | 'IEC61508' | 'ISA84'
  revision: string
  description: string
  status: ProjectStatus
  createdAt: string
  updatedAt: string
  sifs: SIF[]
}

// ─── Calculation results ──────────────────────────────────────────────────
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

export interface SIFCalcResult {
  PFD_avg: number
  RRF: number
  SIL: SILLevel
  meetsTarget: boolean
  subsystems: SubsystemCalcResult[]
  chartData: PFDChartPoint[]
}

export interface PFDChartPoint {
  t: number
  total: number
  [key: string]: number
}
