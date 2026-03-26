import type { AppLocale } from './types'
import { shellStringsEn } from './locales/en/shell'
import { shellStringsFr } from './locales/fr/shell'

export interface ShellStrings {
  sifTabLabels: Record<string, string>
  viewLabels: Record<string, string>
  editorBreadcrumb: {
    settingsSections: Record<string, string>
  }
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
      layout: string
      symbols: string
      help: string
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
      aiChat: string
      active: string
      navigate: string
      select: string
      close: string
      // Layout toggles
      toggleLeftPanel: string
      toggleRightPanel: string
      toggleStatusBar: string
      toggleActivityBar: string
      invertPanels: string
      zenMode: string
      splitView: string
      customizeLayout: string
      centeredLayout: string
      workflowBreadcrumbShow: string
      workflowBreadcrumbHide: string
      commandPaletteTop: string
      commandPaletteCenter: string
      panelSectionsOpenByDefault: string
      panelSectionsClosedByDefault: string
      libraryBuiltin: string
      libraryUserTemplates: string
      libraryProjectTemplates: string
      resetPanelStates: string
      // Library actions
      libraryNewSensor: string
      libraryNewLogic: string
      libraryNewActuator: string
      // Create actions
      createNote: string
      createFolder: string
      // Navigate: Settings sections
      navigateSettingsGeneral: string
      navigateSettingsWorkspace: string
      navigateSettingsEngine: string
      navigateSettingsShortcuts: string
      // Settings toggles
      settingsScientificNotationOn: string
      settingsScientificNotationOff: string
      settingsPdfA4: string
      settingsPdfLetter: string
      settingsLandingViews: Record<string, string>
      settingsDecimalDigits: Record<string, string>
      settingsMissionTimes: Record<string, string>
    }
    meta: {
      continueSearch: (query: string) => string
      exploreSearch: string
      library: string
      docs: string
    }
    modes: {
      /** Appended to the keyboard hint footer: e.g. "  |  > commandes  # SIF  @ symboles  ? aide" */
      hintSuffix: string
    }
  }
  statusBar: {
    noSIF: string
    pass: string
    fail: string
  }
  workbenchBar: {
    switchSif: string
    backToSelection: string
  }
  projectTree: {
    pinSif: string
    unpinSif: string
    sifActions: string
    rename: string
    exportSif: string
    deleteSif: string
    projectActions: string
    exportProject: string
    importSif: string
    deleteProject: string
    emptyProject: string
    newSif: string
    newSifInProject: (projectName: string) => string
  }
  projectSidebar: {
    pinned: string
    projects: string
    unpin: string
    newProject: string
    newSif: string
    importPrism: string
  }
  workbenchInspector: {
    properties: string
    silVerification: string
    targetSil: string
    achievedSil: string
    pfdavg: string
    rrf: string
    sff: string
    dc: string
    resizePanel: string
  }
  rightPanelPlaceholder: {
    labels: Record<'audit' | 'history' | 'planning' | 'engine' | 'hazop', string>
    descriptions: {
      default: string
      planning: string
      engine: string
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
