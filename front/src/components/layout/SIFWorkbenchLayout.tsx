/**
 * SIFWorkbenchLayout — PRISM v2 rev-4
 *
 * Architecture :
 *  [Rail 48px fixe]
 *  [Volet Projet 240px — toggle]
 *  [Zone centrale : titre + tab-bar pleine largeur + (content | volet droit)]
 *
 * Intercalaire corners :
 *  - Premier onglet actif  → card top-left flat,  top-right arrondi
 *  - Dernier onglet actif  → card top-left arrondi, top-right flat
 *  - Onglet milieu actif   → card top-left arrondi, top-right arrondi
 *
 * Rail :
 *  PanelLeft toggle | Home | FolderPlus (new proj) | FilePlus (new SIF)
 *  ─────
 *  BarChart3 (analysis) | ShieldCheck (compliance)
 *  ─── [spacer] ───
 *  PanelRight toggle | Settings | LogOut
 */
import { useMemo, useState, type ReactNode, createContext, useContext, useEffect } from 'react'
import {
  Home, FolderPlus, FilePlus, BarChart3, ShieldCheck,
  Settings, LogOut,
  ChevronDown, ChevronRight, Folder,
  LayoutDashboard, Network, LineChart, Shield, FileText, FlaskConical,
  CheckCircle2, AlertTriangle,
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen,
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
const R        = 8    // border-radius used for tabs & cards

// ─── CONTEXT pour le panneau de droite dynamique ───────────────────────────
const LayoutContext = createContext<{ setRightPanelOverride: (panel: ReactNode | null) => void }>({
  setRightPanelOverride: () => {}, // Fonction par défaut qui ne fait rien
});

// Hook custom pour une utilisation facile dans les composants enfants
export const useLayout = () => useContext(LayoutContext);
// ──────────────────────────────────────────────────────────────────────────

// ── Center tab definitions ────────────────────────────────────────────────
const TABS: { id: SIFTab; label: string; hint: string }[] = [
  { id: 'overview',     label: 'Dashboard',    hint: 'KPIs & context'       },
  { id: 'architecture', label: 'Loop Editor',  hint: 'Chain & components'   },
  { id: 'analysis',     label: 'Calculations', hint: 'PFD trends'           },
  { id: 'compliance',   label: 'Compliance',   hint: 'Proof & governance'   },
  { id: 'prooftest',    label: 'Proof Test',   hint: 'Procedure & campaigns'},
  { id: 'report',       label: 'Reports',      hint: 'PDF builder'          },
]

// ── Right panel tab definitions ───────────────────────────────────────────
const RIGHT_TABS = [
  { id: 'properties' as const, label: 'Properties'   },
  { id: 'matrix'     as const, label: 'Safety Matrix'},
]

// ────────────────────────────────────────────────────────────────────────────
// RAIL BUTTON
// ────────────────────────────────────────────────────────────────────────────
function RailBtn({
  Icon, label, onClick, active = false, danger = false,
}: {
  Icon: React.ElementType; label: string; onClick: () => void
  active?: boolean; danger?: boolean
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      type="button" title={label} onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
      style={{
        background: active ? '#1A2A35' : 'transparent',
        color: danger && hovered ? '#EF4444'
             : active ? TEAL
             : hovered ? TEXT
             : TEXT_DIM,
      }}
    >
      <Icon size={16} />
    </button>
  )
}

// Horizontal divider for rail
function RailDivider() {
  return <div className="w-6 border-t my-0.5" style={{ borderColor: BORDER }} />
}

// ────────────────────────────────────────────────────────────────────────────
// STATUS ICON
// ────────────────────────────────────────────────────────────────────────────
function StatusIcon({ ok }: { ok: boolean }) {
  return ok
    ? <CheckCircle2 size={13} className="ml-auto shrink-0 text-emerald-400" />
    : <AlertTriangle size={13} className="ml-auto shrink-0 text-amber-400" />
}

// ────────────────────────────────────────────────────────────────────────────
// PROJECT TREE
// ────────────────────────────────────────────────────────────────────────────
function ProjectTree({ projectId, sifId }: { projectId: string; sifId: string }) {
  const navigate = useAppStore(s => s.navigate)
  const projects = useAppStore(s => s.projects)
  const [open, setOpen] = useState<Set<string>>(() => new Set(['root']))

  const toggle = (k: string) => setOpen(prev => {
    const n = new Set(prev)
    n.has(k) ? n.delete(k) : n.add(k)
    return n
  })

  return (
    <div className="flex-1 overflow-y-auto px-3 py-3 text-[13px]" style={{ color: TEXT }}>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
        Project
      </p>

      {projects.map(proj => {
        const projOpen  = open.has(`p-${proj.id}`)
        const projOk    = proj.sifs.map(calcSIF).every(r => r.meetsTarget)
        const isCurProj = proj.id === projectId

        return (
          <div key={proj.id}>
            {/* Project row */}
            <button
              type="button"
              onClick={() => toggle(`p-${proj.id}`)}
              className="flex w-full items-center gap-1.5 rounded px-1 py-1 font-semibold transition-colors hover:bg-[#1E242B]"
              style={{ color: isCurProj ? '#E8EEF5' : TEXT_DIM }}
            >
              {projOpen
                ? <ChevronDown  size={12} style={{ color: TEXT_DIM }} />
                : <ChevronRight size={12} style={{ color: TEXT_DIM }} />}
              <span className="flex-1 truncate text-left">{proj.name}</span>
              <StatusIcon ok={projOk} />
            </button>

            {projOpen && (
              <div className="ml-3 mt-0.5 space-y-0.5">
                {/* SIF Loops folder */}
                <button
                  type="button"
                  onClick={() => navigate({ type: 'sif-list', projectId: proj.id })}
                  className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 transition-colors"
                  style={{ background: isCurProj ? CARD_BG : 'transparent' }}
                  onMouseEnter={e => { if (!isCurProj) e.currentTarget.style.background = '#1E242B' }}
                  onMouseLeave={e => { if (!isCurProj) e.currentTarget.style.background = 'transparent' }}
                >
                  <Folder size={12} style={{ color: TEAL_DIM }} />
                  <span className="flex-1 text-left" style={{ color: isCurProj ? TEXT : TEXT_DIM }}>
                    SIF Loops
                  </span>
                  <StatusIcon ok={projOk} />
                </button>

                {/* Individual SIFs */}
                <div className="pl-3 space-y-0.5">
                  {proj.sifs.map(s => {
                    const ok  = calcSIF(s).meetsTarget
                    const cur = s.id === sifId && proj.id === projectId
                    return (
                      <button
                        key={s.id} type="button"
                        onClick={() => navigate({ type: 'sif-dashboard', projectId: proj.id, sifId: s.id, tab: 'overview' })}
                        className="flex w-full items-center gap-2 rounded px-2 py-1 text-left transition-colors"
                        style={{ background: cur ? CARD_BG : 'transparent', color: cur ? TEXT : '#C1CDD8' }}
                        onMouseEnter={e => { if (!cur) e.currentTarget.style.background = '#20262D' }}
                        onMouseLeave={e => { if (!cur) e.currentTarget.style.background = 'transparent' }}
                      >
                        <span className="flex-1 truncate">{s.sifNumber}</span>
                        <StatusIcon ok={ok} />
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// GENERIC INTERCALAIRE TAB BAR
// Renders tabs where the active one merges with the card below it.
// cardBg must match the card background for seamless join.
// ────────────────────────────────────────────────────────────────────────────
export function IntercalaireTabBar<T extends string>({
  tabs, active, onSelect, cardBg,
}: {
  tabs: readonly { id: T; label: string; hint?: string }[]
  active: T
  onSelect: (id: T) => void
  cardBg: string
}) {
  return (
    <div
      className="flex items-end border-b"
      style={{ borderColor: BORDER }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active
        return (
          <button
            key={tab.id} type="button"
            onClick={() => onSelect(tab.id)}
            className="relative flex flex-1 flex-col items-center justify-end gap-1 px-3 py-2 text-center transition-colors"
            style={isActive ? {
              background:   cardBg,
              borderTop:    `1px solid ${BORDER}`,
              borderLeft:   `1px solid ${BORDER}`,
              borderRight:  `1px solid ${BORDER}`,
              borderBottom: `1px solid ${cardBg}`,
              borderRadius: `${R}px ${R}px 0 0`,
              color:        TEAL_DIM,
              marginBottom: '-1px',
              zIndex:       10,
            } : {
              color: TEXT_DIM,
              borderTop: '1px solid transparent',
              borderLeft: '1px solid transparent',
              borderRight: '1px solid transparent',
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = TEXT }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = TEXT_DIM }}
          >
            <span className="text-[13px] font-semibold leading-tight whitespace-nowrap">{tab.label}</span>
            {tab.hint && (
              <span className="text-[10px] leading-tight whitespace-nowrap" style={{ color: isActive ? `${TEAL_DIM}80` : TEXT_DIM }}>
                {tab.hint}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// INTERCALAIRE CARD
// Corners adapt so the card visually merges with the active tab above it.
//  activeIdx === 0              → top-left  corner is FLAT  (tab sits flush)
//  activeIdx === tabs.length-1  → top-right corner is FLAT  (tab sits flush)
//  otherwise                   → both top corners are rounded
// ────────────────────────────────────────────────────────────────────────────
export function IntercalaireCard({
  tabCount, activeIdx, children, cardBg = CARD_BG,
  className, style,
}: {
  tabCount: number; activeIdx: number; children: ReactNode
  cardBg?: string; className?: string; style?: React.CSSProperties
}) {
  const tlr = activeIdx === 0              ? 0 : R
  const trr = activeIdx === tabCount - 1   ? 0 : R

  return (
    <div
      className={className}
      style={{
        background: cardBg,
        border: `1px solid ${BORDER}`,
        borderTopWidth: 0,                 // tab bar provides the visual top border
        borderRadius: `${tlr}px ${trr}px ${R}px ${R}px`,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// RIGHT PANEL (Properties / Safety Matrix)
// ────────────────────────────────────────────────────────────────────────────
function RightPanel({ projectId, sifId }: { projectId: string; sifId: string }) {
  const projects = useAppStore(s => s.projects)
  const project  = projects.find(p => p.id === projectId)
  const sif      = project?.sifs.find(s => s.id === sifId)
  const [activeTab, setActiveTab] = useState<'properties' | 'matrix'>('properties')
  const calc = useMemo(() => sif ? calcSIF(sif) : null, [sif])

  if (!sif || !calc) return null

  const sub0      = calc.subsystems[0]
  const sffOk     = sub0 ? sub0.SFF >= 0.6 : false
  const activeIdx = RIGHT_TABS.findIndex(t => t.id === activeTab)

  const matrix    = [[3, 2, 1], [4, 5, 6], [1, 2, 3]]
  const cellColor = (v: number) =>
    v <= 2 ? { bg: '#C62828', fg: '#FFF' } :
    v <= 3 ? { bg: '#C77800', fg: '#FFF' } :
             { bg: '#2E7D32', fg: '#FFF' }

  return (
    <div
      className="flex flex-col overflow-hidden h-full"
      style={{ borderLeft: `1px solid ${BORDER}`, background: PANEL_BG }}
    >
      {/* Tab bar for right panel */}
      <div className="px-3 pt-3 shrink-0">
        <IntercalaireTabBar
          tabs={RIGHT_TABS}
          active={activeTab}
          onSelect={setActiveTab}
          cardBg={CARD_BG}
        />
      </div>

      {/* Card with dynamic corners */}
      <div className="px-3 pb-3 flex-1 overflow-y-auto">
        <IntercalaireCard tabCount={RIGHT_TABS.length} activeIdx={activeIdx} className="p-3 space-y-3">
          {activeTab === 'properties' && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
                Equipment Details
              </p>

              <div className="space-y-2">
                {/* SFF */}
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: TEXT_DIM }}>Overall SFF</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold font-mono"
                      style={{ color: sffOk ? '#4ADE80' : '#F87171' }}>
                      {formatPct(sub0?.SFF ?? 0)}
                    </span>
                    <span className={cn('text-[10px] font-semibold flex items-center gap-0.5',
                      sffOk ? 'text-emerald-400' : 'text-red-400')}>
                      {sffOk ? <CheckCircle2 size={10}/> : <AlertTriangle size={10}/>}
                      {sffOk ? 'Pass' : 'Fail'}
                    </span>
                  </div>
                </div>

                {/* PFD */}
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: TEXT_DIM }}>PFD<sub>avg</sub> Calculated</span>
                  <span className="text-sm font-bold font-mono" style={{ color: TEAL_DIM }}>
                    {formatPFD(calc.PFD_avg)}
                  </span>
                </div>

                {/* SIL Capability */}
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: TEXT_DIM }}>SIL Capability</span>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-sm font-bold', calc.meetsTarget ? 'text-emerald-400' : 'text-red-400')}>
                      {calc.meetsTarget ? 'Pass' : 'Fail'}
                    </span>
                    <SILBadge sil={calc.SIL} size="sm" />
                  </div>
                </div>
              </div>

              {/* Data table */}
              <div className="overflow-hidden rounded-lg border" style={{ borderColor: '#2F3740' }}>
                {[
                  ['λD',  `${(calc.PFD_avg * 1e7).toFixed(3)}e-7`],
                  ['SFF', formatPct(sub0?.SFF ?? 0)],
                  ['DC',  formatPct(sub0?.DC  ?? 0)],
                  ['RRF', Math.round(calc.RRF).toLocaleString()],
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
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
                Safety Matrix
              </p>
              <p className="text-[11px]" style={{ color: '#6B7280' }}>
                Regret risk assessments · gauche = risque élevé
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {matrix.flat().map((cell, i) => {
                  const { bg, fg } = cellColor(cell)
                  return (
                    <div key={i} className="rounded-md py-2.5 text-center text-sm font-bold"
                      style={{ background: bg, color: fg }}>{cell}</div>
                  )
                })}
              </div>
              <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
                <span>← Probabilité</span><span>Sévérité →</span>
              </div>
            </>
          )}
        </IntercalaireCard>

        {/* SIF summary mini-card */}
        <div className="mt-3 rounded-lg border p-3 space-y-2"
          style={{ background: '#1D232A', borderColor: BORDER }}>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
            SIF Summary
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Target SIL', value: `SIL ${sif.targetSIL}`,          color: '#60A5FA' },
              { label: 'Achieved',   value: `SIL ${calc.SIL}`,               color: calc.meetsTarget ? '#4ADE80' : '#F87171' },
              { label: 'RRF',        value: Math.round(calc.RRF).toLocaleString(), color: TEXT },
              { label: 'Subsystems', value: String(sif.subsystems.length),    color: TEXT },
            ].map(item => (
              <div key={item.label} className="rounded border px-2 py-1.5"
                style={{ borderColor: '#2F3740', background: PAGE_BG }}>
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

// ────────────────────────────────────────────────────────────────────────────
// MAIN LAYOUT
// ────────────────────────────────────────────────────────────────────────────
interface Props { projectId: string; sifId: string; children: ReactNode; rightPanelContent?: ReactNode; }

export function SIFWorkbenchLayout({ projectId, sifId, children, rightPanelContent }: Props) {
  const view           = useAppStore(s => s.view)
  const setTab         = useAppStore(s => s.setTab)
  const navigate       = useAppStore(s => s.navigate)
  const openNewProject = useAppStore(s => s.openNewProject)
  const openNewSIF     = useAppStore(s => s.openNewSIF)
  const projects       = useAppStore(s => s.projects)

  const project = projects.find(p => p.id === projectId)
  const sif     = project?.sifs.find(s => s.id === sifId)

  const [leftOpen,  setLeftOpen]  = useState(true)
  const [rightOpen, setRightOpen] = useState(true)

  const activeTab  = view.type === 'sif-dashboard' ? view.tab : 'overview'
  const activeIdx  = TABS.findIndex(t => t.id === activeTab)

  const [rightPanelOverride, setRightPanelOverride] = useState<ReactNode | null>(null);

 

  if (!project || !sif) return <>{children}</>

  return (
    <LayoutContext.Provider value={{ setRightPanelOverride }}>
      <div
        className="flex h-[calc(100vh-56px)]"
        style={{ background: PAGE_BG }}
      >
        {/* ════════ ICON RAIL (always visible, 48px) ════════ */}
        <div
          className="flex shrink-0 flex-col items-center gap-1.5 py-3 border-r"
          style={{ width: 48, background: RAIL_BG, borderColor: BORDER }}
        >
          {/* Toggle left panel */}
          <RailBtn
            Icon={leftOpen ? PanelLeftClose : PanelLeftOpen}
            label={leftOpen ? 'Fermer volet projet' : 'Ouvrir volet projet'}
            onClick={() => setLeftOpen(v => !v)}
            active={leftOpen}
          />
           {/* Toggle right panel */}
           <RailBtn
            Icon={rightOpen ? PanelRightClose : PanelRightOpen}
            label={rightOpen ? 'Fermer volet propriétés' : 'Ouvrir volet propriétés'}
            onClick={() => setRightOpen(v => !v)}
            active={rightOpen}
          />

          <RailDivider />

          {/* Home */}
          <RailBtn Icon={Home}       label="Accueil"         onClick={() => navigate({ type: 'projects' })} />
          {/* New project */}
          <RailBtn Icon={FolderPlus} label="Nouveau projet"  onClick={openNewProject} />
          {/* New SIF */}
          <RailBtn Icon={FilePlus}   label="Nouvelle SIF"    onClick={openNewSIF} />

          <RailDivider />

          {/* Quick-nav to tabs */}
          <RailBtn Icon={BarChart3}   label="Calculations" onClick={() => setTab('analysis')}   active={activeTab === 'analysis'}   />
          <RailBtn Icon={ShieldCheck} label="Compliance"   onClick={() => setTab('compliance')} active={activeTab === 'compliance'} />

          {/* Spacer */}
          <div className="flex-1" />

         

          <RailDivider />

          <RailBtn Icon={Settings} label="Paramètres" onClick={() => navigate({ type: 'projects' })} />
          <RailBtn Icon={LogOut}   label="Projets"    onClick={() => navigate({ type: 'projects' })} danger />
        </div>

        {/* ════════ LEFT PANEL (project tree, collapsible) ════════ */}
        <div
          className="flex shrink-0 flex-col border-r overflow-hidden transition-all duration-200"
          style={{
            width:      leftOpen ? 240 : 0,
            opacity:    leftOpen ? 1 : 0,
            borderColor: BORDER,
            background: PANEL_BG,
          }}
        >
          {leftOpen && (
            <>
              <ProjectTree projectId={projectId} sifId={sifId} />
            </>
          )}
        </div>

        {/* ════════ MAIN AREA (title + tabs + content row) ════════ */}
        <div className="flex flex-1 min-w-0 flex-col">

          {/* ── Full-width tab bar (spans content + right panel) ── */}
          <div className="px-5 pt-2 shrink-0">
            <IntercalaireTabBar
              tabs={TABS}
              active={activeTab}
              onSelect={(id) => setTab(id as SIFTab)}
              cardBg={CARD_BG}
            />
          </div>

          {/* ── Content row: [card] + [right panel] ── */}
          <div className="flex flex-1 min-h-0 px-5 pb-5 pt-0 gap-0">

            {/* Center content card — corners adapt to active tab */}
            <IntercalaireCard
              tabCount={TABS.length}
              activeIdx={activeIdx}
              className="flex-1 min-w-0 overflow-auto"
              style={{ minHeight: 0 }}
            >
              {children}
            </IntercalaireCard>

            {/* Right panel — collapsible, sits below the tab bar */}
            {rightOpen && (
              <div
                className="shrink-0 overflow-hidden transition-all duration-200"
                style={{ width: 260, opacity: 1 }}
              >
                {/* AFFICHE LE PANNEAU PRIORITAIRE (override), SINON CELUI PAR DÉFAUT */}
                {rightPanelOverride || rightPanelContent || <RightPanel projectId={projectId} sifId={sifId} />}
              </div>
            )}
          </div>

        </div>
      </div>
    </LayoutContext.Provider>
  )
}
