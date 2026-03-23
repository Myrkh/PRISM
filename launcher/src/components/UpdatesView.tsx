/**
 * UpdatesView.tsx — PRISM Launcher
 * Deux produits côte à côte : PRISM Desktop + Launcher.
 * Colonne gauche : StatusCard par produit (empilées).
 * Colonne droite  : changelog PRISM | Launcher (tabs).
 */

import { useState, useEffect, useCallback } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  CheckCircle2, RefreshCw, Download, ArrowUpCircle,
  Tag, Calendar, ChevronDown, ChevronRight, PackageCheck,
  Clock, Zap, AlertCircle,
  Sparkles, TrendingUp, Wrench, Layers, Cpu, ShieldCheck, AlertTriangle, Code2, List,
} from 'lucide-react'
import { colors, semantic, alpha } from '../tokens'
import { useLocaleStrings } from '../i18n/useLocale'
import { getLauncherStrings } from '../i18n/launcher'
import type { ThemeTokens } from '../hooks/useTheme'
import type { InstallStatus } from '../types'
import type { LauncherStrings } from '../i18n/launcher'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReleaseHistoryEntry {
  tag:         string
  name:        string
  publishedAt: string
  body:        string
}

interface GithubRelease extends ReleaseHistoryEntry {
  downloadUrl: string | null
  size:        string
  history?:    ReleaseHistoryEntry[]
  error?:      string
}

// ── Release notes parser ──────────────────────────────────────────────────────

type SectionType = 'feature' | 'improvement' | 'fix' | 'rework' | 'engine' | 'security' | 'breaking' | 'internal' | 'misc'

interface ParsedSection {
  type:     SectionType
  rawLabel: string
  items:    string[]
}

const SECTION_PATTERNS: Array<{ type: SectionType; keywords: RegExp }> = [
  { type: 'feature',     keywords: /nouveaut|new|feature|ajout|add/i },
  { type: 'improvement', keywords: /amélior|improvement|enhanced|optimis/i },
  { type: 'fix',         keywords: /correct|fix|bug|résolu|patch/i },
  { type: 'rework',      keywords: /refont|rework|refactor|redesign/i },
  { type: 'engine',      keywords: /moteur|engine|calcul|compute/i },
  { type: 'security',    keywords: /sécurit|security/i },
  { type: 'breaking',    keywords: /breaking|rupture|incompatible/i },
  { type: 'internal',    keywords: /interne|internal|\bdev\b|\bci\b|build|infra/i },
]

const SECTION_CONFIG: Record<SectionType, { color: string; Icon: LucideIcon }> = {
  feature:     { color: colors.teal, Icon: Sparkles },
  improvement: { color: '#3b82f6',   Icon: TrendingUp },
  fix:         { color: '#f59e0b',   Icon: Wrench },
  rework:      { color: '#8b5cf6',   Icon: Layers },
  engine:      { color: '#6366f1',   Icon: Cpu },
  security:    { color: '#ef4444',   Icon: ShieldCheck },
  breaking:    { color: '#f97316',   Icon: AlertTriangle },
  internal:    { color: '#64748b',   Icon: Code2 },
  misc:        { color: '#94a3b8',   Icon: List },
}

function detectSectionType(label: string): SectionType {
  for (const { type, keywords } of SECTION_PATTERNS) {
    if (keywords.test(label)) return type
  }
  return 'misc'
}

