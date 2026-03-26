import { Loader2, LockKeyhole, RefreshCw } from 'lucide-react'
import type { SIF } from '@/core/types'
import { incrementRevisionLabel } from '@/core/models/revisionWorkflow'
import { getSifOverviewStrings } from '@/i18n/sifOverview'
import { useLocaleStrings } from '@/i18n/useLocale'
import { usePrismTheme } from '@/styles/usePrismTheme'

interface Props {
  sif: SIF
  isStartingNextRevision: boolean
  onStartNextRevision: () => Promise<void>
}

export function RevisionLockedOverlay({
  sif,
  isStartingNextRevision,
  onStartNextRevision,
}: Props) {
  const strings = useLocaleStrings(getSifOverviewStrings)
  const { BORDER, CARD_BG, PANEL_BG, TEAL, TEXT, TEXT_DIM } = usePrismTheme()
  const nextRevision = incrementRevisionLabel(sif.revision)
  const lockedAt = sif.revisionLockedAt
    ? new Date(sif.revisionLockedAt).toLocaleString(strings.localeTag)
    : null

  return (
    <div
      className="absolute inset-0 z-20 flex items-start justify-center px-6 pt-12"
      style={{ background: 'rgba(5, 8, 12, 0.18)' }}
    >
      <div
        className="w-full max-w-[460px] rounded-2xl border p-6 shadow-2xl"
        style={{ background: `${PANEL_BG}EE`, borderColor: `${BORDER}CC`, backdropFilter: 'blur(14px)' }}
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border" style={{ borderColor: `${TEAL}44`, background: `${TEAL}16` }}>
          <LockKeyhole size={20} style={{ color: TEAL }} />
        </div>

        <div className="mt-4 space-y-2 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
            {strings.lockedOverlay.eyebrow}
          </p>
          <h3 className="text-xl font-black" style={{ color: TEXT }}>
            {strings.lockedOverlay.title(sif.revision)}
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: TEXT_DIM }}>
            {strings.lockedOverlay.description(nextRevision)}
          </p>
        </div>

        <div className="mt-5 rounded-xl border px-3 py-2.5 text-[11px]" style={{ borderColor: BORDER, background: CARD_BG, color: TEXT_DIM }}>
          {lockedAt ? strings.lockedOverlay.lockedOn(lockedAt) : strings.lockedOverlay.lockedOnUnknown}
        </div>

        <button
          type="button"
          onClick={() => { void onStartNextRevision() }}
          disabled={isStartingNextRevision}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black text-white disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #009BA4, #007A82)' }}
        >
          {isStartingNextRevision ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {strings.lockedOverlay.startNextRevision(nextRevision)}
        </button>
      </div>
    </div>
  )
}
