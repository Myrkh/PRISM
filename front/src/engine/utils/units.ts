// =============================================================================
// PRISM Calc Engine — Conversions d'Unités
// Source : 00_MASTER_ROADMAP.md §6, 02_COMPONENT_PARAMETERS.md §2
// Toujours travailler en heures (h⁻¹) en interne
// =============================================================================

export const HOURS_PER_YEAR = 8760
export const HOURS_PER_DAY = 24
export const HOURS_PER_MONTH = 730 // 8760 / 12

export type TimeUnit = 'hours' | 'days' | 'months' | 'years'

/** Convertit une valeur vers les heures */
export function toHours(value: number, unit: TimeUnit): number {
  switch (unit) {
    case 'hours':  return value
    case 'days':   return value * HOURS_PER_DAY
    case 'months': return value * HOURS_PER_MONTH
    case 'years':  return value * HOURS_PER_YEAR
  }
}

/** Convertit depuis les heures vers l'unité cible */
export function fromHours(hours: number, unit: TimeUnit): number {
  switch (unit) {
    case 'hours':  return hours
    case 'days':   return hours / HOURS_PER_DAY
    case 'months': return hours / HOURS_PER_MONTH
    case 'years':  return hours / HOURS_PER_YEAR
  }
}

/** Conversion FIT → h⁻¹ (1 FIT = 10⁻⁹ h⁻¹) */
export function fitToPerHour(fit: number): number {
  return fit * 1e-9
}

/** Conversion h⁻¹ → FIT */
export function perHourToFIT(rate: number): number {
  return rate * 1e9
}

/**
 * Formate un taux de défaillance pour l'affichage scientifique
 * Ex: 5e-7 → "5.00×10⁻⁷ h⁻¹"
 */
export function formatRate(rate: number): string {
  if (rate === 0) return '0 h⁻¹'
  const exp = Math.floor(Math.log10(rate))
  const mantissa = rate / Math.pow(10, exp)
  const expStr = exp >= 0 ? `⁺${exp}` : exp.toString().replace('-', '⁻')
  return `${mantissa.toFixed(2)}×10${expStr} h⁻¹`
}

/**
 * Formate une PFD pour l'affichage scientifique
 * Ex: 4.38e-3 → "4.38×10⁻³"
 */
export function formatPFD(pfd: number): string {
  if (pfd === 0) return '0'
  if (pfd >= 0.1) return pfd.toFixed(4)
  const exp = Math.floor(Math.log10(pfd))
  const mantissa = pfd / Math.pow(10, exp)
  const expStr = exp >= 0 ? `⁺${exp}` : exp.toString().replace('-', '⁻')
  return `${mantissa.toFixed(2)}×10${expStr}`
}

/**
 * Formate une durée en heures vers une représentation lisible
 * Ex: 8760 → "1.00 an" | 730 → "1.00 mois" | 168 → "7.00 jours"
 */
export function formatDuration(hours: number): string {
  if (hours >= HOURS_PER_YEAR) {
    const years = hours / HOURS_PER_YEAR
    return `${years.toFixed(2)} an${years > 1 ? 's' : ''}`
  }
  if (hours >= HOURS_PER_MONTH) {
    const months = hours / HOURS_PER_MONTH
    return `${months.toFixed(1)} mois`
  }
  if (hours >= HOURS_PER_DAY) {
    const days = hours / HOURS_PER_DAY
    return `${days.toFixed(1)} jour${days > 1 ? 's' : ''}`
  }
  return `${hours.toFixed(1)} h`
}

/**
 * Formate un RRF (Risk Reduction Factor)
 * Ex: 200 → "200" | 1234.5 → "1 235"
 */
export function formatRRF(rrf: number): string {
  if (!isFinite(rrf)) return '∞'
  if (rrf >= 1e6) return `${(rrf / 1e6).toFixed(1)}M`
  if (rrf >= 1e3) return rrf.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return rrf.toFixed(1)
}
