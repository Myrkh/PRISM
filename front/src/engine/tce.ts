// =============================================================================
// PRISM Calc Engine — Calcul tCE, tGE, tSE
// Source : 03_PFD_FORMULAS.md §2, 04_PFH_FORMULAS.md §3, 08_SPURIOUS_TRIP_RATE.md §5
//
// tCE = Channel Equivalent mean downtime
//   Temps moyen pendant lequel un canal est défaillant mais non détecté
//
// tGE = Group Equivalent mean downtime
//   Comme tCE mais pour le groupe (= tCE dans la plupart des cas pour N=2)
//
// tSE = Safe Equivalent mean downtime
//   Pour le calcul STR (défaillances sûres)
// =============================================================================

import type { ComponentParams } from './types/engine'
import { resolveFailureRates } from './resolver'

// ---------------------------------------------------------------------------
// tCE — Mode Basse Demande (Low Demand)
// ---------------------------------------------------------------------------

export function computeTCEFromRates(params: {
  lambdaDU: number
  lambdaDD: number
  T1: number
  MTTR: number
  mrt?: number
}): number {
  const { lambdaDU, lambdaDD, T1, MTTR, mrt = 8 } = params
  const lambdaD = lambdaDU + lambdaDD

  if (lambdaD === 0) return 0

  const tCE_DU = lambdaDU * (T1 / 2 + mrt)
  const tCE_DD = lambdaDD * MTTR

  return (tCE_DU + tCE_DD) / lambdaD
}

/**
 * Calcule tCE pour un composant en mode basse demande (STOPPED).
 *
 * Formule de base (03_PFD_FORMULAS.md §2) :
 *   tCE = T1/2 + MRT
 *
 * Avec les composants λDD :
 *   tCE = (λDU × (T1/2 + MRT) + λDD × MTTR) / (λDU + λDD)
 *
 * @param comp - Paramètres du composant
 * @param mrt - Mean Restoration Time par défaut (h) — GRIF : 8h
 * @returns tCE en heures
 */
export function computeTCE(comp: ComponentParams, mrt = 8): number {
  const rates = resolveFailureRates(comp)
  return computeTCEFromRates({
    lambdaDU: rates.lambdaDU,
    lambdaDD: rates.lambdaDD,
    T1: comp.test.T1,
    MTTR: comp.MTTR,
    mrt,
  })
}

/**
 * tCE simplifié (hypothèse λDD ≈ 0) : T1/2
 * Utilisé pour les formules ultra-simplifiées
 */
export function computeTCE_simple(T1: number): number {
  return T1 / 2
}

/**
 * tCE en mode test WORKING (composant indisponible pendant le test).
 *
 * Terme supplémentaire dû à l'indisponibilité pendant le test :
 *   tCE_working = tCE_stopped + λ* × π × (π / (2 × T1))
 *
 * Note : terme mineur si π << T1. Ignoré en Phase 1 MVP.
 */
export function computeTCE_working(comp: ComponentParams, mrt = 8): number {
  const rates = resolveFailureRates(comp)
  const test = comp.test
  const tce_base = computeTCE(comp, mrt)

  if (test.pi === 0 || test.X) {
    // Test instantané ou composant disponible pendant le test → même que STOPPED
    return tce_base
  }

  // Terme supplémentaire : indisponibilité pendant le test
  const lambdaStar = test.lambdaStar ?? rates.lambdaDU
  const pi = test.pi
  const T1 = test.T1

  const extra = lambdaStar * pi * (pi / (2 * T1))
  return tce_base + extra
}

// ---------------------------------------------------------------------------
// tCE — Mode Haute Demande (High Demand)
// ---------------------------------------------------------------------------

export function computeTCE_highDemandFromRates(params: {
  lambdaDU: number
  lambdaDD: number
  T1: number
  MTTR: number
}): number {
  const { lambdaDU, lambdaDD, T1, MTTR } = params
  const lambdaD = lambdaDU + lambdaDD

  if (lambdaD === 0) return 0
  if (lambdaDD === 0) return T1 / 2

  return (lambdaDU * T1 / 2 + lambdaDD * MTTR) / lambdaD
}

