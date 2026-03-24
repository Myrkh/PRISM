/**
 * formatValue.ts — Numeric display utilities for PFD/λ/SIL values.
 *
 * Reads `useScientificNotation` and `decimalRoundingDigits` from AppPreferences.
 * Use `useFormatValue()` in React components, or `formatValue(n, prefs)` for
 * non-React contexts (engine output, PDF export, etc.).
 */
import { useAppStore } from '@/store/appStore'

// ─── Pure formatting function ─────────────────────────────────────────────────

export interface FormatOptions {
  useScientificNotation: boolean
  decimalRoundingDigits: number
}

/**
 * Format a numeric value according to user display preferences.
 *
 * @example
 * formatValue(0.000123, { useScientificNotation: true,  decimalRoundingDigits: 3 }) // "1.230e-4"
 * formatValue(0.000123, { useScientificNotation: false, decimalRoundingDigits: 4 }) // "0.0001"
 */
export function formatValue(value: number, opts: FormatOptions): string {
  if (!Number.isFinite(value)) return '—'

  const { useScientificNotation, decimalRoundingDigits } = opts

  if (useScientificNotation) {
    // e.g. 1.2300e-4
    return value.toExponential(decimalRoundingDigits)
  }

  // Decimal: use significant digits for very small numbers, fixed otherwise
  if (Math.abs(value) > 0 && Math.abs(value) < 1e-3) {
    // Too small to show meaningfully with fixed decimal → fall back to exponential
    return value.toExponential(decimalRoundingDigits)
  }

  return value.toFixed(decimalRoundingDigits)
}

/**
 * Format a percentage value (value × 100), e.g. PFD as %.
 */
export function formatPercent(value: number, opts: FormatOptions): string {
  if (!Number.isFinite(value)) return '—'
  const pct = value * 100
  return `${pct.toFixed(Math.max(0, opts.decimalRoundingDigits - 2))} %`
}

// ─── React hook ──────────────────────────────────────────────────────────────

/**
 * Returns memoised `fmt(value)` and `fmtPct(value)` functions bound to current
 * user preferences. Re-renders only when the relevant prefs change.
 */
export function useFormatValue() {
  const useScientificNotation = useAppStore(s => s.preferences.useScientificNotation)
  const decimalRoundingDigits = useAppStore(s => s.preferences.decimalRoundingDigits)
  const opts: FormatOptions = { useScientificNotation, decimalRoundingDigits }

  return {
    fmt:    (value: number) => formatValue(value, opts),
    fmtPct: (value: number) => formatPercent(value, opts),
    opts,
  }
}
