/**
 * src/components/HomeView.tsx — PRISM Launcher v3
 * Dashboard bento-grid pro avec texture, relief et données.
 */

import { useState, useEffect } from 'react'
import {
  Play, Shield, Zap,
  CheckCircle2, Activity, TrendingUp,
  ChevronRight,
} from 'lucide-react'
import { colors, semantic, alpha } from '../tokens'
import type { ThemeTokens } from '../hooks/useTheme'
import type { AuthUser } from '../types'

type BackendStatus = 'checking' | 'ready' | 'offline'

const PINNED_SIFS = [
  { id:'1', number:'SIF-042', title:'HP Separator Overpressure',       project:'Plateforme Nord',  sil:2, silTarget:2, pfd:'4.2e-3', status:'approved'  as const, daysToTest:23 },
  { id:'2', number:'SIF-018', title:'Compressor High-High Vibration',  project:'Raffinerie Texas', sil:1, silTarget:2, pfd:'3.1e-2', status:'in_review' as const, daysToTest:42 },
  { id:'3', number:'SIF-031', title:'Reactor Feed Valve',              project:'Plateforme Nord',  sil:3, silTarget:3, pfd:'6.8e-4', status:'approved'  as const, daysToTest:129},
]

const RECENT = [
  { id:'1', sif:'SIF-042', action:'Architecture mise à jour',      time:'14 min', type:'edit'    as const },
  { id:'2', sif:'SIF-018', action:'Révision C publiée',            time:'1h',     type:'publish' as const },
  { id:'3', sif:'SIF-031', action:'Campagne proof test planifiée', time:'3h',     type:'test'    as const },
  { id:'4', sif:'SIF-007', action:'Engine — SIL 2 validé',         time:'Hier',   type:'engine'  as const },
]

const ACT_CFG = {
  edit:    { color: colors.tealDim,    dot: colors.teal,       Icon: Zap            },
  publish: { color: semantic.success,  dot: semantic.success,  Icon: CheckCircle2   },
  test:    { color: semantic.info,     dot: semantic.info,     Icon: Activity       },
  engine:  { color: '#8B5CF6',         dot: '#8B5CF6',         Icon: TrendingUp     },
}

const SIF_ST = {
  approved:  { label:'APP', color:semantic.success, bg:alpha(semantic.success,'14'), border:alpha(semantic.success,'28') },
  in_review: { label:'IFR', color:semantic.warning, bg:alpha(semantic.warning,'14'), border:alpha(semantic.warning,'28') },
  draft:     { label:'DFT', color:'#6B7280',         bg:'#6B728014',                 border:'#6B728028'                  },
}

function DotTexture({ t }: { t: ThemeTokens }) {
  return (
    <div className="pointer-events-none absolute inset-0" style={{
      backgroundImage: `radial-gradient(circle, ${t.BORDER} 1px, transparent 1px)`,
      backgroundSize: '20px 20px', opacity: 0.55,
    }} />
  )
}

function SILRing({ sil, target }: { sil:number; target:number }) {
  const ok    = sil >= target
  const color = ok ? semantic.success : semantic.error
  const r = 17, circ = 2 * Math.PI * r
  const dash = Math.min(sil / 4, 1) * circ
  return (
    <svg width={44} height={44} viewBox="0 0 44 44" style={{ flexShrink:0 }}>
      <circle cx={22} cy={22} r={r} fill="none" stroke={alpha(color,'20')} strokeWidth={4}/>
      <circle cx={22} cy={22} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={`${dash} ${circ-dash}`} strokeDashoffset={circ/4} strokeLinecap="round"/>
      <text x={22} y={23} textAnchor="middle" dominantBaseline="central"
        fontSize={13} fontWeight={700} fill={color}>{sil}</text>
    </svg>
  )
}

function KpiCard({ label, value, sub, Icon, color, t }: {
  label:string; value:string|number; sub:string; Icon:React.ElementType; color:string; t:ThemeTokens
}) {
  return (
    <div className="relative flex flex-col gap-3 overflow-hidden rounded-2xl border p-4"
      style={{ background:t.CARD_BG, borderColor:t.BORDER, boxShadow:t.SHADOW_CARD }}>
      <div className="pointer-events-none absolute right-0 top-0 h-16 w-16"
        style={{ background:`radial-gradient(circle at top right, ${alpha(color,'18')} 0%, transparent 70%)` }}/>
      <div className="flex items-start justify-between">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background:alpha(color,'14'), border:`1px solid ${alpha(color,'28')}` }}>
          <Icon size={14} style={{ color }}/>
        </div>
        <span className="rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide"
          style={{ background:alpha(color,'10'), borderColor:alpha(color,'22'), color }}>live</span>
      </div>
      <div>
        <p className="text-[24px] font-black leading-none tracking-tight" style={{ color:t.TEXT }}>{value}</p>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{label}</p>
        <p className="mt-0.5 text-[10px]" style={{ color:t.TEXT_DIM }}>{sub}</p>
      </div>
    </div>
  )
}

