/**
 * core/diagnostics/types.ts — PRISM DiagnosticProvider
 *
 * Structured diagnostic items surfaced from SIF validation rules.
 * Pattern inspired by VS Code DiagnosticCollection.
 */
import type { CanonicalSIFTab } from '@/store/types'

export type DiagnosticSeverity = 'error' | 'warning' | 'info'

export interface DiagnosticItem {
  id: string
  severity: DiagnosticSeverity
  /** Which lifecycle phase this diagnostic belongs to */
  phase: CanonicalSIFTab
  /** Short label shown in the badge/list */
  title: string
  /** One-line explanation */
  detail: string
  /** Optional CTA to navigate to the right tab */
  action?: {
    label: string
    tab: CanonicalSIFTab
  }
}

export interface DiagnosticsResult {
  items: DiagnosticItem[]
  errors: number
  warnings: number
  infos: number
  /** True if there are any blocking errors (PFD exceeds target, etc.) */
  hasBlockers: boolean
}
