/**
 * UpdatesView.tsx — PRISM Launcher
 * Deux colonnes : état de mise à jour (gauche) + changelog collapsible (droite).
 */

import { useState } from 'react'
import {
  CheckCircle2, RefreshCw, Download, ArrowUpCircle,
  Tag, Calendar, ChevronDown, ChevronRight, PackageCheck,
  Clock, Zap,
} from 'lucide-react'
import { colors, semantic, alpha } from '../tokens'
import { useLocaleStrings } from '../i18n/useLocale'
import { getLauncherStrings } from '../i18n/launcher'
import type { ThemeTokens } from '../hooks/useTheme'
import type { Release, InstallStatus } from '../types'
import type { LauncherStrings } from '../i18n/launcher'

const CURRENT = '3.0.2'

const RELEASES: Release[] = [
  {
    tag: 'v3.0.2',
    name: 'PRISM 3.0.2 — Planning & Engine',
    publishedAt: '15 mars 2025',
    notes: [
      'Planning proof tests — calendrier mensuel interactif avec équipe',
      'Engine — comparaison TS vs Python avec tolérance configurable',
      'Library — import par lot avec revue de conflits',
      'Fix : synchronisation lors de mutations simultanées',
      'Fix : recalcul PFDavg après changement de vote 2oo3',
    ],
    downloadUrl: 'https://github.com/ton-org/prism/releases/download/v3.0.2/prism-desktop-win.zip',
    size: '143 Mo',
  },
  {
    tag: 'v3.0.1',
    name: 'PRISM 3.0.1 — Correctifs',
    publishedAt: '28 fév. 2025',
    notes: [
      'Fix : Loop Editor — drag & drop depuis la Library',
      'Fix : Audit Log — filtre par projet ne persistait pas',
      'Perf : réduction du bundle React de 18%',
    ],
    downloadUrl: '',
    size: '141 Mo',
  },
  {
    tag: 'v3.0.0',
    name: 'PRISM 3.0 — Refonte majeure',
    publishedAt: '20 jan. 2025',
    notes: [
      'Architecture VS Code : rail + sidebar + workbench + panel droit',
      'Nouveau moteur de calcul Python avec API FastAPI',
      'Système de révisions figées avec PDF archivé',
      'Mode desktop avec SQLite local',
    ],
    downloadUrl: '',
    size: '138 Mo',
  },
]

// ── Left column — status card ─────────────────────────────────────────────────

