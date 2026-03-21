/**
 * TitleBar.tsx — PRISM Launcher
 * Barre titre frameless. Gauche : branding aligné sur LeftPanel (220px).
 * Centre : vue courante. Droite : contrôles fenêtre.
 */

import { Minus, Square, X } from 'lucide-react'
import { alpha } from '../tokens'
import type { ThemeTokens } from '../hooks/useTheme'
import type { LauncherView } from '../types'

const VIEW_LABELS: Record<LauncherView, string> = {
  home:     'Accueil',
  library:  'Modules',
  updates:  'Mises à jour',
  settings: 'Configuration',
}

interface TitleBarProps {
  t:     ThemeTokens
  view?: LauncherView
}

export function TitleBar({ t, view }: TitleBarProps) {
  return (
    <div
      className="drag flex h-8 shrink-0 select-none items-center"
      style={{ background: t.PANEL_BG }}
    >
      {/* Left — branding (220px, aligné avec LeftPanel) */}
      <div
        className="flex h-full w-[220px] shrink-0 items-center gap-2 px-4"
      >
        <img src="/logo.png" alt="" className="h-3.5 w-3.5 object-contain" style={{ opacity: 0.7 }} />
        <span className="text-[10px] font-bold" style={{ color: t.TEXT_DIM }}>
          PRISM Launcher
        </span>
        <span
          className="ml-auto font-mono text-[9px]"
          style={{ color: alpha(t.TEXT_DIM, '55') }}
        >
          v3.0.2
        </span>
      </div>

      {/* Center — vue courante */}
      <div className="flex flex-1 items-center px-4">
        {view && view !== 'home' && (
          <span className="text-[10px] font-medium" style={{ color: alpha(t.TEXT_DIM, '70') }}>
            {VIEW_LABELS[view]}
          </span>
        )}
      </div>

      {/* Right — window controls */}
      <div className="no-drag flex items-center gap-0.5 pr-2">
        <WinBtn t={t} onClick={() => window.electron?.minimize?.()} title="Réduire">
          <Minus size={9} />
        </WinBtn>
        <WinBtn t={t} onClick={() => window.electron?.maximize?.()} title="Agrandir">
          <Square size={8} />
        </WinBtn>
        <WinBtn t={t} onClick={() => window.electron?.close?.()} title="Fermer" danger>
          <X size={9} />
        </WinBtn>
      </div>
    </div>
  )
}

function WinBtn({
  children, onClick, title, danger = false, t,
}: {
  children: React.ReactNode; onClick: () => void
  title: string; danger?: boolean; t: ThemeTokens
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex h-5 w-5 items-center justify-center rounded transition-all"
      style={{ color: alpha(t.TEXT_DIM, '65'), background: 'transparent' }}
      onMouseEnter={e => {
        e.currentTarget.style.background = danger ? alpha('#EF4444', '18') : alpha(t.BORDER, '90')
        e.currentTarget.style.color      = danger ? '#EF4444' : alpha(t.TEXT, '80')
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color      = alpha(t.TEXT_DIM, '65')
      }}
    >
      {children}
    </button>
  )
}
