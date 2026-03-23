/**
 * ProofTestRightPanel — PRISM v3
 *
 * Panneau droit pour l'onglet Proof Test.
 * Reçoit tout son état en PROPS depuis ProofTestTab (via useLayout + useEffect).
 * Pas de React context → pas de frontière de Provider.
 *
 * Design identique à LoopEditorRightPanel :
 *  - IntercalaireTabBar + IntercalaireCard depuis SIFWorkbenchLayout
 *  - Mêmes tokens de couleur PRISM dark
 *
 * 2 onglets :
 *  📋 Statut   — IEC 61511 · Échéance · Équipements · SIL context · CTA
 *  ⚗  En cours — Progression · Non-conformités · Verdict · Signatures · Clôturer
 */
import { useMemo } from 'react'
import {
  CheckCircle2, XCircle, AlertTriangle, FlaskConical,
  ClipboardCheck, Activity, Cpu, Zap, Plus,
} from 'lucide-react'
import {
  RightPanelSection,
  RightPanelShell,
} from '@/components/layout/RightPanelShell'
import { calcSIF, formatPFD } from '@/core/math/pfdCalc'
import type { SIF } from '@/core/types'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { getSifExploitationStrings } from '@/i18n/sifExploitation'
import { useLocaleStrings } from '@/i18n/useLocale'

// ─── Design tokens — identiques à LoopEditorRightPanel ───────────────────
// ─── Types miroirs (évite d'importer depuis ProofTestTab) ─────────────────
type PTView     = 'procedure' | 'execution' | 'history'
type Verdict    = 'pass' | 'fail' | 'conditional' | null
type StepResult = 'oui' | 'non' | 'na' | null

interface PTStepResult {
  stepId: string; result: StepResult
  measuredValue: string; conformant: boolean | null; comment: string
}
interface PTCampaign {
  id: string; date: string; team: string; verdict: Verdict; notes: string
  stepResults: PTStepResult[]; responseMeasurements: { checkId: string; measuredMs: string; comment: string }[]
  procedureSnapshot: PTProcedure | null
  pdfArtifact: { bucket: string; path: string | null; fileName: string | null; status: 'missing' | 'pending' | 'ready' | 'error'; generatedAt: string | null; error: string | null }
  closedAt: string | null
  conductedBy: string; witnessedBy: string
}
interface PTStep {
  id: string; categoryId: string; order: number
  action: string; location: string
  resultType: 'oui_non' | 'valeur' | 'personnalisé'; expectedValue: string
}
interface PTProcedure {
  id: string; ref: string; revision: string
  status: 'draft' | 'ifr' | 'approved'
  periodicityMonths: number
  categories: { id: string; type: 'preliminary' | 'test' | 'final'; title: string; order: number }[]
  steps: PTStep[]
  responseChecks: { id: string; label: string; description: string; type: 'valve_open' | 'valve_close' | 'sif_response'; expectedMs: number | null; maxAllowedMs: number | null }[]
  madeBy: string; madeByDate: string
  verifiedBy: string; verifiedByDate: string
  approvedBy: string; approvedByDate: string
  notes: string
}

// ─── Props ────────────────────────────────────────────────────────────────
export interface ProofTestRightPanelProps {
  sif: SIF
  view: PTView
  procedure: PTProcedure | null
  campaigns: PTCampaign[]
  activeCampaign: PTCampaign | null
  isOverdue: boolean
  daysOverdue: number | null
  nextDue: Date | null
  onSetView: (v: PTView) => void
  onSetActiveCampaign: (c: PTCampaign | null) => void
  onUpdateActiveCampaign: (patch: Partial<PTCampaign>) => void
  onSaveCampaign: () => void
  onNewCampaign: () => PTCampaign
}


// ─── Micro-composants ─────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  const { TEXT_DIM } = usePrismTheme()
  return (
    <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: TEXT_DIM }}>
      {children}
    </p>
  )
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  const { BORDER, TEXT, TEXT_DIM } = usePrismTheme()
  return (
    <div className="flex items-center justify-between py-1.5 border-b last:border-0"
      style={{ borderColor: BORDER }}>
      <span className="text-[10px]" style={{ color: TEXT_DIM }}>{label}</span>
      <span className="text-[10px] font-bold font-mono" style={{ color: color ?? TEXT }}>{value}</span>
    </div>
  )
}

function Ring({ pct, color, size = 60 }: { pct: number; color: string; size?: number }) {
  const { BORDER } = usePrismTheme()
  const r    = (size - 10) / 2
  const circ = 2 * Math.PI * r
  const dash = circ * Math.min(pct, 1)
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={BORDER} strokeWidth={6} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.35s ease' }} />
    </svg>
  )
}

