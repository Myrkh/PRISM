/**
 * ProofTestTab — PRISM v2
 *
 * Industrial proof-test procedure editor.
 *
 * Structure:
 *   ┌─ Actions préliminaires ──────────────────────────────────────────────┐
 *   │  Action | Lieu | Résultat attendu | Type | [exécution]               │
 *   ├─ Test — [titre éditable] ────────────────────────────────────────────┤
 *   │  ...steps...                                                          │
 *   ├─ Test — [autre titre] ───────────────────────────────────────────────┤
 *   │  ...steps...                                                          │
 *   └─ Actions finales ────────────────────────────────────────────────────┘
 *
 * DA: KORE — navy #003D5C, teal #009BA4, Inter font, rounded-2xl cards
 */
import { useCallback, useMemo, useState, useEffect } from 'react'
import {
  Plus, Trash2, Pencil, Save, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, Minus, AlertTriangle, Clock,
  FlaskConical, ClipboardList, BarChart3, Settings2,
  GripVertical, Copy, Download, FileText,
} from 'lucide-react'
import { nanoid } from 'nanoid'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAppStore } from '@/store/appStore'
import { useLayout } from '@/components/layout/SIFWorkbenchLayout'
import { ProofTestRightPanel } from '@/components/prooftest/ProofTestRightPanel'
import { ProofTestPDFExport } from '@/components/prooftest/ProofTestPDFExport'
import type { Project, SIF } from '@/core/types'
import { cn } from '@/lib/utils'

// ─── ProofTestRightPanel props are passed via useLayout hook (see useEffect below) ───

// ─── Tokens ───────────────────────────────────────────────────────────────
const NAVY  = '#003D5C'
const NAVY2 = '#002A42'
const TEAL  = '#009BA4'
const BG    = '#F0F4F8'

// ─── Types (inline — will be moved to core/types in a real migration) ─────
type ProofTestLocation = string
const LOCATIONS = ['SDC', 'Local Instrumentation', 'Poste Électrique (PE)', 'Terrain', 'Salle de Contrôle', 'Tableau Électrique', 'Autre']
type ResultType = 'oui_non' | 'valeur' | 'personnalisé'
type CatType    = 'preliminary' | 'test' | 'final'
type Status     = 'draft' | 'ifr' | 'approved'
type Verdict    = 'pass' | 'fail' | 'conditional' | null
type StepResult = 'oui' | 'non' | 'na' | null

interface PTStep {
  id: string
  categoryId: string
  order: number
  action: string
  location: string
  resultType: ResultType
  expectedValue: string    // "≥ 4 mA", "< 500 ms", "Clapet fermé", etc.
}

interface PTCategory {
  id: string
  type: CatType
  title: string
  order: number
}

interface PTStepResult {
  stepId: string
  result: StepResult
  measuredValue: string
  conformant: boolean | null
  comment: string
}

interface PTCampaign {
  id: string
  date: string
  team: string
  verdict: Verdict
  notes: string
  stepResults: PTStepResult[]
  conductedBy: string
  witnessedBy: string
}

interface PTProcedure {
  id: string
  ref: string
  revision: string
  status: Status
  periodicityMonths: number
  categories: PTCategory[]
  steps: PTStep[]
  madeBy: string; madeByDate: string
  verifiedBy: string; verifiedByDate: string
  approvedBy: string; approvedByDate: string
  notes: string
}

// ─── Default factory ──────────────────────────────────────────────────────
const CAT_META: Record<CatType, { label: string; color: string; locked: boolean }> = {
  preliminary: { label: 'Actions préliminaires', color: '#6B7280', locked: true  },
  test:        { label: 'Test',                  color: TEAL,      locked: false },
  final:       { label: 'Actions finales',       color: NAVY,      locked: true  },
}

const STATUS_CFG: Record<Status, { label: string; bg: string; color: string; border: string }> = {
  draft:    { label: 'Brouillon', bg: '#F3F4F6', color: '#6B7280', border: '#D1D5DB' },
  ifr:      { label: 'IFR',      bg: '#FEF9C3', color: '#92400E', border: '#FDE68A' },
  approved: { label: 'Approuvé', bg: '#DCFCE7', color: '#15803D', border: '#86EFAC' },
}

