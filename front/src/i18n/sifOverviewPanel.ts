import type { AppLocale } from './types'
import { sifOverviewPanelStringsEn } from './locales/en/sifOverviewPanel'
import { sifOverviewPanelStringsFr } from './locales/fr/sifOverviewPanel'

export interface SifOverviewPanelStrings {
  currentSif: string
  untitledSif: string
  result: {
    label: string
    onTarget: string
    belowTarget: string
  }
  sections: {
    snapshot: string
    actions: string
    context: string
  }
  hero: {
    title: string
    description: string
  }
  reading: {
    title: string
    targetSil: string
    achieved: string
    pfdavg: string
    rrf: string
    nextProofTest: string
    notScheduled: string
    traceability: string
  }
  governance: {
    title: string
    metadataReady: string
    metadataDetail: (count: number) => string
    evidencePackage: string
    evidenceDetail: string
    assumptionsReviewed: string
    assumptionsDetail: (count: number) => string
    approvalChain: string
    approvalDetail: string
  }
  contextSections: {
    identification: string
    accountability: string
  }
  rows: {
    demandRate: string
    requiredRrf: string
    scenarioId: string
    hazopNode: string
    lopaRef: string
    notAvailable: string
  }
}

const SIF_OVERVIEW_PANEL_STRINGS: Record<AppLocale, SifOverviewPanelStrings> = {
  fr: sifOverviewPanelStringsFr,
  en: sifOverviewPanelStringsEn,
}

export function getSifOverviewPanelStrings(locale: AppLocale): SifOverviewPanelStrings {
  return SIF_OVERVIEW_PANEL_STRINGS[locale]
}
