import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { useAppStore } from '@/store/appStore'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { getWorkspaceFileUrl } from '@/lib/workspaceStorage'
import { serializeProjectForAI, serializeSIFForAI, streamPRISMAI, type ChatAttachmentPayload, type WorkspaceContext } from '@/lib/aiApi'
import { detectMode } from '../command-palette/modes'
import { generateSIFRegistry } from '@/utils/generateSIFRegistry'
import {
  buildProjectCommandSeed,
  parseLibraryDraftProposal,
  parseProjectDraftProposal,
  parseProjectScopedCommand,
  parseSifDraftProposal,
  resolveProjectCandidate,
} from './commands'
import { buildPrismHelpAttachments, findPrismHelpEntries } from './helpIndex'
import { registerPrismAiAutomationController, unregisterPrismAiAutomationController } from './automation'
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
  DEFAULT_CONFIG,
  clearLegacyChatStorage,
  genId,
  loadLegacyActiveConversationId,
  loadLegacyConfig,
  loadLegacyConversations,
  titleFromMessages,
} from './persistence'
import { loadPrismAIState, savePrismAIState } from './persistenceDb'
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
  const authUser = useAppStore(s => s.authUser)
  const aiDraftPreview = useAppStore(s => s.aiDraftPreview)
  const aiDraftResults = useAppStore(s => s.aiDraftResults)
  const aiProjectDraftPreview = useAppStore(s => s.aiProjectDraftPreview)
  const aiProjectDraftResults = useAppStore(s => s.aiProjectDraftResults)
  const aiLibraryDraftPreview = useAppStore(s => s.aiLibraryDraftPreview)
  const aiLibraryDraftResults = useAppStore(s => s.aiLibraryDraftResults)
  const componentTemplates = useAppStore(s => s.componentTemplates)
  const openAISIFDraftPreview = useAppStore(s => s.openAISIFDraftPreview)
  const openAIProjectDraftPreview = useAppStore(s => s.openAIProjectDraftPreview)
  const openAILibraryDraftPreview = useAppStore(s => s.openAILibraryDraftPreview)
  const clearAISIFDraftResult = useAppStore(s => s.clearAISIFDraftResult)
  const clearAIProjectDraftResult = useAppStore(s => s.clearAIProjectDraftResult)
  const clearAILibraryDraftResult = useAppStore(s => s.clearAILibraryDraftResult)
  const setRightPanelOpen = useAppStore(s => s.setRightPanelOpen)
  const preferences = useAppStore(s => s.preferences)
  const appLocale = preferences.language
  const workspaceNodes = useWorkspaceStore(s => s.nodes)
  const createWorkspaceNote = useWorkspaceStore(s => s.createNote)
  const updateWorkspaceNoteContent = useWorkspaceStore(s => s.updateNoteContent)
  const openWorkspaceTab = useWorkspaceStore(s => s.openTab)
  const clearWorkspacePendingRename = useWorkspaceStore(s => s.clearPendingRename)
  const currentProject = view.type === 'sif-dashboard'
    ? projects.find(project => project.id === view.projectId) ?? null
    : null
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
    .filter(node => node.type === 'note' || node.type === 'pdf' || node.type === 'image' || node.type === 'json')
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
    json: 'JSON',
  } satisfies Record<AttachedWorkspaceItem['nodeType'], string>
  const strictModeLabel = appLocale === 'fr' ? 'Mode strict' : 'Strict mode'

  // ── Chat state ──────────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [currentConvId, setCurrentConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const { mode: inputMode, query: inputModeQuery, config: inputModeConfig } = detectMode(input)
  const [strictMode, setStrictMode] = useState(() => preferences.aiStrictModeDefault)
  const [isStreaming, setIsStreaming] = useState(false)
  const [attachedContext, setAttachedContext] = useState<AttachedContext | null>(null)
  const [attachedWorkspaceItems, setAttachedWorkspaceItems] = useState<AttachedWorkspaceItem[]>([])
  const [config, setConfig] = useState<ChatConfig>(() => ({
    ...DEFAULT_CONFIG,
    model: preferences.aiDefaultModel || DEFAULT_CONFIG.model,
  }))
  const [assistantNoteIds, setAssistantNoteIds] = useState<Record<string, string>>({})

  // ── UI state ────────────────────────────────────────────────────────────────
  const [historyOpen, setHistoryOpen] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const [attachPickerOpen, setAttachPickerOpen] = useState(false)

  const prismAiConversationIdsRef = useRef<string[] | null>(null)
  const prismAiHydratedRef = useRef(false)

  const hydrateConversationState = useCallback((
    nextConversations: ChatConversation[],
    nextActiveConversationId: string | null,
    nextConfig: ChatConfig,
  ) => {
    const activeConversation = (nextActiveConversationId
      ? nextConversations.find(conv => conv.id === nextActiveConversationId) ?? null
      : null) ?? nextConversations[0] ?? null

    setConversations(nextConversations)
    setCurrentConvId(activeConversation?.id ?? null)
    setMessages(activeConversation?.messages ?? [])
    setStrictMode(activeConversation?.strictMode ?? false)
    setAttachedContext(activeConversation?.contextSIFId
      ? { sifId: activeConversation.contextSIFId, sifName: activeConversation.contextSIFName ?? '' }
      : null)
    setAttachedWorkspaceItems(activeConversation?.attachedWorkspaceItems ?? [])
    setAssistantNoteIds(activeConversation?.assistantNoteIds ?? {})
    setConfig(nextConfig)
  }, [])

  useEffect(() => {
    let cancelled = false

    const applyLegacyState = () => {
      const legacyConversations = loadLegacyConversations()
      const legacyActiveConversationId = loadLegacyActiveConversationId()
      const legacyConfig = loadLegacyConfig()
      if (cancelled) return
      hydrateConversationState(legacyConversations, legacyActiveConversationId, legacyConfig)
      prismAiConversationIdsRef.current = legacyConversations.map(conv => conv.id)
      prismAiHydratedRef.current = true
    }

    const hydrate = async () => {
      prismAiHydratedRef.current = false
      const userId = authUser?.id ?? null

      if (!userId) {
        applyLegacyState()
        return
      }

      try {
        let remoteState = await loadPrismAIState(userId)
        if (remoteState.conversations.length === 0) {
          const legacyConversations = loadLegacyConversations()
          const legacyActiveConversationId = loadLegacyActiveConversationId()
          const legacyConfig = loadLegacyConfig()
          const hasLegacyData = legacyConversations.length > 0
            || Boolean(legacyActiveConversationId)
            || legacyConfig.model !== DEFAULT_CONFIG.model
            || legacyConfig.systemPrompt !== DEFAULT_CONFIG.systemPrompt

          if (hasLegacyData) {
            await savePrismAIState(userId, legacyConversations, legacyActiveConversationId, legacyConfig, [])
            clearLegacyChatStorage()
            remoteState = {
              conversations: legacyConversations,
              activeConversationId: legacyActiveConversationId,
              config: legacyConfig,
            }
          }
        }

        if (cancelled) return
        hydrateConversationState(remoteState.conversations, remoteState.activeConversationId, remoteState.config)
        prismAiConversationIdsRef.current = remoteState.conversations.map(conv => conv.id)
        prismAiHydratedRef.current = true
      } catch {
        applyLegacyState()
      }
    }

    void hydrate()

    return () => {
      cancelled = true
    }
  }, [authUser?.id, hydrateConversationState])

  useEffect(() => {
    if (!prismAiHydratedRef.current || !authUser?.id) return

    let cancelled = false
    const timer = setTimeout(() => {
      void savePrismAIState(authUser.id, conversations.slice(0, 50), currentConvId, config, prismAiConversationIdsRef.current)
        .then(ids => {
          if (!cancelled) prismAiConversationIdsRef.current = ids
        })
        .catch(() => {
          // keep local in-memory state; next mutation will retry
        })
    }, 400)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [authUser?.id, config, conversations, currentConvId])

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
    setConversations(prev => [conv, ...prev.filter(entry => entry.id !== id)])
    return id
  }, [])

  // ── New chat ────────────────────────────────────────────────────────────────
  const handleNewChat = useCallback(() => {
    persistCurrentConversation(messages, attachedContext, attachedWorkspaceItems, currentConvId, assistantNoteIds, strictMode)
    setMessages([])
    setAssistantNoteIds({})
    setCurrentConvId(null)
    setStrictMode(preferences.aiStrictModeDefault)
    setAttachedContext(null)
    setAttachedWorkspaceItems([])
    setAttachPickerOpen(false)
    setHistoryOpen(false)
    setConfigOpen(false)
  }, [messages, attachedContext, attachedWorkspaceItems, currentConvId, assistantNoteIds, persistCurrentConversation, strictMode, preferences.aiStrictModeDefault])

  // ── Load conversation ────────────────────────────────────────────────────────
  const handleLoadConversation = useCallback((conv: ChatConversation) => {
    persistCurrentConversation(messages, attachedContext, attachedWorkspaceItems, currentConvId, assistantNoteIds, strictMode)
    setMessages(conv.messages)
    setAssistantNoteIds(conv.assistantNoteIds ?? {})
    setCurrentConvId(conv.id)
    setStrictMode(conv.strictMode ?? false)
    setAttachedContext(conv.contextSIFId ? { sifId: conv.contextSIFId, sifName: conv.contextSIFName ?? '' } : null)
    setAttachedWorkspaceItems(conv.attachedWorkspaceItems ?? [])
    setAttachPickerOpen(false)
    setHistoryOpen(false)
  }, [messages, attachedContext, attachedWorkspaceItems, currentConvId, assistantNoteIds, persistCurrentConversation, strictMode])

  // ── Delete conversation ──────────────────────────────────────────────────────
  const handleDeleteConversation = useCallback((id: string, e: MouseEvent) => {
    e.stopPropagation()
    setConversations(prev => prev.filter(conv => conv.id !== id))
    if (currentConvId === id) {
      setMessages([])
      setAssistantNoteIds({})
      setCurrentConvId(null)
      setStrictMode(preferences.aiStrictModeDefault)
      setAttachedContext(null)
      setAttachedWorkspaceItems([])
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
  }, [])

  const findExistingAssistantNoteId = useCallback((msg: ChatMessage) => {
    if (msg.proposal) return null

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
    if (msg.role !== 'assistant' || msg.proposal || !msg.content.trim()) return null

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

  const findExistingSIFProposalResult = useCallback((msg: ChatMessage) => {
    if (msg.proposal?.kind !== 'sif_draft') return null
    const mappedResult = aiDraftResults[msg.id]
    if (!mappedResult) return null

    const exists = projects.some(project => (
      project.id === mappedResult.projectId
      && project.sifs.some(sif => sif.id === mappedResult.sifId)
    ))

    return exists ? mappedResult : null
  }, [aiDraftResults, projects])

  const findExistingProjectProposalResult = useCallback((msg: ChatMessage) => {
    if (msg.proposal?.kind !== 'project_draft') return null
    const mappedResult = aiProjectDraftResults[msg.id]
    if (!mappedResult) return null

    const exists = projects.some(project => project.id === mappedResult.projectId)
    return exists ? mappedResult : null
  }, [aiProjectDraftResults, projects])

  const findExistingLibraryProposalResult = useCallback((msg: ChatMessage) => {
    if (msg.proposal?.kind !== 'library_draft') return null
    const mappedResult = aiLibraryDraftResults[msg.id]
    if (!mappedResult) return null

    const exists = componentTemplates.some(template => template.id === mappedResult.templateId)
    return exists ? mappedResult : null
  }, [aiLibraryDraftResults, componentTemplates])

  const findExistingProposalResult = useCallback((msg: ChatMessage) => {
    if (msg.proposal?.kind === 'sif_draft') return findExistingSIFProposalResult(msg)
    if (msg.proposal?.kind === 'project_draft') return findExistingProjectProposalResult(msg)
    if (msg.proposal?.kind === 'library_draft') return findExistingLibraryProposalResult(msg)
    return null
  }, [findExistingLibraryProposalResult, findExistingProjectProposalResult, findExistingSIFProposalResult])

  useEffect(() => {
    const staleMessageIds = Object.keys(aiDraftResults).filter(messageId => {
      const mappedResult = aiDraftResults[messageId]
      return !projects.some(project => (
        project.id === mappedResult.projectId
        && project.sifs.some(sif => sif.id === mappedResult.sifId)
      ))
    })

    if (staleMessageIds.length === 0) return
    staleMessageIds.forEach(clearAISIFDraftResult)
  }, [aiDraftResults, clearAISIFDraftResult, projects])

  useEffect(() => {
    const staleMessageIds = Object.keys(aiProjectDraftResults).filter(messageId => {
      const mappedResult = aiProjectDraftResults[messageId]
      return !projects.some(project => project.id === mappedResult.projectId)
    })

    if (staleMessageIds.length === 0) return
    staleMessageIds.forEach(clearAIProjectDraftResult)
  }, [aiProjectDraftResults, clearAIProjectDraftResult, projects])

  useEffect(() => {
    const staleMessageIds = Object.keys(aiLibraryDraftResults).filter(messageId => {
      const mappedResult = aiLibraryDraftResults[messageId]
      return !componentTemplates.some(template => template.id === mappedResult.templateId)
    })

    if (staleMessageIds.length === 0) return
    staleMessageIds.forEach(clearAILibraryDraftResult)
  }, [aiLibraryDraftResults, clearAILibraryDraftResult, componentTemplates])

  const handleProposalOpen = useCallback((msg: ChatMessage) => {
    if (!msg.proposal) return

    const existingResult = findExistingProposalResult(msg)
    if (msg.proposal.kind === 'project_draft') {
      if (existingResult && 'firstSifId' in existingResult) {
        if (existingResult.firstSifId) {
          navigate({ type: 'sif-dashboard', projectId: existingResult.projectId, sifId: existingResult.firstSifId, tab: 'context' })
        } else {
          navigate({ type: 'projects' })
        }
        return
      }

      openAIProjectDraftPreview({
        messageId: msg.id,
        command: msg.proposal.command,
        summary: msg.proposal.summary,
        assumptions: msg.proposal.assumptions,
        missingData: msg.proposal.missingData,
        uncertainData: msg.proposal.uncertainData,
        conflicts: msg.proposal.conflicts,
        prismFile: msg.proposal.prismFile,
      })
      return
    }

    if (msg.proposal.kind === 'library_draft') {
      if (existingResult && 'templateId' in existingResult) {
        navigate({
          type: 'library',
          templateId: existingResult.templateId,
          origin: existingResult.origin,
          libraryName: existingResult.libraryName,
        })
        setRightPanelOpen(true)
        return
      }

      navigate({ type: 'library' })
      setRightPanelOpen(true)
      openAILibraryDraftPreview({
        messageId: msg.id,
        command: msg.proposal.command,
        targetScope: msg.proposal.targetScope,
        targetProjectId: msg.proposal.targetProjectId,
        targetProjectName: msg.proposal.targetProjectName,
        summary: msg.proposal.summary,
        assumptions: msg.proposal.assumptions,
        missingData: msg.proposal.missingData,
        uncertainData: msg.proposal.uncertainData,
        conflicts: msg.proposal.conflicts,
        fieldStatus: msg.proposal.fieldStatus,
        libraryFile: msg.proposal.libraryFile,
        templateInput: msg.proposal.templateInput,
      })
      return
    }

    if (existingResult && 'sifId' in existingResult) {
      navigate({ type: 'sif-dashboard', projectId: existingResult.projectId, sifId: existingResult.sifId, tab: 'context' })
      return
    }

    openAISIFDraftPreview({
      messageId: msg.id,
      command: msg.proposal.command,
      projectId: msg.proposal.targetProjectId,
      summary: msg.proposal.summary,
      assumptions: msg.proposal.assumptions,
      missingData: msg.proposal.missingData,
      uncertainData: msg.proposal.uncertainData,
      conflicts: msg.proposal.conflicts,
      fieldStatus: msg.proposal.fieldStatus,
      draft: msg.proposal.draft,
    })
  }, [findExistingProposalResult, navigate, openAILibraryDraftPreview, openAIProjectDraftPreview, openAISIFDraftPreview, setRightPanelOpen])

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

  const parsedProjectCommand = inputMode === 'commands' ? parseProjectScopedCommand(inputModeQuery) : null
  const isDraftNoteInput = inputMode === 'commands' && isDraftNoteCommandQuery(inputModeQuery)
  const composerPlaceholder = inputModeConfig?.placeholder
    || (appLocale === 'fr'
      ? 'Message PRISM AI… (⏎ envoyer, ⇧⏎ nouvelle ligne)'
      : 'Message PRISM AI… (Enter to send, Shift+Enter for newline)')
  const focusComposer = useCallback(() => {
    setTimeout(() => composerRef.current?.focus(), 0)
  }, [])

  useEffect(() => {
    const controller = {
      executeStep: (step: { kind: 'chat.newConversation' | 'chat.insert' | 'chat.focus'; text?: string }) => {
        switch (step.kind) {
          case 'chat.newConversation':
            handleNewChat()
            break
          case 'chat.insert':
            setInput(step.text ?? '')
            break
          case 'chat.focus':
            focusComposer()
            break
          default:
            break
        }
      },
    }

    registerPrismAiAutomationController(controller)
    return () => unregisterPrismAiAutomationController(controller)
  }, [focusComposer, handleNewChat])

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
          id: 'create-project',
          badge: 'PROJECT',
          badgeColor: COMMAND_BADGE_COLOR,
          label: 'create_project',
          meta: appLocale === 'fr'
            ? 'Créer un nouveau projet gouverné au format .prism, avec preview et validation avant application.'
            : 'Create a governed new project using the .prism contract, with preview and validation before apply.',
          onSelect: () => {
            setInput(buildProjectCommandSeed('create_project'))
            setCommandMenuIndex(0)
            focusComposer()
          },
        },
        {
          id: 'create-library',
          badge: 'LIB',
          badgeColor: DOCUMENT_BADGE_COLOR,
          label: 'create_library',
          meta: appLocale === 'fr'
            ? 'Créer un template Library gouverné avec preview de configuration avant application.'
            : 'Create a governed Library template with configuration preview before apply.',
          onSelect: () => {
            setInput(buildProjectCommandSeed('create_library', currentProject))
            setCommandMenuIndex(0)
            focusComposer()
          },
        },
        {
          id: 'create-sif',
          badge: 'SIF',
          badgeColor: COMMAND_BADGE_COLOR,
          label: 'create_sif',
          meta: appLocale === 'fr'
            ? 'Créer une nouvelle SIF gouvernée pour un projet cible, avec preview workflow avant application.'
            : 'Create a governed new SIF for a target project, with workflow preview before apply.',
          onSelect: () => {
            setInput(buildProjectCommandSeed('create_sif', currentProject))
            setCommandMenuIndex(0)
            focusComposer()
          },
        },
        {
          id: 'draft-sif',
          badge: 'SIF',
          badgeColor: COMMAND_BADGE_COLOR,
          label: 'draft_sif',
          meta: appLocale === 'fr'
            ? 'Préparer un brouillon de SIF gouverné pour un projet cible, sans rien appliquer avant validation.'
            : 'Prepare a governed SIF draft for a target project, without applying anything before approval.',
          onSelect: () => {
            setInput(buildProjectCommandSeed('draft_sif', currentProject))
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
  const helpQuery = inputMode === 'help' ? inputModeQuery.trim() : ''
  const helpEntries = inputMode === 'help' ? findPrismHelpEntries(helpQuery, appLocale, currentProject) : []
  const helpMenuItems: ChatInputMenuItem[] = inputMode !== 'help'
    ? []
    : helpEntries
        .slice(0, 8)
        .map(entry => ({
          id: entry.id,
          badge: entry.badge,
          badgeColor: entry.kind === 'command' ? COMMAND_BADGE_COLOR : DOCUMENT_BADGE_COLOR,
          label: entry.label,
          meta: entry.meta,
          onSelect: () => {
            setInput(`?${entry.query}`)
            setCommandMenuIndex(0)
            focusComposer()
          },
        }))

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
    : inputMode === 'help'
      ? helpMenuItems
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

    if (inputMode === 'help' && !inputModeQuery.trim()) {
      const selectedHelp = helpMenuItems[commandMenuIndex] ?? helpMenuItems[0]
      selectedHelp?.onSelect()
      return
    }

    if (inputMode === 'commands' && !isDraftNoteInput && !parsedProjectCommand) {
      const selectedCommand = commandMenuItems[commandMenuIndex] ?? commandMenuItems[0]
      selectedCommand?.onSelect()
      return
    }

    const responseMode: ChatResponseMode = isDraftNoteInput
      ? 'draft_note'
      : parsedProjectCommand?.kind ?? 'default'
    const defaultStructuredPrompt = responseMode === 'create_project'
      ? (appLocale === 'fr'
        ? 'Prépare un brouillon de projet .prism cohérent avec le contexte, les conventions et les standards fournis.'
        : 'Prepare a .prism project draft that is consistent with the provided context, conventions, and standards.')
      : responseMode === 'create_library'
        ? (appLocale === 'fr'
          ? 'Prépare un template Library gouverné cohérent avec le contexte, les conventions et les standards fournis.'
          : 'Prepare a governed Library template consistent with the provided context, conventions, and standards.')
        : (appLocale === 'fr'
          ? 'Prépare un brouillon SIF cohérent avec le contexte projet, les conventions et les standards fournis.'
          : 'Prepare a SIF draft that is consistent with the project context, conventions, and standards provided.')
    const helpRequestPrompt = appLocale === 'fr'
      ? "Répondez uniquement à partir de l'aide commande PRISM et de la documentation PRISM jointes. Si l'information n'est pas présente, dites-le explicitement et n'inventez rien. Question: "
      : 'Answer only from the attached PRISM command help and PRISM documentation. If the information is not present, say so explicitly and do not guess. Question: '
    const requestText = inputMode === 'help'
      ? `${helpRequestPrompt}${inputModeQuery.trim()}`
      : responseMode === 'draft_note'
        ? extractDraftNotePrompt(inputModeQuery)
        : parsedProjectCommand
          ? (parsedProjectCommand.prompt || defaultStructuredPrompt)
          : text
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

    const targetProjectResolution = parsedProjectCommand && (
      parsedProjectCommand.kind === 'create_sif'
      || parsedProjectCommand.kind === 'draft_sif'
      || (parsedProjectCommand.kind === 'create_library' && Boolean(parsedProjectCommand.projectQuery))
    )
      ? resolveProjectCandidate(projects, parsedProjectCommand.projectQuery)
      : null

    if (targetProjectResolution && targetProjectResolution.status !== 'ok') {
      const errorContent = targetProjectResolution.status === 'missing'
        ? (appLocale === 'fr'
          ? 'La commande exige un projet cible explicite. Utilisez `project:REF` ou `project:"Nom du projet"`.'
          : 'This command requires an explicit target project. Use `project:REF` or `project:"Project Name"`.')
        : targetProjectResolution.status === 'not_found'
          ? (appLocale === 'fr'
            ? `Projet cible introuvable: ${targetProjectResolution.query}`
            : `Target project not found: ${targetProjectResolution.query}`)
          : (appLocale === 'fr'
            ? `Projet cible ambigu: ${targetProjectResolution.query}. Correspondances: ${targetProjectResolution.matches.map(project => project.ref || project.name).join(', ')}`
            : `Ambiguous target project: ${targetProjectResolution.query}. Matches: ${targetProjectResolution.matches.map(project => project.ref || project.name).join(', ')}`)

      const assistantError: ChatMessage = { id: genId(), role: 'assistant', content: errorContent, timestamp: Date.now() }
      const finalMsgs = [...updatedMsgs, assistantError]
      setMessages(finalMsgs)
      const newId = persistCurrentConversation(
        finalMsgs,
        attachedContext,
        attachedWorkspaceItems,
        currentConvId,
        assistantNoteIds,
        strictMode,
      )
      if (newId && !currentConvId) setCurrentConvId(newId)
      return
    }

    const targetProject = targetProjectResolution?.status === 'ok' ? targetProjectResolution.project : null

    setIsStreaming(true)
    const assistantId = genId()
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', timestamp: Date.now() }])

    try {
      const isProjectStructureMode = responseMode === 'create_project' || responseMode === 'create_sif' || responseMode === 'draft_sif' || responseMode === 'create_library'
      const attachedSIF = isProjectStructureMode
        ? null
        : attachedContext?.sifId
          ? projects.flatMap(project => project.sifs).find(sif => sif.id === attachedContext.sifId) ?? null
          : null
      const contextSIF = isProjectStructureMode
        ? null
        : attachedSIF ?? currentSIF
      const workspaceContext: WorkspaceContext = {
        context_md: prismFiles['context.md'] ?? '',
        conventions_md: prismFiles['conventions.md'] ?? '',
        standards_md: prismFiles['standards.md'] ?? '',
        sif_registry_md: generateSIFRegistry(projects),
        active_sif_json: contextSIF ? serializeSIFForAI(contextSIF) : undefined,
        target_project_json: targetProject ? serializeProjectForAI(targetProject) : undefined,
      }
      const workspaceAttachments: ChatAttachmentPayload[] = []
      if (inputMode === 'help') {
        const selectedHelpEntry = helpEntries[commandMenuIndex] ?? helpEntries[0] ?? null
        const prioritizedHelpEntries = selectedHelpEntry
          ? [selectedHelpEntry, ...helpEntries.filter(entry => entry.id !== selectedHelpEntry.id)]
          : helpEntries
        workspaceAttachments.push(...buildPrismHelpAttachments(prioritizedHelpEntries, appLocale))
      }
      for (const item of attachedWorkspaceItems) {
        const node = workspaceNodes[item.nodeId]
        if (!node) continue
        if (node.type === 'note' || node.type === 'json') {
          workspaceAttachments.push({
            kind: node.type,
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

      const effectiveConfig: typeof config = preferences.aiSystemPromptAddendum
        ? {
            ...config,
            systemPrompt: [config.systemPrompt, preferences.aiSystemPromptAddendum]
              .filter(Boolean).join('\n\n'),
          }
        : config

      let accumulated = ''
      for await (const chunk of streamPRISMAI(
        requestMsgs,
        isProjectStructureMode
          ? undefined
          : attachedContext ?? undefined,
        effectiveConfig,
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

      let finalAssistantMessage: ChatMessage
      if (responseMode === 'create_project') {
        const parsedProposal = parseProjectDraftProposal(accumulated)
        if (parsedProposal.ok) {
          finalAssistantMessage = {
            id: assistantId,
            role: 'assistant',
            content: appLocale === 'fr'
              ? 'Brouillon projet structuré prêt. Ouvrez la preview pour le relire avant application.'
              : 'Structured project draft ready. Open the preview to review it before applying.',
            timestamp: Date.now(),
            proposal: parsedProposal.proposal,
          }
          openAIProjectDraftPreview({
            messageId: assistantId,
            command: parsedProposal.proposal.command,
            summary: parsedProposal.proposal.summary,
            assumptions: parsedProposal.proposal.assumptions,
            missingData: parsedProposal.proposal.missingData,
            uncertainData: parsedProposal.proposal.uncertainData,
            conflicts: parsedProposal.proposal.conflicts,
            prismFile: parsedProposal.proposal.prismFile,
          })
        } else {
          finalAssistantMessage = {
            id: assistantId,
            role: 'assistant',
            content: appLocale === 'fr'
              ? `Réponse structurée invalide pour ${responseMode}.

${parsedProposal.error}

${accumulated}`
              : `Invalid structured response for ${responseMode}.

${parsedProposal.error}

${accumulated}`,
            timestamp: Date.now(),
          }
        }
      } else if (responseMode === 'create_library') {
        const parsedProposal = parseLibraryDraftProposal(accumulated, targetProject)
        if (parsedProposal.ok) {
          finalAssistantMessage = {
            id: assistantId,
            role: 'assistant',
            content: appLocale === 'fr'
              ? 'Brouillon Library structuré prêt. Ouvrez la preview de configuration pour le relire avant application.'
              : 'Structured Library draft ready. Open the configuration preview to review it before applying.',
            timestamp: Date.now(),
            proposal: parsedProposal.proposal,
          }
          navigate({ type: 'library' })
          setRightPanelOpen(true)
          openAILibraryDraftPreview({
            messageId: assistantId,
            command: parsedProposal.proposal.command,
            targetScope: parsedProposal.proposal.targetScope,
            targetProjectId: parsedProposal.proposal.targetProjectId,
            targetProjectName: parsedProposal.proposal.targetProjectName,
            summary: parsedProposal.proposal.summary,
            assumptions: parsedProposal.proposal.assumptions,
            missingData: parsedProposal.proposal.missingData,
            uncertainData: parsedProposal.proposal.uncertainData,
            conflicts: parsedProposal.proposal.conflicts,
            fieldStatus: parsedProposal.proposal.fieldStatus,
            libraryFile: parsedProposal.proposal.libraryFile,
            templateInput: parsedProposal.proposal.templateInput,
          })
        } else {
          finalAssistantMessage = {
            id: assistantId,
            role: 'assistant',
            content: appLocale === 'fr'
              ? `Réponse structurée invalide pour ${responseMode}.

${parsedProposal.error}

${accumulated}`
              : `Invalid structured response for ${responseMode}.

${parsedProposal.error}

${accumulated}` ,
            timestamp: Date.now(),
          }
        }
      } else if ((responseMode === 'create_sif' || responseMode === 'draft_sif') && targetProject) {
        const parsedProposal = parseSifDraftProposal(accumulated, responseMode, targetProject)
        if (parsedProposal.ok) {
          finalAssistantMessage = {
            id: assistantId,
            role: 'assistant',
            content: appLocale === 'fr'
              ? 'Brouillon SIF structuré prêt. Ouvrez la preview workflow pour le relire avant application.'
              : 'Structured SIF draft ready. Open the workflow preview to review it before applying.',
            timestamp: Date.now(),
            proposal: parsedProposal.proposal,
          }
          openAISIFDraftPreview({
            messageId: assistantId,
            command: parsedProposal.proposal.command,
            projectId: parsedProposal.proposal.targetProjectId,
            summary: parsedProposal.proposal.summary,
            assumptions: parsedProposal.proposal.assumptions,
            missingData: parsedProposal.proposal.missingData,
            uncertainData: parsedProposal.proposal.uncertainData,
            conflicts: parsedProposal.proposal.conflicts,
            fieldStatus: parsedProposal.proposal.fieldStatus,
            draft: parsedProposal.proposal.draft,
          })
        } else {
          finalAssistantMessage = {
            id: assistantId,
            role: 'assistant',
            content: appLocale === 'fr'
              ? `Réponse structurée invalide pour ${responseMode}.

${parsedProposal.error}

${accumulated}`
              : `Invalid structured response for ${responseMode}.

${parsedProposal.error}

${accumulated}`,
            timestamp: Date.now(),
          }
        }
      } else {
        finalAssistantMessage = {
          id: assistantId,
          role: 'assistant',
          content: accumulated,
          timestamp: Date.now(),
        }
      }

      const finalMsgs = [...updatedMsgs, finalAssistantMessage]
      setMessages(finalMsgs)

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
  }, [activeCommandMenuItems.length, appLocale, attachedContext, attachedWorkspaceItems, assistantNoteIds, attachmentMenuItems, commandMenuIndex, commandMenuItems, config, createAssistantNoteFromMessage, currentConvId, currentProject, currentSIF, helpEntries, helpMenuItems, input, inputMode, inputModeQuery, isDraftNoteInput, isStreaming, messages, navigate, openAILibraryDraftPreview, openAIProjectDraftPreview, openAISIFDraftPreview, parsedProjectCommand, persistCurrentConversation, prismFiles, projects, setRightPanelOpen, strictMode, workspaceNodes])

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
    aiDraftPreview,
    aiProjectDraftPreview,
    aiLibraryDraftPreview,
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
    handleProposalOpen,
    handleSend,
    historyOpen,
    findExistingAssistantNoteId,
    findExistingProposalResult,
    input,
    inputMode,
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
