import { ArrowRight, ShieldCheck } from 'lucide-react'
import type { SIF, SIFCalcResult } from '@/core/types'
import type { ComplianceResult } from '@/components/sif/complianceCalc'
import { getOverviewMetrics } from '@/components/sif/overviewMetrics'
import { getOverviewPanelCta, OVERVIEW_OPERATIONAL_HEALTH_META } from '@/components/sif/overviewUi'
import type { SIFTab } from '@/store/types'
import { RightPanelShell } from '@/components/layout/RightPanelShell'
import { BORDER, CARD_BG, PAGE_BG, PANEL_BG, TEAL, TEAL_DIM, TEXT, TEXT_DIM, semantic } from '@/styles/tokens'

interface Props {
  sif: SIF
  result: SIFCalcResult
  compliance: ComplianceResult
  onSelectTab: (tab: SIFTab) => void
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
      {children}
    </p>
  )
}

export function CockpitRightPanel({ sif, result, compliance, onSelectTab }: Props) {
  const metrics = getOverviewMetrics(sif, result, compliance)
  const health = OVERVIEW_OPERATIONAL_HEALTH_META[metrics.operationalHealth]
  const readiness = Math.round(((compliance.metadataCompletion * 0.35) + ((compliance.passedChecks / Math.max(compliance.totalChecks, 1)) * 0.4) + ((metrics.tracePct / 100) * 0.25)) * 100)
  const blockers = metrics.actions.filter(action => action.id !== 'stable-overview').length

  return (
    <RightPanelShell
      items={[{ id: 'inspector', label: 'Inspecteur', Icon: ShieldCheck }]}
      active="inspector"
      onSelect={() => {}}
      contentBg={PANEL_BG}
    >
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3" style={{ scrollbarGutter: 'stable' }}>
        <div className="rounded-xl border p-3 space-y-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
          <div className="flex items-center justify-between gap-3">
            <SectionTitle>Inspecteur</SectionTitle>
            <span
              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold"
              style={{ color: health.color, background: health.bg, borderColor: health.border }}
            >
              <health.Icon size={11} />
              {health.label}
            </span>
          </div>

          <div className="space-y-2">
            {[
              { label: 'Phase', value: 'Cockpit', tone: TEXT },
              { label: 'Ready', value: `${readiness}%`, tone: TEAL_DIM },
              { label: 'Blockers', value: String(blockers), tone: blockers === 0 ? semantic.success : semantic.warning },
              { label: 'Trace', value: `${metrics.tracePct}%`, tone: metrics.tracePct === 100 ? semantic.success : TEXT },
              { label: 'Next due', value: metrics.nextDue ? metrics.nextDue.toLocaleDateString() : 'Non planifie', tone: metrics.isOverdue ? semantic.error : TEXT },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between gap-3 rounded-lg border px-2.5 py-2" style={{ borderColor: BORDER, background: CARD_BG }}>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: TEXT_DIM }}>{item.label}</p>
                <p className="text-sm font-semibold font-mono" style={{ color: item.tone }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: BORDER, background: PAGE_BG }}>
          <SectionTitle>Blockers</SectionTitle>
          {metrics.actions.slice(0, 3).map((action, index) => (
            <button
              key={action.id}
              type="button"
              onClick={() => onSelectTab(action.tab)}
              className="w-full rounded-lg border px-3 py-2.5 text-left transition-colors"
              style={{ borderColor: BORDER, background: CARD_BG }}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-[10px] font-bold" style={{ borderColor: BORDER, background: PAGE_BG, color: TEAL_DIM }}>
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold" style={{ color: TEXT }}>{action.title}</p>
                  <p className="mt-1 text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>{action.hint}</p>
                  <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: TEAL }}>
                    {getOverviewPanelCta(action.tab)}
                    <ArrowRight size={12} />
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </RightPanelShell>
  )
}
