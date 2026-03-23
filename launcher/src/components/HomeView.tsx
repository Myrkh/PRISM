/**
 * HomeView.tsx — PRISM Launcher
 * Deux colonnes : branding hero (gauche) + récemment ouverts (droite).
 */

import { useState, useEffect } from 'react'
import { FolderOpen, Clock, Plus, ArrowUpRight, Shield, FolderDot } from 'lucide-react'
import { colors, alpha } from '../tokens'
import logoSrc from '../assets/logo.png'
import { useLocaleStrings } from '../i18n/useLocale'
import { getLauncherStrings } from '../i18n/launcher'
import type { ThemeTokens } from '../hooks/useTheme'

// ── Types & helpers ───────────────────────────────────────────────────────────

interface RecentProject {
  id:       string
  name:     string
  standard: string
  sifCount: number
  openedAt: string // ISO 8601
}

function formatStandard(raw: string): string {
  return raw.replace('IEC61511', 'IEC 61511').replace('IEC61508', 'IEC 61508').replace('ISA84', 'ISA 84')
}

function formatRelativeTime(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  <  1) return 'À l\'instant'
  if (mins  < 60) return `Il y a ${mins} min`
  if (hours < 24) return `Il y a ${hours}h`
  if (days === 1) return 'Hier'
  if (days  <  7) return `Il y a ${days} jours`
  return new Date(iso).toLocaleDateString('fr-FR')
}

// ── Recent row ────────────────────────────────────────────────────────────────

function RecentRow({ item, t, last }: { item: RecentProject; t: ThemeTokens; last: boolean }) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      type="button"
      className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors"
      style={{
        background: hovered ? alpha(colors.teal, '04') : 'transparent',
        borderBottom: last ? 'none' : `1px solid ${alpha(t.BORDER, '60')}`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => window.electron?.launchPrism?.()}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors"
        style={{
          background: hovered ? alpha(colors.teal, '12') : alpha(t.TEXT, '04'),
          borderColor: hovered ? alpha(colors.teal, '28') : t.BORDER,
        }}
      >
        <FolderOpen size={16} style={{ color: hovered ? colors.teal : t.TEXT_DIM }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-[13px] font-semibold" style={{ color: t.TEXT }}>{item.name}</p>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="text-[10px]" style={{ color: t.TEXT_DIM }}>{formatStandard(item.standard)}</span>
          <span style={{ color: alpha(t.BORDER, 'FF') }}>·</span>
          <span className="text-[10px]" style={{ color: t.TEXT_DIM }}>{item.sifCount} SIF{item.sifCount !== 1 ? 's' : ''}</span>
          <span style={{ color: alpha(t.BORDER, 'FF') }}>·</span>
          <span className="flex items-center gap-1 text-[10px]" style={{ color: t.TEXT_DIM }}>
            <Clock size={9} />{formatRelativeTime(item.openedAt)}
          </span>
        </div>
      </div>

      <div
        className="shrink-0 transition-all duration-150"
        style={{ opacity: hovered ? 1 : 0, color: colors.tealDim, transform: hovered ? 'translateX(0)' : 'translateX(-4px)' }}
      >
        <ArrowUpRight size={15} />
      </div>
    </button>
  )
}

// ── Branding hero ─────────────────────────────────────────────────────────────

