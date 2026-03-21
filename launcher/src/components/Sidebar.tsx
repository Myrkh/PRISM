/**
 * src/components/Sidebar.tsx — PRISM Launcher
 * Icon rail 64px — style game launcher.
 */

import { useState, useRef, useEffect } from 'react'
import { Home, RefreshCw, Settings, LayoutGrid, LogOut, User, ChevronRight } from 'lucide-react'
import { colors, alpha } from '../tokens'
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
  { id: 'home',     label: 'Accueil',   Icon: Home       },
  { id: 'library',  label: 'Library',   Icon: LayoutGrid },
  { id: 'updates',  label: 'Updates',   Icon: RefreshCw  },
  { id: 'settings', label: 'Config',    Icon: Settings   },
]

export function Sidebar({ t, view, onView, user, onLogout, updateAvailable }: SidebarProps) {
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!profileOpen) return
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [profileOpen])

  return (
    <div
      className="relative flex h-full w-16 shrink-0 flex-col items-center py-3 gap-1"
      style={{ background: t.RAIL_BG }}
    >
      {/* Subtle right border glow */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-px"
        style={{ background: `linear-gradient(180deg, transparent, ${alpha(colors.teal, '18')} 40%, ${alpha(colors.teal, '18')} 60%, transparent)` }}
      />

      {/* Logo */}
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
        style={{
          background: alpha(colors.teal, '12'),
          border: `1px solid ${alpha(colors.teal, '28')}`,
          boxShadow: `0 0 20px ${alpha(colors.teal, '18')}`,
        }}
      >
        <img src="/logo.png" alt="PRISM" className="h-5 w-5 object-contain" />
      </div>

      {/* Divider */}
      <div className="mb-2 h-px w-8" style={{ background: t.BORDER }} />

      {/* Nav items */}
      <nav className="flex flex-col items-center gap-1 w-full px-2">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const active = view === id
          const hasBadge = id === 'updates' && updateAvailable
          return (
            <button
              key={id}
              type="button"
              title={label}
              onClick={() => onView(id)}
              className="relative flex flex-col items-center justify-center gap-1 rounded-xl w-full py-2.5 transition-all duration-150"
              style={{
                background: active
                  ? `linear-gradient(135deg, ${alpha(colors.teal, '20')}, ${alpha(colors.teal, '10')})`
                  : 'transparent',
                color: active ? colors.teal : t.TEXT_DIM,
                boxShadow: active ? `0 0 16px ${alpha(colors.teal, '20')}, inset 0 1px 0 ${alpha(colors.teal, '15')}` : 'none',
                border: `1px solid ${active ? alpha(colors.teal, '25') : 'transparent'}`,
              }}
              onMouseEnter={e => {
                if (!active) {
                  e.currentTarget.style.background = alpha(t.TEXT, '06')
                  e.currentTarget.style.color = t.TEXT
                  e.currentTarget.style.border = `1px solid ${alpha(t.TEXT, '08')}`
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = t.TEXT_DIM
                  e.currentTarget.style.border = '1px solid transparent'
                }
              }}
            >
              {hasBadge && (
                <span
                  className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full"
                  style={{ background: colors.teal, boxShadow: `0 0 6px ${colors.teal}` }}
                />
              )}
              <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
              <span className="text-[9px] font-bold tracking-wide uppercase leading-none">
                {label}
              </span>
            </button>
          )
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Divider */}
      <div className="mb-2 h-px w-8" style={{ background: t.BORDER }} />

      {/* User avatar + popup */}
      <div className="relative px-2 w-full" ref={profileRef}>
        {profileOpen && (
          <div
            className="absolute bottom-full left-0 mb-2 w-52 overflow-hidden rounded-2xl border slide-in-left"
            style={{
              background: t.CARD_BG,
              borderColor: alpha(colors.teal, '20'),
              boxShadow: t.SHADOW_PANEL,
              zIndex: 50,
            }}
          >
            {/* Profile header */}
            <div
              className="px-4 py-4"
              style={{
                background: `radial-gradient(ellipse 120% 80% at 50% 0%, ${alpha(colors.teal, '10')} 0%, transparent 70%), ${t.SURFACE}`,
              }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[12px] font-black"
                  style={{
                    background: `linear-gradient(135deg, ${colors.teal}, ${colors.tealDark})`,
                    color: '#041014',
                    boxShadow: `0 0 16px ${alpha(colors.teal, '30')}`,
                  }}
                >
                  {user.initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-bold" style={{ color: t.TEXT }}>{user.fullName}</p>
                  <p className="truncate text-[10px]" style={{ color: t.TEXT_DIM }}>{user.email}</p>
                </div>
              </div>
              <span
                className="inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black tracking-wider"
                style={{ background: alpha(colors.teal, '14'), borderColor: alpha(colors.teal, '30'), color: colors.teal }}
              >
                DESKTOP · IEC 61511
              </span>
            </div>

            {/* Actions */}
            <div className="divide-y" style={{ borderColor: t.BORDER }}>
              <ProfileAction Icon={User}    label="Profil & compte" onClick={() => { setProfileOpen(false) }} t={t} />
              <ProfileAction Icon={Settings} label="Préférences"     onClick={() => { setProfileOpen(false) }} t={t} />
              <ProfileAction Icon={LogOut}  label="Déconnexion"      onClick={() => { setProfileOpen(false); onLogout() }} t={t} danger />
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setProfileOpen(v => !v)}
          className="flex w-full items-center justify-center rounded-xl py-2 transition-all duration-150"
          style={{
            background: profileOpen ? alpha(colors.teal, '12') : 'transparent',
            border: `1px solid ${profileOpen ? alpha(colors.teal, '25') : 'transparent'}`,
          }}
          onMouseEnter={e => {
            if (!profileOpen) {
              e.currentTarget.style.background = alpha(t.TEXT, '06')
              e.currentTarget.style.border = `1px solid ${alpha(t.TEXT, '08')}`
            }
          }}
          onMouseLeave={e => {
            if (!profileOpen) {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.border = '1px solid transparent'
            }
          }}
          title={user.fullName}
        >
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-black"
            style={{
              background: `linear-gradient(135deg, ${colors.teal}, ${colors.tealDark})`,
              color: '#041014',
            }}
          >
            {user.initials}
          </div>
        </button>

        {profileOpen && (
          <div className="mt-1 flex items-center justify-center gap-1">
            <ChevronRight size={10} style={{ color: t.TEXT_DIM, transform: 'rotate(-90deg)' }} />
          </div>
        )}
      </div>
    </div>
  )
}

function ProfileAction({ Icon, label, onClick, t, danger = false }: {
  Icon:    React.ElementType
  label:   string
  onClick: () => void
  t:       ThemeTokens
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[12px] font-medium transition-colors"
      style={{ color: danger ? '#EF4444' : t.TEXT_DIM }}
      onMouseEnter={e => {
        e.currentTarget.style.background = danger ? '#EF444410' : t.SURFACE
        e.currentTarget.style.color = danger ? '#EF4444' : t.TEXT
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color = danger ? '#EF4444' : t.TEXT_DIM
      }}
    >
      <Icon size={13} style={{ flexShrink: 0 }} />
      {label}
    </button>
  )
}
