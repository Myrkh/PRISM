import { useEffect, useRef } from 'react'
import { usePrismTheme } from '@/styles/usePrismTheme'

export type ContextMenuItem =
  | {
      kind: 'action'
      key?: string
      label: string
      icon: React.ReactNode
      onClick: () => void
      danger?: boolean
      closeOnClick?: boolean
      rightSlot?: React.ReactNode
    }
  | { kind: 'separator'; key?: string }
  | { kind: 'custom'; key?: string; render: React.ReactNode }

export function ContextMenu({
  items,
  onClose,
}: {
  items: ContextMenuItem[]
  onClose: () => void
}) {
  const { CARD_BG, BORDER, TEXT, TEXT_DIM, SHADOW_SOFT } = usePrismTheme()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full z-50 mt-0.5 min-w-[168px] rounded-lg py-1"
      style={{
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        boxShadow: `0 8px 24px rgba(0,0,0,0.35), ${SHADOW_SOFT}`,
      }}
      onMouseDown={event => event.stopPropagation()}
    >
      {items.map((item, index) => {
        const key = item.key ?? `${item.kind}:${index}`
        if (item.kind === 'separator') {
          return <div key={key} className="my-1 h-px" style={{ background: BORDER }} />
        }
        if (item.kind === 'custom') {
          return <div key={key}>{item.render}</div>
        }
        return (
          <button
            key={key}
            type="button"
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] transition-colors"
            style={{ color: item.danger ? '#EF4444' : TEXT }}
            onMouseEnter={event => {
              event.currentTarget.style.background = item.danger
                ? 'rgba(239,68,68,0.08)'
                : 'rgba(255,255,255,0.05)'
            }}
            onMouseLeave={event => {
              event.currentTarget.style.background = 'transparent'
            }}
            onClick={() => {
              item.onClick()
              if (item.closeOnClick !== false) onClose()
            }}
          >
            <span style={{ color: item.danger ? '#EF4444' : TEXT_DIM, flexShrink: 0 }}>{item.icon}</span>
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.rightSlot}
          </button>
        )
      })}
    </div>
  )
}