function defaultProcedure(sif: SIF): PTProcedure {
  const catPre: PTCategory = { id: nanoid(), type: 'preliminary', title: 'Actions préliminaires', order: 0 }
  const catTest: PTCategory = { id: nanoid(), type: 'test', title: `Test — ${sif.sifNumber}`, order: 1 }
  const catFin: PTCategory = { id: nanoid(), type: 'final', title: 'Actions finales', order: 2 }

  const steps: PTStep[] = [
    // Prelim
    { id: nanoid(), categoryId: catPre.id, order: 0, action: 'Obtenir le Permis de Travail (PTW) et s\'assurer de la disponibilité du système', location: 'SDC', resultType: 'oui_non', expectedValue: '' },
    { id: nanoid(), categoryId: catPre.id, order: 1, action: 'Mettre le SIF en bypass et consigner dans le registre de dérogations', location: 'SDC', resultType: 'oui_non', expectedValue: '' },
    { id: nanoid(), categoryId: catPre.id, order: 2, action: 'Vérifier l\'alimentation 24 VDC sur le rack logique et noter la tension', location: 'Local Instrumentation', resultType: 'valeur', expectedValue: '24 ± 1 VDC' },
    // Test
    { id: nanoid(), categoryId: catTest.id, order: 0, action: 'Injecter signal mA minimum sur transmetteur (entrée capteur)', location: 'Terrain', resultType: 'valeur', expectedValue: '4 mA ± 0.1' },
    { id: nanoid(), categoryId: catTest.id, order: 1, action: 'Vérifier alarme LO sur console opérateur', location: 'SDC', resultType: 'oui_non', expectedValue: '' },
    { id: nanoid(), categoryId: catTest.id, order: 2, action: 'Injecter signal au seuil de déclenchement (setpoint)', location: 'Terrain', resultType: 'valeur', expectedValue: `${sif.processTag || 'Setpoint'} ± 2%` },
    { id: nanoid(), categoryId: catTest.id, order: 3, action: 'Vérifier déclenchement de l\'actionneur final', location: 'Terrain', resultType: 'oui_non', expectedValue: '' },
    { id: nanoid(), categoryId: catTest.id, order: 4, action: 'Mesurer le temps de réponse SIF (déclenchement → fin de course)', location: 'SDC', resultType: 'valeur', expectedValue: '< 2000 ms' },
    // Final
    { id: nanoid(), categoryId: catFin.id, order: 0, action: 'Remettre l\'actionneur en position initiale et vérifier retour d\'état', location: 'Terrain', resultType: 'oui_non', expectedValue: '' },
    { id: nanoid(), categoryId: catFin.id, order: 1, action: 'Lever le bypass SIF et vérifier l\'état actif', location: 'SDC', resultType: 'oui_non', expectedValue: '' },
    { id: nanoid(), categoryId: catFin.id, order: 2, action: 'Clôturer le PTW et signer le rapport de test', location: 'SDC', resultType: 'oui_non', expectedValue: '' },
  ]

  return {
    id: nanoid(), ref: `PT-${sif.sifNumber}-001`, revision: 'A', status: 'draft',
    periodicityMonths: 12,
    categories: [catPre, catTest, catFin],
    steps,
    madeBy: sif.madeBy || '', madeByDate: '',
    verifiedBy: sif.verifiedBy || '', verifiedByDate: '',
    approvedBy: '', approvedByDate: '',
    notes: '',
  }
}

const inputCls = 'h-8 px-3 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#009BA4]/30 focus:border-[#009BA4] transition-all'

// ─── Result badge ─────────────────────────────────────────────────────────
function ResultBadge({ r }: { r: StepResult }) {
  if (r === 'oui') return <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded"><CheckCircle2 size={9} />OUI</span>
  if (r === 'non') return <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded"><XCircle size={9} />NON</span>
  if (r === 'na')  return <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded"><Minus size={9} />N/A</span>
  return <span className="text-[10px] text-gray-300">—</span>
}

