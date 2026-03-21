/**
 * src/components/UpdatesView.tsx — PRISM Launcher
 * Gestion des mises à jour depuis GitHub Releases.
 * Affiche la version courante, les releases disponibles et le changelog.
 */

import { useState, useEffect } from 'react'
import {
  RefreshCw, Download, CheckCircle2, AlertTriangle,
  Tag, Calendar, Package, ArrowUpCircle,
} from 'lucide-react'
import { colors, semantic, alpha } from '../tokens'
import type { ThemeTokens } from '../hooks/useTheme'
import type { Release, InstallStatus } from '../types'

// ─── Mock data (à remplacer par l'appel GitHub API réel) ──────────────────

const CURRENT_VERSION = '3.0.2'

const MOCK_RELEASES: Release[] = [
  {
    tag:         'v3.0.2',
    name:        'PRISM 3.0.2 — Planning & Engine',
    publishedAt: '2025-03-15',
    notes: [
      'Planning proof tests — calendrier mensuel interactif avec équipe',
      'Engine — comparaison TS vs Python avec tolérance configurable',
      'Library — import par lot avec revue de conflits',
      'Fix : synchronisation Supabase lors de mutations simultanées',
      'Fix : recalcul PFDavg après changement de vote 2oo3',
    ],
    downloadUrl: 'https://github.com/ton-org/prism/releases/download/v3.0.2/prism-desktop-win.zip',
    size:        '143 Mo',
  },
  {
    tag:         'v3.0.1',
    name:        'PRISM 3.0.1 — Correctifs',
    publishedAt: '2025-02-28',
    notes: [
      'Fix : Loop Editor — drag & drop depuis la Library',
      'Fix : Audit Log — filtre par projet ne persistait pas',
      'Perf : réduction du bundle React de 18%',
    ],
    downloadUrl: '',
    size:        '141 Mo',
  },
  {
    tag:         'v3.0.0',
    name:        'PRISM 3.0 — Refonte majeure',
    publishedAt: '2025-01-20',
    notes: [
      'Architecture VS Code : rail + sidebar + workbench + panel droit',
      'Nouveau moteur de calcul Python avec API FastAPI',
      'Système de révisions figées avec PDF archivé',
      'Mode desktop avec SQLite local',
    ],
    downloadUrl: '',
    size:        '138 Mo',
  },
]

// ─── Release card ──────────────────────────────────────────────────────────

