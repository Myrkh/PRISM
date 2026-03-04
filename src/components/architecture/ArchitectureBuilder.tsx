/**
 * Architecture Builder
 * Drag-and-drop canvas for building SIF architecture (Sensor | Logic | Actuator)
 * Uses @dnd-kit/core + @dnd-kit/sortable
 */
import { useState, useCallback } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCenter, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus, Grip, Settings2, Trash2, Activity, Cpu, Zap,
  ChevronDown, ChevronUp, Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { useAppStore } from '@/store/appStore'
import { SILBadge } from '@/components/shared/SILBadge'
import { ComponentParamsSheet } from '@/components/parameters/ComponentParamsSheet'
import { calcSubsystemPFD, formatPFD } from '@/core/math/pfdCalc'
import { DEFAULT_COMPONENT, DEFAULT_CHANNEL } from '@/core/models/defaults'
import { ARCHITECTURE_META, type Architecture, type SIFSubsystem, type SIFComponent, type SubsystemType } from '@/core/types'
import { nanoid } from 'nanoid'
import { cn } from '@/lib/utils'

const ARCHITECTURES = Object.keys(ARCHITECTURE_META) as Architecture[]
const SUB_ICONS: Record<SubsystemType, React.ElementType> = {
  sensor: Activity, logic: Cpu, actuator: Zap,
}
const SUB_COLORS: Record<SubsystemType, string> = {
  sensor: '#0891B2', logic: '#6366F1', actuator: '#EA580C',
}

