import { useState } from 'react'
import { Loader2, Lock, X } from 'lucide-react'
import type { SIF } from '@/core/types'
import { getSifOverviewStrings } from '@/i18n/sifOverview'
import { useLocaleStrings } from '@/i18n/useLocale'
import { semantic } from '@/styles/tokens'
import { usePrismTheme } from '@/styles/usePrismTheme'

interface Props {
  sif: SIF
  onClose: () => void
  onConfirm: (payload: { changeDescription: string; createdBy: string }) => Promise<void>
}

export function RevisionCloseDialog({ sif, onClose, onConfirm }: Props) {
  const strings = useLocaleStrings(getSifOverviewStrings)
  const { BORDER, CARD_BG, PANEL_BG, TEAL, TEXT, TEXT_DIM } = usePrismTheme()
  const [changeDescription, setChangeDescription] = useState('')
  const [createdBy, setCreatedBy] = useState(sif.approvedBy || sif.verifiedBy || sif.madeBy || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!changeDescription.trim()) {
      setError(strings.closeDialog.requiredError)
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
      setError(err instanceof Error ? err.message : strings.closeDialog.submitFallbackError)
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center"
      style={{ background: 'rgba(5, 8, 12, 0.72)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-[460px] overflow-hidden rounded-2xl shadow-2xl"
        style={{ background: PANEL_BG, border: `1px solid ${BORDER}` }}
      >
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: BORDER }}>
          <div className="flex items-center gap-2">
            <Lock size={15} style={{ color: TEAL }} />
            <div>
              <p className="text-sm font-black" style={{ color: TEXT }}>{strings.closeDialog.title(sif.revision)}</p>
              <p className="text-[10px]" style={{ color: TEXT_DIM }}>
                {strings.closeDialog.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ color: TEXT_DIM }}
          >
            <X size={14} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="rounded-xl border px-3 py-2.5 text-[11px]" style={{ borderColor: BORDER, background: CARD_BG, color: TEXT_DIM }}>
            {strings.closeDialog.lockedNotice(sif.revision)}{' '}
            {strings.closeDialog.lockedFollowUp}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
              {strings.closeDialog.changeDescription}
            </label>
            <textarea
              value={changeDescription}
              onChange={e => setChangeDescription(e.target.value)}
              rows={4}
              className="prism-field w-full resize-none rounded-xl border px-3 py-2 text-sm outline-none"
              style={{ borderColor: BORDER, background: CARD_BG, color: TEXT }}
              placeholder={strings.closeDialog.changeDescriptionPlaceholder}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
              {strings.closeDialog.publishedBy}
            </label>
            <input
              type="text"
              value={createdBy}
              onChange={e => setCreatedBy(e.target.value)}
              className="prism-field h-10 w-full rounded-xl border px-3 text-sm outline-none"
              style={{ borderColor: BORDER, background: CARD_BG, color: TEXT }}
              placeholder={strings.closeDialog.publishedByPlaceholder}
            />
          </div>

          {error && (
            <p className="rounded-xl px-3 py-2 text-[11px]" style={{ background: `${semantic.error}15`, color: semantic.error }}>
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-5 py-4" style={{ borderColor: BORDER }}>
          <button
            type="button"
            onClick={onClose}
            className="prism-action rounded-lg border px-4 py-2 text-[12px] font-semibold"
            style={{ borderColor: BORDER, color: TEXT_DIM }}
          >
            {strings.closeDialog.cancel}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="prism-action inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-black text-white disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #009BA4, #007A82)' }}
          >
            {saving && <Loader2 size={12} className="animate-spin" />}
            {strings.closeDialog.confirm}
          </button>
        </div>
      </div>
    </div>
  )
}
