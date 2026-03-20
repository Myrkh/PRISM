import {
  createContext,
  useContext,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useComponentLibrary } from '@/features/library'
import { useAppStore } from '@/store/appStore'
import {
  buildSearchIndex,
  filterSearchResults,
  getProjectCounts,
  getSearchScopeCounts,
  groupSearchResults,
  type SearchItemScope,
  type SearchResult,
  type SearchResultGroup,
  type SearchScopeId,
} from '@/features/search/searchIndex'

type SearchProjectFilter = {
  id: string
  label: string
  count: number
}

type SearchNavigationContextValue = {
  query: string
  deferredQuery: string
  scope: SearchScopeId
  projectFilter: string | null
  results: SearchResult[]
  groupedResults: SearchResultGroup[]
  previewGroups: SearchResultGroup[]
  scopeCounts: Record<SearchItemScope, number>
  projectFilters: SearchProjectFilter[]
  totalIndexed: number
  totalVisible: number
  missingRevisionCount: number
  setQuery: (value: string) => void
  setScope: (value: SearchScopeId) => void
  setProjectFilter: (value: string | null) => void
  clearFilters: () => void
}

const SearchNavigationContext = createContext<SearchNavigationContextValue | null>(null)

function buildPreviewGroups(groups: SearchResultGroup[]) {
  return groups
    .map(group => ({
      ...group,
      items: group.items.slice(0, 6),
    }))
    .filter(group => group.items.length > 0)
}

export function SearchNavigationProvider({ children }: { children: ReactNode }) {
  const projects = useAppStore(s => s.projects)
  const revisions = useAppStore(s => s.revisions)
  const fetchRevisions = useAppStore(s => s.fetchRevisions)
  const { builtinTemplates, allProjectTemplates, userTemplates } = useComponentLibrary(null)

  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<SearchScopeId>('all')
  const [projectFilter, setProjectFilter] = useState<string | null>(null)
  const deferredQuery = useDeferredValue(query)
  const requestedRevisionIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    const missingIds = projects.flatMap(project =>
      project.sifs
        .map(sif => sif.id)
        .filter(sifId => !revisions[sifId] && !requestedRevisionIds.current.has(sifId)),
    )

    if (!missingIds.length) return

    missingIds.forEach(sifId => {
      requestedRevisionIds.current.add(sifId)
      void fetchRevisions(sifId)
    })
  }, [fetchRevisions, projects, revisions])

  const libraryTemplates = useMemo(() => (
    [...builtinTemplates, ...allProjectTemplates, ...userTemplates]
  ), [allProjectTemplates, builtinTemplates, userTemplates])

  const index = useMemo(() => (
    buildSearchIndex(projects, revisions, libraryTemplates)
  ), [libraryTemplates, projects, revisions])

  const queryUniverse = useMemo(() => (
    filterSearchResults(index, deferredQuery)
  ), [deferredQuery, index])

  const scopeUniverse = useMemo(() => (
    filterSearchResults(index, deferredQuery, { projectId: projectFilter })
  ), [deferredQuery, index, projectFilter])

  const results = useMemo(() => (
    filterSearchResults(index, deferredQuery, { projectId: projectFilter, scope })
  ), [deferredQuery, index, projectFilter, scope])

  const groupedResults = useMemo(() => (
    groupSearchResults(results)
  ), [results])

  const previewGroups = useMemo(() => (
    buildPreviewGroups(groupSearchResults(scopeUniverse))
  ), [scopeUniverse])

  const scopeCounts = useMemo(() => (
    getSearchScopeCounts(scopeUniverse)
  ), [scopeUniverse])

  const projectFilters = useMemo(() => {
    const counts = getProjectCounts(queryUniverse)
    return projects
      .map(project => ({
        id: project.id,
        label: project.name,
        count: counts[project.id] ?? 0,
      }))
      .sort((left, right) => {
        if (right.count !== left.count) return right.count - left.count
        return left.label.localeCompare(right.label)
      })
  }, [projects, queryUniverse])

  const missingRevisionCount = useMemo(() => (
    projects.flatMap(project => project.sifs).filter(sif => !revisions[sif.id]).length
  ), [projects, revisions])

  const clearFilters = () => {
    setScope('all')
    setProjectFilter(null)
  }

  const value = useMemo<SearchNavigationContextValue>(() => ({
    query,
    deferredQuery,
    scope,
    projectFilter,
    results,
    groupedResults,
    previewGroups,
    scopeCounts,
    projectFilters,
    totalIndexed: index.length,
    totalVisible: results.length,
    missingRevisionCount,
    setQuery,
    setScope,
    setProjectFilter,
    clearFilters,
  }), [
    deferredQuery,
    groupedResults,
    index.length,
    missingRevisionCount,
    previewGroups,
    projectFilter,
    projectFilters,
    query,
    results,
    scope,
    scopeCounts,
  ])

  return (
    <SearchNavigationContext.Provider value={value}>
      {children}
    </SearchNavigationContext.Provider>
  )
}

export function useSearchNavigation() {
  const context = useContext(SearchNavigationContext)
  if (!context) {
    throw new Error('useSearchNavigation must be used inside SearchNavigationProvider')
  }
  return context
}
