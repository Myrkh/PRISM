/**
 * useCommandGroups — builds all command palette groups from current app state.
 * Pure logic hook — no rendering, no side-effects beyond Zustand subscriptions.
 */
import { useMemo } from 'react'
import {
  LayoutDashboard, Network, BarChart3, Shield, FlaskConical,
  FileText, Home, Pencil, History, ClipboardCheck, CalendarDays,
  Cpu, BookOpen, BookOpenText, FolderPlus, FilePlus, Search, Settings, Moon, Sun,
} from 'lucide-react'
import { useLocaleStrings } from '@/i18n/useLocale'
import { getShellStrings } from '@/i18n/shell'
import { useAppStore, type SIFTab } from '@/store/appStore'
import { normalizeSIFTab } from '@/store/types'
import { getSearchResultIcon } from '@/components/search/searchMeta'
import { useComponentLibrary } from '@/features/library'
import { buildSearchIndex, filterSearchResults, openSearchResult } from '@/features/search/searchIndex'
import type { CommandGroup, CommandItem, IndexedGroup, IndexedItem } from './types'

interface UseCommandGroupsOptions {
  search: string
  run: (fn: () => void) => void
  onOpenSettings: () => void
  onOpenDocs: () => void
  onOpenSearch: () => void
  onOpenLibrary: () => void
}

