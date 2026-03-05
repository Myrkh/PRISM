// ═══════════════════════════════════════════════════════════════════════════
// PRISM — ArchitectureBuilder  v3  (DA KORE)
//
// Bugs corrigés vs v2 :
//  ─ BUG 1 : drag depuis bibliothèque impossible
//    → Cause : PointerSensor (dnd-kit) intercepte pointerdown → preventDefault()
//              → bloque le démarrage du drag HTML5 natif
//    → Fix  : bibliothèque utilise désormais `useDraggable` (dnd-kit)
//             au lieu du drag HTML5. Un seul système DnD, zéro conflit.
//
//  ─ BUG 2 : panneau de configuration plante (crash)
//    → Cause : libToComp() créait un SIFComponent incomplet :
//              `advanced` manquait proofTestCoverage, partialTest, etc.
//              `test` manquait testType, T0, T0Unit
//              → ComponentParamsSheet accédait à des props undefined → crash
//    → Fix  : libToComp() utilise DEFAULT_COMPONENT comme base complète
//             puis écrase uniquement les valeurs spécifiques de la lib.
//
// DA KORE — navy #003D5C · teal #009BA4 · bg #F0F4F8
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useMemo } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCenter, type DragEndEvent, type DragStartEvent,
  useDroppable, useDraggable,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus, Grip, Settings2, Trash2, Activity, Cpu, Zap,
  ChevronDown, ChevronUp, Search, BookOpen, X, Layers,
  Download, Upload,
} from 'lucide-react'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useAppStore } from '@/store/appStore'
import { SILBadge } from '@/components/shared/SILBadge'
import { ComponentParamsSheet } from '@/components/parameters/ComponentParamsSheet'
import { calcSubsystemPFD, formatPFD, formatPct } from '@/core/math/pfdCalc'
import { DEFAULT_COMPONENT, DEFAULT_SUBSYSTEM } from '@/core/models/defaults'
import {
  ARCHITECTURE_META,
  type Architecture, type SIFSubsystem, type SIFComponent,
  type SubsystemType, type LibraryComponent, type BooleanGate,
} from '@/core/types'
import { nanoid } from 'nanoid'

// ─── KORE Design Tokens ───────────────────────────────────────────────────
const NAVY  = '#003D5C'
const NAVY2 = '#002A42'
const TEAL  = '#009BA4'
const BG    = '#F0F4F8'

const SUB_COLORS: Record<SubsystemType, string> = {
  sensor:   '#0284C7',
  logic:    '#7C3AED',
  actuator: '#EA580C',
}
const SUB_ICONS: Record<SubsystemType, React.ElementType> = {
  sensor: Activity, logic: Cpu, actuator: Zap,
}
const ARCHITECTURES = (Object.keys(ARCHITECTURE_META) as Architecture[]).filter(a => a !== 'custom')
const CHANNEL_DROP_ID = (channelId: string) => `channel-drop:${channelId}`

// ─── Library types ────────────────────────────────────────────────────────
interface LibGroup {
  id: string
  name: string
  subsystemType: SubsystemType
  color: string
}

interface LibraryComponentEx extends LibraryComponent {
  groupId?: string
}

