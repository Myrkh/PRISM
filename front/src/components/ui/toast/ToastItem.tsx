import { useEffect } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { useToastStore } from './toastStore'
import type { Toast } from './types'

const KIND_CONFIG = {
  success: { Icon: CheckCircle2, color: '#10B981', border: 'border-l-[#10B981]' },
  error:   { Icon: XCircle,      color: '#EF4444', border: 'border-l-[#EF4444]' },
  warning: { Icon: AlertTriangle,color: '#F59E0B', border: 'border-l-[#F59E0B]' },
  info:    { Icon: Info,         color: '#0EA5E9', border: 'border-l-[#0EA5E9]' },
}

export function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useToastStore(s => s.dismiss)
  const { Icon, color, border } = KIND_CONFIG[toast.kind]

  useEffect(() => {
    if (!toast.duration) return
    const timer = setTimeout(() => dismiss(toast.id), toast.duration)
    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, dismiss])

  return (
    <div
      className={[
        'flex items-start gap-3 w-[340px] rounded-lg border-l-4 p-3 pr-2',
        border,
        'bg-white border border-zinc-200 shadow-lg',
        'dark:bg-zinc-900 dark:border-zinc-700 dark:shadow-none',
        'transition-all duration-200',
      ].join(' ')}
      role="alert"
    >
      <Icon size={16} style={{ color, flexShrink: 0, marginTop: 2 }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-tight">
          {toast.title}
        </p>
        {toast.message && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">
            {toast.message}
          </p>
        )}
      </div>
      <button
        onClick={() => dismiss(toast.id)}
        className="flex-shrink-0 p-0.5 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  )
}
