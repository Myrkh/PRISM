import { SILBadge } from '@/components/shared/SILBadge'
import { formatPFD, formatRRF } from '@/core/math/pfdCalc'
import type { SIF, SIFCalcResult } from '@/core/types'
import { BORDER, TEXT, TEXT_DIM, dark, semantic } from '@/styles/tokens'

interface Props {
  sif: SIF
  result: SIFCalcResult
}

function MiniMetric({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'success' | 'warning'
}) {
  const color =
    tone === 'success' ? semantic.success :
    tone === 'warning' ? semantic.warning :
    TEXT

  return (
    <div className="rounded-lg border px-3 py-2.5" style={{ borderColor: BORDER, background: dark.card2 }}>
      <p className="text-[10px] uppercase tracking-wide" style={{ color: TEXT_DIM }}>{label}</p>
      <p className="mt-1 text-sm font-bold font-mono" style={{ color }}>{value}</p>
    </div>
  )
}

export function SIFVerdictBanner({ sif, result }: Props) {
  return (
    <div
      className="rounded-xl border p-5"
      style={{
        borderColor: result.meetsTarget ? `${semantic.success}44` : `${semantic.warning}44`,
        background: dark.card,
      }}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: TEXT_DIM }}>
            Final Verdict
          </p>
          <p className="mt-2 text-2xl font-bold font-mono" style={{ color: TEXT }}>
            PFD<sub>avg</sub> = {formatPFD(result.PFD_avg)}
          </p>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: TEXT_DIM }}>
            {result.meetsTarget
              ? `The current SIF meets SIL ${sif.targetSIL} on the active rule set.`
              : `The current SIF does not yet meet SIL ${sif.targetSIL}. Architecture, diagnostics or test intervals need review.`}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 min-w-[260px]">
          <MiniMetric label="Achieved SIL" value={`SIL ${result.SIL}`} tone={result.meetsTarget ? 'success' : 'warning'} />
          <MiniMetric label="Required SIL" value={`SIL ${sif.targetSIL}`} />
          <MiniMetric label="RRF" value={formatRRF(result.RRF)} />
          <MiniMetric label="Avg PFD" value={formatPFD(result.PFD_avg)} tone={result.meetsTarget ? 'success' : 'warning'} />
        </div>

        <div className="shrink-0">
          <SILBadge sil={result.SIL} size="lg" />
        </div>
      </div>
    </div>
  )
}
