import type { SettingsStrings } from '@/i18n/settings'

export const settingsStringsEn: SettingsStrings = {
  sidebarTitle: 'Settings',
  confirmExit: {
    title: 'Leave settings?',
    message: 'Unsaved changes will be lost.',
    cancel: 'Stay',
    confirm: 'Leave',
  },
  sections: {
    general: {
      label: 'General',
      hint: 'Language, appearance & startup',
    },
    workspace: {
      label: 'Workspace',
      hint: 'Panels, widths & export',
    },
    engine: {
      label: 'Engine',
      hint: 'Calculations & SIF defaults',
    },
    shortcuts: {
      label: 'Keyboard Shortcuts',
      hint: 'Customize key bindings',
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
      hint: 'Default open/closed state for accordion sections when opening a panel for the first time.',
      open: 'Open',
      closed: 'Closed',
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
      hint: 'Display PFD/λ values in scientific notation (e.g. 1.23e-4).',
    },
    decimalRounding: {
      label: 'Significant digits',
      hint: 'Number of digits shown for PFD/λ numeric values.',
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
    searchPlaceholder: 'Filter by command or keybinding…',
    jsonToggle: 'Switch to JSON',
    tableToggle: 'Switch to table',
    resetAll: 'Reset all',
    pressKey: 'Press a shortcut…',
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
    unbound: '—',
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