function HeroLaunch({ t, status, onLaunch }: { t:ThemeTokens; status:BackendStatus; onLaunch:()=>void }) {
  const ready = status === 'ready'
  const stColor = ready ? semantic.success : status === 'offline' ? semantic.warning : colors.tealDim
  return (
    <div className="relative col-span-2 overflow-hidden rounded-2xl border"
      style={{ background:t.CARD_BG, borderColor:alpha(colors.teal,'30'),
        boxShadow:`${t.SHADOW_CARD}, inset 0 1px 0 ${alpha(colors.teal,'10')}`, minHeight:148 }}>
      <DotTexture t={t}/>
      <div className="pointer-events-none absolute left-0 top-0 h-40 w-72"
        style={{ background:`radial-gradient(ellipse at top left, ${alpha(colors.teal,'14')} 0%, transparent 70%)` }}/>
      <div className="relative flex h-full items-center justify-between gap-6 px-7 py-6">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1"
            style={{ background:alpha(stColor,'10'), borderColor:alpha(stColor,'25') }}>
            <span className="h-1.5 w-1.5 rounded-full"
              style={{ background:stColor, boxShadow:ready?`0 0 6px ${stColor}`:'none' }}/>
            <span className="text-[10px] font-bold" style={{ color:stColor }}>
              {ready ? 'Backend opérationnel' : status === 'offline' ? 'Backend hors ligne' : 'Vérification…'}
            </span>
          </div>
          <h1 className="text-[28px] font-black leading-none tracking-tighter" style={{ color:t.TEXT }}>
            PRISM Desktop
          </h1>
          <p className="mt-1.5 text-[12px]" style={{ color:t.TEXT_DIM }}>
            SIF Workbench · IEC 61511 · Moteur hybride TS / Python
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <button type="button" onClick={onLaunch} disabled={!ready}
            className="group flex items-center gap-3 rounded-2xl px-8 py-4 text-[14px] font-black transition-all active:scale-95 disabled:opacity-40"
            style={{
              background: ready ? `linear-gradient(135deg, ${colors.teal}, ${colors.tealDark})` : t.SURFACE,
              color: ready ? '#041014' : t.TEXT_DIM,
              boxShadow: ready ? `0 0 28px ${alpha(colors.teal,'35')}, 0 4px 12px ${alpha(colors.teal,'20')}` : 'none',
            }}>
            <Play size={18} fill={ready ? '#041014' : t.TEXT_DIM}/>
            Lancer PRISM
          </button>
          <p className="text-[10px]" style={{ color:t.TEXT_DIM }}>
            Raccourci{' '}
            <kbd className="rounded border px-1.5 py-0.5 font-mono text-[9px]"
              style={{ borderColor:t.BORDER, color:t.TEXT_DIM, background:t.SURFACE }}>Ctrl+L</kbd>
          </p>
        </div>
      </div>
    </div>
  )
}

