/**
 * prooftest/ResultWidgets.tsx — PRISM
 *
 * Shared widgets for proof test result display and input.
 * Used by ProcedureView (display) and CampaignExecutionView (input).
 */
import { CheckCircle2, XCircle, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { semantic } from '@/styles/tokens'
import { usePrismTheme } from '@/styles/usePrismTheme'
import type { PTStep, PTStepResult, StepResultValue } from './proofTestTypes'
import { checkConformance } from './proofTestTypes'

// ─── Result badge (read-only display) ────────────────────────────────────
export function ResultBadge({ r }: { r: StepResultValue }) {
  const { BORDER, PAGE_BG, TEXT_DIM } = usePrismTheme()
  if (r === 'oui') return <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border" style={{ color: semantic.success, background: `${semantic.success}12`, borderColor: `${semantic.success}30` }}><CheckCircle2 size={9} />OUI</span>
  if (r === 'non') return <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border" style={{ color: semantic.error, background: `${semantic.error}10`, borderColor: `${semantic.error}28` }}><XCircle size={9} />NON</span>
  if (r === 'na')  return <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border" style={{ color: TEXT_DIM, background: PAGE_BG, borderColor: BORDER }}><Minus size={9} />N/A</span>
  return <span className="text-[10px]" style={{ color: TEXT_DIM }}>—</span>
}

// ─── Result input (campaign execution) ───────────────────────────────────
export function ResultInput({ step, result, disabled = false, onChange }: {
  step: PTStep
  result: PTStepResult | undefined
  disabled?: boolean
  onChange: (r: Partial<PTStepResult>) => void
}) {
  const { BORDER, PAGE_BG, TEXT, TEXT_DIM } = usePrismTheme()
  const r = result?.result ?? null
  const val = result?.measuredValue ?? ''

  if (step.resultType === 'oui_non') {
    return (
      <div className="flex items-center gap-1">
        {(['oui', 'non', 'na'] as StepResultValue[]).map(v => (
          <button key={v as string}
            disabled={disabled}
            onClick={() => onChange({ result: r === v ? null : v })}
            className={cn(
              'text-[9px] font-bold px-2 py-0.5 rounded border transition-all disabled:opacity-50 disabled:cursor-not-allowed',
              r === v && v === 'oui' ? 'bg-emerald-500 text-white border-emerald-500' :
              r === v && v === 'non' ? 'bg-red-500 text-white border-red-500' :
              r === v && v === 'na'  ? 'bg-gray-400 text-white border-gray-400' :
              '',
            )}
            style={!(r === v) ? { background: PAGE_BG, color: TEXT_DIM, borderColor: BORDER } : undefined}
          >{(v as string).toUpperCase()}</button>
        ))}
      </div>
    )
  }

  if (step.resultType === 'valeur') {
    const conformant = val !== '' && step.expectedValue !== ''
      ? checkConformance(val, step.expectedValue)
      : null
    return (
      <div className="flex items-center gap-1.5">
        <input
          disabled={disabled}
          value={val}
          onChange={e => onChange({ measuredValue: e.target.value, conformant: null })}
          placeholder="Valeur mesurée…"
          className={cn(
            'w-28 text-xs h-7 px-2 rounded-lg border focus:outline-none focus:ring-1 transition-all disabled:opacity-60 disabled:cursor-not-allowed',
            conformant === true  ? 'border-emerald-400 focus:ring-emerald-400/30' :
            conformant === false ? 'border-red-400 focus:ring-red-400/30' :
            'focus:ring-[#009BA4]/30 focus:border-[#009BA4]',
          )}
          style={{ background: PAGE_BG, color: TEXT, borderColor: conformant === null ? BORDER : undefined }}
        />
        {conformant === true  && <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />}
        {conformant === false && <XCircle size={13} className="text-red-500 shrink-0" />}
      </div>
    )
  }

  // personnalisé
  return (
    <input
      disabled={disabled}
      value={val}
      onChange={e => onChange({ measuredValue: e.target.value })}
      placeholder="Résultat…"
      className="w-36 text-xs h-7 px-2 rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#009BA4]/30 focus:border-[#009BA4] disabled:opacity-60 disabled:cursor-not-allowed"
      style={{ background: PAGE_BG, color: TEXT, borderColor: BORDER }}
    />
  )
}

// ─── Expected value display (shared by both procedure and execution) ─────
export function ExpectedValueDisplay({ step }: { step: PTStep }) {
  const { TEXT, TEXT_DIM } = usePrismTheme()
  if (step.resultType === 'oui_non') {
    return (
      <span className="flex items-center gap-1">
        <span className="text-[9px] font-bold px-1 rounded border" style={{ color: semantic.success, background: `${semantic.success}12`, borderColor: `${semantic.success}30` }}>OUI</span>
        <span className="text-[9px]" style={{ color: TEXT_DIM }}>ou</span>
        <span className="text-[9px] font-bold px-1 rounded border" style={{ color: semantic.error, background: `${semantic.error}10`, borderColor: `${semantic.error}28` }}>NON</span>
      </span>
    )
  }
  return (
    <span className="font-mono text-[11px] font-semibold" style={{ color: TEXT }}>
      {step.expectedValue || <span style={{ color: TEXT_DIM }}>—</span>}
    </span>
  )
}
