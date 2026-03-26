import type { AppLocale } from './types'
import { sifOverviewStringsEn } from './locales/en/sifOverview'
import { sifOverviewStringsFr } from './locales/fr/sifOverview'

export type SifOverviewTabKey = 'cockpit' | 'context' | 'history' | 'architecture' | 'verification' | 'exploitation' | 'report'

export interface SifOverviewStrings {
  localeTag: string
  shared: {
    statusShort: Record<'draft' | 'in_review' | 'verified' | 'approved' | 'archived', string>
  }
  actionCtas: {
    primary: Record<SifOverviewTabKey, string>
    panel: Record<SifOverviewTabKey, string>
  }
  operationalHealth: Record<'healthy' | 'watch' | 'critical' | 'unknown', string>
  metrics: {
    actions: {
      proofProcedureTitle: string
      proofProcedureHint: string
      proofEvidenceTitle: string
      proofEvidenceHint: string
      proofOverdueTitle: string
      proofOverdueHint: (date: string) => string
      operationalExposureTitle: string
      operationalExposureHint: (openFaults: number, bypassHours: string) => string
      technicalFindingsTitle: string
      technicalFindingsHint: (count: number) => string
      assumptionsTitle: string
      assumptionsHint: (count: number) => string
      hazopTraceTitle: string
      hazopTraceHint: (completed: number, total: number) => string
      contextFieldsTitle: string
      contextFieldsHint: (pct: number) => string
      stableTitle: string
      stableHint: string
    }
  }
  overview: {
    defaultTitle: string
    sections: {
      decision: string
      revisionNext: string
      dangerousEvent: string
      revisionHistory: string
      priorityActions: string
    }
    decision: {
      technicalActionRequired: string
      technicalSummaryBelowTarget: (targetSil: number) => string
      technicalSummaryFindings: (count: number) => string
      operationalExposure: string
      operationalExposureSummary: (bits: string) => string
      dossierToConsolidate: string
      dossierToConsolidateSummary: (count: number) => string
      revisionPublished: string
      revisionPublishedSummary: string
      readyForClosure: string
      readyForClosureSummary: string
      exposureBits: {
        overdueProofTest: string
        openFaults: (count: number) => string
        bypassHours: (hours: string) => string
      }
    }
    pills: {
      targetSil: (targetSil: number) => string
      revisionPublished: (revision: string | number) => string
      revisionWorking: (revision: string | number) => string
    }
    dangerousEventMissing: string
    inlineMetrics: {
      achievedSil: string
      checks: string
      trace: string
      approvals: string
      pfdavg: string
      requiredRrf: string
      findings: string
      evidence: string
      openFaults: string
      bypassInhibit: string
      metadata: string
      assumptionsUnderReview: string
    }
    scopeToSpecify: string
    locationMissing: string
    dateMissing: string
    nextStep: string
    noBlockingTitle: string
    noBlockingHint: string
    primaryCtaReport: string
    publishing: string
    closeRevision: (revision: string | number) => string
    revisionHistoryDescription: string
    signalCards: {
      integrityEyebrow: string
      operationsEyebrow: string
      governanceEyebrow: string
      integrityHeld: string
      integrityBelowTarget: string
      integrityDetail: (targetSil: number, achievedSil: number) => string
      governanceReady: string
      governanceIncomplete: string
      governanceTrace: (pct: number) => string
      governanceDetail: (approvals: number, evidenceComplete: number, evidenceTotal: number) => string
    }
    operations: {
      toSchedule: string
      missingProcedure: string
      overdueDetail: string
      lastCampaignOn: (date: string) => string
      noCampaignYet: string
    }
    priorityActionsDescription: string
    noPriorityTitle: string
    noPriorityDescription: string
    statusCards: {
      integrityCalculated: string
      integrityHeld: string
      integrityBelow: string
      operationsWindow: string
      dossierDefensibility: string
      dossierReady: string
      dossierIncomplete: string
    }
  }
  closeDialog: {
    title: (revision: string | number) => string
    subtitle: string
    lockedNotice: (revision: string | number) => string
    lockedFollowUp: string
    changeDescription: string
    changeDescriptionPlaceholder: string
    publishedBy: string
    publishedByPlaceholder: string
    requiredError: string
    submitFallbackError: string
    cancel: string
    confirm: string
  }
  lockedOverlay: {
    eyebrow: string
    title: (revision: string | number) => string
    description: (nextRevision: string | number) => string
    lockedOn: (date: string) => string
    lockedOnUnknown: string
    startNextRevision: (revision: string | number) => string
  }
  history: {
    summaryPublished: (revision: string | number) => string
    summaryWorking: (revision: string | number) => string
    lastPublicationOn: (date: string) => string
    workingDescription: string
    snapshots: string
    lastPublication: string
    none: string
    tableHeaders: {
      revision: string
      status: string
      date: string
      preparedBy: string
      subject: string
      artifactsCompare: string
    }
    loading: string
    empty: string
    buttons: {
      reportPdf: string
      proofTestPdf: string
      compareWith: (revisionLabel: string) => string
    }
    delta: {
      noChangeDetected: string
      silChange: (fromSil: number, toSil: number) => string
      pfdChange: (fromPfd: string, toPfd: string) => string
      componentDelta: (delta: number) => string
      writer: (name: string) => string
    }
  }
  compare: {
    newestBadge: string
    createdBy: (name: string) => string
    title: (sifNumber: string) => string
    differencesDetected: (count: number) => string
    noDifferences: string
    tableHeaders: {
      parameter: string
      older: (revisionLabel: string) => string
      current: (revisionLabel: string) => string
    }
    sections: {
      silPfd: string
      architecture: string
      document: string
      hazop: string
      proofTest: string
    }
    rows: {
      averagePfd: string
      achievedSil: string
      targetReached: string
      targetSil: string
      requiredRrf: string
      subsystems: string
      components: string
      status: string
      preparedBy: string
      verifiedBy: string
      approvedBy: string
      scenario: string
      riskMatrix: string
      tmel: string
      periodicity: string
      procedureSteps: string
    }
    targetReachedYes: string
    targetReachedNo: string
    revisionBadge: (revisionLabel: string) => string
    olderSuffix: string
    currentSuffix: string
    months: (months: number) => string
    steps: (count: number) => string
    subsystemsCount: (count: number) => string
    componentsCount: (count: number) => string
  }
}

const SIF_OVERVIEW_STRINGS: Record<AppLocale, SifOverviewStrings> = {
  fr: sifOverviewStringsFr,
  en: sifOverviewStringsEn,
}

export function getSifOverviewStrings(locale: AppLocale): SifOverviewStrings {
  return SIF_OVERVIEW_STRINGS[locale]
}
