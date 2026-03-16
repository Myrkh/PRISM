import { Fragment } from 'react'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import type { BetaAssessmentResult, BetaChecklistItem } from '@/core/math/betaFactor'
import type { BetaAssessmentConfig, CCFMethod, SIFSubsystem, VoteType } from '@/core/types'
import { usePrismTheme } from '@/styles/usePrismTheme'

const METHOD_OPTIONS: CCFMethod[] = ['MAX', 'AVERAGE', 'GEOMETRIC', 'MIN', 'QUADRATIC']

function formatBetaPct(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return `${(value * 100).toFixed(1)}%`
}

interface Props {
  selectedSubsystem: SIFSubsystem | null
  profileLabel: string
  assessmentDraft: BetaAssessmentConfig
  checklistSections: { section: string; items: BetaChecklistItem[] }[]
  checklistCount: number
  assessmentResult: BetaAssessmentResult | null
  voteType: VoteType
  onVoteTypeChange: (value: VoteType) => void
  method: CCFMethod
  onMethodChange: (value: CCFMethod) => void
  betaPct: string
  onBetaPctChange: (value: string) => void
  betaDPct: string
  onBetaDPctChange: (value: string) => void
  onUpdateAssessment: (key: keyof BetaAssessmentConfig, value: BetaAssessmentConfig[keyof BetaAssessmentConfig]) => void
  onToggleMeasure: (measureId: string) => void
  onResetManual: () => void
  onBack: () => void
  onApply: () => void
  canApply: boolean
}

