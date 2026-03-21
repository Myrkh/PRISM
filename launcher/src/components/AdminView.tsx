/**
 * AdminView.tsx — PRISM Launcher
 * Panel d'administration : utilisateurs | licence | journal.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Users, Key, ScrollText, Plus, Edit2, Power, Crown,
  User, Check, X, Eye, EyeOff, Loader2, RefreshCw,
  LogIn, UserPlus, Settings, AlertTriangle, Shield,
} from 'lucide-react'
import { colors, semantic, alpha } from '../tokens'
import { useLocaleStrings } from '../i18n/useLocale'
import { getLauncherStrings } from '../i18n/launcher'
import type { ThemeTokens } from '../hooks/useTheme'
import type { AuthUser, AdminUser, LicenseInfo, AuditEntry } from '../types'

type AdminTab = 'users' | 'license' | 'audit'

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)   return 'À l\'instant'
  if (m < 60)  return `Il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24)  return `Il y a ${h}h`
  const d = Math.floor(h / 24)
  if (d < 7)   return `Il y a ${d}j`
  return new Date(iso).toLocaleDateString('fr-FR')
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

// ── Composant Modal utilisateur ───────────────────────────────────────────────

function UserModal({ user, sessionToken, t, onClose, onSave }: {
  user: AdminUser | null
  sessionToken: string
  t: ThemeTokens
  onClose: () => void
  onSave: () => void
}) {
  const s   = useLocaleStrings(getLauncherStrings)
  const isNew = !user
  const [fullName, setFullName] = useState(user?.fullName ?? '')
  const [email,    setEmail]    = useState(user?.email    ?? '')
  const [role,     setRole]     = useState<'admin' | 'user'>(user?.role ?? 'user')
  const [pass,     setPass]     = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const handleSave = async () => {
    setError(null)
    if (isNew && (!email || !fullName || !pass)) { setError(s.admin.errRequired); return }
    if (isNew && pass.length < 8) { setError(s.admin.errMinLength); return }
    setLoading(true)
    try {
      if (isNew) {
        const r = await window.electron?.createUser({ token: sessionToken, email, fullName, password: pass, role })
        if (!r?.ok) throw new Error(r?.error)
      } else {
        const patches: Record<string, unknown> = { full_name: fullName, role }
        if (pass) patches.password = pass
        const r = await window.electron?.updateUser({ token: sessionToken, userId: user!.id, patches })
        if (!r?.ok) throw new Error(s.admin.errUpdateFailed)
      }
      onSave()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally { setLoading(false) }
  }

  const fieldStyle = {
    background: alpha(t.SURFACE, 'CC'),
    color: t.TEXT,
    border: `1px solid ${t.BORDER}`,
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 12,
    outline: 'none',
    width: '100%',
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div
        className="card fixed left-1/2 top-1/2 z-50 w-[380px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border"
        style={{ background: t.CARD_BG, borderColor: t.BORDER }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: t.BORDER }}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: alpha(colors.teal, '12') }}>
              {isNew ? <UserPlus size={14} style={{ color: colors.teal }} /> : <Edit2 size={14} style={{ color: colors.teal }} />}
            </div>
            <p className="text-[13px] font-bold" style={{ color: t.TEXT }}>
              {isNew ? s.admin.newTitle : s.admin.editTitle}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 transition-all hover:opacity-70" style={{ color: t.TEXT_DIM }}>
            <X size={14} />
          </button>
        </div>

        <div className="space-y-3 p-5">
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider" style={{ color: t.TEXT_DIM }}>{s.admin.fieldName}</label>
            <input style={fieldStyle} value={fullName} onChange={e => setFullName(e.target.value)}
              onFocus={e => (e.currentTarget.style.borderColor = alpha(colors.teal, '50'))}
              onBlur={e  => (e.currentTarget.style.borderColor = t.BORDER)}
            />
          </div>

          {isNew && (
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider" style={{ color: t.TEXT_DIM }}>{s.admin.fieldEmail}</label>
              <input type="email" style={fieldStyle} value={email} onChange={e => setEmail(e.target.value)}
                onFocus={e => (e.currentTarget.style.borderColor = alpha(colors.teal, '50'))}
                onBlur={e  => (e.currentTarget.style.borderColor = t.BORDER)}
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider" style={{ color: t.TEXT_DIM }}>
              {isNew ? s.admin.fieldPassword : s.admin.fieldPasswordOpt}
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                style={{ ...fieldStyle, paddingRight: 40 }}
                value={pass}
                onChange={e => setPass(e.target.value)}
                placeholder={isNew ? s.admin.errMinLength : s.admin.fieldPasswordOpt}
                onFocus={e => (e.currentTarget.style.borderColor = alpha(colors.teal, '50'))}
                onBlur={e  => (e.currentTarget.style.borderColor = t.BORDER)}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 opacity-50 hover:opacity-100"
                style={{ color: t.TEXT_DIM }}
              >
                {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider" style={{ color: t.TEXT_DIM }}>{s.admin.fieldRole}</label>
            <div className="flex gap-2">
              {(['user', 'admin'] as const).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-bold transition-all"
                  style={{
                    background: role === r ? (r === 'admin' ? alpha(semantic.warning, '15') : alpha(colors.teal, '15')) : alpha(t.TEXT, '04'),
                    color: role === r ? (r === 'admin' ? semantic.warning : colors.teal) : t.TEXT_DIM,
                    border: `1px solid ${role === r ? (r === 'admin' ? alpha(semantic.warning, '30') : alpha(colors.teal, '30')) : t.BORDER}`,
                  }}
                >
                  {r === 'admin' ? <Crown size={11} /> : <User size={11} />}
                  {r === 'admin' ? s.admin.roleAdmin : s.admin.roleUser}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border px-3 py-2 text-[11px]" style={{ background: alpha(semantic.error, '10'), borderColor: alpha(semantic.error, '25'), color: semantic.error }}>
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t px-5 pb-5 pt-3" style={{ borderColor: t.BORDER }}>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl py-2.5 text-[11px] font-semibold transition-all hover:opacity-80"
            style={{ background: alpha(t.TEXT, '06'), color: t.TEXT_DIM }}
          >
            {s.admin.cancelBtn}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-[11px] font-bold transition-all active:scale-95 disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${colors.teal}, ${colors.tealDark})`, color: '#041014' }}
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <><Check size={13} />{isNew ? s.admin.createBtn : s.admin.saveBtn}</>}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Tab Utilisateurs ──────────────────────────────────────────────────────────

function UsersTab({ currentUser, sessionToken, t }: { currentUser: AuthUser; sessionToken: string; t: ThemeTokens }) {
  const s = useLocaleStrings(getLauncherStrings)
  const [users,   setUsers]   = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState<AdminUser | null | 'new'>()

  const load = useCallback(async () => {
    setLoading(true)
    const data = await window.electron?.getUsers(sessionToken)
    setUsers((data ?? []) as AdminUser[])
    setLoading(false)
  }, [sessionToken])

  useEffect(() => { void load() }, [load])

  const handleToggle = async (u: AdminUser) => {
    await window.electron?.updateUser({
      token: sessionToken,
      userId: u.id,
      patches: { active: u.active ? 0 : 1 },
    })
    void load()
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[14px] font-bold" style={{ color: t.TEXT }}>{s.admin.usersTitle}</p>
          <p className="text-[11px]" style={{ color: t.TEXT_DIM }}>
            {users.length} {s.admin.colUser.toLowerCase()} · {users.filter(u => u.active).length} {s.admin.colLastLogin.split(' ')[0].toLowerCase()}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModal('new')}
          className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[11px] font-bold transition-all active:scale-95"
          style={{ background: `linear-gradient(135deg, ${colors.teal}, ${colors.tealDark})`, color: '#041014', boxShadow: `0 3px 10px ${alpha(colors.teal, '30')}` }}
        >
          <Plus size={12} />
          {s.admin.usersNew}
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden rounded-2xl border" style={{ borderColor: t.BORDER, background: t.CARD_BG }}>
        {/* Head */}
        <div
          className="grid grid-cols-[1fr_100px_100px_80px] gap-4 border-b px-5 py-2.5"
          style={{ borderColor: t.BORDER, background: alpha(t.TEXT, '02') }}
        >
          {[s.admin.colUser, s.admin.colRole, s.admin.colLastLogin, ''].map(h => (
            <span key={h} className="text-[9px] font-black uppercase tracking-widest" style={{ color: t.TEXT_DIM }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin" style={{ color: t.TEXT_DIM }} />
          </div>
        ) : (
          users.map((u, i) => (
            <div
              key={u.id}
              className="grid grid-cols-[1fr_100px_100px_80px] items-center gap-4 border-b px-5 py-3.5 transition-colors"
              style={{ borderColor: i === users.length - 1 ? 'transparent' : alpha(t.BORDER, '60') }}
            >
              {/* Identity */}
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-black"
                  style={{
                    background: u.active
                      ? `linear-gradient(135deg, ${alpha(colors.teal, '25')}, ${alpha(colors.teal, '10')})`
                      : alpha(t.TEXT, '06'),
                    color: u.active ? colors.teal : t.TEXT_DIM,
                    border: `1px solid ${u.active ? alpha(colors.teal, '25') : t.BORDER}`,
                  }}
                >
                  {u.initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-semibold" style={{ color: u.active ? t.TEXT : t.TEXT_DIM }}>
                    {u.fullName}
                    {u.id === currentUser.id && (
                      <span className="ml-1.5 text-[9px] font-normal" style={{ color: t.TEXT_DIM }}>{s.admin.youLabel}</span>
                    )}
                  </p>
                  <p className="truncate text-[10px]" style={{ color: t.TEXT_DIM }}>{u.email}</p>
                </div>
              </div>

              {/* Role */}
              <span
                className="inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black tracking-wider"
                style={u.role === 'admin'
                  ? { background: alpha(semantic.warning, '12'), color: semantic.warning }
                  : { background: alpha(colors.teal, '10'), color: colors.tealDim }
                }
              >
                {u.role === 'admin' ? <Crown size={8} /> : <User size={8} />}
                {u.role === 'admin' ? s.admin.roleAdmin : s.admin.roleUser}
              </span>

              {/* Last login */}
              <span className="text-[10px]" style={{ color: t.TEXT_DIM }}>{timeAgo(u.lastLogin)}</span>

              {/* Actions */}
              <div className="flex items-center justify-end gap-1">
                <button
                  type="button"
                  title="Modifier"
                  onClick={() => setModal(u)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg transition-all hover:opacity-80"
                  style={{ background: alpha(t.TEXT, '06'), color: t.TEXT_DIM }}
                >
                  <Edit2 size={11} />
                </button>
                {u.id !== currentUser.id && (
                  <button
                    type="button"
                    title={u.active ? 'Désactiver' : 'Activer'}
                    onClick={() => handleToggle(u)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg transition-all hover:opacity-80"
                    style={{
                      background: u.active ? alpha(semantic.error, '10') : alpha(semantic.success, '10'),
                      color: u.active ? semantic.error : semantic.success,
                    }}
                  >
                    <Power size={11} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      {modal && (
        <UserModal
          user={modal === 'new' ? null : modal}
          sessionToken={sessionToken}
          t={t}
          onClose={() => setModal(undefined)}
          onSave={load}
        />
      )}
    </div>
  )
}

// ── Tab Licence ───────────────────────────────────────────────────────────────

function LicenseTab({ sessionToken, t }: { sessionToken: string; t: ThemeTokens }) {
  const s = useLocaleStrings(getLauncherStrings)
  const [license, setLicense] = useState<LicenseInfo | null>(null)
  const [users,   setUsers]   = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      window.electron?.getLicense(sessionToken),
      window.electron?.getUsers(sessionToken),
    ]).then(([lic, usr]) => {
      setLicense(lic as LicenseInfo ?? null)
      setUsers((usr ?? []) as AdminUser[])
      setLoading(false)
    })
  }, [])

  const days    = daysUntil(license?.expires_at ?? null)
  const used    = users.filter(u => u.active).length
  const pct     = license ? Math.min((used / license.seats) * 100, 100) : 0
  const expColor = days === null ? colors.tealDim : days < 30 ? semantic.error : days < 90 ? semantic.warning : semantic.success

  if (loading) {
    return <div className="flex flex-1 items-center justify-center"><Loader2 size={20} className="animate-spin" style={{ color: t.TEXT_DIM }} /></div>
  }

  if (!license) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border" style={{ background: alpha(semantic.warning, '08'), borderColor: alpha(semantic.warning, '25') }}>
          <Key size={24} style={{ color: semantic.warning }} />
        </div>
        <div className="text-center">
          <p className="text-[14px] font-bold" style={{ color: t.TEXT }}>{s.admin.noLicense}</p>
          <p className="mt-1 text-[11px]" style={{ color: t.TEXT_DIM }}>{s.admin.noLicenseHint}</p>
        </div>
        <a
          href="mailto:contact@prism-engineering.io"
          className="rounded-xl px-4 py-2 text-[11px] font-bold transition-all hover:opacity-80"
          style={{ background: alpha(colors.teal, '12'), color: colors.teal, border: `1px solid ${alpha(colors.teal, '25')}` }}
        >
          {s.admin.contactBtn}
        </a>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
      {/* Licence card principale */}
      <div className="card overflow-hidden rounded-2xl border" style={{ borderColor: alpha(colors.teal, '25'), background: alpha(colors.teal, '03') }}>
        <div className="flex items-center gap-2 border-b px-5 py-2.5" style={{ borderColor: alpha(colors.teal, '15') }}>
          <div className="h-1.5 w-1.5 rounded-full" style={{ background: colors.teal, boxShadow: `0 0 6px ${colors.teal}` }} />
          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: colors.teal }}>{s.admin.activeBadge}</span>
        </div>

        <div className="grid grid-cols-2 gap-6 p-5">
          <div>
            <p className="mb-0.5 text-[9px] font-black uppercase tracking-wider" style={{ color: t.TEXT_DIM }}>{s.admin.fieldCompany}</p>
            <p className="text-[15px] font-bold" style={{ color: t.TEXT }}>{license.company}</p>
          </div>
          <div>
            <p className="mb-0.5 text-[9px] font-black uppercase tracking-wider" style={{ color: t.TEXT_DIM }}>{s.admin.fieldKey}</p>
            <p className="font-mono text-[12px]" style={{ color: t.TEXT_DIM }}>{license.key_display}</p>
          </div>
          <div>
            <p className="mb-0.5 text-[9px] font-black uppercase tracking-wider" style={{ color: t.TEXT_DIM }}>{s.admin.fieldActivated}</p>
            <p className="text-[12px]" style={{ color: t.TEXT }}>
              {new Date(license.activated_at).toLocaleDateString('fr-FR')}
            </p>
          </div>
          <div>
            <p className="mb-0.5 text-[9px] font-black uppercase tracking-wider" style={{ color: t.TEXT_DIM }}>{s.admin.fieldExpiry}</p>
            {days === null ? (
              <p className="text-[12px]" style={{ color: semantic.success }}>{s.admin.perpetual}</p>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-[12px]" style={{ color: expColor }}>
                  {new Date(license.expires_at!).toLocaleDateString('fr-FR')}
                </p>
                {days < 90 && (
                  <span className="rounded-full px-2 py-0.5 text-[8px] font-black" style={{ background: alpha(expColor, '15'), color: expColor }}>
                    {s.admin.daysLeft.replace('{n}', String(days))}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Postes */}
      <div className="card rounded-2xl border p-5" style={{ borderColor: t.BORDER, background: t.CARD_BG }}>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[13px] font-bold" style={{ color: t.TEXT }}>{s.admin.seatsTitle}</p>
            <p className="text-[11px]" style={{ color: t.TEXT_DIM }}>{used} / {license.seats}</p>
          </div>
          <span
            className="text-[22px] font-black"
            style={{ color: pct >= 100 ? semantic.error : pct >= 80 ? semantic.warning : colors.teal }}
          >
            {used}/{license.seats}
          </span>
        </div>

        {/* Gauge */}
        <div className="overflow-hidden rounded-full" style={{ height: 8, background: alpha(t.TEXT, '06') }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: pct >= 100 ? semantic.error : pct >= 80
                ? `linear-gradient(90deg, ${semantic.warning}, ${semantic.error})`
                : `linear-gradient(90deg, ${colors.teal}, ${colors.tealDim})`,
              boxShadow: `0 0 8px ${alpha(pct >= 100 ? semantic.error : colors.teal, '40')}`,
            }}
          />
        </div>

        {pct >= 100 && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border px-3 py-2" style={{ background: alpha(semantic.error, '08'), borderColor: alpha(semantic.error, '20') }}>
            <AlertTriangle size={12} style={{ color: semantic.error }} />
            <p className="text-[10px]" style={{ color: semantic.error }}>{s.admin.seatsLimit}</p>
          </div>
        )}
      </div>

      {/* Contact */}
      <div className="rounded-xl border px-4 py-3" style={{ borderColor: t.BORDER, background: alpha(t.TEXT, '02') }}>
        <div className="flex items-center gap-3">
          <Shield size={14} style={{ color: t.TEXT_DIM }} />
          <div>
            <p className="text-[11px] font-semibold" style={{ color: t.TEXT }}>{s.admin.renewTitle}</p>
            <p className="text-[10px]" style={{ color: t.TEXT_DIM }}>{s.admin.renewContact}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Tab Journal ───────────────────────────────────────────────────────────────

function useActionCfg() {
  const s = useLocaleStrings(getLauncherStrings)
  return {
    LOGIN:        { icon: LogIn,    color: semantic.success, label: s.admin.actionLogin        },
    LOGIN_FAILED: { icon: LogIn,    color: semantic.error,   label: s.admin.actionLoginFailed  },
    USER_CREATED: { icon: UserPlus, color: semantic.info,    label: s.admin.actionUserCreated  },
    USER_UPDATED: { icon: Settings, color: semantic.warning, label: s.admin.actionUserUpdated  },
    LICENSE_SET:  { icon: Key,      color: colors.tealDim,   label: s.admin.actionLicenseSet   },
  } as Record<string, { icon: React.ElementType; color: string; label: string }>
}

function AuditTab({ sessionToken, t }: { sessionToken: string; t: ThemeTokens }) {
  const s         = useLocaleStrings(getLauncherStrings)
  const actionCfg = useActionCfg()
  const [entries,  setEntries]  = useState<AuditEntry[]>([])
  const [loading,  setLoading]  = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true)
    const data = await window.electron?.getAudit(sessionToken)
    setEntries((data ?? []) as AuditEntry[])
    setLoading(false)
    setRefreshing(false)
  }, [sessionToken])

  useEffect(() => { void load() }, [load])

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[14px] font-bold" style={{ color: t.TEXT }}>{s.admin.auditTitle}</p>
          <p className="text-[11px]" style={{ color: t.TEXT_DIM }}>{entries.length}</p>
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-all hover:opacity-80"
          style={{ background: alpha(t.TEXT, '06'), color: t.TEXT_DIM }}
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="card flex-1 overflow-y-auto rounded-2xl border" style={{ borderColor: t.BORDER, background: t.CARD_BG, scrollbarGutter: 'stable' }}>
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 size={20} className="animate-spin" style={{ color: t.TEXT_DIM }} />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2">
            <ScrollText size={20} style={{ color: t.TEXT_DIM, opacity: 0.4 }} />
            <p className="text-[11px]" style={{ color: alpha(t.TEXT_DIM, '60') }}>{s.admin.auditEmpty}</p>
          </div>
        ) : (
          entries.map((e, i) => {
            const cfg = actionCfg[e.action] ?? { icon: ScrollText, color: t.TEXT_DIM, label: e.action }
            const Icon = cfg.icon
            return (
              <div
                key={e.id}
                className="flex items-start gap-3 border-b px-5 py-3"
                style={{ borderColor: i === entries.length - 1 ? 'transparent' : alpha(t.BORDER, '60') }}
              >
                {/* Icon */}
                <div
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: alpha(cfg.color, '12'), border: `1px solid ${alpha(cfg.color, '20')}` }}
                >
                  <Icon size={12} style={{ color: cfg.color }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold" style={{ color: t.TEXT }}>{cfg.label}</p>
                    <span className="shrink-0 text-[9px]" style={{ color: t.TEXT_DIM }}>{timeAgo(e.timestamp)}</span>
                  </div>
                  {e.user_email && (
                    <p className="mt-0.5 text-[10px]" style={{ color: t.TEXT_DIM }}>{e.user_email}</p>
                  )}
                  {e.detail && (
                    <p className="mt-0.5 font-mono text-[9px]" style={{ color: alpha(t.TEXT_DIM, '70') }}>{e.detail}</p>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function AdminView({ t, user, sessionToken }: { t: ThemeTokens; user: AuthUser; sessionToken: string }) {
  const s   = useLocaleStrings(getLauncherStrings)
  const [tab, setTab] = useState<AdminTab>('users')

  const TABS: Array<{ id: AdminTab; label: string; Icon: React.ElementType }> = [
    { id: 'users',   label: s.admin.tabUsers,   Icon: Users      },
    { id: 'license', label: s.admin.tabLicense, Icon: Key        },
    { id: 'audit',   label: s.admin.tabAudit,   Icon: ScrollText },
  ]

  return (
    <div className="flex flex-1 overflow-hidden" style={{ background: t.PAGE_BG }}>

      {/* Left sidebar — admin nav */}
      <div
        className="flex w-[200px] shrink-0 flex-col border-r p-4"
        style={{ borderColor: t.BORDER, background: alpha(t.PANEL_BG, 'CC') }}
      >
        {/* Header */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-1">
            <Crown size={12} style={{ color: semantic.warning }} />
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: semantic.warning }}>Administration</p>
          </div>
          <p className="text-[11px] font-semibold truncate" style={{ color: t.TEXT }}>{user.fullName}</p>
          <p className="text-[9px] truncate" style={{ color: t.TEXT_DIM }}>{user.email}</p>
        </div>

        {/* Nav */}
        <nav className="space-y-0.5">
          {TABS.map(({ id, label, Icon }) => {
            const active = tab === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[11px] font-semibold transition-all"
                style={{
                  background: active ? alpha(colors.teal, '12') : 'transparent',
                  color: active ? colors.teal : t.TEXT_DIM,
                  border: `1px solid ${active ? alpha(colors.teal, '20') : 'transparent'}`,
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = alpha(t.TEXT, '05') }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                <Icon size={13} />
                {label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden p-6">
        {tab === 'users'   && <UsersTab   currentUser={user} sessionToken={sessionToken} t={t} />}
        {tab === 'license' && <LicenseTab sessionToken={sessionToken} t={t} />}
        {tab === 'audit'   && <AuditTab   sessionToken={sessionToken} t={t} />}
      </div>

    </div>
  )
}
