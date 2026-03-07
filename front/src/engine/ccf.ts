// =============================================================================
// PRISM Calc Engine — Défaillances de Cause Commune (CCF) — Modèle β
// Source : 05_CCF_COMMON_CAUSE.md
// =============================================================================

import type { ComponentParams, CCFDef } from './types/engine'
import { resolveFailureRates } from './resolver'
import { safeMin, safeMax, average, geometricMean, quadraticMean } from './utils/stats'

// ---------------------------------------------------------------------------
// Calcul de λCCF selon la méthode choisie
// ---------------------------------------------------------------------------

/**
 * Calcule λCCF à partir des λDU des canaux du groupe.
 *
 * 5 méthodes disponibles (05_CCF_COMMON_CAUSE.md §5) :
 *   MIN      : β × min(λDU_i)
 *   MAX      : β × max(λDU_i)  [défaut GRIF — conservatif]
 *   AVERAGE  : β × mean(λDU_i)
 *   GEOMETRIC: β × geomean(λDU_i)  [recommandé SINTEF/PDS]
 *   QUADRATIC: β × rms(λDU_i)
 */
export function computeLambdaCCF(
  lambdaValues: number[],
  beta: number,
  method: CCFDef['method']
): number {
  if (lambdaValues.length === 0 || beta === 0) return 0

  let baseLambda: number

  switch (method) {
    case 'MIN':
      baseLambda = safeMin(lambdaValues)
      break
    case 'MAX':
      baseLambda = safeMax(lambdaValues)
      break
    case 'AVERAGE':
      baseLambda = average(lambdaValues)
      break
    case 'GEOMETRIC':
      baseLambda = geometricMean(lambdaValues)
      break
    case 'QUADRATIC':
      baseLambda = quadraticMean(lambdaValues)
      break
    default:
      baseLambda = safeMax(lambdaValues)
  }

  return beta * baseLambda
}

// ---------------------------------------------------------------------------
// Contributions CCF aux PFD et PFH
// ---------------------------------------------------------------------------

/**
 * Calcule la contribution CCF à la PFDavg d'un sous-système redondant.
 *
 * Formule (05_CCF_COMMON_CAUSE.md §6) :
 *   PFD_CCF = β × λDU × (T1/2 + MRT) + βD × λDD × MTTR
 *
 * Ce terme est IDENTIQUE pour toutes les architectures redondantes (1oo2, 2oo3, 1oo3...).
 * C'est le plancher incompressible de la redondance.
 */
export function computeCCFContributionPFD(
  channels: ComponentParams[],
  ccf: CCFDef,
  T1_avg: number,
  MTTR_avg: number,
  mrt = 8
): number {
  if (channels.length <= 1) return 0 // Pas de CCF pour un canal unique

  const rates = channels.map(resolveFailureRates)
  const lambdaDUs = rates.map(r => r.lambdaDU)
  const lambdaDDs = rates.map(r => r.lambdaDD)

  const lambdaCCF_DU = computeLambdaCCF(lambdaDUs, ccf.beta, ccf.method)
  const lambdaCCF_DD = computeLambdaCCF(lambdaDDs, ccf.betaD, ccf.method)

  // Terme DU : accumulation jusqu'au test + MRT
  const pfd_ccf_du = lambdaCCF_DU * (T1_avg / 2 + mrt)
  // Terme DD : temps de réparation moyen
  const pfd_ccf_dd = lambdaCCF_DD * MTTR_avg

  return pfd_ccf_du + pfd_ccf_dd
}

/**
 * Calcule la contribution CCF au PFH d'un sous-système redondant.
 *
 * Formule (05_CCF_COMMON_CAUSE.md §6) :
 *   PFH_CCF = β × λDU
 */
export function computeCCFContributionPFH(
  channels: ComponentParams[],
  ccf: CCFDef
): number {
  if (channels.length <= 1) return 0

  const rates = channels.map(resolveFailureRates)
  const lambdaDUs = rates.map(r => r.lambdaDU)

  return computeLambdaCCF(lambdaDUs, ccf.beta, ccf.method)
}

// ---------------------------------------------------------------------------
// Questionnaire CCF simplifié (helper pour l'UI)
// ---------------------------------------------------------------------------

export interface CCFQuestionnaireResult {
  score: number
  recommendedBeta: number
  componentType: 'logic_solver' | 'sensor_actuator'
}

/** Résultat du questionnaire CCF simplifié (05_CCF_COMMON_CAUSE.md §8) */
export function computeBetaFromScore(
  score: number,
  componentType: 'logic_solver' | 'sensor_actuator'
): number {
  if (componentType === 'logic_solver') {
    if (score >= 3.0) return 0.005
    if (score >= 2.0) return 0.01
    if (score >= 1.5) return 0.02
    if (score >= 1.0) return 0.03
    return 0.05
  } else {
    // sensor_actuator
    if (score >= 4.0) return 0.01
    if (score >= 3.0) return 0.02
    if (score >= 2.0) return 0.03
    if (score >= 1.0) return 0.05
    return 0.10
  }
}

/**
 * Retourne les valeurs par défaut recommandées pour CCF
 * si aucune analyse n'est fournie (conservatif : β = 5%)
 */
export function getDefaultCCFDef(): CCFDef {
  return {
    beta: 0.05,
    betaD: 0.025, // βD ≈ β/2
    method: 'MAX',
  }
}
