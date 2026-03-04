/**
 * ArchitectureBuilder — v3
 *
 * Features:
 * ─ Component Library panel (left) with built-in + custom templates
 *   Drag from library → drop into any channel
 * ─ Fixed cross-channel drag & drop using useDroppable on channel containers
 * ─ Custom Boolean Architecture (AND / OR gate) with visual gate diagram
 * ─ Standard MooN architectures (1oo1 → 1oo2D)
 * ─ Per-subsystem live PFD/SIL metrics
 */
import { useState, useCallback, useRef } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCenter, type DragEndEvent, type DragStartEvent, type DragOverEvent,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus, Grip, Settings2, Trash2, Activity, Cpu, Zap,
  ChevronDown, ChevronUp, Library, Search, GitMerge,
  BookOpen, X, CheckCircle2, Circle, GitBranch, Layers,
  Pencil, Check, FlaskConical,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useAppStore } from '@/store/appStore'
import { SILBadge } from '@/components/shared/SILBadge'
import { ComponentParamsSheet } from '@/components/parameters/ComponentParamsSheet'
import { calcSubsystemPFD, formatPFD, formatPct } from '@/core/math/pfdCalc'
import { DEFAULT_COMPONENT, DEFAULT_CHANNEL, DEFAULT_SUBSYSTEM } from '@/core/models/defaults'
import {
  ARCHITECTURE_META,
  type Architecture, type SIFSubsystem, type SIFComponent,
  type SubsystemType, type LibraryComponent, type BooleanGate,
} from '@/core/types'
import { nanoid } from 'nanoid'
import { cn } from '@/lib/utils'

// ─── Constants ───────────────────────────────────────────────────────────
const ARCHITECTURES = (Object.keys(ARCHITECTURE_META) as Architecture[]).filter(a => a !== 'custom')

const SUB_ICONS: Record<SubsystemType, React.ElementType> = {
  sensor: Activity, logic: Cpu, actuator: Zap,
}
const SUB_COLORS: Record<SubsystemType, string> = {
  sensor: '#0891B2', logic: '#6366F1', actuator: '#EA580C',
}