// ─── Result input (campaign execution) ───────────────────────────────────
function ResultInput({ step, result, onChange }: {
  step: PTStep
  result: PTStepResult | undefined
  onChange: (r: Partial<PTStepResult>) => void
}) {
  const r = result?.result ?? null
  const val = result?.measuredValue ?? ''

  if (step.resultType === 'oui_non') {
    return (
      <div className="flex items-center gap-1">
        {(['oui', 'non', 'na'] as StepResult[]).map(v => (
          <button key={v as string}
            onClick={() => onChange({ result: r === v ? null : v })}
            className={cn(
              'text-[9px] font-bold px-2 py-0.5 rounded border transition-all',
              r === v && v === 'oui' ? 'bg-emerald-500 text-white border-emerald-500' :
              r === v && v === 'non' ? 'bg-red-500 text-white border-red-500' :
              r === v && v === 'na'  ? 'bg-gray-400 text-white border-gray-400' :
              'bg-white text-gray-400 border-gray-200 hover:border-gray-400',
            )}
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
          value={val}
          onChange={e => onChange({ measuredValue: e.target.value, conformant: null })}
          placeholder="Valeur mesurée…"
          className={cn(
            'w-28 text-xs h-7 px-2 rounded-lg border bg-white focus:outline-none focus:ring-1 transition-all',
            conformant === true  ? 'border-emerald-400 focus:ring-emerald-400/30' :
            conformant === false ? 'border-red-400 focus:ring-red-400/30' :
            'border-gray-200 focus:ring-[#009BA4]/30 focus:border-[#009BA4]',
          )}
        />
        {conformant === true  && <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />}
        {conformant === false && <XCircle size={13} className="text-red-500 shrink-0" />}
      </div>
    )
  }

  // personnalisé
  return (
    <input
      value={val}
      onChange={e => onChange({ measuredValue: e.target.value })}
      placeholder="Résultat…"
      className="w-36 text-xs h-7 px-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#009BA4]/30 focus:border-[#009BA4]"
    />
  )
}

function checkConformance(measured: string, expected: string): boolean | null {
  const numMeas = parseFloat(measured.replace(',', '.'))
  if (isNaN(numMeas)) return null
  const ltMatch = expected.match(/^[<≤]\s*([\d.]+)/)
  const gtMatch = expected.match(/^[>≥]\s*([\d.]+)/)
  const rangeMatch = expected.match(/([\d.]+)\s*[±]\s*([\d.]+)/)
  if (ltMatch) return numMeas < parseFloat(ltMatch[1])
  if (gtMatch) return numMeas > parseFloat(gtMatch[1])
  if (rangeMatch) {
    const center = parseFloat(rangeMatch[1])
    const tol    = parseFloat(rangeMatch[2])
    return Math.abs(numMeas - center) <= tol
  }
  return null
}

// ─── ProofTestTab ─────────────────────────────────────────────────────────
interface Props { project: Project; sif: SIF }

export function ProofTestTab({ project, sif }: Props) {
  const updateProofTestProcedure = useAppStore(s => s.updateProofTestProcedure)

  // Local state — procedure + campaigns
  const [procedure, setProcedure]   = useState<PTProcedure>(() => {
    const stored = sif.proofTestProcedure as unknown as PTProcedure | undefined
    // Guard: if stored procedure exists but is missing arrays (old data shape), regenerate
    if (stored && Array.isArray(stored.categories) && Array.isArray(stored.steps)) return stored
    return defaultProcedure(sif)
  })
  const [campaigns, setCampaigns]   = useState<PTCampaign[]>(() => {
    const stored = sif.testCampaigns as unknown as PTCampaign[] | undefined
    return Array.isArray(stored) ? stored : []
  })
  const [view, setView]             = useState<'procedure' | 'execution' | 'history'>('procedure')
  const [editMode, setEditMode]     = useState(false)
  const [activeCampaign, setActiveCampaign] = useState<PTCampaign | null>(null)
  const [collapsed, setCollapsed]   = useState<Set<string>>(new Set())
  const [showExport, setShowExport]   = useState(false)

  // ─ Procedure helpers ───────────────────────────────────────────────────
  const catsSorted = useMemo(() =>
    [...(procedure.categories ?? [])].sort((a, b) => a.order - b.order),
  [procedure.categories])

  const stepsFor = (catId: string) =>
    procedure.steps.filter(s => s.categoryId === catId).sort((a, b) => a.order - b.order)

  const updateStep = (id: string, patch: Partial<PTStep>) =>
    setProcedure(p => ({ ...p, steps: p.steps.map(s => s.id === id ? { ...s, ...patch } : s) }))

  const addStep = (catId: string) => {
    const existing = procedure.steps.filter(s => s.categoryId === catId)
    setProcedure(p => ({
      ...p,
      steps: [...p.steps, {
        id: nanoid(), categoryId: catId,
        order: existing.length, action: '',
        location: 'SDC', resultType: 'oui_non', expectedValue: '',
      }],
    }))
  }

  const deleteStep = (id: string) =>
    setProcedure(p => ({ ...p, steps: p.steps.filter(s => s.id !== id) }))

  const addTestCategory = () => {
    const existingTests = procedure.categories.filter(c => c.type === 'test').length
    const finalCat = procedure.categories.find(c => c.type === 'final')
    const finalOrder = finalCat?.order ?? 99
    const newCat: PTCategory = {
      id: nanoid(), type: 'test',
      title: `Test ${existingTests + 1}`,
      order: finalOrder - 0.5,
    }
    // Re-assign orders to keep sequential
    const newCats = [...procedure.categories, newCat].sort((a, b) => a.order - b.order).map((c, i) => ({ ...c, order: i }))
    setProcedure(p => ({ ...p, categories: newCats }))
  }

  const deleteCategory = (id: string) => {
    setProcedure(p => ({
      ...p,
      categories: p.categories.filter(c => c.id !== id),
      steps: p.steps.filter(s => s.categoryId !== id),
    }))
  }

  const updateCategory = (id: string, title: string) =>
    setProcedure(p => ({ ...p, categories: p.categories.map(c => c.id === id ? { ...c, title } : c) }))

  const saveProcedure = () => {
    updateProofTestProcedure(project.id, sif.id, procedure as any)
    setEditMode(false)
  }

  // ─ Campaign helpers ────────────────────────────────────────────────────
  const newCampaign = (): PTCampaign => ({
    id: nanoid(),
    date: new Date().toISOString().split('T')[0],
    team: '', verdict: null,
    notes: '',
    stepResults: procedure.steps.map(s => ({
      stepId: s.id, result: null, measuredValue: '', conformant: null, comment: '',
    })),
    conductedBy: '', witnessedBy: '',
  })

  const updateStepResult = (stepId: string, patch: Partial<PTStepResult>) => {
    if (!activeCampaign) return
    setActiveCampaign(prev => {
      if (!prev) return prev
      const exists = prev.stepResults.find(r => r.stepId === stepId)
      const newResults = exists
        ? prev.stepResults.map(r => r.stepId === stepId ? { ...r, ...patch } : r)
        : [...prev.stepResults, { stepId, result: null, measuredValue: '', conformant: null, comment: '', ...patch }]
      // Auto-compute verdict
      const done = newResults.filter(r => r.result !== null).length
      const fails = newResults.filter(r => r.result === 'non').length
      const verdict: Verdict = done === procedure.steps.length
        ? fails > 0 ? 'fail' : 'pass'
        : prev.verdict
      return { ...prev, stepResults: newResults, verdict }
    })
  }

  const saveCampaign = () => {
    if (!activeCampaign) return
    setCampaigns(prev => {
      const exists = prev.find(c => c.id === activeCampaign.id)
      return exists ? prev.map(c => c.id === activeCampaign.id ? activeCampaign : c) : [activeCampaign, ...prev]
    })
    setActiveCampaign(null)
    setView('history')
  }

  // ─ Overdue check ───────────────────────────────────────────────────────
  const lastCampaign = campaigns[0]
  const nextDue = lastCampaign
    ? new Date(new Date(lastCampaign.date).getTime() + procedure.periodicityMonths * 30.44 * 86400000)
    : null
  const daysOverdue = nextDue ? Math.floor((Date.now() - nextDue.getTime()) / 86400000) : null
  const isOverdue = daysOverdue !== null && daysOverdue > 0

  // ─ Status badges ───────────────────────────────────────────────────────
  const sm = STATUS_CFG[procedure.status]

  // ─ updateActiveCampaign ─────────────────────────────────────────────
  const updateActiveCampaign = (patch: Partial<PTCampaign>) =>
    setActiveCampaign(prev => prev ? { ...prev, ...patch } : prev)

  // ─ Mount right panel via layout context (no React context boundary issue) ──
  const { setRightPanelOverride } = useLayout()
  useEffect(() => {
    setRightPanelOverride(
      <ProofTestRightPanel
        sif={sif}
        view={view}
        procedure={procedure}
        campaigns={campaigns}
        activeCampaign={activeCampaign}
        isOverdue={isOverdue}
        daysOverdue={daysOverdue}
        nextDue={nextDue}
        onSetView={setView}
        onSetActiveCampaign={setActiveCampaign}
        onUpdateActiveCampaign={updateActiveCampaign}
        onSaveCampaign={saveCampaign}
        onNewCampaign={newCampaign}
      />
    )
    return () => setRightPanelOverride(null)
  }, [view, procedure, campaigns, activeCampaign, isOverdue, daysOverdue, nextDue])

  // ─────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── Overdue alert ── */}
      {isOverdue && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border"
          style={{ background: '#FEF2F2', borderColor: '#FECACA' }}
        >
          <AlertTriangle size={15} className="text-red-500 shrink-0" />
          <p className="text-xs text-red-700 font-medium">
            Test en retard de <strong>{daysOverdue} jours</strong> — dernier test : {lastCampaign?.date} · Périodicité : {procedure.periodicityMonths} mois
          </p>
        </div>
      )}

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between">
        {/* Nav tabs */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {([
            { id: 'procedure', label: 'Procédure', icon: ClipboardList },
            { id: 'execution', label: 'Exécution', icon: FlaskConical },
            { id: 'history',   label: 'Historique', icon: BarChart3 },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setView(id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                view === id ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-700',
              )}
              style={view === id ? { background: NAVY } : undefined}
            >
              <Icon size={12} />{label}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {view === 'procedure' && (
            <>
              {editMode ? (
                <>
                  <button onClick={() => setEditMode(false)}
                    className={cn(inputCls, 'px-3 text-gray-500 hover:text-red-500 cursor-pointer')}
                  >Annuler</button>
                  <button onClick={saveProcedure}
                    className="h-8 px-4 text-xs font-semibold text-white rounded-xl flex items-center gap-1.5 shadow-sm"
                    style={{ background: NAVY }}
                  >
                    <Save size={12} />Sauvegarder
                  </button>
                </>
              ) : (
                <button onClick={() => setEditMode(true)}
                  className="h-8 px-3 text-xs font-semibold rounded-xl border border-gray-200 text-gray-600 hover:border-[#009BA4] hover:text-[#009BA4] flex items-center gap-1.5 transition-all"
                >
                  <Pencil size={12} />Modifier
                </button>
              )}
            </>
          )}
          {view === 'execution' && !activeCampaign && (
            <button onClick={() => setActiveCampaign(newCampaign())}
              className="h-8 px-4 text-xs font-semibold text-white rounded-xl flex items-center gap-1.5 shadow-sm"
              style={{ background: TEAL }}
            >
              <Plus size={13} />Nouveau test
            </button>
          )}
          {view === 'execution' && activeCampaign && (
            <>
              <button onClick={() => setActiveCampaign(null)}
                className={cn(inputCls, 'px-3 text-gray-500 hover:text-red-500 cursor-pointer')}
              >Annuler</button>
              <button onClick={saveCampaign}
                className="h-8 px-4 text-xs font-semibold text-white rounded-xl flex items-center gap-1.5 shadow-sm"
                style={{ background: NAVY }}
              >
                <Save size={12} />Clôturer le test
              </button>
            </>
          )}
          {/* Export PDF — toujours visible */}
          <button onClick={() => setShowExport(true)}
            className="h-8 px-3 text-xs font-semibold rounded-xl border border-gray-200 text-gray-600 hover:border-[#009BA4] hover:text-[#009BA4] flex items-center gap-1.5 transition-all"
            title="Exporter en PDF"
          >
            <Download size={12} />PDF
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* VIEW: PROCEDURE                                                     */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {view === 'procedure' && (
        <div className="space-y-3">

          {/* Procedure header card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Procédure de test périodique</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded border"
                    style={{ background: sm.bg, color: sm.color, borderColor: sm.border }}
                  >{sm.label}</span>
                </div>
                {editMode ? (
                  <input value={procedure.ref} onChange={e => setProcedure(p => ({ ...p, ref: e.target.value }))}
                    className={cn(inputCls, 'w-56 font-mono font-bold text-sm mb-1')} />
                ) : (
                  <p className="font-mono font-bold text-sm" style={{ color: NAVY }}>{procedure.ref} · Rev. {procedure.revision}</p>
                )}
              </div>

              {/* Key params */}
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Périodicité</p>
                  {editMode ? (
                    <input type="number" value={procedure.periodicityMonths}
                      onChange={e => setProcedure(p => ({ ...p, periodicityMonths: Number(e.target.value) }))}
                      className={cn(inputCls, 'w-16 text-center font-mono font-bold text-base mt-0.5')} />
                  ) : (
                    <p className="font-mono font-bold text-lg" style={{ color: NAVY }}>{procedure.periodicityMonths}<span className="text-xs font-normal text-gray-400 ml-0.5">mois</span></p>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Tests réalisés</p>
                  <p className="font-mono font-bold text-lg" style={{ color: TEAL }}>{campaigns.length}</p>
                </div>
                {nextDue && (
                  <div className="text-center">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Prochain test</p>
                    <p className={cn('font-mono font-bold text-sm', isOverdue ? 'text-red-500' : 'text-emerald-600')}>
                      {isOverdue ? `J+${daysOverdue}` : nextDue.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Category sections */}
          {catsSorted.map(cat => {
            const meta  = CAT_META[cat.type]
            const steps = stepsFor(cat.id)
            const isCollapsed = collapsed.has(cat.id)

            return (
              <div key={cat.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

                {/* Category header */}
                <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100"
                  style={{ background: `${meta.color}0A` }}
                >
                  {/* Color dot */}
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: meta.color }} />

                  {/* Title */}
                  {editMode && !meta.locked ? (
                    <input
                      value={cat.title}
                      onChange={e => updateCategory(cat.id, e.target.value)}
                      className="flex-1 bg-transparent text-sm font-bold outline-none border-b border-dashed focus:border-[#009BA4] py-0.5 transition-all"
                      style={{ color: meta.color }}
                    />
                  ) : (
                    <span className="flex-1 text-sm font-bold" style={{ color: meta.color }}>{cat.title}</span>
                  )}

                  <span className="text-[10px] font-semibold text-gray-400">{steps.length} étape{steps.length !== 1 ? 's' : ''}</span>

                  {/* Delete test category */}
                  {editMode && cat.type === 'test' && (
                    <button onClick={() => deleteCategory(cat.id)}
                      className="p-1 rounded text-gray-300 hover:text-red-400 transition-colors"
                      title="Supprimer cette catégorie"
                    ><Trash2 size={12} /></button>
                  )}

                  {/* Collapse */}
                  <button onClick={() => setCollapsed(s => { const n = new Set(s); n.has(cat.id) ? n.delete(cat.id) : n.add(cat.id); return n })}
                    className="p-1 rounded text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  </button>
                </div>

                {/* Steps table */}
                {!isCollapsed && (
                  <>
                    {steps.length > 0 && (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest text-gray-400 w-8">#</th>
                            <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest text-gray-400">Action</th>
                            <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest text-gray-400 w-36">Lieu</th>
                            <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest text-gray-400 w-28">Type résultat</th>
                            <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest text-gray-400 w-44">Résultat attendu</th>
                            {editMode && <th className="w-8" />}
                          </tr>
                        </thead>
                        <tbody>
                          {steps.map((step, si) => (
                            <tr key={step.id} className="border-b border-gray-50 hover:bg-gray-50/50 group transition-colors">
                              <td className="px-4 py-2.5 text-gray-400 font-mono font-bold text-[10px]">
                                {si + 1}
                              </td>
                              <td className="px-4 py-2.5">
                                {editMode ? (
                                  <input value={step.action}
                                    onChange={e => updateStep(step.id, { action: e.target.value })}
                                    placeholder="Décrire l'action à réaliser…"
                                    className="w-full bg-transparent text-xs outline-none border-b border-transparent focus:border-[#009BA4] py-0.5 placeholder:text-gray-300 transition-all"
                                  />
                                ) : (
                                  <span className="text-gray-700">{step.action || <span className="text-gray-300">—</span>}</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5">
                                {editMode ? (
                                  <select value={step.location}
                                    onChange={e => updateStep(step.id, { location: e.target.value })}
                                    className="w-full bg-transparent text-xs outline-none border-b border-transparent focus:border-[#009BA4] py-0.5 transition-all"
                                  >
                                    {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                                  </select>
                                ) : (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                    style={{ background: `${NAVY}0D`, color: NAVY }}
                                  >{step.location}</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5">
                                {editMode ? (
                                  <select value={step.resultType}
                                    onChange={e => updateStep(step.id, { resultType: e.target.value as ResultType })}
                                    className="w-full bg-transparent text-xs outline-none border-b border-transparent focus:border-[#009BA4] py-0.5 transition-all"
                                  >
                                    <option value="oui_non">Oui / Non</option>
                                    <option value="valeur">Valeur</option>
                                    <option value="personnalisé">Personnalisé</option>
                                  </select>
                                ) : (
                                  <span className="text-[10px] font-semibold text-gray-500">
                                    {step.resultType === 'oui_non' ? 'Oui / Non' : step.resultType === 'valeur' ? 'Valeur' : 'Personnalisé'}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2.5">
                                {step.resultType === 'oui_non' ? (
                                  <span className="flex items-center gap-1">
                                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">OUI</span>
                                    <span className="text-gray-300 text-[9px]">ou</span>
                                    <span className="text-[10px] text-red-500 font-bold bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">NON</span>
                                  </span>
                                ) : editMode ? (
                                  <input value={step.expectedValue}
                                    onChange={e => updateStep(step.id, { expectedValue: e.target.value })}
                                    placeholder={step.resultType === 'valeur' ? 'ex: < 500 ms, ≥ 4 mA…' : 'Décrire le résultat attendu…'}
                                    className="w-full bg-transparent text-xs outline-none border-b border-transparent focus:border-[#009BA4] py-0.5 placeholder:text-gray-300 transition-all font-mono"
                                  />
                                ) : (
                                  <span className="font-mono text-[11px] font-semibold" style={{ color: NAVY }}>{step.expectedValue || <span className="text-gray-300">—</span>}</span>
                                )}
                              </td>
                              {editMode && (
                                <td className="px-2 py-2.5">
                                  <button onClick={() => deleteStep(step.id)}
                                    className="p-1 rounded text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                  ><Trash2 size={12} /></button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {/* Add step */}
                    {editMode && (
                      <div className="px-4 py-2 border-t border-dashed border-gray-200">
                        <button onClick={() => addStep(cat.id)}
                          className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
                          style={{ color: TEAL }}
                        >
                          <Plus size={12} />Ajouter une étape
                        </button>
                      </div>
                    )}

                    {steps.length === 0 && !editMode && (
                      <div className="px-4 py-4 text-xs text-gray-400 text-center">
                        Aucune étape — cliquez sur Modifier pour en ajouter
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}

          {/* Add test category button */}
          {editMode && (
            <button onClick={addTestCategory}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-gray-200 text-sm font-semibold transition-all hover:border-[#009BA4] hover:text-[#009BA4]"
              style={{ color: '#9CA3AF' }}
            >
              <Plus size={14} />Ajouter une catégorie de test
            </button>
          )}

          {/* Signatures */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Signatures de la procédure</p>
            <div className="grid grid-cols-3 gap-4">
              {[
                { key: 'madeBy' as const,     keyDate: 'madeByDate' as const,     label: 'Établi par' },
                { key: 'verifiedBy' as const,  keyDate: 'verifiedByDate' as const,  label: 'Vérifié par' },
                { key: 'approvedBy' as const,  keyDate: 'approvedByDate' as const,  label: 'Approuvé par' },
              ].map(({ key, keyDate, label }) => (
                <div key={key} className="border border-gray-200 rounded-xl p-4 min-h-[80px]">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-2">{label}</p>
                  {editMode ? (
                    <div className="space-y-1.5">
                      <input value={procedure[key]} onChange={e => setProcedure(p => ({ ...p, [key]: e.target.value }))}
                        placeholder="Nom Prénom" className={cn(inputCls, 'w-full h-7')} />
                      <input type="date" value={procedure[keyDate]} onChange={e => setProcedure(p => ({ ...p, [keyDate]: e.target.value }))}
                        className={cn(inputCls, 'w-full h-7')} />
                    </div>
                  ) : (
                    <>
                      <p className="text-xs font-semibold" style={{ color: NAVY }}>{procedure[key] || '_______________'}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{procedure[keyDate] || 'Date / Signature'}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* VIEW: EXECUTION                                                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {view === 'execution' && (
        <div className="space-y-3">
          {!activeCampaign ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 flex flex-col items-center justify-center gap-3 text-center">
              <FlaskConical size={32} style={{ color: TEAL, opacity: 0.4 }} />
              <p className="font-semibold text-sm" style={{ color: NAVY }}>Aucun test en cours</p>
              <p className="text-xs text-gray-400">Cliquez sur <strong>Nouveau test</strong> pour démarrer une campagne d'essai</p>
              <button onClick={() => setActiveCampaign(newCampaign())}
                className="mt-2 h-9 px-4 text-sm font-semibold text-white rounded-xl flex items-center gap-2"
                style={{ background: TEAL }}
              ><Plus size={14} />Nouveau test</button>
            </div>
          ) : (
            <>
              {/* Campaign meta */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1">Date du test</p>
                    <input type="date" value={activeCampaign.date}
                      onChange={e => setActiveCampaign(p => p && ({ ...p, date: e.target.value }))}
                      className={cn(inputCls, 'w-full')} />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1">Équipe / Référence</p>
                    <input value={activeCampaign.team} placeholder="ex: EQ-01 / Maintenance"
                      onChange={e => setActiveCampaign(p => p && ({ ...p, team: e.target.value }))}
                      className={cn(inputCls, 'w-full')} />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1">Verdict</p>
                    <div className="flex items-center gap-1 mt-1">
                      {([
                        { v: 'pass',        label: 'PASS',        bg: '#16A34A' },
                        { v: 'conditional', label: 'CONDITIONNEL', bg: '#D97706' },
                        { v: 'fail',        label: 'FAIL',        bg: '#DC2626' },
                      ] as const).map(({ v, label, bg }) => (
                        <button key={v}
                          onClick={() => setActiveCampaign(p => p && ({ ...p, verdict: v }))}
                          className="text-[9px] font-bold px-2 py-1 rounded border transition-all"
                          style={activeCampaign.verdict === v
                            ? { background: bg, color: 'white', borderColor: bg }
                            : { background: 'white', color: '#9CA3AF', borderColor: '#E5E7EB' }
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
                  <div key={cat.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100"
                      style={{ background: `${meta.color}0A` }}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
                      <span className="text-sm font-bold" style={{ color: meta.color }}>{cat.title}</span>
                      <span className="text-[10px] text-gray-400">{steps.length} étape{steps.length !== 1 ? 's' : ''}</span>
                    </div>

                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest text-gray-400 w-8">#</th>
                          <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest text-gray-400">Action</th>
                          <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest text-gray-400 w-32">Lieu</th>
                          <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest text-gray-400 w-40">Attendu</th>
                          <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest text-gray-400 w-44">Résultat</th>
                          <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest text-gray-400 w-28">Commentaire</th>
                        </tr>
                      </thead>
                      <tbody>
                        {steps.map((step, si) => {
                          const sr = activeCampaign.stepResults.find(r => r.stepId === step.id)
                          const isConform = sr?.result === 'oui' || (sr?.measuredValue && sr?.conformant === true)
                          const isNonConform = sr?.result === 'non' || sr?.conformant === false

                          return (
                            <tr key={step.id}
                              className={cn(
                                'border-b border-gray-50 transition-colors',
                                isConform    ? 'bg-emerald-50/30' :
                                isNonConform ? 'bg-red-50/30' :
                                'hover:bg-gray-50/50',
                              )}
                            >
                              <td className="px-4 py-3 text-gray-400 font-mono font-bold text-[10px]">{si + 1}</td>
                              <td className="px-4 py-3 text-gray-700">{step.action}</td>
                              <td className="px-4 py-3">
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                  style={{ background: `${NAVY}0D`, color: NAVY }}
                                >{step.location}</span>
                              </td>
                              <td className="px-4 py-3">
                                {step.resultType === 'oui_non' ? (
                                  <span className="flex items-center gap-1">
                                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1 rounded">OUI</span>
                                    <span className="text-[9px] text-red-500 font-bold bg-red-50 border border-red-200 px-1 rounded">NON</span>
                                  </span>
                                ) : (
                                  <span className="font-mono text-[11px] font-semibold" style={{ color: NAVY }}>{step.expectedValue || '—'}</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <ResultInput
                                  step={step}
                                  result={sr}
                                  onChange={patch => updateStepResult(step.id, patch)}
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  value={sr?.comment ?? ''}
                                  onChange={e => updateStepResult(step.id, { comment: e.target.value })}
                                  placeholder="Remarque…"
                                  className="w-full bg-transparent text-[10px] outline-none border-b border-transparent focus:border-[#009BA4] py-0.5 placeholder:text-gray-300 transition-all"
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

              {/* Campaign signatures */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { k: 'conductedBy' as const, label: 'Réalisé par' },
                    { k: 'witnessedBy'  as const, label: 'Témoin'      },
                  ].map(({ k, label }) => (
                    <div key={k}>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1">{label}</p>
                      <input value={activeCampaign[k]} placeholder="Nom Prénom"
                        onChange={e => setActiveCampaign(p => p && ({ ...p, [k]: e.target.value }))}
                        className={cn(inputCls, 'w-full')} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* VIEW: HISTORY                                                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {view === 'history' && (
        <div className="space-y-3">
          {campaigns.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
              <BarChart3 size={32} className="mx-auto mb-3 opacity-20" style={{ color: NAVY }} />
              <p className="font-semibold text-sm" style={{ color: NAVY }}>Aucun test réalisé</p>
              <p className="text-xs text-gray-400 mt-1">Les campagnes de test apparaîtront ici</p>
            </div>
          ) : (
            <>
              {/* KPI strip */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Tests réalisés', value: campaigns.length,               color: NAVY },
                  { label: 'Taux de réussite',
                    value: `${Math.round(campaigns.filter(c => c.verdict === 'pass').length / campaigns.length * 100)}%`,
                    color: '#15803D' },
                  { label: 'Dernier test',   value: campaigns[0]?.date ?? '—',      color: TEAL },
                ].map(k => (
                  <div key={k.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">{k.label}</p>
                    <p className="text-2xl font-bold font-mono" style={{ color: k.color }}>{k.value}</p>
                  </div>
                ))}
              </div>

              {/* Campaign list */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: NAVY }}>
                      {['Date', 'Équipe', 'Verdict', 'Étapes OK', 'Réalisé par', 'Témoin', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-widest text-white/80">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((c, i) => {
                      const ok  = c.stepResults.filter(r => r.result === 'oui' || r.conformant === true).length
                      const tot = c.stepResults.length
                      const vCfg = c.verdict === 'pass' ? { label: 'PASS', bg: '#DCFCE7', color: '#15803D' } :
                                   c.verdict === 'fail' ? { label: 'FAIL', bg: '#FEF2F2', color: '#DC2626' } :
                                   c.verdict === 'conditional' ? { label: 'COND.', bg: '#FEF9C3', color: '#92400E' } :
                                   { label: '—', bg: '#F3F4F6', color: '#9CA3AF' }
                      return (
                        <tr key={c.id} className={cn('border-b border-gray-50 hover:bg-blue-50/20 transition-colors', i % 2 === 1 && 'bg-gray-50/30')}>
                          <td className="px-4 py-3 font-mono text-gray-700">{c.date}</td>
                          <td className="px-4 py-3 text-gray-600">{c.team || '—'}</td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded border"
                              style={{ background: vCfg.bg, color: vCfg.color, borderColor: vCfg.color + '30' }}
                            >{vCfg.label}</span>
                          </td>
                          <td className="px-4 py-3 font-mono">
                            <span className={ok === tot ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>{ok}</span>
                            <span className="text-gray-400">/{tot}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{c.conductedBy || '—'}</td>
                          <td className="px-4 py-3 text-gray-600">{c.witnessedBy || '—'}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => { setActiveCampaign(c); setView('execution') }}
                              className="text-[10px] font-semibold transition-colors hover:underline"
                              style={{ color: TEAL }}
                            >Voir →</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    {/* PDF Export modal */}
      {showExport && (
        <ProofTestPDFExport
          sif={sif}
          project={project}
          procedure={procedure}
          campaigns={campaigns}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  )
}