function ReleaseCard({
  release, isCurrent, t, onUpdate,
}: {
  release:   Release
  isCurrent: boolean
  t:         ThemeTokens
  onUpdate:  (r: Release) => void
}) {
  const isLatest = release.tag === MOCK_RELEASES[0].tag

  return (
    <div
      className="rounded-2xl border"
      style={{
        background:  isCurrent ? alpha(colors.teal, '05') : t.CARD_BG,
        borderColor: isCurrent ? alpha(colors.teal, '30') : t.BORDER,
      }}
    >
      <div className="flex items-start justify-between gap-4 p-4">
        <div className="flex items-start gap-3">
          <div
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border"
            style={{
              background:  isCurrent ? alpha(colors.teal, '14') : t.SURFACE,
              borderColor: isCurrent ? alpha(colors.teal, '30') : t.BORDER,
            }}
          >
            <Package size={14} style={{ color: isCurrent ? colors.teal : t.TEXT_DIM }} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-bold" style={{ color: t.TEXT }}>{release.name}</span>
              {isCurrent && (
                <span
                  className="rounded-full border px-2 py-0.5 text-[9px] font-black"
                  style={{ background: alpha(colors.teal, '14'), borderColor: alpha(colors.teal, '30'), color: colors.teal }}
                >
                  INSTALLÉ
                </span>
              )}
              {isLatest && !isCurrent && (
                <span
                  className="rounded-full border px-2 py-0.5 text-[9px] font-black"
                  style={{ background: alpha(semantic.success, '12'), borderColor: alpha(semantic.success, '28'), color: semantic.success }}
                >
                  NOUVEAU
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-3">
              <span className="flex items-center gap-1 text-[10px]" style={{ color: t.TEXT_DIM }}>
                <Tag size={9} /> {release.tag}
              </span>
              <span className="flex items-center gap-1 text-[10px]" style={{ color: t.TEXT_DIM }}>
                <Calendar size={9} /> {release.publishedAt}
              </span>
              <span className="flex items-center gap-1 text-[10px]" style={{ color: t.TEXT_DIM }}>
                <Download size={9} /> {release.size}
              </span>
            </div>
          </div>
        </div>

        {isLatest && !isCurrent && (
          <button
            type="button"
            onClick={() => onUpdate(release)}
            className="flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-[11px] font-bold transition-opacity hover:opacity-80"
            style={{ background: `linear-gradient(135deg, ${colors.teal}, ${colors.tealDark})`, color: '#041014' }}
          >
            <ArrowUpCircle size={13} />
            Mettre à jour
          </button>
        )}
        {isCurrent && (
          <CheckCircle2 size={18} style={{ color: colors.teal, flexShrink: 0, marginTop: 2 }} />
        )}
      </div>

      {/* Changelog */}
      <div className="border-t px-4 pb-4 pt-3" style={{ borderColor: t.BORDER }}>
        <ul className="space-y-1.5">
          {release.notes.map((note, i) => (
            <li key={i} className="flex gap-2 text-[11px]" style={{ color: t.TEXT_DIM }}>
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ background: colors.teal }} />
              {note}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ─── Install progress ──────────────────────────────────────────────────────

function InstallProgress({ status, t }: { status: InstallStatus; t: ThemeTokens }) {
  if (status.phase === 'idle' || status.phase === 'up_to_date') return null

  const steps = [
    { phase: 'checking',   label: 'Connexion GitHub' },
    { phase: 'downloading', label: 'Téléchargement' },
    { phase: 'installing',  label: 'Installation' },
    { phase: 'done',        label: 'Terminé' },
  ]

  return (
    <div
      className="rounded-2xl border p-4"
      style={{ background: t.CARD_BG, borderColor: alpha(colors.teal, '28') }}
    >
      <div className="mb-3 flex items-center gap-2">
        <RefreshCw size={13} className="animate-spin" style={{ color: colors.teal }} />
        <span className="text-[12px] font-semibold" style={{ color: t.TEXT }}>
          {'label' in status ? status.label : 'Installation en cours…'}
        </span>
        {'progress' in status && (
          <span className="ml-auto text-[11px] font-bold" style={{ color: colors.teal }}>
            {Math.round(status.progress)}%
          </span>
        )}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full" style={{ background: t.BORDER }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width:      `${'progress' in status ? status.progress : status.phase === 'done' ? 100 : 20}%`,
            background: `linear-gradient(90deg, ${colors.teal}, ${colors.tealDim})`,
          }}
        />
      </div>
    </div>
  )
}

// ─── Main UpdatesView ──────────────────────────────────────────────────────

export function UpdatesView({ t }: { t: ThemeTokens }) {
  const [status, setStatus]   = useState<InstallStatus>({ phase: 'idle' })
  const [checking, setChecking] = useState(false)

  const handleUpdate = async (release: Release) => {
    // Simulation du flow GitHub Release
    const steps: Array<{ phase: InstallStatus['phase']; progress?: number; label?: string; delay: number }> = [
      { phase: 'checking',    delay: 600 },
      { phase: 'downloading', progress: 10,  label: 'Téléchargement depuis GitHub Releases…', delay: 500 },
      { phase: 'downloading', progress: 45,  label: 'Téléchargement prism-desktop-win.zip…',  delay: 1200 },
      { phase: 'downloading', progress: 82,  label: 'Téléchargement prism-desktop-win.zip…',  delay: 900 },
      { phase: 'downloading', progress: 98,  label: 'Vérification SHA-256…',                  delay: 600 },
      { phase: 'installing',  progress: 50,  delay: 800 },
      { phase: 'installing',  progress: 100, delay: 600 },
      { phase: 'done',        delay: 0 },
    ]

    let t = 0
    for (const step of steps) {
      await new Promise<void>(resolve => {
        setTimeout(() => {
          setStatus({ phase: step.phase, ...(step.progress ? { progress: step.progress, label: step.label ?? '' } : {}) } as InstallStatus)
          resolve()
        }, t)
      })
      t += step.delay
    }
  }

  const handleCheck = async () => {
    setChecking(true)
    await new Promise(r => setTimeout(r, 1400))
    setChecking(false)
  }

  return (
    <div
      className="flex flex-1 flex-col gap-5 overflow-y-auto p-6"
      style={{ background: t.PAGE_BG, scrollbarGutter: 'stable' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-bold" style={{ color: t.TEXT }}>Mises à jour</h2>
          <p className="text-[11px]" style={{ color: t.TEXT_DIM }}>
            Version installée : <span style={{ color: colors.tealDim, fontWeight: 600 }}>v{CURRENT_VERSION}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={handleCheck}
          disabled={checking}
          className="flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[11px] font-semibold transition-colors hover:opacity-80"
          style={{ borderColor: t.BORDER, color: t.TEXT_DIM, background: t.CARD_BG }}
        >
          <RefreshCw size={12} className={checking ? 'animate-spin' : ''} />
          {checking ? 'Vérification…' : 'Vérifier maintenant'}
        </button>
      </div>

      <InstallProgress status={status} t={t} />

      {/* Releases */}
      <div className="space-y-3">
        {MOCK_RELEASES.map(release => (
          <ReleaseCard
            key={release.tag}
            release={release}
            isCurrent={release.tag === `v${CURRENT_VERSION}`}
            t={t}
            onUpdate={handleUpdate}
          />
        ))}
      </div>
    </div>
  )
}
