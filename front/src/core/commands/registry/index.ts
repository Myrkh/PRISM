/**
 * Command registry — single source of truth for all registered commands,
 * keyboard shortcuts, and palette items.
 *
 * Commands are split into focused modules:
 *   paletteCommands    — palette open/toggle, config file openers
 *   navigationCommands — views, theme, AI chat, global search
 *   layoutCommands     — panels, zen mode, split view, palette position
 */
export type {
  KeybindingEntry,
  PaletteCommandContext,
  PaletteCommandGroup,
  RegisteredCommand,
  RegisteredShortcutEntry,
  ShortcutCategory,
} from './types'

import type { PaletteCommandContext, PaletteCommandGroup, RegisteredCommand, RegisteredShortcutEntry } from './types'
import type { CommandItem } from '@/components/layout/command-palette/types'
import { PALETTE_COMMANDS } from './paletteCommands'
import { NAVIGATION_COMMANDS } from './navigationCommands'
import { LAYOUT_COMMANDS } from './layoutCommands'

// ── Registry ──────────────────────────────────────────────────────────────────

const commandRegistry: RegisteredCommand[] = [
  ...PALETTE_COMMANDS,
  ...NAVIGATION_COMMANDS,
  ...LAYOUT_COMMANDS,
]

const commandRegistryById = new Map(commandRegistry.map(command => [command.id, command]))

// ── Public API ────────────────────────────────────────────────────────────────

export function getRegisteredCommands(): RegisteredCommand[] {
  return commandRegistry
}

export function getRegisteredCommand(id: string): RegisteredCommand | null {
  return commandRegistryById.get(id) ?? null
}

export function executeRegisteredCommand(id: string): boolean {
  const command = getRegisteredCommand(id)
  if (!command) return false
  command.execute()
  return true
}

export function getRegisteredShortcutEntries(): RegisteredShortcutEntry[] {
  return commandRegistry
    .filter((command): command is RegisteredCommand & { shortcut: RegisteredShortcutEntry } =>
      Boolean(command.shortcut),
    )
    .map(command => command.shortcut)
}

export function buildRegisteredPaletteItems(
  group: PaletteCommandGroup,
  context: PaletteCommandContext,
): CommandItem[] {
  return commandRegistry
    .filter(command => command.paletteGroup === group && command.buildPaletteItem)
    .map(command => command.buildPaletteItem!(context))
}
