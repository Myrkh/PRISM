import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from 'react'
import React from 'react'
import { ChevronRight, ExternalLink, PanelRightOpen } from 'lucide-react'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { IntercalaireCard, IntercalaireTabBar } from '@/components/layout/IntercalaireTabBar'
import { useLayout } from '@/components/layout/SIFWorkbenchLayout'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/appStore'
import { FloatingPanel } from './FloatingPanel'

// ─── Constants ────────────────────────────────────────────────────────────────

const HEADER_H     = 36   // px — section header height
const MIN_CONTENT_H = 48  // px — minimum visible content when section is open

// ─── SectionDivider (drag handle between two open sections) ──────────────────

function SectionDivider({
  isActive,
  onPointerDown,
}: {
  isActive: boolean
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void
}) {
  const { BORDER, TEAL } = usePrismTheme()
  const [hovered, setHovered] = useState(false)
  const active = isActive || hovered
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      className="relative flex shrink-0 cursor-row-resize items-center justify-center transition-colors"
      style={{ height: 5, background: active ? `${TEAL}18` : 'transparent', touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <div
        className="h-0.5 w-8 rounded-full transition-all"
        style={{ background: active ? TEAL : `${BORDER}88`, opacity: active ? 0.9 : 0.5 }}
      />
    </div>
  )
}

// ─── Section context ──────────────────────────────────────────────────────────

interface SectionCtxValue {
  closedIds: Set<string>
  toggle: (id: string) => void
  flexSizes: Map<string, number>
  resizingPair: { topId: string; bottomId: string } | null
  startResize: (topId: string, bottomId: string, e: React.PointerEvent) => void
  floatingIds: Set<string>
  toggleFloat: (id: string) => void
}

const SectionCtx = createContext<SectionCtxValue | null>(null)

// ─── Legacy tab API ───────────────────────────────────────────────────────────

export interface RightPanelRailItem<T extends string = string> {
  id: T
  label: string
  Icon: ElementType
  badge?: boolean | number | string | null
}

// ─── RightPanelSection ────────────────────────────────────────────────────────

interface SectionProps {
  id: string
  label: string
  Icon: ElementType
  children: ReactNode
  noPadding?: boolean
  variant?: 'accordion' | 'static'
}

export function RightPanelSection({ id, label, Icon, children, noPadding, variant = 'accordion' }: SectionProps) {
  const { BORDER, TEAL, TEXT_DIM } = usePrismTheme()
  const ctx = useContext(SectionCtx)
  const isOpen    = ctx ? !ctx.closedIds.has(id) : true
  const isFloating = ctx ? ctx.floatingIds.has(id) : false
  const flexGrow  = ctx ? (ctx.flexSizes.get(id) ?? 1) : 1

  // ── Floating / detached mode ──────────────────────────────────────────────
  if (isFloating) {
    return (
      <>
        {/* Placeholder slot in sidebar */}
        <div
          className="flex shrink-0 items-center gap-2 px-3"
          style={{
            height: HEADER_H,
            borderBottom: `1px solid ${BORDER}`,
            background: `${TEAL}06`,
            flex: '0 0 auto',
          }}
        >
          <Icon size={13} style={{ color: TEXT_DIM, flexShrink: 0 }} />
          <span
            className="flex-1 text-[10px] font-bold uppercase tracking-widest"
            style={{ color: TEXT_DIM }}
          >
            {label}
          </span>
          <span className="text-[10px]" style={{ color: TEXT_DIM }}>Détaché</span>
          <button
            type="button"
            title="Réattacher"
            onClick={() => ctx?.toggleFloat(id)}
            className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded transition-colors hover:bg-white/10"
            style={{ color: TEAL }}
          >
            <PanelRightOpen size={11} />
          </button>
        </div>

        {/* Floating portal */}
        <FloatingPanel title={label} Icon={Icon} noPadding={noPadding} onClose={() => ctx?.toggleFloat(id)}>
          {children}
        </FloatingPanel>
      </>
    )
  }

  if (variant === 'static') {
    return (
      <div className="flex shrink-0 flex-col overflow-hidden border-b" style={{ borderColor: BORDER }}>
        <div
          className="group flex w-full shrink-0 items-center gap-2 px-3"
          style={{
            height: HEADER_H,
            background: `${TEAL}0C`,
            borderBottom: `1px solid ${BORDER}`,
            flexShrink: 0,
          }}
        >
          <Icon size={13} style={{ color: TEAL, flexShrink: 0 }} />
          <span
            className="flex-1 text-left text-[10px] font-bold uppercase tracking-widest"
            style={{ color: TEAL }}
          >
            {label}
          </span>

          <span
            className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100"
            style={{ color: TEXT_DIM }}
            role="button"
            title="Détacher"
            onClick={e => { e.stopPropagation(); ctx?.toggleFloat(id) }}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); ctx?.toggleFloat(id) } }}
            tabIndex={-1}
          >
            <ExternalLink size={10} />
          </span>
        </div>

        {noPadding
          ? <div className="min-h-0 flex flex-col overflow-hidden">{children}</div>
          : <div className="px-3 py-3">{children}</div>}
      </div>
    )
  }

  // ── Normal accordion mode ─────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col overflow-hidden"
      style={
        isOpen
          ? { flex: `${flexGrow} 1 0px`, minHeight: HEADER_H + MIN_CONTENT_H }
          : { flex: '0 0 auto' }
      }
    >
      {/* Header */}
      <button
        type="button"
        className="group flex w-full shrink-0 items-center gap-2 px-3 transition-colors"
        style={{
          height: HEADER_H,
          background: isOpen ? `${TEAL}0C` : 'transparent',
          borderBottom: `1px solid ${BORDER}`,
          flexShrink: 0,
        }}
        onClick={() => ctx?.toggle(id)}
      >
        <Icon size={13} style={{ color: isOpen ? TEAL : TEXT_DIM, flexShrink: 0 }} />
        <span
          className="flex-1 text-left text-[10px] font-bold uppercase tracking-widest"
          style={{ color: isOpen ? TEAL : TEXT_DIM }}
        >
          {label}
        </span>

        {/* Detach button — visible on hover */}
        <span
          className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100"
          style={{ color: TEXT_DIM }}
          role="button"
          title="Détacher"
          onClick={e => { e.stopPropagation(); ctx?.toggleFloat(id) }}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); ctx?.toggleFloat(id) } }}
          tabIndex={-1}
        >
          <ExternalLink size={10} />
        </span>

        <ChevronRight
          size={11}
          style={{
            color: isOpen ? TEAL : TEXT_DIM,
            transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease',
            flexShrink: 0,
          }}
        />
      </button>

      {/* Content */}
      {isOpen && (
        noPadding
          ? <div className="min-h-0 flex-1 flex flex-col overflow-hidden">{children}</div>
          : (
            <div className="min-h-0 flex-1 overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
              <div className="px-3 py-3">{children}</div>
            </div>
          )
      )}
    </div>
  )
}

