// =============================================================================
// PRISM Calc Engine — Point d'Entrée Principal
// Source : 10_ENGINE_IMPLEMENTATION.md §3
//
// Usage :
//   import { computeSIF } from '@prism/calc-engine'
//   const result = computeSIF({ sif, options })
// =============================================================================

import type {
  EngineInput,
  EngineResult,
  EngineOptions,
  SIFDefinition,
  SubsystemResult,
  EngineWarning,
  SILLevel,
  PFDCurvePoint,
} from './types/engine'

import { validateInputs, validateResults } from './validation'
import { computeSIFPFD } from './pfd/sif'
import { computeSubsystemPFH } from './pfh/subsystem'
import { computeSubsystemSTR, computeMTTPS } from './str'
import { computeSubsystemArchitecturalSIL } from './architectural'
import { pfdavgToSIL, pfhToSIL, minSIL } from './utils/sil'
import { generatePFDCurve } from './pfd/component'
import { resolveFailureRates } from './resolver'
import { average } from './utils/stats'

// ---------------------------------------------------------------------------
// Options par défaut
// ---------------------------------------------------------------------------

export const DEFAULT_OPTIONS: EngineOptions = {
  standard: 'IEC61508_ROUTE1H',
  mrt: 8, // GRIF default : 8h
  computeSTR: true,
  computeCurve: false,
  curvePoints: 200,
}

function makeAbortedSubsystemResult(hft = 0): SubsystemResult {
  return {
    pfdavg: Number.NaN,
    pfh: Number.NaN,
    str: Number.NaN,
    contributionPct: 0,
    silFromPFD: null,
    silArchitectural: null,
    hft,
    sff: Number.NaN,
    pfd_ccf: Number.NaN,
    pfd_independent: Number.NaN,
    channelResults: [],
  }
}

function buildAbortedResult(sif: SIFDefinition, warnings: EngineWarning[]): EngineResult {
  return {
    sifId: sif.id,
    pfdavg: Number.NaN,
    pfh: Number.NaN,
    str: Number.NaN,
    mttps: Number.NaN,
    rrf: Number.NaN,
    silFromPFD: null,
    silArchitectural: {
      sensors: null,
      solver: null,
      actuators: null,
    },
    silAchieved: null,
    contributions: {
      sensors: makeAbortedSubsystemResult(sif.sensors.voting.N - sif.sensors.voting.M),
      solver: makeAbortedSubsystemResult(),
      actuators: makeAbortedSubsystemResult(sif.actuators.voting.N - sif.actuators.voting.M),
    },
    warnings,
  }
}

// ---------------------------------------------------------------------------
// Fonction principale : computeSIF
// ---------------------------------------------------------------------------

/**
 * Calcule la PFDavg, PFH, STR, SIL et toutes les métriques d'une SIF complète.
 *
 * Architecture du calcul :
 * 1. Validation des entrées → warnings
 * 2. PFD de chaque sous-système (capteurs, solver, actionneurs)
 * 3. PFH de chaque sous-système
 * 4. STR de chaque sous-système
 * 5. SIL architectural de chaque sous-système
 * 6. Agrégation SIF (somme PFD, somme PFH, somme STR)
 * 7. SIL final = min(SIL_PFD, SIL_architectural)
 * 8. Courbe PFD(t) optionnelle
 *
 * @param input - Définition SIF + options
 * @returns Résultats complets du moteur
 */
