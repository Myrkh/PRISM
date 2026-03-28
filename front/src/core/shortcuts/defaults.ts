/**
 * Default keyboard shortcuts for PRISM.
 *
 * `keybinding` matches the exact e.key value for the main key:
 *   – lowercase when Shift is NOT held  (Ctrl+b → e.key 'b')
 *   – uppercase when Shift IS held      (Ctrl+Shift+Z → e.key 'Z')
 *   – literal for special chars         (Ctrl+\ → e.key '\')
 *   – empty string means "no default shortcut" (action is palette-only)
 */
import {
  getRegisteredShortcutEntries,
  type KeybindingEntry,
  type ShortcutCategory,
} from '@/core/commands/registry'

export type { KeybindingEntry, ShortcutCategory } from '@/core/commands/registry'

export const DEFAULT_KEYBINDINGS: KeybindingEntry[] = getRegisteredShortcutEntries()
  .map(({ skipEditable: _skipEditable, ...entry }) => entry)

/** Parse a shortcut string and return the effective e.key value + modifiers. */
export function parseShortcut(shortcut: string): {
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  key: string
} | null {
  if (!shortcut.trim()) return null
  const parts = shortcut.split('+')
  const key = parts[parts.length - 1]
  if (!key) return null
  return {
    ctrlKey: parts.includes('Ctrl'),
    shiftKey: parts.includes('Shift'),
    altKey: parts.includes('Alt'),
    key,
  }
}

/** Returns true if the keyboard event matches the shortcut string. */
export function matchesShortcut(e: KeyboardEvent, shortcut: string): boolean {
  const parsed = parseShortcut(shortcut)
  if (!parsed) return false
  return (
    (e.ctrlKey || e.metaKey) === parsed.ctrlKey &&
    e.shiftKey === parsed.shiftKey &&
    e.altKey === parsed.altKey &&
    e.key === parsed.key
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
