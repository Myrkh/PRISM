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
  const { BORDER, CARD_BG, PAGE_BG, SHADOW_CARD, SHADOW_SOFT, TEAL, TEXT, TEXT_DIM, isDark } = usePrismTheme()
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)
  const showDotBadge = typeof badge === 'boolean' ? badge : badge !== null && badge !== undefined && badge !== ''
  const indicatorStyle = indicatorSide === 'left'
    ? { left: 0, borderRadius: '0 999px 999px 0' }
    : { right: 0, borderRadius: '999px 0 0 999px' }
  const borderColor = active ? `${TEAL}24` : hovered ? `${BORDER}D0` : 'transparent'
  const boxShadow = active
    ? `${isDark ? `0 0 0 1px ${TEAL}12, ` : ''}${pressed ? SHADOW_SOFT : SHADOW_CARD}`
    : hovered || pressed ? SHADOW_SOFT : 'none'
  const transform = pressed
    ? 'translateY(1px) scale(0.968)'
    : hovered ? 'translateY(-0.5px) scale(1)' : 'translateY(0) scale(1)'

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false)
        setPressed(false)
      }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      className="relative flex h-9 w-9 items-center justify-center rounded-lg transition-[background-color,color,border-color,box-shadow,transform] duration-150 ease-out"
      style={{
        background: active ? CARD_BG : hovered ? PAGE_BG : 'transparent',
        color: active ? TEAL : hovered ? TEXT : TEXT_DIM,
        border: `1px solid ${borderColor}`,
        boxShadow,
        transform,
      }}
    >
      {active && (
        <span
          className="absolute top-1/2 h-5 w-0.5 -translate-y-1/2"
          style={{ ...indicatorStyle, background: TEAL }}
        />
      )}

      <span
        className="inline-flex items-center justify-center transition-transform duration-150 ease-out"
        style={{ transform: active ? 'scale(1.03)' : hovered ? 'scale(1.01)' : 'scale(1)' }}
      >
        <Icon size={16} strokeWidth={active ? 2.15 : hovered ? 2.02 : 1.9} />
      </span>

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
