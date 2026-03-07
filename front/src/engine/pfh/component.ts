// =============================================================================
// PRISM Calc Engine — PFH d'un Composant (Mode Haute Demande)
// Source : 04_PFH_FORMULAS.md
//
// PFH = Probability of Failure per Hour
// Mode haute demande / continu : fréquence de sollicitation ≥ 1/an
// =============================================================================

import type { ComponentParams } from '../types/engine'
import { resolveFailureRates } from '../resolver'
import { computeTCE_highDemand } from '../tce'

// ---------------------------------------------------------------------------
// PFH d'un composant 1oo1
// ---------------------------------------------------------------------------

/**
 * PFH d'un composant seul (1oo1) en mode haute demande.
 *
 * Formule (04_PFH_FORMULAS.md §2.1) :
 *   PFH_1oo1 = λDU
 *
 * La fréquence de défaillance dangereuse = taux de défaillances DU.
 */
export function computeComponentPFH(comp: ComponentParams): number {
  const rates = resolveFailureRates(comp)
  return rates.lambdaDU
}

/**
 * PFH pour un solver en mode simple (valeur forfaitaire fabricant).
 */
export function computeSolverPFH_simple(pfh: number): number {
  return pfh
}