// ─── Built-in library ─────────────────────────────────────────────────────
const BUILTIN: LibraryComponentEx[] = [
  { libraryId:'lib-pt',    name:'Pressure transmitter',   subsystemType:'sensor',   instrumentCategory:'transmitter', instrumentType:'Pressure transmitter',   manufacturer:'', dataSource:'exida SERH', factorized:{lambda:6.5,  lambdaDRatio:0.25,DCd:0.70,DCs:1.0}, test:{T1:1,T1Unit:'yr'}, isCustom:false },
  { libraryId:'lib-tt',    name:'Temperature transmitter',subsystemType:'sensor',   instrumentCategory:'transmitter', instrumentType:'Temperature transmitter', manufacturer:'', dataSource:'exida SERH', factorized:{lambda:5.0,  lambdaDRatio:0.25,DCd:0.65,DCs:1.0}, test:{T1:1,T1Unit:'yr'}, isCustom:false },
  { libraryId:'lib-ft',    name:'Flow transmitter',       subsystemType:'sensor',   instrumentCategory:'transmitter', instrumentType:'Flow transmitter',        manufacturer:'', dataSource:'exida SERH', factorized:{lambda:8.0,  lambdaDRatio:0.25,DCd:0.60,DCs:1.0}, test:{T1:1,T1Unit:'yr'}, isCustom:false },
  { libraryId:'lib-lt',    name:'Level transmitter',      subsystemType:'sensor',   instrumentCategory:'transmitter', instrumentType:'Level transmitter',       manufacturer:'', dataSource:'exida SERH', factorized:{lambda:7.2,  lambdaDRatio:0.25,DCd:0.65,DCs:1.0}, test:{T1:1,T1Unit:'yr'}, isCustom:false },
  { libraryId:'lib-ps',    name:'Pressure switch',        subsystemType:'sensor',   instrumentCategory:'switch',      instrumentType:'Pressure switch',         manufacturer:'', dataSource:'exida SERH', factorized:{lambda:10.0, lambdaDRatio:0.30,DCd:0.50,DCs:1.0}, test:{T1:1,T1Unit:'yr'}, isCustom:false },
  { libraryId:'lib-ls',    name:'Level switch',           subsystemType:'sensor',   instrumentCategory:'switch',      instrumentType:'Level switch',            manufacturer:'', dataSource:'exida SERH', factorized:{lambda:12.0, lambdaDRatio:0.30,DCd:0.50,DCs:1.0}, test:{T1:1,T1Unit:'yr'}, isCustom:false },
  { libraryId:'lib-plc',   name:'Safety PLC',             subsystemType:'logic',    instrumentCategory:'controller',  instrumentType:'Safety PLC',              manufacturer:'', dataSource:'exida SERH', factorized:{lambda:1.5,  lambdaDRatio:0.25,DCd:0.90,DCs:1.0}, test:{T1:1,T1Unit:'yr'}, isCustom:false },
  { libraryId:'lib-relay', name:'Safety relay module',    subsystemType:'logic',    instrumentCategory:'controller',  instrumentType:'Safety relay module',     manufacturer:'', dataSource:'exida SERH', factorized:{lambda:2.5,  lambdaDRatio:0.20,DCd:0.70,DCs:1.0}, test:{T1:1,T1Unit:'yr'}, isCustom:false },
  { libraryId:'lib-xv',    name:'On-off valve (XV)',      subsystemType:'actuator', instrumentCategory:'valve',       instrumentType:'On-off valve',            manufacturer:'', dataSource:'exida SERH', factorized:{lambda:1.5,  lambdaDRatio:0.25,DCd:0.70,DCs:1.0}, test:{T1:1,T1Unit:'yr'}, isCustom:false },
  { libraryId:'lib-sv',    name:'Solenoid valve (SV)',    subsystemType:'actuator', instrumentCategory:'valve',       instrumentType:'Solenoid valve',          manufacturer:'', dataSource:'exida SERH', factorized:{lambda:3.0,  lambdaDRatio:0.30,DCd:0.60,DCs:1.0}, test:{T1:1,T1Unit:'yr'}, isCustom:false },
  { libraryId:'lib-bv',    name:'Ball valve',             subsystemType:'actuator', instrumentCategory:'valve',       instrumentType:'Ball valve',              manufacturer:'', dataSource:'OREDA',      factorized:{lambda:2.0,  lambdaDRatio:0.25,DCd:0.60,DCs:1.0}, test:{T1:1,T1Unit:'yr'}, isCustom:false },
]

// ─── FIX BUG 2: libToComp uses DEFAULT_COMPONENT as base ─────────────────
// This ensures all required fields (advanced.proofTestCoverage, test.testType, etc.)
// are always present — ComponentParamsSheet can safely access any field without crash.
function libToComp(lib: LibraryComponentEx, tagName: string): SIFComponent {
  // 1. Get a complete component with all required fields
  const base = DEFAULT_COMPONENT(lib.subsystemType, tagName)
  // 2. Overwrite only what the library defines
  return {
    ...base,
    instrumentCategory: lib.instrumentCategory,
    instrumentType:     lib.instrumentType,
    manufacturer:       lib.manufacturer || base.manufacturer,
    dataSource:         lib.dataSource   || base.dataSource,
    factorized:         { ...base.factorized, ...lib.factorized },
    test:               { ...base.test, T1: lib.test.T1, T1Unit: lib.test.T1Unit },
    // advanced, developed, paramMode etc. come from base → always complete
  }
}

// ─── Shared input style ───────────────────────────────────────────────────
const inputCls = [
  'w-full h-7 px-2 text-xs rounded-lg border border-gray-200 bg-white',
  'focus:outline-none focus:border-[#009BA4] transition-all',
].join(' ')

