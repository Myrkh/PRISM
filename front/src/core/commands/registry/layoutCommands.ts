/**
 * Layout commands — panel visibility, split view, zen mode, palette position.
 */
import {
  AlignCenter,
  ArrowUpToLine,
  Columns2,
  FlipHorizontal2,
  Maximize2,
  Minimize2,
  PanelBottomClose,
  PanelBottomOpen,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  SidebarClose,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import type { PaletteCommandContext, RegisteredCommand } from './types'

// ── toggleLeftPanel ───────────────────────────────────────────────────────────

const toggleLeftPanelExecute = () => useAppStore.getState().toggleLeftPanel()

const toggleLeftPanelBuildItem = (context: PaletteCommandContext) => ({
  id: 'layout-left-panel',
  label: context.strings.commandPalette.labels.toggleLeftPanel,
  keywords: 'left panel sidebar toggle visibility panneau gauche customize layout disposition',
  Icon: context.leftPanelOpen ? PanelLeftClose : PanelLeftOpen,
  onSelect: toggleLeftPanelExecute,
  isActive: context.leftPanelOpen,
  shortcut: context.getShortcut('toggleLeftPanel'),
  level: 0 as const,
})

// ── toggleRightPanel ──────────────────────────────────────────────────────────

const toggleRightPanelExecute = () => useAppStore.getState().toggleRightPanel()

const toggleRightPanelBuildItem = (context: PaletteCommandContext) => ({
  id: 'layout-right-panel',
  label: context.strings.commandPalette.labels.toggleRightPanel,
  keywords: 'right panel properties toggle visibility panneau droit customize layout disposition',
  Icon: context.rightPanelOpen ? PanelRightClose : PanelRightOpen,
  onSelect: toggleRightPanelExecute,
  isActive: context.rightPanelOpen,
  shortcut: context.getShortcut('toggleRightPanel'),
  level: 0 as const,
})

// ── toggleActivityBar ─────────────────────────────────────────────────────────

const toggleActivityBarExecute = () => useAppStore.getState().toggleActivityBar()

const toggleActivityBarBuildItem = (context: PaletteCommandContext) => ({
  id: 'layout-activity-bar',
  label: context.strings.commandPalette.labels.toggleActivityBar,
  keywords: 'activity bar rail icônes gauche masquer customize layout disposition sidebar',
  Icon: SidebarClose,
  onSelect: toggleActivityBarExecute,
  isActive: context.preferences.activityBarVisible,
  shortcut: context.getShortcut('toggleActivityBar'),
  level: 0 as const,
})

// ── toggleFocusMode ───────────────────────────────────────────────────────────

const toggleFocusModeExecute = () => useAppStore.getState().toggleFocusMode()

const toggleFocusModeBuildItem = (context: PaletteCommandContext) => ({
  id: 'layout-zen',
  label: context.strings.commandPalette.labels.zenMode,
  keywords: 'zen focus fullscreen plein écran masquer panneaux customize layout disposition',
  Icon: context.focusMode ? Minimize2 : Maximize2,
  onSelect: toggleFocusModeExecute,
  isActive: context.focusMode,
  shortcut: context.getShortcut('toggleFocusMode'),
  separator: true,
  level: 0 as const,
})

// ── toggleSplitView ───────────────────────────────────────────────────────────

const toggleSplitViewExecute = () => {
  const state = useAppStore.getState()
  if (state.secondSlot) state.closeSecondSlot()
  else state.openSecondSlot()
}

const toggleSplitViewBuildItem = (context: PaletteCommandContext) => ({
  id: 'layout-split',
  label: context.strings.commandPalette.labels.splitView,
  keywords: 'split view vue côte à côte deux sif compare customize layout disposition',
  Icon: Columns2,
  onSelect: toggleSplitViewExecute,
  isActive: context.isSplitActive,
  shortcut: context.getShortcut('toggleSplitView'),
  level: 0 as const,
})

// ── toggleStatusBar ───────────────────────────────────────────────────────────

const toggleStatusBarExecute = () => useAppStore.getState().toggleStatusBar()

const toggleStatusBarBuildItem = (context: PaletteCommandContext) => ({
  id: 'layout-status-bar',
  label: context.strings.commandPalette.labels.toggleStatusBar,
  keywords: 'status bar barre statut sil pfd footer toggle visibility customize layout disposition',
  Icon: context.preferences.statusBarVisible ? PanelBottomClose : PanelBottomOpen,
  onSelect: toggleStatusBarExecute,
  isActive: context.preferences.statusBarVisible,
  shortcut: context.getShortcut('toggleStatusBar'),
  separator: true,
  level: 0 as const,
})

// ── togglePanelsInverted ──────────────────────────────────────────────────────

const togglePanelsInvertedExecute = () => useAppStore.getState().togglePanelsInverted()

const togglePanelsInvertedBuildItem = (context: PaletteCommandContext) => ({
  id: 'layout-invert-panels',
  label: context.strings.commandPalette.labels.invertPanels,
  keywords: 'invert panels inverser panneaux swap gauche droite customize layout disposition',
  Icon: FlipHorizontal2,
  onSelect: togglePanelsInvertedExecute,
  isActive: context.preferences.panelsInverted,
  shortcut: context.getShortcut('togglePanelsInverted'),
  level: 0 as const,
})

// ── toggleCenteredLayout ──────────────────────────────────────────────────────

const toggleCenteredLayoutExecute = () => useAppStore.getState().toggleCenteredLayout()

const toggleCenteredLayoutBuildItem = (context: PaletteCommandContext) => ({
  id: 'layout-centered',
  label: context.strings.commandPalette.labels.centeredLayout,
  keywords: 'centered layout centré disposition largeur max centered editor vscode customize',
  Icon: AlignCenter,
  onSelect: toggleCenteredLayoutExecute,
  isActive: context.preferences.centeredLayout,
  shortcut: context.getShortcut('toggleCenteredLayout'),
  level: 0 as const,
})

// ── toggleWorkflowBreadcrumb ──────────────────────────────────────────────────

const toggleWorkflowBreadcrumbExecute = () => {
  const state = useAppStore.getState()
  state.updateAppPreferences({
    showWorkflowBreadcrumb: !(state.preferences.showWorkflowBreadcrumb ?? true),
  })
}

const toggleWorkflowBreadcrumbBuildItem = (context: PaletteCommandContext) => ({
  id: 'layout-workflow-breadcrumb',
  label: (context.preferences.showWorkflowBreadcrumb ?? true)
    ? context.strings.commandPalette.labels.workflowBreadcrumbHide
    : context.strings.commandPalette.labels.workflowBreadcrumbShow,
  keywords: 'workflow breadcrumb editor breadcrumb fil ariane barre navigation sif project projet header layout disposition',
  Icon: ArrowUpToLine,
  onSelect: toggleWorkflowBreadcrumbExecute,
  isActive: context.preferences.showWorkflowBreadcrumb ?? true,
  shortcut: context.getShortcut('toggleWorkflowBreadcrumb'),
  level: 0 as const,
})

// ── togglePanelSectionsDefault ────────────────────────────────────────────────

const togglePanelSectionsDefaultExecute = () => {
  const state = useAppStore.getState()
  state.updateAppPreferences({
    rightPanelDefaultState: state.preferences.rightPanelDefaultState === 'closed' ? 'open' : 'closed',
  })
}

const togglePanelSectionsDefaultBuildItem = (context: PaletteCommandContext) => ({
  id: 'layout-panel-sections-default',
  label: context.preferences.rightPanelDefaultState === 'closed'
    ? context.strings.commandPalette.labels.panelSectionsOpenByDefault
    : context.strings.commandPalette.labels.panelSectionsClosedByDefault,
  keywords: 'panels volets sections accordéon ouvert fermé démarrage startup default state layout disposition',
  Icon: context.preferences.rightPanelDefaultState === 'closed' ? PanelRightOpen : PanelRightClose,
  onSelect: togglePanelSectionsDefaultExecute,
  isActive: context.preferences.rightPanelDefaultState === 'closed',
  separator: true,
  level: 0 as const,
})

// ── setCommandPaletteTop ──────────────────────────────────────────────────────

const setCommandPaletteTopExecute = () => useAppStore.getState().setCommandPalettePosition('top')

const setCommandPaletteTopBuildItem = (context: PaletteCommandContext) => ({
  id: 'layout-palette-top',
  label: context.strings.commandPalette.labels.commandPaletteTop,
  keywords: 'palette position top haute header customize layout disposition',
  Icon: ArrowUpToLine,
  onSelect: setCommandPaletteTopExecute,
  isActive: context.preferences.commandPalettePosition === 'top',
  separator: true,
  level: 0 as const,
})

// ── setCommandPaletteCenter ───────────────────────────────────────────────────

const setCommandPaletteCenterExecute = () => useAppStore.getState().setCommandPalettePosition('center')

const setCommandPaletteCenterBuildItem = (context: PaletteCommandContext) => ({
  id: 'layout-palette-center',
  label: context.strings.commandPalette.labels.commandPaletteCenter,
  keywords: 'palette position center centrale flottante floating customize layout disposition',
  Icon: PanelBottomClose,
  onSelect: setCommandPaletteCenterExecute,
  isActive: context.preferences.commandPalettePosition === 'center',
  level: 0 as const,
})

// ── resetPanelStates ──────────────────────────────────────────────────────────

const resetPanelStatesExecute = () =>
  useAppStore.getState().updateAppPreferences({ rightPanelSectionStates: {} })

const resetPanelStatesBuildItem = (context: PaletteCommandContext) => ({
  id: 'layout-reset-panel-states',
  label: context.strings.commandPalette.labels.resetPanelStates,
  keywords: 'reset panels volets sections accordéon état initial clear layout disposition',
  Icon: PanelRightOpen,
  onSelect: resetPanelStatesExecute,
  isActive: false,
  level: 0 as const,
})

// ── Export ────────────────────────────────────────────────────────────────────

export const LAYOUT_COMMANDS: RegisteredCommand[] = [
  {
    id: 'toggleLeftPanel',
    Icon: PanelLeftOpen,
    paletteGroup: 'layout',
    shortcut: {
      id: 'toggleLeftPanel',
      commandFr: 'Basculer le panneau gauche',
      commandEn: 'Toggle Left Panel',
      keybinding: 'Ctrl+b',
      when: 'not editing',
      category: 'layout',
      skipEditable: true,
    },
    execute: toggleLeftPanelExecute,
    buildPaletteItem: toggleLeftPanelBuildItem,
  },
  {
    id: 'toggleRightPanel',
    Icon: PanelRightOpen,
    paletteGroup: 'layout',
    shortcut: {
      id: 'toggleRightPanel',
      commandFr: 'Basculer le panneau droit',
      commandEn: 'Toggle Right Panel',
      keybinding: 'Ctrl+j',
      when: 'not editing',
      category: 'layout',
      skipEditable: true,
    },
    execute: toggleRightPanelExecute,
    buildPaletteItem: toggleRightPanelBuildItem,
  },
  {
    id: 'toggleActivityBar',
    Icon: SidebarClose,
    paletteGroup: 'layout',
    shortcut: {
      id: 'toggleActivityBar',
      commandFr: "Barre d'activité (rail d'icônes)",
      commandEn: 'Toggle Activity Bar',
      keybinding: '',
      when: 'global',
      category: 'layout',
    },
    execute: toggleActivityBarExecute,
    buildPaletteItem: toggleActivityBarBuildItem,
  },
  {
    id: 'toggleFocusMode',
    Icon: Maximize2,
    paletteGroup: 'layout',
    shortcut: {
      id: 'toggleFocusMode',
      commandFr: 'Mode zen (plein écran)',
      commandEn: 'Zen Mode (Fullscreen)',
      keybinding: 'Ctrl+Shift+Z',
      when: 'global',
      category: 'layout',
    },
    execute: toggleFocusModeExecute,
    buildPaletteItem: toggleFocusModeBuildItem,
  },
  {
    id: 'toggleSplitView',
    Icon: Columns2,
    paletteGroup: 'layout',
    shortcut: {
      id: 'toggleSplitView',
      commandFr: 'Basculer la vue split',
      commandEn: 'Toggle Split View',
      keybinding: 'Ctrl+\\',
      when: 'not editing',
      category: 'layout',
      skipEditable: true,
    },
    execute: toggleSplitViewExecute,
    buildPaletteItem: toggleSplitViewBuildItem,
  },
  {
    id: 'toggleStatusBar',
    Icon: PanelBottomClose,
    paletteGroup: 'layout',
    shortcut: {
      id: 'toggleStatusBar',
      commandFr: 'Barre de statut SIL',
      commandEn: 'Toggle Status Bar',
      keybinding: 'Ctrl+;',
      when: 'global',
      category: 'layout',
    },
    execute: toggleStatusBarExecute,
    buildPaletteItem: toggleStatusBarBuildItem,
  },
  {
    id: 'togglePanelsInverted',
    Icon: FlipHorizontal2,
    paletteGroup: 'layout',
    shortcut: {
      id: 'togglePanelsInverted',
      commandFr: 'Inverser les panneaux gauche/droit',
      commandEn: 'Invert Panels (Left ↔ Right)',
      keybinding: '',
      when: 'global',
      category: 'layout',
    },
    execute: togglePanelsInvertedExecute,
    buildPaletteItem: togglePanelsInvertedBuildItem,
  },
  {
    id: 'toggleCenteredLayout',
    Icon: AlignCenter,
    paletteGroup: 'layout',
    shortcut: {
      id: 'toggleCenteredLayout',
      commandFr: 'Disposition centrée',
      commandEn: 'Toggle Centered Layout',
      keybinding: '',
      when: 'global',
      category: 'layout',
    },
    execute: toggleCenteredLayoutExecute,
    buildPaletteItem: toggleCenteredLayoutBuildItem,
  },
  {
    id: 'toggleWorkflowBreadcrumb',
    Icon: ArrowUpToLine,
    paletteGroup: 'layout',
    shortcut: {
      id: 'toggleWorkflowBreadcrumb',
      commandFr: 'Basculer la barre de navigation workflow',
      commandEn: 'Toggle Workflow Breadcrumb Bar',
      keybinding: '',
      when: 'global',
      category: 'layout',
    },
    execute: toggleWorkflowBreadcrumbExecute,
    buildPaletteItem: toggleWorkflowBreadcrumbBuildItem,
  },
  {
    id: 'togglePanelSectionsDefault',
    Icon: PanelRightOpen,
    paletteGroup: 'layout',
    shortcut: {
      id: 'togglePanelSectionsDefault',
      commandFr: "Basculer l'état par défaut des volets",
      commandEn: 'Toggle Default Panel Section State',
      keybinding: '',
      when: 'global',
      category: 'layout',
    },
    execute: togglePanelSectionsDefaultExecute,
    buildPaletteItem: togglePanelSectionsDefaultBuildItem,
  },
  {
    id: 'setCommandPaletteTop',
    Icon: ArrowUpToLine,
    paletteGroup: 'layout',
    shortcut: {
      id: 'setCommandPaletteTop',
      commandFr: 'Palette de commandes en haut',
      commandEn: 'Set Command Palette Top',
      keybinding: '',
      when: 'global',
      category: 'layout',
    },
    execute: setCommandPaletteTopExecute,
    buildPaletteItem: setCommandPaletteTopBuildItem,
  },
  {
    id: 'setCommandPaletteCenter',
    Icon: PanelBottomClose,
    paletteGroup: 'layout',
    shortcut: {
      id: 'setCommandPaletteCenter',
      commandFr: 'Palette de commandes centrée',
      commandEn: 'Set Command Palette Center',
      keybinding: '',
      when: 'global',
      category: 'layout',
    },
    execute: setCommandPaletteCenterExecute,
    buildPaletteItem: setCommandPaletteCenterBuildItem,
  },
  {
    id: 'resetPanelStates',
    Icon: PanelRightOpen,
    paletteGroup: 'layout',
    shortcut: {
      id: 'resetPanelStates',
      commandFr: "Réinitialiser l'état des volets",
      commandEn: 'Reset Panel States',
      keybinding: '',
      when: 'global',
      category: 'layout',
    },
    execute: resetPanelStatesExecute,
    buildPaletteItem: resetPanelStatesBuildItem,
  },
]
