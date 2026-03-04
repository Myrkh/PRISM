import { cn } from '@/lib/utils'
import { SIL_META, type SILLevel } from '@/core/types'
import { useAppStore } from '@/store/appStore'

interface SILBadgeProps {
  sil: SILLevel
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function SILBadge({ sil, size = 'md', className }: SILBadgeProps) {
  const isDark = useAppStore(s => s.isDark)
  const meta   = SIL_META[sil]

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-2.5 py-1',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border font-mono font-semibold',
        sizeClasses[size],
        className,
      )}
      style={{
        color: meta.color,
        background: isDark ? meta.bgDark : meta.bgLight,
        borderColor: isDark ? meta.borderDark : meta.borderLight,
      }}
    >
      {meta.label}
    </span>
  )
}
