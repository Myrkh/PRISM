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
import { useState, useMemo } from 'react'
import {
  CheckCircle2, XCircle, AlertTriangle, FlaskConical,
  ClipboardCheck, Activity, Cpu, Zap, Plus,
} from 'lucide-react'
import {
  IntercalaireTabBar,
  IntercalaireCard,
} from '@/components/layout/SIFWorkbenchLayout'
import { calcSIF, formatPFD } from '@/core/math/pfdCalc'
import type { SIF } from '@/core/types'

// ─── Design tokens — identiques à LoopEditorRightPanel ───────────────────
const PANEL    = '#14181C'
const CARD     = '#23292F'
const BG       = '#1A1F24'
const BORDER   = '#2A3138'
const TEXT     = '#DFE8F1'
const TEXT_DIM = '#8FA0B1'
const TEAL     = '#009BA4'
const TEAL_DIM = '#5FD8D2'
const R        = 8

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
  stepResults: PTStepResult[]; conductedBy: string; witnessedBy: string
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
  madeBy: string; verifiedBy: string; approvedBy: string; notes: string
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

// ─── Onglets intercalaires ────────────────────────────────────────────────
const PANEL_TABS = [
  { id: 'status'   as const, label: 'Statut',   Icon: ClipboardCheck },
  { id: 'campaign' as const, label: 'En cours', Icon: FlaskConical },
] as const
type PanelTab = typeof PANEL_TABS[number]['id']

// ─── Micro-composants ─────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: TEXT_DIM }}>
      {children}
    </p>
  )
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b last:border-0"
      style={{ borderColor: BORDER }}>
      <span className="text-[10px]" style={{ color: TEXT_DIM }}>{label}</span>
      <span className="text-[10px] font-bold font-mono" style={{ color: color ?? TEXT }}>{value}</span>
    </div>
  )
}

function Ring({ pct, color, size = 60 }: { pct: number; color: string; size?: number }) {
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
    label: sub.type === 'sensor' ? 'Capteurs' : sub.type === 'logic' ? 'Logique' : 'Actionneurs',
    tags:  sub.channels.flatMap(ch => ch.components.map(c => c.tagName)).slice(0, 3),
  }))

  const dueDateStr = nextDue
    ? nextDue.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })
    : null

  return (
    <div className="p-3 space-y-4">

      {/* Conformité IEC 61511 */}
      <div>
        <SectionLabel>Conformité IEC 61511</SectionLabel>
        <div className="rounded-xl border p-3" style={{ background: BG, borderColor: isOverdue ? '#EF444440' : BORDER }}>
          <div className="flex items-center gap-2 pb-2 mb-1">
            {isOverdue
              ? <AlertTriangle size={12} style={{ color: '#EF4444' }} />
              : nextDue
                ? <CheckCircle2 size={12} style={{ color: '#16A34A' }} />
                : <FlaskConical size={12} style={{ color: TEXT_DIM }} />
            }
            <span className="text-[11px] font-semibold" style={{
              color: isOverdue ? '#EF4444' : nextDue ? '#16A34A' : TEXT_DIM
            }}>
              {isOverdue
                ? `Retard · J+${daysOverdue}`
                : dueDateStr
                  ? `Prochain : ${dueDateStr}`
                  : 'Aucun test réalisé'}
            </span>
          </div>
          <Row label="Périodicité"    value={procedure ? `${procedure.periodicityMonths} mois` : '—'} color={TEAL_DIM} />
          <Row label="Tests réalisés" value={String(campaigns.length)} color={TEAL_DIM} />
          {passRate !== null && (
            <Row label="Taux réussite" value={`${passRate}%`}
              color={passRate >= 80 ? '#4ADE80' : passRate >= 50 ? '#F59E0B' : '#F87171'} />
          )}
          {lastPass && <Row label="Dernier PASS" value={lastPass.date} color="#4ADE80" />}
        </div>
      </div>

      {/* Procédure */}
      {procedure && (
        <div>
          <SectionLabel>Procédure</SectionLabel>
          <div className="rounded-xl border p-3" style={{ background: BG, borderColor: BORDER }}>
            <Row label="Référence" value={procedure.ref}      color={TEAL_DIM} />
            <Row label="Révision"  value={procedure.revision} />
            <Row label="Statut"    value={
              procedure.status === 'draft' ? 'Brouillon' :
              procedure.status === 'ifr'   ? 'IFR' : 'Approuvé'
            } color={procedure.status === 'approved' ? '#4ADE80' : TEXT_DIM} />
            <Row label="Étapes"    value={String(procedure.steps.length)} />
          </div>
        </div>
      )}

      {/* Équipements */}
      <div>
        <SectionLabel>Équipements à tester</SectionLabel>
        <div className="space-y-2">
          {subsystems.map(sub => (
            <div key={sub.type} className="rounded-lg border p-2.5" style={{ background: BG, borderColor: BORDER }}>
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
                  : <span className="text-[9px]" style={{ color: TEXT_DIM }}>Aucun composant</span>
                }
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SIL context */}
      <div>
        <SectionLabel>Contexte SIL</SectionLabel>
        <div className="rounded-xl border p-3" style={{ background: BG, borderColor: BORDER }}>
          <Row label="PFD calculé" value={formatPFD(result.PFD_avg)}
            color={result.meetsTarget ? '#4ADE80' : '#F87171'} />
          <Row label="SIL cible"   value={`SIL ${sif.targetSIL}`}  color="#60A5FA" />
          <Row label="SIL atteint" value={`SIL ${result.SIL}`}
            color={result.meetsTarget ? '#4ADE80' : '#F87171'} />
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={() => { props.onSetActiveCampaign(props.onNewCampaign()); props.onSetView('execution') }}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold"
        style={{ background: `linear-gradient(135deg, ${TEAL}, #007A82)`, color: '#fff', boxShadow: `0 4px 12px ${TEAL}25` }}>
        <Plus size={13} /> Nouveau test
      </button>
    </div>
  )
}

