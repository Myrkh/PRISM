/**
 * FloatingPanel — detached, draggable panel rendered via React portal.
 * Used by RightPanelSection when the user clicks the "detach" icon.
 */
import { useCallback, useRef, useState, type ElementType, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { PanelRightClose } from 'lucide-react'
import { usePrismTheme } from '@/styles/usePrismTheme'

const FLOAT_DEFAULT_W = 340
const FLOAT_DEFAULT_H = 480

interface FloatingPanelProps {
  title: string
  Icon: ElementType
  noPadding?: boolean
  onClose: () => void
  children: ReactNode
}

export function FloatingPanel({ title, Icon, noPadding, onClose, children }: FloatingPanelProps) {
  const { BORDER, PANEL_BG, TEAL, TEXT_DIM, isDark } = usePrismTheme()

  const [pos, setPos] = useState(() => ({
    x: Math.max(20, window.innerWidth - FLOAT_DEFAULT_W - 80),
    y: 80,
  }))

  const dragRef = useRef<{
    startX: number
    startY: number
    originX: number
    originY: number
  } | null>(null)

  const onHeaderPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Don't drag when clicking a button inside the header
    if ((e.target as HTMLElement).closest('button')) return
    dragRef.current = { startX: e.clientX, startY: e.clientY, originX: pos.x, originY: pos.y }
    e.currentTarget.setPointerCapture(e.pointerId)
    e.preventDefault()
  }, [pos.x, pos.y])

  const onHeaderPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    setPos({
      x: Math.max(0, dragRef.current.originX + e.clientX - dragRef.current.startX),
      y: Math.max(0, dragRef.current.originY + e.clientY - dragRef.current.startY),
    })
  }, [])

  const onHeaderPointerUp = useCallback(() => {
    dragRef.current = null
  }, [])

  return createPortal(
    <div
      className="fixed flex flex-col overflow-hidden rounded-xl border"
      style={{
        left: pos.x,
        top: pos.y,
        width: FLOAT_DEFAULT_W,
        height: FLOAT_DEFAULT_H,
        zIndex: 9000,
        borderColor: BORDER,
        background: PANEL_BG,
        boxShadow: isDark
          ? '0 24px 56px rgba(0,0,0,0.55), 0 8px 24px rgba(0,0,0,0.35), inset 1px 0 0 rgba(255,255,255,0.04)'
          : '0 24px 56px rgba(15,23,42,0.20), 0 8px 24px rgba(15,23,42,0.12), inset 1px 0 0 rgba(255,255,255,0.8)',
      }}
    >
      {/* Drag handle header */}
      <div
        className="flex shrink-0 select-none items-center gap-2 px-3"
        style={{
          height: 36,
          cursor: 'grab',
          background: isDark ? `${TEAL}0C` : `${TEAL}08`,
          borderBottom: `1px solid ${BORDER}`,
        }}
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={onHeaderPointerUp}
      >
        <Icon size={13} style={{ color: TEAL, flexShrink: 0 }} />
        <span
          className="flex-1 text-[10px] font-bold uppercase tracking-widest"
          style={{ color: TEAL }}
        >
          {title}
        </span>
        <button
          type="button"
          title="Réattacher"
          onClick={onClose}
          className="inline-flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-white/10"
          style={{ color: TEXT_DIM }}
        >
          <PanelRightClose size={13} />
        </button>
      </div>

      {/* Content */}
      {noPadding
        ? <div className="min-h-0 flex-1 flex flex-col overflow-hidden">{children}</div>
        : (
          <div className="min-h-0 flex-1 overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
            <div className="px-3 py-3">{children}</div>
          </div>
        )
      }
    </div>,
    document.body,
  )
}
