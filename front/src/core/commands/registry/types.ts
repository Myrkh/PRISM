/**
 * Command registry types — shared interfaces for registered commands,
 * keyboard shortcuts, and palette context.
 */
import type React from 'react'
import type { CommandItem } from '@/components/layout/command-palette/types'
import type { AppPreferences } from '@/core/models/appPreferences'
import type { ShellStrings } from '@/i18n/shell'
import type { AppView } from '@/store/types'

export type ShortcutCategory = 'palette' | 'layout' | 'navigation' | 'general'
export type PaletteCommandGroup = 'general' | 'layout'

export interface KeybindingEntry {
  id: string
  commandFr: string
  commandEn: string
  keybinding: string
  when: string
  category: ShortcutCategory
}

export interface RegisteredShortcutEntry extends KeybindingEntry {
  skipEditable?: boolean
}

export interface PaletteCommandContext {
  strings: ShellStrings
  view: AppView
  preferences: AppPreferences
  isDark: boolean
  chatPanelOpen: boolean
  leftPanelOpen: boolean
  rightPanelOpen: boolean
  focusMode: boolean
  isSplitActive: boolean
  search: string
  getShortcut: (id: string) => string | undefined
}

export interface RegisteredCommand {
  id: string
  Icon: React.ElementType
  paletteGroup?: PaletteCommandGroup
  shortcut?: RegisteredShortcutEntry
  buildPaletteItem?: (context: PaletteCommandContext) => CommandItem
  execute: () => void
}