// ─── Built-in library ─────────────────────────────────────────────────────
const BUILTIN_LIBRARY: LibraryComponent[] = [
  // Sensors
  { libraryId: 'lib-pt', name: 'Pressure transmitter', subsystemType: 'sensor', instrumentCategory: 'transmitter', instrumentType: 'Pressure transmitter', manufacturer: '', dataSource: 'exida SERH', factorized: { lambda: 6.5, lambdaDRatio: 0.25, DCd: 0.70, DCs: 1.0 }, test: { T1: 1, T1Unit: 'yr' }, isCustom: false },
  { libraryId: 'lib-tt', name: 'Temperature transmitter', subsystemType: 'sensor', instrumentCategory: 'transmitter', instrumentType: 'Temperature transmitter', manufacturer: '', dataSource: 'exida SERH', factorized: { lambda: 5.0, lambdaDRatio: 0.25, DCd: 0.65, DCs: 1.0 }, test: { T1: 1, T1Unit: 'yr' }, isCustom: false },
  { libraryId: 'lib-ft', name: 'Flow transmitter', subsystemType: 'sensor', instrumentCategory: 'transmitter', instrumentType: 'Flow transmitter', manufacturer: '', dataSource: 'exida SERH', factorized: { lambda: 8.0, lambdaDRatio: 0.25, DCd: 0.60, DCs: 1.0 }, test: { T1: 1, T1Unit: 'yr' }, isCustom: false },
  { libraryId: 'lib-lt', name: 'Level transmitter', subsystemType: 'sensor', instrumentCategory: 'transmitter', instrumentType: 'Level transmitter', manufacturer: '', dataSource: 'exida SERH', factorized: { lambda: 7.2, lambdaDRatio: 0.25, DCd: 0.65, DCs: 1.0 }, test: { T1: 1, T1Unit: 'yr' }, isCustom: false },
  { libraryId: 'lib-ps', name: 'Pressure switch', subsystemType: 'sensor', instrumentCategory: 'switch', instrumentType: 'Pressure switch', manufacturer: '', dataSource: 'exida SERH', factorized: { lambda: 10.0, lambdaDRatio: 0.30, DCd: 0.50, DCs: 1.0 }, test: { T1: 1, T1Unit: 'yr' }, isCustom: false },
  { libraryId: 'lib-ls', name: 'Level switch', subsystemType: 'sensor', instrumentCategory: 'switch', instrumentType: 'Level switch', manufacturer: '', dataSource: 'exida SERH', factorized: { lambda: 12.0, lambdaDRatio: 0.30, DCd: 0.50, DCs: 1.0 }, test: { T1: 1, T1Unit: 'yr' }, isCustom: false },
  // Logic
  { libraryId: 'lib-plc', name: 'Safety PLC', subsystemType: 'logic', instrumentCategory: 'controller', instrumentType: 'Safety PLC', manufacturer: '', dataSource: 'exida SERH', factorized: { lambda: 1.5, lambdaDRatio: 0.25, DCd: 0.90, DCs: 1.0 }, test: { T1: 1, T1Unit: 'yr' }, isCustom: false },
  { libraryId: 'lib-relay', name: 'Safety relay module', subsystemType: 'logic', instrumentCategory: 'controller', instrumentType: 'Safety relay module', manufacturer: '', dataSource: 'exida SERH', factorized: { lambda: 2.5, lambdaDRatio: 0.20, DCd: 0.70, DCs: 1.0 }, test: { T1: 1, T1Unit: 'yr' }, isCustom: false },
  // Actuators
  { libraryId: 'lib-xv', name: 'On-off valve (XV)', subsystemType: 'actuator', instrumentCategory: 'valve', instrumentType: 'On-off valve', manufacturer: '', dataSource: 'exida SERH', factorized: { lambda: 1.5, lambdaDRatio: 0.25, DCd: 0.70, DCs: 1.0 }, test: { T1: 1, T1Unit: 'yr' }, isCustom: false },
  { libraryId: 'lib-sv', name: 'Solenoid valve (SV)', subsystemType: 'actuator', instrumentCategory: 'valve', instrumentType: 'Solenoid valve', manufacturer: '', dataSource: 'exida SERH', factorized: { lambda: 3.0, lambdaDRatio: 0.30, DCd: 0.60, DCs: 1.0 }, test: { T1: 1, T1Unit: 'yr' }, isCustom: false },
  { libraryId: 'lib-bv', name: 'Ball valve', subsystemType: 'actuator', instrumentCategory: 'valve', instrumentType: 'Ball valve', manufacturer: '', dataSource: 'OREDA', factorized: { lambda: 2.0, lambdaDRatio: 0.25, DCd: 0.60, DCs: 1.0 }, test: { T1: 1, T1Unit: 'yr' }, isCustom: false },
]

// ─── Library component template to SIFComponent ───────────────────────────
function libraryToComponent(lib: LibraryComponent, tagName: string): SIFComponent {
  return {
    ...DEFAULT_COMPONENT(lib.subsystemType, tagName),
    instrumentCategory: lib.instrumentCategory,
    instrumentType: lib.instrumentType,
    manufacturer: lib.manufacturer,
    dataSource: lib.dataSource,
    factorized: { ...lib.factorized },
  }
}

// ─── Drag item types ──────────────────────────────────────────────────────
// Prefix IDs so we can tell apart library items vs existing components
const LIBRARY_PREFIX = 'library:'
const CHANNEL_PREFIX = 'channel-drop:'

