/**
 * SIFChainDiagram — PRISM v2  (DA KORE)
 *
 * navy #003D5C / teal #009BA4 / bg #F0F4F8
 *
 * Améliorations vs v1 :
 *  ─ DA KORE complète (exit classes Tailwind cyan/indigo/orange bg/border)
 *  ─ Blocs plus larges (260px), mieux aérés
 *  ─ Flèches redessinées avec label en capsule navy
 *  ─ SIFSummaryBar : verdict en bande navy/teal, métriques lisibles
 *  ─ Architecture viz plus propre : rail de fond + chips canal
 *  ─ Component pill : tooltip riche, animation hover teal
 *  ─ Note méthodologique IEC en bas
 */
import { useMemo, useState } from 'react'
import { Settings2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { SILBadge } from '@/components/shared/SILBadge'
import { calcSubsystemPFD, formatPFD, formatPct } from '@/core/math/pfdCalc'
import { ComponentParamsSheet } from '@/components/parameters/ComponentParamsSheet'
import type { SIFSubsystem, SIFComponent, SubsystemType } from '@/core/types'
import { ARCHITECTURE_META } from '@/core/types'
import { cn } from '@/lib/utils'

// ─── KORE tokens ──────────────────────────────────────────────────────────
const NAVY  = '#003D5C'
const NAVY2 = '#002A42'
const TEAL  = '#009BA4'
const BG    = '#F0F4F8'

// ─── Type config ──────────────────────────────────────────────────────────
const TYPE_CFG: Record<SubsystemType, { color: string; label: string }> = {
  sensor:   { color: '#0284C7', label: 'Capteur(s)' },
  logic:    { color: '#7C3AED', label: 'Logique' },
  actuator: { color: '#EA580C', label: 'Actionneur(s)' },
}

// ─── Arrow connector ──────────────────────────────────────────────────────
function ChainArrow({ label, dim = false }: { label?: string; dim?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 shrink-0 px-1">
      <svg width="44" height="16" viewBox="0 0 44 16" fill="none">
        <line x1="0" y1="8" x2="36" y2="8"
          stroke={dim ? '#D1D5DB' : NAVY} strokeWidth="1.5" strokeDasharray={dim ? '4 3' : undefined} />
        <polygon points="36,4 44,8 36,12" fill={dim ? '#D1D5DB' : NAVY} />
      </svg>
      {label && (
        <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
          style={{ background: `${NAVY}10`, color: NAVY }}
        >{label}</span>
      )}
    </div>
  )
}

// ─── Component pill ───────────────────────────────────────────────────────
function ComponentPill({
  component, subsystemId, channelId, projectId, sifId, color,
}: {
  component: SIFComponent
  subsystemId: string; channelId: string
  projectId: string; sifId: string
  color: string
}) {
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <>
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setSheetOpen(true)}
              className="group flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-mono font-semibold transition-all"
              style={{ borderColor: `${color}35`, background: `${color}08`, color }}
              onMouseEnter={e => {
                e.currentTarget.style.background = `${color}18`
                e.currentTarget.style.borderColor = `${color}70`
                e.currentTarget.style.boxShadow = `0 2px 8px ${color}20`
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = `${color}08`
                e.currentTarget.style.borderColor = `${color}35`
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <Settings2 size={9} className="opacity-40 group-hover:opacity-100 transition-opacity" />
              {component.tagName}
            </button>
          </TooltipTrigger>
          <TooltipContent className="text-xs max-w-[240px] p-3 space-y-1.5"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            <p className="font-bold font-mono" style={{ color }}>{component.tagName}</p>
            <p className="text-gray-600">{component.instrumentType}</p>
            {component.manufacturer && (
              <p className="text-gray-400 text-[10px]">{component.manufacturer}</p>
            )}
            <div className="border-t border-gray-100 pt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px]">
              <span className="text-gray-400">λ total</span>
              <span className="font-mono font-semibold" style={{ color: NAVY }}>
                {component.factorized?.lambda ?? '—'} ×10⁻⁶/h
              </span>
              <span className="text-gray-400">T1</span>
              <span className="font-mono font-semibold" style={{ color: NAVY }}>
                {component.test.T1} {component.test.T1Unit}
              </span>
              <span className="text-gray-400">MTTR</span>
              <span className="font-mono font-semibold" style={{ color: NAVY }}>
                {component.advanced.MTTR} h
              </span>
              <span className="text-gray-400">Source</span>
              <span className="text-gray-500">{component.dataSource || '—'}</span>
            </div>
            <p className="text-[9px] text-gray-400 mt-1">Cliquer pour modifier les paramètres</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <ComponentParamsSheet
        open={sheetOpen} onClose={() => setSheetOpen(false)}
        component={component} subsystemId={subsystemId}
        channelId={channelId} projectId={projectId} sifId={sifId}
      />
    </>
  )
}

// ─── Architecture viz (mini SVG schematic) ────────────────────────────────
function ArchViz({ architecture, color, channels }: {
  architecture: string; color: string; channels: number
}) {
  if (channels < 2) return null
  const h = channels === 3 ? 60 : 44
  const W = 96

  const gate = architecture === '2oo3' ? '2/3' : architecture === '2oo2' ? '&&' : '≥1'

  return (
    <div className="flex justify-center mt-2 mb-0.5">
      <svg width={W} height={h} viewBox={`0 0 ${W} ${h}`} fill="none">
        {/* Input stem */}
        <line x1="0" y1={h/2} x2="16" y2={h/2} stroke={color} strokeWidth="1.5" opacity="0.5" />

        {/* Branches */}
        {Array.from({ length: channels }).map((_, i) => {
          const spacing = h / (channels + 1)
          const y = spacing * (i + 1)
          const dashed = architecture === '2oo2'
          return (
            <g key={i}>
              {/* Fan out */}
              <line x1="16" y1={h/2} x2="16" y2={y} stroke={color} strokeWidth="1" opacity="0.35" />
              {/* Horizontal rail */}
              <line x1="16" y1={y} x2="70" y2={y}
                stroke={color} strokeWidth="1.5" opacity="0.55"
                strokeDasharray={dashed ? '3 2' : undefined}
              />
              {/* Channel chip */}
              <rect x="28" y={y - 6} width="26" height="12" rx="3"
                fill={`${color}15`} stroke={color} strokeWidth="1" opacity="0.8" />
              <text x="41" y={y + 0.5} textAnchor="middle" dominantBaseline="middle"
                style={{ fontSize: 6.5, fontFamily: "'IBM Plex Mono', monospace", fill: color, fontWeight: 700 }}
              >CH{i + 1}</text>
              {/* Fan in */}
              <line x1="70" y1={y} x2="70" y2={h/2} stroke={color} strokeWidth="1" opacity="0.35" />
            </g>
          )
        })}

        {/* Voting gate circle */}
        <circle cx="70" cy={h/2} r="8"
          fill={`${color}18`} stroke={color} strokeWidth="1.5" opacity="0.9" />
        <text x="70" y={h/2} textAnchor="middle" dominantBaseline="middle"
          style={{ fontSize: 6, fontFamily: "'IBM Plex Mono', monospace", fill: color, fontWeight: 700 }}
        >{gate}</text>

        {/* Output stem */}
        <line x1="78" y1={h/2} x2={W} y2={h/2} stroke={color} strokeWidth="1.5" opacity="0.5" />
      </svg>
    </div>
  )
}

// ─── Subsystem block ──────────────────────────────────────────────────────
function SubsystemBlock({
  subsystem, projectId, sifId,
}: {
  subsystem: SIFSubsystem; projectId: string; sifId: string
}) {
  const { color, label } = TYPE_CFG[subsystem.type]
  const archMeta   = ARCHITECTURE_META[subsystem.architecture]
  const calcResult = useMemo(() => calcSubsystemPFD(subsystem), [subsystem])

  const showViz = ['1oo2', '2oo2', '1oo2D', '2oo3'].includes(subsystem.architecture)
    || subsystem.channels.length > 1

  return (
    <div className="flex flex-col rounded-2xl border bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow"
      style={{ borderColor: `${color}25` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b"
        style={{ background: `${color}07`, borderColor: `${color}18` }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: color, boxShadow: `0 0 0 3px ${color}22` }} />
          <span className="text-[11px] font-bold" style={{ color }}>{subsystem.label}</span>
          {/* Architecture badge with tooltip */}
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded cursor-default"
                  style={{ background: `${color}14`, color }}
                >{subsystem.architecture}</span>
              </TooltipTrigger>
              <TooltipContent className="text-xs">
                <p className="font-semibold">{archMeta?.desc}</p>
                <p className="text-gray-400 text-[10px]">HFT = {archMeta?.HFT} · {archMeta?.channels} canal(aux)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <SILBadge sil={calcResult.SIL} size="sm" />
      </div>

      {/* Body */}
      <div className="p-3 flex-1">
        {/* Architecture schematic */}
        {showViz && (
          <ArchViz architecture={subsystem.architecture} color={color} channels={subsystem.channels.length} />
        )}

        {/* Channels */}
        <div className="space-y-2 mt-2">
          {subsystem.channels.map((channel, chIdx) => (
            <div key={channel.id}>
              {/* Channel label (only if >1 channel) */}
              {subsystem.channels.length > 1 && (
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color, opacity: 0.4 }} />
                  <span className="text-[9px] font-semibold" style={{ color: '#9CA3AF' }}>{channel.label}</span>
                </div>
              )}
              {/* Component pills */}
              <div className="flex flex-wrap gap-1">
                {channel.components.length === 0 ? (
                  <span className="text-[10px] italic" style={{ color: '#C4C9D4' }}>Aucun composant</span>
                ) : (
                  channel.components.map(comp => (
                    <ComponentPill
                      key={comp.id} component={comp}
                      subsystemId={subsystem.id} channelId={channel.id}
                      projectId={projectId} sifId={sifId} color={color}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer metrics */}
      <div className="grid grid-cols-3 border-t text-center" style={{ borderColor: `${color}15` }}>
        {[
          { label: 'PFDavg', value: formatPFD(calcResult.PFD_avg) },
          { label: 'SFF',    value: formatPct(calcResult.SFF)     },
          { label: 'DC',     value: formatPct(calcResult.DC)      },
        ].map(({ label, value }, i) => (
          <div key={label} className="py-2 px-1"
            style={i < 2 ? { borderRight: `1px solid ${color}15` } : undefined}
          >
            <p className="text-[8px] font-bold uppercase tracking-widest mb-0.5" style={{ color: '#B0B8C4' }}>
              {label}
            </p>
            <p className="text-[11px] font-mono font-bold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── SIF summary bar ──────────────────────────────────────────────────────
function SIFSummaryBar({ totalPFD, totalRRF, sil, meetsTarget, targetSIL }: {
  totalPFD: number; totalRRF: number; sil: number; meetsTarget: boolean; targetSIL: number
}) {
  return (
    <div className="flex items-center gap-0 rounded-2xl border overflow-hidden shadow-sm"
      style={{ borderColor: meetsTarget ? '#BBF7D0' : '#FECACA' }}
    >
      {/* Status stripe */}
      <div className="flex items-center gap-3 px-5 py-3 flex-1"
        style={{ background: meetsTarget ? '#F0FDF4' : '#FEF2F2' }}
      >
        {meetsTarget
          ? <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
          : <AlertTriangle size={18} className="text-red-500 shrink-0" />
        }
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: '#9CA3AF' }}>Total SIF</p>
          <p className="text-sm font-bold font-mono" style={{ color: NAVY }}>{formatPFD(totalPFD)}</p>
        </div>
      </div>

      {/* Divider */}
      <div className="w-px self-stretch" style={{ background: meetsTarget ? '#BBF7D0' : '#FECACA' }} />

      {/* RRF */}
      <div className="px-5 py-3 text-center" style={{ background: meetsTarget ? '#F0FDF4' : '#FEF2F2' }}>
        <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: '#9CA3AF' }}>RRF</p>
        <p className="text-sm font-bold font-mono" style={{ color: NAVY }}>
          {totalRRF < 1 ? '—' : Math.round(totalRRF).toLocaleString()}
        </p>
      </div>

      {/* Divider */}
      <div className="w-px self-stretch" style={{ background: meetsTarget ? '#BBF7D0' : '#FECACA' }} />

      {/* SIL badge + verdict */}
      <div className="flex items-center gap-3 px-5 py-3"
        style={{ background: meetsTarget ? '#F0FDF4' : '#FEF2F2' }}
      >
        <SILBadge sil={sil as any} size="md" />
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: '#9CA3AF' }}>Objectif SIL {targetSIL}</p>
          <p className="text-xs font-bold"
            style={{ color: meetsTarget ? '#15803D' : '#DC2626' }}
          >
            {meetsTarget ? `✓ Conforme SIL ${targetSIL}` : `✗ SIL ${targetSIL} non atteint`}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Main diagram ─────────────────────────────────────────────────────────
export interface SIFChainDiagramProps {
  sif: import('@/core/types').SIF
  projectId: string
  calcResult: import('@/core/types').SIFCalcResult
}

export function SIFChainDiagram({ sif, projectId, calcResult }: SIFChainDiagramProps) {
  const orderedTypes: SubsystemType[] = ['sensor', 'logic', 'actuator']
  const orderedSubsystems = orderedTypes
    .map(type => sif.subsystems.find(s => s.type === type))
    .filter(Boolean) as typeof sif.subsystems

  if (orderedSubsystems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-2xl"
        style={{ borderColor: '#E5E7EB', color: '#C4C9D4' }}
      >
        <p className="text-sm font-semibold mb-1" style={{ color: '#9CA3AF' }}>Aucun sous-système dans ce SIF</p>
        <p className="text-xs">Ajoutez Capteur, Logique et Actionneur dans l'onglet Architecture</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <SIFSummaryBar
        totalPFD={calcResult.PFD_avg}
        totalRRF={calcResult.RRF}
        sil={calcResult.SIL}
        meetsTarget={calcResult.meetsTarget}
        targetSIL={sif.targetSIL}
      />

      {/* Chain */}
      <div className="flex items-start overflow-x-auto pb-2 gap-0">
        {/* Entry label */}
        <div className="flex flex-col items-center justify-center pt-10 shrink-0">
          <div className="text-center mb-1.5">
            <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>Demande</p>
            <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>process</p>
          </div>
          <ChainArrow dim />
        </div>

        {orderedSubsystems.map((subsystem, idx) => (
          <div key={subsystem.id} className="flex items-start gap-0">
            <div style={{ width: 260 }} className="shrink-0">
              <SubsystemBlock subsystem={subsystem} projectId={projectId} sifId={sif.id} />
            </div>

            {idx < orderedSubsystems.length - 1 && (
              <div className="flex items-center mt-10">
                <ChainArrow label="signal" />
              </div>
            )}
          </div>
        ))}

        {/* Exit label */}
        <div className="flex flex-col items-center justify-center pt-10 shrink-0">
          <ChainArrow />
          <div className="text-center mt-1.5">
            <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>État</p>
            <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>sécurisé</p>
          </div>
        </div>
      </div>

      {/* Methodology note */}
      <p className="text-[10px] font-mono" style={{ color: '#C4C9D4' }}>
        PFD<sub>SIF</sub> = ΣPFDᵢ (modèle série · IEC 61511-1 §11) ·{' '}
        <span style={{ color: TEAL }}>Cliquer sur un tag</span> pour modifier ses paramètres
      </p>
    </div>
  )
}