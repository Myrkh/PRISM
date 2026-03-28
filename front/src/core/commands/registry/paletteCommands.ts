/**
 * Palette system commands — open/toggle palette, open config files.
 */
import { Braces, Search, Terminal } from 'lucide-react'
import { openPalette, togglePalette } from '@/components/layout/command-palette'
import { openKeybindingsWorkspaceNode } from '@/components/settings/keybindingsWorkspaceNode'
import { openUserCommandsWorkspaceNode } from '@/components/settings/userCommandsWorkspaceNode'
import type { RegisteredCommand } from './types'

export const PALETTE_COMMANDS: RegisteredCommand[] = [
  {
    id: 'commandPalette',
    Icon: Search,
    shortcut: {
      id: 'commandPalette',
      commandFr: 'Ouvrir la palette de commandes',
      commandEn: 'Open Command Palette',
      keybinding: 'Ctrl+k',
      when: 'global',
      category: 'palette',
    },
    execute: () => togglePalette(),
  },
  {
    id: 'commandMode',
    Icon: Terminal,
    shortcut: {
      id: 'commandMode',
      commandFr: 'Palette : mode commandes',
      commandEn: 'Command Palette: Commands mode',
      keybinding: 'Ctrl+Shift+P',
      when: 'global',
      category: 'palette',
    },
    execute: () => openPalette('>'),
  },
  {
    id: 'openKeybindingsJson',
    Icon: Braces,
    shortcut: {
      id: 'openKeybindingsJson',
      commandFr: 'Ouvrir keybindings.json',
      commandEn: 'Open keybindings.json',
      keybinding: '',
      when: 'global',
      category: 'general',
    },
    execute: () => openKeybindingsWorkspaceNode(),
  },
  {
    id: 'openUserCommandsJson',
    Icon: Terminal,
    shortcut: {
      id: 'openUserCommandsJson',
      commandFr: 'Ouvrir userCommands.json',
      commandEn: 'Open userCommands.json',
      keybinding: '',
      when: 'global',
      category: 'general',
    },
    execute: () => openUserCommandsWorkspaceNode(),
  },
]
