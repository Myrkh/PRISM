import { ArrowRight, CheckCircle2, AlertTriangle, FileText } from 'lucide-react'
import type { SIF } from '@/core/types'
import type { ComplianceResult } from '@/components/sif/complianceCalc'
import type { OverviewMetrics } from '@/components/sif/overviewMetrics'
import type { SIFTab } from '@/store/types'
import {
  InspectorActionButton,
  InspectorBlock,
  InspectorSurface,
  RightPanelBody,
  RightPanelShell,
} from '@/components/layout/RightPanelShell'
import { semantic } from '@/styles/tokens'
import { usePrismTheme } from '@/styles/usePrismTheme'

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
  const { PANEL_BG, TEAL, TEAL_DIM, TEXT, TEXT_DIM } = usePrismTheme()
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
      <RightPanelBody compact>
        <div className="space-y-3">
          <InspectorBlock
            title="Ready"
            hint="Lecture du contexte avant le passage vers l’architecture."
          >
            <div className="space-y-2">
              {[
                { label: 'Readiness', value: `${readiness}%`, tone: readinessColor },
                { label: 'Trace HAZOP', value: `${overviewMetrics.tracePct}%`, tone: overviewMetrics.tracePct === 100 ? semantic.success : TEXT },
                { label: 'Metadata', value: `${Math.round(compliance.metadataCompletion * 100)}%`, tone: compliance.metadataCompletion >= 0.85 ? semantic.success : TEXT },
                { label: 'Signataires', value: `${overviewMetrics.approvalFilledCount}/3`, tone: overviewMetrics.approvalFilledCount === 3 ? semantic.success : TEXT },
              ].map(item => (
                <InspectorSurface key={item.label} className="flex items-center justify-between gap-3 rounded-lg px-2.5 py-2">
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: TEXT_DIM }}>{item.label}</p>
                  <p className="text-sm font-semibold font-mono" style={{ color: item.tone }}>{item.value}</p>
                </InspectorSurface>
              ))}
            </div>
          </InspectorBlock>

          <InspectorBlock title="Blockers">
            <p className="text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
              {missingItems.length > 0
                ? `${missingItems.length} élément${missingItems.length > 1 ? 's restent' : ' reste'} à documenter avant une lecture propre du contexte.`
                : 'Contexte, traçabilité et signataires sont alignés pour la suite.'}
            </p>

            <div className="mt-3 space-y-2">
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
                  <span style={{ color: semantic.success }}>Contexte et traçabilité complets</span>
                </InspectorSurface>
              )}
            </div>
          </InspectorBlock>

          <InspectorBlock title="CTA">
            <p className="text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
              {missingItems.length > 0
                ? 'Le contexte doit d’abord fermer les manques documentaires avant le passage architecture.'
                : 'Le contexte est suffisamment propre pour poursuivre la construction de l’architecture SIF.'}
            </p>

            <InspectorActionButton
              onClick={missingItems.length > 0 ? onOpenEditSheet : () => onSelectTab('architecture')}
              color={TEAL_DIM}
              background={`${TEAL}08`}
              borderColor={`${TEAL}35`}
              className="mt-3"
            >
              <span>{missingItems.length > 0 ? 'Compléter le contexte' : 'Continuer vers Architecture'}</span>
              <ArrowRight size={12} />
            </InspectorActionButton>
          </InspectorBlock>
        </div>
      </RightPanelBody>
    </RightPanelShell>
  )
}