function StatusCard({ status, checking, onCheck, onUpdate, t, s, forceAvailable = false }: {
  status: InstallStatus
  checking: boolean
  onCheck: () => void
  onUpdate: () => void
  t: ThemeTokens
  s: LauncherStrings
  forceAvailable?: boolean
}) {
  const [scheduleOpen, setScheduleOpen] = useState(false)

  if (forceAvailable) {
    return <UpdateAvailableCard onUpdate={onUpdate} t={t} s={s} scheduleOpen={scheduleOpen} setScheduleOpen={setScheduleOpen} />
  }

  // Up to date
  if (status.phase === 'idle' || status.phase === 'up_to_date') {
    return (
      <div
        className="card overflow-hidden rounded-2xl border"
        style={{ borderColor: alpha(semantic.success, '25'), background: alpha(semantic.success, '05') }}
      >
        <div className="flex items-center gap-2 border-b px-4 py-2" style={{ borderColor: alpha(semantic.success, '15') }}>
          <div className="h-1.5 w-1.5 rounded-full" style={{ background: semantic.success, boxShadow: `0 0 6px ${semantic.success}` }} />
          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: semantic.success }}>{s.updates.upToDateBadge}</span>
        </div>
        <div className="p-5">
          <div
            className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border"
            style={{ background: alpha(semantic.success, '10'), borderColor: alpha(semantic.success, '22') }}
          >
            <PackageCheck size={24} style={{ color: semantic.success }} />
          </div>
          <p className="text-[15px] font-bold" style={{ color: t.TEXT }}>{s.updates.upToDateTitle}</p>
          <p className="mt-1 text-[11px]" style={{ color: t.TEXT_DIM }}>
            {s.updates.upToDateBody.replace('{version}', CURRENT)}
          </p>
          <button
            type="button"
            onClick={onCheck}
            disabled={checking}
            className="mt-4 flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-all hover:opacity-80 active:scale-95 disabled:opacity-50"
            style={{ borderColor: t.BORDER, color: t.TEXT_DIM, background: 'transparent' }}
          >
            <RefreshCw size={11} className={checking ? 'animate-spin' : ''} />
            {checking ? s.updates.checking : s.updates.checkNow}
          </button>
        </div>
      </div>
    )
  }

  // Checking
  if (status.phase === 'checking') {
    return (
      <div
        className="card overflow-hidden rounded-2xl border"
        style={{ borderColor: alpha(colors.teal, '28'), background: alpha(colors.teal, '04') }}
      >
        <div className="flex items-center gap-2 border-b px-4 py-2" style={{ borderColor: alpha(colors.teal, '15') }}>
          <RefreshCw size={10} className="animate-spin" style={{ color: colors.teal }} />
          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: colors.teal }}>{s.updates.checkingBadge}</span>
        </div>
        <div className="p-5">
          <div
            className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border"
            style={{ background: alpha(colors.teal, '10'), borderColor: alpha(colors.teal, '22') }}
          >
            <Zap size={24} style={{ color: colors.teal }} />
          </div>
          <p className="text-[15px] font-bold" style={{ color: t.TEXT }}>{s.updates.checkingTitle}</p>
          <p className="mt-1 text-[11px]" style={{ color: t.TEXT_DIM }}>{s.updates.checkingBody}</p>
        </div>
      </div>
    )
  }

  // Downloading / installing
  if (status.phase === 'downloading' || status.phase === 'installing') {
    const pct        = 'progress' in status ? status.progress : 0
    const label      = 'label' in status ? status.label : ''
    const phaseBadge = status.phase === 'downloading' ? s.updates.downloadingBadge : s.updates.installingBadge

    return (
      <div
        className="card overflow-hidden rounded-2xl border"
        style={{ borderColor: alpha(colors.teal, '28'), background: alpha(colors.teal, '04') }}
      >
        <div className="flex items-center gap-2 border-b px-4 py-2" style={{ borderColor: alpha(colors.teal, '15') }}>
          <RefreshCw size={10} className="animate-spin" style={{ color: colors.teal }} />
          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: colors.teal }}>{phaseBadge}</span>
          <span className="ml-auto font-mono text-[10px] font-bold" style={{ color: colors.teal }}>{Math.round(pct ?? 0)}%</span>
        </div>
        <div className="p-5">
          <div
            className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border"
            style={{ background: alpha(colors.teal, '10'), borderColor: alpha(colors.teal, '22') }}
          >
            <Download size={24} style={{ color: colors.teal }} />
          </div>
          <p className="text-[15px] font-bold" style={{ color: t.TEXT }}>{s.updates.inProgressTitle}</p>
          <p className="mt-1 text-[11px]" style={{ color: t.TEXT_DIM }}>{label}</p>

          {/* Progress bar */}
          <div className="mt-4 overflow-hidden rounded-full" style={{ height: 6, background: alpha(colors.teal, '15') }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${pct ?? 0}%`,
                background: `linear-gradient(90deg, ${colors.teal}, ${colors.tealDim})`,
                boxShadow: `0 0 8px ${alpha(colors.teal, '50')}`,
              }}
            />
          </div>
        </div>
      </div>
    )
  }

  // Done
  if (status.phase === 'done') {
    return (
      <div
        className="card overflow-hidden rounded-2xl border"
        style={{ borderColor: alpha(semantic.success, '28'), background: alpha(semantic.success, '05') }}
      >
        <div className="flex items-center gap-2 border-b px-4 py-2" style={{ borderColor: alpha(semantic.success, '15') }}>
          <CheckCircle2 size={10} style={{ color: semantic.success }} />
          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: semantic.success }}>{s.updates.doneBadge}</span>
        </div>
        <div className="p-5">
          <div
            className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border"
            style={{ background: alpha(semantic.success, '12'), borderColor: alpha(semantic.success, '25') }}
          >
            <CheckCircle2 size={24} style={{ color: semantic.success }} />
          </div>
          <p className="text-[15px] font-bold" style={{ color: t.TEXT }}>{s.updates.doneTitle}</p>
          <p className="mt-1 text-[11px]" style={{ color: t.TEXT_DIM }}>{s.updates.doneBody}</p>
          <button
            type="button"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[11px] font-bold transition-all active:scale-95"
            style={{
              background: `linear-gradient(135deg, ${colors.teal}, ${colors.tealDark})`,
              color: '#041014',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
            }}
            onClick={() => window.electron?.launchPrism?.()}
          >
            <ArrowUpCircle size={13} />
            {s.updates.restartBtn}
          </button>
        </div>
      </div>
    )
  }

  // Update available (default)
  return <UpdateAvailableCard onUpdate={onUpdate} t={t} s={s} scheduleOpen={scheduleOpen} setScheduleOpen={setScheduleOpen} />
}

const HOURS = ['06:00', '08:00', '10:00', '12:00', '18:00', '20:00', '22:00', '00:00']

function UpdateAvailableCard({ onUpdate, t, s, scheduleOpen, setScheduleOpen }: {
  onUpdate: () => void
  t: ThemeTokens
  s: LauncherStrings
  scheduleOpen: boolean
  setScheduleOpen: (v: boolean | ((prev: boolean) => boolean)) => void
}) {
  const now         = new Date()
  const [selMonth, setSelMonth] = useState(now.getMonth())
  const [selDay,   setSelDay]   = useState(now.getDate())
  const [selHour,  setSelHour]  = useState('22:00')

  const months      = s.updates.months
  const daysInMonth = new Date(now.getFullYear(), selMonth + 1, 0).getDate()
  const days        = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const scheduleLabel = s.updates.scheduleConfirm
    .replace('{month}', months[selMonth])
    .replace('{day}',   String(selDay))
    .replace('{hour}',  selHour)

  return (
    <div
      className="card overflow-y-auto rounded-2xl border"
      style={{ borderColor: alpha(colors.teal, '30'), background: alpha(colors.teal, '05') }}
    >
      <div className="flex items-center gap-2 border-b px-4 py-2" style={{ borderColor: alpha(colors.teal, '15') }}>
        <ArrowUpCircle size={10} style={{ color: colors.teal }} />
        <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: colors.teal }}>{s.updates.availableBadge}</span>
      </div>
      <div className="p-5">
        <div
          className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border"
          style={{ background: alpha(colors.teal, '10'), borderColor: alpha(colors.teal, '22') }}
        >
          <ArrowUpCircle size={24} style={{ color: colors.teal }} />
        </div>
        <p className="text-[15px] font-bold" style={{ color: t.TEXT }}>
          {s.updates.availableTitle.replace('{tag}', RELEASES[0].tag)}
        </p>
        <p className="mt-1 text-[11px]" style={{ color: t.TEXT_DIM }}>
          {s.updates.currentVersion.replace('{version}', CURRENT)}
        </p>

        <button
          type="button"
          onClick={onUpdate}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[12px] font-bold transition-all active:scale-[0.98]"
          style={{
            background: `linear-gradient(160deg, ${colors.teal}, ${colors.tealDark})`,
            color: '#041014',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 14px rgba(0,155,164,0.3)',
          }}
        >
          <ArrowUpCircle size={13} />
          {s.updates.updateNowBtn}
        </button>

        {/* Schedule — toggle */}
        <button
          type="button"
          onClick={() => setScheduleOpen(v => !v)}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-[10px] font-medium transition-all hover:opacity-80"
          style={{ color: t.TEXT_DIM }}
        >
          <Clock size={10} />
          {s.updates.scheduleBtn}
          <ChevronDown size={10} className={`transition-transform duration-200 ${scheduleOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Schedule — inline picker */}
        {scheduleOpen && (
          <div
            className="mt-3 overflow-hidden rounded-xl border"
            style={{ background: alpha(t.RAIL_BG, 'CC'), borderColor: t.BORDER }}
          >
            {/* Month */}
            <div className="border-b px-3 pt-3 pb-2" style={{ borderColor: t.BORDER }}>
              <p className="mb-1.5 text-[8px] font-black uppercase tracking-widest" style={{ color: t.TEXT_DIM }}>{s.updates.pickerMonth}</p>
              <div className="grid grid-cols-6 gap-1">
                {months.map((m, i) => (
                  <button
                    key={m} type="button"
                    onClick={() => { setSelMonth(i); setSelDay(1) }}
                    className="rounded-md py-1 text-[9px] font-semibold transition-all"
                    style={{
                      background: selMonth === i ? colors.teal : alpha(t.TEXT, '05'),
                      color: selMonth === i ? '#041014' : t.TEXT_DIM,
                    }}
                  >{m}</button>
                ))}
              </div>
            </div>

            {/* Day */}
            <div className="border-b px-3 pt-2.5 pb-2" style={{ borderColor: t.BORDER }}>
              <p className="mb-1.5 text-[8px] font-black uppercase tracking-widest" style={{ color: t.TEXT_DIM }}>{s.updates.pickerDay}</p>
              <div className="grid grid-cols-7 gap-1">
                {days.map(d => (
                  <button
                    key={d} type="button"
                    onClick={() => setSelDay(d)}
                    className="rounded-md py-1 text-[9px] font-semibold transition-all"
                    style={{
                      background: selDay === d ? colors.teal : alpha(t.TEXT, '05'),
                      color: selDay === d ? '#041014' : t.TEXT_DIM,
                    }}
                  >{d}</button>
                ))}
              </div>
            </div>

            {/* Hour */}
            <div className="px-3 pt-2.5 pb-3">
              <p className="mb-1.5 text-[8px] font-black uppercase tracking-widest" style={{ color: t.TEXT_DIM }}>{s.updates.pickerHour}</p>
              <div className="grid grid-cols-4 gap-1">
                {HOURS.map(h => (
                  <button
                    key={h} type="button"
                    onClick={() => setSelHour(h)}
                    className="rounded-md py-1 font-mono text-[9px] font-semibold transition-all"
                    style={{
                      background: selHour === h ? colors.teal : alpha(t.TEXT, '05'),
                      color: selHour === h ? '#041014' : t.TEXT_DIM,
                    }}
                  >{h}</button>
                ))}
              </div>
            </div>

            {/* Confirm */}
            <div className="border-t px-3 py-2.5" style={{ borderColor: t.BORDER }}>
              <button
                type="button"
                onClick={() => setScheduleOpen(false)}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-[10px] font-bold transition-all active:scale-95"
                style={{ background: alpha(colors.teal, '14'), color: colors.teal }}
              >
                <Calendar size={10} />
                {scheduleLabel}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Right column — changelog ──────────────────────────────────────────────────

function ReleaseEntry({ release, isCurrent, t, s }: { release: Release; isCurrent: boolean; t: ThemeTokens; s: LauncherStrings }) {
  const [open, setOpen] = useState(isCurrent)

  return (
    <div
      className="overflow-hidden rounded-xl border transition-all"
      style={{
        borderColor: isCurrent ? alpha(colors.teal, '28') : t.BORDER,
        background: isCurrent ? alpha(colors.teal, '03') : t.CARD_BG,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
        onMouseEnter={e => (e.currentTarget.style.background = alpha(t.TEXT, '03'))}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-bold" style={{ color: t.TEXT }}>{release.name}</span>
            {isCurrent && (
              <span
                className="rounded-full border px-2 py-0.5 text-[8px] font-black tracking-wider"
                style={{ background: alpha(colors.teal, '12'), borderColor: alpha(colors.teal, '28'), color: colors.teal }}
              >
                {s.updates.installedBadge}
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-3">
            <span className="flex items-center gap-1 text-[9px]" style={{ color: t.TEXT_DIM }}>
              <Tag size={8} /> {release.tag}
            </span>
            <span className="flex items-center gap-1 text-[9px]" style={{ color: t.TEXT_DIM }}>
              <Calendar size={8} /> {release.publishedAt}
            </span>
            {release.size && (
              <span className="flex items-center gap-1 text-[9px]" style={{ color: t.TEXT_DIM }}>
                <Download size={8} /> {release.size}
              </span>
            )}
          </div>
        </div>
        <div style={{ color: t.TEXT_DIM, flexShrink: 0 }}>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </button>

      {open && (
        <div
          className="border-t px-4 py-3"
          style={{ borderColor: t.BORDER, background: alpha(t.RAIL_BG, '40') }}
        >
          <ul className="space-y-2">
            {release.notes.map((note, i) => (
              <li key={i} className="flex gap-2.5 text-[11px]" style={{ color: t.TEXT_DIM }}>
                <span
                  className="mt-[5px] h-1 w-1 shrink-0 rounded-full"
                  style={{ background: isCurrent ? colors.teal : t.TEXT_DIM }}
                />
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

type SimState = 'up_to_date' | 'available' | 'updating' | 'done'

export function UpdatesView({ t }: { t: ThemeTokens }) {
  const s = useLocaleStrings(getLauncherStrings)
  const [status,   setStatus]   = useState<InstallStatus>({ phase: 'idle' })
  const [checking, setChecking] = useState(false)
  const [sim,      setSim]      = useState<SimState>('up_to_date')

  const SIM_LABELS: Record<SimState, string> = {
    up_to_date: s.updates.simUpToDate,
    available:  s.updates.simAvailable,
    updating:   s.updates.simUpdating,
    done:       s.updates.simDone,
  }

  const handleUpdate = async () => {
    const steps: Array<{ phase: InstallStatus['phase']; progress?: number; label?: string; delay: number }> = [
      { phase: 'checking',    delay: 600 },
      { phase: 'downloading', progress: 10,  label: s.updates.stepConnecting,  delay: 500  },
      { phase: 'downloading', progress: 45,  label: s.updates.stepDownloading, delay: 1200 },
      { phase: 'downloading', progress: 82,  label: s.updates.stepDownloading, delay: 900  },
      { phase: 'downloading', progress: 98,  label: s.updates.stepVerifying,   delay: 600  },
      { phase: 'installing',  progress: 50,  label: s.updates.stepExtracting,  delay: 800  },
      { phase: 'installing',  progress: 100, label: s.updates.stepFinalizing,  delay: 600  },
      { phase: 'done',        delay: 0 },
    ]
    let elapsed = 0
    for (const step of steps) {
      await new Promise<void>(resolve => setTimeout(() => {
        setStatus({ phase: step.phase, ...(step.progress !== undefined ? { progress: step.progress, label: step.label ?? '' } : {}) } as InstallStatus)
        resolve()
      }, elapsed))
      elapsed += step.delay
    }
  }

  const handleCheck = async () => {
    setChecking(true)
    await new Promise(r => setTimeout(r, 1400))
    setChecking(false)
  }

  return (
    <div className="flex flex-1 overflow-hidden" style={{ background: t.PAGE_BG }}>

      {/* Left column — status */}
      <div
        className="flex w-[280px] shrink-0 flex-col overflow-y-auto border-r p-5"
        style={{ borderColor: t.BORDER, scrollbarGutter: 'stable' }}
      >
        {/* Header + sim switcher */}
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: t.TEXT_DIM }}>
            {s.updates.stateLabel}
          </p>
          <div
            className="flex items-center gap-0.5 rounded-lg border p-0.5"
            style={{ borderColor: t.BORDER, background: alpha(t.TEXT, '04') }}
          >
            {(Object.keys(SIM_LABELS) as SimState[]).map(key => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSim(key)
                  if (key === 'up_to_date') setStatus({ phase: 'idle' })
                  if (key === 'available')  setStatus({ phase: 'up_to_date' })
                  if (key === 'done')       setStatus({ phase: 'done' })
                  if (key === 'updating')   void handleUpdate()
                }}
                className="rounded-md px-2 py-0.5 text-[8px] font-bold transition-all"
                style={{
                  background: sim === key ? t.SURFACE : 'transparent',
                  color: sim === key ? t.TEXT : t.TEXT_DIM,
                  boxShadow: sim === key ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
                }}
              >
                {SIM_LABELS[key]}
              </button>
            ))}
          </div>
        </div>

        <StatusCard
          status={sim === 'available' ? { phase: 'up_to_date' } as InstallStatus : status}
          checking={checking}
          onCheck={handleCheck}
          onUpdate={handleUpdate}
          t={t}
          s={s}
          forceAvailable={sim === 'available'}
        />
      </div>

      {/* Right column — changelog */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-5" style={{ scrollbarGutter: 'stable' }}>
          <p className="mb-3 text-[9px] font-black uppercase tracking-widest" style={{ color: t.TEXT_DIM }}>
            {s.updates.changelogLabel}
          </p>
          <div className="space-y-2">
            {RELEASES.map(r => (
              <ReleaseEntry
                key={r.tag}
                release={r}
                isCurrent={r.tag === `v${CURRENT}`}
                t={t}
                s={s}
              />
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