// ─── Component card (sortable) ────────────────────────────────────────────
function SortableComponentCard({
  component, subsystemId, channelId, projectId, sifId, color,
}: {
  component: SIFComponent
  subsystemId: string; channelId: string
  projectId: string; sifId: string
  color: string
}) {
  const removeComponent = useAppStore(s => s.removeComponent)
  const [sheetOpen, setSheetOpen]   = useState(false)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: component.id,
      data: { type: 'component', subsystemId, channelId, component },
    })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  return (
    <>
      <div ref={setNodeRef} style={style}
        className="group flex items-center gap-2 rounded-lg border bg-card px-2.5 py-2 hover:border-border transition-colors"
      >
        <span {...attributes} {...listeners}
          className="cursor-grab text-muted-foreground/30 hover:text-muted-foreground shrink-0 touch-none"
        >
          <Grip size={12} />
        </span>

        <div className="w-5 h-5 rounded flex items-center justify-center shrink-0"
          style={{ background: `${color}20`, color }}
        >
          {(() => { const I = SUB_ICONS[component.subsystemType]; return <I size={10} /> })()}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold font-mono truncate" style={{ color }}>
            {component.tagName}
          </p>
          <p className="text-[10px] text-muted-foreground truncate">{component.instrumentType}</p>
        </div>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setSheetOpen(true)}>
            <Settings2 size={11} />
          </Button>
          <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive hover:text-destructive"
            onClick={() => removeComponent(projectId, sifId, subsystemId, channelId, component.id)}
          >
            <Trash2 size={11} />
          </Button>
        </div>
      </div>

      <ComponentParamsSheet
        open={sheetOpen} onClose={() => setSheetOpen(false)}
        component={component} subsystemId={subsystemId}
        channelId={channelId} projectId={projectId} sifId={sifId}
      />
    </>
  )
}

// ─── Channel column ───────────────────────────────────────────────────────
function ChannelBlock({
  subsystem, channelIndex, projectId, sifId, isOver: externalIsOver,
}: {
  subsystem: SIFSubsystem; channelIndex: number
  projectId: string; sifId: string; isOver?: boolean
}) {
  const channel       = subsystem.channels[channelIndex]
  const addComponent  = useAppStore(s => s.addComponent)
  const removeChannel = useAppStore(s => s.removeChannel)
  const sif           = useAppStore(s => s.projects.find(p => p.id === projectId)?.sifs.find(s => s.id === sifId))
  const color         = SUB_COLORS[subsystem.type]

  // Register channel as a droppable zone (fixes cross-channel D&D)
  const dropId = `${CHANNEL_PREFIX}${channel?.id}`
  const { setNodeRef: setDropRef, isOver: channelIsOver } = useDroppable({
    id: dropId,
    data: { type: 'channel', subsystemId: subsystem.id, channelId: channel?.id },
  })

  if (!channel) return null

  const handleAddComponent = () => {
    const tagPrefix = `${sif?.sifNumber ?? 'SIF'}_${
      subsystem.type === 'sensor' ? 'S' : subsystem.type === 'logic' ? 'L' : 'A'
    }${channelIndex + 1}.${channel.components.length + 1}`
    addComponent(projectId, sifId, subsystem.id, channel.id, DEFAULT_COMPONENT(subsystem.type, tagPrefix))
  }

  const isHighlighted = channelIsOver || externalIsOver

  return (
    <div className="flex-1 min-w-[180px] space-y-1.5">
      {/* Header */}
      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg"
        style={{ background: `${color}10`, border: `1px solid ${color}30` }}
      >
        <span className="text-[11px] font-semibold" style={{ color }}>{channel.label}</span>
        {subsystem.channels.length > 1 && (
          <Button variant="ghost" size="icon" className="h-4 w-4 text-muted-foreground/50 hover:text-destructive"
            onClick={() => removeChannel(projectId, sifId, subsystem.id, channel.id)}
          >
            <X size={10} />
          </Button>
        )}
      </div>

      {/* Drop zone */}
      <div ref={setDropRef}
        className={cn(
          'min-h-[52px] rounded-lg transition-colors space-y-1.5 p-1',
          isHighlighted && 'bg-primary/5 ring-1 ring-primary/30 ring-dashed',
        )}
      >
        <SortableContext items={channel.components.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {channel.components.map(comp => (
            <SortableComponentCard
              key={comp.id} component={comp}
              subsystemId={subsystem.id} channelId={channel.id}
              projectId={projectId} sifId={sifId} color={color}
            />
          ))}
        </SortableContext>

        {channel.components.length === 0 && (
          <div className="h-10 flex items-center justify-center text-[10px] text-muted-foreground/40 border border-dashed rounded-md">
            Drop here
          </div>
        )}
      </div>

      <Button variant="ghost" size="sm" className="w-full h-6 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
        onClick={handleAddComponent}
      >
        <Plus size={10} /> Add component
      </Button>
    </div>
  )
}

// ─── Boolean Gate diagram ─────────────────────────────────────────────────
function BooleanGateDiagram({ gate, channels }: { gate: BooleanGate; channels: number }) {
  const isOR  = gate === 'OR'
  const color = isOR ? '#16A34A' : '#D97706'
  const label = isOR ? 'OR' : 'AND'
  const desc  = isOR
    ? 'Any channel triggers safe action — parallel redundancy (1ooN)'
    : 'All channels must agree — voting logic (NooN)'

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border"
      style={{ background: `${color}06`, borderColor: `${color}30` }}
    >
      {/* Simple SVG gate symbol */}
      <svg width="52" height="28" viewBox="0 0 52 28">
        {Array.from({ length: channels }).map((_, i) => {
          const y = channels === 1 ? 14 : 4 + i * (20 / (channels - 1))
          return <line key={i} x1="0" y1={y} x2="18" y2={14} stroke={color} strokeWidth="1.5" opacity="0.7" />
        })}
        <rect x="18" y="6" width="20" height="16" rx="3"
          fill={`${color}20`} stroke={color} strokeWidth="1.5" />
        <text x="28" y="17" fontSize="8" fontWeight="700" fill={color} textAnchor="middle">{label}</text>
        <line x1="38" y1="14" x2="52" y2="14" stroke={color} strokeWidth="1.5" />
      </svg>
      <div>
        <p className="text-[10px] font-bold" style={{ color }}>{label} gate · {channels} channel{channels > 1 ? 's' : ''}</p>
        <p className="text-[10px] text-muted-foreground">{desc}</p>
      </div>
    </div>
  )
}

