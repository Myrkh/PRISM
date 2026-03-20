/**
 * layout/IconRail.tsx — PRISM v3
 *
 * VS Code Activity Bar style.
 * Les vues globales restent accessibles directement dans le rail.
 */
import {
  Home, Search, BookOpen, BookOpenText,
  History, Cpu,
  Settings, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { RailDivider, RailIconButton } from '@/components/layout/RailPrimitives'

const GLOBAL_TOOLS = [
  { id: 'search' as const, Icon: Search, label: 'Recherche globale' },
  { id: 'library' as const, Icon: BookOpen, label: 'Bibliothèque maître' },
  { id: 'audit-log' as const, Icon: History, label: "Journal d'audit" },
  { id: 'engine' as const, Icon: Cpu, label: 'Moteur de calcul' },
] as const

type GlobalToolId = typeof GLOBAL_TOOLS[number]['id']

const GLOBAL_TOOL_IDS = new Set<string>(GLOBAL_TOOLS.map(tool => tool.id))

interface IconRailProps {
  leftOpen: boolean
  rightOpen: boolean
  onToggleLeft: () => void
  onToggleRight: () => void
  showRightToggle: boolean
  showPanelToggles?: boolean
}

export function IconRail({
  leftOpen,
  rightOpen,
  onToggleLeft,
  onToggleRight,
  showRightToggle,
  showPanelToggles = true,
}: IconRailProps) {
  const { BORDER, RAIL_BG, SHADOW_TAB, isDark } = usePrismTheme()
  const navigate = useAppStore(state => state.navigate)
  const view = useAppStore(state => state.view)

  const showHome = view.type === 'projects'
  const showDocs = view.type === 'docs'
  const showSettings = view.type === 'settings'
  const activeGlobalToolId: GlobalToolId | null = GLOBAL_TOOL_IDS.has(view.type)
    ? (view.type as GlobalToolId)
    : null

  return (
    <div
      className="flex shrink-0 flex-col items-center gap-0.5 border-r py-2"
      style={{
        width: 48,
        background: RAIL_BG,
        borderColor: BORDER,
        boxShadow: `${SHADOW_TAB}, inset -1px 0 0 ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)'}, inset 0 1px 0 ${isDark ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.9)'}, inset 0 -1px 0 ${isDark ? 'rgba(0,0,0,0.26)' : 'rgba(15,23,42,0.05)'}`,
      }}
    >
      {showPanelToggles && (
        <>
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

      <RailIconButton
        Icon={Home}
        label="Accueil — Projets"
        onClick={() => navigate({ type: 'projects' })}
        active={showHome}
      />

      <RailDivider />

      {GLOBAL_TOOLS.map(({ id, Icon, label }) => (
        <RailIconButton
          key={id}
          Icon={Icon}
          label={label}
          onClick={() => navigate({ type: id })}
          active={activeGlobalToolId === id}
        />
      ))}

      <div className="flex-1" />
      <RailDivider />
      <RailIconButton
        Icon={BookOpenText}
        label="Aide et documentation"
        onClick={() => navigate({ type: 'docs' })}
        active={showDocs}
      />
      <RailIconButton
        Icon={Settings}
        label="Paramètres"
        onClick={() => navigate({ type: 'settings', section: 'general' })}
        active={showSettings}
      />
    </div>
  )
}
