/**
 * SIFPhaseHeader — micro-hint contextuel
 *
 * Remplace l'ancienne grande carte (icon 44px + titre h1 + description).
 * Désormais : une seule ligne discrète sous la lifecycle bar.
 * Le cockpit n'a pas besoin de hint (il est self-explanatory).
 */
import type { CanonicalSIFTab } from '@/store/types'
import { SIF_TAB_META } from '@/store/types'
import { usePrismTheme } from '@/styles/usePrismTheme'

interface Props {
  tab: CanonicalSIFTab
}

export function SIFPhaseHeader({ tab }: Props) {
  const { TEXT_DIM } = usePrismTheme()
  if (tab === 'cockpit' || tab === 'report') return null

  const meta = SIF_TAB_META[tab]

  return (
    <div className="flex items-center gap-2 px-1 pb-3 pt-0.5">
      <span
        className="text-[11px] font-bold uppercase tracking-[0.14em] shrink-0"
        style={{ color: meta.accent }}
      >
        {meta.stepLabel}
      </span>
      <span className="text-[11px]" style={{ color: TEXT_DIM }}>—</span>
      <span className="text-[11px]" style={{ color: TEXT_DIM }}>{meta.hint}</span>
    </div>
  )
}