// ─── DraggableLibraryItem (FIX BUG 1: uses useDraggable, not HTML5 drag) ─
// This eliminates the conflict with dnd-kit's PointerSensor that was
// calling preventDefault() on pointerdown, blocking HTML5 dragstart.
function DraggableLibraryItem({ lib }: { lib: LibraryComponentEx }) {
  const color = SUB_COLORS[lib.subsystemType]
  const Icon  = SUB_ICONS[lib.subsystemType]

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `lib:${lib.libraryId}`,
    data: { type: 'library', lib },
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="flex items-center gap-2 px-2.5 py-2 rounded-lg border bg-white cursor-grab active:cursor-grabbing transition-all hover:shadow-sm"
      style={{
        borderColor: isDragging ? `${TEAL}60` : '#E5E7EB',
        opacity: isDragging ? 0.5 : 1,
        background: isDragging ? `${TEAL}06` : 'white',
      }}
    >
      <div className="w-5 h-5 rounded flex items-center justify-center shrink-0"
        style={{ background: `${color}18`, color }}
      >
        <Icon size={10} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium truncate" style={{ color: NAVY }}>{lib.name}</p>
        <p className="text-[9px] font-mono truncate" style={{ color: '#9CA3AF' }}>
          λ={lib.factorized.lambda} · DC={Math.round(lib.factorized.DCd * 100)}%
        </p>
      </div>
      <Grip size={10} style={{ color: '#D1D5DB' }} className="shrink-0" />
    </div>
  )
}

