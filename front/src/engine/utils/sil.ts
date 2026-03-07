// =============================================================================
// PRISM Calc Engine — Utilitaires SIL
// Source : 01_FUNDAMENTALS.md §2 + §3, 00_MASTER_ROADMAP.md §5
// =============================================================================

import type { SILLevel, DemandMode } from '../types/engine'

// ---------------------------------------------------------------------------
// Tables SIL
// ---------------------------------------------------------------------------

/** PFDavg maximale pour chaque SIL (mode basse demande) */
export const PFD_MAX: Record<SILLevel, number> = {
  1: 1e-1,
  2: 1e-2,
  3: 1e-3,
  4: 1e-4,
}

/** PFDavg minimale pour chaque SIL (mode basse demande) */
export const PFD_MIN: Record<SILLevel, number> = {
  1: 1e-2,
  2: 1e-3,
  3: 1e-4,
  4: 1e-5,
}

/** PFH maximale pour chaque SIL (mode haute demande / continu) */
export const PFH_MAX: Record<SILLevel, number> = {
  1: 1e-5,
  2: 1e-6,
  3: 1e-7,
  4: 1e-8,
}

/** PFH minimale pour chaque SIL (mode haute demande / continu) */
export const PFH_MIN: Record<SILLevel, number> = {
  1: 1e-6,
  2: 1e-7,
  3: 1e-8,
  4: 1e-9,
}

// ---------------------------------------------------------------------------
// Conversion PFD → SIL
// ---------------------------------------------------------------------------

/**
 * Détermine le SIL atteint à partir de la PFDavg (mode basse demande)
 * Retourne null si < SIL 1 (PFDavg ≥ 10⁻¹)
 */
export function pfdavgToSIL(pfdavg: number): SILLevel | null {
  if (pfdavg < 1e-4) return 4
  if (pfdavg < 1e-3) return 3
  if (pfdavg < 1e-2) return 2
  if (pfdavg < 1e-1) return 1
  return null
}

/**
 * Détermine le SIL atteint à partir du PFH (mode haute demande / continu)
 * Retourne null si < SIL 1 (PFH ≥ 10⁻⁵)
 */
export function pfhToSIL(pfh: number): SILLevel | null {
  if (pfh < 1e-8) return 4
  if (pfh < 1e-7) return 3
  if (pfh < 1e-6) return 2
  if (pfh < 1e-5) return 1
  return null
}

/**
 * Convertit PFDavg ou PFH en SIL selon le mode de demande
 */
export function toSIL(value: number, mode: DemandMode): SILLevel | null {
  if (mode === 'LOW_DEMAND') return pfdavgToSIL(value)
  return pfhToSIL(value)
}

// ---------------------------------------------------------------------------
// Limites SIL → PFD
// ---------------------------------------------------------------------------

/** PFDavg maximale pour atteindre un SIL donné (limite haute = PFD = 10^(-SIL)) */
export function silToMaxPFD(sil: SILLevel): number {
  return PFD_MAX[sil]
}

/** PFDavg minimale pour un SIL donné (limite basse) */
export function silToMinPFD(sil: SILLevel): number {
  return PFD_MIN[sil]
}

/** PFH maximale pour un SIL donné */
export function silToMaxPFH(sil: SILLevel): number {
  return PFH_MAX[sil]
}

// ---------------------------------------------------------------------------
// Opérations SIL
// ---------------------------------------------------------------------------

/**
 * SIL final = min des SIL fournis (en ignorant les null)
 * Retourne null si tous sont null
 */
export function minSIL(...sils: (SILLevel | null)[]): SILLevel | null {
  const valid = sils.filter((s): s is SILLevel => s !== null)
  if (valid.length === 0) return null
  return Math.min(...valid) as SILLevel
}

/**
 * SIL maximum parmi les SIL fournis
 */
export function maxSIL(...sils: (SILLevel | null)[]): SILLevel | null {
  const valid = sils.filter((s): s is SILLevel => s !== null)
  if (valid.length === 0) return null
  return Math.max(...valid) as SILLevel
}

/**
 * Label lisible pour un SIL
 * Ex: 3 → "SIL 3" | null → "< SIL 1"
 */
export function silLabel(sil: SILLevel | null): string {
  if (sil === null) return '< SIL 1'
  return `SIL ${sil}`
}

/**
 * Couleur associée à un SIL pour l'UI
 */
export function silColor(sil: SILLevel | null): string {
  switch (sil) {
    case 4: return '#7C3AED' // violet
    case 3: return '#2563EB' // bleu
    case 2: return '#16A34A' // vert
    case 1: return '#D97706' // orange
    default: return '#DC2626' // rouge = < SIL 1
  }
}

/**
 * Calcule le RRF (Risk Reduction Factor) = 1 / PFDavg
 */
export function computeRRF(pfdavg: number): number {
  if (pfdavg <= 0) return Infinity
  return 1 / pfdavg
}

/**
 * Retourne la PFD cible (centre de la fourchette) pour un SIL donné
 * Utile pour la suggestion T1 optimal
 */
export function silToCenterPFD(sil: SILLevel): number {
  // Centre géométrique de [PFD_MIN, PFD_MAX]
  return Math.sqrt(PFD_MIN[sil] * PFD_MAX[sil])
}

/**
 * Vérifie si une PFDavg est dans la zone "limite" d'un SIL
 * (à moins de 20% de la frontière haute)
 */
export function isNearSILBoundary(pfdavg: number): boolean {
  const sil = pfdavgToSIL(pfdavg)
  if (!sil) return false
  const max = PFD_MAX[sil]
  return pfdavg > max * 0.8
}
