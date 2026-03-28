import { useCallback, useEffect, useRef, useState } from 'react'
import type React from 'react'
import {
  BookOpen,
  ChevronDown,
  Maximize2,
  Minimize2,
  Paperclip,
  Plus,
  Send,
  Settings2,
  X,
} from 'lucide-react'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { AttachPicker } from './AttachPicker'
import { ComposerCommandMenu } from './ComposerCommandMenu'
import { ConversationOverview } from './ConversationOverview'
import { ConfigPanel } from './ConfigPanel'
import { HistorySidebar } from './HistorySidebar'
import { MessageBubble } from './MessageBubble'
import { MODELS } from './models'
import { COMMAND_BADGE_COLOR } from './noteUtils'
import { usePrismAiChat } from './usePrismAiChat'

// ─── Layout constants ─────────────────────────────────────────────────────────
const HEADER_H = 48
const RAIL_W   = 48
const STATUS_H = 24
const FLOAT_W  = 480
const FLOAT_H  = 560
const MIN_W    = 280
const MIN_H    = 240
const HANDLE   = 6


// ─── Resize handle ────────────────────────────────────────────────────────────
type Edge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
const EDGE_CURSOR: Record<Edge, string> = {
  n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize',
  ne: 'nesw-resize', sw: 'nesw-resize', nw: 'nwse-resize', se: 'nwse-resize',
}

function ResizeHandle({ edge, onPD, onPM, onPU }: {
  edge: Edge
  onPD: (e: React.PointerEvent<HTMLDivElement>) => void
  onPM: (e: React.PointerEvent<HTMLDivElement>) => void
  onPU: () => void
}) {
  const style: React.CSSProperties = {
    position: 'absolute', cursor: EDGE_CURSOR[edge], zIndex: 10,
    ...(edge === 'n'  && { top: 0,    left: HANDLE,  right: HANDLE,  height: HANDLE }),
    ...(edge === 's'  && { bottom: 0, left: HANDLE,  right: HANDLE,  height: HANDLE }),
    ...(edge === 'e'  && { right: 0,  top: HANDLE,   bottom: HANDLE, width: HANDLE  }),
    ...(edge === 'w'  && { left: 0,   top: HANDLE,   bottom: HANDLE, width: HANDLE  }),
    ...(edge === 'ne' && { top: 0,    right: 0,  width: HANDLE * 2, height: HANDLE * 2 }),
    ...(edge === 'nw' && { top: 0,    left: 0,   width: HANDLE * 2, height: HANDLE * 2 }),
    ...(edge === 'se' && { bottom: 0, right: 0,  width: HANDLE * 2, height: HANDLE * 2 }),
    ...(edge === 'sw' && { bottom: 0, left: 0,   width: HANDLE * 2, height: HANDLE * 2 }),
  }
  return (
    <div
      style={style}
      onPointerDown={e => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); onPD(e) }}
      onPointerMove={onPM}
      onPointerUp={onPU}
    />
  )
}

// ─── Window action button ─────────────────────────────────────────────────────
function WinBtn({ Icon, title, onClick, active, danger }: {
  Icon: React.ElementType
  title: string
  onClick?: () => void
  active?: boolean
  danger?: boolean
}) {
  const { TEAL, TEXT_DIM, isDark, semantic } = usePrismTheme()
  const color = danger ? semantic.error : active ? TEAL : TEXT_DIM
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded transition-all"
      style={{ color }}
      onMouseEnter={e => {
        e.currentTarget.style.background = danger
          ? `${semantic.error}18`
          : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
        e.currentTarget.style.color = danger ? semantic.error : active ? TEAL : TEXT_DIM
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color = color
      }}
    >
      <Icon size={13} />
    </button>
  )
}