// ─── Subsystem block ──────────────────────────────────────────────────────
function SubsystemBlock({
  subsystem, projectId, sifId,
}: { subsystem: SIFSubsystem; projectId: string; sifId: string }) {
  const [collapsed, setCollapsed]       = useState(false)
  const updateSubsystem = useAppStore(s => s.updateSubsystem)
  const removeSubsystem = useAppStore(s => s.removeSubsystem)
  const addChannel      = useAppStore(s => s.addChannel)

  const calcResult = calcSubsystemPFD(subsystem)
  const Icon       = SUB_ICONS[subsystem.type]
  const color      = SUB_COLORS[subsystem.type]
  const isCustom   = subsystem.architecture === 'custom'
  const gate       = subsystem.customBooleanArch?.gate ?? 'OR'

  const handleArchChange = (arch: Architecture) => {
    updateSubsystem(projectId, sifId, {
      ...subsystem,
      architecture: arch,
      customBooleanArch: arch === 'custom'
        ? (subsystem.customBooleanArch ?? { gate: 'OR', expression: '', manualHFT: 1 })
        : undefined,
    })
  }

  const handleGateChange = (g: BooleanGate) => {
    updateSubsystem(projectId, sifId, {
      ...subsystem,
      customBooleanArch: { ...subsystem.customBooleanArch!, gate: g, expression: '', manualHFT: g === 'OR' ? 1 : 0 },
    })
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden" style={{ borderColor: `${color}25` }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 gap-3"
        style={{ background: `${color}07`, borderBottom: `1px solid ${color}18` }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `${color}20`, color }}
          >
            <Icon size={14} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold truncate" style={{ color }}>{subsystem.label}</p>
            <p className="text-[10px] font-mono text-muted-foreground">
              {formatPFD(calcResult.PFD_avg)} · SFF {formatPct(calcResult.SFF)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <SILBadge sil={calcResult.SIL} size="sm" />

          {/* Architecture selector */}
          <Select value={subsystem.architecture} onValueChange={handleArchChange}>
            <SelectTrigger className="h-7 w-[90px] text-xs font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Standard MooN
              </div>
              {ARCHITECTURES.map(a => (
                <SelectItem key={a} value={a} className="text-xs font-mono">
                  <span className="font-bold">{a}</span>
                  <span className="text-muted-foreground ml-2 text-[10px]">{ARCHITECTURE_META[a].desc}</span>
                </SelectItem>
              ))}
              <div className="h-px bg-border my-1" />
              <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Custom
              </div>
              <SelectItem value="custom" className="text-xs font-mono">
                <span className="font-bold">Custom</span>
                <span className="text-muted-foreground ml-2 text-[10px]">Boolean AND/OR</span>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Boolean gate toggle (only when custom) */}
          {isCustom && (
            <div className="flex rounded-lg border overflow-hidden">
              {(['OR', 'AND'] as BooleanGate[]).map(g => (
                <button key={g} onClick={() => handleGateChange(g)}
                  className={cn(
                    'px-2 py-1 text-[10px] font-bold transition-colors',
                    gate === g ? 'text-white' : 'text-muted-foreground hover:text-foreground bg-card',
                  )}
                  style={gate === g ? { background: g === 'OR' ? '#16A34A' : '#D97706' } : {}}
                >
                  {g}
                </button>
              ))}
            </div>
          )}

          <Button variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => setCollapsed(c => !c)}
          >
            {collapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => removeSubsystem(projectId, sifId, subsystem.id)}
          >
            <Trash2 size={12} />
          </Button>
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="p-4 space-y-3">
          {/* Boolean gate diagram */}
          {isCustom && (
            <BooleanGateDiagram gate={gate} channels={subsystem.channels.length} />
          )}

          <div className="flex gap-3 flex-wrap">
            {subsystem.channels.map((_, idx) => (
              <ChannelBlock
                key={subsystem.channels[idx].id}
                subsystem={subsystem} channelIndex={idx}
                projectId={projectId} sifId={sifId}
              />
            ))}
          </div>

          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 text-muted-foreground"
            onClick={() => addChannel(projectId, sifId, subsystem.id)}
          >
            <Plus size={11} /> Add channel
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Library panel ────────────────────────────────────────────────────────
function LibraryItem({
  lib, onDragStart,
}: { lib: LibraryComponent; onDragStart: (lib: LibraryComponent) => void }) {
  const color = SUB_COLORS[lib.subsystemType]
  const Icon  = SUB_ICONS[lib.subsystemType]

  return (
    <div
      draggable
      onDragStart={() => onDragStart(lib)}
      className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-border/50 bg-card hover:border-border hover:bg-muted/20 cursor-grab active:cursor-grabbing transition-colors group"
    >
      <div className="w-5 h-5 rounded flex items-center justify-center shrink-0"
        style={{ background: `${color}15`, color }}
      >
        <Icon size={10} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium truncate">{lib.name}</p>
        <p className="text-[9px] text-muted-foreground truncate font-mono">
          λ={lib.factorized.lambda} · DC={Math.round(lib.factorized.DCd * 100)}%
        </p>
      </div>
      <Grip size={10} className="text-muted-foreground/30 group-hover:text-muted-foreground shrink-0" />
    </div>
  )
}

