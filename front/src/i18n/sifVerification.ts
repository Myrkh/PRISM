import type { AppLocale } from './types'
import { sifVerificationStringsEn } from './locales/en/sifVerification'
import { sifVerificationStringsFr } from './locales/fr/sifVerification'

export interface SifVerificationStrings {
  workspace: {
    sections: {
      calculationResults: string
      subsystemBreakdown: string
      technicalGaps: string
      assumptions: string
      evidencePackage: string
    }
    metrics: {
      pfdavg: string
      rrf: string
      achievedSil: string
      checks: string
      subsystem: string
      architecture: string
      subsystemPfd: string
      subsystemRrf: string
      sff: string
      dc: string
      hft: string
      sil: string
      findings: string
      evidence: string
      proofTest: string
      score: string
    }
    statuses: {
      inspect: string
      noTechnicalGaps: string
      undocumentedRationale: string
      validated: string
      review: string
      noAssumptions: string
      ok: string
      missing: string
      defined: string
    }
    findingSummary: (subsystemLabel: string, value: string, expected: string) => string
  }
  rightPanel: {
    tabs: {
      summary: string
      graph: string
      assumptions: string
    }
    donut: {
      section: string
      badge: string
      total: string
      noContributionSplit: string
    }
    summary: {
      readyTitle: string
      blockersTitle: string
      ctaTitle: string
      metrics: {
        phase: string
        readiness: string
        blockers: string
        evidence: string
        proofTest: string
      }
      phaseValue: string
      assumptionsInReview: (count: number) => string
      noOpenBlockers: string
      goToExploitation: string
      blockerFinding: (title: string, subsystemLabel: string) => string
    }
    graph: {
      mission: {
        title: string
        hint: string
        missionTime: string
        unit: string
        years: string
        hours: string
      }
      chart: {
        title: string
        hint: string
        chartTitle: string
        chartSubtitle: string
        scale: string
        curvePoints: string
        log: string
        linear: string
        showGrid: string
        showGridHint: string
        showLegend: string
        showLegendHint: string
        showSilBands: string
        showSilBandsHint: string
        showSubsystemLines: string
        showSubsystemLinesHint: string
        total: string
        sensors: string
        solver: string
        actuators: string
      }
      pie: {
        title: string
        hint: string
        pieTitle: string
        pieSubtitle: string
        showLabels: string
        showLabelsHint: string
        innerRadius: string
        outerRadius: string
        reset: string
      }
    }
    assumptions: {
      title: string
      hint: string
      statusOk: string
      statusReview: string
      metrics: {
        items: string
        pendingReview: string
      }
      actions: {
        add: string
        pdfPreview: string
        reset: string
        save: string
        saving: string
      }
      notifications: {
        saveSuccess: string
        saveFailure: string
      }
      pdfDraftHint: string
      projectMissing: string
      saveFallback: string
      empty: string
      newAssumptionTitle: string
      itemTitle: string
      remove: string
      placeholders: {
        title: string
        statement: string
        rationale: string
        owner: string
      }
      helper: {
        linkHint: string
        openLinkedTab: string
        derivedSignalsTitle: string
        derivedSignalsDescription: string
        openSourceTab: string
        untitled: string
      }
      fields: {
        title: string
        statement: string
        rationale: string
        owner: string
        reviewDate: string
        status: string
        category: string
        linkedTab: string
      }
      statusOptions: {
        draft: string
        review: string
        validated: string
      }
      categoryOptions: {
        process: string
        proof: string
        architecture: string
        data: string
        governance: string
        other: string
      }
      linkedTabOptions: {
        cockpit: string
        context: string
        architecture: string
        verification: string
        exploitation: string
        report: string
      }
    }
    compliance: {
      sections: {
        summary: string
        gap: string
        assumptions: string
        evidence: string
      }
      statuses: {
        compliant: string
        review: string
        nonCompliant: string
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
      }
    }
  }
}

const SIF_VERIFICATION_STRINGS: Record<AppLocale, SifVerificationStrings> = {
  fr: sifVerificationStringsFr,
  en: sifVerificationStringsEn,
}

export function getSifVerificationStrings(locale: AppLocale): SifVerificationStrings {
  return SIF_VERIFICATION_STRINGS[locale]
}
