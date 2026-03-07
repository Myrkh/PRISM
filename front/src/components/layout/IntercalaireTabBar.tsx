/**
 * layout/IntercalaireTabBar.tsx — PRISM
 *
 * Tab bar "intercalaire" style (physical folder tabs).
 * Used for main SIF tabs, right panel tabs, and anywhere tabs are needed.
 */
import type { ReactNode } from 'react'
import { BORDER, TEAL_DIM, TEXT, TEXT_DIM, R } from '@/styles/tokens'
import { cn } from '@/lib/utils'

// ─── IntercalaireTabBar ──────────────────────────────────────────────────
export function IntercalaireTabBar<T extends string>({
  tabs, active, onSelect, cardBg, stretch = true, align = 'center', labelSize = 'md',
}: {
  tabs: readonly { id: T; label: string; hint?: string; Icon?: React.ElementType }[]
  active: T
  onSelect: (id: T) => void
  cardBg: string
  stretch?: boolean
  align?: 'center' | 'start'
  labelSize?: 'md' | 'sm'
}) {
  return (
    <div className="flex items-end border-b" style={{ borderColor: BORDER }}>
      {tabs.map(tab => {
        const isActive = tab.id === active
        const Icon = tab.Icon
        return (
          <button key={tab.id} type="button" onClick={() => onSelect(tab.id)}
            className={cn(
              'relative flex flex-col justify-end gap-1 px-3 py-2 transition-colors',
              stretch ? 'flex-1' : 'shrink-0',
              align === 'start' ? 'items-start text-left' : 'items-center text-center',
            )}
            style={isActive ? {
              background: cardBg,
              borderTop: `1px solid ${BORDER}`, borderLeft: `1px solid ${BORDER}`,
              borderRight: `1px solid ${BORDER}`, borderBottom: `1px solid ${cardBg}`,
              borderRadius: `${R}px ${R}px 0 0`,
              color: TEAL_DIM, marginBottom: '-1px', zIndex: 10,
            } : {
              color: TEXT_DIM,
              borderTop: '1px solid transparent', borderLeft: '1px solid transparent',
              borderRight: '1px solid transparent',
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = TEXT }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = TEXT_DIM }}>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 font-semibold leading-tight whitespace-nowrap',
                labelSize === 'sm' ? 'text-[11px]' : 'text-[13px]',
              )}
            >
              {Icon && <Icon size={labelSize === 'sm' ? 10 : 12} />}
              {tab.label}
            </span>
            {tab.hint && (
              <span
                className={cn('leading-tight whitespace-nowrap', labelSize === 'sm' ? 'text-[8px]' : 'text-[10px]')}
                style={{ color: isActive ? `${TEAL_DIM}80` : TEXT_DIM }}>
                {tab.hint}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── IntercalaireCard ────────────────────────────────────────────────────
export function IntercalaireCard({
  tabCount, activeIdx, children, cardBg, className, style,
}: {
  tabCount: number
  activeIdx: number
  children: ReactNode
  cardBg?: string
  className?: string
  style?: React.CSSProperties
}) {
  const defaultCardBg = '#23292F'
  const bg = cardBg ?? defaultCardBg
  const tlr = activeIdx === 0 ? 0 : R
  const trr = tabCount === 1 ? R : (activeIdx === tabCount - 1 ? 0 : R)
  return (
    <div className={className}
      style={{
        background: bg, border: `1px solid ${BORDER}`, borderTopWidth: 0,
        borderRadius: `${tlr}px ${trr}px ${R}px ${R}px`, ...style,
      }}>
      {children}
    </div>
  )
}
