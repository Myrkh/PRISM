import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Download, MoreHorizontal, RefreshCw, Search, Upload, X } from 'lucide-react'
import {
  INITIAL_LIBRARY_VISIBLE_COUNT,
  LIBRARY_PREVIEW_COUNT,
  LIBRARY_SUBSYSTEM_META,
  LibraryTemplateCard,
} from '@/components/library/LibraryTemplateCard'
import { useLibraryNavigation, getLibraryEntryKey } from '@/components/library/LibraryNavigation'
import { LibraryImportReviewDialog } from '@/components/library/LibraryImportReviewDialog'
import { useLayout } from '@/components/layout/SIFWorkbenchLayout'
import { Input } from '@/components/ui/input'
import {
  analyzeComponentTemplateImport,
  buildComponentTemplateImportStarter,
  serializeComponentTemplates,
  type ComponentTemplateImportDecision,
  type ComponentTemplateImportPreview,
} from '@/features/library'
import { getLibraryStrings } from '@/i18n/library'
import { useLocaleStrings } from '@/i18n/useLocale'
import { useAppStore } from '@/store/appStore'
import { semantic } from '@/styles/tokens'
import { usePrismTheme } from '@/styles/usePrismTheme'

export function LibraryWorkspace() {

  const {
    query,
    deferredQuery,
    sourceScope,
    subsystemScope,
    projectFilter,
    libraryFilter,
    entries,
    groupedEntries,
    totalIndexed,
    totalVisible,
    allProjectTemplates,
    userTemplates,
    loading,
    error,
    fetchTemplates,
    importTemplates,
    deleteTemplate,
    clearError,
    selectedEntryKey,
    openEntry,
    setQuery,
  } = useLibraryNavigation()
  const strings = useLocaleStrings(getLibraryStrings)
  const { setRightPanelOpen } = useLayout()
  const { profile } = useAppStore(state => ({ profile: state.profile }))
  const projects = useAppStore(state => state.projects)
  const setSyncError = useAppStore(state => state.setSyncError)
  const { BORDER, CARD_BG, PAGE_BG, SHADOW_PANEL, TEAL, TEXT, TEXT_DIM } = usePrismTheme()

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const moreMenuRef = useRef<HTMLDivElement | null>(null)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null)

  useEffect(() => {
    if (!moreMenuOpen) return
    const handle = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) setMoreMenuOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [moreMenuOpen])
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [visibleCountByType, setVisibleCountByType] = useState(INITIAL_LIBRARY_VISIBLE_COUNT)
  const [importPreview, setImportPreview] = useState<ComponentTemplateImportPreview | null>(null)
  const [importDecisions, setImportDecisions] = useState<Record<string, ComponentTemplateImportDecision>>({})
  const [importFileName, setImportFileName] = useState('')
  const [importBusy, setImportBusy] = useState(false)

  const projectLabel = useMemo(
    () => projectFilter ? projects.find(project => project.id === projectFilter)?.name ?? null : null,
    [projectFilter, projects],
  )
  const selectedLibraryLabel = libraryFilter ?? null
  const sourceScopeLabels = strings.sourceScopeLabels

  const visibleSubsystems = subsystemScope === 'all'
    ? (['sensor', 'logic', 'actuator'] as const)
    : ([subsystemScope] as const)

  const exportableTemplates = entries
    .filter(entry => entry.origin !== 'builtin')
    .map(entry => entry.template)

  const importScope = projectFilter ? 'project' : 'user'
  const existingImportTemplates = importScope === 'project'
    ? allProjectTemplates.filter(template => template.projectId === projectFilter)
    : userTemplates
  const importTargetLabel = strings.importTarget(projectLabel, selectedLibraryLabel)

  const resetFeedback = () => {
    setStatusMessage(null)
    clearError(null)
    setSyncError(null)
  }

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    resetFeedback()

    try {
      const text = await file.text()
      const preview = analyzeComponentTemplateImport(
        text,
        importScope,
        projectFilter,
        existingImportTemplates,
        selectedLibraryLabel,
      )
      setImportPreview(preview)
      setImportFileName(file.name)
      setImportDecisions(Object.fromEntries(preview.entries.map(entry => [entry.id, entry.suggestedDecision])))
    } catch (err: unknown) {
      setSyncError(err instanceof Error ? err.message : String(err))
    }
  }

  const closeImportPreview = () => {
    if (importBusy) return
    setImportPreview(null)
    setImportDecisions({})
    setImportFileName('')
  }

  const applySuggestedImportDecisions = () => {
    if (!importPreview) return
    setImportDecisions(Object.fromEntries(importPreview.entries.map(entry => [entry.id, entry.suggestedDecision])))
  }

  const applyBulkImportDecision = (decision: Extract<ComponentTemplateImportDecision, 'create' | 'update'>) => {
    if (!importPreview) return
    setImportDecisions(current => ({
      ...current,
      ...Object.fromEntries(importPreview.entries.map(entry => {
        const nextDecision = entry.availableDecisions.includes(decision) ? decision : (entry.availableDecisions[0] ?? 'ignore')
        return [entry.id, nextDecision]
      })),
    }))
  }

  const handleImportDecisionChange = (entryId: string, decision: ComponentTemplateImportDecision) => {
    setImportDecisions(current => ({ ...current, [entryId]: decision }))
  }

  const confirmImportPreview = async () => {
    if (!importPreview) return

    const summary = importPreview.entries.reduce((acc, entry) => {
      const decision = importDecisions[entry.id] ?? entry.suggestedDecision
      if (!entry.template || decision === 'ignore') return acc
      acc[decision] += 1
      return acc
    }, { create: 0, update: 0 })

    const payload = importPreview.entries.flatMap(entry => {
      const decision = importDecisions[entry.id] ?? entry.suggestedDecision
      if (!entry.template || decision === 'ignore') return []
      return [{
        ...entry.template,
        id: decision === 'update' ? (entry.duplicate?.id ?? entry.template.id) : undefined,
        importBatchId: crypto.randomUUID(),
      }]
    })

    if (payload.length === 0) {
      setStatusMessage(strings.status.noSelection)
      closeImportPreview()
      return
    }

    resetFeedback()
    setImportBusy(true)

    try {
      const imported = await importTemplates(payload)
      setStatusMessage(
        strings.status.imported(imported.length, summary.create, summary.update)
      )
      setImportPreview(null)
      setImportDecisions({})
      setImportFileName('')
    } catch (err: unknown) {
      setSyncError(err instanceof Error ? err.message : String(err))
    } finally {
      setImportBusy(false)
    }
  }

  const handleExport = () => {
    resetFeedback()
    if (exportableTemplates.length === 0) return

    const exportProjectId = projectFilter && exportableTemplates.every(template => template.projectId === projectFilter)
      ? projectFilter
      : null
    const content = serializeComponentTemplates(exportableTemplates, profile?.id ?? null, exportProjectId)
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `prism-library-${stamp}.json`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
    setStatusMessage(strings.status.exported(exportableTemplates.length))
  }


  const handleDownloadImportModel = () => {
    resetFeedback()
    const content = buildComponentTemplateImportStarter()
    const stamp = new Date().toISOString().slice(0, 10)
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `prism-library-import-model-${stamp}.json`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
    setStatusMessage(strings.status.importModelDownloaded)
  }

  const handleDelete = async (id: string) => {
    resetFeedback()
    try {
      await deleteTemplate(id)
      setStatusMessage(strings.status.deleted)
    } catch (err: unknown) {
      setSyncError(err instanceof Error ? err.message : String(err))
    }
  }


  const openEntryInspector = (entry: (typeof entries)[number]) => {
    resetFeedback()
    openEntry(entry)
    setRightPanelOpen(true)
  }

  const showMore = (type: keyof typeof LIBRARY_SUBSYSTEM_META) => {
    setVisibleCountByType(current => ({
      ...current,
      [type]: current[type] + LIBRARY_PREVIEW_COUNT,
    }))
  }

  const showLess = (type: keyof typeof LIBRARY_SUBSYSTEM_META) => {
    setVisibleCountByType(current => ({
      ...current,
      [type]: INITIAL_LIBRARY_VISIBLE_COUNT[type],
    }))
    setExpandedTemplateId(current => {
      if (!current) return current
      const visibleIds = groupedEntries[type]
        .slice(0, INITIAL_LIBRARY_VISIBLE_COUNT[type])
        .map(entry => entry.template.id)
      return visibleIds.includes(current) ? current : null
    })
  }

  const hasAnyResults = visibleSubsystems.some(type => groupedEntries[type].length > 0)

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleImportFile}
      />

      <div className="mx-auto flex w-full max-w-[960px] flex-col gap-4 px-5 py-5">

        {/* ── Search bar ── */}
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: TEXT_DIM }} />
            <Input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder={strings.searchPlaceholder}
              className="h-10 rounded-xl pl-9 pr-10 text-[13px]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border transition-colors"
                style={{ borderColor: `${BORDER}70`, color: TEXT_DIM, background: PAGE_BG }}
              >
                <X size={11} />
              </button>
            )}
          </div>

          {/* Reload */}
          <button
            type="button"
            onClick={() => void fetchTemplates()}
            className="prism-action inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
            style={{ borderColor: `${BORDER}80`, color: TEXT_DIM, background: CARD_BG }}
            title={strings.ctas.reloadTitle}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* ⋯ more actions */}
          <div ref={moreMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setMoreMenuOpen(o => !o)}
              className="prism-action inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
              style={{ borderColor: moreMenuOpen ? `${BORDER}CC` : `${BORDER}80`, color: TEXT_DIM, background: CARD_BG }}
              title="Plus d'actions"
            >
              <MoreHorizontal size={14} />
            </button>
            {moreMenuOpen && (
              <div
                className="absolute right-0 top-full z-50 mt-1.5 min-w-[200px] overflow-hidden rounded-xl border py-1"
                style={{ background: CARD_BG, borderColor: BORDER, boxShadow: SHADOW_PANEL }}
              >
                <button
                  type="button"
                  onClick={() => { fileInputRef.current?.click(); setMoreMenuOpen(false) }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[12px] transition-colors hover:opacity-80"
                  style={{ color: TEXT }}
                  title={importTargetLabel}
                >
                  <Upload size={13} style={{ color: TEXT_DIM }} />
                  {strings.ctas.import}
                </button>
                <button
                  type="button"
                  onClick={() => { handleDownloadImportModel(); setMoreMenuOpen(false) }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[12px] transition-colors hover:opacity-80"
                  style={{ color: TEXT }}
                  title={strings.ctas.importModelTitle}
                >
                  <Download size={13} style={{ color: TEXT_DIM }} />
                  Modèle JSON
                </button>
                <div className="mx-3 my-1 border-t" style={{ borderColor: `${BORDER}60` }} />
                <button
                  type="button"
                  onClick={() => { handleExport(); setMoreMenuOpen(false) }}
                  disabled={exportableTemplates.length === 0}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[12px] transition-colors hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ color: TEXT }}
                  title={strings.ctas.exportTitle}
                >
                  <Download size={13} style={{ color: TEXT_DIM }} />
                  {strings.ctas.export}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Status chips ── */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold"
            style={{ color: TEAL, borderColor: `${TEAL}28`, background: `${TEAL}10` }}
          >
            {deferredQuery ? strings.header.filteredCount(totalVisible) : strings.header.availableCount(totalIndexed)}
          </span>
          {sourceScope !== 'all' && (
            <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px]" style={{ color: TEXT_DIM, borderColor: `${BORDER}60`, background: PAGE_BG }}>
              {sourceScopeLabels[sourceScope]}
            </span>
          )}
          {projectLabel && (
            <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px]" style={{ color: TEXT_DIM, borderColor: `${BORDER}60`, background: PAGE_BG }}>
              {projectLabel}
            </span>
          )}
          {selectedLibraryLabel && (
            <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px]" style={{ color: TEXT_DIM, borderColor: `${BORDER}60`, background: PAGE_BG }}>
              {selectedLibraryLabel}
            </span>
          )}
        </div>

        {/* ── Feedback ── */}
        {(statusMessage || error) && (
          <div className="space-y-1.5">
            {statusMessage && (
              <div className="rounded-xl border px-4 py-2.5 text-[12px]" style={{ background: `${TEAL}10`, color: TEAL, borderColor: `${TEAL}20` }}>
                {statusMessage}
              </div>
            )}
            {error && (
              <div className="rounded-xl border px-4 py-2.5 text-[12px]" style={{ background: `${semantic.error}15`, color: semantic.error, borderColor: `${semantic.error}30` }}>
                {error}
              </div>
            )}
          </div>
        )}

        {/* ── Template list — one card per family ── */}
        {!hasAnyResults && (
          <div
            className="overflow-hidden rounded-xl border px-5 py-12 text-center text-[12px]"
            style={{ borderColor: BORDER, background: CARD_BG, color: TEXT_DIM, boxShadow: SHADOW_PANEL }}
          >
            {strings.family.empty}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {visibleSubsystems.map(type => {
            const meta = LIBRARY_SUBSYSTEM_META[type]
            const items = groupedEntries[type]
            if (items.length === 0) return null

            const visibleCount = deferredQuery.trim() ? items.length : visibleCountByType[type]
            const visibleItems = items.slice(0, visibleCount)
            const remainingCount = Math.max(0, items.length - visibleItems.length)
            const canShowLess = !deferredQuery.trim() && visibleCountByType[type] > INITIAL_LIBRARY_VISIBLE_COUNT[type] && items.length > INITIAL_LIBRARY_VISIBLE_COUNT[type]

            return (
              <div
                key={type}
                className="overflow-hidden rounded-xl border"
                style={{
                  borderColor: BORDER,
                  borderTopColor: meta.color,
                  borderTopWidth: 2,
                  background: CARD_BG,
                  boxShadow: SHADOW_PANEL,
                }}
              >
                {/* Compact family header */}
                <div
                  className="flex items-center gap-2 border-b px-4 py-2.5"
                  style={{ borderColor: `${BORDER}40` }}
                >
                  <meta.Icon size={12} style={{ color: meta.color }} />
                  <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: meta.color }}>
                    {meta.label}
                  </span>
                  <span className="ml-auto font-mono text-[9px]" style={{ color: TEXT_DIM }}>
                    {items.length}
                  </span>
                </div>

                {/* Template rows */}
                {visibleItems.map(entry => (
                  <LibraryTemplateCard
                    key={entry.template.id}
                    template={entry.template}
                    origin={entry.origin}
                    expanded={expandedTemplateId === entry.template.id}
                    selected={selectedEntryKey === getLibraryEntryKey(entry.origin, entry.template.id)}
                    onSelect={() => openEntryInspector(entry)}
                    onToggleDetails={id => setExpandedTemplateId(current => current === id ? null : id)}
                    onDelete={entry.origin !== 'builtin' ? handleDelete : undefined}
                  />
                ))}

                {/* Load more */}
                {!deferredQuery.trim() && remainingCount > 0 && (
                  <button
                    type="button"
                    onClick={() => showMore(type)}
                    className="prism-action flex w-full items-center justify-between border-t px-4 py-2 text-left transition-colors"
                    style={{ borderColor: `${BORDER}30`, background: PAGE_BG, color: meta.color }}
                  >
                    <span className="text-[11px] font-semibold">{strings.family.showMore}</span>
                    <span className="font-mono text-[10px]" style={{ color: TEXT_DIM }}>+{remainingCount}</span>
                  </button>
                )}

                {/* Show less */}
                {canShowLess && (
                  <button
                    type="button"
                    onClick={() => showLess(type)}
                    className="prism-action flex w-full items-center justify-between border-t px-4 py-2 text-left transition-colors"
                    style={{ borderColor: `${BORDER}30`, background: PAGE_BG, color: TEXT_DIM }}
                  >
                    <span className="text-[11px] font-semibold">{strings.family.showLess}</span>
                    <span className="font-mono text-[10px]">{INITIAL_LIBRARY_VISIBLE_COUNT[type]}</span>
                  </button>
                )}
              </div>
            )
          })}
        </div>

      </div>

      {importPreview && (
        <LibraryImportReviewDialog
          fileName={importFileName}
          preview={importPreview}
          decisions={importDecisions}
          busy={importBusy}
          onDecisionChange={handleImportDecisionChange}
          onApplySuggested={applySuggestedImportDecisions}
          onBulkDecision={applyBulkImportDecision}
          onClose={closeImportPreview}
          onConfirm={() => void confirmImportPreview()}
        />
      )}
    </div>
  )
}
