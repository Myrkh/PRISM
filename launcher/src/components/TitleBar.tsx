/**
 * src/components/TitleBar.tsx — PRISM Launcher
 * Barre de titre frameless Electron.
 * Drag region + boutons macOS/Windows selon platform.
 */

import { Minus, Square, X } from 'lucide-react'
import { colors } from '../tokens'
import type { ThemeTokens } from '../hooks/useTheme'

interface TitleBarProps {
  t: ThemeTokens
}

export function TitleBar({ t }: TitleBarProps) {
  const handleMin   = () => window.electron?.minimize?.()
  const handleMax   = () => window.electron?.maximize?.()
  const handleClose = () => window.electron?.close?.()

  return (
    <div
      className="flex h-9 shrink-0 select-none items-center justify-between px-4"
      style={{
        background:    t.RAIL_BG,
        borderBottom:  `1px solid ${t.BORDER}`,
        WebkitAppRegion: 'drag',
      } as React.CSSProperties}
    >
      {/* Titre centré */}
      <div className="flex items-center gap-2.5" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <img src="/logo.png" alt="PRISM" className="h-4 w-4 object-contain opacity-80" />
        <span className="text-[11px] font-semibold tracking-wide" style={{ color: t.TEXT_DIM }}>
          PRISM Launcher
        </span>
      </div>

      {/* Window controls */}
      <div
        className="flex items-center gap-1"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <WinBtn onClick={handleMin}  title="Réduire">
          <Minus size={11} />
        </WinBtn>
        <WinBtn onClick={handleMax}  title="Agrandir">
          <Square size={10} />
        </WinBtn>
        <WinBtn onClick={handleClose} title="Fermer" danger>
          <X size={11} />
        </WinBtn>
      </div>
    </div>
  )
}

function WinBtn({
  children, onClick, title, danger = false,
}: {
  children: React.ReactNode
  onClick:  () => void
  title:    string
  danger?:  boolean
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex h-6 w-6 items-center justify-center rounded-md transition-colors"
      style={{
        color:      '#8FA0B1',
        background: 'transparent',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = danger ? '#EF444420' : '#2A3138'
        e.currentTarget.style.color      = danger ? '#EF4444'   : '#DFE8F1'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color      = '#8FA0B1'
      }}
    >
      {children}
    </button>
  )
}
