/**
 * SIFWorkbenchLayout — PRISM v3
 *
 * Shell universel :
 *  – Toujours monté (pas de conditional rendering dans App.tsx)
 *  – Si projectId/sifId vides ou invalides → HomeScreen
 *  – Si valides → Tab bar + contenu SIF
 *
 * HomeScreen :
 *  – Liste tous les projets + leurs SIFs avec métriques PFD/SIL
 *  – Actions par projet : Modifier | Clôturer | Archiver | Supprimer
 *  – Actions par SIF    : Modifier | Archiver | Supprimer
 *  – Dialog de confirmation avant toute suppression
 */
import { useMemo, useState, useRef, type ReactNode, createContext, useContext, useEffect } from 'react'
import {
  Home, FolderPlus, FilePlus, FileText, ListChecks, History,
  Settings, LogOut,
  ChevronDown, ChevronRight, Folder, Building2, Pin,
  CheckCircle2, AlertTriangle,
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen,
  Pencil, Trash2, Archive, CheckCheck, MoreHorizontal, Plus, X,
  Loader2,
} from 'lucide-react'
import { useAppStore, type SIFTab } from '@/store/appStore'
import { calcSIF, formatPFD, formatPct } from '@/core/math/pfdCalc'
import { SILBadge } from '@/components/shared/SILBadge'
import { cn } from '@/lib/utils'

// ── Design tokens ─────────────────────────────────────────────────────────
const RAIL_BG  = '#0F1318'
const PANEL_BG = '#14181C'
const CARD_BG  = '#23292F'
const PAGE_BG  = '#1A1F24'
const BORDER   = '#2A3138'
const TEAL     = '#009BA4'
const TEAL_DIM = '#5FD8D2'
const TEXT     = '#DFE8F1'
const TEXT_DIM = '#8FA0B1'
const R        = 8

// ─── Layout context (right panel override) ───────────────────────────────
const LayoutContext = createContext<{
  setRightPanelOverride: (panel: ReactNode | null) => void
}>({ setRightPanelOverride: () => {} })

export const useLayout = () => useContext(LayoutContext)

// ─── Tabs ─────────────────────────────────────────────────────────────────
const TABS: { id: SIFTab; label: string; hint: string }[] = [
  { id: 'overview',     label: 'Dashboard',    hint: 'KPIs & context'        },
  { id: 'architecture', label: 'Loop Editor',  hint: 'Chain & components'    },
  { id: 'analysis',     label: 'Calculations', hint: 'PFD trends'            },
  { id: 'compliance',   label: 'Compliance',   hint: 'Proof & governance'    },
  { id: 'prooftest',    label: 'Proof Test',   hint: 'Procédure & campagnes' },
  { id: 'report',       label: 'Reports',      hint: 'PDF builder'           },
]

const RIGHT_TABS = [
  { id: 'properties' as const, label: 'Properties'    },
  { id: 'matrix'     as const, label: 'Safety Matrix' },
]

// ─── Rail button ──────────────────────────────────────────────────────────
function RailBtn({
  Icon, label, onClick, active = false, danger = false,
}: {
  Icon: React.ElementType; label: string; onClick: () => void
  active?: boolean; danger?: boolean
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button type="button" title={label} onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
      style={{
        background: active ? '#1A2A35' : 'transparent',
        color: danger && hovered ? '#EF4444'
             : active ? TEAL
             : hovered ? TEXT
             : TEXT_DIM,
      }}>
      <Icon size={16} />
    </button>
  )
}
function RailDivider() {
  return <div className="w-6 border-t my-0.5" style={{ borderColor: BORDER }} />
}

