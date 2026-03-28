export type UserCommandWhen = 'global' | 'not editing'

export const USER_COMMAND_NAVIGATE_TARGETS = [
  'home',
  'projects',
  'search',
  'planning',
  'library',
  'docs',
  'audit-log',
  'engine',
  'settings.general',
  'settings.workspace',
  'settings.engine',
  'settings.shortcuts',
  'settings.account',
  'settings.session',
] as const

export type UserCommandNavigateTarget = typeof USER_COMMAND_NAVIGATE_TARGETS[number]

export const USER_COMMAND_PRISM_FILES = [
  'context.md',
  'conventions.md',
  'standards.md',
  'sif-registry.md',
] as const

export type UserCommandPrismFilename = typeof USER_COMMAND_PRISM_FILES[number]

export type UserCommandStep =
  | { kind: 'run'; commandId: string }
  | { kind: 'navigate'; target: UserCommandNavigateTarget }
  | { kind: 'palette.open'; search?: string }
  | { kind: 'workspace.open'; name: string }
  | { kind: 'prism-file.open'; filename: UserCommandPrismFilename }
  | { kind: 'chat.open' }
  | { kind: 'chat.newConversation' }
  | { kind: 'chat.insert'; text: string }
  | { kind: 'chat.focus' }

export interface UserCommandDefinition {
  id: string
  label: string
  description?: string
  keywords?: string
  shortcut?: string
  when?: UserCommandWhen
  steps: UserCommandStep[]
}

export const USER_COMMAND_VARIABLES = [
  'currentView',
  'currentProjectId',
  'currentProjectName',
  'currentProjectRef',
  'currentSifId',
  'currentSifNumber',
  'currentSifTitle',
  'currentTab',
] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

export function isUserCommandWhen(value: unknown): value is UserCommandWhen {
  return value === 'global' || value === 'not editing'
}

export function isUserCommandNavigateTarget(value: unknown): value is UserCommandNavigateTarget {
  return typeof value === 'string' && USER_COMMAND_NAVIGATE_TARGETS.includes(value as UserCommandNavigateTarget)
}

export function isUserCommandPrismFilename(value: unknown): value is UserCommandPrismFilename {
  return typeof value === 'string' && USER_COMMAND_PRISM_FILES.includes(value as UserCommandPrismFilename)
}

function resolveUserCommandStep(input: unknown): UserCommandStep | null {
  if (!isRecord(input) || typeof input.kind !== 'string') return null

  switch (input.kind) {
    case 'run': {
      const commandId = normalizeOptionalString(input.commandId)
      return commandId ? { kind: 'run', commandId } : null
    }
    case 'navigate':
      return isUserCommandNavigateTarget(input.target)
        ? { kind: 'navigate', target: input.target }
        : null
    case 'palette.open': {
      const search = normalizeOptionalString(input.search)
      return search ? { kind: 'palette.open', search } : { kind: 'palette.open' }
    }
    case 'workspace.open': {
      const name = normalizeOptionalString(input.name)
      return name ? { kind: 'workspace.open', name } : null
    }
    case 'prism-file.open':
      return isUserCommandPrismFilename(input.filename)
        ? { kind: 'prism-file.open', filename: input.filename }
        : null
    case 'chat.open':
      return { kind: 'chat.open' }
    case 'chat.newConversation':
      return { kind: 'chat.newConversation' }
    case 'chat.insert':
      return typeof input.text === 'string' && input.text.length > 0
        ? { kind: 'chat.insert', text: input.text }
        : null
    case 'chat.focus':
      return { kind: 'chat.focus' }
    default:
      return null
  }
}

export function resolveUserCommands(input: unknown): UserCommandDefinition[] {
  if (!Array.isArray(input)) return []

  const seenIds = new Set<string>()
  const commands: UserCommandDefinition[] = []

  for (const entry of input) {
    if (!isRecord(entry)) continue
    const id = normalizeOptionalString(entry.id)
    const label = normalizeOptionalString(entry.label)
    const steps = Array.isArray(entry.steps)
      ? entry.steps
          .map(step => resolveUserCommandStep(step))
          .filter((step): step is UserCommandStep => step !== null)
      : []
    if (!id || !label || steps.length === 0 || seenIds.has(id)) continue

    seenIds.add(id)
    commands.push({
      id,
      label,
      description: normalizeOptionalString(entry.description),
      keywords: normalizeOptionalString(entry.keywords),
      shortcut: normalizeOptionalString(entry.shortcut),
      when: isUserCommandWhen(entry.when) ? entry.when : 'global',
      steps,
    })
  }

  return commands
}
