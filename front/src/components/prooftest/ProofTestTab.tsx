/**
 * ProofTestTab — PRISM (refactored)
 *
 * Orchestrator for proof test management.
 * Delegates rendering to:
 *   – ProcedureView.tsx      (procedure editor)
 *   – CampaignExecutionView.tsx (active campaign execution)
 *   – CampaignHistoryView.tsx   (past campaigns + KPIs)
 *   – ResultWidgets.tsx       (shared result badges/inputs)
 */
import { useMemo, useState, useEffect } from 'react'
import {
  Plus, Save, Pencil, AlertTriangle,
  ClipboardList, FlaskConical, BarChart3, Download,
} from 'lucide-react'
import { nanoid } from 'nanoid'
import { useAppStore } from '@/store/appStore'
import { useLayout } from '@/components/layout/SIFWorkbenchLayout'
import { ProofTestRightPanel } from '@/components/prooftest/ProofTestRightPanel'
import { ProofTestPDFExport } from '@/components/prooftest/ProofTestPDFExport'
import type { Project, SIF } from '@/core/types'
import { cn } from '@/lib/utils'
import { BORDER, NAVY, TEAL, TEXT_DIM } from '@/styles/tokens'
import type { PTStep, PTStepResult, PTCampaign, PTProcedure, Verdict } from './proofTestTypes'
import { inputCls, defaultProcedure, newPersistedId } from './proofTestTypes'

// ── Views ────────────────────────────────────────────────────────────────
import { ProcedureView } from './ProcedureView'
import { CampaignExecutionView } from './CampaignExecutionView'
import { CampaignHistoryView } from './CampaignHistoryView'

// ─── ProofTestTab ─────────────────────────────────────────────────────────
type View = 'procedure' | 'execution' | 'history'

interface Props { project: Project; sif: SIF }