// ─── RightPanelShell ──────────────────────────────────────────────────────────

export function RightPanelShell<T extends string = string>({
  items,
  active,
  onSelect,
  children,
  contentBg,
  openSectionId,
  persistKey,
  staticSections = false,
}: {
  items?: readonly RightPanelRailItem<T>[]
  active?: T
  onSelect?: (id: T) => void
  children: ReactNode
  contentBg?: string
  openSectionId?: string | null
  /** Stable key for persisting accordion open/closed state across navigation. */
  persistKey?: string
  staticSections?: boolean
}) {
  const { BORDER, CARD_BG, PANEL_BG, SHADOW_DOCK, SHADOW_PANEL, SHADOW_SOFT, isDark } = usePrismTheme()
  const { isRightPanelOpen } = useLayout()
  const resolvedContentBg = contentBg ?? PANEL_BG
  const isLegacy = items && items.length > 0

  // ── Preferences (for persistence) ────────────────────────────────────────
  const preferences        = useAppStore(s => s.preferences)
  const updateAppPreferences = useAppStore(s => s.updateAppPreferences)

  // ── Accordion state ──────────────────────────────────────────────────────
  const containerRef  = useRef<HTMLDivElement>(null)
  const [closedIds,   setClosedIds]   = useState<Set<string>>(() => {
    if (!persistKey) return new Set<string>()
    const saved = preferences.rightPanelSectionStates?.[persistKey]
    if (saved !== undefined) return new Set(saved)
    // No saved state yet — apply startup default
    if (preferences.rightPanelDefaultState === 'closed') {
      const ids = React.Children.toArray(children)
        .filter((c): c is React.ReactElement<SectionProps> =>
          React.isValidElement(c) && c.type === RightPanelSection,
        )
        .map(c => c.props.id)
      return new Set(ids)
    }
    return new Set<string>()
  })
  const [floatingIds, setFloatingIds] = useState<Set<string>>(() => new Set())
  const [flexSizes,   setFlexSizes]   = useState<Map<string, number>>(() => new Map())
  const [isResizing,  setIsResizing]  = useState(false)
  const [resizingPair, setResizingPair] = useState<{ topId: string; bottomId: string } | null>(null)

  const resizeData = useRef<{
    topId: string; bottomId: string
    startY: number
    startTopFlex: number; startBottomFlex: number
    combinedFlex: number
    pixPerFlex: number; minFlex: number
  } | null>(null)

  const persistClosed = useCallback((next: Set<string>) => {
    if (!persistKey) return
    const { preferences: p, updateAppPreferences: upd } = useAppStore.getState()
    upd({
      rightPanelSectionStates: {
        ...(p.rightPanelSectionStates ?? {}),
        [persistKey]: [...next],
      },
    })
  }, [persistKey])

  const toggle = useCallback((id: string) => {
    setClosedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      persistClosed(next)
      return next
    })
  }, [persistClosed])

  const toggleFloat = useCallback((id: string) => {
    setFloatingIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  useEffect(() => {
    if (!openSectionId) return
    setClosedIds(prev => {
      if (!prev.has(openSectionId)) return prev
      const next = new Set(prev)
      next.delete(openSectionId)
      persistClosed(next)
      return next
    })
  }, [openSectionId, persistClosed])

  const startResize = useCallback((
    topId: string,
    bottomId: string,
    e: React.PointerEvent,
  ) => {
    if (!containerRef.current) return

    // Collect open section IDs from children at the time of drag start
    const sectionEls = React.Children.toArray(children)
      .filter((c): c is React.ReactElement<SectionProps> =>
        React.isValidElement(c) && c.type === RightPanelSection,
      )

    const openIds   = sectionEls.map(s => s.props.id).filter(id => !closedIds.has(id))
    const totalFlex = openIds.reduce((sum, id) => sum + (flexSizes.get(id) ?? 1), 0)
    const closedCnt = sectionEls.length - openIds.length
    const containerH = containerRef.current.offsetHeight
    const availableH = Math.max(1, containerH - closedCnt * HEADER_H)
    const pixPerFlex = availableH / totalFlex
    const minFlex    = (HEADER_H + MIN_CONTENT_H) / pixPerFlex

    const startTopFlex    = flexSizes.get(topId)    ?? 1
    const startBottomFlex = flexSizes.get(bottomId) ?? 1

    resizeData.current = {
      topId, bottomId,
      startY: e.clientY,
      startTopFlex, startBottomFlex,
      combinedFlex: startTopFlex + startBottomFlex,
      pixPerFlex, minFlex,
    }
    setIsResizing(true)
    setResizingPair({ topId, bottomId })
    e.preventDefault()
  }, [children, closedIds, flexSizes])

  useEffect(() => {
    if (!isResizing || !resizeData.current) return
    const d = resizeData.current

    const onMove = (e: PointerEvent) => {
      const deltaFlex  = (e.clientY - d.startY) / d.pixPerFlex
      const newTopFlex = Math.max(d.minFlex, Math.min(d.combinedFlex - d.minFlex, d.startTopFlex + deltaFlex))
      const newBotFlex = d.combinedFlex - newTopFlex
      setFlexSizes(prev => {
        const next = new Map(prev)
        next.set(d.topId, newTopFlex)
        next.set(d.bottomId, newBotFlex)
        return next
      })
    }

    const onStop = () => {
      setIsResizing(false)
      setResizingPair(null)
      resizeData.current = null
    }

    document.body.style.cursor     = 'row-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup',   onStop)
    window.addEventListener('pointercancel', onStop)
    return () => {
      document.body.style.cursor     = ''
      document.body.style.userSelect = ''
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup',   onStop)
      window.removeEventListener('pointercancel', onStop)
    }
  }, [isResizing])

  const ctxValue = useMemo<SectionCtxValue>(() => ({
    closedIds,
    toggle,
    flexSizes,
    resizingPair,
    startResize,
    floatingIds,
    toggleFloat,
  }), [closedIds, toggle, flexSizes, resizingPair, startResize, floatingIds, toggleFloat])

  // ── Accordion render: pass non-section children through, inject SectionDividers
  //    between adjacent open sections
  function renderAccordion() {
    const rendered: ReactNode[] = []
    let prevOpenSectionId: string | null = null

    React.Children.toArray(children).forEach(child => {
      if (!React.isValidElement(child) || child.type !== RightPanelSection) {
        // Non-section child (e.g. pinned header): render as-is
        rendered.push(child)
        return
      }

      const el     = child as React.ReactElement<SectionProps>
      const id     = el.props.id
      const isOpen = !closedIds.has(id)

      if (isOpen && prevOpenSectionId !== null) {
        rendered.push(
          <SectionDivider
            key={`divider-${prevOpenSectionId}-${id}`}
            isActive={resizingPair?.topId === prevOpenSectionId && resizingPair?.bottomId === id}
            onPointerDown={e => startResize(prevOpenSectionId!, id, e)}
          />,
        )
      }

      rendered.push(el)
      if (isOpen) prevOpenSectionId = id
    })

    return rendered
  }

  return (
    <div
      className="flex h-full flex-col overflow-hidden"
      style={{
        background: resolvedContentBg,
        backgroundImage: isDark
          ? 'radial-gradient(circle at top left, rgba(95,216,210,0.07) 0%, rgba(95,216,210,0) 22%), linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0) 100%)'
          : 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 100%)',
        boxShadow: `${SHADOW_DOCK}, inset 1px 0 0 ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.84)'}, inset 0 1px 0 ${isDark ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.88)'}`,
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
        {isLegacy ? (
          // ── Legacy tab mode ────────────────────────────────────────────
          <>
            <div
              className="shrink-0 px-3 pt-3"
              style={{
                background: resolvedContentBg,
                backgroundImage: isDark ? 'linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0) 100%)' : 'none',
                boxShadow: `${SHADOW_SOFT}, inset 0 1px 0 ${isDark ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.9)'}`,
              }}
            >
              <IntercalaireTabBar
                tabs={items.map(item => ({
                  id: item.id,
                  label: item.label,
                  Icon: item.Icon,
                  badge: item.badge,
                }))}
                active={active!}
                onSelect={id => onSelect?.(id as T)}
                cardBg={CARD_BG}
                stretch={items.length > 1}
                align="start"
                labelSize="md"
                showHints={false}
              />
            </div>
            <div className="min-h-0 flex-1 px-3 pb-3">
              <IntercalaireCard
                tabCount={items.length}
                activeIdx={Math.max(0, items.findIndex(item => item.id === active))}
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
          </>
        ) : (
          // ── Accordion / static section mode ───────────────────────────
          <SectionCtx.Provider value={ctxValue}>
            {staticSections ? (
              <div ref={containerRef} className="flex flex-1 min-h-0 flex-col overflow-hidden">
                {React.Children.toArray(children).filter(child => !(React.isValidElement(child) && child.type === RightPanelSection))}
                <div className="min-h-0 flex-1 overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
                  {React.Children.toArray(children).filter(child => React.isValidElement(child) && child.type === RightPanelSection)}
                </div>
              </div>
            ) : (
              <div
                ref={containerRef}
                className="flex flex-col flex-1 min-h-0 overflow-hidden"
              >
                {renderAccordion()}
              </div>
            )}
          </SectionCtx.Provider>
        )}
      </div>
    </div>
  )
}

// ─── Helper components ────────────────────────────────────────────────────────

export function RightPanelBody({
  children,
  className,
  compact = false,
}: {
  children: ReactNode
  className?: string
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'min-h-0 flex-1 overflow-y-auto',
        compact ? 'px-3 py-3' : 'px-4 py-4',
        className,
      )}
      style={{ scrollbarGutter: 'stable' }}
    >
      {children}
    </div>
  )
}

