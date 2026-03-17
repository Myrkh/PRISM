/**
 * LoopEditorFlow — PRISM v3 (refactored)
 *
 * Composeur guide pour le Loop Editor.
 *   – Parametres globaux + acces CCF/BETA en barre haute
 *   – Colonnes fixes Sensors / Logic / Final elements
 *   – Edition structurelle guidee au centre, composant detaille a droite
 *   – Architecture changes saved to Supabase via store
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import ReactFlow, {
  Background, Controls, MiniMap,
  Handle, Position,
  useNodesState, useEdgesState,
  BaseEdge, EdgeLabelRenderer, getBezierPath,
  type NodeProps, type EdgeProps,
} from 'reactflow'
import 'reactflow/dist/style.css'

import { nanoid } from 'nanoid'
import {
  Plus, Trash2, ChevronDown, ChevronRight, X,
  Activity, Cpu, Zap, CheckCircle2, ShieldCheck,
} from 'lucide-react'
import { useAppStore, selectSIFCalc } from '@/store/appStore'
import { calcSIF, calcComponentSFF, calcComponentDC, factorizedToDeveloped, formatPFD, formatPct, formatRRF } from '@/core/math/pfdCalc'
import {
  applicableBetaChecklistItems,
  computeBetaAssessment,
  defaultMooN,
  normalizeBetaAssessment,
  profileForSubsystemType,
  type BetaAssessmentResult,
} from '@/core/math/betaFactor'
import { loadSIFAnalysisSettings, saveSIFAnalysisSettings } from '@/core/models/analysisSettings'
import { DEFAULT_CHANNEL, DEFAULT_COMPONENT, DEFAULT_SUBSYSTEM } from '@/core/models/defaults'
import {
  ARCHITECTURE_META,
  type Architecture,
  type BetaAssessmentConfig,
  type SIF,
  type SIFChannel,
  type SIFComponent,
  type SIFSubsystem,
  type SubsystemCalcResult,
  type SubsystemType,
  type BooleanGate,
  type VoteType,
  type CCFMethod,
} from '@/core/types'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useLayout } from '@/components/layout/SIFWorkbenchLayout'
import { CCFBetaRightPanel } from '@/components/architecture/CCFBetaRightPanel'
import { CCFBetaWorkspace } from '@/components/architecture/CCFBetaWorkspace'
import { LoopEditorRightPanel } from '@/components/architecture/LoopEditorRightPanel'
import { instantiateComponentTemplate, parseLibraryDragPayload } from '@/features/library'
import { usePrismTheme } from '@/styles/usePrismTheme'

const SUB_META: Record<SubsystemType, { color: string; label: string; Icon: React.ElementType }> = {
  sensor:   { color: '#0284C7', label: 'Capteur(s)',    Icon: Activity },
  logic:    { color: '#7C3AED', label: 'Logique',       Icon: Cpu      },
  actuator: { color: '#EA580C', label: 'Actionneur(s)', Icon: Zap      },
}

const ARCH_OPTIONS = (Object.keys(ARCHITECTURE_META) as Architecture[])

// ─── ReactFlow data types ────────────────────────────────────────────────
interface SubsystemNodeData {
  subsystem: SIFSubsystem
  calcResult: SubsystemCalcResult | undefined
  selectedId: string | null
  projectId: string
  sifId: string
  onSelectComp: (id: string) => void
  onAddChannel: (subId: string) => void
  onRemoveChannel: (subId: string, chId: string) => void
  onRemoveSub: (subId: string) => void
  onUpdateArch: (subId: string, arch: Architecture) => void
  onUpdateCustomGate: (subId: string, gate: BooleanGate, expression: string) => void
  onUpdateEngineSettings: (subId: string, patch: Pick<SIFSubsystem, 'voteType' | 'ccf'>) => void
}

interface AnimatedEdgeData { label?: string }

// ─── Metric pill ──────────────────────────────────────────────────────────
function MetricPill({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  const { BORDER, SHADOW_SOFT, SURFACE, TEXT_DIM, semantic } = usePrismTheme()
  const color = ok === undefined ? TEXT_DIM : ok ? semantic.success : semantic.error
  return (
    <div
      className="flex min-w-[44px] flex-col items-center rounded-md border px-1.5 py-1"
      style={{ background: SURFACE, borderColor: BORDER, boxShadow: SHADOW_SOFT }}
    >
      <span className="text-[8px] uppercase tracking-widest" style={{ color: TEXT_DIM }}>{label}</span>
      <span className="text-[9px] font-bold font-mono" style={{ color }}>{value}</span>
    </div>
  )
}

function ComposerSectionHeader({
  icon,
  children,
  accent,
}: {
  icon: React.ReactNode
  children: React.ReactNode
  accent?: string
}) {
  const { BORDER, SHADOW_SOFT, TEAL } = usePrismTheme()
  const tone = accent ?? TEAL
  return (
    <div className="mb-3 flex items-center gap-2 border-b pb-2" style={{ borderColor: BORDER }}>
      <span
        className="inline-flex h-6 w-6 items-center justify-center rounded-md border"
        style={{ color: tone, background: `${tone}10`, borderColor: `${tone}22`, boxShadow: SHADOW_SOFT }}
      >
        {icon}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: tone }}>
        {children}
      </span>
    </div>
  )
}

function formatBetaPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

// ─── Component card ──────────────────────────────────────────────────────
function CompCard({
  comp, color, selected, onSelect, onDelete,
}: {
  comp: SIFComponent; color: string; selected: boolean
  onSelect: () => void; onDelete: () => void
}) {
  const { BORDER, SHADOW_PANEL, SHADOW_SOFT, SURFACE, TEXT, TEXT_DIM } = usePrismTheme()
  const d   = factorizedToDeveloped(comp.factorized)
  const sff = calcComponentSFF(d)
  const dc  = calcComponentDC(d)

  return (
    <div onClick={e => { e.stopPropagation(); onSelect() }}
      className="group relative rounded-lg border cursor-pointer transition-all"
      style={{
        background:  selected ? `${color}12` : SURFACE,
        borderColor: selected ? `${color}55` : BORDER,
        borderWidth: selected ? 1.5 : 1,
        boxShadow:   selected ? `${SHADOW_PANEL}, 0 0 0 1px ${color}22` : SHADOW_SOFT,
        padding: '8px 10px', minWidth: 0, width: '100%',
      }}>
      <div className="flex items-start justify-between gap-1 mb-1.5">
        <span className="text-[11px] font-bold font-mono truncate" style={{ color }}>{comp.tagName}</span>
        <button onClick={e => { e.stopPropagation(); onDelete() }}
          className="opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 hover:bg-red-900/40"
          style={{ color: '#F87171' }}><Trash2 size={10} /></button>
      </div>
      <p className="text-[10px] truncate mb-1.5" style={{ color: TEXT_DIM }}>{comp.instrumentType || comp.instrumentCategory}</p>
      <div className="flex gap-2">
        <MetricPill label="SFF" value={formatPct(sff)} ok={sff >= 0.6} />
        <MetricPill label="DC"  value={formatPct(dc)}  ok={dc  >= 0.6} />
        <MetricPill label="λ"   value={`${comp.factorized.lambda.toFixed(1)}`} />
      </div>
      {selected && <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 0 2px ${TEXT}, 0 0 12px ${color}55` }} />}
    </div>
  )
}

// ─── Channel block ───────────────────────────────────────────────────────
function ChannelBlock({
  channel, subsystem, color, selectedId, projectId, sifId, onSelectComp, canDelete, onDelete,
}: {
  channel: SIFChannel; subsystem: SIFSubsystem; color: string
  selectedId: string | null; projectId: string; sifId: string
  onSelectComp: (id: string) => void
  canDelete: boolean
  onDelete: () => void
}) {
  const { BORDER, PAGE_BG, SHADOW_SOFT, SURFACE, TEAL, TEXT_DIM } = usePrismTheme()
  const addComponent    = useAppStore(s => s.addComponent)
  const removeComponent = useAppStore(s => s.removeComponent)
  const selectComponent = useAppStore(s => s.selectComponent)
  const [over, setOver] = useState(false)

  const handleAddComp = () => {
    const prefix = subsystem.type === 'sensor' ? 'PT' : subsystem.type === 'logic' ? 'PLC' : 'XV'
    const comp = DEFAULT_COMPONENT(subsystem.type, `${prefix}-${nanoid(4).toUpperCase()}`)
    addComponent(projectId, sifId, subsystem.id, channel.id, comp)
    selectComponent(comp.id)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setOver(false)
    const raw = e.dataTransfer.getData('application/prism-lib')
    if (!raw) return
    const template = parseLibraryDragPayload(raw)
    if (!template || template.subsystemType !== subsystem.type) return
    const prefix = template.subsystemType === 'sensor' ? 'PT' : template.subsystemType === 'logic' ? 'PLC' : 'XV'
    const comp = instantiateComponentTemplate(template, `${prefix}-${nanoid(4).toUpperCase()}`)
    addComponent(projectId, sifId, subsystem.id, channel.id, comp)
    selectComponent(comp.id)
  }

  return (
    <div className="rounded-lg border transition-all"
      style={{
        borderColor: over ? `${color}40` : BORDER,
        background: over ? `${color}08` : SURFACE,
        boxShadow: SHADOW_SOFT,
        padding: 8,
        minWidth: 0,
        width: '100%',
      }}
      onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)} onDrop={handleDrop}>
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: `${color}80` }}>{channel.label}</span>
        {channel.components.length > 1 && (
          <span className="rounded px-1 py-0.5 text-[8px] font-mono font-bold"
            style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}>
            {channel.architecture ?? '1oo1'}
          </span>
        )}
        {canDelete && (
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            className="rounded p-0.5 transition-colors hover:bg-red-900/40"
            style={{ color: '#F87171' }}
            title="Supprimer ce channel"
            aria-label={`Supprimer ${channel.label}`}
          >
            <Trash2 size={11} />
          </button>
        )}
        <button onClick={handleAddComp} className="ml-auto rounded p-0.5 transition-colors"
          style={{ color: TEXT_DIM }}
          onMouseEnter={e => (e.currentTarget.style.color = TEAL)}
          onMouseLeave={e => (e.currentTarget.style.color = TEXT_DIM)}><Plus size={12} /></button>
      </div>
      <div className="space-y-2">
        {channel.components.map(comp => (
          <CompCard key={comp.id} comp={comp} color={color} selected={selectedId === comp.id}
            onSelect={() => onSelectComp(comp.id)}
            onDelete={() => { removeComponent(projectId, sifId, subsystem.id, channel.id, comp.id); if (selectedId === comp.id) selectComponent(null) }} />
        ))}
        {channel.components.length === 0 && (
          <div className="rounded border-2 border-dashed px-3 py-4 text-center"
            style={{ borderColor: `${color}30`, color: TEXT_DIM }}><p className="text-[10px]">Déposer ici</p></div>
        )}
      </div>
    </div>
  )
}

// ─── Architecture Selector ───────────────────────────────────────────────
function ArchSelector({ subsystem, color, onUpdateArch, onUpdateCustomGate, onUpdateEngineSettings }: {
  subsystem: SIFSubsystem; color: string
  onUpdateArch: (subId: string, arch: Architecture) => void
  onUpdateCustomGate: (subId: string, gate: BooleanGate, expression: string) => void
  onUpdateEngineSettings: (subId: string, patch: Pick<SIFSubsystem, 'voteType' | 'ccf'>) => void
}) {
  const { BORDER, PAGE_BG, SHADOW_SOFT, SURFACE, TEAL, TEXT, TEXT_DIM } = usePrismTheme()
  const isCustom = subsystem.architecture === 'custom'
  const gate = subsystem.customBooleanArch?.gate ?? 'OR'
  const expr = subsystem.customBooleanArch?.expression ?? ''
  const voteType = subsystem.voteType ?? 'S'
  const ccf = subsystem.ccf ?? { beta: 0.05, betaD: 0.025, method: 'MAX' as CCFMethod }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: TEXT_DIM }}>Architecture</span>
        <div className="flex flex-wrap gap-1.5">
          {ARCH_OPTIONS.map(option => {
            const active = subsystem.architecture === option
            return (
              <button
                key={option}
                type="button"
                onClick={() => onUpdateArch(subsystem.id, option)}
                className="rounded-md px-2 py-1 text-[10px] font-mono font-bold transition-colors"
                style={active
                  ? { background: color, color: '#fff', boxShadow: `0 0 12px ${color}35` }
                  : { background: SURFACE, color: TEXT_DIM, border: `1px solid ${BORDER}`, boxShadow: SHADOW_SOFT }}
                title={option === 'custom' ? 'Architecture booléenne libre' : ARCHITECTURE_META[option].desc}
              >
                {option}
              </button>
            )
          })}
        </div>
        <p className="text-[10px] leading-relaxed" style={{ color: TEXT_DIM }}>
          {isCustom
            ? 'Mode libre avec expression booléenne et nombre de voies piloté manuellement.'
            : ARCHITECTURE_META[subsystem.architecture].desc}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: TEXT_DIM }}>Vote</span>
          <select
            value={voteType}
            onChange={e => onUpdateEngineSettings(subsystem.id, { voteType: e.target.value as VoteType, ccf })}
            className="w-full h-6 rounded border px-1 text-[10px] font-mono font-bold outline-none"
            style={{ background: PAGE_BG, borderColor: `${color}30`, color, boxShadow: SHADOW_SOFT }}
          >
            <option value="S">Standard (S)</option>
            <option value="A">Availability (A)</option>
            <option value="M">Maintenance (M)</option>
          </select>
        </div>
        <div className="space-y-1">
          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: TEXT_DIM }}>CCF</span>
          <div
            className="rounded border px-2 py-1.5"
            style={{ background: SURFACE, borderColor: `${color}30`, boxShadow: SHADOW_SOFT }}
          >
            <p className="text-[10px] font-mono font-bold" style={{ color }}>{ccf.method}</p>
            <p className="mt-0.5 text-[9px] font-mono" style={{ color: TEXT_DIM }}>
              β {formatBetaPct(ccf.beta)} · βD {formatBetaPct(ccf.betaD)}
            </p>
          </div>
        </div>
      </div>

      {/* Custom boolean editor */}
      {isCustom && (
        <div className="rounded-lg border p-2 space-y-1.5" style={{ background: SURFACE, borderColor: `${color}30`, boxShadow: SHADOW_SOFT }}>
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-bold" style={{ color: TEXT_DIM }}>Gate :</span>
            {(['OR', 'AND'] as BooleanGate[]).map(g => (
              <button key={g} onClick={() => onUpdateCustomGate(subsystem.id, g, expr)}
                className="px-2 py-0.5 text-[9px] font-bold rounded transition-all"
                style={gate === g
                  ? { background: g === 'OR' ? TEAL : color, color: '#fff' }
                  : { background: 'transparent', color: TEXT_DIM, border: `1px solid ${BORDER}` }
                }>{g}</button>
            ))}
          </div>
          <input value={expr} placeholder="ex: (A1·A2) + (A3·A4)"
            onChange={e => onUpdateCustomGate(subsystem.id, gate, e.target.value)}
            className="w-full h-6 px-2 text-[10px] font-mono rounded border outline-none transition-all"
            style={{ background: PAGE_BG, borderColor: BORDER, color: TEAL, boxShadow: SHADOW_SOFT }}
          />
          <p className="text-[8px] leading-tight" style={{ color: TEXT_DIM }}>
            · = ET (série) · + = OU (parallèle) · ex: [(V1·V2) + (V3·V4)]
          </p>
        </div>
      )}
    </div>
  )
}

