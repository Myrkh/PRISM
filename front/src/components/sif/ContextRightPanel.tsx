import { ArrowRight, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SIF } from '@/core/types'
import type { ComplianceResult } from '@/components/sif/complianceCalc'
import type { OverviewMetrics } from '@/components/sif/overviewMetrics'
import type { SIFTab } from '@/store/types'
import { RightPanelShell } from '@/components/layout/RightPanelShell'
import { BORDER, CARD_BG, PAGE_BG, PANEL_BG, TEAL_DIM, TEXT, TEXT_DIM, semantic } from '@/styles/tokens'

interface Props {
  sif: SIF
  compliance: ComplianceResult
  overviewMetrics: OverviewMetrics
  onOpenEditSheet: () => void
  onSelectTab: (tab: SIFTab) => void
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
      {children}
    </p>
  )
}

export function ContextRightPanel({
  sif,
  compliance,
  overviewMetrics,
  onOpenEditSheet,
  onSelectTab,
}: Props) {
  const readiness = Math.round((((compliance.metadataCompletion * 100) + overviewMetrics.tracePct) / 2))
  const missingItems = [
    ...compliance.missingMetadata.map(label => ({ key: `meta-${label}`, label })),
    ...(overviewMetrics.tracePct < 100
      ? [
          { key: 'trace-scenario', label: 'Scenario linkage' },
          { key: 'trace-ipl', label: 'Independent IPL list' },
          { key: 'trace-facilitator', label: 'HAZOP facilitator/date' },
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
        <div className="rounded-xl border p-3 space-y-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
          <SectionTitle>Phase</SectionTitle>
          <div className="space-y-2">
            {[
              { label: 'Phase', value: '1 / 4', tone: TEXT },
              { label: 'Ready', value: `${readiness}%`, tone: readiness >= 85 ? semantic.success : TEAL_DIM },
              { label: 'Blockers', value: String(missingItems.length), tone: missingItems.length === 0 ? semantic.success : semantic.warning },
              { label: 'Trace', value: `${overviewMetrics.tracePct}%`, tone: overviewMetrics.tracePct === 100 ? semantic.success : TEXT },
              { label: 'Approvals', value: `${overviewMetrics.approvalFilledCount}/3`, tone: overviewMetrics.approvalFilledCount === 3 ? semantic.success : TEXT },
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
          {missingItems.length > 0 ? missingItems.slice(0, 6).map(item => (
            <div key={item.key} className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: `${semantic.warning}44`, background: `${semantic.warning}10`, color: TEXT }}>
              {item.label}
            </div>
          )) : (
            <div className="rounded-lg border px-3 py-3 text-xs" style={{ borderColor: `${semantic.success}44`, background: `${semantic.success}10`, color: semantic.success }}>
              Contexte et tracabilite complets.
            </div>
          )}
        </div>

        <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: BORDER, background: PAGE_BG }}>
          <SectionTitle>CTA</SectionTitle>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-between"
            onClick={missingItems.length > 0 ? onOpenEditSheet : () => onSelectTab('architecture')}
          >
            {missingItems.length > 0 ? 'Completer contexte' : 'Continuer vers architecture'}
            <ArrowRight size={12} />
          </Button>
        </div>
      </div>
    </RightPanelShell>
  )
}
