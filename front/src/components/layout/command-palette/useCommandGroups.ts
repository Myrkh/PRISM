/**
 * useCommandGroups — builds command palette groups from current app state.
 * Supports 5 modes driven by prefix characters (see modes.ts).
 */
import { useMemo } from 'react'
import { getEffectiveKeybinding } from '@/core/shortcuts/defaults'
import {
  LayoutDashboard, Network, BarChart3, Shield, FlaskConical,
  FileText, FileImage, Home, Pencil, History, ClipboardCheck, CalendarDays,
  Cpu, BookOpen, BookOpenText, FolderPlus, FilePlus, Search, Settings, MessageSquare,
  Moon, Sun, PanelLeftOpen, PanelLeftClose, PanelRightOpen, PanelRightClose,
  Maximize2, Minimize2, Columns2, Hash, AtSign, HelpCircle, Terminal,
  SidebarClose, FlipHorizontal2, AlignCenter, ArrowUpToLine, PanelBottomClose, PanelBottomOpen,
  Activity, Zap, Clock, Timer,
} from 'lucide-react'
import { useLocaleStrings } from '@/i18n/useLocale'
import { getShellStrings } from '@/i18n/shell'
import { useAppStore, type SIFTab } from '@/store/appStore'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { toast } from '@/components/ui/toast'
import { DOC_CHAPTERS } from '@/docs'
// useAppStore.getState() used for imperative one-shot updates inside callbacks
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
  const recentItems            = useAppStore(s => s.preferences.recentItems)
  const chatPanelOpen          = useAppStore(s => s.chatPanelOpen)
  const toggleChatPanel        = useAppStore(s => s.toggleChatPanel)
  const chatShortcut           = getEffectiveKeybinding('openChatPanel', preferences.userKeybindings) || undefined

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
      { id: 'new-project', label: strings.commandPalette.labels.newProject, keywords: 'create new project créer nouveau projet', Icon: FolderPlus, onSelect: () => run(openNewProject), isActive: false, level: 0 },
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
      {
        id: 'ai-chat',
        label: strings.commandPalette.labels.aiChat,
        keywords: 'ai chat prism assistant conversation iec 61511 mistral claude',
        Icon: MessageSquare,
        onSelect: () => run(() => { if (!chatPanelOpen) toggleChatPanel() }),
        isActive: chatPanelOpen,
        shortcut: chatShortcut,
        level: 0,
      },
      { id: 'settings',       label: strings.commandPalette.labels.settings,      keywords: 'settings paramètres préférences',                                                   Icon: Settings,    onSelect: () => run(onOpenSettings),                         isActive: view.type === 'settings',  level: 0 },
    ],
  }

  // ── Library (commands mode + default when query matches) ─────────────────

  const libraryGroup: CommandGroup = {
    heading: 'Library',
    items: [
      // Navigate commands
      {
        id: 'library-browse',
        label: strings.commandPalette.labels.masterLibrary,
        keywords: 'library bibliothèque catalogue navigation',
        Icon: BookOpen,
        onSelect: () => run(onOpenLibrary),
        isActive: view.type === 'library',
        meta: strings.commandPalette.meta.library,
        level: 0,
      },
      {
        id: 'library-navigate-builtin',
        label: strings.commandPalette.labels.libraryBuiltin,
        keywords: 'library bibliothèque standards intégrés built-in iec isa navigation',
        Icon: BookOpenText,
        onSelect: () => run(() => navigate({ type: 'library', origin: 'builtin' })),
        isActive: view.type === 'library' && (view as { origin?: string }).origin === 'builtin',
        level: 0,
      },
      {
        id: 'library-navigate-user-templates',
        label: strings.commandPalette.labels.libraryUserTemplates,
        keywords: 'library bibliothèque mes templates personnels user navigation',
        Icon: BookOpen,
        onSelect: () => run(() => navigate({ type: 'library', origin: 'user' })),
        isActive: view.type === 'library' && (view as { origin?: string }).origin === 'user',
        level: 0,
      },
      {
        id: 'library-navigate-project-templates',
        label: strings.commandPalette.labels.libraryProjectTemplates,
        keywords: 'library bibliothèque templates projet project shared navigation',
        Icon: BookOpen,
        onSelect: () => run(() => navigate({ type: 'library', origin: 'project' })),
        isActive: view.type === 'library' && (view as { origin?: string }).origin === 'project',
        level: 0,
      },
      // Create actions
      {
        id: 'library-new-sensor',
        label: strings.commandPalette.labels.libraryNewSensor,
        keywords: 'library new sensor capteur créer nouveau template transmitter switch',
        Icon: Activity,
        onSelect: () => run(() => navigate({ type: 'library', action: 'create-sensor' })),
        isActive: false,
        separator: true,
        level: 0,
      },
      {
        id: 'library-new-logic',
        label: strings.commandPalette.labels.libraryNewLogic,
        keywords: 'library new logic logique solveur plc solver créer nouveau template',
        Icon: Cpu,
        onSelect: () => run(() => navigate({ type: 'library', action: 'create-logic' })),
        isActive: false,
        level: 0,
      },
      {
        id: 'library-new-actuator',
        label: strings.commandPalette.labels.libraryNewActuator,
        keywords: 'library new actuator actionneur valve vanne créer nouveau template',
        Icon: Zap,
        onSelect: () => run(() => navigate({ type: 'library', action: 'create-actuator' })),
        isActive: false,
        level: 0,
      },
    ],
  }

  // ── Settings actions (commands mode + default when query matches) ────────

  const settingsActionsGroup: CommandGroup = {
    heading: 'Settings',
    items: [
      // ── Navigate: Settings sections ──
      {
        id: 'navigate-settings-general',
        label: strings.commandPalette.labels.navigateSettingsGeneral,
        keywords: 'navigate settings general général langue language thème theme',
        Icon: Settings,
        onSelect: () => run(() => navigate({ type: 'settings', section: 'general' })),
        isActive: view.type === 'settings' && (view as { section?: string }).section === 'general',
        level: 0,
      },
      {
        id: 'navigate-settings-workspace',
        label: strings.commandPalette.labels.navigateSettingsWorkspace,
        keywords: 'navigate settings workspace espace travail panneaux largeur panels width',
        Icon: Settings,
        onSelect: () => run(() => navigate({ type: 'settings', section: 'workspace' })),
        isActive: view.type === 'settings' && (view as { section?: string }).section === 'workspace',
        level: 0,
      },
      {
        id: 'navigate-settings-engine',
        label: strings.commandPalette.labels.navigateSettingsEngine,
        keywords: 'navigate settings engine moteur calcul tolérance calculation',
        Icon: Cpu,
        onSelect: () => run(() => navigate({ type: 'settings', section: 'engine' })),
        isActive: view.type === 'settings' && (view as { section?: string }).section === 'engine',
        level: 0,
      },
      {
        id: 'navigate-settings-shortcuts',
        label: strings.commandPalette.labels.navigateSettingsShortcuts,
        keywords: 'navigate settings raccourcis keyboard shortcuts keybinding clavier',
        Icon: Settings,
        onSelect: () => run(() => navigate({ type: 'settings', section: 'shortcuts' })),
        isActive: view.type === 'settings' && (view as { section?: string }).section === 'shortcuts',
        separator: true,
        level: 0,
      },
      // ── Scientific notation toggle ──
      {
        id: 'settings-action-scientific-notation',
        label: preferences.useScientificNotation
          ? strings.commandPalette.labels.settingsScientificNotationOff
          : strings.commandPalette.labels.settingsScientificNotationOn,
        keywords: 'settings notation scientifique scientific exponential pfd lambda toggle',
        Icon: Hash,
        onSelect: () => run(() =>
          useAppStore.getState().updateAppPreferences({ useScientificNotation: !preferences.useScientificNotation }),
        ),
        isActive: preferences.useScientificNotation,
        level: 0,
      },
      // ── Decimal precision ──
      ...(['2', '3', '4', '5', '6'] as const).map((d, i) => ({
        id: `settings-action-decimal-${d}`,
        label: strings.commandPalette.labels.settingsDecimalDigits[d] ?? d,
        keywords: `settings precision précision decimal digits chiffres arrondi rounding ${d}`,
        Icon: Hash,
        onSelect: () => run(() => {
          useAppStore.getState().updateAppPreferences({ decimalRoundingDigits: Number(d) })
          toast.success(strings.commandPalette.labels.settingsDecimalDigits[d] ?? d)
        }),
        isActive: preferences.decimalRoundingDigits === Number(d),
        separator: i === 0,
        level: 0 as const,
      })),
      // ── PDF format ──
      {
        id: 'settings-action-pdf-a4',
        label: strings.commandPalette.labels.settingsPdfA4,
        keywords: 'settings pdf format a4 rapport report export',
        Icon: FileText,
        onSelect: () => run(() => {
          useAppStore.getState().updateAppPreferences({ pdfPageSize: 'A4' })
          toast.success(strings.commandPalette.labels.settingsPdfA4)
        }),
        isActive: preferences.pdfPageSize === 'A4',
        separator: true,
        level: 0,
      },
      {
        id: 'settings-action-pdf-letter',
        label: strings.commandPalette.labels.settingsPdfLetter,
        keywords: 'settings pdf format letter us rapport report export',
        Icon: FileText,
        onSelect: () => run(() => {
          useAppStore.getState().updateAppPreferences({ pdfPageSize: 'Letter' })
          toast.success(strings.commandPalette.labels.settingsPdfLetter)
        }),
        isActive: preferences.pdfPageSize === 'Letter',
        level: 0,
      },
      // ── Default mission time ──
      ...(['8760', '17520', '26280', '43800', '175200'] as const).map((h, i) => ({
        id: `settings-action-mission-${h}`,
        label: strings.commandPalette.labels.settingsMissionTimes[h] ?? `${h}h`,
        keywords: `settings mission time heure durée default par défaut iec 61511 ${h}`,
        Icon: Timer,
        onSelect: () => run(() => {
          useAppStore.getState().updateAppPreferences({ defaultMissionTimeTH: Number(h) })
          toast.success(strings.commandPalette.labels.settingsMissionTimes[h] ?? `${h}h`)
        }),
        isActive: preferences.defaultMissionTimeTH === Number(h),
        separator: i === 0,
        level: 0 as const,
      })),
      // ── Landing view ──
      ...(['projects', 'library', 'engine', 'audit-log', 'planning', 'hazop'] as const).map((lv, i) => ({
        id: `settings-action-landing-${lv}`,
        label: strings.commandPalette.labels.settingsLandingViews[lv] ?? lv,
        keywords: `settings landing view écran accueil démarrage startup ${lv}`,
        Icon: Home,
        onSelect: () => run(() => {
          useAppStore.getState().updateAppPreferences({ defaultLandingView: lv })
          toast.success(strings.commandPalette.labels.settingsLandingViews[lv] ?? lv)
        }),
        isActive: preferences.defaultLandingView === lv,
        separator: i === 0,
        level: 0 as const,
      })),
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
      // ── Panel sections default state ──
      {
        id: 'layout-panel-sections-default',
        label: preferences.rightPanelDefaultState === 'closed'
          ? strings.commandPalette.labels.panelSectionsOpenByDefault
          : strings.commandPalette.labels.panelSectionsClosedByDefault,
        keywords: 'panels volets sections accordéon ouvert fermé démarrage startup default state layout disposition',
        Icon: preferences.rightPanelDefaultState === 'closed' ? PanelRightOpen : PanelRightClose,
        onSelect: () => run(() =>
          useAppStore.getState().updateAppPreferences({
            rightPanelDefaultState: preferences.rightPanelDefaultState === 'closed' ? 'open' : 'closed',
          }),
        ),
        isActive: preferences.rightPanelDefaultState === 'closed',
        separator: true,
        level: 0 as const,
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
      {
        id: 'layout-reset-panel-states',
        label: strings.commandPalette.labels.resetPanelStates,
        keywords: 'reset panels volets sections accordéon état initial clear layout disposition',
        Icon: PanelRightOpen,
        onSelect: () => run(() =>
          useAppStore.getState().updateAppPreferences({ rightPanelSectionStates: {} }),
        ),
        isActive: false,
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

  const helpModesGroup: CommandGroup = {
    heading: 'Modes de recherche',
    items: [
      {
        id: 'help-mode-default',
        label: '(aucun préfixe) — Recherche globale',
        keywords: 'default search recherche globale mode help aide',
        Icon: Search,
        meta: 'SIFs, notes, PDF, composants, templates…',
        onSelect: () => setSearch(''),
        isActive: false,
        level: 0,
      },
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
        label: '# SIF & Workspace',
        keywords: 'sif search number numéro titre workspace note pdf image mode help aide',
        Icon: Hash,
        meta: 'Naviguer vers une SIF, une note, un PDF ou une image',
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
    ],
  }

  const helpShortcutsGroup: CommandGroup = {
    heading: 'Raccourcis clavier',
    items: [
      {
        id: 'help-shortcut-palette',
        label: 'Ctrl+K — Ouvrir la command palette',
        keywords: 'shortcut raccourci keyboard clavier palette',
        Icon: HelpCircle,
        meta: 'Ctrl+Shift+P pour le mode commandes directement',
        onSelect: () => { /* no-op */ },
        isActive: false,
        level: 0,
      },
      {
        id: 'help-shortcut-all',
        label: 'Voir tous les raccourcis…',
        keywords: 'shortcut raccourci keyboard clavier keybinding',
        Icon: Settings,
        meta: 'Ouvre les préférences → Raccourcis clavier',
        onSelect: () => run(() => navigate({ type: 'settings', section: 'shortcuts' })),
        isActive: false,
        level: 0,
      },
    ],
  }

  const helpDocGroup: CommandGroup = {
    heading: 'Documentation',
    items: DOC_CHAPTERS.map(ch => ({
      id: `help-doc-${ch.id}`,
      label: ch.title,
      keywords: `doc documentation ${ch.title} ${ch.group} help aide`,
      Icon: ch.Icon,
      meta: ch.group === 'engine' ? 'Moteur de calcul' : 'Interface & workflow',
      onSelect: () => run(() => navigate({ type: 'docs' })),
      isActive: false,
      level: 0 as const,
    })),
  }

  // ── Search results (default + commands mode when query non-empty) ─────────

  const libraryTemplates = useMemo(
    () => [...builtinTemplates, ...allProjectTemplates, ...userTemplates],
    [allProjectTemplates, builtinTemplates, userTemplates],
  )
  const workspaceNodes = useWorkspaceStore(s => Object.values(s.nodes))

  // ── Workspace nodes (# mode) — notes, PDFs, images ──────────────────────

  const workspaceDocsGroup: CommandGroup = {
    heading: 'Workspace',
    items: workspaceNodes
      .filter(n => n.type === 'note' || n.type === 'pdf' || n.type === 'image')
      .map(node => {
        const Icon = node.type === 'note' ? FileText : node.type === 'pdf' ? BookOpen : FileImage
        return {
          id: `ws-${node.id}`,
          label: node.name,
          keywords: `workspace ${node.type} ${node.name}`,
          Icon,
          meta: node.type === 'note' ? 'Note' : node.type === 'pdf' ? 'PDF' : 'Image',
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

  const searchIndex = useMemo(
    () => buildSearchIndex(projects, revisions, libraryTemplates, workspaceNodes),
    [libraryTemplates, projects, revisions, workspaceNodes],
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

  // ── Recent items (default mode when no query) ─────────────────────────────

  const recentGroup: CommandGroup | null = recentItems.length > 0 && !search.trim() ? {
    heading: 'Recent',
    items: recentItems.slice(0, 8).map(item => {
      // Better icons: distinguish note / pdf / image within workspace-file
      const isImage = item.kind === 'workspace-file' && /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(item.label)
      const isPdf   = item.kind === 'workspace-file' && /\.pdf$/i.test(item.label)
      const Icon =
        item.kind === 'sif'            ? Shield :
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
  } : null

  // ── Assemble groups by mode ───────────────────────────────────────────────

  let rawGroups: CommandGroup[]

  if (mode === 'commands') {
    // > mode: layout + current SIF nav + create + general
    rawGroups = [
      layoutGroup,
      ...(currentViewGroup ? [currentViewGroup] : []),
      createGroup,
      libraryGroup,
      settingsActionsGroup,
      generalGroup,
    ]
  } else if (mode === 'sif') {
    // # mode: SIFs + workspace documents
    rawGroups = [sifsGroup, workspaceDocsGroup, projectsGroup]
  } else if (mode === 'symbols') {
    // @ mode: components only
    rawGroups = symbolsGroup ? [symbolsGroup] : []
  } else if (mode === 'help') {
    // ? mode: modes + shortcuts + doc chapters
    rawGroups = [helpModesGroup, helpShortcutsGroup, helpDocGroup]
  } else {
    // default mode: everything
    rawGroups = [
      ...(recentGroup        ? [recentGroup]        : []),
      ...(searchResultsGroup ? [searchResultsGroup] : []),
      ...(currentViewGroup   ? [currentViewGroup]   : []),
      createGroup,
      projectsGroup,
      sifsGroup,
      libraryGroup,
      // Show settings actions in default mode only when the user is searching for something
      ...(search.trim() ? [settingsActionsGroup] : []),
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
