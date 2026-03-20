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
      hint: 'Language and appearance',
    },
    workspace: {
      label: 'Workspace',
      hint: 'Panels and widths',
    },
    engine: {
      label: 'Engine',
      hint: 'Comparison tolerance',
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
  },
  engine: {
    tolerance: {
      label: 'Comparison tolerance',
      hint: 'Delta threshold before mismatch warning.',
      unit: '%',
    },
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