// ─── Onglet Statut ────────────────────────────────────────────────────────
function StatusContent(props: ProofTestRightPanelProps) {
  const strings = useLocaleStrings(getSifExploitationStrings)
  const { BORDER, PAGE_BG, TEAL, TEAL_DIM, TEXT, TEXT_DIM, semantic } = usePrismTheme()
  const { sif, procedure, campaigns, isOverdue, daysOverdue, nextDue } = props
  const result = useMemo(() => calcSIF(sif), [sif.id])

  const passRate = campaigns.length
    ? Math.round(campaigns.filter(c => c.verdict === 'pass').length / campaigns.length * 100)
    : null
  const lastPass = campaigns.find(c => c.verdict === 'pass')

  const subsystems = sif.subsystems.map(sub => ({
    type:  sub.type,
    color: sub.type === 'sensor' ? '#0284C7' : sub.type === 'logic' ? '#7C3AED' : '#EA580C',
    Icon:  sub.type === 'sensor' ? Activity : sub.type === 'logic' ? Cpu : Zap,
    label: sub.type === 'sensor' ? strings.rightPanel.status.subsystemLabels.sensor : sub.type === 'logic' ? strings.rightPanel.status.subsystemLabels.logic : strings.rightPanel.status.subsystemLabels.actuator,
    tags:  sub.channels.flatMap(ch => ch.components.map(c => c.tagName)).slice(0, 3),
  }))

  const dueDateStr = nextDue
    ? nextDue.toLocaleDateString(strings.localeTag, { day: '2-digit', month: 'short', year: '2-digit' })
    : null

  return (
    <div className="p-3 space-y-4">

      {/* Conformité IEC 61511 */}
      <div>
        <SectionLabel>{strings.rightPanel.status.iecSection}</SectionLabel>
        <div className="rounded-xl border p-3" style={{ background: PAGE_BG, borderColor: isOverdue ? `${semantic.error}30` : BORDER }}>
          <div className="flex items-center gap-2 pb-2 mb-1">
            {isOverdue
              ? <AlertTriangle size={12} style={{ color: semantic.error }} />
              : nextDue
                ? <CheckCircle2 size={12} style={{ color: semantic.success }} />
                : <FlaskConical size={12} style={{ color: TEXT_DIM }} />
            }
            <span className="text-[11px] font-semibold" style={{
              color: isOverdue ? semantic.error : nextDue ? semantic.success : TEXT_DIM
            }}>
              {isOverdue
                ? strings.rightPanel.status.overdue(daysOverdue ?? 0)
                : dueDateStr
                  ? strings.rightPanel.status.next(dueDateStr)
                  : strings.rightPanel.status.noCompletedTest}
            </span>
          </div>
          <Row label={strings.rightPanel.status.periodicity}    value={procedure ? strings.rightPanel.status.periodicityValue(procedure.periodicityMonths) : '—'} color={TEAL_DIM} />
          <Row label={strings.rightPanel.status.testsCompleted} value={String(campaigns.length)} color={TEAL_DIM} />
          {passRate !== null && (
            <Row label={strings.rightPanel.status.successRate} value={`${passRate}%`}
              color={passRate >= 80 ? semantic.success : passRate >= 50 ? semantic.warning : semantic.error} />
          )}
          {lastPass && <Row label={strings.rightPanel.status.lastPass} value={lastPass.date} color={semantic.success} />}
        </div>
      </div>

      {/* Procédure */}
      {procedure && (
        <div>
          <SectionLabel>{strings.rightPanel.status.procedure}</SectionLabel>
          <div className="rounded-xl border p-3" style={{ background: PAGE_BG, borderColor: BORDER }}>
            <Row label={strings.rightPanel.status.reference} value={procedure.ref}      color={TEAL_DIM} />
            <Row label={strings.rightPanel.status.revision}  value={procedure.revision} />
            <Row label={strings.rightPanel.status.status}    value={
              procedure.status === 'draft' ? strings.rightPanel.procedureStatuses.draft :
              procedure.status === 'ifr'   ? strings.rightPanel.procedureStatuses.ifr : strings.rightPanel.procedureStatuses.approved
            } color={procedure.status === 'approved' ? semantic.success : TEXT_DIM} />
            <Row label={strings.rightPanel.status.steps}    value={String(procedure.steps.length)} />
          </div>
        </div>
      )}

      {/* Équipements */}
      <div>
        <SectionLabel>{strings.rightPanel.status.equipment}</SectionLabel>
        <div className="space-y-2">
          {subsystems.map(sub => (
            <div key={sub.type} className="rounded-lg border p-2.5" style={{ background: PAGE_BG, borderColor: BORDER }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-4 h-4 rounded flex items-center justify-center"
                  style={{ background: `${sub.color}20` }}>
                  <sub.Icon size={10} style={{ color: sub.color }} />
                </div>
                <span className="text-[10px] font-bold" style={{ color: sub.color }}>{sub.label}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {sub.tags.length > 0
                  ? sub.tags.map(tag => (
                    <span key={tag} className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                      style={{ background: `${sub.color}18`, color: sub.color, border: `1px solid ${sub.color}30` }}>
                      {tag}
                    </span>
                  ))
                  : <span className="text-[9px]" style={{ color: TEXT_DIM }}>{strings.rightPanel.common.noComponent}</span>
                }
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SIL context */}
      <div>
        <SectionLabel>{strings.rightPanel.status.silContext}</SectionLabel>
        <div className="rounded-xl border p-3" style={{ background: PAGE_BG, borderColor: BORDER }}>
          <Row label={strings.rightPanel.status.calculatedPfd} value={formatPFD(result.PFD_avg)}
            color={result.meetsTarget ? semantic.success : semantic.error} />
          <Row label={strings.rightPanel.status.targetSil}   value={`SIL ${sif.targetSIL}`}  color="#60A5FA" />
          <Row label={strings.rightPanel.status.achievedSil} value={`SIL ${result.SIL}`}
            color={result.meetsTarget ? semantic.success : semantic.error} />
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={() => { props.onSetActiveCampaign(props.onNewCampaign()); props.onSetView('execution') }}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold"
        style={{ background: `linear-gradient(135deg, ${TEAL}, #007A82)`, color: '#fff', boxShadow: `0 4px 12px ${TEAL}25` }}>
        <Plus size={13} /> {strings.rightPanel.common.newTest}
      </button>
    </div>
  )
}

// ─── Onglet En cours ──────────────────────────────────────────────────────
function CampaignContent(props: ProofTestRightPanelProps) {
  const strings = useLocaleStrings(getSifExploitationStrings)
  const { BORDER, NAVY, PAGE_BG, TEAL, TEXT, TEXT_DIM, semantic } = usePrismTheme()
  const { procedure, activeCampaign, onUpdateActiveCampaign, onSaveCampaign, onNewCampaign, onSetView, onSetActiveCampaign } = props

  if (!activeCampaign || !procedure) {
    return (
      <div className="p-3 flex flex-col items-center justify-center gap-3 py-12 text-center">
        <FlaskConical size={28} style={{ color: TEXT_DIM, opacity: 0.25 }} />
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color: TEXT_DIM }}>{strings.rightPanel.common.noActiveTest}</p>
          <p className="text-[10px]" style={{ color: TEXT_DIM }}>{strings.rightPanel.common.startFromExecution}</p>
        </div>
        <button
          onClick={() => { onSetActiveCampaign(onNewCampaign()); onSetView('execution') }}
          className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold mt-1"
          style={{ background: `linear-gradient(135deg, ${TEAL}, #007A82)`, color: '#fff' }}>
          <Plus size={12} /> {strings.rightPanel.common.newTest}
        </button>
      </div>
    )
  }

  const total     = activeCampaign.stepResults.length
  const filled    = activeCampaign.stepResults.filter(r => r.result !== null).length
  const fails     = activeCampaign.stepResults.filter(r => r.result === 'non' || r.conformant === false)
  const pct       = total > 0 ? filled / total : 0
  const ringColor = fails.length > 0 ? '#EF4444' : pct >= 1 ? '#4ADE80' : TEAL
  const readOnly = Boolean(activeCampaign.closedAt)

  const nonConform = fails.map(r => {
    const step = procedure.steps.find(s => s.id === r.stepId)
    return step ? { action: step.action, expected: step.expectedValue, measured: r.measuredValue } : null
  }).filter(Boolean) as { action: string; expected: string; measured: string }[]

  return (
    <div className="p-3 space-y-4">

      {/* Progression */}
      <div>
        <SectionLabel>{strings.rightPanel.campaign.progress}</SectionLabel>
        <div className="rounded-xl border p-3 flex items-center gap-3"
          style={{ background: PAGE_BG, borderColor: BORDER }}>
          <div className="relative shrink-0">
            <Ring pct={pct} color={ringColor} size={60} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold font-mono" style={{ color: ringColor }}>
                {Math.round(pct * 100)}%
              </span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold" style={{ color: TEXT }}>{strings.rightPanel.campaign.stepsDone(filled, total)}</p>
            {fails.length > 0
              ? <p className="text-[10px] mt-0.5" style={{ color: semantic.error }}>
                  {strings.rightPanel.campaign.nonConformities(fails.length)}
                </p>
              : pct >= 1
                ? <p className="text-[10px] mt-0.5" style={{ color: semantic.success }}>{strings.rightPanel.campaign.allOk}</p>
                : <p className="text-[10px] mt-0.5" style={{ color: TEXT_DIM }}>{strings.rightPanel.campaign.inProgress}</p>
            }
          </div>
        </div>
      </div>

      {/* Non-conformités */}
      {nonConform.length > 0 && (
        <div>
          <SectionLabel>{strings.rightPanel.campaign.nonConformitiesTitle(nonConform.length)}</SectionLabel>
          <div className="space-y-1.5">
            {nonConform.map((nc, i) => (
              <div key={i} className="rounded-lg border px-2.5 py-2"
                style={{ background: `${semantic.error}08`, borderColor: `${semantic.error}22` }}>
                <div className="flex items-start gap-1.5">
                  <XCircle size={10} className="shrink-0 mt-0.5" style={{ color: semantic.error }} />
                  <p className="text-[10px] leading-relaxed" style={{ color: TEXT }}>
                    {nc.action || strings.rightPanel.campaign.stepWithoutLabel}
                  </p>
                </div>
                {nc.measured && (
                  <p className="text-[9px] font-mono mt-1 pl-4" style={{ color: semantic.error }}>
                    {strings.rightPanel.campaign.measuredExpected(nc.measured, nc.expected)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verdict */}
      <div>
        <SectionLabel>{strings.rightPanel.campaign.verdict}</SectionLabel>
        <div className="grid grid-cols-3 gap-1.5">
          {([
            { v: 'pass'        as Verdict, label: strings.rightPanel.verdicts.pass, color: '#16A34A' },
            { v: 'conditional' as Verdict, label: strings.rightPanel.verdicts.conditional, color: '#D97706' },
            { v: 'fail'        as Verdict, label: strings.rightPanel.verdicts.fail, color: '#DC2626' },
          ]).map(({ v, label, color }) => (
            <button key={label} type="button"
              disabled={readOnly}
              onClick={() => onUpdateActiveCampaign({ verdict: v })}
              className="rounded-lg border py-1.5 text-[10px] font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={activeCampaign.verdict === v
                ? { background: color, color: '#fff', borderColor: color }
                : { background: PAGE_BG, color: TEXT_DIM, borderColor: BORDER }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Signatures rapides */}
      <div>
        <SectionLabel>{strings.rightPanel.campaign.signatures}</SectionLabel>
        <div className="space-y-2">
          {([
            { k: 'conductedBy' as const, label: strings.rightPanel.campaign.conductedBy },
            { k: 'witnessedBy'  as const, label: strings.rightPanel.campaign.witnessedBy },
          ]).map(({ k, label }) => (
            <div key={k}>
              <p className="text-[9px] font-semibold mb-1" style={{ color: TEXT_DIM }}>{label}</p>
              <input
                value={activeCampaign[k] ?? ''}
                disabled={readOnly}
                onChange={e => onUpdateActiveCampaign({ [k]: e.target.value })}
                placeholder={strings.rightPanel.campaign.namePlaceholder}
                className="w-full rounded-lg border px-2.5 py-1.5 text-xs outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: PAGE_BG, borderColor: BORDER, color: TEXT }}
                onFocus={e => { e.currentTarget.style.borderColor = TEAL }}
                onBlur={e =>  { e.currentTarget.style.borderColor = BORDER }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Clôturer */}
      <button
        onClick={onSaveCampaign}
        disabled={!activeCampaign.verdict || readOnly}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: `linear-gradient(135deg, ${NAVY}, #002A42)`, color: '#fff',
          boxShadow: `0 4px 12px ${NAVY}35` }}>
        <ClipboardCheck size={13} /> {readOnly ? strings.rightPanel.campaign.frozenCampaign : strings.rightPanel.campaign.closeTest}
      </button>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────
export function ProofTestRightPanel(props: ProofTestRightPanelProps) {
  const strings = useLocaleStrings(getSifExploitationStrings)
  const { PANEL_BG } = usePrismTheme()

  return (
    <RightPanelShell contentBg={PANEL_BG}>
      <RightPanelSection id="status" label={strings.rightPanel.tabs.status} Icon={ClipboardCheck}>
        <StatusContent {...props} />
      </RightPanelSection>
      <RightPanelSection id="campaign" label={strings.rightPanel.tabs.campaign} Icon={FlaskConical}>
        <CampaignContent {...props} />
      </RightPanelSection>
    </RightPanelShell>
  )
}
