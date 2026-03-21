/**
 * src/components/LibraryView.tsx — PRISM Launcher v3
 * Design : modules en bento grid avec texture, badges, visuels.
 * Projets récents en grille cards avec statuts et métriques.
 */

import { useState } from 'react'
import {
  CheckCircle2, Lock, ChevronRight,
  Shield, Activity, Clock, Layers,
  BarChart2, GitBranch, FlaskConical,
  FolderOpen, ArrowUpRight,
} from 'lucide-react'
import { colors, semantic, alpha } from '../tokens'
import type { ThemeTokens } from '../hooks/useTheme'

// ─── Data ──────────────────────────────────────────────────────────────────

const MODULES = [
  {
    id: 'sil', name: 'SIL Calculator', tag: 'Core',
    desc: 'PFD/PFH · Markov · Monte Carlo · IEC 61511',
    version: '3.0.2', status: 'installed' as const,
    Icon: Shield, accent: colors.teal,
    stats: [{ label: 'SIFs', value: '14' }, { label: 'Runs', value: '37' }],
    featured: true,
  },
  {
    id: 'prooftest', name: 'Proof Test', tag: 'Core',
    desc: 'Procédures · Campagnes · PDF archivé',
    version: '3.0.2', status: 'installed' as const,
    Icon: Activity, accent: semantic.success,
    stats: [{ label: 'Campagnes', value: '8' }, { label: 'Verdicts', value: '32' }],
    featured: false,
  },
  {
    id: 'planning', name: 'Planning', tag: 'Core',
    desc: 'Calendrier · Équipe · Échéances T1',
    version: '3.0.2', status: 'installed' as const,
    Icon: Clock, accent: semantic.info,
    stats: [{ label: 'Planifiés', value: '4' }, { label: 'En retard', value: '1' }],
    featured: false,
  },
  {
    id: 'library', name: 'Component Library', tag: 'Core',
    desc: 'Catalogue λD/DC · Templates · Import lot',
    version: '3.0.2', status: 'installed' as const,
    Icon: Layers, accent: colors.tealDim,
    stats: [{ label: 'Templates', value: '142' }, { label: 'Perso', value: '18' }],
    featured: false,
  },
  {
    id: 'lopa', name: 'LOPA Engine', tag: 'Roadmap',
    desc: 'Fréquence résiduelle · IPLs · SIL cible auto',
    status: 'coming_soon' as const,
    Icon: BarChart2, accent: semantic.warning,
    featured: false, stats: [],
  },
  {
    id: 'fta', name: 'Fault Tree Analyst', tag: 'Roadmap',
    desc: 'Arbre des défauts · Coupes minimales · Import',
    status: 'coming_soon' as const,
    Icon: GitBranch, accent: '#8B5CF6',
    featured: false, stats: [],
  },
  {
    id: 'hazop', name: 'HAZOP Advanced', tag: 'Roadmap',
    desc: 'Registre indépendant · Import CSV · Création SIF',
    status: 'coming_soon' as const,
    Icon: FlaskConical, accent: '#EC4899',
    featured: false, stats: [],
  },
]

const PROJECTS = [
  { id:'1', name:'Plateforme Nord — Mer du Nord', standard:'IEC 61511', sifCount:14, passes:11, time:'14 min', status:'active' as const },
  { id:'2', name:'Raffinerie Texas — Train B',    standard:'IEC 61511', sifCount:8,  passes:5,  time:'1h',     status:'in_review' as const },
  { id:'3', name:'Unité Ammoniac V2',             standard:'ISA 84',    sifCount:21, passes:19, time:'Hier',   status:'active' as const },
  { id:'4', name:'Site Lacq — Compression',       standard:'IEC 61511', sifCount:6,  passes:6,  time:'3 j',    status:'archived' as const },
]

