import type { AppLocale } from './types'
import { shellStringsEn } from './locales/en/shell'
import { shellStringsFr } from './locales/fr/shell'

export interface ShellStrings {
  sifTabLabels: Record<string, string>
  viewLabels: Record<string, string>
  iconRail: {
    leftCollapse: string
    leftExpand: string
    rightCollapse: string
    rightExpand: string
    focusEnter: string
    focusExit: string
    home: string
    search: string
    library: string
    audit: string
    planning: string
    engine: string
    docs: string
    settings: string
  }
  header: {
    fallbackUser: string
    authenticatedUser: string
    userMenuSettings: string
    userMenuLight: string
    userMenuDark: string
    userMenuSignOut: string
  }
  commandPalette: {
    buttonLabel: string
    placeholder: string
    noResults: (query: string) => string
    groups: {
      currentView: (sifNumber: string, title: string | null | undefined) => string
      create: string
      projects: string
      sifs: string
      general: string
      searchResults: string
    }
    labels: {
      untitled: string
      goCockpit: string
      goContext: string
      goArchitecture: string
      goVerification: string
      goExploitation: string
      goReport: string
      editCurrentSif: string
      editCurrentProject: string
      newProject: string
      newSif: string
      newSifInProject: (projectName: string) => string
      home: string
      globalSearch: string
      masterLibrary: string
      switchToLight: string
      switchToDark: string
      auditLog: string
      planning: string
      engine: string
      docs: string
      settings: string
      active: string
      navigate: string
      select: string
      close: string
    }
    meta: {
      continueSearch: (query: string) => string
      exploreSearch: string
      library: string
      docs: string
    }
  }
}

const SHELL_STRINGS: Record<AppLocale, ShellStrings> = {
  fr: shellStringsFr,
  en: shellStringsEn,
}

export function getShellStrings(locale: AppLocale): ShellStrings {
  return SHELL_STRINGS[locale]
}
