import type { AppLocale } from './types'
import { sifModalStringsEn } from './locales/en/sifModal'
import { sifModalStringsFr } from './locales/fr/sifModal'

export interface SifModalStrings {
  header: {
    edit: (sifNumber: string) => string
    create: string
    subtitleFallback: string
    functionName: string
  }
  projectSelector: {
    targetProject: string
    placeholder: string
  }
  tabs: {
    identification: { label: string; hint: string }
    process: { label: string; hint: string }
    traceability: { label: string; hint: string }
  }
  validation: {
    required: string
    noProjectSelected: string
  }
  fields: {
    sifNumber: string
    revision: string
    revisionPlaceholder: string
    date: string
    title: string
    titlePlaceholder: string
    description: string
    descriptionPlaceholder: string
    targetSil: string
    status: string
    initialArchitecture: string
    pid: string
    pidPlaceholder: string
    location: string
    locationPlaceholder: string
    processTag: string
    processTagPlaceholder: string
    demandRate: string
    demandRatePlaceholder: string
    hazardousEvent: string
    hazardousEventPlaceholder: string
    rrfRequired: string
    rrfRequiredPlaceholder: string
    establishedBy: string
    verifiedBy: string
    approvedBy: string
    initialsPlaceholder: string
    documentDate: string
  }
  statuses: {
    draft: string
    inReview: string
    verified: string
    approved: string
    archived: string
  }
  architectures: {
    oneoooneDesc: string
    oneootwoDesc: string
    twoootwoDesc: string
    twooothreeDesc: string
    oneootwoDDesc: string
    unchanged: string
    summary: (description: string, hft: number) => string
  }
  helpers: {
    pfdThreshold: string
    silRange: (sil: number, min: number, max: number) => string
  }
  alerts: {
    hazardousEventTraceability: string
  }
  traceability: {
    signatories: string
    documentManagementTitle: string
    documentManagementBody: string
    summaryTitle: string
    rows: {
      number: string
      title: string
      targetSil: string
      status: string
      processTag: string
      architecture: string
      project: string
      pid: string
    }
  }
  footer: {
    previous: string
    next: string
    cancel: string
    saving: string
    save: string
    create: string
  }
}

const SIF_MODAL_STRINGS: Record<AppLocale, SifModalStrings> = {
  fr: sifModalStringsFr,
  en: sifModalStringsEn,
}

export function getSifModalStrings(locale: AppLocale): SifModalStrings {
  return SIF_MODAL_STRINGS[locale]
}
