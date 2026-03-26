import type { MouseEvent } from 'react'
import { ChevronRight, Trash2 } from 'lucide-react'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { formatRelativeTime } from './persistence'
import type { ChatConversation } from './types'

export function HistorySidebar({ conversations, currentId, onLoad, onDelete, onClose }: {
  conversations: ChatConversation[]
  currentId: string | null
  onLoad: (conv: ChatConversation) => void
  onDelete: (id: string, e: MouseEvent) => void
  onClose: () => void
}) {
  const { BORDER, TEAL, TEXT, TEXT_DIM, PAGE_BG, isDark } = usePrismTheme()
  return (
    <div
      className="flex h-full w-52 shrink-0 flex-col border-r"
      style={{ borderColor: BORDER, background: isDark ? 'rgba(0,0,0,0.2)' : PAGE_BG }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between border-b px-3 py-2"
        style={{ borderColor: BORDER }}
      >
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
          Historique
        </span>
        <button
          type="button"
          onClick={onClose}
          className="flex h-5 w-5 items-center justify-center rounded transition-colors"
          style={{ color: TEXT_DIM }}
          onMouseEnter={e => { e.currentTarget.style.color = TEXT }}
          onMouseLeave={e => { e.currentTarget.style.color = TEXT_DIM }}
        >
          <ChevronRight size={12} />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-1">
        {conversations.length === 0 ? (
          <p className="px-3 py-4 text-center text-[11px]" style={{ color: TEXT_DIM, opacity: 0.5 }}>
            Aucune conversation
          </p>
        ) : (
          conversations.map(conv => (
            <button
              key={conv.id}
              type="button"
              onClick={() => onLoad(conv)}
              className="group relative flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left transition-colors"
              style={{
                background: conv.id === currentId ? `${TEAL}10` : 'transparent',
                borderLeft: conv.id === currentId ? `2px solid ${TEAL}` : '2px solid transparent',
              }}
              onMouseEnter={e => {
                if (conv.id !== currentId) e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'
              }}
              onMouseLeave={e => {
                if (conv.id !== currentId) e.currentTarget.style.background = 'transparent'
              }}
            >
              <span className="w-full truncate text-[11.5px] font-medium leading-tight" style={{ color: TEXT }}>
                {conv.title}
              </span>
              <span className="text-[10px]" style={{ color: TEXT_DIM, opacity: 0.6 }}>
                {formatRelativeTime(conv.updatedAt)}
              </span>
              {/* Delete button */}
              <span
                role="button"
                tabIndex={-1}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-100"
                style={{ color: TEXT_DIM }}
                onMouseEnter={e => { e.currentTarget.style.color = '#F87171' }}
                onMouseLeave={e => { e.currentTarget.style.color = TEXT_DIM }}
                onClick={e => onDelete(conv.id, e as unknown as MouseEvent)}
              >
                <Trash2 size={10} />
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
