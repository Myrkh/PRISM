import { supabase } from '@/lib/supabase'
import type { ChatConfig, ChatConversation, ChatMessage } from './types'
import { DEFAULT_CONFIG, normalizeConversation, normalizeMessage } from './persistence'

interface PrismAIConversationRow {
  user_id: string
  conversation_id: string
  title: string
  created_at: string
  updated_at: string
  context_sif_id: string | null
  context_sif_name: string | null
  attached_workspace_items: unknown
  assistant_note_ids: unknown
  strict_mode: boolean
}

interface PrismAIMessageRow {
  user_id: string
  conversation_id: string
  message_id: string
  sequence_index: number
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  proposal: unknown
}

interface PrismAISettingsRow {
  user_id: string
  active_conversation_id: string | null
  model: string
  system_prompt: string
  updated_at?: string
}

export interface LoadedPrismAIState {
  conversations: ChatConversation[]
  activeConversationId: string | null
  config: ChatConfig
}

function rowToConversation(row: PrismAIConversationRow, messages: ChatMessage[]): ChatConversation | null {
  return normalizeConversation({
    id: row.conversation_id,
    title: row.title,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    messages,
    contextSIFId: row.context_sif_id ?? undefined,
    contextSIFName: row.context_sif_name ?? undefined,
    attachedWorkspaceItems: row.attached_workspace_items,
    assistantNoteIds: row.assistant_note_ids,
    strictMode: row.strict_mode,
  })
}

function rowToMessage(row: PrismAIMessageRow): ChatMessage | null {
  return normalizeMessage({
    id: row.message_id,
    role: row.role,
    content: row.content,
    timestamp: new Date(row.timestamp).getTime(),
    proposal: row.proposal,
  })
}

function conversationToRow(userId: string, conv: ChatConversation): PrismAIConversationRow {
  return {
    user_id: userId,
    conversation_id: conv.id,
    title: conv.title,
    created_at: new Date(conv.createdAt).toISOString(),
    updated_at: new Date(conv.updatedAt).toISOString(),
    context_sif_id: conv.contextSIFId ?? null,
    context_sif_name: conv.contextSIFName ?? null,
    attached_workspace_items: conv.attachedWorkspaceItems ?? [],
    assistant_note_ids: conv.assistantNoteIds ?? {},
    strict_mode: conv.strictMode ?? false,
  }
}

function conversationToMessageRows(userId: string, conv: ChatConversation): PrismAIMessageRow[] {
  return conv.messages.map((message, index) => ({
    user_id: userId,
    conversation_id: conv.id,
    message_id: message.id,
    sequence_index: index,
    role: message.role,
    content: message.content,
    timestamp: new Date(message.timestamp).toISOString(),
    proposal: message.proposal ?? null,
  }))
}

export async function loadPrismAIState(userId: string): Promise<LoadedPrismAIState> {
  const [
    { data: convRows, error: convError },
    { data: messageRows, error: messageError },
    { data: settingsRow, error: settingsError },
  ] = await Promise.all([
    supabase
      .from('prism_ai_conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false }),
    supabase
      .from('prism_ai_messages')
      .select('*')
      .eq('user_id', userId)
      .order('conversation_id', { ascending: true })
      .order('sequence_index', { ascending: true }),
    supabase
      .from('prism_ai_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  if (convError) throw new Error(`prism_ai_conversations: ${convError.message}`)
  if (messageError) throw new Error(`prism_ai_messages: ${messageError.message}`)
  if (settingsError) throw new Error(`prism_ai_settings: ${settingsError.message}`)

  const messagesByConversation = new Map<string, ChatMessage[]>()
  for (const row of (messageRows ?? []) as PrismAIMessageRow[]) {
    const message = rowToMessage(row)
    if (!message) continue
    const bucket = messagesByConversation.get(row.conversation_id)
    if (bucket) bucket.push(message)
    else messagesByConversation.set(row.conversation_id, [message])
  }

  const conversations = ((convRows ?? []) as PrismAIConversationRow[])
    .map(row => rowToConversation(row, messagesByConversation.get(row.conversation_id) ?? []))
    .filter((conv): conv is ChatConversation => Boolean(conv))
    .sort((a, b) => b.updatedAt - a.updatedAt)

  const settings = (settingsRow ?? null) as PrismAISettingsRow | null

  return {
    conversations,
    activeConversationId: settings?.active_conversation_id ?? null,
    config: {
      model: settings?.model ?? DEFAULT_CONFIG.model,
      systemPrompt: settings?.system_prompt ?? DEFAULT_CONFIG.systemPrompt,
    },
  }
}

export async function listPrismAIConversationIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('prism_ai_conversations')
    .select('conversation_id')
    .eq('user_id', userId)

  if (error) throw new Error(`prism_ai_conversations ids: ${error.message}`)
  return (data ?? []).map(row => String((row as { conversation_id: string }).conversation_id))
}

export async function savePrismAIState(
  userId: string,
  conversations: ChatConversation[],
  activeConversationId: string | null,
  config: ChatConfig,
  previousConversationIds: string[] | null,
): Promise<string[]> {
  const conversationRows = conversations.map(conv => conversationToRow(userId, conv))
  const messageRows = conversations.flatMap(conv => conversationToMessageRows(userId, conv))

  if (conversationRows.length > 0) {
    const { error } = await supabase
      .from('prism_ai_conversations')
      .upsert(conversationRows, { onConflict: 'user_id,conversation_id' })
    if (error) throw new Error(`prism_ai_conversations upsert: ${error.message}`)
  }

  const knownIds = previousConversationIds ?? await listPrismAIConversationIds(userId)
  const currentIds = conversationRows.map(row => row.conversation_id)
  const staleIds = knownIds.filter(id => !currentIds.includes(id))
  if (staleIds.length > 0) {
    const { error } = await supabase
      .from('prism_ai_conversations')
      .delete()
      .eq('user_id', userId)
      .in('conversation_id', staleIds)
    if (error) throw new Error(`prism_ai_conversations delete: ${error.message}`)
  }

  if (currentIds.length > 0) {
    const { error: deleteMessagesError } = await supabase
      .from('prism_ai_messages')
      .delete()
      .eq('user_id', userId)
      .in('conversation_id', currentIds)
    if (deleteMessagesError) throw new Error(`prism_ai_messages replace-delete: ${deleteMessagesError.message}`)
  }

  if (messageRows.length > 0) {
    const { error } = await supabase
      .from('prism_ai_messages')
      .insert(messageRows)
    if (error) throw new Error(`prism_ai_messages insert: ${error.message}`)
  }

  const { error: settingsError } = await supabase
    .from('prism_ai_settings')
    .upsert({
      user_id: userId,
      active_conversation_id: activeConversationId,
      model: config.model,
      system_prompt: config.systemPrompt,
    }, { onConflict: 'user_id' })

  if (settingsError) throw new Error(`prism_ai_settings upsert: ${settingsError.message}`)
  return currentIds
}
