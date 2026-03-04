/**
 * SIF Chain Diagram
 * Visual representation of the safety chain:
 * [Sensor block] ──▶ [Logic Solver] ──▶ [Actuator block]
 *
 * Each subsystem shows its architecture (channels in parallel/series)
 * with PFD value, SIL badge, and component tags.
 */
import { useMemo, useState } from 'react'
import { Settings2, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { SILBadge } from '@/components/shared/SILBadge'
import { calcSubsystemPFD, formatPFD, formatPct } from '@/core/math/pfdCalc'
import { ComponentParamsSheet } from '@/components/parameters/ComponentParamsSheet'
import type { SIFSubsystem, SIFComponent, SubsystemType } from '@/core/types'
import { ARCHITECTURE_META } from '@/core/types'
import { cn } from '@/lib/utils'

// ─── Colours per subsystem type ───────────────────────────────────────────
const TYPE_STYLE: Record<SubsystemType, { color: string; bg: string; border: string; label: string }> = {
  sensor:   { color: '#0891B2', bg: 'bg-cyan-50   dark:bg-cyan-950/40',  border: 'border-cyan-200   dark:border-cyan-800',  label: 'Sensor(s)' },
  logic:    { color: '#6366F1', bg: 'bg-indigo-50 dark:bg-indigo-950/40',border: 'border-indigo-200 dark:border-indigo-800', label: 'Logic Solver' },
  actuator: { color: '#EA580C', bg: 'bg-orange-50 dark:bg-orange-950/40',border: 'border-orange-200 dark:border-orange-800', label: 'Actuator(s)' },
}

// ─── Arrow SVG connector ─────────────────────────────────────────────────
function ChainArrow({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 shrink-0 px-1">
      <svg width="40" height="20" viewBox="0 0 40 20" fill="none">
        <line x1="0" y1="10" x2="32" y2="10" stroke="currentColor" strokeWidth="1.5" className="text-border" />
        <polygon points="32,6 40,10 32,14" fill="currentColor" className="text-muted-foreground" />
      </svg>
      {label && (
        <span className="text-[9px] font-mono text-muted-foreground/60 whitespace-nowrap">{label}</span>
      )}
    </div>
  )
}

// ─── Single component tag pill ────────────────────────────────────────────
function ComponentPill({
  component, subsystemId, channelId, projectId, sifId, color,
}: {
  component: SIFComponent
  subsystemId: string
  channelId: string
  projectId: string
  sifId: string
  color: string
}) {
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setSheetOpen(true)}
              className="group flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-mono font-medium transition-all hover:shadow-sm cursor-pointer"
              style={{
                borderColor: `${color}40`,
                background: `${color}08`,
                color,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = color
                e.currentTarget.style.background = `${color}15`
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = `${color}40`
                e.currentTarget.style.background = `${color}08`
              }}
            >
              <Settings2 size={10} className="opacity-50 group-hover:opacity-100 transition-opacity" />
              {component.tagName}
            </button>
          </TooltipTrigger>
          <TooltipContent className="text-xs space-y-1 max-w-[220px]">
            <p className="font-semibold font-mono">{component.tagName}</p>
            <p className="text-muted-foreground">{component.instrumentType}</p>
            {component.manufacturer && <p className="text-muted-foreground">{component.manufacturer}</p>}
            <p className="text-muted-foreground/70">
              T1 = {component.test.T1} {component.test.T1Unit} · MTTR = {component.advanced.MTTR} h
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <ComponentParamsSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        component={component}
        subsystemId={subsystemId}
        channelId={channelId}
        projectId={projectId}
        sifId={sifId}
      />
    </>
  )
}