// ─── Sortable Component Card ──────────────────────────────────────────────
function SortableComponentCard({
  component, subsystemId, channelId, projectId, sifId,
}: {
  component: SIFComponent
  subsystemId: string
  channelId: string
  projectId: string
  sifId: string
}) {
  const removeComponent  = useAppStore(s => s.removeComponent)
  const [sheetOpen, setSheetOpen] = useState(false)

  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: component.id, data: { subsystemId, channelId } })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const color = SUB_COLORS[component.subsystemType]

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className="group flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2.5 hover:border-border/80 transition-colors"
      >
        {/* Drag handle */}
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab text-muted-foreground/40 hover:text-muted-foreground shrink-0"
        >
          <Grip size={13} />
        </span>

        {/* Type icon */}
        <div
          className="w-6 h-6 rounded flex items-center justify-center shrink-0"
          style={{ background: `${color}20`, color }}
        >
          {(() => { const I = SUB_ICONS[component.subsystemType]; return <I size={12} /> })()}
        </div>

        {/* Label */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold font-mono truncate" style={{ color }}>
            {component.tagName}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {component.instrumentType}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost" size="icon" className="h-6 w-6"
            onClick={() => setSheetOpen(true)}
          >
            <Settings2 size={12} />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={() => removeComponent(projectId, sifId, subsystemId, channelId, component.id)}
          >
            <Trash2 size={12} />
          </Button>
        </div>
      </div>

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

// ─── Channel column ───────────────────────────────────────────────────────
function ChannelBlock({
  subsystem, channelIndex, projectId, sifId,
}: {
  subsystem: SIFSubsystem
  channelIndex: number
  projectId: string
  sifId: string
}) {
  const channel        = subsystem.channels[channelIndex]
  const addComponent   = useAppStore(s => s.addComponent)
  const removeChannel  = useAppStore(s => s.removeChannel)
  const sif            = useAppStore(s => s.projects.find(p => p.id === projectId)?.sifs.find(s => s.id === sifId))

  if (!channel) return null
  const color = SUB_COLORS[subsystem.type]

  const handleAddComponent = () => {
    const tagPrefix = `${sif?.sifNumber ?? 'SIF'}_${subsystem.type === 'sensor' ? 'S' : subsystem.type === 'logic' ? 'L' : 'A'}${channelIndex + 1}.${channel.components.length + 1}`
    addComponent(
      projectId, sifId, subsystem.id, channel.id,
      DEFAULT_COMPONENT(subsystem.type, tagPrefix),
    )
  }

  return (
    <div className="flex-1 min-w-[200px] max-w-[280px] space-y-2">
      {/* Channel header */}
      <div
        className="flex items-center justify-between px-3 py-1.5 rounded-lg"
        style={{ background: `${color}10`, border: `1px solid ${color}30` }}
      >
        <span className="text-xs font-semibold" style={{ color }}>{channel.label}</span>
        {subsystem.channels.length > 1 && (
          <Button
            variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive"
            onClick={() => removeChannel(projectId, sifId, subsystem.id, channel.id)}
          >
            <Trash2 size={11} />
          </Button>
        )}
      </div>

      {/* Components */}
      <SortableContext
        items={channel.components.map(c => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-1.5 min-h-[60px]">
          {channel.components.map(comp => (
            <SortableComponentCard
              key={comp.id}
              component={comp}
              subsystemId={subsystem.id}
              channelId={channel.id}
              projectId={projectId}
              sifId={sifId}
            />
          ))}
        </div>
      </SortableContext>

      {/* Add component */}
      <Button
        variant="dashed" size="sm" className="w-full h-8 text-xs gap-1.5"
        onClick={handleAddComponent}
      >
        <Plus size={12} /> Add component
      </Button>
    </div>
  )
}

// ─── Subsystem block ──────────────────────────────────────────────────────
function SubsystemBlock({
  subsystem, projectId, sifId,
}: {
  subsystem: SIFSubsystem
  projectId: string
  sifId: string
}) {
  const [collapsed, setCollapsed] = useState(false)
  const updateSubsystem = useAppStore(s => s.updateSubsystem)
  const removeSubsystem = useAppStore(s => s.removeSubsystem)
  const addChannel      = useAppStore(s => s.addChannel)

  const calcResult = calcSubsystemPFD(subsystem)
  const Icon = SUB_ICONS[subsystem.type]
  const color = SUB_COLORS[subsystem.type]

  const handleArchChange = (arch: Architecture) => {
    updateSubsystem(projectId, sifId, { ...subsystem, architecture: arch })
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden" style={{ borderColor: `${color}30` }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ background: `${color}08`, borderBottom: `1px solid ${color}20` }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `${color}20`, color }}
          >
            <Icon size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color }}>{subsystem.label}</p>
            <p className="text-xs text-muted-foreground font-mono">
              {formatPFD(calcResult.PFD_avg)} · SFF {(calcResult.SFF * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <SILBadge sil={calcResult.SIL} />

          {/* Architecture selector */}
          <Select value={subsystem.architecture} onValueChange={handleArchChange}>
            <SelectTrigger className="h-7 w-[80px] text-xs font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ARCHITECTURES.map(a => (
                <SelectItem key={a} value={a} className="text-xs font-mono">
                  <span className="font-semibold">{a}</span>
                  <span className="text-muted-foreground ml-2">{ARCHITECTURE_META[a].desc}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                  <Info size={13} />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs max-w-[200px]">
                <p><strong>{subsystem.architecture}</strong> — {ARCHITECTURE_META[subsystem.architecture].desc}</p>
                <p>HFT = {ARCHITECTURE_META[subsystem.architecture].HFT} · {ARCHITECTURE_META[subsystem.architecture].channels} channel(s)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => setCollapsed(c => !c)}
          >
            {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </Button>

          <Button
            variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => removeSubsystem(projectId, sifId, subsystem.id)}
          >
            <Trash2 size={13} />
          </Button>
        </div>
      </div>

      {/* Channels */}
      {!collapsed && (
        <div className="p-4 space-y-3">
          <div className="flex gap-3 flex-wrap">
            {subsystem.channels.map((_, idx) => (
              <ChannelBlock
                key={subsystem.channels[idx].id}
                subsystem={subsystem}
                channelIndex={idx}
                projectId={projectId}
                sifId={sifId}
              />
            ))}
          </div>

          <Button
            variant="outline" size="sm" className="text-xs gap-1.5"
            onClick={() => addChannel(projectId, sifId, subsystem.id)}
          >
            <Plus size={12} /> Add channel
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Architecture Builder ─────────────────────────────────────────────────
export function ArchitectureBuilder({ projectId, sifId }: { projectId: string; sifId: string }) {
  const sif            = useAppStore(s => s.projects.find(p => p.id === projectId)?.sifs.find(s => s.id === sifId))
  const addSubsystem   = useAppStore(s => s.addSubsystem)
  const moveComponent  = useAppStore(s => s.moveComponent)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragStart = useCallback(({ active }: DragStartEvent) => {
    setActiveId(String(active.id))
  }, [])

  const handleDragEnd = useCallback(({ active, over }: DragEndEvent) => {
    setActiveId(null)
    if (!over || !sif) return

    const activeSubId = active.data.current?.subsystemId as string
    const activeChId  = active.data.current?.channelId as string
    const overSubId   = over.data.current?.subsystemId as string
    const overChId    = over.data.current?.channelId as string

    if (!activeSubId || !activeChId) return

    const fromSub = sif.subsystems.find(s => s.id === activeSubId)
    const toSub   = sif.subsystems.find(s => s.id === (overSubId ?? activeSubId))
    const fromCh  = fromSub?.channels.find(c => c.id === activeChId)
    const toCh    = toSub?.channels.find(c => c.id === (overChId ?? activeChId))

    if (!fromCh || !toCh) return

    const fromIdx = fromCh.components.findIndex(c => c.id === active.id)
    const toIdx   = toCh.components.findIndex(c => c.id === over.id)

    if (fromIdx === -1) return

    moveComponent(
      projectId, sifId,
      activeSubId, activeChId, fromIdx,
      overSubId ?? activeSubId, overChId ?? activeChId, toIdx === -1 ? toCh.components.length : toIdx,
    )
  }, [sif, moveComponent, projectId, sifId])

  if (!sif) return null

  const SUBSYSTEM_TYPES: { type: SubsystemType; label: string }[] = [
    { type: 'sensor',   label: 'Sensor(s)' },
    { type: 'logic',    label: 'Logic Solver' },
    { type: 'actuator', label: 'Actuator(s)' },
  ]

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Architecture</h3>
            <p className="text-xs text-muted-foreground">
              Build the SIF architecture by adding subsystems, channels, and components
            </p>
          </div>
          <div className="flex gap-2">
            {SUBSYSTEM_TYPES.map(({ type, label }) => {
              const exists = sif.subsystems.some(s => s.type === type)
              const Icon   = SUB_ICONS[type]
              const color  = SUB_COLORS[type]
              return (
                <Button
                  key={type}
                  variant="outline"
                  size="sm"
                  disabled={exists}
                  className="text-xs gap-1.5"
                  onClick={() => {
                    const { DEFAULT_SUBSYSTEM } = require('@/core/models/defaults')
                    addSubsystem(projectId, sifId, DEFAULT_SUBSYSTEM(type, sif.sifNumber))
                  }}
                  style={exists ? {} : { borderColor: `${color}50`, color }}
                >
                  <Icon size={12} />
                  {exists ? `${label} ✓` : `+ ${label}`}
                </Button>
              )
            })}
          </div>
        </div>

        {/* Subsystems */}
        {sif.subsystems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl text-muted-foreground">
            <p className="text-sm font-medium mb-1">No subsystems</p>
            <p className="text-xs">Add Sensor, Logic Solver, and Actuator subsystems above</p>
          </div>
        ) : (
          // Ordered: sensor → logic → actuator
          ['sensor', 'logic', 'actuator']
            .map(type => sif.subsystems.find(s => s.type === type))
            .filter(Boolean)
            .map(subsystem => (
              <SubsystemBlock
                key={subsystem!.id}
                subsystem={subsystem!}
                projectId={projectId}
                sifId={sifId}
              />
            ))
        )}
      </div>

      <DragOverlay>
        {activeId && (
          <div className="rounded-lg border bg-card shadow-xl px-3 py-2.5 text-xs font-mono opacity-90">
            Moving component…
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