/**
 * tCE en mode haute demande.
 *
 * Formule (04_PFH_FORMULAS.md §3) :
 *   Si λDD > 0 : tCE = (λDU × T1/2 + λDD × MTTR) / (λDU + λDD)
 *   Si λDD = 0 : tCE = T1/2
 *
 * Signification légèrement différente du mode basse demande :
 * le terme MRT est remplacé par MTTR (réparation pendant marche).
 */
export function computeTCE_highDemand(comp: ComponentParams): number {
  const rates = resolveFailureRates(comp)
  return computeTCE_highDemandFromRates({
    lambdaDU: rates.lambdaDU,
    lambdaDD: rates.lambdaDD,
    T1: comp.test.T1,
    MTTR: comp.MTTR,
  })
}

// ---------------------------------------------------------------------------
// tGE — Group Equivalent Mean Downtime
// ---------------------------------------------------------------------------

/**
 * tGE pour une architecture kooN (Source : 03_PFD_FORMULAS.md §3 tableau)
 *
 * Pour N canaux identiques, tGE dépend du nombre de canaux :
 *   1oo1 : tGE = T1/2
 *   1oo2 : tGE = T1/3 (approximation pour groupe à 2 canaux)
 *   2oo3 : tGE = T1/3
 *   1oo3 : tGE = T1/4
 *
 * Pour les architectures redondantes, GRIF documente des lois spécifiques
 * (1oo2S/A, 2oo3S/A) et des fonctions Markov. En l'absence de ces lois exactes
 * dans le moteur, on utilise une approximation temporelle plus réaliste que
 * tGE=tCE : T1 / (k+1), avec k = N-M+1 défaillances nécessaires.
 *
 * @param tCE - tCE d'un canal individuel
 * @param voting - configuration MooN
 * @param T1 - période de test représentative du groupe
 * @returns tGE en heures
 */
export function computeTGE(params: {
  tCE: number
  voting: { M: number; N: number }
  T1?: number
}): number {
  const { tCE, voting, T1 } = params
  const { M, N } = voting

  if (N <= 1 || M === N) return tCE
  if (!T1 || T1 <= 0) return tCE

  const failuresRequired = N - M + 1
  const overlapWindow = T1 / (failuresRequired + 1)

  if (!isFinite(overlapWindow) || overlapWindow <= 0) return tCE
  return overlapWindow
}

// ---------------------------------------------------------------------------
// tSE — Safe Equivalent Mean Downtime (pour STR)
// ---------------------------------------------------------------------------

/**
 * tSE — temps moyen pendant lequel un canal est en défaillance SÛRE.
 *
 * Formule (08_SPURIOUS_TRIP_RATE.md §5) :
 *   tSE = (λSD × MTTR + λSU × T1/2) / λS
 *
 * Pour λSD : temps = MTTR (réparation rapide après détection)
 * Pour λSU : temps = T1/2 (détection seulement au prochain test)
 */
export function computeTSE(comp: ComponentParams, mrt = 8): number {
  const rates = resolveFailureRates(comp)
  const lambdaS = rates.lambdaSU + rates.lambdaSD

  if (lambdaS === 0) return 0

  const T1 = comp.test.T1
  const MTTR = comp.MTTR

  return (rates.lambdaSD * MTTR + rates.lambdaSU * T1 / 2) / lambdaS
}

/**
 * tSE moyen pour un ensemble de composants (canaux)
 */
export function computeAvgTSE(comps: ComponentParams[], mrt = 8): number {
  if (comps.length === 0) return 0

  const rates = comps.map(resolveFailureRates)
  const totalLambdaS = rates.reduce((s, r) => s + r.lambdaSU + r.lambdaSD, 0)

  if (totalLambdaS === 0) return 0

  const T1_avg = comps.reduce((s, c) => s + c.test.T1, 0) / comps.length
  const MTTR_avg = comps.reduce((s, c) => s + c.MTTR, 0) / comps.length

  const lambdaSD_avg = rates.reduce((s, r) => s + r.lambdaSD, 0) / comps.length
  const lambdaSU_avg = rates.reduce((s, r) => s + r.lambdaSU, 0) / comps.length
  const lambdaS_avg = lambdaSD_avg + lambdaSU_avg

  if (lambdaS_avg === 0) return 0

  return (lambdaSD_avg * MTTR_avg + lambdaSU_avg * T1_avg / 2) / lambdaS_avg
}