function SubsystemComposerColumn({
  subsystem,
  calcResult,
  projectId,
  sifId,
  selectedId,
  onSelectComp,
  onAddChannel,
  onRemoveChannel,
  onRemoveSub,
  onUpdateArch,
  onUpdateCustomGate,
  onUpdateEngineSettings,
}: {
  subsystem: SIFSubsystem
  calcResult: SubsystemCalcResult | undefined
  projectId: string
  sifId: string
  selectedId: string | null
  onSelectComp: (id: string) => void
  onAddChannel: (subId: string) => void
  onRemoveChannel: (subId: string, chId: string) => void
  onRemoveSub: (subId: string) => void
  onUpdateArch: (subId: string, arch: Architecture) => void
  onUpdateCustomGate: (subId: string, gate: BooleanGate, expression: string) => void
  onUpdateEngineSettings: (subId: string, patch: Pick<SIFSubsystem, 'voteType' | 'ccf'>) => void
}) {
  const meta = SUB_META[subsystem.type]
  const { BORDER, CARD_BG, PAGE_BG, SHADOW_PANEL, SHADOW_SOFT, SURFACE, TEXT, TEXT_DIM, semantic } = usePrismTheme()
  const isCustom = subsystem.architecture === 'custom'
  const lastChannelId = subsystem.channels[subsystem.channels.length - 1]?.id

  return (
    <section
      className="flex min-w-[320px] flex-1 flex-col overflow-hidden rounded-xl border"
      style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_PANEL }}
    >
      <header className="border-b px-4 py-4" style={{ borderColor: BORDER }}>
        <ComposerSectionHeader icon={<meta.Icon size={12} />} accent={meta.color}>
          {meta.label}
        </ComposerSectionHeader>

        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-semibold" style={{ color: TEXT }}>{subsystem.label}</p>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-mono font-bold"
                style={{ background: `${meta.color}16`, color: meta.color }}
              >
                {subsystem.architecture}
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
              {meta.label} du SIS. Structurez les voies puis ajoutez les composants defendables.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onRemoveSub(subsystem.id)}
            className="rounded-lg p-1.5 transition-colors hover:bg-red-900/20"
            style={{ color: TEXT_DIM }}
            aria-label={`Supprimer ${subsystem.label}`}
            title={`Supprimer ${subsystem.label}`}
          >
            <X size={14} />
          </button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border px-3 py-2" style={{ borderColor: BORDER, background: SURFACE, boxShadow: SHADOW_SOFT }}>
            <p className="text-[9px] uppercase tracking-widest" style={{ color: TEXT_DIM }}>PFDavg</p>
            <p className="mt-1 text-sm font-bold font-mono" style={{ color: meta.color }}>
              {calcResult ? formatPFD(calcResult.PFD_avg) : '—'}
            </p>
          </div>
          <div className="rounded-xl border px-3 py-2" style={{ borderColor: BORDER, background: SURFACE, boxShadow: SHADOW_SOFT }}>
            <p className="text-[9px] uppercase tracking-widest" style={{ color: TEXT_DIM }}>SIL</p>
            <p className="mt-1 text-sm font-bold font-mono" style={{ color: calcResult ? (calcResult.SIL >= 2 ? semantic.success : semantic.warning) : TEXT }}>
              {calcResult ? `SIL ${calcResult.SIL}` : '—'}
            </p>
          </div>
          <div className="rounded-xl border px-3 py-2" style={{ borderColor: BORDER, background: SURFACE, boxShadow: SHADOW_SOFT }}>
            <p className="text-[9px] uppercase tracking-widest" style={{ color: TEXT_DIM }}>Voies</p>
            <p className="mt-1 text-sm font-bold font-mono" style={{ color: TEXT }}>
              {subsystem.channels.length}
            </p>
          </div>
        </div>
      </header>

      <div className="border-b px-4 py-4" style={{ borderColor: BORDER }}>
        <ArchSelector
          subsystem={subsystem}
          color={meta.color}
          onUpdateArch={onUpdateArch}
          onUpdateCustomGate={onUpdateCustomGate}
          onUpdateEngineSettings={onUpdateEngineSettings}
        />
      </div>

      <div className="border-b px-4 py-3" style={{ borderColor: BORDER, background: CARD_BG }}>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: TEXT_DIM }}>
                Voies / Channels
              </p>
            </div>

            {isCustom && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (lastChannelId) onRemoveChannel(subsystem.id, lastChannelId)
                  }}
                  disabled={subsystem.channels.length <= 1 || !lastChannelId}
                  className="rounded-lg border px-2 py-1 text-[10px] font-semibold transition-colors disabled:opacity-40"
                  style={{ borderColor: BORDER, color: TEXT_DIM, background: PAGE_BG }}
                >
                  - voie
                </button>
                <button
                  type="button"
                  onClick={() => onAddChannel(subsystem.id)}
                  disabled={subsystem.channels.length >= 4}
                  className="rounded-lg border px-2 py-1 text-[10px] font-semibold transition-colors disabled:opacity-40"
                  style={{ borderColor: `${meta.color}35`, color: meta.color, background: `${meta.color}10` }}
                >
                  + voie
                </button>
              </div>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-4">
            {Array.from({ length: Math.max(4, subsystem.channels.length) }, (_, index) => {
              const channel = subsystem.channels[index]
              const active = Boolean(channel)
              return (
                <div
                  key={`${subsystem.id}-channel-slot-${index}`}
                  className="rounded-lg border px-3 py-2"
                  style={{
                    borderColor: active ? `${meta.color}30` : BORDER,
                    background: active ? `${meta.color}08` : SURFACE,
                    color: active ? meta.color : TEXT_DIM,
                    boxShadow: SHADOW_SOFT,
                  }}
                >
                  <p className="text-[9px] uppercase tracking-widest" style={{ color: active ? `${meta.color}B8` : TEXT_DIM }}>
                    Voie {index + 1}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold">
                    {active ? channel?.label ?? `Channel ${index + 1}` : 'Inactive'}
                  </p>
                </div>
              )
            })}
          </div>

          <p className="text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
            {subsystem.channels.length} voie{subsystem.channels.length > 1 ? 's' : ''} active{subsystem.channels.length > 1 ? 's' : ''} · {subsystem.architecture}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-3">
          {subsystem.channels.map(channel => (
            <ChannelBlock
              key={channel.id}
              channel={channel}
              subsystem={subsystem}
              color={meta.color}
              selectedId={selectedId}
              projectId={projectId}
              sifId={sifId}
              onSelectComp={onSelectComp}
              canDelete={isCustom && subsystem.channels.length > 1}
              onDelete={() => onRemoveChannel(subsystem.id, channel.id)}
            />
          ))}

          {isCustom && (
            <button
              type="button"
              onClick={() => onAddChannel(subsystem.id)}
              disabled={subsystem.channels.length >= 4}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-3 text-[11px] font-semibold transition-colors disabled:opacity-40"
              style={{ borderColor: `${meta.color}28`, color: meta.color, background: SURFACE, boxShadow: SHADOW_SOFT }}
            >
              <Plus size={14} />
              Ajouter une voie
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

function MissingSubsystemColumn({
  type,
  onAdd,
}: {
  type: SubsystemType
  onAdd: () => void
}) {
  const meta = SUB_META[type]
  const { BORDER, CARD_BG, SHADOW_PANEL, TEXT, TEXT_DIM } = usePrismTheme()

  return (
    <section
      className="flex min-w-[320px] flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center"
      style={{ borderColor: `${meta.color}28`, background: CARD_BG, boxShadow: SHADOW_PANEL }}
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-2xl border"
        style={{ borderColor: `${meta.color}35`, background: `${meta.color}10`, color: meta.color }}
      >
        <meta.Icon size={20} />
      </div>
      <p className="mt-4 text-base font-semibold" style={{ color: TEXT }}>
        Ajouter {meta.label}
      </p>
      <p className="mt-2 max-w-[240px] text-sm leading-relaxed" style={{ color: TEXT_DIM }}>
        Creez ce sous-systeme pour completer la chaine de securite et parametrer son architecture.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-5 inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors"
        style={{ borderColor: `${meta.color}30`, background: `${meta.color}10`, color: meta.color }}
      >
        <Plus size={14} />
        Ajouter {meta.label}
      </button>
    </section>
  )
}

// ─── Subsystem Node ──────────────────────────────────────────────────────
function SubsystemNode({ data }: NodeProps<SubsystemNodeData>) {
  const {
    subsystem, calcResult, selectedId, projectId, sifId,
    onSelectComp, onAddChannel, onRemoveChannel, onRemoveSub,
  } = data

  const meta  = SUB_META[subsystem.type as SubsystemType]
  const { color, Icon } = meta
  const { CARD_BG, TEXT_DIM, semantic } = usePrismTheme()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="rounded-xl border" style={{ background: CARD_BG, borderColor: `${color}40`, minWidth: 240, boxShadow: `0 0 20px ${color}15` }}>
      <Handle type="target" position={Position.Left} style={{ background: color, border: 'none', width: 10, height: 10 }} />
      <Handle type="source" position={Position.Right} style={{ background: color, border: 'none', width: 10, height: 10 }} />

      {/* Header — label + arch badge + live PFD + actions */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b rounded-t-xl"
        style={{ borderColor: `${color}30`, background: `${color}10` }}>
        <Icon size={14} style={{ color }} />
        <span className="text-sm font-bold flex-1 truncate" style={{ color }}>{subsystem.label}</span>
        <span className="text-[9px] font-mono font-bold rounded px-1.5 py-0.5 shrink-0"
          style={{ background: `${color}20`, color }}>{subsystem.architecture}</span>
        {calcResult && (
          <span className="text-[10px] font-mono font-bold shrink-0"
            style={{ color: calcResult.SIL >= 2 ? semantic.success : semantic.warning }}>
            {formatPFD(calcResult.PFD_avg)}
          </span>
        )}
        <button onClick={() => setCollapsed(v => !v)} className="p-0.5 rounded shrink-0" style={{ color: TEXT_DIM }}>
          {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
        </button>
        <button onClick={() => onRemoveSub(subsystem.id)}
          className="p-0.5 rounded hover:text-red-400 transition-colors shrink-0" style={{ color: TEXT_DIM }}><X size={11} /></button>
      </div>

      {/* Channels */}
      {!collapsed && (
        <div className="p-3">
          <div className="flex gap-3 flex-wrap">
            {subsystem.channels.map((ch: SIFChannel) => (
              <ChannelBlock
                key={ch.id}
                channel={ch}
                subsystem={subsystem}
                color={color}
                selectedId={selectedId}
                projectId={projectId}
                sifId={sifId}
                onSelectComp={onSelectComp}
                canDelete={subsystem.channels.length > 1}
                onDelete={() => onRemoveChannel(subsystem.id, ch.id)}
              />
            ))}
            <button onClick={() => onAddChannel(subsystem.id)}
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-3 transition-colors"
              style={{ borderColor: `${color}30`, color: TEXT_DIM, minHeight: 80 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = `${color}70`; e.currentTarget.style.color = color }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = `${color}30`; e.currentTarget.style.color = TEXT_DIM }}>
              <Plus size={14} className="mb-1" /><span className="text-[9px] uppercase tracking-widest">Canal</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Animated Edge ───────────────────────────────────────────────────────
function AnimatedEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data }: EdgeProps<AnimatedEdgeData>) {
  const { BORDER, CARD_BG, TEAL_DIM, TEAL } = usePrismTheme()
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ stroke: TEAL, strokeWidth: 2, strokeDasharray: '6 3', opacity: 0.7 }} />
      <EdgeLabelRenderer>
        <div className="absolute text-[9px] font-bold uppercase tracking-widest rounded px-1.5 py-0.5 pointer-events-none"
          style={{ transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)`, background: CARD_BG, color: TEAL_DIM, border: `1px solid ${BORDER}` }}>
          {data?.label ?? 'signal'}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

// ─── Node/edge type registrations ────────────────────────────────────────
const NODE_TYPES = { subsystem: SubsystemNode }
const EDGE_TYPES = { animated: AnimatedEdge }

// ─── Main export ─────────────────────────────────────────────────────────
interface Props { sif: SIF; projectId: string }

type LoopEditorWorkspaceMode = 'composer' | 'ccf-beta'

export function LoopEditorFlow({ sif, projectId }: Props) {
  const { BORDER, CARD_BG, PAGE_BG, SHADOW_PANEL, SHADOW_SOFT, SURFACE, PANEL_BG, TEAL, TEAL_DIM, TEXT, TEXT_DIM, semantic } = usePrismTheme()
  const CANVAS_BG = 'transparent'
  const NODE_BG2 = PAGE_BG
  const { setRightPanelOverride } = useLayout()
  const addSubsystem    = useAppStore(s => s.addSubsystem)
  const updateSubsystem = useAppStore(s => s.updateSubsystem)
  const removeSubsystem = useAppStore(s => s.removeSubsystem)
  const addChannel      = useAppStore(s => s.addChannel)
  const removeChannel   = useAppStore(s => s.removeChannel)
  const selectComponent = useAppStore(s => s.selectComponent)
  const selectedId      = useAppStore(s => s.selectedComponentId)
  const calc            = useAppStore(s => selectSIFCalc(s, projectId, sif.id)) ?? calcSIF(sif)
  const firstComponent  = sif.subsystems.flatMap(sub => sub.channels.flatMap(ch => ch.components))[0]
  const [globalT1, setGlobalT1] = useState(() => String(firstComponent?.test.T1 ?? 1))
  const [globalT1Unit, setGlobalT1Unit] = useState<'hr' | 'yr'>(() => firstComponent?.test.T1Unit ?? 'yr')
  const [globalT0, setGlobalT0] = useState(() => String(firstComponent?.test.T0 ?? 1))
  const [globalT0Unit, setGlobalT0Unit] = useState<'hr' | 'yr'>(() => firstComponent?.test.T0Unit ?? 'yr')
  const [missionTime, setMissionTime] = useState(() => String(loadSIFAnalysisSettings(sif.id).general.missionTime))
  const [missionTimeUnit, setMissionTimeUnit] = useState<'hr' | 'yr'>(() => loadSIFAnalysisSettings(sif.id).general.missionTimeUnit)
  const [workspaceMode, setWorkspaceMode] = useState<LoopEditorWorkspaceMode>('composer')
  const [selectedCcfSubsystemId, setSelectedCcfSubsystemId] = useState<string | null>(null)
  const [ccfVoteType, setCcfVoteType] = useState<VoteType>('S')
  const [ccfMethod, setCcfMethod] = useState<CCFMethod>('MAX')
  const [ccfBetaPct, setCcfBetaPct] = useState('5')
  const [ccfBetaDPct, setCcfBetaDPct] = useState('2.5')
  const [ccfAssessmentDraft, setCcfAssessmentDraft] = useState<BetaAssessmentConfig>(
    () => normalizeBetaAssessment(undefined, 'logic', '1oo1', 1),
  )

  const redundantSubsystems = useMemo(
    () => sif.subsystems.filter(subsystem => subsystem.channels.length > 1),
    [sif.subsystems],
  )
  const selectedCcfSubsystem = useMemo(
    () => redundantSubsystems.find(subsystem => subsystem.id === selectedCcfSubsystemId) ?? redundantSubsystems[0] ?? null,
    [redundantSubsystems, selectedCcfSubsystemId],
  )
  const ccfChecklistItems = useMemo(
    () => applicableBetaChecklistItems(ccfAssessmentDraft.profile),
    [ccfAssessmentDraft.profile],
  )
  const ccfChecklistSections = useMemo(() => {
    const sections = new Map<string, typeof ccfChecklistItems>()

    ccfChecklistItems.forEach(item => {
      const items = sections.get(item.section) ?? []
      items.push(item)
      sections.set(item.section, items)
    })

    return Array.from(sections.entries()).map(([section, items]) => ({ section, items }))
  }, [ccfChecklistItems])
  const ccfAssessmentResult = useMemo<BetaAssessmentResult | null>(
    () => (selectedCcfSubsystem ? computeBetaAssessment(ccfAssessmentDraft, selectedCcfSubsystem.type) : null),
    [ccfAssessmentDraft, selectedCcfSubsystem],
  )

  useEffect(() => {
    setGlobalT1(String(firstComponent?.test.T1 ?? 1))
    setGlobalT1Unit(firstComponent?.test.T1Unit ?? 'yr')
    setGlobalT0(String(firstComponent?.test.T0 ?? 1))
    setGlobalT0Unit(firstComponent?.test.T0Unit ?? 'yr')
  }, [firstComponent?.id, firstComponent?.test.T0, firstComponent?.test.T0Unit, firstComponent?.test.T1, firstComponent?.test.T1Unit])

  useEffect(() => {
    const settings = loadSIFAnalysisSettings(sif.id)
    setMissionTime(String(settings.general.missionTime))
    setMissionTimeUnit(settings.general.missionTimeUnit)
  }, [sif.id])

  useEffect(() => {
    if (!redundantSubsystems.length) {
      setSelectedCcfSubsystemId(null)
      setWorkspaceMode('composer')
      return
    }

    setSelectedCcfSubsystemId(current =>
      current && redundantSubsystems.some(subsystem => subsystem.id === current)
        ? current
        : redundantSubsystems[0].id,
    )
  }, [redundantSubsystems])

  useEffect(() => {
    if (!selectedCcfSubsystem) return
    const normalizedAssessment = normalizeBetaAssessment(
      selectedCcfSubsystem.ccf?.assessment,
      selectedCcfSubsystem.type,
      selectedCcfSubsystem.architecture,
      selectedCcfSubsystem.channels.length,
    )
    const defaultScale = defaultMooN(selectedCcfSubsystem.architecture, selectedCcfSubsystem.channels.length)

    setCcfVoteType(selectedCcfSubsystem.voteType ?? 'S')
    setCcfMethod(selectedCcfSubsystem.ccf?.method ?? 'MAX')
    setCcfBetaPct((clamp01(selectedCcfSubsystem.ccf?.beta ?? 0.05) * 100).toFixed(2).replace(/\.00$/, ''))
    setCcfBetaDPct((clamp01(selectedCcfSubsystem.ccf?.betaD ?? 0.025) * 100).toFixed(2).replace(/\.00$/, ''))
    setCcfAssessmentDraft({
      ...normalizedAssessment,
      profile: profileForSubsystemType(selectedCcfSubsystem.type),
      mooN_M: selectedCcfSubsystem.architecture === 'custom'
        ? Math.min(normalizedAssessment.mooN_M, Math.max(1, selectedCcfSubsystem.channels.length))
        : defaultScale.m,
      mooN_N: selectedCcfSubsystem.architecture === 'custom'
        ? Math.max(selectedCcfSubsystem.channels.length, normalizedAssessment.mooN_N)
        : defaultScale.n,
    })
  }, [
    selectedCcfSubsystem?.id,
    selectedCcfSubsystem?.architecture,
    selectedCcfSubsystem?.channels.length,
    selectedCcfSubsystem?.voteType,
    selectedCcfSubsystem?.ccf?.beta,
    selectedCcfSubsystem?.ccf?.betaD,
    selectedCcfSubsystem?.ccf?.method,
    selectedCcfSubsystem?.ccf?.assessment,
    selectedCcfSubsystem?.type,
  ])

  const handleSelectComp = useCallback((componentId: string) => {
    selectComponent(selectedId === componentId ? null : componentId)
  }, [selectedId, selectComponent])

  const handleAddChannel = useCallback((subId: string) => {
    addChannel(projectId, sif.id, subId)
  }, [projectId, sif.id, addChannel])

  const handleRemoveChannel = useCallback((subId: string, chId: string) => {
    const channel = sif.subsystems
      .find(sub => sub.id === subId)
      ?.channels.find(ch => ch.id === chId)

    if (channel?.components.some(comp => comp.id === selectedId)) {
      selectComponent(null)
    }

    removeChannel(projectId, sif.id, subId, chId)
  }, [projectId, sif, selectedId, removeChannel, selectComponent])

  const handleRemoveSub = useCallback((subId: string) => {
    removeSubsystem(projectId, sif.id, subId)
    selectComponent(null)
  }, [projectId, sif.id, removeSubsystem, selectComponent])

  // ── Architecture change handler ────────────────────────────────────────
  const handleUpdateArch = useCallback((subId: string, arch: Architecture) => {
    const sub = sif.subsystems.find(s => s.id === subId)
    if (!sub) return
    // Adjust channel count to match architecture
    const requiredChannels = arch === 'custom'
      ? Math.max(sub.channels.length, ARCHITECTURE_META.custom.channels)
      : (ARCHITECTURE_META[arch]?.channels ?? 1)
    const currentChannels = sub.channels.length
    let channels = [...sub.channels]
    if (requiredChannels < currentChannels) {
      const removedChannels = channels.slice(requiredChannels)
      if (removedChannels.some(channel => channel.components.some(comp => comp.id === selectedId))) {
        selectComponent(null)
      }
      channels = channels.slice(0, requiredChannels)
    }
    if (requiredChannels > currentChannels) {
      for (let i = currentChannels; i < requiredChannels; i++) {
        channels.push(DEFAULT_CHANNEL(sub.type, i, sif.sifNumber))
      }
    }
    channels = channels.map((channel, index) => ({
      ...channel,
      label: `Channel ${index + 1}`,
    }))
    const updated: SIFSubsystem = {
      ...sub,
      architecture: arch,
      channels,
      customBooleanArch: arch === 'custom' ? (sub.customBooleanArch ?? { gate: 'OR', expression: '', manualHFT: 0 }) : undefined,
    }
    updateSubsystem(projectId, sif.id, updated)
  }, [sif, projectId, selectedId, selectComponent, updateSubsystem])

  const handleUpdateCustomGate = useCallback((subId: string, gate: BooleanGate, expression: string) => {
    const sub = sif.subsystems.find(s => s.id === subId)
    if (!sub) return
    updateSubsystem(projectId, sif.id, {
      ...sub,
      customBooleanArch: { gate, expression, manualHFT: gate === 'OR' ? 1 : 0 },
    })
  }, [sif, projectId, updateSubsystem])

  const handleUpdateEngineSettings = useCallback((subId: string, patch: Pick<SIFSubsystem, 'voteType' | 'ccf'>) => {
    const sub = sif.subsystems.find(s => s.id === subId)
    if (!sub) return

    updateSubsystem(projectId, sif.id, {
      ...sub,
      voteType: patch.voteType,
      ccf: {
        ...(sub.ccf ?? { beta: 0.05, betaD: 0.025, method: 'MAX' }),
        ...patch.ccf,
      },
    })
  }, [sif, projectId, updateSubsystem])

  const handleApplyGlobalTests = useCallback(() => {
    const nextT1 = parseFloat(globalT1)
    const nextT0 = parseFloat(globalT0)
    const nextMissionTime = parseFloat(missionTime)
    if (!Number.isFinite(nextT1) || nextT1 <= 0) return
    if (!Number.isFinite(nextT0) || nextT0 < 0) return
    if (!Number.isFinite(nextMissionTime) || nextMissionTime <= 0) return

    const currentSettings = loadSIFAnalysisSettings(sif.id)
    saveSIFAnalysisSettings(sif.id, {
      ...currentSettings,
      general: {
        ...currentSettings.general,
        missionTime: nextMissionTime,
        missionTimeUnit,
      },
    })

    sif.subsystems.forEach(subsystem => {
      updateSubsystem(projectId, sif.id, {
        ...subsystem,
        channels: subsystem.channels.map(channel => ({
          ...channel,
          components: channel.components.map(component => ({
            ...component,
            test: {
              ...component.test,
              T1: nextT1,
              T1Unit: globalT1Unit,
              T0: nextT0,
              T0Unit: globalT0Unit,
            },
          })),
        })),
      })
    })
  }, [globalT0, globalT0Unit, globalT1, globalT1Unit, missionTime, missionTimeUnit, projectId, sif, updateSubsystem])

  const updateCcfAssessment = useCallback(<K extends keyof BetaAssessmentConfig>(
    key: K,
    value: BetaAssessmentConfig[K],
  ) => {
    setCcfAssessmentDraft(prev => ({ ...prev, [key]: value }))
  }, [])

  const toggleCcfMeasure = useCallback((measureId: string) => {
    setCcfAssessmentDraft(prev => ({
      ...prev,
      selectedMeasureIds: prev.selectedMeasureIds.includes(measureId)
        ? prev.selectedMeasureIds.filter(id => id !== measureId)
        : [...prev.selectedMeasureIds, measureId],
    }))
  }, [])

  const handleApplyCcfSettings = useCallback(() => {
    if (!selectedCcfSubsystem) return
    const nextBeta = ccfAssessmentDraft.mode === 'iec61508'
      ? ccfAssessmentResult?.beta
      : clamp01((parseFloat(ccfBetaPct) || 0) / 100)
    const nextBetaD = ccfAssessmentDraft.mode === 'iec61508'
      ? ccfAssessmentResult?.betaD
      : clamp01((parseFloat(ccfBetaDPct) || 0) / 100)
    if (nextBeta === null || nextBetaD === null || nextBeta === undefined || nextBetaD === undefined) return

    handleUpdateEngineSettings(selectedCcfSubsystem.id, {
      voteType: ccfVoteType,
      ccf: {
        beta: nextBeta,
        betaD: nextBetaD,
        method: ccfMethod,
        assessment: {
          ...ccfAssessmentDraft,
          profile: profileForSubsystemType(selectedCcfSubsystem.type),
        },
      },
    })
  }, [ccfAssessmentDraft, ccfAssessmentResult?.beta, ccfAssessmentResult?.betaD, ccfBetaDPct, ccfBetaPct, ccfMethod, ccfVoteType, handleUpdateEngineSettings, selectedCcfSubsystem])

  const hasType = (t: SubsystemType) => sif.subsystems.some(s => s.type === t)
  const ccfProfileLabel = ccfAssessmentDraft.profile === 'logic' ? 'Logic solver' : 'Sensors / final elements'
  const canApplyCcf = Boolean(
    selectedCcfSubsystem && (
      ccfAssessmentDraft.mode === 'manual'
      || (ccfAssessmentResult?.beta !== null && ccfAssessmentResult?.betaD !== null)
    ),
  )
  const ccfPreviewBeta = ccfAssessmentDraft.mode === 'iec61508'
    ? ccfAssessmentResult?.beta ?? null
    : clamp01((parseFloat(ccfBetaPct) || 0) / 100)
  const ccfPreviewBetaD = ccfAssessmentDraft.mode === 'iec61508'
    ? ccfAssessmentResult?.betaD ?? null
    : clamp01((parseFloat(ccfBetaDPct) || 0) / 100)
  const subsystemOrder: SubsystemType[] = ['sensor', 'logic', 'actuator']
  const globalConfigValid = Number.isFinite(parseFloat(globalT0))
    && parseFloat(globalT0) >= 0
    && Number.isFinite(parseFloat(globalT1))
    && parseFloat(globalT1) > 0
    && Number.isFinite(parseFloat(missionTime))
    && parseFloat(missionTime) > 0

  const handleResetManualCcf = useCallback(() => {
    if (!selectedCcfSubsystem) return
    setCcfBetaPct('5')
    setCcfBetaDPct('2.5')
    setCcfMethod('MAX')
    setCcfVoteType(selectedCcfSubsystem.voteType ?? 'S')
  }, [selectedCcfSubsystem])

  useEffect(() => {
    if (workspaceMode === 'ccf-beta') {
      setRightPanelOverride(
        <CCFBetaRightPanel
          redundantSubsystems={redundantSubsystems}
          selectedSubsystem={selectedCcfSubsystem}
          selectedSubsystemId={selectedCcfSubsystemId}
          onSelectSubsystem={setSelectedCcfSubsystemId}
          profileLabel={ccfProfileLabel}
          mode={ccfAssessmentDraft.mode}
          onModeChange={(mode) => updateCcfAssessment('mode', mode)}
          result={ccfAssessmentResult}
          voteType={ccfVoteType}
          method={ccfMethod}
          previewBeta={ccfPreviewBeta}
          previewBetaD={ccfPreviewBetaD}
        />,
      )
      return
    }

    setRightPanelOverride(
      <LoopEditorRightPanel
        sif={sif}
        projectId={projectId}
        onOpenCcfBeta={(subsystemId) => {
          setSelectedCcfSubsystemId(subsystemId)
          setWorkspaceMode('ccf-beta')
        }}
      />,
    )
  }, [
    ccfAssessmentDraft.mode,
    ccfAssessmentResult,
    ccfMethod,
    ccfPreviewBeta,
    ccfPreviewBetaD,
    ccfProfileLabel,
    ccfVoteType,
    projectId,
    redundantSubsystems,
    selectedCcfSubsystem,
    selectedCcfSubsystemId,
    setRightPanelOverride,
    setSelectedCcfSubsystemId,
    sif,
    setWorkspaceMode,
    updateCcfAssessment,
    workspaceMode,
  ])

  useEffect(() => {
    return () => setRightPanelOverride(null)
  }, [setRightPanelOverride])

  return (
    <div className="flex min-h-full min-w-0 w-full flex-col" style={{ background: CANVAS_BG }}>
      <div className="shrink-0 pb-3" style={{ background: CANVAS_BG }}>
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.95fr)]">
          <section className="rounded-xl border px-4 py-4" style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_PANEL }}>
            <ComposerSectionHeader icon={<ShieldCheck size={12} />}>
              Parametres globaux
            </ComposerSectionHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold" style={{ color: TEXT }}>
                  Reglages communs a la SIF
                </p>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
                  T0, T1 et mission time sont definis ici puis appliques a toute l’architecture.
                </p>
              </div>
              <button
                type="button"
                onClick={handleApplyGlobalTests}
                disabled={!globalConfigValid}
                className="rounded-xl border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-40"
                style={{ borderColor: `${TEAL}35`, background: `${TEAL}10`, color: TEAL, boxShadow: SHADOW_SOFT }}
              >
                Appliquer a la SIF
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {[
                {
                  label: 'T0',
                  value: globalT0,
                  onChange: setGlobalT0,
                  unit: globalT0Unit,
                  onUnitChange: setGlobalT0Unit,
                },
                {
                  label: 'T1',
                  value: globalT1,
                  onChange: setGlobalT1,
                  unit: globalT1Unit,
                  onUnitChange: setGlobalT1Unit,
                },
                {
                  label: 'Mission time',
                  value: missionTime,
                  onChange: setMissionTime,
                  unit: missionTimeUnit,
                  onUnitChange: setMissionTimeUnit,
                },
              ].map(field => (
                <div key={field.label} className="min-w-0 rounded-xl border px-3 py-3" style={{ borderColor: BORDER, background: NODE_BG2, boxShadow: SHADOW_SOFT }}>
                  <label className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: TEXT_DIM }}>
                    {field.label}
                  </label>
                  <div className="mt-2 grid grid-cols-[minmax(0,1fr)_72px] gap-2">
                    <input
                      type="number"
                      min={field.label === 'T0' ? '0' : '0.1'}
                      step="0.1"
                      value={field.value}
                      onChange={e => field.onChange(e.target.value)}
                      className="h-10 rounded-lg border px-2.5 text-sm font-mono outline-none"
                      style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT, boxShadow: SHADOW_SOFT }}
                    />
                    <select
                      value={field.unit}
                      onChange={e => field.onUnitChange(e.target.value as 'hr' | 'yr')}
                      className="h-10 rounded-lg border px-2.5 text-sm font-mono outline-none"
                      style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT, boxShadow: SHADOW_SOFT }}
                    >
                      <option value="yr">yr</option>
                      <option value="hr">hr</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border px-4 py-4" style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_PANEL }}>
            <ComposerSectionHeader icon={<ShieldCheck size={12} />}>
              CCF / Beta
            </ComposerSectionHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold" style={{ color: TEXT }}>
                  Evaluation de cause commune
                </p>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
                  Acces direct au workspace IEC 61508 ou override manuel pour les sous-systemes redondants.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setWorkspaceMode(workspaceMode === 'ccf-beta' ? 'composer' : 'ccf-beta')}
                disabled={!redundantSubsystems.length}
                className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-40"
                style={{ borderColor: `${TEAL}35`, background: `${TEAL}10`, color: TEAL, boxShadow: SHADOW_SOFT }}
              >
                <ShieldCheck size={12} />
                {workspaceMode === 'ccf-beta' ? 'Retour composition' : 'Workspace CCF/BETA'}
              </button>
            </div>

            {selectedCcfSubsystem ? (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: TEXT_DIM }}>
                    Sous-systeme redondant
                  </label>
                  <select
                  value={selectedCcfSubsystemId ?? ''}
                  onChange={e => setSelectedCcfSubsystemId(e.target.value)}
                  className="mt-2 h-10 w-full rounded-lg border px-2.5 text-sm outline-none"
                  style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT, boxShadow: SHADOW_SOFT }}
                >
                    {redundantSubsystems.map(subsystem => (
                      <option key={subsystem.id} value={subsystem.id}>
                        {subsystem.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-4">
                  {[
                    { label: 'Mode', value: ccfAssessmentDraft.mode === 'iec61508' ? 'IEC 61508' : 'Manual' },
                    { label: 'Profile', value: ccfProfileLabel },
                    { label: 'Beta', value: formatBetaPct(ccfPreviewBeta ?? 0) },
                    { label: 'BetaD', value: formatBetaPct(ccfPreviewBetaD ?? 0) },
                  ].map(item => (
                    <div key={item.label} className="rounded-lg border px-3 py-2" style={{ borderColor: BORDER, background: NODE_BG2, boxShadow: SHADOW_SOFT }}>
                      <p className="text-[9px] uppercase tracking-widest" style={{ color: TEXT_DIM }}>{item.label}</p>
                      <p className="mt-1 text-[11px] font-bold font-mono" style={{ color: TEXT }}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border px-4 py-4 text-sm leading-relaxed" style={{ borderColor: BORDER, background: NODE_BG2, color: TEXT_DIM, boxShadow: SHADOW_SOFT }}>
                Aucun sous-systeme redondant n’est encore disponible. Choisissez une architecture redondante pour activer l’analyse beta.
              </div>
            )}
          </section>
        </div>
      </div>

      {workspaceMode === 'ccf-beta' ? (
        <div className="flex-1 min-h-0 overflow-hidden pb-3">
          <CCFBetaWorkspace
            selectedSubsystem={selectedCcfSubsystem}
            profileLabel={ccfProfileLabel}
            assessmentDraft={ccfAssessmentDraft}
            checklistSections={ccfChecklistSections}
            checklistCount={ccfChecklistItems.length}
            assessmentResult={ccfAssessmentResult}
            voteType={ccfVoteType}
            onVoteTypeChange={setCcfVoteType}
            method={ccfMethod}
            onMethodChange={setCcfMethod}
            betaPct={ccfBetaPct}
            onBetaPctChange={setCcfBetaPct}
            betaDPct={ccfBetaDPct}
            onBetaDPctChange={setCcfBetaDPct}
            onUpdateAssessment={updateCcfAssessment}
            onToggleMeasure={toggleCcfMeasure}
            onResetManual={handleResetManualCcf}
            onBack={() => setWorkspaceMode('composer')}
            onApply={handleApplyCcfSettings}
            canApply={canApplyCcf}
          />
        </div>
      ) : (
        <div className="pb-3">
          <div className="flex flex-col gap-3">
            <div className="overflow-x-auto pb-1">
              <div className="grid min-w-[1020px] grid-cols-3 gap-3">
                {subsystemOrder.map(type => {
                  const subsystem = sif.subsystems.find(entry => entry.type === type)

                  if (!subsystem) {
                    return (
                      <MissingSubsystemColumn
                        key={type}
                        type={type}
                        onAdd={() => addSubsystem(projectId, sif.id, DEFAULT_SUBSYSTEM(type, sif.sifNumber))}
                      />
                    )
                  }

                  return (
                    <SubsystemComposerColumn
                      key={subsystem.id}
                      subsystem={subsystem}
                      calcResult={calc.subsystems.find(entry => entry.subsystemId === subsystem.id)}
                      projectId={projectId}
                      sifId={sif.id}
                      selectedId={selectedId}
                      onSelectComp={handleSelectComp}
                      onAddChannel={handleAddChannel}
                      onRemoveChannel={handleRemoveChannel}
                      onRemoveSub={handleRemoveSub}
                      onUpdateArch={handleUpdateArch}
                      onUpdateCustomGate={handleUpdateCustomGate}
                      onUpdateEngineSettings={handleUpdateEngineSettings}
                    />
                  )
                })}
              </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
              <section className="rounded-xl border px-4 py-4" style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_PANEL }}>
                <ComposerSectionHeader icon={<ShieldCheck size={12} />}>
                  Synthese calcul
                </ComposerSectionHeader>
                <div className="mt-3 grid gap-2 md:grid-cols-5">
                  {[
                    { label: 'SIL cible', value: `SIL ${sif.targetSIL}`, color: TEXT },
                    { label: 'SIL atteint', value: `SIL ${calc.SIL}`, color: calc.meetsTarget ? semantic.success : semantic.error },
                    { label: 'PFDavg', value: formatPFD(calc.PFD_avg), color: TEAL_DIM },
                    { label: 'RRF', value: formatRRF(calc.RRF), color: TEXT },
                    { label: 'Verdict', value: calc.meetsTarget ? 'PASS' : 'FAIL', color: calc.meetsTarget ? semantic.success : semantic.error },
                  ].map(item => (
                    <div key={item.label} className="rounded-lg border px-3 py-3" style={{ borderColor: BORDER, background: NODE_BG2, boxShadow: SHADOW_SOFT }}>
                      <p className="text-[9px] uppercase tracking-widest" style={{ color: TEXT_DIM }}>{item.label}</p>
                      <p className="mt-1 text-sm font-bold font-mono" style={{ color: item.color }}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-xl border px-4 py-4" style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_PANEL }}>
                <ComposerSectionHeader icon={<ShieldCheck size={12} />}>
                  Breakdown par sous-systeme
                </ComposerSectionHeader>
                <div className="mt-3 space-y-2">
                  {calc.subsystems.map(subsystem => {
                    const meta = SUB_META[subsystem.type as SubsystemType]
                    return (
                      <div
                        key={subsystem.subsystemId}
                        className="flex items-center justify-between rounded-xl border px-3 py-3"
                        style={{ borderColor: BORDER, background: NODE_BG2, boxShadow: SHADOW_SOFT }}
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full" style={{ background: meta.color }} />
                          <span className="text-sm font-semibold" style={{ color: TEXT }}>{meta.label}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-widest" style={{ color: TEXT_DIM }}>PFDavg</p>
                          <p className="mt-1 text-[11px] font-bold font-mono" style={{ color: meta.color }}>
                            {formatPFD(subsystem.PFD_avg)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
