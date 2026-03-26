import type { ChatConfig, ChatConversation, ChatMessage } from './types'

const CONVS_KEY   = 'prism_chat_conversations'
const CONFIG_KEY  = 'prism_chat_config'
const ACTIVE_CONV_KEY = 'prism_chat_active_conversation'

export const DEFAULT_CONFIG: ChatConfig = {
  model: 'claude-sonnet-4-6',
  systemPrompt: 'Tu es PRISM AI, un assistant expert en sécurité fonctionnelle IEC 61511. Tu aides les ingénieurs à analyser les SIF, calculer les niveaux SIL, et structurer les dossiers de preuve.',
}

export function loadConversations(): ChatConversation[] {
  try { return JSON.parse(localStorage.getItem(CONVS_KEY) ?? '[]') } catch { return [] }
}
export function saveConversations(convs: ChatConversation[]) {
  localStorage.setItem(CONVS_KEY, JSON.stringify(convs.slice(0, 50)))
}
export function loadActiveConversationId(): string | null {
  try { return localStorage.getItem(ACTIVE_CONV_KEY) } catch { return null }
}
export function saveActiveConversationId(id: string | null) {
  try {
    if (id) localStorage.setItem(ACTIVE_CONV_KEY, id)
    else localStorage.removeItem(ACTIVE_CONV_KEY)
  } catch {
    // ignore quota / storage errors
  }
}
export function loadConfig(): ChatConfig {
  try { return { ...DEFAULT_CONFIG, ...JSON.parse(localStorage.getItem(CONFIG_KEY) ?? '{}') } } catch { return DEFAULT_CONFIG }
}
export function saveConfig(cfg: ChatConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg))
}

export function genId() { return Math.random().toString(36).slice(2) + Date.now().toString(36) }

export function titleFromMessages(msgs: ChatMessage[]): string {
  const first = msgs.find(m => m.role === 'user')
  if (!first) return 'Nouveau chat'
  return first.content.slice(0, 44) + (first.content.length > 44 ? '…' : '')
}

export function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000)  return 'À l\'instant'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h`
  return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
