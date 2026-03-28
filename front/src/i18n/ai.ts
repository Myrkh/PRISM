import type { AppLocale } from './types'
import { aiStringsEn } from './locales/en/ai'
import { aiStringsFr } from './locales/fr/ai'

export interface AiStrings {
  proposals: {
    commands: {
      createProject: string
      createSif: string
      draftSif: string
      createLibrary: string
    }
    actions: {
      openProject: string
      openSif: string
      openTemplate: string
      reopenPreview: string
      openPreview: string
    }
    sections: {
      conflicts: string
      missing: string
      uncertain: string
      assumptions: string
    }
    preview: {
      /** Banner / dialog title when draft is not yet applied */
      titleSif: string
      titleProject: string
      /** Explanatory subtitle */
      subtitleSif: string
      subtitleProject: string
      /** CTA buttons */
      applySif: string
      applyProject: string
      applying: string
      discard: string
      json: string
      /** Governance panel */
      governanceTitle: string
      governanceHint: string
      governanceEmpty: string
    }
    projectMeta: {
      sectionTitle: string
      sectionHint: string
      name: string
      reference: string
      client: string
      site: string
      unit: string
      revision: string
      status: string
      description: string
    }
    projectView: {
      sectionTitle: string
      sectionHint: string
      empty: string
      untitledSif: string
    }
  }
}

const AI_STRINGS: Record<AppLocale, AiStrings> = {
  en: aiStringsEn,
  fr: aiStringsFr,
}

export function getAiStrings(locale: AppLocale): AiStrings {
  return AI_STRINGS[locale]
}
