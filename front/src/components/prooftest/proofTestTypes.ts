/**
 * prooftest/proofTestTypes.ts — PRISM
 *
 * Types, constants, and factories for proof test procedures.
 * Extracted from ProofTestTab.tsx for reuse and clarity.
 */
import { nanoid } from 'nanoid'
import type { SIF } from '@/core/types'
import { TEAL, NAVY } from '@/styles/tokens'

// ─── Types ────────────────────────────────────────────────────────────────
export type ProofTestLocation = string
export const LOCATIONS = ['SDC', 'Local Instrumentation', 'Poste Électrique (PE)', 'Terrain', 'Salle de Contrôle', 'Tableau Électrique', 'Autre'] as const

export type ResultType = 'oui_non' | 'valeur' | 'personnalisé'
export type CatType    = 'preliminary' | 'test' | 'final'
export type Status     = 'draft' | 'ifr' | 'approved'
export type Verdict    = 'pass' | 'fail' | 'conditional' | null
export type StepResultValue = 'oui' | 'non' | 'na' | null
export type ResponseCheckType = 'valve_open' | 'valve_close' | 'sif_response'

export interface PTStep {
  id: string
  categoryId: string
  order: number
  action: string
  location: string
  resultType: ResultType
  expectedValue: string
}

export interface PTCategory {
  id: string
  type: CatType
  title: string
  order: number
}

export interface PTResponseCheck {
  id: string
  label: string
  description: string
  type: ResponseCheckType
  expectedMs: number | null
  maxAllowedMs: number | null
}

export interface PTStepResult {
  stepId: string
  result: StepResultValue
  measuredValue: string
  conformant: boolean | null
  comment: string
}

export interface PTResponseMeasurement {
  checkId: string
  measuredMs: string
  comment: string
}

export type PTResponseMeasurementStatus = 'pending' | 'pass' | 'fail'
export type PTArtifactStatus = 'missing' | 'pending' | 'ready' | 'error'

export interface PTCampaignArtifact {
  bucket: string
  path: string | null
  fileName: string | null
  status: PTArtifactStatus
  generatedAt: string | null
  error: string | null
}

export interface PTCampaign {
  id: string
  date: string
  team: string
  verdict: Verdict
  notes: string
  stepResults: PTStepResult[]
  responseMeasurements: PTResponseMeasurement[]
  procedureSnapshot: PTProcedure | null
  pdfArtifact: PTCampaignArtifact
  closedAt: string | null
  conductedBy: string
  witnessedBy: string
}

export interface PTProcedure {
  id: string
  ref: string
  revision: string
  status: Status
  periodicityMonths: number
  categories: PTCategory[]
  steps: PTStep[]
  responseChecks: PTResponseCheck[]
  madeBy: string; madeByDate: string
  verifiedBy: string; verifiedByDate: string
  approvedBy: string; approvedByDate: string
  notes: string
}

// ─── Constants ────────────────────────────────────────────────────────────
export const CAT_META: Record<CatType, { label: string; color: string; locked: boolean }> = {
  preliminary: { label: 'Actions préliminaires', color: '#6B7280', locked: true  },
  test:        { label: 'Test',                  color: TEAL,      locked: false },
  final:       { label: 'Actions finales',       color: NAVY,      locked: true  },
}

export const RESPONSE_CHECK_TYPE_META: Record<ResponseCheckType, { label: string; color: string }> = {
  valve_open: { label: 'Valve opening', color: '#0891B2' },
  valve_close: { label: 'Valve closing', color: '#EA580C' },
  sif_response: { label: 'SIF response', color: '#7C3AED' },
}

export const STATUS_CFG: Record<Status, { label: string; bg: string; color: string; border: string }> = {
  draft:    { label: 'Brouillon', bg: '#EEF3F7', color: '#667085', border: '#D6DEE8' },
  ifr:      { label: 'IFR',       bg: '#FFF6DB', color: '#C27803', border: '#E7C36A' },
  approved: { label: 'Approuvé',  bg: '#EAF8EF', color: '#15803D', border: '#B7E4C7' },
}

export const inputCls = 'h-8 px-3 text-xs rounded-xl border border-[#D6DEE8] bg-[#F8FBFD] text-[#102437] placeholder:text-[#667085] focus:outline-none focus:ring-2 focus:ring-[#009BA4]/30 focus:border-[#009BA4] transition-all dark:border-[#2A3138] dark:bg-[#1D232A] dark:text-[#DFE8F1] dark:placeholder:text-[#8FA0B1]'

export function newPersistedId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : nanoid()
}

export function createResponseCheck(): PTResponseCheck {
  return {
    id: nanoid(),
    label: '',
    description: '',
    type: 'sif_response',
    expectedMs: null,
    maxAllowedMs: null,
  }
}

export function createResponseMeasurement(checkId: string): PTResponseMeasurement {
  return {
    checkId,
    measuredMs: '',
    comment: '',
  }
}

export function createDefaultCampaignArtifact(bucket = 'prism_prooftest'): PTCampaignArtifact {
  return {
    bucket,
    path: null,
    fileName: null,
    status: 'missing',
    generatedAt: null,
    error: null,
  }
}

