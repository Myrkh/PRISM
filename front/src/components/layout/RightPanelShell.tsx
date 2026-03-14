import type { ElementType, ReactNode } from 'react'
import { BORDER, PANEL_BG, RAIL_BG } from '@/styles/tokens'
import { RailIconButton } from '@/components/layout/RailPrimitives'
import { useLayout } from '@/components/layout/SIFWorkbenchLayout'

export interface RightPanelRailItem<T extends string = string> {
  id: T
  label: string
  Icon: ElementType
  badge?: boolean | number | string | null
}

export function RightPanelShell<T extends string>({
  items,
  active,
  onSelect,
  children,
  contentBg = PANEL_BG,
}: {
  items: readonly RightPanelRailItem<T>[]
  active: T
  onSelect: (id: T) => void
  children: ReactNode
  contentBg?: string
}) {
  const { isRightPanelOpen } = useLayout()

  return (
    <div
      className="flex h-full overflow-hidden"
      style={{ background: contentBg }}
      onClick={event => event.stopPropagation()}
      onPointerDown={event => event.stopPropagation()}
    >
      <div className="min-w-0 flex-1 overflow-hidden">
        <div
          className="h-full overflow-hidden transition-opacity duration-150"
          style={{
            opacity: isRightPanelOpen ? 1 : 0,
            pointerEvents: isRightPanelOpen ? 'auto' : 'none',
          }}
        >
          {children}
        </div>
      </div>

      <div
        className="flex shrink-0 flex-col items-center gap-0.5 border-l py-2"
        style={{ width: 48, background: RAIL_BG, borderColor: BORDER }}
      >
        {items.map(item => (
          <RailIconButton
            key={item.id}
            Icon={item.Icon}
            label={item.label}
            active={active === item.id}
            badge={item.badge}
            indicatorSide="right"
            onClick={() => onSelect(item.id)}
          />
        ))}
      </div>
    </div>
  )
}
