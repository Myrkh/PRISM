/**
 * prooftest/CampaignExecutionView.tsx — PRISM
 *
 * Active campaign execution: meta form, step-by-step results table,
 * and campaign signatures.
 */
import { Plus, FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { getSifExploitationStrings } from '@/i18n/sifExploitation'
import { useLocaleStrings } from '@/i18n/useLocale'
import { ResultInput, ExpectedValueDisplay } from './ResultWidgets'
import { ResponseMeasurementsCard } from './ResponseMeasurementsCard'
import type {
  PTStep, PTStepResult, PTCategory, PTCampaign, Verdict, PTResponseCheck, PTResponseMeasurement,
} from './proofTestTypes'
import { CAT_META, inputCls } from './proofTestTypes'
import { getProofTestCategoryTitle, getProofTestLocationLabel } from './proofTestI18n'

const TABLE_HOVER = 'rgba(0, 155, 164, 0.04)'

interface Props {
  activeCampaign: PTCampaign | null
  setActiveCampaign: React.Dispatch<React.SetStateAction<PTCampaign | null>>
  catsSorted: PTCategory[]
  stepsFor: (catId: string) => PTStep[]
  responseChecks: PTResponseCheck[]
  updateStepResult: (stepId: string, patch: Partial<PTStepResult>) => void
  updateResponseMeasurement: (checkId: string, patch: Partial<PTResponseMeasurement>) => void
  onNewCampaign: () => void
}

export function CampaignExecutionView({
  activeCampaign, setActiveCampaign,
  catsSorted, stepsFor, responseChecks, updateStepResult, updateResponseMeasurement,
  onNewCampaign,
}: Props) {
  const strings = useLocaleStrings(getSifExploitationStrings)
  const { BORDER, CARD_BG, PAGE_BG, TEAL, TEXT, TEXT_DIM } = usePrismTheme()

  if (!activeCampaign) {
    return (
      <div className="rounded-2xl border shadow-sm p-16 flex flex-col items-center justify-center gap-3 text-center"
        style={{ background: CARD_BG, borderColor: BORDER }}>
        <FlaskConical size={32} style={{ color: TEAL, opacity: 0.4 }} />
        <p className="font-semibold text-sm" style={{ color: TEXT }}>{strings.execution.empty.title}</p>
        <p className="text-xs" style={{ color: TEXT_DIM }}>{strings.execution.empty.description}</p>
        <button onClick={onNewCampaign}
          className="mt-2 h-9 px-4 text-sm font-semibold text-white rounded-xl flex items-center gap-2"
          style={{ background: TEAL }}
        ><Plus size={14} />{strings.execution.empty.action}</button>
      </div>
    )
  }

  const readOnly = Boolean(activeCampaign.closedAt)
  const verdictButtons: Array<{ value: Verdict; label: string; bg: string }> = [
    { value: 'pass', label: strings.execution.verdicts.pass, bg: '#16A34A' },
    { value: 'conditional', label: strings.execution.verdicts.conditional, bg: '#D97706' },
    { value: 'fail', label: strings.execution.verdicts.fail, bg: '#DC2626' },
  ]

  return (
    <div className="space-y-3">
      {readOnly && (
        <div className="rounded-2xl border px-4 py-3 text-xs"
          style={{ background: `${TEAL}10`, borderColor: `${TEAL}26`, color: TEAL }}>
          {strings.execution.lockedBanner}
        </div>
      )}

      <div className="rounded-2xl border shadow-sm p-5" style={{ background: CARD_BG, borderColor: BORDER }}>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: TEXT_DIM }}>{strings.execution.meta.testDate}</p>
            <input type="date" value={activeCampaign.date}
              disabled={readOnly}
              onChange={e => setActiveCampaign(p => p && ({ ...p, date: e.target.value }))}
              className={cn(inputCls, 'w-full disabled:opacity-60 disabled:cursor-not-allowed')} />
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: TEXT_DIM }}>{strings.execution.meta.teamReference}</p>
            <input value={activeCampaign.team} placeholder={strings.execution.meta.teamPlaceholder}
              disabled={readOnly}
              onChange={e => setActiveCampaign(p => p && ({ ...p, team: e.target.value }))}
              className={cn(inputCls, 'w-full disabled:opacity-60 disabled:cursor-not-allowed')} />
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: TEXT_DIM }}>{strings.execution.meta.verdict}</p>
            <div className="flex items-center gap-1 mt-1">
              {verdictButtons.map(({ value, label, bg }) => (
                <button key={value ?? 'none'}
                  disabled={readOnly}
                  onClick={() => setActiveCampaign(p => p && ({ ...p, verdict: value }))}
                  className="text-[9px] font-bold px-2 py-1 rounded border transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  style={activeCampaign.verdict === value
                    ? { background: bg, color: 'white', borderColor: bg }
                    : { background: PAGE_BG, color: TEXT_DIM, borderColor: BORDER }
                  }
                >{label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {catsSorted.map(cat => {
        const meta = CAT_META[cat.type]
        const steps = stepsFor(cat.id)
        if (steps.length === 0) return null

        return (
          <div key={cat.id} className="rounded-2xl border shadow-sm overflow-hidden" style={{ background: CARD_BG, borderColor: BORDER }}>
            <div className="flex items-center gap-3 px-5 py-3 border-b"
              style={{ background: PAGE_BG, borderColor: BORDER }}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
              <span className="text-sm font-bold" style={{ color: meta.color }}>{getProofTestCategoryTitle(strings, cat)}</span>
              <span className="text-[10px]" style={{ color: TEXT_DIM }}>{strings.meta.stepCount(steps.length)}</span>
            </div>

            <table className="w-full text-xs">
              <thead>
                <tr className="border-b" style={{ borderColor: BORDER, background: PAGE_BG }}>
                  <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest w-8" style={{ color: TEXT_DIM }}>#</th>
                  <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>{strings.execution.tableHeaders.action}</th>
                  <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest w-32" style={{ color: TEXT_DIM }}>{strings.execution.tableHeaders.location}</th>
                  <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest w-40" style={{ color: TEXT_DIM }}>{strings.execution.tableHeaders.expected}</th>
                  <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest w-44" style={{ color: TEXT_DIM }}>{strings.execution.tableHeaders.result}</th>
                  <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest w-28" style={{ color: TEXT_DIM }}>{strings.execution.tableHeaders.comment}</th>
                </tr>
              </thead>
              <tbody>
                {steps.map((step, si) => {
                  const sr = activeCampaign.stepResults.find(r => r.stepId === step.id)
                  return (
                    <tr key={step.id}
                      className="border-b transition-colors"
                      style={{ borderColor: BORDER }}
                      onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = TABLE_HOVER }}
                      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
                    >
                      <td className="px-4 py-3 font-mono font-bold text-[10px]" style={{ color: TEXT_DIM }}>{si + 1}</td>
                      <td className="px-4 py-3" style={{ color: TEXT }}>{step.action}</td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: `${TEAL}15`, color: TEAL }}
                        >{getProofTestLocationLabel(strings, step.location)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <ExpectedValueDisplay step={step} />
                      </td>
                      <td className="px-4 py-3">
                        <ResultInput step={step} result={sr} disabled={readOnly} onChange={patch => updateStepResult(step.id, patch)} />
                      </td>
                      <td className="px-4 py-3">
                        <input value={sr?.comment ?? ''}
                          disabled={readOnly}
                          onChange={e => updateStepResult(step.id, { comment: e.target.value })}
                          placeholder={strings.execution.placeholders.comment}
                          className="w-full bg-transparent text-[10px] outline-none border-b border-transparent focus:border-[#009BA4] py-0.5 placeholder:text-[#667085] dark:placeholder:text-[#8FA0B1] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                          style={{ color: TEXT }}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}

      <ResponseMeasurementsCard
        activeCampaign={activeCampaign}
        responseChecks={responseChecks}
        readOnly={readOnly}
        updateResponseMeasurement={updateResponseMeasurement}
      />

      <div className="rounded-2xl border shadow-sm p-5" style={{ background: CARD_BG, borderColor: BORDER }}>
        <div className="grid grid-cols-2 gap-4">
          {[
            { key: 'conductedBy' as const, label: strings.execution.signatures.conductedBy },
            { key: 'witnessedBy' as const, label: strings.execution.signatures.witnessedBy },
          ].map(({ key, label }) => (
            <div key={key}>
              <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: TEXT_DIM }}>{label}</p>
              <input value={activeCampaign[key]} placeholder={strings.execution.placeholders.fullName}
                disabled={readOnly}
                onChange={e => setActiveCampaign(p => p && ({ ...p, [key]: e.target.value }))}
                className={cn(inputCls, 'w-full disabled:opacity-60 disabled:cursor-not-allowed')} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
