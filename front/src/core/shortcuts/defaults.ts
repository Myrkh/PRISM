/**
 * Default keyboard shortcuts for PRISM.
 *
 * `keybinding` matches the exact e.key value for the main key:
 *   – lowercase when Shift is NOT held  (Ctrl+b → e.key 'b')
 *   – uppercase when Shift IS held      (Ctrl+Shift+Z → e.key 'Z')
 *   – literal for special chars         (Ctrl+\ → e.key '\\')
 *   – empty string means "no default shortcut" (action is palette-only)
 */

export type ShortcutCategory = 'palette' | 'layout' | 'navigation'

export interface KeybindingEntry {
  id: string
  commandFr: string
  commandEn: string
  keybinding: string          // e.g. "Ctrl+b" — empty = no default
  when: string                // display-only context description
  category: ShortcutCategory
}

export const DEFAULT_KEYBINDINGS: KeybindingEntry[] = [
  // ── Command Palette ──────────────────────────────────────────────────────
  {
    id: 'commandPalette',
    commandFr: 'Ouvrir la palette de commandes',
    commandEn: 'Open Command Palette',
    keybinding: 'Ctrl+k',
    when: 'global',
    category: 'palette',
  },
  {
    id: 'commandMode',
    commandFr: 'Palette : mode commandes',
    commandEn: 'Command Palette: Commands mode',
    keybinding: 'Ctrl+Shift+P',
    when: 'global',
    category: 'palette',
  },
  {
    id: 'openChatPanel',
    commandFr: 'Ouvrir PRISM AI',
    commandEn: 'Open PRISM AI Chat',
    keybinding: 'Ctrl+i',
    when: 'global',
    category: 'palette',
  },
  // ── Layout ───────────────────────────────────────────────────────────────
  {
    id: 'toggleLeftPanel',
    commandFr: 'Basculer le panneau gauche',
    commandEn: 'Toggle Left Panel',
    keybinding: 'Ctrl+b',
    when: 'not editing',
    category: 'layout',
  },
  {
    id: 'toggleRightPanel',
    commandFr: 'Basculer le panneau droit',
    commandEn: 'Toggle Right Panel',
    keybinding: 'Ctrl+j',
    when: 'not editing',
    category: 'layout',
  },
  {
    id: 'toggleFocusMode',
    commandFr: 'Mode zen (plein écran)',
    commandEn: 'Zen Mode (Fullscreen)',
    keybinding: 'Ctrl+Shift+Z',
    when: 'global',
    category: 'layout',
  },
  {
    id: 'toggleSplitView',
    commandFr: 'Basculer la vue split',
    commandEn: 'Toggle Split View',
    keybinding: 'Ctrl+\\',
    when: 'not editing',
    category: 'layout',
  },
  {
    id: 'toggleStatusBar',
    commandFr: 'Barre de statut SIL',
    commandEn: 'Toggle Status Bar',
    keybinding: 'Ctrl+;',
    when: 'global',
    category: 'layout',
  },
  {
    id: 'toggleActivityBar',
    commandFr: 'Barre d\'activité (rail d\'icônes)',
    commandEn: 'Toggle Activity Bar',
    keybinding: '',
    when: 'global',
    category: 'layout',
  },
  {
    id: 'togglePanelsInverted',
    commandFr: 'Inverser les panneaux gauche/droit',
    commandEn: 'Invert Panels (Left ↔ Right)',
    keybinding: '',
    when: 'global',
    category: 'layout',
  },
  {
    id: 'toggleCenteredLayout',
    commandFr: 'Disposition centrée',
    commandEn: 'Toggle Centered Layout',
    keybinding: '',
    when: 'global',
    category: 'layout',
  },
  // ── Navigation ───────────────────────────────────────────────────────────
  {
    id: 'globalSearch',
    commandFr: 'Recherche globale',
    commandEn: 'Global Search',
    keybinding: 'Ctrl+Shift+F',
    when: 'global',
    category: 'navigation',
  },
]

/** Parse a shortcut string and return the effective e.key value + modifiers. */
export function parseShortcut(shortcut: string): {
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  key: string
} | null {
  if (!shortcut.trim()) return null
  const parts = shortcut.split('+')
  const key   = parts[parts.length - 1]
  if (!key) return null
  return {
    ctrlKey:  parts.includes('Ctrl'),
    shiftKey: parts.includes('Shift'),
    altKey:   parts.includes('Alt'),
    key,
  }
}

/** Returns true if the keyboard event matches the shortcut string. */
export function matchesShortcut(e: KeyboardEvent, shortcut: string): boolean {
  const parsed = parseShortcut(shortcut)
  if (!parsed) return false
  return (
    (e.ctrlKey || e.metaKey) === parsed.ctrlKey &&
    e.shiftKey               === parsed.shiftKey &&
    e.altKey                 === parsed.altKey &&
    e.key                    === parsed.key
  )
}

/** Format a keydown event into a shortcut string (for key capture). */
export function formatKeyEvent(e: KeyboardEvent): string {
  const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta'])
  if (MODIFIER_KEYS.has(e.key)) return ''
  const parts: string[] = []
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl')
  if (e.shiftKey) parts.push('Shift')
  if (e.altKey) parts.push('Alt')
  parts.push(e.key)
  return parts.join('+')
}

/** Returns the effective keybinding (user override > default). */
export function getEffectiveKeybinding(
  id: string,
  userKeybindings: Record<string, string>,
): string {
  if (id in userKeybindings) return userKeybindings[id]
  return DEFAULT_KEYBINDINGS.find(k => k.id === id)?.keybinding ?? ''
}
