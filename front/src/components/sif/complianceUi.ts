import type { SifComplianceStrings } from '@/i18n/sifCompliance'
import type { SIF, SIFCalcResult } from '@/core/types'
import type {
  ComplianceAssumptionItem,
  ComplianceEvidenceItem,
  ComplianceItemStatus,
  ComplianceResult,
  ComplianceTechnicalFinding,
} from './complianceCalc'

export function getComplianceOverallStatusKey(
  result: SIFCalcResult,
  compliance: ComplianceResult,
): 'compliant' | 'review' | 'nonCompliant' {
  const openGaps = Math.max(0, compliance.totalChecks - compliance.passedChecks)
  if (!result.meetsTarget) return 'nonCompliant'
  if (openGaps > 0 || compliance.missingMetadata.length > 0) return 'review'
  return 'compliant'
}

export function getCompliancePillLabel(strings: SifComplianceStrings, status: ComplianceItemStatus | 'draft' | 'validated' | 'ok' | 'review') {
  if (status === 'complete' || status === 'ok') return strings.statusPills.ok
  if (status === 'missing') return strings.statusPills.missing
  if (status === 'draft') return strings.statusPills.draft
  if (status === 'validated') return strings.statusPills.validated
  return strings.statusPills.review
}

export function localizeComplianceMetadataLabel(strings: SifComplianceStrings, label: string) {
  switch (label) {
    case 'P&ID':
      return strings.data.metadataLabels.pid
    case 'Location':
      return strings.data.metadataLabels.location
    case 'Process tag':
      return strings.data.metadataLabels.processTag
    case 'Hazardous event':
      return strings.data.metadataLabels.hazardousEvent
    case 'Made by':
      return strings.data.metadataLabels.madeBy
    case 'Verified by':
      return strings.data.metadataLabels.verifiedBy
    case 'Approved by':
      return strings.data.metadataLabels.approvedBy
    default:
      return label
  }
}

export function localizeComplianceAction(strings: SifComplianceStrings, action: { title: string; hint: string; tab: string }) {
  switch (action.title) {
    case 'Increase architectural robustness':
      return {
        title: strings.data.actions.increaseArchitectureTitle,
        hint: strings.data.actions.increaseArchitectureHint,
        tab: action.tab,
      }
    case 'Improve diagnostic coverage':
      return {
        title: strings.data.actions.improveDiagnosticTitle,
        hint: strings.data.actions.improveDiagnosticHint,
        tab: action.tab,
      }
    case 'Complete traceability fields':
      return {
        title: strings.data.actions.completeTraceabilityTitle,
        hint: strings.data.actions.completeTraceabilityHint,
        tab: action.tab,
      }
    case 'Review the assumption register':
      return {
        title: strings.data.actions.reviewAssumptionsTitle,
        hint: strings.data.actions.reviewAssumptionsHint,
        tab: action.tab,
      }
    default:
      return {
        title: strings.data.actions.baselineSolidTitle,
        hint: strings.data.actions.baselineSolidHint,
        tab: action.tab,
      }
  }
}

export function localizeTechnicalFinding(strings: SifComplianceStrings, finding: ComplianceTechnicalFinding) {
  const detail =
    finding.detail === 'The subsystem hardware fault tolerance is below the current architectural rule.'
      ? strings.data.findings.detailHft
      : finding.detail === 'Safe Failure Fraction is below the threshold required by the current architectural route.'
        ? strings.data.findings.detailSff
        : finding.detail === 'Diagnostic coverage is below the minimum currently enforced by the compliance rule set.'
          ? strings.data.findings.detailDc
          : finding.detail

  return {
    ...finding,
    title: finding.title === 'Architecture' ? strings.data.findings.architectureLabel : finding.title,
    subsystemLabel: finding.subsystemLabel === 'Subsystem' ? strings.data.findings.subsystemFallback : finding.subsystemLabel,
    detail,
  }
}

function formatProcedureStatus(strings: SifComplianceStrings, status: string | null | undefined) {
  switch (status) {
    case 'draft':
      return strings.data.evidence.procedureStatuses.draft
    case 'ifr':
      return strings.data.evidence.procedureStatuses.ifr
    case 'approved':
      return strings.data.evidence.procedureStatuses.approved
    default:
      return status || strings.data.evidence.procedureStatuses.draft
  }
}

