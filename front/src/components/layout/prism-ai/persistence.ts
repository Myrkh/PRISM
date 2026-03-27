import type { AttachedWorkspaceItem, ChatConfig, ChatConversation, ChatMessage } from './types'

const LEGACY_CONVS_KEY = 'prism_chat_conversations'
const LEGACY_CONFIG_KEY = 'prism_chat_config'
const LEGACY_ACTIVE_CONV_KEY = 'prism_chat_active_conversation'

export const DEFAULT_CONFIG: ChatConfig = {
  model: 'claude-sonnet-4-6',
  systemPrompt: 'Tu es PRISM AI, un assistant expert en sécurité fonctionnelle IEC 61511. Tu aides les ingénieurs à analyser les SIF, calculer les niveaux SIL, et structurer les dossiers de preuve.',
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is string => typeof entry === 'string').map(entry => entry.trim()).filter(Boolean)
}

export function normalizeMessage(msg: unknown): ChatMessage | null {
  if (!msg || typeof msg !== 'object') return null
  const raw = msg as Record<string, unknown>
  const role = raw.role === 'assistant' || raw.role === 'user' ? raw.role : null
  const id = typeof raw.id === 'string' ? raw.id : null
  const content = typeof raw.content === 'string' ? raw.content : null
  const timestamp = typeof raw.timestamp === 'number' ? raw.timestamp : Date.now()
  if (!id || !role || content === null) return null

  const proposal = raw.proposal && typeof raw.proposal === 'object'
    ? {
        ...(raw.proposal as Record<string, unknown>),
        assumptions: asStringArray((raw.proposal as Record<string, unknown>).assumptions),
        missingData: asStringArray((raw.proposal as Record<string, unknown>).missingData),
        uncertainData: asStringArray((raw.proposal as Record<string, unknown>).uncertainData),
        conflicts: asStringArray((raw.proposal as Record<string, unknown>).conflicts),
        fieldStatus: (raw.proposal as Record<string, unknown>).fieldStatus && typeof (raw.proposal as Record<string, unknown>).fieldStatus === 'object'
          ? (raw.proposal as Record<string, unknown>).fieldStatus
          : {},
      }
    : null

  return {
    id,
    role,
    content,
    timestamp,
    proposal: proposal as ChatMessage['proposal'],
  }
}

export function normalizeConversation(conv: unknown): ChatConversation | null {
  if (!conv || typeof conv !== 'object') return null
  const raw = conv as Record<string, unknown>
  const id = typeof raw.id === 'string' ? raw.id : null
  if (!id) return null
  const rawMessages = Array.isArray(raw.messages) ? raw.messages : []
  const messages = rawMessages.map(normalizeMessage).filter((msg): msg is ChatMessage => Boolean(msg))

  return {
    id,
    title: typeof raw.title === 'string' ? raw.title : 'Nouveau chat',
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
    messages,
    contextSIFId: typeof raw.contextSIFId === 'string' ? raw.contextSIFId : undefined,
    contextSIFName: typeof raw.contextSIFName === 'string' ? raw.contextSIFName : undefined,
    attachedWorkspaceItems: Array.isArray(raw.attachedWorkspaceItems)
      ? raw.attachedWorkspaceItems.filter((item): item is AttachedWorkspaceItem => (
          Boolean(item)
          && typeof item === 'object'
          && typeof (item as Record<string, unknown>).nodeId === 'string'
          && typeof (item as Record<string, unknown>).nodeName === 'string'
          && ((item as Record<string, unknown>).nodeType === 'note'
            || (item as Record<string, unknown>).nodeType === 'pdf'
            || (item as Record<string, unknown>).nodeType === 'image'
            || (item as Record<string, unknown>).nodeType === 'json')
        ))
      : undefined,
    assistantNoteIds: raw.assistantNoteIds && typeof raw.assistantNoteIds === 'object'
      ? Object.fromEntries(
          Object.entries(raw.assistantNoteIds as Record<string, unknown>).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
        )
      : undefined,
    strictMode: typeof raw.strictMode === 'boolean' ? raw.strictMode : undefined,
  }
}

export function loadLegacyConversations(): ChatConversation[] {
  try {
    const raw = JSON.parse(localStorage.getItem(LEGACY_CONVS_KEY) ?? '[]')
    if (!Array.isArray(raw)) return []
    return raw.map(normalizeConversation).filter((conv): conv is ChatConversation => Boolean(conv))
  } catch {
    return []
  }
}

export function loadLegacyActiveConversationId(): string | null {
  try {
    return localStorage.getItem(LEGACY_ACTIVE_CONV_KEY)
  } catch {
    return null
  }
}

export function loadLegacyConfig(): ChatConfig {
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(localStorage.getItem(LEGACY_CONFIG_KEY) ?? '{}') }
  } catch {
    return DEFAULT_CONFIG
  }
}

export function clearLegacyChatStorage() {
  try {
    localStorage.removeItem(LEGACY_CONVS_KEY)
    localStorage.removeItem(LEGACY_ACTIVE_CONV_KEY)
    localStorage.removeItem(LEGACY_CONFIG_KEY)
  } catch {
    // ignore storage errors
  }
}

export function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function titleFromMessages(msgs: ChatMessage[]): string {
  const first = msgs.find(m => m.role === 'user')
  if (!first) return 'Nouveau chat'
  return first.content.slice(0, 44) + (first.content.length > 44 ? '…' : '')
}

export function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return "À l'instant"
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h`
  return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
