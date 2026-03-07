// =============================================================================
// PRISM Calc Engine — PFDavg d'un Sous-Système (Architecture MooN + CCF)
// Source : 03_PFD_FORMULAS.md §3 + §4, 05_CCF_COMMON_CAUSE.md §6
//
// Architectures supportées : 1oo1, 2oo2, 1oo2, 2oo3, 1oo3, MooN général
// Toutes les formules sont celles de l'IEC 61508-6:2010 Annexe B
// =============================================================================

import type { CCFDef, ChannelDef, ResolvedRates } from '../types/engine'
import { resolveChannelRates, resolveChannelMTTR, resolveChannelT1 } from '../resolver'
import { computeTCEFromRates, computeTGE } from '../tce'
import { computeCCFContributionPFD } from '../ccf'
import { computeComponentPFD, computeComponentPFD_withPST } from './component'
import { average, binomialCoeff } from '../utils/stats'

// ---------------------------------------------------------------------------
// Interface résultat sous-système
// ---------------------------------------------------------------------------

export interface SubsystemPFDResult {
  pfdavg: number
  pfd_independent: number
  pfd_ccf: number
  channelPFDs: number[]
  hft: number
}

interface ChannelModel {
  rates: ResolvedRates
  MTTR: number
  T1: number
  tCE: number
}

// ---------------------------------------------------------------------------
// Calcul PFDavg d'un canal individuel (composants en série)
// ---------------------------------------------------------------------------

/**
 * PFDavg d'un canal = somme des PFDavg des composants en série.
 * Un canal échoue si l'UN des composants échoue.
 */
export function computeChannelPFD(channel: ChannelDef, mrt = 8): number {
  if (channel.components.length === 0) return 0

  return channel.components.reduce((sum, comp) => {
    const pfd = comp.partialStroke?.enabled
      ? computeComponentPFD_withPST(comp, mrt)
      : computeComponentPFD(comp, mrt)
    return sum + pfd
  }, 0)
}

function buildChannelModels(channels: ChannelDef[], mrt: number): ChannelModel[] {
  return channels
    .filter(channel => channel.components.length > 0)
    .map(channel => {
      const rates = resolveChannelRates(channel.components)
      const MTTR = resolveChannelMTTR(channel.components)
      const T1 = resolveChannelT1(channel.components)
      const tCE = computeTCEFromRates({
        lambdaDU: rates.lambdaDU,
        lambdaDD: rates.lambdaDD,
        T1,
        MTTR,
        mrt,
      })

      return { rates, MTTR, T1, tCE }
    })
}

// ---------------------------------------------------------------------------
// Terme indépendant par architecture
// ---------------------------------------------------------------------------

/**
 * Calcule le terme de PFD indépendant (sans CCF) selon l'architecture MooN.
 *
 * Formules IEC 61508-6 Annexe B :
 *
 * 1oo1 : pfd_ind = λDU × tCE + λDD × MTTR
 * 2oo2 : pfd_ind = 2 × pfd(1oo1)
 * 1oo2 : pfd_ind = 2 × [(1-βD)λDD + (1-β)λDU] × (1-β)λDU × tCE × tGE
 * 2oo3 : pfd_ind = 6 × [(1-βD)λDD + (1-β)λDU] × (1-β)λDU × tCE × tGE
 * 1oo3 : pfd_ind = 6 × [(1-βD)λDD + (1-β)λDU]² × (1-β)λDU × tCE² × tGE
 */
function computePFD_independent(
  M: number,
  N: number,
  lambdaDU: number,
  lambdaDD: number,
  tCE: number,
  tGE: number,
  beta: number,
  betaD: number
): number {
  // Fractions indépendantes (après extraction du CCF)
  const lambdaInd_DU = (1 - beta) * lambdaDU
  const lambdaInd_DD = (1 - betaD) * lambdaDD
  const lambdaSum = lambdaInd_DD + lambdaInd_DU

  if (N === 1 || (M === N)) {
    // 1oo1 ou série (NooN) — pas de redondance
    return lambdaDU * tCE + lambdaDD * (tCE - tCE + /* MTTR via tCE */ 0)
    // Note : pour 1oo1, pfd_independent = pfd total (pas de CCF à extraire)
    // Géré directement dans computeSubsystemPFD
  }

  if (M === 1 && N === 2) {
    // 1oo2
    return 2 * lambdaSum * lambdaInd_DU * tCE * tGE
  }

  if (M === 2 && N === 3) {
    // 2oo3
    return 6 * lambdaSum * lambdaInd_DU * tCE * tGE
  }

  if (M === 1 && N === 3) {
    // 1oo3
    return 6 * lambdaSum * lambdaSum * lambdaInd_DU * tCE * tCE * tGE
  }

  if (M === 2 && N === 4) {
    // 2oo4 : C(4,3)=4 × ...
    return 4 * 6 * lambdaSum * lambdaInd_DU * tCE * tGE
  }

  // Formule générale MooN (03_PFD_FORMULAS.md §4)
  // λD,G = C(N, N-M+1) × λD^(N-M+1) × tCE^(N-M)
  const k = N - M + 1 // nombre de défaillances simultanées nécessaires
  const C = binomialCoeff(N, k)
  const pfd_general = C * Math.pow(lambdaInd_DU, k) * Math.pow(tCE, k - 1) * tGE
  return pfd_general
}

// ---------------------------------------------------------------------------
// Calcul PFDavg d'un sous-système complet
// ---------------------------------------------------------------------------