const PROJ_ST = {
  active:    { label:'Actif',     color:semantic.success, bg:alpha(semantic.success,'12'), border:alpha(semantic.success,'25') },
  in_review: { label:'In Review', color:semantic.warning,  bg:alpha(semantic.warning,'12'),  border:alpha(semantic.warning,'25')  },
  archived:  { label:'Archivé',   color:'#6B7280',          bg:'#6B728012',                  border:'#6B728025'                   },
}

// ─── Dot texture ────────────────────────────────────────────────────────────

function Dots({ t }: { t: ThemeTokens }) {
  return (
    <div className="pointer-events-none absolute inset-0" style={{
      backgroundImage: `radial-gradient(circle, ${t.BORDER} 1px, transparent 1px)`,
      backgroundSize: '20px 20px', opacity: 0.5,
    }}/>
  )
}

// ─── Featured module (grande card hero) ─────────────────────────────────────

function FeaturedCard({ mod, t }: { mod: typeof MODULES[0]; t: ThemeTokens }) {
  const Icon = mod.Icon
  return (
    <div className="relative col-span-2 overflow-hidden rounded-2xl border"
      style={{ background:t.CARD_BG, borderColor:alpha(mod.accent,'35'),
        boxShadow:`${t.SHADOW_CARD}, inset 0 1px 0 ${alpha(mod.accent,'15')}` }}>
      <Dots t={t}/>
      {/* Glow */}
      <div className="pointer-events-none absolute left-0 top-0 h-48 w-64"
        style={{ background:`radial-gradient(ellipse at top left, ${alpha(mod.accent,'16')} 0%, transparent 70%)` }}/>
      <div className="relative flex flex-col justify-between p-6 h-full" style={{ minHeight:180 }}>
        {/* Top row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ background:alpha(mod.accent,'14'), border:`1px solid ${alpha(mod.accent,'30')}`,
                boxShadow:`0 0 20px ${alpha(mod.accent,'20')}` }}>
              <Icon size={20} style={{ color:mod.accent }}/>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-black" style={{ color:t.TEXT }}>{mod.name}</span>
                <span className="rounded-full border px-2 py-0.5 text-[9px] font-black"
                  style={{ background:alpha(mod.accent,'12'), borderColor:alpha(mod.accent,'28'), color:mod.accent }}>
                  {mod.tag}
                </span>
              </div>
              <p className="text-[11px] mt-0.5" style={{ color:t.TEXT_DIM }}>{mod.desc}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border px-2.5 py-1"
            style={{ background:alpha(semantic.success,'10'), borderColor:alpha(semantic.success,'28') }}>
            <CheckCircle2 size={11} style={{ color:semantic.success }}/>
            <span className="text-[10px] font-bold" style={{ color:semantic.success }}>Installé v{mod.version}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-end justify-between">
          <div className="flex gap-6">
            {mod.stats.map(s => (
              <div key={s.label}>
                <p className="text-[22px] font-black leading-none" style={{ color:t.TEXT }}>{s.value}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color:mod.accent }}>{s.label}</p>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => window.electron?.launchPrism?.()}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-[11px] font-bold transition-opacity hover:opacity-80"
            style={{ background:`linear-gradient(135deg, ${colors.teal}, ${colors.tealDark})`, color:'#041014' }}>
            Ouvrir <ArrowUpRight size={13}/>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Module card normale ────────────────────────────────────────────────────

function ModuleCard({ mod, t }: { mod: typeof MODULES[0]; t: ThemeTokens }) {
  const Icon    = mod.Icon
  const locked  = mod.status === 'coming_soon'

  return (
    <div className="relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-150"
      style={{ background:t.CARD_BG, borderColor: locked ? t.BORDER : alpha(mod.accent,'22'),
        opacity: locked ? 0.65 : 1,
        boxShadow: locked ? 'none' : t.SHADOW_CARD }}
      onMouseEnter={e => { if (!locked) e.currentTarget.style.transform='translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)' }}>

      {/* Accent top stripe */}
      {!locked && <div className="h-[2px]" style={{ background:`linear-gradient(90deg, ${mod.accent}, transparent)` }}/>}

      {/* Glow accent corner */}
      {!locked && (
        <div className="pointer-events-none absolute right-0 top-0 h-20 w-20"
          style={{ background:`radial-gradient(circle at top right, ${alpha(mod.accent,'14')} 0%, transparent 70%)` }}/>
      )}

      <div className="relative p-4 flex flex-col gap-3 flex-1">
        {/* Icon + badge */}
        <div className="flex items-start justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background:alpha(mod.accent,'14'), border:`1px solid ${alpha(mod.accent,'25')}` }}>
            {locked
              ? <Lock size={14} style={{ color:t.TEXT_DIM }}/>
              : <Icon size={14} style={{ color:mod.accent }}/>
            }
          </div>
          {mod.tag && (
            <span className="rounded-full border px-2 py-0.5 text-[9px] font-black"
              style={{ background:alpha(mod.accent,'10'), borderColor:alpha(mod.accent,'22'), color:mod.accent }}>
              {mod.tag}
            </span>
          )}
        </div>

        {/* Name + desc */}
        <div className="flex-1">
          <p className="text-[12px] font-bold" style={{ color:t.TEXT }}>{mod.name}</p>
          <p className="text-[10px] leading-relaxed mt-0.5" style={{ color:t.TEXT_DIM }}>{mod.desc}</p>
        </div>

        {/* Stats si installé */}
        {mod.stats.length > 0 && (
          <div className="flex gap-4 border-t pt-3" style={{ borderColor:t.BORDER }}>
            {mod.stats.map(s => (
              <div key={s.label}>
                <p className="text-[14px] font-black leading-none" style={{ color:t.TEXT }}>{s.value}</p>
                <p className="text-[9px] font-bold uppercase tracking-wide mt-0.5" style={{ color:mod.accent }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto">
          {mod.status === 'installed' ? (
            <>
              <span className="text-[10px] font-mono" style={{ color:t.TEXT_DIM }}>v{mod.version}</span>
              <div className="flex items-center gap-1">
                <CheckCircle2 size={11} style={{ color:semantic.success }}/>
                <span className="text-[10px] font-semibold" style={{ color:semantic.success }}>Installé</span>
              </div>
            </>
          ) : (
            <span className="text-[10px]" style={{ color:t.TEXT_DIM }}>Bientôt disponible</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Project card ───────────────────────────────────────────────────────────

function ProjectCard({ proj, t }: { proj: typeof PROJECTS[0]; t: ThemeTokens }) {
  const st  = PROJ_ST[proj.status]
  const pct = Math.round((proj.passes / proj.sifCount) * 100)

  return (
    <div className="relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-150 cursor-pointer"
      style={{ background:t.CARD_BG, borderColor:t.BORDER, boxShadow:t.SHADOW_CARD }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = alpha(colors.teal,'30'); e.currentTarget.style.transform='translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = t.BORDER; e.currentTarget.style.transform='translateY(0)' }}
      onClick={() => window.electron?.launchPrism?.()}>

      {/* Glow */}
      <div className="pointer-events-none absolute left-0 top-0 h-24 w-24"
        style={{ background:`radial-gradient(circle at top left, ${alpha(colors.teal,'08')} 0%, transparent 70%)` }}/>

      <div className="relative p-4 flex flex-col gap-3">
        {/* Icon + status */}
        <div className="flex items-start justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background:alpha(colors.teal,'10'), border:`1px solid ${alpha(colors.teal,'22')}` }}>
            <FolderOpen size={14} style={{ color:colors.tealDim }}/>
          </div>
          <span className="rounded-full border px-2 py-0.5 text-[9px] font-black"
            style={{ background:st.bg, borderColor:st.border, color:st.color }}>{st.label}</span>
        </div>

        {/* Name */}
        <div>
          <p className="text-[12px] font-bold leading-snug" style={{ color:t.TEXT }}>{proj.name}</p>
          <p className="text-[10px] mt-0.5" style={{ color:t.TEXT_DIM }}>{proj.standard}</p>
        </div>

        {/* Progress bar SIF compliance */}
        <div>
          <div className="flex justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color:t.TEXT_DIM }}>
              Compliance
            </span>
            <span className="text-[10px] font-black" style={{ color: pct === 100 ? semantic.success : colors.tealDim }}>
              {proj.passes}/{proj.sifCount} SIF
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full" style={{ background:t.BORDER }}>
            <div className="h-full rounded-full transition-all"
              style={{ width:`${pct}%`,
                background: pct === 100
                  ? `linear-gradient(90deg, ${semantic.success}, ${semantic.successDim})`
                  : `linear-gradient(90deg, ${colors.teal}, ${colors.tealDim})` }}/>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px]" style={{ color:t.TEXT_DIM }}>Il y a {proj.time}</span>
          <div className="flex items-center gap-1 text-[10px] font-semibold" style={{ color:colors.tealDim }}>
            Ouvrir <ChevronRight size={10}/>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main LibraryView ───────────────────────────────────────────────────────

export function LibraryView({ t }: { t: ThemeTokens }) {
  const [tab, setTab] = useState<'modules' | 'projects'>('modules')

  const featured  = MODULES.find(m => m.featured)!
  const installed = MODULES.filter(m => !m.featured && m.status === 'installed')
  const upcoming  = MODULES.filter(m => m.status === 'coming_soon')

  return (
    <div className="flex flex-1 flex-col overflow-hidden" style={{ background:t.PAGE_BG }}>
      {/* Sub-tabs */}
      <div className="flex shrink-0 items-center gap-1 border-b px-6 pt-4"
        style={{ borderColor:t.BORDER, background:t.PANEL_BG }}>
        {([
          { id:'modules'  as const, label:'Modules'         },
          { id:'projects' as const, label:'Projets récents' },
        ]).map(({ id, label }) => {
          const active = tab === id
          return (
            <button key={id} type="button" onClick={() => setTab(id)}
              className="relative px-4 pb-3 pt-1 text-[12px] font-semibold transition-colors"
              style={{ color: active ? colors.teal : t.TEXT_DIM }}>
              {label}
              {active && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t" style={{ background:colors.teal }}/>}
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5" style={{ scrollbarGutter:'stable' }}>
        {tab === 'modules' && (
          <>
            {/* Featured + 2 cards */}
            <div className="grid grid-cols-3 gap-4">
              <FeaturedCard mod={featured} t={t}/>
              <div className="flex flex-col gap-4">
                {installed.slice(0,2).map(mod => <ModuleCard key={mod.id} mod={mod} t={t}/>)}
              </div>
            </div>

            {/* Remaining installed */}
            {installed.length > 2 && (
              <div>
                <p className="mb-3 text-[9px] font-black uppercase tracking-widest" style={{ color:t.TEXT_DIM }}>
                  Autres modules installés
                </p>
                <div className="grid grid-cols-3 gap-4">
                  {installed.slice(2).map(mod => <ModuleCard key={mod.id} mod={mod} t={t}/>)}
                </div>
              </div>
            )}

            {/* Roadmap */}
            <div>
              <div className="mb-3 flex items-center gap-3">
                <p className="text-[9px] font-black uppercase tracking-widest" style={{ color:t.TEXT_DIM }}>Roadmap</p>
                <div className="h-px flex-1" style={{ background:t.BORDER }}/>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {upcoming.map(mod => <ModuleCard key={mod.id} mod={mod} t={t}/>)}
              </div>
            </div>
          </>
        )}

        {tab === 'projects' && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[9px] font-black uppercase tracking-widest" style={{ color:t.TEXT_DIM }}>
                {PROJECTS.length} projets — cliquer pour ouvrir dans PRISM
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {PROJECTS.map(proj => <ProjectCard key={proj.id} proj={proj} t={t}/>)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
