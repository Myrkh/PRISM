// =============================================================================
// PRISM Calc Engine — Résolution des Paramètres Composants
// Source : 02_COMPONENT_PARAMETERS.md §1, 10_ENGINE_IMPLEMENTATION.md §4
// =============================================================================

import type { ComponentParams, ResolvedRates } from './types/engine'

/**
 * Résout les taux de défaillance effectifs (λDU, λDD, λSU, λSD, SFF)
 * à partir des paramètres du composant (mode factorisé ou développé).
 *
 * Formules :
 *   λDU = λ × (λD/λ) × (1 - DCd)
 *   λDD = λ × (λD/λ) × DCd
 *   λSU = λ × (1 - λD/λ) × (1 - DCs)
 *   λSD = λ × (1 - λD/λ) × DCs
 *   SFF = (λSD + λSU + λDD) / λ = 1 - λDU/λ
 */
export function resolveFailureRates(comp: ComponentParams): ResolvedRates {
  const fr = comp.failureRate

  if (fr.mode === 'FACTORISED') {
    const lambdaD = fr.lambda * fr.lambdaD_ratio
    const lambdaS = fr.lambda * (1 - fr.lambdaD_ratio)
    const lambdaDU = lambdaD * (1 - fr.DCd)
    const lambdaDD = lambdaD * fr.DCd
    const lambdaSU = lambdaS * (1 - fr.DCs)
    const lambdaSD = lambdaS * fr.DCs

    const SFF = fr.lambda > 0
      ? (lambdaSD + lambdaSU + lambdaDD) / fr.lambda
      : 0

    return { lambdaDU, lambdaDD, lambdaSU, lambdaSD, lambda: fr.lambda, SFF }
  } else {
    // Mode développé — taux saisis directement
    const lambda = fr.lambdaDU + fr.lambdaDD + fr.lambdaSU + fr.lambdaSD
    const SFF = lambda > 0
      ? (fr.lambdaSD + fr.lambdaSU + fr.lambdaDD) / lambda
      : 0

    return {
      lambdaDU: fr.lambdaDU,
      lambdaDD: fr.lambdaDD,
      lambdaSU: fr.lambdaSU,
      lambdaSD: fr.lambdaSD,
      lambda,
      SFF,
    }
  }
}

/**
 * Résout les taux effectifs de tous les composants d'un canal (en série)
 * Les composants en série se combinent en ADDITIONNANT leurs taux de défaillance.
 */
export function resolveChannelRates(components: ComponentParams[]): ResolvedRates {
  if (components.length === 0) {
    return { lambdaDU: 0, lambdaDD: 0, lambdaSU: 0, lambdaSD: 0, lambda: 0, SFF: 0 }
  }

  const resolved = components.map(resolveFailureRates)

  const lambdaDU = resolved.reduce((s, r) => s + r.lambdaDU, 0)
  const lambdaDD = resolved.reduce((s, r) => s + r.lambdaDD, 0)
  const lambdaSU = resolved.reduce((s, r) => s + r.lambdaSU, 0)
  const lambdaSD = resolved.reduce((s, r) => s + r.lambdaSD, 0)
  const lambda = lambdaDU + lambdaDD + lambdaSU + lambdaSD

  const SFF = lambda > 0 ? (lambdaSD + lambdaSU + lambdaDD) / lambda : 0

  return { lambdaDU, lambdaDD, lambdaSU, lambdaSD, lambda, SFF }
}

/**
 * Extrait le MTTR effectif pour un canal (composants en série)
 * Approche : MTTR pondéré par λDD (le plus impactant pour PFD)
 */
export function resolveChannelMTTR(components: ComponentParams[]): number {
  if (components.length === 0) return 0

  const totalLambdaDD = components.reduce((s, c) => {
    const r = resolveFailureRates(c)
    return s + r.lambdaDD
  }, 0)

  if (totalLambdaDD === 0) {
    // Aucune défaillance détectée → utiliser le MTTR moyen simple
    return components.reduce((s, c) => s + c.MTTR, 0) / components.length
  }

  // Moyenne pondérée par λDD
  return components.reduce((s, c) => {
    const r = resolveFailureRates(c)
    return s + c.MTTR * r.lambdaDD
  }, 0) / totalLambdaDD
}

/**
 * Extrait T1 effectif pour un canal (composants en série)
 * Utilise le T1 minimum (le test le plus fréquent détermine la PFD)
 */
export function resolveChannelT1(components: ComponentParams[]): number {
  if (components.length === 0) return 0
  return Math.min(...components.map(c => c.test.T1))
}

/**
 * Retourne le DeterminedCharacter le plus restrictif parmi une liste
 * Ordre : NON_TYPE_AB (pire) < TYPE_B < TYPE_A (meilleur)
 */
export function worstDeterminedCharacter(
  chars: ComponentParams['determinedCharacter'][]
): ComponentParams['determinedCharacter'] {
  if (chars.includes('NON_TYPE_AB')) return 'NON_TYPE_AB'
  if (chars.includes('TYPE_B')) return 'TYPE_B'
  return 'TYPE_A'
}

/**
 * Crée des paramètres de composant par défaut (pour tests unitaires)
 */
export function makeDefaultComponentParams(overrides: Partial<ComponentParams> = {}): ComponentParams {
  return {
    id: 'default',
    tag: 'DEFAULT',
    type: 'SENSOR',
    determinedCharacter: 'TYPE_A',
    failureRate: {
      mode: 'DEVELOPED',
      lambdaDU: 1e-6,
      lambdaDD: 0,
      lambdaSU: 0,
      lambdaSD: 0,
    },
    MTTR: 8,
    test: {
      type: 'STOPPED',
      T1: 8760,
      T0: 0,
      sigma: 1.0,
      gamma: 0,
      pi: 0,
      X: true,
      omega1: 0,
      omega2: 0,
      ptc: 1.0,
    },
    ...overrides,
  }
}
