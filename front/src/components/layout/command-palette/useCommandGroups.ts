/**
 * useCommandGroups — builds command palette groups from current app state.
 * Supports 5 modes driven by prefix characters (see modes.ts).
 */
import { useMemo } from 'react'
import { getEffectiveKeybinding } from '@/core/shortcuts/defaults'
import {
  LayoutDashboard, Network, BarChart3, Shield, FlaskConical,
  FileText, Home, Pencil, History, ClipboardCheck, CalendarDays,
  Cpu, BookOpen, BookOpenText, FolderPlus, FilePlus, Search, Settings,
  Moon, Sun, PanelLeftOpen, PanelLeftClose, PanelRightOpen, PanelRightClose,
  Maximize2, Minimize2, Columns2, Hash, AtSign, HelpCircle, Terminal,
  SidebarClose, FlipHorizontal2, AlignCenter, ArrowUpToLine, PanelBottomClose, PanelBottomOpen,
} from 'lucide-react'
import { useLocaleStrings } from '@/i18n/useLocale'
import { getShellStrings } from '@/i18n/shell'
import { useAppStore, type SIFTab } from '@/store/appStore'
import { normalizeSIFTab } from '@/store/types'
import { getSearchResultIcon } from '@/components/search/searchMeta'
import { useComponentLibrary } from '@/features/library'
import { buildSearchIndex, filterSearchResults, openSearchResult } from '@/features/search/searchIndex'
import type { CommandMode } from './modes'
import type { CommandGroup, CommandItem, IndexedGroup, IndexedItem } from './types'

interface UseCommandGroupsOptions {
  search: string
  mode: CommandMode
  run: (fn: () => void) => void
  /** Switches the input text without closing (used for ? mode). */
  setSearch: (s: string) => void
  onOpenSettings: () => void
  onOpenDocs: () => void
  onOpenSearch: () => void
  onOpenLibrary: () => void
}

