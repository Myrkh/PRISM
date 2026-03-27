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
  useState, useRef, useEffect,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  createContext, useContext,
} from 'react'
import { GripVertical, SlidersHorizontal } from 'lucide-react'
import { useAppStore, selectSIFCalc } from '@/store/appStore'
import { normalizeSIFTab, type CanonicalSIFTab } from '@/store/types'
import { calcSIF, formatPct } from '@/core/math/pfdCalc'
import { useFormatValue } from '@/utils/formatValue'
import { semantic } from '@/styles/tokens'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { getShellStrings } from '@/i18n/shell'
import { useLocaleStrings } from '@/i18n/useLocale'
import {
  WORKSPACE_LEFT_PANEL_WIDTH_MAX,
  WORKSPACE_LEFT_PANEL_WIDTH_MIN,
  WORKSPACE_RIGHT_PANEL_WIDTH_MAX,
  WORKSPACE_RIGHT_PANEL_WIDTH_MIN,
} from '@/core/models/appPreferences'

import { IconRail } from '@/components/layout/IconRail'
import { SecondaryEmptyState } from '@/components/layout/split-view/SecondaryEmptyState'
import { PrimaryPickerOverlay } from '@/components/layout/split-view/PrimaryPickerOverlay'
import { ProjectSidebar } from '@/components/layout/ProjectSidebar'
import { DocsSidebar } from '@/components/docs/DocsSidebar'
import { SearchSidebar } from '@/components/search/SearchSidebar'
import { LibrarySidebar } from '@/components/library/LibrarySidebar'
import { AuditSidebar } from '@/components/audit/AuditSidebar'
import { PlanningSidebar } from '@/planning/PlanningSidebar'
import { EngineSidebar } from '@/components/engine/EngineSidebar'
import { LibraryInspector } from '@/components/library/LibraryInspector'
import { HomeScreen } from '@/components/layout/HomeScreen'
import { SIFBrowserWelcome } from '@/components/layout/SIFBrowserWelcome'
import { SIFWorkbenchBar, EditorContent } from '@/components/layout/EditorTabBar'
import { RightPanelShell } from '@/components/layout/RightPanelShell'
import { EditorBreadcrumb } from '@/components/layout/EditorBreadcrumb'

// Re-export IntercalaireTabBar for backward compat (right panel, other consumers)
export { IntercalaireTabBar, IntercalaireCard } from '@/components/layout/IntercalaireTabBar'

// ─── Layout context (right panel override) ───────────────────────────────
const LayoutContext = createContext<{
  setRightPanelOverride: (panel: ReactNode | null) => void
  setRightPanelOpen: (open: boolean) => void
  isRightPanelOpen: boolean
}>({
  setRightPanelOverride: () => {},
  setRightPanelOpen: () => {},
  isRightPanelOpen: true,
})

export const useLayout = () => useContext(LayoutContext)


const MIN_LEFT_PANEL_WIDTH = WORKSPACE_LEFT_PANEL_WIDTH_MIN
const MAX_LEFT_PANEL_WIDTH = WORKSPACE_LEFT_PANEL_WIDTH_MAX
const MIN_RIGHT_PANEL_WIDTH = WORKSPACE_RIGHT_PANEL_WIDTH_MIN
const MAX_RIGHT_PANEL_WIDTH = WORKSPACE_RIGHT_PANEL_WIDTH_MAX

