import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { usePrismTheme } from '@/styles/usePrismTheme'

export function sidebarPressDown(target: HTMLElement, shadow: string) {
  target.style.transform = 'translateY(1px) scale(0.994)'
  target.style.boxShadow = shadow
}

export function sidebarPressUp(target: HTMLElement, shadow: string) {
  target.style.transform = 'translateY(0) scale(1)'
  target.style.boxShadow = shadow
}

export function sidebarHoverIn(target: HTMLElement, {
  background,
  borderColor,
  boxShadow,
  color,
}: {
  background: string
  borderColor: string
  boxShadow: string
  color?: string
}) {
  target.style.backgroundColor = background
  target.style.borderColor = borderColor
  target.style.boxShadow = boxShadow
  target.style.transform = 'translateY(-0.5px) scale(1)'
  if (color) target.style.color = color
}

export function sidebarHoverOut(target: HTMLElement, {
  background,
  borderColor,
  boxShadow,
  color,
}: {
  background: string
  borderColor: string
  boxShadow: string
  color?: string
}) {
  target.style.backgroundColor = background
  target.style.borderColor = borderColor
  target.style.boxShadow = boxShadow
  target.style.transform = 'translateY(0) scale(1)'
  if (color) target.style.color = color
}

export function SidebarBody({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const { PANEL_BG, SHADOW_SOFT, TEXT, isDark } = usePrismTheme()
  return (
    <div
      className={cn('flex-1 overflow-y-auto px-2 py-3 text-[13px]', className)}
      style={{
        color: TEXT,
        background: PANEL_BG,
        boxShadow: `${SHADOW_SOFT}, inset -1px 0 0 ${isDark ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.78)'}, inset 0 1px 0 ${isDark ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.88)'}, inset 0 -1px 0 ${isDark ? 'rgba(0,0,0,0.24)' : 'rgba(15,23,42,0.05)'}`,
      }}
    >
      {children}
    </div>
  )
}

export function SidebarSectionTitle({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const { TEXT_DIM } = usePrismTheme()
  return (
    <p className={cn('mb-2 px-2 text-[10px] font-bold uppercase tracking-widest', className)} style={{ color: TEXT_DIM }}>
      {children}
    </p>
  )
}
