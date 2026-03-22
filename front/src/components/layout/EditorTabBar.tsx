/**
 * layout/EditorTabBar.tsx — PRISM v3
 *
 * EditorTabBar    : tabs génériques style VS Code (pour tout ce qui n'est pas SIF).
 * SIFLifecycleBar : stepper cycle de vie SIF (IEC 61511) — Cockpit | 1→4 | Rapport.
 * EditorContent   : wrapper zone principale.
 */
import { useState, type ReactNode } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import type { CanonicalSIFTab } from '@/store/types'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { cn } from '@/lib/utils'

// ─── EditorTabBar (générique) ─────────────────────────────────────────────
export function EditorTabBar<T extends string>({
  tabs, active, onSelect,
}: {
  tabs: readonly { id: T; label: string; badge?: string | number }[]
  active: T
  onSelect: (id: T) => void
}) {
  const { BORDER, CARD_BG, SHADOW_CARD, SHADOW_SOFT, TEAL, TEXT, TEXT_DIM, PANEL_BG, SURFACE } = usePrismTheme()
  return (
    <div
      className="flex items-end border-b shrink-0"
      style={{ borderColor: BORDER, background: PANEL_BG, boxShadow: SHADOW_SOFT }}
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
              background:   isActive ? CARD_BG : 'transparent',
              boxShadow:    isActive ? SHADOW_CARD : 'none',
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = TEXT }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = TEXT_DIM }}
          >
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className="inline-flex items-center justify-center rounded-full min-w-[16px] h-4 px-1 text-[10px] font-bold"
                style={{
                  background: isActive ? `${TEAL}30` : CARD_BG,
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
 * Stepper horizontal représentant l'espace de travail d'une SIF.
 * Structure : [Cockpit] | [1 Contexte] → [2 Architecture] → [3 Vérification] → [4 Exploitation] | [Rapport ↗]
 *
 * Cockpit    = hub toujours accessible
 * Historique = intégré au cockpit
 * Étapes 1-4 = phases successives IEC 61511
 * Rapport    = action finale, stylistiquement différenciée (orange)
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
  const { BORDER, CARD_BG, SHADOW_CARD, SHADOW_SOFT, TEXT, TEXT_DIM, PAGE_BG, SURFACE } = usePrismTheme()
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)
  const isReport = phase.id === 'report'
  const borderColor = isActive ? `${phase.accent}30` : hovered ? `${BORDER}D0` : 'transparent'
  const boxShadow = isActive ? (pressed ? SHADOW_SOFT : SHADOW_CARD) : hovered || pressed ? SHADOW_SOFT : 'none'
  const transform = pressed
    ? 'translateY(1px) scale(0.985)'
    : hovered ? 'translateY(-0.5px) scale(1)' : 'translateY(0) scale(1)'

  return (
    <button
      type="button"
      onClick={onClick}
      title={phase.label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false)
        setPressed(false)
      }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium transition-[background-color,color,border-color,box-shadow,transform] duration-150 ease-out shrink-0"
      style={{
        color:      isActive ? phase.accent : hovered ? TEXT : TEXT_DIM,
        background: isActive ? SURFACE : hovered ? PAGE_BG : 'transparent',
        border:     `1px solid ${borderColor}`,
        fontWeight: isActive ? 600 : 400,
        boxShadow,
        transform,
      }}
    >
      {/* Numéro de phase (steps 1-4 seulement) */}
      {phase.step && (
        <span
          className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold shrink-0 transition-[background-color,color,box-shadow,transform] duration-150 ease-out"
          style={{
            background: isActive ? phase.accent : hovered ? PAGE_BG : CARD_BG,
            color:      isActive ? '#041014' : hovered ? TEXT : TEXT_DIM,
            boxShadow:  isActive ? SHADOW_SOFT : hovered ? SHADOW_SOFT : 'none',
            transform:  isActive ? 'scale(1)' : hovered ? 'scale(0.98)' : 'scale(0.96)',
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
  const { BORDER, SHADOW_SOFT, TEXT_DIM, PANEL_BG } = usePrismTheme()
  const cockpit = LIFECYCLE_PHASES[0]
  const report  = LIFECYCLE_PHASES[LIFECYCLE_PHASES.length - 1]

  return (
    <div
      className="flex items-center shrink-0 px-3 border-b gap-0.5 overflow-x-auto"
      style={{ borderColor: BORDER, background: PANEL_BG, height: 40, scrollbarWidth: 'none', boxShadow: SHADOW_SOFT }}
    >
      {/* Cockpit — hub */}
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

export function SIFWorkbenchBar({
  active,
  onSelect,
  sifTooltip,
  onReset,
  onSwitch,
}: {
  active: CanonicalSIFTab
  onSelect: (id: CanonicalSIFTab) => void
  /** Tooltip text for the action button (project › SIF name). */
  sifTooltip?: string
  /** × button — reset secondary pane to empty state. */
  onReset?: () => void
  /** ⇄ button — open primary SIF picker (split mode). */
  onSwitch?: () => void
}) {
  const { BORDER, SHADOW_SOFT, TEXT, TEXT_DIM, PANEL_BG } = usePrismTheme()
  const cockpit = LIFECYCLE_PHASES[0]
  const report  = LIFECYCLE_PHASES[LIFECYCLE_PHASES.length - 1]

  return (
    <div
      className="flex shrink-0 items-center border-b px-2"
      style={{ borderColor: BORDER, background: PANEL_BG, height: 40, boxShadow: SHADOW_SOFT }}
    >
      {/* Lifecycle tabs — centered when fits, scrollable at both edges when not */}
      <div className="flex-1 min-w-0 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="flex w-max mx-auto items-center gap-0.5 px-2">
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
          <div className="shrink-0 mx-1.5 h-5 w-px" style={{ background: BORDER }} />
          <PhaseBtn phase={report} isActive={active === 'report'} onClick={() => onSelect('report')} />
        </div>
      </div>

      {/* Action buttons — right side of bar, only in split mode */}
      {(onReset ?? onSwitch) && (
        <div className="flex shrink-0 items-center pl-1">
          {/* Primary: switch SIF (⇄) */}
          {onSwitch && (
            <button
              type="button"
              onClick={onSwitch}
              title={sifTooltip ? `${sifTooltip} — Changer de SIF` : 'Changer de SIF'}
              className="flex h-6 w-6 items-center justify-center rounded transition-colors"
              style={{ color: TEXT_DIM }}
              onMouseEnter={e => { e.currentTarget.style.color = TEXT }}
              onMouseLeave={e => { e.currentTarget.style.color = TEXT_DIM }}
            >
              <ArrowLeftRight size={11} />
            </button>
          )}
          {/* Secondary: reset to empty (×) */}
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              title={sifTooltip ? `${sifTooltip} — Revenir à la sélection` : 'Revenir à la sélection'}
              className="flex h-6 w-6 items-center justify-center rounded text-[13px] transition-colors"
              style={{ color: TEXT_DIM }}
              onMouseEnter={e => { e.currentTarget.style.color = TEXT }}
              onMouseLeave={e => { e.currentTarget.style.color = TEXT_DIM }}
            >
              ×
            </button>
          )}
        </div>
      )}
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
  const { PAGE_BG, SHADOW_SOFT, isDark } = usePrismTheme()
  return (
    <div
      className={cn('flex-1 min-h-0 overflow-hidden', className)}
      style={{
        background: PAGE_BG,
        boxShadow: SHADOW_SOFT,
        backgroundImage: isDark
          ? 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)'
          : 'linear-gradient(180deg, rgba(255,255,255,0.36) 0%, rgba(255,255,255,0) 100%)',
      }}
    >
      {children}
    </div>
  )
}
