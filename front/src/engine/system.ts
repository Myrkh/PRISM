// =============================================================================
// PRISM Calc Engine — Systèmes Multi-Boucles (SIFs en Série/Parallèle)
// Source : 09_MULTI_LOOP_SYSTEMS.md
// =============================================================================

import type { SIFSystemConfig, SystemPFDResult, SILLevel } from './types/engine'
import { pfdavgToSIL } from './utils/sil'

// ---------------------------------------------------------------------------
// Calcul PFD d'un système multi-boucles
// ---------------------------------------------------------------------------

/**
 * Calcule la PFDavg et le STR d'un système de SIFs.
 *
 * Configurations :
 *   SERIES   : AND logique → PFD_sys = Σ PFD_i (somme)
 *   PARALLEL : OR logique  → PFD_sys = ∏ PFD_i (produit)
 *   MANUAL   : Expression booléenne libre "1 & (2 | 3)"
 *
 * @param system - Configuration du système
 * @param sifResults - Map des résultats de chaque SIF { sifId → { pfdavg, str } }
 */
export function computeSystemPFD(
  system: SIFSystemConfig,
  sifResults: Map<string, { pfdavg: number; str: number }>
): SystemPFDResult {
  const pfds = system.sifIds.map(id => sifResults.get(id)?.pfdavg ?? 0)
  const strs = system.sifIds.map(id => sifResults.get(id)?.str ?? 0)

  let systemPFD: number
  let systemSTR: number

  switch (system.logic) {
    case 'SERIES':
      // AND logique : toutes les SIFs doivent fonctionner
      // Un seul échec suffit → PFD = somme (approx)
      // Formule exacte si PFD > 5% : PFD = 1 - ∏(1 - PFD_i)
      systemPFD = computeSeriesPFD(pfds)
      // STR : un seul faux trip suffit → somme
      systemSTR = strs.reduce((s, str) => s + str, 0)
      break

    case 'PARALLEL':
      // OR logique : au moins une SIF doit fonctionner
      // Toutes doivent échouer → PFD = produit
      systemPFD = pfds.reduce((prod, p) => prod * p, 1)
      // STR parallèle très faible (tous doivent fausser en même temps)
      systemSTR = computeParallelSTR(strs, pfds)
      break

    case 'MANUAL':
      systemPFD = evaluateManualExpression(system.manualExpression ?? '', pfds)
      systemSTR = evaluateManualExpression(system.manualExpression ?? '', strs)
      break

    default:
      systemPFD = computeSeriesPFD(pfds)
      systemSTR = strs.reduce((s, str) => s + str, 0)
  }

  const achievedSIL = pfdavgToSIL(systemPFD)
  const rrf = systemPFD > 0 ? 1 / systemPFD : Infinity
  const mttps = systemSTR > 0 ? 1 / systemSTR : Infinity

  const sifContributions = system.sifIds.map((id, i) => ({
    sifId: id,
    pfdavg: pfds[i],
    contributionPct: systemPFD > 0 ? (pfds[i] / systemPFD) * 100 : 0,
  }))

  return { pfdavg: systemPFD, str: systemSTR, mttps, rrf, achievedSIL, sifContributions }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * PFD d'un système série (AND logique)
 * Utilise la formule exacte si la somme > 5%
 */
function computeSeriesPFD(pfds: number[]): number {
  const simpleSum = pfds.reduce((s, p) => s + p, 0)

  if (simpleSum > 0.05) {
    // Formule exacte (03_PFD_FORMULAS.md §10 "Piège 3")
    return 1 - pfds.reduce((prod, p) => prod * (1 - p), 1)
  }

  return simpleSum
}

/**
 * STR d'un système parallèle
 * Très faible — tous les éléments doivent être en faux trip simultanément.
 * Approximation pour 2 SIFs : STR ≈ 2 × STR1 × STR2 × MTTSR
 */
function computeParallelSTR(strs: number[], pfds: number[]): number {
  if (strs.length === 0) return 0
  if (strs.length === 1) return strs[0]

  // MTTSR approximatif : 1/STR moyen
  const strAvg = strs.reduce((s, str) => s + str, 0) / strs.length
  if (strAvg <= 0) return 0

  const MTTSR = 1 / strAvg
  return strs.length * strs[0] * strs[1] * MTTSR
}

/**
 * Évalue une expression booléenne manuelle du type "1 & (2 | 3)"
 * avec les valeurs de PFD (ou STR) des SIFs numérotées 1..N.
 *
 * Convention : '&' = AND (serie, +), '|' = OR (parallèle, ×)
 */
export function evaluateManualExpression(expression: string, values: number[]): number {
  if (!expression || values.length === 0) return 0

  // Remplacer les indices par les valeurs (de N..1 pour éviter les collisions)
  let expr = expression.replace(/\s/g, '')
  for (let i = values.length; i >= 1; i--) {
    expr = expr.split(i.toString()).join(values[i - 1].toExponential())
  }

  return parseExpression(expr)
}

/**
 * Parser récursif simple pour les expressions booléennes PFD
 * Priorité : parenthèses > '|' (OR=×) > '&' (AND=+)
 */
function parseExpression(expr: string): number {
  // Résoudre les parenthèses en premier
  let modified = expr
  while (modified.includes('(')) {
    modified = modified.replace(/\(([^()]+)\)/, (_match, inner) => {
      return parseExpression(inner).toExponential()
    })
  }

  // OR (|) = multiplication des PFDs (parallèle)
  if (modified.includes('|')) {
    return modified
      .split('|')
      .reduce((prod, part) => prod * parseFloat(part), 1)
  }

  // AND (&) = somme des PFDs (série)
  if (modified.includes('&')) {
    return modified
      .split('&')
      .reduce((sum, part) => sum + parseFloat(part), 0)
  }

  return parseFloat(modified) || 0
}

// ---------------------------------------------------------------------------
// Utilitaire : décomposition de SIL système en SIL par SIF
// ---------------------------------------------------------------------------

/**
 * Distribue un SIL cible sur N SIFs en série.
 *
 * Approche simplifiée (09_MULTI_LOOP_SYSTEMS.md §5) :
 *   PFD_par_SIF = PFD_target / N
 */
export function distributeSILTarget(
  silTarget: SILLevel,
  nSIFs: number,
  repartition?: number[] // poids de répartition [0,1], somme = 1
): number[] {
  const pfdTarget: Record<SILLevel, number> = {
    1: 5e-2,  // centre SIL 1
    2: 5e-3,  // centre SIL 2
    3: 5e-4,  // centre SIL 3
    4: 5e-5,  // centre SIL 4
  }

  const pfdTotal = pfdTarget[silTarget]

  if (repartition && repartition.length === nSIFs) {
    return repartition.map(w => pfdTotal * w)
  }

  // Répartition égale
  return Array(nSIFs).fill(pfdTotal / nSIFs)
}
