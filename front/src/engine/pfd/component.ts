// =============================================================================
// PRISM Calc Engine — PFDavg d'un Composant (Lois TPS / TPC / PST)
// Source : 03_PFD_FORMULAS.md, 07_PROOF_TEST_MODELING.md
//
// Loi TPS (simple)  : λDU, T1 uniquement → PFDavg ≈ λDU × T1/2
// Loi TPE (étendue) : + MTTR → PFDavg = λDU×T1/2 + λDD×MTTR
// Loi TPC (complète): 11 paramètres — σ, γ, π, X, ω₁, ω₂, PTC, Lifetime
// Loi PST           : Partial Stroke Test pour actionneurs
// =============================================================================

import type { ComponentParams } from '../types/engine'
import { resolveFailureRates } from '../resolver'

// ---------------------------------------------------------------------------
// Loi TPS — Simple Periodic Test (Phase 1 MVP)
// ---------------------------------------------------------------------------

/**
 * Loi TPS — version minimale (λDU × T1/2)
 * Usage : test rapide ou quand les paramètres avancés sont tous à 0.
 */
export function computePFD_TPS(lambdaDU: number, T1: number): number {
  return lambdaDU * T1 / 2
}

// ---------------------------------------------------------------------------
// Loi TPE — Extended Periodic Test
// ---------------------------------------------------------------------------

/**
 * Loi TPE — ajoute la contribution λDD × MTTR
 * PFDavg = λDU × T1/2 + λDD × MTTR
 */
export function computePFD_TPE(
  lambdaDU: number,
  lambdaDD: number,
  T1: number,
  MTTR: number,
  mrt = 8
): number {
  return lambdaDU * (T1 / 2 + mrt) + lambdaDD * MTTR
}

// ---------------------------------------------------------------------------
// Loi TPC — Full Periodic Test (11 paramètres)
// Source : 07_PROOF_TEST_MODELING.md §3 + §8
// ---------------------------------------------------------------------------

/**
 * Loi TPC complète — PFDavg d'un composant avec tous les paramètres avancés.
 *
 * Contributions à l'indisponibilité :
 *   1. Défaillances DU testables (σ × PTC × T1/2)
 *   2. Défaillances DU non testables (σ × (1-PTC) × Lifetime/2)
 *   3. Défaillances DD en cours de réparation (λDD × MTTR)
 *   4. Indisponibilité pendant le test (π/T1 × (1-X))
 *   5. Défaillance causée par le test (γ × MTTR/T1)
 *   6. Erreur remise service après test (ω₁ × π/T1)
 *   7. Erreur remise service après réparation (ω₂ × λDD × MTTR²/T1)
 *
 * @param comp - Paramètres complets du composant
 * @param mrt - Mean Restoration Time par défaut (h)
 */
export function computeComponentPFD(comp: ComponentParams, mrt = 8): number {
  const rates = resolveFailureRates(comp)
  const test = comp.test

  // Composant sans taux de défaillance
  if (rates.lambdaDU === 0 && rates.lambdaDD === 0) return 0

  // Pas de test périodique → accumulation exponentielle
  if (test.type === 'NONE') {
    // Utiliser la durée de vie comme horizon si disponible, sinon Lifetime par défaut 10 ans
    const horizon = test.lifetime ?? 87600
    return rates.lambdaDU * horizon / 2 + rates.lambdaDD * comp.MTTR
  }

  const T1 = test.T1
  const MTTR = comp.MTTR
  const sigma = test.sigma      // efficacité test [0,1]
  const gamma = test.gamma      // proba défaillance par test
  const pi = test.pi            // durée test (h)
  const X = test.X ? 1 : 0     // disponible pendant test (1=oui)
  const omega1 = test.omega1
  const omega2 = test.omega2
  const ptc = test.ptc          // proof test coverage [0,1]
  const lifetime = test.lifetime

  // --- 1. Défaillances DU testables ---
  // Fraction λDU × PTC révélée par le test (efficacité σ)
  const pfd_DU_testable = rates.lambdaDU * sigma * ptc * T1 / 2

  // --- 2. Défaillances DU non testables ---
  // Fraction λDU × (1-PTC) jamais révélée → s'accumule jusqu'au remplacement
  const T_nt = lifetime ?? (T1 * 10) // 10 ans par défaut si non spécifié
  const pfd_DU_nontestable = rates.lambdaDU * (1 - ptc) * T_nt / 2

  // --- 3. Défaillances DD en réparation ---
  const pfd_DD = rates.lambdaDD * MTTR

  // --- 4. Indisponibilité pendant le test ---
  // Le composant est retiré π heures toutes les T1 heures, seulement si X=false
  const pfd_test_downtime = T1 > 0 ? (pi / T1) * (1 - X) : 0

  // --- 5. Défaillance causée par le test ---
  // γ = probabilité d'introduire une défaillance à chaque test
  // Si défaillance causée → MTTR pour réparer
  const pfd_gamma = T1 > 0 ? gamma * MTTR / T1 : gamma

  // --- 6. Erreur remise en service après test ---
  const pfd_omega1 = T1 > 0 ? omega1 * pi / T1 : omega1

  // --- 7. Erreur remise en service après réparation ---
  const pfd_omega2 = T1 > 0 ? omega2 * rates.lambdaDD * MTTR * MTTR / T1 : 0

  return (
    pfd_DU_testable +
    pfd_DU_nontestable +
    pfd_DD +
    pfd_test_downtime +
    pfd_gamma +
    pfd_omega1 +
    pfd_omega2
  )
}

