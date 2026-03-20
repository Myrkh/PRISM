import type { AppLocale } from './types'
import { libraryStringsEn } from './locales/en/library'
import { libraryStringsFr } from './locales/fr/library'

export interface LibraryStrings {
  sourceScopeLabels: Record<'all' | 'builtin' | 'project' | 'user', string>
  sourceMeta: Record<'all' | 'builtin' | 'project' | 'user', { label: string; hint: string }>
  subsystemHints: Record<'sensor' | 'logic' | 'actuator', string>
  header: {
    eyebrow: string
    title: string
    description: string
    filteredCount: (count: number) => string
    availableCount: (count: number) => string
  }
  searchPlaceholder: string
  ctas: {
    newSensor: string
    newLogic: string
    newActuator: string
    import: string
    importModel: string
    export: string
    reload: string
    importModelTitle: string
    exportTitle: string
    reloadTitle: string
    createTitle: (typeLabel: string) => string
  }
  importTarget: (projectLabel: string | null, libraryLabel: string | null) => string
  chips: {
    validatedStandards: (count: number) => string
    projectTemplates: (count: number) => string
    personalTemplates: (count: number) => string
  }
  status: {
    noSelection: string
    imported: (count: number, created: number, updated: number) => string
    exported: (count: number) => string
    importModelDownloaded: string
    archived: string
    deleted: string
  }
  family: {
    templateCount: (count: number) => string
    partLabel: Record<'sensor' | 'logic' | 'actuator', string>
    empty: string
    showMore: string
    showLess: string
  }
  sidebar: {
    title: string
    summary: (query: string, totalVisible: number, totalIndexed: number) => string
    reset: string
    originTitle: string
    familiesTitle: string
    allFamiliesLabel: string
    allFamiliesHint: string
    namedLibrariesTitle: string
    allLibrariesLabel: string
    allLibrariesHint: string
    noNamedLibraries: string
    projectsTitle: string
    allProjectsLabel: string
    allProjectsHint: string
    usageTitle: string
    usagePrimary: string
    usageSecondary: string
    collectionHint: Record<'project' | 'user' | 'mixed', string>
  }
}

const LIBRARY_STRINGS: Record<AppLocale, LibraryStrings> = {
  fr: libraryStringsFr,
  en: libraryStringsEn,
}

export function getLibraryStrings(locale: AppLocale): LibraryStrings {
  return LIBRARY_STRINGS[locale]
}