function clampPanelWidth(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

// ─── Right panel — Properties inspector ──────────────────────────────────
function RightPanel({ projectId, sifId }: { projectId: string; sifId: string }) {
  const strings = useLocaleStrings(getShellStrings)
  const { fmt } = useFormatValue()
  const { BORDER, CARD_BG, PAGE_BG, PANEL_BG, SHADOW_SOFT, TEXT, TEXT_DIM, TEAL_DIM } = usePrismTheme()
  const projects = useAppStore(s => s.projects)
  const project  = projects.find(p => p.id === projectId)
  const sif      = project?.sifs.find(s => s.id === sifId)
  const calc = useAppStore(s => selectSIFCalc(s, projectId, sifId)) ?? (sif ? calcSIF(sif) : null)

  if (!sif || !calc) return null

  const sub0  = calc.subsystems[0]
  const sffOk = sub0 ? sub0.SFF >= 0.6 : false

  const kpiRows = [
    { k: strings.workbenchInspector.targetSil,   v: `SIL ${sif.targetSIL}`, color: '#60A5FA' },
    { k: strings.workbenchInspector.achievedSil, v: `SIL ${calc.SIL}`,     color: calc.meetsTarget ? '#4ADE80' : '#F87171' },
    { k: strings.workbenchInspector.pfdavg,      v: fmt(calc.PFD_avg),         color: TEAL_DIM },
    { k: strings.workbenchInspector.rrf,         v: Math.round(calc.RRF).toLocaleString(), color: TEXT },
    { k: strings.workbenchInspector.sff,         v: formatPct(sub0?.SFF ?? 0), color: sffOk ? '#4ADE80' : '#F87171' },
    { k: strings.workbenchInspector.dc,          v: formatPct(sub0?.DC ?? 0),  color: TEXT },
  ]

  return (
    <RightPanelShell
      items={[{ id: 'properties', label: strings.workbenchInspector.properties, Icon: SlidersHorizontal }]}
      active="properties"
      onSelect={() => {}}
      contentBg={PANEL_BG}
    >
      <div className="flex h-full flex-col overflow-y-auto" style={{ background: PANEL_BG, scrollbarGutter: 'stable' }}>

        {/* ── Header SIF ── */}
        <div className="border-b px-4 pb-3 pt-4" style={{ borderColor: BORDER }}>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>{strings.workbenchInspector.properties}</p>
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
              boxShadow: SHADOW_SOFT,
            }}
          >
            <span className="text-sm font-semibold" style={{ color: TEXT_DIM }}>{strings.workbenchInspector.silVerification}</span>
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

function GlobalRightPanelPlaceholder({ mode }: { mode: 'audit' | 'history' | 'planning' | 'engine' | 'hazop' }) {
  const strings = useLocaleStrings(getShellStrings)
  const { BORDER, CARD_BG, PANEL_BG, SHADOW_PANEL, TEXT_DIM } = usePrismTheme()
  const description = mode === 'engine'
    ? strings.rightPanelPlaceholder.descriptions.engine
    : mode === 'planning'
      ? strings.rightPanelPlaceholder.descriptions.planning
      : strings.rightPanelPlaceholder.descriptions.default

  return (
    <div className="flex h-full flex-col px-4 py-4" style={{ background: PANEL_BG }}>
      <p className="mb-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
        {strings.rightPanelPlaceholder.labels[mode]}
      </p>
      <div
        className="rounded-xl border px-3 py-4 text-xs leading-relaxed"
        style={{ borderColor: BORDER, color: TEXT_DIM, background: CARD_BG, boxShadow: SHADOW_PANEL }}
      >
        {description}
      </div>
    </div>
  )
}

// ─── Resize divider — drag target + visual, no separate grid column ──────
function ResizeDivider({
  isResizing,
  onPointerDown,
  side = 'left',
}: {
  isResizing: boolean
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void
  side?: 'left' | 'right'
}) {
  const strings = useLocaleStrings(getShellStrings)
  const { BORDER, PANEL_BG, TEAL, TEXT_DIM } = usePrismTheme()
  const [hovered, setHovered] = useState(false)
  const active = isResizing || hovered

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={strings.workbenchInspector.resizePanel}
      className={`absolute inset-y-0 z-20 flex cursor-col-resize items-center justify-center ${
        side === 'left' ? 'left-0 -translate-x-1/2' : 'right-0 translate-x-1/2'
      }`}
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

// ─── Split divider — center drag handle ──────────────────────────────────
function SplitDivider({
  isResizing,
  onPointerDown,
}: {
  isResizing: boolean
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void
}) {
  const { BORDER, TEAL, TEXT_DIM } = usePrismTheme()
  const [hovered, setHovered] = useState(false)
  const active = isResizing || hovered

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      className="relative flex shrink-0 cursor-col-resize items-center justify-center transition-colors"
      style={{ width: 6, background: active ? `${TEAL}28` : BORDER, touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <div
        className="h-10 w-0.5 rounded-full transition-all"
        style={{ background: active ? TEAL : TEXT_DIM, opacity: active ? 0.9 : 0.25 }}
      />
    </div>
  )
}

// ─── Secondary slot empty bar — shown when no SIF is loaded ─────────────
function SecondaryEmptyBar({ onClose }: { onClose: () => void }) {
  const { BORDER, PANEL_BG, SHADOW_SOFT, TEXT, TEXT_DIM } = usePrismTheme()
  return (
    <div
      className="flex shrink-0 items-center justify-between border-b px-3"
      style={{ borderColor: BORDER, background: PANEL_BG, height: 40, boxShadow: SHADOW_SOFT }}
    >
      <span className="text-[12px]" style={{ color: TEXT_DIM }}>Sélectionner une SIF…</span>
      <button
        type="button"
        onClick={onClose}
        title="Fermer le split"
        className="flex h-5 w-5 items-center justify-center rounded text-[13px] transition-colors"
        style={{ color: TEXT_DIM }}
        onMouseEnter={e => { e.currentTarget.style.color = TEXT }}
        onMouseLeave={e => { e.currentTarget.style.color = TEXT_DIM }}
      >
        ×
      </button>
    </div>
  )
}

// ─── Secondary slot boundary — isolates right-panel context ──────────────
// Prevents the secondary SIFDashboard from overwriting the primary's right panel.
const NOOP_LAYOUT_VALUE = {
  setRightPanelOverride: () => {},
  setRightPanelOpen: () => {},
  isRightPanelOpen: false,
}
function SecondarySlotBoundary({ children }: { children: ReactNode }) {
  return <LayoutContext.Provider value={NOOP_LAYOUT_VALUE}>{children}</LayoutContext.Provider>
}

// ─── MAIN LAYOUT ──────────────────────────────────────────────────────────
interface Props {
  projectId?: string
  sifId?: string
  children: ReactNode
  rightPanelContent?: ReactNode
  /** Content for the secondary split pane — built by App.tsx to avoid circular imports. */
  secondaryContent?: ReactNode
}

export function SIFWorkbenchLayout({ projectId, sifId, children, rightPanelContent, secondaryContent }: Props) {
  const { BORDER, PAGE_BG, PANEL_BG, SHADOW_DOCK, TEAL, TEAL_DIM, TEXT, TEXT_DIM } = usePrismTheme()
  const view = useAppStore(s => s.view)
  const setTab = useAppStore(s => s.setTab)
  const projects = useAppStore(s => s.projects)
  const preferences = useAppStore(s => s.preferences)
  const updateAppPreferences = useAppStore(s => s.updateAppPreferences)
  const aiDraftPreview = useAppStore(s => s.aiDraftPreview)

  const project = projectId ? projects.find(p => p.id === projectId) : undefined
  const sif     = project && sifId ? project.sifs.find(s => s.id === sifId) : undefined

  const leftPanelOpen    = useAppStore(s => s.leftPanelOpen)
  const rightPanelOpen   = useAppStore(s => s.rightPanelOpen)
  const focusMode        = useAppStore(s => s.focusMode)
  const setRightPanelOpen = useAppStore(s => s.setRightPanelOpen)
  const secondSlot        = useAppStore(s => s.secondSlot)
  const closeSecondSlot   = useAppStore(s => s.closeSecondSlot)
  const resetSecondSlot   = useAppStore(s => s.resetSecondSlot)
  const setSecondSlotTab  = useAppStore(s => s.setSecondSlotTab)

  // Split is only active on SIF dashboard views
  const isSplitActive = secondSlot !== null && view.type === 'sif-dashboard'

  // Effective open state — focus mode and split mode both collapse panels
  const leftOpen  = leftPanelOpen  && !focusMode && !isSplitActive
  const rightOpen = rightPanelOpen && !focusMode && !isSplitActive

  // Tooltip labels for split action buttons
  const secondProject = secondSlot?.projectId ? projects.find(p => p.id === secondSlot.projectId) : undefined
  const secondSif     = secondProject?.sifs.find(s => s.id === secondSlot?.sifId)
  const secondSifTooltip = secondSif
    ? `${secondProject?.name ? secondProject.name + ' › ' : ''}${secondSif.sifNumber}${secondSif.title ? ` · ${secondSif.title}` : ''}`
    : undefined

  const primarySifTooltip = project && sif
    ? `${project.name} › ${sif.sifNumber}${sif.title ? ` · ${sif.title}` : ''}`
    : undefined

  // Primary picker overlay — lets user switch primary SIF without exiting split
  const [primaryPickerOpen, setPrimaryPickerOpen] = useState(false)

  // Split pane resize state
  const [splitWidth, setSplitWidth] = useState<number | null>(null)
  const [isResizingSplit, setIsResizingSplit] = useState(false)
  const splitResizeStartX = useRef<number | null>(null)
  const splitResizeStartWidth = useRef<number | null>(null)
  const splitContainerRef = useRef<HTMLDivElement>(null)

  const [rightPanelOverride, setRightPanelOverride] = useState<ReactNode | null>(null)
  const [rightPanelWidth, setRightPanelWidth] = useState(() => clampPanelWidth(preferences.workspaceRightPanelWidth, MIN_RIGHT_PANEL_WIDTH, MAX_RIGHT_PANEL_WIDTH))
  const [isResizingRightPanel, setIsResizingRightPanel] = useState(false)
  const rightPanelResizeStartX = useRef<number | null>(null)
  const rightPanelResizeStartWidth = useRef(clampPanelWidth(preferences.workspaceRightPanelWidth, MIN_RIGHT_PANEL_WIDTH, MAX_RIGHT_PANEL_WIDTH))
  const rightPanelWidthRef = useRef(clampPanelWidth(preferences.workspaceRightPanelWidth, MIN_RIGHT_PANEL_WIDTH, MAX_RIGHT_PANEL_WIDTH))
  const leftPanelWidth = clampPanelWidth(preferences.workspaceLeftPanelWidth, MIN_LEFT_PANEL_WIDTH, MAX_LEFT_PANEL_WIDTH)

  const activeTab: CanonicalSIFTab = view.type === 'sif-dashboard' ? normalizeSIFTab(view.tab) : 'cockpit'
  const visibleTab: CanonicalSIFTab = activeTab === 'history' ? 'cockpit' : activeTab

  const showSettings  = view.type === 'settings'
  const showDocs      = view.type === 'docs'
  const showSearch    = view.type === 'search'
  const showLibrary   = view.type === 'library'
  const showStandalone = showSettings
  const showAudit     = view.type === 'audit-log'
  const showHistory   = view.type === 'sif-history'
  const showPlanning  = view.type === 'planning'
  const showEngine    = view.type === 'engine'
  const showHazop     = view.type === 'hazop'
  const showGlobal    = showAudit || showHistory || showPlanning || showEngine || showHazop
  const showDashboard    = view.type === 'sif-dashboard' && !!project && !!sif
  const showSIFBrowser   = view.type === 'home'
  const showNote         = view.type === 'note'
  const showFile         = view.type === 'workspace-file'
  const showPrismFile    = view.type === 'prism-file'
  const showHome         = !showSettings && !showDocs && !showSearch && !showLibrary && !showDashboard && !showGlobal && !showNote && !showFile && !showPrismFile

  // Auto-open right panel for global views
  useEffect(() => {
    if (showGlobal || showLibrary) setRightPanelOpen(true)
  }, [showGlobal, showLibrary, setRightPanelOpen])

  useEffect(() => {
    const nextWidth = clampPanelWidth(preferences.workspaceRightPanelWidth, MIN_RIGHT_PANEL_WIDTH, MAX_RIGHT_PANEL_WIDTH)
    setRightPanelWidth(nextWidth)
    rightPanelWidthRef.current = nextWidth
  }, [preferences.workspaceRightPanelWidth])

  useEffect(() => {
    rightPanelWidthRef.current = rightPanelWidth
  }, [rightPanelWidth])

  useEffect(() => {
    if (!rightOpen) {
      setIsResizingRightPanel(false)
      rightPanelResizeStartX.current = null
    }
  }, [rightOpen])

  const panelsInverted    = preferences.panelsInverted    ?? false
  const activityBarVisible = preferences.activityBarVisible ?? true
  const centeredLayout    = preferences.centeredLayout    ?? false
  const showWorkflowBreadcrumb = preferences.showWorkflowBreadcrumb ?? true
  const isCurrentAIDraftPreview = aiDraftPreview?.projectId === projectId && aiDraftPreview?.sifId === sifId

  // Helper: wraps content with a max-width centered column when centeredLayout is on.
  const wrapCentered = (content: ReactNode): ReactNode =>
    centeredLayout ? (
      <div className="flex flex-1 min-h-0 overflow-hidden justify-center w-full">
        <div className="flex flex-col w-full min-h-0" style={{ maxWidth: 900 }}>
          {content}
        </div>
      </div>
    ) : content

  // Pointer drag for resize
  useEffect(() => {
    if (!isResizingRightPanel) return
    const onMove = (e: PointerEvent) => {
      if (rightPanelResizeStartX.current === null) return
      // When panels are inverted the right panel is on the left — flip direction
      const delta = panelsInverted
        ? e.clientX - rightPanelResizeStartX.current
        : rightPanelResizeStartX.current - e.clientX
      setRightPanelWidth(
        Math.max(MIN_RIGHT_PANEL_WIDTH, Math.min(MAX_RIGHT_PANEL_WIDTH, rightPanelResizeStartWidth.current + delta))
      )
    }
    const onStop = () => {
      setIsResizingRightPanel(false)
      rightPanelResizeStartX.current = null
      const nextWidth = clampPanelWidth(rightPanelWidthRef.current, MIN_RIGHT_PANEL_WIDTH, MAX_RIGHT_PANEL_WIDTH)
      if (nextWidth !== preferences.workspaceRightPanelWidth) {
        updateAppPreferences({ workspaceRightPanelWidth: nextWidth })
      }
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
  }, [isResizingRightPanel, panelsInverted, preferences.workspaceRightPanelWidth, updateAppPreferences])

  const startResize = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!rightOpen) return
    rightPanelResizeStartX.current     = e.clientX
    rightPanelResizeStartWidth.current = rightPanelWidth
    setIsResizingRightPanel(true)
    e.preventDefault()
  }

  // Reset split width when split closes
  useEffect(() => {
    if (!isSplitActive) setSplitWidth(null)
  }, [isSplitActive])

  // Split pane drag-to-resize
  useEffect(() => {
    if (!isResizingSplit) return
    const MIN_PANE = 280
    const onMove = (e: PointerEvent) => {
      if (splitResizeStartX.current === null || splitResizeStartWidth.current === null) return
      const containerWidth = splitContainerRef.current?.offsetWidth ?? 0
      const delta = e.clientX - splitResizeStartX.current
      setSplitWidth(Math.max(MIN_PANE, Math.min(containerWidth - MIN_PANE, splitResizeStartWidth.current + delta)))
    }
    const onStop = () => {
      setIsResizingSplit(false)
      splitResizeStartX.current = null
      splitResizeStartWidth.current = null
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
  }, [isResizingSplit])

  const startSplitResize = (e: ReactPointerEvent<HTMLDivElement>) => {
    const containerWidth = splitContainerRef.current?.offsetWidth ?? 0
    splitResizeStartX.current     = e.clientX
    splitResizeStartWidth.current = splitWidth ?? containerWidth / 2
    setIsResizingSplit(true)
    e.preventDefault()
  }


  return (
    <LayoutContext.Provider value={{ setRightPanelOverride, setRightPanelOpen, isRightPanelOpen: rightOpen }}>
      <div className="flex flex-1 min-h-0 overflow-hidden" style={{ background: PAGE_BG }}>
        {/* ── Activity Bar — hidden in Zen mode or when toggled off ── */}
        {!focusMode && activityBarVisible && <IconRail />}

        {/* ── Main area — optionally inverted (sidebar↔right panel swap) ── */}
        <div className={`flex flex-1 min-w-0 min-h-0 overflow-hidden${panelsInverted ? ' flex-row-reverse' : ''}`}>
          {!showDashboard && (
            <>
              {/* ── Sidebar ── */}
              <div
                className={`flex shrink-0 flex-col overflow-hidden ${panelsInverted ? 'border-l' : 'border-r'}`}
                style={{
                  width:       leftOpen && !showSettings ? leftPanelWidth : 0,
                  opacity:     leftOpen && !showSettings ? 1 : 0,
                  borderColor: showSettings ? 'transparent' : BORDER,
                  background:  PANEL_BG,
                  transition:  'width 0.2s ease, opacity 0.15s ease',
                }}
              >
                {leftOpen && !showSettings && (
                  showDocs
                    ? <DocsSidebar />
                    : showSearch
                      ? <SearchSidebar />
                      : showLibrary
                        ? <LibrarySidebar />
                        : showAudit
                          ? <AuditSidebar />
                          : showPlanning
                            ? <PlanningSidebar />
                            : showEngine
                              ? <EngineSidebar />
                              : <ProjectSidebar projectId={projectId ?? ''} sifId={sifId ?? ''} />
                )}
              </div>

              {/* SIF browser (Layers rail button) */}
              {showSIFBrowser && <SIFBrowserWelcome />}

              {/* Home / LifecycleCockpit (PRISM logo in header) */}
              {showHome && !showSIFBrowser && <HomeScreen />}

              {/* Note editor */}
              {showNote && (
                <div className="flex flex-1 min-w-0 min-h-0 overflow-hidden">{wrapCentered(children)}</div>
              )}

              {/* File viewer (PDF / Image) */}
              {showFile && (
                <div className="flex flex-1 min-w-0 min-h-0 overflow-hidden">{wrapCentered(children)}</div>
              )}

              {/* .prism/ file editor */}
              {showPrismFile && (
                <div className="flex flex-1 min-w-0 min-h-0 overflow-hidden">{children}</div>
              )}

              {/* Settings — full width, no panels */}
              {showSettings && (
                <div className="flex flex-1 min-w-0 min-h-0 overflow-hidden">{wrapCentered(children)}</div>
              )}

              {/* Docs — shell with left outline, no right panel */}
              {showDocs && (
                <div className="flex flex-1 min-w-0 min-h-0 overflow-hidden">{wrapCentered(children)}</div>
              )}

              {showSearch && (
                <div className="flex flex-1 min-w-0 min-h-0 overflow-hidden">{wrapCentered(children)}</div>
              )}

              {showLibrary && (
                <div className={`flex flex-1 min-h-0 overflow-hidden${panelsInverted ? ' flex-row-reverse' : ''}`}>
                  <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden">{wrapCentered(children)}</div>
                  {rightOpen && (
                    <div
                      className="relative min-h-0 shrink-0 overflow-hidden"
                      style={{
                        width: rightPanelWidth,
                        background: PANEL_BG,
                        [panelsInverted ? 'borderRight' : 'borderLeft']: `1px solid ${BORDER}`,
                        boxShadow: SHADOW_DOCK,
                      }}
                    >
                      <ResizeDivider isResizing={isResizingRightPanel} onPointerDown={startResize} side={panelsInverted ? 'right' : 'left'} />
                      <LibraryInspector />
                    </div>
                  )}
                </div>
              )}

              {/* Global tools — editor + right panel */}
              {showGlobal && (
                <div className={`flex flex-1 min-h-0 overflow-hidden${panelsInverted ? ' flex-row-reverse' : ''}`}>
                  <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden">{wrapCentered(children)}</div>
                  {rightOpen && (
                    <div
                      className="relative min-h-0 shrink-0 overflow-hidden"
                      style={{
                        width: rightPanelWidth,
                        background: PANEL_BG,
                        [panelsInverted ? 'borderRight' : 'borderLeft']: `1px solid ${BORDER}`,
                        boxShadow: SHADOW_DOCK,
                      }}
                    >
                      <ResizeDivider isResizing={isResizingRightPanel} onPointerDown={startResize} side={panelsInverted ? 'right' : 'left'} />
                      {rightPanelOverride || (
                        <GlobalRightPanelPlaceholder
                          mode={showAudit ? 'audit' : showHistory ? 'history' : showPlanning ? 'planning' : showEngine ? 'engine' : 'hazop'}
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
              {/* ── Sidebar — direct sibling so flex-row-reverse inverts correctly ── */}
              <div
                className={`flex shrink-0 flex-col overflow-hidden ${panelsInverted ? 'border-l' : 'border-r'}`}
                style={{
                  width:       leftOpen ? leftPanelWidth : 0,
                  opacity:     leftOpen ? 1 : 0,
                  borderColor: BORDER,
                  background:  PANEL_BG,
                  transition:  'width 0.2s ease, opacity 0.15s ease',
                }}
              >
                {leftOpen && (
                  <ProjectSidebar projectId={projectId ?? ''} sifId={sifId ?? ''} />
                )}
              </div>

              <div className="flex flex-1 min-w-0 min-h-0 overflow-hidden">
                {isSplitActive ? (
                  // ── SPLIT MODE: two panes side-by-side ──────────────────
                  <div ref={splitContainerRef} className="flex flex-1 min-w-0 min-h-0 overflow-hidden">
                    {/* Primary pane */}
                    <div
                      className="relative flex min-h-0 flex-col overflow-hidden"
                      style={{ width: splitWidth ?? '50%', minWidth: 280, flexShrink: 0 }}
                    >
                      {showWorkflowBreadcrumb && <EditorBreadcrumb />}
                      <SIFWorkbenchBar
                        active={visibleTab}
                        onSelect={(id) => setTab(id)}
                        sifTooltip={primarySifTooltip}
                        onSwitch={() => setPrimaryPickerOpen(true)}
                      />
                      <EditorContent className="flex flex-col">
                        {children}
                      </EditorContent>
                      {primaryPickerOpen && (
                        <PrimaryPickerOverlay onClose={() => setPrimaryPickerOpen(false)} />
                      )}
                    </div>

                    {/* Resizable center divider */}
                    <SplitDivider isResizing={isResizingSplit} onPointerDown={startSplitResize} />

                    {/* Secondary pane */}
                    <div className="flex flex-1 min-h-0 min-w-0 flex-col overflow-hidden">
                      {secondaryContent ? (
                        <SIFWorkbenchBar
                          active={secondSlot!.tab}
                          onSelect={setSecondSlotTab}
                          sifTooltip={secondSifTooltip}
                          onReset={resetSecondSlot}
                        />
                      ) : (
                        <SecondaryEmptyBar onClose={closeSecondSlot} />
                      )}
                      <EditorContent className="flex flex-col">
                        {secondaryContent ? (
                          <SecondarySlotBoundary>
                            {secondaryContent}
                          </SecondarySlotBoundary>
                        ) : (
                          <SecondaryEmptyState />
                        )}
                      </EditorContent>
                    </div>
                  </div>
                ) : (
                  // ── SINGLE MODE ──────────────────────────────────────────
                  <div className="flex flex-1 min-w-0 min-h-0 flex-col overflow-hidden">
                    {showWorkflowBreadcrumb && <EditorBreadcrumb />}
                    {!leftOpen && (
                      <SIFWorkbenchBar
                        active={visibleTab}
                        onSelect={(id) => setTab(id)}
                      />
                    )}
                    <EditorContent className="flex flex-col">
                      {centeredLayout ? (
                        <div className="flex flex-1 min-h-0 overflow-hidden justify-center">
                          <div className="flex flex-col w-full min-h-0" style={{ maxWidth: 900 }}>
                            {children}
                          </div>
                        </div>
                      ) : children}
                    </EditorContent>
                  </div>
                )}
              </div>

              {/* Right dock — hidden in split mode */}
              <div
                className="relative min-h-0 shrink-0 overflow-hidden"
                style={{
                  width: rightOpen ? rightPanelWidth : 0,
                  ...(panelsInverted
                    ? { borderRightWidth: rightOpen ? 1 : 0, borderRightStyle: 'solid' as const }
                    : { borderLeftWidth:  rightOpen ? 1 : 0, borderLeftStyle:  'solid' as const }),
                  borderColor: BORDER,
                  background: PANEL_BG,
                  boxShadow: rightOpen ? SHADOW_DOCK : 'none',
                  transition: 'width 0.2s ease',
                }}
              >
                {rightOpen && (
                  <ResizeDivider isResizing={isResizingRightPanel} onPointerDown={startResize} side={panelsInverted ? 'right' : 'left'} />
                )}
                <div
                  className="h-full transition-[opacity] duration-200"
                  style={{
                    opacity: 1,
                    pointerEvents: isCurrentAIDraftPreview ? 'none' : 'auto',
                    userSelect: isCurrentAIDraftPreview ? 'none' : 'auto',
                  }}
                >
                  {rightPanelOverride || rightPanelContent || (
                    <RightPanel projectId={projectId ?? ''} sifId={sifId ?? ''} />
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </LayoutContext.Provider>
  )
}