export function useCommandGroups({
  search,
  run,
  onOpenSettings,
  onOpenDocs,
  onOpenSearch,
  onOpenLibrary,
}: UseCommandGroupsOptions) {
  const strings = useLocaleStrings(getShellStrings)

  const projects      = useAppStore(s => s.projects)
  const revisions     = useAppStore(s => s.revisions)
  const view          = useAppStore(s => s.view)
  const isDark        = useAppStore(s => s.isDark)
  const toggleTheme   = useAppStore(s => s.toggleTheme)
  const navigate      = useAppStore(s => s.navigate)
  const setTab        = useAppStore(s => s.setTab)
  const openNewProject  = useAppStore(s => s.openNewProject)
  const openNewSIF      = useAppStore(s => s.openNewSIF)
  const openEditProject = useAppStore(s => s.openEditProject)
  const openEditSIF     = useAppStore(s => s.openEditSIF)
  const selectComponent = useAppStore(s => s.selectComponent)

  const { builtinTemplates, allProjectTemplates, userTemplates } = useComponentLibrary(null)

  const currentProjectId = view.type === 'sif-dashboard' ? view.projectId : null
  const currentSifId     = view.type === 'sif-dashboard' ? view.sifId : null
  const currentProject   = currentProjectId
    ? projects.find(p => p.id === currentProjectId) ?? null
    : null
  const currentSif = currentProject && currentSifId
    ? currentProject.sifs.find(s => s.id === currentSifId) ?? null
    : null
  const currentTab = view.type === 'sif-dashboard' ? normalizeSIFTab(view.tab) : null

  const goToTab = (tab: SIFTab) => run(() => setTab(tab))

  // ── SIF navigation group (only when a SIF is open) ─────────────────────────

  const currentViewGroup: CommandGroup | null = currentSif && currentProject ? {
    heading: strings.commandPalette.groups.currentView(currentSif.sifNumber, currentSif.title),
    items: [
      { id: 'goto-overview',     label: strings.commandPalette.labels.goCockpit,      keywords: 'go cockpit dashboard overview accueil tableau de bord history historique revisions snapshots compare', Icon: LayoutDashboard, onSelect: () => goToTab('cockpit'),       isActive: currentTab === 'cockpit',       level: 0 },
      { id: 'goto-context',      label: strings.commandPalette.labels.goContext,       keywords: 'go context contexte hazop lopa',                                                                          Icon: ClipboardCheck,  onSelect: () => goToTab('context'),       isActive: currentTab === 'context',       level: 0 },
      { id: 'goto-architecture', label: strings.commandPalette.labels.goArchitecture,  keywords: 'go architecture loop editor éditeur boucle',                                                               Icon: Network,         onSelect: () => goToTab('architecture'),  isActive: currentTab === 'architecture',  level: 0 },
      { id: 'goto-analysis',     label: strings.commandPalette.labels.goVerification,  keywords: 'go verification calculations analysis calculs analyse conformité',                                          Icon: BarChart3,       onSelect: () => goToTab('verification'),  isActive: currentTab === 'verification',  level: 0 },
      { id: 'goto-prooftest',    label: strings.commandPalette.labels.goExploitation,  keywords: 'go exploitation proof test test de preuve',                                                                Icon: FlaskConical,    onSelect: () => goToTab('exploitation'),  isActive: currentTab === 'exploitation',  level: 0 },
      { id: 'goto-report',       label: strings.commandPalette.labels.goReport,        keywords: 'go report package reports rapport rapports publication',                                                    Icon: FileText,        onSelect: () => goToTab('report'),        isActive: currentTab === 'report',        level: 0 },
      { id: 'edit-current-sif',  label: strings.commandPalette.labels.editCurrentSif,  keywords: 'edit current sif modifier cette sif',                                                                      Icon: Pencil,          onSelect: () => run(() => openEditSIF(currentSif.id)),         isActive: false, level: 0 },
      { id: 'edit-current-project', label: strings.commandPalette.labels.editCurrentProject, keywords: 'edit current project modifier projet courant', Icon: Pencil, onSelect: () => run(() => openEditProject(currentProject.id)), isActive: false, meta: currentProject.name, level: 0 },
    ],
  } : null

  // ── Create group ────────────────────────────────────────────────────────────

  const createGroup: CommandGroup = {
    heading: strings.commandPalette.groups.create,
    items: [
      {
        id: 'new-project',
        label: strings.commandPalette.labels.newProject,
        keywords: 'create new project créer nouveau projet',
        Icon: FolderPlus,
        onSelect: () => run(openNewProject),
        isActive: false,
        level: 0,
      },
      {
        id: 'new-sif',
        label: currentProject
          ? strings.commandPalette.labels.newSifInProject(currentProject.name)
          : strings.commandPalette.labels.newSif,
        keywords: 'create new sif créer nouvelle sif',
        Icon: FilePlus,
        onSelect: () => run(() => openNewSIF(currentProjectId ?? undefined)),
        isActive: false,
        level: 0,
      },
    ],
  }

  // ── Projects group ──────────────────────────────────────────────────────────

  const projectsGroup: CommandGroup = {
    heading: strings.commandPalette.groups.projects,
    items: projects.map(project => ({
      id: `project-${project.id}`,
      label: project.name,
      keywords: `project projet ${project.name} ${project.ref} ${project.client}`,
      Icon: FolderPlus,
      onSelect: () => run(() => {
        const firstSif = project.sifs[0]
        if (firstSif) {
          navigate({ type: 'sif-dashboard', projectId: project.id, sifId: firstSif.id, tab: 'cockpit' })
        } else {
          navigate({ type: 'projects' })
        }
      }),
      isActive: currentProjectId === project.id,
      meta: project.ref || project.client || undefined,
      level: 0 as const,
    })),
  }

  // ── SIFs group ──────────────────────────────────────────────────────────────

  const sifsGroup: CommandGroup = {
    heading: strings.commandPalette.groups.sifs,
    items: projects.flatMap(project =>
      project.sifs.map(sif => ({
        id: `sif-${sif.id}`,
        label: `${sif.sifNumber}${sif.title ? ` — ${sif.title}` : ''}`,
        keywords: `sif ${sif.sifNumber} ${sif.title} ${sif.processTag} ${project.name}`,
        Icon: Shield,
        meta: project.name,
        onSelect: () => run(() =>
          navigate({ type: 'sif-dashboard', projectId: project.id, sifId: sif.id, tab: 'cockpit' }),
        ),
        isActive: currentSifId === sif.id,
        level: 0 as const,
      })),
    ),
  }

  // ── General group ───────────────────────────────────────────────────────────

  const generalGroup: CommandGroup = {
    heading: strings.commandPalette.groups.general,
    items: [
      { id: 'home-dashboard',    label: strings.commandPalette.labels.home,          keywords: 'home dashboard accueil projets',                                                                                Icon: Home,        onSelect: () => run(() => navigate({ type: 'projects' })),             isActive: view.type === 'projects',   level: 0 },
      { id: 'search-workspace',  label: strings.commandPalette.labels.globalSearch,  keywords: 'search recherche globale palette composants hypotheses revisions rapports',                                    Icon: Search,      onSelect: () => run(onOpenSearch),                                     isActive: view.type === 'search',     meta: search.trim() ? strings.commandPalette.meta.continueSearch(search.trim()) : strings.commandPalette.meta.exploreSearch, level: 0 },
      { id: 'library-workspace', label: strings.commandPalette.labels.masterLibrary, keywords: 'library bibliothèque catalogue composants templates standards lambda_db',                                       Icon: BookOpen,    onSelect: () => run(onOpenLibrary),                                    isActive: view.type === 'library',    meta: strings.commandPalette.meta.library,  level: 0 },
      { id: 'toggle-theme',      label: isDark ? strings.commandPalette.labels.switchToLight : strings.commandPalette.labels.switchToDark, keywords: 'theme dark light mode thème sombre clair',               Icon: isDark ? Sun : Moon, onSelect: () => run(toggleTheme),                        isActive: false,                      level: 0 },
      { id: 'audit-log',         label: strings.commandPalette.labels.auditLog,      keywords: 'audit log historique timeline',                                                                                  Icon: History,     onSelect: () => run(() => navigate({ type: 'audit-log' })),            isActive: view.type === 'audit-log',  level: 0 },
      { id: 'planning',          label: strings.commandPalette.labels.planning,      keywords: 'planning calendrier campagnes proof test t0 t1 échéances',                                                      Icon: CalendarDays,onSelect: () => run(() => navigate({ type: 'planning' })),             isActive: view.type === 'planning',   level: 0 },
      { id: 'engine',            label: strings.commandPalette.labels.engine,        keywords: 'engine compute solver markov monte carlo python backend quant',                                                   Icon: Cpu,         onSelect: () => run(() => navigate({ type: 'engine' })),               isActive: view.type === 'engine',     level: 0 },
      { id: 'docs',              label: strings.commandPalette.labels.docs,          keywords: 'docs documentation aide help manuel guide moteur calcul architecture verification exploitation rapport',          Icon: BookOpenText,onSelect: () => run(onOpenDocs),                                       isActive: view.type === 'docs',       level: 0 },
      { id: 'settings',          label: strings.commandPalette.labels.settings,      keywords: 'settings paramètres',                                                                                            Icon: Settings,    onSelect: () => run(onOpenSettings),                                   isActive: view.type === 'settings',   level: 0 },
    ],
  }

  // ── Search results group (live, when query is non-empty) ────────────────────

  const libraryTemplates = useMemo(
    () => [...builtinTemplates, ...allProjectTemplates, ...userTemplates],
    [allProjectTemplates, builtinTemplates, userTemplates],
  )

  const searchIndex = useMemo(
    () => buildSearchIndex(projects, revisions, libraryTemplates),
    [libraryTemplates, projects, revisions],
  )

  const searchResultsGroup: CommandGroup | null = search.trim()
    ? {
        heading: strings.commandPalette.groups.searchResults,
        items: filterSearchResults(searchIndex, search, { limit: 10 }).map(result => ({
          id: `search-${result.id}`,
          label: result.title,
          keywords: `${result.keywords} ${result.context} ${result.subtitle}`,
          Icon: getSearchResultIcon(result.kind),
          onSelect: () => run(() => openSearchResult(result, { navigate, selectComponent })),
          isActive: false,
          meta: result.context,
          level: 0 as const,
        })),
      }
    : null

  // ── Filter + flatten ────────────────────────────────────────────────────────

  const filterItems = (items: CommandItem[]): CommandItem[] => {
    if (!search.trim()) return items
    const q = search.toLowerCase()
    return items.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.keywords.toLowerCase().includes(q) ||
      (item.meta?.toLowerCase().includes(q) ?? false),
    )
  }

  const rawGroups: CommandGroup[] = [
    ...(searchResultsGroup ? [searchResultsGroup] : []),
    ...(currentViewGroup   ? [currentViewGroup]   : []),
    createGroup,
    projectsGroup,
    sifsGroup,
    generalGroup,
  ]

  const groups = rawGroups
    .map(group => ({ ...group, items: filterItems(group.items) }))
    .filter(group => group.items.length > 0)

  let flatIdx = 0
  const indexedGroups: IndexedGroup[] = groups.map(group => ({
    ...group,
    items: group.items.map(item => ({ ...item, flatIndex: flatIdx++ })),
  }))

  const visibleItems: IndexedItem[] = indexedGroups.flatMap(g => g.items)

  return { indexedGroups, visibleItems, currentProject, currentSif, currentTab }
}
