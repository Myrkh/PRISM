/**
 * LoopEditorRightPanel — PRISM v3 (refactored)
 *
 * Right panel for Loop Editor tab:
 *   📚 Bibliothèque — built-in + custom components (draggable)
 *   ⚙  Composant    — selected component parameter editor
 *
 * Custom library items stored in localStorage (future: Supabase table).
 */

import { useEffect, useState } from 'react'
import {
  Activity, Cpu, Zap, GripVertical, Plus, Trash2, Save, X,
  ChevronDown, ChevronRight, MousePointer2,
  BookOpen, Settings2,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { ComponentParamsPanel } from './ComponentParamsPanel'
import type { SubsystemType, SIF } from '@/core/types'
import { LIBRARY_CATALOG, type LibraryCatalogItem } from '@/features/library'
import { BORDER, CARD_BG, PAGE_BG, PANEL_BG, R, TEAL, TEAL_DIM, TEXT, TEXT_DIM, dark } from '@/styles/tokens'

const PANEL = dark.panel
const CARD  = dark.card
const BG    = dark.page

// ─── Subsystem meta ──────────────────────────────────────────────────────
const SUB_META: Record<SubsystemType, { color: string; label: string; Icon: React.ElementType }> = {
  sensor:   { color: '#0284C7', label: 'Capteur(s)',    Icon: Activity },
  logic:    { color: '#7C3AED', label: 'Logique',       Icon: Cpu      },
  actuator: { color: '#EA580C', label: 'Actionneur(s)', Icon: Zap      },
}

// ─── Custom library persistence (localStorage) ──────────────────────────
const CUSTOM_LIB_KEY = 'prism-custom-library'

function loadCustomLib(): LibraryCatalogItem[] {
  try {
    const raw = localStorage.getItem(CUSTOM_LIB_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveCustomLib(items: LibraryCatalogItem[]) {
  localStorage.setItem(CUSTOM_LIB_KEY, JSON.stringify(items))
}

// ─── Tab definitions ─────────────────────────────────────────────────────
type PanelTab = 'library' | 'component'
const TABS: { id: PanelTab; label: string; Icon: React.ElementType }[] = [
  { id: 'library',   label: 'Bibliothèque', Icon: BookOpen  },
  { id: 'component', label: 'Composant',    Icon: Settings2 },
]

// ─── Add custom component form ──────────────────────────────────────────
function AddCustomForm({ type, color, onAdd, onCancel }: {
  type: SubsystemType; color: string
  onAdd: (item: LibraryCatalogItem) => void
  onCancel: () => void
}) {
  const [name, setName]     = useState('')
  const [lambda, setLambda] = useState('5.0')
  const [dc, setDc]         = useState('0.70')

  const catMap: Record<SubsystemType, string> = {
    sensor: 'Custom Capteur', logic: 'Custom Logique', actuator: 'Custom Actionneur',
  }

  const submit = () => {
    if (!name.trim()) return
    onAdd({
      type,
      category: catMap[type],
      name: name.trim(),
      lambda: parseFloat(lambda) || 5.0,
      dc: parseFloat(dc) || 0.70,
    })
  }

  return (
    <div className="px-3 py-2 space-y-2 border-b" style={{ borderColor: BORDER, background: `${color}08` }}>
      <div className="flex items-center gap-1.5">
        <Plus size={10} style={{ color }} />
        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color }}>Nouveau composant</span>
        <button onClick={onCancel} className="ml-auto p-0.5 rounded hover:bg-white/10"><X size={10} style={{ color: TEXT_DIM }} /></button>
      </div>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom du composant"
        autoFocus onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onCancel() }}
        className="w-full h-7 px-2 text-xs rounded border outline-none transition-colors"
        style={{ background: '#141A21', borderColor: `${color}40`, color: TEXT }}
      />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[8px] font-bold uppercase" style={{ color: TEXT_DIM }}>λ (×10⁻⁶ h⁻¹)</label>
          <input type="number" step="0.1" value={lambda} onChange={e => setLambda(e.target.value)}
            className="w-full h-6 px-2 text-[10px] font-mono rounded border outline-none"
            style={{ background: '#141A21', borderColor: BORDER, color: TEXT }} />
        </div>
        <div>
          <label className="text-[8px] font-bold uppercase" style={{ color: TEXT_DIM }}>DC (0–1)</label>
          <input type="number" step="0.05" min="0" max="1" value={dc} onChange={e => setDc(e.target.value)}
            className="w-full h-6 px-2 text-[10px] font-mono rounded border outline-none"
            style={{ background: '#141A21', borderColor: BORDER, color: TEXT }} />
        </div>
      </div>
      <button onClick={submit} disabled={!name.trim()}
        className="w-full h-7 text-[10px] font-bold rounded flex items-center justify-center gap-1 transition-all disabled:opacity-30"
        style={{ background: color, color: '#fff' }}>
        <Save size={10} />Ajouter à la bibliothèque
      </button>
    </div>
  )
}

