/**
 * src/components/AuthScreen.tsx — PRISM Launcher
 * Écran de connexion / inscription.
 * DA identique à PRISM main : split layout, carousel droite, form gauche.
 * Autonome : stocke le token JWT localement (même backend desktop que PRISM).
 */

import { useState, useEffect, type FormEvent } from 'react'
import {
  Eye, EyeOff, ArrowRight, Loader2, Mail,
  BarChart2, ShieldCheck, Cpu, List, FileCheck2,
} from 'lucide-react'
import { colors, dark, semantic, alpha } from '../tokens'
import type { AuthMode, AuthUser } from '../types'

// ─── Slides carousel ─────────────────────────────────────────────────────────

const SLIDES = [
  {
    Icon:    List,
    accent:  colors.tealDim,
    title:   'SIF register & compliance',
    desc:    'Architecture, gouvernance et preuves dans un seul workspace.',
  },
  {
    Icon:    BarChart2,
    accent:  semantic.info,
    title:   'Analyse temps réel',
    desc:    'Estimation TypeScript immédiate, escalade moteur Python si besoin.',
  },
  {
    Icon:    ShieldCheck,
    accent:  semantic.success,
    title:   'Proof tests archivés',
    desc:    'Campagnes, résultats, PDFs — attachés à la bonne révision.',
  },
  {
    Icon:    FileCheck2,
    accent:  semantic.warning,
    title:   'Révisions figées',
    desc:    'Fermez, archivez, repartez proprement sur la révision suivante.',
  },
  {
    Icon:    Cpu,
    accent:  colors.teal,
    title:   'Moteur hybride',
    desc:    'Frontend interactif + Markov, Monte Carlo et solveurs Python.',
  },
] as const

