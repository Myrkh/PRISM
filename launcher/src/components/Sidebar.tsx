/**
 * src/components/Sidebar.tsx — PRISM Launcher (v2)
 * Navigation gauche avec UserProfileCard en footer.
 * Ajout du tab Library.
 */

import { Home, RefreshCw, Settings, LayoutGrid } from 'lucide-react'
import { colors, alpha } from '../tokens'
import { UserProfileCard } from './UserProfileCard'
import type { LauncherView, AuthUser } from '../types'
import type { ThemeTokens } from '../hooks/useTheme'

interface SidebarProps {
  t:               ThemeTokens
  view:            LauncherView
  onView:          (v: LauncherView) => void
  user:            AuthUser
  onLogout:        () => void
  onToggleTheme:   () => void
  updateAvailable?: boolean
}

const NAV_ITEMS: Array<{
  id:    LauncherView
  label: string
  Icon:  React.ElementType
}> = [
  { id: 'home',     label: 'Accueil',       Icon: Home       },
  { id: 'library',  label: 'Library',       Icon: LayoutGrid },
  { id: 'updates',  label: 'Mises à jour',  Icon: RefreshCw  },
  { id: 'settings', label: 'Préférences',   Icon: Settings   },
]

export function Sidebar({ t, view, onView, user, onLogout, updateAvailable }: SidebarProps) {
  return (
    <div
      className="flex h-full w-[200px] shrink-0 flex-col"
      style={{
        background:  t.PANEL_BG,
        borderRight: `1px solid ${t.BORDER}`,
      }}
    >
      {/* Logo zone */}
      <div
        className="relative flex items-center gap-3 border-b px-4 py-5 overflow-hidden"
        style={{ borderColor: t.BORDER }}
      >
        {/* Subtle teal glow */}
        <div className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(ellipse 120% 80% at 0% 50%, ${alpha(colors.teal, '08')} 0%, transparent 70%)` }}/>
        {/* Accent left border */}
        <div className="absolute left-0 top-4 bottom-4 w-0.5 rounded-r"
          style={{ background: `linear-gradient(180deg, ${colors.teal}, ${alpha(colors.teal, '00')})` }}/>

        <div
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border"
          style={{ background: alpha(colors.teal, '14'), borderColor: alpha(colors.teal, '40'),
            boxShadow: `0 0 16px ${alpha(colors.teal, '20')}` }}
        >
          <img src="/logo.png" alt="PRISM" className="h-5 w-5 object-contain" />
        </div>
        <div className="relative min-w-0">
          <p className="text-[13px] font-bold tracking-wide" style={{ color: t.TEXT }}>PRISM</p>
          <p className="truncate text-[10px]" style={{ color: t.TEXT_DIM }}>Desktop Launcher</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const active = view === id
          const hasBadge = id === 'updates' && updateAvailable

          return (
            <button
              key={id}
              type="button"
              onClick={() => onView(id)}
              className="relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-all duration-150"
              style={{
                background:   active ? t.SURFACE : 'transparent',
                border:       `1px solid ${active ? alpha(colors.teal, '22') : 'transparent'}`,
                color:        active ? colors.teal : t.TEXT_DIM,
              }}
              onMouseEnter={e => {
                if (!active) {
                  e.currentTarget.style.background  = t.CARD_BG
                  e.currentTarget.style.borderColor = t.BORDER
                  e.currentTarget.style.color       = t.TEXT
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  e.currentTarget.style.background  = 'transparent'
                  e.currentTarget.style.borderColor = 'transparent'
                  e.currentTarget.style.color       = t.TEXT_DIM
                }
              }}
            >
              {/* Active indicator */}
              {active && (
                <span
                  className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r"
                  style={{ background: colors.teal }}
                />
              )}

              <Icon
                size={15}
                strokeWidth={active ? 2.2 : 1.8}
                style={{ flexShrink: 0 }}
              />
              <span className="text-[12px] font-medium">{label}</span>

              {hasBadge && (
                <span
                  className="ml-auto h-1.5 w-1.5 rounded-full"
                  style={{ background: colors.teal, flexShrink: 0 }}
                />
              )}
            </button>
          )
        })}
      </nav>

      {/* User profile card footer */}
      <div className="border-t px-2 py-3" style={{ borderColor: t.BORDER }}>
        <UserProfileCard
          t={t}
          user={user}
          onLogout={onLogout}
          onView={onView}
        />
      </div>
    </div>
  )
}
