import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Download, RefreshCw, Search, Upload, X } from 'lucide-react'
import {
  INITIAL_LIBRARY_VISIBLE_COUNT,
  LIBRARY_PREVIEW_COUNT,
  LIBRARY_SUBSYSTEM_META,
  LibraryOriginLegend,
  LibraryTemplateCard,
} from '@/components/library/LibraryTemplateCard'
import { useLibraryNavigation, getLibraryEntryKey } from '@/components/library/LibraryNavigation'
import { useLayout } from '@/components/layout/SIFWorkbenchLayout'
import { Input } from '@/components/ui/input'
import {
  buildComponentTemplateImportStarter,
  parseComponentTemplateImport,
  serializeComponentTemplates,
} from '@/features/library'
import { useAppStore } from '@/store/appStore'
import { semantic } from '@/styles/tokens'
import { usePrismTheme } from '@/styles/usePrismTheme'

const SOURCE_SCOPE_LABELS = {
  all: 'Catalogue complet',
  builtin: 'Standards validés',
  project: 'Templates projet',
  user: 'Bibliothèque personnelle',
} as const

const SUBSYSTEM_HINTS = {
  sensor: 'Transmetteurs, capteurs et switches utilisés dans les chaînes instrumentées.',
  logic: 'Solveurs logiques, automates de sécurité et relais associés.',
  actuator: 'Éléments finaux, vannes, positionneurs et accessoires de coupure.',
} as const

