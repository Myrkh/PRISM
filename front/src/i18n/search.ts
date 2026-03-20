import type { SearchResultKind, SearchScopeId } from '@/features/search/searchIndex'
import type { AppLocale } from './types'
import { searchStringsEn } from './locales/en/search'
import { searchStringsFr } from './locales/fr/search'

export interface SearchStrings {
  tabLabels: Record<string, string>
  resultKindLabels: Record<SearchResultKind, string>
  scopeMeta: Record<SearchScopeId, { label: string; hint: string }>
  header: {
    eyebrow: string
    title: string
    description: string
    filteredCount: (count: number) => string
    indexedCount: (count: number) => string
    commandHint: string
  }
  searchPlaceholder: string
  previewBadge: string
  displayedCount: (count: number) => string
  revisionsLoading: (count: number) => string
  noResults: {
    title: string
    description: string
  }
  previewFooter: string
  sidebar: {
    title: string
    summary: (query: string, totalVisible: number, totalIndexed: number) => string
    reset: string
    scopeTitle: string
    projectsTitle: string
    allProjectsLabel: string
    allProjectsHint: string
    usageTitle: string
    usageBody: string
    backgroundLoading: (count: number) => string
  }
}

const SEARCH_STRINGS: Record<AppLocale, SearchStrings> = {
  fr: searchStringsFr,
  en: searchStringsEn,
}

export function getSearchStrings(locale: AppLocale): SearchStrings {
  return SEARCH_STRINGS[locale]
}