export function ProofTestTab({ project, sif }: Props) {
  const updateProofTestProcedure = useAppStore(s => s.updateProofTestProcedure)
  const addTestCampaign = useAppStore(s => s.addTestCampaign)
  const updateTestCampaign = useAppStore(s => s.updateTestCampaign)

  // ── State ──────────────────────────────────────────────────────────────
  const [procedure, setProcedure] = useState<PTProcedure>(() => {
    const stored = sif.proofTestProcedure as unknown as PTProcedure | undefined
    if (stored && Array.isArray(stored.categories) && Array.isArray(stored.steps)) return stored
    return defaultProcedure(sif)
  })
  const [campaigns, setCampaigns]           = useState<PTCampaign[]>(() => {
    const stored = sif.testCampaigns as unknown as PTCampaign[] | undefined
    return Array.isArray(stored) ? stored : []
  })
  const [view, setView]                     = useState<View>('procedure')
  const [editMode, setEditMode]             = useState(false)
  const [activeCampaign, setActiveCampaign] = useState<PTCampaign | null>(null)
  const [collapsed, setCollapsed]           = useState<Set<string>>(new Set())
  const [showExport, setShowExport]         = useState(false)
  const [isSavingProcedure, setIsSavingProcedure] = useState(false)
  const [isSavingCampaign, setIsSavingCampaign] = useState(false)

  useEffect(() => {
    const stored = sif.proofTestProcedure as unknown as PTProcedure | undefined
    if (stored && Array.isArray(stored.categories) && Array.isArray(stored.steps)) {
      setProcedure(stored)
      return
    }
    setProcedure(defaultProcedure(sif))
  }, [sif.id, sif.proofTestProcedure])

  useEffect(() => {
    const stored = sif.testCampaigns as unknown as PTCampaign[] | undefined
    setCampaigns(Array.isArray(stored) ? stored : [])
  }, [sif.id, sif.testCampaigns])

  // ── Procedure helpers ──────────────────────────────────────────────────
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
    const newCats = [...procedure.categories, {
      id: nanoid(), type: 'test' as const,
      title: `Test ${existingTests + 1}`,
      order: finalOrder - 0.5,
    }].sort((a, b) => a.order - b.order).map((c, i) => ({ ...c, order: i }))
    setProcedure(p => ({ ...p, categories: newCats }))
  }

  const deleteCategory = (id: string) =>
    setProcedure(p => ({
      ...p,
      categories: p.categories.filter(c => c.id !== id),
      steps: p.steps.filter(s => s.categoryId !== id),
    }))

  const updateCategory = (id: string, title: string) =>
    setProcedure(p => ({ ...p, categories: p.categories.map(c => c.id === id ? { ...c, title } : c) }))

  const saveProcedure = async () => {
    setIsSavingProcedure(true)
    try {
      await updateProofTestProcedure(project.id, sif.id, procedure as any)
      setEditMode(false)
    } catch {
      // syncError is surfaced by the store banner
    } finally {
      setIsSavingProcedure(false)
    }
  }

  // ── Campaign helpers ───────────────────────────────────────────────────
  const newCampaign = (): PTCampaign => ({
    id: newPersistedId(),
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
      const done = newResults.filter(r => r.result !== null).length
      const fails = newResults.filter(r => r.result === 'non').length
      const verdict: Verdict = done === procedure.steps.length
        ? fails > 0 ? 'fail' : 'pass'
        : prev.verdict
      return { ...prev, stepResults: newResults, verdict }
    })
  }

  const saveCampaign = async () => {
    if (!activeCampaign) return
    const previousCampaigns = campaigns
    const exists = previousCampaigns.some(c => c.id === activeCampaign.id)
    const nextCampaigns = exists
      ? previousCampaigns.map(c => c.id === activeCampaign.id ? activeCampaign : c)
      : [activeCampaign, ...previousCampaigns]

    setIsSavingCampaign(true)
    setCampaigns(nextCampaigns)
    try {
      await updateProofTestProcedure(project.id, sif.id, procedure as any)
      if (exists) await updateTestCampaign(project.id, sif.id, activeCampaign as any)
      else await addTestCampaign(project.id, sif.id, activeCampaign as any)
      setActiveCampaign(null)
      setView('history')
    } catch {
      setCampaigns(previousCampaigns)
    } finally {
      setIsSavingCampaign(false)
    }
  }

  const updateActiveCampaign = (patch: Partial<PTCampaign>) =>
    setActiveCampaign(prev => prev ? { ...prev, ...patch } : prev)

  // ── Overdue check ──────────────────────────────────────────────────────
  const lastCampaign = campaigns[0]
  const nextDue = lastCampaign
    ? new Date(new Date(lastCampaign.date).getTime() + procedure.periodicityMonths * 30.44 * 86400000)
    : null
  const daysOverdue = nextDue ? Math.floor((Date.now() - nextDue.getTime()) / 86400000) : null
  const isOverdue = daysOverdue !== null && daysOverdue > 0

  // ── Right panel mount ──────────────────────────────────────────────────
  const { setRightPanelOverride } = useLayout()
  useEffect(() => {
    setRightPanelOverride(
      <ProofTestRightPanel
        sif={sif} view={view} procedure={procedure} campaigns={campaigns}
        activeCampaign={activeCampaign} isOverdue={isOverdue}
        daysOverdue={daysOverdue} nextDue={nextDue}
        onSetView={setView} onSetActiveCampaign={setActiveCampaign}
        onUpdateActiveCampaign={updateActiveCampaign}
        onSaveCampaign={saveCampaign} onNewCampaign={newCampaign}
      />
    )
    return () => setRightPanelOverride(null)
  }, [view, procedure, campaigns, activeCampaign, isOverdue, daysOverdue, nextDue])

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Overdue alert */}
      {isOverdue && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border"
          style={{ background: '#2A1215', borderColor: '#7F1D1D55' }}>
          <AlertTriangle size={15} className="text-red-500 shrink-0" />
          <p className="text-xs font-medium" style={{ color: '#FCA5A5' }}>
            Test en retard de <strong>{daysOverdue} jours</strong> — dernier test : {lastCampaign?.date} · Périodicité : {procedure.periodicityMonths} mois
          </p>
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between">
        {/* Nav tabs */}
        <div className="flex items-center gap-1 rounded-xl border p-1" style={{ background: '#1D232A', borderColor: BORDER }}>
          {([
            { id: 'procedure' as View, label: 'Procédure', icon: ClipboardList },
            { id: 'execution' as View, label: 'Exécution', icon: FlaskConical },
            { id: 'history'   as View, label: 'Historique', icon: BarChart3 },
          ]).map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setView(id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                view === id ? 'text-white shadow-sm' : 'text-[#8FA0B1] hover:text-[#DFE8F1]',
              )}
              style={view === id ? { background: NAVY } : undefined}
            ><Icon size={12} />{label}</button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {view === 'procedure' && (editMode ? (
            <>
              <button onClick={() => setEditMode(false)}
                className={cn(inputCls, 'px-3 text-[#8FA0B1] hover:text-red-500 cursor-pointer')}>Annuler</button>
              <button onClick={saveProcedure}
                disabled={isSavingProcedure}
                className="h-8 px-4 text-xs font-semibold text-white rounded-xl flex items-center gap-1.5 shadow-sm"
                style={{ background: NAVY }}><Save size={12} />{isSavingProcedure ? 'Sauvegarde…' : 'Sauvegarder'}</button>
            </>
          ) : (
            <button onClick={() => setEditMode(true)}
              className="h-8 px-3 text-xs font-semibold rounded-xl border text-[#8FA0B1] hover:border-[#009BA4] hover:text-[#009BA4] flex items-center gap-1.5 transition-all"
              style={{ borderColor: BORDER, background: '#1D232A' }}><Pencil size={12} />Modifier</button>
          ))}
          {view === 'execution' && !activeCampaign && (
            <button onClick={() => setActiveCampaign(newCampaign())}
              className="h-8 px-4 text-xs font-semibold text-white rounded-xl flex items-center gap-1.5 shadow-sm"
              style={{ background: TEAL }}><Plus size={13} />Nouveau test</button>
          )}
          {view === 'execution' && activeCampaign && (
            <>
              <button onClick={() => setActiveCampaign(null)}
                className={cn(inputCls, 'px-3 text-[#8FA0B1] hover:text-red-500 cursor-pointer')}>Annuler</button>
              <button onClick={saveCampaign}
                disabled={isSavingCampaign}
                className="h-8 px-4 text-xs font-semibold text-white rounded-xl flex items-center gap-1.5 shadow-sm"
                style={{ background: NAVY }}><Save size={12} />{isSavingCampaign ? 'Sauvegarde…' : 'Clôturer le test'}</button>
            </>
          )}
          <button onClick={() => setShowExport(true)}
            className="h-8 px-3 text-xs font-semibold rounded-xl border text-[#8FA0B1] hover:border-[#009BA4] hover:text-[#009BA4] flex items-center gap-1.5 transition-all"
            style={{ borderColor: BORDER, background: '#1D232A' }}><Download size={12} />PDF</button>
        </div>
      </div>

      {/* ── View content ── */}
      {view === 'procedure' && (
        <ProcedureView
          procedure={procedure} setProcedure={setProcedure} campaigns={campaigns}
          editMode={editMode} collapsed={collapsed} setCollapsed={setCollapsed}
          isOverdue={isOverdue} daysOverdue={daysOverdue} nextDue={nextDue}
          catsSorted={catsSorted} stepsFor={stepsFor}
          updateStep={updateStep} addStep={addStep} deleteStep={deleteStep}
          addTestCategory={addTestCategory} deleteCategory={deleteCategory} updateCategory={updateCategory}
        />
      )}

      {view === 'execution' && (
        <CampaignExecutionView
          activeCampaign={activeCampaign} setActiveCampaign={setActiveCampaign}
          catsSorted={catsSorted} stepsFor={stepsFor} updateStepResult={updateStepResult}
          onNewCampaign={() => setActiveCampaign(newCampaign())}
        />
      )}

      {view === 'history' && (
        <CampaignHistoryView
          campaigns={campaigns}
          onViewCampaign={(c) => { setActiveCampaign(c); setView('execution') }}
        />
      )}

      {/* PDF Export modal */}
      {showExport && (
        <ProofTestPDFExport sif={sif} project={project} procedure={procedure}
          campaigns={campaigns} onClose={() => setShowExport(false)} />
      )}
    </div>
  )
}