export function LibraryWorkspace() {
  const {
    query,
    deferredQuery,
    sourceScope,
    subsystemScope,
    projectFilter,
    entries,
    groupedEntries,
    totalIndexed,
    totalVisible,
    builtinTemplates,
    allProjectTemplates,
    userTemplates,
    loading,
    error,
    fetchTemplates,
    importTemplates,
    archiveTemplate,
    deleteTemplate,
    clearError,
    selectedEntryKey,
    openEntry,
    startCreate,
    setQuery,
  } = useLibraryNavigation()
  const { setRightPanelOpen } = useLayout()
  const { profile } = useAppStore(state => ({ profile: state.profile }))
  const projects = useAppStore(state => state.projects)
  const setSyncError = useAppStore(state => state.setSyncError)
  const { BORDER, CARD_BG, PAGE_BG, SHADOW_CARD, TEAL, TEAL_DIM, TEXT, TEXT_DIM } = usePrismTheme()

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [visibleCountByType, setVisibleCountByType] = useState(INITIAL_LIBRARY_VISIBLE_COUNT)

  const projectLabel = useMemo(
    () => projectFilter ? projects.find(project => project.id === projectFilter)?.name ?? null : null,
    [projectFilter, projects],
  )

  const visibleSubsystems = subsystemScope === 'all'
    ? (['sensor', 'logic', 'actuator'] as const)
    : ([subsystemScope] as const)

  const exportableTemplates = entries
    .filter(entry => entry.origin !== 'builtin')
    .map(entry => entry.template)

  const importScope = projectFilter ? 'project' : 'user'
  const importTargetLabel = projectLabel
    ? `Import vers ${projectLabel}`
    : 'Import vers ma bibliothèque'

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
      const batchId = crypto.randomUUID()
      const payload = parseComponentTemplateImport(text, importScope, projectFilter)
      const imported = await importTemplates(payload.map(template => ({ ...template, importBatchId: batchId })))
      setStatusMessage(`${imported.length} template(s) importé(s).`)
    } catch (err: unknown) {
      setSyncError(err instanceof Error ? err.message : String(err))
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
    setStatusMessage(`${exportableTemplates.length} template(s) exporté(s).`)
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
    setStatusMessage('Modèle JSON téléchargé.')
  }

  const handleArchive = async (id: string) => {
    resetFeedback()
    try {
      await archiveTemplate(id)
      setStatusMessage('Template archivé.')
    } catch (err: unknown) {
      setSyncError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleDelete = async (id: string) => {
    resetFeedback()
    try {
      await deleteTemplate(id)
      setStatusMessage('Template supprimé.')
    } catch (err: unknown) {
      setSyncError(err instanceof Error ? err.message : String(err))
    }
  }


  const openEntryInspector = (entry: (typeof entries)[number]) => {
    resetFeedback()
    openEntry(entry)
    setRightPanelOpen(true)
  }

  const openCreateInspector = (type: keyof typeof LIBRARY_SUBSYSTEM_META) => {
    resetFeedback()
    startCreate(type)
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

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleImportFile}
      />

      <div className="mx-auto flex w-full max-w-[1460px] flex-col gap-5 px-6 py-6">
        <section
          className="overflow-hidden rounded-2xl border"
          style={{ borderColor: `${BORDER}50`, background: CARD_BG, boxShadow: SHADOW_CARD }}
        >
          <div className="border-b px-6 py-4" style={{ borderColor: `${BORDER}35` }}>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: TEAL_DIM }}>
                  Bibliothèque maître
                </p>
                <h1 className="mt-2 text-[28px] font-semibold tracking-tight" style={{ color: TEXT }}>
                  Gérer les composants réutilisables du produit
                </h1>
                <p className="mt-2 max-w-[820px] text-[14px] leading-[1.8]" style={{ color: TEXT_DIM }}>
                  Une seule source pour les standards validés, les templates liés aux projets et la bibliothèque personnelle. La vue Architecture continue d’utiliser le même catalogue, mais ici l’objectif est la gestion transverse.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-[11px]">
                <span className="inline-flex items-center rounded-full border px-2.5 py-1" style={{ color: TEAL, borderColor: `${TEAL}28`, background: `${TEAL}10` }}>
                  {deferredQuery ? `${totalVisible} résultats filtrés` : `${totalIndexed} templates disponibles`}
                </span>
                <span className="inline-flex items-center rounded-full border px-2.5 py-1" style={{ color: TEXT_DIM, borderColor: `${BORDER}70`, background: PAGE_BG }}>
                  {SOURCE_SCOPE_LABELS[sourceScope]}
                </span>
                {projectLabel && (
                  <span className="inline-flex items-center rounded-full border px-2.5 py-1" style={{ color: TEXT_DIM, borderColor: `${BORDER}70`, background: PAGE_BG }}>
                    {projectLabel}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="px-6 py-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <div className="relative min-w-0 flex-1">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: TEXT_DIM }} />
                <Input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Ex. Rosemount, switch niveau, Safety PLC, SOV, positionneur..."
                  className="h-12 rounded-xl pl-10 pr-11 text-[14px]"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-3 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border transition-colors"
                    style={{ borderColor: `${BORDER}70`, color: TEXT_DIM, background: PAGE_BG }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {(['sensor', 'logic', 'actuator'] as const).map(type => {
                  const meta = LIBRARY_SUBSYSTEM_META[type]
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => openCreateInspector(type)}
                      className="prism-action inline-flex h-11 items-center gap-2 rounded-xl border px-3 text-[12px] font-semibold"
                      style={{ borderColor: `${meta.color}24`, color: meta.color, background: `${meta.color}10` }}
                      title={`Créer un template ${meta.label.toLowerCase()}`}
                    >
                      <meta.Icon size={14} />
                      {type === 'sensor' ? 'Nouveau capteur' : type === 'logic' ? 'Nouvelle logique' : 'Nouvel actionneur'}
                    </button>
                  )
                })}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="prism-action inline-flex h-11 items-center gap-2 rounded-xl border px-3 text-[12px] font-semibold"
                  style={{ borderColor: `${BORDER}80`, color: TEXT_DIM, background: PAGE_BG }}
                  title={importTargetLabel}
                >
                  <Upload size={14} />
                  Importer
                </button>
                <button
                  type="button"
                  onClick={handleDownloadImportModel}
                  className="prism-action inline-flex h-11 items-center gap-2 rounded-xl border px-3 text-[12px] font-semibold"
                  style={{ borderColor: `${BORDER}80`, color: TEXT_DIM, background: PAGE_BG }}
                  title="Télécharger un JSON modèle compatible import"
                >
                  <Download size={14} />
                  Modèle JSON
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={exportableTemplates.length === 0}
                  className="prism-action inline-flex h-11 items-center gap-2 rounded-xl border px-3 text-[12px] font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ borderColor: `${BORDER}80`, color: TEXT_DIM, background: PAGE_BG }}
                  title="Exporter les templates visibles"
                >
                  <Download size={14} />
                  Exporter
                </button>
                <button
                  type="button"
                  onClick={() => void fetchTemplates()}
                  className="prism-action inline-flex h-11 items-center gap-2 rounded-xl border px-3 text-[12px] font-semibold"
                  style={{ borderColor: `${BORDER}80`, color: TEXT_DIM, background: PAGE_BG }}
                  title="Recharger la bibliothèque"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                  Recharger
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
              <span className="inline-flex items-center rounded-full border px-2.5 py-1" style={{ color: TEAL_DIM, borderColor: `${TEAL}20`, background: `${TEAL}0D` }}>
                {importTargetLabel}
              </span>
              <span className="inline-flex items-center rounded-full border px-2.5 py-1" style={{ color: TEXT_DIM, borderColor: `${BORDER}70`, background: PAGE_BG }}>
                {builtinTemplates.length} standards validés
              </span>
              <span className="inline-flex items-center rounded-full border px-2.5 py-1" style={{ color: TEXT_DIM, borderColor: `${BORDER}70`, background: PAGE_BG }}>
                {allProjectTemplates.length} templates projet
              </span>
              <span className="inline-flex items-center rounded-full border px-2.5 py-1" style={{ color: TEXT_DIM, borderColor: `${BORDER}70`, background: PAGE_BG }}>
                {userTemplates.length} templates personnels
              </span>
            </div>
          </div>
        </section>

        {(statusMessage || error) && (
          <div className="space-y-2">
            {statusMessage && (
              <div
                className="rounded-xl border px-4 py-3 text-[12px]"
                style={{ background: `${TEAL}10`, color: TEAL_DIM, borderColor: `${TEAL}20` }}
              >
                {statusMessage}
              </div>
            )}
            {error && (
              <div
                className="rounded-xl border px-4 py-3 text-[12px]"
                style={{ background: `${semantic.error}15`, color: semantic.error, borderColor: `${semantic.error}30` }}
              >
                {error}
              </div>
            )}
          </div>
        )}

        <div className="grid gap-5">
          {visibleSubsystems.map(type => {
            const meta = LIBRARY_SUBSYSTEM_META[type]
            const items = groupedEntries[type]
            const visibleCount = deferredQuery.trim() ? items.length : visibleCountByType[type]
            const visibleItems = items.slice(0, visibleCount)
            const remainingCount = Math.max(0, items.length - visibleItems.length)
            const canShowLess = !deferredQuery.trim() && visibleCountByType[type] > INITIAL_LIBRARY_VISIBLE_COUNT[type] && items.length > INITIAL_LIBRARY_VISIBLE_COUNT[type]

            return (
              <section
                key={type}
                className="overflow-hidden rounded-2xl border"
                style={{ borderColor: `${BORDER}50`, background: CARD_BG, boxShadow: SHADOW_CARD }}
              >
                <div className="flex flex-col gap-3 border-b px-5 py-4 lg:flex-row lg:items-start lg:justify-between" style={{ borderColor: `${BORDER}35` }}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border"
                        style={{ color: meta.color, borderColor: `${meta.color}20`, background: `${meta.color}10` }}
                      >
                        <meta.Icon size={17} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: TEXT }}>{meta.label}</p>
                        <p className="text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>{SUBSYSTEM_HINTS[type]}</p>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[11px] font-semibold" style={{ color: TEXT }}>{items.length} template{items.length > 1 ? 's' : ''}</p>
                    <p className="mt-1 text-[10px]" style={{ color: TEXT_DIM }}>
                      {type === 'sensor' ? 'Partie capteurs' : type === 'logic' ? 'Partie logique' : 'Partie actionneurs'}
                    </p>
                  </div>
                </div>

                {items.length === 0 ? (
                  <div className="px-5 py-8 text-center text-[12px]" style={{ color: TEXT_DIM }}>
                    Aucun template ne correspond aux filtres actifs pour cette famille.
                  </div>
                ) : (
                  <>
                    <div>
                      {visibleItems.map(entry => (
                        <LibraryTemplateCard
                          key={entry.template.id}
                          template={entry.template}
                          origin={entry.origin}
                          expanded={expandedTemplateId === entry.template.id}
                          selected={selectedEntryKey === getLibraryEntryKey(entry.origin, entry.template.id)}
                          onSelect={() => openEntryInspector(entry)}
                          onToggleDetails={id => setExpandedTemplateId(current => current === id ? null : id)}
                          onArchive={entry.origin !== 'builtin' ? handleArchive : undefined}
                          onDelete={entry.origin !== 'builtin' ? handleDelete : undefined}
                        />
                      ))}
                    </div>

                    {!deferredQuery.trim() && remainingCount > 0 && (
                      <div style={{ borderTop: `1px solid ${BORDER}28`, background: PAGE_BG }}>
                        <button
                          type="button"
                          onClick={() => showMore(type)}
                          className="prism-action flex w-full items-center justify-between px-4 py-3 text-left transition-colors"
                          style={{ color: meta.color }}
                        >
                          <span className="text-[11px] font-semibold">Charger plus</span>
                          <span className="text-[10px] font-mono" style={{ color: TEXT_DIM }}>+{remainingCount}</span>
                        </button>
                      </div>
                    )}

                    {canShowLess && (
                      <div style={{ borderTop: `1px solid ${BORDER}28`, background: PAGE_BG }}>
                        <button
                          type="button"
                          onClick={() => showLess(type)}
                          className="prism-action flex w-full items-center justify-between px-4 py-3 text-left transition-colors"
                          style={{ color: TEXT_DIM }}
                        >
                          <span className="text-[11px] font-semibold">Voir moins</span>
                          <span className="text-[10px] font-mono">{INITIAL_LIBRARY_VISIBLE_COUNT[type]}</span>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </section>
            )
          })}
        </div>

        <section
          className="overflow-hidden rounded-2xl border"
          style={{ borderColor: `${BORDER}50`, background: CARD_BG, boxShadow: SHADOW_CARD }}
        >
          <LibraryOriginLegend />
        </section>
      </div>
    </div>
  )
}
