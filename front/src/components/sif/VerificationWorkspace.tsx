/**
 * VerificationWorkspace — contenu principal de la phase Vérification.
 *
 * Principe :
 *   - Les settings (mission time, points courbe, reset) sont dans le RIGHT PANEL (VerificationRightPanel).
 *   - Ici : uniquement les résultats, le graphe, le breakdown, les écarts, les hypothèses et les preuves.
 *   - Pas de footer navigation (lifecycle bar gère ça).
 */
import { PFDChart } from '@/components/analysis/PFDChart'
import { SILBadge } from '@/components/shared/SILBadge'
import { AlertTriangle, BarChart3, Boxes, ClipboardCheck, ShieldCheck } from 'lucide-react'
import type { ComplianceResult } from '@/components/sif/complianceCalc'
import type { SIFAnalysisSettings } from '@/core/models/analysisSettings'
import type { SIF, SIFCalcResult } from '@/core/types'
import type { SIFTab } from '@/store/types'
import { formatPFD, formatRRF, formatPct } from '@/core/math/pfdCalc'
import { semantic } from '@/styles/tokens'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { getSifVerificationStrings } from '@/i18n/sifVerification'
import { useLocaleStrings } from '@/i18n/useLocale'

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
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  const { BORDER, CARD_BG, SHADOW_CARD, SHADOW_SOFT, TEAL } = usePrismTheme()
  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_CARD }}>
      <div className="mb-4 flex items-center gap-2 border-b pb-2" style={{ borderColor: BORDER }}>
        <span
          className="inline-flex h-6 w-6 items-center justify-center rounded-md border"
          style={{ color: TEAL, background: `${TEAL}10`, borderColor: `${TEAL}22`, boxShadow: SHADOW_SOFT }}
        >
          {icon}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: TEAL }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  )
}

function MetricTile({
  label,
  value,
  tone,
  detail,
}: {
  label: string
  value: string
  tone: string
  detail?: string
}) {
  const { BORDER, SHADOW_SOFT, SURFACE, TEXT_DIM } = usePrismTheme()
  return (
    <div className="rounded-xl border px-3.5 py-3" style={{ borderColor: BORDER, background: SURFACE, boxShadow: SHADOW_SOFT }}>
      <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>{label}</p>
      <p className="mt-1 text-base font-black font-mono" style={{ color: tone }}>{value}</p>
      {detail ? <p className="mt-1 text-[10px]" style={{ color: TEXT_DIM }}>{detail}</p> : null}
    </div>
  )
}