function parseReleaseBody(body: string): ParsedSection[] | null {
  const lines = body.split('\n')
  if (!lines.some(l => /^##\s/.test(l))) return null

  const sections: ParsedSection[] = []
  let current: ParsedSection | null = null

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    if (/^##\s+/.test(line)) {
      const label = line.replace(/^##\s+/, '').trim()
      current = { type: detectSectionType(label), rawLabel: label, items: [] }
      sections.push(current)
    } else if (/^[-*]\s+/.test(line)) {
      const item = line.replace(/^[-*]\s+/, '').trim()
      if (!item) continue
      if (!current) {
        current = { type: 'misc', rawLabel: 'Changements', items: [] }
        sections.push(current)
      }
      current.items.push(item)
    }
  }
  return sections.filter(s => s.items.length > 0)
}

function ReleaseNotes({ body, t }: { body: string; t: ThemeTokens }) {
  const sections = parseReleaseBody(body)

  if (!sections) {
    const notes = body.split('\n').map(l => l.replace(/^[-*]\s*/, '').trim()).filter(Boolean)
    if (!notes.length) return null
    return (
      <ul className="space-y-2">
        {notes.map((note, i) => (
          <li key={i} className="flex gap-2.5 text-[11px]" style={{ color: t.TEXT_DIM }}>
            <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full" style={{ background: colors.teal }} />
            {note}
          </li>
        ))}
      </ul>
    )
  }

  if (!sections.length) return null

  return (
    <div className="space-y-4">
      {sections.map((section, si) => {
        const { color, Icon } = SECTION_CONFIG[section.type]
        return (
          <div key={si}>
            <div className="mb-2 flex items-center gap-2">
              <div
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded"
                style={{ background: alpha(color, '1A') }}
              >
                <Icon size={11} style={{ color }} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest" style={{ color }}>
                {section.rawLabel}
              </span>
              <span
                className="rounded-full px-1.5 py-0.5 text-[8px] font-bold tabular-nums"
                style={{ background: alpha(color, '14'), color }}
              >
                {section.items.length}
              </span>
              <div className="h-px flex-1" style={{ background: alpha(color, '22') }} />
            </div>
            <ul className="space-y-1.5 pl-1">
              {section.items.map((item, ii) => (
                <li key={ii} className="flex gap-2.5 text-[11px]" style={{ color: t.TEXT_DIM }}>
                  <span
                    className="mt-[5px] h-1 w-1 shrink-0 rounded-full"
                    style={{ background: alpha(color, 'AA') }}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

// ── Status cards ──────────────────────────────────────────────────────────────

const HOURS = ['06:00', '08:00', '10:00', '12:00', '18:00', '20:00', '22:00', '00:00']

function StatusCard({
  product, status, checking, release, installedVersion,
  onCheck, onUpdate, onInstall, t, s,
}: {
  product:          'prism' | 'launcher'
  status:           InstallStatus
  checking:         boolean
  release:          GithubRelease | null
  installedVersion: string | null
  onCheck:          () => void
  onUpdate:         () => void
  onInstall?:       () => void
  t:                ThemeTokens
  s:                LauncherStrings
}) {
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [selMonth, setSelMonth] = useState(new Date().getMonth())
  const [selDay,   setSelDay]   = useState(new Date().getDate())
  const [selHour,  setSelHour]  = useState('22:00')

  const productName = product === 'prism' ? s.updates.prismLabel : s.updates.launcherLabel
  const isUpToDate  = release && installedVersion && (
    product === 'prism'
      ? release.tag === installedVersion
      : release.tag === `launcher-v${installedVersion}`
  )
  const showAvailable = release && !release.error && !isUpToDate
    && !['downloading', 'installing', 'ready', 'done', 'checking'].includes(status.phase)

  // Error
  if (release?.error) {
    return (
      <div
        className="overflow-hidden rounded-xl border"
        style={{ borderColor: alpha(semantic.error, '28'), background: alpha(semantic.error, '05') }}
      >
        <div className="p-4">
          <AlertCircle size={20} style={{ color: semantic.error, marginBottom: 10 }} />
          <p className="text-[12px] font-bold" style={{ color: t.TEXT }}>{s.updates.errorTitle}</p>
          <p className="mt-1 text-[10px]" style={{ color: t.TEXT_DIM }}>{release.error}</p>
          <button
            type="button" onClick={onCheck}
            className="mt-3 flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[10px] font-medium transition-all hover:opacity-80"
            style={{ borderColor: t.BORDER, color: t.TEXT_DIM }}
          >
            <RefreshCw size={10} /> {s.updates.checkNow}
          </button>
        </div>
      </div>
    )
  }

  // Checking
  if (status.phase === 'checking') {
    return (
      <div
        className="overflow-hidden rounded-xl border"
        style={{ borderColor: alpha(colors.teal, '28'), background: alpha(colors.teal, '04') }}
      >
        <div className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: alpha(colors.teal, '15') }}>
          <RefreshCw size={9} className="animate-spin" style={{ color: colors.teal }} />
          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: colors.teal }}>{s.updates.checkingBadge}</span>
        </div>
        <div className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border" style={{ background: alpha(colors.teal, '10'), borderColor: alpha(colors.teal, '22') }}>
            <Zap size={18} style={{ color: colors.teal }} />
          </div>
          <div>
            <p className="text-[12px] font-bold" style={{ color: t.TEXT }}>{s.updates.checkingTitle}</p>
            <p className="text-[10px]" style={{ color: t.TEXT_DIM }}>{productName}</p>
          </div>
        </div>
      </div>
    )
  }

  // Downloading / Installing
  if (status.phase === 'downloading' || status.phase === 'installing') {
    const pct   = 'progress' in status ? status.progress : 0
    const label = 'label' in status ? status.label : ''
    const badge = status.phase === 'downloading' ? s.updates.downloadingBadge : s.updates.installingBadge
    return (
      <div
        className="overflow-hidden rounded-xl border"
        style={{ borderColor: alpha(colors.teal, '28'), background: alpha(colors.teal, '04') }}
      >
        <div className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: alpha(colors.teal, '15') }}>
          <RefreshCw size={9} className="animate-spin" style={{ color: colors.teal }} />
          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: colors.teal }}>{badge}</span>
          <span className="ml-auto font-mono text-[9px] font-bold" style={{ color: colors.teal }}>{Math.round(pct ?? 0)}%</span>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border" style={{ background: alpha(colors.teal, '10'), borderColor: alpha(colors.teal, '22') }}>
              <Download size={18} style={{ color: colors.teal }} />
            </div>
            <div>
              <p className="text-[12px] font-bold" style={{ color: t.TEXT }}>{s.updates.inProgressTitle}</p>
              <p className="text-[10px]" style={{ color: t.TEXT_DIM }}>{label}</p>
            </div>
          </div>
          <div className="overflow-hidden rounded-full" style={{ height: 5, background: alpha(colors.teal, '15') }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${pct ?? 0}%`, background: `linear-gradient(90deg, ${colors.teal}, ${colors.tealDim})`, boxShadow: `0 0 6px ${alpha(colors.teal, '50')}` }}
            />
          </div>
        </div>
      </div>
    )
  }

  // Ready (Launcher only — installer downloaded)
  if (status.phase === 'ready') {
    return (
      <div
        className="overflow-hidden rounded-xl border"
        style={{ borderColor: alpha(colors.teal, '30'), background: alpha(colors.teal, '05') }}
      >
        <div className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: alpha(colors.teal, '15') }}>
          <CheckCircle2 size={9} style={{ color: colors.teal }} />
          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: colors.teal }}>{s.updates.readyBadge}</span>
        </div>
        <div className="p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border" style={{ background: alpha(colors.teal, '12'), borderColor: alpha(colors.teal, '25') }}>
              <CheckCircle2 size={18} style={{ color: colors.teal }} />
            </div>
            <div>
              <p className="text-[12px] font-bold" style={{ color: t.TEXT }}>{s.updates.readyTitle}</p>
              <p className="text-[10px]" style={{ color: t.TEXT_DIM }}>{s.updates.readyBody}</p>
            </div>
          </div>
          <button
            type="button" onClick={onInstall}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-[11px] font-bold transition-all active:scale-95"
            style={{ background: `linear-gradient(135deg, ${colors.teal}, ${colors.tealDark})`, color: '#041014', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)' }}
          >
            <ArrowUpCircle size={12} /> {s.updates.readyBtn}
          </button>
        </div>
      </div>
    )
  }

  // Done (PRISM — restart PRISM)
  if (status.phase === 'done') {
    return (
      <div
        className="overflow-hidden rounded-xl border"
        style={{ borderColor: alpha(semantic.success, '28'), background: alpha(semantic.success, '05') }}
      >
        <div className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: alpha(semantic.success, '15') }}>
          <CheckCircle2 size={9} style={{ color: semantic.success }} />
          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: semantic.success }}>{s.updates.doneBadge}</span>
        </div>
        <div className="p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border" style={{ background: alpha(semantic.success, '12'), borderColor: alpha(semantic.success, '25') }}>
              <CheckCircle2 size={18} style={{ color: semantic.success }} />
            </div>
            <div>
              <p className="text-[12px] font-bold" style={{ color: t.TEXT }}>{s.updates.doneTitle}</p>
              <p className="text-[10px]" style={{ color: t.TEXT_DIM }}>{s.updates.doneBody}</p>
            </div>
          </div>
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-[11px] font-bold transition-all active:scale-95"
            style={{ background: `linear-gradient(135deg, ${colors.teal}, ${colors.tealDark})`, color: '#041014', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)' }}
            onClick={() => window.electron?.launchPrism?.()}
          >
            <ArrowUpCircle size={12} /> {s.updates.restartBtn}
          </button>
        </div>
      </div>
    )
  }

  // Available
  if (showAvailable) {
    const months    = s.updates.months
    const daysInMonth = new Date(new Date().getFullYear(), selMonth + 1, 0).getDate()
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
    const scheduleLabel = s.updates.scheduleConfirm
      .replace('{month}', months[selMonth])
      .replace('{day}',   String(selDay))
      .replace('{hour}',  selHour)

    return (
      <div
        className="overflow-hidden rounded-xl border"
        style={{ borderColor: alpha(colors.teal, '30'), background: alpha(colors.teal, '05') }}
      >
        <div className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: alpha(colors.teal, '15') }}>
          <ArrowUpCircle size={9} style={{ color: colors.teal }} />
          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: colors.teal }}>{s.updates.availableBadge}</span>
        </div>
        <div className="p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border" style={{ background: alpha(colors.teal, '10'), borderColor: alpha(colors.teal, '22') }}>
              <ArrowUpCircle size={18} style={{ color: colors.teal }} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-bold" style={{ color: t.TEXT }}>
                {s.updates.availableTitle.replace('{product}', productName).replace('{tag}', release?.tag ?? '—')}
              </p>
              {release?.size && <p className="text-[10px]" style={{ color: t.TEXT_DIM }}>{release.size}</p>}
            </div>
          </div>
          <button
            type="button" onClick={onUpdate}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-[11px] font-bold transition-all active:scale-[0.98]"
            style={{ background: `linear-gradient(160deg, ${colors.teal}, ${colors.tealDark})`, color: '#041014', boxShadow: `inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 14px rgba(0,155,164,0.3)` }}
          >
            <ArrowUpCircle size={12} /> {s.updates.updateNowBtn}
          </button>

          {/* Schedule picker — PRISM only */}
          {product === 'prism' && (
            <>
              <button
                type="button"
                onClick={() => setScheduleOpen(v => !v)}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-[10px] font-medium transition-all hover:opacity-80"
                style={{ color: t.TEXT_DIM }}
              >
                <Clock size={9} /> {s.updates.scheduleBtn}
                <ChevronDown size={9} className={`transition-transform duration-200 ${scheduleOpen ? 'rotate-180' : ''}`} />
              </button>

              {scheduleOpen && (
                <div className="mt-2 overflow-hidden rounded-xl border" style={{ background: alpha(t.RAIL_BG, 'CC'), borderColor: t.BORDER }}>
                  <div className="border-b px-3 pt-3 pb-2" style={{ borderColor: t.BORDER }}>
                    <p className="mb-1.5 text-[8px] font-black uppercase tracking-widest" style={{ color: t.TEXT_DIM }}>{s.updates.pickerMonth}</p>
                    <div className="grid grid-cols-6 gap-1">
                      {months.map((m, i) => (
                        <button key={m} type="button" onClick={() => { setSelMonth(i); setSelDay(1) }}
                          className="rounded-md py-1 text-[9px] font-semibold transition-all"
                          style={{ background: selMonth === i ? colors.teal : alpha(t.TEXT, '05'), color: selMonth === i ? '#041014' : t.TEXT_DIM }}
                        >{m}</button>
                      ))}
                    </div>
                  </div>
                  <div className="border-b px-3 pt-2.5 pb-2" style={{ borderColor: t.BORDER }}>
                    <p className="mb-1.5 text-[8px] font-black uppercase tracking-widest" style={{ color: t.TEXT_DIM }}>{s.updates.pickerDay}</p>
                    <div className="grid grid-cols-7 gap-1">
                      {days.map(d => (
                        <button key={d} type="button" onClick={() => setSelDay(d)}
                          className="rounded-md py-1 text-[9px] font-semibold transition-all"
                          style={{ background: selDay === d ? colors.teal : alpha(t.TEXT, '05'), color: selDay === d ? '#041014' : t.TEXT_DIM }}
                        >{d}</button>
                      ))}
                    </div>
                  </div>
                  <div className="px-3 pt-2.5 pb-3">
                    <p className="mb-1.5 text-[8px] font-black uppercase tracking-widest" style={{ color: t.TEXT_DIM }}>{s.updates.pickerHour}</p>
                    <div className="grid grid-cols-4 gap-1">
                      {HOURS.map(h => (
                        <button key={h} type="button" onClick={() => setSelHour(h)}
                          className="rounded-md py-1 font-mono text-[9px] font-semibold transition-all"
                          style={{ background: selHour === h ? colors.teal : alpha(t.TEXT, '05'), color: selHour === h ? '#041014' : t.TEXT_DIM }}
                        >{h}</button>
                      ))}
                    </div>
                  </div>
                  <div className="border-t px-3 py-2.5" style={{ borderColor: t.BORDER }}>
                    <button type="button" onClick={() => setScheduleOpen(false)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-[10px] font-bold transition-all active:scale-95"
                      style={{ background: alpha(colors.teal, '14'), color: colors.teal }}
                    >
                      <Calendar size={9} /> {scheduleLabel}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  // Up to date (idle / up_to_date)
  return (
    <div
      className="overflow-hidden rounded-xl border"
      style={{ borderColor: alpha(semantic.success, '25'), background: alpha(semantic.success, '05') }}
    >
      <div className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: alpha(semantic.success, '15') }}>
        <div className="h-1.5 w-1.5 rounded-full" style={{ background: semantic.success, boxShadow: `0 0 6px ${semantic.success}` }} />
        <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: semantic.success }}>{s.updates.upToDateBadge}</span>
      </div>
      <div className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border" style={{ background: alpha(semantic.success, '10'), borderColor: alpha(semantic.success, '22') }}>
          <PackageCheck size={18} style={{ color: semantic.success }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold" style={{ color: t.TEXT }}>
            {s.updates.upToDateTitle.replace('{product}', productName)}
          </p>
          <p className="text-[10px]" style={{ color: t.TEXT_DIM }}>
            {release ? s.updates.upToDateBody.replace('{version}', release.tag) : '—'}
          </p>
        </div>
        <button
          type="button" onClick={onCheck} disabled={checking}
          className="shrink-0 flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-medium transition-all hover:opacity-80 disabled:opacity-50"
          style={{ borderColor: t.BORDER, color: t.TEXT_DIM }}
        >
          <RefreshCw size={9} className={checking ? 'animate-spin' : ''} />
          {checking ? s.updates.checking : s.updates.checkNow}
        </button>
      </div>
    </div>
  )
}

// ── Changelog entry ───────────────────────────────────────────────────────────

function ReleaseEntry({ release, isLatest, t, s }: { release: ReleaseHistoryEntry; isLatest: boolean; t: ThemeTokens; s: LauncherStrings }) {
  const [open, setOpen] = useState(isLatest)
  const hasNotes = !!release.body?.trim()

  return (
    <div
      className="overflow-hidden rounded-xl border transition-all"
      style={{ borderColor: isLatest ? alpha(colors.teal, '28') : t.BORDER, background: isLatest ? alpha(colors.teal, '03') : t.CARD_BG }}
    >
      <button
        type="button" onClick={() => setOpen(v => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
        onMouseEnter={e => (e.currentTarget.style.background = alpha(t.TEXT, '03'))}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-bold" style={{ color: t.TEXT }}>{release.name || release.tag}</span>
            {isLatest && (
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
              <Calendar size={8} /> {release.publishedAt ? new Date(release.publishedAt).toLocaleDateString('fr-FR') : '—'}
            </span>
            {'size' in release && (release as GithubRelease).size && (
              <span className="flex items-center gap-1 text-[9px]" style={{ color: t.TEXT_DIM }}>
                <Download size={8} /> {(release as GithubRelease).size}
              </span>
            )}
          </div>
        </div>
        <div style={{ color: t.TEXT_DIM, flexShrink: 0 }}>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </button>

      {open && hasNotes && (
        <div className="border-t px-4 py-4" style={{ borderColor: t.BORDER, background: alpha(t.RAIL_BG, '40') }}>
          <ReleaseNotes body={release.body} t={t} />
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function UpdatesView({ t, installedVersion }: { t: ThemeTokens; installedVersion: string | null }) {
  const s = useLocaleStrings(getLauncherStrings)

  // ── PRISM state
  const [prismStatus,   setPrismStatus]   = useState<InstallStatus>({ phase: 'idle' })
  const [prismChecking, setPrismChecking] = useState(false)
  const [prismRelease,  setPrismRelease]  = useState<GithubRelease | null>(null)

  // ── Launcher state
  const [launcherStatus,   setLauncherStatus]   = useState<InstallStatus>({ phase: 'idle' })
  const [launcherChecking, setLauncherChecking] = useState(false)
  const [launcherRelease,  setLauncherRelease]  = useState<GithubRelease | null>(null)
  const [launcherVersion,  setLauncherVersion]  = useState<string | null>(null)

  // ── Changelog tab
  const [tab, setTab] = useState<'prism' | 'launcher'>('prism')

  // ── Get launcher version
  useEffect(() => {
    window.electron?.getVersions?.().then(v => setLauncherVersion(v.launcher)).catch(() => {})
  }, [])

  // ── Progress listeners
  useEffect(() => {
    if (!window.electron?.onProgress) return
    const cb = (data: unknown) => setPrismStatus(data as InstallStatus)
    window.electron.onProgress(cb)
    return () => { window.electron?.offProgress?.(cb) }
  }, [])

  useEffect(() => {
    if (!window.electron?.onLauncherProgress) return
    const cb = (data: unknown) => setLauncherStatus(data as InstallStatus)
    window.electron.onLauncherProgress(cb)
    return () => { window.electron?.offLauncherProgress?.(cb) }
  }, [])

  // ── PRISM handlers
  const handlePrismCheck = useCallback(async () => {
    setPrismChecking(true)
    setPrismStatus({ phase: 'checking' })
    try {
      const result = (window.electron?.checkUpdate
        ? await window.electron.checkUpdate()
        : { tag: 'dev', name: 'Dev mode', publishedAt: '', downloadUrl: null, size: '—', body: '' }) as GithubRelease
      setPrismRelease(result)
      setPrismStatus({ phase: result.error ? 'idle' : 'up_to_date' })
    } finally {
      setPrismChecking(false)
    }
  }, [])

  const handlePrismUpdate = useCallback(async () => {
    if (!prismRelease?.downloadUrl) {
      setPrismRelease(prev => prev ? { ...prev, error: 'URL de téléchargement introuvable.' } : prev)
      return
    }
    setPrismStatus({ phase: 'downloading', progress: 0, label: 'Connexion…' })
    const result = await window.electron?.installUpdate?.(prismRelease.downloadUrl) as { ok: boolean; error?: string } | undefined
    if (result && !result.ok) {
      setPrismRelease(prev => prev ? { ...prev, error: result.error } : prev)
      setPrismStatus({ phase: 'idle' })
    }
  }, [prismRelease])

  // ── Launcher handlers
  const handleLauncherCheck = useCallback(async () => {
    setLauncherChecking(true)
    setLauncherStatus({ phase: 'checking' })
    try {
      const result = await window.electron?.checkLauncherUpdate?.() as GithubRelease
      setLauncherRelease(result)
      setLauncherStatus({ phase: result?.error ? 'idle' : 'up_to_date' })
    } finally {
      setLauncherChecking(false)
    }
  }, [])

  const handleLauncherUpdate = useCallback(async () => {
    if (!launcherRelease?.downloadUrl) {
      setLauncherRelease(prev => prev ? { ...prev, error: 'URL de téléchargement introuvable.' } : prev)
      return
    }
    setLauncherStatus({ phase: 'downloading', progress: 0, label: 'Connexion…' })
    const result = await window.electron?.downloadLauncherUpdate?.(launcherRelease.downloadUrl) as { ok: boolean; error?: string } | undefined
    if (result && !result.ok) {
      setLauncherRelease(prev => prev ? { ...prev, error: result.error } : prev)
      setLauncherStatus({ phase: 'idle' })
    }
    // On success → 'ready' phase set via onLauncherProgress
  }, [launcherRelease])

  const handleLauncherInstall = useCallback(async () => {
    await window.electron?.applyLauncherUpdate?.()
    // App quits — no state update needed
  }, [])

  // ── Auto-check on mount
  useEffect(() => {
    void handlePrismCheck()
    void handleLauncherCheck()
  }, [handlePrismCheck, handleLauncherCheck])

  const activeRelease    = tab === 'prism' ? prismRelease    : launcherRelease
  const activeHistory    = activeRelease ? (activeRelease.history ?? [activeRelease]) : []

  return (
    <div className="flex flex-1 overflow-hidden" style={{ background: t.PAGE_BG }}>

      {/* Left — status cards */}
      <div
        className="flex w-[300px] shrink-0 flex-col gap-3 overflow-y-auto border-r p-4"
        style={{ borderColor: t.BORDER, scrollbarGutter: 'stable' }}
      >
        {/* PRISM */}
        <div>
          <p className="mb-2 px-0.5 text-[9px] font-black uppercase tracking-widest" style={{ color: t.TEXT_DIM }}>
            {s.updates.prismLabel}
          </p>
          <StatusCard
            product="prism"
            status={prismStatus}
            checking={prismChecking}
            release={prismRelease}
            installedVersion={installedVersion}
            onCheck={handlePrismCheck}
            onUpdate={handlePrismUpdate}
            t={t} s={s}
          />
        </div>

        {/* Launcher */}
        <div>
          <p className="mb-2 px-0.5 text-[9px] font-black uppercase tracking-widest" style={{ color: t.TEXT_DIM }}>
            {s.updates.launcherLabel}
          </p>
          <StatusCard
            product="launcher"
            status={launcherStatus}
            checking={launcherChecking}
            release={launcherRelease}
            installedVersion={launcherVersion}
            onCheck={handleLauncherCheck}
            onUpdate={handleLauncherUpdate}
            onInstall={handleLauncherInstall}
            t={t} s={s}
          />
        </div>
      </div>

      {/* Right — changelog */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Tab switcher */}
        <div className="flex shrink-0 items-center gap-1 border-b px-4 py-2" style={{ borderColor: t.BORDER }}>
          <p className="mr-3 text-[9px] font-black uppercase tracking-widest" style={{ color: t.TEXT_DIM }}>
            {s.updates.changelogLabel}
          </p>
          {(['prism', 'launcher'] as const).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setTab(p)}
              className="rounded-lg px-3 py-1 text-[10px] font-semibold transition-all"
              style={{
                background:  tab === p ? alpha(colors.teal, '12') : 'transparent',
                color:       tab === p ? colors.teal : t.TEXT_DIM,
                border:      `1px solid ${tab === p ? alpha(colors.teal, '28') : 'transparent'}`,
              }}
            >
              {p === 'prism' ? s.updates.tabPrism : s.updates.tabLauncher}
            </button>
          ))}
        </div>

        {/* Entries */}
        <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarGutter: 'stable' }}>
          {activeHistory.length > 0 ? (
            <div className="space-y-2">
              {activeHistory.map((r, i) => (
                <ReleaseEntry key={r.tag} release={r} isLatest={i === 0} t={t} s={s} />
              ))}
            </div>
          ) : (
            <p className="text-[11px]" style={{ color: t.TEXT_DIM }}>
              {activeRelease?.error ? activeRelease.error : s.updates.noReleaseInfo}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
