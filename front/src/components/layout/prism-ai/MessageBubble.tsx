import { BookOpen, Plus } from 'lucide-react'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { MarkdownMessage } from './MarkdownMessage'
import { resolveMessageModeBadge } from './noteUtils'
import type { ChatMessage } from './types'

function ChatIcon({ size = 16, color }: { size?: number; color: string }) {
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      <svg
        width={Math.round(size * 0.52)}
        height={Math.round(size * 0.52)}
        viewBox="0 0 24 24"
        fill={color}
        stroke="none"
        style={{ position: 'absolute', bottom: -2, right: -3 }}
      >
        <path d="M12 2 L13.5 10.5 L22 12 L13.5 13.5 L12 22 L10.5 13.5 L2 12 L10.5 10.5 Z" />
      </svg>
    </span>
  )
}

export function MessageBubble({
  msg,
  noteId,
  noteActionsEnabled,
  createNoteLabel,
  openNoteLabel,
  onNoteAction,
}: {
  msg: ChatMessage
  noteId?: string
  noteActionsEnabled: boolean
  createNoteLabel: string
  openNoteLabel: string
  onNoteAction: (msg: ChatMessage) => void
}) {
  const { TEAL, TEXT, TEXT_DIM, BORDER, PAGE_BG, isDark } = usePrismTheme()
  const isUser = msg.role === 'user'
  const separatorMeta = isUser ? resolveMessageModeBadge(msg.content) : null

  if (isUser) {
    return (
      <div className="flex flex-col gap-1.5">
        {separatorMeta && (
          <div className="flex items-center gap-2 px-1">
            <div className="h-px flex-1" style={{ background: BORDER, opacity: 0.5 }} />
            <div className="flex items-center gap-1.5">
              <span
                className="rounded px-1.5 py-0.5 text-[8px] font-bold tracking-wide"
                style={{
                  color: separatorMeta.color,
                  background: `${separatorMeta.color}12`,
                  border: `1px solid ${separatorMeta.color}30`,
                }}
              >
                {separatorMeta.badge}
              </span>
              {separatorMeta.tokenLabel && (
                <span
                  className="rounded px-1.5 py-0.5 text-[8px] font-semibold"
                  style={{
                    color: separatorMeta.color,
                    background: `${separatorMeta.color}10`,
                    border: `1px solid ${separatorMeta.color}22`,
                  }}
                >
                  {separatorMeta.tokenLabel}
                </span>
              )}
            </div>
            <div className="h-px flex-1" style={{ background: BORDER, opacity: 0.5 }} />
          </div>
        )}
        <div className="flex justify-end">
          <div
            className="max-w-[85%] rounded-2xl rounded-tr-sm px-3 py-2 text-[12.5px] leading-relaxed"
            style={{
              background: `${TEAL}18`,
              border: `1px solid ${TEAL}30`,
              color: TEXT,
            }}
          >
            {msg.content}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <div
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
        style={{ background: `${TEAL}18`, border: `1px solid ${TEAL}28` }}
      >
        <ChatIcon size={10} color={TEAL} />
      </div>
      <div className="flex max-w-[85%] flex-col items-start gap-1.5">
        <div
          className="w-full rounded-2xl rounded-tl-sm px-3 py-2 text-[12.5px] leading-relaxed"
          style={{
            background: isDark ? 'rgba(255,255,255,0.04)' : PAGE_BG,
            border: `1px solid ${BORDER}`,
            color: TEXT,
          }}
        >
          {msg.content ? (
            <MarkdownMessage markdown={msg.content} />
          ) : (
            <span className="flex gap-1 py-0.5">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="inline-block h-1.5 w-1.5 rounded-full animate-bounce"
                  style={{ background: TEAL, animationDelay: `${i * 150}ms` }}
                />
              ))}
            </span>
          )}
        </div>
        {noteActionsEnabled && msg.content.trim() && (
          <button
            type="button"
            onClick={() => onNoteAction(msg)}
            className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-medium transition-colors"
            style={{
              borderColor: noteId ? `${TEAL}35` : BORDER,
              background: noteId ? `${TEAL}10` : 'transparent',
              color: noteId ? TEAL : TEXT_DIM,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = noteId ? `${TEAL}16` : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)')
              e.currentTarget.style.borderColor = noteId ? `${TEAL}45` : `${TEAL}28`
              e.currentTarget.style.color = noteId ? TEAL : TEXT
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = noteId ? `${TEAL}10` : 'transparent'
              e.currentTarget.style.borderColor = noteId ? `${TEAL}35` : BORDER
              e.currentTarget.style.color = noteId ? TEAL : TEXT_DIM
            }}
          >
            {noteId ? <BookOpen size={11} /> : <Plus size={11} />}
            <span>{noteId ? openNoteLabel : createNoteLabel}</span>
          </button>
        )}
      </div>
    </div>
  )
}
