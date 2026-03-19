// =============================================================================
// PRISM Calc Engine — Types
// Sources : 02_COMPONENT_PARAMETERS.md + 10_ENGINE_IMPLEMENTATION.md
// Unités internes : TOUJOURS en heures (h⁻¹ pour les taux)
// =============================================================================

// ---------------------------------------------------------------------------
// Enums & Unions
// ---------------------------------------------------------------------------

export type SILLevel = 1 | 2 | 3 | 4
export type DemandMode = 'LOW_DEMAND' | 'HIGH_DEMAND' | 'CONTINUOUS'
export type VoteType = 'S' | 'A' | 'M'
export type IECStandard = 'IEC61508_ROUTE1H' | 'IEC61508_ROUTE2H' | 'IEC61511_2016'
export type ComponentType = 'SENSOR' | 'SOLVER' | 'ACTUATOR'
export type TestType = 'STOPPED' | 'WORKING' | 'NONE'
export type DeterminedCharacter = 'NON_TYPE_AB' | 'TYPE_B' | 'TYPE_A'
export type FailureRateMode = 'FACTORISED' | 'DEVELOPED'
export type CCFMethod = 'MIN' | 'MAX' | 'AVERAGE' | 'GEOMETRIC' | 'QUADRATIC'

// ---------------------------------------------------------------------------
// Failure Rate Models
// ---------------------------------------------------------------------------

/** Mode simplifié : l'utilisateur saisit λ, λD/λ, DCd, DCs */
export interface FailureRateFactorised {
  mode: 'FACTORISED'
  /** Taux total de défaillance (h⁻¹) */
  lambda: number
  /** Fraction dangereuse λD/λ ∈ [0,1] */
  lambdaD_ratio: number
  /** Diagnostic coverage défaillances dangereuses ∈ [0,1] */
  DCd: number
  /** Diagnostic coverage défaillances sûres ∈ [0,1] */
  DCs: number
}

/** Mode développé : l'utilisateur saisit directement les 4 taux */
export interface FailureRateDeveloped {
  mode: 'DEVELOPED'
  /** Dangereux Non Détecté (h⁻¹) — le plus critique pour PFD */
  lambdaDU: number
  /** Dangereux Détecté (h⁻¹) — réparé via MTTR */
  lambdaDD: number
  /** Sûr Non Détecté (h⁻¹) — contribue au STR */
  lambdaSU: number
  /** Sûr Détecté (h⁻¹) — contribue au STR */
  lambdaSD: number
}

// ---------------------------------------------------------------------------
// Test Parameters
// ---------------------------------------------------------------------------

export interface TestParams {
  type: TestType
  /** Intervalle de test (h) */
  T1: number
  /** Premier test — décalage initial (h) */
  T0: number
  /** Efficacité du test σ ∈ [0,1] — fraction des défauts révélés */
  sigma: number
  /** Probabilité de défaillance causée par le test γ ∈ [0,1] */
  gamma: number
  /** Durée du test π (h) — indisponibilité pendant le test */
  pi: number
  /** Disponible pendant le test ? (true = X=1) */
  X: boolean
  /** Taux de défaillance augmenté pendant le test λ* (h⁻¹, optionnel) */
  lambdaStar?: number
  /** Erreur de remise en service après test ω₁ ∈ [0,1] */
  omega1: number
  /** Erreur de remise en service après réparation ω₂ ∈ [0,1] */
  omega2: number
  /** Proof Test Coverage PTC ∈ [0,1] — fraction testable */
  ptc: number
  /** Durée de vie avant remplacement (h, optionnel) */
  lifetime?: number
}

// ---------------------------------------------------------------------------
// Partial Stroke Test (PST) — actionneurs uniquement
// ---------------------------------------------------------------------------

export interface PartialStrokeParams {
  enabled: boolean
  /** Disponible pendant PST */
  X: boolean
  /** Durée PST (h) */
  pi: number
  /** Efficacité PST ∈ [0,1] — fraction de λDU révélée */
  efficiency: number
  /** Nombre de PST entre deux tests complets */
  nbTests: number
}

// ---------------------------------------------------------------------------
// Component Parameters (schéma complet)
// ---------------------------------------------------------------------------

export interface ComponentParams {
  id: string
  tag: string
  parentComponentId?: string
  description?: string
  type: ComponentType
  category?: string
  instrumentType?: string
  manufacturer?: string
  dataSource?: string
  determinedCharacter: DeterminedCharacter
  failureRate: FailureRateFactorised | FailureRateDeveloped
  /** Mean Time To Repair (h) */
  MTTR: number
  test: TestParams
  /** Partial Stroke Test (actionneurs uniquement) */
  partialStroke?: PartialStrokeParams
  /** HFT spécifique composant (0 par défaut) */
  hft?: number
}

/** Taux de défaillance résolus — calculés par le moteur */
export interface ResolvedRates {
  lambdaDU: number
  lambdaDD: number
  lambdaSU: number
  lambdaSD: number
  lambda: number
  SFF: number
}

// ---------------------------------------------------------------------------
// Engine Input / SIF Definition
// ---------------------------------------------------------------------------

