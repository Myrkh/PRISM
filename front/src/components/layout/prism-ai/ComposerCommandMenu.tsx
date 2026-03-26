import { Check } from 'lucide-react'
import { usePrismTheme } from '@/styles/usePrismTheme'
import type { ChatInputMenuItem } from './types'

export function ComposerCommandMenu({
  items,
  selectedIndex,
  onHover,
}: {
  items: ChatInputMenuItem[]
  selectedIndex: number
  onHover: (index: number) => void
}) {
  const { BORDER, PAGE_BG, PANEL_BG, TEAL, TEXT, TEXT_DIM, isDark } = usePrismTheme()

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
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors"
              style={{ background: selected ? PAGE_BG : 'transparent' }}
            >
              <span
                className="shrink-0 rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide"
                style={{
                  color: item.badgeColor,
                  background: `${item.badgeColor}18`,
                  border: `1px solid ${item.badgeColor}40`,
                }}
              >
                {item.badge}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11.5px] font-medium" style={{ color: TEXT }}>
                  {item.label}
                </p>
                <p className="truncate text-[10px]" style={{ color: TEXT_DIM, opacity: 0.72 }}>
                  {item.meta}
                </p>
              </div>
              {item.active && <Check size={11} style={{ color: TEAL }} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
