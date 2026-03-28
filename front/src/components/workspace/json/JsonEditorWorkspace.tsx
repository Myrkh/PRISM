import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Braces,
  CheckCircle2,
  ClipboardCopy,
  ClipboardPaste,
  Columns3,
  Copy,
  Maximize2,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  Wand2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { json } from '@codemirror/lang-json'
import { toast } from '@/components/ui/toast'
import { parseAISIFDraftWorkspaceDocument, readAISIFDraftWorkspaceMeta, serializeAISIFDraftWorkspaceDocument } from '@/components/layout/prism-ai/sifDraftWorkspaceJson'
import { parseAIProjectDraftWorkspaceDocument, readAIProjectDraftWorkspaceMeta, serializeAIProjectDraftWorkspaceDocument } from '@/components/layout/prism-ai/projectDraftWorkspaceJson'
import { parseAILibraryDraftWorkspaceDocument, readAILibraryDraftWorkspaceMeta, serializeAILibraryDraftWorkspaceDocument } from '@/components/layout/prism-ai/libraryDraftWorkspaceJson'
import {
  LibraryCollectionSpreadsheetEditor,
  type LibraryCollectionSpreadsheetHandle,
  type LibraryCollectionSpreadsheetToolbarState,
} from '@/components/library/LibraryCollectionSpreadsheetEditor'
import { formatLibraryCollectionWorkspaceSource, parseLibraryCollectionWorkspaceDocument, readLibraryCollectionWorkspaceMeta, validateLibraryCollectionWorkspaceSource } from '@/components/library/libraryCollectionWorkspaceJson'
import { useLibraryCollectionsStore } from '@/features/library/libraryCollectionsStore'
import { applyCollectionNameToImportedTemplates, componentTemplateToUpsertInput, getTemplatesForLibraryCollection } from '@/features/library/libraryCollectionSync'
import { dbUpdateLibraryCollection } from '@/lib/libraryCollections'
import { getLibraryStrings } from '@/i18n/library'
import { parseKeybindingsWorkspaceDocument } from '@/components/settings/keybindingsWorkspaceJson'
import { formatUserCommandsWorkspaceSource, parseUserCommandsWorkspaceDocument } from '@/components/settings/userCommandsWorkspaceJson'
import { useLocaleStrings } from '@/i18n/useLocale'
import { validateUserCommands } from '@/core/commands/userCommands'
import { useAppStore } from '@/store/appStore'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { WorkspaceTabBar } from '@/components/workspace/WorkspaceTabBar'
import { CodeEditor } from '@/components/workspace/code/CodeEditor'

type JsonValidationState =
  | { kind: 'valid' }
  | { kind: 'invalid'; message: string }

const JSON_EDITOR_ZOOM_STORAGE_KEY = 'prism_json_editor_zoom'

function loadJsonEditorZoom(): number {
  if (typeof window === 'undefined') return 1
  try {
    const raw = window.localStorage.getItem(JSON_EDITOR_ZOOM_STORAGE_KEY)
    const parsed = raw ? Number(raw) : 1
    return Number.isFinite(parsed) ? Math.min(1.8, Math.max(0.8, parsed)) : 1
  } catch {
    return 1
  }
}

const EMPTY_COLLECTION_TABLE_STATE: LibraryCollectionSpreadsheetToolbarState = {
  rowCount: 0,
  selectedRowCount: 0,
  hasSelection: false,
  searchOpen: false,
  freezeColumns: 0,
}

