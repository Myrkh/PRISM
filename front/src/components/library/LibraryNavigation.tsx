import {
  createContext,
  useContext,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { ComponentTemplate, SubsystemType } from '@/core/types'
import { useComponentLibrary } from '@/features/library'
import { useAppStore } from '@/store/appStore'
import type { LibraryOriginBadge } from './LibraryTemplateCard'

export type LibrarySourceScope = 'all' | LibraryOriginBadge
export type LibrarySubsystemScope = 'all' | SubsystemType

export type LibraryCatalogEntry = {
  template: ComponentTemplate
  origin: LibraryOriginBadge
}

export type LibraryEditorState =
  | { kind: 'empty' }
  | { kind: 'create'; subsystemType: SubsystemType }
  | { kind: 'template'; entryKey: string }

export type LibraryEditorMode = 'empty' | 'create' | 'edit' | 'clone'

type LibraryProjectFilter = {
  id: string
  label: string
  count: number
}

type LibraryNavigationContextValue = {
  query: string
  deferredQuery: string
  sourceScope: LibrarySourceScope
  subsystemScope: LibrarySubsystemScope
  projectFilter: string | null
  entries: LibraryCatalogEntry[]
  groupedEntries: Record<SubsystemType, LibraryCatalogEntry[]>
  sourceCounts: Record<LibrarySourceScope, number>
  subsystemCounts: Record<LibrarySubsystemScope, number>
  projectFilters: LibraryProjectFilter[]
  totalIndexed: number
  totalVisible: number
  builtinTemplates: ComponentTemplate[]
  allProjectTemplates: ComponentTemplate[]
  userTemplates: ComponentTemplate[]
  loading: boolean
  error: string | null
  fetchTemplates: () => Promise<void>
  importTemplates: ReturnType<typeof useComponentLibrary>['importTemplates']
  archiveTemplate: ReturnType<typeof useComponentLibrary>['archiveTemplate']
  deleteTemplate: ReturnType<typeof useComponentLibrary>['deleteTemplate']
  clearError: (value: string | null) => void
  editorState: LibraryEditorState
  editorMode: LibraryEditorMode
  selectedEntryKey: string | null
  editorSelection: LibraryCatalogEntry | null
  openEntry: (entry: LibraryCatalogEntry) => void
  startCreate: (subsystemType: SubsystemType) => void
  clearEditor: () => void
  focusSavedTemplate: (template: ComponentTemplate) => void
  setQuery: (value: string) => void
  setSourceScope: (value: LibrarySourceScope) => void
  setSubsystemScope: (value: LibrarySubsystemScope) => void
  setProjectFilter: (value: string | null) => void
  clearFilters: () => void
}

const LibraryNavigationContext = createContext<LibraryNavigationContextValue | null>(null)

const ORIGIN_PRIORITY: Record<LibraryOriginBadge, number> = {
  builtin: 0,
  project: 1,
  user: 2,
}

function sortEntries(entries: LibraryCatalogEntry[]) {
  return [...entries].sort((left, right) => {
    const originDiff = ORIGIN_PRIORITY[left.origin] - ORIGIN_PRIORITY[right.origin]
    if (originDiff !== 0) return originDiff
    return left.template.name.localeCompare(right.template.name, 'fr', { sensitivity: 'base' })
  })
}

export function getLibraryEntryKey(origin: LibraryOriginBadge, templateId: string) {
  return `${origin}:${templateId}`
}

function matchesQuery(entry: LibraryCatalogEntry, needle: string) {
  if (!needle) return true
  const template = entry.template
  const haystack = [
    template.name,
    template.description,
    template.instrumentType,
    template.instrumentCategory,
    template.manufacturer,
    template.dataSource,
    template.sourceReference,
    ...template.tags,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(needle)
}

function filterEntries(
  entries: LibraryCatalogEntry[],
  query: string,
  {
    sourceScope = 'all',
    subsystemScope = 'all',
    projectFilter = null,
  }: {
    sourceScope?: LibrarySourceScope
    subsystemScope?: LibrarySubsystemScope
    projectFilter?: string | null
  } = {},
) {
  const needle = query.trim().toLowerCase()

  return entries.filter(entry => {
    if (!matchesQuery(entry, needle)) return false
    if (sourceScope !== 'all' && entry.origin !== sourceScope) return false
    if (subsystemScope !== 'all' && entry.template.subsystemType !== subsystemScope) return false
    if (projectFilter && entry.origin === 'project' && entry.template.projectId !== projectFilter) return false
    return true
  })
}

function countByOrigin(entries: LibraryCatalogEntry[]): Record<LibrarySourceScope, number> {
  return {
    all: entries.length,
    builtin: entries.filter(entry => entry.origin === 'builtin').length,
    project: entries.filter(entry => entry.origin === 'project').length,
    user: entries.filter(entry => entry.origin === 'user').length,
  }
}

function countBySubsystem(entries: LibraryCatalogEntry[]): Record<LibrarySubsystemScope, number> {
  return {
    all: entries.length,
    sensor: entries.filter(entry => entry.template.subsystemType === 'sensor').length,
    logic: entries.filter(entry => entry.template.subsystemType === 'logic').length,
    actuator: entries.filter(entry => entry.template.subsystemType === 'actuator').length,
  }
}

export function LibraryNavigationProvider({ children }: { children: ReactNode }) {
  const projects = useAppStore(state => state.projects)
  const {
    builtinTemplates,
    allProjectTemplates,
    userTemplates,
    loading,
    error,
    fetchTemplates,
    importTemplates,
    archiveTemplate,
    deleteTemplate,
    clearError,
  } = useComponentLibrary(null)

  const [query, setQuery] = useState('')
  const [sourceScope, setSourceScope] = useState<LibrarySourceScope>('all')
  const [subsystemScope, setSubsystemScope] = useState<LibrarySubsystemScope>('all')
  const [projectFilter, setProjectFilter] = useState<string | null>(null)
  const [editorState, setEditorState] = useState<LibraryEditorState>({ kind: 'empty' })
  const deferredQuery = useDeferredValue(query)

  const allEntries = useMemo(() => sortEntries([
    ...builtinTemplates.map(template => ({ template, origin: 'builtin' as const })),
    ...allProjectTemplates.map(template => ({ template, origin: 'project' as const })),
    ...userTemplates.map(template => ({ template, origin: 'user' as const })),
  ]), [allProjectTemplates, builtinTemplates, userTemplates])

  const entryIndex = useMemo(
    () => new Map(allEntries.map(entry => [getLibraryEntryKey(entry.origin, entry.template.id), entry])),
    [allEntries],
  )

  const selectedEntryKey = editorState.kind === 'template' ? editorState.entryKey : null
  const editorSelection = useMemo(
    () => selectedEntryKey ? entryIndex.get(selectedEntryKey) ?? null : null,
    [entryIndex, selectedEntryKey],
  )
  const editorMode: LibraryEditorMode = editorState.kind === 'create'
    ? 'create'
    : editorSelection
      ? editorSelection.origin === 'builtin'
        ? 'clone'
        : 'edit'
      : 'empty'

  useEffect(() => {
    if (editorState.kind !== 'template') return
    if (entryIndex.has(editorState.entryKey)) return
    setEditorState({ kind: 'empty' })
  }, [editorState, entryIndex])

  const scopeUniverse = useMemo(
    () => filterEntries(allEntries, deferredQuery, { subsystemScope, projectFilter }),
    [allEntries, deferredQuery, projectFilter, subsystemScope],
  )

  const subsystemUniverse = useMemo(
    () => filterEntries(allEntries, deferredQuery, { sourceScope, projectFilter }),
    [allEntries, deferredQuery, projectFilter, sourceScope],
  )

  const projectUniverse = useMemo(
    () => filterEntries(allEntries, deferredQuery, { sourceScope, subsystemScope }),
    [allEntries, deferredQuery, sourceScope, subsystemScope],
  )

  const entries = useMemo(
    () => filterEntries(allEntries, deferredQuery, { sourceScope, subsystemScope, projectFilter }),
    [allEntries, deferredQuery, projectFilter, sourceScope, subsystemScope],
  )

  const groupedEntries = useMemo<Record<SubsystemType, LibraryCatalogEntry[]>>(() => ({
    sensor: entries.filter(entry => entry.template.subsystemType === 'sensor'),
    logic: entries.filter(entry => entry.template.subsystemType === 'logic'),
    actuator: entries.filter(entry => entry.template.subsystemType === 'actuator'),
  }), [entries])

  const sourceCounts = useMemo(() => countByOrigin(scopeUniverse), [scopeUniverse])
  const subsystemCounts = useMemo(() => countBySubsystem(subsystemUniverse), [subsystemUniverse])

  const projectFilters = useMemo(() => {
    const counts = projectUniverse.reduce<Record<string, number>>((acc, entry) => {
      const projectId = entry.template.projectId
      if (!projectId) return acc
      acc[projectId] = (acc[projectId] ?? 0) + 1
      return acc
    }, {})

    return projects
      .map(project => ({
        id: project.id,
        label: project.name,
        count: counts[project.id] ?? 0,
      }))
      .sort((left, right) => {
        if (right.count !== left.count) return right.count - left.count
        return left.label.localeCompare(right.label, 'fr', { sensitivity: 'base' })
      })
  }, [projectUniverse, projects])

  const clearFilters = () => {
    setSourceScope('all')
    setSubsystemScope('all')
    setProjectFilter(null)
  }

  const openEntry = (entry: LibraryCatalogEntry) => {
    setEditorState({ kind: 'template', entryKey: getLibraryEntryKey(entry.origin, entry.template.id) })
  }

  const startCreate = (nextSubsystemType: SubsystemType) => {
    setEditorState({ kind: 'create', subsystemType: nextSubsystemType })
  }

  const clearEditor = () => {
    setEditorState({ kind: 'empty' })
  }

  const focusSavedTemplate = (template: ComponentTemplate) => {
    const origin: LibraryOriginBadge = template.scope === 'project' ? 'project' : 'user'
    setEditorState({ kind: 'template', entryKey: getLibraryEntryKey(origin, template.id) })
  }

  const value = useMemo<LibraryNavigationContextValue>(() => ({
    query,
    deferredQuery,
    sourceScope,
    subsystemScope,
    projectFilter,
    entries,
    groupedEntries,
    sourceCounts,
    subsystemCounts,
    projectFilters,
    totalIndexed: allEntries.length,
    totalVisible: entries.length,
    builtinTemplates,
    allProjectTemplates,
    userTemplates,
    loading,
    error,
    fetchTemplates,
    importTemplates,
    archiveTemplate,
    deleteTemplate,
    clearError,
    editorState,
    editorMode,
    selectedEntryKey,
    editorSelection,
    openEntry,
    startCreate,
    clearEditor,
    focusSavedTemplate,
    setQuery,
    setSourceScope,
    setSubsystemScope,
    setProjectFilter,
    clearFilters,
  }), [
    allEntries.length,
    allProjectTemplates,
    archiveTemplate,
    builtinTemplates,
    clearEditor,
    clearError,
    deferredQuery,
    deleteTemplate,
    editorMode,
    editorSelection,
    editorState,
    entries,
    error,
    fetchTemplates,
    focusSavedTemplate,
    groupedEntries,
    importTemplates,
    loading,
    openEntry,
    projectFilter,
    projectFilters,
    query,
    selectedEntryKey,
    sourceCounts,
    sourceScope,
    startCreate,
    subsystemCounts,
    subsystemScope,
    userTemplates,
  ])

  return (
    <LibraryNavigationContext.Provider value={value}>
      {children}
    </LibraryNavigationContext.Provider>
  )
}

export function useLibraryNavigation() {
  const context = useContext(LibraryNavigationContext)
  if (!context) {
    throw new Error('useLibraryNavigation must be used inside LibraryNavigationProvider')
  }
  return context
}
