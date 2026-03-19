// =============================================================================
// PRISM Calc Engine — PFDavg d'une SIF Complète (S + L + A)
// Source : 03_PFD_FORMULAS.md §6, 01_FUNDAMENTALS.md §4
//
// PFD_SIF = PFD_sensors + PFD_solver + PFD_actuators
// Les trois sous-systèmes sont en série logique.
// =============================================================================

import type {
  SIFDefinition,
  EngineOptions,
  SubsystemResult,
} from '../types/engine'
import { computeSubsystemPFD } from './subsystem'
import { computeComponentPFD, computeComponentPFD_withPST } from './component'
import { resolveFailureRates } from '../resolver'
import { computeTCE } from '../tce'
import { pfdavgToSIL } from '../utils/sil'
import { computeSubsystemArchitecturalSIL, computeSubsystemArchitecture } from '../architectural'

// ---------------------------------------------------------------------------
// Résultat PFD SIF
// ---------------------------------------------------------------------------

export interface SIFPFDResult {
  pfdavg_total: number
  sensors: SubsystemResult
  solver: SubsystemResult
  actuators: SubsystemResult
}

// ---------------------------------------------------------------------------
// Calcul PFD d'un sous-système — wrappé avec SubsystemResult
// ---------------------------------------------------------------------------

function buildSubsystemResult(
  def: SIFDefinition['sensors'] | SIFDefinition['actuators'],
  standard: EngineOptions['standard'],
  mrt: number
): Omit<SubsystemResult, 'contributionPct'> {
  const result = computeSubsystemPFD({
    channels: def.channels,
    voting: def.voting,
    ccf: def.ccf,
    mrt,
  })

  // Architecture
  const arch = computeSubsystemArchitecture(def)
  const silArch = computeSubsystemArchitecturalSIL(def, standard)

  // Résultats par canal
  const channelResults = def.channels.map(ch => {
    const compResults = ch.components.map(comp => {
      const rates = resolveFailureRates(comp)
      const pfd = comp.partialStroke?.enabled
        ? computeComponentPFD_withPST(comp, mrt)
        : computeComponentPFD(comp, mrt)
      const tce = computeTCE(comp, mrt)
      return {
        componentId: comp.id,
        parentComponentId: comp.parentComponentId,
        pfdavg: pfd,
        pfh: 0, // sera rempli par le module PFH
        lambdaDU: rates.lambdaDU,
        lambdaDD: rates.lambdaDD,
        lambdaSU: rates.lambdaSU,
        lambdaSD: rates.lambdaSD,
        sff: rates.SFF,
        tce,
      }
    })

    const channelPFD = compResults.reduce((s, r) => s + r.pfdavg, 0)
    return {
      channelId: ch.id,
      pfdavg: channelPFD,
      pfh: 0,
      componentResults: compResults,
    }
  })

  return {
    pfdavg: result.pfdavg,
    pfh: 0, // sera rempli plus tard
    str: 0, // sera rempli par le module STR
    silFromPFD: pfdavgToSIL(result.pfdavg),
    silArchitectural: silArch,
    hft: result.hft,
    sff: arch.SFF,
    pfd_ccf: result.pfd_ccf,
    pfd_independent: result.pfd_independent,
    channelResults,
  }
}

// ---------------------------------------------------------------------------
// Calcul PFD du Solver
// ---------------------------------------------------------------------------