export interface EngineInput {
  sif: SIFDefinition
  options: EngineOptions
}

export interface SIFDefinition {
  id: string
  demandMode: DemandMode
  /** Durée de mission totale (h) — ex: 87600 = 10 ans */
  missionTime: number
  sensors: SubsystemDef
  solver: SolverDef
  actuators: SubsystemDef
}

export interface SubsystemDef {
  channels: ChannelDef[]
  voting: { M: number; N: number }
  voteType: VoteType
  ccf: CCFDef
  /** Norme architecturale — peut être surchargée par sous-système */
  standard?: IECStandard
  /** Label architecture kept for backend parity (ex: 1oo2D, custom). */
  architecture?: string
  /** Optional custom boolean expression when the architecture comes from a custom gate model. */
  customExpression?: string
  /** Manual HFT override coming from a custom architecture definition. */
  manualHFT?: number
}

export interface ChannelDef {
  id: string
  /** Composants en série dans ce canal */
  components: ComponentParams[]
  /** Référence à un autre canal (composant partagé) */
  existingRef?: string
}

export interface SolverDef {
  mode: 'SIMPLE' | 'ADVANCED'
  /** Mode simple : PFD forfaitaire donnée fabricant */
  pfd?: number
  /** Mode simple : PFH forfaitaire donnée fabricant */
  pfh?: number
  /** Mode avancé legacy : solver modélisé comme un composant unique */
  component?: ComponentParams
  /** Mode avancé complet : solver modélisé comme un sous-système MooN */
  channels?: ChannelDef[]
  voting?: { M: number; N: number }
  voteType?: VoteType
  ccf?: CCFDef
  standard?: IECStandard
  architecture?: string
  customExpression?: string
  manualHFT?: number
}

export interface CCFDef {
  beta: number
  betaD: number
  method: CCFMethod
}

export interface EngineOptions {
  /** Norme par défaut pour toutes les contraintes architecturales */
  standard: IECStandard
  /** Mean Restoration Time par défaut (h) — GRIF : 8h */
  mrt: number
  computeSTR: boolean
  computeCurve: boolean
  /** Nombre de points pour la courbe PFD(t) */
  curvePoints: number
}

// ---------------------------------------------------------------------------
// Engine Results
// ---------------------------------------------------------------------------

export interface EngineResult {
  sifId: string

  // Résultats principaux
  pfdavg: number
  pfh: number
  str: number
  /** Mean Time To Spurious Trip = 1/str (h) */
  mttps: number
  /** Risk Reduction Factor = 1/pfdavg */
  rrf: number

  // SIL
  silFromPFD: SILLevel | null
  silArchitectural: {
    sensors: SILLevel | null
    solver: SILLevel | null
    actuators: SILLevel | null
  }
  /** SIL final = min(PFD, architectural) */
  silAchieved: SILLevel | null

  // Contributions par sous-système
  contributions: {
    sensors: SubsystemResult
    solver: SubsystemResult
    actuators: SubsystemResult
  }

  // Courbe temporelle PFD(t) — optionnelle
  curve?: PFDCurvePoint[]

  warnings: EngineWarning[]
}

export interface SubsystemResult {
  pfdavg: number
  pfh: number
  str: number
  /** % de la PFD_SIF totale */
  contributionPct: number
  silFromPFD: SILLevel | null
  silArchitectural: SILLevel | null
  hft: number
  sff: number
  /** Part CCF dans la PFD */
  pfd_ccf: number
  /** Part indépendante dans la PFD */
  pfd_independent: number
  channelResults: ChannelResult[]
}

export interface ChannelResult {
  channelId: string
  pfdavg: number
  pfh: number
  componentResults: ComponentResult[]
}

export interface ComponentResult {
  componentId: string
  parentComponentId?: string
  pfdavg: number
  pfh: number
  lambdaDU: number
  lambdaDD: number
  lambdaSU: number
  lambdaSD: number
  sff: number
  tce: number
}

export interface PFDCurvePoint {
  /** Temps (h) */
  t: number
  /** PFD instantanée */
  pfd: number
  /** PFDavg calculée à ce point (de 0 à t) */
  pfdavg: number
}

export interface EngineWarning {
  code: string
  severity: 'INFO' | 'WARNING' | 'ERROR'
  message: string
  /** ID du composant/canal concerné */
  affected?: string
}

// ---------------------------------------------------------------------------
// Multi-loop System
// ---------------------------------------------------------------------------

export type SystemLogic = 'SERIES' | 'PARALLEL' | 'MANUAL'

export interface SIFSystemConfig {
  id: string
  name: string
  sifIds: string[]
  logic: SystemLogic
  /** Expression booléenne — ex: "1 & (2 | 3)" — si logic === 'MANUAL' */
  manualExpression?: string
}

export interface SystemPFDResult {
  pfdavg: number
  str: number
  mttps: number
  rrf: number
  achievedSIL: SILLevel | null
  sifContributions: Array<{
    sifId: string
    pfdavg: number
    contributionPct: number
  }>
}
