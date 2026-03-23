/**
 * SettingsView.tsx — PRISM Launcher
 * Préférences du launcher.
 */

import { useState, useEffect } from 'react'
import {
  Sun, Moon, Folder, Shield, ExternalLink,
  Server, Database, Palette, Info, Monitor, Clock,
} from 'lucide-react'
import { colors, semantic, alpha } from '../tokens'
import type { ThemeTokens } from '../hooks/useTheme'
import { useLocaleStrings, useLocale, setStoredLocale } from '../i18n/useLocale'
import { getLauncherStrings } from '../i18n/launcher'
import type { AppLocale } from '../i18n/types'
import type { LauncherSettings } from '../types'

// ── Primitives ────────────────────────────────────────────────────────────────

function Section({ title, Icon, children, t }: {
  title: string; Icon: React.ElementType; children: React.ReactNode; t: ThemeTokens
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 px-1">
        <Icon size={11} style={{ color: t.TEXT_DIM }} />
        <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: t.TEXT_DIM }}>
          {title}
        </p>
      </div>
      <div
        className="card overflow-hidden rounded-xl border"
        style={{ borderColor: t.BORDER, background: t.CARD_BG }}
      >
        {children}
      </div>
    </div>
  )
}

function Row({ label, hint, children, t }: {
  label: string; hint?: string; children: React.ReactNode; t: ThemeTokens
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 border-b px-4 py-3 last:border-b-0"
      style={{ borderColor: t.BORDER }}
    >
      <div className="min-w-0">
        <p className="text-[12px] font-medium" style={{ color: t.TEXT }}>{label}</p>
        {hint && <p className="text-[10px]" style={{ color: t.TEXT_DIM }}>{hint}</p>}
      </div>
      {children}
    </div>
  )
}

function ActionBtn({ Icon, label, onClick, t }: {
  Icon: React.ElementType; label: string; onClick?: () => void; t: ThemeTokens
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-all hover:opacity-90 active:translate-y-px active:scale-[0.97]"
      style={{
        borderColor: t.BORDER,
        color: t.TEXT_DIM,
        background: alpha(t.TEXT, '04'),
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 6px rgba(0,0,0,0.14)',
      }}
    >
      <Icon size={11} /> {label}
    </button>
  )
}

