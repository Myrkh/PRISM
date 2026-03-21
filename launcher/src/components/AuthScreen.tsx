/**
 * AuthScreen.tsx — PRISM Launcher
 * Écran de connexion. Full-bleed dark avec glass card centré.
 */

import { useState, type FormEvent } from 'react'
import { Eye, EyeOff, ArrowRight, Loader2, Shield, Lock } from 'lucide-react'
import { colors, dark, semantic, alpha } from '../tokens'
import { useLocaleStrings } from '../i18n/useLocale'
import { getLauncherStrings } from '../i18n/launcher'
import type { AuthMode, AuthUser } from '../types'
import logoSrc from '../assets/logo.png'

// ── Input ─────────────────────────────────────────────────────────────────────

function Input({ type, placeholder, value, onChange, required }: {
  type: string; placeholder: string; value: string
  onChange: (v: string) => void; required?: boolean
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      required={required}
      className="w-full rounded-xl px-4 py-3 text-[13px] transition-all"
      style={{
        background: alpha(dark.card, '90'),
        color: dark.text,
        border: `1px solid ${alpha('#FFFFFF', '08')}`,
        outline: 'none',
      }}
      onFocus={e  => (e.currentTarget.style.borderColor = alpha(colors.teal, '50'))}
      onBlur={e   => (e.currentTarget.style.borderColor = alpha('#FFFFFF', '08'))}
    />
  )
}

function PasswordInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        required
        className="w-full rounded-xl px-4 py-3 pr-11 text-[13px] transition-all"
        style={{
          background: alpha(dark.card, '90'),
          color: dark.text,
          border: `1px solid ${alpha('#FFFFFF', '08')}`,
          outline: 'none',
        }}
        onFocus={e  => (e.currentTarget.style.borderColor = alpha(colors.teal, '50'))}
        onBlur={e   => (e.currentTarget.style.borderColor = alpha('#FFFFFF', '08'))}
      />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        className="absolute inset-y-0 right-0 flex items-center px-3 transition-opacity hover:opacity-70"
        style={{ color: dark.textDim }}
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function AuthScreen({ onAuth }: { onAuth: (user: AuthUser, token: string) => void }) {
  const s                     = useLocaleStrings(getLauncherStrings)
  const [mode]                = useState<AuthMode>('login')
  const [email,   setEmail]   = useState('')
  const [pass,    setPass]    = useState('')
  const [confirm, setConfirm] = useState('')
  const [name,    setName]    = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await window.electron?.login({ email, password: pass })
      if (!result?.ok) throw new Error(result?.error ?? 'Connexion impossible')
      onAuth(result.user!, result.sessionToken!)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="relative flex flex-1 items-center justify-center overflow-hidden"
      style={{
        background: `
          radial-gradient(ellipse 70% 60% at 10% 30%, ${alpha(colors.teal, '14')} 0%, transparent 55%),
          radial-gradient(ellipse 50% 70% at 90% 70%, ${alpha('#8B5CF6', '09')} 0%, transparent 55%),
          radial-gradient(ellipse 40% 40% at 50% 0%,  ${alpha(colors.teal, '07')} 0%, transparent 50%),
          ${dark.rail}
        `,
      }}
    >
      {/* Dot grid */}
      <div
        className="pointer-events-none absolute inset-0 dot-grid"
        style={{ opacity: 0.45 }}
      />

      {/* Ambient orbs */}
      <div
        className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full"
        style={{
          background: `radial-gradient(circle, ${alpha(colors.teal, '10')} 0%, transparent 70%)`,
          filter: 'blur(48px)',
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full"
        style={{
          background: `radial-gradient(circle, ${alpha('#8B5CF6', '08')} 0%, transparent 70%)`,
          filter: 'blur(48px)',
        }}
      />

      {/* Glass card */}
      <div
        className="relative glass fade-up w-full max-w-[380px] overflow-hidden rounded-2xl"
        style={{
          background: alpha(dark.panel, 'E6'),
          border: `1px solid ${alpha('#FFFFFF', '07')}`,
          boxShadow: `
            0 40px 80px rgba(0,0,0,0.55),
            0 0 0 1px ${alpha(colors.teal, '08')},
            inset 0 1px 0 ${alpha('#FFFFFF', '05')}
          `,
        }}
      >
        {/* Top accent */}
        <div
          className="h-[2px] w-full"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${colors.teal} 30%, ${colors.tealDim} 70%, transparent 100%)`,
          }}
        />

        <div className="px-8 py-7">
          {/* Brand */}
          <div className="mb-7 flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl border"
              style={{
                background: alpha(colors.teal, '12'),
                borderColor: alpha(colors.teal, '30'),
                boxShadow: `0 0 20px ${alpha(colors.teal, '20')}`,
              }}
            >
              <img src={logoSrc} alt="PRISM" className="h-11 w-11 object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="text-[20px] font-black tracking-tight"
                  style={{ color: dark.text, textShadow: `0 0 24px ${alpha(colors.teal, '20')}` }}
                >
                  PRISM
                </span>
                <span
                  className="rounded-full border px-2 py-0.5 text-[8px] font-black tracking-wider"
                  style={{
                    background: alpha(semantic.warning, '12'),
                    borderColor: alpha(semantic.warning, '25'),
                    color: semantic.warning,
                  }}
                >
                  DESKTOP
                </span>
              </div>
              <p className="text-[10px]" style={{ color: dark.textDim }}>
                Process Safety Engineering
              </p>
            </div>
          </div>

          {/* Heading */}
          <h2 className="mb-1 text-[20px] font-black leading-none" style={{ color: dark.text }}>
            {mode === 'login' ? s.auth.welcome : s.auth.createAccount}
          </h2>
          <p className="mb-6 text-[11px] leading-relaxed" style={{ color: dark.textDim }}>
            {mode === 'login' ? s.auth.loginSubtitle : s.auth.signupSubtitle}
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-2.5">
            {mode === 'signup' && (
              <Input
                type="text"
                placeholder="Nom complet"
                value={name}
                onChange={setName}
                required
              />
            )}
            <Input
              type="email"
              placeholder={s.auth.emailPlaceholder}
              value={email}
              onChange={setEmail}
              required
            />
            <PasswordInput
              value={pass}
              onChange={setPass}
              placeholder={s.auth.passwordPlaceholder}
            />
            {mode === 'signup' && (
              <PasswordInput
                value={confirm}
                onChange={setConfirm}
                placeholder="Confirmer le mot de passe"
              />
            )}

            {error && (
              <div
                className="rounded-xl border px-3 py-2.5 text-center text-[11px]"
                style={{
                  background: alpha(semantic.error, '10'),
                  borderColor: alpha(semantic.error, '25'),
                  color: semantic.error,
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[12px] font-black uppercase tracking-widest transition-all hover:opacity-90 disabled:opacity-50 active:scale-[0.98]"
              style={{
                background: `linear-gradient(135deg, ${colors.teal}, ${colors.tealDark})`,
                color: '#041014',
                boxShadow: `0 4px 20px ${alpha(colors.teal, '30')}`,
                letterSpacing: '0.1em',
              }}
            >
              {loading
                ? <Loader2 size={16} className="animate-spin" />
                : (
                  <>
                    {mode === 'login' ? s.auth.loginBtn : s.auth.signupBtn}
                    <ArrowRight size={14} />
                  </>
                )
              }
            </button>
          </form>

          <p className="mt-5 text-center text-[11px]" style={{ color: alpha(dark.textDim, '60') }}>
            {s.auth.contactAdmin}
          </p>
        </div>

        {/* Footer strip */}
        <div
          className="flex items-center justify-center gap-4 border-t px-8 py-3"
          style={{ borderColor: alpha('#FFFFFF', '05'), background: alpha(dark.rail, '88') }}
        >
          <div className="flex items-center gap-1.5">
            <Shield size={10} style={{ color: colors.teal }} />
            <span className="text-[9px] font-bold" style={{ color: alpha(colors.tealDim, 'AA') }}>
              IEC 61511
            </span>
          </div>
          <span style={{ color: alpha(dark.textDim, '40') }}>·</span>
          <div className="flex items-center gap-1.5">
            <Lock size={9} style={{ color: dark.textDim }} />
            <span className="text-[9px]" style={{ color: alpha(dark.textDim, '70') }}>
              {s.auth.localData}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
