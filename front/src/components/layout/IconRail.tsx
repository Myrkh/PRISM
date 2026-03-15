/**
 * layout/IconRail.tsx — PRISM v3
 *
 * VS Code Activity Bar style.
 * Les vues globales restent accessibles directement dans le rail.
 */
import {
  Home,
  ListChecks, History, Cpu,
  Settings, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { RailDivider, RailIconButton } from '@/components/layout/RailPrimitives'

// ─── Outils globaux ───────────────────────────────────────────────────────
const GLOBAL_TOOLS = [
  { id: 'review-queue' as const, Icon: ListChecks,  label: 'Review Queue'    },
  { id: 'audit-log'   as const, Icon: History,      label: "Journal d'audit" },
  { id: 'engine'      as const, Icon: Cpu,          label: 'Moteur de calcul'},
] as const

type GlobalToolId = typeof GLOBAL_TOOLS[number]['id']

const GLOBAL_TOOL_IDS = new Set<string>(GLOBAL_TOOLS.map(t => t.id))

// ─── IconRail ─────────────────────────────────────────────────────────────
interface IconRailProps {
  leftOpen:        boolean
  rightOpen:       boolean
  onToggleLeft:    () => void
  onToggleRight:   () => void
  showRightToggle: boolean
  showPanelToggles?: boolean
}

export function IconRail({
  leftOpen, rightOpen, onToggleLeft, onToggleRight, showRightToggle, showPanelToggles = true,
}: IconRailProps) {
  const { BORDER, RAIL_BG } = usePrismTheme()
  const navigate = useAppStore(s => s.navigate)
  const view     = useAppStore(s => s.view)

  const showHome     = view.type === 'projects'
  const showSettings = view.type === 'settings'
  const activeGlobalToolId: GlobalToolId | null = GLOBAL_TOOL_IDS.has(view.type)
    ? (view.type as GlobalToolId)
    : null

  return (
    <div
      className="flex shrink-0 flex-col items-center gap-0.5 py-2 border-r"
      style={{ width: 48, background: RAIL_BG, borderColor: BORDER }}
    >
      {showPanelToggles && (
        <>
          {/* ── Toggles panneaux ── */}
          <RailIconButton
            Icon={leftOpen ? PanelLeftClose : PanelLeftOpen}
            label={leftOpen ? 'Réduire le panneau' : 'Afficher le panneau'}
            onClick={onToggleLeft}
            active={leftOpen}
          />
          {showRightToggle && (
            <RailIconButton
              Icon={rightOpen ? PanelRightClose : PanelRightOpen}
              label={rightOpen ? 'Réduire les propriétés' : 'Afficher les propriétés'}
              onClick={onToggleRight}
              active={rightOpen}
            />
          )}

          <RailDivider />
        </>
      )}

      {/* ── Navigation ── */}
      <RailIconButton
        Icon={Home}
        label="Accueil — Projets"
        onClick={() => navigate({ type: 'projects' })}
        active={showHome}
      />

      <RailDivider />

      {/* ── Outils globaux ── */}
      {GLOBAL_TOOLS.map(({ id, Icon, label }) => (
        <RailIconButton
          key={id}
          Icon={Icon}
          label={label}
          onClick={() => navigate({ type: id })}
          active={activeGlobalToolId === id}
        />
      ))}

      {/* ── Bas : settings ── */}
      <div className="flex-1" />
      <RailDivider />
      <RailIconButton
        Icon={Settings}
        label="Paramètres"
        onClick={() => navigate({ type: 'settings', section: 'general' })}
        active={showSettings}
      />
    </div>
  )
}
