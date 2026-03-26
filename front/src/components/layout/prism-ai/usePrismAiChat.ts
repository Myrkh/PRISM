import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { useAppStore } from '@/store/appStore'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { getWorkspaceFileUrl } from '@/lib/workspaceStorage'
import { serializeSIFForAI, streamPRISMAI, type ChatAttachmentPayload, type WorkspaceContext } from '@/lib/aiApi'
import { detectMode } from '../command-palette/modes'
import { generateSIFRegistry } from '@/utils/generateSIFRegistry'
import {
  ATTACH_BADGE_COLOR,
  COMMAND_BADGE_COLOR,
  DOCUMENT_BADGE_COLOR,
  deriveAssistantNoteName,
  extractAssistantNoteMarkdown,
  extractDraftNotePrompt,
  isDraftNoteCommandQuery,
  normalizeOutgoingUserContent,
  resolveCommandTokenBadge,
} from './noteUtils'
import {
  genId,
  loadActiveConversationId,
  loadConfig,
  loadConversations,
  saveActiveConversationId,
  saveConfig,
  saveConversations,
  titleFromMessages,
} from './persistence'
import type {
  AttachableSIF,
  AttachedContext,
  AttachedWorkspaceItem,
  ChatConfig,
  ChatConversation,
  ChatInputMenuItem,
  ChatMessage,
  ChatResponseMode,
} from './types'

