import { Terminal } from 'lucide-react'
import { toast } from '@/components/ui/toast'
import { openPalette } from '@/components/layout/command-palette'
import type { CommandItem } from '@/components/layout/command-palette/types'
import { dispatchPrismAiAutomationSteps, type PrismAiAutomationStep } from '@/components/layout/prism-ai/automation'
import { executeRegisteredCommand, getRegisteredCommand } from '@/core/commands/registry'
import type {
  UserCommandDefinition,
  UserCommandNavigateTarget,
  UserCommandPrismFilename,
} from '@/core/commands/userCommandsSchema'
import { useAppStore } from '@/store/appStore'
import type { AppView } from '@/store/types'
import { useWorkspaceStore } from '@/store/workspaceStore'

const USER_COMMAND_VARIABLE_PATTERN = /\$\{([A-Za-z0-9_]+)\}/g

function getUserCommandVariables(): Record<string, string> {
  const state = useAppStore.getState()
  const { view, projects } = state

  let currentProject = null as (typeof projects)[number] | null
  let currentSif = null as (typeof projects)[number]['sifs'][number] | null
  let currentTab = ''

  if (view.type === 'sif-dashboard') {
    currentProject = projects.find(project => project.id === view.projectId) ?? null
    currentSif = currentProject?.sifs.find(sif => sif.id === view.sifId) ?? null
    currentTab = String(view.tab)
  }

  return {
    currentView: view.type,
    currentProjectId: currentProject?.id ?? '',
    currentProjectName: currentProject?.name ?? '',
    currentProjectRef: currentProject?.ref ?? '',
    currentSifId: currentSif?.id ?? '',
    currentSifNumber: currentSif?.sifNumber ?? '',
    currentSifTitle: currentSif?.title ?? '',
    currentTab,
  }
}

function resolveNavigateView(target: UserCommandNavigateTarget): AppView {
  switch (target) {
    case 'home':
    case 'projects':
      return { type: 'projects' }
    case 'search':
      return { type: 'search' }
    case 'planning':
      return { type: 'planning' }
    case 'library':
      return { type: 'library' }
    case 'docs':
      return { type: 'docs' }
    case 'audit-log':
      return { type: 'audit-log' }
    case 'engine':
      return { type: 'engine' }
    case 'settings.general':
      return { type: 'settings', section: 'general' }
    case 'settings.workspace':
      return { type: 'settings', section: 'workspace' }
    case 'settings.engine':
      return { type: 'settings', section: 'engine' }
    case 'settings.shortcuts':
      return { type: 'settings', section: 'shortcuts' }
    case 'settings.account':
      return { type: 'settings', section: 'account' }
    case 'settings.session':
      return { type: 'settings', section: 'session' }
    default:
      return { type: 'projects' }
  }
}

function openWorkspaceNodeByName(rawName: string): boolean {
  const name = rawName.trim()
  if (!name) {
    toast.error('Commande utilisateur invalide', 'La step workspace.open doit définir un nom de fichier.')
    return false
  }

  const workspace = useWorkspaceStore.getState()
  const candidates = Object.values(workspace.nodes).filter(node => node.type !== 'folder')
  const exactMatches = candidates.filter(node => node.name === name)
  const insensitiveMatches = exactMatches.length === 0
    ? candidates.filter(node => node.name.toLowerCase() === name.toLowerCase())
    : []
  const matches = exactMatches.length > 0 ? exactMatches : insensitiveMatches

  if (matches.length === 0) {
    toast.error('Fichier introuvable', `Aucun document du workspace ne correspond à "${name}".`)
    return false
  }

  if (matches.length > 1) {
    toast.error('Commande utilisateur ambiguë', `Plusieurs documents du workspace correspondent à "${name}".`)
    return false
  }

  const node = matches[0]
  workspace.openTab(node.id)
  const app = useAppStore.getState()
  if (node.type === 'note') app.navigate({ type: 'note', noteId: node.id })
  else app.navigate({ type: 'workspace-file', nodeId: node.id })
  return true
}

function openPrismFile(filename: UserCommandPrismFilename): void {
  useAppStore.getState().navigate({ type: 'prism-file', filename })
}

export function renderUserCommandTemplate(template: string): string {
  const variables = getUserCommandVariables()
  return template.replace(USER_COMMAND_VARIABLE_PATTERN, (_match, name: string) => variables[name] ?? '')
}

export function validateUserCommands(commands: UserCommandDefinition[]): string | null {
  for (const command of commands) {
    for (const step of command.steps) {
      if (step.kind === 'run' && !getRegisteredCommand(step.commandId)) {
        return `La commande ${command.id} référence une commande native inconnue: ${step.commandId}`
      }
    }
  }

  return null
}

export function executeUserCommand(command: UserCommandDefinition): void {
  let queuedChatSteps: PrismAiAutomationStep[] = []

  const flushChatSteps = () => {
    if (queuedChatSteps.length === 0) return
    dispatchPrismAiAutomationSteps(queuedChatSteps)
    queuedChatSteps = []
  }

  for (const step of command.steps) {
    switch (step.kind) {
      case 'run': {
        flushChatSteps()
        const ok = executeRegisteredCommand(step.commandId)
        if (!ok) {
          toast.error('Commande utilisateur invalide', `La commande native ${step.commandId} est introuvable.`)
          return
        }
        break
      }
      case 'navigate':
        flushChatSteps()
        useAppStore.getState().navigate(resolveNavigateView(step.target))
        break
      case 'palette.open':
        flushChatSteps()
        openPalette(step.search ? renderUserCommandTemplate(step.search) : '')
        break
      case 'workspace.open':
        flushChatSteps()
        if (!openWorkspaceNodeByName(renderUserCommandTemplate(step.name))) return
        break
      case 'prism-file.open':
        flushChatSteps()
        openPrismFile(step.filename)
        break
      case 'chat.open':
        useAppStore.getState().setChatPanelOpen(true)
        break
      case 'chat.newConversation':
        useAppStore.getState().setChatPanelOpen(true)
        queuedChatSteps.push(step)
        break
      case 'chat.insert':
        useAppStore.getState().setChatPanelOpen(true)
        queuedChatSteps.push({ kind: 'chat.insert', text: renderUserCommandTemplate(step.text) })
        break
      case 'chat.focus':
        useAppStore.getState().setChatPanelOpen(true)
        queuedChatSteps.push(step)
        break
      default:
        break
    }
  }

  flushChatSteps()
}

export function buildUserCommandPaletteItems(commands: UserCommandDefinition[]): CommandItem[] {
  return commands.map(command => ({
    id: `user-command-${command.id}`,
    label: command.label,
    keywords: `${command.id} ${command.label} ${command.keywords ?? ''}`.trim().toLowerCase(),
    Icon: Terminal,
    onSelect: () => executeUserCommand(command),
    isActive: false,
    meta: command.description,
    shortcut: command.shortcut || undefined,
    level: 0,
  }))
}

export function getUserCommandsWithShortcuts(commands: UserCommandDefinition[]): UserCommandDefinition[] {
  return commands.filter(command => typeof command.shortcut === 'string' && command.shortcut.trim().length > 0)
}