export function computeSIF(input: EngineInput): EngineResult {
  const { sif, options } = input
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const warnings: EngineWarning[] = []
  const solverSubsystem = getSolverSubsystem(sif)

  // === 1. VALIDATION ===
  const validationWarnings = validateInputs(sif)
  warnings.push(...validationWarnings)

  if (validationWarnings.some(warning => warning.severity === 'ERROR')) {
    warnings.push({
      code: 'CALCULATION_ABORTED',
      severity: 'ERROR',
      message: 'Le calcul SIL a été interrompu car la définition de la SIF est invalide. ' +
        'Corriger les erreurs de validation avant d’utiliser le résultat.',
    })
    return buildAbortedResult(sif, warnings)
  }

  // === 2. PFD PAR SOUS-SYSTÈME ===
  const pfdResult = computeSIFPFD(sif, opts)

  // === 3. PFH PAR SOUS-SYSTÈME ===
  const pfh_sensors = computeSubsystemPFH({
    channels: sif.sensors.channels,
    voting: sif.sensors.voting,
    ccf: sif.sensors.ccf,
  })

  const pfh_solver = sif.solver.mode === 'SIMPLE'
    ? (sif.solver.pfh ?? 0)
    : solverSubsystem
      ? computeSubsystemPFH({
          channels: solverSubsystem.channels,
          voting: solverSubsystem.voting,
          ccf: solverSubsystem.ccf,
        })
      : sif.solver.component
      ? resolveFailureRates(sif.solver.component).lambdaDU
      : 0

  const pfh_actuators = computeSubsystemPFH({
    channels: sif.actuators.channels,
    voting: sif.actuators.voting,
    ccf: sif.actuators.ccf,
  })

  const pfh_total = pfh_sensors + pfh_solver + pfh_actuators

  // === 4. STR PAR SOUS-SYSTÈME ===
  let str_sensors = 0
  let str_solver = 0
  let str_actuators = 0

  if (opts.computeSTR) {
    str_sensors = computeSubsystemSTR({
      channels: sif.sensors.channels,
      voting: sif.sensors.voting,
      voteType: sif.sensors.voteType,
      mrt: opts.mrt,
    })

    str_actuators = computeSubsystemSTR({
      channels: sif.actuators.channels,
      voting: sif.actuators.voting,
      voteType: sif.actuators.voteType,
      mrt: opts.mrt,
    })

    // Solver : STR basé sur ses défaillances sûres
    if (solverSubsystem) {
      str_solver = computeSubsystemSTR({
        channels: solverSubsystem.channels,
        voting: solverSubsystem.voting,
        voteType: solverSubsystem.voteType,
        mrt: opts.mrt,
      })
    } else if (sif.solver.mode === 'ADVANCED' && sif.solver.component) {
      const comp = sif.solver.component
      const rates = resolveFailureRates(comp)
      str_solver = rates.lambdaSU + rates.lambdaSD
    }
  }

  const str_total = str_sensors + str_solver + str_actuators

  // === 5. SIL ARCHITECTURAL ===
  const silArch_sensors = computeSubsystemArchitecturalSIL(sif.sensors, opts.standard)
  const silArch_actuators = computeSubsystemArchitecturalSIL(sif.actuators, opts.standard)
  // Solver : fourni par le fabricant (non calculé, sauf mode avancé)
  const silArch_solver: SILLevel | null = solverSubsystem
    ? computeSubsystemArchitecturalSIL(solverSubsystem, opts.standard)
    : null

  // === 6. AGRÉGATION SIF ===
  const pfdavg_total = pfdResult.pfdavg_total

  // SIL depuis PFD
  const silFromPFD = sif.demandMode === 'LOW_DEMAND'
    ? pfdavgToSIL(pfdavg_total)
    : pfhToSIL(pfh_total)

  // SIL architectural global (min des sous-systèmes)
  const silArchi = {
    sensors: silArch_sensors,
    solver: silArch_solver,
    actuators: silArch_actuators,
  }

  // === 7. SIL FINAL ===
  const silAchieved = minSIL(
    silFromPFD,
    silArch_sensors,
    silArch_solver,
    silArch_actuators
  )

  // Warnings post-calcul
  validateResults(pfdavg_total, silFromPFD, silArchi, warnings)

  // === 8. COMPLÉTION DES RÉSULTATS SOUS-SYSTÈMES ===

  const sensors: SubsystemResult = {
    ...pfdResult.sensors,
    pfh: pfh_sensors,
    str: str_sensors,
    silArchitectural: silArch_sensors,
  }

  const solver: SubsystemResult = {
    ...pfdResult.solver,
    pfh: pfh_solver,
    str: str_solver,
    silArchitectural: silArch_solver,
  }

  const actuators: SubsystemResult = {
    ...pfdResult.actuators,
    pfh: pfh_actuators,
    str: str_actuators,
    silArchitectural: silArch_actuators,
  }

  // === 9. COURBE PFD(t) OPTIONNELLE ===
  let curve: PFDCurvePoint[] | undefined
  if (opts.computeCurve) {
    curve = computePFDCurveForSIF(sif, opts)
  }

  // === RÉSULTAT FINAL ===
  return {
    sifId: sif.id,
    pfdavg: pfdavg_total,
    pfh: pfh_total,
    str: str_total,
    mttps: computeMTTPS(str_total),
    rrf: pfdavg_total > 0 ? 1 / pfdavg_total : Infinity,
    silFromPFD,
    silArchitectural: silArchi,
    silAchieved,
    contributions: { sensors, solver, actuators },
    curve,
    warnings,
  }
}

