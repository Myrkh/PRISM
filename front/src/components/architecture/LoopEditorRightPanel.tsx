/**
 * LoopEditorRightPanel — PRISM v3 (redesigned)
 *
 * Layout: icon rail (32px) | content
 * Modes:
 *   [Network]   Architecture — config voies/arch/CCF, contraint par la topologie réelle
 *   [Settings2] Composant    — params panel (auto-ouvre à la sélection)
 *   [BookOpen]  Bibliothèque — liste unifiée glissable
 */
import { useEffect, useRef, useState } from 'react'
import {
  Activity,
  Archive,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Cpu,
  Download,
  GripVertical,
  Layers,
  Network,
  RefreshCw,
  Settings2,
  Trash2,
  Upload,
  Zap,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { ComponentParamsPanel } from './ComponentParamsPanel'
import type { Architecture, ComponentTemplate, SIF, SIFSubsystem, SubsystemType } from '@/core/types'
import {
  buildLibraryDragPayload,
  parseComponentTemplateImport,
  serializeComponentTemplates,
  useComponentLibrary,
} from '@/features/library'
import { RightPanelShell } from '@/components/layout/RightPanelShell'
import { BORDER, TEAL, TEAL_DIM, TEXT, TEXT_DIM, dark } from '@/styles/tokens'

const PANEL = dark.panel
const BG    = dark.page

// ─── Constants ────────────────────────────────────────────────────────────────

const SUB_META: Record<SubsystemType, { color: string; label: string; Icon: React.ElementType }> = {
  sensor:   { color: '#0284C7', label: 'Capteurs',     Icon: Activity },
  logic:    { color: '#7C3AED', label: 'Logique',      Icon: Cpu      },
  actuator: { color: '#EA580C', label: 'Actionneurs',  Icon: Zap      },
}

type PanelMode = 'architecture' | 'component' | 'library'

const MODES: { id: PanelMode; Icon: React.ElementType; label: string }[] = [
  { id: 'architecture', Icon: Network,   label: 'Architecture' },
  { id: 'component',    Icon: Settings2, label: 'Composant'    },
  { id: 'library',      Icon: BookOpen,  label: 'Bibliothèque' },
]

// Architecture valide selon le nombre de voies
const ARCH_OPTIONS: { value: Architecture; label: string; channels: number | null }[] = [
  { value: '1oo1',   label: '1oo1',   channels: 1    },
  { value: '1oo2',   label: '1oo2',   channels: 2    },
  { value: '2oo2',   label: '2oo2',   channels: 2    },
  { value: '1oo2D',  label: '1oo2D',  channels: 2    },
  { value: '2oo3',   label: '2oo3',   channels: 3    },
  { value: '1oo3',   label: '1oo3',   channels: 3    },
  { value: '2oo4',   label: '2oo4',   channels: 4    },
  { value: 'custom', label: 'Custom', channels: null }, // toujours disponible
]

function getValidArchOptions(channelCount: number) {
  return ARCH_OPTIONS.filter(o => o.channels === null || o.channels === channelCount)
}

function firstValidArch(channelCount: number): Architecture {
  return getValidArchOptions(channelCount)[0]?.value ?? 'custom'
}

// ─── Subsystem config section ─────────────────────────────────────────────────

function SubsystemArchSection({
  subsystem,
  projectId,
  sifId,
}: {
  subsystem: SIFSubsystem
  projectId: string
  sifId: string
}) {
  const updateSubsystem = useAppStore(s => s.updateSubsystem)
  const addChannel      = useAppStore(s => s.addChannel)
  const removeChannel   = useAppStore(s => s.removeChannel)
  const [open, setOpen] = useState(true)

  const meta         = SUB_META[subsystem.type]
  const channelCount = subsystem.channels.length
  const hasCCF       = channelCount > 1
  const ccfEnabled   = hasCCF && (subsystem.ccf.beta > 0 || subsystem.ccf.betaD > 0)
  const validArchs   = getValidArchOptions(channelCount)

  const upd = (patch: Partial<SIFSubsystem>) =>
    updateSubsystem(projectId, sifId, { ...subsystem, ...patch })

  // Pas d'auto-reset d'architecture ici : upd() utiliserait le subsystem stale
  // (avant que addChannel ait mis à jour le store) et écraserait la voie ajoutée.
  // Le dropdown filtré garantit qu'une architecture invalide ne peut pas être sélectionnée.
  const handleChannelAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (channelCount >= 4) return
    addChannel(projectId, sifId, subsystem.id)
  }

  const handleChannelRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (channelCount <= 1) return
    const last = subsystem.channels[channelCount - 1]
    removeChannel(projectId, sifId, subsystem.id, last.id)
  }

  return (
    <div style={{ borderBottom: `1px solid ${BORDER}` }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-[#161C24]"
      >
        <div
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded"
          style={{ background: `${meta.color}20` }}
        >
          <meta.Icon size={10} style={{ color: meta.color }} />
        </div>
        <span className="flex-1 text-[11px] font-semibold" style={{ color: TEXT }}>{meta.label}</span>
        <span
          className="rounded px-1.5 py-0.5 text-[9px] font-mono font-bold shrink-0"
          style={{ background: `${meta.color}15`, color: meta.color }}
        >
          {subsystem.architecture}
        </span>
        <span className="text-[9px] font-mono shrink-0" style={{ color: TEXT_DIM }}>{channelCount}V</span>
        {open
          ? <ChevronDown size={10} style={{ color: TEXT_DIM }} />
          : <ChevronRight size={10} style={{ color: TEXT_DIM }} />
        }
      </button>

      {open && (
        <div className="space-y-3 px-3 pb-3 pt-2" style={{ background: '#0B1017' }}>

          {/* Voies + Architecture — liés */}
          <div className="flex gap-2">
            {/* Voies stepper */}
            <div className="shrink-0">
              <p className="mb-1 text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Voies</p>
              <div className="flex items-center overflow-hidden rounded-md border" style={{ borderColor: BORDER }}>
                <button
                  type="button"
                  onClick={handleChannelRemove}
                  disabled={channelCount <= 1}
                  className="flex h-[28px] w-6 items-center justify-center text-sm transition-colors hover:bg-[#1E242B] disabled:opacity-30"
                  style={{ color: TEXT_DIM, background: BG }}
                >−</button>
                <span
                  className="flex h-[28px] w-6 items-center justify-center text-xs font-mono font-bold"
                  style={{ background: BG, color: TEXT, borderLeft: `1px solid ${BORDER}`, borderRight: `1px solid ${BORDER}` }}
                >
                  {channelCount}
                </span>
                <button
                  type="button"
                  onClick={handleChannelAdd}
                  disabled={channelCount >= 4}
                  className="flex h-[28px] w-6 items-center justify-center text-sm transition-colors hover:bg-[#1E242B] disabled:opacity-30"
                  style={{ color: TEAL_DIM, background: BG }}
                >+</button>
              </div>
            </div>

            {/* Architecture — voting grid filtré par nombre de voies */}
            <div className="flex-1 min-w-0">
              <p className="mb-1 text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Architecture</p>
              <div className="flex gap-1 flex-wrap">
                {validArchs.map(o => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => upd({ architecture: o.value })}
                    className="rounded-md px-2 py-1.5 text-[10px] font-mono font-bold transition-all"
                    style={subsystem.architecture === o.value
                      ? { background: meta.color, color: '#fff', boxShadow: `0 0 8px ${meta.color}40` }
                      : { background: '#141A21', color: TEXT_DIM, border: `1px solid ${BORDER}` }
                    }
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              {channelCount === 1 && (
                <p className="mt-1.5 text-[9px]" style={{ color: TEXT_DIM }}>
                  Ajoutez des voies pour activer la redondance.
                </p>
              )}
            </div>
          </div>

          {/* CCF — uniquement si redondant */}
          {hasCCF && (
            <div
              className="rounded-lg border p-2.5 space-y-2 transition-colors"
              style={{
                borderColor: ccfEnabled ? `${TEAL}35` : BORDER,
                background:  ccfEnabled ? `${TEAL}06` : 'transparent',
              }}
            >
              <button
                type="button"
                onClick={() => upd({
                  ccf: {
                    ...subsystem.ccf,
                    beta:  ccfEnabled ? 0 : 0.10,
                    betaD: ccfEnabled ? 0 : 0.05,
                  },
                })}
                className="flex w-full items-center gap-2"
              >
                <div
                  className="relative h-3.5 w-7 rounded-full shrink-0 transition-colors"
                  style={{ background: ccfEnabled ? TEAL : BORDER }}
                >
                  <div
                    className="absolute top-0.5 h-2.5 w-2.5 rounded-full transition-all"
                    style={{ background: '#FFF', left: ccfEnabled ? '16px' : '2px' }}
                  />
                </div>
                <span className="text-[10px] font-semibold" style={{ color: ccfEnabled ? TEAL_DIM : TEXT_DIM }}>
                  Cause commune (β)
                </span>
                {subsystem.ccf.assessment?.mode === 'iec61508' && (
                  <span
                    className="ml-auto rounded px-1 py-0.5 text-[8px] font-bold"
                    style={{ background: `${TEAL}18`, color: TEAL_DIM }}
                  >
                    Via tableau
                  </span>
                )}
              </button>

              {ccfEnabled && (() => {
                // beta/betaD sont stockés en fraction [0-1], on affiche en %
                const fromPct = (pct: string, fallback: number) =>
                  Math.min(1, Math.max(0, (parseFloat(pct) || 0) / 100)) || fallback
                const toPct = (v: number) => +(v * 100).toFixed(4)
                const isTableDerived = subsystem.ccf.assessment?.mode === 'iec61508'

                return (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'beta',  label: 'β total', val: subsystem.ccf.beta  },
                      { key: 'betaD', label: 'βD (DD)', val: subsystem.ccf.betaD },
                    ].map(({ key, label, val }) => (
                      <div key={key}>
                        <p className="mb-1 text-[9px] font-bold uppercase" style={{ color: TEXT_DIM }}>{label}</p>
                        <div className="relative flex items-center">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            readOnly={isTableDerived}
                            value={toPct(val)}
                            onChange={e => {
                              if (isTableDerived) return
                              upd({ ccf: { ...subsystem.ccf, [key]: fromPct(e.target.value, val) } })
                            }}
                            className="w-full rounded-md border py-1.5 pl-2 pr-6 text-xs font-mono outline-none"
                            style={{
                              background:  BG,
                              borderColor: BORDER,
                              color:       TEXT,
                              opacity:     isTableDerived ? 0.6 : 1,
                              cursor:      isTableDerived ? 'default' : 'text',
                            }}
                          />
                          <span
                            className="pointer-events-none absolute right-2 text-[10px]"
                            style={{ color: TEXT_DIM }}
                          >%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          )}

          {/* Channel-level kooN — when a channel has 2+ components */}
          {subsystem.channels.some(ch => ch.components.length > 1) && (
            <div className="space-y-2">
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
                Voting intra-canal
              </p>
              {subsystem.channels.filter(ch => ch.components.length > 1).map(ch => {
                const nComps = ch.components.length
                const chArch = ch.architecture ?? '1oo1'
                const validChArchs = ARCH_OPTIONS.filter(o =>
                  o.channels !== null ? o.channels === nComps : true
                )
                const displayArch = validChArchs.find(o => o.value === chArch) ? chArch : '1oo1'

                const handleChArchChange = (arch: Architecture) => {
                  upd({
                    channels: subsystem.channels.map(c =>
                      c.id === ch.id ? { ...c, architecture: arch } : c
                    ),
                  })
                }

                return (
                  <div key={ch.id} className="rounded-lg border p-2 space-y-1.5"
                    style={{ borderColor: BORDER, background: '#0B1017' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
                      <span className="text-[10px] font-semibold flex-1" style={{ color: TEXT }}>
                        {ch.label}
                      </span>
                      <span className="text-[9px] font-mono" style={{ color: TEXT_DIM }}>
                        {nComps} comp.
                      </span>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {validChArchs.map(o => (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => handleChArchChange(o.value)}
                          className="rounded px-2 py-1 text-[9px] font-mono font-bold transition-all"
                          style={displayArch === o.value
                            ? { background: meta.color, color: '#fff' }
                            : { background: '#141A21', color: TEXT_DIM, border: `1px solid ${BORDER}` }
                          }
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Architecture panel ───────────────────────────────────────────────────────

function ArchitectureConfigPanel({ sif, projectId }: { sif: SIF; projectId: string }) {
  if (sif.subsystems.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <Layers size={18} style={{ color: TEXT_DIM }} />
        <p className="text-xs" style={{ color: TEXT_DIM }}>
          Ajoutez des sous-systèmes depuis le canvas.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        {sif.subsystems.map(subsystem => (
          <SubsystemArchSection
            key={subsystem.id}
            subsystem={subsystem}
            projectId={projectId}
            sifId={sif.id}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Library ──────────────────────────────────────────────────────────────────

type OriginBadge = 'builtin' | 'project' | 'user'

const ORIGIN_STYLE: Record<OriginBadge, { label: string; color: string; bg: string }> = {
  builtin: { label: 'std',    color: TEXT_DIM,   bg: `${BORDER}60`    },
  project: { label: 'projet', color: '#F59E0B',  bg: '#F59E0B18'      },
  user:    { label: 'perso',  color: TEAL_DIM,   bg: `${TEAL}15`      },
}

function TemplateCard({
  template,
  origin,
  onArchive,
  onDelete,
}: {
  template: ComponentTemplate
  origin: OriginBadge
  onArchive?: (id: string) => void
  onDelete?: (id: string) => void
}) {
  const meta = SUB_META[template.subsystemType]
  const orig = ORIGIN_STYLE[origin]

  return (
    <div
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('application/prism-lib', buildLibraryDragPayload(template))
        e.dataTransfer.effectAllowed = 'copy'
      }}
      className="group flex items-center gap-2 px-3 py-2 cursor-grab active:cursor-grabbing transition-colors hover:bg-[#1A2028]"
      style={{ borderBottom: `1px solid ${BORDER}28` }}
    >
      <GripVertical size={10} className="shrink-0 opacity-30 group-hover:opacity-70" style={{ color: meta.color }} />
      <meta.Icon size={11} className="shrink-0" style={{ color: meta.color }} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-medium" style={{ color: TEXT }}>{template.name}</p>
        {(template.manufacturer || template.instrumentType) && (
          <p className="truncate text-[9px]" style={{ color: TEXT_DIM }}>
            {[template.instrumentType, template.manufacturer].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
      <span
        className="shrink-0 rounded px-1 py-0.5 text-[8px] font-bold"
        style={{ background: orig.bg, color: orig.color }}
      >
        {orig.label}
      </span>
      {(onArchive || onDelete) && (
        <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {onArchive && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onArchive(template.id) }}
              className="rounded p-1 transition-colors hover:bg-amber-900/30"
              style={{ color: '#FBBF24' }}
              title="Archiver"
            >
              <Archive size={10} />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onDelete(template.id) }}
              className="rounded p-1 transition-colors hover:bg-red-900/30"
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

function LibraryContent({ projectId }: { projectId: string }) {
  const profileId = useAppStore(state => state.profile?.id ?? null)
  const setSyncError = useAppStore(state => state.setSyncError)
  const {
    builtinTemplates, projectTemplates, userTemplates,
    loading, error, fetchTemplates, importTemplates,
    archiveTemplate, deleteTemplate, clearError,
  } = useComponentLibrary(projectId)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [search, setSearch] = useState('')
  const [openTypes, setOpenTypes] = useState<Set<SubsystemType>>(new Set(['sensor', 'logic', 'actuator']))
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  // Unified list: built-in first, then project, then user
  const allTemplates = [
    ...builtinTemplates.map(t => ({ template: t, origin: 'builtin' as OriginBadge })),
    ...projectTemplates.map(t => ({ template: t, origin: 'project' as OriginBadge })),
    ...userTemplates.map(t => ({ template: t, origin: 'user' as OriginBadge })),
  ]

  const filtered = (() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return allTemplates
    return allTemplates.filter(({ template: t }) => {
      const hay = [t.name, t.description, t.instrumentType, t.manufacturer, t.dataSource, ...t.tags]
        .filter(Boolean).join(' ').toLowerCase()
      return hay.includes(needle)
    })
  })()

  const bySubsystem: Record<SubsystemType, typeof filtered> = {
    sensor:   filtered.filter(x => x.template.subsystemType === 'sensor'),
    logic:    filtered.filter(x => x.template.subsystemType === 'logic'),
    actuator: filtered.filter(x => x.template.subsystemType === 'actuator'),
  }

  const toggleType = (type: SubsystemType) =>
    setOpenTypes(prev => {
      const next = new Set(prev)
      next.has(type) ? next.delete(type) : next.add(type)
      return next
    })

  const reset = () => { setStatusMessage(null); clearError(null); setSyncError(null) }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    reset()
    try {
      const text = await file.text()
      const batchId = crypto.randomUUID()
      const payload = parseComponentTemplateImport(text, 'user', projectId)
      const imported = await importTemplates(payload.map(t => ({ ...t, importBatchId: batchId })))
      setStatusMessage(`${imported.length} template(s) importé(s).`)
    } catch (err: unknown) {
      setSyncError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleExport = () => {
    reset()
    const exportable = userTemplates.length > 0 ? userTemplates : projectTemplates
    if (exportable.length === 0) return
    const scope = userTemplates.length > 0 ? 'user' : 'project'
    const content = serializeComponentTemplates(exportable, profileId, scope === 'project' ? projectId : null)
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `prism-templates-${stamp}.json`
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
    setStatusMessage(`${exportable.length} template(s) exporté(s).`)
  }

  const handleArchive = async (id: string) => {
    reset()
    try { await archiveTemplate(id); setStatusMessage('Archivé.') }
    catch (err: unknown) { setSyncError(err instanceof Error ? err.message : String(err)) }
  }

  const handleDelete = async (id: string) => {
    reset()
    try { await deleteTemplate(id); setStatusMessage('Supprimé.') }
    catch (err: unknown) { setSyncError(err instanceof Error ? err.message : String(err)) }
  }

  return (
    <div className="flex h-full flex-col">
      <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportFile} />

      {/* Header : search + actions */}
      <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-2" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher…"
          className="min-w-0 flex-1 rounded-md border px-2 py-1.5 text-[11px] outline-none transition-colors"
          style={{ background: BG, borderColor: BORDER, color: TEXT }}
          onFocus={e => (e.target.style.borderColor = TEAL)}
          onBlur={e => (e.target.style.borderColor = BORDER)}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-7 w-7 items-center justify-center rounded-md border transition-colors hover:bg-[#1E242B]"
          style={{ borderColor: BORDER, color: TEXT_DIM }}
          title="Importer (JSON)"
        >
          <Upload size={11} />
        </button>
        <button
          type="button"
          onClick={handleExport}
          disabled={userTemplates.length === 0 && projectTemplates.length === 0}
          className="flex h-7 w-7 items-center justify-center rounded-md border transition-colors hover:bg-[#1E242B] disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ borderColor: BORDER, color: TEXT_DIM }}
          title="Exporter mes templates"
        >
          <Download size={11} />
        </button>
        <button
          type="button"
          onClick={() => void fetchTemplates()}
          className="flex h-7 w-7 items-center justify-center rounded-md border transition-colors hover:bg-[#1E242B]"
          style={{ borderColor: BORDER, color: TEXT_DIM }}
          title="Recharger"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Feedback */}
      {(statusMessage || error) && (
        <div className="shrink-0 px-2.5 pt-2">
          {statusMessage && (
            <div className="rounded-md px-2.5 py-1.5 text-[10px]"
              style={{ background: `${TEAL}10`, color: TEAL_DIM, border: `1px solid ${TEAL}20` }}>
              {statusMessage}
            </div>
          )}
          {error && (
            <div className="rounded-md px-2.5 py-1.5 text-[10px]"
              style={{ background: '#7F1D1D20', color: '#FCA5A5', border: `1px solid #F8717130` }}>
              {error}
            </div>
          )}
        </div>
      )}

      {/* Grouped list */}
      <div className="flex-1 overflow-y-auto pt-1">
        {(['sensor', 'logic', 'actuator'] as SubsystemType[]).map(type => {
          const meta  = SUB_META[type]
          const items = bySubsystem[type]
          const open  = openTypes.has(type)
          return (
            <div key={type}>
              <button
                type="button"
                onClick={() => toggleType(type)}
                className="flex w-full items-center gap-2 px-3 py-1.5 transition-colors hover:bg-[#1A2028]"
                style={{ borderBottom: `1px solid ${BORDER}` }}
              >
                <meta.Icon size={11} style={{ color: meta.color }} />
                <span className="flex-1 text-left text-[9px] font-bold uppercase tracking-widest" style={{ color: meta.color }}>
                  {meta.label}
                </span>
                <span className="text-[9px] font-mono" style={{ color: TEXT_DIM }}>{items.length}</span>
                {open
                  ? <ChevronDown size={9} style={{ color: TEXT_DIM }} />
                  : <ChevronRight size={9} style={{ color: TEXT_DIM }} />
                }
              </button>
              {open && items.map(({ template, origin }) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  origin={origin}
                  onArchive={origin !== 'builtin' ? handleArchive : undefined}
                  onDelete={origin !== 'builtin' ? handleDelete : undefined}
                />
              ))}
              {open && items.length === 0 && (
                <p className="px-3 py-3 text-center text-[10px]" style={{ color: TEXT_DIM }}>
                  Aucun template{search ? ' correspondant' : ''}.
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div
        className="shrink-0 flex items-center gap-3 px-3 py-2"
        style={{ borderTop: `1px solid ${BORDER}`, background: BG }}
      >
        {(Object.entries(ORIGIN_STYLE) as [OriginBadge, typeof ORIGIN_STYLE[OriginBadge]][]).map(([key, s]) => (
          <span key={key} className="flex items-center gap-1 text-[9px]" style={{ color: TEXT_DIM }}>
            <span className="rounded px-1 py-0.5 text-[8px] font-bold" style={{ background: s.bg, color: s.color }}>{s.label}</span>
            {key === 'builtin' ? 'standard' : key === 'project' ? 'projet' : 'personnel'}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Empty component state ────────────────────────────────────────────────────

function EmptyComponentState({ onGoToLibrary }: { onGoToLibrary: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-xl"
        style={{ background: `${TEAL}10`, border: `1px solid ${TEAL}20` }}
      >
        <Settings2 size={16} style={{ color: TEAL_DIM }} />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold" style={{ color: TEXT }}>Aucun composant sélectionné</p>
        <p className="text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
          Cliquez sur un composant dans le canvas.
        </p>
      </div>
      <button
        type="button"
        onClick={onGoToLibrary}
        className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-[#1E242B]"
        style={{ borderColor: BORDER, color: TEXT_DIM }}
      >
        <BookOpen size={11} />
        Ouvrir la bibliothèque
      </button>
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

interface Props {
  sif: SIF
  projectId: string
}

export function LoopEditorRightPanel({ sif, projectId }: Props) {
  const selectedId      = useAppStore(state => state.selectedComponentId)
  const selectComponent = useAppStore(state => state.selectComponent)
  const [mode, setMode] = useState<PanelMode>('architecture')

  useEffect(() => {
    if (selectedId) setMode('component')
  }, [selectedId])

  // Find selected component
  let found: {
    comp: (typeof sif.subsystems)[0]['channels'][0]['components'][0]
    subsystemType: SubsystemType
    subsystemId: string
    channelId: string
  } | null = null

  if (selectedId) {
    outer: for (const sub of sif.subsystems) {
      for (const ch of sub.channels) {
        const comp = ch.components.find(c => c.id === selectedId)
        if (comp) {
          found = { comp, subsystemType: sub.type, subsystemId: sub.id, channelId: ch.id }
          break outer
        }
      }
    }
  }

  return (
    <RightPanelShell
      items={MODES.map(item => ({
        id: item.id,
        label: item.label,
        Icon: item.Icon,
        badge: item.id === 'component' ? Boolean(selectedId) : undefined,
      }))}
      active={mode}
      onSelect={setMode}
      contentBg={PANEL}
    >
      {/* ── Content ── */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {mode === 'architecture' && (
          <ArchitectureConfigPanel sif={sif} projectId={projectId} />
        )}
        {mode === 'component' && (
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
                setMode('architecture')
              }}
            />
          ) : (
            <EmptyComponentState onGoToLibrary={() => setMode('library')} />
          )
        )}
        {mode === 'library' && <LibraryContent projectId={projectId} />}
      </div>
    </RightPanelShell>
  )
}
