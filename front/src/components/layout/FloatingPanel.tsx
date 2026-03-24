/**
 * FloatingPanel — detached, draggable + resizable panel rendered via React portal.
 * Used by RightPanelSection when the user clicks the "detach" icon.
 */
import { useCallback, useRef, useState, type ElementType, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { PanelRightClose } from 'lucide-react'
import { usePrismTheme } from '@/styles/usePrismTheme'

const FLOAT_DEFAULT_W = 340
const FLOAT_DEFAULT_H = 480
const MIN_W = 220
const MIN_H = 140
const HANDLE = 6 // resize hit-area thickness in px

type Edge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

const EDGE_CURSOR: Record<Edge, string> = {
  n: 'ns-resize', s: 'ns-resize',
  e: 'ew-resize', w: 'ew-resize',
  ne: 'nesw-resize', sw: 'nesw-resize',
  nw: 'nwse-resize', se: 'nwse-resize',
}

/** Absolute-positioned resize handle strips/corners */
function ResizeHandle({
  edge,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  edge: Edge
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void
  onPointerUp: () => void
}) {
  const isCorner = edge.length === 2
  const style: React.CSSProperties = {
    position: 'absolute',
    cursor: EDGE_CURSOR[edge],
    zIndex: 10,
    // Edges
    ...(edge === 'n'  && { top: 0,    left: HANDLE, right: HANDLE, height: HANDLE }),
    ...(edge === 's'  && { bottom: 0, left: HANDLE, right: HANDLE, height: HANDLE }),
    ...(edge === 'e'  && { right: 0,  top: HANDLE, bottom: HANDLE, width: HANDLE }),
    ...(edge === 'w'  && { left: 0,   top: HANDLE, bottom: HANDLE, width: HANDLE }),
    // Corners
    ...(edge === 'ne' && { top: 0,    right: 0,  width: HANDLE * 2, height: HANDLE * 2 }),
    ...(edge === 'nw' && { top: 0,    left: 0,   width: HANDLE * 2, height: HANDLE * 2 }),
    ...(edge === 'se' && { bottom: 0, right: 0,  width: HANDLE * 2, height: HANDLE * 2 }),
    ...(edge === 'sw' && { bottom: 0, left: 0,   width: HANDLE * 2, height: HANDLE * 2 }),
  }
  void isCorner
  return (
    <div
      style={style}
      onPointerDown={e => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); onPointerDown(e) }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    />
  )
}

interface FloatingPanelProps {
  title: string
  Icon: ElementType
  noPadding?: boolean
  onClose: () => void
  children: ReactNode
}

export function FloatingPanel({ title, Icon, noPadding, onClose, children }: FloatingPanelProps) {
  const { BORDER, PANEL_BG, TEAL, TEXT_DIM, isDark } = usePrismTheme()

  const [pos,  setPos]  = useState(() => ({
    x: Math.max(20, window.innerWidth - FLOAT_DEFAULT_W - 80),
    y: 80,
  }))
  const [size, setSize] = useState({ w: FLOAT_DEFAULT_W, h: FLOAT_DEFAULT_H })

  // ── Drag ────────────────────────────────────────────────────────────────────
  const dragRef = useRef<{
    startX: number; startY: number
    originX: number; originY: number
  } | null>(null)

  const onHeaderPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
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

  const onHeaderPointerUp = useCallback(() => { dragRef.current = null }, [])

  // ── Resize ───────────────────────────────────────────────────────────────────
  const resizeRef = useRef<{
    edge: Edge
    startX: number; startY: number
    startW: number; startH: number
    startPosX: number; startPosY: number
  } | null>(null)

  const onResizePointerDown = useCallback((edge: Edge, e: React.PointerEvent<HTMLDivElement>) => {
    resizeRef.current = {
      edge,
      startX: e.clientX, startY: e.clientY,
      startW: size.w,   startH: size.h,
      startPosX: pos.x, startPosY: pos.y,
    }
  }, [size, pos])

  const onResizePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const r = resizeRef.current
    if (!r) return
    const dx = e.clientX - r.startX
    const dy = e.clientY - r.startY
    const edge = r.edge

    let newW = r.startW, newH = r.startH
    let newX = r.startPosX, newY = r.startPosY

    if (edge.includes('e')) newW = Math.max(MIN_W, r.startW + dx)
    if (edge.includes('s')) newH = Math.max(MIN_H, r.startH + dy)
    if (edge.includes('w')) { newW = Math.max(MIN_W, r.startW - dx); newX = r.startPosX + r.startW - newW }
    if (edge.includes('n')) { newH = Math.max(MIN_H, r.startH - dy); newY = r.startPosY + r.startH - newH }

    setSize({ w: newW, h: newH })
    setPos({ x: newX, y: newY })
  }, [])

  const onResizePointerUp = useCallback(() => { resizeRef.current = null }, [])

  const makeHandleProps = (edge: Edge) => ({
    edge,
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => onResizePointerDown(edge, e),
    onPointerMove: onResizePointerMove,
    onPointerUp:   onResizePointerUp,
  })

  return createPortal(
    <div
      className="fixed flex flex-col overflow-hidden rounded-xl border"
      style={{
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: size.h,
        zIndex: 9000,
        borderColor: BORDER,
        background: PANEL_BG,
        boxShadow: isDark
          ? '0 24px 56px rgba(0,0,0,0.55), 0 8px 24px rgba(0,0,0,0.35), inset 1px 0 0 rgba(255,255,255,0.04)'
          : '0 24px 56px rgba(15,23,42,0.20), 0 8px 24px rgba(15,23,42,0.12), inset 1px 0 0 rgba(255,255,255,0.8)',
      }}
    >
      {/* Resize handles — all 8 edges/corners */}
      {(['n','s','e','w','ne','nw','se','sw'] as Edge[]).map(edge => (
        <ResizeHandle key={edge} {...makeHandleProps(edge)} />
      ))}

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
