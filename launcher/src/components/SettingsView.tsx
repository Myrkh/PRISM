/**
 * SettingsView.tsx — PRISM Launcher
 * Préférences du launcher.
 */

import { useState, useEffect } from 'react'
import { Sun, Moon, Folder, Shield, ExternalLink, Server, Database, Palette, Info } from 'lucide-react'
import { colors, semantic, alpha } from '../tokens'
import type { ThemeTokens } from '../hooks/useTheme'
import { useLocaleStrings, useLocale, setStoredLocale } from '../i18n/useLocale'
import { getLauncherStrings } from '../i18n/launcher'
import type { AppLocale } from '../i18n/types'

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
      <div>
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
      className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-all hover:opacity-90 active:translate-y-px active:scale-[0.97]"
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

// ── Main ──────────────────────────────────────────────────────────────────────

export function SettingsView({ t, onToggleTheme }: { t: ThemeTokens; onToggleTheme: () => void }) {
  const [autoStart, setAutoStart] = useState(true)
  const [autoUpdate, setAutoUpdate] = useState(false)
  const [telemetry, setTelemetry]  = useState(false)
  const [versions, setVersions] = useState<{ launcher: string; prism: string | null }>({ launcher: '…', prism: null })
  const s = useLocaleStrings(getLauncherStrings)
  const [locale] = useLocale()

  useEffect(() => {
    window.electron?.getVersions?.().then(setVersions).catch(() => {})
  }, [])

  const LOCALES: { value: AppLocale; label: string }[] = [
    { value: 'fr', label: s.settings.language.fr },
    { value: 'en', label: s.settings.language.en },
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
            <div className="flex gap-1.5">
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
            <div className="flex gap-1.5">
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

        {/* Backend */}
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
            <Toggle on={autoStart} onToggle={() => setAutoStart(v => !v)} t={t} />
          </Row>
          <Row label={s.settings.backend.autoUpdate} hint={s.settings.backend.autoUpdateHint} t={t}>
            <Toggle on={autoUpdate} onToggle={() => setAutoUpdate(v => !v)} t={t} />
          </Row>
        </Section>

        {/* Données */}
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
              className="flex items-center gap-1.5 rounded-full border px-2.5 py-1"
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
              onClick={() => window.open('https://docs.prism.io')}
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
              className="rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-opacity hover:opacity-80"
              style={{ borderColor: alpha(semantic.error, '30'), color: semantic.error, background: alpha(semantic.error, '08') }}
            >
              {s.settings.danger.resetBtn}
            </button>
          </Row>
        </Section>

        {/* Padding bottom */}
        <div className="h-4" />
      </div>
    </div>
  )
}