function buildSolverResult(
  solver: SIFDefinition['solver'],
  standard: EngineOptions['standard'],
  mrt: number
): Omit<SubsystemResult, 'contributionPct'> {
  if (solver.mode === 'SIMPLE') {
    const pfd = solver.pfd ?? 0
    return {
      pfdavg: pfd,
      pfh: solver.pfh ?? 0,
      str: 0,
      silFromPFD: pfdavgToSIL(pfd),
      silArchitectural: null, // fourni par le fabricant
      hft: 0,
      sff: 0,
      pfd_ccf: 0,
      pfd_independent: pfd,
      channelResults: [],
    }
  }

  if (solver.channels && solver.voting && solver.ccf) {
    const solverDef = {
      channels: solver.channels,
      voting: solver.voting,
      voteType: solver.voteType ?? 'S',
      ccf: solver.ccf,
      standard: solver.standard,
    }

    const result = computeSubsystemPFD({
      channels: solverDef.channels,
      voting: solverDef.voting,
      ccf: solverDef.ccf,
      mrt,
    })

    const arch = computeSubsystemArchitecture(solverDef)
    const silArch = computeSubsystemArchitecturalSIL(solverDef, standard)

    const channelResults = solverDef.channels.map(ch => {
      const compResults = ch.components.map(comp => {
        const rates = resolveFailureRates(comp)
        const pfd = comp.partialStroke?.enabled
          ? computeComponentPFD_withPST(comp, mrt)
          : computeComponentPFD(comp, mrt)
        const tce = computeTCE(comp, mrt)
        return {
          componentId: comp.id,
          parentComponentId: comp.parentComponentId,
          pfdavg: pfd,
          pfh: 0,
          lambdaDU: rates.lambdaDU,
          lambdaDD: rates.lambdaDD,
          lambdaSU: rates.lambdaSU,
          lambdaSD: rates.lambdaSD,
          sff: rates.SFF,
          tce,
        }
      })

      const channelPFD = compResults.reduce((sum, item) => sum + item.pfdavg, 0)
      return {
        channelId: ch.id,
        pfdavg: channelPFD,
        pfh: 0,
        componentResults: compResults,
      }
    })

    return {
      pfdavg: result.pfdavg,
      pfh: 0,
      str: 0,
      silFromPFD: pfdavgToSIL(result.pfdavg),
      silArchitectural: silArch,
      hft: result.hft,
      sff: arch.SFF,
      pfd_ccf: result.pfd_ccf,
      pfd_independent: result.pfd_independent,
      channelResults,
    }
  }

  // Mode avancé : solver modélisé comme un composant unique
  const comp = solver.component!
  const rates = resolveFailureRates(comp)
  const pfd = computeComponentPFD(comp, mrt)
  const tce = computeTCE(comp, mrt)

  return {
    pfdavg: pfd,
    pfh: 0,
    str: 0,
    silFromPFD: pfdavgToSIL(pfd),
    silArchitectural: null,
    hft: comp.hft ?? 0,
    sff: rates.SFF,
    pfd_ccf: 0,
    pfd_independent: pfd,
    channelResults: [{
      channelId: 'solver',
      pfdavg: pfd,
      pfh: 0,
      componentResults: [{
        componentId: comp.id,
        parentComponentId: comp.parentComponentId,
        pfdavg: pfd,
        pfh: 0,
        lambdaDU: rates.lambdaDU,
        lambdaDD: rates.lambdaDD,
        lambdaSU: rates.lambdaSU,
        lambdaSD: rates.lambdaSD,
        sff: rates.SFF,
        tce,
      }],
    }],
  }
}

// ---------------------------------------------------------------------------
// Calcul PFD SIF complet
// ---------------------------------------------------------------------------

/**
 * Calcule la PFDavg totale d'une SIF (capteurs + solver + actionneurs).
 *
 * Formule (03_PFD_FORMULAS.md §6) :
 *   PFD_SIF = PFD_S + PFD_L + PFD_A   (série logique)
 *
 * Note : approximation valide pour PFD << 1.
 * Si PFD > 5%, utiliser la formule exacte :
 *   PFD_SIF = 1 - (1-PFD_S)(1-PFD_L)(1-PFD_A)
 */
export function computeSIFPFD(sif: SIFDefinition, options: EngineOptions): SIFPFDResult {
  const mrt = options.mrt

  // Calcul des trois sous-systèmes
  const sensorsRaw = buildSubsystemResult(sif.sensors, options.standard, mrt)
  const solverRaw = buildSolverResult(sif.solver, options.standard, mrt)
  const actuatorsRaw = buildSubsystemResult(sif.actuators, options.standard, mrt)

  const pfd_S = sensorsRaw.pfdavg
  const pfd_L = solverRaw.pfdavg
  const pfd_A = actuatorsRaw.pfdavg

  // Somme des PFD (série logique)
  // Utiliser la formule exacte si PFD élevée
  let pfdavg_total: number
  if (pfd_S + pfd_L + pfd_A > 0.05) {
    // Formule exacte
    pfdavg_total = 1 - (1 - pfd_S) * (1 - pfd_L) * (1 - pfd_A)
  } else {
    // Approximation (valable si PFD << 1)
    pfdavg_total = pfd_S + pfd_L + pfd_A
  }

  // Contributions en %
  const sensors: SubsystemResult = {
    ...sensorsRaw,
    contributionPct: pfdavg_total > 0 ? (pfd_S / pfdavg_total) * 100 : 0,
  }
  const solver: SubsystemResult = {
    ...solverRaw,
    contributionPct: pfdavg_total > 0 ? (pfd_L / pfdavg_total) * 100 : 0,
  }
  const actuators: SubsystemResult = {
    ...actuatorsRaw,
    contributionPct: pfdavg_total > 0 ? (pfd_A / pfdavg_total) * 100 : 0,
  }

  return { pfdavg_total, sensors, solver, actuators }
}
