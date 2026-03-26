import { AlertTriangle, ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react'
import type { SIF } from '@/core/types'
import type { ComplianceResult } from '@/components/sif/complianceCalc'
import type { OverviewMetrics } from '@/components/sif/overviewMetrics'
import type { SIFTab } from '@/store/types'
import {
  InspectorActionButton,
  InspectorSurface,
  RightPanelSection,
  RightPanelShell,
} from '@/components/layout/RightPanelShell'
import { localizeComplianceMetadataLabel } from '@/components/sif/complianceUi'
import { getSifComplianceStrings } from '@/i18n/sifCompliance'
import { getSifContextStrings } from '@/i18n/sifContext'
import { useLocaleStrings } from '@/i18n/useLocale'
import { BORDER, semantic } from '@/styles/tokens'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { useSIFDiagnostics } from '@/core/diagnostics'
import { DiagnosticsPanel } from '@/components/sif/DiagnosticsPanel'

interface Props {
  sif: SIF
  compliance: ComplianceResult
  overviewMetrics: OverviewMetrics
  onOpenEditSheet: () => void
  onSelectTab: (tab: SIFTab) => void
}

export function ContextRightPanel({
  sif,
  compliance,
  overviewMetrics,
  onOpenEditSheet,
  onSelectTab,
}: Props) {
  const strings = useLocaleStrings(getSifContextStrings)
  const complianceStrings = useLocaleStrings(getSifComplianceStrings)
  const { PANEL_BG, TEAL, TEAL_DIM, TEXT, TEXT_DIM } = usePrismTheme()
  const diagnostics = useSIFDiagnostics(sif)
  const readiness = Math.round(((compliance.metadataCompletion * 100) + overviewMetrics.tracePct) / 2)
  const readinessColor = readiness >= 85 ? semantic.success : readiness >= 50 ? semantic.warning : semantic.error

  const missingItems = [
    ...compliance.missingMetadata.map(label => ({
      key: `meta-${label}`,
      label: localizeComplianceMetadataLabel(complianceStrings, label),
    })),
    ...(overviewMetrics.tracePct < 100
      ? [
          { key: 'trace-scenario', label: strings.rightPanel.missing.items.hazopScenarioLink },
          { key: 'trace-ipl', label: strings.rightPanel.missing.items.independentIpls },
          { key: 'trace-facilitator', label: strings.rightPanel.missing.items.hazopFacilitatorDate },
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
    <RightPanelShell contentBg={PANEL_BG} persistKey="context">
      <RightPanelSection id="etat" label={strings.rightPanel.sections.status} Icon={ShieldCheck}>
        <p className="mb-3 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
          {strings.rightPanel.intro}
        </p>
        <div className="space-y-2">
          {[
            { label: strings.rightPanel.metrics.readiness, value: `${readiness}%`, tone: readinessColor },
            { label: strings.rightPanel.metrics.hazopTrace, value: `${overviewMetrics.tracePct}%`, tone: overviewMetrics.tracePct === 100 ? semantic.success : TEXT },
            { label: strings.rightPanel.metrics.metadata, value: `${Math.round(compliance.metadataCompletion * 100)}%`, tone: compliance.metadataCompletion >= 0.85 ? semantic.success : TEXT },
            { label: strings.rightPanel.metrics.signatories, value: `${overviewMetrics.approvalFilledCount}/3`, tone: overviewMetrics.approvalFilledCount === 3 ? semantic.success : TEXT },
          ].map(item => (
            <InspectorSurface key={item.label} className="flex items-center justify-between gap-3 rounded-lg px-2.5 py-2">
              <p className="text-[10px] uppercase tracking-wider" style={{ color: TEXT_DIM }}>{item.label}</p>
              <p className="text-sm font-semibold font-mono" style={{ color: item.tone }}>{item.value}</p>
            </InspectorSurface>
          ))}
        </div>
        <div className="mt-3">
          <DiagnosticsPanel diagnostics={diagnostics} filterPhase="context" />
        </div>
      </RightPanelSection>

      <RightPanelSection id="actions" label={strings.rightPanel.sections.actions} Icon={Sparkles}>
        <p className="mb-3 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
          {missingItems.length > 0
            ? strings.rightPanel.missing.summary(missingItems.length)
            : strings.rightPanel.missing.aligned}
        </p>
        <div className="space-y-2">
          {missingItems.length > 0 ? missingItems.slice(0, 6).map(item => (
            <InspectorSurface
              key={item.key}
              className="flex items-center gap-2 text-[11px]"
              borderColor={`${semantic.warning}30`}
              background={`${semantic.warning}08`}
            >
              <AlertTriangle size={10} style={{ color: semantic.warning, flexShrink: 0 }} />
              {item.label}
            </InspectorSurface>
          )) : (
            <InspectorSurface
              className="flex items-center gap-2 py-2.5 text-[11px]"
              borderColor={`${semantic.success}30`}
              background={`${semantic.success}08`}
            >
              <CheckCircle2 size={11} style={{ color: semantic.success }} />
              <span style={{ color: semantic.success }}>{strings.rightPanel.missing.complete}</span>
            </InspectorSurface>
          )}
        </div>
        <div className="my-3 h-px" style={{ background: BORDER }} />
        <p className="mb-3 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
          {missingItems.length > 0
            ? strings.rightPanel.conclusions.withMissing
            : strings.rightPanel.conclusions.complete}
        </p>
        <InspectorActionButton
          onClick={missingItems.length > 0 ? onOpenEditSheet : () => onSelectTab('architecture')}
          color={TEAL_DIM}
          background={`${TEAL}08`}
          borderColor={`${TEAL}35`}
        >
          <span>{missingItems.length > 0 ? strings.rightPanel.ctas.completeContext : strings.rightPanel.ctas.continueArchitecture}</span>
          <ArrowRight size={12} />
        </InspectorActionButton>
      </RightPanelSection>
    </RightPanelShell>
  )
}
