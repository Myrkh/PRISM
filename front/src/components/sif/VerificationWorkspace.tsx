/**
 * VerificationWorkspace — contenu principal de la phase Vérification.
 *
 * Principe :
 *   - Les settings (mission time, points courbe, reset) sont dans le RIGHT PANEL (VerificationRightPanel).
 *   - Ici : uniquement les résultats, le graphe, le breakdown, les écarts, les hypothèses et les preuves.
 *   - Pas de footer navigation (lifecycle bar gère ça).
 */
import { useMemo } from 'react'
import { PFDChart } from '@/components/analysis/PFDChart'
import { SILBadge } from '@/components/shared/SILBadge'
import type { ComplianceResult } from '@/components/sif/complianceCalc'
import type { SIFAnalysisSettings } from '@/core/models/analysisSettings'
import type { SIF, SIFAssumption, SIFCalcResult } from '@/core/types'
import type { SIFTab } from '@/store/types'
import { formatPFD, formatRRF, formatPct } from '@/core/math/pfdCalc'
import { BORDER, CARD_BG, PAGE_BG, TEAL_DIM, TEXT, TEXT_DIM, semantic } from '@/styles/tokens'

interface Props {
  sif: SIF
  result: SIFCalcResult
  compliance: ComplianceResult
  settings: SIFAnalysisSettings
  // Conservés pour compatibilité avec SIFDashboard / VerificationRightPanel
  onChangeSettings: (settings: SIFAnalysisSettings) => void
  onResetSettings: () => void
  onSelectTab: (tab: SIFTab) => void
  onSelectGap: (gapId: string) => void
  onSelectEvidence: (evidenceId: string) => void
}

function SurfaceCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: BORDER, background: CARD_BG }}>
      <p className="mb-4 text-sm font-semibold" style={{ color: TEXT }}>{title}</p>
      {children}
    </div>
  )
}