// ─── Onglet En cours ──────────────────────────────────────────────────────
function CampaignContent(props: ProofTestRightPanelProps) {
  const { procedure, activeCampaign, onUpdateActiveCampaign, onSaveCampaign, onNewCampaign, onSetView, onSetActiveCampaign } = props

  if (!activeCampaign || !procedure) {
    return (
      <div className="p-3 flex flex-col items-center justify-center gap-3 py-12 text-center">
        <FlaskConical size={28} style={{ color: TEXT_DIM, opacity: 0.25 }} />
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color: TEXT_DIM }}>Aucun test en cours</p>
          <p className="text-[10px]" style={{ color: TEXT_DIM }}>Démarrez depuis la vue Exécution</p>
        </div>
        <button
          onClick={() => { onSetActiveCampaign(onNewCampaign()); onSetView('execution') }}
          className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold mt-1"
          style={{ background: `linear-gradient(135deg, ${TEAL}, #007A82)`, color: '#fff' }}>
          <Plus size={12} /> Nouveau test
        </button>
      </div>
    )
  }

  const total     = activeCampaign.stepResults.length
  const filled    = activeCampaign.stepResults.filter(r => r.result !== null).length
  const fails     = activeCampaign.stepResults.filter(r => r.result === 'non' || r.conformant === false)
  const pct       = total > 0 ? filled / total : 0
  const ringColor = fails.length > 0 ? '#EF4444' : pct >= 1 ? '#4ADE80' : TEAL

  const nonConform = fails.map(r => {
    const step = procedure.steps.find(s => s.id === r.stepId)
    return step ? { action: step.action, expected: step.expectedValue, measured: r.measuredValue } : null
  }).filter(Boolean) as { action: string; expected: string; measured: string }[]

  return (
    <div className="p-3 space-y-4">

      {/* Progression */}
      <div>
        <SectionLabel>Progression</SectionLabel>
        <div className="rounded-xl border p-3 flex items-center gap-3"
          style={{ background: BG, borderColor: BORDER }}>
          <div className="relative shrink-0">
            <Ring pct={pct} color={ringColor} size={60} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold font-mono" style={{ color: ringColor }}>
                {Math.round(pct * 100)}%
              </span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold" style={{ color: TEXT }}>{filled}/{total} étapes</p>
            {fails.length > 0
              ? <p className="text-[10px] mt-0.5" style={{ color: '#F87171' }}>
                  {fails.length} non-conformité{fails.length > 1 ? 's' : ''}
                </p>
              : pct >= 1
                ? <p className="text-[10px] mt-0.5" style={{ color: '#4ADE80' }}>Toutes OK ✓</p>
                : <p className="text-[10px] mt-0.5" style={{ color: TEXT_DIM }}>En cours…</p>
            }
          </div>
        </div>
      </div>

      {/* Non-conformités */}
      {nonConform.length > 0 && (
        <div>
          <SectionLabel>Non-conformités ({nonConform.length})</SectionLabel>
          <div className="space-y-1.5">
            {nonConform.map((nc, i) => (
              <div key={i} className="rounded-lg border px-2.5 py-2"
                style={{ background: '#EF444408', borderColor: '#EF444428' }}>
                <div className="flex items-start gap-1.5">
                  <XCircle size={10} className="shrink-0 mt-0.5" style={{ color: '#EF4444' }} />
                  <p className="text-[10px] leading-relaxed" style={{ color: '#FCA5A5' }}>
                    {nc.action || 'Étape sans libellé'}
                  </p>
                </div>
                {nc.measured && (
                  <p className="text-[9px] font-mono mt-1 pl-4" style={{ color: '#F87171' }}>
                    Mesuré : {nc.measured} · Attendu : {nc.expected || '—'}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verdict */}
      <div>
        <SectionLabel>Verdict</SectionLabel>
        <div className="grid grid-cols-3 gap-1.5">
          {([
            { v: 'pass'        as Verdict, label: 'PASS', color: '#16A34A' },
            { v: 'conditional' as Verdict, label: 'COND', color: '#D97706' },
            { v: 'fail'        as Verdict, label: 'FAIL', color: '#DC2626' },
          ]).map(({ v, label, color }) => (
            <button key={label} type="button"
              onClick={() => onUpdateActiveCampaign({ verdict: v })}
              className="rounded-lg border py-1.5 text-[10px] font-bold transition-all"
              style={activeCampaign.verdict === v
                ? { background: color, color: '#fff', borderColor: color }
                : { background: BG, color: TEXT_DIM, borderColor: BORDER }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Signatures rapides */}
      <div>
        <SectionLabel>Signatures</SectionLabel>
        <div className="space-y-2">
          {([
            { k: 'conductedBy' as const, label: 'Réalisé par' },
            { k: 'witnessedBy'  as const, label: 'Témoin' },
          ]).map(({ k, label }) => (
            <div key={k}>
              <p className="text-[9px] font-semibold mb-1" style={{ color: TEXT_DIM }}>{label}</p>
              <input
                value={activeCampaign[k] ?? ''}
                onChange={e => onUpdateActiveCampaign({ [k]: e.target.value })}
                placeholder="Nom Prénom"
                className="w-full rounded-lg border px-2.5 py-1.5 text-xs outline-none transition-all"
                style={{ background: BG, borderColor: BORDER, color: TEXT }}
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
        disabled={!activeCampaign.verdict}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: 'linear-gradient(135deg, #003D5C, #002A42)', color: '#fff',
          boxShadow: '0 4px 12px rgba(0,61,92,0.35)' }}>
        <ClipboardCheck size={13} /> Clôturer le test
      </button>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────
export function ProofTestRightPanel(props: ProofTestRightPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>('status')
  const activeIdx = PANEL_TABS.findIndex(t => t.id === activeTab)
// Auto-switch to campaign tab when a new test is started from the procedure view
  // We detect this by checking if the activeCampaign prop is new.
  const isNewCampaign = props.activeCampaign && props.activeCampaign.stepResults.length === 0
  
  useState(() => {
    if (isNewCampaign) {
      setActiveTab('campaign')
    }
  })
  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: PANEL }}>

       {/* ── Tab bar intercalaire ── */}
       <div className="px-3 pt-3 shrink-0">
        <div className="flex items-end" style={{ borderBottom: `1px solid ${BORDER}` }}>
          {PANEL_TABS.map((tab, i) => {
            const isActive = tab.id === activeTab
            // Badge on "campaign" tab when a campaign is active
            const hasBadge = tab.id === 'campaign' && !!props.activeCampaign

            return (
              <button key={tab.id} type="button"
                onClick={() => setActiveTab(tab.id)}
                className="relative flex items-center gap-1.5 px-3 py-2 text-left transition-colors shrink-0"
                style={isActive ? {
                  background:   CARD,
                  borderTop:    `1px solid ${BORDER}`,
                  borderLeft:   `1px solid ${BORDER}`,
                  borderRight:  `1px solid ${BORDER}`,
                  borderBottom: `1px solid ${CARD}`,
                  borderRadius: `${R}px ${R}px 0 0`,
                  color:        TEAL_DIM,
                  marginBottom: '-1px',
                  zIndex:       10,
                } : {
                  color: TEXT_DIM,
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = TEXT }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = TEXT_DIM }}
              >
                <tab.Icon size={11} />
                <span className="text-[12px] font-semibold whitespace-nowrap">{tab.label}</span>
                
                {hasBadge && (
                  <span className="w-1.5 h-1.5 rounded-full"
                    style={{ background: isActive ? TEAL : `${TEAL}80` }} />
                )}
              </button>
            )
          })}
        </div>
      </div>
      {/* ── Card body — dynamic corners matching active tab ── */}
      <div className="flex-1 overflow-y-auto"
        style={{
          background: CARD,
          borderLeft:   `1px solid ${BORDER}`,
          borderRight:  `1px solid ${BORDER}`,
          borderBottom: `1px solid ${BORDER}`,
          borderRadius: `${activeIdx === 0 ? 0 : R}px ${activeIdx === PANEL_TABS.length - 1 ? 0 : R}px ${R}px ${R}px`,
          margin: '0 12px 12px',
        }}
      >
        <div style={{ minHeight: '100%' }}>
          {activeTab === 'status'   && <StatusContent   {...props} />}
          {activeTab === 'campaign' && <CampaignContent {...props} />}
        </div>
      </div>
    </div>
  )}