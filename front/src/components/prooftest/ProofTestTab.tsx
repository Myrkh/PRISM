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
import { BORDER, CARD_BG, NAVY, TEAL, TEXT, TEXT_DIM } from '@/styles/tokens'
import {
  type StepResultValue, type PTStep, type PTStepResult, type PTCategory, type PTCampaign,
  type PTProcedure, type Verdict, type ResultType,
  LOCATIONS, CAT_META, STATUS_CFG, inputCls, defaultProcedure, checkConformance,
} from '@/components/prooftest/proofTestTypes'

// ─── ProofTestRightPanel props are passed via useLayout hook (see useEffect below) ───
const TABLE_BG = '#14181C'
const TABLE_HEAD_BG = '#1D232A'
const TABLE_HOVER_BG = 'rgba(255,255,255,0.02)'

// ─── Result badge ─────────────────────────────────────────────────────────
function ResultBadge({ r }: { r: StepResultValue }) {
  if (r === 'oui') return <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border" style={{ color: '#4ADE80', background: '#052E16', borderColor: '#15803D30' }}><CheckCircle2 size={9} />OUI</span>
  if (r === 'non') return <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border" style={{ color: '#F87171', background: '#2A1215', borderColor: '#7F1D1D55' }}><XCircle size={9} />NON</span>
  if (r === 'na')  return <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border" style={{ color: TEXT_DIM, background: '#1D232A', borderColor: BORDER }}><Minus size={9} />N/A</span>
  return <span className="text-[10px]" style={{ color: TEXT_DIM }}>—</span>
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
        {(['oui', 'non', 'na'] as StepResultValue[]).map(v => (
          <button key={v as string}
            onClick={() => onChange({ result: r === v ? null : v })}
            className={cn(
              'text-[9px] font-bold px-2 py-0.5 rounded border transition-all',
              r === v && v === 'oui' ? 'bg-emerald-500 text-white border-emerald-500' :
              r === v && v === 'non' ? 'bg-red-500 text-white border-red-500' :
              r === v && v === 'na'  ? 'text-white' :
              'text-[#8FA0B1]',
            )}
            style={r === v && v === 'na'
              ? { background: '#4B5563', borderColor: '#4B5563' }
              : r !== v
                ? { background: '#1D232A', borderColor: BORDER }
                : undefined}
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
            'w-28 text-xs h-7 px-2 rounded-lg border bg-[#1D232A] text-[#DFE8F1] focus:outline-none focus:ring-1 transition-all',
            conformant === true  ? 'border-emerald-400 focus:ring-emerald-400/30' :
            conformant === false ? 'border-red-400 focus:ring-red-400/30' :
            'focus:ring-[#009BA4]/30 focus:border-[#009BA4]',
          )}
          style={conformant === null ? { borderColor: BORDER } : undefined}
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
      className="w-36 text-xs h-7 px-2 rounded-lg border bg-[#1D232A] text-[#DFE8F1] focus:outline-none focus:ring-1 focus:ring-[#009BA4]/30 focus:border-[#009BA4]"
      style={{ borderColor: BORDER }}
    />
  )
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
          style={{ background: '#2A1215', borderColor: '#7F1D1D55' }}
        >
          <AlertTriangle size={15} className="text-red-500 shrink-0" />
          <p className="text-xs font-medium" style={{ color: '#FCA5A5' }}>
            Test en retard de <strong>{daysOverdue} jours</strong> — dernier test : {lastCampaign?.date} · Périodicité : {procedure.periodicityMonths} mois
          </p>
        </div>
      )}

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between">
        {/* Nav tabs */}
        <div className="flex items-center gap-1 rounded-xl border p-1" style={{ background: '#1D232A', borderColor: BORDER }}>
          {([
            { id: 'procedure', label: 'Procédure', icon: ClipboardList },
            { id: 'execution', label: 'Exécution', icon: FlaskConical },
            { id: 'history',   label: 'Historique', icon: BarChart3 },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setView(id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                view === id ? 'text-white shadow-sm' : 'text-[#8FA0B1] hover:text-[#DFE8F1]',
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
                    className={cn(inputCls, 'px-3 text-[#8FA0B1] hover:text-red-500 cursor-pointer')}
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
                  className="h-8 px-3 text-xs font-semibold rounded-xl border text-[#8FA0B1] hover:border-[#009BA4] hover:text-[#009BA4] flex items-center gap-1.5 transition-all"
                  style={{ borderColor: BORDER, background: '#1D232A' }}
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
                className={cn(inputCls, 'px-3 text-[#8FA0B1] hover:text-red-500 cursor-pointer')}
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
            className="h-8 px-3 text-xs font-semibold rounded-xl border text-[#8FA0B1] hover:border-[#009BA4] hover:text-[#009BA4] flex items-center gap-1.5 transition-all"
            style={{ borderColor: BORDER, background: '#1D232A' }}
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
          <div className="rounded-2xl border shadow-sm p-5" style={{ background: CARD_BG, borderColor: BORDER }}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Procédure de test périodique</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded border"
                    style={{ background: sm.bg, color: sm.color, borderColor: sm.border }}
                  >{sm.label}</span>
                </div>
                {editMode ? (
                  <input value={procedure.ref} onChange={e => setProcedure(p => ({ ...p, ref: e.target.value }))}
                    className={cn(inputCls, 'w-56 font-mono font-bold text-sm mb-1')} />
                ) : (
                  <p className="font-mono font-bold text-sm" style={{ color: TEXT }}>{procedure.ref} · Rev. {procedure.revision}</p>
                )}
              </div>

              {/* Key params */}
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: TEXT_DIM }}>Périodicité</p>
                  {editMode ? (
                    <input type="number" value={procedure.periodicityMonths}
                      onChange={e => setProcedure(p => ({ ...p, periodicityMonths: Number(e.target.value) }))}
                      className={cn(inputCls, 'w-16 text-center font-mono font-bold text-base mt-0.5')} />
                  ) : (
                    <p className="font-mono font-bold text-lg" style={{ color: TEXT }}>{procedure.periodicityMonths}<span className="text-xs font-normal ml-0.5" style={{ color: TEXT_DIM }}>mois</span></p>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: TEXT_DIM }}>Tests réalisés</p>
                  <p className="font-mono font-bold text-lg" style={{ color: TEAL }}>{campaigns.length}</p>
                </div>
                {nextDue && (
                  <div className="text-center">
                    <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: TEXT_DIM }}>Prochain test</p>
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
              <div key={cat.id} className="rounded-2xl border shadow-sm overflow-hidden" style={{ background: TABLE_BG, borderColor: BORDER }}>

                {/* Category header */}
                <div className="flex items-center gap-3 px-5 py-3 border-b"
                  style={{ background: TABLE_HEAD_BG, borderColor: BORDER }}
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

                  <span className="text-[10px] font-semibold" style={{ color: TEXT_DIM }}>{steps.length} étape{steps.length !== 1 ? 's' : ''}</span>

                  {/* Delete test category */}
                  {editMode && cat.type === 'test' && (
                    <button onClick={() => deleteCategory(cat.id)}
                      className="p-1 rounded text-[#8FA0B1] hover:text-red-400 transition-colors"
                      title="Supprimer cette catégorie"
                    ><Trash2 size={12} /></button>
                  )}

                  {/* Collapse */}
                  <button onClick={() => setCollapsed(s => { const n = new Set(s); n.has(cat.id) ? n.delete(cat.id) : n.add(cat.id); return n })}
                    className="p-1 rounded text-[#8FA0B1] hover:text-[#DFE8F1] transition-colors"
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
                          <tr className="border-b" style={{ borderColor: BORDER, background: TABLE_HEAD_BG }}>
                            <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest w-8" style={{ color: TEXT_DIM }}>#</th>
                            <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Action</th>
                            <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest w-36" style={{ color: TEXT_DIM }}>Lieu</th>
                            <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest w-28" style={{ color: TEXT_DIM }}>Type résultat</th>
                            <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest w-44" style={{ color: TEXT_DIM }}>Résultat attendu</th>
                            {editMode && <th className="w-8" />}
                          </tr>
                        </thead>
                        <tbody>
                          {steps.map((step, si) => (
                            <tr
                              key={step.id}
                              className="border-b group transition-colors"
                              style={{ borderColor: BORDER }}
                              onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = TABLE_HOVER_BG }}
                              onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
                            >
                              <td className="px-4 py-2.5 font-mono font-bold text-[10px]" style={{ color: TEXT_DIM }}>
                                {si + 1}
                              </td>
                              <td className="px-4 py-2.5">
                                {editMode ? (
                                  <input value={step.action}
                                    onChange={e => updateStep(step.id, { action: e.target.value })}
                                    placeholder="Décrire l'action à réaliser…"
                                    className="w-full bg-transparent text-xs outline-none border-b border-transparent text-[#DFE8F1] focus:border-[#009BA4] py-0.5 placeholder:text-[#8FA0B1] transition-all"
                                  />
                                ) : (
                                  <span style={{ color: TEXT }}>{step.action || <span style={{ color: TEXT_DIM }}>—</span>}</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5">
                                {editMode ? (
                                  <select value={step.location}
                                    onChange={e => updateStep(step.id, { location: e.target.value })}
                                    className="w-full bg-transparent text-xs outline-none border-b border-transparent text-[#DFE8F1] focus:border-[#009BA4] py-0.5 transition-all"
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
                                    className="w-full bg-transparent text-xs outline-none border-b border-transparent text-[#DFE8F1] focus:border-[#009BA4] py-0.5 transition-all"
                                  >
                                    <option value="oui_non">Oui / Non</option>
                                    <option value="valeur">Valeur</option>
                                    <option value="personnalisé">Personnalisé</option>
                                  </select>
                                ) : (
                                  <span className="text-[10px] font-semibold" style={{ color: TEXT_DIM }}>
                                    {step.resultType === 'oui_non' ? 'Oui / Non' : step.resultType === 'valeur' ? 'Valeur' : 'Personnalisé'}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2.5">
                                {step.resultType === 'oui_non' ? (
                                  <span className="flex items-center gap-1">
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border" style={{ color: '#4ADE80', background: '#052E16', borderColor: '#15803D30' }}>OUI</span>
                                    <span className="text-[9px]" style={{ color: TEXT_DIM }}>ou</span>
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border" style={{ color: '#F87171', background: '#2A1215', borderColor: '#7F1D1D55' }}>NON</span>
                                  </span>
                                ) : editMode ? (
                                  <input value={step.expectedValue}
                                    onChange={e => updateStep(step.id, { expectedValue: e.target.value })}
                                    placeholder={step.resultType === 'valeur' ? 'ex: < 500 ms, ≥ 4 mA…' : 'Décrire le résultat attendu…'}
                                    className="w-full bg-transparent text-xs outline-none border-b border-transparent text-[#DFE8F1] focus:border-[#009BA4] py-0.5 placeholder:text-[#8FA0B1] transition-all font-mono"
                                  />
                                ) : (
                                  <span className="font-mono text-[11px] font-semibold" style={{ color: TEXT }}>{step.expectedValue || <span style={{ color: TEXT_DIM }}>—</span>}</span>
                                )}
                              </td>
                              {editMode && (
                                <td className="px-2 py-2.5">
                                  <button onClick={() => deleteStep(step.id)}
                                    className="p-1 rounded text-[#8FA0B1] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
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
                      <div className="px-4 py-2 border-t border-dashed" style={{ borderColor: BORDER }}>
                        <button onClick={() => addStep(cat.id)}
                          className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
                          style={{ color: TEAL }}
                        >
                          <Plus size={12} />Ajouter une étape
                        </button>
                      </div>
                    )}

                    {steps.length === 0 && !editMode && (
                      <div className="px-4 py-4 text-xs text-center" style={{ color: TEXT_DIM }}>
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
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed text-sm font-semibold transition-all hover:border-[#009BA4] hover:text-[#009BA4]"
              style={{ color: TEXT_DIM, borderColor: BORDER, background: '#1D232A' }}
            >
              <Plus size={14} />Ajouter une catégorie de test
            </button>
          )}

          {/* Signatures */}
          <div className="rounded-2xl border shadow-sm p-5" style={{ background: CARD_BG, borderColor: BORDER }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: TEXT_DIM }}>Signatures de la procédure</p>
            <div className="grid grid-cols-3 gap-4">
              {[
                { key: 'madeBy' as const,     keyDate: 'madeByDate' as const,     label: 'Établi par' },
                { key: 'verifiedBy' as const,  keyDate: 'verifiedByDate' as const,  label: 'Vérifié par' },
                { key: 'approvedBy' as const,  keyDate: 'approvedByDate' as const,  label: 'Approuvé par' },
              ].map(({ key, keyDate, label }) => (
                <div key={key} className="border rounded-xl p-4 min-h-[80px]" style={{ borderColor: BORDER, background: '#1D232A' }}>
                  <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: TEXT_DIM }}>{label}</p>
                  {editMode ? (
                    <div className="space-y-1.5">
                      <input value={procedure[key]} onChange={e => setProcedure(p => ({ ...p, [key]: e.target.value }))}
                        placeholder="Nom Prénom" className={cn(inputCls, 'w-full h-7')} />
                      <input type="date" value={procedure[keyDate]} onChange={e => setProcedure(p => ({ ...p, [keyDate]: e.target.value }))}
                        className={cn(inputCls, 'w-full h-7')} />
                    </div>
                  ) : (
                    <>
                      <p className="text-xs font-semibold" style={{ color: TEXT }}>{procedure[key] || '_______________'}</p>
                      <p className="text-[10px] mt-1" style={{ color: TEXT_DIM }}>{procedure[keyDate] || 'Date / Signature'}</p>
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
            <div className="rounded-2xl border shadow-sm p-16 flex flex-col items-center justify-center gap-3 text-center" style={{ background: CARD_BG, borderColor: BORDER }}>
              <FlaskConical size={32} style={{ color: TEAL, opacity: 0.4 }} />
              <p className="font-semibold text-sm" style={{ color: TEXT }}>Aucun test en cours</p>
              <p className="text-xs" style={{ color: TEXT_DIM }}>Cliquez sur <strong>Nouveau test</strong> pour démarrer une campagne d'essai</p>
              <button onClick={() => setActiveCampaign(newCampaign())}
                className="mt-2 h-9 px-4 text-sm font-semibold text-white rounded-xl flex items-center gap-2"
                style={{ background: TEAL }}
              ><Plus size={14} />Nouveau test</button>
            </div>
          ) : (
            <>
              {/* Campaign meta */}
              <div className="rounded-2xl border shadow-sm p-5" style={{ background: CARD_BG, borderColor: BORDER }}>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: TEXT_DIM }}>Date du test</p>
                    <input type="date" value={activeCampaign.date}
                      onChange={e => setActiveCampaign(p => p && ({ ...p, date: e.target.value }))}
                      className={cn(inputCls, 'w-full')} />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: TEXT_DIM }}>Équipe / Référence</p>
                    <input value={activeCampaign.team} placeholder="ex: EQ-01 / Maintenance"
                      onChange={e => setActiveCampaign(p => p && ({ ...p, team: e.target.value }))}
                      className={cn(inputCls, 'w-full')} />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: TEXT_DIM }}>Verdict</p>
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
                            : { background: '#1D232A', color: TEXT_DIM, borderColor: BORDER }
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
                  <div key={cat.id} className="rounded-2xl border shadow-sm overflow-hidden" style={{ background: TABLE_BG, borderColor: BORDER }}>
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
                            <tr
                              key={step.id}
                              className="border-b transition-colors"
                              style={{ borderColor: BORDER }}
                              onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = TABLE_HOVER_BG }}
                              onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
                            >
                              <td className="px-4 py-3 font-mono font-bold text-[10px]" style={{ color: TEXT_DIM }}>{si + 1}</td>
                              <td className="px-4 py-3" style={{ color: TEXT }}>{step.action}</td>
                              <td className="px-4 py-3">
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                  style={{ background: `${NAVY}0D`, color: NAVY }}
                                >{step.location}</span>
                              </td>
                              <td className="px-4 py-3">
                                {step.resultType === 'oui_non' ? (
                                  <span className="flex items-center gap-1">
                                    <span className="text-[9px] font-bold px-1 rounded border" style={{ color: '#4ADE80', background: '#052E16', borderColor: '#15803D30' }}>OUI</span>
                                    <span className="text-[9px] font-bold px-1 rounded border" style={{ color: '#F87171', background: '#2A1215', borderColor: '#7F1D1D55' }}>NON</span>
                                  </span>
                                ) : (
                                  <span className="font-mono text-[11px] font-semibold" style={{ color: TEXT }}>{step.expectedValue || '—'}</span>
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
                                  className="w-full bg-transparent text-[10px] text-[#DFE8F1] outline-none border-b border-transparent focus:border-[#009BA4] py-0.5 placeholder:text-[#8FA0B1] transition-all"
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
              <div className="rounded-2xl border shadow-sm p-5" style={{ background: CARD_BG, borderColor: BORDER }}>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { k: 'conductedBy' as const, label: 'Réalisé par' },
                    { k: 'witnessedBy'  as const, label: 'Témoin'      },
                  ].map(({ k, label }) => (
                    <div key={k}>
                      <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: TEXT_DIM }}>{label}</p>
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
            <div className="rounded-2xl border shadow-sm p-16 text-center" style={{ background: CARD_BG, borderColor: BORDER }}>
              <BarChart3 size={32} className="mx-auto mb-3 opacity-20" style={{ color: NAVY }} />
              <p className="font-semibold text-sm" style={{ color: TEXT }}>Aucun test réalisé</p>
              <p className="text-xs mt-1" style={{ color: TEXT_DIM }}>Les campagnes de test apparaîtront ici</p>
            </div>
          ) : (
            <>
              {/* KPI strip */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Tests réalisés', value: campaigns.length,               color: TEXT },
                  { label: 'Taux de réussite',
                    value: `${Math.round(campaigns.filter(c => c.verdict === 'pass').length / campaigns.length * 100)}%`,
                    color: '#15803D' },
                  { label: 'Dernier test',   value: campaigns[0]?.date ?? '—',      color: TEAL },
                ].map(k => (
                  <div key={k.label} className="rounded-2xl border shadow-sm px-5 py-4" style={{ background: CARD_BG, borderColor: BORDER }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: TEXT_DIM }}>{k.label}</p>
                    <p className="text-2xl font-bold font-mono" style={{ color: k.color }}>{k.value}</p>
                  </div>
                ))}
              </div>

              {/* Campaign list */}
              <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ background: TABLE_BG, borderColor: BORDER }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: TABLE_HEAD_BG }}>
                      {['Date', 'Équipe', 'Verdict', 'Étapes OK', 'Réalisé par', 'Témoin', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map(c => {
                      const ok  = c.stepResults.filter(r => r.result === 'oui' || r.conformant === true).length
                      const tot = c.stepResults.length
                      const vCfg = c.verdict === 'pass' ? { label: 'PASS', bg: '#052E16', color: '#4ADE80', border: '#15803D30' } :
                                   c.verdict === 'fail' ? { label: 'FAIL', bg: '#2A1215', color: '#F87171', border: '#7F1D1D55' } :
                                   c.verdict === 'conditional' ? { label: 'COND.', bg: '#1C1500', color: '#F59E0B', border: '#B4530830' } :
                                   { label: '—', bg: '#1A1F24', color: '#8FA0B1', border: '#2A3138' }
                      return (
                        <tr
                          key={c.id}
                          className="border-b transition-colors"
                          style={{ borderColor: BORDER }}
                          onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = TABLE_HOVER_BG }}
                          onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
                        >
                          <td className="px-4 py-3 font-mono" style={{ color: TEXT }}>{c.date}</td>
                          <td className="px-4 py-3" style={{ color: TEXT }}>{c.team || '—'}</td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded border"
                              style={{ background: vCfg.bg, color: vCfg.color, borderColor: vCfg.border }}
                            >{vCfg.label}</span>
                          </td>
                          <td className="px-4 py-3 font-mono">
                            <span className={ok === tot ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>{ok}</span>
                            <span style={{ color: TEXT_DIM }}>/ {tot}</span>
                          </td>
                          <td className="px-4 py-3" style={{ color: TEXT }}>{c.conductedBy || '—'}</td>
                          <td className="px-4 py-3" style={{ color: TEXT }}>{c.witnessedBy || '—'}</td>
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
