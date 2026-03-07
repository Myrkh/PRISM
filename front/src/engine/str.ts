// =============================================================================
// PRISM Calc Engine — Taux de Déclenchement Intempestif (STR)
// Source : 08_SPURIOUS_TRIP_RATE.md
//
// STR = Spurious Trip Rate (h⁻¹)
// MTTPS = Mean Time To Spurious Trip = 1/STR (h)
// =============================================================================

import type { ChannelDef } from './types/engine'
import { resolveFailureRates } from './resolver'
import { computeAvgTSE } from './tce'
import { average, binomialCoeff } from './utils/stats'

// ---------------------------------------------------------------------------
// STR d'un sous-système
// ---------------------------------------------------------------------------

/**
 * Calcule le STR (Spurious Trip Rate) d'un sous-système.
 *
 * Principe : les défaillances SÛRES (λS = λSD + λSU) peuvent causer
 * un trip intempestif si suffisamment de canaux sont simultanément en état "sûr".
 *
 * Formules (08_SPURIOUS_TRIP_RATE.md §3) :
 *
 * 1oo1 : STR = λS
 * 1oo2 : STR = 2×λS  (un seul suffit → somme)
 * 2oo2 : STR ≈ λS² × 2×tSE
 * 2oo3 : STR ≈ 3×λS² × tSE  (C(3,2)=3 paires)
 * 1oo3 : STR = 3×λS  (un seul suffit → somme)
 * MooN : STR = C(N,M) × λS^M × tSE^(M-1)
 *
 * @param voteType - 'S' = standard, 'A'/'M' = disponibilité (STR réduit)
 */
export function computeSubsystemSTR(params: {
  channels: ChannelDef[]
  voting: { M: number; N: number }
  voteType: 'S' | 'A' | 'M'
  mrt?: number
}): number {
  const { channels, voting, voteType, mrt = 8 } = params
  const { M, N } = voting

  if (channels.length === 0) return 0

  const allComps = channels.flatMap(ch => ch.components)
  if (allComps.length === 0) return 0

  const rates = allComps.map(resolveFailureRates)

  // Taux de défaillances sûres moyen
  const lambdaSD_avg = average(rates.map(r => r.lambdaSD))
  const lambdaSU_avg = average(rates.map(r => r.lambdaSU))

  // Vote A/M : seules les SU contribuent (les SD sont exclues du vote)
  const lambdaS_eff = voteType === 'S'
    ? lambdaSD_avg + lambdaSU_avg
    : lambdaSU_avg

  if (lambdaS_eff === 0) return 0

  // tSE moyen (safe equivalent downtime)
  const tSE = computeAvgTSE(allComps, mrt)

  return computeSTRbyArchitecture(N, M, lambdaS_eff, tSE)
}

/**
 * Calcule le STR selon l'architecture MooN.
 */
function computeSTRbyArchitecture(
  N: number,
  M: number,
  lambdaS: number,
  tSE: number
): number {
  // 1oo1 : un canal → STR = λS
  if (N === 1) return lambdaS

  // 1ooN : un seul canal suffit → STR = N×λS (additif)
  if (M === 1) return N * lambdaS

  // NooN : tous les canaux doivent échouer → très rare
  if (M === N) {
    const C = binomialCoeff(N, M)
    return C * Math.pow(lambdaS, M) * Math.pow(tSE, M - 1)
  }

  // Cas général MooN : C(N,M) combinaisons de M canaux sur N
  const C = binomialCoeff(N, M)
  return C * Math.pow(lambdaS, M) * Math.pow(tSE, M - 1)
}

// ---------------------------------------------------------------------------
// STR de la SIF complète
// ---------------------------------------------------------------------------

/**
 * Calcule le STR total de la SIF = somme des STR des sous-systèmes.
 *
 * Formule (08_SPURIOUS_TRIP_RATE.md §8) :
 *   STR_SIF = STR_sensors + STR_solver + STR_actuators
 */
export function computeSIFSTR(
  strSensors: number,
  strSolver: number,
  strActuators: number
): number {
  return strSensors + strSolver + strActuators
}

/**
 * Calcule le MTTPS (Mean Time To Spurious Trip) = 1/STR
 * Exprimé en heures.
 */
export function computeMTTPS(str: number): number {
  if (str <= 0) return Infinity
  return 1 / str
}

/**
 * Formate le MTTPS en une durée lisible
 * Ex: 20000 h → "~2.3 ans"
 */
export function formatMTTPS(str: number): string {
  const mttps = computeMTTPS(str)
  if (!isFinite(mttps)) return '∞'
  const years = mttps / 8760
  if (years >= 1) return `~${years.toFixed(1)} an${years > 1.5 ? 's' : ''}`
  const months = mttps / 730
  if (months >= 1) return `~${months.toFixed(1)} mois`
  const days = mttps / 24
  return `~${days.toFixed(0)} jours`
}
