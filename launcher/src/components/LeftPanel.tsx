/**
 * LeftPanel.tsx — PRISM Launcher
 * Panneau gauche : user card + bouton de lancement.
 * Le statut moteur est dans le FooterBar — pas de duplication.
 */

import { useState } from 'react'
import { Play, LogOut, User } from 'lucide-react'
import { colors, alpha } from '../tokens'
import { AccountModal } from './AccountModal'
import { useLocaleStrings } from '../i18n/useLocale'
import { getLauncherStrings } from '../i18n/launcher'
import type { ThemeTokens } from '../hooks/useTheme'
import type { AuthUser, LauncherView } from '../types'

interface LeftPanelProps {
  t:        ThemeTokens
  user:     AuthUser
  onLogout: () => void
  onView:   (v: LauncherView) => void
}

export function LeftPanel({ t, user, onLogout, onView }: LeftPanelProps) {
  // Engine ready state — used only for UserCard glow + launch button
  const [ready, setReady] = useState(false)
  useState(() => {
    const check = async () => {
      try {
        const r = await fetch('http://localhost:8000/health', { signal: AbortSignal.timeout(1500) })
        setReady(r.ok)
      } catch { setReady(false) }
    }
    void check()
    const id = setInterval(check, 10_000)
    return () => clearInterval(id)
  })

  return (
    <div
      className="relative flex h-full w-[220px] shrink-0 flex-col overflow-hidden noise"
      style={{
        background: t.PANEL_BG,
        borderRight: `1px solid ${t.BORDER}`,
      }}
    >
      {/* Ambient teal gradient — bottom */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-56"
        style={{
          background: `radial-gradient(ellipse 120% 60% at 50% 100%, ${alpha(colors.teal, '09')} 0%, transparent 70%)`,
        }}
      />

      {/* Vertical accent line right edge */}
      <div
        className="pointer-events-none absolute right-0 top-1/4 bottom-1/4 w-px"
        style={{
          background: `linear-gradient(180deg, transparent, ${alpha(colors.teal, '20')}, transparent)`,
        }}
      />

      <div className="relative flex flex-1 flex-col px-4 pb-5 pt-4">

        {/* ── User Card ── */}
        <UserCard user={user} t={t} ready={ready} onLogout={onLogout} onView={onView} />

        {/* ── Divider ── */}
        <div className="my-4 h-px" style={{ background: t.BORDER }} />

        {/* ── Launch Button ── */}
        <button
          type="button"
          disabled={!ready}
          onClick={() => window.electron?.launchPrism?.()}
          className={`group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-xl py-4 text-[12px] font-black uppercase tracking-widest transition-all duration-200 active:translate-y-px active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${ready ? 'launch-glow' : ''}`}
          style={{
            background: ready
              ? `linear-gradient(160deg, ${colors.teal} 0%, ${colors.tealDark} 100%)`
              : alpha(t.TEXT, '06'),
            color: ready ? '#041014' : t.TEXT_DIM,
            letterSpacing: '0.1em',
            border: `1px solid ${ready ? alpha(colors.teal, '40') : 'transparent'}`,
            boxShadow: ready
              ? 'inset 0 1px 0 rgba(255,255,255,0.22), 0 6px 20px rgba(0,155,164,0.35), 0 2px 6px rgba(0,0,0,0.2)'
              : 'none',
          }}
        >
          {ready && (
            <div
              className="pointer-events-none absolute inset-0 -translate-x-full opacity-0 transition-all duration-500 group-hover:translate-x-full group-hover:opacity-100"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)' }}
            />
          )}
          <Play size={14} fill={ready ? '#041014' : t.TEXT_DIM} strokeWidth={0} className="shrink-0" />
          Lancer PRISM
        </button>

        <div className="flex-1" />
      </div>
    </div>
  )
}

// ── User card ─────────────────────────────────────────────────────────────────

function UserCard({ user, t, ready, onLogout }: {
  user: AuthUser; t: ThemeTokens; ready: boolean
  onLogout: () => void; onView: (v: LauncherView) => void
}) {
  const [showAccount, setShowAccount] = useState(false)
  const [currentUser, setCurrentUser] = useState(user)
  const s = useLocaleStrings(getLauncherStrings)

  return (
    <div className="relative">
      {showAccount && (
        <AccountModal
          t={t}
          user={currentUser}
          onClose={() => setShowAccount(false)}
          onUpdate={patch => setCurrentUser(u => ({ ...u, ...patch }))}
        />
      )}

      <div
        className="card overflow-hidden rounded-2xl border"
        style={{
          borderColor: ready ? alpha(colors.teal, '30') : t.BORDER,
          background: alpha(t.RAIL_BG, 'DD'),
          transition: 'border-color 0.4s ease',
        }}
      >
        {/* Top teal accent line */}
        <div
          className="h-[2px] w-full transition-all duration-500"
          style={{
            background: ready
              ? `linear-gradient(90deg, transparent, ${colors.teal}, ${colors.tealDim}, transparent)`
              : `linear-gradient(90deg, transparent, ${alpha(t.BORDER, 'FF')}, transparent)`,
            opacity: ready ? 1 : 0.4,
          }}
        />

        <div className="px-3.5 py-3">
          <div className="mb-2.5 flex items-center gap-3">
            <Avatar user={currentUser} size={40} ready={ready} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-bold leading-tight" style={{ color: t.TEXT }}>
                {currentUser.fullName}
              </p>
              <p className="mt-0.5 truncate text-[9px] leading-tight" style={{ color: t.TEXT_DIM }}>
                {currentUser.email}
              </p>
            </div>
          </div>

          <div className="mb-2 h-px" style={{ background: alpha(t.BORDER, '80') }} />

          <div className="flex items-center justify-between">
            <ActionIcon title={s.userCard.myAccount} onClick={() => setShowAccount(true)} t={t}>
              <User size={12} />
            </ActionIcon>
            <ActionIcon title={s.userCard.logout} onClick={onLogout} t={t} danger>
              <LogOut size={12} />
            </ActionIcon>
          </div>
        </div>
      </div>
    </div>
  )
}

function Avatar({ user, size, ready }: { user: AuthUser; size: number; ready: boolean }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center font-black"
      style={{
        width: size, height: size,
        fontSize: size * 0.36,
        background: `linear-gradient(135deg, ${colors.teal}, ${colors.tealDark})`,
        color: '#041014',
        borderRadius: size * 0.3,
        boxShadow: ready
          ? `0 0 0 2px ${alpha(colors.teal, '20')}, 0 4px 12px ${alpha(colors.teal, '30')}`
          : '0 2px 6px rgba(0,0,0,0.25)',
        transition: 'box-shadow 0.4s ease',
      }}
    >
      {user.initials}
    </div>
  )
}

function ActionIcon({ children, onClick, title, t, danger = false }: {
  children: React.ReactNode; onClick: () => void
  title: string; t: ThemeTokens; danger?: boolean
}) {
  return (
    <button
      type="button" title={title} onClick={onClick}
      className="flex h-6 w-6 items-center justify-center rounded-lg transition-all active:scale-95"
      style={{ color: danger ? alpha('#EF4444', '99') : t.TEXT_DIM, background: 'transparent' }}
      onMouseEnter={e => {
        e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.10)' : alpha(t.TEXT, '08')
        e.currentTarget.style.color = danger ? '#EF4444' : t.TEXT
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color = danger ? alpha('#EF4444', '99') : t.TEXT_DIM
      }}
    >
      {children}
    </button>
  )
}
