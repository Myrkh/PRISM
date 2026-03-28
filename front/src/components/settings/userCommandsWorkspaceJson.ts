import { getLocation, parse as parseJsonc, printParseErrorCode, type ParseError } from 'jsonc-parser'
import type {
  UserCommandDefinition,
  UserCommandNavigateTarget,
  UserCommandPrismFilename,
  UserCommandStep,
  UserCommandWhen,
} from '@/core/commands/userCommandsSchema'
import {
  USER_COMMAND_NAVIGATE_TARGETS,
  USER_COMMAND_PRISM_FILES,
  USER_COMMAND_VARIABLES,
  isUserCommandNavigateTarget,
  isUserCommandPrismFilename,
  isUserCommandWhen,
} from '@/core/commands/userCommandsSchema'

export const USER_COMMANDS_WORKSPACE_FILENAME = 'userCommands.json'

export interface UserCommandsWorkspaceDocument {
  version: 1
  commands: UserCommandDefinition[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

function buildJsoncErrorMessage(raw: string, error: ParseError): string {
  const location = getLocation(raw, error.offset)
  const beforeOffset = raw.slice(0, error.offset)
  const line = beforeOffset.split('\n').length
  const column = beforeOffset.length - beforeOffset.lastIndexOf('\n')
  const pathHint = location.path.length > 0 ? ` · ${location.path.join('.')}` : ''
  return `JSONC invalide: ${printParseErrorCode(error.error)} (ligne ${line}, colonne ${column}${pathHint}).`
}

function parseUserCommandsJsonc(raw: string): { ok: true; value: unknown } | { ok: false; error: string } {
  const errors: ParseError[] = []
  const value = parseJsonc(raw, errors, { allowTrailingComma: true, disallowComments: false })
  if (errors.length > 0) {
    return { ok: false, error: buildJsoncErrorMessage(raw, errors[0]) }
  }
  return { ok: true, value }
}

function parseStep(step: unknown, commandId: string, index: number): { ok: true; value: UserCommandStep } | { ok: false; error: string } {
  if (!isRecord(step) || typeof step.kind !== 'string') {
    return { ok: false, error: `La step ${index + 1} de ${commandId} doit etre un objet valide.` }
  }

  switch (step.kind) {
    case 'run': {
      const commandRef = normalizeOptionalString(step.commandId)
      if (!commandRef) {
        return { ok: false, error: `La step run ${index + 1} de ${commandId} doit definir commandId.` }
      }
      return { ok: true, value: { kind: 'run', commandId: commandRef } }
    }
    case 'navigate': {
      if (!isUserCommandNavigateTarget(step.target)) {
        return {
          ok: false,
          error: `La step navigate ${index + 1} de ${commandId} doit utiliser un target valide (${USER_COMMAND_NAVIGATE_TARGETS.join(', ')}).`,
        }
      }
      return { ok: true, value: { kind: 'navigate', target: step.target as UserCommandNavigateTarget } }
    }
    case 'palette.open': {
      if (step.search !== undefined && typeof step.search !== 'string') {
        return { ok: false, error: `La step palette.open ${index + 1} de ${commandId} doit utiliser une recherche texte.` }
      }
      return step.search && step.search.trim().length > 0
        ? { ok: true, value: { kind: 'palette.open', search: step.search } }
        : { ok: true, value: { kind: 'palette.open' } }
    }
    case 'workspace.open': {
      const name = normalizeOptionalString(step.name)
      if (!name) {
        return { ok: false, error: `La step workspace.open ${index + 1} de ${commandId} doit definir name.` }
      }
      return { ok: true, value: { kind: 'workspace.open', name } }
    }
    case 'prism-file.open': {
      if (!isUserCommandPrismFilename(step.filename)) {
        return {
          ok: false,
          error: `La step prism-file.open ${index + 1} de ${commandId} doit utiliser un fichier PRISM valide (${USER_COMMAND_PRISM_FILES.join(', ')}).`,
        }
      }
      return { ok: true, value: { kind: 'prism-file.open', filename: step.filename as UserCommandPrismFilename } }
    }
    case 'chat.open':
      return { ok: true, value: { kind: 'chat.open' } }
    case 'chat.newConversation':
      return { ok: true, value: { kind: 'chat.newConversation' } }
    case 'chat.focus':
      return { ok: true, value: { kind: 'chat.focus' } }
    case 'chat.insert': {
      if (typeof step.text !== 'string' || step.text.length === 0) {
        return { ok: false, error: `La step chat.insert ${index + 1} de ${commandId} doit definir text.` }
      }
      return { ok: true, value: { kind: 'chat.insert', text: step.text } }
    }
    default:
      return { ok: false, error: `Type de step inconnu pour ${commandId}: ${step.kind}` }
  }
}

function buildUserCommandsExample(): UserCommandDefinition {
  return {
    id: 'user.create_sif_current_project',
    label: 'Create SIF In Current Project',
    description: 'Open PRISM AI and prefill a governed create_sif command for the current project.',
    keywords: 'prism ai sif create project current',
    shortcut: 'Ctrl+1',
    when: 'global',
    steps: [
      { kind: 'chat.open' },
      { kind: 'chat.newConversation' },
      { kind: 'chat.insert', text: '>create_sif project:${currentProjectRef} ' },
      { kind: 'chat.focus' },
    ],
  }
}

function buildUserCommandsCommentBlock(): string {
  const example = JSON.stringify(buildUserCommandsExample(), null, 2)
  const variableList = USER_COMMAND_VARIABLES.map(variable => `- \${${variable}}`).join('\n')
  return [
    '/*',
    'EXEMPLE DE COMMANDE UTILISATEUR PRISM',
    'Ce bloc est volontairement commente: il est ignore par Save et par l application.',
    'Ajoute tes vraies commandes dans le tableau commands ci-dessus.',
    'Chaque commande peut utiliser des steps gouvernees: run, navigate, palette.open, workspace.open, prism-file.open, chat.open, chat.newConversation, chat.insert, chat.focus.',
    'Variables disponibles dans les textes et recherches:',
    variableList,
    '',
    'Exemple complet de commande:',
    example,
    '*/',
  ].join('\n')
}

function serializeUserCommandsWorkspaceSource(document: UserCommandsWorkspaceDocument): string {
  const json = JSON.stringify(document, null, 2)
  return `${json}\n\n${buildUserCommandsCommentBlock()}\n`
}

export function buildUserCommandsWorkspaceDocument(commands: UserCommandDefinition[]): UserCommandsWorkspaceDocument {
  return {
    version: 1,
    commands,
  }
}

export function serializeUserCommandsWorkspaceDocument(commands: UserCommandDefinition[]): string {
  return serializeUserCommandsWorkspaceSource(buildUserCommandsWorkspaceDocument(commands))
}

export function formatUserCommandsWorkspaceSource(raw: string): { ok: true; formatted: string } | { ok: false; error: string } {
  const parsed = parseUserCommandsWorkspaceDocument(raw)
  if (!parsed.ok) return parsed
  return {
    ok: true,
    formatted: serializeUserCommandsWorkspaceSource(parsed.document),
  }
}

export function parseUserCommandsWorkspaceDocument(raw: string):
  | { ok: true; value: UserCommandDefinition[]; document: UserCommandsWorkspaceDocument }
  | { ok: false; error: string } {
  const parsedSource = parseUserCommandsJsonc(raw)
  if (!parsedSource.ok) return parsedSource

  const data = parsedSource.value
  const rawCommands = Array.isArray(data)
    ? data
    : isRecord(data)
      ? data.commands
      : null

  if (isRecord(data) && data.version !== undefined && data.version !== 1) {
    return { ok: false, error: 'userCommands.json doit utiliser version: 1.' }
  }

  if (!Array.isArray(rawCommands)) {
    return { ok: false, error: 'userCommands.json doit contenir un tableau commands.' }
  }

  const seenIds = new Set<string>()
  const seenShortcuts = new Map<string, string>()
  const commands: UserCommandDefinition[] = []

  for (let index = 0; index < rawCommands.length; index += 1) {
    const command = rawCommands[index]
    if (!isRecord(command)) {
      return { ok: false, error: `La commande ${index + 1} doit etre un objet.` }
    }

    const id = normalizeOptionalString(command.id)
    const label = normalizeOptionalString(command.label)
    const description = normalizeOptionalString(command.description)
    const keywords = normalizeOptionalString(command.keywords)
    const shortcut = normalizeOptionalString(command.shortcut)
    const when = command.when === undefined
      ? 'global'
      : (isUserCommandWhen(command.when) ? command.when : null)

    if (!id) {
      return { ok: false, error: `La commande ${index + 1} doit definir un id non vide.` }
    }
    if (seenIds.has(id)) {
      return { ok: false, error: `Identifiant duplique dans userCommands.json: ${id}` }
    }
    if (!label) {
      return { ok: false, error: `La commande ${id} doit definir un label non vide.` }
    }
    if (!when) {
      return { ok: false, error: `La commande ${id} utilise un when invalide. Valeurs autorisees: global, not editing.` }
    }
    if (!Array.isArray(command.steps) || command.steps.length === 0) {
      return { ok: false, error: `La commande ${id} doit definir au moins une step.` }
    }

    const parsedSteps: UserCommandStep[] = []
    for (let stepIndex = 0; stepIndex < command.steps.length; stepIndex += 1) {
      const parsedStep = parseStep(command.steps[stepIndex], id, stepIndex)
      if (!parsedStep.ok) return parsedStep
      parsedSteps.push(parsedStep.value)
    }

    if (shortcut) {
      const duplicate = seenShortcuts.get(shortcut)
      if (duplicate) {
        return { ok: false, error: `Le raccourci ${shortcut} est deja utilise par ${duplicate}.` }
      }
      seenShortcuts.set(shortcut, id)
    }

    seenIds.add(id)
    commands.push({
      id,
      label,
      description,
      keywords,
      shortcut,
      when: when as UserCommandWhen,
      steps: parsedSteps,
    })
  }

  const document = buildUserCommandsWorkspaceDocument(commands)
  return {
    ok: true,
    value: commands,
    document,
  }
}

export function getUserCommandsWorkspaceVariables(): readonly string[] {
  return USER_COMMAND_VARIABLES
}