export function InspectorHero({
  title,
  description,
  aside,
  children,
}: {
  title: string
  description: string
  aside?: ReactNode
  children?: ReactNode
}) {
  const { BORDER, TEXT, TEXT_DIM } = usePrismTheme()
  return (
    <section className="border-b pb-4" style={{ borderColor: `${BORDER}A6` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold" style={{ color: TEXT }}>{title}</p>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>{description}</p>
        </div>
        {aside}
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </section>
  )
}

export function InspectorSection({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  const { BORDER, SHADOW_SOFT, TEAL, TEXT } = usePrismTheme()
  return (
    <section className={cn('border-b pb-4 last:border-b-0 last:pb-0', className)} style={{ borderColor: `${BORDER}A6` }}>
      <div className="mb-3 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: TEAL, boxShadow: SHADOW_SOFT }} />
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEAL }}>{title}</p>
      </div>
      <div style={{ color: TEXT }}>{children}</div>
    </section>
  )
}

export function InspectorBlock({
  title,
  hint,
  children,
  className,
  background,
}: {
  title: string
  hint?: string
  children: ReactNode
  className?: string
  background?: string
}) {
  const { BORDER, PAGE_BG, TEAL, TEXT_DIM } = usePrismTheme()
  return (
    <div
      className={cn('rounded-xl border p-3', className)}
      style={{ borderColor: BORDER, background: background ?? PAGE_BG }}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEAL }}>
        {title}
      </p>
      {hint ? (
        <p className="mt-1 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
          {hint}
        </p>
      ) : null}
      <div className={hint ? 'mt-3' : 'mt-2'}>
        {children}
      </div>
    </div>
  )
}

