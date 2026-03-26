export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface ChatConversation {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: ChatMessage[]
  contextSIFId?: string
  contextSIFName?: string
  attachedWorkspaceItems?: AttachedWorkspaceItem[]
  assistantNoteIds?: Record<string, string>
  strictMode?: boolean
}

export interface AttachedContext {
  sifId: string
  sifName: string
}

export interface AttachedWorkspaceItem {
  nodeId: string
  nodeName: string
  nodeType: 'note' | 'pdf' | 'image'
}

export type AttachableSIF = {
  sifId: string
  sifName: string
  sifNumber: string
  projectName: string
}

export interface ChatConfig {
  model: string
  systemPrompt: string
}

export type ChatResponseMode = 'default' | 'draft_note'

export type ChatInputMenuItem = {
  id: string
  badge: string
  badgeColor: string
  label: string
  meta: string
  active?: boolean
  onSelect: () => void
}
