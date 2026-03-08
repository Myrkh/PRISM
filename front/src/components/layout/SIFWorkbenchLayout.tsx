/**
 * SIFWorkbenchLayout — PRISM v3 (refactored)
 *
 * Shell universel — orchestrateur pur.
 * Compose IconRail, ProjectTree, HomeScreen, RightPanel, tab bar.
 *
 * Sub-components extracted to:
 *   – layout/IconRail.tsx
 *   – layout/ProjectTree.tsx
 *   – layout/HomeScreen.tsx
 *   – layout/IntercalaireTabBar.tsx
 *   – shared/ConfirmDialog.tsx
 *   – shared/StatusIcon.tsx
 */
import { useMemo, useState, useRef, type PointerEvent as ReactPointerEvent, type ReactNode, createContext, useContext, useEffect } from 'react'
import { GripVertical } from 'lucide-react'
import { useAppStore, selectSIFCalc, type SIFTab } from '@/store/appStore'
import { calcSIF, formatPFD, formatPct } from '@/core/math/pfdCalc'
import { cn } from '@/lib/utils'
import { BORDER, CARD_BG, PAGE_BG, PANEL_BG, TEAL_DIM, TEXT, TEXT_DIM } from '@/styles/tokens'

// ── Extracted modules ────────────────────────────────────────────────────
import { IconRail } from '@/components/layout/IconRail'
import { ProjectTree } from '@/components/layout/ProjectTree'
import { HomeScreen } from '@/components/layout/HomeScreen'
import { IntercalaireTabBar, IntercalaireCard } from '@/components/layout/IntercalaireTabBar'

// Re-export for backward compatibility (other files import from here)
export { IntercalaireTabBar, IntercalaireCard }

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
  { id: 'prooftest',    label: 'Proof Test',   hint: 'Procedure & campaigns'  },
  { id: 'report',       label: 'Reports',      hint: 'PDF builder'           },
]

const RIGHT_TABS = [
  { id: 'properties' as const, label: 'Properties'    },
  { id: 'matrix'     as const, label: 'Safety Matrix' },
]

const DEFAULT_RIGHT_PANEL_WIDTH = 260
const MIN_RIGHT_PANEL_WIDTH = 260
const MAX_RIGHT_PANEL_WIDTH = 720
const RIGHT_PANEL_HANDLE_WIDTH = 10

// ─── Right panel ──────────────────────────────────────────────────────────
function RightPanel({ projectId, sifId }: { projectId: string; sifId: string }) {
  const projects = useAppStore(s => s.projects)
  const project  = projects.find(p => p.id === projectId)
  const sif      = project?.sifs.find(s => s.id === sifId)
  const [activeTab, setActiveTab] = useState<'properties' | 'matrix'>('properties')
  const calc = useAppStore(s => selectSIFCalc(s, projectId, sifId)) ?? (sif ? calcSIF(sif) : null)

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
      style={{ background: PANEL_BG }}>
      <div className="flex-1 overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
        <div className="sticky top-0 z-10 px-3 pt-3" style={{ background: PANEL_BG }}>
          <IntercalaireTabBar tabs={RIGHT_TABS} active={activeTab} onSelect={setActiveTab} cardBg={CARD_BG} />
        </div>
        <div className="px-3 pb-3">
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
    </div>
  )
}

