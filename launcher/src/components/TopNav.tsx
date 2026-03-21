/**
 * TopNav.tsx — PRISM Launcher
 * Barre de navigation horizontale (tabs) en haut de la zone droite.
 */

import { Sun, Moon } from 'lucide-react'
import { colors, alpha } from '../tokens'
import type { ThemeTokens } from '../hooks/useTheme'
import type { LauncherView } from '../types'
import { useLocaleStrings } from '../i18n/useLocale'
import { getLauncherStrings } from '../i18n/launcher'

interface TopNavProps {
  t:              ThemeTokens
  view:           LauncherView
  onView:         (v: LauncherView) => void
  onToggleTheme:  () => void
  updateAvailable?: boolean
}

export function TopNav({ t, view, onView, onToggleTheme, updateAvailable }: TopNavProps) {
  const s = useLocaleStrings(getLauncherStrings)

  const TABS: Array<{ id: LauncherView; label: string }> = [
    { id: 'home',     label: s.nav.home     },
    { id: 'library',  label: s.nav.library  },
    { id: 'updates',  label: s.nav.updates  },
    { id: 'settings', label: s.nav.settings },
  ]

  return (
    <div
      className="flex h-10 shrink-0 items-center border-b"
      style={{ background: t.PANEL_BG, borderColor: t.BORDER }}
    >
      {/* Tabs */}
      <div className="flex h-full items-center px-3 gap-0.5">
        {TABS.map(({ id, label }) => {
          const active = view === id
          const hasBadge = id === 'updates' && updateAvailable
          return (
            <button
              key={id}
              type="button"
              onClick={() => onView(id)}
              className="relative flex h-full items-center gap-1.5 px-3 text-[11px] font-semibold transition-colors"
              style={{ color: active ? colors.teal : t.TEXT_DIM }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = t.TEXT }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = t.TEXT_DIM }}
            >
              {label}
              {hasBadge && (
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: colors.teal, boxShadow: `0 0 6px ${colors.teal}` }}
                />
              )}
              {/* Active bottom border */}
              {active && (
                <span
                  className="absolute bottom-0 left-2 right-2 h-[2px] rounded-t-sm"
                  style={{ background: colors.teal }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-1 pr-3">
        {/* Theme toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
          style={{ color: t.TEXT_DIM }}
          onMouseEnter={e => {
            e.currentTarget.style.background = alpha(t.TEXT, '06')
            e.currentTarget.style.color = t.TEXT
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = t.TEXT_DIM
          }}
          title={t.isDark ? 'Mode clair' : 'Mode sombre'}
        >
          {t.isDark ? <Sun size={13} /> : <Moon size={13} />}
        </button>
      </div>
    </div>
  )
}
