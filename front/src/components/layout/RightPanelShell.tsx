import type { ElementType, ReactNode } from 'react'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { IntercalaireCard, IntercalaireTabBar } from '@/components/layout/IntercalaireTabBar'
import { useLayout } from '@/components/layout/SIFWorkbenchLayout'
import { cn } from '@/lib/utils'

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
