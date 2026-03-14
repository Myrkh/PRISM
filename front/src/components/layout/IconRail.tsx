/**
 * layout/IconRail.tsx — PRISM v3 (slim)
 *
 * VS Code Activity Bar style.
 * 5 items max. Les 5 outils globaux sont regroupés dans un flyout.
 *
 * Retiré du rail vs v2/v3 :
 *   – FolderPlus / FilePlus  (disponibles dans HomeScreen + ProjectTree)
 *   – ListChecks / History / GitBranch / Cpu / FlaskConical → flyout unique
 */
import { useEffect, useRef, useState } from 'react'
import {
  Home, LayoutGrid,
  ListChecks, History, GitBranch, FlaskConical, Cpu,
  Settings, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { BORDER, RAIL_BG, TEAL, TEXT, TEXT_DIM } from '@/styles/tokens'
import { RailDivider, RailIconButton } from '@/components/layout/RailPrimitives'

// ─── Outils globaux dans le flyout ───────────────────────────────────────
const GLOBAL_TOOLS = [
  { id: 'review-queue' as const, Icon: ListChecks,  label: 'Review Queue'    },
  { id: 'audit-log'   as const, Icon: History,      label: "Journal d'audit" },
  { id: 'sif-history' as const, Icon: GitBranch,    label: 'Historique SIF'  },
  { id: 'engine'      as const, Icon: Cpu,          label: 'Moteur de calcul'},
  { id: 'hazop'       as const, Icon: FlaskConical, label: 'HAZOP / LOPA'    },
] as const

type GlobalToolId = typeof GLOBAL_TOOLS[number]['id']

const GLOBAL_TOOL_IDS = new Set<string>(GLOBAL_TOOLS.map(t => t.id))

// ─── Flyout outils globaux ────────────────────────────────────────────────
function GlobalToolsFlyout({ isActive }: { isActive: boolean }) {
  const navigate = useAppStore(s => s.navigate)
  const view     = useAppStore(s => s.view)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const activeToolId: GlobalToolId | null = GLOBAL_TOOL_IDS.has(view.type)
    ? (view.type as GlobalToolId)
    : null

  return (
    <div className="relative" ref={ref}>
      <RailIconButton
        Icon={LayoutGrid}
        label="Outils globaux"
        onClick={() => setOpen(v => !v)}
        active={isActive || open}
      />

      {open && (
        <div
          className="absolute left-full top-0 ml-2 z-50 w-52 rounded-xl border shadow-2xl py-1.5"
          style={{ background: '#14181C', borderColor: BORDER }}
        >
          <p
            className="px-3 pt-1 pb-2 text-[10px] font-bold uppercase tracking-widest"
            style={{ color: TEXT_DIM }}
          >
            Outils globaux
          </p>
          {GLOBAL_TOOLS.map(({ id, Icon, label }) => {
            const isActiveTool = activeToolId === id
            return (
              <button
                key={id}
                type="button"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-left transition-colors"
                style={{ color: isActiveTool ? TEAL : TEXT_DIM }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#1A1F24'
                  if (!isActiveTool) e.currentTarget.style.color = TEXT
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = isActiveTool ? TEAL : TEXT_DIM
                }}
                onClick={() => { navigate({ type: id }); setOpen(false) }}
              >
                <Icon size={14} />
                {label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── IconRail ─────────────────────────────────────────────────────────────
interface IconRailProps {
  leftOpen:        boolean
  rightOpen:       boolean
  onToggleLeft:    () => void
  onToggleRight:   () => void
  showRightToggle: boolean
  showPanelToggles?: boolean
}

export function IconRail({
  leftOpen, rightOpen, onToggleLeft, onToggleRight, showRightToggle, showPanelToggles = true,
}: IconRailProps) {
  const navigate = useAppStore(s => s.navigate)
  const view     = useAppStore(s => s.view)

  const showHome     = view.type === 'projects'
  const showSettings = view.type === 'settings'
  const isGlobal     = GLOBAL_TOOL_IDS.has(view.type)

  return (
    <div
      className="flex shrink-0 flex-col items-center gap-0.5 py-2 border-r"
      style={{ width: 48, background: RAIL_BG, borderColor: BORDER }}
    >
      {showPanelToggles && (
        <>
          {/* ── Toggles panneaux ── */}
          <RailIconButton
            Icon={leftOpen ? PanelLeftClose : PanelLeftOpen}
            label={leftOpen ? 'Réduire le panneau' : 'Afficher le panneau'}
            onClick={onToggleLeft}
            active={leftOpen}
          />
          {showRightToggle && (
            <RailIconButton
              Icon={rightOpen ? PanelRightClose : PanelRightOpen}
              label={rightOpen ? 'Réduire les propriétés' : 'Afficher les propriétés'}
              onClick={onToggleRight}
              active={rightOpen}
            />
          )}

          <RailDivider />
        </>
      )}

      {/* ── Navigation ── */}
      <RailIconButton
        Icon={Home}
        label="Accueil — Projets"
        onClick={() => navigate({ type: 'projects' })}
        active={showHome}
      />

      <RailDivider />

      {/* ── Outils globaux (flyout) ── */}
      <GlobalToolsFlyout isActive={isGlobal} />

      {/* ── Bas : settings ── */}
      <div className="flex-1" />
      <RailDivider />
      <RailIconButton
        Icon={Settings}
        label="Paramètres"
        onClick={() => navigate({ type: 'settings', section: 'general' })}
        active={showSettings}
      />
    </div>
  )
}