export function PrismAiShell({ onClose }: { onClose: () => void }) {
  const { BORDER, PANEL_BG, PAGE_BG, TEAL, TEXT, TEXT_DIM, isDark } = usePrismTheme()
  const {
    aiDraftPreview,
    aiProjectDraftPreview,
    aiLibraryDraftPreview,
    allSIFs,
    applyStrictMode,
    attachPickerOpen,
    attachedContext,
    attachedWorkspaceItems,
    attachmentCount,
    composerPlaceholder,
    composerRef,
    commandMenuIndex,
    config,
    configOpen,
    conversations,
    createNoteLabel,
    currentConvId,
    handleAssistantNoteAction,
    handleAttachSIFSelection,
    handleConfigChange,
    handleDeleteConversation,
    handleKeyDown,
    handleLoadConversation,
    handleNewChat,
    handleProposalOpen,
    handleSend,
    historyOpen,
    findExistingAssistantNoteId,
    findExistingProposalResult,
    input,
    inputMode,
    inputModeConfig,
    isStreaming,
    messages,
    messagesEndRef,
    openNoteLabel,
    removeWorkspaceAttachment,
    setAttachPickerOpen,
    setCommandMenuIndex,
    setConfigOpen,
    setHistoryOpen,
    setInput,
    setAttachedContext,
    strictMode,
    strictModeLabel,
    toggleAttachPicker,
    toggleWorkspaceAttachment,
    workspaceItems,
    activeCommandMenuItems,
    activeCommandTokenBadge,
  } = usePrismAiChat()

  const [maximized, setMaximized] = useState(false)
  const [pos, setPos] = useState(() => ({
    x: Math.max(RAIL_W + 16, window.innerWidth - FLOAT_W - 80),
    y: HEADER_H + 16,
  }))
  const [size, setSize] = useState({ w: FLOAT_W, h: FLOAT_H })

  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null)
  const resizeRef = useRef<{
    edge: Edge; startX: number; startY: number
    startW: number; startH: number; startPX: number; startPY: number
  } | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement | null>(null)
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const nearBottomRef = useRef(true)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  const [overviewViewport, setOverviewViewport] = useState({ top: 0, height: 1 })

  const onDragDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: pos.x, oy: pos.y }
    e.currentTarget.setPointerCapture(e.pointerId)
    e.preventDefault()
  }, [pos])

  const onDragMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    setPos({
      x: Math.max(0, dragRef.current.ox + e.clientX - dragRef.current.startX),
      y: Math.max(0, dragRef.current.oy + e.clientY - dragRef.current.startY),
    })
  }, [])

  const onDragUp = useCallback(() => { dragRef.current = null }, [])

  const onResizeDown = useCallback((edge: Edge, e: React.PointerEvent<HTMLDivElement>) => {
    resizeRef.current = {
      edge, startX: e.clientX, startY: e.clientY,
      startW: size.w, startH: size.h, startPX: pos.x, startPY: pos.y,
    }
  }, [size, pos])

  const onResizeMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const r = resizeRef.current
    if (!r) return
    const dx = e.clientX - r.startX
    const dy = e.clientY - r.startY
    let { startW: w, startH: h, startPX: x, startPY: y } = r
    if (r.edge.includes('e')) w = Math.max(MIN_W, w + dx)
    if (r.edge.includes('s')) h = Math.max(MIN_H, h + dy)
    if (r.edge.includes('w')) { w = Math.max(MIN_W, w - dx); x = r.startPX + r.startW - w }
    if (r.edge.includes('n')) { h = Math.max(MIN_H, h - dy); y = r.startPY + r.startH - h }
    setSize({ w, h })
    setPos({ x, y })
  }, [])

  const onResizeUp = useCallback(() => { resizeRef.current = null }, [])

  const makeRP = (edge: Edge) => ({
    edge,
    onPD: (e: React.PointerEvent<HTMLDivElement>) => onResizeDown(edge, e),
    onPM: onResizeMove,
    onPU: onResizeUp,
  })

  const syncScrollState = useCallback(() => {
    const container = scrollAreaRef.current
    if (!container) return

    const maxScroll = Math.max(container.scrollHeight - container.clientHeight, 0)
    const distanceFromBottom = maxScroll - container.scrollTop
    const nearBottom = distanceFromBottom <= 56
    nearBottomRef.current = nearBottom
    setShowScrollToBottom(!nearBottom && maxScroll > 0)

    const containerRect = container.getBoundingClientRect()
    const messageWindows = messages
      .map((msg, index) => {
        const node = messageRefs.current[msg.id]
        if (!node) return null
        const rect = node.getBoundingClientRect()
        const top = rect.top - containerRect.top + container.scrollTop
        const bottom = top + rect.height
        return { index, top, bottom }
      })
      .filter((entry): entry is { index: number; top: number; bottom: number } => entry !== null)

    if (messageWindows.length > 0) {
      const viewportTopPx = container.scrollTop + 4
      const viewportBottomPx = container.scrollTop + container.clientHeight - 4
      const firstVisible = messageWindows.find(entry => entry.bottom > viewportTopPx) ?? messageWindows[0]
      const lastVisible = [...messageWindows].reverse().find(entry => entry.top < viewportBottomPx) ?? messageWindows[messageWindows.length - 1]
      const topRatio = messages.length > 0 ? firstVisible.index / messages.length : 0
      const heightRatio = messages.length > 0
        ? Math.max((lastVisible.index - firstVisible.index + 1) / messages.length, 1 / messages.length)
        : 1
      setOverviewViewport({ top: topRatio, height: Math.min(heightRatio, 1) })
      return
    }

    const heightRatio = container.scrollHeight > 0
      ? Math.min(1, container.clientHeight / container.scrollHeight)
      : 1
    const topRatio = maxScroll > 0 ? container.scrollTop / maxScroll : 0
    setOverviewViewport({ top: topRatio, height: heightRatio })
  }, [messages])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const container = scrollAreaRef.current
    if (!container) return

    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: 'end' })
    } else {
      container.scrollTo({ top: container.scrollHeight, behavior })
    }
    window.requestAnimationFrame(syncScrollState)
  }, [messagesEndRef, syncScrollState])

  const jumpToMessage = useCallback((messageId: string) => {
    const target = messageRefs.current[messageId]
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  const jumpToRatio = useCallback((ratio: number) => {
    const container = scrollAreaRef.current
    if (!container) return

    const maxScroll = Math.max(container.scrollHeight - container.clientHeight, 0)
    container.scrollTo({ top: maxScroll * ratio, behavior: 'smooth' })
    window.requestAnimationFrame(syncScrollState)
  }, [syncScrollState])

  useEffect(() => {
    const container = scrollAreaRef.current
    if (!container) return

    syncScrollState()
    container.addEventListener('scroll', syncScrollState, { passive: true })
    window.addEventListener('resize', syncScrollState)
    return () => {
      container.removeEventListener('scroll', syncScrollState)
      window.removeEventListener('resize', syncScrollState)
    }
  }, [syncScrollState])

  useEffect(() => {
    window.requestAnimationFrame(syncScrollState)
  }, [messages.length, maximized, size.w, size.h, historyOpen, configOpen, syncScrollState])

  useEffect(() => {
    const container = scrollAreaRef.current
    if (!container) return

    const frame = window.requestAnimationFrame(() => {
      if (nearBottomRef.current) {
        scrollToBottom(isStreaming ? 'auto' : 'smooth')
      } else {
        syncScrollState()
      }
    })

    return () => window.cancelAnimationFrame(frame)
  }, [isStreaming, messages, scrollToBottom, syncScrollState])

  const shadow = isDark
    ? '0 32px 64px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.4), inset 1px 0 0 rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)'
    : '0 32px 64px rgba(15,23,42,0.22), 0 8px 24px rgba(15,23,42,0.14), inset 1px 0 0 rgba(255,255,255,0.8), inset 0 1px 0 rgba(255,255,255,0.95)'

  const maxStyle: React.CSSProperties = {
    position: 'fixed', left: RAIL_W, top: HEADER_H, right: 0, bottom: STATUS_H,
    width: 'auto', height: 'auto', borderRadius: 0,
  }
  const floatStyle: React.CSSProperties = {
    position: 'fixed', left: pos.x, top: pos.y, width: size.w, height: size.h,
  }

  return (
    <div
      className="flex flex-col overflow-hidden border"
      style={{
        ...(maximized ? maxStyle : floatStyle),
        zIndex: 9000,
        borderColor: maximized ? BORDER : `${TEAL}28`,
        background: PANEL_BG,
        backgroundImage: isDark
          ? 'linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0) 80px)'
          : 'none',
        boxShadow: shadow,
        borderRadius: maximized ? 0 : 14,
      }}
    >
      {/* Resize handles — floating only */}
      {!maximized && (['n','s','e','w','ne','nw','se','sw'] as Edge[]).map(edge => (
        <ResizeHandle key={edge} {...makeRP(edge)} />
      ))}

      {/* ── Chrome header ───────────────────────────────────────────────────── */}
      <div
        className="flex shrink-0 select-none items-center gap-1 px-2.5"
        style={{
          height: 38,
          cursor: maximized ? 'default' : 'grab',
          borderBottom: `1px solid ${BORDER}`,
          background: isDark ? `${TEAL}0A` : `${TEAL}07`,
        }}
        onPointerDown={maximized ? undefined : onDragDown}
        onPointerMove={maximized ? undefined : onDragMove}
        onPointerUp={maximized ? undefined : onDragUp}
      >
        <img
          src="/prism_ai.png"
          alt="PRISM AI"
          className="h-6 w-auto shrink-0 select-none object-contain"
          draggable={false}
        />
        <span className="ml-1 text-[11px] font-bold tracking-wide" style={{ color: TEAL }}>
          PRISM AI
        </span>

        <div className="flex-1" />

        <div className="flex items-center gap-0.5" style={{ pointerEvents: 'auto' }}>
          <WinBtn Icon={Plus}     title="Nouveau chat (⌘N)"                   onClick={handleNewChat} />
          <WinBtn Icon={BookOpen} title="Historique des conversations"          onClick={() => { setHistoryOpen(v => !v); setConfigOpen(false) }} active={historyOpen} />

          <div className="mx-1 h-3.5 w-px" style={{ background: BORDER }} />

          <WinBtn Icon={Settings2} title="Paramètres du chat" onClick={() => { setConfigOpen(v => !v); setHistoryOpen(false) }} active={configOpen} />
          <WinBtn
            Icon={maximized ? Minimize2 : Maximize2}
            title={maximized ? 'Réduire (restaurer en fenêtre)' : 'Maximiser (plein workspace)'}
            onClick={() => setMaximized(v => !v)}
            active={maximized}
          />
          <WinBtn Icon={X} title="Fermer" onClick={onClose} danger />
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* History sidebar */}
        {historyOpen && (
          <HistorySidebar
            conversations={conversations}
            currentId={currentConvId}
            onLoad={handleLoadConversation}
            onDelete={handleDeleteConversation}
            onClose={() => setHistoryOpen(false)}
          />
        )}

        {/* Main content or config */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {configOpen ? (
            <ConfigPanel config={config} onChange={handleConfigChange} onClose={() => setConfigOpen(false)} />
          ) : (
            <>
              {/* Messages */}
              <div className="relative flex-1 min-h-0">
                <div
                  ref={scrollAreaRef}
                  className="h-full overflow-y-auto px-3 py-3"
                  style={{ paddingRight: messages.length > 0 ? 44 : 12 }}
                >
                  {messages.length === 0 ? (
                    /* Empty state */
                    <div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
                      <img
                        src="/prism_ai.png"
                        alt="PRISM AI"
                        className="h-24 w-auto select-none object-contain"
                        draggable={false}
                      />
                      <div>
                        <p className="text-[12.5px] font-semibold" style={{ color: TEXT_DIM }}>PRISM AI</p>
                        <p className="mt-1.5 max-w-[220px] text-[11px] leading-relaxed" style={{ color: TEXT_DIM, opacity: 0.55 }}>
                          Analyse SIL contextuelle, suggestions architecture IEC 61511, diagnostic en langage naturel.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {messages.map(msg => (
                        <div
                          key={msg.id}
                          ref={node => {
                            if (node) messageRefs.current[msg.id] = node
                            else delete messageRefs.current[msg.id]
                          }}
                        >
                          <MessageBubble
                            msg={msg}
                            noteId={msg.role === 'assistant' ? findExistingAssistantNoteId(msg) : undefined}
                            noteActionsEnabled={!isStreaming}
                            createNoteLabel={createNoteLabel}
                            openNoteLabel={openNoteLabel}
                            onNoteAction={handleAssistantNoteAction}
                            proposalActive={aiDraftPreview?.messageId === msg.id || aiProjectDraftPreview?.messageId === msg.id || aiLibraryDraftPreview?.messageId === msg.id}
                            proposalCompleted={Boolean(findExistingProposalResult(msg))}
                            onProposalOpen={handleProposalOpen}
                          />
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {messages.length > 1 && (
                  <ConversationOverview
                    messages={messages}
                    viewportTop={overviewViewport.top}
                    viewportHeight={overviewViewport.height}
                    onJumpToMessage={jumpToMessage}
                    onJumpToRatio={jumpToRatio}
                  />
                )}

                {showScrollToBottom && (
                  <button
                    type="button"
                    title="Aller en bas"
                    onClick={() => scrollToBottom('smooth')}
                    className="absolute bottom-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border transition-colors"
                    style={{
                      right: messages.length > 1 ? 44 : 12,
                      borderColor: `${TEAL}30`,
                      background: isDark ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.94)',
                      color: TEAL,
                      boxShadow: isDark ? '0 8px 20px rgba(0,0,0,0.35)' : '0 8px 20px rgba(15,23,42,0.14)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(15,23,42,1)' : 'rgba(255,255,255,1)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = isDark ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.94)' }}
                  >
                    <ChevronDown size={14} />
                  </button>
                )}
              </div>

              {/* Input area */}
              <div
                className="shrink-0 border-t px-2.5 py-2"
                style={{ borderColor: BORDER }}
              >
                {attachPickerOpen && (
                  <AttachPicker
                    sifs={allSIFs}
                    workspaceItems={workspaceItems}
                    attachedContext={attachedContext}
                    attachedWorkspaceItems={attachedWorkspaceItems}
                    onAttachSIF={handleAttachSIFSelection}
                    onToggleWorkspaceItem={toggleWorkspaceAttachment}
                    onClose={() => setAttachPickerOpen(false)}
                  />
                )}

                {(strictMode || attachedContext || attachedWorkspaceItems.length > 0) && (
                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                    {strictMode && (
                      <div
                        className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
                        style={{ borderColor: `${COMMAND_BADGE_COLOR}40`, background: `${COMMAND_BADGE_COLOR}12`, color: COMMAND_BADGE_COLOR }}
                      >
                        <span className="rounded px-1 py-0 text-[8px] font-bold uppercase tracking-wide" style={{ background: `${COMMAND_BADGE_COLOR}24`, color: COMMAND_BADGE_COLOR }}>
                          STRICT
                        </span>
                        <span>{strictModeLabel}</span>
                        <button
                          type="button"
                          onClick={() => applyStrictMode(false)}
                          className="ml-0.5 flex h-3 w-3 items-center justify-center rounded-full transition-colors"
                          style={{ color: COMMAND_BADGE_COLOR }}
                          onMouseEnter={e => { e.currentTarget.style.background = `${COMMAND_BADGE_COLOR}30` }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                        >
                          <X size={8} />
                        </button>
                      </div>
                    )}
                    {attachedContext && (
                      <div
                        className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
                        style={{ borderColor: `${TEAL}30`, background: `${TEAL}0E`, color: TEAL }}
                      >
                        <Paperclip size={9} />
                        <span className="rounded px-1 py-0 text-[8px] font-bold uppercase tracking-wide" style={{ background: `${TEAL}24`, color: TEAL }}>
                          SIF
                        </span>
                        <span className="max-w-[170px] truncate">{attachedContext.sifName}</span>
                        <button
                          type="button"
                          onClick={() => setAttachedContext(null)}
                          className="ml-0.5 flex h-3 w-3 items-center justify-center rounded-full transition-colors"
                          style={{ color: TEAL }}
                          onMouseEnter={e => { e.currentTarget.style.background = `${TEAL}30` }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                        >
                          <X size={8} />
                        </button>
                      </div>
                    )}
                    {attachedWorkspaceItems.map(item => (
                      <div
                        key={item.nodeId}
                        className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
                        style={{ borderColor: `${TEAL}30`, background: `${TEAL}0E`, color: TEAL }}
                      >
                        <Paperclip size={9} />
                        <span className="rounded px-1 py-0 text-[8px] font-bold uppercase tracking-wide" style={{ background: `${TEAL}24`, color: TEAL }}>
                          {item.nodeType}
                        </span>
                        <span className="max-w-[150px] truncate">{item.nodeName}</span>
                        <button
                          type="button"
                          onClick={() => removeWorkspaceAttachment(item.nodeId)}
                          className="ml-0.5 flex h-3 w-3 items-center justify-center rounded-full transition-colors"
                          style={{ color: TEAL }}
                          onMouseEnter={e => { e.currentTarget.style.background = `${TEAL}30` }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                        >
                          <X size={8} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Input row */}
                <div
                  className="rounded-xl border px-2.5 py-2 transition-colors"
                  style={{ borderColor: BORDER, background: isDark ? 'rgba(255,255,255,0.04)' : PAGE_BG }}
                  onFocus={() => {}} // handled by textarea
                >
                  {inputModeConfig && (
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold"
                        style={{
                          color: inputModeConfig.badgeColor,
                          background: `${inputModeConfig.badgeColor}18`,
                          border: `1px solid ${inputModeConfig.badgeColor}40`,
                        }}
                      >
                        {inputModeConfig.badge}
                      </span>
                      {activeCommandTokenBadge && (
                        <span
                          className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold"
                          style={{
                            color: activeCommandTokenBadge.color,
                            background: `${activeCommandTokenBadge.color}18`,
                            border: `1px solid ${activeCommandTokenBadge.color}40`,
                          }}
                        >
                          {activeCommandTokenBadge.label}
                        </span>
                      )}
                    </div>
                  )}
                  <textarea
                    ref={composerRef}
                    rows={1}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={composerPlaceholder}
                    className="w-full resize-none bg-transparent text-[12px] leading-relaxed outline-none"
                    style={{
                      color: TEXT,
                      maxHeight: 120,
                      overflowY: 'auto',
                    }}
                    onInput={e => {
                      const t = e.currentTarget
                      t.style.height = 'auto'
                      t.style.height = `${Math.min(t.scrollHeight, 120)}px`
                    }}
                  />
                  {activeCommandMenuItems.length > 0 && (
                    <ComposerCommandMenu
                      items={activeCommandMenuItems}
                      selectedIndex={Math.min(commandMenuIndex, activeCommandMenuItems.length - 1)}
                      onHover={setCommandMenuIndex}
                      layout={inputMode === 'sif' ? 'attachment' : 'command'}
                    />
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <button
                        type="button"
                        onClick={toggleAttachPicker}
                        className="flex h-7 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-[10px] font-medium transition-colors"
                        style={{
                          borderColor: attachPickerOpen || attachmentCount > 0 ? `${TEAL}50` : BORDER,
                          background: attachPickerOpen || attachmentCount > 0 ? `${TEAL}12` : 'transparent',
                          color: attachPickerOpen || attachmentCount > 0 ? TEAL : TEXT_DIM,
                        }}
                      >
                        <Paperclip size={11} />
                        <span>Joindre</span>
                        {attachmentCount > 0 && (
                          <span
                            className="rounded-full px-1 py-0 text-[8px] font-bold"
                            style={{ background: `${TEAL}18`, color: TEAL }}
                          >
                            {attachmentCount}
                          </span>
                        )}
                      </button>

                      <div className="min-w-0 max-w-[220px] flex-1">
                        <select
                          value={config.model}
                          onChange={e => handleConfigChange({ ...config, model: e.target.value })}
                          className="h-7 w-full rounded-lg border px-2.5 text-[10px] font-medium outline-none"
                          style={{
                            borderColor: BORDER,
                            background: isDark ? 'rgba(255,255,255,0.03)' : PANEL_BG,
                            color: TEXT,
                          }}
                        >
                          {(['Anthropic', 'Mistral AI'] as const).map(group => (
                            <optgroup key={group} label={group}>
                              {MODELS.filter(m => m.group === group).map(model => (
                                <option key={model.id} value={model.id}>
                                  {model.label}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => { void handleSend() }}
                      disabled={!input.trim() || isStreaming}
                      className="flex h-7 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[10px] font-semibold transition-all"
                      style={{
                        background: input.trim() && !isStreaming ? `${TEAL}22` : 'transparent',
                        color: input.trim() && !isStreaming ? TEAL : TEXT_DIM,
                        opacity: input.trim() && !isStreaming ? 1 : 0.4,
                        border: `1px solid ${input.trim() && !isStreaming ? `${TEAL}40` : BORDER}`,
                      }}
                    >
                      <span>Envoyer</span>
                      <Send size={11} />
                    </button>
                  </div>
                </div>

                <p className="mt-1 text-center text-[9px]" style={{ color: TEXT_DIM, opacity: 0.35 }}>
                  {config.model} · PRISM AI peut faire des erreurs
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
