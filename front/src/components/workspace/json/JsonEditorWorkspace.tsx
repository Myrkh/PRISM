import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Braces, CheckCircle2, RotateCcw, Save, Wand2, ZoomIn, ZoomOut } from 'lucide-react'
import { json } from '@codemirror/lang-json'
import { toast } from '@/components/ui/toast'
import { parseAISIFDraftWorkspaceDocument, readAISIFDraftWorkspaceMeta, serializeAISIFDraftWorkspaceDocument } from '@/components/layout/prism-ai/sifDraftWorkspaceJson'
import { parseAIProjectDraftWorkspaceDocument, readAIProjectDraftWorkspaceMeta, serializeAIProjectDraftWorkspaceDocument } from '@/components/layout/prism-ai/projectDraftWorkspaceJson'
import { parseAILibraryDraftWorkspaceDocument, readAILibraryDraftWorkspaceMeta, serializeAILibraryDraftWorkspaceDocument } from '@/components/layout/prism-ai/libraryDraftWorkspaceJson'
import { formatLibraryCollectionWorkspaceSource, parseLibraryCollectionWorkspaceDocument, readLibraryCollectionWorkspaceMeta, validateLibraryCollectionWorkspaceSource } from '@/components/library/libraryCollectionWorkspaceJson'
import { useLibraryCollectionsStore } from '@/features/library/libraryCollectionsStore'
import { applyCollectionNameToImportedTemplates, componentTemplateToUpsertInput, getTemplatesForLibraryCollection } from '@/features/library/libraryCollectionSync'
import { dbUpdateLibraryCollection } from '@/lib/libraryCollections'
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

export function JsonEditorWorkspace({ nodeId }: { nodeId: string }) {
  const {
    BORDER, CARD_BG, PAGE_BG, PANEL_BG, SHADOW_SOFT,
    TEAL, TEXT, TEXT_DIM,
  } = usePrismTheme()

  const { nodes, openTab, renameNode, updateJsonContent, deleteNode } = useWorkspaceStore()
  const projects = useAppStore(s => s.projects)
  const componentTemplates = useAppStore(s => s.componentTemplates)
  const isDark = useAppStore(s => s.isDark)
  const navigate = useAppStore(s => s.navigate)
  const ownerProfileId = useAppStore(s => s.profile?.id ?? s.authUser?.id ?? null)
  const importComponentTemplates = useAppStore(s => s.importComponentTemplates)
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
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)

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
      toast.error('Draft IA invalide', validationState.message)
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

  const validationLabel = validationState.kind === 'valid'
    ? 'JSON valide'
    : 'JSON invalide'
  const validationTitle = validationState.kind === 'valid'
    ? 'La syntaxe JSON est valide.'
    : `Syntaxe JSON invalide: ${validationState.message}`
  const wordCount = localContent.trim() ? localContent.trim().split(/\s+/).length : 0
  const lineCount = localContent.split(/\n/).length
  const charCount = localContent.length
  const applyButtonLabel = syncMode === 'library_collection'
    ? (isApplyingJson ? 'Apply…' : 'Save & apply collection')
    : (isApplyingJson ? 'Update…' : 'Save & update draft')
  const applyButtonTitle = syncMode === 'library_collection'
    ? 'Valider le JSON et mettre à jour la collection Library'
    : 'Valider le JSON et resynchroniser la preview IA'

  return (
    <div className="flex flex-1 min-w-0 flex-col min-h-0" style={{ background: PAGE_BG }}>
      <WorkspaceTabBar activeNodeId={nodeId} />

      <div
        className="flex min-w-0 shrink-0 items-center gap-3 overflow-hidden border-b px-4"
        style={{ borderColor: BORDER, background: PANEL_BG, height: 40, boxShadow: SHADOW_SOFT }}
      >
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

        <span
          title={validationTitle}
          className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold"
          style={{
            borderColor: validationState.kind === 'valid' ? 'rgba(16,185,129,0.28)' : 'rgba(239,68,68,0.28)',
            color: validationState.kind === 'valid' ? '#10B981' : '#EF4444',
            background: validationState.kind === 'valid' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
          }}
        >
          {validationState.kind === 'valid' ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
          <span>{validationLabel}</span>
        </span>

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

      <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
        <CodeEditor
          value={localContent}
          onChange={handleChange}
          isDark={isDark}
          extensions={[json()]}
          fontSizePx={13 * editorZoom}
          horizontalScroll
          lineNumberAlign="center"
        />
      </div>

      <div
        className="flex h-6 shrink-0 items-center gap-4 border-t px-4"
        style={{ borderColor: BORDER, background: PANEL_BG }}
      >
        <span className="text-[10px]" style={{ color: TEXT_DIM }}>
          {wordCount} mots · {lineCount} lignes · {charCount} caractères
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
        </div>
      </div>
    </div>
  )
}