function InsetPanel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { BORDER, SHADOW_SOFT, SURFACE } = usePrismTheme()
  return (
    <div
      className={`rounded-xl border ${className}`.trim()}
      style={{ borderColor: BORDER, background: SURFACE, boxShadow: SHADOW_SOFT }}
    >
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
  const strings = useLocaleStrings(getSifVerificationStrings)
  const { BORDER, SHADOW_SOFT, SURFACE, TEXT, TEXT_DIM } = usePrismTheme()
  const openGaps = Math.max(0, compliance.totalChecks - compliance.passedChecks)
  const evidenceComplete = compliance.evidenceItems.filter(item => item.status === 'complete').length

  return (
    <div className="flex min-h-full flex-col gap-5">

      {/* ── Résultats + Breakdown ── */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <SurfaceCard title={strings.workspace.sections.calculationResults} icon={<BarChart3 size={12} />}>
          <div className="space-y-4">
            <div className="grid gap-3 grid-cols-2 xl:grid-cols-4">
              <MetricTile label={strings.workspace.metrics.pfdavg} value={formatPFD(result.PFD_avg)} tone={TEXT} />
              <MetricTile label={strings.workspace.metrics.rrf} value={formatRRF(result.RRF)} tone={TEXT} />
              <MetricTile label={strings.workspace.metrics.achievedSil} value={`SIL ${result.SIL}`} tone={result.meetsTarget ? semantic.success : semantic.warning} />
              <MetricTile label={strings.workspace.metrics.checks} value={`${compliance.passedChecks}/${compliance.totalChecks}`} tone={openGaps === 0 ? semantic.success : TEXT} />
            </div>
            <InsetPanel className="p-3">
              <PFDChart sif={sif} chartData={result.chartData} settings={settings.chart} />
            </InsetPanel>
          </div>
        </SurfaceCard>

        <SurfaceCard title={strings.workspace.sections.subsystemBreakdown} icon={<Boxes size={12} />}>
          <InsetPanel className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: BORDER, background: SURFACE }}>
                  {[strings.workspace.metrics.subsystem, strings.workspace.metrics.architecture, strings.workspace.metrics.subsystemPfd, strings.workspace.metrics.subsystemRrf, strings.workspace.metrics.sff, strings.workspace.metrics.dc, strings.workspace.metrics.hft, strings.workspace.metrics.sil].map(h => (
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
                    <tr key={sub.subsystemId} className="border-t" style={{ borderColor: `${BORDER}80` }}>
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
          </InsetPanel>
        </SurfaceCard>
      </div>

      {/* ── Écarts + Hypothèses ── */}
      <div className="grid gap-4 xl:grid-cols-2">
        <SurfaceCard title={strings.workspace.sections.technicalGaps} icon={<AlertTriangle size={12} />}>
          <div className="space-y-2">
            {compliance.technicalFindings.length > 0 ? compliance.technicalFindings.map(finding => (
              <button
                key={finding.id}
                type="button"
                onClick={() => onSelectGap(finding.id)}
                className="w-full rounded-lg border px-3 py-2.5 text-left transition-colors hover:opacity-80"
                style={{ borderColor: BORDER, background: SURFACE, boxShadow: SHADOW_SOFT }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold" style={{ color: TEXT }}>{finding.title}</p>
                    <p className="mt-0.5 text-xs truncate" style={{ color: TEXT_DIM }}>
                      {strings.workspace.findingSummary(finding.subsystemLabel, finding.value, finding.expected)}
                    </p>
                  </div>
                  <span
                    className="shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold uppercase"
                    style={{ borderColor: `${semantic.warning}55`, color: semantic.warning, background: `${semantic.warning}12` }}
                  >
                    {strings.workspace.statuses.inspect}
                  </span>
                </div>
              </button>
            )) : (
              <div className="rounded-lg border px-3 py-3 text-xs" style={{ borderColor: `${semantic.success}44`, background: `${semantic.success}10`, color: semantic.success, boxShadow: SHADOW_SOFT }}>
                {strings.workspace.statuses.noTechnicalGaps}
              </div>
            )}
          </div>
        </SurfaceCard>

        <SurfaceCard title={strings.workspace.sections.assumptions} icon={<ShieldCheck size={12} />}>
          <div className="space-y-2">
            {sif.assumptions.length > 0 ? sif.assumptions.map(assumption => (
              <div key={assumption.id} className="rounded-lg border px-3 py-2.5" style={{ borderColor: BORDER, background: SURFACE, boxShadow: SHADOW_SOFT }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: TEXT }}>{assumption.title}</p>
                    <p className="mt-0.5 text-xs" style={{ color: TEXT_DIM }}>
                      {assumption.rationale || assumption.statement || strings.workspace.statuses.undocumentedRationale}
                    </p>
                  </div>
                  <span
                    className="shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold uppercase"
                    style={assumption.status === 'validated'
                      ? { borderColor: `${semantic.success}44`, color: semantic.success, background: `${semantic.success}10` }
                      : { borderColor: `${semantic.warning}44`, color: semantic.warning, background: `${semantic.warning}10` }}
                  >
                    {assumption.status === 'validated' ? strings.workspace.statuses.validated : strings.workspace.statuses.review}
                  </span>
                </div>
              </div>
            )) : (
              <div className="rounded-lg border px-3 py-3 text-xs" style={{ borderColor: BORDER, background: SURFACE, color: TEXT_DIM, boxShadow: SHADOW_SOFT }}>
                {strings.workspace.statuses.noAssumptions}
              </div>
            )}
          </div>
        </SurfaceCard>
      </div>

      {/* ── Preuves ── */}
      <SurfaceCard title={strings.workspace.sections.evidencePackage} icon={<ClipboardCheck size={12} />}>
        <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            {compliance.evidenceItems.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectEvidence(item.id)}
                className="w-full rounded-lg border px-3 py-2.5 text-left transition-colors hover:opacity-80"
                style={{ borderColor: BORDER, background: SURFACE, boxShadow: SHADOW_SOFT }}
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
                    {item.status === 'complete' ? strings.workspace.statuses.ok : item.status === 'missing' ? strings.workspace.statuses.missing : strings.workspace.statuses.review}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Score résumé */}
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-1 xl:w-40">
            {[
              { label: strings.workspace.metrics.score, value: `${compliance.score}/100`, tone: compliance.score >= 90 ? semantic.success : TEXT },
              { label: strings.workspace.metrics.checks, value: `${compliance.passedChecks}/${compliance.totalChecks}`, tone: openGaps === 0 ? semantic.success : semantic.warning },
              { label: strings.workspace.metrics.evidence, value: `${evidenceComplete}/${compliance.evidenceItems.length}`, tone: compliance.evidenceItems.every(i => i.status === 'complete') ? semantic.success : TEXT },
              { label: strings.workspace.metrics.proofTest, value: sif.proofTestProcedure ? strings.workspace.statuses.defined : strings.workspace.statuses.missing, tone: sif.proofTestProcedure ? semantic.success : semantic.error },
            ].map(item => (
              <MetricTile key={item.label} label={item.label} value={item.value} tone={item.tone} />
            ))}
          </div>
        </div>
      </SurfaceCard>

    </div>
  )
}
