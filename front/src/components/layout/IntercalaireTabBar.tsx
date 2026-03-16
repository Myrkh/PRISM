/**
 * layout/IntercalaireTabBar.tsx — PRISM
 *
 * Tab bar "intercalaire" style (physical folder tabs).
 * Used for main SIF tabs, right panel tabs, and anywhere tabs are needed.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { cn } from '@/lib/utils'

type TabBadge = boolean | number | string | null | undefined

// ─── IntercalaireTabBar ──────────────────────────────────────────────────
export function IntercalaireTabBar<T extends string>({
  tabs, active, onSelect, cardBg, stretch = true, align = 'center', labelSize = 'md', showHints = true, autoHideHintsOnOverflow = false,
}: {
  tabs: readonly { id: T; label: string; hint?: string; Icon?: React.ElementType; badge?: TabBadge }[]
  active: T
  onSelect: (id: T) => void
  cardBg: string
  stretch?: boolean
  align?: 'center' | 'start'
  labelSize?: 'md' | 'sm'
  showHints?: boolean
  autoHideHintsOnOverflow?: boolean
}) {
  const { BORDER, CARD_BG, SHADOW_TAB, TEAL_DIM, TEXT, TEXT_DIM, R } = usePrismTheme()
  const measurementRef = useRef<HTMLDivElement | null>(null)
  const [hideHintsForOverflow, setHideHintsForOverflow] = useState(false)

  useEffect(() => {
    const node = measurementRef.current
    if (!autoHideHintsOnOverflow || !showHints || !node || typeof ResizeObserver === 'undefined') {
      setHideHintsForOverflow(false)
      return
    }

    const updateOverflowState = () => {
      setHideHintsForOverflow(node.scrollWidth > node.clientWidth + 1)
    }

    updateOverflowState()

    const observer = new ResizeObserver(() => updateOverflowState())
    observer.observe(node)

    return () => observer.disconnect()
  }, [align, autoHideHintsOnOverflow, labelSize, showHints, stretch, tabs])

  const shouldShowHints = showHints && !(autoHideHintsOnOverflow && hideHintsForOverflow)

  const renderTabBar = (renderHints: boolean, ref?: React.Ref<HTMLDivElement>) => (
    <div ref={ref} className="flex items-end border-b" style={{ borderColor: BORDER }}>
      {tabs.map(tab => {
        const isActive = tab.id === active
        const Icon = tab.Icon
        const showDotBadge = typeof tab.badge === 'boolean'
          ? tab.badge
          : tab.badge !== null && tab.badge !== undefined && tab.badge !== ''
        return (
          <button key={tab.id} type="button" onClick={() => onSelect(tab.id)}
            className={cn(
              'relative flex min-w-0 flex-col justify-end gap-1 overflow-hidden px-3 py-2 transition-colors',
              stretch ? 'flex-1' : 'shrink-0',
              align === 'start' ? 'items-start text-left' : 'items-center text-center',
            )}
            style={isActive ? {
              background: cardBg,
              borderTop: `1px solid ${BORDER}`, borderLeft: `1px solid ${BORDER}`,
              borderRight: `1px solid ${BORDER}`, borderBottom: `1px solid ${cardBg}`,
              borderRadius: `${R}px ${R}px 0 0`,
              color: TEAL_DIM, marginBottom: '-1px', zIndex: 10,
              boxShadow: SHADOW_TAB,
            } : {
              color: TEXT_DIM,
              borderTop: '1px solid transparent', borderLeft: '1px solid transparent',
              borderRight: '1px solid transparent',
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = TEXT }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = TEXT_DIM }}>
            <span
              className={cn(
                'inline-flex max-w-full items-center gap-1.5 overflow-hidden font-semibold leading-tight whitespace-nowrap',
                labelSize === 'sm' ? 'text-[11px]' : 'text-[13px]',
              )}
            >
              {Icon && <Icon size={labelSize === 'sm' ? 10 : 12} />}
              <span className="truncate">{tab.label}</span>
              {showDotBadge && (
                typeof tab.badge === 'number' || typeof tab.badge === 'string'
                  ? (
                    <span
                      className="inline-flex min-w-[14px] items-center justify-center rounded-full px-1 text-[9px] font-bold"
                      style={{
                        background: isActive ? `${TEAL_DIM}25` : CARD_BG,
                        color: isActive ? TEAL_DIM : TEXT_DIM,
                        border: `1px solid ${BORDER}`,
                      }}
                    >
                      {tab.badge}
                    </span>
                  )
                  : (
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: isActive ? TEAL_DIM : `${TEAL_DIM}80` }}
                    />
                  )
              )}
            </span>
            {renderHints && tab.hint && (
              <span
                className={cn('max-w-full truncate leading-tight whitespace-nowrap', labelSize === 'sm' ? 'text-[8px]' : 'text-[10px]')}
                style={{ color: isActive ? `${TEAL_DIM}80` : TEXT_DIM }}>
                {tab.hint}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )

  return (
    <div className="relative">
      {renderTabBar(shouldShowHints)}
      {autoHideHintsOnOverflow && showHints && (
        <div className="pointer-events-none absolute inset-0 h-0 overflow-hidden invisible" aria-hidden="true">
          {renderTabBar(true, measurementRef)}
        </div>
      )}
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
  const { BORDER, CARD_BG, R, SHADOW_PANEL } = usePrismTheme()
  const defaultCardBg = CARD_BG
  const bg = cardBg ?? defaultCardBg
  const tlr = activeIdx === 0 ? 0 : R
  const trr = tabCount === 1 ? R : (activeIdx === tabCount - 1 ? 0 : R)
  return (
    <div className={className}
      style={{
        background: bg, border: `1px solid ${BORDER}`, borderTopWidth: 0,
        borderRadius: `${tlr}px ${trr}px ${R}px ${R}px`,
        boxShadow: SHADOW_PANEL,
        ...style,
      }}>
      {children}
    </div>
  )
}
