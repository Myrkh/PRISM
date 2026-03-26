import { Lock, Package, ShieldCheck, Users } from 'lucide-react'
import { getSifWorkflowStrings } from '@/i18n/sifWorkflow'
import { useLocaleStrings } from '@/i18n/useLocale'
import type { SIF, SIFCalcResult } from '@/core/types'
import type { ComplianceResult } from '@/components/sif/complianceCalc'
import type { OverviewMetrics } from '@/components/sif/overviewMetrics'
import {
  InspectorReferenceRow,
  InspectorStatusBadge,
  InspectorSurface,
  RightPanelSection,
  RightPanelShell,
} from '@/components/layout/RightPanelShell'
import { semantic } from '@/styles/tokens'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { useSIFDiagnostics } from '@/core/diagnostics'
import { DiagnosticsPanel } from '@/components/sif/DiagnosticsPanel'

interface Props {
  sif: SIF
  result: SIFCalcResult
  compliance: ComplianceResult
  overviewMetrics: OverviewMetrics
}
type ItemStatus = 'complete' | 'review' | 'missing'

function statusMeta(status: ItemStatus, complete: string, review: string, missing: string) {
  if (status === 'complete') {
    return {
      label: complete,
      color: semantic.success,
      background: `${semantic.success}10`,
      border: `${semantic.success}32`,
    }
  }

  if (status === 'review') {
    return {
      label: review,
      color: semantic.warning,
      background: `${semantic.warning}10`,
      border: `${semantic.warning}32`,
    }
  }

  return {
    label: missing,
    color: semantic.error,
    background: `${semantic.error}10`,
    border: `${semantic.error}32`,
  }
}

function ChecklistRow({
  label,
  value,
  status,
  completeLabel,
  reviewLabel,
  missingLabel,
}: {
  label: string
  value: string
  status: ItemStatus
  completeLabel: string
  reviewLabel: string
  missingLabel: string
}) {
  const { TEXT, TEXT_DIM } = usePrismTheme()
  const meta = statusMeta(status, completeLabel, reviewLabel, missingLabel)
  return (
    <InspectorSurface>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>{label}</p>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: TEXT }}>{value}</p>
        </div>
        <InspectorStatusBadge
          label={meta.label}
          color={meta.color}
          background={meta.background}
          borderColor={meta.border}
        />
      </div>
    </InspectorSurface>
  )
}