export function CCFBetaWorkspace({
  selectedSubsystem,
  profileLabel,
  assessmentDraft,
  checklistSections,
  checklistCount,
  assessmentResult,
  voteType,
  onVoteTypeChange,
  method,
  onMethodChange,
  betaPct,
  onBetaPctChange,
  betaDPct,
  onBetaDPctChange,
  onUpdateAssessment,
  onToggleMeasure,
  onResetManual,
  onBack,
  onApply,
  canApply,
}: Props) {
  const { BORDER, CARD_BG, PAGE_BG, SHADOW_PANEL, SHADOW_SOFT, SURFACE, TEAL, TEXT, TEXT_DIM, semantic } = usePrismTheme()
  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-[22px] border"
      style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_PANEL }}
    >
      <header className="border-b px-5 py-4" style={{ borderColor: BORDER }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl border"
              style={{ borderColor: `${TEAL}35`, background: `${TEAL}10`, color: TEAL, boxShadow: SHADOW_SOFT }}
            >
              <ShieldCheck size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-base font-semibold" style={{ color: TEXT }}>
                  CCF / Beta Assessment Workspace
                </p>
                {selectedSubsystem ? (
                  <span className="rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT_DIM }}>
                    {selectedSubsystem.label}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
                Evalue le facteur beta selon l&apos;annexe D de l&apos;IEC 61508 et applique directement le resultat au moteur.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-colors"
            style={{ borderColor: BORDER, color: TEXT_DIM, background: PAGE_BG, boxShadow: SHADOW_SOFT }}
          >
            <ArrowLeft size={12} />
            Retour au canvas
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-5">
        {selectedSubsystem ? (
          assessmentDraft.mode === 'iec61508' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-[1.1fr_0.9fr] gap-4">
                <div className="rounded-xl border p-4" style={{ borderColor: BORDER, background: SURFACE, boxShadow: SHADOW_SOFT }}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: TEXT }}>Diagnostic Inputs</p>
                      <p className="mt-1 text-xs" style={{ color: TEXT_DIM }}>Renseigne Z et la justification de credit diagnostic.</p>
                    </div>
                    <label className="inline-flex items-center gap-2 text-xs" style={{ color: TEXT_DIM }}>
                      <input
                        type="checkbox"
                        checked={assessmentDraft.allowZCredit}
                        onChange={e => onUpdateAssessment('allowZCredit', e.target.checked)}
                        className="h-4 w-4 rounded border accent-[#009BA4]"
                        style={{ borderColor: BORDER, background: PAGE_BG }}
                      />
                      Allow Z credit
                    </label>
                  </div>
                  <div className="mt-4 grid grid-cols-[1fr_0.9fr_0.8fr] gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: TEXT_DIM }}>Diagnostic coverage [%]</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={assessmentDraft.diagnosticCoveragePct}
                        onChange={e => onUpdateAssessment('diagnosticCoveragePct', Number(e.target.value))}
                        className="mt-1 h-9 w-full rounded-lg border px-2.5 text-sm outline-none"
                        style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT, boxShadow: SHADOW_SOFT }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: TEXT_DIM }}>Diagnostic interval</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={assessmentDraft.diagnosticInterval}
                        onChange={e => onUpdateAssessment('diagnosticInterval', Number(e.target.value))}
                        className="mt-1 h-9 w-full rounded-lg border px-2.5 text-sm outline-none"
                        style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT, boxShadow: SHADOW_SOFT }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: TEXT_DIM }}>Unit</label>
                      <select
                        value={assessmentDraft.diagnosticIntervalUnit}
                        onChange={e => onUpdateAssessment('diagnosticIntervalUnit', e.target.value as BetaAssessmentConfig['diagnosticIntervalUnit'])}
                        className="mt-1 h-9 w-full rounded-lg border px-2.5 text-sm outline-none"
                        style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT, boxShadow: SHADOW_SOFT }}
                      >
                        <option value="min">min</option>
                        <option value="hr">hr</option>
                        <option value="day">day</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border p-4" style={{ borderColor: BORDER, background: SURFACE, boxShadow: SHADOW_SOFT }}>
                  <p className="text-sm font-semibold" style={{ color: TEXT }}>Scaling & Engine Settings</p>
                  <p className="mt-1 text-xs" style={{ color: TEXT_DIM }}>Table D.5 + parametrage moteur applique au sous-systeme.</p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: TEXT_DIM }}>M</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        step="1"
                        value={assessmentDraft.mooN_M}
                        onChange={e => onUpdateAssessment('mooN_M', Number(e.target.value))}
                        className="mt-1 h-9 w-full rounded-lg border px-2.5 text-sm outline-none"
                        style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT, boxShadow: SHADOW_SOFT }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: TEXT_DIM }}>N</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        step="1"
                        value={assessmentDraft.mooN_N}
                        onChange={e => onUpdateAssessment('mooN_N', Number(e.target.value))}
                        className="mt-1 h-9 w-full rounded-lg border px-2.5 text-sm outline-none"
                        style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT, boxShadow: SHADOW_SOFT }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: TEXT_DIM }}>Vote Type</label>
                      <select
                        value={voteType}
                        onChange={e => onVoteTypeChange(e.target.value as VoteType)}
                        className="mt-1 h-9 w-full rounded-lg border px-2.5 text-sm outline-none"
                        style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT, boxShadow: SHADOW_SOFT }}
                      >
                        <option value="S">Standard (S)</option>
                        <option value="A">Availability (A)</option>
                        <option value="M">Maintenance (M)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: TEXT_DIM }}>CCF Method</label>
                      <select
                        value={method}
                        onChange={e => onMethodChange(e.target.value as CCFMethod)}
                        className="mt-1 h-9 w-full rounded-lg border px-2.5 text-sm outline-none"
                        style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT, boxShadow: SHADOW_SOFT }}
                      >
                        {METHOD_OPTIONS.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border" style={{ borderColor: BORDER, background: SURFACE, boxShadow: SHADOW_SOFT }}>
                <div className="border-b px-4 py-3" style={{ borderColor: BORDER }}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold" style={{ color: TEXT }}>IEC 61508 Annex D Checklist</h3>
                      <p className="mt-1 text-xs" style={{ color: TEXT_DIM }}>
                        Tableau D.1 applique en profil {profileLabel}. Coche les mesures effectivement defendables pour ce sous-systeme.
                      </p>
                    </div>
                    <div className="rounded-lg border px-3 py-2 text-right" style={{ borderColor: BORDER, background: PAGE_BG, boxShadow: SHADOW_SOFT }}>
                      <p className="text-[10px] uppercase tracking-wider" style={{ color: TEXT_DIM }}>Checked measures</p>
                      <p className="mt-1 text-sm font-bold font-mono" style={{ color: TEXT }}>
                        {assessmentDraft.selectedMeasureIds.length}/{checklistCount}
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <table className="w-full text-sm">
                    <thead className="sticky top-0" style={{ background: PAGE_BG }}>
                      <tr className="border-b" style={{ borderColor: BORDER }}>
                        <th className="w-16 px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: TEXT_DIM }}>Apply</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: TEXT_DIM }}>Measure</th>
                        <th className="w-20 px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: TEXT_DIM }}>X</th>
                        <th className="w-20 px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: TEXT_DIM }}>Y</th>
                      </tr>
                    </thead>
                    <tbody>
                      {checklistSections.map(({ section, items }) => (
                        <Fragment key={section}>
                          <tr className="border-b" style={{ borderColor: BORDER, background: PAGE_BG }}>
                            <td colSpan={4} className="px-4 py-2 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: TEAL }}>
                              {section}
                            </td>
                          </tr>
                          {items.map(item => {
                            const score = assessmentDraft.profile === 'logic' ? item.scores.logic : item.scores.field
                            const checked = assessmentDraft.selectedMeasureIds.includes(item.id)
                            return (
                              <tr key={item.id} className="border-b transition-colors hover:bg-black/5 dark:hover:bg-[#20262D]" style={{ borderColor: BORDER }}>
                                <td className="px-4 py-3 align-top">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => onToggleMeasure(item.id)}
                                    className="mt-0.5 h-4 w-4 rounded border accent-[#009BA4]"
                                    style={{ borderColor: BORDER, background: PAGE_BG }}
                                  />
                                </td>
                                <td className="px-4 py-3 text-xs leading-relaxed" style={{ color: TEXT }}>
                                  {item.label}
                                </td>
                                <td className="px-4 py-3 text-right text-xs font-mono" style={{ color: TEXT_DIM }}>
                                  {score ? score.x.toFixed(1) : '—'}
                                </td>
                                <td className="px-4 py-3 text-right text-xs font-mono" style={{ color: TEXT_DIM }}>
                                  {score ? score.y.toFixed(1) : '—'}
                                </td>
                              </tr>
                            )
                          })}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {assessmentResult ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'X total', value: assessmentResult.x.toFixed(1) },
                      { label: 'Y total', value: assessmentResult.y.toFixed(1) },
                      { label: 'Z', value: assessmentResult.z.toFixed(1) },
                      { label: 'Score X+Y+Z', value: assessmentResult.score.toFixed(1), tone: assessmentResult.acceptable ? semantic.success : semantic.warning },
                      { label: 'IEC S = X+Y', value: assessmentResult.s.toFixed(1) },
                      { label: 'IEC SD', value: assessmentResult.sd.toFixed(1) },
                      { label: 'Beta int', value: formatBetaPct(assessmentResult.betaInt) },
                      { label: 'BetaD int', value: formatBetaPct(assessmentResult.betaDInt) },
                    ].map(item => (
                      <div key={item.label} className="rounded-xl border px-4 py-3" style={{ borderColor: BORDER, background: SURFACE, boxShadow: SHADOW_SOFT }}>
                        <p className="text-[10px] uppercase tracking-wider" style={{ color: TEXT_DIM }}>{item.label}</p>
                        <p className="mt-1 text-lg font-bold font-mono" style={{ color: item.tone ?? TEXT }}>
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr] gap-3">
                    <div className="rounded-xl border px-4 py-3" style={{ borderColor: BORDER, background: SURFACE, boxShadow: SHADOW_SOFT }}>
                      <p className="text-[10px] uppercase tracking-wider" style={{ color: TEXT_DIM }}>Scaling</p>
                      <p className="mt-1 text-sm font-semibold" style={{ color: TEXT }}>
                        MooN {assessmentDraft.mooN_M}oo{assessmentDraft.mooN_N}
                      </p>
                      <p className="mt-1 text-xs" style={{ color: TEXT_DIM }}>
                        {assessmentResult.scaleFactor !== null
                          ? `Table D.5 factor = ${assessmentResult.scaleFactor.toFixed(2)}`
                          : 'No explicit Table D.5 factor available for this MooN combination.'}
                      </p>
                    </div>
                    <div className="rounded-xl border px-4 py-3" style={{ borderColor: BORDER, background: SURFACE, boxShadow: SHADOW_SOFT }}>
                      <p className="text-[10px] uppercase tracking-wider" style={{ color: TEXT_DIM }}>Scaled Beta</p>
                      <p className="mt-1 text-lg font-bold font-mono" style={{ color: TEXT }}>
                        {formatBetaPct(assessmentResult.beta)}
                      </p>
                    </div>
                    <div className="rounded-xl border px-4 py-3" style={{ borderColor: BORDER, background: SURFACE, boxShadow: SHADOW_SOFT }}>
                      <p className="text-[10px] uppercase tracking-wider" style={{ color: TEXT_DIM }}>Scaled BetaD</p>
                      <p className="mt-1 text-lg font-bold font-mono" style={{ color: TEXT }}>
                        {formatBetaPct(assessmentResult.betaD)}
                      </p>
                    </div>
                  </div>

                  {assessmentResult.warnings.length ? (
                    <div className="rounded-xl border px-4 py-3 text-sm leading-relaxed" style={{ borderColor: `${semantic.warning}44`, background: `${semantic.warning}12`, color: semantic.warning }}>
                      {assessmentResult.warnings.join(' ')}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border p-4" style={{ borderColor: BORDER, background: SURFACE, boxShadow: SHADOW_SOFT }}>
                  <p className="text-sm font-semibold" style={{ color: TEXT }}>Manual Override</p>
                  <p className="mt-1 text-xs" style={{ color: TEXT_DIM }}>
                    Garde la main sur les valeurs moteur tout en conservant le workspace IEC en reference.
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: TEXT_DIM }}>Vote Type</label>
                      <select
                        value={voteType}
                        onChange={e => onVoteTypeChange(e.target.value as VoteType)}
                        className="mt-1 h-9 w-full rounded-lg border px-2.5 text-sm outline-none"
                        style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT, boxShadow: SHADOW_SOFT }}
                      >
                        <option value="S">Standard (S)</option>
                        <option value="A">Availability (A)</option>
                        <option value="M">Maintenance (M)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: TEXT_DIM }}>CCF Method</label>
                      <select
                        value={method}
                        onChange={e => onMethodChange(e.target.value as CCFMethod)}
                        className="mt-1 h-9 w-full rounded-lg border px-2.5 text-sm outline-none"
                        style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT, boxShadow: SHADOW_SOFT }}
                      >
                        {METHOD_OPTIONS.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: TEXT_DIM }}>Beta [%]</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={betaPct}
                        onChange={e => onBetaPctChange(e.target.value)}
                        className="mt-1 h-9 w-full rounded-lg border px-2.5 text-sm outline-none"
                        style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT, boxShadow: SHADOW_SOFT }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: TEXT_DIM }}>BetaD [%]</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={betaDPct}
                        onChange={e => onBetaDPctChange(e.target.value)}
                        className="mt-1 h-9 w-full rounded-lg border px-2.5 text-sm outline-none"
                        style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT, boxShadow: SHADOW_SOFT }}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border p-4" style={{ borderColor: BORDER, background: SURFACE, boxShadow: SHADOW_SOFT }}>
                  <p className="text-sm font-semibold" style={{ color: TEXT }}>Quick Actions</p>
                  <p className="mt-1 text-xs" style={{ color: TEXT_DIM }}>
                    Ajustements rapides pour les hypotheses manuelles avant application au moteur.
                  </p>
                  <div className="mt-4 space-y-3">
                    <div className="rounded-lg border px-3 py-3" style={{ borderColor: BORDER, background: PAGE_BG, boxShadow: SHADOW_SOFT }}>
                      <p className="text-[10px] uppercase tracking-wider" style={{ color: TEXT_DIM }}>Preview</p>
                      <p className="mt-1 text-lg font-bold font-mono" style={{ color: TEXT }}>
                        β {betaPct || '0'}% · βD {betaDPct || '0'}%
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onBetaDPctChange((parseFloat(betaPct) / 2 || 0).toFixed(2).replace(/\.00$/, ''))}
                        className="rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-colors"
                        style={{ borderColor: `${TEAL}55`, color: TEAL, background: `${TEAL}10`, boxShadow: SHADOW_SOFT }}
                      >
                        βD = β / 2
                      </button>
                      <button
                        type="button"
                        onClick={() => onBetaDPctChange(betaPct)}
                        className="rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-colors"
                        style={{ borderColor: `${TEAL}55`, color: TEAL, background: `${TEAL}10`, boxShadow: SHADOW_SOFT }}
                      >
                        βD = β
                      </button>
                      <button
                        type="button"
                        onClick={onResetManual}
                        className="rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-colors"
                        style={{ borderColor: BORDER, color: TEXT_DIM, background: PAGE_BG, boxShadow: SHADOW_SOFT }}
                      >
                        Reset defaults
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="rounded-xl border px-4 py-5 text-sm" style={{ borderColor: BORDER, background: CARD_BG, color: TEXT_DIM }}>
            Aucun sous-systeme redondant n&apos;est disponible. Ajoute au moins deux channels sur un sous-systeme pour definir un facteur beta.
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 border-t px-5 py-3" style={{ borderColor: BORDER }}>
        <p className="text-xs" style={{ color: TEXT_DIM }}>
          {assessmentDraft.mode === 'iec61508'
            ? 'Le resultat applique beta et betaD calcules par la methode IEC active.'
            : 'Le mode manuel applique directement les valeurs beta et betaD saisies.'}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-colors"
            style={{ borderColor: BORDER, color: TEXT_DIM, background: PAGE_BG, boxShadow: SHADOW_SOFT }}
          >
            Retour
          </button>
          <button
            type="button"
            onClick={onApply}
            disabled={!canApply}
            className="rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45"
            style={{ borderColor: `${TEAL}55`, color: TEAL, background: `${TEAL}10`, boxShadow: SHADOW_SOFT }}
          >
            {assessmentDraft.mode === 'iec61508' ? 'Apply IEC result' : 'Apply manual CCF'}
          </button>
        </div>
      </div>
    </div>
  )
}
