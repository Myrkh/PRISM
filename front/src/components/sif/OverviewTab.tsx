import { ArrowRight, CheckCircle2, FileWarning, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SILBadge } from '@/components/shared/SILBadge'
import { SILGauge } from '@/components/shared/SILGauge'
import { formatPFD, formatPct, formatRRF } from '@/core/math/pfdCalc'
import type { SIF, SIFCalcResult } from '@/core/types'
import type { SIFTab } from '@/store/types'
import type { ComplianceResult } from '@/components/sif/complianceCalc'
import type { OverviewMetrics } from '@/components/sif/overviewMetrics'
import { getOverviewActionCta, OVERVIEW_OPERATIONAL_HEALTH_META } from '@/components/sif/overviewUi'
import { BORDER, CARD_BG, PAGE_BG, TEAL, TEAL_DIM, TEXT, TEXT_DIM, semantic } from '@/styles/tokens'

const SUB_TYPE_COLOR: Record<string, string> = {
  sensor:   '#0284C7',
  logic:    '#7C3AED',
  actuator: '#EA580C',
}
const SUB_TYPE_LABEL: Record<string, string> = {
  sensor: 'Capteurs', logic: 'Logique', actuator: 'Actionneurs',
}

interface Props {
  sif: SIF
  result: SIFCalcResult
  compliance: ComplianceResult
  overviewMetrics: OverviewMetrics
  getSubsystemColor: (type: string) => string
  isPublishingRevision: boolean
  onSelectTab: (tab: SIFTab) => void
  onOpenHazop: () => void
  onCloseRevision: () => void
}

export function OverviewTab({
  sif,
  result,
  compliance,
  overviewMetrics,
  isPublishingRevision,
  onSelectTab,
  onCloseRevision,
}: Props) {
  const operationalHealth = OVERVIEW_OPERATIONAL_HEALTH_META[overviewMetrics.operationalHealth]
  const openGaps = Math.max(0, compliance.totalChecks - compliance.passedChecks)

  return (
    <div className="space-y-4">

      {/* ── En-tête : événement dangereux + verdict + jauge ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="max-w-2xl text-sm leading-relaxed" style={{ color: TEXT_DIM }}>
            {sif.hazardousEvent || 'Événement dangereux non documenté.'}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <SILBadge sil={result.SIL} size="md" />
            <span
              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold"
              style={{
                color:       result.meetsTarget ? semantic.success : semantic.error,
                background:  result.meetsTarget ? `${semantic.success}14` : `${semantic.error}14`,
                borderColor: result.meetsTarget ? `${semantic.success}2E` : `${semantic.error}2E`,
              }}
            >
              {result.meetsTarget ? <CheckCircle2 size={11} /> : <FileWarning size={11} />}
              {result.meetsTarget ? `SIL ${sif.targetSIL} atteint` : `SIL ${sif.targetSIL} non atteint`}
            </span>
            <span
              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold"
              style={{ color: operationalHealth.color, background: operationalHealth.bg, borderColor: operationalHealth.border }}
            >
              <operationalHealth.Icon size={11} />
              {operationalHealth.label}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-3 shrink-0">
          {!sif.revisionLockedAt && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCloseRevision}
              disabled={isPublishingRevision}
              className="h-8 text-xs"
            >
              <Lock size={12} />
              {isPublishingRevision ? 'Publication…' : `Clôturer rév. ${sif.revision}`}
            </Button>
          )}
          <div className="hidden lg:block">
            <SILGauge pfd={result.PFD_avg} size={110} />
          </div>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        {[
          { label: 'PFDavg',        value: formatPFD(result.PFD_avg),                                              tone: TEXT      },
          { label: 'RRF',           value: formatRRF(result.RRF),                                                  tone: TEXT      },
          { label: 'Écarts ouverts',value: `${openGaps}`,                                                          tone: openGaps === 0 ? semantic.success : semantic.warning },
          { label: 'Prochain test', value: overviewMetrics.nextDue ? overviewMetrics.nextDue.toLocaleDateString() : 'Non planifié', tone: overviewMetrics.isOverdue ? semantic.error : TEAL_DIM },
        ].map(item => (
          <div key={item.label} className="rounded-lg border px-3 py-2.5" style={{ borderColor: BORDER, background: CARD_BG }}>
            <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: TEXT_DIM }}>{item.label}</p>
            <p className="text-sm font-bold font-mono" style={{ color: item.tone }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* ── Sous-systèmes — état synthétique ── */}
      {result.subsystems.length > 0 && (
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${result.subsystems.length}, minmax(0,1fr))` }}>
          {result.subsystems.map((sub, i) => {
            const subsystem = sif.subsystems[i]
            const color = SUB_TYPE_COLOR[sub.type] ?? TEXT_DIM
            return (
              <div key={sub.subsystemId} className="rounded-xl border p-4 space-y-2" style={{ borderColor: BORDER, background: CARD_BG }}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold truncate" style={{ color }}>{subsystem?.label || SUB_TYPE_LABEL[sub.type]}</p>
                    <p className="text-[10px] uppercase tracking-wide" style={{ color: TEXT_DIM }}>{subsystem?.architecture ?? '—'}</p>
                  </div>
                  <SILBadge sil={sub.SIL} size="sm" />
                </div>
                <p className="text-lg font-bold font-mono" style={{ color }}>{formatPFD(sub.PFD_avg)}</p>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {[
                    { label: 'SFF', value: formatPct(sub.SFF) },
                    { label: 'DC',  value: formatPct(sub.DC)  },
                  ].map(item => (
                    <div key={item.label} className="rounded-md border px-2 py-1" style={{ borderColor: BORDER, background: PAGE_BG }}>
                      <p className="text-[9px] uppercase tracking-wider" style={{ color: TEXT_DIM }}>{item.label}</p>
                      <p className="mt-0.5 font-mono font-semibold" style={{ color: TEXT }}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Actions prioritaires ── */}
      <div className="rounded-xl border p-5 space-y-3" style={{ borderColor: BORDER, background: CARD_BG }}>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>À traiter</p>
          <h3 className="mt-1 text-sm font-semibold" style={{ color: TEXT }}>Actions prioritaires</h3>
        </div>
        {overviewMetrics.actions.length === 0 ? (
          <div className="rounded-lg border px-3 py-3 text-xs" style={{ borderColor: `${semantic.success}44`, background: `${semantic.success}10`, color: semantic.success }}>
            Aucune action requise — SIF conforme.
          </div>
        ) : (
          <div className="space-y-2">
            {overviewMetrics.actions.slice(0, 4).map((action, index) => (
              <div key={action.id} className="rounded-lg border p-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-[10px] font-bold"
                    style={{ borderColor: BORDER, background: CARD_BG, color: TEAL_DIM }}
                  >
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold" style={{ color: TEXT }}>{action.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>{action.hint}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectTab(action.tab)}
                  className="mt-2.5 inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-semibold"
                  style={{ borderColor: `${TEAL}55`, background: `${TEAL}12`, color: TEAL_DIM }}
                >
                  {getOverviewActionCta(action.tab)}
                  <ArrowRight size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
