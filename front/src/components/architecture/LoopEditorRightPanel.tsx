/**
 * LoopEditorRightPanel — PRISM v3
 *
 * Right panel for Loop Editor:
 * - Built-in component templates kept in code
 * - Project / user component libraries persisted in Supabase
 * - Full template drag-and-drop with import/export JSON
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  Archive,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Cpu,
  Download,
  FolderOpen,
  GripVertical,
  RefreshCw,
  Settings2,
  Trash2,
  Upload,
  User,
  Zap,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { ComponentParamsPanel } from './ComponentParamsPanel'
import type { ComponentTemplate, SIF, SubsystemType } from '@/core/types'
import {
  buildLibraryDragPayload,
  getPanelScopeLabel,
  getTemplateCategoryLabel,
  parseComponentTemplateImport,
  serializeComponentTemplates,
  type LibraryPanelScope,
  useComponentLibrary,
} from '@/features/library'
import { BORDER, R, TEAL, TEAL_DIM, TEXT, TEXT_DIM, dark } from '@/styles/tokens'

const PANEL = dark.panel
const CARD = dark.card
const BG = dark.page

const SUB_META: Record<SubsystemType, { color: string; label: string; Icon: React.ElementType }> = {
  sensor: { color: '#0284C7', label: 'Capteur(s)', Icon: Activity },
  logic: { color: '#7C3AED', label: 'Logique', Icon: Cpu },
  actuator: { color: '#EA580C', label: 'Actionneur(s)', Icon: Zap },
}

type PanelTab = 'library' | 'component'

const TABS: { id: PanelTab; label: string; Icon: React.ElementType }[] = [
  { id: 'library', label: 'Bibliothèque', Icon: BookOpen },
  { id: 'component', label: 'Composant', Icon: Settings2 },
]

const LIBRARY_SCOPES: { id: LibraryPanelScope; label: string; Icon: React.ElementType }[] = [
  { id: 'builtin', label: 'Built-in', Icon: BookOpen },
  { id: 'project', label: 'Project', Icon: FolderOpen },
  { id: 'user', label: 'My Library', Icon: User },
]

function formatTemplateMeta(template: ComponentTemplate): string {
  const parts = [
    template.instrumentType || getTemplateCategoryLabel(template),
    template.manufacturer || null,
    template.dataSource || null,
  ].filter(Boolean)
  return parts.join(' · ')
}

function formatBatchLabel(importBatchId: string | null): string | null {
  if (!importBatchId) return null
  return `batch ${importBatchId.slice(0, 8)}`
}

function downloadJsonFile(fileName: string, content: string) {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

function buildExportFileName(scope: LibraryPanelScope, projectId: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  if (scope === 'project') return `prism-component-templates-project-${projectId}-${stamp}.json`
  return `prism-component-templates-my-library-${stamp}.json`
}

function TemplateCard({
  template,
  onArchive,
  onDelete,
}: {
  template: ComponentTemplate
  onArchive?: (templateId: string) => void
  onDelete?: (templateId: string) => void
}) {
  const meta = SUB_META[template.subsystemType]
  const batchLabel = formatBatchLabel(template.importBatchId)

  return (
    <div
      draggable
      onDragStart={event => {
        event.dataTransfer.setData('application/prism-lib', buildLibraryDragPayload(template))
        event.dataTransfer.effectAllowed = 'copy'
      }}
      className="group flex items-start gap-2 px-3 py-2.5 cursor-grab active:cursor-grabbing transition-colors hover:bg-[#1E242B]"
      style={{ borderBottom: `1px solid ${BORDER}30` }}
    >
      <GripVertical
        size={11}
        className="shrink-0 mt-0.5 opacity-40 group-hover:opacity-80"
        style={{ color: meta.color }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-xs font-medium" style={{ color: TEXT }}>
            {template.name}
          </p>
          <span
            className="rounded px-1 py-0.5 text-[7px] font-bold uppercase"
            style={{ background: `${meta.color}20`, color: meta.color }}
          >
            {template.reviewStatus}
          </span>
        </div>
        <p className="truncate text-[9px]" style={{ color: TEXT_DIM }}>
          {formatTemplateMeta(template) || getTemplateCategoryLabel(template)}
        </p>
        {(template.tags.length > 0 || batchLabel) && (
          <div className="mt-1 flex flex-wrap gap-1">
            {template.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="rounded px-1 py-0.5 text-[8px]"
                style={{ background: '#141A21', color: TEXT_DIM, border: `1px solid ${BORDER}` }}
              >
                {tag}
              </span>
            ))}
            {batchLabel && (
              <span
                className="rounded px-1 py-0.5 text-[8px]"
                style={{ background: `${TEAL}10`, color: TEAL_DIM, border: `1px solid ${TEAL}25` }}
              >
                {batchLabel}
              </span>
            )}
          </div>
        )}
      </div>
      {(onArchive || onDelete) && (
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {onArchive && (
            <button
              type="button"
              onClick={event => {
                event.stopPropagation()
                onArchive(template.id)
              }}
              className="rounded p-0.5 transition-colors hover:bg-amber-900/30"
              style={{ color: '#FBBF24' }}
              title="Archiver"
            >
              <Archive size={10} />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={event => {
                event.stopPropagation()
                onDelete(template.id)
              }}
              className="rounded p-0.5 transition-colors hover:bg-red-900/30"
              style={{ color: '#F87171' }}
              title="Supprimer"
            >
              <Trash2 size={10} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function ScopeHint({ activeScope }: { activeScope: LibraryPanelScope }) {
  if (activeScope !== 'builtin') return null
  return (
    <div
      className="mx-3 mt-2 rounded-lg border px-3 py-2 text-[10px]"
      style={{ background: `${TEAL}08`, borderColor: `${TEAL}25`, color: TEAL_DIM }}
    >
      Import/export JSON est disponible dans <strong>Project</strong> et <strong>My Library</strong>.
    </div>
  )
}

function EmptyComponentState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl"
        style={{ background: `${TEAL}10`, border: `1px solid ${TEAL}25` }}
      >
        <Settings2 size={20} style={{ color: TEAL_DIM }} />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold" style={{ color: TEXT }}>
          Aucun composant sélectionné
        </p>
        <p className="text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
          Cliquez sur un composant dans le canvas pour éditer ses paramètres ici.
        </p>
      </div>
      <div className="w-full rounded-lg border p-3" style={{ background: `${TEAL}08`, borderColor: `${TEAL}25` }}>
        <p className="text-[10px] leading-relaxed" style={{ color: TEAL_DIM }}>
          Glissez un template depuis la <strong>Bibliothèque</strong> sur un canal du canvas.
        </p>
      </div>
    </div>
  )
}

function LibraryContent({ projectId }: { projectId: string }) {
  const profileId = useAppStore(state => state.profile?.id ?? null)
  const setSyncError = useAppStore(state => state.setSyncError)
  const {
    builtinTemplates,
    projectTemplates,
    userTemplates,
    loading,
    error,
    fetchTemplates,
    importTemplates,
    archiveTemplate,
    deleteTemplate,
    clearError,
  } = useComponentLibrary(projectId)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [search, setSearch] = useState('')
  const [activeScope, setActiveScope] = useState<LibraryPanelScope>('builtin')
  const [openTypes, setOpenTypes] = useState<Set<SubsystemType>>(new Set(['sensor', 'logic', 'actuator']))
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const scopeCounts = useMemo(
    () => ({
      builtin: builtinTemplates.length,
      project: projectTemplates.length,
      user: userTemplates.length,
    }),
    [builtinTemplates.length, projectTemplates.length, userTemplates.length],
  )

  const activeTemplates = useMemo(() => {
    if (activeScope === 'builtin') return builtinTemplates
    if (activeScope === 'project') return projectTemplates
    return userTemplates
  }, [activeScope, builtinTemplates, projectTemplates, userTemplates])

  const filteredTemplates = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return activeTemplates

    return activeTemplates.filter(template => {
      const haystack = [
        template.name,
        template.description,
        template.instrumentType,
        template.manufacturer,
        template.dataSource,
        template.sourceReference ?? '',
        ...template.tags,
      ].join(' ').toLowerCase()
      return haystack.includes(needle)
    })
  }, [activeTemplates, search])

  const templatesBySubsystem = useMemo(
    () => ({
      sensor: filteredTemplates.filter(template => template.subsystemType === 'sensor'),
      logic: filteredTemplates.filter(template => template.subsystemType === 'logic'),
      actuator: filteredTemplates.filter(template => template.subsystemType === 'actuator'),
    }),
    [filteredTemplates],
  )

  const canImportExport = activeScope !== 'builtin'

  const toggleSubsystem = (subsystemType: SubsystemType) => {
    setOpenTypes(previous => {
      const next = new Set(previous)
      if (next.has(subsystemType)) next.delete(subsystemType)
      else next.add(subsystemType)
      return next
    })
  }

  const resetStatus = () => {
    setStatusMessage(null)
    clearError(null)
    setSyncError(null)
  }

  const handleRefresh = async () => {
    resetStatus()
    try {
      await fetchTemplates()
      setStatusMessage('Bibliothèque custom rechargée.')
    } catch {
      // handled in store state
    }
  }

  const handleExport = () => {
    if (!canImportExport || activeTemplates.length === 0) return
    resetStatus()
    const content = serializeComponentTemplates(
      activeTemplates,
      profileId,
      activeScope === 'project' ? projectId : null,
    )
    downloadJsonFile(buildExportFileName(activeScope, projectId), content)
    setStatusMessage(`${activeTemplates.length} template(s) exporté(s) depuis ${getPanelScopeLabel(activeScope)}.`)
  }

  const handleImportClick = () => {
    if (!canImportExport) return
    fileInputRef.current?.click()
  }

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    resetStatus()

    try {
      const text = await file.text()
      const batchId = crypto.randomUUID()
      const payload = parseComponentTemplateImport(text, activeScope, projectId)
      const imported = await importTemplates(payload.map(template => ({
        ...template,
        importBatchId: batchId,
      })))
      setStatusMessage(`${imported.length} template(s) importé(s) dans ${getPanelScopeLabel(activeScope)}.`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setSyncError(message)
      setStatusMessage(null)
    }
  }

  const handleArchive = async (templateId: string) => {
    resetStatus()
    try {
      await archiveTemplate(templateId)
      setStatusMessage('Template archivé.')
    } catch (err: unknown) {
      setSyncError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleDelete = async (templateId: string) => {
    resetStatus()
    try {
      await deleteTemplate(templateId)
      setStatusMessage('Template supprimé.')
    } catch (err: unknown) {
      setSyncError(err instanceof Error ? err.message : String(err))
    }
  }

  const scopeIconColor = activeScope === 'project' ? '#F59E0B' : TEAL_DIM

  return (
    <div className="flex h-full flex-col">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleImportFile}
      />

      <div className="shrink-0 px-3 py-2.5" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <input
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Rechercher un template…"
          className="w-full rounded-md border px-2.5 py-1.5 text-xs outline-none transition-colors"
          style={{ background: BG, borderColor: BORDER, color: TEXT }}
          onFocus={event => (event.target.style.borderColor = TEAL)}
          onBlur={event => (event.target.style.borderColor = BORDER)}
        />
      </div>

      <div
        className="shrink-0 px-3 py-2"
        style={{ background: `${TEAL}08`, borderBottom: `1px solid ${BORDER}` }}
      >
        <div className="flex items-center gap-1.5">
          <GripVertical size={10} style={{ color: scopeIconColor }} />
          <p className="text-[9px]" style={{ color: TEAL_DIM }}>
            Glissez un template complet SIL sur le canal de votre choix
          </p>
        </div>
      </div>

      <div className="shrink-0 px-3 pt-2">
        <div className="grid grid-cols-3 gap-1 rounded-lg p-1" style={{ background: BG }}>
          {LIBRARY_SCOPES.map(scope => {
            const isActive = scope.id === activeScope
            return (
              <button
                key={scope.id}
                type="button"
                onClick={() => {
                  resetStatus()
                  setActiveScope(scope.id)
                }}
                className="flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-bold transition-all"
                style={isActive
                  ? { background: CARD, color: TEXT, border: `1px solid ${BORDER}` }
                  : { color: TEXT_DIM }}
              >
                <scope.Icon size={11} />
                <span>{scope.label}</span>
                <span className="font-mono" style={{ color: isActive ? TEAL_DIM : TEXT_DIM }}>
                  {scopeCounts[scope.id]}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="shrink-0 px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleImportClick}
            disabled={!canImportExport}
            className="flex h-7 items-center gap-1 rounded-md border px-2 text-[10px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            style={{ borderColor: BORDER, color: TEXT, background: BG }}
          >
            <Upload size={11} />
            Import JSON
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={!canImportExport || activeTemplates.length === 0}
            className="flex h-7 items-center gap-1 rounded-md border px-2 text-[10px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            style={{ borderColor: BORDER, color: TEXT, background: BG }}
          >
            <Download size={11} />
            Export JSON
          </button>
          <button
            type="button"
            onClick={() => void handleRefresh()}
            className="ml-auto flex h-7 items-center gap-1 rounded-md border px-2 text-[10px] font-semibold transition-colors"
            style={{ borderColor: BORDER, color: TEXT_DIM, background: BG }}
            title="Recharger la bibliothèque"
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <ScopeHint activeScope={activeScope} />

      {(statusMessage || error) && (
        <div className="shrink-0 px-3 pb-2">
          {statusMessage && (
            <div
              className="rounded-lg border px-3 py-2 text-[10px]"
              style={{ background: `${TEAL}08`, borderColor: `${TEAL}25`, color: TEAL_DIM }}
            >
              {statusMessage}
            </div>
          )}
          {error && (
            <div
              className="mt-2 rounded-lg border px-3 py-2 text-[10px]"
              style={{ background: '#7F1D1D20', borderColor: '#F8717130', color: '#FCA5A5' }}
            >
              {error}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {(['sensor', 'logic', 'actuator'] as SubsystemType[]).map(subsystemType => {
          const meta = SUB_META[subsystemType]
          const items = templatesBySubsystem[subsystemType]
          const open = openTypes.has(subsystemType)

          return (
            <div key={subsystemType}>
              <div
                className="flex items-center gap-2 px-3 py-2 transition-colors hover:bg-[#1E242B]"
                style={{ borderBottom: `1px solid ${BORDER}` }}
              >
                <button
                  type="button"
                  onClick={() => toggleSubsystem(subsystemType)}
                  className="flex min-w-0 flex-1 items-center gap-2"
                >
                  <meta.Icon size={12} style={{ color: meta.color }} />
                  <span
                    className="flex-1 text-left text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: meta.color }}
                  >
                    {meta.label}
                  </span>
                  <span className="text-[9px] font-mono" style={{ color: TEXT_DIM }}>
                    {items.length}
                  </span>
                  {open ? (
                    <ChevronDown size={10} style={{ color: TEXT_DIM }} />
                  ) : (
                    <ChevronRight size={10} style={{ color: TEXT_DIM }} />
                  )}
                </button>
              </div>

              {open && items.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onArchive={template.origin === 'database' ? handleArchive : undefined}
                  onDelete={template.origin === 'database' ? handleDelete : undefined}
                />
              ))}

              {open && items.length === 0 && (
                <div className="px-3 py-4 text-center">
                  <p className="text-[10px]" style={{ color: TEXT_DIM }}>
                    {activeScope === 'builtin'
                      ? 'Aucun template built-in correspondant à la recherche.'
                      : 'Sélectionnez un composant dans le canvas puis enregistrez-le dans cette bibliothèque.'}
                  </p>
                </div>
              )}
            </div>
          )
        })}

        {filteredTemplates.length === 0 && (
          <div className="px-3 py-8 text-center">
            <p className="text-xs font-medium" style={{ color: TEXT }}>
              Aucun résultat
            </p>
            <p className="mt-1 text-[10px]" style={{ color: TEXT_DIM }}>
              Ajustez la recherche ou changez d’onglet de bibliothèque.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

interface Props {
  sif: SIF
  projectId: string
}

export function LoopEditorRightPanel({ sif, projectId }: Props) {
  const selectedId = useAppStore(state => state.selectedComponentId)
  const selectComponent = useAppStore(state => state.selectComponent)
  const [activeTab, setActiveTab] = useState<PanelTab>('library')

  useEffect(() => {
    if (selectedId) setActiveTab('component')
  }, [selectedId])

  let found: {
    comp: (typeof sif.subsystems)[0]['channels'][0]['components'][0]
    subsystemType: SubsystemType
    subsystemId: string
    channelId: string
  } | null = null

  if (selectedId) {
    outer: for (const subsystem of sif.subsystems) {
      for (const channel of subsystem.channels) {
        const component = channel.components.find(entry => entry.id === selectedId)
        if (component) {
          found = {
            comp: component,
            subsystemType: subsystem.type,
            subsystemId: subsystem.id,
            channelId: channel.id,
          }
          break outer
        }
      }
    }
  }

  const activeIdx = TABS.findIndex(tab => tab.id === activeTab)

  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ background: PANEL }}>
      <div className="shrink-0 px-3 pt-3">
        <div className="flex items-end" style={{ borderBottom: `1px solid ${BORDER}` }}>
          {TABS.map(tab => {
            const isActive = tab.id === activeTab
            const hasBadge = tab.id === 'component' && Boolean(selectedId)

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className="relative flex shrink-0 items-center gap-1.5 px-3 py-2 text-left transition-colors"
                style={isActive
                  ? {
                      background: CARD,
                      borderTop: `1px solid ${BORDER}`,
                      borderLeft: `1px solid ${BORDER}`,
                      borderRight: `1px solid ${BORDER}`,
                      borderBottom: `1px solid ${CARD}`,
                      borderRadius: `${R}px ${R}px 0 0`,
                      color: TEAL_DIM,
                      marginBottom: '-1px',
                      zIndex: 10,
                    }
                  : { color: TEXT_DIM }}
                onMouseEnter={event => {
                  if (!isActive) event.currentTarget.style.color = TEXT
                }}
                onMouseLeave={event => {
                  if (!isActive) event.currentTarget.style.color = TEXT_DIM
                }}
              >
                <tab.Icon size={11} />
                <span className="whitespace-nowrap text-[12px] font-semibold">{tab.label}</span>
                {hasBadge && (
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: isActive ? TEAL : `${TEAL}80` }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div
        className="flex-1 overflow-hidden"
        style={{
          background: CARD,
          borderLeft: `1px solid ${BORDER}`,
          borderRight: `1px solid ${BORDER}`,
          borderBottom: `1px solid ${BORDER}`,
          borderRadius: `${activeIdx === 0 ? 0 : R}px ${activeIdx === TABS.length - 1 ? 0 : R}px ${R}px ${R}px`,
          margin: '0 12px 12px',
        }}
      >
        {activeTab === 'library' && <LibraryContent projectId={projectId} />}
        {activeTab === 'component' && (
          found ? (
            <ComponentParamsPanel
              component={found.comp}
              subsystemType={found.subsystemType}
              projectId={projectId}
              sifId={sif.id}
              subsystemId={found.subsystemId}
              channelId={found.channelId}
              onClose={() => {
                selectComponent(null)
                setActiveTab('library')
              }}
            />
          ) : (
            <EmptyComponentState />
          )
        )}
      </div>
    </div>
  )
}
