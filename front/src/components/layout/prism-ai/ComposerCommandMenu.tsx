import { Check } from 'lucide-react'
import { usePrismTheme } from '@/styles/usePrismTheme'
import type { ChatInputMenuItem } from './types'

export function ComposerCommandMenu({
  items,
  selectedIndex,
  onHover,
  layout,
}: {
  items: ChatInputMenuItem[]
  selectedIndex: number
  onHover: (index: number) => void
  layout: 'command' | 'attachment'
}) {
  const { BORDER, PAGE_BG, PANEL_BG, TEAL, TEXT, TEXT_DIM, isDark } = usePrismTheme()
  const isCommandLayout = layout === 'command'

  return (
    <div
      className="mb-2 overflow-hidden rounded-xl border"
      style={{ borderColor: BORDER, background: isDark ? 'rgba(0,0,0,0.18)' : PANEL_BG }}
    >
      <div className="max-h-56 overflow-y-auto py-1">
        {items.map((item, index) => {
          const selected = index === selectedIndex
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onSelect}
              onMouseDown={e => e.preventDefault()}
              onMouseEnter={() => onHover(index)}
              className={isCommandLayout
                ? 'grid w-full grid-cols-[78px_15ch_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 text-left transition-colors'
                : 'grid w-full grid-cols-[78px_28ch_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 text-left transition-colors'}
              style={{ background: selected ? PAGE_BG : 'transparent' }}
            >
              <span
                className="shrink-0 rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide"
                style={{
                  color: item.badgeColor,
                  background: `${item.badgeColor}18`,
                  border: `1px solid ${item.badgeColor}40`,
                  width: 78,
                  textAlign: 'center',
                }}
              >
                {item.badge}
              </span>

              <p
                className={isCommandLayout
                  ? 'truncate text-[11.5px] font-semibold font-mono tabular-nums'
                  : 'truncate text-[11.5px] font-medium'}
                style={{ color: TEXT }}
              >
                {item.label}
              </p>

              <p className="truncate text-[10px]" style={{ color: TEXT_DIM, opacity: isCommandLayout ? 0.78 : 0.72 }}>
                {item.meta}
              </p>

              {item.active ? <Check size={11} style={{ color: TEAL }} /> : <span className="block h-[11px] w-[11px]" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
