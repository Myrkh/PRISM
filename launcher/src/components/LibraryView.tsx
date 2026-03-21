/**
 * LibraryView.tsx — PRISM Launcher
 * Grid de modules : natifs inclus + extensions disponibles/roadmap.
 */

import { Shield, Activity, Clock, BarChart2, GitBranch, FlaskConical, FileText, Lock } from 'lucide-react'
import { colors, semantic, alpha } from '../tokens'
import { useLocaleStrings } from '../i18n/useLocale'
import { getLauncherStrings } from '../i18n/launcher'
import type { ThemeTokens } from '../hooks/useTheme'
import type { LauncherStrings } from '../i18n/launcher'

// ── Module definitions ────────────────────────────────────────────────────────

const MODULES = [
  // Native — inclus dans PRISM, pas d'installation
  {
    id: 'sil',
    name: 'SIL Calculator',
    desc: 'PFD/PFH calculation, IEC 61511 compliance, redundant architectures',
    Icon: Shield,
    accent: colors.teal,
    status: 'native' as const,
  },
  {
    id: 'prooftest',
    name: 'Proof Test',
    desc: 'Procedure authoring, field campaigns, signed PDF archiving',
    Icon: Activity,
    accent: semantic.success,
    status: 'native' as const,
  },
  {
    id: 'planning',
    name: 'Test Planning',
    desc: 'Test calendar, team assignment, deadline tracking',
    Icon: Clock,
    accent: semantic.info,
    status: 'native' as const,
  },
  // Extensions — modules additionnels
  {
    id: 'lopa',
    name: 'LOPA Engine',
    desc: 'Protection layer analysis, residual frequency, automatic target SIL',
    Icon: BarChart2,
    accent: semantic.warning,
    status: 'available' as const,
  },
  {
    id: 'fta',
    name: 'Fault Tree',
    desc: 'Fault tree analysis, minimal cut sets, import from HAZOP',
    Icon: GitBranch,
    accent: '#8B5CF6',
    status: 'soon' as const,
  },
  {
    id: 'hazop',
    name: 'HAZOP',
    desc: 'Independent HAZOP register, CSV/Excel import, direct SIF creation',
    Icon: FlaskConical,
    accent: '#EC4899',
    status: 'soon' as const,
  },
  {
    id: 'report',
    name: 'Report Generator',
    desc: 'Automated safety dossier, Word/PDF export, IEC 61511 templates',
    Icon: FileText,
    accent: colors.tealDim,
    status: 'soon' as const,
  },
]

// ── Module card ───────────────────────────────────────────────────────────────

function ModuleCard({ mod, t, s }: { mod: typeof MODULES[0]; t: ThemeTokens; s: LauncherStrings }) {
  const Icon = mod.Icon
  const isNative    = mod.status === 'native'
  const isAvailable = mod.status === 'available'
  const isSoon      = mod.status === 'soon'

  return (
    <div
      className="card flex flex-col overflow-hidden rounded-2xl border transition-all duration-150"
      style={{
        borderColor: isNative ? alpha(mod.accent, '28') : t.BORDER,
        background: isNative ? alpha(mod.accent, '04') : t.CARD_BG,
        opacity: isSoon ? 0.6 : 1,
      }}
    >
      {/* Icon zone */}
      <div
        className="flex items-center justify-center py-7"
        style={{ background: alpha(mod.accent, '06') }}
      >
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl border"
          style={{
            background: isNative
              ? `linear-gradient(135deg, ${alpha(mod.accent, '20')}, ${alpha(mod.accent, '08')})`
              : alpha(mod.accent, '10'),
            borderColor: alpha(mod.accent, isSoon ? '18' : '30'),
            boxShadow: isNative ? `0 4px 16px ${alpha(mod.accent, '25')}` : 'none',
          }}
        >
          {isSoon
            ? <Lock size={20} style={{ color: alpha(t.TEXT_DIM, '80') }} />
            : <Icon size={22} style={{ color: mod.accent }} />
          }
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
        <div className="mb-1 flex items-start justify-between gap-2">
          <p className="text-[13px] font-bold leading-tight" style={{ color: t.TEXT }}>
            {mod.name}
          </p>
          {isNative && (
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[8px] font-black tracking-wide"
              style={{ background: alpha(mod.accent, '14'), color: mod.accent }}
            >
              {s.library.badgeNative}
            </span>
          )}
        </div>
        <p className="flex-1 text-[10px] leading-relaxed" style={{ color: t.TEXT_DIM }}>
          {mod.desc}
        </p>

        {/* Action */}
        <div className="mt-3">
          {isNative && (
            <div
              className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-[10px] font-semibold"
              style={{ background: alpha(mod.accent, '10'), color: mod.accent }}
            >
              <Activity size={10} />
              {s.library.actionIncluded}
            </div>
          )}
          {isAvailable && (
            <button
              type="button"
              className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-bold transition-all active:scale-95"
              style={{
                background: `linear-gradient(135deg, ${mod.accent}, ${alpha(mod.accent, 'CC')})`,
                color: '#fff',
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.15), 0 3px 10px ${alpha(mod.accent, '30')}`,
              }}
            >
              {s.library.actionInstall}
            </button>
          )}
          {isSoon && (
            <div
              className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-[10px] font-semibold"
              style={{ background: alpha(t.TEXT, '05'), color: t.TEXT_DIM }}
            >
              {s.library.actionSoon}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function LibraryView({ t }: { t: ThemeTokens }) {
  const s       = useLocaleStrings(getLauncherStrings)
  const native    = MODULES.filter(m => m.status === 'native')
  const available = MODULES.filter(m => m.status === 'available')
  const soon      = MODULES.filter(m => m.status === 'soon')

  return (
    <div
      className="flex flex-1 flex-col overflow-hidden"
      style={{ background: t.PAGE_BG }}
    >
      <div className="flex-1 overflow-y-auto p-5" style={{ scrollbarGutter: 'stable' }}>

        {/* Native modules */}
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-3 px-1">
            <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: t.TEXT_DIM }}>
              {s.library.included}
            </p>
            <div className="h-px flex-1" style={{ background: t.BORDER }} />
            <span className="text-[9px]" style={{ color: alpha(t.TEXT_DIM, '55') }}>
              {native.length} {s.library.modulesCount}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {native.map(m => <ModuleCard key={m.id} mod={m} t={t} s={s} />)}
          </div>
        </div>

        {/* Available extensions */}
        {available.length > 0 && (
          <div className="mb-6">
            <div className="mb-3 flex items-center gap-3 px-1">
              <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: t.TEXT_DIM }}>
                {s.library.extensions}
              </p>
              <div className="h-px flex-1" style={{ background: t.BORDER }} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {available.map(m => <ModuleCard key={m.id} mod={m} t={t} s={s} />)}
            </div>
          </div>
        )}

        {/* Coming soon */}
        {soon.length > 0 && (
          <div>
            <div className="mb-3 flex items-center gap-3 px-1">
              <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: t.TEXT_DIM }}>
                {s.library.roadmap}
              </p>
              <div className="h-px flex-1" style={{ background: t.BORDER }} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {soon.map(m => <ModuleCard key={m.id} mod={m} t={t} s={s} />)}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
