import type { AppLocale } from './types'
import { settingsStringsEn } from './locales/en/settings'
import { settingsStringsFr } from './locales/fr/settings'

export type SettingsSectionKey = 'general' | 'workspace' | 'engine'

export interface SettingsStrings {
  sidebarTitle: string
  confirmExit: {
    title: string
    message: string
    cancel: string
    confirm: string
  }
  sections: Record<SettingsSectionKey, { label: string; hint: string }>
  general: {
    language: {
      label: string
      hint: string
      fr: string
      en: string
    }
    theme: {
      label: string
      hint: string
      dark: string
      light: string
    }
  }
  workspace: {
    unit: string
    leftPanel: {
      label: string
      hint: (min: number, max: number) => string
    }
    rightPanel: {
      label: string
      hint: (min: number, max: number) => string
    }
  }
  engine: {
    tolerance: {
      label: string
      hint: string
      unit: string
    }
  }
  footer: {
    dirty: string
    saved: string
    esc: string
  }
  actions: {
    discard: string
    draftDefaults: string
    save: string
  }
}

const SETTINGS_STRINGS: Record<AppLocale, SettingsStrings> = {
  fr: settingsStringsFr,
  en: settingsStringsEn,
}

export function getSettingsStrings(locale: AppLocale): SettingsStrings {
  return SETTINGS_STRINGS[locale]
}