function BrandingHero({ t, ready }: { t: ThemeTokens; ready: boolean }) {
  return (
    <div
      className="relative flex h-full w-[240px] shrink-0 flex-col items-center justify-center overflow-hidden border-r px-6"
      style={{ borderColor: t.BORDER, background: alpha(t.PANEL_BG, 'CC') }}
    >
      {/* Ambient gradient */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% 60%, ${alpha(colors.teal, '08')} 0%, transparent 70%)`,
        }}
      />

      <div className="relative flex flex-col items-center gap-5">
        {/* Logo */}
        <div className="relative">
          {ready && (
            <div
              className="absolute -inset-3 rounded-3xl"
              style={{ background: `radial-gradient(circle, ${alpha(colors.teal, '20')} 0%, transparent 70%)`, filter: 'blur(8px)' }}
            />
          )}
          <div
            className="relative flex h-20 w-20 items-center justify-center rounded-3xl border transition-all duration-500"
            style={{
              background: `linear-gradient(135deg, ${alpha(colors.teal, '20')}, ${alpha(colors.teal, '08')})`,
              borderColor: alpha(colors.teal, ready ? '50' : '20'),
              boxShadow: ready
                ? `0 0 0 1px ${alpha(colors.teal, '12')}, 0 12px 32px ${alpha(colors.teal, '25')}`
                : 'none',
            }}
          >
            <img src={logoSrc} alt="PRISM" className="h-11 w-11 object-contain" />
          </div>
        </div>

        {/* Text */}
        <div className="text-center">
          <p className="text-[28px] font-black leading-none tracking-tighter" style={{ color: t.TEXT }}>
            PRISM
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: colors.tealDim }}>
            Launcher
          </p>
        </div>

        {/* Version */}
        <span
          className="rounded-full border px-3 py-1 font-mono text-[9px]"
          style={{ color: alpha(colors.tealDim, '90'), borderColor: alpha(colors.teal, '20'), background: alpha(colors.teal, '06') }}
        >
          v3.0.2
        </span>

        {/* IEC badge */}
        <div
          className="flex items-center gap-1.5 rounded-full border px-3 py-1"
          style={{ borderColor: alpha(colors.teal, '20'), background: alpha(colors.teal, '06') }}
        >
          <Shield size={9} style={{ color: colors.teal }} />
          <span className="text-[8px] font-bold tracking-wider" style={{ color: alpha(colors.teal, 'DD') }}>
            IEC 61511 · SIL 1–4
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function HomeView({ t, ready }: { t: ThemeTokens; ready: boolean }) {
  const s = useLocaleStrings(getLauncherStrings)
  const [recents, setRecents] = useState<RecentProject[]>([])

  useEffect(() => {
    window.electron?.getRecentProjects?.()
      .then((data: unknown) => {
        if (Array.isArray(data)) setRecents(data as RecentProject[])
      })
      .catch(() => { /* non-critical */ })
  }, [])

  return (
    <div className="flex flex-1 overflow-hidden">

      {/* Left — branding hero */}
      <BrandingHero t={t} ready={ready} />

      {/* Right — recently opened */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-5" style={{ scrollbarGutter: 'stable' }}>

          <div className="mb-3 flex items-center justify-between px-1">
            <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: t.TEXT_DIM }}>
              {s.home.recentlyOpened}
            </p>
            {recents.length > 0 && (
              <span className="text-[10px]" style={{ color: alpha(t.TEXT_DIM, '55') }}>
                {recents.length} {s.home.projects}
              </span>
            )}
          </div>

          {recents.length > 0 ? (
            <div className="card overflow-hidden rounded-xl border" style={{ borderColor: t.BORDER, background: t.CARD_BG }}>
              {recents.map((item, i) => (
                <RecentRow key={item.id} item={item} t={t} last={i === recents.length - 1} />
              ))}
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center gap-3 rounded-xl border py-10"
              style={{ borderColor: t.BORDER, borderStyle: 'dashed', background: alpha(t.TEXT, '01') }}
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl border"
                style={{ background: alpha(t.TEXT, '04'), borderColor: t.BORDER }}
              >
                <FolderDot size={18} style={{ color: t.TEXT_DIM }} />
              </div>
              <p className="text-[11px]" style={{ color: alpha(t.TEXT_DIM, '70') }}>
                {s.home.openInPrism}
              </p>
            </div>
          )}

          <button
            type="button"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-[11px] font-semibold transition-all hover:opacity-80 active:scale-[0.99]"
            style={{ borderColor: alpha(t.BORDER, 'AA'), borderStyle: 'dashed', color: t.TEXT_DIM, background: 'transparent' }}
            onClick={() => window.electron?.launchPrism?.()}
          >
            <Plus size={13} />
            {s.home.newProject}
          </button>

        </div>
      </div>
    </div>
  )
}
