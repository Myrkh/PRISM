/**
 * core/diagnostics/useSIFDiagnostics.ts — PRISM DiagnosticProvider hook
 *
 * Runs all SIF validation rules and returns structured diagnostics.
 * Memoized: only re-runs when the SIF or calc result changes.
 */
import { useMemo } from 'react'
import type { SIF } from '@/core/types'
import { calcSIF } from '@/core/math/pfdCalc'
import { runSIFDiagnosticRules } from './sifRules'
import type { DiagnosticsResult } from './types'

const EMPTY: DiagnosticsResult = {
  items: [],
  errors: 0,
  warnings: 0,
  infos: 0,
  hasBlockers: false,
}

export function useSIFDiagnostics(sif: SIF | null | undefined): DiagnosticsResult {
  return useMemo(() => {
    if (!sif) return EMPTY

    let calc = null
    try { calc = calcSIF(sif) } catch { /* invalid SIF — calc remains null */ }

    const items = runSIFDiagnosticRules(sif, calc)
    const errors   = items.filter(d => d.severity === 'error').length
    const warnings = items.filter(d => d.severity === 'warning').length
    const infos    = items.filter(d => d.severity === 'info').length

    return {
      items,
      errors,
      warnings,
      infos,
      hasBlockers: errors > 0,
    }
  }, [sif])
}