function GlobalRightPanelPlaceholder({ mode }: { mode: 'review' | 'audit' | 'history' | 'hazop' }) {
  return (
    <div className="flex h-full flex-col overflow-hidden px-4 py-4"
      style={{ background: PANEL_BG }}>
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
        {mode === 'review' ? 'Review Queue'
          : mode === 'audit' ? 'Audit Log'
          : mode === 'history' ? 'SIF History'
          : 'HAZOP / LOPA'}
      </p>
      <div className="mt-3 rounded-xl border px-3 py-4 text-xs"
        style={{ borderColor: BORDER, color: TEXT_DIM, background: '#1D232A' }}>
        Select a row in the center table to inspect details and actions.
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
  const view     = useAppStore(s => s.view)
  const setTab   = useAppStore(s => s.setTab)
  const projects = useAppStore(s => s.projects)

  const project = projectId ? projects.find(p => p.id === projectId) : undefined
  const sif     = project && sifId ? project.sifs.find(s => s.id === sifId) : undefined

  const [leftOpen,  setLeftOpen]  = useState(true)
  const [rightOpen, setRightOpen] = useState(true)
  const [rightPanelOverride, setRightPanelOverride] = useState<ReactNode | null>(null)
  const [rightPanelWidth, setRightPanelWidth] = useState(DEFAULT_RIGHT_PANEL_WIDTH)
  const [isResizingRightPanel, setIsResizingRightPanel] = useState(false)
  const rightPanelResizeStartX = useRef<number | null>(null)
  const rightPanelResizeStartWidth = useRef(DEFAULT_RIGHT_PANEL_WIDTH)

  const activeTab = view.type === 'sif-dashboard' ? view.tab : 'overview'
  const activeIdx = TABS.findIndex(t => t.id === activeTab)

  const showSettings  = view.type === 'settings'
  const showReview    = view.type === 'review-queue'
  const showAudit     = view.type === 'audit-log'
  const showHistory   = view.type === 'sif-history'
  const showHazop     = view.type === 'hazop'
  const showGlobal    = showReview || showAudit || showHistory || showHazop
  const showDashboard = view.type === 'sif-dashboard' && !!project && !!sif
  const showHome      = !showSettings && !showDashboard && !showGlobal

  useEffect(() => {
    if (view.type === 'review-queue' || view.type === 'audit-log') {
      setRightOpen(true)
    }
  }, [view.type])

  useEffect(() => {
    setRightPanelWidth(DEFAULT_RIGHT_PANEL_WIDTH)
    setIsResizingRightPanel(false)
    rightPanelResizeStartX.current = null
  }, [activeTab, view.type, projectId, sifId])

  useEffect(() => {
    if (!rightOpen) {
      setRightPanelWidth(DEFAULT_RIGHT_PANEL_WIDTH)
      setIsResizingRightPanel(false)
      rightPanelResizeStartX.current = null
    }
  }, [rightOpen])

  useEffect(() => {
    if (!isResizingRightPanel) return

    const handlePointerMove = (event: PointerEvent) => {
      if (rightPanelResizeStartX.current === null) return
      const delta = rightPanelResizeStartX.current - event.clientX
      const nextWidth = Math.max(
        MIN_RIGHT_PANEL_WIDTH,
        Math.min(MAX_RIGHT_PANEL_WIDTH, rightPanelResizeStartWidth.current + delta),
      )
      setRightPanelWidth(nextWidth)
    }

    const stopResizing = () => {
      setIsResizingRightPanel(false)
      rightPanelResizeStartX.current = null
    }

    const previousCursor = document.body.style.cursor
    const previousUserSelect = document.body.style.userSelect
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopResizing)
    window.addEventListener('pointercancel', stopResizing)

    return () => {
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', stopResizing)
      window.removeEventListener('pointercancel', stopResizing)
    }
  }, [isResizingRightPanel])

  const startRightPanelResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!rightOpen) return
    rightPanelResizeStartX.current = event.clientX
    rightPanelResizeStartWidth.current = rightPanelWidth
    setIsResizingRightPanel(true)
    event.preventDefault()
  }

  const rightPanelGridTemplateColumns = rightOpen
    ? `minmax(0,1fr) ${RIGHT_PANEL_HANDLE_WIDTH}px ${rightPanelWidth}px`
    : 'minmax(0,1fr) 0px 0px'

  return (
    <LayoutContext.Provider value={{ setRightPanelOverride }}>
      <div className="flex h-[calc(100vh-56px)] min-h-0 overflow-hidden" style={{ background: PAGE_BG }}>

        {/* ── ICON RAIL ── */}
        <IconRail
          leftOpen={leftOpen} rightOpen={rightOpen}
          onToggleLeft={() => setLeftOpen(v => !v)}
          onToggleRight={() => setRightOpen(v => !v)}
          showRightToggle={showDashboard || showGlobal}
          showHome={showHome} showSettings={showSettings}
          showReview={showReview} showAudit={showAudit}
          showHistory={showHistory} showHazop={showHazop}
          projectId={projectId}
        />

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
            <div className="grid flex-1 min-h-0 overflow-hidden" style={{ gridTemplateColumns: rightPanelGridTemplateColumns }}>
              <div className="flex min-h-0 min-w-0 overflow-hidden">
                {children}
              </div>
              {rightOpen && (
                <div
                  role="separator"
                  aria-label="Resize right panel"
                  aria-orientation="vertical"
                  onPointerDown={startRightPanelResize}
                  className="relative z-10 min-h-0 cursor-col-resize"
                  style={{ touchAction: 'none' }}
                >
                  <div className="pointer-events-none absolute inset-y-0 right-0 w-px" style={{ background: isResizingRightPanel ? TEAL_DIM : BORDER }} />
                  <div
                    className="pointer-events-none absolute right-0 top-1/2 flex h-6 w-6 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border"
                    style={{ borderColor: isResizingRightPanel ? TEAL_DIM : BORDER, background: PANEL_BG, color: isResizingRightPanel ? TEAL_DIM : TEXT_DIM }}
                  >
                    <GripVertical size={12} />
                  </div>
                </div>
              )}
              <div className="min-h-0 overflow-hidden transition-all duration-200">
                {rightPanelOverride || <GlobalRightPanelPlaceholder
                  mode={showReview ? 'review' : showAudit ? 'audit' : showHistory ? 'history' : 'hazop'} />}
              </div>
            </div>
          ) : (
            <div className="grid flex-1 min-h-0 overflow-hidden" style={{ gridTemplateColumns: rightPanelGridTemplateColumns }}>
              {/* Main content column */}
              <div className="flex flex-col min-w-0 min-h-0 overflow-hidden">
                <div className="px-5 pt-2 shrink-0">
                  <IntercalaireTabBar
                    tabs={TABS} active={activeTab}
                    onSelect={(id) => setTab(id as SIFTab)}
                    cardBg={CARD_BG}
                    autoHideHintsOnOverflow
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

              {rightOpen && (
                <div
                  role="separator"
                  aria-label="Resize right panel"
                  aria-orientation="vertical"
                  onPointerDown={startRightPanelResize}
                  className="relative z-10 min-h-0 cursor-col-resize"
                  style={{ touchAction: 'none' }}
                >
                  <div className="pointer-events-none absolute inset-y-0 right-0 w-px" style={{ background: isResizingRightPanel ? TEAL_DIM : BORDER }} />
                  <div
                    className="pointer-events-none absolute right-0 top-1/2 flex h-6 w-6 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border"
                    style={{ borderColor: isResizingRightPanel ? TEAL_DIM : BORDER, background: PANEL_BG, color: isResizingRightPanel ? TEAL_DIM : TEXT_DIM }}
                  >
                    <GripVertical size={12} />
                  </div>
                </div>
              )}

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
