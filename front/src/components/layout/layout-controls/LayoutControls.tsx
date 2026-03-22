/**
 * layout-controls/LayoutControls.tsx
 *
 * Three icon buttons in the AppHeader between CommandPalette and user avatar:
 *
 *   [◧ left panel] [▧ right panel] [⛶ zen]
 *
 * Icons use the same RailIconButton style as the IconRail (h-9 w-9, border,
 * shadow, TEAL indicator bar). Panel icons show the solid/filled area of the
 * deployed panel — "plein" when open.  All state lives in Zustand.
 */
import {
  PanelLeftClose, PanelLeftOpen,
  PanelRightClose, PanelRightOpen,
  Maximize2, Minimize2,
  Columns2,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useLocaleStrings } from '@/i18n/useLocale'
import { getShellStrings } from '@/i18n/shell'
import { RailIconButton } from '@/components/layout/RailPrimitives'

// Views where the right panel toggle is relevant
const RIGHT_TOGGLE_VIEWS = new Set([
  'sif-dashboard', 'audit-log', 'sif-history',
  'planning', 'engine', 'hazop', 'library',
])

// ── LayoutControls ──────────────────────────────────────────────────────────

export function LayoutControls() {
  const strings = useLocaleStrings(getShellStrings)

  const view             = useAppStore(s => s.view)
  const leftPanelOpen    = useAppStore(s => s.leftPanelOpen)
  const rightPanelOpen   = useAppStore(s => s.rightPanelOpen)
  const focusMode        = useAppStore(s => s.focusMode)
  const secondSlot       = useAppStore(s => s.secondSlot)
  const toggleLeftPanel  = useAppStore(s => s.toggleLeftPanel)
  const toggleRightPanel = useAppStore(s => s.toggleRightPanel)
  const toggleFocusMode  = useAppStore(s => s.toggleFocusMode)
  const openSecondSlot   = useAppStore(s => s.openSecondSlot)
  const closeSecondSlot  = useAppStore(s => s.closeSecondSlot)

  const isSif = view.type === 'sif-dashboard'
  const isSplitActive = !!secondSlot

  const handleSplitToggle = () => {
    if (isSplitActive) closeSecondSlot()
    else openSecondSlot()
  }

  // Effective state — Zen mode hides everything including the rail
  const leftOpen  = leftPanelOpen  && !focusMode
  const rightOpen = rightPanelOpen && !focusMode

  const showRightToggle = RIGHT_TOGGLE_VIEWS.has(view.type)

  return (
    <div className="flex items-center gap-0.5">
      {/* Left panel — arrow ← (PanelLeftClose) when open, arrow → (PanelLeftOpen) when closed */}
      <RailIconButton
        Icon={leftOpen ? PanelLeftClose : PanelLeftOpen}
        label={leftOpen ? strings.iconRail.leftCollapse : strings.iconRail.leftExpand}
        onClick={toggleLeftPanel}
        active={leftOpen}
        indicatorSide="left"
        compact
      />

      {/* Right panel — only on views that have a right panel */}
      {showRightToggle && (
        <RailIconButton
          Icon={rightOpen ? PanelRightClose : PanelRightOpen}
          label={rightOpen ? strings.iconRail.rightCollapse : strings.iconRail.rightExpand}
          onClick={toggleRightPanel}
          active={rightOpen}
          indicatorSide="right"
          compact
        />
      )}

      {/* Zen mode — hides rail + sidebar + right panel, keeps header + lifecycle bar */}
      <RailIconButton
        Icon={focusMode ? Minimize2 : Maximize2}
        label={focusMode ? strings.iconRail.focusExit : strings.iconRail.focusEnter}
        onClick={toggleFocusMode}
        active={focusMode}
        indicatorSide="right"
        compact
      />

      {/* Split view — two SIFs side by side, only on SIF dashboard */}
      {isSif && (
        <RailIconButton
          Icon={Columns2}
          label={isSplitActive ? 'Fermer la vue split' : 'Ouvrir une deuxième SIF en split'}
          onClick={handleSplitToggle}
          active={isSplitActive}
          indicatorSide="right"
          compact
        />
      )}
    </div>
  )
}