// ─── Subsystem visual block ───────────────────────────────────────────────
function SubsystemBlock({
  subsystem, projectId, sifId,
}: {
  subsystem: SIFSubsystem
  projectId: string
  sifId: string
}) {
  const style     = TYPE_STYLE[subsystem.type]
  const archMeta  = ARCHITECTURE_META[subsystem.architecture]
  const calcResult = useMemo(() => calcSubsystemPFD(subsystem), [subsystem])

  const isVoted    = subsystem.architecture === '2oo3'
  const isDual     = ['1oo2', '2oo2', '1oo2D'].includes(subsystem.architecture)
  const isTriple   = subsystem.architecture === '2oo3'
  const isSingle   = subsystem.architecture === '1oo1'

  // Layout hint: how to visually arrange the channels
  const showParallel = isDual || isTriple

  return (
    <div className={cn(
      'flex flex-col rounded-xl border-2 overflow-hidden transition-shadow hover:shadow-md',
      style.border, style.bg,
    )}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b"
        style={{ borderColor: `${style.color}25` }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: style.color, boxShadow: `0 0 0 3px ${style.color}25` }}
          />
          <span className="text-xs font-semibold" style={{ color: style.color }}>
            {subsystem.label}
          </span>
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger>
                <span
                  className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                  style={{ background: `${style.color}15`, color: style.color }}
                >
                  {subsystem.architecture}
                </span>
              </TooltipTrigger>
              <TooltipContent className="text-xs">
                <p className="font-semibold">{archMeta.desc}</p>
                <p className="text-muted-foreground">HFT = {archMeta.HFT} · {archMeta.channels} channel(s)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <SILBadge sil={calcResult.SIL} size="sm" />
      </div>

      {/* Body: channel layout */}
      <div className="p-3 flex-1">
        {/* Architecture visual */}
        <div className={cn(
          'flex gap-2 mb-3',
          showParallel ? 'flex-col' : 'flex-row items-center',
        )}>
          {subsystem.channels.map((channel, chIdx) => (
            <div key={channel.id} className="flex flex-col gap-1.5">
              {/* Channel label */}
              {subsystem.channels.length > 1 && (
                <div className="flex items-center gap-1.5">
                  {/* Parallel line indicator */}
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: style.color, opacity: 0.4 }}
                  />
                  <span className="text-[10px] text-muted-foreground">{channel.label}</span>
                </div>
              )}

              {/* Components in this channel */}
              <div className="flex flex-wrap gap-1">
                {channel.components.length === 0 ? (
                  <span className="text-[10px] text-muted-foreground italic">No components</span>
                ) : (
                  channel.components.map(comp => (
                    <ComponentPill
                      key={comp.id}
                      component={comp}
                      subsystemId={subsystem.id}
                      channelId={channel.id}
                      projectId={projectId}
                      sifId={sifId}
                      color={style.color}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Architecture hint — show voting/parallel lines visually */}
        {showParallel && (
          <ArchitectureViz architecture={subsystem.architecture} color={style.color} channels={subsystem.channels.length} />
        )}
      </div>

      {/* Footer: metrics */}
      <div
        className="grid grid-cols-3 divide-x border-t text-center"
        style={{ borderColor: `${style.color}20`, '--tw-divide-opacity': '0.15' } as React.CSSProperties}
      >
        {[
          { label: 'PFD',  value: formatPFD(calcResult.PFD_avg) },
          { label: 'SFF',  value: formatPct(calcResult.SFF) },
          { label: 'DC',   value: formatPct(calcResult.DC) },
        ].map(({ label, value }) => (
          <div key={label} className="py-2 px-1" style={{ borderColor: `${style.color}20` }}>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="text-[11px] font-mono font-semibold mt-0.5" style={{ color: style.color }}>
              {value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Architecture visualisation (mini schematic) ──────────────────────────
function ArchitectureViz({ architecture, color, channels }: {
  architecture: string
  color: string
  channels: number
}) {
  const h = channels === 3 ? 56 : 40
  const w = 90

  // Draw parallel channel lines with voted logic symbol
  return (
    <div className="flex justify-center mb-1">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
        {/* Input line */}
        <line x1="0" y1={h/2} x2="18" y2={h/2} stroke={color} strokeWidth="1.5" opacity="0.5" />

        {/* Branches */}
        {Array.from({ length: channels }).map((_, i) => {
          const spacing = h / (channels + 1)
          const y = spacing * (i + 1)
          return (
            <g key={i}>
              <line x1="18" y1={h/2} x2="18" y2={y} stroke={color} strokeWidth="1" opacity="0.4" />
              <line x1="18" y1={y} x2="72" y2={y} stroke={color} strokeWidth="1.5" opacity="0.6" strokeDasharray={architecture === '2oo2' ? '3 2' : 'none'} />
              <rect x="30" y={y-5} width="28" height="10" rx="3" fill={`${color}15`} stroke={color} strokeWidth="1" opacity="0.7" />
              <text x="44" y={y+0.5} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 7, fontFamily: 'IBM Plex Mono', fill: color, opacity: 0.9 }}>
                CH{i+1}
              </text>
              <line x1="72" y1={y} x2="72" y2={h/2} stroke={color} strokeWidth="1" opacity="0.4" />
            </g>
          )
        })}

        {/* Merge/voting gate */}
        <circle cx="72" cy={h/2} r="6" fill={`${color}20`} stroke={color} strokeWidth="1.2" opacity="0.8" />
        <text x="72" y={h/2} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 5.5, fontFamily: 'IBM Plex Mono', fill: color, fontWeight: 700 }}>
          {architecture === '2oo3' ? '2/3' : architecture === '2oo2' ? '&' : '≥1'}
        </text>

        {/* Output line */}
        <line x1="78" y1={h/2} x2="90" y2={h/2} stroke={color} strokeWidth="1.5" opacity="0.5" />
      </svg>
    </div>
  )
}

// ─── Total SIF summary bar ────────────────────────────────────────────────
function SIFSummaryBar({ totalPFD, totalRRF, sil, meetsTarget, targetSIL }: {
  totalPFD: number
  totalRRF: number
  sil: number
  meetsTarget: boolean
  targetSIL: number
}) {
  return (
    <div className={cn(
      'flex items-center justify-between rounded-xl border-2 px-5 py-3',
      meetsTarget
        ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30'
        : 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30',
    )}>
      <div className="flex items-center gap-2">
        {meetsTarget
          ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
          : <AlertTriangle size={16} className="text-amber-500 shrink-0" />
        }
        <div>
          <p className="text-xs font-medium text-muted-foreground">Total SIF</p>
          <p className="text-sm font-bold font-mono">{formatPFD(totalPFD)}</p>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs text-muted-foreground">RRF</p>
        <p className="text-sm font-bold font-mono">{formatPFD(1/totalRRF)}</p>
      </div>
      <div className="flex items-center gap-2">
        <SILBadge sil={sil as any} size="md" />
        <span className={cn(
          'text-xs',
          meetsTarget ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
        )}>
          {meetsTarget ? `✓ Meets SIL ${targetSIL}` : `✗ Target SIL ${targetSIL}`}
        </span>
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
  // Order: sensor → logic → actuator
  const orderedTypes: SubsystemType[] = ['sensor', 'logic', 'actuator']
  const orderedSubsystems = orderedTypes
    .map(type => sif.subsystems.find(s => s.type === type))
    .filter(Boolean) as typeof sif.subsystems

  if (orderedSubsystems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl text-muted-foreground">
        <p className="text-sm font-medium">No subsystems in this SIF</p>
        <p className="text-xs mt-1">Add Sensor, Logic Solver, and Actuator subsystems in the Architecture tab</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <SIFSummaryBar
        totalPFD={calcResult.PFD_avg}
        totalRRF={calcResult.RRF}
        sil={calcResult.SIL}
        meetsTarget={calcResult.meetsTarget}
        targetSIL={sif.targetSIL}
      />

      {/* Chain diagram */}
      <div className="flex items-start gap-0 overflow-x-auto pb-2">
        {/* Process demand arrow in */}
        <div className="flex flex-col items-center justify-center pt-8 shrink-0">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[9px] font-mono text-muted-foreground rotate-0 whitespace-nowrap">Process</span>
            <span className="text-[9px] font-mono text-muted-foreground">demand</span>
          </div>
          <ChainArrow />
        </div>

        {orderedSubsystems.map((subsystem, idx) => (
          <div key={subsystem.id} className="flex items-start gap-0">
            {/* Subsystem block */}
            <div className="w-[220px] shrink-0">
              <SubsystemBlock
                subsystem={subsystem}
                projectId={projectId}
                sifId={sif.id}
              />
            </div>

            {/* Arrow between subsystems */}
            {idx < orderedSubsystems.length - 1 && (
              <div className="flex items-center mt-8">
                <ChainArrow label="trip signal" />
              </div>
            )}
          </div>
        ))}

        {/* Process action arrow out */}
        <div className="flex flex-col items-center justify-center pt-8 shrink-0">
          <ChainArrow />
          <div className="flex flex-col items-center gap-1 mt-1">
            <span className="text-[9px] font-mono text-muted-foreground whitespace-nowrap">Safe</span>
            <span className="text-[9px] font-mono text-muted-foreground">state</span>
          </div>
        </div>
      </div>

      {/* IEC 61511 methodology note */}
      <p className="text-[11px] text-muted-foreground/60 font-mono">
        PFD<sub>SIF</sub> = ΣPFDᵢ (series model · IEC 61511-1 §11) · Click any tag to edit parameters
      </p>
    </div>
  )
}
