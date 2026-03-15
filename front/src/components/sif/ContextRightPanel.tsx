import { ArrowRight, CheckCircle2, AlertTriangle, FileText } from 'lucide-react'
import type { SIF } from '@/core/types'
import type { ComplianceResult } from '@/components/sif/complianceCalc'
import type { OverviewMetrics } from '@/components/sif/overviewMetrics'
import type { SIFTab } from '@/store/types'
import { RightPanelShell } from '@/components/layout/RightPanelShell'
import { semantic } from '@/styles/tokens'
import { usePrismTheme } from '@/styles/usePrismTheme'

interface Props {
  sif: SIF
  compliance: ComplianceResult
  overviewMetrics: OverviewMetrics
  onOpenEditSheet: () => void
  onSelectTab: (tab: SIFTab) => void
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: `${color}15` }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }}
      />
    </div>
  )
}

function MetricRow({ label, value, color, suffix }: { label: string; value: string | number; color: string; suffix?: string }) {
  const { TEXT_DIM } = usePrismTheme()
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[10px] uppercase tracking-wider" style={{ color: TEXT_DIM }}>{label}</span>
      <span className="text-[12px] font-semibold font-mono" style={{ color }}>
        {value}{suffix}
      </span>
    </div>
  )
}

export function ContextRightPanel({
  sif,
  compliance,
  overviewMetrics,
  onOpenEditSheet,
  onSelectTab,
}: Props) {
  const { BORDER, PAGE_BG, PANEL_BG, TEAL, TEAL_DIM, TEXT, TEXT_DIM } = usePrismTheme()
  const readiness = Math.round(((compliance.metadataCompletion * 100) + overviewMetrics.tracePct) / 2)
  const readinessColor = readiness >= 85 ? semantic.success : readiness >= 50 ? semantic.warning : semantic.error

  const missingItems = [
    ...compliance.missingMetadata.map(label => ({ key: `meta-${label}`, label })),
    ...(overviewMetrics.tracePct < 100
      ? [
          { key: 'trace-scenario', label: 'Lien scénario HAZOP' },
          { key: 'trace-ipl', label: 'Liste IPLs indépendantes' },
          { key: 'trace-facilitator', label: 'Facilitateur / Date HAZOP' },
        ].filter(item =>
          item.key === 'trace-scenario'
            ? !(sif.hazopTrace?.scenarioId && sif.hazopTrace?.hazopNode)
            : item.key === 'trace-ipl'
              ? !sif.hazopTrace?.iplList
              : !(sif.hazopTrace?.hazopFacilitator && sif.hazopTrace?.hazopDate),
        )
      : []),
  ]

  return (
    <RightPanelShell
      items={[{ id: 'context', label: 'Contexte', Icon: FileText }]}
      active="context"
      onSelect={() => {}}
      contentBg={PANEL_BG}
    >
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3" style={{ scrollbarGutter: 'stable' }}>

        {/* Readiness gauge */}
        <div className="rounded-xl border p-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Complétude contexte</span>
            <span className="text-[14px] font-bold font-mono" style={{ color: readinessColor }}>{readiness}%</span>
          </div>
          <ProgressBar value={readiness} color={readinessColor} />
        </div>

        {/* Metrics */}
        <div className="rounded-xl border p-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
          <MetricRow label="Traçabilité HAZOP" value={overviewMetrics.tracePct} color={overviewMetrics.tracePct === 100 ? semantic.success : TEXT} suffix="%" />
          <MetricRow label="Métadonnées" value={Math.round(compliance.metadataCompletion * 100)} color={compliance.metadataCompletion >= 0.85 ? semantic.success : TEXT} suffix="%" />
          <MetricRow label="Signataires" value={`${overviewMetrics.approvalFilledCount}/3`} color={overviewMetrics.approvalFilledCount === 3 ? semantic.success : TEXT} />
        </div>

        {/* Blockers */}
        <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: BORDER, background: PAGE_BG }}>
          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
            {missingItems.length > 0 ? `${missingItems.length} élément${missingItems.length > 1 ? 's' : ''} manquant${missingItems.length > 1 ? 's' : ''}` : 'Contexte complet'}
          </span>
          {missingItems.length > 0 ? missingItems.slice(0, 6).map(item => (
            <div key={item.key}
              className="flex items-center gap-2 rounded-lg border px-2.5 py-2 text-[11px]"
              style={{ borderColor: `${semantic.warning}30`, background: `${semantic.warning}08`, color: TEXT }}>
              <AlertTriangle size={10} style={{ color: semantic.warning, flexShrink: 0 }} />
              {item.label}
            </div>
          )) : (
            <div className="flex items-center gap-2 rounded-lg border px-2.5 py-2.5 text-[11px]"
              style={{ borderColor: `${semantic.success}30`, background: `${semantic.success}08`, color: semantic.success }}>
              <CheckCircle2 size={11} />
              Contexte et traçabilité complets
            </div>
          )}
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={missingItems.length > 0 ? onOpenEditSheet : () => onSelectTab('architecture')}
          className="w-full flex items-center justify-between rounded-xl border px-3 py-2.5 text-[11px] font-semibold transition-all"
          style={{ borderColor: `${TEAL}35`, background: `${TEAL}08`, color: TEAL_DIM }}
          onMouseEnter={e => { e.currentTarget.style.background = `${TEAL}15`; e.currentTarget.style.borderColor = `${TEAL}55` }}
          onMouseLeave={e => { e.currentTarget.style.background = `${TEAL}08`; e.currentTarget.style.borderColor = `${TEAL}35` }}
        >
          {missingItems.length > 0 ? 'Compléter le contexte' : 'Continuer vers Architecture'}
          <ArrowRight size={12} />
        </button>
      </div>
    </RightPanelShell>
  )
}
