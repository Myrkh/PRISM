/**
 * UpdatesView.tsx — PRISM Launcher
 * Deux colonnes : état de mise à jour (gauche) + changelog collapsible (droite).
 */

import { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle2, RefreshCw, Download, ArrowUpCircle,
  Tag, Calendar, ChevronDown, ChevronRight, PackageCheck,
  Clock, Zap, AlertCircle,
} from 'lucide-react'
import { colors, semantic, alpha } from '../tokens'
import { useLocaleStrings } from '../i18n/useLocale'
import { getLauncherStrings } from '../i18n/launcher'
import type { ThemeTokens } from '../hooks/useTheme'
import type { InstallStatus } from '../types'
import type { LauncherStrings } from '../i18n/launcher'

// ── Types ─────────────────────────────────────────────────────────────────────

interface GithubRelease {
  tag: string
  name: string
  publishedAt: string
  downloadUrl: string | null
  size: string
  body: string
  error?: string
}

// ── Left column — status card ─────────────────────────────────────────────────

function StatusCard({ status, checking, onCheck, onUpdate, release, forceAvailable = false, t, s }: {
  status: InstallStatus
  checking: boolean
  onCheck: () => void
  onUpdate: () => void
  release: GithubRelease | null
  forceAvailable?: boolean
  t: ThemeTokens
  s: LauncherStrings
}) {
  const [scheduleOpen, setScheduleOpen] = useState(false)

  if (forceAvailable) {
    return <UpdateAvailableCard release={release} onUpdate={onUpdate} t={t} s={s} scheduleOpen={scheduleOpen} setScheduleOpen={setScheduleOpen} />
  }

  // Error from GitHub API
  if (release?.error) {
    return (
      <div
        className="card overflow-hidden rounded-2xl border"
        style={{ borderColor: alpha(semantic.error ?? '#ef4444', '28'), background: alpha(semantic.error ?? '#ef4444', '05') }}
      >
        <div className="p-5">
          <AlertCircle size={24} style={{ color: semantic.error ?? '#ef4444', marginBottom: 12 }} />
          <p className="text-[13px] font-bold" style={{ color: t.TEXT }}>{s.updates.errorTitle ?? 'Erreur'}</p>
          <p className="mt-1 text-[11px]" style={{ color: t.TEXT_DIM }}>{release.error}</p>
          <button
            type="button"
            onClick={onCheck}
            className="mt-4 flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-all hover:opacity-80"
            style={{ borderColor: t.BORDER, color: t.TEXT_DIM }}
          >
            <RefreshCw size={11} />
            {s.updates.checkNow}
          </button>
        </div>
      </div>
    )
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
            {release ? s.updates.upToDateBody.replace('{version}', release.tag) : s.updates.upToDateBody.replace('{version}', '—')}
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

  // Update available
  return <UpdateAvailableCard release={release} onUpdate={onUpdate} t={t} s={s} scheduleOpen={scheduleOpen} setScheduleOpen={setScheduleOpen} />
}

const HOURS = ['06:00', '08:00', '10:00', '12:00', '18:00', '20:00', '22:00', '00:00']

function UpdateAvailableCard({ release, onUpdate, t, s, scheduleOpen, setScheduleOpen }: {
  release: GithubRelease | null
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
          {s.updates.availableTitle.replace('{tag}', release?.tag ?? '—')}
        </p>
        {release?.size && (
          <p className="mt-1 text-[11px]" style={{ color: t.TEXT_DIM }}>
            {release.size}
          </p>
        )}

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

function ReleaseEntry({ release, t, s }: { release: GithubRelease; t: ThemeTokens; s: LauncherStrings }) {
  const [open, setOpen] = useState(true)
  const notes = release.body
    ? release.body.split('\n').map(l => l.replace(/^[-*]\s*/, '').trim()).filter(Boolean)
    : []

  return (
    <div
      className="overflow-hidden rounded-xl border transition-all"
      style={{ borderColor: alpha(colors.teal, '28'), background: alpha(colors.teal, '03') }}
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
            <span className="text-[12px] font-bold" style={{ color: t.TEXT }}>{release.name || release.tag}</span>
            <span
              className="rounded-full border px-2 py-0.5 text-[8px] font-black tracking-wider"
              style={{ background: alpha(colors.teal, '12'), borderColor: alpha(colors.teal, '28'), color: colors.teal }}
            >
              {s.updates.installedBadge}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3">
            <span className="flex items-center gap-1 text-[9px]" style={{ color: t.TEXT_DIM }}>
              <Tag size={8} /> {release.tag}
            </span>
            <span className="flex items-center gap-1 text-[9px]" style={{ color: t.TEXT_DIM }}>
              <Calendar size={8} /> {release.publishedAt ? new Date(release.publishedAt).toLocaleDateString('fr-FR') : '—'}
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

      {open && notes.length > 0 && (
        <div
          className="border-t px-4 py-3"
          style={{ borderColor: t.BORDER, background: alpha(t.RAIL_BG, '40') }}
        >
          <ul className="space-y-2">
            {notes.map((note, i) => (
              <li key={i} className="flex gap-2.5 text-[11px]" style={{ color: t.TEXT_DIM }}>
                <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full" style={{ background: colors.teal }} />
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

export function UpdatesView({ t }: { t: ThemeTokens }) {
  const s = useLocaleStrings(getLauncherStrings)
  const [status,   setStatus]   = useState<InstallStatus>({ phase: 'idle' })
  const [checking, setChecking] = useState(false)
  const [release,  setRelease]  = useState<GithubRelease | null>(null)

  // Listen for download/install progress from main process
  useEffect(() => {
    if (!window.electron?.onProgress) return
    const cb = (data: unknown) => {
      setStatus(data as InstallStatus)
    }
    window.electron.onProgress(cb)
    return () => { window.electron?.offProgress?.(cb) }
  }, [])

  const handleCheck = useCallback(async () => {
    setChecking(true)
    setStatus({ phase: 'checking' })
    try {
      const result = (window.electron?.checkUpdate
        ? await window.electron.checkUpdate()
        : { tag: 'dev', name: 'Dev mode', publishedAt: '', downloadUrl: null, size: '—', body: '' }) as GithubRelease
      setRelease(result)
      setStatus({ phase: result.error ? 'idle' : 'up_to_date' })
    } finally {
      setChecking(false)
    }
  }, [])

  // Auto-check on mount
  useEffect(() => { void handleCheck() }, [handleCheck])

  const handleUpdate = useCallback(async () => {
    if (!release?.downloadUrl) return
    const result = await window.electron?.installUpdate?.(release.downloadUrl) as { ok: boolean; error?: string } | undefined
    if (result && !result.ok) {
      setRelease(prev => prev ? { ...prev, error: result.error } : prev)
      setStatus({ phase: 'idle' })
    }
  }, [release])

  const showAvailable = release && !release.error && status.phase !== 'downloading' && status.phase !== 'installing' && status.phase !== 'done' && status.phase !== 'checking'

  return (
    <div className="flex flex-1 overflow-hidden" style={{ background: t.PAGE_BG }}>

      {/* Left column — status */}
      <div
        className="flex w-[280px] shrink-0 flex-col overflow-y-auto border-r p-5"
        style={{ borderColor: t.BORDER, scrollbarGutter: 'stable' }}
      >
        <div className="mb-3">
          <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: t.TEXT_DIM }}>
            {s.updates.stateLabel}
          </p>
        </div>

        <StatusCard
          status={status}
          checking={checking}
          onCheck={handleCheck}
          onUpdate={handleUpdate}
          release={release}
          forceAvailable={!!showAvailable}
          t={t}
          s={s}
        />
      </div>

      {/* Right column — changelog */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-5" style={{ scrollbarGutter: 'stable' }}>
          <p className="mb-3 text-[9px] font-black uppercase tracking-widest" style={{ color: t.TEXT_DIM }}>
            {s.updates.changelogLabel}
          </p>
          <div className="space-y-2">
            {release && !release.error && (
              <ReleaseEntry release={release} t={t} s={s} />
            )}
            {!release && (
              <p className="text-[11px]" style={{ color: t.TEXT_DIM }}>
                {checking ? s.updates.checkingBody : s.updates.noReleaseInfo ?? 'Vérifiez les mises à jour pour voir le changelog.'}
              </p>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