function Toggle({ on, onToggle, t }: { on: boolean; onToggle: () => void; t: ThemeTokens }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="relative shrink-0 rounded-full transition-colors duration-200"
      style={{
        width: 36,
        height: 20,
        background: on ? colors.teal : t.BORDER,
        boxShadow: on ? `0 0 8px ${alpha(colors.teal, '40')}` : 'none',
      }}
    >
      <span
        className="absolute top-1 rounded-full bg-white transition-transform duration-200"
        style={{
          width: 12,
          height: 12,
          left: 4,
          transform: on ? 'translateX(16px)' : 'translateX(0)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }}
      />
    </button>
  )
}

function Badge({ value }: { value: string; t: ThemeTokens }) {
  return (
    <span
      className="rounded-lg border px-2.5 py-1 font-mono text-[11px] font-bold"
      style={{ borderColor: alpha(colors.teal, '22'), color: colors.tealDim, background: alpha(colors.teal, '08') }}
    >
      {value}
    </span>
  )
}

function PillGroup<T extends string | number>({ options, value, onChange, t }: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  t: ThemeTokens
}) {
  return (
    <div className="flex shrink-0 flex-wrap gap-1.5">
      {options.map(opt => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-all"
            style={{
              background:  active ? alpha(colors.teal, '12') : 'transparent',
              borderColor: active ? alpha(colors.teal, '30') : t.BORDER,
              color:       active ? colors.teal : t.TEXT_DIM,
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Default settings (mirrors main.js DEFAULT_SETTINGS) ───────────────────────

const DEFAULT_SETTINGS: LauncherSettings = {
  prismWindow: {
    rememberBounds:         true,
    defaultSize:            'last_used',
    rememberPosition:       true,
    minimizeLauncherOnOpen: false,
  },
  backend: {
    startupTimeoutSecs: 30,
    autoStartPrism:     false,
    autoUpdatePrism:    false,
  },
  session: {
    durationHours: 8,
  },
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function SettingsView({ t, onToggleTheme }: { t: ThemeTokens; onToggleTheme: () => void }) {
  const [settings, setSettings] = useState<LauncherSettings>(DEFAULT_SETTINGS)
  const [versions, setVersions] = useState<{ launcher: string; prism: string | null }>({ launcher: '…', prism: null })
  const [telemetry, setTelemetry] = useState(false)
  const [timeoutInput, setTimeoutInput] = useState(String(DEFAULT_SETTINGS.backend.startupTimeoutSecs))

  const s = useLocaleStrings(getLauncherStrings)
  const [locale] = useLocale()

  useEffect(() => {
    window.electron?.getVersions?.().then(setVersions).catch(() => {})
    window.electron?.getSettings?.().then((raw: unknown) => {
      const loaded = raw as LauncherSettings
      setSettings(loaded)
      setTimeoutInput(String(loaded.backend.startupTimeoutSecs))
    }).catch(() => {})
  }, [])

  function patchSettings(partial: Partial<LauncherSettings>) {
    setSettings(prev => {
      const next: LauncherSettings = {
        prismWindow: { ...prev.prismWindow, ...partial.prismWindow },
        backend:     { ...prev.backend,     ...partial.backend     },
        session:     { ...prev.session,     ...partial.session     },
      }
      window.electron?.setSettings?.(partial)
      return next
    })
  }

  function commitTimeout() {
    const n = parseInt(timeoutInput, 10)
    if (!Number.isNaN(n) && n >= 5 && n <= 300) {
      patchSettings({ backend: { ...settings.backend, startupTimeoutSecs: n } })
    } else {
      setTimeoutInput(String(settings.backend.startupTimeoutSecs))
    }
  }

  const LOCALES: { value: AppLocale; label: string }[] = [
    { value: 'fr', label: s.settings.language.fr },
    { value: 'en', label: s.settings.language.en },
  ]

  type SizePreset = LauncherSettings['prismWindow']['defaultSize']
  const SIZE_OPTIONS: { value: SizePreset; label: string }[] = [
    { value: 'last_used',   label: s.settings.window.sizes.lastUsed  },
    { value: '1280x800',    label: s.settings.window.sizes.s1280      },
    { value: '1440x900',    label: s.settings.window.sizes.s1440      },
    { value: '1920x1080',   label: s.settings.window.sizes.s1920      },
    { value: 'maximized',   label: s.settings.window.sizes.maximized  },
  ]

  type SessionHours = LauncherSettings['session']['durationHours']
  const SESSION_OPTIONS: { value: SessionHours; label: string }[] = [
    { value: 1,  label: s.settings.session.hours1  },
    { value: 4,  label: s.settings.session.hours4  },
    { value: 8,  label: s.settings.session.hours8  },
    { value: 24, label: s.settings.session.hours24 },
  ]

  return (
    <div
      className="flex flex-1 flex-col overflow-y-auto"
      style={{ background: t.PAGE_BG, scrollbarGutter: 'stable' }}
    >
      {/* Header */}
      <div
        className="shrink-0 border-b px-5 py-4"
        style={{ borderColor: t.BORDER, background: alpha(t.PANEL_BG, '88') }}
      >
        <h2 className="text-[14px] font-bold" style={{ color: t.TEXT }}>{s.settings.title}</h2>
        <p className="text-[11px]" style={{ color: t.TEXT_DIM }}>{s.settings.subtitle}</p>
      </div>

      {/* Sections */}
      <div className="space-y-5 p-5">

        {/* Apparence */}
        <Section title={s.settings.sections.appearance} Icon={Palette} t={t}>
          <Row label={s.settings.appearance.theme} hint={s.settings.appearance.themeHint} t={t}>
            <div className="flex shrink-0 gap-1.5">
              {[
                { label: s.settings.appearance.dark,  Icon: Moon, active: t.isDark  },
                { label: s.settings.appearance.light, Icon: Sun,  active: !t.isDark },
              ].map(({ label, Icon: I, active }) => (
                <button
                  key={label}
                  type="button"
                  onClick={onToggleTheme}
                  className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-all"
                  style={{
                    background:  active ? alpha(colors.teal, '12') : 'transparent',
                    borderColor: active ? alpha(colors.teal, '30') : t.BORDER,
                    color:       active ? colors.teal : t.TEXT_DIM,
                  }}
                >
                  <I size={11} /> {label}
                </button>
              ))}
            </div>
          </Row>
          <Row label={s.settings.language.label} hint={s.settings.language.hint} t={t}>
            <div className="flex shrink-0 gap-1.5">
              {LOCALES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStoredLocale(value)}
                  className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-all"
                  style={{
                    background:  locale === value ? alpha(colors.teal, '12') : 'transparent',
                    borderColor: locale === value ? alpha(colors.teal, '30') : t.BORDER,
                    color:       locale === value ? colors.teal : t.TEXT_DIM,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </Row>
        </Section>

        {/* Fenêtre PRISM */}
        <Section title={s.settings.sections.window} Icon={Monitor} t={t}>
          <Row label={s.settings.window.defaultSize} hint={s.settings.window.defaultSizeHint} t={t}>
            <PillGroup<SizePreset>
              options={SIZE_OPTIONS}
              value={settings.prismWindow.defaultSize}
              onChange={v => patchSettings({ prismWindow: { ...settings.prismWindow, defaultSize: v } })}
              t={t}
            />
          </Row>
          <Row label={s.settings.window.rememberPosition} hint={s.settings.window.rememberPositionHint} t={t}>
            <Toggle
              on={settings.prismWindow.rememberPosition}
              onToggle={() => patchSettings({ prismWindow: { ...settings.prismWindow, rememberPosition: !settings.prismWindow.rememberPosition } })}
              t={t}
            />
          </Row>
          <Row label={s.settings.window.minimizeOnOpen} hint={s.settings.window.minimizeOnOpenHint} t={t}>
            <Toggle
              on={settings.prismWindow.minimizeLauncherOnOpen}
              onToggle={() => patchSettings({ prismWindow: { ...settings.prismWindow, minimizeLauncherOnOpen: !settings.prismWindow.minimizeLauncherOnOpen } })}
              t={t}
            />
          </Row>
        </Section>

        {/* Connexion moteur */}
        <Section title={s.settings.sections.backend} Icon={Server} t={t}>
          <Row label={s.settings.backend.url} hint={s.settings.backend.urlHint} t={t}>
            <code
              className="rounded-lg px-2.5 py-1 font-mono text-[11px]"
              style={{ background: alpha(colors.teal, '08'), color: colors.tealDim, border: `1px solid ${alpha(colors.teal, '20')}` }}
            >
              localhost:8000
            </code>
          </Row>
          <Row label={s.settings.backend.autoStart} hint={s.settings.backend.autoStartHint} t={t}>
            <Toggle
              on={settings.backend.autoStartPrism}
              onToggle={() => patchSettings({ backend: { ...settings.backend, autoStartPrism: !settings.backend.autoStartPrism } })}
              t={t}
            />
          </Row>
          <Row label={s.settings.backend.autoUpdate} hint={s.settings.backend.autoUpdateHint} t={t}>
            <Toggle
              on={settings.backend.autoUpdatePrism}
              onToggle={() => patchSettings({ backend: { ...settings.backend, autoUpdatePrism: !settings.backend.autoUpdatePrism } })}
              t={t}
            />
          </Row>
          <Row label={s.settings.backend.startupTimeout} hint={s.settings.backend.startupTimeoutHint} t={t}>
            <div className="flex shrink-0 items-center gap-1.5">
              <input
                type="number"
                min={5}
                max={300}
                value={timeoutInput}
                onChange={e => setTimeoutInput(e.target.value)}
                onBlur={commitTimeout}
                onKeyDown={e => e.key === 'Enter' && commitTimeout()}
                className="w-16 rounded-lg border bg-transparent px-2.5 py-1 text-center font-mono text-[11px] outline-none transition-all focus:ring-1"
                style={{
                  borderColor: t.BORDER,
                  color: t.TEXT,
                  // @ts-ignore
                  '--tw-ring-color': alpha(colors.teal, '40'),
                }}
              />
              <span className="text-[10px]" style={{ color: t.TEXT_DIM }}>s</span>
            </div>
          </Row>
        </Section>

        {/* Session */}
        <Section title={s.settings.sections.session} Icon={Clock} t={t}>
          <Row label={s.settings.session.duration} hint={s.settings.session.durationHint} t={t}>
            <PillGroup<SessionHours>
              options={SESSION_OPTIONS}
              value={settings.session.durationHours}
              onChange={v => patchSettings({ session: { durationHours: v } })}
              t={t}
            />
          </Row>
        </Section>

        {/* Données locales */}
        <Section title={s.settings.sections.data} Icon={Database} t={t}>
          <Row label={s.settings.data.sqlite} hint={s.settings.data.sqliteHint} t={t}>
            <ActionBtn Icon={Folder} label={s.settings.data.openBtn} onClick={() => window.electron?.openDataDir?.()} t={t} />
          </Row>
          <Row label={s.settings.data.backup} hint={s.settings.data.backupHint} t={t}>
            <ActionBtn Icon={Shield} label={s.settings.data.exportBtn} t={t} />
          </Row>
          <Row label={s.settings.data.telemetry} hint={s.settings.data.telemetryHint} t={t}>
            <Toggle on={telemetry} onToggle={() => setTelemetry(v => !v)} t={t} />
          </Row>
        </Section>

        {/* À propos */}
        <Section title={s.settings.sections.about} Icon={Info} t={t}>
          <Row label={s.settings.about.desktop} t={t}>
            <Badge value={versions.prism ? `v${versions.prism}` : '—'} t={t} />
          </Row>
          <Row label={s.settings.about.launcher} t={t}>
            <Badge value={`v${versions.launcher}`} t={t} />
          </Row>
          <Row label={s.settings.about.standard} hint={s.settings.about.standardHint} t={t}>
            <div
              className="flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1"
              style={{ borderColor: alpha(colors.teal, '22'), background: alpha(colors.teal, '07') }}
            >
              <Shield size={10} style={{ color: colors.teal }} />
              <span className="text-[9px] font-bold tracking-wider" style={{ color: colors.teal }}>
                IEC 61511
              </span>
            </div>
          </Row>
          <Row label={s.settings.about.docs} t={t}>
            <ActionBtn
              Icon={ExternalLink}
              label={s.settings.about.openBtn}
              onClick={() => window.electron?.openDocs?.()}
              t={t}
            />
          </Row>
          <Row label={s.settings.about.bug} t={t}>
            <div
              className="rounded-lg border px-2.5 py-1 text-[10px]"
              style={{ borderColor: t.BORDER, color: t.TEXT_DIM, background: 'transparent' }}
            >
              support@prism.io
            </div>
          </Row>
        </Section>

        {/* Danger zone */}
        <Section title={s.settings.sections.danger} Icon={Shield} t={t}>
          <Row label={s.settings.danger.reset} hint={s.settings.danger.resetHint} t={t}>
            <button
              type="button"
              className="shrink-0 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-opacity hover:opacity-80"
              style={{ borderColor: alpha(semantic.error, '30'), color: semantic.error, background: alpha(semantic.error, '08') }}
            >
              {s.settings.danger.resetBtn}
            </button>
          </Row>
        </Section>

        <div className="h-4" />
      </div>
    </div>
  )
}
