import type { AppLocale } from './types'
import { settingsStringsEn } from './locales/en/settings'
import { settingsStringsFr } from './locales/fr/settings'

export type AppSettingsSectionKey = 'general' | 'workspace' | 'engine' | 'shortcuts'
export type ProfileSettingsSectionKey = 'account' | 'session'

export interface SettingsStrings {
  sidebarTitle: {
    app: string
    profile: string
  }
  scopeSwitcher: {
    backToSettings: string
  }
  confirmExit: {
    title: string
    message: string
    cancel: string
    confirm: string
  }
  sections: {
    app: Record<AppSettingsSectionKey, { label: string; hint: string }>
    profile: Record<ProfileSettingsSectionKey, { label: string; hint: string }>
  }
  profileCard: {
    eyebrow: string
    openProfile: string
    profileActive: string
    openHint: string
    providerFallback: string
    memberSince: string
    lastSignIn: string
    editProfile: string
    prismSettings: string
  }
  profile: {
    values: {
      active: string
      unavailable: string
    }
    account: {
      heroTitle: string
      heroDescription: string
      fullName: string
      email: string
      provider: string
      userId: string
      profileUpdated: string
    }
    session: {
      heroTitle: string
      heroDescription: string
      currentSession: string
      provider: string
      lastSignIn: string
      memberSince: string
      signOutTitle: string
      signOutHint: string
      signOutAction: string
      signingOut: string
    }
  }
  shortcuts: {
    searchPlaceholder: string
    jsonToggle: string
    tableToggle: string
    resetAll: string
    pressKey: string
    pressKeyCancel: string
    reset: string
    columns: {
      command: string
      keybinding: string
      when: string
      source: string
    }
    categories: {
      palette: string
      layout: string
      navigation: string
    }
    sources: {
      default: string
      user: string
    }
    unbound: string
    jsonHint: string
  }
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
    landingView: {
      label: string
      hint: string
      views: Record<string, string>
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
    rightPanelDefaultState: {
      label: string
      hint: string
      open: string
      closed: string
    }
    workflowBreadcrumb: {
      label: string
      hint: string
      visible: string
      hidden: string
    }
    pdfPageSize: {
      label: string
      hint: string
      a4: string
      letter: string
    }
  }
  engine: {
    tolerance: {
      label: string
      hint: string
      unit: string
    }
    scientificNotation: {
      label: string
      hint: string
    }
    decimalRounding: {
      label: string
      hint: string
      unit: string
    }
    defaultMissionTime: {
      label: string
      hint: string
      unit: string
    }
    defaultProofTestInterval: {
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
