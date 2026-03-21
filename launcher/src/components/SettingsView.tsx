/**
 * src/components/SettingsView.tsx — PRISM Launcher
 * Préférences du launcher : thème, backend URL, données, à propos.
 */

import { Sun, Moon, Monitor, Folder, Shield, Info, ExternalLink } from 'lucide-react'
import { colors, alpha } from '../tokens'
import type { ThemeTokens } from '../hooks/useTheme'

interface SettingsViewProps {
  t:           ThemeTokens
  onToggleTheme: () => void
}

// ─── Primitives ────────────────────────────────────────────────────────────

function Section({
  title, children, t,
}: {
  title:    string
  children: React.ReactNode
  t:        ThemeTokens
}) {
  return (
    <div>
      <p
        className="mb-2 px-1 text-[9px] font-black uppercase tracking-widest"
        style={{ color: t.TEXT_DIM }}
      >
        {title}
      </p>
      <div
        className="rounded-2xl border divide-y overflow-hidden"
        style={{ borderColor: t.BORDER, background: t.CARD_BG }}
      >
        {children}
      </div>
    </div>
  )
}

function SettingRow({
  label, hint, children, t,
}: {
  label:    string
  hint?:    string
  children: React.ReactNode
  t:        ThemeTokens
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div>
        <p className="text-[12px] font-medium" style={{ color: t.TEXT }}>{label}</p>
        {hint && <p className="text-[10px]" style={{ color: t.TEXT_DIM }}>{hint}</p>}
      </div>
      {children}
    </div>
  )
}

// ─── Theme picker ──────────────────────────────────────────────────────────

function ThemePicker({ t, onToggle }: { t: ThemeTokens; onToggle: () => void }) {
  return (
    <div className="flex gap-2">
      {[
        { label: 'Sombre', Icon: Moon,    active: t.isDark },
        { label: 'Clair',  Icon: Sun,     active: !t.isDark },
      ].map(({ label, Icon, active }) => (
        <button
          key={label}
          type="button"
          onClick={onToggle}
          className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-semibold transition-all"
          style={{
            background:  active ? alpha(colors.teal, '14') : 'transparent',
            borderColor: active ? alpha(colors.teal, '35') : t.BORDER,
            color:       active ? colors.teal : t.TEXT_DIM,
          }}
        >
          <Icon size={12} />
          {label}
        </button>
      ))}
    </div>
  )
}

// ─── Main SettingsView ─────────────────────────────────────────────────────

export function SettingsView({ t, onToggleTheme }: SettingsViewProps) {
  return (
    <div
      className="flex flex-1 flex-col gap-5 overflow-y-auto p-6"
      style={{ background: t.PAGE_BG, scrollbarGutter: 'stable' }}
    >
      <div>
        <h2 className="text-[15px] font-bold" style={{ color: t.TEXT }}>Préférences</h2>
        <p className="text-[11px]" style={{ color: t.TEXT_DIM }}>Paramètres du launcher PRISM Desktop</p>
      </div>

      {/* Apparence */}
      <Section title="Apparence" t={t}>
        <SettingRow
          label="Thème"
          hint="Appliqué au launcher et à l'application"
          t={t}
        >
          <ThemePicker t={t} onToggle={onToggleTheme} />
        </SettingRow>
      </Section>

      {/* Backend */}
      <Section title="Connexion backend" t={t}>
        <SettingRow
          label="URL du backend"
          hint="Serveur FastAPI local de PRISM"
          t={t}
        >
          <code
            className="rounded-lg px-2.5 py-1 text-[11px] font-mono"
            style={{ background: t.SURFACE, color: colors.tealDim, border: `1px solid ${t.BORDER}` }}
          >
            localhost:8000
          </code>
        </SettingRow>
        <SettingRow
          label="Démarrage automatique"
          hint="Lance le backend au démarrage du launcher"
          t={t}
        >
          <Toggle t={t} defaultOn />
        </SettingRow>
      </Section>

      {/* Données */}
      <Section title="Données locales" t={t}>
        <SettingRow
          label="Base de données SQLite"
          hint="C:\\Users\\…\\AppData\\Roaming\\PRISM\\prism.db"
          t={t}
        >
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-medium transition-opacity hover:opacity-70"
            style={{ borderColor: t.BORDER, color: t.TEXT_DIM, background: 'transparent' }}
            onClick={() => window.electron?.openDataDir?.()}
          >
            <Folder size={12} /> Ouvrir
          </button>
        </SettingRow>
        <SettingRow
          label="Exporter un backup"
          hint="Copie manuelle de prism.db"
          t={t}
        >
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-medium transition-opacity hover:opacity-70"
            style={{ borderColor: t.BORDER, color: t.TEXT_DIM, background: 'transparent' }}
          >
            <Shield size={12} /> Exporter
          </button>
        </SettingRow>
      </Section>

      {/* À propos */}
      <Section title="À propos" t={t}>
        <SettingRow label="Version PRISM" t={t}>
          <span className="text-[11px] font-bold" style={{ color: colors.tealDim }}>v3.0.2</span>
        </SettingRow>
        <SettingRow label="Version Launcher" t={t}>
          <span className="text-[11px] font-bold" style={{ color: colors.tealDim }}>v1.0.0</span>
        </SettingRow>
        <SettingRow label="Documentation" t={t}>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-medium transition-opacity hover:opacity-70"
            style={{ borderColor: t.BORDER, color: t.TEXT_DIM }}
            onClick={() => window.open('https://docs.prism.io')}
          >
            <ExternalLink size={12} /> Ouvrir
          </button>
        </SettingRow>
        <SettingRow label="Moteur IEC 61511" hint="Standard de sécurité fonctionnelle" t={t}>
          <Info size={14} style={{ color: t.TEXT_DIM }} />
        </SettingRow>
      </Section>
    </div>
  )
}

// ─── Toggle primitive ──────────────────────────────────────────────────────

function Toggle({ t, defaultOn = false }: { t: ThemeTokens; defaultOn?: boolean }) {
  return (
    <label
      className="relative inline-flex cursor-pointer items-center"
      style={{ width: 36, height: 20 }}
    >
      <input type="checkbox" defaultChecked={defaultOn} className="peer sr-only" />
      <div
        className="peer h-5 w-9 rounded-full transition-colors peer-checked:bg-teal-600"
        style={{
          background:    defaultOn ? colors.teal : t.BORDER,
          width:         36,
          height:        20,
          borderRadius:  10,
        }}
      />
      <span
        className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-4"
        style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff' }}
      />
    </label>
  )
}