export function JsonEditorWorkspace({ nodeId }: { nodeId: string }) {
  const {
    BORDER, CARD_BG, PAGE_BG, PANEL_BG, SHADOW_SOFT,
    TEAL, TEXT, TEXT_DIM,
  } = usePrismTheme()

  const { nodes, openTab, renameNode, updateJsonContent, deleteNode, jsonEditorModes, setJsonEditorMode } = useWorkspaceStore()
  const projects = useAppStore(s => s.projects)
  const componentTemplates = useAppStore(s => s.componentTemplates)
  const isDark = useAppStore(s => s.isDark)
  const navigate = useAppStore(s => s.navigate)
  const ownerProfileId = useAppStore(s => s.profile?.id ?? s.authUser?.id ?? null)
  const libraryStrings = useLocaleStrings(getLibraryStrings)
  const importComponentTemplates = useAppStore(s => s.importComponentTemplates)
  const updateAppPreferences = useAppStore(s => s.updateAppPreferences)
  const replaceAISIFDraftPreview = useAppStore(s => s.replaceAISIFDraftPreview)
  const replaceAIProjectDraftPreview = useAppStore(s => s.replaceAIProjectDraftPreview)
  const replaceAILibraryDraftPreview = useAppStore(s => s.replaceAILibraryDraftPreview)
  const fetchLibraryCollections = useLibraryCollectionsStore(state => state.fetchCollections)
  const node = nodes[nodeId]

  useEffect(() => { openTab(nodeId) }, [nodeId, openTab])

  const [localContent, setLocalContent] = useState(node?.type === 'json' ? node.content : '')
  const [renamingTitle, setRenamingTitle] = useState(false)
  const [titleVal, setTitleVal] = useState(node?.type === 'json' ? node.name : '')
  const [isApplyingJson, setIsApplyingJson] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)
  const [editorZoom, setEditorZoom] = useState(loadJsonEditorZoom)
  const [collectionTableState, setCollectionTableState] = useState<LibraryCollectionSpreadsheetToolbarState>(EMPTY_COLLECTION_TABLE_STATE)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const collectionTableRef = useRef<LibraryCollectionSpreadsheetHandle | null>(null)

  useEffect(() => {
    if (node?.type === 'json') {
      setLocalContent(node.content)
      setTitleVal(node.name)
      setApplyError(null)
    }
  }, [nodeId, node])

  useEffect(() => {
    if (renamingTitle) titleRef.current?.select()
  }, [renamingTitle])

  const validationState = useMemo<JsonValidationState>(() => {
    if (node?.type === 'json' && (node.schema === 'prism_library_collection' || node.binding?.kind === 'library_collection')) {
      const error = validateLibraryCollectionWorkspaceSource(localContent)
      return error ? { kind: 'invalid', message: error } : { kind: 'valid' }
    }
    if (node?.type === 'json' && (node.schema === 'prism_keybindings' || node.binding?.kind === 'app_keybindings')) {
      const parsed = parseKeybindingsWorkspaceDocument(localContent)
      return parsed.ok ? { kind: 'valid' } : { kind: 'invalid', message: parsed.error }
    }
    if (node?.type === 'json' && (node.schema === 'prism_user_commands' || node.binding?.kind === 'app_user_commands')) {
      const parsed = parseUserCommandsWorkspaceDocument(localContent)
      if (!parsed.ok) return { kind: 'invalid', message: parsed.error }
      const validationError = validateUserCommands(parsed.value)
      return validationError ? { kind: 'invalid', message: validationError } : { kind: 'valid' }
    }
    try {
      JSON.parse(localContent)
      return { kind: 'valid' }
    } catch (error) {
      return {
        kind: 'invalid',
        message: error instanceof Error ? error.message : 'JSON invalide.',
      }
    }
  }, [localContent, node])

  const persistedSifDraftMeta = useMemo(() => (
    node?.type === 'json' && node.schema === 'ai_sif_draft'
      ? readAISIFDraftWorkspaceMeta(node.content)
      : null
  ), [node])

  const liveSifDraftMeta = useMemo(() => (
    node?.type === 'json' && (node.schema === 'ai_sif_draft' || node.binding?.kind === 'ai_sif_draft')
      ? readAISIFDraftWorkspaceMeta(localContent)
      : null
  ), [localContent, node])

  const persistedProjectDraftMeta = useMemo(() => (
    node?.type === 'json' && node.schema === 'prism_project_draft'
      ? readAIProjectDraftWorkspaceMeta(node.content)
      : null
  ), [node])

  const liveProjectDraftMeta = useMemo(() => (
    node?.type === 'json' && (node.schema === 'prism_project_draft' || node.binding?.kind === 'ai_project_draft')
      ? readAIProjectDraftWorkspaceMeta(localContent)
      : null
  ), [localContent, node])

  const persistedLibraryDraftMeta = useMemo(() => (
    node?.type === 'json' && node.schema === 'prism_library_draft'
      ? readAILibraryDraftWorkspaceMeta(node.content)
      : null
  ), [node])

  const liveLibraryDraftMeta = useMemo(() => (
    node?.type === 'json' && (node.schema === 'prism_library_draft' || node.binding?.kind === 'ai_library_draft')
      ? readAILibraryDraftWorkspaceMeta(localContent)
      : null
  ), [localContent, node])

  const persistedLibraryCollectionMeta = useMemo(() => (
    node?.type === 'json' && node.schema === 'prism_library_collection'
      ? readLibraryCollectionWorkspaceMeta(node.content)
      : null
  ), [node])

  const liveLibraryCollectionMeta = useMemo(() => (
    node?.type === 'json' && (node.schema === 'prism_library_collection' || node.binding?.kind === 'library_collection')
      ? readLibraryCollectionWorkspaceMeta(localContent)
      : null
  ), [localContent, node])

  const isKeybindingsDocument = node?.type === 'json'
    && (node.schema === 'prism_keybindings' || node.binding?.kind === 'app_keybindings')
  const isLibraryCollectionDocument = node?.type === 'json'
    && (node.schema === 'prism_library_collection'
      || node.binding?.kind === 'library_collection'
      || persistedLibraryCollectionMeta !== null
      || liveLibraryCollectionMeta !== null)
  const isUserCommandsDocument = node?.type === 'json'
    && (node.schema === 'prism_user_commands' || node.binding?.kind === 'app_user_commands')
  const collectionEditorMode = isLibraryCollectionDocument ? (jsonEditorModes[nodeId] ?? 'table') : 'json'
  const libraryCollectionTemplateCount = useMemo(() => {
    if (!isLibraryCollectionDocument) return null
    const parsed = parseLibraryCollectionWorkspaceDocument(localContent)
    return parsed.ok ? parsed.value.templates.length : 0
  }, [isLibraryCollectionDocument, localContent])

  useEffect(() => {
    if (collectionEditorMode !== 'table') {
      setCollectionTableState(EMPTY_COLLECTION_TABLE_STATE)
    }
  }, [collectionEditorMode])

  const handleChange = useCallback((value: string) => {
    setLocalContent(value)
    setApplyError(null)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => updateJsonContent(nodeId, value), 300)
  }, [nodeId, updateJsonContent])

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(JSON_EDITOR_ZOOM_STORAGE_KEY, String(editorZoom))
    } catch {
      // ignore localStorage errors
    }
  }, [editorZoom])

  const commitTitle = () => {
    if (!node || node.type !== 'json') return
    const nextTitle = titleVal.trim()
    if (nextTitle) renameNode(nodeId, nextTitle)
    else setTitleVal(node.name)
    setRenamingTitle(false)
  }

  const handleFormat = () => {
    if (node?.type === 'json' && (node.schema === 'prism_library_collection' || node.binding?.kind === 'library_collection')) {
      const formatted = formatLibraryCollectionWorkspaceSource(localContent)
      if (!formatted.ok) {
        setApplyError(formatted.error)
        toast.error('Format JSON impossible', formatted.error)
        return
      }
      setLocalContent(formatted.formatted)
      updateJsonContent(nodeId, formatted.formatted)
      setApplyError(null)
      return
    }

    if (node?.type === 'json' && (node.schema === 'prism_user_commands' || node.binding?.kind === 'app_user_commands')) {
      const formatted = formatUserCommandsWorkspaceSource(localContent)
      if (!formatted.ok) {
        setApplyError(formatted.error)
        toast.error('Format JSON impossible', formatted.error)
        return
      }
      setLocalContent(formatted.formatted)
      updateJsonContent(nodeId, formatted.formatted)
      setApplyError(null)
      return
    }

    try {
      const formatted = JSON.stringify(JSON.parse(localContent), null, 2)
      setLocalContent(formatted)
      updateJsonContent(nodeId, formatted)
      setApplyError(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'JSON invalide.'
      setApplyError(message)
      toast.error('Format JSON impossible', message)
    }
  }

  const syncMode = node?.type === 'json'
    ? (node.binding?.kind === 'ai_project_draft'
        || node.schema === 'prism_project_draft'
        || persistedProjectDraftMeta !== null
        || liveProjectDraftMeta !== null
        ? 'project'
        : node.binding?.kind === 'ai_library_draft'
          || node.schema === 'prism_library_draft'
          || persistedLibraryDraftMeta !== null
          || liveLibraryDraftMeta !== null
          ? 'library_draft'
          : node.binding?.kind === 'library_collection'
            || node.schema === 'prism_library_collection'
            || persistedLibraryCollectionMeta !== null
            || liveLibraryCollectionMeta !== null
            ? 'library_collection'
          : node.binding?.kind === 'app_keybindings'
            || node.schema === 'prism_keybindings'
            || isKeybindingsDocument
            ? 'keybindings'
          : node.binding?.kind === 'app_user_commands'
            || node.schema === 'prism_user_commands'
            || isUserCommandsDocument
            ? 'user_commands'
          : node.binding?.kind === 'ai_sif_draft'
            || node.schema === 'ai_sif_draft'
            || persistedSifDraftMeta !== null
            || liveSifDraftMeta !== null
            ? 'sif'
            : null)
    : null
  const canApplyJson = syncMode !== null
  const expectedDraftMessageId = node?.type === 'json'
    ? (syncMode === 'project'
        ? (node.binding?.kind === 'ai_project_draft'
            ? node.binding.messageId
            : persistedProjectDraftMeta?.messageId ?? liveProjectDraftMeta?.messageId ?? null)
        : syncMode === 'library_draft'
          ? (node.binding?.kind === 'ai_library_draft'
              ? node.binding.messageId
              : persistedLibraryDraftMeta?.messageId ?? liveLibraryDraftMeta?.messageId ?? null)
          : syncMode === 'sif'
            ? (node.binding?.kind === 'ai_sif_draft'
                ? node.binding.messageId
                : persistedSifDraftMeta?.messageId ?? liveSifDraftMeta?.messageId ?? null)
            : null)
    : null

  const expectedCollectionId = node?.type === 'json'
    ? (syncMode === 'library_collection'
        ? (node.binding?.kind === 'library_collection'
            ? node.binding.collectionId
            : persistedLibraryCollectionMeta?.collectionId ?? liveLibraryCollectionMeta?.collectionId ?? null)
        : null)
    : null

  const handleApplyJson = async () => {
    if (!node || node.type !== 'json' || !canApplyJson) return

    if (validationState.kind === 'invalid') {
      setApplyError(validationState.message)
      const invalidTitle = syncMode === 'library_collection'
        ? 'Collection JSON invalide'
        : syncMode === 'keybindings'
          ? 'keybindings.json invalide'
          : syncMode === 'user_commands'
            ? 'userCommands.json invalide'
            : 'Draft IA invalide'
      toast.error(invalidTitle, validationState.message)
      return
    }

    setIsApplyingJson(true)
    setApplyError(null)
    try {
      if (syncMode === 'library_collection') {
        if (!expectedCollectionId) {
          const message = 'Impossible de rattacher ce JSON à une collection Library.'
          setApplyError(message)
          toast.error('Collection JSON indisponible', message)
          return
        }

        const parsed = parseLibraryCollectionWorkspaceDocument(localContent, {
          expectedCollectionId,
        })
        if (!parsed.ok) {
          setApplyError(parsed.error)
          toast.error('Collection JSON invalide', parsed.error)
          return
        }

        const currentCollection = useLibraryCollectionsStore.getState().collections.find(collection => collection.id === expectedCollectionId)
        if (!currentCollection) {
          const message = 'La collection Library ciblée est introuvable.'
          setApplyError(message)
          toast.error('Collection JSON indisponible', message)
          return
        }

        if (
          parsed.value.collection.scope !== currentCollection.scope
          || parsed.value.collection.project_id !== currentCollection.projectId
        ) {
          const message = 'Le scope ou le projet de la collection ne peut pas être modifié depuis ce JSON.'
          setApplyError(message)
          toast.error('Collection JSON invalide', message)
          return
        }

        const targetCollection = {
          scope: currentCollection.scope,
          projectId: currentCollection.projectId,
          name: parsed.value.collection.name,
        }
        const upsertInputs = applyCollectionNameToImportedTemplates(parsed.value.templateInputs, targetCollection)
        const retainedIds = new Set(
          upsertInputs
            .map(input => input.id)
            .filter((value): value is string => typeof value === 'string' && value.trim().length > 0),
        )
        const existingTemplates = getTemplatesForLibraryCollection(componentTemplates, currentCollection)
        const detachInputs = existingTemplates
          .filter(template => !retainedIds.has(template.id))
          .map(template => componentTemplateToUpsertInput(template, { libraryName: null }))

        await dbUpdateLibraryCollection(expectedCollectionId, {
          name: parsed.value.collection.name,
          color: parsed.value.collection.color,
        })
        if (upsertInputs.length > 0 || detachInputs.length > 0) {
          await importComponentTemplates([...upsertInputs, ...detachInputs])
        }
        if (ownerProfileId) {
          await fetchLibraryCollections(ownerProfileId)
        }
        deleteNode(nodeId)
        navigate({ type: 'library' })
        toast.success('Collection mise à jour', 'La collection Library a été reconstruite depuis le JSON.')
        return
      }

      if (syncMode === 'keybindings') {
        const parsed = parseKeybindingsWorkspaceDocument(localContent)
        if (!parsed.ok) {
          setApplyError(parsed.error)
          toast.error('keybindings.json invalide', parsed.error)
          return
        }

        updateAppPreferences({ userKeybindings: parsed.value })
        const returnView = useAppStore.getState().keybindingsReturnView
        useAppStore.setState({ keybindingsReturnView: null })
        deleteNode(nodeId)
        if (returnView) navigate(returnView)
        else navigate({ type: 'projects' })
        toast.success('Raccourcis mis à jour', 'keybindings.json a été appliqué et refermé.')
        return
      }

      if (syncMode === 'user_commands') {
        const parsed = parseUserCommandsWorkspaceDocument(localContent)
        if (!parsed.ok) {
          setApplyError(parsed.error)
          toast.error('userCommands.json invalide', parsed.error)
          return
        }

        const validationError = validateUserCommands(parsed.value)
        if (validationError) {
          setApplyError(validationError)
          toast.error('userCommands.json invalide', validationError)
          return
        }

        updateAppPreferences({ userCommands: parsed.value })
        const returnView = useAppStore.getState().userCommandsReturnView
        useAppStore.setState({ userCommandsReturnView: null })
        deleteNode(nodeId)
        if (returnView) navigate(returnView)
        else navigate({ type: 'projects' })
        toast.success('Commandes utilisateur mises à jour', 'userCommands.json a été appliqué et refermé.')
        return
      }

      if (!expectedDraftMessageId || !syncMode) {
        const message = 'Impossible de rattacher ce JSON à un brouillon PRISM AI.'
        setApplyError(message)
        toast.error('Draft IA indisponible', message)
        return
      }

      if (syncMode === 'project') {
        const parsed = parseAIProjectDraftWorkspaceDocument(localContent, {
          expectedMessageId: expectedDraftMessageId,
        })
        if (!parsed.ok) {
          setApplyError(parsed.error)
          toast.error('Draft IA invalide', parsed.error)
          return
        }

        const preview = replaceAIProjectDraftPreview(parsed.input)
        if (!preview) {
          const message = 'Impossible de reconstruire la preview IA depuis ce JSON.'
          setApplyError(message)
          toast.error('Draft IA indisponible', message)
          return
        }

        const normalizedContent = serializeAIProjectDraftWorkspaceDocument(preview)
        setLocalContent(normalizedContent)
        updateJsonContent(nodeId, normalizedContent)
        toast.success('Preview IA mise à jour', 'La preview projet a été resynchronisée depuis le JSON.')
        return
      }

      if (syncMode === 'library_draft') {
        const parsed = parseAILibraryDraftWorkspaceDocument(localContent, {
          expectedMessageId: expectedDraftMessageId,
        })
        if (!parsed.ok) {
          setApplyError(parsed.error)
          toast.error('Draft IA invalide', parsed.error)
          return
        }

        const preview = replaceAILibraryDraftPreview(parsed.input)
        if (!preview) {
          const message = 'Impossible de reconstruire la preview IA depuis ce JSON.'
          setApplyError(message)
          toast.error('Draft IA indisponible', message)
          return
        }

        const normalizedContent = serializeAILibraryDraftWorkspaceDocument(preview)
        setLocalContent(normalizedContent)
        updateJsonContent(nodeId, normalizedContent)
        toast.success('Preview IA mise à jour', 'La preview Library a été resynchronisée depuis le JSON.')
        return
      }

      const parsed = parseAISIFDraftWorkspaceDocument(localContent, projects, {
        expectedMessageId: expectedDraftMessageId,
      })
      if (!parsed.ok) {
        setApplyError(parsed.error)
        toast.error('Draft IA invalide', parsed.error)
        return
      }

      const preview = replaceAISIFDraftPreview(parsed.input)
      if (!preview) {
        const message = 'Impossible de reconstruire la preview IA depuis ce JSON.'
        setApplyError(message)
        toast.error('Draft IA indisponible', message)
        return
      }

      const normalizedContent = serializeAISIFDraftWorkspaceDocument(preview)
      setLocalContent(normalizedContent)
      updateJsonContent(nodeId, normalizedContent)
      toast.success('Preview IA mise à jour', 'Le workflow SIF a été resynchronisé depuis le JSON.')
    } finally {
      setIsApplyingJson(false)
    }
  }

  if (!node || node.type !== 'json') {
    return (
      <div className="flex flex-1 min-w-0 flex-col min-h-0" style={{ background: PAGE_BG }}>
        <WorkspaceTabBar activeNodeId={nodeId} />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-[13px]" style={{ color: TEXT_DIM }}>Fichier JSON introuvable.</p>
        </div>
      </div>
    )
  }

  const validationDocLabel = (isLibraryCollectionDocument || isUserCommandsDocument) ? 'JSONC' : 'JSON'
  const validationLabel = validationState.kind === 'valid'
    ? `${validationDocLabel} valide`
    : `${validationDocLabel} invalide`
  const validationTitle = validationState.kind === 'valid'
    ? (isLibraryCollectionDocument || isUserCommandsDocument) ? 'La syntaxe JSONC est valide.' : 'La syntaxe JSON est valide.'
    : `${validationDocLabel} invalide: ${validationState.message}`
  const wordCount = localContent.trim() ? localContent.trim().split(/\s+/).length : 0
  const lineCount = localContent.split(/\n/).length
  const charCount = localContent.length
  const applyButtonLabel = syncMode === 'library_collection'
    ? (isApplyingJson ? 'Apply…' : 'Save & apply collection')
    : syncMode === 'keybindings'
      ? (isApplyingJson ? 'Save…' : 'Save keybindings')
      : syncMode === 'user_commands'
        ? (isApplyingJson ? 'Save…' : 'Save user commands')
        : (isApplyingJson ? 'Update…' : 'Save & update draft')
  const applyButtonTitle = syncMode === 'library_collection'
    ? 'Valider le JSON et mettre à jour la collection Library'
    : syncMode === 'keybindings'
      ? 'Valider keybindings.json et mettre à jour les raccourcis utilisateur'
      : syncMode === 'user_commands'
        ? 'Valider userCommands.json et mettre à jour les commandes utilisateur'
        : 'Valider le JSON et resynchroniser la preview IA'
  const canUseCollectionTableToolbar = isLibraryCollectionDocument
    && collectionEditorMode === 'table'
    && validationState.kind === 'valid'
  const collectionToolbarButtons = isLibraryCollectionDocument && collectionEditorMode === 'table'
    ? [
        {
          id: 'search',
          label: collectionTableState.searchOpen
            ? libraryStrings.collectionEditor.closeSearch
            : libraryStrings.collectionEditor.search,
          icon: Search,
          active: collectionTableState.searchOpen,
          disabled: !canUseCollectionTableToolbar,
          onClick: () => collectionTableRef.current?.toggleSearch(),
        },
        {
          id: 'add',
          label: libraryStrings.collectionEditor.addRow,
          icon: Plus,
          disabled: !canUseCollectionTableToolbar,
          onClick: () => { void collectionTableRef.current?.addRow() },
        },
        {
          id: 'duplicate',
          label: libraryStrings.collectionEditor.duplicateRows(collectionTableState.selectedRowCount),
          icon: Copy,
          disabled: !canUseCollectionTableToolbar || collectionTableState.selectedRowCount === 0,
          onClick: () => collectionTableRef.current?.duplicateSelectedRows(),
        },
        {
          id: 'delete',
          label: libraryStrings.collectionEditor.deleteRows(collectionTableState.selectedRowCount),
          icon: Trash2,
          disabled: !canUseCollectionTableToolbar || collectionTableState.selectedRowCount === 0,
          onClick: () => collectionTableRef.current?.deleteSelectedRows(),
        },
        {
          id: 'copy',
          label: libraryStrings.collectionEditor.copySelection,
          icon: ClipboardCopy,
          disabled: !canUseCollectionTableToolbar || !collectionTableState.hasSelection,
          onClick: () => { void collectionTableRef.current?.copySelection() },
        },
        {
          id: 'paste',
          label: libraryStrings.collectionEditor.pasteSelection,
          icon: ClipboardPaste,
          disabled: !canUseCollectionTableToolbar,
          onClick: () => { void collectionTableRef.current?.pasteSelection() },
        },
        {
          id: 'fill-down',
          label: libraryStrings.collectionEditor.fillDown,
          icon: null,
          active: false,
          disabled: !canUseCollectionTableToolbar || !collectionTableState.hasSelection,
          onClick: () => { void collectionTableRef.current?.fillDown() },
        },
        {
          id: 'fill-right',
          label: libraryStrings.collectionEditor.fillRight,
          icon: null,
          active: false,
          disabled: !canUseCollectionTableToolbar || !collectionTableState.hasSelection,
          onClick: () => { void collectionTableRef.current?.fillRight() },
        },
        {
          id: 'freeze',
          label: collectionTableState.freezeColumns > 0
            ? libraryStrings.collectionEditor.unfreezeColumns
            : libraryStrings.collectionEditor.freezeColumns,
          icon: Columns3,
          active: collectionTableState.freezeColumns > 0,
          disabled: !canUseCollectionTableToolbar,
          onClick: () => collectionTableRef.current?.toggleFreezeColumns(),
        },
        {
          id: 'fit',
          label: libraryStrings.collectionEditor.fitColumns,
          icon: Maximize2,
          active: false,
          disabled: !canUseCollectionTableToolbar,
          onClick: () => collectionTableRef.current?.fitColumns(),
        },
        {
          id: 'reset-columns',
          label: libraryStrings.collectionEditor.resetColumns,
          icon: RotateCcw,
          active: false,
          disabled: !canUseCollectionTableToolbar,
          onClick: () => collectionTableRef.current?.resetColumnWidths(),
        },
      ]
    : []
  const tableFooterLabel = collectionTableState.selectedRowCount > 0
    ? `${libraryStrings.collectionEditor.rows(libraryCollectionTemplateCount ?? collectionTableState.rowCount)} · ${libraryStrings.collectionEditor.selectedRows(collectionTableState.selectedRowCount)}`
    : libraryStrings.collectionEditor.rows(libraryCollectionTemplateCount ?? collectionTableState.rowCount)

  return (
    <div className="flex flex-1 min-w-0 flex-col min-h-0" style={{ background: PAGE_BG }}>
      <WorkspaceTabBar activeNodeId={nodeId} />

      <div
        className="flex min-w-0 shrink-0 flex-col gap-2 overflow-hidden border-b px-4 py-2"
        style={{ borderColor: BORDER, background: PANEL_BG, boxShadow: SHADOW_SOFT }}
      >
        <div className="flex min-w-0 items-center gap-3 overflow-hidden">
          <Braces size={14} style={{ color: TEAL, flexShrink: 0 }} />

          {renamingTitle ? (
            <input
              ref={titleRef}
              value={titleVal}
              onChange={event => setTitleVal(event.target.value)}
              onBlur={commitTitle}
              onKeyDown={event => {
                if (event.key === 'Enter') commitTitle()
                if (event.key === 'Escape') {
                  setTitleVal(node.name)
                  setRenamingTitle(false)
                }
              }}
              className="flex-1 min-w-0 rounded px-1.5 py-0.5 text-[13px] font-medium outline-none"
              style={{
                background: CARD_BG,
                border: `1px solid ${TEAL}60`,
                color: TEXT,
                boxShadow: `0 0 0 2px ${TEAL}18`,
              }}
            />
          ) : (
            <button
              type="button"
              className="flex-1 min-w-0 text-left text-[13px] font-medium truncate"
              style={{ color: TEXT }}
              onDoubleClick={() => setRenamingTitle(true)}
              title="Double-cliquer pour renommer"
            >
              {node.name}
            </button>
          )}

          {isLibraryCollectionDocument && (
            <div className="inline-flex items-center rounded-lg border p-0.5" style={{ borderColor: BORDER, background: CARD_BG }}>
              {(['table', 'json'] as const).map(mode => {
                const active = collectionEditorMode === mode
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setJsonEditorMode(nodeId, mode)}
                    className="rounded-md px-2 py-1 text-[10px] font-semibold transition-colors"
                    style={{
                      color: active ? TEXT : TEXT_DIM,
                      background: active ? PANEL_BG : 'transparent',
                    }}
                  >
                    {mode === 'table' ? libraryStrings.collectionEditor.modeTable : libraryStrings.collectionEditor.modeJson}
                  </button>
                )
              })}
            </div>
          )}

          <span
            title={validationTitle}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold"
            style={{
              borderColor: validationState.kind === 'valid' ? 'rgba(16,185,129,0.28)' : 'rgba(239,68,68,0.28)',
              color: validationState.kind === 'valid' ? '#10B981' : '#EF4444',
              background: validationState.kind === 'valid' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
            }}
          >
            {validationState.kind === 'valid' ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
            <span>{validationLabel}</span>
          </span>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            {collectionEditorMode === 'json' && (
              <button
                type="button"
                title="Réindenter et reformater le JSON"
                onClick={handleFormat}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors"
                style={{ color: TEXT_DIM }}
                onMouseEnter={event => { event.currentTarget.style.color = TEXT }}
                onMouseLeave={event => { event.currentTarget.style.color = TEXT_DIM }}
              >
                <Wand2 size={12} />
                <span>Format</span>
              </button>
            )}

            {canApplyJson && (
              <button
                type="button"
                title={applyButtonTitle}
                onClick={() => { void handleApplyJson() }}
                disabled={isApplyingJson}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50"
                style={{ color: TEAL, background: `${TEAL}14`, border: `1px solid ${TEAL}28` }}
              >
                <Save size={12} />
                <span>{applyButtonLabel}</span>
              </button>
            )}
          </div>
        </div>

        {isLibraryCollectionDocument && collectionEditorMode === 'table' && (
          <div className="flex min-w-0 items-center gap-2 overflow-hidden">
            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pb-0.5">
              {collectionToolbarButtons.map(action => {
                const Icon = action.icon
                const active = Boolean(action.active)
                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={action.onClick}
                    disabled={action.disabled}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45"
                    style={{
                      borderColor: active ? `${TEAL}40` : BORDER,
                      background: active ? `${TEAL}12` : CARD_BG,
                      color: active ? TEAL : TEXT_DIM,
                    }}
                    onMouseEnter={event => {
                      if (action.disabled) return
                      event.currentTarget.style.color = active ? TEAL : TEXT
                      event.currentTarget.style.background = active ? `${TEAL}16` : PANEL_BG
                    }}
                    onMouseLeave={event => {
                      event.currentTarget.style.color = active ? TEAL : TEXT_DIM
                      event.currentTarget.style.background = active ? `${TEAL}12` : CARD_BG
                    }}
                    title={action.label}
                  >
                    {Icon ? <Icon size={12} /> : null}
                    <span>{action.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
        {isLibraryCollectionDocument && collectionEditorMode === 'table' ? (
          <LibraryCollectionSpreadsheetEditor
            ref={collectionTableRef}
            content={localContent}
            onChange={handleChange}
            invalidMessage={validationState.kind === 'invalid' ? validationState.message : null}
            isDark={isDark}
            strings={libraryStrings.collectionEditor}
            onStateChange={setCollectionTableState}
          />
        ) : (
          <CodeEditor
            value={localContent}
            onChange={handleChange}
            isDark={isDark}
            extensions={[json()]}
            fontSizePx={13 * editorZoom}
            horizontalScroll
            lineNumberAlign="center"
          />
        )}
      </div>

      <div
        className="flex h-6 shrink-0 items-center gap-4 border-t px-4"
        style={{ borderColor: BORDER, background: PANEL_BG }}
      >
        <span className="text-[10px]" style={{ color: TEXT_DIM }}>
          {isLibraryCollectionDocument && collectionEditorMode === 'table'
            ? tableFooterLabel
            : `${wordCount} mots · ${lineCount} lignes · ${charCount} caractères`}
        </span>

        <div className="ml-auto flex shrink-0 items-center gap-3">
          {applyError ? (
            <span className="flex items-center gap-1.5 text-[10px]" style={{ color: '#EF4444' }}>
              <AlertTriangle size={10} />
              <span>{applyError}</span>
            </span>
          ) : (
            <span className="text-[10px]" style={{ color: `${TEAL}99` }}>
              Sauvegarde auto
            </span>
          )}

          {collectionEditorMode === 'json' && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setEditorZoom(current => Math.max(0.8, Number((current - 0.1).toFixed(2))))}
                className="flex h-5 w-5 items-center justify-center rounded transition-colors"
                style={{ color: TEXT_DIM }}
                onMouseEnter={event => { event.currentTarget.style.color = TEXT }}
                onMouseLeave={event => { event.currentTarget.style.color = TEXT_DIM }}
                title="Zoom out"
              >
                <ZoomOut size={12} />
              </button>
              <span className="w-10 text-center text-[10px] tabular-nums" style={{ color: TEXT_DIM }}>
                {Math.round(editorZoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setEditorZoom(current => Math.min(1.8, Number((current + 0.1).toFixed(2))))}
                className="flex h-5 w-5 items-center justify-center rounded transition-colors"
                style={{ color: TEXT_DIM }}
                onMouseEnter={event => { event.currentTarget.style.color = TEXT }}
                onMouseLeave={event => { event.currentTarget.style.color = TEXT_DIM }}
                title="Zoom in"
              >
                <ZoomIn size={12} />
              </button>
              <button
                type="button"
                onClick={() => setEditorZoom(1)}
                className="flex h-5 w-5 items-center justify-center rounded transition-colors"
                style={{ color: TEXT_DIM }}
                onMouseEnter={event => { event.currentTarget.style.color = TEXT }}
                onMouseLeave={event => { event.currentTarget.style.color = TEXT_DIM }}
                title="Reset zoom"
              >
                <RotateCcw size={11} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
