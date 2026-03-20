import { useMemo, type ReactNode } from 'react'
import { X, GitCompare, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { getSifOverviewStrings } from '@/i18n/sifOverview'
import { useLocaleStrings } from '@/i18n/useLocale'
import { calcSIF, formatPFD } from '@/core/math/pfdCalc'
import type { SIFRevision, SIF, SIFStatus } from '@/core/types'
import { BORDER, CARD_BG, PANEL_BG, TEAL, TEAL_DIM, TEXT, TEXT_DIM } from '@/styles/tokens'

type DeltaDir = 'up' | 'down' | 'neutral'

interface DeltaValue {
  from: string
  to: string
  dir: DeltaDir
  changed: boolean
}

function numDelta(from: number, to: number, higherIsBetter: boolean): DeltaDir {
  if (Math.abs(from - to) < 1e-15) return 'neutral'
  const improved = higherIsBetter ? to > from : to < from
  return improved ? 'up' : 'down'
}

function strDelta(from: string, to: string): DeltaValue {
  return { from, to, dir: 'neutral', changed: from !== to }
}

function DeltaCell({ delta }: { delta: DeltaValue }) {
  const Icon = delta.dir === 'up'
    ? TrendingUp
    : delta.dir === 'down'
      ? TrendingDown
      : Minus
  const color = !delta.changed
    ? TEXT_DIM
    : delta.dir === 'up'
      ? '#4ADE80'
      : delta.dir === 'down'
        ? '#F87171'
        : '#F59E0B'

  if (!delta.changed) {
    return (
      <span className="text-[11px]" style={{ color: TEXT_DIM }}>
        {delta.from || '—'}
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1">
        <Icon size={10} style={{ color }} />
        <span className="text-[11px] font-semibold" style={{ color }}>
          {delta.to || '—'}
        </span>
      </div>
      <span className="text-[9px] line-through" style={{ color: TEXT_DIM }}>
        {delta.from || '—'}
      </span>
    </div>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <tr>
      <td colSpan={3} className="px-4 pt-5 pb-2">
        <span
          className="text-[9px] font-black uppercase tracking-widest"
          style={{ color: TEXT_DIM }}
        >
          {label}
        </span>
      </td>
    </tr>
  )
}

function CompareRow({
  label,
  left,
  right,
  highlight = false,
}: {
  label: string
  left: ReactNode
  right: ReactNode
  highlight?: boolean
}) {
  return (
    <tr
      className="border-b"
      style={{
        borderColor: `${BORDER}60`,
        background: highlight ? `${TEAL}08` : 'transparent',
      }}
    >
      <td
        className="px-4 py-2.5 whitespace-nowrap text-[10px] font-semibold"
        style={{ color: TEXT_DIM, width: 160 }}
      >
        {label}
      </td>
      <td className="px-4 py-2.5" style={{ width: '45%' }}>{left}</td>
      <td className="px-4 py-2.5" style={{ width: '45%' }}>{right}</td>
    </tr>
  )
}

function RevisionCard({
  revision,
  side,
}: {
  revision: SIFRevision
  side: 'left' | 'right'
}) {
  const strings = useLocaleStrings(getSifOverviewStrings)
  const isRight = side === 'right'
  const sif = revision.snapshot
  const result = calcSIF(sif)
  const pfdColor = result.meetsTarget ? '#4ADE80' : '#F87171'

  return (
    <div
      className="flex-1 rounded-xl p-4 flex flex-col gap-2"
      style={{
        background: CARD_BG,
        border: `1px solid ${isRight ? `${TEAL}40` : BORDER}`,
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="text-xs font-black px-2 py-0.5 rounded"
          style={{
            background: isRight ? `${TEAL}20` : '#1A1F24',
            color: isRight ? TEAL : TEXT_DIM,
            border: `1px solid ${isRight ? `${TEAL}40` : BORDER}`,
          }}
        >
          {strings.compare.revisionBadge(revision.revisionLabel)}
        </span>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded font-bold"
          style={{ background: '#1A1F24', color: TEXT_DIM }}
        >
          {strings.shared.statusShort[revision.status]}
        </span>
        {isRight && (
          <span
            className="text-[9px] px-1.5 py-0.5 rounded font-bold"
            style={{ background: `${TEAL}15`, color: TEAL_DIM }}
          >
            {strings.compare.newestBadge}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="font-mono font-black text-lg" style={{ color: pfdColor }}>
          {formatPFD(result.PFD_avg)}
        </span>
        <span
          className="text-xs px-2 py-0.5 rounded font-black"
          style={{
            background: `${pfdColor}15`,
            color: pfdColor,
            border: `1px solid ${pfdColor}30`,
          }}
        >
          SIL {result.SIL}
        </span>
      </div>

      <div className="text-[10px]" style={{ color: TEXT_DIM }}>
        <p>{new Date(revision.createdAt).toLocaleDateString(strings.localeTag, { day: '2-digit', month: 'short', year: 'numeric' })}</p>
        {revision.changeDescription && (
          <p className="mt-0.5 italic" style={{ color: TEXT }}>{revision.changeDescription}</p>
        )}
        {revision.createdBy && (
          <p className="mt-0.5">{strings.compare.createdBy(revision.createdBy)}</p>
        )}
      </div>
    </div>
  )
}

interface SIFRevisionCompareProps {
  older: SIFRevision
  newer: SIFRevision
  onClose: () => void
}

export function SIFRevisionCompare({ older, newer, onClose }: SIFRevisionCompareProps) {
  const strings = useLocaleStrings(getSifOverviewStrings)
  const sifA: SIF = older.snapshot
  const sifB: SIF = newer.snapshot

  const calcA = useMemo(() => calcSIF(sifA), [sifA])
  const calcB = useMemo(() => calcSIF(sifB), [sifB])

  const pfdDelta: DeltaValue = {
    from: formatPFD(calcA.PFD_avg),
    to: formatPFD(calcB.PFD_avg),
    dir: numDelta(calcA.PFD_avg, calcB.PFD_avg, false),
    changed: Math.abs(calcA.PFD_avg - calcB.PFD_avg) > 1e-12,
  }

  const silDelta: DeltaValue = {
    from: `SIL ${calcA.SIL}`,
    to: `SIL ${calcB.SIL}`,
    dir: numDelta(calcA.SIL, calcB.SIL, true),
    changed: calcA.SIL !== calcB.SIL,
  }

  const meetsTargetDelta: DeltaValue = {
    from: calcA.meetsTarget ? strings.compare.targetReachedYes : strings.compare.targetReachedNo,
    to: calcB.meetsTarget ? strings.compare.targetReachedYes : strings.compare.targetReachedNo,
    dir: calcA.meetsTarget === calcB.meetsTarget ? 'neutral' : calcB.meetsTarget ? 'up' : 'down',
    changed: calcA.meetsTarget !== calcB.meetsTarget,
  }

  const statusDelta = strDelta(strings.shared.statusShort[older.status], strings.shared.statusShort[newer.status])
  const madeByDelta = strDelta(sifA.madeBy ?? '', sifB.madeBy ?? '')
  const verifiedDelta = strDelta(sifA.verifiedBy ?? '', sifB.verifiedBy ?? '')
  const approvedDelta = strDelta(sifA.approvedBy ?? '', sifB.approvedBy ?? '')
  const targetSilDelta = strDelta(`SIL ${sifA.targetSIL}`, `SIL ${sifB.targetSIL}`)
  const rrfDelta = strDelta(`${sifA.rrfRequired}`, `${sifB.rrfRequired}`)

  const subsA = sifA.subsystems ?? []
  const subsB = sifB.subsystems ?? []
  const compCountA = subsA.reduce((n, s) => n + s.channels.reduce((m, c) => m + c.components.length, 0), 0)
  const compCountB = subsB.reduce((n, s) => n + s.channels.reduce((m, c) => m + c.components.length, 0), 0)

  const subCountDelta: DeltaValue = {
    from: strings.compare.subsystemsCount(subsA.length),
    to: strings.compare.subsystemsCount(subsB.length),
    dir: numDelta(subsA.length, subsB.length, true),
    changed: subsA.length !== subsB.length,
  }
  const compCountDelta: DeltaValue = {
    from: strings.compare.componentsCount(compCountA),
    to: strings.compare.componentsCount(compCountB),
    dir: numDelta(compCountA, compCountB, true),
    changed: compCountA !== compCountB,
  }

  const hazopA = sifA.hazopTrace
  const hazopB = sifB.hazopTrace
  const hazopIdDelta = strDelta(hazopA?.scenarioId ?? '—', hazopB?.scenarioId ?? '—')
  const hazopRiskDelta = strDelta(hazopA?.riskMatrix ?? '—', hazopB?.riskMatrix ?? '—')
  const hazopTmelDelta: DeltaValue = {
    from: hazopA?.tmel != null ? `${hazopA.tmel.toExponential(1)} yr⁻¹` : '—',
    to: hazopB?.tmel != null ? `${hazopB.tmel.toExponential(1)} yr⁻¹` : '—',
    dir: hazopA?.tmel != null && hazopB?.tmel != null
      ? numDelta(hazopA.tmel, hazopB.tmel, false)
      : 'neutral',
    changed: hazopA?.tmel !== hazopB?.tmel,
  }

  const ptA = sifA.proofTestProcedure
  const ptB = sifB.proofTestProcedure
  const ptPeriodDelta = strDelta(
    ptA ? strings.compare.months(ptA.periodicityMonths) : '—',
    ptB ? strings.compare.months(ptB.periodicityMonths) : '—',
  )
  const ptStepsDelta: DeltaValue = {
    from: ptA ? strings.compare.steps(ptA.steps.length) : '—',
    to: ptB ? strings.compare.steps(ptB.steps.length) : '—',
    dir: ptA && ptB ? numDelta(ptA.steps.length, ptB.steps.length, true) : 'neutral',
    changed: (ptA?.steps.length ?? -1) !== (ptB?.steps.length ?? -1),
  }

  const changedCount = [
    pfdDelta,
    silDelta,
    meetsTargetDelta,
    statusDelta,
    madeByDelta,
    verifiedDelta,
    approvedDelta,
    targetSilDelta,
    rrfDelta,
    subCountDelta,
    compCountDelta,
    hazopIdDelta,
    hazopRiskDelta,
    hazopTmelDelta,
    ptPeriodDelta,
    ptStepsDelta,
  ].filter(delta => delta.changed).length

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="flex flex-col rounded-2xl overflow-hidden shadow-2xl"
        style={{
          width: '90vw',
          maxWidth: 1000,
          maxHeight: '90vh',
          background: PANEL_BG,
          border: `1px solid ${BORDER}`,
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: BORDER }}>
          <div className="flex items-center gap-3">
            <GitCompare size={16} style={{ color: TEAL }} />
            <div>
              <h2 className="text-sm font-black" style={{ color: TEXT }}>
                {strings.compare.title(sifA.sifNumber)}
              </h2>
              <p className="text-[10px]" style={{ color: TEXT_DIM }}>
                {changedCount > 0 ? strings.compare.differencesDetected(changedCount) : strings.compare.noDifferences}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
            style={{ background: 'transparent', color: TEXT_DIM }}
            onMouseEnter={event => {
              event.currentTarget.style.background = '#EF444420'
              event.currentTarget.style.color = '#EF4444'
            }}
            onMouseLeave={event => {
              event.currentTarget.style.background = 'transparent'
              event.currentTarget.style.color = TEXT_DIM
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex gap-4 px-6 py-4 shrink-0 border-b" style={{ borderColor: BORDER }}>
          <RevisionCard revision={older} side="left" />
          <div className="flex items-center" style={{ color: TEXT_DIM }}>
            <GitCompare size={20} />
          </div>
          <RevisionCard revision={newer} side="right" />
        </div>

        <div className="flex-1 overflow-auto min-h-0">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10" style={{ background: PANEL_BG }}>
              <tr className="border-b" style={{ borderColor: BORDER }}>
                <th className="px-4 py-2.5 text-left" style={{ color: TEXT_DIM, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', width: 160 }}>
                  {strings.compare.tableHeaders.parameter}
                </th>
                <th className="px-4 py-2.5 text-left" style={{ color: TEXT_DIM, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', width: '45%' }}>
                  {strings.compare.tableHeaders.older(older.revisionLabel)}
                </th>
                <th className="px-4 py-2.5 text-left" style={{ color: TEAL_DIM, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {strings.compare.tableHeaders.current(newer.revisionLabel)}
                </th>
              </tr>
            </thead>
            <tbody>
              <SectionHeader label={strings.compare.sections.silPfd} />
              <CompareRow
                label={strings.compare.rows.averagePfd}
                highlight={pfdDelta.changed}
                left={<DeltaCell delta={{ ...pfdDelta, to: pfdDelta.from, dir: 'neutral', changed: false }} />}
                right={<DeltaCell delta={pfdDelta} />}
              />
              <CompareRow
                label={strings.compare.rows.achievedSil}
                highlight={silDelta.changed}
                left={<DeltaCell delta={{ ...silDelta, to: silDelta.from, dir: 'neutral', changed: false }} />}
                right={<DeltaCell delta={silDelta} />}
              />
              <CompareRow
                label={strings.compare.rows.targetReached}
                highlight={meetsTargetDelta.changed}
                left={<DeltaCell delta={{ ...meetsTargetDelta, to: meetsTargetDelta.from, dir: 'neutral', changed: false }} />}
                right={<DeltaCell delta={meetsTargetDelta} />}
              />
              <CompareRow
                label={strings.compare.rows.targetSil}
                highlight={targetSilDelta.changed}
                left={<span className="text-[11px]" style={{ color: TEXT_DIM }}>{targetSilDelta.from}</span>}
                right={<DeltaCell delta={targetSilDelta} />}
              />
              <CompareRow
                label={strings.compare.rows.requiredRrf}
                highlight={rrfDelta.changed}
                left={<span className="text-[11px]" style={{ color: TEXT_DIM }}>{rrfDelta.from}</span>}
                right={<DeltaCell delta={rrfDelta} />}
              />

              <SectionHeader label={strings.compare.sections.architecture} />
              <CompareRow
                label={strings.compare.rows.subsystems}
                highlight={subCountDelta.changed}
                left={<span className="text-[11px]" style={{ color: TEXT_DIM }}>{subCountDelta.from}</span>}
                right={<DeltaCell delta={subCountDelta} />}
              />
              <CompareRow
                label={strings.compare.rows.components}
                highlight={compCountDelta.changed}
                left={<span className="text-[11px]" style={{ color: TEXT_DIM }}>{compCountDelta.from}</span>}
                right={<DeltaCell delta={compCountDelta} />}
              />

              <SectionHeader label={strings.compare.sections.document} />
              <CompareRow
                label={strings.compare.rows.status}
                highlight={statusDelta.changed}
                left={<span className="text-[11px]" style={{ color: TEXT_DIM }}>{statusDelta.from}</span>}
                right={<DeltaCell delta={statusDelta} />}
              />
              <CompareRow
                label={strings.compare.rows.preparedBy}
                highlight={madeByDelta.changed}
                left={<span className="text-[11px]" style={{ color: TEXT_DIM }}>{madeByDelta.from || '—'}</span>}
                right={<DeltaCell delta={madeByDelta} />}
              />
              <CompareRow
                label={strings.compare.rows.verifiedBy}
                highlight={verifiedDelta.changed}
                left={<span className="text-[11px]" style={{ color: TEXT_DIM }}>{verifiedDelta.from || '—'}</span>}
                right={<DeltaCell delta={verifiedDelta} />}
              />
              <CompareRow
                label={strings.compare.rows.approvedBy}
                highlight={approvedDelta.changed}
                left={<span className="text-[11px]" style={{ color: TEXT_DIM }}>{approvedDelta.from || '—'}</span>}
                right={<DeltaCell delta={approvedDelta} />}
              />

              <SectionHeader label={strings.compare.sections.hazop} />
              <CompareRow
                label={strings.compare.rows.scenario}
                highlight={hazopIdDelta.changed}
                left={<span className="text-[11px]" style={{ color: TEXT_DIM }}>{hazopIdDelta.from}</span>}
                right={<DeltaCell delta={hazopIdDelta} />}
              />
              <CompareRow
                label={strings.compare.rows.riskMatrix}
                highlight={hazopRiskDelta.changed}
                left={<span className="text-[11px]" style={{ color: TEXT_DIM }}>{hazopRiskDelta.from}</span>}
                right={<DeltaCell delta={hazopRiskDelta} />}
              />
              <CompareRow
                label={strings.compare.rows.tmel}
                highlight={hazopTmelDelta.changed}
                left={<span className="text-[11px]" style={{ color: TEXT_DIM }}>{hazopTmelDelta.from}</span>}
                right={<DeltaCell delta={hazopTmelDelta} />}
              />

              <SectionHeader label={strings.compare.sections.proofTest} />
              <CompareRow
                label={strings.compare.rows.periodicity}
                highlight={ptPeriodDelta.changed}
                left={<span className="text-[11px]" style={{ color: TEXT_DIM }}>{ptPeriodDelta.from}</span>}
                right={<DeltaCell delta={ptPeriodDelta} />}
              />
              <CompareRow
                label={strings.compare.rows.procedureSteps}
                highlight={ptStepsDelta.changed}
                left={<span className="text-[11px]" style={{ color: TEXT_DIM }}>{ptStepsDelta.from}</span>}
                right={<DeltaCell delta={ptStepsDelta} />}
              />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
