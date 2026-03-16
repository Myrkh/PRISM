/**
 * SIFPhaseHeader — header compact de phase
 *
 * Donne à chaque étape SIF le même niveau de présence éditoriale que l'historique,
 * sans réintroduire de hero décoratif.
 */
import {
  Blocks,
  ClipboardCheck,
  FileSearch,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { CanonicalSIFTab } from '@/store/types'
import { SIF_TAB_META } from '@/store/types'
import { usePrismTheme } from '@/styles/usePrismTheme'

interface Props {
  tab: CanonicalSIFTab
}

const TAB_ICONS: Partial<Record<CanonicalSIFTab, LucideIcon>> = {
  context: FileSearch,
  architecture: Blocks,
  verification: ClipboardCheck,
  exploitation: Wrench,
}

export function SIFPhaseHeader({ tab }: Props) {
  const { TEXT, TEXT_DIM } = usePrismTheme()
  if (tab === 'cockpit' || tab === 'history' || tab === 'report') return null

  const meta = SIF_TAB_META[tab]
  const Icon = TAB_ICONS[tab]

  return (
    <div className="flex items-center gap-3 px-1 pb-3 pt-0.5">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{
          background: `${meta.accent}20`,
          border: `1px solid ${meta.accent}30`,
        }}
      >
        {Icon ? <Icon size={15} style={{ color: meta.accent }} /> : null}
      </div>

      <div className="min-w-0">
        <h1 className="text-sm font-black" style={{ color: TEXT }}>
          {meta.stepLabel}
        </h1>
        <p className="text-[10px]" style={{ color: TEXT_DIM }}>
          {meta.hint}
        </p>
      </div>
    </div>
  )
}
