import { useMemo } from 'react'
import { ArrowRight, FileText, ShieldCheck, Sparkles } from 'lucide-react'
import type { SIF, SIFCalcResult } from '@/core/types'
import type { SIFTab } from '@/store/types'
import type { ComplianceResult } from '@/components/sif/complianceCalc'
import {
  InspectorActionButton,
  InspectorHero,
  InspectorReferenceRow,
  InspectorSection,
  InspectorStatusBadge,
  InspectorSurface,
  RightPanelSection,
  RightPanelShell,
} from '@/components/layout/RightPanelShell'
import { SILBadge } from '@/components/shared/SILBadge'
import { formatPFD, formatRRF } from '@/core/math/pfdCalc'
import { getOverviewMetrics } from '@/components/sif/overviewMetrics'
import { getOverviewOperationalHealthMeta, getOverviewPanelCta } from '@/components/sif/overviewUi'
import { semantic } from '@/styles/tokens'
import { usePrismTheme } from '@/styles/usePrismTheme'

interface Props {
  sif: SIF
  result: SIFCalcResult
  compliance: ComplianceResult
  onSelectTab: (tab: SIFTab) => void
}

export function OverviewRightPanel({ sif, result, compliance, onSelectTab }: Props) {
  const { BORDER, CARD_BG, PAGE_BG, PANEL_BG, SHADOW_SOFT, TEAL, TEAL_DIM, TEXT, TEXT_DIM } = usePrismTheme()
  const metrics = useMemo(() => getOverviewMetrics(sif, result, compliance), [compliance, result, sif])
  const health = getOverviewOperationalHealthMeta(TEXT_DIM)[metrics.operationalHealth]

  return (
    <RightPanelShell contentBg={PANEL_BG} persistKey="overview">
      {/* Always-visible SIF reference */}
      <div className="px-3 py-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <InspectorSurface background={PAGE_BG} borderColor={BORDER}>
          <div className="flex items-start gap-2">
            <ShieldCheck size={14} style={{ color: TEAL, flexShrink: 0, marginTop: 2 }} />
            <div>
              <p className="text-xs font-semibold" style={{ color: TEAL }}>Current SIF</p>
              <p className="text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
                {sif.sifNumber} · {sif.title || 'Untitled SIF'}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-lg border px-2.5 py-2" style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_SOFT }}>
            <div>
              <p className="text-[9px] uppercase tracking-wider" style={{ color: TEXT_DIM }}>Result</p>
              <p className="text-sm font-bold" style={{ color: result.meetsTarget ? semantic.success : semantic.error }}>
                {result.meetsTarget ? 'On target' : 'Below target'}
              </p>
            </div>
            <SILBadge sil={result.SIL} size="sm" />
          </div>
        </InspectorSurface>
      </div>

      <RightPanelSection id="snapshot" label="Snapshot" Icon={ShieldCheck}>
        <div className="space-y-3">
          <InspectorHero
                title="Operational confidence"
                description="Vue condensée de la tenue calcul, exploitation et gouvernance de la SIF."
                aside={
                  <InspectorStatusBadge
                    label={health.label}
                    color={health.color}
                    background={health.bg}
                    borderColor={health.border}
                    icon={<health.Icon size={11} />}
                  />
                }
              >
                <p className="text-2xl font-black font-mono" style={{ color: health.color }}>
                  {metrics.recentCampaigns.length || sif.operationalEvents.length ? `${metrics.operationalScore}/100` : '—'}
                </p>
              </InspectorHero>

              <InspectorSection title="Lecture">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Target SIL', value: `SIL ${sif.targetSIL}`, tone: TEAL_DIM },
                    { label: 'Achieved', value: `SIL ${result.SIL}`, tone: result.meetsTarget ? semantic.success : semantic.error },
                    { label: 'PFDavg', value: formatPFD(result.PFD_avg), tone: TEXT },
                    { label: 'RRF', value: formatRRF(result.RRF), tone: TEXT },
                    { label: 'Next proof test', value: metrics.nextDue ? metrics.nextDue.toLocaleDateString() : 'Not scheduled', tone: metrics.isOverdue ? semantic.error : TEXT },
                    { label: 'Traceability', value: `${metrics.tracePct}%`, tone: metrics.tracePct === 100 ? semantic.success : TEAL_DIM },
                  ].map(item => (
                    <InspectorSurface key={item.label} className="rounded-lg px-2.5 py-2" background={CARD_BG} borderColor={BORDER}>
                      <p className="mb-1 text-[9px] uppercase tracking-wider" style={{ color: TEXT_DIM }}>{item.label}</p>
                      <p className="text-sm font-bold font-mono" style={{ color: item.tone }}>{item.value}</p>
                    </InspectorSurface>
                  ))}
                </div>
              </InspectorSection>

              <InspectorSection title="Governance snapshot">
                {[
                  { label: 'Metadata ready', value: `${metrics.metadataPct}%`, detail: `${compliance.missingMetadata.length} field${compliance.missingMetadata.length > 1 ? 's' : ''} still missing` },
                  { label: 'Evidence package', value: `${metrics.evidenceCompleteCount}/${metrics.evidenceTotalCount}`, detail: 'Completed evidence items' },
                  { label: 'Assumptions reviewed', value: `${metrics.reviewedAssumptions}/${compliance.assumptions.length}`, detail: `${metrics.pendingAssumptions} pending review` },
                  { label: 'Approval chain', value: `${metrics.approvalFilledCount}/3`, detail: 'Made / Verified / Approved' },
                ].map(item => (
                  <InspectorSurface key={item.label} className="mb-2 flex items-start justify-between gap-3 rounded-lg px-2.5 py-2" background={CARD_BG} borderColor={BORDER}>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: TEXT }}>{item.label}</p>
                      <p className="text-[11px]" style={{ color: TEXT_DIM }}>{item.detail}</p>
                    </div>
                    <span className="text-sm font-bold font-mono" style={{ color: TEAL_DIM }}>{item.value}</span>
                  </InspectorSurface>
                ))}
              </InspectorSection>
        </div>
      </RightPanelSection>

      <RightPanelSection id="actions" label="Actions" Icon={Sparkles}>
        {metrics.actions.map((action, index) => (
          <InspectorSurface key={action.id} className="mb-2 space-y-3" background={PAGE_BG} borderColor={BORDER}>
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[11px] font-bold" style={{ borderColor: BORDER, background: CARD_BG, color: TEAL_DIM }}>
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold" style={{ color: TEXT }}>{action.title}</p>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>{action.hint}</p>
              </div>
            </div>

            <InspectorActionButton
              onClick={() => onSelectTab(action.tab)}
              color={TEAL_DIM}
              background={`${TEAL}12`}
              borderColor={`${TEAL}55`}
              className="text-xs"
            >
              <span>{getOverviewPanelCta(action.tab)}</span>
              <ArrowRight size={12} />
            </InspectorActionButton>
          </InspectorSurface>
        ))}
      </RightPanelSection>

      <RightPanelSection id="context" label="Contexte" Icon={FileText}>
        <div className="space-y-3">
          <InspectorSection title="Identification">
            {[
              ['P&ID', sif.pid],
              ['Location', sif.location],
              ['Process tag', sif.processTag],
              ['Hazardous event', sif.hazardousEvent],
              ['Demand rate', sif.demandRate ? `${sif.demandRate} yr⁻¹` : '—'],
              ['Required RRF', sif.rrfRequired ? String(sif.rrfRequired) : '—'],
            ].map(([label, value]) => (
              <InspectorReferenceRow key={String(label)} label={String(label)} value={String(value || '—')} />
            ))}
          </InspectorSection>

          <InspectorSection title="Accountability">
            {[
              ['Made by', sif.madeBy],
              ['Verified by', sif.verifiedBy],
              ['Approved by', sif.approvedBy],
              ['Scenario ID', sif.hazopTrace?.scenarioId],
              ['HAZOP node', sif.hazopTrace?.hazopNode],
              ['LOPA ref.', sif.hazopTrace?.lopaRef],
            ].map(([label, value]) => (
              <InspectorReferenceRow key={String(label)} label={String(label)} value={String(value || '—')} />
            ))}
          </InspectorSection>
        </div>
      </RightPanelSection>
    </RightPanelShell>
  )
}