export function syncResponseMeasurements(
  checks: PTResponseCheck[],
  measurements: PTResponseMeasurement[] = [],
): PTResponseMeasurement[] {
  return checks.map(check => (
    measurements.find(measurement => measurement.checkId === check.id)
    ?? createResponseMeasurement(check.id)
  ))
}

export function parseMeasuredMs(value: string): number | null {
  if (!value.trim()) return null
  const normalized = Number(value.replace(',', '.'))
  return Number.isFinite(normalized) ? normalized : null
}

export function getResponseMeasurementStatus(
  check: PTResponseCheck,
  measurement?: PTResponseMeasurement | null,
): PTResponseMeasurementStatus {
  const measured = parseMeasuredMs(measurement?.measuredMs ?? '')
  if (measured === null) return 'pending'
  if (check.maxAllowedMs !== null) return measured <= check.maxAllowedMs ? 'pass' : 'fail'
  if (check.expectedMs !== null) return measured <= check.expectedMs ? 'pass' : 'fail'
  return 'pass'
}

// ─── Default procedure factory ───────────────────────────────────────────
export function defaultProcedure(sif: SIF): PTProcedure {
  const catPre: PTCategory  = { id: nanoid(), type: 'preliminary', title: 'Actions préliminaires', order: 0 }
  const catTest: PTCategory = { id: nanoid(), type: 'test', title: `Test — ${sif.sifNumber}`, order: 1 }
  const catFin: PTCategory  = { id: nanoid(), type: 'final', title: 'Actions finales', order: 2 }

  const steps: PTStep[] = [
    { id: nanoid(), categoryId: catPre.id, order: 0, action: 'Obtenir le Permis de Travail (PTW) et s\'assurer de la disponibilité du système', location: 'SDC', resultType: 'oui_non', expectedValue: '' },
    { id: nanoid(), categoryId: catPre.id, order: 1, action: 'Mettre le SIF en bypass et consigner dans le registre de dérogations', location: 'SDC', resultType: 'oui_non', expectedValue: '' },
    { id: nanoid(), categoryId: catPre.id, order: 2, action: 'Vérifier l\'alimentation 24 VDC sur le rack logique et noter la tension', location: 'Local Instrumentation', resultType: 'valeur', expectedValue: '24 ± 1 VDC' },
    { id: nanoid(), categoryId: catTest.id, order: 0, action: 'Injecter signal mA minimum sur transmetteur (entrée capteur)', location: 'Terrain', resultType: 'valeur', expectedValue: '4 mA ± 0.1' },
    { id: nanoid(), categoryId: catTest.id, order: 1, action: 'Vérifier alarme LO sur console opérateur', location: 'SDC', resultType: 'oui_non', expectedValue: '' },
    { id: nanoid(), categoryId: catTest.id, order: 2, action: 'Injecter signal au seuil de déclenchement (setpoint)', location: 'Terrain', resultType: 'valeur', expectedValue: `${sif.processTag || 'Setpoint'} ± 2%` },
    { id: nanoid(), categoryId: catTest.id, order: 3, action: 'Vérifier déclenchement de l\'actionneur final', location: 'Terrain', resultType: 'oui_non', expectedValue: '' },
    { id: nanoid(), categoryId: catTest.id, order: 4, action: 'Mesurer le temps de réponse SIF (déclenchement → fin de course)', location: 'SDC', resultType: 'valeur', expectedValue: '< 2000 ms' },
    { id: nanoid(), categoryId: catFin.id, order: 0, action: 'Remettre l\'actionneur en position initiale et vérifier retour d\'état', location: 'Terrain', resultType: 'oui_non', expectedValue: '' },
    { id: nanoid(), categoryId: catFin.id, order: 1, action: 'Lever le bypass SIF et vérifier l\'état actif', location: 'SDC', resultType: 'oui_non', expectedValue: '' },
    { id: nanoid(), categoryId: catFin.id, order: 2, action: 'Clôturer le PTW et signer le rapport de test', location: 'SDC', resultType: 'oui_non', expectedValue: '' },
  ]

  return {
    id: newPersistedId(), ref: `PT-${sif.sifNumber}-001`, revision: 'A', status: 'draft',
    periodicityMonths: 12,
    categories: [catPre, catTest, catFin],
    steps,
    responseChecks: [],
    madeBy: sif.madeBy || '', madeByDate: '',
    verifiedBy: sif.verifiedBy || '', verifiedByDate: '',
    approvedBy: '', approvedByDate: '',
    notes: '',
  }
}

// ─── Conformance checker ─────────────────────────────────────────────────
export function checkConformance(measured: string, expected: string): boolean | null {
  if (!measured || !expected) return null
  const numMeasured = parseFloat(measured.replace(',', '.'))
  if (isNaN(numMeasured)) return null

  // Parse patterns like "≥ 4 mA", "< 500 ms", "24 ± 1 VDC"
  const geq = expected.match(/[≥>]\s*([\d.]+)/)
  if (geq) return numMeasured >= parseFloat(geq[1])

  const leq = expected.match(/[≤<]\s*([\d.]+)/)
  if (leq) return numMeasured <= parseFloat(leq[1])

  const pm = expected.match(/([\d.]+)\s*±\s*([\d.]+)/)
  if (pm) {
    const center = parseFloat(pm[1])
    const tol = parseFloat(pm[2])
    return numMeasured >= center - tol && numMeasured <= center + tol
  }

  return null
}
