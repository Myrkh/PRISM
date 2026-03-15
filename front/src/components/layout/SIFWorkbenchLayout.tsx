/**
 * SIFWorkbenchLayout — PRISM v3 (refactored)
 *
 * Shell universel. Architecture VS Code :
 *   ActivityBar (IconRail) | Sidebar (ProjectTree) | Editor (tabs + content) | Panel (RightPanel)
 *
 * Simplifications vs v2 :
 *   – IntercalaireTabBar + IntercalaireCard remplacés par EditorTabBar + EditorContent (flat)
 *   – RightPanel sans nested tab bar — Properties + Matrix en sections accordéon
 *   – Resize handle épuré
 *   – Moins de props drilling sur IconRail
 */
import {
  useState, useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  createContext, useContext, useEffect,
} from 'react'
import { GripVertical, SlidersHorizontal } from 'lucide-react'
import { useAppStore, selectSIFCalc } from '@/store/appStore'
import { normalizeSIFTab, type CanonicalSIFTab } from '@/store/types'
import { calcSIF, formatPFD, formatPct } from '@/core/math/pfdCalc'
import { semantic } from '@/styles/tokens'
import { usePrismTheme } from '@/styles/usePrismTheme'

import { IconRail } from '@/components/layout/IconRail'
import { ProjectTree } from '@/components/layout/ProjectTree'
import { HomeScreen } from '@/components/layout/HomeScreen'
import { SIFWorkbenchBar, EditorContent } from '@/components/layout/EditorTabBar'
import { RightPanelShell } from '@/components/layout/RightPanelShell'

// Re-export IntercalaireTabBar for backward compat (right panel, other consumers)
export { IntercalaireTabBar, IntercalaireCard } from '@/components/layout/IntercalaireTabBar'

// ─── Layout context (right panel override) ───────────────────────────────
const LayoutContext = createContext<{
  setRightPanelOverride: (panel: ReactNode | null) => void
  isRightPanelOpen: boolean
}>({
  setRightPanelOverride: () => {},
  isRightPanelOpen: true,
})

export const useLayout = () => useContext(LayoutContext)


const DEFAULT_RIGHT_PANEL_WIDTH = 300
const MIN_RIGHT_PANEL_WIDTH     = 220
const MAX_RIGHT_PANEL_WIDTH     = 720

