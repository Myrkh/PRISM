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
  }
  save: {
    dirty: string
    saved: string
    save: string
    saving: string
    fallbackError: string
  }
}

const SIF_CONTEXT_STRINGS: Record<AppLocale, SifContextStrings> = {
  fr: sifContextStringsFr,
  en: sifContextStringsEn,
}

export function getSifContextStrings(locale: AppLocale): SifContextStrings {
  return SIF_CONTEXT_STRINGS[locale]
}
