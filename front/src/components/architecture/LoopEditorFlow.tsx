/**
 * LoopEditorFlow — PRISM v3 (refactored)
 *
 * ReactFlow canvas pour le Loop Editor.
 *   – Architecture selector (1oo1, 1oo2, 2oo2, 2oo3, 1oo2D, custom)
 *   – Custom boolean expression editor (AND/OR gate + free expression)
 *   – Consistent dark theme design
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
  Activity, Cpu, Zap, CheckCircle2,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { calcSIF, calcComponentSFF, calcComponentDC, factorizedToDeveloped, formatPFD, formatPct } from '@/core/math/pfdCalc'
import { DEFAULT_COMPONENT, DEFAULT_SUBSYSTEM } from '@/core/models/defaults'
import { ARCHITECTURE_META, type Architecture, type SIF, type SIFComponent, type SIFSubsystem, type SIFChannel, type SubsystemType, type SubsystemCalcResult, type BooleanGate } from '@/core/types'
import { BORDER, CARD_BG, SURFACE, TEAL, TEAL_DIM, TEXT, TEXT_DIM, PANEL_BG, dark } from '@/styles/tokens'

// ─── Design ──────────────────────────────────────────────────────────────
const CANVAS_BG = dark.rail
const NODE_BG   = dark.card2
const NODE_BG2  = dark.card

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
}

interface AnimatedEdgeData { label?: string }

// ─── Metric pill ──────────────────────────────────────────────────────────
function MetricPill({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  const color = ok === undefined ? TEXT_DIM : ok ? '#4ADE80' : '#F87171'
  return (
    <div className="flex flex-col items-center rounded px-1 py-0.5" style={{ background: '#141A21', minWidth: 36 }}>
      <span className="text-[8px] uppercase tracking-widest" style={{ color: TEXT_DIM }}>{label}</span>
      <span className="text-[9px] font-bold font-mono" style={{ color }}>{value}</span>
    </div>
  )
}

// ─── Component card ──────────────────────────────────────────────────────
function CompCard({
  comp, color, selected, onSelect, onDelete,
}: {
  comp: SIFComponent; color: string; selected: boolean
  onSelect: () => void; onDelete: () => void
}) {
  const d   = factorizedToDeveloped(comp.factorized)
  const sff = calcComponentSFF(d)
  const dc  = calcComponentDC(d)

  return (
    <div onClick={e => { e.stopPropagation(); onSelect() }}
      className="group relative rounded-lg border cursor-pointer transition-all"
      style={{
        background:  selected ? `${color}20` : NODE_BG2,
        borderColor: selected ? color : BORDER,
        borderWidth: selected ? 1.5 : 1,
        boxShadow:   selected ? `0 0 12px ${color}40` : 'none',
        padding: '8px 10px', minWidth: 160,
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
      {selected && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />}
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
    const lib = JSON.parse(raw)
    const prefix = lib.type === 'sensor' ? 'PT' : lib.type === 'logic' ? 'PLC' : 'XV'
    const comp = DEFAULT_COMPONENT(lib.type, `${prefix}-${nanoid(4).toUpperCase()}`)
    comp.instrumentType    = lib.name
    comp.factorized.lambda = lib.lambda
    comp.factorized.DCd    = lib.dc
    addComponent(projectId, sifId, subsystem.id, channel.id, comp)
    selectComponent(comp.id)
  }

  return (
    <div className="rounded-lg border transition-all"
      style={{ borderColor: over ? `${color}60` : BORDER, background: over ? `${color}08` : '#1A1F24', padding: 8, minWidth: 180 }}
      onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)} onDrop={handleDrop}>
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: `${color}80` }}>{channel.label}</span>
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
function ArchSelector({ subsystem, color, onUpdateArch, onUpdateCustomGate }: {
  subsystem: SIFSubsystem; color: string
  onUpdateArch: (subId: string, arch: Architecture) => void
  onUpdateCustomGate: (subId: string, gate: BooleanGate, expression: string) => void
}) {
  const isCustom = subsystem.architecture === 'custom'
  const gate = subsystem.customBooleanArch?.gate ?? 'OR'
  const expr = subsystem.customBooleanArch?.expression ?? ''

  return (
    <div className="px-3 pb-2 space-y-2">
      {/* Architecture dropdown */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: TEXT_DIM }}>Architecture</span>
        <select value={subsystem.architecture}
          onChange={e => onUpdateArch(subsystem.id, e.target.value as Architecture)}
          className="flex-1 h-6 text-[10px] font-mono font-bold rounded border px-1 outline-none transition-all"
          style={{ background: '#141A21', borderColor: `${color}40`, color }}>
          {ARCH_OPTIONS.map(a => (
            <option key={a} value={a}>{a === 'custom' ? 'Custom (booléen)' : `${a} — ${ARCHITECTURE_META[a].desc}`}</option>
          ))}
        </select>
      </div>

      {/* Custom boolean editor */}
      {isCustom && (
        <div className="rounded-lg border p-2 space-y-1.5" style={{ background: '#141A21', borderColor: `${color}30` }}>
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
            style={{ background: '#0F1318', borderColor: BORDER, color: TEAL_DIM }}
          />
          <p className="text-[8px] leading-tight" style={{ color: TEXT_DIM }}>
            · = ET (série) · + = OU (parallèle) · ex: [(V1·V2) + (V3·V4)]
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Subsystem Node ──────────────────────────────────────────────────────
function SubsystemNode({ data }: NodeProps<SubsystemNodeData>) {
  const {
    subsystem, calcResult, selectedId, projectId, sifId,
    onSelectComp, onAddChannel, onRemoveChannel, onRemoveSub,
    onUpdateArch, onUpdateCustomGate,
  } = data

  const meta  = SUB_META[subsystem.type as SubsystemType]
  const { color, Icon } = meta
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="rounded-xl border" style={{ background: NODE_BG, borderColor: `${color}40`, minWidth: 240, boxShadow: `0 0 20px ${color}15` }}>
      <Handle type="target" position={Position.Left} style={{ background: color, border: 'none', width: 10, height: 10 }} />
      <Handle type="source" position={Position.Right} style={{ background: color, border: 'none', width: 10, height: 10 }} />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b rounded-t-xl"
        style={{ borderColor: `${color}30`, background: `${color}10` }}>
        <Icon size={14} style={{ color }} />
        <span className="text-sm font-bold flex-1" style={{ color }}>{subsystem.label}</span>
        {calcResult && (
          <span className="text-[10px] font-mono font-bold" style={{ color: calcResult.PFD_avg > 0 ? (calcResult.SIL >= 2 ? '#4ADE80' : '#F59E0B') : TEXT_DIM }}>
            {formatPFD(calcResult.PFD_avg)}
          </span>
        )}
        <button onClick={() => setCollapsed(v => !v)} className="p-0.5 rounded" style={{ color: TEXT_DIM }}>
          {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
        </button>
        <button onClick={() => onRemoveSub(subsystem.id)}
          className="p-0.5 rounded hover:text-red-400 transition-colors" style={{ color: TEXT_DIM }}><X size={11} /></button>
      </div>

      {/* Architecture selector */}
      {!collapsed && (
        <ArchSelector subsystem={subsystem} color={color}
          onUpdateArch={onUpdateArch} onUpdateCustomGate={onUpdateCustomGate} />
      )}

      {/* Metrics bar */}
      {!collapsed && calcResult && (
        <div className="grid grid-cols-3 border-y divide-x text-center"
          style={{ borderColor: `${color}15` }}>
          {[
            { label: 'PFDavg', value: formatPFD(calcResult.PFD_avg) },
            { label: 'SFF',    value: formatPct(calcResult.SFF) },
            { label: 'HFT',    value: String(calcResult.HFT) },
          ].map(({ label, value }) => (
            <div key={label} className="py-1.5">
              <p className="text-[7px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>{label}</p>
              <p className="text-[10px] font-mono font-bold" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      )}

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
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ stroke: TEAL, strokeWidth: 2, strokeDasharray: '6 3', opacity: 0.7 }} />
      <EdgeLabelRenderer>
        <div className="absolute text-[9px] font-bold uppercase tracking-widest rounded px-1.5 py-0.5 pointer-events-none"
          style={{ transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)`, background: NODE_BG2, color: TEAL_DIM, border: `1px solid ${BORDER}` }}>
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

export function LoopEditorFlow({ sif, projectId }: Props) {
  const addSubsystem    = useAppStore(s => s.addSubsystem)
  const updateSubsystem = useAppStore(s => s.updateSubsystem)
  const removeSubsystem = useAppStore(s => s.removeSubsystem)
  const addChannel      = useAppStore(s => s.addChannel)
  const removeChannel   = useAppStore(s => s.removeChannel)
  const selectComponent = useAppStore(s => s.selectComponent)
  const selectedId      = useAppStore(s => s.selectedComponentId)
  const calc            = useMemo(() => calcSIF(sif), [sif])

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
    const requiredChannels = ARCHITECTURE_META[arch]?.channels ?? 1
    const currentChannels = sub.channels.length
    let channels = [...sub.channels]
    if (requiredChannels > currentChannels) {
      for (let i = currentChannels; i < requiredChannels; i++) {
        channels.push({ id: crypto.randomUUID(), label: `Channel ${i + 1}`, components: [] })
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
  }, [sif, projectId, updateSubsystem])

  const handleUpdateCustomGate = useCallback((subId: string, gate: BooleanGate, expression: string) => {
    const sub = sif.subsystems.find(s => s.id === subId)
    if (!sub) return
    updateSubsystem(projectId, sif.id, {
      ...sub,
      customBooleanArch: { gate, expression, manualHFT: gate === 'OR' ? 1 : 0 },
    })
  }, [sif, projectId, updateSubsystem])

  const onPaneClick = useCallback(() => { selectComponent(null) }, [selectComponent])

  // ── Build graph ────────────────────────────────────────────────────────
  const buildNodes = useCallback(() => {
    const ORDER = ['sensor', 'logic', 'actuator']
    return sif.subsystems
      .slice().sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type))
      .map((sub, i) => ({
        id: sub.id, type: 'subsystem',
        position: { x: i * 560, y: 80 },
        data: {
          subsystem: sub,
          calcResult: calc.subsystems.find(s => s.subsystemId === sub.id),
          selectedId, projectId, sifId: sif.id,
          onSelectComp: handleSelectComp,
          onAddChannel: handleAddChannel,
          onRemoveChannel: handleRemoveChannel,
          onRemoveSub: handleRemoveSub,
          onUpdateArch: handleUpdateArch,
          onUpdateCustomGate: handleUpdateCustomGate,
        },
      }))
  }, [sif, selectedId, calc, projectId, handleSelectComp, handleAddChannel, handleRemoveChannel, handleRemoveSub, handleUpdateArch, handleUpdateCustomGate])

  const buildEdges = useCallback(() => {
    const ORDER = ['sensor', 'logic', 'actuator']
    const sorted = sif.subsystems.slice().sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type))
    return sorted.slice(0, -1).map((sub, i) => ({
      id: `e-${sub.id}-${sorted[i + 1].id}`,
      source: sub.id, target: sorted[i + 1].id,
      type: 'animated', data: { label: 'signal' },
    }))
  }, [sif])

  const [nodes, setNodes, onNodesChange] = useNodesState(buildNodes())
  const [edges, setEdges, onEdgesChange] = useEdgesState(buildEdges())

  useEffect(() => {
    setNodes(prev => {
      const next = buildNodes()
      return next.map(n => {
        const existing = prev.find(p => p.id === n.id)
        return existing ? { ...n, position: existing.position } : n
      })
    })
    setEdges(buildEdges())
  }, [sif, selectedId, calc])

  const hasType = (t: SubsystemType) => sif.subsystems.some(s => s.type === t)

  return (
    <div className="flex flex-col" style={{ height: '100%' }}>

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b shrink-0"
        style={{ background: PANEL_BG, borderColor: BORDER }}>
        {(['sensor', 'logic', 'actuator'] as SubsystemType[]).map(type => {
          const meta = SUB_META[type]; const has = hasType(type)
          return (
            <button key={type} disabled={has}
              onClick={() => !has && addSubsystem(projectId, sif.id, DEFAULT_SUBSYSTEM(type, sif.sifNumber))}
              className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all"
              style={has
                ? { borderColor: `${meta.color}20`, color: `${meta.color}40`, cursor: 'not-allowed' }
                : { borderColor: `${meta.color}50`, color: meta.color, background: `${meta.color}10` }
              }><meta.Icon size={11} />{meta.label}{has && <CheckCircle2 size={10} />}</button>
          )
        })}
        <div className="ml-auto flex items-center gap-3">
          {calc.subsystems.map(sub => {
            const meta = SUB_META[sub.type as SubsystemType]
            return (
              <div key={sub.subsystemId} className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
                <span className="text-[10px] font-mono" style={{ color: TEXT_DIM }}>{formatPFD(sub.PFD_avg)}</span>
              </div>
            )
          })}
          <div className="border-l pl-3" style={{ borderColor: BORDER }}>
            <span className="text-[11px] font-bold font-mono" style={{ color: calc.meetsTarget ? '#4ADE80' : '#F87171' }}>
              Total : {formatPFD(calc.PFD_avg)}
            </span>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 min-h-0" style={{ background: CANVAS_BG }}>
        <ReactFlow
          nodes={nodes} edges={edges}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          onPaneClick={onPaneClick}
          nodeTypes={NODE_TYPES} edgeTypes={EDGE_TYPES}
          fitView fitViewOptions={{ padding: 0.2 }}
          minZoom={0.3} maxZoom={1.5}
          proOptions={{ hideAttribution: true }}>
          <Background color={`${TEAL}12`} gap={32} size={1} />
          <Controls style={{ background: NODE_BG, border: `1px solid ${BORDER}`, borderRadius: 8 }} showInteractive={false} />
          <MiniMap
            style={{ background: CANVAS_BG, border: `1px solid ${BORDER}`, borderRadius: 8, width: 120, height: 80 }}
            nodeColor={n => { const t = sif.subsystems.find(s => s.id === n.id)?.type; return t ? SUB_META[t as SubsystemType].color : '#333' }}
            maskColor="rgba(0,0,0,0.5)" />
        </ReactFlow>
      </div>
    </div>
  )
}