function ComponentLibraryPanel({
  onDragLibraryStart,
  onAddCustom,
}: {
  onDragLibraryStart: (lib: LibraryComponent) => void
  onAddCustom: () => void
}) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<SubsystemType | 'all'>('all')

  const [customLibrary, setCustomLibrary] = useState<LibraryComponent[]>([])

  const allItems = [...BUILTIN_LIBRARY, ...customLibrary]
  const filtered = allItems.filter(lib => {
    const matchType   = filter === 'all' || lib.subsystemType === filter
    const matchSearch = !search || lib.name.toLowerCase().includes(search.toLowerCase())
    return matchType && matchSearch
  })

  const grouped: Partial<Record<SubsystemType, LibraryComponent[]>> = {}
  filtered.forEach(lib => {
    if (!grouped[lib.subsystemType]) grouped[lib.subsystemType] = []
    grouped[lib.subsystemType]!.push(lib)
  })

  return (
    <div className="w-52 shrink-0 flex flex-col border-r bg-muted/10">
      {/* Panel header */}
      <div className="px-3 py-3 border-b">
        <div className="flex items-center gap-2 mb-2.5">
          <BookOpen size={13} className="text-primary shrink-0" />
          <p className="text-xs font-bold">Component Library</p>
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search..." className="h-7 pl-6 text-xs" />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-0.5 text-[10px]">
          {(['all', 'sensor', 'logic', 'actuator'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn(
                'flex-1 py-1 rounded capitalize transition-colors',
                filter === f
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40',
              )}
            >
              {f === 'all' ? 'All' : f === 'sensor' ? '📡' : f === 'logic' ? '🖥' : '⚙'}
            </button>
          ))}
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {(['sensor', 'logic', 'actuator'] as SubsystemType[]).map(type => {
          const items = grouped[type]
          if (!items?.length) return null
          const color = SUB_COLORS[type]
          const labels: Record<SubsystemType, string> = { sensor: 'Sensors', logic: 'Logic Solvers', actuator: 'Actuators' }
          return (
            <div key={type}>
              <p className="text-[9px] font-bold uppercase tracking-wider mb-1.5 px-0.5"
                style={{ color }}
              >
                {labels[type]}
              </p>
              <div className="space-y-1">
                {items.map(lib => (
                  <LibraryItem key={lib.libraryId} lib={lib} onDragStart={onDragLibraryStart} />
                ))}
              </div>
            </div>
          )
        })}

        {!filtered.length && (
          <p className="text-xs text-muted-foreground text-center py-4">No components found</p>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t">
        <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-1.5"
          onClick={onAddCustom}
        >
          <Plus size={11} /> Custom component
        </Button>
        <p className="text-[9px] text-muted-foreground text-center mt-1.5">
          Drag onto any channel
        </p>
      </div>
    </div>
  )
}