// ---------------------------------------------------------------------------
// Courbe PFD(t) pour la SIF complète
// ---------------------------------------------------------------------------

/**
 * Génère la courbe PFD(t) de la SIF en agrégeant les courbes des sous-systèmes.
 * Utilise le canal dominant (premier capteur) comme représentatif.
 */
function computePFDCurveForSIF(
  sif: SIFDefinition,
  options: EngineOptions
): PFDCurvePoint[] {
  const nPoints = options.curvePoints
  const missionTime = sif.missionTime

  // Trouver le composant dominant (λDU le plus élevé)
  const allComps = [
    ...sif.sensors.channels.flatMap(ch => ch.components),
    ...sif.actuators.channels.flatMap(ch => ch.components),
  ]

  if (allComps.length === 0) return []

  const dominant = allComps.reduce((a, b) => {
    const rA = resolveFailureRates(a)
    const rB = resolveFailureRates(b)
    return rA.lambdaDU >= rB.lambdaDU ? a : b
  })

  const rates = resolveFailureRates(dominant)

  const rawCurve = generatePFDCurve(
    rates.lambdaDU,
    dominant.test.T1,
    dominant.test.T0,
    missionTime,
    nPoints,
    dominant.test.sigma
  )

  // Convertir en format PFDCurvePoint avec pfdavg cumulatif
  return rawCurve.map((pt, i) => ({
    t: pt.t,
    pfd: pt.pfd,
    pfdavg: i > 0
      ? rawCurve.slice(0, i + 1).reduce((s, p) => s + p.pfd, 0) / (i + 1)
      : pt.pfd,
  }))
}

function getSolverSubsystem(sif: SIFDefinition): {
  channels: NonNullable<SIFDefinition['solver']['channels']>
  voting: NonNullable<SIFDefinition['solver']['voting']>
  voteType: NonNullable<SIFDefinition['solver']['voteType']>
  ccf: NonNullable<SIFDefinition['solver']['ccf']>
  standard?: SIFDefinition['solver']['standard']
} | null {
  if (sif.solver.mode !== 'ADVANCED') return null
  if (!sif.solver.channels || !sif.solver.voting || !sif.solver.ccf) return null

  return {
    channels: sif.solver.channels,
    voting: sif.solver.voting,
    voteType: sif.solver.voteType ?? 'S',
    ccf: sif.solver.ccf,
    standard: sif.solver.standard,
  }
}

// ---------------------------------------------------------------------------
// Exports publics du moteur
// ---------------------------------------------------------------------------

// Types
export type {
  EngineInput,
  EngineResult,
  EngineOptions,
  SIFDefinition,
  SubsystemResult,
  EngineWarning,
  SILLevel,
  PFDCurvePoint,
} from './types/engine'

export type { ComponentParams, ChannelDef, SubsystemDef } from './types/engine'

// Utilitaires
export { pfdavgToSIL, pfhToSIL, minSIL, silLabel, silColor, computeRRF } from './utils/sil'
export { toHours, fromHours, fitToPerHour, formatRate, formatPFD, formatDuration, formatRRF } from './utils/units'
export { resolveFailureRates, makeDefaultComponentParams } from './resolver'
export { computeLambdaCCF, computeBetaFromScore, getDefaultCCFDef } from './ccf'
export { computeArchitecturalSIL } from './architectural'
export { suggestOptimalT1 } from './pfd/subsystem'
export { computeSystemPFD, distributeSILTarget } from './system'
export { computeMTTPS, formatMTTPS } from './str'
