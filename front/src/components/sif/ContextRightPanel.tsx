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
  const { BORDER, TEXT_DIM } = usePrismTheme()
  return (
    <div className="flex items-center justify-between border-b py-2 last:border-b-0" style={{ borderColor: `${BORDER}99` }}>
      <span className="text-[10px] uppercase tracking-wider" style={{ color: TEXT_DIM }}>{label}</span>
      <span className="text-[12px] font-semibold font-mono" style={{ color }}>
        {value}{suffix}
      </span>
    </div>
  )
}

function PanelSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  const { BORDER, SHADOW_SOFT, TEAL, TEXT } = usePrismTheme()
  return (
    <section className="border-b pb-4 last:border-b-0 last:pb-0" style={{ borderColor: `${BORDER}A6` }}>
      <div className="mb-3 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: TEAL, boxShadow: SHADOW_SOFT }} />
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEAL }}>{title}</p>
      </div>
      <div style={{ color: TEXT }}>{children}</div>
    </section>
  )
}

export function ContextRightPanel({
  sif,
  compliance,
  overviewMetrics,
  onOpenEditSheet,
  onSelectTab,
}: Props) {
  const { BORDER, PANEL_BG, TEAL, TEAL_DIM, TEXT, TEXT_DIM } = usePrismTheme()
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
      <div className="flex-1 overflow-y-auto px-4 py-4" style={{ scrollbarGutter: 'stable' }}>
        <section className="border-b pb-4" style={{ borderColor: `${BORDER}A6` }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold" style={{ color: TEXT }}>Contexte défendable</p>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
                Le panneau conserve seulement les repères utiles avant le passage vers l’architecture.
              </p>
            </div>
            <span className="text-[14px] font-bold font-mono" style={{ color: readinessColor }}>{readiness}%</span>
          </div>

          <div className="mt-3">
            <ProgressBar value={readiness} color={readinessColor} />
          </div>
        </section>

        <div className="space-y-4 pt-4">
          <PanelSection title="Lecture">
            <MetricRow label="Traçabilité HAZOP" value={overviewMetrics.tracePct} color={overviewMetrics.tracePct === 100 ? semantic.success : TEXT} suffix="%" />
            <MetricRow label="Métadonnées" value={Math.round(compliance.metadataCompletion * 100)} color={compliance.metadataCompletion >= 0.85 ? semantic.success : TEXT} suffix="%" />
            <MetricRow label="Signataires" value={`${overviewMetrics.approvalFilledCount}/3`} color={overviewMetrics.approvalFilledCount === 3 ? semantic.success : TEXT} />
          </PanelSection>

          <PanelSection title="Écarts">
            <p className="text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
              {missingItems.length > 0
                ? `${missingItems.length} élément${missingItems.length > 1 ? 's restent' : ' reste'} à documenter avant une lecture propre du contexte.`
                : 'Contexte, traçabilité et signataires sont alignés pour la suite.'}
            </p>

            <div className="mt-3 space-y-2">
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
          </PanelSection>

          <PanelSection title="Suite">
            <p className="text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
              {missingItems.length > 0
                ? 'Le contexte doit d’abord fermer les manques documentaires avant le passage architecture.'
                : 'Le contexte est suffisamment propre pour poursuivre la construction de l’architecture SIF.'}
            </p>

            <button
              type="button"
              onClick={missingItems.length > 0 ? onOpenEditSheet : () => onSelectTab('architecture')}
              className="mt-3 flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-[11px] font-semibold transition-all"
              style={{ borderColor: `${TEAL}35`, background: `${TEAL}08`, color: TEAL_DIM }}
              onMouseEnter={e => { e.currentTarget.style.background = `${TEAL}15`; e.currentTarget.style.borderColor = `${TEAL}55` }}
              onMouseLeave={e => { e.currentTarget.style.background = `${TEAL}08`; e.currentTarget.style.borderColor = `${TEAL}35` }}
            >
              {missingItems.length > 0 ? 'Compléter le contexte' : 'Continuer vers Architecture'}
              <ArrowRight size={12} />
            </button>
          </PanelSection>
        </div>
      </div>
    </RightPanelShell>
  )
}