function SIFCard({ sif, t }: { sif: typeof PINNED_SIFS[0]; t: ThemeTokens }) {
  const st = SIF_ST[sif.status]
  const ok = sif.sil >= sif.silTarget
  const urgent = sif.daysToTest <= 30
  return (
    <div className="relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-150 cursor-default"
      style={{ background:t.CARD_BG, borderColor: ok ? alpha(semantic.success,'20') : alpha(semantic.error,'20'), boxShadow:t.SHADOW_CARD }}
      onMouseEnter={e => (e.currentTarget.style.transform='translateY(-2px)')}
      onMouseLeave={e => (e.currentTarget.style.transform='translateY(0)')}>
      {/* Top stripe */}
      <div className="h-[3px] w-full" style={{ background: ok ? semantic.success : semantic.error }}/>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] font-black" style={{ color:colors.tealDim }}>{sif.number}</span>
              <span className="rounded border px-1.5 py-0.5 text-[9px] font-black"
                style={{ background:st.bg, borderColor:st.border, color:st.color }}>{st.label}</span>
            </div>
            <p className="truncate text-[12px] font-bold leading-snug" style={{ color:t.TEXT }}>{sif.title}</p>
            <p className="text-[10px]" style={{ color:t.TEXT_DIM }}>{sif.project}</p>
          </div>
          <SILRing sil={sif.sil} target={sif.silTarget}/>
        </div>
        <div className="my-3 h-px" style={{ background:t.BORDER }}/>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color:t.TEXT_DIM }}>PFDavg</p>
            <p className="text-[14px] font-black font-mono leading-none"
              style={{ color: ok ? semantic.success : semantic.error }}>{sif.pfd}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color:t.TEXT_DIM }}>Prochain test</p>
            <p className="text-[12px] font-bold"
              style={{ color: urgent ? semantic.warning : t.TEXT_DIM }}>
              {urgent ? `⚠ ${sif.daysToTest}j` : `${sif.daysToTest} jours`}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-auto border-t px-4 py-2 flex items-center justify-between"
        style={{ borderColor:t.BORDER, background:alpha(t.SURFACE,'CC') }}>
        <p className="text-[10px]" style={{ color:t.TEXT_DIM }}>SIL cible : {sif.silTarget}</p>
        <button type="button" className="flex items-center gap-1 text-[10px] font-semibold"
          style={{ color:colors.tealDim }} onClick={() => window.electron?.launchPrism?.()}>
          Ouvrir <ChevronRight size={10}/>
        </button>
      </div>
    </div>
  )
}

function ActivityFeed({ t }: { t:ThemeTokens }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border"
      style={{ background:t.CARD_BG, borderColor:t.BORDER, boxShadow:t.SHADOW_CARD }}>
      <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor:t.BORDER }}>
        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color:t.TEXT_DIM }}>Activité récente</p>
        <button type="button" className="flex items-center gap-1 text-[10px] font-semibold"
          style={{ color:colors.tealDim }}>Tout voir <ChevronRight size={10}/></button>
      </div>
      <div className="divide-y" style={{ borderColor:t.BORDER }}>
        {RECENT.map(item => {
          const cfg = ACT_CFG[item.type]
          const Icon = cfg.Icon
          return (
            <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 transition-colors"
              onMouseEnter={e=>(e.currentTarget.style.background=t.SURFACE)}
              onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                style={{ background:alpha(cfg.dot,'14'), border:`1px solid ${alpha(cfg.dot,'28')}` }}>
                <Icon size={12} style={{ color:cfg.color }}/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium" style={{ color:t.TEXT }}>
                  <span style={{ color:cfg.color }}>{item.sif}</span>{' — '}{item.action}
                </p>
              </div>
              <span className="shrink-0 rounded-full border px-2 py-0.5 text-[9px]"
                style={{ borderColor:t.BORDER, color:t.TEXT_DIM, background:t.SURFACE }}>{item.time}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function HomeView({ t, user }: { t:ThemeTokens; user:AuthUser }) {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('checking')

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('http://localhost:8000/health', { signal: AbortSignal.timeout(1500) })
        setBackendStatus(res.ok ? 'ready' : 'offline')
      } catch { setBackendStatus('offline') }
    }
    void check()
    const id = setInterval(check, 10_000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-5 gap-4"
      style={{ background:t.PAGE_BG, scrollbarGutter:'stable' }}>
      {/* Row 1: Hero (2 cols) + 2 KPIs (1 col stacked) */}
      <div className="grid grid-cols-3 gap-4">
        <HeroLaunch t={t} status={backendStatus} onLaunch={() => window.electron?.launchPrism?.()}/>
        <div className="flex flex-col gap-4">
          <KpiCard t={t} label="SIFs actives" value="14" sub="3 projets en cours" Icon={Shield} color={colors.teal}/>
          <KpiCard t={t} label="Runs engine"  value="37" sub="Ce mois · 2 en file"  Icon={Zap}   color="#8B5CF6"/>
        </div>
      </div>

      {/* Row 2: SIFs épinglées */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[9px] font-black uppercase tracking-widest" style={{ color:t.TEXT_DIM }}>SIFs épinglées</p>
          <button type="button" className="flex items-center gap-1 text-[10px] font-semibold"
            style={{ color:colors.tealDim }}>Gérer dans PRISM <ChevronRight size={10}/></button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {PINNED_SIFS.map(sif => <SIFCard key={sif.id} sif={sif} t={t}/>)}
        </div>
      </div>

      {/* Row 3: Activité */}
      <ActivityFeed t={t}/>
    </div>
  )
}