export function VerificationWorkspace({
  sif,
  result,
  compliance,
  settings,
  onSelectGap,
  onSelectEvidence,
}: Props) {
  const openGaps = Math.max(0, compliance.totalChecks - compliance.passedChecks)
  const evidenceComplete = compliance.evidenceItems.filter(item => item.status === 'complete').length

  const assumptionsInReview = useMemo(
    () => sif.assumptions.filter((a: SIFAssumption) => a.status !== 'validated').length,
    [sif.assumptions],
  )

  return (
    <div className="flex min-h-full flex-col gap-4">

      {/* ── Status badges ── */}
      <div className="flex flex-wrap gap-2">
        {[
          {
            label: result.meetsTarget ? `SIL ${sif.targetSIL} atteint` : `SIL ${sif.targetSIL} non atteint`,
            tone: result.meetsTarget ? semantic.success : semantic.error,
            bg: result.meetsTarget ? `${semantic.success}12` : `${semantic.error}12`,
            border: result.meetsTarget ? `${semantic.success}33` : `${semantic.error}33`,
          },
          {
            label: openGaps === 0 ? 'Aucun écart' : `${openGaps} écart${openGaps > 1 ? 's' : ''} ouvert${openGaps > 1 ? 's' : ''}`,
            tone: openGaps === 0 ? semantic.success : semantic.warning,
            bg: openGaps === 0 ? `${semantic.success}12` : `${semantic.warning}12`,
            border: openGaps === 0 ? `${semantic.success}33` : `${semantic.warning}33`,
          },
          {
            label: assumptionsInReview === 0 ? 'Hypothèses validées' : `${assumptionsInReview} hypothèse${assumptionsInReview > 1 ? 's' : ''} à revoir`,
            tone: assumptionsInReview === 0 ? semantic.success : TEXT,
            bg: assumptionsInReview === 0 ? `${semantic.success}12` : `${TEAL_DIM}10`,
            border: assumptionsInReview === 0 ? `${semantic.success}33` : `${TEAL_DIM}33`,
          },
        ].map(item => (
          <div
            key={item.label}
            className="rounded-xl border px-3 py-2 text-sm font-semibold"
            style={{ color: item.tone, background: item.bg, borderColor: item.border }}
          >
            {item.label}
          </div>
        ))}
      </div>

      {/* ── Résultats + Breakdown ── */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <SurfaceCard title="Résultats de calcul">
          <div className="space-y-4">
            {/* KPIs */}
            <div className="grid gap-3 grid-cols-2">
              {[
                { label: 'PFDavg', value: formatPFD(result.PFD_avg), tone: TEXT },
                { label: 'RRF',    value: formatRRF(result.RRF),    tone: TEXT },
              ].map(item => (
                <div key={item.label} className="rounded-lg border px-3 py-2.5" style={{ borderColor: BORDER, background: PAGE_BG }}>
                  <p className="text-[10px] uppercase tracking-wide" style={{ color: TEXT_DIM }}>{item.label}</p>
                  <p className="mt-1 text-lg font-black font-mono" style={{ color: item.tone }}>{item.value}</p>
                </div>
              ))}
            </div>
            {/* Courbe PFD */}
            <PFDChart sif={sif} chartData={result.chartData} settings={settings.chart} />
          </div>
        </SurfaceCard>

        <SurfaceCard title="Breakdown sous-systèmes">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: BORDER }}>
                {['Sous-système', 'Archi', 'PFD avg', 'RRF', 'SFF', 'DC', 'HFT', 'SIL'].map(h => (
                  <th key={h} className="text-left px-3 py-2 text-[11px] font-medium uppercase tracking-wide" style={{ color: TEXT_DIM }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.subsystems.map((sub, i) => {
                const subsystem = sif.subsystems[i]
                return (
                  <tr key={sub.subsystemId} className="border-b" style={{ borderColor: `${BORDER}80` }}>
                    <td className="px-3 py-2.5 text-xs font-semibold" style={{ color: TEXT }}>{subsystem?.label ?? sub.type}</td>
                    <td className="px-3 py-2.5 text-xs font-mono" style={{ color: TEXT_DIM }}>{subsystem?.architecture ?? '—'}</td>
                    <td className="px-3 py-2.5 text-xs font-mono" style={{ color: TEXT }}>{formatPFD(sub.PFD_avg)}</td>
                    <td className="px-3 py-2.5 text-xs font-mono" style={{ color: TEXT }}>{formatRRF(sub.RRF)}</td>
                    <td className="px-3 py-2.5 text-xs font-mono" style={{ color: TEXT }}>{formatPct(sub.SFF)}</td>
                    <td className="px-3 py-2.5 text-xs font-mono" style={{ color: TEXT }}>{formatPct(sub.DC)}</td>
                    <td className="px-3 py-2.5 text-xs font-mono" style={{ color: TEXT }}>{sub.HFT}</td>
                    <td className="px-3 py-2.5"><SILBadge sil={sub.SIL} size="sm" /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </SurfaceCard>
      </div>

      {/* ── Écarts + Hypothèses ── */}
      <div className="grid gap-4 xl:grid-cols-2">
        <SurfaceCard title="Écarts techniques">
          <div className="space-y-2">
            {compliance.technicalFindings.length > 0 ? compliance.technicalFindings.map(finding => (
              <button
                key={finding.id}
                type="button"
                onClick={() => onSelectGap(finding.id)}
                className="w-full rounded-lg border px-3 py-2.5 text-left transition-colors hover:opacity-80"
                style={{ borderColor: BORDER, background: PAGE_BG }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold" style={{ color: TEXT }}>{finding.title}</p>
                    <p className="mt-0.5 text-xs truncate" style={{ color: TEXT_DIM }}>
                      {finding.subsystemLabel} · {finding.value} (attendu : {finding.expected})
                    </p>
                  </div>
                  <span
                    className="shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold uppercase"
                    style={{ borderColor: `${semantic.warning}55`, color: semantic.warning, background: `${semantic.warning}12` }}
                  >
                    Inspect
                  </span>
                </div>
              </button>
            )) : (
              <div className="rounded-lg border px-3 py-3 text-xs" style={{ borderColor: `${semantic.success}44`, background: `${semantic.success}10`, color: semantic.success }}>
                Aucun écart technique ouvert.
              </div>
            )}
          </div>
        </SurfaceCard>

        <SurfaceCard title="Hypothèses">
          <div className="space-y-2">
            {sif.assumptions.length > 0 ? sif.assumptions.map(assumption => (
              <div key={assumption.id} className="rounded-lg border px-3 py-2.5" style={{ borderColor: BORDER, background: PAGE_BG }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: TEXT }}>{assumption.title}</p>
                    <p className="mt-0.5 text-xs" style={{ color: TEXT_DIM }}>
                      {assumption.rationale || assumption.statement || 'Justification non documentée.'}
                    </p>
                  </div>
                  <span
                    className="shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold uppercase"
                    style={assumption.status === 'validated'
                      ? { borderColor: `${semantic.success}44`, color: semantic.success, background: `${semantic.success}10` }
                      : { borderColor: `${semantic.warning}44`, color: semantic.warning, background: `${semantic.warning}10` }}
                  >
                    {assumption.status === 'validated' ? 'Validée' : 'À revoir'}
                  </span>
                </div>
              </div>
            )) : (
              <div className="rounded-lg border px-3 py-3 text-xs" style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT_DIM }}>
                Aucune hypothèse enregistrée.
              </div>
            )}
          </div>
        </SurfaceCard>
      </div>

      {/* ── Preuves ── */}
      <SurfaceCard title="Package de preuves">
        <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            {compliance.evidenceItems.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectEvidence(item.id)}
                className="w-full rounded-lg border px-3 py-2.5 text-left transition-colors hover:opacity-80"
                style={{ borderColor: BORDER, background: PAGE_BG }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold" style={{ color: TEXT }}>{item.label}</p>
                    <p className="mt-0.5 text-xs truncate" style={{ color: TEXT_DIM }}>{item.summary}</p>
                  </div>
                  <span
                    className="shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold uppercase"
                    style={item.status === 'complete'
                      ? { borderColor: `${semantic.success}44`, color: semantic.success, background: `${semantic.success}10` }
                      : item.status === 'missing'
                        ? { borderColor: `${semantic.error}44`, color: semantic.error, background: `${semantic.error}10` }
                        : { borderColor: `${semantic.warning}44`, color: semantic.warning, background: `${semantic.warning}10` }}
                  >
                    {item.status === 'complete' ? 'OK' : item.status === 'missing' ? 'Manquant' : 'À revoir'}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Score résumé */}
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-1 xl:w-36">
            {[
              { label: 'Score', value: `${compliance.score}/100`, tone: compliance.score >= 90 ? semantic.success : TEXT },
              { label: 'Checks', value: `${compliance.passedChecks}/${compliance.totalChecks}`, tone: openGaps === 0 ? semantic.success : semantic.warning },
              { label: 'Preuves', value: `${evidenceComplete}/${compliance.evidenceItems.length}`, tone: compliance.evidenceItems.every(i => i.status === 'complete') ? semantic.success : TEXT },
              { label: 'Proof test', value: sif.proofTestProcedure ? 'Défini' : 'Manquant', tone: sif.proofTestProcedure ? semantic.success : semantic.error },
            ].map(item => (
              <div key={item.label} className="rounded-lg border px-3 py-2.5" style={{ borderColor: BORDER, background: PAGE_BG }}>
                <p className="text-[10px] uppercase tracking-wide" style={{ color: TEXT_DIM }}>{item.label}</p>
                <p className="mt-1 text-base font-black font-mono" style={{ color: item.tone }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </SurfaceCard>

    </div>
  )
}
