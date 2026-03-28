/**
 * useGlobalShortcuts — keyboard shortcuts mounted at app root.
 * Reads effective keybindings from preferences (default + user overrides).
 */
import { useEffect } from 'react'
import { executeRegisteredCommand, getRegisteredShortcutEntries } from '@/core/commands/registry'
import { executeUserCommand, getUserCommandsWithShortcuts, validateUserCommands } from '@/core/commands/userCommands'
import { getEffectiveKeybinding, matchesShortcut } from '@/core/shortcuts/defaults'
import { toast } from '@/components/ui/toast'
import { useAppStore } from '@/store/appStore'

export function useGlobalShortcuts() {
  const userKeybindings = useAppStore(s => s.preferences.userKeybindings)
  const userCommands = useAppStore(s => s.preferences.userCommands)

  // ── Validate user commands whenever they change ───────────────────────────
  useEffect(() => {
    if (userCommands.length === 0) return
    const error = validateUserCommands(userCommands)
    if (error) toast.error('User commands', error)
  }, [userCommands])

  useEffect(() => {
    const registeredShortcuts = getRegisteredShortcutEntries()
    const executableUserCommands = getUserCommandsWithShortcuts(userCommands)

    const handler = (e: KeyboardEvent) => {
      for (const command of executableUserCommands) {
        const binding = command.shortcut?.trim() ?? ''
        if (!binding || !matchesShortcut(e, binding)) continue
        if (!matchesShortcutContext(command.when ?? 'global', e.target)) continue

        e.preventDefault()
        executeUserCommand(command)
        return
      }

      for (const shortcut of registeredShortcuts) {
        const binding = getEffectiveKeybinding(shortcut.id, userKeybindings)
        if (!binding || !matchesShortcut(e, binding)) continue
        if (!matchesShortcutContext(shortcut.when, e.target)) continue
        if (shortcut.skipEditable && isEditable(e.target)) continue

        e.preventDefault()
        executeRegisteredCommand(shortcut.id)
        return
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [userCommands, userKeybindings])
}

function matchesShortcutContext(when: string, target: EventTarget | null): boolean {
  if (when === 'not editing') return !isEditable(target)
  return true
}

function isEditable(target: EventTarget | null): boolean {
  if (!target) return false
  const el = target as HTMLElement
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable
}