function FeatureCarousel({ idx, onDot }: { idx: number; onDot: (i: number) => void }) {
  return (
    <div
      className="relative hidden flex-col items-center justify-between overflow-hidden p-10 md:flex"
      style={{
        background: `radial-gradient(ellipse 80% 50% at 50% 20%, ${alpha(colors.teal, '18')} 0%, transparent 70%), linear-gradient(180deg, ${dark.card2} 0%, ${dark.panel} 100%)`,
        width: '42%',
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div className="flex w-full items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl border"
          style={{ background: alpha(colors.teal, '14'), borderColor: alpha(colors.teal, '40') }}
        >
          <img src="/logo.png" alt="PRISM" className="h-5 w-5 object-contain" />
        </div>
        <span className="text-lg font-bold tracking-wide" style={{ color: dark.text }}>PRISM</span>
      </div>

      {/* Slide icon */}
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="relative mb-8 h-24 w-24">
          {SLIDES.map((slide, i) => {
            const Icon = slide.Icon
            return (
              <div
                key={slide.title}
                className="absolute inset-0 flex items-center justify-center transition-all duration-500"
                style={{ opacity: i === idx ? 1 : 0, transform: i === idx ? 'scale(1)' : 'scale(0.88)' }}
              >
                <div
                  className="flex h-24 w-24 items-center justify-center rounded-3xl"
                  style={{
                    background:  alpha(slide.accent, '14'),
                    boxShadow:   i === idx ? `0 0 48px ${alpha(slide.accent, '28')}` : 'none',
                  }}
                >
                  <Icon size={44} strokeWidth={1.2} style={{ color: slide.accent }} />
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ minHeight: 100 }}>
          {SLIDES.map((slide, i) => (
            <div
              key={slide.title}
              style={{ display: i === idx ? 'block' : 'none' }}
            >
              <h2 className="mb-3 text-xl font-bold leading-snug" style={{ color: dark.text }}>
                {slide.title}
              </h2>
              <p className="px-4 text-sm leading-relaxed" style={{ color: alpha(dark.text, 'AA') }}>
                {slide.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Dots */}
      <div className="flex gap-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onDot(i)}
            className="rounded-full transition-all duration-300"
            style={{
              width:      i === idx ? 24 : 8,
              height:     8,
              background: i === idx ? colors.teal : alpha(dark.text, '33'),
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Password field ───────────────────────────────────────────────────────────

function PasswordField({
  value, onChange, placeholder, show, onToggle,
}: {
  value:       string
  onChange:    (v: string) => void
  placeholder: string
  show:        boolean
  onToggle:    () => void
}) {
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-xl px-4 py-3 pr-11 text-sm outline-none transition-all"
        style={{ background: dark.card2, color: dark.text, border: `1px solid ${alpha(dark.text, '10')}` }}
        onFocus={e  => (e.currentTarget.style.borderColor = alpha(colors.teal, '60'))}
        onBlur={e   => (e.currentTarget.style.borderColor = alpha(dark.text, '10'))}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute inset-y-0 right-0 flex items-center px-3 transition-opacity hover:opacity-80"
        style={{ color: dark.textDim }}
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  )
}

// ─── Main AuthScreen ──────────────────────────────────────────────────────────

interface AuthScreenProps {
  onAuth: (user: AuthUser) => void
}

export function AuthScreen({ onAuth }: AuthScreenProps) {
  const [mode,            setMode]            = useState<AuthMode>('login')
  const [email,           setEmail]           = useState('')
  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName,        setFullName]        = useState('')
  const [showPwd,         setShowPwd]         = useState(false)
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState<string | null>(null)
  const [slideIdx,        setSlideIdx]        = useState(0)

  useEffect(() => {
    const t = setInterval(() => setSlideIdx(i => (i + 1) % SLIDES.length), 4500)
    return () => clearInterval(t)
  }, [])

  const inputCls = 'w-full rounded-xl px-4 py-3 text-sm outline-none transition-all'
  const inputStyle = {
    background:  dark.card2,
    color:       dark.text,
    border:      `1px solid ${alpha(dark.text, '10')}`,
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (mode === 'signup' && password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    setLoading(true)
    try {
      // En desktop : appel au backend FastAPI local
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/signup'
      const body = mode === 'login'
        ? { email, password }
        : { email, password, full_name: fullName }

      const res = await fetch(`http://localhost:8000${endpoint}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail ?? 'Erreur de connexion')
      }

      const data = await res.json()
      localStorage.setItem('prism_desktop_token', data.access_token)

      const name = data.user?.full_name ?? data.user?.email ?? 'Utilisateur'
      const parts = name.trim().split(/\s+/)
      const initials = parts.length === 1
        ? parts[0].slice(0, 2).toUpperCase()
        : `${parts[0][0]}${parts[1][0]}`.toUpperCase()

      onAuth({ email: data.user.email, fullName: name, initials })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible')
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (m: AuthMode) => {
    setMode(m)
    setError(null)
    setPassword('')
    setConfirmPassword('')
  }

  return (
    <div
      className="flex flex-1 overflow-hidden"
      style={{
        background: `radial-gradient(900px 500px at 10% 5%, ${alpha(colors.teal, '10')} 0%, transparent 60%), linear-gradient(180deg, ${dark.page} 0%, ${dark.rail} 100%)`,
      }}
    >
      {/* Left: form */}
      <div
        className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-8 py-10"
        style={{ background: dark.panel, borderRight: `1px solid ${alpha(dark.border, 'CC')}` }}
      >
        <div className="w-full max-w-[380px]">

          {/* Brand */}
          <div className="mb-8 flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl border"
              style={{ background: alpha(colors.teal, '14'), borderColor: alpha(colors.teal, '40') }}
            >
              <img src="/logo.png" alt="PRISM" className="h-5 w-5 object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-wide" style={{ color: dark.text }}>PRISM</span>
                <span
                  className="rounded-full border px-2 py-0.5 text-[9px] font-black"
                  style={{ background: alpha(semantic.warning, '14'), color: semantic.warning, borderColor: alpha(semantic.warning, '28') }}
                >
                  DESKTOP
                </span>
              </div>
              <p className="text-[11px]" style={{ color: dark.textDim }}>
                Process Safety Engineering
              </p>
            </div>
          </div>

          {/* Heading */}
          <h2 className="mb-1.5 text-2xl font-bold" style={{ color: dark.text }}>
            {mode === 'login' ? 'Bienvenue' : 'Créer un compte'}
          </h2>
          <p className="mb-7 text-sm leading-relaxed" style={{ color: dark.textDim }}>
            {mode === 'login'
              ? 'Connectez-vous pour accéder à vos projets et SIFs.'
              : 'Créez votre compte local PRISM Desktop.'}
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && (
              <input
                className={inputCls}
                style={inputStyle}
                type="text"
                placeholder="Nom complet"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                onFocus={e  => (e.currentTarget.style.borderColor = alpha(colors.teal, '60'))}
                onBlur={e   => (e.currentTarget.style.borderColor = alpha(dark.text, '10'))}
              />
            )}

            <input
              className={inputCls}
              style={inputStyle}
              type="email"
              placeholder="Adresse email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              onFocus={e  => (e.currentTarget.style.borderColor = alpha(colors.teal, '60'))}
              onBlur={e   => (e.currentTarget.style.borderColor = alpha(dark.text, '10'))}
            />

            <PasswordField
              value={password}
              onChange={setPassword}
              placeholder="Mot de passe"
              show={showPwd}
              onToggle={() => setShowPwd(v => !v)}
            />

            {mode === 'signup' && (
              <PasswordField
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Confirmer le mot de passe"
                show={showPwd}
                onToggle={() => setShowPwd(v => !v)}
              />
            )}

            {error && (
              <div
                className="rounded-xl border px-3 py-2.5 text-center text-xs"
                style={{ background: alpha(semantic.error, '12'), borderColor: alpha(semantic.error, '28'), color: semantic.error }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${colors.teal}, ${colors.tealDark})`, color: '#041014' }}
            >
              {loading
                ? <Loader2 size={16} className="animate-spin" />
                : <>{mode === 'login' ? 'Se connecter' : 'Créer le compte'} <ArrowRight size={15} /></>}
            </button>
          </form>

          {/* Switch mode */}
          <p className="mt-6 text-center text-xs" style={{ color: dark.textDim }}>
            {mode === 'login' ? 'Pas encore de compte ?' : 'Déjà un compte ?'}{' '}
            <button
              type="button"
              className="font-semibold transition-opacity hover:opacity-80"
              style={{ color: colors.tealDim }}
              onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
            >
              {mode === 'login' ? 'Créer un compte' : 'Se connecter'}
            </button>
          </p>

          {/* Legal */}
          <p className="mt-8 text-center text-[10px] leading-relaxed" style={{ color: alpha(dark.textDim, '80') }}>
            PRISM Desktop · IEC 61511 · Données stockées localement
          </p>
        </div>
      </div>

      {/* Right: carousel */}
      <FeatureCarousel idx={slideIdx} onDot={setSlideIdx} />
    </div>
  )
}