// ─── Right panel — Properties inspector ──────────────────────────────────
function RightPanel({ projectId, sifId }: { projectId: string; sifId: string }) {
  const { BORDER, CARD_BG, PAGE_BG, PANEL_BG, TEXT, TEXT_DIM, TEAL_DIM } = usePrismTheme()
  const projects = useAppStore(s => s.projects)
  const project  = projects.find(p => p.id === projectId)
  const sif      = project?.sifs.find(s => s.id === sifId)
  const calc = useAppStore(s => selectSIFCalc(s, projectId, sifId)) ?? (sif ? calcSIF(sif) : null)

  if (!sif || !calc) return null

  const sub0  = calc.subsystems[0]
  const sffOk = sub0 ? sub0.SFF >= 0.6 : false

  const kpiRows = [
    { k: 'SIL cible',   v: `SIL ${sif.targetSIL}`,                  color: '#60A5FA'                               },
    { k: 'SIL atteint', v: `SIL ${calc.SIL}`,                        color: calc.meetsTarget ? '#4ADE80' : '#F87171'},
    { k: 'PFDavg',      v: formatPFD(calc.PFD_avg),                   color: TEAL_DIM                               },
    { k: 'RRF',         v: Math.round(calc.RRF).toLocaleString(),     color: TEXT                                   },
    { k: 'SFF',         v: formatPct(sub0?.SFF ?? 0),                 color: sffOk ? '#4ADE80' : '#F87171'          },
    { k: 'DC',          v: formatPct(sub0?.DC ?? 0),                  color: TEXT                                   },
  ]

  return (
    <RightPanelShell
      items={[{ id: 'properties', label: 'Propriétés', Icon: SlidersHorizontal }]}
      active="properties"
      onSelect={() => {}}
      contentBg={PANEL_BG}
    >
      <div className="flex h-full flex-col overflow-y-auto" style={{ background: PANEL_BG, scrollbarGutter: 'stable' }}>

        {/* ── Header SIF ── */}
        <div className="border-b px-4 pb-3 pt-4" style={{ borderColor: BORDER }}>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Propriétés</p>
          <p className="text-xs font-semibold" style={{ color: TEXT }}>{sif.sifNumber}</p>
          {sif.title && <p className="mt-0.5 truncate text-[11px]" style={{ color: TEXT_DIM }}>{sif.title}</p>}
        </div>

        {/* ── Verdict go/no-go ── */}
        <div className="px-3 pt-3">
          <div
            className="mb-3 flex items-center justify-between rounded-xl border px-3 py-3"
            style={{
              background:  calc.meetsTarget ? `${semantic.success}12` : `${semantic.error}12`,
              borderColor: calc.meetsTarget ? `${semantic.success}35` : `${semantic.error}35`,
            }}
          >
            <span className="text-sm font-semibold" style={{ color: TEXT_DIM }}>Vérification SIL</span>
            <span className="text-sm font-bold" style={{ color: calc.meetsTarget ? semantic.success : semantic.error }}>
              {calc.meetsTarget ? '✓ PASS' : '✗ FAIL'}
            </span>
          </div>

          {/* ── KPIs ── */}
          <div className="overflow-hidden rounded-lg border" style={{ borderColor: BORDER }}>
            {kpiRows.map(({ k, v, color }, i) => (
              <div
                key={k}
                className="flex items-center justify-between px-3 py-2 text-xs"
                style={{
                  background:   i % 2 === 0 ? PAGE_BG : CARD_BG,
                  borderBottom: i < kpiRows.length - 1 ? `1px solid ${BORDER}` : 'none',
                }}
              >
                <span style={{ color: TEXT_DIM }}>{k}</span>
                <span className="font-mono font-semibold" style={{ color }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </RightPanelShell>
  )
}

function GlobalRightPanelPlaceholder({ mode }: { mode: 'review' | 'audit' | 'history' | 'engine' | 'hazop' }) {
  const { BORDER, PAGE_BG, PANEL_BG, TEXT_DIM } = usePrismTheme()
  const labels: Record<typeof mode, string> = {
    review:  'Review Queue',
    audit:   'Audit Log',
    history: 'SIF History',
    engine:  'Engine',
    hazop:   'HAZOP / LOPA',
  }
  return (
    <div className="flex h-full flex-col px-4 py-4" style={{ background: PANEL_BG }}>
      <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: TEXT_DIM }}>
        {labels[mode]}
      </p>
      <div
        className="rounded-xl border px-3 py-4 text-xs leading-relaxed"
        style={{ borderColor: BORDER, color: TEXT_DIM, background: PAGE_BG }}
      >
        {mode === 'engine'
          ? 'Engine overview, integration status, and backend contract details.'
          : 'Select a row to inspect details and actions.'}
      </div>
    </div>
  )
}

// ─── Resize divider — drag target + visual, no separate grid column ──────
function ResizeDivider({
  isResizing,
  onPointerDown,
}: {
  isResizing: boolean
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void
}) {
  const { BORDER, PANEL_BG, TEAL, TEXT_DIM } = usePrismTheme()
  const [hovered, setHovered] = useState(false)
  const active = isResizing || hovered

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panel"
      className="absolute inset-y-0 left-0 z-20 flex -translate-x-1/2 cursor-col-resize items-center justify-center"
      style={{ width: 18, touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <div
        className="pointer-events-none absolute inset-y-0 w-[2px] transition-colors"
        style={{ background: active ? TEAL : BORDER }}
      />
      <div
        className="pointer-events-none relative z-10 flex h-10 w-5 items-center justify-center rounded-full border transition-all"
        style={{
          background:   active ? `${TEAL}10` : PANEL_BG,
          borderColor:  active ? TEAL : BORDER,
          color:        active ? TEAL : TEXT_DIM,
          boxShadow:    active ? '0 0 0 1px rgba(0,155,164,0.18), 0 8px 18px rgba(0,0,0,0.28)' : '0 4px 12px rgba(0,0,0,0.2)',
          transition:   'border-color 0.15s, color 0.15s, background 0.15s, box-shadow 0.15s',
        }}
      >
        <GripVertical size={12} />
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
  const { BORDER, PAGE_BG, PANEL_BG, TEAL, TEAL_DIM, TEXT, TEXT_DIM } = usePrismTheme()
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
  const rightPanelResizeStartX     = useRef<number | null>(null)
  const rightPanelResizeStartWidth = useRef(DEFAULT_RIGHT_PANEL_WIDTH)

  const activeTab: CanonicalSIFTab = view.type === 'sif-dashboard' ? normalizeSIFTab(view.tab) : 'cockpit'

  const showSettings  = view.type === 'settings'
  const showReview    = view.type === 'review-queue'
  const showAudit     = view.type === 'audit-log'
  const showHistory   = view.type === 'sif-history'
  const showEngine    = view.type === 'engine'
  const showHazop     = view.type === 'hazop'
  const showGlobal    = showReview || showAudit || showHistory || showEngine || showHazop
  const showDashboard = view.type === 'sif-dashboard' && !!project && !!sif
  const showHome      = !showSettings && !showDashboard && !showGlobal

  // Auto-open right panel for global views
  useEffect(() => {
    if (showGlobal) setRightOpen(true)
  }, [showGlobal])

  // Reset right panel size on view change
  useEffect(() => {
    setRightPanelWidth(DEFAULT_RIGHT_PANEL_WIDTH)
    setIsResizingRightPanel(false)
    rightPanelResizeStartX.current = null
  }, [activeTab, view.type, projectId, sifId])

  useEffect(() => {
    if (!rightOpen) {
      setIsResizingRightPanel(false)
      rightPanelResizeStartX.current = null
    }
  }, [rightOpen])

  // Pointer drag for resize
  useEffect(() => {
    if (!isResizingRightPanel) return
    const onMove = (e: PointerEvent) => {
      if (rightPanelResizeStartX.current === null) return
      const delta = rightPanelResizeStartX.current - e.clientX
      setRightPanelWidth(
        Math.max(MIN_RIGHT_PANEL_WIDTH, Math.min(MAX_RIGHT_PANEL_WIDTH, rightPanelResizeStartWidth.current + delta))
      )
    }
    const onStop = () => {
      setIsResizingRightPanel(false)
      rightPanelResizeStartX.current = null
    }
    document.body.style.cursor     = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup',   onStop)
    window.addEventListener('pointercancel', onStop)
    return () => {
      document.body.style.cursor     = ''
      document.body.style.userSelect = ''
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup',   onStop)
      window.removeEventListener('pointercancel', onStop)
    }
  }, [isResizingRightPanel])

  const startResize = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!rightOpen) return
    rightPanelResizeStartX.current     = e.clientX
    rightPanelResizeStartWidth.current = rightPanelWidth
    setIsResizingRightPanel(true)
    e.preventDefault()
  }


  return (
    <LayoutContext.Provider value={{ setRightPanelOverride, isRightPanelOpen: rightOpen }}>
      <div className="flex h-[calc(100vh-48px)] min-h-0 overflow-hidden" style={{ background: PAGE_BG }}>
        {/* ── Activity Bar ── */}
        <IconRail
          leftOpen={leftOpen}
          rightOpen={rightOpen}
          onToggleLeft={() => setLeftOpen(v => !v)}
          onToggleRight={() => setRightOpen(v => !v)}
          showRightToggle={showDashboard || showGlobal}
        />

        {/* ── Main area ── */}
        <div className="flex flex-1 min-w-0 min-h-0 overflow-hidden">
          {!showDashboard && (
            <>
              {/* ── Sidebar ── */}
              <div
                className="flex shrink-0 flex-col border-r overflow-hidden"
                style={{
                  width:       leftOpen && !showSettings ? 240 : 0,
                  opacity:     leftOpen && !showSettings ? 1 : 0,
                  borderColor: showSettings ? 'transparent' : BORDER,
                  background:  PANEL_BG,
                  transition:  'width 0.2s ease, opacity 0.15s ease',
                }}
              >
                {leftOpen && !showSettings && (
                  <ProjectTree projectId={projectId ?? ''} sifId={sifId ?? ''} />
                )}
              </div>

              {/* Home */}
              {showHome && <HomeScreen />}

              {/* Settings — full width, no panels */}
              {showSettings && (
                <div className="flex flex-1 min-w-0 min-h-0 overflow-hidden">{children}</div>
              )}

              {/* Global tools — editor + right panel */}
              {showGlobal && (
                <div className="flex flex-1 min-h-0 overflow-hidden">
                  <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden">{children}</div>
                  {rightOpen && (
                    <div className="relative min-h-0 shrink-0 overflow-hidden" style={{ width: rightPanelWidth }}>
                      <ResizeDivider isResizing={isResizingRightPanel} onPointerDown={startResize} />
                      {rightPanelOverride || (
                        <GlobalRightPanelPlaceholder
                          mode={showReview ? 'review' : showAudit ? 'audit' : showHistory ? 'history' : showEngine ? 'engine' : 'hazop'}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* SIF Dashboard — center stack + right dock */}
          {showDashboard && (
            <>
              <div className="flex flex-1 min-w-0 min-h-0 overflow-hidden">
                {/* ── Sidebar ── */}
                <div
                  className="flex shrink-0 flex-col border-r overflow-hidden"
                  style={{
                    width:       leftOpen ? 240 : 0,
                    opacity:     leftOpen ? 1 : 0,
                    borderColor: BORDER,
                    background:  PANEL_BG,
                    transition:  'width 0.2s ease, opacity 0.15s ease',
                  }}
                >
                  {leftOpen && (
                    <ProjectTree projectId={projectId ?? ''} sifId={sifId ?? ''} />
                  )}
                </div>

                {/* Editor column */}
                <div className="flex flex-1 min-w-0 min-h-0 flex-col overflow-hidden">
                  <SIFWorkbenchBar
                    active={activeTab}
                    onSelect={(id) => setTab(id)}
                  />

                  <EditorContent className="flex flex-col">
                    {children}
                  </EditorContent>
                </div>
              </div>

              {/* Right dock */}
              <div
                className="relative min-h-0 shrink-0 overflow-hidden border-l"
                style={{
                  width: rightOpen ? rightPanelWidth : 48,
                  borderColor: BORDER,
                  transition: 'width 0.2s ease',
                }}
              >
                {rightOpen && (
                  <ResizeDivider isResizing={isResizingRightPanel} onPointerDown={startResize} />
                )}
                {rightPanelOverride || rightPanelContent || (
                  <RightPanel projectId={projectId ?? ''} sifId={sifId ?? ''} />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </LayoutContext.Provider>
  )
}
