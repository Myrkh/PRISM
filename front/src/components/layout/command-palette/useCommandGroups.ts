/**
 * useCommandGroups — builds command palette groups from current app state.
 * Supports 5 modes driven by prefix characters (see modes.ts).
 *
 * Heavy sub-sections are extracted into dedicated modules:
 *   useSymbolGroups — '@' mode (SIF components + Library templates)
 *   buildHelpGroups — '?' mode (modes, shortcuts, command help, docs)
 */
import { useEffect, useMemo, useState } from 'react'
import { getEffectiveKeybinding } from '@/core/shortcuts/defaults'
import {
  Activity, BarChart3, BookOpen, BookOpenText, CalendarDays, ClipboardCheck,
  Clock, Cpu, FileCode2, FileImage, FileText, FilePlus, FlaskConical,
  FolderPlus, LayoutDashboard, Network, Pencil, Search, Settings,
  Shield, Zap,
} from 'lucide-react'
import { useAppLocale, useLocaleStrings } from '@/i18n/useLocale'
import type { AppLocale } from '@/i18n/types'
import { getShellStrings } from '@/i18n/shell'
import { getSettingsStrings } from '@/i18n/settings'
import { useAppStore, type SIFTab } from '@/store/appStore'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { toast } from '@/components/ui/toast'
import { getDocChapters, getDocGroups } from '@/docs'
import { normalizeSIFTab, PRISM_EDITABLE_FILES } from '@/store/types'
import { getSearchResultIcon } from '@/components/search/searchMeta'
import { buildDocBlockId } from '@/components/docs/DocsNavigation'
import { buildSettingsPaletteGroups } from '@/core/settings/palette'
import { buildRegisteredPaletteItems } from '@/core/commands/registry'
import { buildUserCommandPaletteItems } from '@/core/commands/userCommands'
import { buildSearchIndex, filterSearchResults, openSearchResult } from '@/features/search/searchIndex'
import { useComponentLibrary } from '@/features/library'
import { useSymbolGroups } from './useSymbolGroups'
import { buildHelpGroups } from './helpGroups'
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
  const strings         = useLocaleStrings(getShellStrings)
  const settingsStrings = useLocaleStrings(getSettingsStrings)
  const locale          = useAppLocale()

  const docChapters   = useMemo(() => getDocChapters(locale), [locale])
  const docGroupLabels = useMemo(
    () => new Map(getDocGroups(locale).map(group => [group.id, group.label])),
    [locale],
  )

  const projects        = useAppStore(s => s.projects)
  const revisions       = useAppStore(s => s.revisions)
  const view            = useAppStore(s => s.view)
  const isDark          = useAppStore(s => s.isDark)
  const preferences     = useAppStore(s => s.preferences)
  const userCommands    = useAppStore(s => s.preferences.userCommands)
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
  const recentItems     = useAppStore(s => s.preferences.recentItems)
  const chatPanelOpen   = useAppStore(s => s.chatPanelOpen)

  const workspaceNodes = useWorkspaceStore(s => Object.values(s.nodes))

  const { builtinTemplates, allProjectTemplates, userTemplates } = useComponentLibrary(null)
  const libraryTemplates = useMemo(
    () => [...builtinTemplates, ...allProjectTemplates, ...userTemplates],
    [builtinTemplates, allProjectTemplates, userTemplates],
  )

  const currentProjectId = view.type === 'sif-dashboard' ? view.projectId : null
  const currentSifId     = view.type === 'sif-dashboard' ? view.sifId : null
  const currentProject   = currentProjectId ? (projects.find(p => p.id === currentProjectId) ?? null) : null
  const currentSif       = currentProject && currentSifId ? (currentProject.sifs.find(s => s.id === currentSifId) ?? null) : null
  const currentTab       = view.type === 'sif-dashboard' ? normalizeSIFTab(view.tab) : null
  const isSplitActive    = !!secondSlot

  const goToTab = (tab: SIFTab) => run(() => setTab(tab))

  const kb = (id: string) => getEffectiveKeybinding(id, preferences.userKeybindings) || undefined

  // ── Debounced search — input stays instant, filtering is 150ms delayed ────

  const [debouncedSearch, setDebouncedSearch] = useState(search)
  useEffect(() => {
    if (!search.trim()) {
      setDebouncedSearch('')
      return
    }
    const timer = setTimeout(() => setDebouncedSearch(search), 150)
    return () => clearTimeout(timer)
  }, [search])

  // ── Helpers ──────────────────────────────────────────────────────────────

  const filterItems = (items: CommandItem[]): CommandItem[] => {
    if (!debouncedSearch.trim()) return items
    const q = debouncedSearch.toLowerCase()
    return items.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.keywords.toLowerCase().includes(q) ||
      (item.meta?.toLowerCase().includes(q) ?? false),
    )
  }

  const openDocsTarget = (chapterId: string, blockId?: string) => run(() => {
    navigate({ type: 'docs' })
    window.setTimeout(() => {
      document.dispatchEvent(new CustomEvent('prism:docs:navigate', {
        detail: { chapterId, blockId },
      }))
    }, 40)
  })

  // ── Current SIF navigation ────────────────────────────────────────────────

  const currentViewGroup: CommandGroup | null = currentSif && currentProject ? {
    heading: strings.commandPalette.groups.currentView(currentSif.sifNumber, currentSif.title),
    items: [
      { id: 'goto-cockpit',      label: strings.commandPalette.labels.goCockpit,          keywords: 'go cockpit dashboard overview accueil tableau bord',         Icon: LayoutDashboard, onSelect: () => goToTab('cockpit'),      isActive: currentTab === 'cockpit',      level: 0 },
      { id: 'goto-context',      label: strings.commandPalette.labels.goContext,           keywords: 'go context contexte hazop lopa srs',                        Icon: ClipboardCheck,  onSelect: () => goToTab('context'),      isActive: currentTab === 'context',      level: 0 },
      { id: 'goto-architecture', label: strings.commandPalette.labels.goArchitecture,      keywords: 'go architecture loop editor éditeur boucle',                 Icon: Network,         onSelect: () => goToTab('architecture'), isActive: currentTab === 'architecture', level: 0 },
      { id: 'goto-verification', label: strings.commandPalette.labels.goVerification,      keywords: 'go verification calculs pfd sil conformité',                 Icon: BarChart3,       onSelect: () => goToTab('verification'), isActive: currentTab === 'verification', level: 0 },
      { id: 'goto-exploitation', label: strings.commandPalette.labels.goExploitation,      keywords: 'go exploitation proof test campagne',                        Icon: FlaskConical,    onSelect: () => goToTab('exploitation'), isActive: currentTab === 'exploitation', level: 0 },
      { id: 'goto-report',       label: strings.commandPalette.labels.goReport,            keywords: 'go report rapport publication pdf dossier',                  Icon: FileText,        onSelect: () => goToTab('report'),       isActive: currentTab === 'report',       level: 0 },
      { id: 'edit-sif',          label: strings.commandPalette.labels.editCurrentSif,      keywords: 'edit modify modifier sif courante',                          Icon: Pencil,          onSelect: () => run(() => openEditSIF(currentSif.id)),         isActive: false, level: 0 },
      { id: 'edit-project',      label: strings.commandPalette.labels.editCurrentProject,  keywords: 'edit modify modifier projet courant',                        Icon: Pencil,          onSelect: () => run(() => openEditProject(currentProject.id)), isActive: false, meta: currentProject.name, level: 0 },
    ],
  } : null

  const currentActionsGroup: CommandGroup | null = currentViewGroup
    ? { heading: currentViewGroup.heading, items: currentViewGroup.items.filter(item => item.id.startsWith('edit-')) }
    : null

  // ── Create ────────────────────────────────────────────────────────────────

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
      {
        id: 'new-note',
        label: strings.commandPalette.labels.createNote,
        keywords: 'create new note markdown notes workspace créer nouvelle note',
        Icon: FileText,
        onSelect: () => run(() => {
          const ws = useWorkspaceStore.getState()
          const id = ws.createNote(null, 'New Note')
          ws.openTab(id)
          navigate({ type: 'note', noteId: id })
          toast.success(strings.commandPalette.labels.createNote)
        }),
        isActive: false,
        level: 0,
      },
      {
        id: 'new-folder',
        label: strings.commandPalette.labels.createFolder,
        keywords: 'create new folder dossier répertoire workspace créer nouveau',
        Icon: FolderPlus,
        onSelect: () => run(() => {
          useWorkspaceStore.getState().createFolder(null, 'New Folder')
          toast.success(strings.commandPalette.labels.createFolder)
        }),
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

  // ── General & Layout (commands delegated to registry) ────────────────────

  const paletteContext = {
    strings,
    view,
    preferences,
    isDark,
    chatPanelOpen,
    leftPanelOpen,
    rightPanelOpen,
    focusMode,
    isSplitActive,
    search,
    getShortcut: kb,
  }

  const generalGroup: CommandGroup = {
    heading: strings.commandPalette.groups.general,
    items: buildRegisteredPaletteItems('general', paletteContext),
  }

  const layoutGroup: CommandGroup = {
    heading: strings.commandPalette.groups.layout,
    items: buildRegisteredPaletteItems('layout', paletteContext),
  }

  // ── User commands ─────────────────────────────────────────────────────────

  const userCommandsGroup: CommandGroup | null = userCommands.length > 0
    ? { heading: strings.commandPalette.groups.userCommands, items: buildUserCommandPaletteItems(userCommands) }
    : null

  // ── Library (default + commands mode) ────────────────────────────────────

  const libraryGroup: CommandGroup = {
    heading: strings.commandPalette.groups.library,
    items: [
      { id: 'library-browse',                   label: strings.commandPalette.labels.masterLibrary,          keywords: 'library bibliothèque catalogue navigation',                                         Icon: BookOpen,     onSelect: () => run(onOpenLibrary),                                                            isActive: view.type === 'library',                                                            meta: strings.commandPalette.meta.library, level: 0 },
      { id: 'library-navigate-builtin',          label: strings.commandPalette.labels.libraryBuiltin,         keywords: 'library bibliothèque standards intégrés built-in iec isa navigation',               Icon: BookOpenText, onSelect: () => run(() => navigate({ type: 'library', origin: 'builtin' })),                   isActive: view.type === 'library' && (view as { origin?: string }).origin === 'builtin',      level: 0 },
      { id: 'library-navigate-user-templates',   label: strings.commandPalette.labels.libraryUserTemplates,   keywords: 'library bibliothèque mes templates personnels user navigation',                     Icon: BookOpen,     onSelect: () => run(() => navigate({ type: 'library', origin: 'user' })),                      isActive: view.type === 'library' && (view as { origin?: string }).origin === 'user',         level: 0 },
      { id: 'library-navigate-project-templates',label: strings.commandPalette.labels.libraryProjectTemplates,keywords: 'library bibliothèque templates projet project shared navigation',                   Icon: BookOpen,     onSelect: () => run(() => navigate({ type: 'library', origin: 'project' })),                   isActive: view.type === 'library' && (view as { origin?: string }).origin === 'project',      level: 0 },
      { id: 'library-new-sensor',                label: strings.commandPalette.labels.libraryNewSensor,       keywords: 'library new sensor capteur créer nouveau template transmitter switch',               Icon: Activity,     onSelect: () => run(() => navigate({ type: 'library', action: 'create-sensor' })),             isActive: false, separator: true, level: 0 },
      { id: 'library-new-logic',                 label: strings.commandPalette.labels.libraryNewLogic,        keywords: 'library new logic logique solveur plc solver créer nouveau template',               Icon: Cpu,          onSelect: () => run(() => navigate({ type: 'library', action: 'create-logic' })),              isActive: false, level: 0 },
      { id: 'library-new-actuator',              label: strings.commandPalette.labels.libraryNewActuator,     keywords: 'library new actuator actionneur valve vanne créer nouveau template',                Icon: Zap,          onSelect: () => run(() => navigate({ type: 'library', action: 'create-actuator' })),           isActive: false, level: 0 },
    ],
  }

  const libraryActionsGroup: CommandGroup = {
    heading: strings.commandPalette.groups.library,
    items: libraryGroup.items.filter(item => item.id.startsWith('library-new-')),
  }

  // ── Settings actions (commands delegated to core/settings/palette) ────────

  const settingsActionGroups: CommandGroup[] = buildSettingsPaletteGroups({
    shellStrings:    strings,
    settingsStrings,
    preferences,
    currentSection:  view.type === 'settings' ? view.section : null,
    run,
    navigateToSection: section => navigate({ type: 'settings', section }),
  })

  // ── Workspace nodes (# mode) ──────────────────────────────────────────────

  const workspaceDocsGroup: CommandGroup = {
    heading: strings.commandPalette.groups.workspace,
    items: workspaceNodes
      .filter(n => n.type === 'note' || n.type === 'pdf' || n.type === 'image' || n.type === 'json')
      .map(node => {
        const Icon = node.type === 'note' ? FileText
          : node.type === 'pdf'   ? BookOpen
          : node.type === 'json'  ? FileCode2
          : FileImage
        const meta = node.type === 'note' ? 'Note'
          : node.type === 'pdf'   ? 'PDF'
          : node.type === 'json'  ? 'JSON'
          : 'Image'
        return {
          id: `ws-${node.id}`,
          label: node.name,
          keywords: `workspace ${node.type} ${node.name}`,
          Icon,
          meta,
          onSelect: () => run(() => {
            if (node.type === 'note') {
              useWorkspaceStore.getState().openTab(node.id)
              navigate({ type: 'note', noteId: node.id })
            } else {
              useWorkspaceStore.getState().openTab(node.id)
              navigate({ type: 'workspace-file', nodeId: node.id })
            }
          }),
          isActive: false,
          level: 0 as const,
        }
      }),
  }

  const prismFilesGroup: CommandGroup = {
    heading: strings.commandPalette.groups.prismFiles,
    items: [...PRISM_EDITABLE_FILES, 'sif-registry.md' as const].map(filename => ({
      id: `prism-${filename}`,
      label: filename,
      keywords: `prism fichier workspace ${filename} context conventions standards registry registre sif`.toLowerCase(),
      Icon: FileCode2,
      meta: filename === 'context.md'
        ? (locale === 'fr' ? 'Contexte projet' : 'Project context')
        : filename === 'conventions.md'
          ? (locale === 'fr' ? 'Conventions' : 'Conventions')
          : filename === 'standards.md'
            ? (locale === 'fr' ? 'Normes applicables' : 'Applicable standards')
            : (locale === 'fr' ? 'Registre SIF généré' : 'Generated SIF registry'),
      onSelect: () => run(() => navigate({ type: 'prism-file', filename })),
      isActive: view.type === 'prism-file' && view.filename === filename,
      level: 0 as const,
    })),
  }

  // ── Search results (default + non-help modes when query non-empty) ────────

  const searchIndex = useMemo(
    () => buildSearchIndex(projects, revisions, libraryTemplates, workspaceNodes),
    [libraryTemplates, projects, revisions, workspaceNodes],
  )

  const searchResultsGroup: CommandGroup | null = debouncedSearch.trim() && mode !== 'help'
    ? {
        heading: strings.commandPalette.groups.searchResults,
        items: filterSearchResults(searchIndex, debouncedSearch, { limit: 10 }).map(result => ({
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

  // ── Recent items (default mode, no query) ─────────────────────────────────

  const recentGroup: CommandGroup | null = recentItems.length > 0 && !debouncedSearch.trim()
    ? {
        heading: strings.commandPalette.groups.recent,
        items: recentItems.slice(0, 8).map(item => {
          const isImage = item.kind === 'workspace-file' && /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(item.label)
          const isPdf   = item.kind === 'workspace-file' && /\.pdf$/i.test(item.label)
          const Icon =
            item.kind === 'sif'            ? Shield   :
            item.kind === 'note'           ? FileText :
            isImage                        ? FileImage :
            isPdf                          ? FileText :
            item.kind === 'workspace-file' ? FileText :
            item.kind === 'project'        ? FolderPlus :
            Clock
          return {
            id: `recent-${item.kind}-${item.id}`,
            label: item.label,
            keywords: `recent ${item.kind} ${item.label} ${item.subtitle ?? ''}`,
            Icon,
            meta: item.subtitle,
            onSelect: () => run(() => navigate(item.view)),
            isActive: false,
            level: 0 as const,
          }
        }),
      }
    : null

  // ── Symbol groups (@ mode) — extracted hook ───────────────────────────────

  const symbolGroups = useSymbolGroups(run)

  // ── Help groups (? mode) — extracted builder ──────────────────────────────

  const helpGroups = buildHelpGroups({
    locale,
    strings,
    preferences,
    docChapters,
    docGroupLabels,
    currentProject,
    setSearch,
    openDocsTarget,
  })

  // ── Assemble groups by mode ───────────────────────────────────────────────

  let rawGroups: CommandGroup[]

  if (mode === 'commands') {
    rawGroups = [
      ...(currentActionsGroup ? [currentActionsGroup] : []),
      createGroup,
      ...(userCommandsGroup ? [userCommandsGroup] : []),
      libraryActionsGroup,
      ...settingsActionGroups,
      generalGroup,
      layoutGroup,
    ]
  } else if (mode === 'sif') {
    rawGroups = [sifsGroup, workspaceDocsGroup, prismFilesGroup]
  } else if (mode === 'symbols') {
    rawGroups = symbolGroups
  } else if (mode === 'help') {
    rawGroups = helpGroups
  } else {
    rawGroups = [
      ...(recentGroup        ? [recentGroup]        : []),
      ...(searchResultsGroup ? [searchResultsGroup] : []),
      ...(currentViewGroup   ? [currentViewGroup]   : []),
      createGroup,
      projectsGroup,
      sifsGroup,
      libraryGroup,
      ...(debouncedSearch.trim() ? settingsActionGroups : []),
      generalGroup,
    ]
  }

  // ── Filter + flatten ──────────────────────────────────────────────────────

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
