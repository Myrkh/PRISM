import type { AppLocale } from './types'
import { libraryStringsEn } from './locales/en/library'
import { libraryStringsFr } from './locales/fr/library'

export interface LibraryStrings {
  sourceScopeLabels: Record<'all' | 'builtin' | 'custom' | 'project' | 'user', string>
  header: {
    filteredCount: (count: number) => string
    availableCount: (count: number) => string
  }
  searchPlaceholder: string
  ctas: {
    import: string
    importModel: string
    importModelTitle: string
    export: string
    exportTitle: string
    reloadTitle: string
    moreActionsTitle: string
  }
  importTarget: (projectLabel: string | null, libraryLabel: string | null) => string
  status: {
    noSelection: string
    imported: (count: number, created: number, updated: number) => string
    exported: (count: number) => string
    importModelDownloaded: string
    deleted: string
  }
  family: {
    empty: string
    showMore: string
    showLess: string
  }
  sidebar: {
    title: string
    reset: string
    prismCatalogueTitle: string
    prismCatalogueHint: string
    myLibraryTitle: string
    myLibraryAllLabel: string
    myLibraryPersonalLabel: string
    myLibraryPersonalHint: string
    familiesTitle: string
    allFamiliesLabel: string
    newSensorTitle: string
    newLogicTitle: string
    newActuatorTitle: string
    newCollectionTitle: string
    newCollectionPlaceholder: string
    newCollectionConfirm: string
    collectionColorTitle: string
    collectionEditJsonTitle: string
    collectionDeleteTitle: string
    collectionDeleteConfirmTitle: string
    collectionDeleteConfirmMessage: (name: string) => string
    collectionDeleteConfirmAction: string
  }
}

const LIBRARY_STRINGS: Record<AppLocale, LibraryStrings> = {
  fr: libraryStringsFr,
  en: libraryStringsEn,
}

export function getLibraryStrings(locale: AppLocale): LibraryStrings {
  return LIBRARY_STRINGS[locale]
}
