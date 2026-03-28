/**
 * Navigation & general commands — views, theme, AI chat, global search.
 */
import {
  BookOpen,
  BookOpenText,
  CalendarDays,
  Cpu,
  History,
  Home,
  MessageSquare,
  Moon,
  Search,
  Settings,
  Sun,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import type { PaletteCommandContext, RegisteredCommand } from './types'

// ── openChatPanel ────────────────────────────────────────────────────────────

const openChatPanelExecute = () => useAppStore.getState().setChatPanelOpen(true)

const openChatPanelBuildItem = (context: PaletteCommandContext) => ({
  id: 'ai-chat',
  label: context.strings.commandPalette.labels.aiChat,
  keywords: 'ai chat prism assistant conversation iec 61511 mistral claude',
  Icon: MessageSquare,
  onSelect: openChatPanelExecute,
  isActive: context.chatPanelOpen,
  shortcut: context.getShortcut('openChatPanel'),
  level: 0 as const,
})

// ── globalSearch ─────────────────────────────────────────────────────────────

const globalSearchExecute = () => useAppStore.getState().navigate({ type: 'search' })

const globalSearchBuildItem = (context: PaletteCommandContext) => ({
  id: 'search',
  label: context.strings.commandPalette.labels.globalSearch,
  keywords: 'search recherche globale palette composants',
  Icon: Search,
  onSelect: globalSearchExecute,
  isActive: context.view.type === 'search',
  meta: context.search.trim()
    ? context.strings.commandPalette.meta.continueSearch(context.search.trim())
    : context.strings.commandPalette.meta.exploreSearch,
  shortcut: context.getShortcut('globalSearch'),
  level: 0 as const,
})

// ── navigate.home ─────────────────────────────────────────────────────────────

const navigateHomeExecute = () => useAppStore.getState().navigate({ type: 'projects' })

const navigateHomeBuildItem = (context: PaletteCommandContext) => ({
  id: 'home',
  label: context.strings.commandPalette.labels.home,
  keywords: 'home accueil projets dashboard',
  Icon: Home,
  onSelect: navigateHomeExecute,
  isActive: context.view.type === 'projects',
  level: 0 as const,
})

// ── navigate.library ──────────────────────────────────────────────────────────

const navigateLibraryExecute = () => useAppStore.getState().navigate({ type: 'library' })

const navigateLibraryBuildItem = (context: PaletteCommandContext) => ({
  id: 'library',
  label: context.strings.commandPalette.labels.masterLibrary,
  keywords: 'library bibliothèque catalogue composants templates standards lambda_db',
  Icon: BookOpen,
  onSelect: navigateLibraryExecute,
  isActive: context.view.type === 'library',
  meta: context.strings.commandPalette.meta.library,
  level: 0 as const,
})

// ── toggleTheme ───────────────────────────────────────────────────────────────

const toggleThemeExecute = () => useAppStore.getState().toggleTheme()

const toggleThemeBuildItem = (context: PaletteCommandContext) => ({
  id: 'toggle-theme',
  label: context.isDark
    ? context.strings.commandPalette.labels.switchToLight
    : context.strings.commandPalette.labels.switchToDark,
  keywords: 'theme dark light mode thème sombre clair',
  Icon: context.isDark ? Sun : Moon,
  onSelect: toggleThemeExecute,
  isActive: false,
  level: 0 as const,
})

// ── navigate.audit ────────────────────────────────────────────────────────────

const navigateAuditExecute = () => useAppStore.getState().navigate({ type: 'audit-log' })

const navigateAuditBuildItem = (context: PaletteCommandContext) => ({
  id: 'audit-log',
  label: context.strings.commandPalette.labels.auditLog,
  keywords: 'audit log historique timeline traçabilité',
  Icon: History,
  onSelect: navigateAuditExecute,
  isActive: context.view.type === 'audit-log',
  level: 0 as const,
})

// ── navigate.planning ─────────────────────────────────────────────────────────

const navigatePlanningExecute = () => useAppStore.getState().navigate({ type: 'planning' })

const navigatePlanningBuildItem = (context: PaletteCommandContext) => ({
  id: 'planning',
  label: context.strings.commandPalette.labels.planning,
  keywords: 'planning calendrier campagnes proof test échéances',
  Icon: CalendarDays,
  onSelect: navigatePlanningExecute,
  isActive: context.view.type === 'planning',
  level: 0 as const,
})

// ── navigate.engine ───────────────────────────────────────────────────────────

const navigateEngineExecute = () => useAppStore.getState().navigate({ type: 'engine' })

const navigateEngineBuildItem = (context: PaletteCommandContext) => ({
  id: 'engine',
  label: context.strings.commandPalette.labels.engine,
  keywords: 'engine compute solver markov monte carlo backend quantitatif',
  Icon: Cpu,
  onSelect: navigateEngineExecute,
  isActive: context.view.type === 'engine',
  level: 0 as const,
})

// ── navigate.docs ─────────────────────────────────────────────────────────────

const navigateDocsExecute = () => useAppStore.getState().navigate({ type: 'docs' })

const navigateDocsBuildItem = (context: PaletteCommandContext) => ({
  id: 'docs',
  label: context.strings.commandPalette.labels.docs,
  keywords: 'docs documentation aide help manuel guide moteur calcul architecture verification',
  Icon: BookOpenText,
  onSelect: navigateDocsExecute,
  isActive: context.view.type === 'docs',
  meta: context.strings.commandPalette.meta.docs,
  level: 0 as const,
})

// ── navigate.settings ─────────────────────────────────────────────────────────

const navigateSettingsExecute = () => useAppStore.getState().navigate({ type: 'settings', section: 'general' })

const navigateSettingsBuildItem = (context: PaletteCommandContext) => ({
  id: 'settings',
  label: context.strings.commandPalette.labels.settings,
  keywords: 'settings paramètres préférences',
  Icon: Settings,
  onSelect: navigateSettingsExecute,
  isActive: context.view.type === 'settings',
  level: 0 as const,
})

// ── Export ────────────────────────────────────────────────────────────────────

export const NAVIGATION_COMMANDS: RegisteredCommand[] = [
  {
    id: 'openChatPanel',
    Icon: MessageSquare,
    paletteGroup: 'general',
    shortcut: {
      id: 'openChatPanel',
      commandFr: 'Ouvrir PRISM AI',
      commandEn: 'Open PRISM AI Chat',
      keybinding: 'Ctrl+i',
      when: 'global',
      category: 'palette',
    },
    execute: openChatPanelExecute,
    buildPaletteItem: openChatPanelBuildItem,
  },
  {
    id: 'globalSearch',
    Icon: Search,
    paletteGroup: 'general',
    shortcut: {
      id: 'globalSearch',
      commandFr: 'Recherche globale',
      commandEn: 'Global Search',
      keybinding: 'Ctrl+Shift+F',
      when: 'global',
      category: 'navigation',
    },
    execute: globalSearchExecute,
    buildPaletteItem: globalSearchBuildItem,
  },
  {
    id: 'navigate.home',
    Icon: Home,
    paletteGroup: 'general',
    shortcut: {
      id: 'navigate.home',
      commandFr: "Aller à l'accueil",
      commandEn: 'Go to Home',
      keybinding: '',
      when: 'global',
      category: 'navigation',
    },
    execute: navigateHomeExecute,
    buildPaletteItem: navigateHomeBuildItem,
  },
  {
    id: 'navigate.library',
    Icon: BookOpen,
    paletteGroup: 'general',
    shortcut: {
      id: 'navigate.library',
      commandFr: 'Ouvrir la Library',
      commandEn: 'Open Library',
      keybinding: '',
      when: 'global',
      category: 'navigation',
    },
    execute: navigateLibraryExecute,
    buildPaletteItem: navigateLibraryBuildItem,
  },
  {
    id: 'toggleTheme',
    Icon: Sun,
    paletteGroup: 'general',
    shortcut: {
      id: 'toggleTheme',
      commandFr: 'Basculer le thème',
      commandEn: 'Toggle Theme',
      keybinding: '',
      when: 'global',
      category: 'general',
    },
    execute: toggleThemeExecute,
    buildPaletteItem: toggleThemeBuildItem,
  },
  {
    id: 'navigate.audit',
    Icon: History,
    paletteGroup: 'general',
    shortcut: {
      id: 'navigate.audit',
      commandFr: "Ouvrir le journal d'audit",
      commandEn: 'Open Audit Log',
      keybinding: '',
      when: 'global',
      category: 'navigation',
    },
    execute: navigateAuditExecute,
    buildPaletteItem: navigateAuditBuildItem,
  },
  {
    id: 'navigate.planning',
    Icon: CalendarDays,
    paletteGroup: 'general',
    shortcut: {
      id: 'navigate.planning',
      commandFr: 'Ouvrir le planning',
      commandEn: 'Open Planning',
      keybinding: '',
      when: 'global',
      category: 'navigation',
    },
    execute: navigatePlanningExecute,
    buildPaletteItem: navigatePlanningBuildItem,
  },
  {
    id: 'navigate.engine',
    Icon: Cpu,
    paletteGroup: 'general',
    shortcut: {
      id: 'navigate.engine',
      commandFr: 'Ouvrir le moteur',
      commandEn: 'Open Engine',
      keybinding: '',
      when: 'global',
      category: 'navigation',
    },
    execute: navigateEngineExecute,
    buildPaletteItem: navigateEngineBuildItem,
  },
  {
    id: 'navigate.docs',
    Icon: BookOpenText,
    paletteGroup: 'general',
    shortcut: {
      id: 'navigate.docs',
      commandFr: 'Ouvrir la documentation',
      commandEn: 'Open Documentation',
      keybinding: '',
      when: 'global',
      category: 'navigation',
    },
    execute: navigateDocsExecute,
    buildPaletteItem: navigateDocsBuildItem,
  },
  {
    id: 'navigate.settings',
    Icon: Settings,
    paletteGroup: 'general',
    shortcut: {
      id: 'navigate.settings',
      commandFr: 'Ouvrir les paramètres',
      commandEn: 'Open Settings',
      keybinding: '',
      when: 'global',
      category: 'navigation',
    },
    execute: navigateSettingsExecute,
    buildPaletteItem: navigateSettingsBuildItem,
  },
]
