import type { SettingsStrings } from '@/i18n/settings'

export const settingsStringsEn: SettingsStrings = {
  sidebarTitle: {
    app: 'PRISM Settings',
    profile: 'User Profile',
  },
  scopeSwitcher: {
    backToSettings: 'Back to PRISM settings',
  },
  confirmExit: {
    title: 'Leave settings?',
    message: 'Unsaved changes will be lost.',
    cancel: 'Stay',
    confirm: 'Leave',
  },
  sections: {
    app: {
      general: {
        label: 'General',
        hint: 'Language, appearance and startup',
      },
      workspace: {
        label: 'Workspace',
        hint: 'Panels, widths and export',
      },
      engine: {
        label: 'Engine',
        hint: 'Calculations and SIF defaults',
      },
      shortcuts: {
        label: 'Keyboard Shortcuts',
        hint: 'Customize key bindings',
      },
    },
    profile: {
      account: {
        label: 'Account',
        hint: 'Identity, provider and synced profile',
      },
      session: {
        label: 'Session',
        hint: 'Current session and sign out',
      },
    },
  },
  profileCard: {
    eyebrow: 'PRISM Profile',
    openProfile: 'Open profile',
    profileActive: 'Profile active',
    openHint: 'Identity, sessions and account access',
    providerFallback: 'Unknown provider',
    memberSince: 'Member since',
    lastSignIn: 'Last sign-in',
    editProfile: 'Edit profile',
    prismSettings: 'PRISM Settings',
  },
  profile: {
    values: {
      active: 'Active',
      unavailable: 'Unavailable',
    },
    account: {
      heroTitle: 'Identity synced from Supabase',
      heroDescription: 'This profile is derived from the authenticated session and acts as the entry point for user-specific settings.',
      fullName: 'Full name',
      email: 'Email address',
      provider: 'Provider',
      userId: 'User identifier',
      profileUpdated: 'Last profile sync',
    },
    session: {
      heroTitle: 'Current session and basic security',
      heroDescription: 'Keep connection information here without cluttering PRISM application settings.',
      currentSession: 'Session status',
      provider: 'Current provider',
      lastSignIn: 'Last sign-in',
      memberSince: 'Account created',
      signOutTitle: 'Sign out',
      signOutHint: 'Ends the local session and returns to the authentication screen.',
      signOutAction: 'Sign out',
      signingOut: 'Signing out...',
    },
  },
  general: {
    language: {
      label: 'Interface language',
      hint: 'Sets the interface language.',
      fr: 'French',
      en: 'English',
    },
    theme: {
      label: 'Theme',
      hint: 'Sets the application theme.',
      dark: 'Dark',
      light: 'Light',
    },
    landingView: {
      label: 'Default landing screen',
      hint: 'Screen shown when the application starts.',
      views: {
        projects: 'Projects',
        library: 'Master Library',
        engine: 'Engine',
        'audit-log': 'Audit Log',
        planning: 'Test Planning',
        hazop: 'HAZOP / LOPA',
      },
    },
  },
  workspace: {
    unit: 'px',
    leftPanel: {
      label: 'Left panel width',
      hint: (min, max) => `Default left panel width. ${min} to ${max}px.`,
    },
    rightPanel: {
      label: 'Right panel width',
      hint: (min, max) => `Default right panel width. ${min} to ${max}px.`,
    },
    rightPanelDefaultState: {
      label: 'Panel sections at startup',
      hint: 'Default open or closed state for accordion sections when opening a panel for the first time.',
      open: 'Open',
      closed: 'Closed',
    },
    workflowBreadcrumb: {
      label: 'Workflow breadcrumb bar',
      hint: 'Shows the clickable bar under the header inside the SIF workflow.',
      visible: 'Visible',
      hidden: 'Hidden',
    },
    pdfPageSize: {
      label: 'PDF page size',
      hint: 'Page format used when exporting SIL reports.',
      a4: 'A4',
      letter: 'Letter',
    },
  },
  engine: {
    tolerance: {
      label: 'Comparison tolerance',
      hint: 'Delta threshold before mismatch warning.',
      unit: '%',
    },
    scientificNotation: {
      label: 'Scientific notation',
      hint: 'Display PFD/lambda values in scientific notation (e.g. 1.23e-4).',
    },
    decimalRounding: {
      label: 'Significant digits',
      hint: 'Number of digits shown for PFD/lambda numeric values.',
      unit: 'digits',
    },
    defaultMissionTime: {
      label: 'Default mission time (TH)',
      hint: 'Pre-filled when creating a new SIF. Overridable per SIF.',
      unit: 'h',
    },
    defaultProofTestInterval: {
      label: 'Default proof-test interval (TI)',
      hint: 'Pre-filled when creating a new SIF. Overridable per SIF.',
      unit: 'h',
    },
  },
  shortcuts: {
    searchPlaceholder: 'Filter by command or keybinding...',
    jsonToggle: 'Switch to JSON',
    tableToggle: 'Switch to table',
    resetAll: 'Reset all',
    pressKey: 'Press a shortcut...',
    pressKeyCancel: 'Escape to cancel',
    reset: 'Reset',
    columns: {
      command: 'Command',
      keybinding: 'Keybinding',
      when: 'When',
      source: 'Source',
    },
    categories: {
      palette: 'Command Palette',
      layout: 'Layout',
      navigation: 'Navigation',
    },
    sources: {
      default: 'Default',
      user: 'User',
    },
    unbound: '-',
    jsonHint: 'Only your custom keybindings are shown here. Edit them directly in the table.',
  },
  footer: {
    dirty: 'Unsaved changes',
    saved: 'Preferences saved for this device',
    esc: 'Esc to close',
  },
  actions: {
    discard: 'Discard',
    draftDefaults: 'Restore defaults',
    save: 'Save',
  },
}
