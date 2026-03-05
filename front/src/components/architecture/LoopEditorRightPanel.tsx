/**
 * LoopEditorRightPanel — PRISM v3
 *
 * Panneau droit contextuel pour l'onglet Loop Editor.
 * S'affiche via setRightPanelOverride dès que l'onglet architecture est actif.
 *
 * 2 onglets intercalaires (même style que le reste de l'app) :
 *
 *  📚 Bibliothèque  — liste des composants à glisser sur le canvas
 *                     (visible quand rien n'est sélectionné)
 *  ⚙  Composant     — ComponentParamsPanel du composant sélectionné
 *                     (empty-state si rien sélectionné)
 *
 * Comportement :
 *  – sélection d'un composant → bascule auto sur "Composant"
 *  – désélection              → reste sur "Composant" (empty-state)
 *  – clic sur "Bibliothèque"  → toujours accessible manuellement
 */

import { useEffect, useState } from 'react'
import {
  Activity, Cpu, Zap, GripVertical,
  ChevronDown, ChevronRight, MousePointer2,
  BookOpen, Settings2,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { ComponentParamsPanel } from './ComponentParamsPanel'
import type { SubsystemType, SIF } from '@/core/types'

// ─── Design tokens ────────────────────────────────────────────────────────
const PANEL    = '#14181C'
const CARD     = '#23292F'
const BG       = '#1A1F24'
const BORDER   = '#2A3138'
const TEXT     = '#DFE8F1'
const TEXT_DIM = '#8FA0B1'
const TEAL     = '#009BA4'
const TEAL_DIM = '#5FD8D2'
const R        = 8

// ─── Subsystem meta ───────────────────────────────────────────────────────
const SUB_META: Record<SubsystemType, { color: string; label: string; Icon: React.ElementType }> = {
  sensor:   { color: '#0284C7', label: 'Capteur(s)',    Icon: Activity },
  logic:    { color: '#7C3AED', label: 'Logique',       Icon: Cpu      },
  actuator: { color: '#EA580C', label: 'Actionneur(s)', Icon: Zap      },
}

// ─── Library catalogue ────────────────────────────────────────────────────
export const LIBRARY_ITEMS: {
  type: SubsystemType; category: string; name: string; lambda: number; dc: number
}[] = [
  { type: 'sensor',   category: 'Transmetteur',  name: 'PT (pression)',    lambda: 1.5,  dc: 0.70 },
  { type: 'sensor',   category: 'Transmetteur',  name: 'TT (température)', lambda: 1.2,  dc: 0.65 },
  { type: 'sensor',   category: 'Transmetteur',  name: 'FT (débit)',       lambda: 2.0,  dc: 0.70 },
  { type: 'sensor',   category: 'Transmetteur',  name: 'LT (niveau)',      lambda: 1.8,  dc: 0.65 },
  { type: 'sensor',   category: 'Pressoswitche', name: 'PS (pression)',    lambda: 3.5,  dc: 0.50 },
  { type: 'sensor',   category: 'Pressoswitche', name: 'TS (température)', lambda: 2.8,  dc: 0.45 },
  { type: 'logic',    category: 'PLC Sécurité',  name: 'Safety PLC',       lambda: 0.25, dc: 0.99 },
  { type: 'logic',    category: 'PLC Sécurité',  name: 'Safety Controller',lambda: 0.30, dc: 0.99 },
  { type: 'logic',    category: 'Relais',        name: 'Relais sécurité',  lambda: 0.8,  dc: 0.90 },
  { type: 'logic',    category: 'Relais',        name: 'Relais interposé', lambda: 1.2,  dc: 0.85 },
  { type: 'actuator', category: 'Vanne',         name: 'Vanne on/off',     lambda: 5.0,  dc: 0.65 },
  { type: 'actuator', category: 'Vanne',         name: 'Vanne solénoïde',  lambda: 3.5,  dc: 0.65 },
  { type: 'actuator', category: 'Vanne',         name: 'Vanne motorisée',  lambda: 4.5,  dc: 0.60 },
  { type: 'actuator', category: 'Pompe',         name: "Pompe d'arrêt",    lambda: 4.0,  dc: 0.60 },
  { type: 'actuator', category: 'Pompe',         name: 'Compresseur',      lambda: 6.0,  dc: 0.55 },
]

// ─── Tab definitions ──────────────────────────────────────────────────────
type PanelTab = 'library' | 'component'
const TABS: { id: PanelTab; label: string; Icon: React.ElementType }[] = [
  { id: 'library',   label: 'Bibliothèque', Icon: BookOpen  },
  { id: 'component', label: 'Composant',    Icon: Settings2 },
]

// ─── Library content ──────────────────────────────────────────────────────
function LibraryContent({ sif }: { sif: SIF }) {
  const [search, setSearch]     = useState('')
  const [openTypes, setOpenTypes] = useState<Set<SubsystemType>>(
    new Set(['sensor', 'logic', 'actuator'])
  )

  const toggle = (t: SubsystemType) => setOpenTypes(prev => {
    const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); return n
  })

  const filtered = LIBRARY_ITEMS.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.category.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-3 py-2.5 shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un composant…"
          className="w-full rounded-md border px-2.5 py-1.5 text-xs outline-none transition-colors"
          style={{ background: BG, borderColor: BORDER, color: TEXT }}
          onFocus={e => (e.target.style.borderColor = TEAL)}
          onBlur={e => (e.target.style.borderColor = BORDER)}
        />
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
          const meta  = SUB_META[type]
          const items = filtered.filter(l => l.type === type)
          const open  = openTypes.has(type)
          if (!items.length) return null

          // Check if this subsystem type exists in current SIF
          const exists = sif.subsystems.some(s => s.type === type)

          return (
            <div key={type}>
              {/* Category header */}
              <button
                onClick={() => toggle(type)}
                className="flex w-full items-center gap-2 px-3 py-2 transition-colors hover:bg-[#1E242B]"
                style={{ borderBottom: `1px solid ${BORDER}` }}
              >
                <meta.Icon size={12} style={{ color: meta.color }} />
                <span className="text-[10px] font-bold uppercase tracking-widest flex-1 text-left"
                  style={{ color: meta.color }}>
                  {meta.label}
                </span>
                {!exists && (
                  <span className="text-[8px] px-1 py-0.5 rounded"
                    style={{ background: `${meta.color}20`, color: meta.color }}>
                    non ajouté
                  </span>
                )}
                {open ? <ChevronDown size={10} style={{ color: TEXT_DIM }}/> : <ChevronRight size={10} style={{ color: TEXT_DIM }}/>}
              </button>

              {open && items.map((lib, i) => (
                <div
                  key={i}
                  draggable
                  onDragStart={e => {
                    e.dataTransfer.setData('application/prism-lib', JSON.stringify(lib))
                    e.dataTransfer.effectAllowed = 'copy'
                  }}
                  className="group flex items-center gap-2 px-3 py-2.5 cursor-grab active:cursor-grabbing transition-colors hover:bg-[#1E242B]"
                  style={{ borderBottom: `1px solid ${BORDER}30` }}
                >
                  <GripVertical size={11} className="shrink-0 opacity-40 group-hover:opacity-80"
                    style={{ color: meta.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: TEXT }}>{lib.name}</p>
                    <p className="text-[9px] truncate" style={{ color: TEXT_DIM }}>{lib.category}</p>
                  </div>
                  <div className="shrink-0 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[8px] font-mono" style={{ color: meta.color }}>λ {lib.lambda}</p>
                    <p className="text-[8px] font-mono" style={{ color: TEXT_DIM }}>DC {(lib.dc * 100).toFixed(0)}%</p>
                  </div>
                </div>
              ))}
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

// ─── Empty component state ────────────────────────────────────────────────
function EmptyComponentState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 px-6 py-10">
      {/* Icon */}
      <div className="w-14 h-14 rounded-2xl border-2 border-dashed flex items-center justify-center"
        style={{ borderColor: `${TEAL}30` }}>
        <MousePointer2 size={22} style={{ color: `${TEAL}60` }} />
      </div>

      {/* Text */}
      <div className="text-center space-y-1.5">
        <p className="text-sm font-semibold" style={{ color: TEXT }}>
          Aucun composant sélectionné
        </p>
        <p className="text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
          Cliquez sur un composant dans le canvas pour éditer ses paramètres ici.
        </p>
      </div>

      {/* Tip */}
      <div className="w-full rounded-lg border p-3"
        style={{ background: `${TEAL}08`, borderColor: `${TEAL}25` }}>
        <p className="text-[10px] leading-relaxed" style={{ color: TEAL_DIM }}>
          💡 Vous pouvez aussi glisser un composant depuis l'onglet{' '}
          <strong>Bibliothèque</strong> directement sur un canal du canvas.
        </p>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────
interface Props {
  sif: SIF
  projectId: string
}

export function LoopEditorRightPanel({ sif, projectId }: Props) {
  const selectedId      = useAppStore(s => s.selectedComponentId)
  const selectComponent = useAppStore(s => s.selectComponent)
  const [activeTab, setActiveTab] = useState<PanelTab>('library')

  // Auto-switch to component tab when a component is selected
  useEffect(() => {
    if (selectedId) setActiveTab('component')
  }, [selectedId])

  // Find the selected component in the SIF
  type FoundComp = {
    comp: ReturnType<typeof sif.subsystems[0]['channels'][0]['components'][0]['id'] extends string ? () => typeof sif.subsystems[0]['channels'][0]['components'][0] : never>
    subsystemType: SubsystemType
    subsystemId: string
    channelId: string
  } | null

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
        if (comp) {
          found = { comp, subsystemType: sub.type, subsystemId: sub.id, channelId: ch.id }
          break outer
        }
      }
    }
  }

  const activeIdx = TABS.findIndex(t => t.id === activeTab)

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: PANEL }}>

      {/* ── Tab bar intercalaire ── */}
      <div className="px-3 pt-3 shrink-0">
        <div className="flex items-end" style={{ borderBottom: `1px solid ${BORDER}` }}>
          {TABS.map((tab, i) => {
            const isActive = tab.id === activeTab
            // Badge on "component" tab when something is selected
            const hasBadge = tab.id === 'component' && !!selectedId

            return (
              <button key={tab.id} type="button"
                onClick={() => setActiveTab(tab.id)}
                className="relative flex items-center gap-1.5 px-3 py-2 text-left transition-colors shrink-0"
                style={isActive ? {
                  background:   CARD,
                  borderTop:    `1px solid ${BORDER}`,
                  borderLeft:   `1px solid ${BORDER}`,
                  borderRight:  `1px solid ${BORDER}`,
                  borderBottom: `1px solid ${CARD}`,
                  borderRadius: `${R}px ${R}px 0 0`,
                  color:        TEAL_DIM,
                  marginBottom: '-1px',
                  zIndex:       10,
                } : {
                  color: TEXT_DIM,
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = TEXT }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = TEXT_DIM }}
              >
                <tab.Icon size={11} />
                <span className="text-[12px] font-semibold whitespace-nowrap">{tab.label}</span>

                {/* Live dot when component selected */}
                {hasBadge && (
                  <span className="w-1.5 h-1.5 rounded-full"
                    style={{ background: isActive ? TEAL : `${TEAL}80` }} />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Card body — dynamic corners matching active tab ── */}
      <div className="flex-1 overflow-hidden"
        style={{
          background: CARD,
          borderLeft:   `1px solid ${BORDER}`,
          borderRight:  `1px solid ${BORDER}`,
          borderBottom: `1px solid ${BORDER}`,
          borderRadius: `${activeIdx === 0 ? 0 : R}px ${activeIdx === TABS.length - 1 ? 0 : R}px ${R}px ${R}px`,
          margin: '0 12px 12px',
        }}
      >
        {activeTab === 'library' && <LibraryContent sif={sif} />}

        {activeTab === 'component' && (
          found ? (
            <ComponentParamsPanel
              component={found.comp}
              subsystemType={found.subsystemType}
              projectId={projectId}
              sifId={sif.id}
              subsystemId={found.subsystemId}
              channelId={found.channelId}
              onClose={() => {
                selectComponent(null)
                setActiveTab('library')
              }}
            />
          ) : (
            <EmptyComponentState />
          )
        )}
      </div>
    </div>
  )
}