// ---------------------------------------------------------------------------
// Loi PST — Partial Stroke Testing
// Source : 07_PROOF_TEST_MODELING.md §6
// ---------------------------------------------------------------------------

/**
 * PFDavg avec Partial Stroke Test (PST) pour actionneurs.
 *
 * Décomposition :
 *   λDU_PST  = λDU × eff_PST → révélé par PST (T1_PST = T1/N_PST)
 *   λDU_NPST = λDU × (1-eff_PST) → révélé uniquement par test complet T1
 *
 *   PFDavg_PST = λDU × eff_PST × T1_PST/2
 *              + λDU × (1-eff_PST) × T1/2
 *
 * @param comp - Paramètres du composant actionneur (avec PST activé)
 * @param mrt - Mean Restoration Time
 */
export function computeComponentPFD_withPST(comp: ComponentParams, mrt = 8): number {
  const pst = comp.partialStroke
  if (!pst?.enabled) {
    return computeComponentPFD(comp, mrt)
  }

  const rates = resolveFailureRates(comp)
  const T1 = comp.test.T1
  const MTTR = comp.MTTR

  const eff = pst.efficiency
  const N_PST = Math.max(pst.nbTests, 1)
  const T1_PST = T1 / N_PST

  // Fraction de λDU révélée par PST
  const lambdaDU_PST = rates.lambdaDU * eff
  // Fraction de λDU révélée seulement par test complet
  const lambdaDU_NPST = rates.lambdaDU * (1 - eff)

  // Contribution PST (test fréquent T1_PST)
  const pfd_pst = lambdaDU_PST * T1_PST / 2

  // Contribution test complet (T1 normal)
  const pfd_full = lambdaDU_NPST * T1 / 2

  // Contribution DD (réparation)
  const pfd_DD = rates.lambdaDD * MTTR

  return pfd_pst + pfd_full + pfd_DD
}

// ---------------------------------------------------------------------------
// Solver simple (PFD forfaitaire)
// ---------------------------------------------------------------------------

/**
 * PFD d'un solver en mode simple (valeur forfaitaire fabricant).
 * Pas de recalcul selon T1.
 */
export function computeSolverPFD_simple(pfd: number): number {
  return pfd
}

// ---------------------------------------------------------------------------
// Courbe PFD(t) — pour affichage graphique
// Source : 03_PFD_FORMULAS.md §7
// ---------------------------------------------------------------------------

export interface PFDCurvePoint {
  t: number
  pfd: number
}

/**
 * Génère la courbe PFD(t) pour un composant 1oo1.
 * La PFD monte linéairement entre les tests et tombe à 0 après chaque test.
 *
 * @param lambdaDU - Taux de défaillance DU (h⁻¹)
 * @param T1 - Intervalle de test (h)
 * @param T0 - Premier test (h)
 * @param missionTime - Durée totale (h)
 * @param nPoints - Nombre de points à générer
 * @param sigma - Efficacité du test (reset partiel si <1)
 */
export function generatePFDCurve(
  lambdaDU: number,
  T1: number,
  T0: number,
  missionTime: number,
  nPoints = 200,
  sigma = 1
): PFDCurvePoint[] {
  const points: PFDCurvePoint[] = []
  let accumulatedPFD = 0 // PFD résiduelle non révélée (si σ < 1)

  for (let i = 0; i <= nPoints; i++) {
    const t = (i / nPoints) * missionTime

    // Trouver le dernier test avant t
    const nTestsPassed = T1 > 0 ? Math.floor((t - T0) / T1) : 0
    const tLastTest = T0 + nTestsPassed * T1
    const tSinceLastTest = Math.max(0, t - tLastTest)

    // PFD = PFD résiduelle + accumulation depuis le dernier test
    const pfd = accumulatedPFD + lambdaDU * tSinceLastTest

    // Mise à jour de la PFD résiduelle lors d'un test
    if (i > 0) {
      const tPrev = ((i - 1) / nPoints) * missionTime
      const nTestsPrev = T1 > 0 ? Math.floor((tPrev - T0) / T1) : 0
      if (nTestsPassed > nTestsPrev) {
        // Un test vient de se passer → réinitialisation partielle
        accumulatedPFD = accumulatedPFD * (1 - sigma)
      }
    }

    points.push({ t, pfd: Math.min(pfd, 1) })
  }

  return points
}