// ─── Library content ─────────────────────────────────────────────────────
function LibraryContent({ sif }: { sif: SIF }) {
  const [search, setSearch]       = useState('')
  const [openTypes, setOpenTypes] = useState<Set<SubsystemType>>(new Set(['sensor', 'logic', 'actuator']))
  const [addingType, setAddingType] = useState<SubsystemType | null>(null)
  const [customItems, setCustomItems] = useState<LibraryCatalogItem[]>(() => loadCustomLib())

  const toggle = (t: SubsystemType) => setOpenTypes(prev => {
    const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); return n
  })

  const allItems = [...LIBRARY_CATALOG, ...customItems]

  const filtered = allItems.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.category.toLowerCase().includes(search.toLowerCase())
  )

  const addCustom = (item: LibraryCatalogItem) => {
    const next = [...customItems, item]
    setCustomItems(next)
    saveCustomLib(next)
    setAddingType(null)
  }

  const removeCustom = (idx: number) => {
    // idx relative to customItems array
    const next = customItems.filter((_, i) => i !== idx)
    setCustomItems(next)
    saveCustomLib(next)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-3 py-2.5 shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un composant…"
          className="w-full rounded-md border px-2.5 py-1.5 text-xs outline-none transition-colors"
          style={{ background: BG, borderColor: BORDER, color: TEXT }}
          onFocus={e => (e.target.style.borderColor = TEAL)}
          onBlur={e => (e.target.style.borderColor = BORDER)} />
      </div>

      {/* Hint */}
      <div className="px-3 py-2 shrink-0 flex items-center gap-1.5"
        style={{ background: `${TEAL}08`, borderBottom: `1px solid ${BORDER}` }}>
        <GripVertical size={10} style={{ color: TEAL_DIM }} />
        <p className="text-[9px]" style={{ color: TEAL_DIM }}>
          Glissez un composant sur le canal de votre choix
        </p>
      </div>

      {/* Grouped list */}
      <div className="flex-1 overflow-y-auto">
        {(['sensor', 'logic', 'actuator'] as SubsystemType[]).map(type => {
          const meta    = SUB_META[type]
          const builtin = filtered.filter(l => l.type === type && !customItems.includes(l))
          const custom  = customItems.filter(l => l.type === type &&
            (l.name.toLowerCase().includes(search.toLowerCase()) || l.category.toLowerCase().includes(search.toLowerCase())))
          const items   = [...builtin, ...custom]
          const open    = openTypes.has(type)
          const exists  = sif.subsystems.some(s => s.type === type)

          return (
            <div key={type}>
              {/* Category header */}
              <div className="flex w-full items-center gap-2 px-3 py-2 transition-colors hover:bg-[#1E242B]"
                style={{ borderBottom: `1px solid ${BORDER}` }}>
                <button onClick={() => toggle(type)} className="flex items-center gap-2 flex-1 min-w-0">
                  <meta.Icon size={12} style={{ color: meta.color }} />
                  <span className="text-[10px] font-bold uppercase tracking-widest flex-1 text-left"
                    style={{ color: meta.color }}>{meta.label}</span>
                  {!exists && (
                    <span className="text-[8px] px-1 py-0.5 rounded"
                      style={{ background: `${meta.color}20`, color: meta.color }}>non ajouté</span>
                  )}
                  <span className="text-[9px] font-mono" style={{ color: TEXT_DIM }}>{items.length}</span>
                  {open ? <ChevronDown size={10} style={{ color: TEXT_DIM }}/> : <ChevronRight size={10} style={{ color: TEXT_DIM }}/>}
                </button>
                {/* Add custom button */}
                <button onClick={() => setAddingType(addingType === type ? null : type)}
                  className="p-0.5 rounded transition-colors hover:bg-white/10"
                  style={{ color: addingType === type ? meta.color : TEXT_DIM }}
                  title="Ajouter un composant custom">
                  <Plus size={11} />
                </button>
              </div>

              {/* Add form */}
              {addingType === type && (
                <AddCustomForm type={type} color={meta.color} onAdd={addCustom} onCancel={() => setAddingType(null)} />
              )}

              {/* Items */}
              {open && items.map((lib, globalIdx) => {
                const isCustom = customItems.includes(lib)
                const customIdx = isCustom ? customItems.indexOf(lib) : -1

                return (
                  <div key={`${lib.name}-${globalIdx}`}
                    draggable
                    onDragStart={e => {
                      e.dataTransfer.setData('application/prism-lib', JSON.stringify(lib))
                      e.dataTransfer.effectAllowed = 'copy'
                    }}
                    className="group flex items-center gap-2 px-3 py-2.5 cursor-grab active:cursor-grabbing transition-colors hover:bg-[#1E242B]"
                    style={{ borderBottom: `1px solid ${BORDER}30` }}>
                    <GripVertical size={11} className="shrink-0 opacity-40 group-hover:opacity-80"
                      style={{ color: meta.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-medium truncate" style={{ color: TEXT }}>{lib.name}</p>
                        {isCustom && (
                          <span className="text-[7px] font-bold px-1 rounded" style={{ background: `${meta.color}20`, color: meta.color }}>CUSTOM</span>
                        )}
                      </div>
                      <p className="text-[9px] truncate" style={{ color: TEXT_DIM }}>{lib.category}</p>
                    </div>
                    <div className="shrink-0 flex items-center gap-1">
                      <div className="text-right opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-[8px] font-mono" style={{ color: meta.color }}>λ {lib.lambda}</p>
                        <p className="text-[8px] font-mono" style={{ color: TEXT_DIM }}>DC {(lib.dc * 100).toFixed(0)}%</p>
                      </div>
                      {isCustom && (
                        <button onClick={(e) => { e.stopPropagation(); removeCustom(customIdx) }}
                          className="p-0.5 rounded opacity-0 group-hover:opacity-100 transition-all hover:bg-red-900/30"
                          style={{ color: '#F87171' }}
                          title="Supprimer"><Trash2 size={10} /></button>
                      )}
                    </div>
                  </div>
                )
              })}

              {open && items.length === 0 && (
                <div className="px-3 py-3 text-center">
                  <p className="text-[9px]" style={{ color: TEXT_DIM }}>Aucun composant — cliquez + pour en créer</p>
                </div>
              )}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="px-3 py-8 text-center">
            <p className="text-xs" style={{ color: TEXT_DIM }}>Aucun résultat pour "{search}"</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Empty component state ──────────────────────────────────────────────
function EmptyComponentState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 px-6 py-10">
      <div className="w-14 h-14 rounded-2xl border-2 border-dashed flex items-center justify-center"
        style={{ borderColor: `${TEAL}30` }}>
        <MousePointer2 size={22} style={{ color: `${TEAL}60` }} />
      </div>
      <div className="text-center space-y-1.5">
        <p className="text-sm font-semibold" style={{ color: TEXT }}>Aucun composant sélectionné</p>
        <p className="text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
          Cliquez sur un composant dans le canvas pour éditer ses paramètres ici.
        </p>
      </div>
      <div className="w-full rounded-lg border p-3" style={{ background: `${TEAL}08`, borderColor: `${TEAL}25` }}>
        <p className="text-[10px] leading-relaxed" style={{ color: TEAL_DIM }}>
          💡 Glissez un composant depuis la <strong>Bibliothèque</strong> sur un canal du canvas.
        </p>
      </div>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────
interface Props { sif: SIF; projectId: string }

export function LoopEditorRightPanel({ sif, projectId }: Props) {
  const selectedId      = useAppStore(s => s.selectedComponentId)
  const selectComponent = useAppStore(s => s.selectComponent)
  const [activeTab, setActiveTab] = useState<PanelTab>('library')

  // Auto-switch to component tab when a component is selected
  useEffect(() => { if (selectedId) setActiveTab('component') }, [selectedId])

  // Find the selected component in the SIF
  let found: {
    comp: (typeof sif.subsystems)[0]['channels'][0]['components'][0]
    subsystemType: SubsystemType
    subsystemId: string
    channelId: string
  } | null = null

  if (selectedId) {
    outer: for (const sub of sif.subsystems) {
      for (const ch of sub.channels) {
        const comp = ch.components.find(c => c.id === selectedId)
        if (comp) { found = { comp, subsystemType: sub.type, subsystemId: sub.id, channelId: ch.id }; break outer }
      }
    }
  }

  const activeIdx = TABS.findIndex(t => t.id === activeTab)

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: PANEL }}>
      {/* Tab bar */}
      <div className="px-3 pt-3 shrink-0">
        <div className="flex items-end" style={{ borderBottom: `1px solid ${BORDER}` }}>
          {TABS.map((tab) => {
            const isActive = tab.id === activeTab
            const hasBadge = tab.id === 'component' && !!selectedId
            return (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                className="relative flex items-center gap-1.5 px-3 py-2 text-left transition-colors shrink-0"
                style={isActive ? {
                  background: CARD, borderTop: `1px solid ${BORDER}`, borderLeft: `1px solid ${BORDER}`,
                  borderRight: `1px solid ${BORDER}`, borderBottom: `1px solid ${CARD}`,
                  borderRadius: `${R}px ${R}px 0 0`, color: TEAL_DIM, marginBottom: '-1px', zIndex: 10,
                } : { color: TEXT_DIM }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = TEXT }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = TEXT_DIM }}>
                <tab.Icon size={11} />
                <span className="text-[12px] font-semibold whitespace-nowrap">{tab.label}</span>
                {hasBadge && <span className="w-1.5 h-1.5 rounded-full" style={{ background: isActive ? TEAL : `${TEAL}80` }} />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Card body */}
      <div className="flex-1 overflow-hidden"
        style={{
          background: CARD, borderLeft: `1px solid ${BORDER}`, borderRight: `1px solid ${BORDER}`,
          borderBottom: `1px solid ${BORDER}`,
          borderRadius: `${activeIdx === 0 ? 0 : R}px ${activeIdx === TABS.length - 1 ? 0 : R}px ${R}px ${R}px`,
          margin: '0 12px 12px',
        }}>
        {activeTab === 'library' && <LibraryContent sif={sif} />}
        {activeTab === 'component' && (
          found ? (
            <ComponentParamsPanel component={found.comp} subsystemType={found.subsystemType}
              projectId={projectId} sifId={sif.id} subsystemId={found.subsystemId} channelId={found.channelId}
              onClose={() => { selectComponent(null); setActiveTab('library') }} />
          ) : <EmptyComponentState />
        )}
      </div>
    </div>
  )
}
