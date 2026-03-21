/**
 * AccountModal.tsx — PRISM Launcher
 * Modale compte utilisateur : profil, email, mot de passe.
 */

import { useState, useEffect, useRef, type FormEvent } from 'react'
import { X, User, Mail, Lock, Eye, EyeOff, CheckCircle2, Loader2, Shield } from 'lucide-react'
import { colors, semantic, alpha } from '../tokens'
import type { ThemeTokens } from '../hooks/useTheme'
import type { AuthUser } from '../types'

const ACCENT_COLORS = [
  colors.teal, '#8B5CF6', '#3B82F6', '#EC4899', '#F59E0B', '#10B981',
]

interface AccountModalProps {
  t:       ThemeTokens
  user:    AuthUser
  onClose: () => void
  onUpdate?: (u: Partial<AuthUser>) => void
}

export function AccountModal({ t, user, onClose, onUpdate }: AccountModalProps) {
  const [tab, setTab]           = useState<'profile' | 'security'>('profile')
  const [fullName, setFullName] = useState(user.fullName)
  const [accent, setAccent]     = useState<string>(colors.teal)
  const [saving, setSaving]     = useState(false)
  const [saved,  setSaved]      = useState(false)

  // Security tab
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd,     setNewPwd]     = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showPwd,    setShowPwd]    = useState(false)
  const [pwdError,   setPwdError]   = useState<string | null>(null)
  const [pwdSaving,  setPwdSaving]  = useState(false)
  const [pwdSaved,   setPwdSaved]   = useState(false)

  const overlayRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  // Close on overlay click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose()
  }

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await new Promise(r => setTimeout(r, 700))
    const parts = fullName.trim().split(/\s+/)
    const initials = parts.length === 1
      ? parts[0].slice(0, 2).toUpperCase()
      : `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    onUpdate?.({ fullName: fullName.trim(), initials })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleSavePassword = async (e: FormEvent) => {
    e.preventDefault()
    setPwdError(null)
    if (newPwd !== confirmPwd) { setPwdError('Les mots de passe ne correspondent pas.'); return }
    if (newPwd.length < 8)     { setPwdError('Minimum 8 caractères.'); return }
    setPwdSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setPwdSaving(false)
    setPwdSaved(true)
    setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
    setTimeout(() => setPwdSaved(false), 2500)
  }

  const initials = (() => {
    const parts = fullName.trim().split(/\s+/)
    return parts.length === 1
      ? parts[0].slice(0, 2).toUpperCase()
      : `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  })()

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)', zIndex: 100, backdropFilter: 'blur(4px)' }}
      onClick={handleOverlayClick}
    >
      <div
        className="fade-up relative w-full max-w-[440px] overflow-hidden rounded-2xl"
        style={{
          background: t.CARD_BG,
          border: `1px solid ${t.BORDER}`,
          boxShadow: `0 32px 64px rgba(0,0,0,0.45), 0 0 0 1px ${alpha(colors.teal, '08')}`,
        }}
      >
        {/* Top accent */}
        <div
          className="h-[2px]"
          style={{ background: `linear-gradient(90deg, transparent, ${colors.teal}, ${colors.tealDim}, transparent)` }}
        />

        {/* Header */}
        <div
          className="flex items-center justify-between border-b px-5 py-4"
          style={{ borderColor: t.BORDER, background: alpha(t.PANEL_BG, 'CC') }}
        >
          <div>
            <h2 className="text-[14px] font-bold" style={{ color: t.TEXT }}>Mon compte</h2>
            <p className="text-[11px]" style={{ color: t.TEXT_DIM }}>{user.email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
            style={{ color: t.TEXT_DIM }}
            onMouseEnter={e => { e.currentTarget.style.background = alpha(t.TEXT, '08'); e.currentTarget.style.color = t.TEXT }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.TEXT_DIM }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-3" style={{ borderColor: t.BORDER }}>
          {([
            { id: 'profile'  as const, label: 'Profil',   Icon: User },
            { id: 'security' as const, label: 'Sécurité', Icon: Lock },
          ]).map(({ id, label, Icon }) => {
            const active = tab === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className="relative flex h-10 items-center gap-2 px-3 text-[11px] font-semibold transition-colors"
                style={{ color: active ? colors.teal : t.TEXT_DIM }}
              >
                <Icon size={12} />
                {label}
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

        {/* ── Profile tab ── */}
        {tab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="p-5 space-y-4">
            {/* Avatar preview */}
            <div className="flex items-center gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-[18px] font-black transition-all"
                style={{
                  background: `linear-gradient(135deg, ${accent}, ${accent}BB)`,
                  color: '#041014',
                  boxShadow: `0 0 20px ${alpha(accent, '30')}`,
                }}
              >
                {initials}
              </div>
              <div className="flex-1">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: t.TEXT_DIM }}>
                  Couleur de l'avatar
                </p>
                <div className="flex gap-2">
                  {ACCENT_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAccent(c)}
                      className="h-5 w-5 rounded-full transition-all"
                      style={{
                        background: c,
                        boxShadow: accent === c ? `0 0 0 2px ${t.CARD_BG}, 0 0 0 3px ${c}` : 'none',
                        transform: accent === c ? 'scale(1.1)' : 'scale(1)',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Full name */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: t.TEXT_DIM }}>
                <User size={10} /> Nom complet
              </label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                className="w-full rounded-xl px-4 py-3 text-[12px] transition-all"
                style={{
                  background: t.SURFACE,
                  color: t.TEXT,
                  border: `1px solid ${t.BORDER}`,
                  outline: 'none',
                }}
                onFocus={e  => (e.currentTarget.style.borderColor = alpha(colors.teal, '50'))}
                onBlur={e   => (e.currentTarget.style.borderColor = t.BORDER)}
              />
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: t.TEXT_DIM }}>
                <Mail size={10} /> Adresse email
              </label>
              <div
                className="flex items-center gap-3 rounded-xl px-4 py-3"
                style={{ background: alpha(t.SURFACE, '80'), border: `1px solid ${t.BORDER}` }}
              >
                <span className="flex-1 text-[12px]" style={{ color: t.TEXT_DIM }}>{user.email}</span>
                <span
                  className="rounded-full border px-2 py-0.5 text-[8px] font-black"
                  style={{ borderColor: alpha(colors.teal, '25'), color: colors.teal, background: alpha(colors.teal, '08') }}
                >
                  DESKTOP
                </span>
              </div>
              <p className="mt-1 text-[9px]" style={{ color: alpha(t.TEXT_DIM, '60') }}>
                L'email est lié au compte backend et ne peut pas être modifié ici.
              </p>
            </div>

            {/* Plan info */}
            <div
              className="flex items-center gap-3 rounded-xl border px-4 py-3"
              style={{ background: alpha(colors.teal, '06'), borderColor: alpha(colors.teal, '20') }}
            >
              <Shield size={14} style={{ color: colors.teal }} />
              <div className="flex-1">
                <p className="text-[11px] font-bold" style={{ color: t.TEXT }}>PRISM Desktop</p>
                <p className="text-[10px]" style={{ color: t.TEXT_DIM }}>Licence locale · IEC 61511 · SIL 1–4</p>
              </div>
            </div>

            {/* Save */}
            <div className="flex items-center justify-end gap-3 pt-1">
              {saved && (
                <div className="flex items-center gap-1.5 fade-up">
                  <CheckCircle2 size={13} style={{ color: semantic.success }} />
                  <span className="text-[11px] font-medium" style={{ color: semantic.success }}>Enregistré</span>
                </div>
              )}
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-[11px] font-bold transition-all hover:opacity-90 disabled:opacity-50 active:scale-95"
                style={{
                  background: `linear-gradient(135deg, ${colors.teal}, ${colors.tealDark})`,
                  color: '#041014',
                }}
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : null}
                Enregistrer
              </button>
            </div>
          </form>
        )}

        {/* ── Security tab ── */}
        {tab === 'security' && (
          <form onSubmit={handleSavePassword} className="p-5 space-y-3">
            <p className="text-[11px] leading-relaxed" style={{ color: t.TEXT_DIM }}>
              Changez votre mot de passe du compte PRISM Desktop local.
            </p>

            {/* Current password */}
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider" style={{ color: t.TEXT_DIM }}>
                Mot de passe actuel
              </label>
              <PwdInput
                value={currentPwd}
                onChange={setCurrentPwd}
                placeholder="••••••••"
                show={showPwd}
                onToggle={() => setShowPwd(v => !v)}
                t={t}
              />
            </div>

            <div className="h-px" style={{ background: t.BORDER }} />

            {/* New password */}
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider" style={{ color: t.TEXT_DIM }}>
                Nouveau mot de passe
              </label>
              <PwdInput
                value={newPwd}
                onChange={setNewPwd}
                placeholder="Minimum 8 caractères"
                show={showPwd}
                onToggle={() => setShowPwd(v => !v)}
                t={t}
              />
            </div>

            {/* Confirm */}
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider" style={{ color: t.TEXT_DIM }}>
                Confirmer
              </label>
              <PwdInput
                value={confirmPwd}
                onChange={setConfirmPwd}
                placeholder="••••••••"
                show={showPwd}
                onToggle={() => setShowPwd(v => !v)}
                t={t}
              />
            </div>

            {/* Password strength */}
            {newPwd.length > 0 && (
              <PasswordStrength pwd={newPwd} t={t} />
            )}

            {pwdError && (
              <div
                className="rounded-xl border px-3 py-2 text-center text-[11px]"
                style={{ background: alpha(semantic.error, '10'), borderColor: alpha(semantic.error, '25'), color: semantic.error }}
              >
                {pwdError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-1">
              {pwdSaved && (
                <div className="flex items-center gap-1.5 fade-up">
                  <CheckCircle2 size={13} style={{ color: semantic.success }} />
                  <span className="text-[11px] font-medium" style={{ color: semantic.success }}>Mot de passe mis à jour</span>
                </div>
              )}
              <button
                type="submit"
                disabled={pwdSaving || !currentPwd || !newPwd || !confirmPwd}
                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-[11px] font-bold transition-all hover:opacity-90 disabled:opacity-40 active:scale-95"
                style={{
                  background: `linear-gradient(135deg, ${colors.teal}, ${colors.tealDark})`,
                  color: '#041014',
                }}
              >
                {pwdSaving ? <Loader2 size={13} className="animate-spin" /> : null}
                Changer le mot de passe
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PwdInput({ value, onChange, placeholder, show, onToggle, t }: {
  value: string; onChange: (v: string) => void; placeholder: string
  show: boolean; onToggle: () => void; t: ThemeTokens
}) {
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl px-4 py-3 pr-11 text-[12px] transition-all"
        style={{ background: t.SURFACE, color: t.TEXT, border: `1px solid ${t.BORDER}`, outline: 'none' }}
        onFocus={e  => (e.currentTarget.style.borderColor = alpha(colors.teal, '50'))}
        onBlur={e   => (e.currentTarget.style.borderColor = t.BORDER)}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute inset-y-0 right-0 flex items-center px-3 transition-opacity hover:opacity-70"
        style={{ color: t.TEXT_DIM }}
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  )
}

function PasswordStrength({ pwd, t }: { pwd: string; t: ThemeTokens }) {
  const score = [
    pwd.length >= 8,
    /[A-Z]/.test(pwd),
    /[0-9]/.test(pwd),
    /[^A-Za-z0-9]/.test(pwd),
  ].filter(Boolean).length

  const cfg = [
    { label: 'Trop court',  color: semantic.error   },
    { label: 'Faible',      color: semantic.warning  },
    { label: 'Moyen',       color: semantic.warning  },
    { label: 'Fort',        color: semantic.success  },
    { label: 'Très fort',   color: semantic.success  },
  ][score]

  return (
    <div>
      <div className="mb-1 flex gap-1">
        {[0,1,2,3].map(i => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{ background: i < score ? cfg.color : alpha(t.BORDER, 'CC') }}
          />
        ))}
      </div>
      <p className="text-[9px] font-medium" style={{ color: cfg.color }}>{cfg.label}</p>
    </div>
  )
}
