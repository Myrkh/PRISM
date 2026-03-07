/**
 * SIFRevisionCompare — PRISM v3 Sprint 2
 *
 * Modal plein écran de comparaison de deux révisions SIF côte à côte.
 * La comparaison est data-driven (JSON snapshots) — pas de PDFs.
 *
 * Left  = révision antérieure (older)
 * Right = révision plus récente (newer)
 *
 * Delta affiché :
 *   – PFD_avg calculé sur chaque snapshot
 *   – SIL atteint
 *   – Statut
 *   – Subsystems (count + noms)
 *   – Composants (count par subsystem)
 *   – Signataires (madeBy / verifiedBy / approvedBy)
 *   – HAZOP trace (scenarioId, TMEL, riskMatrix)
 *   – Proof test (periodicité, steps count)
 */
import { useMemo, type ReactNode } from 'react'
import { X, GitCompare, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { calcSIF, formatPFD } from '@/core/math/pfdCalc'
import type { SIFRevision, SIF, SIFStatus } from '@/core/types'
import { BORDER, CARD_BG, PANEL_BG, TEAL, TEAL_DIM, TEXT, TEXT_DIM } from '@/styles/tokens'

// ─── Design tokens ────────────────────────────────────────────────────────
// ─── Status label map ─────────────────────────────────────────────────────
const STATUS_LABEL: Record<SIFStatus, string> = {
  draft:     'PRE',
  in_review: 'IFR',
  verified:  'VER',
  approved:  'APP',
  archived:  'ARC',
}

// ─── Delta helpers ────────────────────────────────────────────────────────
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

// ─── Delta cell ───────────────────────────────────────────────────────────
function DeltaCell({ delta }: { delta: DeltaValue }) {
  const Icon = delta.dir === 'up'   ? TrendingUp
             : delta.dir === 'down' ? TrendingDown
             : Minus
  const color = !delta.changed       ? TEXT_DIM
              : delta.dir === 'up'   ? '#4ADE80'
              : delta.dir === 'down' ? '#F87171'
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

// ─── Section header ───────────────────────────────────────────────────────
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

// ─── Compare row ──────────────────────────────────────────────────────────
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

// ─── Revision header card ─────────────────────────────────────────────────
function RevisionCard({
  revision,
  side,
}: {
  revision: SIFRevision
  side: 'left' | 'right'
}) {
  const isRight = side === 'right'
  const sif     = revision.snapshot
  const result  = calcSIF(sif)
  const pfdColor = result.meetsTarget ? '#4ADE80' : '#F87171'

  return (
    <div
      className="flex-1 rounded-xl p-4 flex flex-col gap-2"
      style={{
        background: CARD_BG,
        border: `1px solid ${isRight ? TEAL + '40' : BORDER}`,
      }}
    >
      {/* Label + tag */}
      <div className="flex items-center gap-2">
        <span
          className="text-xs font-black px-2 py-0.5 rounded"
          style={{
            background: isRight ? `${TEAL}20` : '#1A1F24',
            color: isRight ? TEAL : TEXT_DIM,
            border: `1px solid ${isRight ? TEAL + '40' : BORDER}`,
          }}
        >
          Rév. {revision.revisionLabel}
        </span>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded font-bold"
          style={{ background: '#1A1F24', color: TEXT_DIM }}
        >
          {STATUS_LABEL[revision.status]}
        </span>
        {isRight && (
          <span
            className="text-[9px] px-1.5 py-0.5 rounded font-bold"
            style={{ background: `${TEAL}15`, color: TEAL_DIM }}
          >
            PLUS RÉCENT
          </span>
        )}
      </div>

      {/* PFD / SIL */}
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

      {/* Meta */}
      <div className="text-[10px]" style={{ color: TEXT_DIM }}>
        <p>{new Date(revision.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
        {revision.changeDescription && (
          <p className="mt-0.5 italic" style={{ color: TEXT }}>{revision.changeDescription}</p>
        )}
        {revision.createdBy && (
          <p className="mt-0.5">Par {revision.createdBy}</p>
        )}
      </div>
    </div>
  )
}

// ─── Main compare modal ───────────────────────────────────────────────────
interface SIFRevisionCompareProps {
  older: SIFRevision
  newer: SIFRevision
  onClose: () => void
}

export function SIFRevisionCompare({ older, newer, onClose }: SIFRevisionCompareProps) {
  const sifA: SIF = older.snapshot
  const sifB: SIF = newer.snapshot

  const calcA = useMemo(() => calcSIF(sifA), [sifA])
  const calcB = useMemo(() => calcSIF(sifB), [sifB])

  // ── Delta calculations ──
  const pfdDelta: DeltaValue = {
    from: formatPFD(calcA.PFD_avg),
    to:   formatPFD(calcB.PFD_avg),
    dir:  numDelta(calcA.PFD_avg, calcB.PFD_avg, false), // lower PFD is better
    changed: Math.abs(calcA.PFD_avg - calcB.PFD_avg) > 1e-12,
  }

  const silDelta: DeltaValue = {
    from: `SIL ${calcA.SIL}`,
    to:   `SIL ${calcB.SIL}`,
    dir:  numDelta(calcA.SIL, calcB.SIL, true),
    changed: calcA.SIL !== calcB.SIL,
  }

  const meetsTargetDelta: DeltaValue = {
    from: calcA.meetsTarget ? '✓ Atteint' : '✗ Non atteint',
    to:   calcB.meetsTarget ? '✓ Atteint' : '✗ Non atteint',
    dir:  calcA.meetsTarget === calcB.meetsTarget ? 'neutral'
          : calcB.meetsTarget ? 'up' : 'down',
    changed: calcA.meetsTarget !== calcB.meetsTarget,
  }

  const statusDelta    = strDelta(STATUS_LABEL[older.status],    STATUS_LABEL[newer.status])
  const madeByDelta    = strDelta(sifA.madeBy    ?? '',          sifB.madeBy    ?? '')
  const verifiedDelta  = strDelta(sifA.verifiedBy ?? '',         sifB.verifiedBy ?? '')
  const approvedDelta  = strDelta(sifA.approvedBy ?? '',         sifB.approvedBy ?? '')
  const targetSilDelta = strDelta(`SIL ${sifA.targetSIL}`,       `SIL ${sifB.targetSIL}`)
  const rrfDelta       = strDelta(`${sifA.rrfRequired}`,         `${sifB.rrfRequired}`)

  // Subsystems
  const subsA = sifA.subsystems ?? []
  const subsB = sifB.subsystems ?? []
  const compCountA = subsA.reduce((n, s) => n + s.channels.reduce((m, c) => m + c.components.length, 0), 0)
  const compCountB = subsB.reduce((n, s) => n + s.channels.reduce((m, c) => m + c.components.length, 0), 0)

  const subCountDelta: DeltaValue = {
    from: `${subsA.length} sous-système${subsA.length !== 1 ? 's' : ''}`,
    to:   `${subsB.length} sous-système${subsB.length !== 1 ? 's' : ''}`,
    dir:  numDelta(subsA.length, subsB.length, true),
    changed: subsA.length !== subsB.length,
  }
  const compCountDelta: DeltaValue = {
    from: `${compCountA} composant${compCountA !== 1 ? 's' : ''}`,
    to:   `${compCountB} composant${compCountB !== 1 ? 's' : ''}`,
    dir:  numDelta(compCountA, compCountB, true),
    changed: compCountA !== compCountB,
  }

  // HAZOP
  const hazopA = sifA.hazopTrace
  const hazopB = sifB.hazopTrace
  const hazopIdDelta    = strDelta(hazopA?.scenarioId ?? '—',   hazopB?.scenarioId ?? '—')
  const hazopRiskDelta  = strDelta(hazopA?.riskMatrix ?? '—',   hazopB?.riskMatrix ?? '—')
  const hazopTmelDelta: DeltaValue = {
    from: hazopA?.tmel != null ? `${hazopA.tmel.toExponential(1)} yr⁻¹` : '—',
    to:   hazopB?.tmel != null ? `${hazopB.tmel.toExponential(1)} yr⁻¹` : '—',
    dir:  hazopA?.tmel != null && hazopB?.tmel != null
            ? numDelta(hazopA.tmel, hazopB.tmel, false)
            : 'neutral',
    changed: hazopA?.tmel !== hazopB?.tmel,
  }

  // Proof test
  const ptA = sifA.proofTestProcedure
  const ptB = sifB.proofTestProcedure
  const ptPeriodDelta = strDelta(
    ptA ? `${ptA.periodicityMonths} mois` : '—',
    ptB ? `${ptB.periodicityMonths} mois` : '—',
  )
  const ptStepsDelta: DeltaValue = {
    from: ptA ? `${ptA.steps.length} étapes` : '—',
    to:   ptB ? `${ptB.steps.length} étapes` : '—',
    dir:  ptA && ptB ? numDelta(ptA.steps.length, ptB.steps.length, true) : 'neutral',
    changed: (ptA?.steps.length ?? -1) !== (ptB?.steps.length ?? -1),
  }

  // Count changed fields
  const allDeltas = [
    pfdDelta, silDelta, meetsTargetDelta, statusDelta,
    madeByDelta, verifiedDelta, approvedDelta, targetSilDelta, rrfDelta,
    subCountDelta, compCountDelta,
    hazopIdDelta, hazopRiskDelta, hazopTmelDelta,
    ptPeriodDelta, ptStepsDelta,
  ]
  const changedCount = allDeltas.filter(d => d.changed).length

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
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: BORDER }}
        >
          <div className="flex items-center gap-3">
            <GitCompare size={16} style={{ color: TEAL }} />
            <div>
              <h2 className="text-sm font-black" style={{ color: TEXT }}>
                Comparaison — {sifA.sifNumber}
              </h2>
              <p className="text-[10px]" style={{ color: TEXT_DIM }}>
                {changedCount > 0
                  ? `${changedCount} différence${changedCount > 1 ? 's' : ''} détectée${changedCount > 1 ? 's' : ''}`
                  : 'Aucune différence détectée'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
            style={{ background: 'transparent', color: TEXT_DIM }}
            onMouseEnter={e => { e.currentTarget.style.background = '#EF444420'; e.currentTarget.style.color = '#EF4444' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = TEXT_DIM }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Revision cards ── */}
        <div className="flex gap-4 px-6 py-4 shrink-0 border-b" style={{ borderColor: BORDER }}>
          <RevisionCard revision={older} side="left"  />
          <div className="flex items-center" style={{ color: TEXT_DIM }}>
            <GitCompare size={20} />
          </div>
          <RevisionCard revision={newer} side="right" />
        </div>

        {/* ── Delta table ── */}
        <div className="flex-1 overflow-auto min-h-0">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10" style={{ background: PANEL_BG }}>
              <tr className="border-b" style={{ borderColor: BORDER }}>
                <th className="px-4 py-2.5 text-left" style={{ color: TEXT_DIM, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', width: 160 }}>
                  Paramètre
                </th>
                <th className="px-4 py-2.5 text-left" style={{ color: TEXT_DIM, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', width: '45%' }}>
                  Rév. {older.revisionLabel} (antérieure)
                </th>
                <th className="px-4 py-2.5 text-left" style={{ color: TEAL_DIM, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Rév. {newer.revisionLabel} (actuelle)
                </th>
              </tr>
            </thead>
            <tbody>
              {/* SIL / PFD */}
              <SectionHeader label="Calcul SIL / PFD" />
              <CompareRow label="PFD moyen"       highlight={pfdDelta.changed}
                left={<DeltaCell delta={{ ...pfdDelta, from: pfdDelta.from, to: pfdDelta.from }} />}
                right={<DeltaCell delta={pfdDelta} />}
              />
              <CompareRow label="SIL atteint"     highlight={silDelta.changed}
                left={<DeltaCell delta={{ ...silDelta, to: silDelta.from, dir: 'neutral', changed: false }} />}
                right={<DeltaCell delta={silDelta} />}
              />
              <CompareRow label="Cible atteinte"  highlight={meetsTargetDelta.changed}
                left={<DeltaCell delta={{ ...meetsTargetDelta, to: meetsTargetDelta.from, dir: 'neutral', changed: false }} />}
                right={<DeltaCell delta={meetsTargetDelta} />}
              />
              <CompareRow label="SIL cible"       highlight={targetSilDelta.changed}
                left={<span className="text-[11px]" style={{ color: TEXT_DIM }}>{targetSilDelta.from}</span>}
                right={<DeltaCell delta={targetSilDelta} />}
              />
              <CompareRow label="RRF requis"      highlight={rrfDelta.changed}
                left={<span className="text-[11px]" style={{ color: TEXT_DIM }}>{rrfDelta.from}</span>}
                right={<DeltaCell delta={rrfDelta} />}
              />

              {/* Architecture */}
              <SectionHeader label="Architecture" />
              <CompareRow label="Sous-systèmes"   highlight={subCountDelta.changed}
                left={<span className="text-[11px]" style={{ color: TEXT_DIM }}>{subCountDelta.from}</span>}
                right={<DeltaCell delta={subCountDelta} />}
              />
              <CompareRow label="Composants"      highlight={compCountDelta.changed}
                left={<span className="text-[11px]" style={{ color: TEXT_DIM }}>{compCountDelta.from}</span>}
                right={<DeltaCell delta={compCountDelta} />}
              />

              {/* Document */}
              <SectionHeader label="Document" />
              <CompareRow label="Statut"          highlight={statusDelta.changed}
                left={<span className="text-[11px]" style={{ color: TEXT_DIM }}>{statusDelta.from}</span>}
                right={<DeltaCell delta={statusDelta} />}
              />
              <CompareRow label="Rédacteur"       highlight={madeByDelta.changed}
                left={<span className="text-[11px]" style={{ color: TEXT_DIM }}>{madeByDelta.from || '—'}</span>}
                right={<DeltaCell delta={madeByDelta} />}
              />
              <CompareRow label="Vérificateur"    highlight={verifiedDelta.changed}
                left={<span className="text-[11px]" style={{ color: TEXT_DIM }}>{verifiedDelta.from || '—'}</span>}
                right={<DeltaCell delta={verifiedDelta} />}
              />
              <CompareRow label="Approbateur"     highlight={approvedDelta.changed}
                left={<span className="text-[11px]" style={{ color: TEXT_DIM }}>{approvedDelta.from || '—'}</span>}
                right={<DeltaCell delta={approvedDelta} />}
              />

              {/* HAZOP */}
              <SectionHeader label="Traçabilité HAZOP" />
              <CompareRow label="Scénario"        highlight={hazopIdDelta.changed}
                left={<span className="text-[11px]" style={{ color: TEXT_DIM }}>{hazopIdDelta.from}</span>}
                right={<DeltaCell delta={hazopIdDelta} />}
              />
              <CompareRow label="Matrice risque"  highlight={hazopRiskDelta.changed}
                left={<span className="text-[11px]" style={{ color: TEXT_DIM }}>{hazopRiskDelta.from}</span>}
                right={<DeltaCell delta={hazopRiskDelta} />}
              />
              <CompareRow label="TMEL"            highlight={hazopTmelDelta.changed}
                left={<span className="text-[11px]" style={{ color: TEXT_DIM }}>{hazopTmelDelta.from}</span>}
                right={<DeltaCell delta={hazopTmelDelta} />}
              />

              {/* Proof Test */}
              <SectionHeader label="Proof Test" />
              <CompareRow label="Périodicité"     highlight={ptPeriodDelta.changed}
                left={<span className="text-[11px]" style={{ color: TEXT_DIM }}>{ptPeriodDelta.from}</span>}
                right={<DeltaCell delta={ptPeriodDelta} />}
              />
              <CompareRow label="Étapes procédure" highlight={ptStepsDelta.changed}
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
