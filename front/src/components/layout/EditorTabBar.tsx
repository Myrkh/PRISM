/**
 * layout/EditorTabBar.tsx — PRISM v3
 *
 * EditorTabBar     : tabs génériques style VS Code (pour tout ce qui n'est pas SIF).
 * SIFLifecycleBar  : stepper cycle de vie SIF (IEC 61511) — Cockpit | 1→4 | Rapport.
 * EditorContent    : wrapper zone principale.
 */
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react'
import { type ReactNode } from 'react'
import type { CanonicalSIFTab } from '@/store/types'
import { BORDER, TEAL, TEXT, TEXT_DIM } from '@/styles/tokens'
import { cn } from '@/lib/utils'

// ─── EditorTabBar (générique) ─────────────────────────────────────────────
export function EditorTabBar<T extends string>({
  tabs, active, onSelect,
}: {
  tabs: readonly { id: T; label: string; badge?: string | number }[]
  active: T
  onSelect: (id: T) => void
}) {
  return (
    <div
      className="flex items-end border-b shrink-0"
      style={{ borderColor: BORDER, background: '#0F1318' }}
    >
      {tabs.map(tab => {
        const isActive = tab.id === active
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            className="relative flex items-center gap-1.5 px-4 transition-colors shrink-0"
            style={{
              height: 36,
              color:        isActive ? TEXT    : TEXT_DIM,
              borderBottom: isActive ? `2px solid ${TEAL}` : '2px solid transparent',
              fontWeight:   isActive ? 600 : 400,
              fontSize:     13,
              background:   isActive ? '#14181C' : 'transparent',
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = TEXT }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = TEXT_DIM }}
          >
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className="inline-flex items-center justify-center rounded-full min-w-[16px] h-4 px-1 text-[10px] font-bold"
                style={{
                  background: isActive ? '#009BA430' : '#2A3138',
                  color:      isActive ? TEAL        : TEXT_DIM,
                }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── SIFLifecycleBar ──────────────────────────────────────────────────────
/**
 * Stepper horizontal représentant le cycle de vie d'une SIF (IEC 61511).
 * Structure :  [Cockpit] | [1 Contexte] → [2 Architecture] → [3 Vérification] → [4 Exploitation] | [Rapport ↗]
 *
 * Cockpit  = hub toujours accessible, pas de numéro de phase
 * Étapes 1-4 = phases successives IEC 61511 (SRS → conception → calcul → exploitation)
 * Rapport  = action finale, stylistiquement différenciée (orange)
 */
type PhaseEntry = {
  id: CanonicalSIFTab
  label: string
  step: string | null   // numéro de phase (null pour Cockpit et Rapport)
  accent: string
}

const LIFECYCLE_PHASES: PhaseEntry[] = [
  { id: 'cockpit',      label: 'Cockpit',      step: null, accent: '#4FD1C5' },
  { id: 'context',      label: 'Contexte',     step: '1',  accent: '#60A5FA' },
  { id: 'architecture', label: 'Architecture', step: '2',  accent: '#F59E0B' },
  { id: 'verification', label: 'Vérification', step: '3',  accent: '#A78BFA' },
  { id: 'exploitation', label: 'Exploitation', step: '4',  accent: '#34D399' },
  { id: 'report',       label: 'Rapport',      step: null, accent: '#F97316' },
]

const PHASES_STEPS = LIFECYCLE_PHASES.filter(p => p.step !== null)  // steps 1-4

function PhaseBtn({
  phase, isActive, onClick,
}: {
  phase: PhaseEntry; isActive: boolean; onClick: () => void
}) {
  const isReport = phase.id === 'report'

  return (
    <button
      type="button"
      onClick={onClick}
      title={phase.label}
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium transition-all shrink-0"
      style={{
        color:      isActive ? phase.accent : TEXT_DIM,
        background: isActive ? `${phase.accent}14` : 'transparent',
        border:     `1px solid ${isActive ? `${phase.accent}35` : 'transparent'}`,
        fontWeight: isActive ? 600 : 400,
      }}
      onMouseEnter={e => {
        if (!isActive) {
          e.currentTarget.style.color = TEXT
          e.currentTarget.style.background = '#1A1F24'
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          e.currentTarget.style.color = TEXT_DIM
          e.currentTarget.style.background = 'transparent'
        }
      }}
    >
      {/* Numéro de phase (steps 1-4 seulement) */}
      {phase.step && (
        <span
          className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold shrink-0"
          style={{
            background: isActive ? phase.accent : '#2A3138',
            color:      isActive ? '#0F1318' : TEXT_DIM,
          }}
        >
          {phase.step}
        </span>
      )}
      <span>{phase.label}</span>
      {isReport && (
        <span className="text-[10px] opacity-70">↗</span>
      )}
    </button>
  )
}

export function SIFLifecycleBar({
  active,
  onSelect,
}: {
  active: CanonicalSIFTab
  onSelect: (id: CanonicalSIFTab) => void
}) {
  const cockpit = LIFECYCLE_PHASES[0]
  const report  = LIFECYCLE_PHASES[LIFECYCLE_PHASES.length - 1]

  return (
    <div
      className="flex items-center shrink-0 px-3 border-b gap-0.5 overflow-x-auto"
      style={{ borderColor: BORDER, background: '#0F1318', height: 40, scrollbarWidth: 'none' }}
    >
      {/* Cockpit — hub */}
      <PhaseBtn phase={cockpit} isActive={active === 'cockpit'} onClick={() => onSelect('cockpit')} />

      {/* Séparateur */}
      <div className="shrink-0 mx-1.5 h-5 w-px" style={{ background: BORDER }} />

      {/* Étapes 1–4 avec flèches */}
      {PHASES_STEPS.map((phase, i) => (
        <div key={phase.id} className="flex items-center">
          {i > 0 && (
            <span className="mx-1 text-[11px] select-none shrink-0" style={{ color: TEXT_DIM }}>›</span>
          )}
          <PhaseBtn phase={phase} isActive={active === phase.id} onClick={() => onSelect(phase.id)} />
        </div>
      ))}

      {/* Séparateur + Rapport à droite */}
      <div className="flex-1" />
      <div className="shrink-0 mx-1.5 h-5 w-px" style={{ background: BORDER }} />
      <PhaseBtn phase={report} isActive={active === 'report'} onClick={() => onSelect('report')} />
    </div>
  )
}

function WorkbenchToggle({
  open,
  onClick,
  side,
}: {
  open: boolean
  onClick: () => void
  side: 'left' | 'right'
}) {
  const Icon = side === 'left'
    ? (open ? PanelLeftClose : PanelLeftOpen)
    : (open ? PanelRightClose : PanelRightOpen)
  const label = side === 'left'
    ? (open ? 'Réduire le panneau gauche' : 'Afficher le panneau gauche')
    : (open ? 'Réduire le panneau droit' : 'Afficher le panneau droit')

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors shrink-0"
      style={{
        borderColor: open ? `${TEAL}35` : BORDER,
        background: open ? '#142030' : 'transparent',
        color: open ? TEAL : TEXT_DIM,
      }}
      onMouseEnter={e => {
        if (!open) {
          e.currentTarget.style.background = '#1A1F24'
          e.currentTarget.style.color = TEXT
        }
      }}
      onMouseLeave={e => {
        if (!open) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = TEXT_DIM
        }
      }}
    >
      <Icon size={15} />
    </button>
  )
}

export function SIFWorkbenchBar({
  active,
  onSelect,
  leftOpen,
  rightOpen,
  onToggleLeft,
  onToggleRight,
}: {
  active: CanonicalSIFTab
  onSelect: (id: CanonicalSIFTab) => void
  leftOpen: boolean
  rightOpen: boolean
  onToggleLeft: () => void
  onToggleRight: () => void
}) {
  const cockpit = LIFECYCLE_PHASES[0]
  const report  = LIFECYCLE_PHASES[LIFECYCLE_PHASES.length - 1]

  return (
    <div
      className="flex items-center gap-2 border-b px-3 shrink-0"
      style={{ borderColor: BORDER, background: '#0F1318', height: 40 }}
    >
      <WorkbenchToggle open={leftOpen} onClick={onToggleLeft} side="left" />
      <div className="shrink-0 h-5 w-px" style={{ background: BORDER }} />
      <div className="min-w-0 flex flex-1 items-center gap-0.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        <PhaseBtn phase={cockpit} isActive={active === 'cockpit'} onClick={() => onSelect('cockpit')} />
        <div className="shrink-0 mx-1.5 h-5 w-px" style={{ background: BORDER }} />
        {PHASES_STEPS.map((phase, index) => (
          <div key={phase.id} className="flex items-center">
            {index > 0 && (
              <span className="mx-1 text-[11px] select-none shrink-0" style={{ color: TEXT_DIM }}>›</span>
            )}
            <PhaseBtn phase={phase} isActive={active === phase.id} onClick={() => onSelect(phase.id)} />
          </div>
        ))}
        <div className="flex-1" />
        <div className="shrink-0 mx-1.5 h-5 w-px" style={{ background: BORDER }} />
        <PhaseBtn phase={report} isActive={active === 'report'} onClick={() => onSelect('report')} />
      </div>
      <div className="shrink-0 h-5 w-px" style={{ background: BORDER }} />
      <WorkbenchToggle open={rightOpen} onClick={onToggleRight} side="right" />
    </div>
  )
}

// ─── EditorContent ────────────────────────────────────────────────────────
export function EditorContent({
  children, className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn('flex-1 min-h-0 overflow-hidden', className)}
      style={{ background: '#14181C' }}
    >
      {children}
    </div>
  )
}
