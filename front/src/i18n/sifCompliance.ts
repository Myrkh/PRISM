import type { AppLocale } from './types'
import { sifComplianceStringsEn } from './locales/en/sifCompliance'
import { sifComplianceStringsFr } from './locales/fr/sifCompliance'

export interface SifComplianceStrings {
  localeTag: string
  statusPills: {
    ok: string
    missing: string
    review: string
    draft: string
    validated: string
  }
  overallStatus: {
    compliant: string
    review: string
    nonCompliant: string
  }
  tab: {
    complianceStatusTitle: string
    complianceStatusHint: string
    statusLabel: string
    checksPassed: (passed: number, total: number) => string
    target: string
    openGaps: string
    register: string
    registerPending: (count: number) => string
    proofGovernanceTitle: string
    proofGovernanceHint: string
    traceability: string
    evidenceItems: string
    nextBestActionsTitle: string
    nextBestActionsHint: string
    openComplianceGapsTitle: string
    openComplianceGapsHint: string
    noOpenTechnicalGap: string
    inspect: string
    currentExpected: (value: string, expected: string) => string
  }
  panel: {
    sections: {
      summary: string
      gap: string
      assumptions: string
      evidence: string
    }
    summary: {
      title: string
      description: string
      targetSil: string
      achieved: string
      openGaps: string
      register: string
      registerPending: (count: number) => string
      priorityActions: string
      assumptionSignals: string
      explicitRegister: (count: number) => string
      derivedSignals: (count: number) => string
    }
    gap: {
      whyItMatters: string
      current: string
      expected: string
      goToFix: string
      inspector: string
      inspectorHint: string
      openGaps: string
      noOpenGaps: string
      currentExpected: (value: string, expected: string) => string
    }
    evidence: {
      selectedEvidence: string
      inspector: string
      inspectorHint: string
      statusTitle: string
      openSourceTab: string
    }
  }
  data: {
    metadataLabels: {
      pid: string
      location: string
      processTag: string
      hazardousEvent: string
      madeBy: string
      verifiedBy: string
      approvedBy: string
    }
    findings: {
      subsystemFallback: string
      architectureLabel: string
      detailHft: string
      detailSff: string
      detailDc: string
    }
    actions: {
      increaseArchitectureTitle: string
      increaseArchitectureHint: string
      improveDiagnosticTitle: string
      improveDiagnosticHint: string
      completeTraceabilityTitle: string
      completeTraceabilityHint: string
      reviewAssumptionsTitle: string
      reviewAssumptionsHint: string
      baselineSolidTitle: string
      baselineSolidHint: string
    }
    evidence: {
      procedureStatuses: {
        draft: string
        ifr: string
        approved: string
      }
      hazopLinkLabel: string
      hazopLinkMissing: string
      hazopLinkDetailReady: string
      hazopLinkDetailMissing: string
      proofProcedureLabel: string
      proofProcedureMissing: string
      proofProcedureFallback: string
      proofProcedureDetailMissing: string
      proofProcedureDetailNeedsReview: string
      proofProcedureDetailIncomplete: string
      proofEvidenceLabel: string
      proofEvidenceRecorded: (count: number) => string
      proofEvidenceMissing: string
      proofEvidenceDetailReady: string
      proofEvidenceDetailMissing: string
      approvalChainLabel: string
      approvalChainComplete: string
      approvalChainPartial: string
      approvalChainEmpty: string
      approvalChainDetailReady: string
      approvalChainDetailIncomplete: string
      reportPackageLabel: string
      reportPackageReady: string
      reportPackageReview: string
      reportPackageDetail: string
    }
    derivedAssumptions: {
      lowDemandLabel: string
      lowDemandMissing: string
      lowDemandSummary: (value: string) => string
      lowDemandDetailReady: string
      lowDemandDetailReview: string
      proofEffectivenessLabel: string
      proofEffectivenessSummary: (configured: number, total: number) => string
      proofEffectivenessDetailWithProcedure: string
      proofEffectivenessDetailWithoutProcedure: string
      ccfLabel: string
      ccfNoRedundantSummary: string
      ccfSummary: (configured: number, total: number) => string
      ccfDetailNoRedundant: string
      ccfDetailReview: string
      failureDataLabel: string
      failureDataSummary: (configured: number, total: number) => string
      failureDataDetailReady: string
      failureDataDetailMissing: string
    }
  }
}

const SIF_COMPLIANCE_STRINGS: Record<AppLocale, SifComplianceStrings> = {
  fr: sifComplianceStringsFr,
  en: sifComplianceStringsEn,
}

export function getSifComplianceStrings(locale: AppLocale): SifComplianceStrings {
  return SIF_COMPLIANCE_STRINGS[locale]
}
