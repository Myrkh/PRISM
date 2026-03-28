/**
 * layout/IconRail.tsx — PRISM v4
 *
 * VS Code Activity Bar style.
 * Panel toggles live in the AppHeader (LayoutControls) — not here.
 */
import {
  Layers, Search, BookOpen, BookOpenText,
  History, CalendarDays, Cpu, Settings, Shield, NotebookPen, LibraryBig
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useLocaleStrings } from '@/i18n/useLocale'
import { getShellStrings } from '@/i18n/shell'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { RailDivider, RailIconButton } from '@/components/layout/RailPrimitives'

const GLOBAL_TOOLS = [
  { id: 'search'    as const, Icon: Search,      labelKey: 'search'   as const },
  { id: 'library'   as const, Icon: LibraryBig,     labelKey: 'library'  as const },
  { id: 'audit-log' as const, Icon: NotebookPen,      labelKey: 'audit'    as const },
  { id: 'planning'  as const, Icon: CalendarDays, labelKey: 'planning' as const },
  { id: 'engine'    as const, Icon: Cpu,          labelKey: 'engine'   as const },
] as const

type GlobalToolId = typeof GLOBAL_TOOLS[number]['id']
const GLOBAL_TOOL_IDS = new Set<string>(GLOBAL_TOOLS.map(t => t.id))

export function IconRail() {
  const { BORDER, RAIL_BG, SHADOW_TAB, isDark } = usePrismTheme()
  const strings = useLocaleStrings(getShellStrings)

  const navigate = useAppStore(s => s.navigate)
  const view     = useAppStore(s => s.view)

  const showHome     = view.type === 'home'
  const showDocs     = view.type === 'docs'
  const showSettings = view.type === 'settings'
  const showLopa     = view.type === 'lopa'
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
      <RailIconButton
        Icon={Layers}
        label={strings.iconRail.home}
        onClick={() => navigate({ type: 'home' })}
        active={showHome}
      />

      <RailDivider />

      {GLOBAL_TOOLS.map(({ id, Icon, labelKey }) => (
        <RailIconButton
          key={id}
          Icon={Icon}
          label={strings.iconRail[labelKey]}
          onClick={() => navigate({ type: id })}
          active={activeGlobalToolId === id}
        />
      ))}

      <RailIconButton
        Icon={Shield}
        label={strings.iconRail.lopa}
        onClick={() => navigate({ type: 'lopa' })}
        active={showLopa}
      />

      <div className="flex-1" />
      <RailDivider />
      <RailIconButton
        Icon={BookOpenText}
        label={strings.iconRail.docs}
        onClick={() => navigate({ type: 'docs' })}
        active={showDocs}
      />
      <RailIconButton
        Icon={Settings}
        label={strings.iconRail.settings}
        onClick={() => navigate({ type: 'settings', section: 'general' })}
        active={showSettings}
      />
    </div>
  )
}
