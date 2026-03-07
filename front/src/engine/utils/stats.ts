// =============================================================================
// PRISM Calc Engine — Utilitaires Statistiques
// =============================================================================

/** Moyenne arithmétique d'un tableau de nombres */
export function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

/** Somme d'un tableau de nombres */
export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0)
}

/** Produit d'un tableau de nombres */
export function product(values: number[]): number {
  return values.reduce((a, b) => a * b, 1)
}

/** Minimum (retourne 0 si tableau vide) */
export function safeMin(values: number[]): number {
  if (values.length === 0) return 0
  return Math.min(...values)
}

/** Maximum (retourne 0 si tableau vide) */
export function safeMax(values: number[]): number {
  if (values.length === 0) return 0
  return Math.max(...values)
}

/** Moyenne géométrique */
export function geometricMean(values: number[]): number {
  if (values.length === 0) return 0
  const logSum = values.reduce((s, v) => s + Math.log(Math.max(v, Number.MIN_VALUE)), 0)
  return Math.exp(logSum / values.length)
}

/** Moyenne quadratique (RMS) */
export function quadraticMean(values: number[]): number {
  if (values.length === 0) return 0
  return Math.sqrt(values.reduce((s, v) => s + v * v, 0) / values.length)
}

/**
 * Coefficient binomial C(n, k) = n! / (k! × (n-k)!)
 * Utilisé pour les formules MooN générales
 */
export function binomialCoeff(n: number, k: number): number {
  if (k > n || k < 0) return 0
  if (k === 0 || k === n) return 1
  // Utiliser la forme symétrique pour éviter overflow
  const kEff = Math.min(k, n - k)
  let result = 1
  for (let i = 0; i < kEff; i++) {
    result = (result * (n - i)) / (i + 1)
  }
  return Math.round(result)
}

/**
 * Clamp une valeur entre min et max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Vérifie si un nombre est fini et positif
 */
export function isPositiveFinite(value: number): boolean {
  return isFinite(value) && value > 0
}

/**
 * Moyenne pondérée par des poids
 */
export function weightedAverage(values: number[], weights: number[]): number {
  const totalWeight = sum(weights)
  if (totalWeight === 0) return average(values)
  return values.reduce((s, v, i) => s + v * weights[i], 0) / totalWeight
}
