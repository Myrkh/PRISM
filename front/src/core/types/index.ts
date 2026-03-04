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
export type Architecture = '1oo1' | '1oo2' | '2oo2' | '2oo3' | '1oo2D' | 'custom'

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
  'custom': { label:'Custom', desc:'Custom boolean AND/OR architecture', HFT:0, channels:2 },
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
  // Traceability
  hazopTrace?: HAZOPTrace
  // Proof Test
  proofTestProcedure?: ProofTestProcedure
  testCampaigns: TestCampaign[]
  // SIL Live
  operationalEvents: OperationalEvent[]
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

// ─── HAZOP / LOPA Traceability ────────────────────────────────────────────
export interface HAZOPTrace {
  hazopNode: string         // e.g. "Node 3 — HP Separator"
  scenarioId: string        // e.g. "SC-003"
  deviationCause: string    // e.g. "High pressure — loss of outflow"
  initiatingEvent: string   // e.g. "Control valve CV-001 fails open"
  lopaRef: string           // e.g. "LOPA-HTL-003"
  tmel: number              // Target Mitigated Event Likelihood [yr⁻¹]
  iplList: string           // e.g. "BPCS, PSV-101"
  riskMatrix: string        // e.g. "4C"
  hazopDate: string
  lopaDate: string
  hazopFacilitator: string
}

// ─── Proof Test Procedure ─────────────────────────────────────────────────
export type ProofTestPhase =
  | 'prerequisites'
  | 'isolation'
  | 'sensor'
  | 'logic'
  | 'actuator'
  | 'restoration'
  | 'acceptance'

export const PROOF_TEST_PHASE_META: Record<ProofTestPhase, { label: string; color: string; short: string }> = {
  prerequisites: { label: 'Prerequisites',          color: '#6B7280', short: 'PRE'  },
  isolation:     { label: 'Isolation & Preparation', color: '#D97706', short: 'ISO'  },
  sensor:        { label: 'Sensor Test',             color: '#0891B2', short: 'SEN'  },
  logic:         { label: 'Logic Solver Test',       color: '#6366F1', short: 'LOG'  },
  actuator:      { label: 'Final Element Test',      color: '#EA580C', short: 'ACT'  },
  restoration:   { label: 'Restoration',             color: '#16A34A', short: 'RES'  },
  acceptance:    { label: 'Acceptance Criteria',     color: '#7C3AED', short: 'ACC'  },
}

export interface ProofTestStep {
  id: string
  phase: ProofTestPhase
  order: number
  description: string
  responsible: string
  expectedResult: string
  toleranceNote: string
  isCritical: boolean
}

export type ProofTestProcedureStatus = 'draft' | 'ifr' | 'approved'

export interface ProofTestProcedure {
  id: string
  ref: string
  revision: string
  status: ProofTestProcedureStatus
  periodicityMonths: number
  // Performance targets
  targetSIFResponseMs: number    // max SIF response time [ms]
  targetValveReactionMs: number  // max valve reaction time [ms]
  tolerancePct: number           // acceptance tolerance [%]
  // Steps
  steps: ProofTestStep[]
  // Signatures
  madeBy: string
  madeByDate: string
  verifiedBy: string
  verifiedByDate: string
  approvedBy: string
  approvedByDate: string
  notes: string
}

// ─── Test Campaign (field result) ─────────────────────────────────────────
export type CampaignVerdict = 'pass' | 'fail' | 'conditional'

export interface StepResult {
  stepId: string
  done: boolean
  result: 'pass' | 'fail' | 'na'
  measuredValue: string
  comment: string
}

export interface TestCampaign {
  id: string
  date: string               // ISO date
  team: string
  operatingMode: string      // e.g. "Normal operation"
  processLoad: string        // e.g. "75% load"
  // Measured performance
  sifResponseTimeMs: number
  valveReactionTimeMs: number
  // Result
  verdict: CampaignVerdict
  notes: string
  stepResults: StepResult[]
  // Signatures
  conductedBy: string
  witnessedBy: string
  reviewedBy: string
}

// ─── Operational Events (SIL Live) ────────────────────────────────────────
export type OperationalEventType =
  | 'proof_test'
  | 'bypass'
  | 'fault_detected'
  | 'repair'
  | 'inhibit'
  | 'demand'
  | 'override'

export interface OperationalEvent {
  id: string
  type: OperationalEventType
  date: string
  description: string
  duration?: number         // hours (for bypass/inhibit)
  impact: 'positive' | 'negative' | 'neutral'
  linkedCampaignId?: string
  resolvedDate?: string
}

// ─── Extended SIF (appended fields) ──────────────────────────────────────
// NOTE: The SIF interface above is extended here by re-declaration merging
// is not supported. We add to the original SIF interface directly via the
// extended version below. Replace the SIF interface in this file with
// SIFExtended, and rename it SIF.
// Fields added to SIF:
//   hazopTrace?: HAZOPTrace
//   proofTestProcedure?: ProofTestProcedure
//   testCampaigns: TestCampaign[]
//   operationalEvents: OperationalEvent[]