// ─── Confirm dialog ───────────────────────────────────────────────────────
function ConfirmDialog({
  open, title, message, confirmLabel, danger,
  onConfirm, onCancel, loading,
}: {
  open: boolean; title: string; message: string; confirmLabel: string
  danger?: boolean; onConfirm: () => void; onCancel: () => void; loading?: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="rounded-2xl border p-6 shadow-2xl w-full max-w-sm"
        style={{ background: '#14181C', borderColor: BORDER }}>
        <h3 className="text-sm font-bold mb-2" style={{ color: TEXT }}>{title}</h3>
        <p className="text-xs leading-relaxed mb-5" style={{ color: TEXT_DIM }}>{message}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} disabled={loading}
            className="rounded-lg border px-4 py-2 text-sm"
            style={{ borderColor: BORDER, color: TEXT_DIM, background: 'transparent' }}>
            Annuler
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold"
            style={{
              background: danger ? '#EF4444' : `linear-gradient(135deg, ${TEAL}, #007A82)`,
              color: '#fff',
            }}>
            {loading ? <Loader2 size={13} className="animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Status icon ──────────────────────────────────────────────────────────
function StatusIcon({ ok }: { ok: boolean }) {
  return ok
    ? <CheckCircle2 size={13} className="ml-auto shrink-0 text-emerald-400" />
    : <AlertTriangle size={13} className="ml-auto shrink-0 text-amber-400" />
}

// ─── Intercalaire tab bar (exported for reuse) ────────────────────────────
export function IntercalaireTabBar<T extends string>({
  tabs, active, onSelect, cardBg, stretch = true, align = 'center',
}: {
  tabs: readonly { id: T; label: string; hint?: string; Icon?: React.ElementType }[]
  active: T
  onSelect: (id: T) => void
  cardBg: string
  stretch?: boolean
  align?: 'center' | 'start'
}) {
  return (
    <div className="flex items-end border-b" style={{ borderColor: BORDER }}>
      {tabs.map(tab => {
        const isActive = tab.id === active
        const Icon = tab.Icon
        return (
          <button key={tab.id} type="button" onClick={() => onSelect(tab.id)}
            className={cn(
              'relative flex flex-col justify-end gap-1 px-3 py-2 transition-colors',
              stretch ? 'flex-1' : 'shrink-0',
              align === 'start' ? 'items-start text-left' : 'items-center text-center',
            )}
            style={isActive ? {
              background: cardBg,
              borderTop: `1px solid ${BORDER}`, borderLeft: `1px solid ${BORDER}`,
              borderRight: `1px solid ${BORDER}`, borderBottom: `1px solid ${cardBg}`,
              borderRadius: `${R}px ${R}px 0 0`,
              color: TEAL_DIM, marginBottom: '-1px', zIndex: 10,
            } : {
              color: TEXT_DIM,
              borderTop: '1px solid transparent', borderLeft: '1px solid transparent',
              borderRight: '1px solid transparent',
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = TEXT }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = TEXT_DIM }}>
            <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold leading-tight whitespace-nowrap">
              {Icon && <Icon size={12} />}
              {tab.label}
            </span>
            {tab.hint && (
              <span className="text-[10px] leading-tight whitespace-nowrap"
                style={{ color: isActive ? `${TEAL_DIM}80` : TEXT_DIM }}>
                {tab.hint}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── Intercalaire card (exported for reuse) ───────────────────────────────
export function IntercalaireCard({
  tabCount, activeIdx, children, cardBg = CARD_BG, className, style,
}: {
  tabCount: number; activeIdx: number; children: ReactNode
  cardBg?: string; className?: string; style?: React.CSSProperties
}) {
  const tlr = activeIdx === 0           ? 0 : R
  const trr = tabCount === 1 ? R : (activeIdx === tabCount - 1 ? 0 : R)
  return (
    <div className={className}
      style={{
        background: cardBg, border: `1px solid ${BORDER}`, borderTopWidth: 0,
        borderRadius: `${tlr}px ${trr}px ${R}px ${R}px`, ...style,
      }}>
      {children}
    </div>
  )
}

// ─── Right panel ──────────────────────────────────────────────────────────
function RightPanel({ projectId, sifId }: { projectId: string; sifId: string }) {
  const projects = useAppStore(s => s.projects)
  const project  = projects.find(p => p.id === projectId)
  const sif      = project?.sifs.find(s => s.id === sifId)
  const [activeTab, setActiveTab] = useState<'properties' | 'matrix'>('properties')
  const calc = useMemo(() => sif ? calcSIF(sif) : null, [sif])

  if (!sif || !calc) return null
  const sub0  = calc.subsystems[0]
  const sffOk = sub0 ? sub0.SFF >= 0.6 : false
  const ai    = RIGHT_TABS.findIndex(t => t.id === activeTab)

  const matrix    = [[3, 2, 1], [4, 5, 6], [1, 2, 3]]
  const cellColor = (v: number) =>
    v <= 2 ? { bg: '#C62828', fg: '#FFF' } :
    v <= 3 ? { bg: '#C77800', fg: '#FFF' } :
             { bg: '#2E7D32', fg: '#FFF' }

  return (
    <div className="flex flex-col overflow-hidden h-full"
      style={{ borderLeft: `1px solid ${BORDER}`, background: PANEL_BG }}>
      <div className="px-3 pt-3 shrink-0">
        <IntercalaireTabBar tabs={RIGHT_TABS} active={activeTab} onSelect={setActiveTab} cardBg={CARD_BG} />
      </div>
      <div className="px-3 pb-3 flex-1 overflow-y-auto">
        <IntercalaireCard tabCount={RIGHT_TABS.length} activeIdx={ai} className="p-3 space-y-3">
          {activeTab === 'properties' && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Equipment Details</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: TEXT_DIM }}>Overall SFF</span>
                  <span className="text-sm font-bold font-mono" style={{ color: sffOk ? '#4ADE80' : '#F87171' }}>
                    {formatPct(sub0?.SFF ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: TEXT_DIM }}>PFD<sub>avg</sub></span>
                  <span className="text-sm font-bold font-mono" style={{ color: TEAL_DIM }}>{formatPFD(calc.PFD_avg)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: TEXT_DIM }}>SIL Capability</span>
                  <span className={cn('text-sm font-bold', calc.meetsTarget ? 'text-emerald-400' : 'text-red-400')}>
                    {calc.meetsTarget ? 'Pass' : 'Fail'}
                  </span>
                </div>
              </div>
              <div className="overflow-hidden rounded-lg border" style={{ borderColor: '#2F3740' }}>
                {[
                  ['λD', `${(calc.PFD_avg * 1e7).toFixed(3)}e-7`], ['SFF', formatPct(sub0?.SFF ?? 0)],
                  ['DC', formatPct(sub0?.DC ?? 0)], ['RRF', Math.round(calc.RRF).toLocaleString()]
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b px-2.5 py-1.5 text-xs last:border-b-0"
                    style={{ borderColor: '#2F3740' }}>
                    <span style={{ color: TEXT_DIM }}>{k}</span>
                    <span className="font-mono font-semibold" style={{ color: TEXT }}>{v}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          {activeTab === 'matrix' && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Safety Matrix</p>
              <div className="grid grid-cols-3 gap-1.5">
                {matrix.flat().map((cell, i) => {
                  const { bg, fg } = cellColor(cell)
                  return <div key={i} className="rounded-md py-2.5 text-center text-sm font-bold"
                    style={{ background: bg, color: fg }}>{cell}</div>
                })}
              </div>
            </>
          )}
        </IntercalaireCard>
        <div className="mt-3 rounded-lg border p-3 space-y-2" style={{ background: '#1D232A', borderColor: BORDER }}>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>SIF Summary</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Target SIL', value: `SIL ${sif.targetSIL}`, color: '#60A5FA' },
              { label: 'Achieved',   value: `SIL ${calc.SIL}`,      color: calc.meetsTarget ? '#4ADE80' : '#F87171' },
              { label: 'RRF',        value: Math.round(calc.RRF).toLocaleString(), color: TEXT },
              { label: 'Subsystems', value: String(sif.subsystems.length), color: TEXT },
            ].map(item => (
              <div key={item.label} className="rounded border px-2 py-1.5" style={{ borderColor: '#2F3740', background: PAGE_BG }}>
                <p className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: TEXT_DIM }}>{item.label}</p>
                <p className="text-sm font-bold font-mono" style={{ color: item.color }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function GlobalRightPanelPlaceholder({ mode }: { mode: 'review' | 'audit' }) {
  return (
    <div className="flex h-full flex-col overflow-hidden border-l px-4 py-4"
      style={{ borderColor: BORDER, background: PANEL_BG }}>
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
        {mode === 'review' ? 'Review Queue' : 'Audit Log'}
      </p>
      <div className="mt-3 rounded-xl border px-3 py-4 text-xs"
        style={{ borderColor: BORDER, color: TEXT_DIM, background: '#1D232A' }}>
        Select a row in the center table to inspect details and actions.
      </div>
    </div>
  )
}

// ─── Project tree (left panel) ────────────────────────────────────────────
function ProjectTree({ projectId, sifId }: { projectId: string; sifId: string }) {
  const navigate = useAppStore(s => s.navigate)
  const projects = useAppStore(s => s.projects)
  const pinnedSIFIds = useAppStore(s => s.pinnedSIFIds)
  const togglePinnedSIF = useAppStore(s => s.togglePinnedSIF)
  const currentProject = projects.find(p => p.id === projectId)

  const normalizeClient = (client: string | undefined) => {
    const v = (client ?? '').trim()
    return v || 'Unassigned client'
  }

  const currentClientKey = currentProject ? normalizeClient(currentProject.client).toLowerCase() : null

  const [openClients, setOpenClients] = useState<Set<string>>(() => {
    const initialOpen = new Set<string>()
    if (currentClientKey) initialOpen.add(`c-${currentClientKey}`)
    return initialOpen
  })

  const [openProjects, setOpenProjects] = useState<Set<string>>(() => {
    const initialOpen = new Set<string>()
    if (projectId) initialOpen.add(`p-${projectId}`)
    return initialOpen
  })

  const toggleClient = (k: string) => setOpenClients(prev => {
    const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n
  })

  const toggleProject = (k: string) => setOpenProjects(prev => {
    const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n
  })

  useEffect(() => {
    if (!projectId) return
    setOpenProjects(prev => {
      const key = `p-${projectId}`
      if (prev.has(key)) return prev
      const n = new Set(prev); n.add(key); return n
    })
  }, [projectId])

  useEffect(() => {
    if (!currentClientKey) return
    setOpenClients(prev => {
      const key = `c-${currentClientKey}`
      if (prev.has(key)) return prev
      const n = new Set(prev); n.add(key); return n
    })
  }, [currentClientKey])

  const clientGroups = useMemo(() => {
    const map = new Map<string, { label: string; projects: typeof projects }>()
    projects.forEach(proj => {
      const label = normalizeClient(proj.client)
      const key = label.toLowerCase()
      const existing = map.get(key)
      if (existing) existing.projects.push(proj)
      else map.set(key, { label, projects: [proj] as typeof projects })
    })

    return Array.from(map.entries())
      .map(([key, group]) => ({
        key,
        label: group.label,
        projects: [...group.projects].sort((a, b) =>
          a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }),
        ),
        sifCount: group.projects.reduce((acc, p) => acc + p.sifs.length, 0),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' }))
  }, [projects])

  const sifLookup = useMemo(() => {
    const map = new Map<string, { project: (typeof projects)[number]; sif: (typeof projects)[number]['sifs'][number]; ok: boolean }>()
    projects.forEach(proj => {
      proj.sifs.forEach(s => {
        map.set(s.id, { project: proj, sif: s, ok: calcSIF(s).meetsTarget })
      })
    })
    return map
  }, [projects])

  const pinnedSet = useMemo(() => new Set(pinnedSIFIds), [pinnedSIFIds])
  const pinnedItems = useMemo(
    () => pinnedSIFIds.map(id => sifLookup.get(id)).filter((x): x is NonNullable<typeof x> => !!x),
    [pinnedSIFIds, sifLookup],
  )

  const SIFRow = ({
    proj,
    s,
    showProject = false,
    inTree = false,
  }: {
    proj: (typeof projects)[number]
    s: (typeof projects)[number]['sifs'][number]
    showProject?: boolean
    inTree?: boolean
  }) => {
    const ok = sifLookup.get(s.id)?.ok ?? calcSIF(s).meetsTarget
    const cur = s.id === sifId && proj.id === projectId
    const isPinned = pinnedSet.has(s.id)

    return (
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => navigate({ type: 'sif-dashboard', projectId: proj.id, sifId: s.id, tab: 'overview' })}
          className="w-full items-center gap-2 rounded-md px-2 py-1 text-left transition-colors flex relative"
          style={{
            backgroundColor: cur ? 'rgba(0, 155, 164, 0.15)' : 'transparent',
            color: cur ? TEXT : '#C1CDD8',
          }}
          onMouseEnter={e => { if (!cur) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)' }}
          onMouseLeave={e => { if (!cur) e.currentTarget.style.backgroundColor = 'transparent' }}
        >
          {inTree && <div className="absolute left-[-5px] top-1/2 -translate-y-1/2 h-px w-2 bg-white/10" />}
          {inTree && cur && <div className="absolute left-[-11px] top-1 bottom-1 w-0.5 bg-teal-400 rounded-full" />}

          <FileText size={13} className="shrink-0" style={{ color: cur ? TEAL : TEXT_DIM }} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{s.sifNumber}</p>
            {showProject && (
              <p className="truncate text-[10px]" style={{ color: TEXT_DIM }}>{proj.name}</p>
            )}
          </div>
          <StatusIcon ok={ok} />
        </button>
        <button
          type="button"
          title={isPinned ? 'Unpin SIF' : 'Pin SIF'}
          onClick={() => togglePinnedSIF(s.id)}
          className="rounded p-1 transition-colors hover:bg-white/10"
          style={{ color: isPinned ? TEAL : TEXT_DIM }}
        >
          <Pin size={12} />
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-2 py-3 text-[13px]" style={{ color: TEXT }}>
      <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Pinned SIFs</p>
      <div className="mb-3 space-y-0.5">
        {pinnedItems.length === 0 ? (
          <div className="px-2 py-1 text-xs italic text-white/35">Pin frequently used SIFs for quick access.</div>
        ) : (
          pinnedItems.map(({ project, sif }) => (
            <SIFRow key={`pin-${sif.id}`} proj={project} s={sif} showProject />
          ))
        )}
      </div>

      <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Clients</p>
      {clientGroups.map((group, gi) => {
        const clientOpen = openClients.has(`c-${group.key}`)

        return (
          <div key={group.key} className={cn(gi > 0 && 'mt-3 pt-3 border-t border-white/10')}>
            <button
              type="button"
              onClick={() => toggleClient(`c-${group.key}`)}
              className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 font-semibold transition-colors hover:bg-white/5"
              style={{ color: TEXT_DIM }}
            >
              {clientOpen ? <ChevronDown size={14} className="shrink-0" /> : <ChevronRight size={14} className="shrink-0" />}
              <Building2 size={14} className="shrink-0" style={{ color: TEAL }} />
              <span className="flex-1 truncate text-left">{group.label}</span>
              <span className="text-[10px] font-mono" style={{ color: TEXT_DIM }}>
                {group.projects.length}P · {group.sifCount}S
              </span>
            </button>

            {clientOpen && (
              <div className="mt-0.5 pl-2 space-y-1">
                {group.projects.map(proj => {
                  const projOpen = openProjects.has(`p-${proj.id}`)
                  const projOk = proj.sifs.length === 0 || proj.sifs.map(calcSIF).every(r => r.meetsTarget)
                  const isCurProj = proj.id === projectId

                  return (
                    <div key={proj.id}>
                      <button
                        type="button"
                        onClick={() => toggleProject(`p-${proj.id}`)}
                        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 font-semibold transition-colors hover:bg-white/5"
                        style={{ color: isCurProj ? TEXT : TEXT_DIM }}
                      >
                        {projOpen ? <ChevronDown size={14} className="shrink-0" /> : <ChevronRight size={14} className="shrink-0" />}
                        <Folder size={15} className="shrink-0" style={{ color: isCurProj ? TEAL : TEXT_DIM }} />
                        <span className="flex-1 truncate text-left">{proj.name}</span>
                        <StatusIcon ok={projOk} />
                      </button>

                      {projOpen && (
                        <div className="mt-0.5 pl-8 relative">
                          <div className="absolute left-[15px] top-0 bottom-0 w-px bg-white/10" />
                          <div className="space-y-0.5 py-1">
                            {proj.sifs.length === 0 && (
                              <div className="px-2 py-1 text-xs text-white/40 italic">No SIFs in this project.</div>
                            )}
                            {proj.sifs.map(s => (
                              <SIFRow key={s.id} proj={proj} s={s} inTree />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}


// ─── HOME SCREEN ──────────────────────────────────────────────────────────
// Remplace ProjectsPage + SIFListPage
// Actions : créer, modifier, clôturer, archiver, supprimer
// ─────────────────────────────────────────────────────────────────────────
function HomeScreen() {
  const navigate        = useAppStore(s => s.navigate)
  const openNewProject  = useAppStore(s => s.openNewProject)
  const openEditProject = useAppStore(s => s.openEditProject)
  const openNewSIF      = useAppStore(s => s.openNewSIF)
  const openEditSIF     = useAppStore(s => s.openEditSIF)
  const deleteProject   = useAppStore(s => s.deleteProject)
  const deleteSIF       = useAppStore(s => s.deleteSIF)
  const updateProject   = useAppStore(s => s.updateProject)
  const updateSIF       = useAppStore(s => s.updateSIF)
  const projects        = useAppStore(s => s.projects)

  // Menu contextuel
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Confirm dialog state
  const [confirm, setConfirm] = useState<{
    open: boolean; title: string; message: string; confirmLabel: string
    danger?: boolean; onConfirm: () => Promise<void>
  }>({ open: false, title: '', message: '', confirmLabel: '', onConfirm: async () => {} })
  const [confirmLoading, setConfirmLoading] = useState(false)

  const runConfirm = (cfg: Omit<typeof confirm, 'open'>) => {
    setConfirm({ ...cfg, open: true })
  }
  const executeConfirm = async () => {
    setConfirmLoading(true)
    try { await confirm.onConfirm() } finally {
      setConfirmLoading(false)
      setConfirm(c => ({ ...c, open: false }))
    }
  }

  const totalSIFs = projects.reduce((a, p) => a + p.sifs.length, 0)
  const totalOk   = projects.reduce((a, p) => a + p.sifs.filter(s => calcSIF(s).meetsTarget).length, 0)

  // Fermer le menu au clic hors
  const closeMenu = () => setOpenMenu(null)

  const STATUS_COLOR: Record<string, string> = {
    active: '#16A34A', completed: '#2563EB', archived: '#6B7280', draft: '#6B7280',
    in_review: '#F59E0B', verified: '#0284C7', approved: '#16A34A',
  }
  const STATUS_LABEL: Record<string, string> = {
    active: 'Actif', completed: 'Clôturé', archived: 'Archivé',
    draft: 'Draft', in_review: 'In Review', verified: 'Verified', approved: 'Approved',
  }

  return (
    <div className="flex-1 overflow-y-auto p-8" style={{ background: PAGE_BG }}
      onClick={closeMenu}>

      <ConfirmDialog
        open={confirm.open} title={confirm.title} message={confirm.message}
        confirmLabel={confirm.confirmLabel} danger={confirm.danger}
        loading={confirmLoading}
        onConfirm={executeConfirm}
        onCancel={() => setConfirm(c => ({ ...c, open: false }))}
      />

      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight mb-1" style={{ color: TEXT }}>
            Tableau de bord
          </h1>
          <p className="text-sm" style={{ color: TEXT_DIM }}>
            {projects.length} projet{projects.length > 1 ? 's' : ''} · {totalSIFs} SIF · {totalOk}/{totalSIFs} conformes
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={openNewProject}
            className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all"
            style={{ borderColor: BORDER, color: TEXT_DIM, background: PANEL_BG }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = TEAL; e.currentTarget.style.color = TEXT }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT_DIM }}>
            <FolderPlus size={15} /> Nouveau projet
          </button>
          <button onClick={() => openNewSIF()}
            disabled={projects.filter(p => p.status === 'active').length === 0}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all disabled:opacity-40"
            style={{
              background: `linear-gradient(135deg, ${TEAL}, #007A82)`,
              color: '#fff', boxShadow: `0 4px 14px ${TEAL}40`,
            }}>
            <FilePlus size={15} /> Nouvelle SIF
          </button>
        </div>
      </div>

      {/* Empty state */}
      {projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-5">
          <div className="w-20 h-20 rounded-3xl border-2 border-dashed flex items-center justify-center"
            style={{ borderColor: `${TEAL}30` }}>
            <FolderPlus size={32} style={{ color: `${TEAL}50` }} />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold mb-1" style={{ color: TEXT }}>Aucun projet</p>
            <p className="text-sm" style={{ color: TEXT_DIM }}>Créez votre premier projet pour commencer</p>
          </div>
          <button onClick={openNewProject}
            className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold"
            style={{ background: `linear-gradient(135deg, ${TEAL}, #007A82)`, color: '#fff' }}>
            <FolderPlus size={15} /> Créer un projet
          </button>
        </div>
      )}

      {/* Projects */}
      <div className="space-y-6">
        {projects.map(proj => {
          const projCalcs = proj.sifs.map(s => ({ sif: s, calc: calcSIF(s) }))
          const allOk     = projCalcs.length === 0 || projCalcs.every(x => x.calc.meetsTarget)
          const isArchived = proj.status === 'archived'
          const isCompleted = proj.status === 'completed'
          const statusColor = STATUS_COLOR[proj.status] ?? '#6B7280'

          return (
            <div key={proj.id} className="rounded-2xl border overflow-hidden"
              style={{ background: PANEL_BG, borderColor: BORDER, opacity: isArchived ? 0.7 : 1 }}>

              {/* Project header row */}
              <div className="flex items-center justify-between px-5 py-3 border-b"
                style={{ background: CARD_BG, borderColor: BORDER }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: `${TEAL}20`, border: `1px solid ${TEAL}30` }}>
                    <Folder size={14} style={{ color: TEAL }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: TEXT }}>{proj.name}</p>
                    <p className="text-[10px]" style={{ color: TEXT_DIM }}>
                      {[proj.ref, proj.client, proj.standard].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Status badge */}
                  <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold"
                    style={{ background: `${statusColor}18`, border: `1px solid ${statusColor}40`, color: statusColor }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
                    {STATUS_LABEL[proj.status]}
                  </div>
                  {/* Conforme badge */}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${allOk ? 'text-emerald-400' : 'text-amber-400'}`}
                    style={{ background: allOk ? '#052E1620' : '#78350F20', border: `1px solid ${allOk ? '#15803D40' : '#B4530940'}` }}>
                    {allOk ? '✓ OK' : '⚠ À vérifier'}
                  </span>
                  {/* Actions projet */}
                  <div className="relative" onClick={e => e.stopPropagation()} ref={menuRef}>
                    <button
                      className="flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] transition-all"
                      style={{ borderColor: BORDER, color: TEXT_DIM, background: 'transparent' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = TEAL; e.currentTarget.style.color = TEXT }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT_DIM }}
                      onClick={() => setOpenMenu(openMenu === `proj-${proj.id}` ? null : `proj-${proj.id}`)}>
                      <MoreHorizontal size={13} />
                    </button>
                    {openMenu === `proj-${proj.id}` && (
                      <div className="absolute right-0 top-full mt-1 z-40 rounded-xl border shadow-2xl overflow-hidden w-48"
                        style={{ background: '#14181C', borderColor: BORDER }}>
                        {/* Nouvelle SIF */}
                        {!isArchived && !isCompleted && (
                          <button className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs text-left transition-colors"
                            style={{ color: TEXT_DIM }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#1E242B'; e.currentTarget.style.color = TEXT }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = TEXT_DIM }}
                            onClick={() => { openNewSIF(proj.id); closeMenu() }}>
                            <Plus size={13} style={{ color: TEAL }} /> Nouvelle SIF
                          </button>
                        )}
                        {/* Modifier */}
                        <button className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs text-left transition-colors"
                          style={{ color: TEXT_DIM }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#1E242B'; e.currentTarget.style.color = TEXT }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = TEXT_DIM }}
                          onClick={() => { openEditProject(proj.id); closeMenu() }}>
                          <Pencil size={13} /> Modifier
                        </button>
                        {/* Clôturer */}
                        {proj.status === 'active' && (
                          <button className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs text-left transition-colors"
                            style={{ color: TEXT_DIM }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#1E242B'; e.currentTarget.style.color = '#60A5FA' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = TEXT_DIM }}
                            onClick={() => {
                              closeMenu()
                              runConfirm({
                                title: `Clôturer "${proj.name}"`,
                                message: 'L\'étude sera marquée comme terminée. Les données restent accessibles en lecture.',
                                confirmLabel: 'Clôturer',
                                onConfirm: () => updateProject(proj.id, { status: 'completed' }),
                              })
                            }}>
                            <CheckCheck size={13} style={{ color: '#60A5FA' }} /> Clôturer
                          </button>
                        )}
                        {/* Archiver */}
                        {proj.status !== 'archived' && (
                          <button className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs text-left transition-colors"
                            style={{ color: TEXT_DIM }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#1E242B'; e.currentTarget.style.color = '#F59E0B' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = TEXT_DIM }}
                            onClick={() => {
                              closeMenu()
                              runConfirm({
                                title: `Archiver "${proj.name}"`,
                                message: 'Le projet sera archivé. Il peut être réactivé à tout moment.',
                                confirmLabel: 'Archiver',
                                onConfirm: () => updateProject(proj.id, { status: 'archived' }),
                              })
                            }}>
                            <Archive size={13} style={{ color: '#F59E0B' }} /> Archiver
                          </button>
                        )}
                        {/* Réactiver */}
                        {proj.status === 'archived' && (
                          <button className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs text-left transition-colors"
                            style={{ color: TEXT_DIM }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#1E242B'; e.currentTarget.style.color = '#4ADE80' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = TEXT_DIM }}
                            onClick={() => { closeMenu(); updateProject(proj.id, { status: 'active' }) }}>
                            <CheckCircle2 size={13} style={{ color: '#4ADE80' }} /> Réactiver
                          </button>
                        )}
                        <div className="border-t my-0.5" style={{ borderColor: BORDER }} />
                        {/* Supprimer */}
                        <button className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs text-left transition-colors"
                          style={{ color: '#EF4444' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#EF444415' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                          onClick={() => {
                            closeMenu()
                            runConfirm({
                              title: `Supprimer "${proj.name}"`,
                              message: `Cette action supprimera définitivement le projet et ses ${proj.sifs.length} SIF${proj.sifs.length > 1 ? 's' : ''}. Irréversible.`,
                              confirmLabel: 'Supprimer définitivement',
                              danger: true,
                              onConfirm: () => deleteProject(proj.id),
                            })
                          }}>
                          <Trash2 size={13} /> Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SIFs list */}
              {proj.sifs.length === 0 ? (
                <div className="px-5 py-4 flex items-center gap-3">
                  <p className="text-sm" style={{ color: TEXT_DIM }}>Aucune SIF —</p>
                  {!isArchived && !isCompleted && (
                    <button onClick={() => openNewSIF(proj.id)}
                      className="text-sm font-semibold" style={{ color: TEAL }}>
                      + Créer une SIF
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: BORDER }}>
                  {proj.sifs.map(sif => {
                    const r   = calcSIF(sif)
                    const sifStatusColor = STATUS_COLOR[sif.status] ?? '#6B7280'
                    return (
                      <div key={sif.id}
                        className="group flex items-center gap-4 px-5 py-3 transition-colors"
                        onMouseEnter={e => (e.currentTarget.style.background = '#1E242B')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

                        {/* Status dot */}
                        <div className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: r.meetsTarget ? '#4ADE80' : '#F87171' }} />

                        {/* Clickable SIF info */}
                        <button type="button" className="flex-1 min-w-0 text-left"
                          onClick={() => navigate({ type: 'sif-dashboard', projectId: proj.id, sifId: sif.id, tab: 'overview' })}>
                          <p className="text-sm font-semibold truncate" style={{ color: TEXT }}>
                            {sif.sifNumber}
                            {sif.title && <span className="font-normal ml-2" style={{ color: TEXT_DIM }}>— {sif.title}</span>}
                          </p>
                          <p className="text-[10px]" style={{ color: TEXT_DIM }}>
                            {sif.subsystems.map(s => s.architecture).join(' + ') || 'Aucun sous-système'}
                            {sif.processTag && ` · ${sif.processTag}`}
                          </p>
                        </button>

                        {/* Metrics */}
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right">
                            <p className="text-[9px] uppercase tracking-wider" style={{ color: TEXT_DIM }}>PFD</p>
                            <p className="text-xs font-mono font-bold"
                              style={{ color: r.meetsTarget ? '#4ADE80' : '#F87171' }}>
                              {formatPFD(r.PFD_avg)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] uppercase tracking-wider" style={{ color: TEXT_DIM }}>Cible</p>
                            <p className="text-xs font-bold" style={{ color: '#60A5FA' }}>SIL {sif.targetSIL}</p>
                          </div>
                          <SILBadge sil={r.SIL} size="sm" />

                          {/* SIF status badge */}
                          <div className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: `${sifStatusColor}20`, border: `1px solid ${sifStatusColor}40`, color: sifStatusColor }}>
                            {STATUS_LABEL[sif.status]}
                          </div>

                          {/* SIF actions menu */}
                          <div className="relative opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={e => e.stopPropagation()}>
                            <button
                              className="flex items-center justify-center w-7 h-7 rounded-lg border"
                              style={{ borderColor: BORDER, color: TEXT_DIM, background: 'transparent' }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = TEAL; e.currentTarget.style.color = TEXT }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT_DIM }}
                              onClick={() => setOpenMenu(openMenu === `sif-${sif.id}` ? null : `sif-${sif.id}`)}>
                              <MoreHorizontal size={12} />
                            </button>
                            {openMenu === `sif-${sif.id}` && (
                              <div className="absolute right-0 top-full mt-1 z-40 rounded-xl border shadow-2xl overflow-hidden w-44"
                                style={{ background: '#14181C', borderColor: BORDER }}>
                                {/* Ouvrir */}
                                <button className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs text-left"
                                  style={{ color: TEXT_DIM }}
                                  onMouseEnter={e => { e.currentTarget.style.background = '#1E242B'; e.currentTarget.style.color = TEXT }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = TEXT_DIM }}
                                  onClick={() => { closeMenu(); navigate({ type: 'sif-dashboard', projectId: proj.id, sifId: sif.id, tab: 'overview' }) }}>
                                  <ChevronRight size={13} style={{ color: TEAL }} /> Ouvrir
                                </button>
                                {/* Modifier */}
                                <button className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs text-left"
                                  style={{ color: TEXT_DIM }}
                                  onMouseEnter={e => { e.currentTarget.style.background = '#1E242B'; e.currentTarget.style.color = TEXT }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = TEXT_DIM }}
                                  onClick={() => { closeMenu(); openEditSIF(sif.id) }}>
                                  <Pencil size={13} /> Modifier
                                </button>
                                {/* Changer statut SIF */}
                                {sif.status !== 'approved' && (
                                  <button className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs text-left"
                                    style={{ color: TEXT_DIM }}
                                    onMouseEnter={e => { e.currentTarget.style.background = '#1E242B'; e.currentTarget.style.color = '#4ADE80' }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = TEXT_DIM }}
                                    onClick={() => { closeMenu(); updateSIF(proj.id, sif.id, { status: 'approved' }) }}>
                                    <CheckCheck size={13} style={{ color: '#4ADE80' }} /> Approuver
                                  </button>
                                )}
                                {sif.status !== 'archived' && (
                                  <button className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs text-left"
                                    style={{ color: TEXT_DIM }}
                                    onMouseEnter={e => { e.currentTarget.style.background = '#1E242B'; e.currentTarget.style.color = '#F59E0B' }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = TEXT_DIM }}
                                    onClick={() => {
                                      closeMenu()
                                      runConfirm({
                                        title: `Archiver "${sif.sifNumber}"`,
                                        message: 'La SIF sera archivée. Elle restera accessible en lecture.',
                                        confirmLabel: 'Archiver',
                                        onConfirm: () => updateSIF(proj.id, sif.id, { status: 'archived' as SIFStatus }),
                                      })
                                    }}>
                                    <Archive size={13} style={{ color: '#F59E0B' }} /> Archiver
                                  </button>
                                )}
                                <div className="border-t my-0.5" style={{ borderColor: BORDER }} />
                                {/* Supprimer */}
                                <button className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs text-left"
                                  style={{ color: '#EF4444' }}
                                  onMouseEnter={e => { e.currentTarget.style.background = '#EF444415' }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                                  onClick={() => {
                                    closeMenu()
                                    runConfirm({
                                      title: `Supprimer "${sif.sifNumber}"`,
                                      message: 'Suppression définitive de la SIF et de toute son architecture. Irréversible.',
                                      confirmLabel: 'Supprimer définitivement',
                                      danger: true,
                                      onConfirm: () => deleteSIF(proj.id, sif.id),
                                    })
                                  }}>
                                  <Trash2 size={13} /> Supprimer
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── MAIN LAYOUT ──────────────────────────────────────────────────────────
interface Props {
  projectId?: string
  sifId?: string
  children: ReactNode
  rightPanelContent?: ReactNode
}

export function SIFWorkbenchLayout({ projectId, sifId, children, rightPanelContent }: Props) {
  const view        = useAppStore(s => s.view)
  const setTab      = useAppStore(s => s.setTab)
  const navigate    = useAppStore(s => s.navigate)
  const openNewProject = useAppStore(s => s.openNewProject)
  const openNewSIF     = useAppStore(s => s.openNewSIF)
  const projects    = useAppStore(s => s.projects)

  const project = projectId ? projects.find(p => p.id === projectId) : undefined
  const sif     = project && sifId ? project.sifs.find(s => s.id === sifId) : undefined

  const [leftOpen,  setLeftOpen]  = useState(true)
  const [rightOpen, setRightOpen] = useState(true)
  const [rightPanelOverride, setRightPanelOverride] = useState<ReactNode | null>(null)

  const activeTab = view.type === 'sif-dashboard' ? view.tab : 'overview'
  const activeIdx = TABS.findIndex(t => t.id === activeTab)

  const showSettings = view.type === 'settings'
  const showReview = view.type === 'review-queue'
  const showAudit = view.type === 'audit-log'
  const showGlobal = showReview || showAudit
  const showDashboard = view.type === 'sif-dashboard' && !!project && !!sif
  const showHome = !showSettings && !showDashboard && !showGlobal

  useEffect(() => {
    if (view.type === 'review-queue' || view.type === 'audit-log') {
      setRightOpen(true)
    }
  }, [view.type])

  return (
    <LayoutContext.Provider value={{ setRightPanelOverride }}>
      <div className="flex h-[calc(100vh-56px)] min-h-0 overflow-hidden" style={{ background: PAGE_BG }}>

        {/* ── ICON RAIL ── */}
        <div className="flex shrink-0 flex-col items-center gap-1.5 py-3 border-r"
          style={{ width: 48, background: RAIL_BG, borderColor: BORDER }}>
          <RailBtn Icon={leftOpen ? PanelLeftClose : PanelLeftOpen}
            label={leftOpen ? 'Fermer le volet' : 'Ouvrir le volet'}
            onClick={() => setLeftOpen(v => !v)} active={leftOpen} />
          {(showDashboard || showGlobal) && (
            <RailBtn Icon={rightOpen ? PanelRightClose : PanelRightOpen}
              label={rightOpen ? 'Fermer propriétés' : 'Ouvrir propriétés'}
              onClick={() => setRightOpen(v => !v)} active={rightOpen} />
          )}
          <RailDivider />
          <RailBtn Icon={Home} label="Accueil" onClick={() => navigate({ type: 'projects' })} active={showHome} />
          <RailBtn Icon={FolderPlus} label="Nouveau projet" onClick={openNewProject} />
          <RailBtn Icon={FilePlus}   label="Nouvelle SIF"   onClick={() => openNewSIF(projectId || undefined)} />
          <RailDivider />
          <RailBtn Icon={ListChecks} label="Review Queue" onClick={() => navigate({ type: 'review-queue' })} active={showReview} />
          <RailBtn Icon={History}    label="Audit Log"    onClick={() => navigate({ type: 'audit-log' })}   active={showAudit} />
          <div className="flex-1" />
          <RailDivider />
          <RailBtn Icon={Settings} label="Paramètres" onClick={() => navigate({ type: 'settings', section: 'general' })} active={showSettings} />
          <RailBtn Icon={LogOut}   label="Déconnexion" onClick={() => navigate({ type: 'projects' })} danger />
        </div>

        {/* ── LEFT PANEL (project tree) ── */}
        <div className="flex shrink-0 flex-col border-r overflow-hidden transition-all duration-200"
          style={{
            width: leftOpen && !showSettings ? 240 : 0,
            opacity: leftOpen && !showSettings ? 1 : 0,
            borderColor: showSettings ? 'transparent' : BORDER,
            background: PANEL_BG,
          }}>
          {leftOpen && !showSettings && <ProjectTree projectId={projectId ?? ''} sifId={sifId ?? ''} />}
        </div>

        {/* ── MAIN AREA ── */}
        <div className="flex flex-1 min-w-0 min-h-0 overflow-hidden">
          {showHome ? (
            <HomeScreen />
          ) : showSettings ? (
            <div className="flex flex-1 min-w-0 min-h-0 overflow-hidden">{children}</div>
          ) : showGlobal ? (
            <div className="grid flex-1 min-h-0 overflow-hidden" style={{ gridTemplateColumns: rightOpen ? '1fr 320px' : '1fr 0px' }}>
              <div className="flex min-h-0 min-w-0 overflow-hidden">
                {children}
              </div>
              <div className="min-h-0 overflow-hidden transition-all duration-200">
                {rightPanelOverride || <GlobalRightPanelPlaceholder mode={showReview ? 'review' : 'audit'} />}
              </div>
            </div>
          ) : (
            <div className="grid flex-1 min-h-0 overflow-hidden" style={{ gridTemplateColumns: rightOpen ? '1fr 260px' : '1fr 0px' }}>
              {/* Main content column */}
              <div className="flex flex-col min-w-0 min-h-0 overflow-hidden">
                <div className="px-5 pt-2 shrink-0">
                  <IntercalaireTabBar
                    tabs={TABS} active={activeTab}
                    onSelect={(id) => setTab(id as SIFTab)}
                    cardBg={CARD_BG}
                  />
                </div>
                <div className="flex flex-1 min-h-0 px-5 pb-5 pt-0">
                  <IntercalaireCard
                    tabCount={TABS.length} activeIdx={activeIdx}
                    className="flex-1 min-w-0 overflow-hidden flex flex-col"
                    style={{ minHeight: 0 }}>
                    {children}
                  </IntercalaireCard>
                </div>
              </div>

              {/* Right panel column */}
              <div className="min-h-0 overflow-hidden transition-all duration-200">
                {rightPanelOverride || rightPanelContent ||
                  <RightPanel projectId={projectId ?? ''} sifId={sifId ?? ''} />}
              </div>
            </div>
          )}
        </div>
      </div>
    </LayoutContext.Provider>
  )
}

// Type alias for SIFStatus in menus
type SIFStatus = 'draft' | 'in_review' | 'verified' | 'approved' | 'archived'
