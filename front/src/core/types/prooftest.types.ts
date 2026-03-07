/**
 * core/types/prooftest.types.ts — PRISM
 *
 * Proof test procedure, campaign execution, and operational event types.
 * No dependencies on other PRISM type files.
 */

// ─── Proof Test Locations ────────────────────────────────────────────────
export const PROOF_TEST_LOCATIONS = [
  'SDC',
  'Local Instrumentation',
  'Poste Électrique (PE)',
  'Terrain',
  'Salle de Contrôle',
  'Tableau Électrique',
  'Autre',
] as const
export type ProofTestLocation = (typeof PROOF_TEST_LOCATIONS)[number] | string

// ─── Proof Test Result Types ─────────────────────────────────────────────
export type ProofTestResultType = 'oui_non' | 'valeur' | 'personnalisé'

export interface ProofTestStep {
  id: string
  categoryId: string
  order: number
  action: string
  location: ProofTestLocation
  expectedResultType: ProofTestResultType
  expectedValue: string
}

// ─── Categories ──────────────────────────────────────────────────────────
export type ProofTestCategoryType = 'preliminary' | 'test' | 'final'

export interface ProofTestCategory {
  id: string
  type: ProofTestCategoryType
  title: string
  order: number
  color: string
}

export const CATEGORY_TYPE_META: Record<ProofTestCategoryType, { defaultTitle: string; color: string; locked: boolean }> = {
  preliminary: { defaultTitle: 'Actions préliminaires', color: '#6B7280', locked: true  },
  test:        { defaultTitle: 'Test',                  color: '#009BA4', locked: false },
  final:       { defaultTitle: 'Actions finales',       color: '#003D5C', locked: true  },
}

// ─── Procedure ───────────────────────────────────────────────────────────
export type ProofTestProcedureStatus = 'draft' | 'ifr' | 'approved'

export interface ProofTestProcedure {
  id: string
  ref: string
  revision: string
  status: ProofTestProcedureStatus
  periodicityMonths: number
  categories: ProofTestCategory[]
  steps: ProofTestStep[]
  madeBy: string
  madeByDate: string
  verifiedBy: string
  verifiedByDate: string
  approvedBy: string
  approvedByDate: string
  notes: string
}

// ─── Campaign Execution ──────────────────────────────────────────────────
export type CampaignVerdict = 'pass' | 'fail' | 'conditional'

export interface StepResult {
  stepId: string
  result: 'oui' | 'non' | 'na' | null
  measuredValue: string
  conformant: boolean | null
  comment: string
}

export interface TestCampaign {
  id: string
  date: string
  team: string
  operatingMode: string
  verdict: CampaignVerdict
  notes: string
  stepResults: StepResult[]
  conductedBy: string
  witnessedBy: string
  reviewedBy: string
  processLoad?: string
  sifResponseTimeMs?: number
  valveReactionTimeMs?: number
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
  duration?: number
  impact: 'positive' | 'negative' | 'neutral'
  linkedCampaignId?: string
  resolvedDate?: string
}