// ─── Group Section (collapsible, items inside are draggable via dnd-kit) ──
function GroupSection({
  group, items, onDelete, onAddItem,
}: {
  group: LibGroup
  items: LibraryComponentEx[]
  onDelete: (id: string) => void
  onAddItem: (name: string) => void
}) {
  const [open, setOpen]     = useState(true)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')

  const confirmAdd = () => {
    if (!newName.trim()) return
    onAddItem(newName.trim())
    setNewName('')
    setAdding(false)
  }

  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: `${group.color}30` }}>
      <div
        className="flex items-center justify-between px-2.5 py-1.5 group/hdr"
        style={{ background: `${group.color}08` }}
      >
        <span className="text-[10px] font-bold uppercase tracking-widest truncate flex-1"
          style={{ color: group.color }}
        >{group.name}</span>

        <div className="flex items-center gap-0.5 ml-2 shrink-0">
          <button onClick={() => setAdding(v => !v)}
            className="p-0.5 rounded transition-all opacity-60 hover:opacity-100"
            style={{ color: group.color }}
          ><Plus size={9} /></button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(group.id) }}
            className="p-0.5 rounded transition-all opacity-0 group-hover/hdr:opacity-100"
            style={{ color: '#9CA3AF' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
            onMouseLeave={e => (e.currentTarget.style.color = '#9CA3AF')}
          ><X size={9} /></button>
          <button onClick={() => setOpen(v => !v)} style={{ color: group.color }}>
            {open ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="bg-gray-50/60">
          <div className="p-1.5 space-y-1">
            {items.length === 0 && !adding
              ? <p className="text-[9px] text-center py-1.5" style={{ color: '#C4C9D4' }}>
                  Vide — cliquez + pour ajouter
                </p>
              : items.map(lib => <DraggableLibraryItem key={lib.libraryId} lib={lib} />)
            }
          </div>
          {adding && (
            <div className="px-1.5 pb-1.5 flex gap-1">
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') confirmAdd(); if (e.key === 'Escape') setAdding(false) }}
                placeholder="Nom du composant…"
                className="flex-1 h-6 px-2 text-[10px] rounded border border-gray-200 bg-white focus:outline-none focus:border-[#009BA4] transition-all"
              />
              <button onClick={confirmAdd}
                className="h-6 px-2 text-[10px] font-bold text-white rounded transition-all"
                style={{ background: group.color }}
              >✓</button>
              <button onClick={() => setAdding(false)}
                className="h-6 px-1.5 text-[10px] rounded border border-gray-200 transition-all"
                style={{ color: '#9CA3AF' }}
              >✕</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Library Panel ────────────────────────────────────────────────────────
function LibraryPanel() {
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState<SubsystemType | 'all'>('all')
  const [custom, setCustom]   = useState<LibraryComponentEx[]>([])
  const [groups, setGroups]   = useState<LibGroup[]>([])
  const [gName,  setGName]    = useState('')
  const [gType,  setGType]    = useState<SubsystemType>('sensor')
  const [gColor, setGColor]   = useState(TEAL)

  const importRef = { current: null as HTMLInputElement | null }

  const all = [...BUILTIN, ...custom]
  const pass = (l: LibraryComponentEx) =>
    (filter === 'all' || l.subsystemType === filter) &&
    (!search || l.name.toLowerCase().includes(search.toLowerCase()))

  const builtinByType: Partial<Record<SubsystemType, LibraryComponentEx[]>> = {}
  all.filter(l => !l.isCustom && pass(l)).forEach(l => {
    builtinByType[l.subsystemType] = [...(builtinByType[l.subsystemType] ?? []), l]
  })

  const itemsInGroup = (gid: string) => custom.filter(l => l.groupId === gid && pass(l))
  const ungrouped    = custom.filter(l => !l.groupId && pass(l))

  const addGroup = () => {
    if (!gName.trim()) return
    setGroups(p => [...p, { id: nanoid(), name: gName.trim(), subsystemType: gType, color: gColor }])
    setGName('')
  }

  const delGroup = (id: string) => {
    setGroups(p => p.filter(g => g.id !== id))
    setCustom(p => p.map(l => l.groupId === id ? { ...l, groupId: undefined } : l))
  }

  const exportLib = () => {
    const blob = new Blob([JSON.stringify({ custom, groups }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = 'prism-library.json'; a.click()
  }

  const importLib = async (f?: File) => {
    if (!f) return
    try {
      const p = JSON.parse(await f.text())
      if (Array.isArray(p.custom)) setCustom(p.custom)
      if (Array.isArray(p.groups)) setGroups(p.groups)
    } catch { alert('Fichier invalide') }
  }

  const typeLabels: Record<SubsystemType, string> = { sensor: 'Capteurs', logic: 'Logique', actuator: 'Actionneurs' }

  return (
    <div className="w-60 shrink-0 flex flex-col border-r bg-white">
      {/* Header */}
      <div className="px-3 py-3 border-b" style={{ background: BG }}>
        <div className="flex items-center gap-2 mb-2.5">
          <BookOpen size={12} style={{ color: NAVY }} />
          <p className="text-xs font-bold" style={{ color: NAVY }}>Bibliothèque</p>
        </div>
        <div className="relative mb-2">
          <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
            className="w-full h-7 pl-7 pr-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-[#009BA4] transition-all"
          />
        </div>
        {/* Filter tabs */}
        <div className="flex gap-0.5 p-0.5 rounded-lg" style={{ background: '#E8EDF2' }}>
          {(['all','sensor','logic','actuator'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="flex-1 py-1 rounded-md text-[10px] font-semibold transition-all"
              style={filter === f ? { background: NAVY, color:'white' } : { color:'#6B7280' }}
            >
              {f==='all'?'Tous':f==='sensor'?'📡':f==='logic'?'🖥':'⚙️'}
            </button>
          ))}
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {(['sensor','logic','actuator'] as SubsystemType[]).map(type => {
          const builtins    = builtinByType[type] ?? []
          const typeGroups  = groups.filter(g => g.subsystemType === type)
          const typeUngrouped = ungrouped.filter(l => l.subsystemType === type)
          if (!builtins.length && !typeGroups.length && !typeUngrouped.length) return null
          const color = SUB_COLORS[type]
          return (
            <div key={type}>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5 px-0.5" style={{ color }}>
                {typeLabels[type]}
              </p>
              <div className="space-y-1">
                {builtins.map(lib      => <DraggableLibraryItem key={lib.libraryId} lib={lib} />)}
                {typeUngrouped.map(lib => <DraggableLibraryItem key={lib.libraryId} lib={lib} />)}
                {typeGroups.map(g => (
                  <GroupSection key={g.id} group={g} items={itemsInGroup(g.id)}
                    onDelete={delGroup}
                    onAddItem={(name) => {
                      const lib: LibraryComponentEx = {
                        libraryId: nanoid(), name, subsystemType: type,
                        instrumentCategory: type === 'sensor' ? 'transmitter' : type === 'logic' ? 'controller' : 'valve',
                        instrumentType: name, manufacturer: '', dataSource: 'Custom',
                        factorized: { lambda: 5.0, lambdaDRatio: 0.25, DCd: 0.65, DCs: 1.0 },
                        test: { T1: 1, T1Unit: 'yr' }, isCustom: true, groupId: g.id,
                      }
                      setCustom(prev => [...prev, lib])
                    }}
                  />
                ))}
              </div>
            </div>
          )
        })}
        {!all.some(pass) && (
          <p className="text-xs text-center py-6" style={{ color:'#D1D5DB' }}>Aucun composant trouvé</p>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t space-y-2">
        {/* New group form */}
        <div className="rounded-xl border border-gray-200 p-2.5 space-y-2">
          <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: NAVY }}>Nouveau groupe</p>
          <input value={gName} onChange={e => setGName(e.target.value)} onKeyDown={e => e.key==='Enter'&&addGroup()}
            placeholder="ex: Pack F&G, HIPPS…" className={inputCls} />
          <div className="flex gap-1.5">
            <Select value={gType} onValueChange={v => setGType(v as SubsystemType)}>
              <SelectTrigger className="h-7 flex-1 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sensor">Capteur</SelectItem>
                <SelectItem value="logic">Logique</SelectItem>
                <SelectItem value="actuator">Actionneur</SelectItem>
              </SelectContent>
            </Select>
            <input type="color" value={gColor} onChange={e => setGColor(e.target.value)}
              className="h-7 w-9 rounded-lg border border-gray-200 p-0.5 cursor-pointer" />
            <button onClick={addGroup}
              className="h-7 px-2.5 text-xs font-bold text-white rounded-lg transition-all"
              style={{ background: NAVY }}
              onMouseEnter={e => (e.currentTarget.style.background = NAVY2)}
              onMouseLeave={e => (e.currentTarget.style.background = NAVY)}
            >+</button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {[
            { label: 'Export', icon: Download, action: exportLib },
            { label: 'Import', icon: Upload, action: () => importRef.current?.click() },
          ].map(({ label, icon: Icon, action }) => (
            <button key={label} onClick={action}
              className="h-7 text-[10px] font-semibold rounded-lg border border-gray-200 flex items-center justify-center gap-1 hover:border-gray-300 transition-all"
              style={{ color: '#6B7280' }}
            ><Icon size={10} />{label}</button>
          ))}
        </div>
        <p className="text-[9px] text-center" style={{ color: '#D1D5DB' }}>
          Glisser vers un canal du canvas
        </p>
      </div>
    </div>
  )
}

// ─── SortableComponentCard ────────────────────────────────────────────────
function SortableComponentCard({
  component, subsystemId, channelId, projectId, sifId, color,
}: {
  component: SIFComponent; subsystemId: string; channelId: string
  projectId: string; sifId: string; color: string
}) {
  const remove = useAppStore(s => s.removeComponent)
  const [open, setOpen] = useState(false)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: component.id, data: { type: 'component', subsystemId, channelId, component } })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  return (
    <>
      <div ref={setNodeRef} style={style}
        className="group flex items-center gap-2 rounded-lg border bg-white px-2.5 py-2 transition-all hover:shadow-sm"
        onMouseEnter={e => (e.currentTarget.style.borderColor = `${color}50`)}
        onMouseLeave={e => (e.currentTarget.style.borderColor = '#E5E7EB')}
      >
        <span {...attributes} {...listeners} className="cursor-grab touch-none shrink-0" style={{ color: '#D1D5DB' }}>
          <Grip size={12} />
        </span>
        <div className="w-5 h-5 rounded flex items-center justify-center shrink-0"
          style={{ background:`${color}18`, color }}
        >
          {(() => { const I = SUB_ICONS[component.subsystemType]; return <I size={10} /> })()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold font-mono truncate" style={{ color }}>{component.tagName}</p>
          <p className="text-[10px] truncate" style={{ color:'#9CA3AF' }}>{component.instrumentType}</p>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setOpen(true)}
            className="h-5 w-5 flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
            style={{ color:'#9CA3AF' }}
            title="Configurer"
          ><Settings2 size={11} /></button>
          <button onClick={() => remove(projectId, sifId, subsystemId, channelId, component.id)}
            className="h-5 w-5 flex items-center justify-center rounded hover:bg-red-50 transition-colors"
            style={{ color:'#9CA3AF' }}
            onMouseEnter={e => (e.currentTarget.style.color='#EF4444')}
            onMouseLeave={e => (e.currentTarget.style.color='#9CA3AF')}
          ><Trash2 size={11} /></button>
        </div>
      </div>
      <ComponentParamsSheet
        open={open} onClose={() => setOpen(false)}
        component={component} subsystemId={subsystemId}
        channelId={channelId} projectId={projectId} sifId={sifId}
      />
    </>
  )
}

// ─── ChannelBlock ─────────────────────────────────────────────────────────
// Simplified: no HTML5 drag events needed — all DnD via dnd-kit
function ChannelBlock({
  subsystem, channelIndex, projectId, sifId,
}: {
  subsystem: SIFSubsystem; channelIndex: number; projectId: string; sifId: string
}) {
  const channel  = subsystem.channels[channelIndex]
  const addComp  = useAppStore(s => s.addComponent)
  const removeCh = useAppStore(s => s.removeChannel)
  const sif      = useAppStore(s => s.projects.find(p => p.id===projectId)?.sifs.find(s => s.id===sifId))
  const color    = SUB_COLORS[subsystem.type]

  const { setNodeRef, isOver } = useDroppable({
    id: CHANNEL_DROP_ID(channel?.id ?? ''),
    data: { type: 'channel', subsystemId: subsystem.id, channelId: channel?.id },
  })

  if (!channel) return null

  const handleAdd = () => {
    const pfx = `${sif?.sifNumber??'SIF'}_${subsystem.type==='sensor'?'S':subsystem.type==='logic'?'L':'A'}${channelIndex+1}.${channel.components.length+1}`
    addComp(projectId, sifId, subsystem.id, channel.id, DEFAULT_COMPONENT(subsystem.type, pfx))
  }

  return (
    <div className="flex-1 min-w-[180px] space-y-1.5">
      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg"
        style={{ background:`${color}10`, border:`1px solid ${color}30` }}
      >
        <span className="text-[11px] font-bold" style={{ color }}>{channel.label}</span>
        {subsystem.channels.length > 1 && (
          <button onClick={() => removeCh(projectId, sifId, subsystem.id, channel.id)}
            className="h-4 w-4 flex items-center justify-center rounded transition-colors"
            style={{ color:'#D1D5DB' }}
            onMouseEnter={e => (e.currentTarget.style.color='#EF4444')}
            onMouseLeave={e => (e.currentTarget.style.color='#D1D5DB')}
          ><X size={10} /></button>
        )}
      </div>

      {/* Drop zone — dnd-kit only */}
      <div
        ref={setNodeRef}
        className="min-h-[52px] rounded-lg transition-all space-y-1.5 p-1"
        style={isOver ? { background:`${TEAL}08`, outline:`2px dashed ${TEAL}60`, borderRadius:8 } : {}}
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
          <div className="h-10 flex items-center justify-center text-[10px] rounded-md border border-dashed transition-colors"
            style={isOver
              ? { borderColor:TEAL, color:TEAL, background:`${TEAL}05` }
              : { borderColor:'#E5E7EB', color:'#D1D5DB' }}
          >Déposer ici</div>
        )}
      </div>

      <button onClick={handleAdd}
        className="w-full h-6 text-[10px] font-medium flex items-center justify-center gap-1 rounded-lg transition-colors"
        style={{ color:'#9CA3AF' }}
        onMouseEnter={e => { e.currentTarget.style.color=NAVY; e.currentTarget.style.background=BG }}
        onMouseLeave={e => { e.currentTarget.style.color='#9CA3AF'; e.currentTarget.style.background='transparent' }}
      ><Plus size={10} />Ajouter composant</button>
    </div>
  )
}

// ─── Boolean Gate Diagram ─────────────────────────────────────────────────
function BooleanGateDiagram({ gate, channels }: { gate: BooleanGate; channels: number }) {
  const isOR  = gate === 'OR'
  const color = isOR ? TEAL : NAVY
  const label = isOR ? 'OR' : 'AND'
  const desc  = isOR ? 'Un seul canal suffit — redondance parallèle (1ooN)' : 'Tous les canaux doivent valider — vote (NooN)'
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border"
      style={{ background:`${color}06`, borderColor:`${color}25` }}
    >
      <svg width="52" height="28" viewBox="0 0 52 28">
        {Array.from({length:channels}).map((_,i) => {
          const y = channels===1 ? 14 : 4 + i*(20/Math.max(channels-1,1))
          return <line key={i} x1="0" y1={y} x2="18" y2="14" stroke={color} strokeWidth="1.5" opacity="0.7" />
        })}
        <rect x="18" y="6" width="20" height="16" rx="3" fill={`${color}20`} stroke={color} strokeWidth="1.5" />
        <text x="28" y="17" fontSize="7.5" fontWeight="700" fill={color} textAnchor="middle">{label}</text>
        <line x1="38" y1="14" x2="52" y2="14" stroke={color} strokeWidth="1.5" />
      </svg>
      <div>
        <p className="text-[10px] font-bold" style={{ color }}>{label} · {channels} canal{channels>1?'x':''}</p>
        <p className="text-[10px]" style={{ color:'#9CA3AF' }}>{desc}</p>
      </div>
    </div>
  )
}

// ─── SubsystemBlock ───────────────────────────────────────────────────────
function SubsystemBlock({
  subsystem, projectId, sifId,
}: {
  subsystem: SIFSubsystem; projectId: string; sifId: string
}) {
  const [collapsed, setCollapsed] = useState(false)
  const update  = useAppStore(s => s.updateSubsystem)
  const remove  = useAppStore(s => s.removeSubsystem)
  const addCh   = useAppStore(s => s.addChannel)

  const color   = SUB_COLORS[subsystem.type]
  const Icon    = SUB_ICONS[subsystem.type]
  const custom  = subsystem.architecture === 'custom'
  const [gate, setGate] = useState<BooleanGate>('OR')

  const calcResult = useMemo(() => calcSubsystemPFD(subsystem), [subsystem])

  return (
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden"
      style={{ borderColor: `${color}20` }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b"
        style={{ background:`${color}06`, borderColor:`${color}14` }}
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background:`${color}15`, color }}
        ><Icon size={14} /></div>

        <input
          value={subsystem.label}
          onChange={e => update(projectId, sifId, { ...subsystem, label: e.target.value })}
          className="flex-1 bg-transparent text-sm font-bold border-none outline-none"
          style={{ color, minWidth: 80 }}
        />

        {!custom && (
          <Select
            value={subsystem.architecture}
            onValueChange={v => update(projectId, sifId, { ...subsystem, architecture: v as Architecture })}
          >
            <SelectTrigger className="h-7 w-24 text-xs border-0 focus:ring-0"
              style={{ background:`${color}12`, color }}
            ><SelectValue /></SelectTrigger>
            <SelectContent>
              {ARCHITECTURES.map(a => (
                <SelectItem key={a} value={a}>
                  <span className="font-mono text-xs">{a}</span>
                  <span className="text-[10px] ml-2 text-gray-400">{ARCHITECTURE_META[a]?.desc}</span>
                </SelectItem>
              ))}
              <SelectItem value="custom">
                <span className="font-mono text-xs">custom</span>
                <span className="text-[10px] ml-2 text-gray-400">Booléen personnalisé</span>
              </SelectItem>
            </SelectContent>
          </Select>
        )}

        <SILBadge sil={calcResult.SIL} size="sm" />

        <div className="flex items-center gap-0.5 ml-auto">
          {custom && (
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {(['OR','AND'] as BooleanGate[]).map(g => (
                <button key={g} onClick={() => setGate(g)}
                  className="px-2.5 py-1 text-[10px] font-bold transition-all"
                  style={gate===g ? { background: g==='OR'?TEAL:NAVY, color:'white' } : { color:'#9CA3AF', background:'white' }}
                >{g}</button>
              ))}
            </div>
          )}
          <button onClick={() => setCollapsed(c=>!c)}
            className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            style={{ color:'#9CA3AF' }}
          >{collapsed ? <ChevronDown size={13}/> : <ChevronUp size={13}/>}</button>
          <button onClick={() => remove(projectId, sifId, subsystem.id)}
            className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors"
            style={{ color:'#D1D5DB' }}
            onMouseEnter={e => (e.currentTarget.style.color='#EF4444')}
            onMouseLeave={e => (e.currentTarget.style.color='#D1D5DB')}
          ><Trash2 size={12}/></button>
        </div>
      </div>

      {/* Metrics bar */}
      <div className="grid grid-cols-3 border-b divide-x text-center"
        style={{ borderColor:`${color}12`, divideColor:`${color}12` }}
      >
        {[
          { label: 'PFDavg', value: formatPFD(calcResult.PFD_avg) },
          { label: 'SFF',    value: formatPct(calcResult.SFF) },
          { label: 'DC',     value: formatPct(calcResult.DC) },
        ].map(({ label, value }, i) => (
          <div key={label} className="py-2"
            style={i < 2 ? { borderRight:`1px solid ${color}12` } : undefined}
          >
            <p className="text-[8px] font-bold uppercase tracking-widest mb-0.5" style={{ color:'#B0B8C4' }}>{label}</p>
            <p className="text-[11px] font-mono font-bold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {!collapsed && (
        <div className="p-4 space-y-3">
          {custom && <BooleanGateDiagram gate={gate} channels={subsystem.channels.length} />}
          <div className="flex gap-3 flex-wrap">
            {subsystem.channels.map((_,idx) => (
              <ChannelBlock key={subsystem.channels[idx].id}
                subsystem={subsystem} channelIndex={idx}
                projectId={projectId} sifId={sifId}
              />
            ))}
          </div>
          <button onClick={() => addCh(projectId, sifId, subsystem.id)}
            className="h-7 px-3 text-xs font-medium flex items-center gap-1.5 rounded-xl border border-gray-200 hover:border-gray-300 transition-all"
            style={{ color:'#6B7280' }}
          ><Plus size={11}/>Ajouter un canal</button>
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────
export function ArchitectureBuilder({ projectId, sifId }: { projectId: string; sifId: string }) {
  const sif      = useAppStore(s => s.projects.find(p=>p.id===projectId)?.sifs.find(s=>s.id===sifId))
  const addSub   = useAppStore(s => s.addSubsystem)
  const addComp  = useAppStore(s => s.addComponent)
  const moveComp = useAppStore(s => s.moveComponent)

  const [activeComp, setActiveComp] = useState<SIFComponent | null>(null)

  // ─ PointerSensor only — library items now use useDraggable, so no conflict ─
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint:{ distance: 5 } }))

  const onDragStart = useCallback(({ active }: DragStartEvent) => {
    const data = active.data.current as any
    if (data?.type === 'component') {
      setActiveComp(data.component ?? null)
    }
  }, [])

  const onDragEnd = useCallback(({ active, over }: DragEndEvent) => {
    setActiveComp(null)
    if (!over || !sif) return

    const aData = active.data.current as any
    const oData = over.data.current   as any

    // ── CASE 1: Library item dropped onto a channel ─────────────────────
    if (aData?.type === 'library') {
      const lib: LibraryComponentEx = aData.lib
      // over must be a channel drop zone
      const toSubId = oData?.subsystemId
      const toChId  = oData?.channelId
      if (!toSubId || !toChId) return
      const toSub = sif.subsystems.find(s => s.id === toSubId)
      const toCh  = toSub?.channels.find(c => c.id === toChId)
      if (!toSub || !toCh) return
      const pfx = `${sif.sifNumber}_${toSub.type==='sensor'?'S':toSub.type==='logic'?'L':'A'}${toSub.channels.indexOf(toCh)+1}.${toCh.components.length+1}`
      addComp(projectId, sifId, toSubId, toChId, libToComp(lib, pfx))
      return
    }

    // ── CASE 2: Canvas component reordered / moved ───────────────────────
    if (aData?.type === 'component') {
      const toSubId = oData?.subsystemId ?? aData.subsystemId
      const toChId  = oData?.channelId   ?? aData.channelId
      const fromSub = sif.subsystems.find(s => s.id === aData.subsystemId)
      const toSub   = sif.subsystems.find(s => s.id === toSubId)
      const fromCh  = fromSub?.channels.find(c => c.id === aData.channelId)
      const toCh    = toSub?.channels.find(c => c.id === toChId)
      if (!fromCh || !toCh) return
      const fromIdx = fromCh.components.findIndex(c => c.id === active.id)
      if (fromIdx === -1) return
      const toIdx = oData?.type === 'component'
        ? toCh.components.findIndex(c => c.id === over.id)
        : toCh.components.length
      moveComp(
        projectId, sifId,
        aData.subsystemId, aData.channelId, fromIdx,
        toSubId, toChId, toIdx === -1 ? toCh.components.length : toIdx,
      )
    }
  }, [sif, addComp, moveComp, projectId, sifId])

  if (!sif) return null

  const TYPES = [
    { type:'sensor'   as SubsystemType, label:'Capteur(s)' },
    { type:'logic'    as SubsystemType, label:'Logique' },
    { type:'actuator' as SubsystemType, label:'Actionneur(s)' },
  ]

  return (
    <div className="flex gap-0 rounded-2xl border border-gray-100 overflow-hidden shadow-sm"
      style={{ minHeight: 460 }}
    >
      {/* Library panel — inside DndContext so useDraggable works */}
      <DndContext sensors={sensors} collisionDetection={closestCenter}
        onDragStart={onDragStart} onDragEnd={onDragEnd}
      >
        <LibraryPanel />

        {/* Canvas */}
        <div className="flex-1 p-4 overflow-auto" style={{ background: BG }}>
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between">
              <p className="text-xs" style={{ color:'#9CA3AF' }}>
                Glisser depuis la bibliothèque · ou cliquer + pour ajouter
              </p>
              <div className="flex gap-1.5">
                {TYPES.map(({ type, label }) => {
                  const exists = sif.subsystems.some(s => s.type === type)
                  const color  = SUB_COLORS[type]
                  const Icon   = SUB_ICONS[type]
                  return (
                    <button key={type} disabled={exists}
                      className="h-7 px-3 text-xs font-semibold flex items-center gap-1.5 rounded-xl border transition-all"
                      style={exists
                        ? { borderColor:`${color}25`, color:`${color}50`, background:`${color}06`, cursor:'default' }
                        : { borderColor:`${color}50`, color, background:'white' }
                      }
                      onMouseEnter={e => { if(!exists) e.currentTarget.style.background=`${color}10` }}
                      onMouseLeave={e => { if(!exists) e.currentTarget.style.background='white' }}
                      onClick={() => !exists && addSub(projectId, sifId, DEFAULT_SUBSYSTEM(type, sif.sifNumber))}
                    ><Icon size={11}/>{exists ? `${label} ✓` : `+ ${label}`}</button>
                  )
                })}
              </div>
            </div>

            {/* Empty state */}
            {sif.subsystems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-2xl"
                style={{ borderColor:'#E5E7EB', background:'white' }}
              >
                <Layers size={28} className="mb-2" style={{ color:'#D1D5DB' }} />
                <p className="text-sm font-medium mb-1" style={{ color:'#9CA3AF' }}>Aucun sous-système</p>
                <p className="text-xs" style={{ color:'#C4C9D4' }}>Ajoutez Capteur, Logique et Actionneur ci-dessus</p>
              </div>
            ) : (
              (['sensor','logic','actuator'] as SubsystemType[])
                .map(type => sif.subsystems.find(s => s.type === type))
                .filter(Boolean)
                .map(sub => (
                  <SubsystemBlock
                    key={sub!.id}
                    subsystem={sub!} projectId={projectId} sifId={sifId}
                  />
                ))
            )}
          </div>
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {activeComp && (
            <div className="rounded-xl border bg-white shadow-2xl px-3 py-2 text-xs font-mono"
              style={{ borderColor:`${TEAL}40` }}
            >
              <p className="font-bold" style={{ color:NAVY }}>{activeComp.tagName}</p>
              <p className="text-[10px]" style={{ color:'#9CA3AF' }}>{activeComp.instrumentType}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
