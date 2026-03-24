/**
 * DiagnosticsPanel.tsx — PRISM SIF Diagnostics
 *
 * Reusable panel section displaying DiagnosticItems for the current SIF.
 * Used in right panels (CockpitRightPanel, VerificationRightPanel, etc.)
 * and in the StatusBar badge.
 */
import { AlertCircle, AlertTriangle, Info, ChevronRight } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { usePrismTheme } from '@/styles/usePrismTheme'
import type { DiagnosticsResult, DiagnosticItem, DiagnosticSeverity } from '@/core/diagnostics'
import type { CanonicalSIFTab } from '@/store/types'

// ─── Severity config ─────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<DiagnosticSeverity, {
  Icon: typeof AlertCircle
  color: string
  bg: string
  border: string
}> = {
  error:   { Icon: AlertCircle,   color: '#EF4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.25)'   },
  warning: { Icon: AlertTriangle, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)'  },
  info:    { Icon: Info,          color: '#60A5FA', bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.25)'  },
}

// ─── Single diagnostic item ───────────────────────────────────────────────────

function DiagnosticRow({ item, onNavigate }: {
  item: DiagnosticItem
  onNavigate: (tab: CanonicalSIFTab) => void
}) {
  const { TEXT, TEXT_DIM } = usePrismTheme()
  const { Icon, color, bg, border } = SEVERITY_CONFIG[item.severity]

  return (
    <div
      className="rounded-md px-3 py-2.5 mb-1.5"
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      <div className="flex items-start gap-2">
        <Icon size={13} style={{ color, flexShrink: 0, marginTop: 1 }} />
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-medium leading-snug" style={{ color: TEXT }}>
            {item.title}
          </p>
          <p className="text-[11px] leading-snug mt-0.5" style={{ color: TEXT_DIM }}>
            {item.detail}
          </p>
          {item.action && (
            <button
              type="button"
              onClick={() => onNavigate(item.action!.tab)}
              className="flex items-center gap-0.5 mt-1.5 text-[11px] font-medium transition-opacity hover:opacity-70"
              style={{ color }}
            >
              {item.action.label}
              <ChevronRight size={10} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Summary badge (for StatusBar / compact display) ─────────────────────────

export function DiagnosticsBadge({ diagnostics }: { diagnostics: DiagnosticsResult }) {
  const { TEXT_DIM } = usePrismTheme()
  if (diagnostics.errors === 0 && diagnostics.warnings === 0) return null

  return (
    <div className="flex items-center gap-2">
      {diagnostics.errors > 0 && (
        <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: '#EF4444' }}>
          <AlertCircle size={11} />
          {diagnostics.errors}
        </span>
      )}
      {diagnostics.warnings > 0 && (
        <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: '#F59E0B' }}>
          <AlertTriangle size={11} />
          {diagnostics.warnings}
        </span>
      )}
      {diagnostics.errors === 0 && diagnostics.warnings === 0 && diagnostics.infos > 0 && (
        <span className="flex items-center gap-1 text-[11px]" style={{ color: TEXT_DIM }}>
          <Info size={11} />
          {diagnostics.infos}
        </span>
      )}
    </div>
  )
}

// ─── Full panel ───────────────────────────────────────────────────────────────

interface DiagnosticsPanelProps {
  diagnostics: DiagnosticsResult
  /** When provided, only show diagnostics for this phase */
  filterPhase?: CanonicalSIFTab
  /** Max items to show (default: all) */
  limit?: number
}

export function DiagnosticsPanel({ diagnostics, filterPhase, limit }: DiagnosticsPanelProps) {
  const { TEXT_DIM, TEAL } = usePrismTheme()
  const setTab = useAppStore(s => s.setTab)

  const visible = filterPhase
    ? diagnostics.items.filter(d => d.phase === filterPhase)
    : diagnostics.items

  const shown = limit ? visible.slice(0, limit) : visible
  const overflow = visible.length - shown.length

  if (shown.length === 0) {
    return (
      <p className="text-[11px] px-1 py-2" style={{ color: TEXT_DIM }}>
        Aucun diagnostic pour cette phase.
      </p>
    )
  }

  return (
    <div>
      {shown.map(item => (
        <DiagnosticRow
          key={item.id}
          item={item}
          onNavigate={(tab) => setTab(tab)}
        />
      ))}
      {overflow > 0 && (
        <p className="text-[11px] px-1 mt-1" style={{ color: TEAL }}>
          + {overflow} autre{overflow > 1 ? 's' : ''}…
        </p>
      )}
    </div>
  )
}
