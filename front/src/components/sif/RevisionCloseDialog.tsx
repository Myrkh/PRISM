import { useState } from 'react'
import { Loader2, Lock, X } from 'lucide-react'
import type { SIF } from '@/core/types'
import { semantic } from '@/styles/tokens'
import { usePrismTheme } from '@/styles/usePrismTheme'

interface Props {
  sif: SIF
  onClose: () => void
  onConfirm: (payload: { changeDescription: string; createdBy: string }) => Promise<void>
}

export function RevisionCloseDialog({ sif, onClose, onConfirm }: Props) {
  const { BORDER, CARD_BG, PANEL_BG, TEAL, TEXT, TEXT_DIM } = usePrismTheme()
  const [changeDescription, setChangeDescription] = useState('')
  const [createdBy, setCreatedBy] = useState(sif.approvedBy || sif.verifiedBy || sif.madeBy || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!changeDescription.trim()) {
      setError('Change description is required.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await onConfirm({
        changeDescription: changeDescription.trim(),
        createdBy: createdBy.trim(),
      })
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to close this revision.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center"
      style={{ background: 'rgba(5, 8, 12, 0.72)', backdropFilter: 'blur(4px)' }}>
      <div
        className="w-full max-w-[460px] overflow-hidden rounded-2xl shadow-2xl"
        style={{ background: PANEL_BG, border: `1px solid ${BORDER}` }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: BORDER }}>
          <div className="flex items-center gap-2">
            <Lock size={15} style={{ color: TEAL }} />
            <div>
              <p className="text-sm font-black" style={{ color: TEXT }}>Close revision {sif.revision}</p>
              <p className="text-[10px]" style={{ color: TEXT_DIM }}>
                Publish the frozen SIL report and proof test PDFs to Supabase Storage.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ color: TEXT_DIM }}>
            <X size={14} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="rounded-xl border px-3 py-2.5 text-[11px]" style={{ borderColor: BORDER, background: CARD_BG, color: TEXT_DIM }}>
            Revision <strong style={{ color: TEXT }}>{sif.revision}</strong> will be locked after publication.
            Further edits will require a new revision.
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
              Change description
            </label>
            <textarea
              value={changeDescription}
              onChange={e => setChangeDescription(e.target.value)}
              rows={4}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none resize-none"
              style={{ borderColor: BORDER, background: CARD_BG, color: TEXT }}
              placeholder="Summarize what is being published in this revision."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
              Published by
            </label>
            <input
              type="text"
              value={createdBy}
              onChange={e => setCreatedBy(e.target.value)}
              className="h-10 w-full rounded-xl border px-3 text-sm outline-none"
              style={{ borderColor: BORDER, background: CARD_BG, color: TEXT }}
              placeholder="Name"
            />
          </div>

          {error && (
            <p className="rounded-xl px-3 py-2 text-[11px]" style={{ background: `${semantic.error}15`, color: semantic.error }}>
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: BORDER }}>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-[12px] font-semibold"
            style={{ borderColor: BORDER, color: TEXT_DIM }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-black text-white disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #009BA4, #007A82)' }}
          >
            {saving && <Loader2 size={12} className="animate-spin" />}
            Close and publish
          </button>
        </div>
      </div>
    </div>
  )
}