export function useCommandGroups({
  search,
  mode,
  run,
  setSearch,
  onOpenSettings,
  onOpenDocs,
  onOpenSearch,
  onOpenLibrary,
}: UseCommandGroupsOptions) {
  const strings = useLocaleStrings(getShellStrings)

  const projects        = useAppStore(s => s.projects)
  const revisions       = useAppStore(s => s.revisions)
  const view            = useAppStore(s => s.view)
  const isDark          = useAppStore(s => s.isDark)
  const preferences     = useAppStore(s => s.preferences)
  const toggleTheme     = useAppStore(s => s.toggleTheme)
  const navigate        = useAppStore(s => s.navigate)
  const setTab          = useAppStore(s => s.setTab)
  const openNewProject  = useAppStore(s => s.openNewProject)
  const openNewSIF      = useAppStore(s => s.openNewSIF)
  const openEditProject = useAppStore(s => s.openEditProject)
  const openEditSIF     = useAppStore(s => s.openEditSIF)
  const selectComponent = useAppStore(s => s.selectComponent)
  const leftPanelOpen   = useAppStore(s => s.leftPanelOpen)
  const rightPanelOpen  = useAppStore(s => s.rightPanelOpen)
  const focusMode       = useAppStore(s => s.focusMode)
  const secondSlot      = useAppStore(s => s.secondSlot)
  const toggleLeftPanel  = useAppStore(s => s.toggleLeftPanel)
  const toggleRightPanel = useAppStore(s => s.toggleRightPanel)
  const toggleFocusMode  = useAppStore(s => s.toggleFocusMode)
  const toggleStatusBar        = useAppStore(s => s.toggleStatusBar)
  const toggleActivityBar      = useAppStore(s => s.toggleActivityBar)
  const togglePanelsInverted   = useAppStore(s => s.togglePanelsInverted)
  const toggleCenteredLayout   = useAppStore(s => s.toggleCenteredLayout)
  const setCommandPalettePos   = useAppStore(s => s.setCommandPalettePosition)
  const openSecondSlot         = useAppStore(s => s.openSecondSlot)
  const closeSecondSlot        = useAppStore(s => s.closeSecondSlot)

  const { builtinTemplates, allProjectTemplates, userTemplates } = useComponentLibrary(null)

  const currentProjectId = view.type === 'sif-dashboard' ? view.projectId : null
  const currentSifId     = view.type === 'sif-dashboard' ? view.sifId : null
  const currentProject   = currentProjectId ? projects.find(p => p.id === currentProjectId) ?? null : null
  const currentSif       = currentProject && currentSifId ? currentProject.sifs.find(s => s.id === currentSifId) ?? null : null
  const currentTab       = view.type === 'sif-dashboard' ? normalizeSIFTab(view.tab) : null
  const isSplitActive    = !!secondSlot

  const goToTab = (tab: SIFTab) => run(() => setTab(tab))

  // ── Helpers ──────────────────────────────────────────────────────────────

  const filterItems = (items: CommandItem[]): CommandItem[] => {
    if (!search.trim()) return items
    const q = search.toLowerCase()
    return items.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.keywords.toLowerCase().includes(q) ||
      (item.meta?.toLowerCase().includes(q) ?? false),
    )
  }

  // ── SIF navigation (default + commands mode) ──────────────────────────────

  const currentViewGroup: CommandGroup | null = currentSif && currentProject ? {
    heading: strings.commandPalette.groups.currentView(currentSif.sifNumber, currentSif.title),
    items: [
      { id: 'goto-cockpit',       label: strings.commandPalette.labels.goCockpit,       keywords: 'go cockpit dashboard overview accueil tableau bord',              Icon: LayoutDashboard, onSelect: () => goToTab('cockpit'),       isActive: currentTab === 'cockpit',       level: 0 },
      { id: 'goto-context',       label: strings.commandPalette.labels.goContext,        keywords: 'go context contexte hazop lopa srs',                              Icon: ClipboardCheck,  onSelect: () => goToTab('context'),       isActive: currentTab === 'context',       level: 0 },
      { id: 'goto-architecture',  label: strings.commandPalette.labels.goArchitecture,   keywords: 'go architecture loop editor éditeur boucle',                       Icon: Network,         onSelect: () => goToTab('architecture'),  isActive: currentTab === 'architecture',  level: 0 },
      { id: 'goto-verification',  label: strings.commandPalette.labels.goVerification,   keywords: 'go verification calculs pfd sil conformité',                       Icon: BarChart3,       onSelect: () => goToTab('verification'),  isActive: currentTab === 'verification',  level: 0 },
      { id: 'goto-exploitation',  label: strings.commandPalette.labels.goExploitation,   keywords: 'go exploitation proof test campagne',                              Icon: FlaskConical,    onSelect: () => goToTab('exploitation'),  isActive: currentTab === 'exploitation',  level: 0 },
      { id: 'goto-report',        label: strings.commandPalette.labels.goReport,         keywords: 'go report rapport publication pdf dossier',                        Icon: FileText,        onSelect: () => goToTab('report'),        isActive: currentTab === 'report',        level: 0 },
      { id: 'edit-sif',           label: strings.commandPalette.labels.editCurrentSif,   keywords: 'edit modify modifier sif courante',                                Icon: Pencil,          onSelect: () => run(() => openEditSIF(currentSif.id)),            isActive: false, level: 0 },
      { id: 'edit-project',       label: strings.commandPalette.labels.editCurrentProject, keywords: 'edit modify modifier projet courant',                            Icon: Pencil,          onSelect: () => run(() => openEditProject(currentProject.id)),    isActive: false, meta: currentProject.name, level: 0 },
    ],
  } : null

  // ── Create ────────────────────────────────────────────────────────────────

  const createGroup: CommandGroup = {
    heading: strings.commandPalette.groups.create,
    items: [
      { id: 'new-project', label: strings.commandPalette.labels.newProject,   keywords: 'create new project créer nouveau projet',   Icon: FolderPlus, onSelect: () => run(openNewProject), isActive: false, level: 0 },
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

  // ── Projects & SIFs (default + # mode) ───────────────────────────────────

  const projectsGroup: CommandGroup = {
    heading: strings.commandPalette.groups.projects,
    items: projects.map(project => ({
      id: `project-${project.id}`,
      label: project.name,
      keywords: `project projet ${project.name} ${project.ref ?? ''} ${project.client ?? ''}`,
      Icon: FolderPlus,
      onSelect: () => run(() => {
        const firstSif = project.sifs[0]
        if (firstSif) navigate({ type: 'sif-dashboard', projectId: project.id, sifId: firstSif.id, tab: 'cockpit' })
        else navigate({ type: 'projects' })
      }),
      isActive: currentProjectId === project.id,
      meta: project.ref ?? project.client ?? undefined,
      level: 0 as const,
    })),
  }

  const sifsGroup: CommandGroup = {
    heading: strings.commandPalette.groups.sifs,
    items: projects.flatMap(project =>
      project.sifs.map(sif => ({
        id: `sif-${sif.id}`,
        label: `${sif.sifNumber}${sif.title ? ` — ${sif.title}` : ''}`,
        keywords: `sif ${sif.sifNumber} ${sif.title ?? ''} ${sif.processTag ?? ''} ${project.name}`,
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

  // ── General (default + commands mode) ────────────────────────────────────

  const generalGroup: CommandGroup = {
    heading: strings.commandPalette.groups.general,
    items: [
      { id: 'home',           label: strings.commandPalette.labels.home,          keywords: 'home accueil projets dashboard',                                                    Icon: Home,        onSelect: () => run(() => navigate({ type: 'projects' })),   isActive: view.type === 'projects',  level: 0 },
      { id: 'search',         label: strings.commandPalette.labels.globalSearch,  keywords: 'search recherche globale palette composants',                                       Icon: Search,      onSelect: () => run(onOpenSearch),                           isActive: view.type === 'search',    meta: search.trim() ? strings.commandPalette.meta.continueSearch(search.trim()) : strings.commandPalette.meta.exploreSearch, level: 0 },
      { id: 'library',        label: strings.commandPalette.labels.masterLibrary, keywords: 'library bibliothèque catalogue composants templates standards lambda_db',           Icon: BookOpen,    onSelect: () => run(onOpenLibrary),                          isActive: view.type === 'library',   meta: strings.commandPalette.meta.library, level: 0 },
      { id: 'toggle-theme',   label: isDark ? strings.commandPalette.labels.switchToLight : strings.commandPalette.labels.switchToDark, keywords: 'theme dark light mode thème sombre clair', Icon: isDark ? Sun : Moon, onSelect: () => run(toggleTheme), isActive: false, level: 0 },
      { id: 'audit-log',      label: strings.commandPalette.labels.auditLog,      keywords: 'audit log historique timeline traçabilité',                                         Icon: History,     onSelect: () => run(() => navigate({ type: 'audit-log' })),  isActive: view.type === 'audit-log', level: 0 },
      { id: 'planning',       label: strings.commandPalette.labels.planning,      keywords: 'planning calendrier campagnes proof test échéances',                                Icon: CalendarDays,onSelect: () => run(() => navigate({ type: 'planning' })),   isActive: view.type === 'planning',  level: 0 },
      { id: 'engine',         label: strings.commandPalette.labels.engine,        keywords: 'engine compute solver markov monte carlo backend quantitatif',                      Icon: Cpu,         onSelect: () => run(() => navigate({ type: 'engine' })),     isActive: view.type === 'engine',    level: 0 },
      { id: 'docs',           label: strings.commandPalette.labels.docs,          keywords: 'docs documentation aide help manuel guide moteur calcul architecture verification', Icon: BookOpenText,onSelect: () => run(onOpenDocs),                             isActive: view.type === 'docs',      level: 0 },
      { id: 'settings',       label: strings.commandPalette.labels.settings,      keywords: 'settings paramètres préférences',                                                   Icon: Settings,    onSelect: () => run(onOpenSettings),                         isActive: view.type === 'settings',  level: 0 },
      { id: 'settings-general',    label: 'Settings: General',           keywords: 'settings paramètres général langue thème',             Icon: Settings,      onSelect: () => run(() => navigate({ type: 'settings', section: 'general' })),    isActive: view.type === 'settings' && (view as { section?: string }).section === 'general',    level: 0 },
      { id: 'settings-workspace',  label: 'Settings: Workspace',         keywords: 'settings workspace panneaux largeur',                  Icon: Settings,      onSelect: () => run(() => navigate({ type: 'settings', section: 'workspace' })),  isActive: view.type === 'settings' && (view as { section?: string }).section === 'workspace',  level: 0 },
      { id: 'settings-engine',     label: 'Settings: Engine',            keywords: 'settings engine moteur calcul tolérance',              Icon: Cpu,           onSelect: () => run(() => navigate({ type: 'settings', section: 'engine' })),     isActive: view.type === 'settings' && (view as { section?: string }).section === 'engine',     level: 0 },
      { id: 'settings-shortcuts',  label: 'Settings: Keyboard Shortcuts', keywords: 'settings raccourcis clavier keyboard shortcuts keybinding',Icon: Settings,   onSelect: () => run(() => navigate({ type: 'settings', section: 'shortcuts' })), isActive: view.type === 'settings' && (view as { section?: string }).section === 'shortcuts',  level: 0 },
    ],
  }

  // ── Layout & Visibility (commands mode only) ──────────────────────────────

  const ukb = preferences.userKeybindings
  const kb = (id: string) => getEffectiveKeybinding(id, ukb) || undefined

  const layoutGroup: CommandGroup = {
    heading: strings.commandPalette.groups.layout,
    items: [
      // ── Panels ──
      {
        id: 'layout-left-panel',
        label: strings.commandPalette.labels.toggleLeftPanel,
        keywords: 'left panel sidebar toggle visibility panneau gauche customize layout disposition',
        Icon: leftPanelOpen ? PanelLeftClose : PanelLeftOpen,
        onSelect: () => run(toggleLeftPanel),
        isActive: leftPanelOpen,
        shortcut: kb('toggleLeftPanel'),
        level: 0,
      },
      {
        id: 'layout-right-panel',
        label: strings.commandPalette.labels.toggleRightPanel,
        keywords: 'right panel properties toggle visibility panneau droit customize layout disposition',
        Icon: rightPanelOpen ? PanelRightClose : PanelRightOpen,
        onSelect: () => run(toggleRightPanel),
        isActive: rightPanelOpen,
        shortcut: kb('toggleRightPanel'),
        level: 0,
      },
      {
        id: 'layout-activity-bar',
        label: strings.commandPalette.labels.toggleActivityBar,
        keywords: 'activity bar rail icônes gauche masquer customize layout disposition sidebar',
        Icon: SidebarClose,
        onSelect: () => run(toggleActivityBar),
        isActive: preferences.activityBarVisible,
        level: 0,
      },
      // ── View modes ──
      {
        id: 'layout-zen',
        label: strings.commandPalette.labels.zenMode,
        keywords: 'zen focus fullscreen plein écran masquer panneaux customize layout disposition',
        Icon: focusMode ? Minimize2 : Maximize2,
        onSelect: () => run(toggleFocusMode),
        isActive: focusMode,
        shortcut: kb('toggleFocusMode'),
        separator: true,
        level: 0,
      },
      {
        id: 'layout-split',
        label: strings.commandPalette.labels.splitView,
        keywords: 'split view vue côte à côte deux sif compare customize layout disposition',
        Icon: Columns2,
        onSelect: () => run(isSplitActive ? closeSecondSlot : openSecondSlot),
        isActive: isSplitActive,
        shortcut: kb('toggleSplitView'),
        level: 0,
      },
      // ── Appearance ──
      {
        id: 'layout-status-bar',
        label: strings.commandPalette.labels.toggleStatusBar,
        keywords: 'status bar barre statut sil pfd footer toggle visibility customize layout disposition',
        Icon: preferences.statusBarVisible ? PanelBottomClose : PanelBottomOpen,
        onSelect: () => run(toggleStatusBar),
        isActive: preferences.statusBarVisible,
        shortcut: kb('toggleStatusBar'),
        separator: true,
        level: 0,
      },
      {
        id: 'layout-invert-panels',
        label: strings.commandPalette.labels.invertPanels,
        keywords: 'invert panels inverser panneaux swap gauche droite customize layout disposition',
        Icon: FlipHorizontal2,
        onSelect: () => run(togglePanelsInverted),
        isActive: preferences.panelsInverted,
        level: 0,
      },
      {
        id: 'layout-centered',
        label: strings.commandPalette.labels.centeredLayout,
        keywords: 'centered layout centré disposition largeur max centered editor vscode customize',
        Icon: AlignCenter,
        onSelect: () => run(toggleCenteredLayout),
        isActive: preferences.centeredLayout,
        shortcut: kb('toggleCenteredLayout'),
        level: 0,
      },
      // ── Command Palette position ──
      {
        id: 'layout-palette-top',
        label: strings.commandPalette.labels.commandPaletteTop,
        keywords: 'palette position top haute header customize layout disposition',
        Icon: ArrowUpToLine,
        onSelect: () => run(() => setCommandPalettePos('top')),
        isActive: preferences.commandPalettePosition === 'top',
        separator: true,
        level: 0,
      },
      {
        id: 'layout-palette-center',
        label: strings.commandPalette.labels.commandPaletteCenter,
        keywords: 'palette position center centrale flottante floating customize layout disposition',
        Icon: PanelBottomClose,
        onSelect: () => run(() => setCommandPalettePos('center')),
        isActive: preferences.commandPalettePosition === 'center',
        level: 0,
      },
    ],
  }

  // ── Symbols / @ mode — components in current SIF architecture ────────────

  const symbolsGroup: CommandGroup | null = useMemo(() => {
    if (!currentSif || !currentProject) return null
    const items: CommandItem[] = currentSif.subsystems.flatMap(sub =>
      sub.channels.flatMap(ch =>
        ch.components.map(comp => ({
          id: `sym-${comp.id}`,
          label: comp.tagName || comp.instrumentType,
          keywords: `${comp.tagName ?? ''} ${comp.instrumentType} ${sub.label} composant component symbol architecture`,
          Icon: Cpu,
          meta: sub.label,
          onSelect: () => run(() => {
            navigate({ type: 'sif-dashboard', projectId: currentProject.id, sifId: currentSif.id, tab: 'architecture' })
            selectComponent(comp.id)
          }),
          isActive: false,
          level: 0 as const,
        })),
      ),
    )
    if (items.length === 0) return null
    return { heading: strings.commandPalette.groups.symbols, items }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSif, currentProject, strings])

  // ── Help / ? mode ─────────────────────────────────────────────────────────

  const helpGroup: CommandGroup = {
    heading: strings.commandPalette.groups.help,
    items: [
      {
        id: 'help-mode-commands',
        label: '> Commandes & actions',
        keywords: 'commands commandes actions mode help aide',
        Icon: Terminal,
        meta: 'Exécuter des actions, basculer des panneaux, naviguer',
        onSelect: () => setSearch('>'),
        isActive: false,
        level: 0,
      },
      {
        id: 'help-mode-sif',
        label: '# Recherche SIF',
        keywords: 'sif search number numéro titre mode help aide',
        Icon: Hash,
        meta: 'Naviguer directement vers une SIF par numéro',
        onSelect: () => setSearch('#'),
        isActive: false,
        level: 0,
      },
      {
        id: 'help-mode-symbols',
        label: '@ Symboles — composants SIF',
        keywords: 'symbols symboles composants architecture mode help aide',
        Icon: AtSign,
        meta: 'Aller à un composant dans la SIF courante',
        onSelect: () => setSearch('@'),
        isActive: false,
        level: 0,
      },
      {
        id: 'help-shortcut-kb',
        label: 'Ctrl+K — Command palette',
        keywords: 'shortcut raccourci keyboard clavier',
        Icon: HelpCircle,
        meta: 'Ctrl+Shift+P pour le mode commandes directement',
        onSelect: () => { /* no-op */ },
        isActive: false,
        level: 0,
      },
    ],
  }

  // ── Search results (default + commands mode when query non-empty) ─────────

  const libraryTemplates = useMemo(
    () => [...builtinTemplates, ...allProjectTemplates, ...userTemplates],
    [allProjectTemplates, builtinTemplates, userTemplates],
  )
  const searchIndex = useMemo(
    () => buildSearchIndex(projects, revisions, libraryTemplates),
    [libraryTemplates, projects, revisions],
  )
  const searchResultsGroup: CommandGroup | null = search.trim() && mode !== 'help'
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

  // ── Assemble groups by mode ───────────────────────────────────────────────

  let rawGroups: CommandGroup[]

  if (mode === 'commands') {
    // > mode: layout + current SIF nav + create + general
    rawGroups = [
      layoutGroup,
      ...(currentViewGroup ? [currentViewGroup] : []),
      createGroup,
      generalGroup,
    ]
  } else if (mode === 'sif') {
    // # mode: SIFs only (projects as secondary)
    rawGroups = [sifsGroup, projectsGroup]
  } else if (mode === 'symbols') {
    // @ mode: components only
    rawGroups = symbolsGroup ? [symbolsGroup] : []
  } else if (mode === 'help') {
    // ? mode: help items only, no search filtering
    rawGroups = [helpGroup]
  } else {
    // default mode: everything
    rawGroups = [
      ...(searchResultsGroup ? [searchResultsGroup] : []),
      ...(currentViewGroup   ? [currentViewGroup]   : []),
      createGroup,
      projectsGroup,
      sifsGroup,
      generalGroup,
    ]
  }

  // In help mode, never filter (items ARE the mode list)
  const groups = mode === 'help'
    ? rawGroups
    : rawGroups
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
