import { BarChart3, ShieldCheck, SlidersHorizontal } from 'lucide-react'
import type { BetaAssessmentResult } from '@/core/math/betaFactor'
import type { BetaAssessmentConfig, CCFMethod, SIFSubsystem, VoteType } from '@/core/types'
import { InspectorBlock, InspectorSurface, RightPanelBody } from '@/components/layout/RightPanelShell'
import { usePrismTheme } from '@/styles/usePrismTheme'

function formatBetaPct(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return `${(value * 100).toFixed(1)}%`
}

interface Props {
  redundantSubsystems: SIFSubsystem[]
  selectedSubsystem: SIFSubsystem | null
  selectedSubsystemId: string | null
  onSelectSubsystem: (id: string) => void
  profileLabel: string
  mode: BetaAssessmentConfig['mode']
  onModeChange: (mode: BetaAssessmentConfig['mode']) => void
  result: BetaAssessmentResult | null
  voteType: VoteType
  method: CCFMethod
  previewBeta: number | null
  previewBetaD: number | null
}

export function CCFBetaRightPanel({
  redundantSubsystems,
  selectedSubsystem,
  selectedSubsystemId,
  onSelectSubsystem,
  profileLabel,
  mode,
  onModeChange,
  result,
  voteType,
  method,
  previewBeta,
  previewBetaD,
}: Props) {
  const { BORDER, CARD_BG, PAGE_BG, PANEL_BG, SHADOW_SOFT, SURFACE, TEAL, TEXT, TEXT_DIM, semantic } = usePrismTheme()
  return (
    <div
      className="flex h-full flex-col overflow-hidden"
      style={{ background: PANEL_BG }}
    >
      <div className="border-b px-3 pb-3 pt-3" style={{ borderColor: BORDER }}>
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg border"
            style={{ borderColor: `${TEAL}35`, background: `${TEAL}12`, color: TEAL }}
          >
            <ShieldCheck size={14} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: TEXT_DIM }}>
              Architecture
            </p>
            <p className="text-sm font-semibold" style={{ color: TEXT }}>
              CCF / Beta
            </p>
          </div>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
          Configure l&apos;evaluation IEC 61508 ou un override manuel pour le sous-systeme redondant actif.
        </p>
      </div>

      <RightPanelBody compact className="space-y-3">
        {selectedSubsystem ? (
          <>
            <InspectorBlock title="Subsystem">
              <select
                value={selectedSubsystemId ?? ''}
                onChange={e => onSelectSubsystem(e.target.value)}
                className="prism-field mt-2 h-10 w-full rounded-lg border px-2.5 text-sm outline-none"
                style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT, boxShadow: SHADOW_SOFT }}
              >
                {redundantSubsystems.map(subsystem => (
                  <option key={subsystem.id} value={subsystem.id}>
                    {subsystem.label}
                  </option>
                ))}
              </select>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  { label: 'Architecture', value: selectedSubsystem.architecture },
                  { label: 'Channels', value: String(selectedSubsystem.channels.length) },
                  { label: 'Profile', value: profileLabel },
                  { label: 'Vote', value: voteType },
                ].map(item => (
                  <InspectorSurface key={item.label} className="rounded-lg px-2.5 py-2" background={SURFACE} borderColor={BORDER}>
                    <p className="text-[9px] uppercase tracking-wider" style={{ color: TEXT_DIM }}>{item.label}</p>
                    <p className="mt-1 text-[11px] font-bold font-mono" style={{ color: TEXT }}>{item.value}</p>
                  </InspectorSurface>
                ))}
              </div>
            </InspectorBlock>

            <InspectorBlock title="Workspace">
              <div className="mb-3 flex items-center gap-2">
                <SlidersHorizontal size={12} style={{ color: TEAL }} />
              </div>
              <div className="mt-3 space-y-2">
                {[
                  { id: 'iec61508', label: 'IEC 61508 Assessment', hint: 'Checklist + scaling automatique' },
                  { id: 'manual', label: 'Manual Override', hint: 'Saisie directe de beta / betaD' },
                ].map(option => {
                  const active = mode === option.id
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => onModeChange(option.id as BetaAssessmentConfig['mode'])}
                        className="prism-action w-full rounded-lg border px-3 py-2 text-left"
                        style={{
                          borderColor: active ? `${TEAL}80` : BORDER,
                          background: active ? `${TEAL}10` : SURFACE,
                        boxShadow: SHADOW_SOFT,
                      }}
                    >
                      <p className="text-sm font-semibold" style={{ color: active ? TEXT : TEXT_DIM }}>{option.label}</p>
                      <p className="mt-1 text-[11px]" style={{ color: TEXT_DIM }}>{option.hint}</p>
                    </button>
                  )
                })}
              </div>
            </InspectorBlock>

            <InspectorBlock title="Snapshot">
              <div className="mb-3 flex items-center gap-2">
                <BarChart3 size={12} style={{ color: TEAL }} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  { label: 'Method', value: method },
                  { label: 'Score', value: result ? result.score.toFixed(1) : '—' },
                  { label: 'Beta', value: formatBetaPct(previewBeta) },
                  { label: 'BetaD', value: formatBetaPct(previewBetaD) },
                ].map(item => (
                  <InspectorSurface key={item.label} className="rounded-lg px-2.5 py-2" background={SURFACE} borderColor={BORDER}>
                    <p className="text-[9px] uppercase tracking-wider" style={{ color: TEXT_DIM }}>{item.label}</p>
                    <p className="mt-1 text-[11px] font-bold font-mono" style={{ color: TEXT }}>{item.value}</p>
                  </InspectorSurface>
                ))}
              </div>
              {result?.warnings.length ? (
                <div
                  className="mt-3 rounded-lg border px-3 py-2 text-[11px] leading-relaxed"
                  style={{ borderColor: `${semantic.warning}44`, background: `${semantic.warning}12`, color: semantic.warning }}
                >
                  {result.warnings[0]}
                </div>
              ) : null}
            </InspectorBlock>
          </>
        ) : (
          <div className="rounded-xl border px-3 py-4 text-sm" style={{ borderColor: BORDER, background: CARD_BG, color: TEXT_DIM, boxShadow: SHADOW_SOFT }}>
            Aucun sous-systeme redondant n&apos;est disponible pour l&apos;evaluation CCF.
          </div>
        )}
      </RightPanelBody>
    </div>
  )
}