export function CockpitRightPanel({ sif, result, compliance, overviewMetrics }: Props) {
  const strings = useLocaleStrings(getSifWorkflowStrings)
  const { BORDER, PANEL_BG, SURFACE, TEAL, TEAL_DIM, TEXT, TEXT_DIM } = usePrismTheme()
  const diagnostics = useSIFDiagnostics(sif)
  const evidenceById = new Map(compliance.evidenceItems.map(item => [item.id, item]))
  const proofProcedureItem = evidenceById.get('proof-procedure')
  const proofEvidenceItem = evidenceById.get('proof-evidence')
  const reportPackageItem = evidenceById.get('report-package')
  const readiness = Math.round((
    overviewMetrics.tracePct +
    ((overviewMetrics.evidenceCompleteCount / Math.max(1, overviewMetrics.evidenceTotalCount)) * 100) +
    ((overviewMetrics.approvalFilledCount / 3) * 100)
  ) / 3)
  const readinessColor = readiness >= 85 ? semantic.success : readiness >= 50 ? semantic.warning : semantic.error
  const formatDate = (value: string | Date) => new Date(value).toLocaleDateString(strings.localeTag)

  const governanceSummary = [
    { label: strings.cockpitRightPanel.governance.author, value: sif.madeBy || strings.cockpitRightPanel.governance.notProvided, status: sif.madeBy ? 'complete' : 'missing' as ItemStatus },
    { label: strings.cockpitRightPanel.governance.verification, value: sif.verifiedBy || strings.cockpitRightPanel.governance.notProvided, status: sif.verifiedBy ? 'complete' : 'missing' as ItemStatus },
    { label: strings.cockpitRightPanel.governance.approval, value: sif.approvedBy || strings.cockpitRightPanel.governance.notProvided, status: sif.approvedBy ? 'complete' : 'missing' as ItemStatus },
  ]

  return (
    <RightPanelShell contentBg={PANEL_BG} persistKey="cockpit">
      <RightPanelSection id="etat" label={strings.cockpitRightPanel.sections.state} Icon={ShieldCheck}>
        <p className="mb-3 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
          {strings.cockpitRightPanel.intros.state}
        </p>
        <div className="space-y-2">
          {[
            { label: strings.cockpitRightPanel.stateCards.readiness, value: `${readiness}%`, tone: readinessColor },
            { label: strings.cockpitRightPanel.stateCards.calculation, value: result.meetsTarget ? strings.cockpitRightPanel.stateCards.met : strings.cockpitRightPanel.stateCards.belowTarget, tone: result.meetsTarget ? semantic.success : semantic.error },
            { label: strings.cockpitRightPanel.stateCards.trace, value: `${overviewMetrics.tracePct}%`, tone: overviewMetrics.tracePct === 100 ? semantic.success : TEXT },
            { label: strings.cockpitRightPanel.stateCards.evidence, value: `${overviewMetrics.evidenceCompleteCount}/${overviewMetrics.evidenceTotalCount}`, tone: TEAL_DIM },
            { label: strings.cockpitRightPanel.stateCards.approvals, value: `${overviewMetrics.approvalFilledCount}/3`, tone: overviewMetrics.approvalFilledCount === 3 ? semantic.success : TEXT },
            { label: strings.cockpitRightPanel.stateCards.assumptions, value: String(overviewMetrics.pendingAssumptions), tone: overviewMetrics.pendingAssumptions === 0 ? semantic.success : semantic.warning },
          ].map(item => (
            <InspectorSurface key={item.label} className="flex items-center justify-between gap-3 rounded-lg px-2.5 py-2">
              <p className="text-[10px] uppercase tracking-wider" style={{ color: TEXT_DIM }}>{item.label}</p>
              <p className="text-sm font-semibold font-mono" style={{ color: item.tone }}>{item.value}</p>
            </InspectorSurface>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]" style={{ color: TEXT_DIM }}>
          <span style={{ color: TEXT }}>{sif.sifNumber}</span>
          <span>·</span>
          <span>{result.meetsTarget ? strings.cockpitRightPanel.stateCards.coherentBase : strings.cockpitRightPanel.stateCards.reworkBase}</span>
          <InspectorStatusBadge
            label={sif.revisionLockedAt ? strings.cockpitRightPanel.stateCards.revisionPublished(sif.revision) : strings.cockpitRightPanel.stateCards.revisionWorking(sif.revision)}
            color={sif.revisionLockedAt ? semantic.success : TEAL_DIM}
            background={sif.revisionLockedAt ? `${semantic.success}10` : `${TEAL}10`}
            borderColor={sif.revisionLockedAt ? `${semantic.success}32` : `${TEAL}35`}
            icon={<Lock size={10} />}
          />
        </div>

        <div className="mt-3">
          <DiagnosticsPanel diagnostics={diagnostics} limit={6} />
        </div>
      </RightPanelSection>

      <RightPanelSection id="gouvernance" label={strings.cockpitRightPanel.sections.governance} Icon={Users}>
        <div className="space-y-2">
          {governanceSummary.map(item => (
            <ChecklistRow
              key={item.label}
              label={item.label}
              value={item.value}
              status={item.status}
              completeLabel={strings.cockpitRightPanel.statuses.complete}
              reviewLabel={strings.cockpitRightPanel.statuses.review}
              missingLabel={strings.cockpitRightPanel.statuses.missing}
            />
          ))}
        </div>
      </RightPanelSection>

      <RightPanelSection id="dossier" label={strings.cockpitRightPanel.sections.dossier} Icon={Package}>
        <div className="space-y-2">
          <ChecklistRow
            label={strings.cockpitRightPanel.dossier.proofProcedure}
            value={proofProcedureItem?.summary || strings.cockpitRightPanel.dossier.procedureUndocumented}
            status={(proofProcedureItem?.status ?? 'missing') as ItemStatus}
            completeLabel={strings.cockpitRightPanel.statuses.complete}
            reviewLabel={strings.cockpitRightPanel.statuses.review}
            missingLabel={strings.cockpitRightPanel.statuses.missing}
          />
          <ChecklistRow
            label={strings.cockpitRightPanel.dossier.campaignsRecorded}
            value={proofEvidenceItem?.summary || strings.cockpitRightPanel.dossier.noCampaign}
            status={(proofEvidenceItem?.status ?? 'missing') as ItemStatus}
            completeLabel={strings.cockpitRightPanel.statuses.complete}
            reviewLabel={strings.cockpitRightPanel.statuses.review}
            missingLabel={strings.cockpitRightPanel.statuses.missing}
          />
          <ChecklistRow
            label={strings.cockpitRightPanel.dossier.reportPackage}
            value={reportPackageItem?.summary || strings.cockpitRightPanel.dossier.toComplete}
            status={(reportPackageItem?.status ?? 'review') as ItemStatus}
            completeLabel={strings.cockpitRightPanel.statuses.complete}
            reviewLabel={strings.cockpitRightPanel.statuses.review}
            missingLabel={strings.cockpitRightPanel.statuses.missing}
          />
        </div>
        <div className="my-3 h-px" style={{ background: BORDER }} />
        <p className="mb-3 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
          {strings.cockpitRightPanel.intros.dossier}
        </p>
        <InspectorSurface>
          <InspectorReferenceRow label={strings.cockpitRightPanel.dossier.references.scenarioId} value={sif.hazopTrace?.scenarioId || strings.cockpitRightPanel.governance.notProvided} />
          <InspectorReferenceRow label={strings.cockpitRightPanel.dossier.references.hazopNode} value={sif.hazopTrace?.hazopNode || strings.cockpitRightPanel.governance.notProvided} />
          <InspectorReferenceRow label={strings.cockpitRightPanel.dossier.references.lopaRef} value={sif.hazopTrace?.lopaRef || strings.cockpitRightPanel.governance.notProvided} />
          <InspectorReferenceRow label={strings.cockpitRightPanel.dossier.references.proofTestRef} value={sif.proofTestProcedure?.ref || strings.cockpitRightPanel.governance.notProvided} />
          <InspectorReferenceRow
            label={strings.cockpitRightPanel.dossier.references.revision}
            value={sif.revisionLockedAt ? strings.cockpitRightPanel.dossier.references.publishedOn(formatDate(sif.revisionLockedAt)) : strings.cockpitRightPanel.dossier.references.workingRevision(sif.revision)}
          />
        </InspectorSurface>
        <p className="mt-3 text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
          {strings.cockpitRightPanel.intros.history}
        </p>
      </RightPanelSection>
    </RightPanelShell>
  )
}