/**
 * Calcule la PFDavg d'un sous-système avec architecture MooN et CCF.
 *
 * Algorithme :
 * 1. Résoudre les taux de défaillance pour chaque canal
 * 2. Calculer tCE moyen
 * 3. Calculer PFD indépendant selon l'architecture
 * 4. Calculer PFD CCF (commun à toutes architectures redondantes)
 * 5. PFD total = PFD_independent + PFD_CCF
 *
 * Pour 1oo1 : PFD = λDU × tCE + λDD × MTTR (pas de CCF)
 * Pour NooN : PFD = N × (λDU × tCE + λDD × MTTR) (pas de CCF)
 */
export function computeSubsystemPFD(params: {
  channels: ChannelDef[]
  voting: { M: number; N: number }
  ccf: CCFDef
  mrt?: number
}): SubsystemPFDResult {
  const { channels, voting, ccf, mrt = 8 } = params
  const { M, N } = voting
  const HFT = N - M

  // Canaux vides
  if (channels.length === 0) {
    return { pfdavg: 0, pfd_independent: 0, pfd_ccf: 0, channelPFDs: [], hft: HFT }
  }

  // PFD de chaque canal (composants en série)
  const channelPFDs = channels.map(ch => computeChannelPFD(ch, mrt))

  const channelModels = buildChannelModels(channels, mrt)
  const avgRates = channelModels.length > 0
    ? {
        lambdaDU: average(channelModels.map(model => model.rates.lambdaDU)),
        lambdaDD: average(channelModels.map(model => model.rates.lambdaDD)),
        lambdaSU: average(channelModels.map(model => model.rates.lambdaSU)),
        lambdaSD: average(channelModels.map(model => model.rates.lambdaSD)),
        lambda: average(channelModels.map(model => model.rates.lambda)),
        SFF: average(channelModels.map(model => model.rates.SFF)),
      }
    : { lambdaDU: 0, lambdaDD: 0, lambdaSU: 0, lambdaSD: 0, lambda: 0, SFF: 0 }

  const tCE = average(channelModels.map(model => model.tCE))

  // T1 et MTTR moyens pour le calcul CCF
  const T1_avg = channelModels.length > 0
    ? average(channelModels.map(model => model.T1))
    : 8760
  const MTTR_avg = channelModels.length > 0
    ? average(channelModels.map(model => model.MTTR))
    : 8
  const tGE = computeTGE({
    tCE,
    voting,
    T1: T1_avg,
  })

  // ------- Cas 1oo1 : pas de redondance -------
  if (N === 1 || channels.length === 1) {
    const pfd = channelPFDs[0] ?? 0
    return {
      pfdavg: pfd,
      pfd_independent: pfd,
      pfd_ccf: 0,
      channelPFDs,
      hft: HFT,
    }
  }

  // ------- Cas NooN (série totale) : somme des canaux -------
  if (M === N) {
    const pfd = channelPFDs.reduce((s, p) => s + p, 0)
    return {
      pfdavg: pfd,
      pfd_independent: pfd,
      pfd_ccf: 0,
      channelPFDs,
      hft: HFT,
    }
  }

  // ------- Cas redondant (M < N) : formules IEC 61508-6 -------

  // Terme CCF (plancher commun à toutes les architectures redondantes)
  const pfd_ccf = computeCCFContributionPFD(
    channels.flatMap(ch => ch.components),
    ccf,
    T1_avg,
    MTTR_avg,
    mrt
  )

  // Terme indépendant
  const pfd_independent = computePFD_independent(
    M, N,
    avgRates.lambdaDU,
    avgRates.lambdaDD,
    tCE, tGE,
    ccf.beta, ccf.betaD
  )

  const pfdavg = pfd_independent + pfd_ccf

  return { pfdavg, pfd_independent, pfd_ccf, channelPFDs, hft: HFT }
}

// ---------------------------------------------------------------------------
// Optimisation T1 (suggestion)
// Source : 07_PROOF_TEST_MODELING.md §7
// ---------------------------------------------------------------------------

/**
 * Suggère l'intervalle de test T1 optimal pour atteindre une PFD cible.
 *
 * @param lambdaDU - Taux de défaillance DU (h⁻¹)
 * @param voting - Vote MooN
 * @param beta - Facteur CCF
 * @param pfdTarget - PFD cible (ex: 1e-3 pour SIL 3 centre)
 * @param safetyMargin - Marge de sécurité [0,1] (ex: 0.8 = utiliser 80% de la marge)
 * @returns T1 optimal suggéré (h)
 */
export function suggestOptimalT1(params: {
  lambdaDU: number
  voting: { M: number; N: number }
  beta: number
  pfdTarget: number
  safetyMargin?: number
}): number {
  const { lambdaDU, voting, beta, pfdTarget, safetyMargin = 0.8 } = params
  const { M, N } = voting

  if (lambdaDU <= 0) return Infinity

  let T1_raw: number

  if (N === 1) {
    // 1oo1 : PFD ≈ λDU × T1/2
    T1_raw = 2 * pfdTarget / lambdaDU
  } else if (M === 1 && N === 2) {
    // 1oo2 : PFD ≈ (λDU × T1)²/3
    T1_raw = Math.sqrt(3 * pfdTarget) / lambdaDU
  } else if (M === 2 && N === 3) {
    // 2oo3 : PFD ≈ (λDU × T1)²
    T1_raw = Math.sqrt(pfdTarget) / lambdaDU
  } else if (M === 1 && N === 3) {
    // 1oo3 : PFD ≈ (λDU × T1)³/4
    T1_raw = Math.cbrt(4 * pfdTarget) / lambdaDU
  } else {
    // Fallback 1oo1
    T1_raw = 2 * pfdTarget / lambdaDU
  }

  // Si CCF domine, le T1 est borné par le plancher CCF
  if (beta > 0 && N > 1) {
    const T1_ccf_limit = 2 * pfdTarget / (beta * lambdaDU)
    T1_raw = Math.min(T1_raw, T1_ccf_limit)
  }

  return T1_raw * safetyMargin
}
