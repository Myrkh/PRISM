/**
 * TopBar.tsx — PRISM Launcher
 * Barre unique pleine largeur : branding | tabs | launch + user + theme + win controls.
 * Remplace TitleBar + TopNav. Zone drag native Windows.
 */

import { useState } from 'react'
import { Play, Sun, Moon, Minus, Square, X, LogOut, User, ChevronDown, Crown } from 'lucide-react'
import logoSrc from '../assets/logo.png'
import { colors, semantic, alpha } from '../tokens'
import { AccountModal } from './AccountModal'
import { useLocaleStrings } from '../i18n/useLocale'
import { setStoredLocale, useLocale } from '../i18n/useLocale'
import { getLauncherStrings } from '../i18n/launcher'
import type { ThemeTokens } from '../hooks/useTheme'
import type { AuthUser, LauncherView } from '../types'
import type { AppLocale } from '../i18n/types'

interface TopBarProps {
  t:             ThemeTokens
  view:          LauncherView
  user:          AuthUser
  ready:         boolean
  installed:     boolean
  launchError:   string | null
  onLaunch:      () => void
  onView:        (v: LauncherView) => void
  onLogout:      () => void
  onToggleTheme: () => void
  onUpdate:      (u: Partial<AuthUser>) => void
}

export function TopBar({ t, view, user, ready, installed, launchError, onLaunch, onView, onLogout, onToggleTheme, onUpdate }: TopBarProps) {
  const s = useLocaleStrings(getLauncherStrings)
  const [locale] = useLocale()

  const ALL_TABS: Array<{ id: LauncherView; label: string; adminOnly?: boolean }> = [
    { id: 'home',     label: s.nav.home     },
    { id: 'library',  label: s.nav.library  },
    { id: 'updates',  label: s.nav.updates  },
    { id: 'settings', label: s.nav.settings },
    { id: 'admin',    label: 'Admin',        adminOnly: true },
  ]
  const TABS = ALL_TABS.filter(tab => !tab.adminOnly || user.role === 'admin')

  return (
    <div
      className="drag flex h-11 shrink-0 select-none items-center"
      style={{ background: t.PANEL_BG, borderBottom: `1px solid ${t.BORDER}` }}
    >
      {/* ── Branding ── */}
      <div className="flex shrink-0 items-center gap-2.5 px-4">
        <img src={logoSrc} alt="PRISM" className="h-5 w-5 object-contain" style={{ opacity: 0.85 }} />
        <div className="leading-none">
          <p className="text-[12px] font-black tracking-tight" style={{ color: t.TEXT }}>PRISM</p>
          <p className="text-[8px] font-bold uppercase tracking-[0.18em]" style={{ color: colors.tealDim }}>Launcher</p>
        </div>
      </div>

      {/* ── Separator ── */}
      <div className="mx-3 h-4 w-px" style={{ background: t.BORDER }} />

      {/* ── Tabs ── */}
      <div className="flex h-full items-center gap-0.5">
        {TABS.map(({ id, label }) => {
          const active = view === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onView(id)}
              className="no-drag relative flex h-full items-center px-3.5 text-[11px] font-semibold transition-colors"
              style={{ color: active ? (id === 'admin' ? semantic.warning : colors.teal) : t.TEXT_DIM }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = t.TEXT }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = t.TEXT_DIM }}
            >
              <span className="flex items-center gap-1.5">
                {id === 'admin' && <Crown size={9} style={{ color: active ? semantic.warning : t.TEXT_DIM }} />}
                {label}
              </span>
              {active && (
                <span
                  className="absolute bottom-0 left-2 right-2 h-[2px] rounded-t-sm"
                  style={{ background: id === 'admin' ? semantic.warning : colors.teal }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* ── Spacer (drag zone) ── */}
      <div className="flex-1" />

      {/* ── Right actions (no-drag) ── */}
      <div className="no-drag flex items-center gap-1.5 pr-2">

        {/* Language */}
        <div className="flex items-center gap-0.5 rounded-md border p-0.5" style={{ borderColor: t.BORDER, background: alpha(t.TEXT, '03') }}>
          {(['fr', 'en'] as AppLocale[]).map(l => (
            <button
              key={l}
              type="button"
              onClick={() => setStoredLocale(l)}
              className="rounded px-1.5 py-0.5 text-[8px] font-bold uppercase transition-all"
              style={{
                background: locale === l ? t.SURFACE : 'transparent',
                color: locale === l ? t.TEXT : t.TEXT_DIM,
                boxShadow: locale === l ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
              }}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          title={t.isDark ? s.topBar.themeLight : s.topBar.themeDark}
          className="flex h-7 w-7 items-center justify-center rounded-lg transition-all"
          style={{ color: t.TEXT_DIM }}
          onMouseEnter={e => { e.currentTarget.style.background = alpha(t.TEXT, '07'); e.currentTarget.style.color = t.TEXT }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.TEXT_DIM }}
        >
          {t.isDark ? <Sun size={13} /> : <Moon size={13} />}
        </button>

        {/* User */}
        <UserMenu user={user} t={t} onLogout={onLogout} onUpdate={onUpdate} />

        {/* Separator */}
        <div className="mx-1 h-4 w-px" style={{ background: t.BORDER }} />

        {/* Launch button */}
        <button
          type="button"
          disabled={!installed}
          onClick={onLaunch}
          title={launchError ?? undefined}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-black uppercase tracking-wider transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${ready ? 'launch-glow' : ''}`}
          style={{
            background: ready
              ? `linear-gradient(135deg, ${colors.teal}, ${colors.tealDark})`
              : alpha(t.TEXT, '08'),
            color: ready ? '#041014' : t.TEXT_DIM,
            boxShadow: ready
              ? 'inset 0 1px 0 rgba(255,255,255,0.2), 0 3px 10px rgba(0,155,164,0.3)'
              : 'none',
          }}
        >
          <Play size={10} fill={ready ? '#041014' : t.TEXT_DIM} strokeWidth={0} />
          {s.topBar.launch}
        </button>

        {/* Separator */}
        <div className="mx-1 h-4 w-px" style={{ background: t.BORDER }} />

        {/* Window controls */}
        <WinBtn onClick={() => window.electron?.minimize?.()} title={s.topBar.minimize} t={t}>
          <Minus size={9} />
        </WinBtn>
        <WinBtn onClick={() => window.electron?.maximize?.()} title={s.topBar.maximize} t={t}>
          <Square size={8} />
        </WinBtn>
        <WinBtn onClick={() => window.electron?.close?.()} title={s.topBar.close} t={t} danger>
          <X size={9} />
        </WinBtn>
      </div>
    </div>
  )
}

// ── User menu ─────────────────────────────────────────────────────────────────

function UserMenu({ user, t, onLogout, onUpdate }: {
  user: AuthUser; t: ThemeTokens; onLogout: () => void; onUpdate: (u: Partial<AuthUser>) => void
}) {
  const [open, setOpen] = useState(false)
  const [showAccount, setShowAccount] = useState(false)
  const s = useLocaleStrings(getLauncherStrings)

  return (
    <div className="relative">
      {showAccount && (
        <AccountModal
          t={t}
          user={user}
          onClose={() => setShowAccount(false)}
          onUpdate={onUpdate}
        />
      )}

      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1 transition-all"
        style={{ color: t.TEXT_DIM }}
        onMouseEnter={e => { e.currentTarget.style.background = alpha(t.TEXT, '06') }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      >
        {/* Avatar */}
        <div
          className="flex h-6 w-6 shrink-0 items-center justify-center font-black"
          style={{
            fontSize: 9,
            background: `linear-gradient(135deg, ${colors.teal}, ${colors.tealDark})`,
            color: '#041014',
            borderRadius: 6,
          }}
        >
          {user.initials}
        </div>
        <span className="max-w-[80px] truncate text-[11px] font-semibold" style={{ color: t.TEXT }}>
          {user.fullName.split(' ')[0]}
        </span>
        <ChevronDown size={10} className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          {/* Dropdown */}
          <div
            className="card absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-xl border"
            style={{ background: t.CARD_BG, borderColor: t.BORDER }}
          >
            {/* User info header */}
            <div className="border-b px-3 py-2.5" style={{ borderColor: t.BORDER }}>
              <p className="text-[11px] font-semibold truncate" style={{ color: t.TEXT }}>{user.fullName}</p>
              <p className="text-[9px] truncate" style={{ color: t.TEXT_DIM }}>{user.email}</p>
            </div>
            {/* Actions */}
            <div className="py-1">
              <DropItem
                Icon={User}
                label={s.userCard.myAccount}
                onClick={() => { setOpen(false); setShowAccount(true) }}
                t={t}
              />
              <DropItem
                Icon={LogOut}
                label={s.userCard.logout}
                onClick={() => { setOpen(false); onLogout() }}
                t={t}
                danger
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function DropItem({ Icon, label, onClick, t, danger = false }: {
  Icon: React.ElementType; label: string; onClick: () => void; t: ThemeTokens; danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 px-3 py-2 text-[11px] font-medium transition-colors"
      style={{ color: danger ? alpha('#EF4444', 'CC') : t.TEXT_DIM }}
      onMouseEnter={e => {
        e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.08)' : alpha(t.TEXT, '05')
        e.currentTarget.style.color = danger ? '#EF4444' : t.TEXT
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color = danger ? alpha('#EF4444', 'CC') : t.TEXT_DIM
      }}
    >
      <Icon size={12} />
      {label}
    </button>
  )
}

// ── Window button ─────────────────────────────────────────────────────────────

function WinBtn({ children, onClick, title, t, danger = false }: {
  children: React.ReactNode; onClick: () => void; title: string; t: ThemeTokens; danger?: boolean
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
        e.currentTarget.style.color = danger ? '#EF4444' : t.TEXT
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color = alpha(t.TEXT_DIM, '65')
      }}
    >
      {children}
    </button>
  )
}
