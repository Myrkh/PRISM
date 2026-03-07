// =============================================================================
// PRISM Calc Engine — PFH d'un Sous-Système (Mode Haute Demande)
// Source : 04_PFH_FORMULAS.md §2
//
// Formules IEC 61508-6 pour mode haute demande / continu
// =============================================================================

import type { ChannelDef, CCFDef, ResolvedRates } from '../types/engine'
import { resolveChannelMTTR, resolveChannelRates, resolveChannelT1 } from '../resolver'
import { computeTCE_highDemandFromRates } from '../tce'
import { computeCCFContributionPFH } from '../ccf'
import { average, binomialCoeff } from '../utils/stats'

interface ChannelModel {
  rates: ResolvedRates
  MTTR: number
  T1: number
  tCE: number
}

function buildChannelModels(channels: ChannelDef[]): ChannelModel[] {
  return channels
    .filter(channel => channel.components.length > 0)
    .map(channel => {
      const rates = resolveChannelRates(channel.components)
      const MTTR = resolveChannelMTTR(channel.components)
      const T1 = resolveChannelT1(channel.components)
      const tCE = computeTCE_highDemandFromRates({
        lambdaDU: rates.lambdaDU,
        lambdaDD: rates.lambdaDD,
        T1,
        MTTR,
      })

      return { rates, MTTR, T1, tCE }
    })
}

// ---------------------------------------------------------------------------
// Calcul PFH d'un sous-système
// ---------------------------------------------------------------------------

/**
 * Calcule le PFH d'un sous-système avec architecture MooN en mode haute demande.
 *
 * Formules (04_PFH_FORMULAS.md §2) :
 *
 * 1oo1 : PFH = λDU
 * 2oo2 : PFH = 2λDU
 * NooN : PFH = N × λDU
 * 1oo2 : PFH = 2 × [(1-βD)λDD + (1-β)λDU] × (1-β)λDU × tCE + β×λDU
 * 2oo3 : PFH = 6 × [(1-βD)λDD + (1-β)λDU] × (1-β)λDU × tCE + β×λDU
 * 1oo3 : PFH = 6 × [(1-βD)λDD + (1-β)λDU]² × (1-β)λDU × tCE² + β×λDU
 */
export function computeSubsystemPFH(params: {
  channels: ChannelDef[]
  voting: { M: number; N: number }
  ccf: CCFDef
}): number {
  const { channels, voting, ccf } = params
  const { M, N } = voting

  if (channels.length === 0) return 0

  const allComps = channels.flatMap(ch => ch.components)
  if (allComps.length === 0) return 0
  const channelModels = buildChannelModels(channels)

  // Résoudre les taux moyens
  const lambdaDU = average(channelModels.map(model => model.rates.lambdaDU))
  const lambdaDD = average(channelModels.map(model => model.rates.lambdaDD))

  // tCE en mode haute demande
  const tCE = average(channelModels.map(model => model.tCE))

  const beta = ccf.beta
  const betaD = ccf.betaD

  // ------- 1oo1 -------
  if (N === 1 || channels.length === 1) {
    return lambdaDU
  }

  // ------- NooN (série) -------
  if (M === N) {
    return N * lambdaDU
  }

  // ------- Redondant (M < N) -------

  // Terme CCF (plancher, même pour toutes les architectures)
  const pfh_ccf = computeCCFContributionPFH(allComps, ccf)

  // Fractions indépendantes
  const lambdaInd_DU = (1 - beta) * lambdaDU
  const lambdaInd_DD = (1 - betaD) * lambdaDD
  const lambdaSum = lambdaInd_DD + lambdaInd_DU

  let pfh_independent: number

  if (M === 1 && N === 2) {
    // 1oo2
    pfh_independent = 2 * lambdaSum * lambdaInd_DU * tCE
  } else if (M === 2 && N === 3) {
    // 2oo3
    pfh_independent = 6 * lambdaSum * lambdaInd_DU * tCE
  } else if (M === 1 && N === 3) {
    // 1oo3
    pfh_independent = 6 * lambdaSum * lambdaSum * lambdaInd_DU * tCE * tCE
  } else if (M === 2 && N === 4) {
    // 2oo4
    pfh_independent = 4 * 6 * lambdaSum * lambdaInd_DU * tCE
  } else {
    // Formule générale MooN
    const k = N - M + 1
    const C = binomialCoeff(N, k)
    pfh_independent = C * Math.pow(lambdaInd_DU, k) * Math.pow(tCE, k - 1)
  }

  return pfh_independent + pfh_ccf
}
