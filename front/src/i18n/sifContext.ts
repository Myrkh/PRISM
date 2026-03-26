import type { AppLocale } from './types'
import { sifContextStringsEn } from './locales/en/sifContext'
import { sifContextStringsFr } from './locales/fr/sifContext'

export interface SifContextStrings {
  sections: {
    identification: string
    srs: string
    hazop: string
    signatories: string
  }
  fields: {
    sifNumber: string
    title: string
    pidZone: string
    location: string
    processTag: string
    functionalDescription: string
    targetSil: string
    demandRate: string
    requiredRrf: string
    maxAdmissiblePfd: string
    processTiming: string
    processSafetyTime: string
    sifResponseTime: string
    safeState: string
    hazardousEvent: string
    hazopNode: string
    scenarioId: string
    initiatingEvent: string
    deviationCause: string
    lopaRef: string
    riskMatrix: string
    tmel: string
    independentIpls: string
    hazopFacilitator: string
    hazopDate: string
    preparedBy: string
    verifiedBy: string
    approvedBy: string
    documentDate: string
  }
  placeholders: {
    title: string
    pidZone: string
    location: string
    processTag: string
    functionalDescription: string
    hazardousEvent: string
    hazopNode: string
    scenarioId: string
    initiatingEvent: string
    deviationCause: string
    lopaRef: string
    riskMatrix: string
    independentIpls: string
    processSafetyTime: string
    sifResponseTime: string
    safeState: string
  }
  save: {
    dirty: string
    saved: string
    save: string
    saving: string
    fallbackError: string
  }
  rightPanel: {
    sections: {
      status: string
      actions: string
    }
    intro: string
    metrics: {
      readiness: string
      hazopTrace: string
      metadata: string
      signatories: string
    }
    missing: {
      summary: (count: number) => string
      aligned: string
      complete: string
      items: {
        hazopScenarioLink: string
        independentIpls: string
        hazopFacilitatorDate: string
      }
    }
    conclusions: {
      withMissing: string
      complete: string
    }
    ctas: {
      completeContext: string
      continueArchitecture: string
    }
  }
}

const SIF_CONTEXT_STRINGS: Record<AppLocale, SifContextStrings> = {
  fr: sifContextStringsFr,
  en: sifContextStringsEn,
}

export function getSifContextStrings(locale: AppLocale): SifContextStrings {
  return SIF_CONTEXT_STRINGS[locale]
}
