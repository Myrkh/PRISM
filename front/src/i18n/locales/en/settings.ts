import type { SettingsStrings } from '@/i18n/settings'

export const settingsStringsEn: SettingsStrings = {
  sidebarTitle: {
    app: 'PRISM Settings',
    profile: 'User Profile',
  },
  scopeSwitcher: {
    backToSettings: 'Back to PRISM settings',
    app: 'App',
    profile: 'Profile',
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
      export: {
        label: 'Export',
        hint: 'Company, reports and PDF settings',
      },
      ai: {
        label: 'PRISM AI',
        hint: 'AI behavior and context preferences',
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
      copyId: 'Copy user ID',
      copied: 'Copied!',
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
    commandPalettePosition: {
      label: 'Command palette position',
      hint: 'Where the palette appears when invoked with Cmd+K.',
      top: 'Top',
      center: 'Center',
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
  export: {
    companyName: {
      label: 'Company name',
      hint: 'Displayed in the header of all exported PDF reports.',
      placeholder: 'e.g. Acme Engineering',
    },
    signatureText: {
      label: 'Report footer',
      hint: 'Legal notice or signature block appended to every PDF report.',
      placeholder: 'e.g. Prepared by the Safety Engineering team. Confidential.',
    },
  },
  ai: {
    responseLanguage: {
      label: 'AI response language',
      hint: 'Language PRISM AI uses in its replies. Auto follows the app locale.',
      auto: 'Auto',
      fr: 'Français',
      en: 'English',
    },
    autoAttachSif: {
      label: 'Auto-attach SIF context',
      hint: 'Automatically include the active SIF data in every AI message for richer answers.',
      on: 'On',
      off: 'Off',
    },
  },
  shortcuts: {
    searchPlaceholder: 'Filter by command or keybinding...',
    openJson: 'Open keybindings.json',
    openUserCommandsJson: 'Open userCommands.json',
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
      general: 'General',
      layout: 'Layout',
      navigation: 'Navigation',
    },
    sources: {
      default: 'Default',
      user: 'User',
    },
    unbound: '-',
    conflict: (otherCommand: string) => `Conflict with "${otherCommand}"`,
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
