import { getRegisteredShortcutEntries, type KeybindingEntry } from '@/core/commands/registry'

export const KEYBINDINGS_WORKSPACE_FILENAME = 'keybindings.json'

export type KeybindingsWorkspaceEntry = KeybindingEntry & {
  defaultKeybinding: string
  source: 'default' | 'user'
}

export type KeybindingsWorkspaceDocument = KeybindingsWorkspaceEntry[]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOwn(object: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key)
}

export function buildKeybindingsWorkspaceEntries(userKeybindings: Record<string, string>): KeybindingsWorkspaceDocument {
  return getRegisteredShortcutEntries().map(entry => {
    const overridden = hasOwn(userKeybindings, entry.id)
    const effectiveKeybinding = overridden ? userKeybindings[entry.id] ?? '' : entry.keybinding
    return {
      ...entry,
      keybinding: effectiveKeybinding,
      defaultKeybinding: entry.keybinding,
      source: overridden ? 'user' : 'default',
    }
  })
}

export function serializeKeybindingsWorkspaceDocument(userKeybindings: Record<string, string>): string {
  return JSON.stringify(buildKeybindingsWorkspaceEntries(userKeybindings), null, 2)
}

export function parseKeybindingsWorkspaceDocument(raw: string): {
  ok: true
  value: Record<string, string>
  entries: KeybindingsWorkspaceDocument
} | {
  ok: false
  error: string
} {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch (error) {
    return {
      ok: false,
      error: 'JSON invalide: ' + (error instanceof Error ? error.message : String(error)),
    }
  }

  const defaults = getRegisteredShortcutEntries()
  const defaultsById = new Map(defaults.map(entry => [entry.id, entry]))
  const providedBindings = new Map<string, string>()

  if (Array.isArray(data)) {
    for (const item of data) {
      if (!isRecord(item)) {
        return { ok: false, error: 'Chaque entrée de keybindings.json doit être un objet.' }
      }
      const id = item.id
      const keybinding = item.keybinding
      if (typeof id !== 'string' || id.trim().length === 0) {
        return { ok: false, error: 'Chaque entrée de keybindings.json doit avoir un id valide.' }
      }
      if (!defaultsById.has(id)) {
        return { ok: false, error: 'Commande inconnue dans keybindings.json: ' + id }
      }
      if (typeof keybinding !== 'string') {
        return { ok: false, error: 'Le raccourci de ' + id + ' doit être une chaîne.' }
      }
      if (providedBindings.has(id)) {
        return { ok: false, error: 'Commande dupliquée dans keybindings.json: ' + id }
      }
      providedBindings.set(id, keybinding)
    }
  } else if (isRecord(data)) {
    for (const [commandId, value] of Object.entries(data)) {
      if (!defaultsById.has(commandId)) {
        return { ok: false, error: 'Commande inconnue dans keybindings.json: ' + commandId }
      }
      if (typeof value !== 'string') {
        return { ok: false, error: 'Le raccourci de ' + commandId + ' doit être une chaîne.' }
      }
      providedBindings.set(commandId, value)
    }
  } else {
    return { ok: false, error: 'Le document keybindings.json doit être un tableau de commandes ou un objet.' }
  }

  const overrides: Record<string, string> = {}
  for (const entry of defaults) {
    if (!providedBindings.has(entry.id)) continue
    const keybinding = providedBindings.get(entry.id) ?? ''
    if (keybinding !== entry.keybinding) {
      overrides[entry.id] = keybinding
    }
  }

  return {
    ok: true,
    value: overrides,
    entries: buildKeybindingsWorkspaceEntries(overrides),
  }
}
