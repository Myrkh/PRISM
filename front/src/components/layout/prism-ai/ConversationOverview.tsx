import { usePrismTheme } from '@/styles/usePrismTheme'
import { resolveMessageModeBadge } from './noteUtils'
import type { ChatMessage } from './types'

export function ConversationOverview({
  messages,
  viewportTop,
  viewportHeight,
  onJumpToMessage,
  onJumpToRatio,
}: {
  messages: ChatMessage[]
  viewportTop: number
  viewportHeight: number
  onJumpToMessage: (messageId: string) => void
  onJumpToRatio: (ratio: number) => void
}) {
  const { BORDER, TEAL, TEXT_DIM, isDark } = usePrismTheme()

  if (messages.length === 0) return null

  const viewportHeightPct = Math.min(100, Math.max(viewportHeight * 100, 10))
  const viewportTopPct = Math.max(0, Math.min(viewportTop * 100, 100 - viewportHeightPct))

  return (
    <div className="absolute inset-y-3 right-2 z-10 flex w-8 items-stretch">
      <div
        title="Cliquer pour naviguer dans la conversation"
        className="relative w-full rounded-xl border p-1"
        style={{
          borderColor: BORDER,
          background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.03)',
          boxShadow: isDark ? 'inset 0 1px 0 rgba(255,255,255,0.04)' : 'inset 0 1px 0 rgba(255,255,255,0.8)',
        }}
        onClick={e => {
          const rect = e.currentTarget.getBoundingClientRect()
          const ratio = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
          onJumpToRatio(ratio)
        }}
      >
        <div
          className="grid h-full w-full gap-px"
          style={{ gridTemplateRows: `repeat(${Math.max(messages.length, 1)}, minmax(2px, 1fr))` }}
        >
          {messages.map(msg => {
            const modeMeta = msg.role === 'user' ? resolveMessageModeBadge(msg.content) : null
            const color = msg.role === 'assistant' ? TEAL : modeMeta?.color ?? TEXT_DIM
            const opacity = msg.role === 'assistant' ? 0.52 : modeMeta ? 0.72 : 0.3
            const title = msg.role === 'assistant'
              ? 'PRISM AI'
              : modeMeta
                ? `${modeMeta.badge}${modeMeta.tokenLabel ? ` · ${modeMeta.tokenLabel}` : ''}`
                : 'Message utilisateur'

            return (
              <button
                key={msg.id}
                type="button"
                title={title}
                onClick={e => {
                  e.stopPropagation()
                  onJumpToMessage(msg.id)
                }}
                className="w-full rounded-sm transition-opacity hover:opacity-100"
                style={{ background: color, opacity }}
              />
            )
          })}
        </div>

        <div
          className="pointer-events-none absolute left-1 right-1 rounded-md border"
          style={{
            top: `calc(${viewportTopPct}% + 1px)`,
            height: `calc(${viewportHeightPct}% - 2px)`,
            minHeight: 12,
            borderColor: `${TEAL}55`,
            background: `${TEAL}12`,
            boxShadow: `0 0 0 1px ${TEAL}18 inset`,
          }}
        />
      </div>
    </div>
  )
}
