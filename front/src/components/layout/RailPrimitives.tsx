import { useState, type ElementType } from 'react'
import { usePrismTheme } from '@/styles/usePrismTheme'

type RailBadge = boolean | number | string | null | undefined

export function RailIconButton({
  Icon,
  label,
  onClick,
  active = false,
  badge,
  indicatorSide = 'left',
}: {
  Icon: ElementType
  label: string
  onClick: () => void
  active?: boolean
  badge?: RailBadge
  indicatorSide?: 'left' | 'right'
}) {
  const { BORDER, CARD_BG, PAGE_BG, TEAL, TEXT, TEXT_DIM } = usePrismTheme()
  const [hovered, setHovered] = useState(false)
  const showDotBadge = typeof badge === 'boolean' ? badge : badge !== null && badge !== undefined && badge !== ''
  const indicatorStyle = indicatorSide === 'left'
    ? { left: 0, borderRadius: '0 999px 999px 0' }
    : { right: 0, borderRadius: '999px 0 0 999px' }

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex h-9 w-9 items-center justify-center rounded-lg transition-all"
      style={{
        background: active ? `${TEAL}16` : hovered ? PAGE_BG : 'transparent',
        color: active ? TEAL : hovered ? TEXT : TEXT_DIM,
        boxShadow: active ? `inset 0 0 0 1px ${TEAL}22` : 'none',
      }}
    >
      {active && (
        <span
          className="absolute top-1/2 h-5 w-0.5 -translate-y-1/2"
          style={{ ...indicatorStyle, background: TEAL }}
        />
      )}

      <Icon size={16} />

      {showDotBadge && (
        typeof badge === 'number' || typeof badge === 'string'
          ? (
            <span
              className="absolute -right-1 -top-1 inline-flex min-w-[14px] items-center justify-center rounded-full px-1 text-[9px] font-bold"
              style={{
                background: active ? TEAL : CARD_BG,
                color: active ? '#041014' : TEXT_DIM,
                border: `1px solid ${BORDER}`,
              }}
            >
              {badge}
            </span>
          )
          : (
            <span
              className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full"
              style={{ background: active ? TEAL : `${TEAL}80` }}
            />
          )
      )}
    </button>
  )
}

export function RailDivider() {
  const { BORDER } = usePrismTheme()
  return <div className="my-1 w-6 border-t" style={{ borderColor: BORDER }} />
}
