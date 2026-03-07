/**
 * shared/ConfirmDialog.tsx — PRISM
 *
 * Dialog de confirmation réutilisable (suppression, archivage, etc.)
 */
import { Loader2 } from 'lucide-react'
import { BORDER, TEXT, TEXT_DIM, TEAL } from '@/styles/tokens'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  danger?: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open, title, message, confirmLabel, danger,
  onConfirm, onCancel, loading,
}: ConfirmDialogProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="rounded-2xl border p-6 shadow-2xl w-full max-w-sm"
        style={{ background: '#14181C', borderColor: BORDER }}>
        <h3 className="text-sm font-bold mb-2" style={{ color: TEXT }}>{title}</h3>
        <p className="text-xs leading-relaxed mb-5" style={{ color: TEXT_DIM }}>{message}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} disabled={loading}
            className="rounded-lg border px-4 py-2 text-sm"
            style={{ borderColor: BORDER, color: TEXT_DIM, background: 'transparent' }}>
            Annuler
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold"
            style={{
              background: danger ? '#EF4444' : `linear-gradient(135deg, ${TEAL}, #007A82)`,
              color: '#fff',
            }}>
            {loading ? <Loader2 size={13} className="animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Hook for confirm dialog state management ────────────────────────────
import { useState, useCallback } from 'react'

interface ConfirmConfig {
  title: string
  message: string
  confirmLabel: string
  danger?: boolean
  onConfirm: () => Promise<void> | void
}

export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmConfig & { open: boolean }>({
    open: false, title: '', message: '', confirmLabel: '', onConfirm: async () => {},
  })
  const [loading, setLoading] = useState(false)

  const show = useCallback((cfg: ConfirmConfig) => {
    setState({ ...cfg, open: true })
  }, [])

  const execute = useCallback(async () => {
    setLoading(true)
    try {
      await state.onConfirm()
    } finally {
      setLoading(false)
      setState(s => ({ ...s, open: false }))
    }
  }, [state])

  const cancel = useCallback(() => {
    setState(s => ({ ...s, open: false }))
  }, [])

  return { state, loading, show, execute, cancel }
}
