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
import { getSifContextStrings } from '@/i18n/sifContext'
import { getSifOverviewStrings } from '@/i18n/sifOverview'
import { getSifOverviewPanelStrings } from '@/i18n/sifOverviewPanel'
import { useLocaleStrings } from '@/i18n/useLocale'
import { semantic } from '@/styles/tokens'
import { usePrismTheme } from '@/styles/usePrismTheme'

interface Props {
  sif: SIF
  result: SIFCalcResult
  compliance: ComplianceResult
  onSelectTab: (tab: SIFTab) => void
}

export function OverviewRightPanel({ sif, result, compliance, onSelectTab }: Props) {
  const overviewStrings = useLocaleStrings(getSifOverviewStrings)
  const panelStrings = useLocaleStrings(getSifOverviewPanelStrings)
  const contextStrings = useLocaleStrings(getSifContextStrings)
  const { BORDER, CARD_BG, PAGE_BG, PANEL_BG, SHADOW_SOFT, TEAL, TEAL_DIM, TEXT, TEXT_DIM } = usePrismTheme()
  const metrics = useMemo(() => getOverviewMetrics(sif, result, compliance), [compliance, result, sif])
  const health = getOverviewOperationalHealthMeta(TEXT_DIM, overviewStrings)[metrics.operationalHealth]

  return (
    <RightPanelShell contentBg={PANEL_BG} persistKey="overview">
      <div className="px-3 py-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <InspectorSurface background={PAGE_BG} borderColor={BORDER}>
          <div className="flex items-start gap-2">
            <ShieldCheck size={14} style={{ color: TEAL, flexShrink: 0, marginTop: 2 }} />
            <div>
              <p className="text-xs font-semibold" style={{ color: TEAL }}>{panelStrings.currentSif}</p>
              <p className="text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
                {sif.sifNumber} · {sif.title || panelStrings.untitledSif}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-lg border px-2.5 py-2" style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_SOFT }}>
            <div>
              <p className="text-[9px] uppercase tracking-wider" style={{ color: TEXT_DIM }}>{panelStrings.result.label}</p>
              <p className="text-sm font-bold" style={{ color: result.meetsTarget ? semantic.success : semantic.error }}>
                {result.meetsTarget ? panelStrings.result.onTarget : panelStrings.result.belowTarget}
              </p>
            </div>
            <SILBadge sil={result.SIL} size="sm" />
          </div>
        </InspectorSurface>
      </div>

      <RightPanelSection id="snapshot" label={panelStrings.sections.snapshot} Icon={ShieldCheck}>
        <div className="space-y-3">
          <InspectorHero
            title={panelStrings.hero.title}
            description={panelStrings.hero.description}
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
              {metrics.recentCampaigns.length || sif.operationalEvents.length ? `${metrics.operationalScore}/100` : panelStrings.rows.notAvailable}
            </p>
          </InspectorHero>

          <InspectorSection title={panelStrings.reading.title}>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: panelStrings.reading.targetSil, value: `SIL ${sif.targetSIL}`, tone: TEAL_DIM },
                { label: panelStrings.reading.achieved, value: `SIL ${result.SIL}`, tone: result.meetsTarget ? semantic.success : semantic.error },
                { label: panelStrings.reading.pfdavg, value: formatPFD(result.PFD_avg), tone: TEXT },
                { label: panelStrings.reading.rrf, value: formatRRF(result.RRF), tone: TEXT },
                { label: panelStrings.reading.nextProofTest, value: metrics.nextDue ? metrics.nextDue.toLocaleDateString(overviewStrings.localeTag) : panelStrings.reading.notScheduled, tone: metrics.isOverdue ? semantic.error : TEXT },
                { label: panelStrings.reading.traceability, value: `${metrics.tracePct}%`, tone: metrics.tracePct === 100 ? semantic.success : TEAL_DIM },
              ].map(item => (
                <InspectorSurface key={item.label} className="rounded-lg px-2.5 py-2" background={CARD_BG} borderColor={BORDER}>
                  <p className="mb-1 text-[9px] uppercase tracking-wider" style={{ color: TEXT_DIM }}>{item.label}</p>
                  <p className="text-sm font-bold font-mono" style={{ color: item.tone }}>{item.value}</p>
                </InspectorSurface>
              ))}
            </div>
          </InspectorSection>

          <InspectorSection title={panelStrings.governance.title}>
            {[
              { label: panelStrings.governance.metadataReady, value: `${metrics.metadataPct}%`, detail: panelStrings.governance.metadataDetail(compliance.missingMetadata.length) },
              { label: panelStrings.governance.evidencePackage, value: `${metrics.evidenceCompleteCount}/${metrics.evidenceTotalCount}`, detail: panelStrings.governance.evidenceDetail },
              { label: panelStrings.governance.assumptionsReviewed, value: `${metrics.reviewedAssumptions}/${compliance.assumptions.length}`, detail: panelStrings.governance.assumptionsDetail(metrics.pendingAssumptions) },
              { label: panelStrings.governance.approvalChain, value: `${metrics.approvalFilledCount}/3`, detail: panelStrings.governance.approvalDetail },
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

      <RightPanelSection id="actions" label={panelStrings.sections.actions} Icon={Sparkles}>
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
              <span>{getOverviewPanelCta(action.tab, overviewStrings)}</span>
              <ArrowRight size={12} />
            </InspectorActionButton>
          </InspectorSurface>
        ))}
      </RightPanelSection>

      <RightPanelSection id="context" label={panelStrings.sections.context} Icon={FileText}>
        <div className="space-y-3">
          <InspectorSection title={panelStrings.contextSections.identification}>
            {[
              [contextStrings.fields.pidZone, sif.pid],
              [contextStrings.fields.location, sif.location],
              [contextStrings.fields.processTag, sif.processTag],
              [contextStrings.fields.hazardousEvent, sif.hazardousEvent],
              [panelStrings.rows.demandRate, sif.demandRate ? `${sif.demandRate} yr⁻¹` : panelStrings.rows.notAvailable],
              [panelStrings.rows.requiredRrf, sif.rrfRequired ? String(sif.rrfRequired) : panelStrings.rows.notAvailable],
            ].map(([label, value]) => (
              <InspectorReferenceRow key={String(label)} label={String(label)} value={String(value || panelStrings.rows.notAvailable)} />
            ))}
          </InspectorSection>

          <InspectorSection title={panelStrings.contextSections.accountability}>
            {[
              [contextStrings.fields.preparedBy, sif.madeBy],
              [contextStrings.fields.verifiedBy, sif.verifiedBy],
              [contextStrings.fields.approvedBy, sif.approvedBy],
              [panelStrings.rows.scenarioId, sif.hazopTrace?.scenarioId],
              [panelStrings.rows.hazopNode, sif.hazopTrace?.hazopNode],
              [panelStrings.rows.lopaRef, sif.hazopTrace?.lopaRef],
            ].map(([label, value]) => (
              <InspectorReferenceRow key={String(label)} label={String(label)} value={String(value || panelStrings.rows.notAvailable)} />
            ))}
          </InspectorSection>
        </div>
      </RightPanelSection>
    </RightPanelShell>
  )
}
