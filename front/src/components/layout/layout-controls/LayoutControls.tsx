/**
 * layout-controls/LayoutControls.tsx
 *
 * Header layout buttons — order:
 *   [◧ Customize Layout] [◧ Left Panel] [⬜ Status Bar] [▧ Right Panel]
 *
 * Zen mode and Split view live in the command palette (> layout).
 */
import {
  LayoutPanelLeft,
  PanelLeftClose, PanelLeftOpen,
  PanelBottomClose, PanelBottomOpen,
  PanelRightClose, PanelRightOpen,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useLocaleStrings } from '@/i18n/useLocale'
import { getShellStrings } from '@/i18n/shell'
import { RailIconButton } from '@/components/layout/RailPrimitives'
import { openPalette } from '@/components/layout/command-palette'

// Views where the right panel toggle is relevant
const RIGHT_TOGGLE_VIEWS = new Set([
  'sif-dashboard', 'audit-log', 'sif-history',
  'planning', 'engine', 'hazop', 'library',
])

export function LayoutControls() {
  const strings = useLocaleStrings(getShellStrings)

  const view             = useAppStore(s => s.view)
  const leftPanelOpen    = useAppStore(s => s.leftPanelOpen)
  const rightPanelOpen   = useAppStore(s => s.rightPanelOpen)
  const focusMode        = useAppStore(s => s.focusMode)
  const statusBarVisible = useAppStore(s => s.preferences.statusBarVisible)
  const toggleLeftPanel  = useAppStore(s => s.toggleLeftPanel)
  const toggleRightPanel = useAppStore(s => s.toggleRightPanel)
  const toggleStatusBar  = useAppStore(s => s.toggleStatusBar)

  // Effective state — Zen mode collapses everything
  const leftOpen  = leftPanelOpen  && !focusMode
  const rightOpen = rightPanelOpen && !focusMode

  const showRightToggle = RIGHT_TOGGLE_VIEWS.has(view.type)

  return (
    <div className="flex items-center gap-0.5">
      {/* Customize layout — opens command palette in layout mode */}
      <RailIconButton
        Icon={LayoutPanelLeft}
        label={strings.commandPalette.labels.customizeLayout}
        onClick={() => openPalette('>layout')}
        active={false}
        indicatorSide="left"
        compact
      />

      {/* Left panel */}
      <RailIconButton
        Icon={leftOpen ? PanelLeftClose : PanelLeftOpen}
        label={leftOpen ? strings.iconRail.leftCollapse : strings.iconRail.leftExpand}
        onClick={toggleLeftPanel}
        active={leftOpen}
        indicatorSide="left"
        compact
      />

      {/* Status bar */}
      <RailIconButton
        Icon={statusBarVisible ? PanelBottomClose : PanelBottomOpen}
        label={strings.commandPalette.labels.toggleStatusBar}
        onClick={toggleStatusBar}
        active={statusBarVisible}
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
    </div>
  )
}
