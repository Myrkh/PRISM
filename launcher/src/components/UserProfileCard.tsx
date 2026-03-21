/**
 * src/components/UserProfileCard.tsx — PRISM Launcher
 * Card profil utilisateur avec menu flottant.
 * Remplace le simple bouton logout de Sidebar.
 * Popup au clic : avatar, email, liens Settings + Déconnexion.
 */

import { useEffect, useRef, useState } from 'react'
import { Settings, LogOut, User, ChevronUp } from 'lucide-react'
import { colors, alpha } from '../tokens'
import type { ThemeTokens } from '../hooks/useTheme'
import type { AuthUser, LauncherView } from '../types'

interface UserProfileCardProps {
  t:        ThemeTokens
  user:     AuthUser
  onLogout: () => void
  onView:   (v: LauncherView) => void
}

export function UserProfileCard({ t, user, onLogout, onView }: UserProfileCardProps) {
  const [open, setOpen] = useState(false)
  const ref             = useRef<HTMLDivElement>(null)

  // Ferme le menu si clic extérieur
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative" ref={ref}>

      {/* Menu flottant — s'ouvre au-dessus */}
      {open && (
        <div
          className="absolute bottom-full left-2 right-2 mb-2 overflow-hidden rounded-2xl border"
          style={{
            background:  t.CARD_BG,
            borderColor: t.BORDER,
            boxShadow:   t.SHADOW_PANEL,
            zIndex:      50,
          }}
        >
          {/* Header card profil */}
          <div
            className="px-4 py-4"
            style={{ background: `radial-gradient(ellipse 120% 80% at 50% 0%, ${alpha(colors.teal, '0C')} 0%, transparent 70%), ${t.SURFACE}` }}
          >
            {/* Avatar grand format */}
            <div className="mb-3 flex items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[14px] font-black"
                style={{
                  background: `linear-gradient(135deg, ${colors.teal}, ${colors.tealDark})`,
                  color: '#041014',
                  boxShadow: `0 0 18px ${alpha(colors.teal, '30')}`,
                }}
              >
                {user.initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-bold" style={{ color: t.TEXT }}>
                  {user.fullName}
                </p>
                <p className="truncate text-[11px]" style={{ color: t.TEXT_DIM }}>
                  {user.email}
                </p>
              </div>
            </div>

            {/* Badge plan */}
            <div className="flex items-center gap-1.5">
              <span
                className="rounded-full border px-2 py-0.5 text-[9px] font-black tracking-wider"
                style={{
                  background:  alpha(colors.teal, '14'),
                  borderColor: alpha(colors.teal, '30'),
                  color:       colors.teal,
                }}
              >
                DESKTOP
              </span>
              <span className="text-[10px]" style={{ color: t.TEXT_DIM }}>IEC 61511</span>
            </div>
          </div>

          {/* Footer actions */}
          <div
            className="divide-y"
            style={{ borderColor: t.BORDER }}
          >
            <MenuAction
              t={t}
              Icon={User}
              label="Profil & compte"
              onClick={() => { setOpen(false); onView('settings') }}
            />
            <MenuAction
              t={t}
              Icon={Settings}
              label="Préférences"
              onClick={() => { setOpen(false); onView('settings') }}
            />
            <MenuAction
              t={t}
              Icon={LogOut}
              label="Se déconnecter"
              danger
              onClick={() => { setOpen(false); onLogout() }}
            />
          </div>
        </div>
      )}

      {/* Trigger — card compacte cliquable */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all duration-150"
        style={{
          background:  open ? t.SURFACE : t.CARD_BG,
          borderColor: open ? alpha(colors.teal, '30') : t.BORDER,
        }}
        onMouseEnter={e => {
          if (!open) e.currentTarget.style.borderColor = alpha(colors.teal, '20')
        }}
        onMouseLeave={e => {
          if (!open) e.currentTarget.style.borderColor = t.BORDER
        }}
      >
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-black"
          style={{ background: `linear-gradient(135deg, ${colors.teal}, ${colors.tealDark})`, color: '#041014' }}
        >
          {user.initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-[11px] font-semibold" style={{ color: t.TEXT }}>
            {user.fullName}
          </p>
          <p className="truncate text-[10px]" style={{ color: t.TEXT_DIM }}>
            {user.email}
          </p>
        </div>
        <ChevronUp
          size={13}
          className="shrink-0 transition-transform duration-200"
          style={{ color: t.TEXT_DIM, transform: open ? 'rotate(0deg)' : 'rotate(180deg)' }}
        />
      </button>
    </div>
  )
}

// ─── Menu action item ──────────────────────────────────────────────────────

function MenuAction({
  t, Icon, label, onClick, danger = false,
}: {
  t:        ThemeTokens
  Icon:     React.ElementType
  label:    string
  onClick:  () => void
  danger?:  boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[12px] font-medium transition-colors"
      style={{ color: danger ? '#EF4444' : t.TEXT_DIM }}
      onMouseEnter={e => {
        e.currentTarget.style.background = danger ? '#EF444410' : t.SURFACE
        e.currentTarget.style.color      = danger ? '#EF4444'   : t.TEXT
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color      = danger ? '#EF4444' : t.TEXT_DIM
      }}
    >
      <Icon size={13} style={{ flexShrink: 0 }} />
      {label}
    </button>
  )
}