export function InspectorMetricRow({
  label,
  value,
  color,
  suffix,
}: {
  label: string
  value: string | number
  color: string
  suffix?: string
}) {
  const { BORDER, TEXT_DIM } = usePrismTheme()
  return (
    <div className="flex items-center justify-between border-b py-2 last:border-b-0" style={{ borderColor: `${BORDER}99` }}>
      <span className="text-[10px] uppercase tracking-wider" style={{ color: TEXT_DIM }}>{label}</span>
      <span className="text-[12px] font-semibold font-mono" style={{ color }}>
        {value}{suffix}
      </span>
    </div>
  )
}

export function InspectorSurface({
  children,
  className,
  background,
  borderColor,
}: {
  children: ReactNode
  className?: string
  background?: string
  borderColor?: string
}) {
  const { BORDER, SURFACE } = usePrismTheme()
  return (
    <div
      className={cn('rounded-xl border px-3 py-2.5', className)}
      style={{
        borderColor: borderColor ?? `${BORDER}99`,
        background: background ?? SURFACE,
      }}
    >
      {children}
    </div>
  )
}

export function InspectorStatusBadge({
  label,
  color,
  background,
  borderColor,
  icon,
}: {
  label: string
  color: string
  background: string
  borderColor: string
  icon?: ReactNode
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold"
      style={{ color, background, borderColor }}
    >
      {icon}
      {label}
    </span>
  )
}

export function InspectorReferenceRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  const { BORDER, TEXT, TEXT_DIM } = usePrismTheme()
  return (
    <div className="flex items-start justify-between gap-3 border-b py-2 last:border-b-0" style={{ borderColor: `${BORDER}99` }}>
      <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: TEXT_DIM }}>{label}</span>
      <span className="max-w-[58%] text-right text-sm leading-relaxed" style={{ color: TEXT }}>{value}</span>
    </div>
  )
}

export function InspectorActionButton({
  children,
  onClick,
  color,
  background,
  borderColor,
  className,
}: {
  children: ReactNode
  onClick?: () => void
  color: string
  background: string
  borderColor: string
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'prism-action inline-flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-[11px] font-semibold transition-all',
        className,
      )}
      style={{ borderColor, background, color }}
    >
      {children}
    </button>
  )
}