export function usePrismAiChat() {
  // ── Store: current SIF context ──────────────────────────────────────────────
  const view     = useAppStore(s => s.view)
  const navigate = useAppStore(s => s.navigate)
  const projects = useAppStore(s => s.projects)
  const prismFiles = useAppStore(s => s.prismFiles)
  const appLocale = useAppStore(s => s.preferences.language)
  const workspaceNodes = useWorkspaceStore(s => s.nodes)
  const createWorkspaceNote = useWorkspaceStore(s => s.createNote)
  const updateWorkspaceNoteContent = useWorkspaceStore(s => s.updateNoteContent)
  const openWorkspaceTab = useWorkspaceStore(s => s.openTab)
  const clearWorkspacePendingRename = useWorkspaceStore(s => s.clearPendingRename)
  const currentSIF = view.type === 'sif-dashboard'
    ? projects.flatMap(p => p.sifs).find(s => s.id === view.sifId) ?? null
    : null
  const allSIFs: AttachableSIF[] = projects
    .flatMap(project => project.sifs.map(sif => ({
      sifId: sif.id,
      sifName: sif.title || 'Sans titre',
      sifNumber: sif.sifNumber || 'SIF',
      projectName: project.name,
    })))
    .sort((a, b) => `${a.sifNumber} ${a.sifName}`.localeCompare(`${b.sifNumber} ${b.sifName}`, 'fr', { sensitivity: 'base' }))
  const workspaceItems: AttachedWorkspaceItem[] = Object.values(workspaceNodes)
    .filter(node => node.type === 'note' || node.type === 'pdf' || node.type === 'image')
    .map(node => ({
      nodeId: node.id,
      nodeName: node.name,
      nodeType: node.type,
    }))
    .sort((a, b) => a.nodeName.localeCompare(b.nodeName, 'fr', { sensitivity: 'base' }))
  const createNoteLabel = appLocale === 'fr' ? 'Créer une note' : 'Create note'
  const openNoteLabel = appLocale === 'fr' ? 'Ouvrir la note' : 'Open note'
  const workspaceKindLabels = {
    note: 'Markdown',
    pdf: 'PDF',
    image: 'Image',
  } satisfies Record<AttachedWorkspaceItem['nodeType'], string>
  const strictModeLabel = appLocale === 'fr' ? 'Mode strict' : 'Strict mode'

  // ── Chat state ──────────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState<ChatConversation[]>(loadConversations)
  const initialActiveConversation = (() => {
    const activeId = loadActiveConversationId()
    if (!activeId) return null
    return conversations.find(conv => conv.id === activeId) ?? null
  })()
  const [currentConvId, setCurrentConvId] = useState<string | null>(initialActiveConversation?.id ?? null)
  const [messages, setMessages]           = useState<ChatMessage[]>(initialActiveConversation?.messages ?? [])
  const [input, setInput]                 = useState('')
  const { mode: inputMode, query: inputModeQuery, config: inputModeConfig } = detectMode(input)
  const [strictMode, setStrictMode]       = useState(initialActiveConversation?.strictMode ?? false)
  const [isStreaming, setIsStreaming]     = useState(false)
  const [attachedContext, setAttachedContext] = useState<AttachedContext | null>(
    initialActiveConversation?.contextSIFId
      ? { sifId: initialActiveConversation.contextSIFId, sifName: initialActiveConversation.contextSIFName ?? '' }
      : null,
  )
  const [attachedWorkspaceItems, setAttachedWorkspaceItems] = useState<AttachedWorkspaceItem[]>(initialActiveConversation?.attachedWorkspaceItems ?? [])
  const [config, setConfig]               = useState<ChatConfig>(loadConfig)
  const [assistantNoteIds, setAssistantNoteIds] = useState<Record<string, string>>(initialActiveConversation?.assistantNoteIds ?? {})

  // ── UI state ────────────────────────────────────────────────────────────────
  const [historyOpen, setHistoryOpen]   = useState(false)
  const [configOpen, setConfigOpen]     = useState(false)
  const [attachPickerOpen, setAttachPickerOpen] = useState(false)


  // ── Conversation persistence ─────────────────────────────────────────────────
  const persistCurrentConversation = useCallback((
    msgs: ChatMessage[],
    ctx: AttachedContext | null,
    workspaceItemsToPersist: AttachedWorkspaceItem[],
    convId: string | null,
    assistantNotesToPersist: Record<string, string>,
    strictModeToPersist: boolean,
  ) => {
    if (msgs.length === 0) return convId
    const id = convId ?? genId()
    const conv: ChatConversation = {
      id,
      title: titleFromMessages(msgs),
      createdAt: msgs[0].timestamp,
      updatedAt: Date.now(),
      messages: msgs,
      contextSIFId: ctx?.sifId,
      contextSIFName: ctx?.sifName,
      attachedWorkspaceItems: workspaceItemsToPersist,
      assistantNoteIds: assistantNotesToPersist,
      strictMode: strictModeToPersist,
    }
    setConversations(prev => {
      const next = [conv, ...prev.filter(c => c.id !== id)]
      saveConversations(next)
      return next
    })
    saveActiveConversationId(id)
    return id
  }, [])

  // ── New chat ────────────────────────────────────────────────────────────────
  const handleNewChat = useCallback(() => {
    persistCurrentConversation(messages, attachedContext, attachedWorkspaceItems, currentConvId, assistantNoteIds, strictMode)
    setMessages([])
    setAssistantNoteIds({})
    setCurrentConvId(null)
    setStrictMode(false)
    saveActiveConversationId(null)
    setAttachedContext(null)
    setAttachedWorkspaceItems([])
    setAttachPickerOpen(false)
    setHistoryOpen(false)
    setConfigOpen(false)
  }, [messages, attachedContext, attachedWorkspaceItems, currentConvId, assistantNoteIds, persistCurrentConversation, strictMode])

  // ── Load conversation ────────────────────────────────────────────────────────
  const handleLoadConversation = useCallback((conv: ChatConversation) => {
    persistCurrentConversation(messages, attachedContext, attachedWorkspaceItems, currentConvId, assistantNoteIds, strictMode)
    setMessages(conv.messages)
    setAssistantNoteIds(conv.assistantNoteIds ?? {})
    setCurrentConvId(conv.id)
    setStrictMode(conv.strictMode ?? false)
    saveActiveConversationId(conv.id)
    setAttachedContext(conv.contextSIFId ? { sifId: conv.contextSIFId, sifName: conv.contextSIFName ?? '' } : null)
    setAttachedWorkspaceItems(conv.attachedWorkspaceItems ?? [])
    setAttachPickerOpen(false)
    setHistoryOpen(false)
  }, [messages, attachedContext, attachedWorkspaceItems, currentConvId, assistantNoteIds, persistCurrentConversation, strictMode])

  // ── Delete conversation ──────────────────────────────────────────────────────
  const handleDeleteConversation = useCallback((id: string, e: MouseEvent) => {
    e.stopPropagation()
    setConversations(prev => {
      const next = prev.filter(c => c.id !== id)
      saveConversations(next)
      return next
    })
    if (currentConvId === id) {
      setMessages([])
      setAssistantNoteIds({})
      setCurrentConvId(null)
      setStrictMode(false)
      saveActiveConversationId(null)
    }
  }, [currentConvId])

  // ── Attachments ───────────────────────────────────────────────────────────────
  const toggleAttachPicker = useCallback(() => {
    setAttachPickerOpen(open => !open)
    setHistoryOpen(false)
    setConfigOpen(false)
  }, [])

  const handleAttachSIFSelection = useCallback((sif: AttachableSIF) => {
    setAttachedContext({ sifId: sif.sifId, sifName: sif.sifName })
    setAttachPickerOpen(false)
  }, [])

  const toggleWorkspaceAttachment = useCallback((item: AttachedWorkspaceItem) => {
    setAttachedWorkspaceItems(prev => (
      prev.some(entry => entry.nodeId === item.nodeId)
        ? prev.filter(entry => entry.nodeId !== item.nodeId)
        : [...prev, item]
    ))
  }, [])

  const removeWorkspaceAttachment = useCallback((nodeId: string) => {
    setAttachedWorkspaceItems(prev => prev.filter(entry => entry.nodeId !== nodeId))
  }, [])

  // ── Config save ──────────────────────────────────────────────────────────────
  const handleConfigChange = useCallback((cfg: ChatConfig) => {
    setConfig(cfg)
    saveConfig(cfg)
  }, [])

  const findExistingAssistantNoteId = useCallback((msg: ChatMessage) => {
    const mappedNoteId = assistantNoteIds[msg.id]
    if (mappedNoteId) {
      const mappedNode = workspaceNodes[mappedNoteId]
      if (mappedNode?.type === 'note') return mappedNoteId
    }

    const expectedName = deriveAssistantNoteName(msg.content)
    const expectedContent = extractAssistantNoteMarkdown(msg.content)
    return Object.values(workspaceNodes).find(node => (
      node.type === 'note'
      && node.name === expectedName
      && (node.content === expectedContent || node.content === msg.content)
    ))?.id
  }, [assistantNoteIds, workspaceNodes])

  useEffect(() => {
    const recoveredAssistantNoteIds = messages.reduce<Record<string, string>>((acc, msg) => {
      if (msg.role !== 'assistant' || assistantNoteIds[msg.id] || !msg.content.trim()) return acc
      const noteId = findExistingAssistantNoteId(msg)
      if (noteId) acc[msg.id] = noteId
      return acc
    }, {})

    if (Object.keys(recoveredAssistantNoteIds).length === 0) return

    const nextAssistantNoteIds = { ...assistantNoteIds, ...recoveredAssistantNoteIds }
    setAssistantNoteIds(nextAssistantNoteIds)
    const persistedConvId = persistCurrentConversation(messages, attachedContext, attachedWorkspaceItems, currentConvId, nextAssistantNoteIds, strictMode)
    if (persistedConvId && !currentConvId) setCurrentConvId(persistedConvId)
  }, [assistantNoteIds, attachedContext, attachedWorkspaceItems, currentConvId, findExistingAssistantNoteId, messages, persistCurrentConversation, strictMode])

  useEffect(() => {
    let changed = false
    const nextAssistantNoteIds = Object.fromEntries(
      Object.entries(assistantNoteIds).filter(([, noteId]) => {
        const node = workspaceNodes[noteId]
        const keep = node?.type === 'note'
        if (!keep) changed = true
        return keep
      }),
    )

    if (!changed) return

    setAssistantNoteIds(nextAssistantNoteIds)
    const persistedConvId = persistCurrentConversation(
      messages,
      attachedContext,
      attachedWorkspaceItems,
      currentConvId,
      nextAssistantNoteIds,
      strictMode,
    )
    if (persistedConvId && !currentConvId) setCurrentConvId(persistedConvId)
  }, [assistantNoteIds, attachedContext, attachedWorkspaceItems, currentConvId, messages, persistCurrentConversation, strictMode, workspaceNodes])

  const createAssistantNoteFromMessage = useCallback((
    msg: ChatMessage,
    options?: {
      openAfterCreate?: boolean
      conversationMessages?: ChatMessage[]
      convId?: string | null
    },
  ) => {
    if (msg.role !== 'assistant' || !msg.content.trim()) return null

    const openAfterCreate = options?.openAfterCreate ?? true
    const conversationMessages = options?.conversationMessages ?? messages
    const conversationId = options?.convId ?? currentConvId
    const existingNoteId = findExistingAssistantNoteId(msg)

    if (existingNoteId) {
      if (openAfterCreate) {
        openWorkspaceTab(existingNoteId)
        navigate({ type: 'note', noteId: existingNoteId })
      }

      if (assistantNoteIds[msg.id] !== existingNoteId) {
        const nextAssistantNoteIds = { ...assistantNoteIds, [msg.id]: existingNoteId }
        setAssistantNoteIds(nextAssistantNoteIds)
        const persistedConvId = persistCurrentConversation(
          conversationMessages,
          attachedContext,
          attachedWorkspaceItems,
          conversationId,
          nextAssistantNoteIds,
          strictMode,
        )
        if (persistedConvId && !conversationId) setCurrentConvId(persistedConvId)
      }
      return existingNoteId
    }

    const noteMarkdown = extractAssistantNoteMarkdown(msg.content)
    const noteId = createWorkspaceNote(null, deriveAssistantNoteName(msg.content))
    updateWorkspaceNoteContent(noteId, noteMarkdown)
    clearWorkspacePendingRename()

    if (openAfterCreate) {
      openWorkspaceTab(noteId)
      navigate({ type: 'note', noteId })
    }

    const nextAssistantNoteIds = { ...assistantNoteIds, [msg.id]: noteId }
    setAssistantNoteIds(nextAssistantNoteIds)
    const persistedConvId = persistCurrentConversation(
      conversationMessages,
      attachedContext,
      attachedWorkspaceItems,
      conversationId,
      nextAssistantNoteIds,
      strictMode,
    )
    if (persistedConvId && !conversationId) setCurrentConvId(persistedConvId)
    return noteId
  }, [assistantNoteIds, attachedContext, attachedWorkspaceItems, clearWorkspacePendingRename, createWorkspaceNote, currentConvId, findExistingAssistantNoteId, messages, navigate, openWorkspaceTab, persistCurrentConversation, strictMode, updateWorkspaceNoteContent])

  const handleAssistantNoteAction = useCallback((msg: ChatMessage) => {
    createAssistantNoteFromMessage(msg, { openAfterCreate: true })
  }, [createAssistantNoteFromMessage])

  const applyStrictMode = useCallback((nextStrictMode: boolean) => {
    setStrictMode(nextStrictMode)
    const persistedConvId = persistCurrentConversation(
      messages,
      attachedContext,
      attachedWorkspaceItems,
      currentConvId,
      assistantNoteIds,
      nextStrictMode,
    )
    if (persistedConvId && !currentConvId) setCurrentConvId(persistedConvId)
  }, [assistantNoteIds, attachedContext, attachedWorkspaceItems, currentConvId, messages, persistCurrentConversation])

  // ── Send message ─────────────────────────────────────────────────────────────
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const [commandMenuIndex, setCommandMenuIndex] = useState(0)

  const isDraftNoteInput = inputMode === 'commands' && isDraftNoteCommandQuery(inputModeQuery)
  const composerPlaceholder = inputModeConfig?.placeholder
    || (appLocale === 'fr'
      ? 'Message PRISM AI… (⏎ envoyer, ⇧⏎ nouvelle ligne)'
      : 'Message PRISM AI… (Enter to send, Shift+Enter for newline)')
  const focusComposer = () => {
    setTimeout(() => composerRef.current?.focus(), 0)
  }

  const commandQuery = inputMode === 'commands' ? inputModeQuery.trim().toLowerCase() : ''
  const commandMenuItems: ChatInputMenuItem[] = inputMode !== 'commands' || isDraftNoteInput
    ? []
    : [
        strictMode
          ? {
              id: 'strict-off',
              badge: 'MODE',
              badgeColor: COMMAND_BADGE_COLOR,
              label: 'strict off',
              meta: appLocale === 'fr'
                ? 'Désactiver le mode strict PRISM pour revenir au mode conversationnel.'
                : 'Disable strict mode and return to the normal chat behavior.',
              onSelect: () => {
                applyStrictMode(false)
                setInput('')
                setCommandMenuIndex(0)
                focusComposer()
              },
            }
          : {
              id: 'strict',
              badge: 'MODE',
              badgeColor: COMMAND_BADGE_COLOR,
              label: 'strict',
              meta: appLocale === 'fr'
                ? 'Activer le mode strict: réponses sobres, hypothèses explicites, aucune invention.'
                : 'Enable strict mode with terse answers, explicit assumptions, and no guessing.',
              onSelect: () => {
                applyStrictMode(true)
                setInput('')
                setCommandMenuIndex(0)
                focusComposer()
              },
            },
        {
          id: 'draft-note',
          badge: 'NOTE',
          badgeColor: DOCUMENT_BADGE_COLOR,
          label: 'draft_note',
          meta: appLocale === 'fr'
            ? 'Préparer une note Markdown propre et la créer automatiquement dans le workspace.'
            : 'Generate a clean markdown note and create it automatically in the workspace.',
          onSelect: () => {
            setInput('>draft_note ')
            setCommandMenuIndex(0)
            focusComposer()
          },
        },
      ].filter(item => {
        if (!commandQuery) return true
        return `${item.label} ${item.meta}`.toLowerCase().includes(commandQuery)
      })

  const attachmentQuery = inputMode === 'sif' ? inputModeQuery.trim().toLowerCase() : ''
  const attachmentMenuItems: ChatInputMenuItem[] = inputMode !== 'sif'
    ? []
    : [
        ...allSIFs
          .filter(item => {
            if (!attachmentQuery) return true
            return `${item.sifNumber} ${item.sifName} ${item.projectName}`.toLowerCase().includes(attachmentQuery)
          })
          .slice(0, 5)
          .map(item => ({
            id: `sif-${item.sifId}`,
            badge: 'SIF',
            badgeColor: ATTACH_BADGE_COLOR,
            label: `${item.sifNumber} · ${item.sifName}`,
            meta: item.projectName,
            active: attachedContext?.sifId === item.sifId,
            onSelect: () => {
              handleAttachSIFSelection(item)
              setInput('')
              setCommandMenuIndex(0)
              focusComposer()
            },
          })),
        ...workspaceItems
          .filter(item => {
            if (!attachmentQuery) return true
            return `${item.nodeName} ${item.nodeType}`.toLowerCase().includes(attachmentQuery)
          })
          .slice(0, 5)
          .map(item => ({
            id: `workspace-${item.nodeId}`,
            badge: item.nodeType.toUpperCase(),
            badgeColor: item.nodeType === 'note' ? COMMAND_BADGE_COLOR : DOCUMENT_BADGE_COLOR,
            label: item.nodeName,
            meta: workspaceKindLabels[item.nodeType],
            active: attachedWorkspaceItems.some(entry => entry.nodeId === item.nodeId),
            onSelect: () => {
              toggleWorkspaceAttachment(item)
              setInput('')
              setCommandMenuIndex(0)
              focusComposer()
            },
          })),
      ].slice(0, 8)

  const activeCommandMenuItems = inputMode === 'sif'
    ? attachmentMenuItems
    : commandMenuItems
  const activeCommandTokenBadge = inputMode === 'commands'
    ? resolveCommandTokenBadge(inputModeQuery, commandMenuItems)
    : null


  useEffect(() => {
    setCommandMenuIndex(0)
  }, [inputMode, inputModeQuery, strictMode, attachedContext?.sifId, attachedWorkspaceItems.length])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isStreaming) return

    if (inputMode === 'sif') {
      const selectedAttachment = attachmentMenuItems[commandMenuIndex] ?? attachmentMenuItems[0]
      selectedAttachment?.onSelect()
      return
    }

    if (inputMode === 'commands' && !isDraftNoteInput) {
      const selectedCommand = commandMenuItems[commandMenuIndex] ?? commandMenuItems[0]
      selectedCommand?.onSelect()
      return
    }

    const responseMode: ChatResponseMode = isDraftNoteInput ? 'draft_note' : 'default'
    const requestText = responseMode === 'draft_note' ? extractDraftNotePrompt(inputModeQuery) : text
    if (!requestText.trim()) return

    const userMsg: ChatMessage = { id: genId(), role: 'user', content: text, timestamp: Date.now() }
    const updatedMsgs = [...messages, userMsg]
    const requestMsgs = [
      ...messages.map(msg => msg.role === 'user' ? { ...msg, content: normalizeOutgoingUserContent(msg.content) } : msg),
      { ...userMsg, content: requestText },
    ]
    setMessages(updatedMsgs)
    setInput('')
    setCommandMenuIndex(0)
    setIsStreaming(true)

    const assistantId = genId()
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', timestamp: Date.now() }])

    try {
      const attachedSIF = attachedContext?.sifId
        ? projects.flatMap(project => project.sifs).find(sif => sif.id === attachedContext.sifId) ?? null
        : null
      const contextSIF = attachedSIF ?? currentSIF
      const workspaceContext: WorkspaceContext = {
        context_md: prismFiles['context.md'] ?? '',
        conventions_md: prismFiles['conventions.md'] ?? '',
        standards_md: prismFiles['standards.md'] ?? '',
        sif_registry_md: generateSIFRegistry(projects),
        active_sif_json: contextSIF ? serializeSIFForAI(contextSIF) : undefined,
      }
      const workspaceAttachments: ChatAttachmentPayload[] = []
      for (const item of attachedWorkspaceItems) {
        const node = workspaceNodes[item.nodeId]
        if (!node) continue
        if (node.type === 'note') {
          workspaceAttachments.push({
            kind: 'note',
            node_id: node.id,
            name: node.name,
            content: node.content,
          })
          continue
        }
        if (node.type === 'pdf' || node.type === 'image') {
          let url: string | undefined
          try {
            url = await getWorkspaceFileUrl(node.storageKey)
          } catch {
            url = undefined
          }
          workspaceAttachments.push({
            kind: node.type,
            node_id: node.id,
            name: node.name,
            ...(url ? { url } : {}),
          })
        }
      }

      let accumulated = ''
      for await (const chunk of streamPRISMAI(
        requestMsgs,
        attachedContext ?? undefined,
        config,
        workspaceContext,
        workspaceAttachments,
        {
          strictMode,
          responseMode,
        },
      )) {
        accumulated += chunk
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: accumulated } : m))
      }

      const finalAssistantMessage: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: accumulated,
        timestamp: Date.now(),
      }
      const finalMsgs = [...updatedMsgs, finalAssistantMessage]

      if (responseMode === 'draft_note') {
        createAssistantNoteFromMessage(finalAssistantMessage, {
          openAfterCreate: false,
          conversationMessages: finalMsgs,
          convId: currentConvId,
        })
      } else {
        const newId = persistCurrentConversation(
          finalMsgs,
          attachedContext,
          attachedWorkspaceItems,
          currentConvId,
          assistantNoteIds,
          strictMode,
        )
        if (newId && !currentConvId) setCurrentConvId(newId)
      }
    } finally {
      setIsStreaming(false)
    }
  }, [attachmentMenuItems, attachedContext, attachedWorkspaceItems, assistantNoteIds, commandMenuIndex, commandMenuItems, config, createAssistantNoteFromMessage, currentConvId, currentSIF, input, inputMode, inputModeQuery, isDraftNoteInput, isStreaming, messages, persistCurrentConversation, prismFiles, projects, strictMode, workspaceNodes])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (activeCommandMenuItems.length > 0 && e.key === 'ArrowDown') {
      e.preventDefault()
      setCommandMenuIndex(prev => (prev + 1) % activeCommandMenuItems.length)
      return
    }
    if (activeCommandMenuItems.length > 0 && e.key === 'ArrowUp') {
      e.preventDefault()
      setCommandMenuIndex(prev => prev <= 0 ? activeCommandMenuItems.length - 1 : prev - 1)
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }, [activeCommandMenuItems.length, handleSend])

  const attachmentCount = (attachedContext ? 1 : 0) + attachedWorkspaceItems.length

  return {
    allSIFs,
    applyStrictMode,
    attachPickerOpen,
    attachedContext,
    attachedWorkspaceItems,
    attachmentCount,
    composerPlaceholder,
    composerRef,
    commandMenuIndex,
    config,
    configOpen,
    conversations,
    createNoteLabel,
    currentConvId,
    handleAssistantNoteAction,
    handleAttachSIFSelection,
    handleConfigChange,
    handleDeleteConversation,
    handleKeyDown,
    handleLoadConversation,
    handleNewChat,
    handleSend,
    historyOpen,
    findExistingAssistantNoteId,
    input,
    inputModeConfig,
    isStreaming,
    messages,
    messagesEndRef,
    openNoteLabel,
    removeWorkspaceAttachment,
    setAttachPickerOpen,
    setCommandMenuIndex,
    setConfigOpen,
    setHistoryOpen,
    setInput,
    setAttachedContext,
    strictMode,
    strictModeLabel,
    toggleAttachPicker,
    toggleWorkspaceAttachment,
    workspaceItems,
    activeCommandMenuItems,
    activeCommandTokenBadge,
  }
}
