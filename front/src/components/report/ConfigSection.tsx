import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { usePrismTheme } from '@/styles/usePrismTheme'

export function ConfigSection({
  title,
  defaultOpen = true,
  children,
  className = ''
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
  className?: string
}) {
  const { BORDER, CARD_BG, TEXT_DIM } = usePrismTheme()
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div
      className={`rounded-xl border ${className}`}
      style={{ background: CARD_BG, borderColor: BORDER }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-3 py-3 text-left"
      >
        <span
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: TEXT_DIM }}
        >
          {title}
        </span>
        {open ? <ChevronUp size={14} style={{ color: TEXT_DIM }} /> : <ChevronDown size={14} style={{ color: TEXT_DIM }} />}
      </button>

      {open && (
        <div className="space-y-3 border-t px-3 pb-3 pt-3" style={{ borderColor: BORDER }}>
          {children}
        </div>
      )}
    </div>
  )
}

export function ToggleRow({
  label,
  desc,
  value,
  onChange,
}: {
  label: string
  desc?: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  const { BORDER, CARD_BG, TEXT, TEXT_DIM } = usePrismTheme()
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5" style={{ borderColor: BORDER, background: CARD_BG }}>
      <div className="min-w-0">
        <p className="text-sm font-semibold" style={{ color: TEXT }}>
          {label}
        </p>
        {desc && (
          <p className="mt-0.5 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
            {desc}
          </p>
        )}
      </div>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  )
}