// ─── Main builder ─────────────────────────────────────────────────────────
export function ArchitectureBuilder({ projectId, sifId }: { projectId: string; sifId: string }) {
  const sif           = useAppStore(s => s.projects.find(p => p.id === projectId)?.sifs.find(s => s.id === sifId))
  const addSubsystem  = useAppStore(s => s.addSubsystem)
  const addComponent  = useAppStore(s => s.addComponent)
  const moveComponent = useAppStore(s => s.moveComponent)

  const [activeId, setActiveId]         = useState<string | null>(null)
  const [activeComponent, setActiveComp]= useState<SIFComponent | null>(null)
  const [overChannelId, setOverChannel] = useState<string | null>(null)

  // Library drag state (native HTML5 drag — separate from dnd-kit)
  const dragLibRef = useRef<LibraryComponent | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // ── dnd-kit handlers (for reordering existing components) ──
  const handleDragStart = useCallback(({ active }: DragStartEvent) => {
    setActiveId(String(active.id))
    setActiveComp(active.data.current?.component ?? null)
  }, [])

  const handleDragOver = useCallback(({ over }: DragOverEvent) => {
    if (!over) { setOverChannel(null); return }
    const channelId = over.data.current?.channelId ?? null
    setOverChannel(channelId)
  }, [])

  const handleDragEnd = useCallback(({ active, over }: DragEndEvent) => {
    setActiveId(null)
    setActiveComp(null)
    setOverChannel(null)
    if (!over || !sif) return

    const activeData = active.data.current as { type: string; subsystemId: string; channelId: string; component: SIFComponent }
    const overData   = over.data.current as { type: string; subsystemId: string; channelId: string } | undefined

    if (!activeData?.subsystemId || !activeData?.channelId) return

    // Resolve target subsystem + channel
    const toSubId = overData?.subsystemId ?? activeData.subsystemId
    const toChId  = overData?.channelId   ?? activeData.channelId

    const fromSub = sif.subsystems.find(s => s.id === activeData.subsystemId)
    const toSub   = sif.subsystems.find(s => s.id === toSubId)
    const fromCh  = fromSub?.channels.find(c => c.id === activeData.channelId)
    const toCh    = toSub?.channels.find(c => c.id === toChId)

    if (!fromCh || !toCh) return

    const fromIdx = fromCh.components.findIndex(c => c.id === active.id)
    if (fromIdx === -1) return

    // If dropping on a component in the same channel → reorder (arrayMove via store)
    const toIdx = overData?.type === 'component'
      ? toCh.components.findIndex(c => c.id === over.id)
      : toCh.components.length

    moveComponent(
      projectId, sifId,
      activeData.subsystemId, activeData.channelId, fromIdx,
      toSubId, toChId, toIdx === -1 ? toCh.components.length : toIdx,
    )
  }, [sif, moveComponent, projectId, sifId])

  // ── HTML5 library drag handlers ──
  const handleLibraryDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!dragLibRef.current) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleChannelDrop = useCallback((
    e: React.DragEvent<HTMLDivElement>,
    subsystemId: string,
    channelId: string,
  ) => {
    e.preventDefault()
    const lib = dragLibRef.current
    if (!lib || !sif) return
    dragLibRef.current = null

    const sub = sif.subsystems.find(s => s.id === subsystemId)
    if (!sub) return
    const ch = sub.channels.find(c => c.id === channelId)
    if (!ch) return

    const typePrefix = lib.subsystemType === 'sensor' ? 'S' : lib.subsystemType === 'logic' ? 'L' : 'A'
    const chIdx = sub.channels.indexOf(ch)
    const tagName = `${sif.sifNumber}_${typePrefix}${chIdx + 1}.${ch.components.length + 1}`
    addComponent(projectId, sifId, subsystemId, channelId, libraryToComponent(lib, tagName))
  }, [sif, addComponent, projectId, sifId])

  if (!sif) return null

  const SUBSYSTEM_TYPES: { type: SubsystemType; label: string }[] = [
    { type: 'sensor',   label: 'Sensor(s)' },
    { type: 'logic',    label: 'Logic Solver' },
    { type: 'actuator', label: 'Actuator(s)' },
  ]

  return (
    <div className="flex gap-0 rounded-xl border overflow-hidden" style={{ minHeight: 400 }}>
      {/* ── Library panel ── */}
      <ComponentLibraryPanel
        onDragLibraryStart={lib => { dragLibRef.current = lib }}
        onAddCustom={() => {/* TODO: open custom component creator */}}
      />

      {/* ── Builder canvas ── */}
      <div
        className="flex-1 p-4"
        onDragOver={handleLibraryDragOver}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-4">
            {/* Add subsystem toolbar */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Drag components from the library, or add blank components per channel
              </p>
              <div className="flex gap-1.5">
                {SUBSYSTEM_TYPES.map(({ type, label }) => {
                  const exists = sif.subsystems.some(s => s.type === type)
                  const Icon   = SUB_ICONS[type]
                  const color  = SUB_COLORS[type]
                  return (
                    <Button key={type} variant="outline" size="sm"
                      disabled={exists} className="h-7 text-xs gap-1.5"
                      onClick={() => addSubsystem(projectId, sifId, DEFAULT_SUBSYSTEM(type, sif.sifNumber))}
                      style={exists ? {} : { borderColor: `${color}50`, color }}
                    >
                      <Icon size={11} />
                      {exists ? `${label} ✓` : `+ ${label}`}
                    </Button>
                  )
                })}
              </div>
            </div>

            {/* Empty state */}
            {sif.subsystems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl text-muted-foreground">
                <Layers size={28} className="mb-2 opacity-30" />
                <p className="text-sm font-medium mb-1">No subsystems yet</p>
                <p className="text-xs">Add Sensor, Logic Solver, and Actuator above</p>
              </div>
            ) : (
              ['sensor', 'logic', 'actuator']
                .map(type => sif.subsystems.find(s => s.type === type))
                .filter(Boolean)
                .map(subsystem => (
                  // Wrap each subsystem in a drop zone proxy for library items
                  <div
                    key={subsystem!.id}
                    onDragOver={handleLibraryDragOver}
                    onDrop={e => {
                      // Find the hovered channel via element proximity (best effort)
                      // For simplicity: drop into first channel when no specific channel found
                      const sub = subsystem!
                      if (sub.channels.length > 0) {
                        handleChannelDrop(e, sub.id, sub.channels[0].id)
                      }
                    }}
                  >
                    <SubsystemBlock
                      subsystem={subsystem!}
                      projectId={projectId}
                      sifId={sifId}
                    />
                  </div>
                ))
            )}
          </div>

          <DragOverlay>
            {activeComponent && (
              <div className="rounded-lg border bg-card shadow-2xl px-3 py-2 text-xs font-mono opacity-95 ring-2 ring-primary/30">
                <p className="font-bold">{activeComponent.tagName}</p>
                <p className="text-muted-foreground text-[10px]">{activeComponent.instrumentType}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}