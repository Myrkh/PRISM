import type { ElementType, ReactNode } from 'react'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { IntercalaireCard, IntercalaireTabBar } from '@/components/layout/IntercalaireTabBar'
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
  contentBg,
}: {
  items: readonly RightPanelRailItem<T>[]
  active: T
  onSelect: (id: T) => void
  children: ReactNode
  contentBg?: string
}) {
  const { BORDER, CARD_BG, PANEL_BG, SHADOW_DOCK, SHADOW_PANEL, SHADOW_SOFT, isDark } = usePrismTheme()
  const { isRightPanelOpen } = useLayout()
  const resolvedContentBg = contentBg ?? PANEL_BG
  const activeIdx = Math.max(0, items.findIndex(item => item.id === active))
  const tabs = items.map(item => ({
    id: item.id,
    label: item.label,
    Icon: item.Icon,
    badge: item.badge,
  }))

  return (
    <div
      className="flex h-full flex-col overflow-hidden"
      style={{
        background: resolvedContentBg,
        backgroundImage: isDark
          ? 'radial-gradient(circle at top left, rgba(95,216,210,0.07) 0%, rgba(95,216,210,0) 22%), linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0) 100%)'
          : 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 100%)',
        boxShadow: `${SHADOW_DOCK}, inset 1px 0 0 ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.84)'}`,
      }}
      onClick={event => event.stopPropagation()}
      onPointerDown={event => event.stopPropagation()}
    >
      <div
        className="flex h-full flex-col overflow-hidden transition-opacity duration-150"
        style={{
          opacity: isRightPanelOpen ? 1 : 0,
          pointerEvents: isRightPanelOpen ? 'auto' : 'none',
        }}
      >
        <div
          className="shrink-0 px-3 pt-3"
          style={{
            background: resolvedContentBg,
            backgroundImage: isDark ? 'linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0) 100%)' : 'none',
            boxShadow: `${SHADOW_SOFT}, inset 0 1px 0 ${isDark ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.9)'}`,
          }}
        >
          <IntercalaireTabBar
            tabs={tabs}
            active={active}
            onSelect={onSelect}
            cardBg={CARD_BG}
            stretch={tabs.length > 1}
            align="start"
            labelSize="md"
            showHints={false}
          />
        </div>

        <div className="min-h-0 flex-1 px-3 pb-3">
          <IntercalaireCard
            tabCount={tabs.length}
            activeIdx={activeIdx}
            cardBg={CARD_BG}
            className="flex h-full min-h-0 flex-col overflow-hidden border"
            style={{
              borderColor: BORDER,
              background: CARD_BG,
              backgroundImage: isDark ? 'linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0) 100%)' : 'none',
              boxShadow: `${SHADOW_PANEL}, inset 0 1px 0 ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.9)'}`,
            }}
          >
            {children}
          </IntercalaireCard>
        </div>
      </div>
    </div>
  )
}