export function localizeComplianceEvidence(
  strings: SifComplianceStrings,
  sif: SIF,
  result: SIFCalcResult,
  compliance: ComplianceResult,
  item: ComplianceEvidenceItem,
) {
  const hasHazopTrace = Boolean(sif.hazopTrace?.scenarioId || sif.hazopTrace?.hazopNode)
  const hasProofProcedure = Boolean(sif.proofTestProcedure)
  const proofProcedureHasSteps = Boolean((sif.proofTestProcedure?.steps?.length ?? 0) > 0)
  const proofProcedureApproved = sif.proofTestProcedure?.status === 'approved'
  const hasCampaigns = sif.testCampaigns.length > 0
  const hasApprovalChain = Boolean(sif.madeBy && sif.verifiedBy && sif.approvedBy)
  const hasAnyApproval = Boolean(sif.madeBy || sif.verifiedBy || sif.approvedBy)

  switch (item.id) {
    case 'hazop-link':
      return {
        ...item,
        label: strings.data.evidence.hazopLinkLabel,
        summary: hasHazopTrace ? `${sif.hazopTrace?.scenarioId || sif.hazopTrace?.hazopNode}` : strings.data.evidence.hazopLinkMissing,
        detail: hasHazopTrace ? strings.data.evidence.hazopLinkDetailReady : strings.data.evidence.hazopLinkDetailMissing,
      }
    case 'proof-procedure':
      return {
        ...item,
        label: strings.data.evidence.proofProcedureLabel,
        summary: !hasProofProcedure
          ? strings.data.evidence.proofProcedureMissing
          : `${sif.proofTestProcedure?.ref || strings.data.evidence.proofProcedureFallback} · ${formatProcedureStatus(strings, sif.proofTestProcedure?.status)}`,
        detail: !hasProofProcedure
          ? strings.data.evidence.proofProcedureDetailMissing
          : proofProcedureHasSteps && proofProcedureApproved
            ? strings.data.evidence.proofProcedureDetailNeedsReview
            : strings.data.evidence.proofProcedureDetailIncomplete,
      }
    case 'proof-evidence':
      return {
        ...item,
        label: strings.data.evidence.proofEvidenceLabel,
        summary: hasCampaigns ? strings.data.evidence.proofEvidenceRecorded(sif.testCampaigns.length) : strings.data.evidence.proofEvidenceMissing,
        detail: hasCampaigns ? strings.data.evidence.proofEvidenceDetailReady : strings.data.evidence.proofEvidenceDetailMissing,
      }
    case 'approval-chain':
      return {
        ...item,
        label: strings.data.evidence.approvalChainLabel,
        summary: hasApprovalChain
          ? strings.data.evidence.approvalChainComplete
          : hasAnyApproval
            ? strings.data.evidence.approvalChainPartial
            : strings.data.evidence.approvalChainEmpty,
        detail: hasApprovalChain ? strings.data.evidence.approvalChainDetailReady : strings.data.evidence.approvalChainDetailIncomplete,
      }
    case 'report-package':
      return {
        ...item,
        label: strings.data.evidence.reportPackageLabel,
        summary: result.meetsTarget && compliance.metadataCompletion === 1 && hasProofProcedure
          ? strings.data.evidence.reportPackageReady
          : strings.data.evidence.reportPackageReview,
        detail: strings.data.evidence.reportPackageDetail,
      }
    default:
      return item
  }
}

export function localizeComplianceAssumption(
  strings: SifComplianceStrings,
  sif: SIF,
  item: ComplianceAssumptionItem,
) {
  const allComponents = sif.subsystems.flatMap(subsystem =>
    subsystem.channels.flatMap(channel => channel.components),
  )
  const redundantSubsystems = sif.subsystems.filter(subsystem => subsystem.channels.length > 1)
  const componentsWithProofInterval = allComponents.filter(component => component.test.T1 > 0).length
  const componentsWithDataSource = allComponents.filter(component => component.dataSource.trim().length > 0).length
  const redundantWithCCFConfigured = redundantSubsystems.filter(subsystem => subsystem.ccf.beta > 0 || subsystem.ccf.betaD > 0).length
  const hasProofProcedure = Boolean(sif.proofTestProcedure)

  switch (item.id) {
    case 'low-demand-mode':
      return {
        ...item,
        label: strings.data.derivedAssumptions.lowDemandLabel,
        summary: sif.demandRate > 0
          ? strings.data.derivedAssumptions.lowDemandSummary(sif.demandRate.toExponential(2))
          : strings.data.derivedAssumptions.lowDemandMissing,
        detail: sif.demandRate > 0 && sif.demandRate <= 1
          ? strings.data.derivedAssumptions.lowDemandDetailReady
          : strings.data.derivedAssumptions.lowDemandDetailReview,
      }
    case 'proof-test-effectiveness':
      return {
        ...item,
        label: strings.data.derivedAssumptions.proofEffectivenessLabel,
        summary: strings.data.derivedAssumptions.proofEffectivenessSummary(componentsWithProofInterval, allComponents.length || 0),
        detail: hasProofProcedure
          ? strings.data.derivedAssumptions.proofEffectivenessDetailWithProcedure
          : strings.data.derivedAssumptions.proofEffectivenessDetailWithoutProcedure,
      }
    case 'ccf-modelling':
      return {
        ...item,
        label: strings.data.derivedAssumptions.ccfLabel,
        summary: redundantSubsystems.length === 0
          ? strings.data.derivedAssumptions.ccfNoRedundantSummary
          : strings.data.derivedAssumptions.ccfSummary(redundantWithCCFConfigured, redundantSubsystems.length),
        detail: redundantSubsystems.length === 0
          ? strings.data.derivedAssumptions.ccfDetailNoRedundant
          : strings.data.derivedAssumptions.ccfDetailReview,
      }
    case 'failure-data-provenance':
      return {
        ...item,
        label: strings.data.derivedAssumptions.failureDataLabel,
        summary: strings.data.derivedAssumptions.failureDataSummary(componentsWithDataSource, allComponents.length || 0),
        detail: componentsWithDataSource === allComponents.length
          ? strings.data.derivedAssumptions.failureDataDetailReady
          : strings.data.derivedAssumptions.failureDataDetailMissing,
      }
    default:
      return item
  }
}
