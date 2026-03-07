// =============================================================================
// PRISM Calc Engine — Validation des Entrées et Warnings
// Source : 10_ENGINE_IMPLEMENTATION.md §7
// =============================================================================

import type { SIFDefinition, EngineWarning, ComponentParams } from './types/engine'
import { resolveFailureRates } from './resolver'

// ---------------------------------------------------------------------------
// Collecteur de warnings
// ---------------------------------------------------------------------------

class WarningCollector {
  private warnings: EngineWarning[] = []

  add(warning: EngineWarning): void {
    this.warnings.push(warning)
  }

  getAll(): EngineWarning[] {
    return [...this.warnings]
  }

  hasErrors(): boolean {
    return this.warnings.some(w => w.severity === 'ERROR')
  }
}

// ---------------------------------------------------------------------------
// Validation principale
// ---------------------------------------------------------------------------

/**
 * Valide les entrées d'une SIF et retourne une liste de warnings.
 * Les warnings incluent des INFO, WARNING et ERROR.
 */
export function validateInputs(sif: SIFDefinition): EngineWarning[] {
  const collector = new WarningCollector()
  const solverSubsystem = getSolverSubsystem(sif)
  const allComponents = getAllComponents(sif)

  checkSubsystemStructure(sif.sensors, 'capteurs', collector)
  checkSubsystemStructure(sif.actuators, 'actionneurs', collector)
  checkVoteTypeSupport(sif.sensors, 'capteurs', collector)
  checkVoteTypeSupport(sif.actuators, 'actionneurs', collector)
  if (solverSubsystem) {
    checkSubsystemStructure(solverSubsystem, 'solver', collector)
    checkVoteTypeSupport(solverSubsystem, 'solver', collector)
  }

  // --- Vérification λDU × T1 << 1 (hypothèse approximations IEC) ---
  for (const comp of allComponents) {
    const rates = resolveFailureRates(comp)
    const T1 = comp.test.T1

    if (T1 > 0 && rates.lambdaDU * T1 > 0.1) {
      collector.add({
        code: 'LAMBDA_T1_HIGH',
        severity: 'WARNING',
        message: `Composant ${comp.tag} : λDU×T1 = ${(rates.lambdaDU * T1).toFixed(3)} > 0.1. ` +
          `Les approximations IEC 61508 peuvent sous-estimer la PFD. ` +
          `Envisager un modèle Markov exact pour SIL 4.`,
        affected: comp.id,
      })
    }
  }

  // --- Redondance sans CCF ---
  checkCCF(sif.sensors, 'capteurs', collector)
  checkCCF(sif.actuators, 'actionneurs', collector)
  if (solverSubsystem) {
    checkCCF(solverSubsystem, 'solver', collector)
  }

  // --- MTTR = 0 avec λDD > 0 ---
  for (const comp of allComponents) {
    const rates = resolveFailureRates(comp)
    if (rates.lambdaDD > 0 && comp.MTTR === 0) {
      collector.add({
        code: 'MTTR_ZERO_WITH_LAMBDADD',
        severity: 'WARNING',
        message: `Composant ${comp.tag} : λDD > 0 mais MTTR = 0. ` +
          `Définir un MTTR réaliste pour les défaillances détectées.`,
        affected: comp.id,
      })
    }
  }

  // --- PTC < 100% sans Lifetime ---
  for (const comp of allComponents) {
    if (comp.test.ptc < 1 && !comp.test.lifetime) {
      collector.add({
        code: 'PTC_WITHOUT_LIFETIME',
        severity: 'INFO',
        message: `Composant ${comp.tag} : couverture test PTC = ${(comp.test.ptc * 100).toFixed(0)}% < 100% ` +
          `sans durée de vie (Lifetime). ` +
          `Les défaillances non testables s'accumulent sur 10 ans par défaut. ` +
          `Définir une Lifetime pour un résultat précis.`,
        affected: comp.id,
      })
    }
  }

  // --- T1 = 0 ---
  for (const comp of allComponents) {
    if (comp.test.type !== 'NONE' && comp.test.T1 <= 0) {
      collector.add({
        code: 'T1_ZERO',
        severity: 'ERROR',
        message: `Composant ${comp.tag} : T1 = 0. ` +
          `Définir un intervalle de test valide ou utiliser le type NONE.`,
        affected: comp.id,
      })
    }
  }

  // --- λ < 0 ---
  for (const comp of allComponents) {
    const rates = resolveFailureRates(comp)
    if (rates.lambdaDU < 0 || rates.lambdaDD < 0) {
      collector.add({
        code: 'NEGATIVE_FAILURE_RATE',
        severity: 'ERROR',
        message: `Composant ${comp.tag} : taux de défaillance négatif. ` +
          `Vérifier les paramètres d'entrée.`,
        affected: comp.id,
      })
    }
  }

  // --- SFF incohérent ---
  for (const comp of allComponents) {
    const rates = resolveFailureRates(comp)
    if (rates.SFF < 0 || rates.SFF > 1) {
      collector.add({
        code: 'INVALID_SFF',
        severity: 'WARNING',
        message: `Composant ${comp.tag} : SFF = ${(rates.SFF * 100).toFixed(1)}% hors plage [0, 100%]. ` +
          `Vérifier les paramètres de défaillance.`,
        affected: comp.id,
      })
    }
  }

  // --- CCF beta > 1 ---
  const allSubsystems = [sif.sensors, sif.actuators, solverSubsystem].filter(
    (subsystem): subsystem is NonNullable<typeof subsystem> => subsystem !== null
  )
  for (const sub of allSubsystems) {
    if (sub.ccf.beta > 1 || sub.ccf.beta < 0) {
      collector.add({
        code: 'INVALID_BETA',
        severity: 'ERROR',
        message: `Facteur CCF β = ${sub.ccf.beta} hors plage [0, 1].`,
      })
    }
  }

  // --- Mode basse demande mais T1 très court (risque mode haute demande) ---
  if (sif.demandMode === 'LOW_DEMAND') {
    for (const comp of allComponents) {
      if (comp.test.T1 < 24) { // T1 < 1 jour
        collector.add({
          code: 'T1_VERY_SHORT',
          severity: 'INFO',
          message: `Composant ${comp.tag} : T1 = ${comp.test.T1}h très court pour un mode basse demande. ` +
            `Vérifier si ce composant est en mode haute demande.`,
          affected: comp.id,
        })
      }
    }
  }

  // --- Solver mode ADVANCED sans composant défini ---
  if (sif.solver.mode === 'ADVANCED' && !sif.solver.component && !solverSubsystem) {
    collector.add({
      code: 'SOLVER_ADVANCED_NO_COMPONENT',
      severity: 'ERROR',
      message: `Solver en mode avancé sans composant défini. ` +
        `Définir le composant solver, ses channels, ou utiliser le mode simple.`,
    })
  }

  // --- Vote M > N ---
  for (const sub of [sif.sensors, sif.actuators, solverSubsystem].filter(
    (subsystem): subsystem is NonNullable<typeof subsystem> => subsystem !== null
  )) {
    const { M, N } = sub.voting
    if (M > N) {
      collector.add({
        code: 'INVALID_VOTING',
        severity: 'ERROR',
        message: `Vote ${M}oo${N} invalide : M (${M}) > N (${N}).`,
      })
    }
    if (M <= 0 || N <= 0) {
      collector.add({
        code: 'INVALID_VOTING',
        severity: 'ERROR',
        message: `Vote ${M}oo${N} invalide : M et N doivent être > 0.`,
      })
    }
  }

  return collector.getAll()
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function checkCCF(
  def: SIFDefinition['sensors'] | SIFDefinition['actuators'],
  label: string,
  collector: WarningCollector
): void {
  if (def.voting.N > 1 && def.ccf.beta === 0) {
    collector.add({
      code: 'NO_CCF_WITH_REDUNDANCY',
      severity: 'WARNING',
      message: `Sous-système ${label} : architecture ${def.voting.M}oo${def.voting.N} avec β=0 (pas de CCF). ` +
        `Résultat irréaliste — la redondance parfaite sans cause commune n'existe pas. ` +
        `Définir β ≥ 1% pour un résultat réaliste.`,
    })
  }
}

function checkSubsystemStructure(
  def: SIFDefinition['sensors'] | SIFDefinition['actuators'],
  label: string,
  collector: WarningCollector
): void {
  if (def.channels.length !== def.voting.N) {
    collector.add({
      code: 'CHANNEL_COUNT_MISMATCH',
      severity: 'ERROR',
      message: `Sous-système ${label} : ${def.channels.length} channel(s) définis pour une architecture ${def.voting.M}oo${def.voting.N}. ` +
        `Le nombre de channels doit être égal à N pour un calcul cohérent.`,
    })
  }

  for (const channel of def.channels) {
    if (channel.components.length === 0) {
      collector.add({
        code: 'EMPTY_CHANNEL',
        severity: 'ERROR',
        message: `Sous-système ${label} : le channel ${channel.id} est vide. ` +
          `Un channel vide fausse le calcul de redondance et doit être supprimé ou complété.`,
        affected: channel.id,
      })
    }
  }
}

function checkVoteTypeSupport(
  def: SIFDefinition['sensors'] | SIFDefinition['actuators'],
  label: string,
  collector: WarningCollector
): void {
  if (def.voting.N > 1 && def.voteType !== 'S') {
    collector.add({
      code: 'VOTE_TYPE_APPROXIMATED',
      severity: 'WARNING',
      message: `Sous-système ${label} : le vote ${def.voting.M}oo${def.voting.N}${def.voteType} ` +
        `n'est pas encore modélisé exactement en PFD/PFH/contraintes architecturales. ` +
        `Le moteur applique actuellement les lois MooN standard pour la partie sécurité, ` +
        `avec seulement un ajustement partiel du STR.`,
    })
  }
}

function getAllComponents(sif: SIFDefinition): ComponentParams[] {
  const sensorsComps = sif.sensors.channels.flatMap(ch => ch.components)
  const solverSubsystem = getSolverSubsystem(sif)
  const solverComps = solverSubsystem
    ? solverSubsystem.channels.flatMap(ch => ch.components)
    : sif.solver.mode === 'ADVANCED' && sif.solver.component
      ? [sif.solver.component]
      : []
  const actuatorsComps = sif.actuators.channels.flatMap(ch => ch.components)
  return [...sensorsComps, ...solverComps, ...actuatorsComps]
}

function getSolverSubsystem(sif: SIFDefinition): {
  channels: SIFDefinition['sensors']['channels']
  voting: SIFDefinition['sensors']['voting']
  voteType: SIFDefinition['sensors']['voteType']
  ccf: SIFDefinition['sensors']['ccf']
  standard?: SIFDefinition['sensors']['standard']
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
// Vérification de cohérence post-calcul
// ---------------------------------------------------------------------------

/**
 * Ajoute des warnings basés sur les résultats calculés.
 */
export function validateResults(
  pfdavg: number,
  silFromPFD: number | null,
  silArchitectural: {
    sensors: number | null
    solver: number | null
    actuators: number | null
  },
  warnings: EngineWarning[]
): void {
  // PFD très proche de la limite SIL (à moins de 10%)
  if (silFromPFD !== null) {
    const silLimits: Record<number, number> = { 1: 0.1, 2: 0.01, 3: 0.001, 4: 0.0001 }
    const limit = silLimits[silFromPFD]
    if (limit && pfdavg > limit * 0.9) {
      warnings.push({
        code: 'PFD_NEAR_BOUNDARY',
        severity: 'WARNING',
        message: `PFDavg = ${pfdavg.toExponential(2)} est à moins de 10% de la limite haute du SIL ${silFromPFD} (${limit.toExponential(0)}). ` +
          `Une légère dégradation des composants pourrait faire chuter le SIL atteint.`,
      })
    }
  }

  // Contrainte architecturale plus limitante que PFD
  const archSILs = [
    silArchitectural.sensors,
    silArchitectural.solver,
    silArchitectural.actuators,
  ].filter((s): s is number => s !== null)

  const minArchSIL = archSILs.length > 0 ? Math.min(...archSILs) : null

  if (silFromPFD !== null && minArchSIL !== null && minArchSIL < silFromPFD) {
    warnings.push({
      code: 'ARCHITECTURE_IS_LIMITING',
      severity: 'INFO',
      message: `Le SIL est limité par les contraintes architecturales (SIL ${minArchSIL}) ` +
        `et non par la performance PFD (SIL ${silFromPFD}). ` +
        `Améliorer HFT ou SFF pour atteindre SIL ${silFromPFD}.`,
    })
  }
}
