/**
 * SetupScreen.tsx — PRISM Launcher
 * Premier lancement : création du compte administrateur.
 */

import { useState, type FormEvent } from 'react'
import { Eye, EyeOff, ArrowRight, Loader2, Shield, Crown } from 'lucide-react'
import { colors, dark, semantic, alpha } from '../tokens'
import { useLocaleStrings } from '../i18n/useLocale'
import { getLauncherStrings } from '../i18n/launcher'
import logoSrc from '../assets/logo.png'

function FieldInput({ type = 'text', placeholder, value, onChange }: {
  type?: string; placeholder: string; value: string; onChange: (v: string) => void
}) {
  const [show, setShow] = useState(false)
  const isPass = type === 'password'
  return (
    <div className="relative">
      <input
        type={isPass && !show ? 'password' : 'text'}
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
        onFocus={e => (e.currentTarget.style.borderColor = alpha(colors.teal, '50'))}
        onBlur={e  => (e.currentTarget.style.borderColor = alpha('#FFFFFF', '08'))}
      />
      {isPass && (
        <button
          type="button"
          onClick={() => setShow(v => !v)}
          className="absolute inset-y-0 right-0 flex items-center px-3 opacity-50 hover:opacity-100 transition-opacity"
          style={{ color: dark.textDim }}
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      )}
    </div>
  )
}

export function SetupScreen({ onDone }: { onDone: () => void }) {
  const s                      = useLocaleStrings(getLauncherStrings)
  const [fullName, setFullName] = useState('')
  const [email,    setEmail]    = useState('')
  const [pass,     setPass]     = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (pass.length < 8) { setError(s.setup.errMinLength); return }
    if (pass !== confirm) { setError(s.setup.errMismatch); return }
    setLoading(true)
    try {
      const result = await window.electron?.createUser({
        email, fullName, password: pass, role: 'admin',
      })
      if (!result?.ok) throw new Error(result?.error ?? 'Erreur lors de la création')
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="relative flex flex-1 items-center justify-center overflow-hidden"
      style={{
        background: `
          radial-gradient(ellipse 70% 60% at 10% 30%, ${alpha(colors.teal, '12')} 0%, transparent 55%),
          radial-gradient(ellipse 50% 70% at 90% 70%, ${alpha('#8B5CF6', '08')} 0%, transparent 55%),
          ${dark.rail}
        `,
      }}
    >
      <div className="pointer-events-none absolute inset-0 dot-grid" style={{ opacity: 0.35 }} />

      <div
        className="relative w-full max-w-[400px] overflow-hidden rounded-2xl"
        style={{
          background: alpha(dark.panel, 'E8'),
          border: `1px solid ${alpha('#FFFFFF', '07')}`,
          boxShadow: `0 40px 80px rgba(0,0,0,0.55), inset 0 1px 0 ${alpha('#FFFFFF', '05')}`,
        }}
      >
        {/* Accent top */}
        <div
          className="h-[2px] w-full"
          style={{ background: `linear-gradient(90deg, transparent, ${colors.teal} 30%, ${colors.tealDim} 70%, transparent)` }}
        />

        <div className="px-8 py-7">
          {/* Brand */}
          <div className="mb-6 flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl border"
              style={{ background: alpha(colors.teal, '12'), borderColor: alpha(colors.teal, '30') }}
            >
              <img src={logoSrc} alt="PRISM" className="h-11 w-11 object-contain" />
            </div>
            <div>
              <span className="text-[18px] font-black tracking-tight" style={{ color: dark.text }}>PRISM</span>
              <p className="text-[10px]" style={{ color: dark.textDim }}>{s.setup.configTitle}</p>
            </div>
          </div>

          {/* Admin badge */}
          <div
            className="mb-5 flex items-center gap-2 rounded-xl border px-3 py-2.5"
            style={{ background: alpha(semantic.warning, '08'), borderColor: alpha(semantic.warning, '20') }}
          >
            <Crown size={13} style={{ color: semantic.warning, flexShrink: 0 }} />
            <div>
              <p className="text-[11px] font-bold" style={{ color: semantic.warning }}>{s.setup.adminBadge}</p>
              <p className="text-[9px]" style={{ color: alpha(semantic.warning, 'AA') }}>
                {s.setup.adminBadgeHint}
              </p>
            </div>
          </div>

          <h2 className="mb-1 text-[18px] font-black" style={{ color: dark.text }}>{s.setup.heading}</h2>
          <p className="mb-5 text-[11px]" style={{ color: dark.textDim }}>{s.setup.subtitle}</p>

          <form onSubmit={handleSubmit} className="space-y-2.5">
            <FieldInput placeholder={s.setup.namePlaceholder} value={fullName} onChange={setFullName} />
            <FieldInput type="email" placeholder={s.setup.emailPlaceholder} value={email} onChange={setEmail} />
            <FieldInput type="password" placeholder={s.setup.passwordPlaceholder} value={pass} onChange={setPass} />
            <FieldInput type="password" placeholder={s.setup.confirmPlaceholder} value={confirm} onChange={setConfirm} />

            {error && (
              <div
                className="rounded-xl border px-3 py-2.5 text-center text-[11px]"
                style={{ background: alpha(semantic.error, '10'), borderColor: alpha(semantic.error, '25'), color: semantic.error }}
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
              }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <><span>{s.setup.createBtn}</span><ArrowRight size={14} /></>}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-center gap-4 border-t px-8 py-3"
          style={{ borderColor: alpha('#FFFFFF', '05'), background: alpha(dark.rail, '88') }}
        >
          <Shield size={10} style={{ color: colors.teal }} />
          <span className="text-[9px]" style={{ color: alpha(dark.textDim, '70') }}>
            {s.setup.localData}
          </span>
        </div>
      </div>
    </div>
  )
}
