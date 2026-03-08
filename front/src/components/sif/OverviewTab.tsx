import { ArrowRight, CheckCircle2, ClipboardCheck, FileWarning, Lock, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SILBadge } from '@/components/shared/SILBadge'
import { SILGauge } from '@/components/shared/SILGauge'
import { formatPFD, formatPct, formatRRF } from '@/core/math/pfdCalc'
import type { SIF, SIFCalcResult } from '@/core/types'
import type { SIFTab } from '@/store/types'
import type { ComplianceResult } from '@/components/sif/complianceCalc'
import type { OverviewMetrics } from '@/components/sif/overviewMetrics'
import { OVERVIEW_ACTION_CTA, OVERVIEW_OPERATIONAL_HEALTH_META } from '@/components/sif/overviewUi'
import { cn } from '@/lib/utils'
import { BORDER, CARD_BG, PAGE_BG, TEAL, TEAL_DIM, TEXT, TEXT_DIM, semantic } from '@/styles/tokens'

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
  getSubsystemColor,
  isPublishingRevision,
  onSelectTab,
  onOpenHazop,
  onCloseRevision,
}: Props) {
  const operationalHealth = OVERVIEW_OPERATIONAL_HEALTH_META[overviewMetrics.operationalHealth]

  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)]">
        <div className="rounded-xl border p-5" style={{ borderColor: BORDER, background: CARD_BG }}>
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
                  Design status
                </p>
                <h2 className="text-2xl font-black tracking-tight" style={{ color: TEXT }}>
                  {sif.sifNumber} · {sif.title || 'Untitled SIF'}
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: TEXT_DIM }}>
                  {sif.hazardousEvent || 'No hazardous event has been documented yet.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <SILBadge sil={result.SIL} size="md" />
                <span
                  className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold"
                  style={{
                    color: result.meetsTarget ? semantic.success : semantic.error,
                    background: result.meetsTarget ? `${semantic.success}14` : `${semantic.error}14`,
                    borderColor: result.meetsTarget ? `${semantic.success}2E` : `${semantic.error}2E`,
                  }}
                >
                  {result.meetsTarget ? <CheckCircle2 size={11} /> : <FileWarning size={11} />}
                  {result.meetsTarget ? `Meets SIL ${sif.targetSIL}` : `Below SIL ${sif.targetSIL}`}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'PFDavg', value: formatPFD(result.PFD_avg), tone: TEXT },
                  { label: 'RRF', value: formatRRF(result.RRF), tone: TEXT },
                  { label: 'Architectures', value: sif.subsystems.map(subsystem => subsystem.architecture).join(' + '), tone: TEAL_DIM, mono: false },
                ].map(item => (
                  <div key={item.label} className="rounded-lg border px-3 py-2.5" style={{ borderColor: BORDER, background: PAGE_BG }}>
                    <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: TEXT_DIM }}>{item.label}</p>
                    <p className={cn('text-sm font-bold', item.mono !== false && 'font-mono')} style={{ color: item.tone }}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="shrink-0 space-y-3">
              {!sif.revisionLockedAt && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCloseRevision}
                  disabled={isPublishingRevision}
                  className="h-8 text-xs"
                >
                  <Lock size={12} />
                  {isPublishingRevision ? 'Publishing…' : `Close revision ${sif.revision}`}
                </Button>
              )}
              <div className="hidden xl:block">
                <SILGauge pfd={result.PFD_avg} size={118} />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: BORDER, background: CARD_BG }}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
              Attention required
            </p>
            <h3 className="mt-1 text-sm font-semibold" style={{ color: TEXT }}>
              Priority queue for this SIF
            </h3>
          </div>

          <div className="space-y-2">
            {overviewMetrics.actions.slice(0, 3).map((action, index) => (
              <div key={action.id} className="rounded-lg border p-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[11px] font-bold" style={{ borderColor: BORDER, background: CARD_BG, color: TEAL_DIM }}>
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold" style={{ color: TEXT }}>{action.title}</p>
                    <p className="mt-1 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>{action.hint}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectTab(action.tab)}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-semibold"
                  style={{ borderColor: `${TEAL}55`, background: `${TEAL}12`, color: TEAL_DIM }}
                >
                  {OVERVIEW_ACTION_CTA[action.tab]}
                  <ArrowRight size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {result.subsystems.map((sub, i) => {
          const subsystem = sif.subsystems[i]
          const color = getSubsystemColor(sub.type)

          return (
            <div key={sub.subsystemId} className="rounded-xl border p-4 space-y-2" style={{ borderColor: BORDER, background: CARD_BG }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold" style={{ color }}>{subsystem?.label}</p>
                  <p className="text-[10px] uppercase tracking-wide" style={{ color: TEXT_DIM }}>{sub.type}</p>
                </div>
                <SILBadge sil={sub.SIL} size="sm" />
              </div>

              <p className="text-lg font-bold font-mono" style={{ color }}>{formatPFD(sub.PFD_avg)}</p>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                {[
                  { label: 'Arch', value: subsystem?.architecture || '—' },
                  { label: 'SFF', value: formatPct(sub.SFF) },
                  { label: 'DC', value: formatPct(sub.DC) },
                ].map(item => (
                  <div key={item.label} className="rounded-md border px-2 py-1.5" style={{ borderColor: BORDER, background: PAGE_BG }}>
                    <p className="text-[9px] uppercase tracking-wider" style={{ color: TEXT_DIM }}>{item.label}</p>
                    <p className="mt-0.5 font-mono font-semibold" style={{ color: TEXT }}>{item.value}</p>
                  </div>
                ))}
              </div>
              <p className="text-[11px] font-mono" style={{ color: TEXT_DIM }}>HFT {sub.HFT} · RRF {formatRRF(sub.RRF)}</p>
            </div>
          )
        })}
      </div>

      <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: BORDER, background: CARD_BG }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
              Design path
            </p>
            <h3 className="mt-1 text-sm font-semibold" style={{ color: TEXT }}>
              Safety chain
            </h3>
            <p className="mt-1 text-xs" style={{ color: TEXT_DIM }}>
              Process demand to safe state, using the current subsystem sequence.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => onSelectTab('architecture')} className="h-7 text-xs">
            Open Loop Editor
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-lg border px-3 py-2 text-xs font-semibold" style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT }}>
            Process demand
          </div>
          {sif.subsystems.map((subsystem, index) => (
            <div key={subsystem.id} className="contents">
              <ArrowRight size={14} style={{ color: TEXT_DIM }} />
              <div className="rounded-lg border px-3 py-2" style={{ borderColor: BORDER, background: PAGE_BG }}>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: TEXT_DIM }}>{subsystem.type}</p>
                <p className="text-xs font-semibold" style={{ color: getSubsystemColor(subsystem.type) }}>{subsystem.label || `Subsystem ${index + 1}`}</p>
                <p className="text-[11px] font-mono" style={{ color: TEXT_DIM }}>{subsystem.architecture}</p>
              </div>
            </div>
          ))}
          <ArrowRight size={14} style={{ color: TEXT_DIM }} />
          <div className="rounded-lg border px-3 py-2 text-xs font-semibold" style={{ borderColor: BORDER, background: PAGE_BG, color: TEAL_DIM }}>
            Safe state
          </div>
        </div>
      </div>

      <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: BORDER, background: CARD_BG }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
              Operational status
            </p>
            <h3 className="mt-1 text-sm font-semibold" style={{ color: TEXT }}>
              SIL Live
            </h3>
            <p className="mt-1 text-xs" style={{ color: TEXT_DIM }}>
              Current confidence signal from proof test evidence and operational events.
            </p>
          </div>

          <span
            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold"
            style={{ color: operationalHealth.color, background: operationalHealth.bg, borderColor: operationalHealth.border }}
          >
            <operationalHealth.Icon size={11} />
            {operationalHealth.label}
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          {[
            { label: 'Operational confidence', value: overviewMetrics.recentCampaigns.length || sif.operationalEvents.length ? `${overviewMetrics.operationalScore}/100` : '—', tone: operationalHealth.color },
            { label: 'Next proof test', value: overviewMetrics.nextDue ? overviewMetrics.nextDue.toLocaleDateString() : 'Not scheduled', tone: overviewMetrics.isOverdue ? semantic.error : TEXT },
            { label: 'Bypass / inhibit', value: `${overviewMetrics.bypassHours.toFixed(1)} h`, tone: TEXT },
            { label: 'Open faults', value: String(overviewMetrics.openFaults), tone: overviewMetrics.openFaults > 0 ? semantic.error : semantic.success },
          ].map(item => (
            <div key={item.label} className="rounded-lg border px-3 py-2.5" style={{ borderColor: BORDER, background: PAGE_BG }}>
              <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: TEXT_DIM }}>{item.label}</p>
              <p className="mt-1 text-xl font-black font-mono" style={{ color: item.tone }}>{item.value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
          <div className="flex flex-wrap items-center gap-1.5">
            {overviewMetrics.recentCampaigns.slice(0, 8).map(campaign => {
              const verdictMeta = campaign.verdict === 'pass'
                ? { label: 'Pass', color: semantic.success, bg: `${semantic.success}1A` }
                : campaign.verdict === 'fail'
                  ? { label: 'Fail', color: semantic.error, bg: `${semantic.error}1A` }
                  : { label: 'Conditional', color: semantic.warning, bg: `${semantic.warning}1A` }

              return (
                <span
                  key={campaign.id}
                  title={campaign.date}
                  className="inline-flex h-6 items-center rounded-md border px-2 text-[10px] font-bold"
                  style={{ color: verdictMeta.color, borderColor: `${verdictMeta.color}33`, background: verdictMeta.bg }}
                >
                  {verdictMeta.label}
                </span>
              )
            })}
            {overviewMetrics.recentCampaigns.length === 0 && (
              <span className="text-xs" style={{ color: TEXT_DIM }}>No campaigns recorded yet.</span>
            )}
          </div>

          <Button variant="outline" size="sm" onClick={() => onSelectTab('prooftest')} className="h-7 text-xs">
            Open Proof Test
          </Button>
        </div>
      </div>

      <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: BORDER, background: CARD_BG }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
              Governance status
            </p>
            <h3 className="mt-1 text-sm font-semibold" style={{ color: TEXT }}>
              HAZOP / LOPA traceability
            </h3>
            <p className="mt-1 text-xs" style={{ color: TEXT_DIM }}>
              Audit readiness across context, evidence, assumptions, and HAZOP linkage.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-24 overflow-hidden rounded-full" style={{ background: PAGE_BG }}>
                <div className="h-full rounded-full" style={{ width: `${overviewMetrics.tracePct}%`, background: TEAL }} />
              </div>
              <span className="text-xs font-mono font-semibold" style={{ color: TEXT_DIM }}>{overviewMetrics.tracePct}%</span>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onOpenHazop}>
              Open HAZOP / LOPA
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          {[
            { label: 'Metadata ready', value: `${overviewMetrics.metadataPct}%`, detail: compliance.missingMetadata.length ? `${compliance.missingMetadata.length} fields still missing` : 'All core fields documented', Icon: ClipboardCheck },
            { label: 'Evidence package', value: `${overviewMetrics.evidenceCompleteCount}/${overviewMetrics.evidenceTotalCount}`, detail: 'Completed evidence items', Icon: ShieldCheck },
            { label: 'Assumptions to review', value: String(overviewMetrics.pendingAssumptions), detail: `${overviewMetrics.reviewedAssumptions} already validated`, Icon: FileWarning },
            { label: 'Approval chain', value: `${overviewMetrics.approvalFilledCount}/3`, detail: 'Made / Verified / Approved', Icon: CheckCircle2 },
          ].map(item => (
            <div key={item.label} className="rounded-lg border px-3 py-2.5" style={{ borderColor: BORDER, background: PAGE_BG }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: TEXT_DIM }}>{item.label}</p>
                  <p className="mt-1 text-xl font-black font-mono" style={{ color: TEAL_DIM }}>{item.value}</p>
                </div>
                <item.Icon size={14} style={{ color: TEAL_DIM, flexShrink: 0 }} />
              </div>
              <p className="mt-2 text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>{item.detail}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border overflow-hidden" style={{ borderColor: BORDER, background: PAGE_BG }}>
          <div className="grid grid-cols-1 divide-y md:grid-cols-3 md:divide-x md:divide-y-0" style={{ borderColor: BORDER }}>
            {[
              ['HAZOP Node', sif.hazopTrace?.hazopNode || null],
              ['Scenario ID', sif.hazopTrace?.scenarioId || null],
              ['Risk Matrix', sif.hazopTrace?.riskMatrix || null],
              ['LOPA Reference', sif.hazopTrace?.lopaRef || null],
              ['Initiating Event', sif.hazopTrace?.initiatingEvent || null],
              ['TMEL [yr⁻¹]', sif.hazopTrace?.tmel ? sif.hazopTrace.tmel.toExponential(2) : null],
              ['Independent IPLs', sif.hazopTrace?.iplList || null],
              ['HAZOP Facilitator', sif.hazopTrace?.hazopFacilitator || null],
              ['HAZOP Date', sif.hazopTrace?.hazopDate || null],
            ].map(([label, value]) => (
              <div key={label as string} className="px-4 py-3.5">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: TEXT_DIM }}>{label}</p>
                <p className="text-sm font-medium" style={{ color: TEXT }}>{value || <span style={{ color: `${TEXT_DIM}66` }}>—</span>}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
