/**
 * prooftest/CampaignExecutionView.tsx — PRISM
 *
 * Active campaign execution: meta form, step-by-step results table,
 * and campaign signatures.
 */
import { Plus, FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BORDER, SURFACE, TEAL, TEXT, TEXT_DIM } from '@/styles/tokens'
import { ResultInput, ExpectedValueDisplay } from './ResultWidgets'
import { ResponseMeasurementsCard } from './ResponseMeasurementsCard'
import type {
  PTStep, PTStepResult, PTCategory, PTCampaign, Verdict, PTResponseCheck, PTResponseMeasurement,
} from './proofTestTypes'
import { CAT_META, inputCls } from './proofTestTypes'

const TABLE_BG      = '#14181C'
const TABLE_HEAD_BG = SURFACE
const TABLE_HOVER   = 'rgba(0, 155, 164, 0.04)'
const BORDER_VIS    = '#363F49'

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
  if (!activeCampaign) {
    return (
      <div className="rounded-2xl border shadow-sm p-16 flex flex-col items-center justify-center gap-3 text-center"
        style={{ background: SURFACE, borderColor: BORDER_VIS }}>
        <FlaskConical size={32} style={{ color: TEAL, opacity: 0.4 }} />
        <p className="font-semibold text-sm" style={{ color: TEXT }}>Aucun test en cours</p>
        <p className="text-xs" style={{ color: TEXT_DIM }}>Cliquez sur <strong>Nouveau test</strong> pour démarrer une campagne d'essai</p>
        <button onClick={onNewCampaign}
          className="mt-2 h-9 px-4 text-sm font-semibold text-white rounded-xl flex items-center gap-2"
          style={{ background: TEAL }}
        ><Plus size={14} />Nouveau test</button>
      </div>
    )
  }

  const readOnly = Boolean(activeCampaign.closedAt)

  return (
    <div className="space-y-3">
      {readOnly && (
        <div className="rounded-2xl border px-4 py-3 text-xs"
          style={{ background: '#0F1B3D', borderColor: '#1D4ED830', color: '#BFDBFE' }}>
          Cette campagne est cloturee et figee. Elle reste consultable, mais n est plus editable.
        </div>
      )}

      {/* Campaign meta */}
      <div className="rounded-2xl border shadow-sm p-5" style={{ background: SURFACE, borderColor: BORDER_VIS }}>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: TEXT_DIM }}>Date du test</p>
            <input type="date" value={activeCampaign.date}
              disabled={readOnly}
              onChange={e => setActiveCampaign(p => p && ({ ...p, date: e.target.value }))}
              className={cn(inputCls, 'w-full disabled:opacity-60 disabled:cursor-not-allowed')} />
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: TEXT_DIM }}>Équipe / Référence</p>
            <input value={activeCampaign.team} placeholder="ex: EQ-01 / Maintenance"
              disabled={readOnly}
              onChange={e => setActiveCampaign(p => p && ({ ...p, team: e.target.value }))}
              className={cn(inputCls, 'w-full disabled:opacity-60 disabled:cursor-not-allowed')} />
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: TEXT_DIM }}>Verdict</p>
            <div className="flex items-center gap-1 mt-1">
              {([
                { v: 'pass' as Verdict,        label: 'PASS',        bg: '#16A34A' },
                { v: 'conditional' as Verdict,  label: 'CONDITIONNEL', bg: '#D97706' },
                { v: 'fail' as Verdict,         label: 'FAIL',        bg: '#DC2626' },
              ]).map(({ v, label, bg }) => (
                <button key={v}
                  disabled={readOnly}
                  onClick={() => setActiveCampaign(p => p && ({ ...p, verdict: v }))}
                  className="text-[9px] font-bold px-2 py-1 rounded border transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  style={activeCampaign.verdict === v
                    ? { background: bg, color: 'white', borderColor: bg }
                    : { background: TABLE_BG, color: TEXT_DIM, borderColor: BORDER_VIS }
                  }
                >{label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Steps execution */}
      {catsSorted.map(cat => {
        const meta  = CAT_META[cat.type]
        const steps = stepsFor(cat.id)
        if (steps.length === 0) return null

        return (
          <div key={cat.id} className="rounded-2xl border shadow-sm overflow-hidden" style={{ background: TABLE_BG, borderColor: BORDER_VIS }}>
            <div className="flex items-center gap-3 px-5 py-3 border-b"
              style={{ background: TABLE_HEAD_BG, borderColor: BORDER }}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
              <span className="text-sm font-bold" style={{ color: meta.color }}>{cat.title}</span>
              <span className="text-[10px]" style={{ color: TEXT_DIM }}>{steps.length} étape{steps.length !== 1 ? 's' : ''}</span>
            </div>

            <table className="w-full text-xs">
              <thead>
                <tr className="border-b" style={{ borderColor: BORDER, background: TABLE_HEAD_BG }}>
                  <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest w-8" style={{ color: TEXT_DIM }}>#</th>
                  <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Action</th>
                  <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest w-32" style={{ color: TEXT_DIM }}>Lieu</th>
                  <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest w-40" style={{ color: TEXT_DIM }}>Attendu</th>
                  <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest w-44" style={{ color: TEXT_DIM }}>Résultat</th>
                  <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest w-28" style={{ color: TEXT_DIM }}>Commentaire</th>
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
                        >{step.location}</span>
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
                          placeholder="Remarque…"
                          className="w-full bg-transparent text-[10px] outline-none border-b border-transparent focus:border-[#009BA4] py-0.5 placeholder:text-[#8FA0B1] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
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

      {/* Campaign signatures */}
      <div className="rounded-2xl border shadow-sm p-5" style={{ background: SURFACE, borderColor: BORDER_VIS }}>
        <div className="grid grid-cols-2 gap-4">
          {[
            { k: 'conductedBy' as const, label: 'Réalisé par' },
            { k: 'witnessedBy'  as const, label: 'Témoin'      },
          ].map(({ k, label }) => (
            <div key={k}>
              <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: TEXT_DIM }}>{label}</p>
              <input value={activeCampaign[k]} placeholder="Nom Prénom"
                disabled={readOnly}
                onChange={e => setActiveCampaign(p => p && ({ ...p, [k]: e.target.value }))}
                className={cn(inputCls, 'w-full disabled:opacity-60 disabled:cursor-not-allowed')} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
