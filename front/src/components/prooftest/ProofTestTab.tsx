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
  ArrowLeft, ArrowRight, Plus, Save, Pencil, AlertTriangle,
  ClipboardList, FlaskConical, BarChart3, Download,
} from 'lucide-react'
import { nanoid } from 'nanoid'
import { useAppStore } from '@/store/appStore'
import { useLayout } from '@/components/layout/SIFWorkbenchLayout'
import { ProofTestRightPanel } from '@/components/prooftest/ProofTestRightPanel'
import { ProofTestPDFExport } from '@/components/prooftest/ProofTestPDFExport'
import type { Project, SIF } from '@/core/types'
import type { SIFTab } from '@/store/types'
import { downloadRevisionArtifact } from '@/lib/revisionArtifacts'
import { cn } from '@/lib/utils'
import { usePrismTheme } from '@/styles/usePrismTheme'
import type {
  PTStep, PTStepResult, PTCampaign, PTProcedure, Verdict, PTResponseCheck, PTResponseMeasurement,
} from './proofTestTypes'
import {
  createDefaultCampaignArtifact,
  createResponseCheck,
  createResponseMeasurement,
  defaultProcedure,
  getResponseMeasurementStatus,
  inputCls,
  newPersistedId,
  syncResponseMeasurements,
} from './proofTestTypes'

// ── Views ────────────────────────────────────────────────────────────────
import { ProcedureView } from './ProcedureView'
import { CampaignExecutionView } from './CampaignExecutionView'
import { CampaignHistoryView } from './CampaignHistoryView'

// ─── ProofTestTab ─────────────────────────────────────────────────────────
type View = 'procedure' | 'execution' | 'history'

interface Props {
  project: Project
  sif: SIF
  onSelectTab?: (tab: SIFTab) => void
}

function normalizeProcedureState(sif: SIF, procedureRaw: unknown): PTProcedure {
  const fallback = defaultProcedure(sif)
  const source = typeof procedureRaw === 'object' && procedureRaw !== null ? procedureRaw as Partial<PTProcedure> : null
  if (!source || !Array.isArray(source.categories) || !Array.isArray(source.steps)) return fallback
  return {
    ...fallback,
    ...source,
    responseChecks: Array.isArray(source.responseChecks) ? source.responseChecks : [],
  }
}

function normalizeCampaignState(campaignRaw: unknown): PTCampaign | null {
  const source = typeof campaignRaw === 'object' && campaignRaw !== null ? campaignRaw as Partial<PTCampaign> : null
  if (!source || typeof source.id !== 'string') return null
  return {
    id: source.id,
    date: typeof source.date === 'string' ? source.date : '',
    team: typeof source.team === 'string' ? source.team : '',
    verdict: (source.verdict ?? null) as Verdict,
    notes: typeof source.notes === 'string' ? source.notes : '',
    stepResults: Array.isArray(source.stepResults) ? source.stepResults : [],
    responseMeasurements: Array.isArray(source.responseMeasurements) ? source.responseMeasurements : [],
    procedureSnapshot: typeof source.procedureSnapshot === 'object' && source.procedureSnapshot !== null
      ? source.procedureSnapshot as PTProcedure
      : null,
    pdfArtifact: typeof source.pdfArtifact === 'object' && source.pdfArtifact !== null
      ? { ...createDefaultCampaignArtifact(), ...source.pdfArtifact }
      : createDefaultCampaignArtifact(),
    closedAt: typeof source.closedAt === 'string' ? source.closedAt : null,
    conductedBy: typeof source.conductedBy === 'string' ? source.conductedBy : '',
    witnessedBy: typeof source.witnessedBy === 'string' ? source.witnessedBy : '',
  }
}

function computeCampaignVerdict(
  procedure: PTProcedure,
  stepResults: PTStepResult[],
  responseMeasurements: PTResponseMeasurement[],
  previousVerdict: Verdict,
): Verdict {
  if (stepResults.some(result => result.result === 'non' || result.conformant === false)) return 'fail'

  const hasResponseFailure = procedure.responseChecks.some(check => (
    getResponseMeasurementStatus(check, responseMeasurements.find(measurement => measurement.checkId === check.id)) === 'fail'
  ))
  if (hasResponseFailure) return 'fail'

  const allStepsCompleted = procedure.steps.every(step => (
    stepResults.some(result => result.stepId === step.id && result.result !== null)
  ))
  const allResponsesPassed = procedure.responseChecks.every(check => (
    getResponseMeasurementStatus(check, responseMeasurements.find(measurement => measurement.checkId === check.id)) === 'pass'
  ))

  if (allStepsCompleted && allResponsesPassed) return 'pass'
  return previousVerdict
}

export function ProofTestTab({ project, sif, onSelectTab }: Props) {
  const { BORDER, CARD_BG, PAGE_BG, NAVY, TEAL, TEXT, TEXT_DIM, SHADOW_CARD, SHADOW_SOFT, semantic } = usePrismTheme()
  const updateProofTestProcedure = useAppStore(s => s.updateProofTestProcedure)
  const addTestCampaign = useAppStore(s => s.addTestCampaign)
  const updateTestCampaign = useAppStore(s => s.updateTestCampaign)

  // ── State ──────────────────────────────────────────────────────────────
  const [procedure, setProcedure] = useState<PTProcedure>(() => normalizeProcedureState(sif, sif.proofTestProcedure))
  const [campaigns, setCampaigns]           = useState<PTCampaign[]>(() => {
    const stored = Array.isArray(sif.testCampaigns) ? sif.testCampaigns : []
    return stored.map(normalizeCampaignState).filter((campaign): campaign is PTCampaign => campaign !== null)
  })
  const [view, setView]                     = useState<View>('procedure')
  const [editMode, setEditMode]             = useState(false)
  const [activeCampaign, setActiveCampaign] = useState<PTCampaign | null>(null)
  const [collapsed, setCollapsed]           = useState<Set<string>>(new Set())
  const [showExport, setShowExport]         = useState(false)
  const [isSavingProcedure, setIsSavingProcedure] = useState(false)
  const [isSavingCampaign, setIsSavingCampaign] = useState(false)
  const isProcedureLocked = Boolean(sif.revisionLockedAt)

  useEffect(() => {
    setProcedure(normalizeProcedureState(sif, sif.proofTestProcedure))
  }, [sif.id, sif.proofTestProcedure])

  useEffect(() => {
    const stored = Array.isArray(sif.testCampaigns) ? sif.testCampaigns : []
    setCampaigns(stored.map(normalizeCampaignState).filter((campaign): campaign is PTCampaign => campaign !== null))
  }, [sif.id, sif.testCampaigns])

  useEffect(() => {
    if (isProcedureLocked) setEditMode(false)
  }, [isProcedureLocked])

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

  const addResponseCheck = () =>
    setProcedure(p => ({ ...p, responseChecks: [...p.responseChecks, createResponseCheck()] }))

  const updateResponseCheck = (id: string, patch: Partial<PTResponseCheck>) =>
    setProcedure(p => ({
      ...p,
      responseChecks: p.responseChecks.map(check => check.id === id ? { ...check, ...patch } : check),
    }))

  const removeResponseCheck = (id: string) =>
    setProcedure(p => ({
      ...p,
      responseChecks: p.responseChecks.filter(check => check.id !== id),
    }))

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
    responseMeasurements: syncResponseMeasurements(procedure.responseChecks, []),
    procedureSnapshot: null,
    pdfArtifact: createDefaultCampaignArtifact(),
    closedAt: null,
    conductedBy: '', witnessedBy: '',
  })

  const updateStepResult = (stepId: string, patch: Partial<PTStepResult>) => {
    if (!activeCampaign) return
    setActiveCampaign(prev => {
      if (!prev) return prev
      if (prev.closedAt) return prev
      const campaignProcedure = prev.procedureSnapshot ?? procedure
      const exists = prev.stepResults.find(r => r.stepId === stepId)
      const newResults = exists
        ? prev.stepResults.map(r => r.stepId === stepId ? { ...r, ...patch } : r)
        : [...prev.stepResults, { stepId, result: null, measuredValue: '', conformant: null, comment: '', ...patch }]
      const verdict = computeCampaignVerdict(campaignProcedure, newResults, prev.responseMeasurements, prev.verdict)
      return { ...prev, stepResults: newResults, verdict }
    })
  }

  const updateResponseMeasurement = (checkId: string, patch: Partial<PTResponseMeasurement>) => {
    if (!activeCampaign) return
    setActiveCampaign(prev => {
      if (!prev) return prev
      if (prev.closedAt) return prev
      const campaignProcedure = prev.procedureSnapshot ?? procedure
      const merged = syncResponseMeasurements(campaignProcedure.responseChecks, prev.responseMeasurements)
      const exists = merged.find(measurement => measurement.checkId === checkId)
      const responseMeasurements = exists
        ? merged.map(measurement => measurement.checkId === checkId ? { ...measurement, ...patch } : measurement)
        : [...merged, { ...createResponseMeasurement(checkId), ...patch }]
      const verdict = computeCampaignVerdict(campaignProcedure, prev.stepResults, responseMeasurements, prev.verdict)
      return { ...prev, responseMeasurements, verdict }
    })
  }

  const persistCampaign = async (closeCampaign: boolean) => {
    if (!activeCampaign) return
    const finalizedCampaign: PTCampaign = {
      ...activeCampaign,
      procedureSnapshot: JSON.parse(JSON.stringify(procedure)) as PTProcedure,
      pdfArtifact: activeCampaign.pdfArtifact ?? createDefaultCampaignArtifact(),
      closedAt: closeCampaign ? activeCampaign.closedAt ?? new Date().toISOString() : null,
    }
    const previousCampaigns = campaigns
    const exists = previousCampaigns.some(c => c.id === finalizedCampaign.id)
    const nextCampaigns = exists
      ? previousCampaigns.map(c => c.id === finalizedCampaign.id ? finalizedCampaign : c)
      : [finalizedCampaign, ...previousCampaigns]

    setIsSavingCampaign(true)
    setCampaigns(nextCampaigns)
    try {
      if (exists) await updateTestCampaign(project.id, sif.id, finalizedCampaign as any)
      else await addTestCampaign(project.id, sif.id, finalizedCampaign as any)
      if (closeCampaign) {
        setActiveCampaign(null)
        setView('history')
      } else {
        setActiveCampaign(finalizedCampaign)
      }
    } catch {
      setCampaigns(previousCampaigns)
    } finally {
      setIsSavingCampaign(false)
    }
  }

  const saveCampaign = async () => persistCampaign(true)
  const saveCampaignDraft = async () => persistCampaign(false)

  const updateActiveCampaign = (patch: Partial<PTCampaign>) =>
    setActiveCampaign(prev => prev ? { ...prev, ...patch } : prev)

  const executionProcedure = activeCampaign?.procedureSnapshot ?? procedure
  const executionCatsSorted = useMemo(() =>
    [...(executionProcedure.categories ?? [])].sort((a, b) => a.order - b.order),
  [executionProcedure.categories])
  const executionStepsFor = (catId: string) =>
    executionProcedure.steps.filter(step => step.categoryId === catId).sort((left, right) => left.order - right.order)

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
        sif={sif} view={view} procedure={executionProcedure} campaigns={campaigns}
        activeCampaign={activeCampaign} isOverdue={isOverdue}
        daysOverdue={daysOverdue} nextDue={nextDue}
        onSetView={setView} onSetActiveCampaign={setActiveCampaign}
        onUpdateActiveCampaign={updateActiveCampaign}
        onSaveCampaign={saveCampaign} onNewCampaign={newCampaign}
      />
    )
    return () => setRightPanelOverride(null)
  }, [view, executionProcedure, campaigns, activeCampaign, isOverdue, daysOverdue, nextDue])

  // ── Render ─────────────────────────────────────────────────────────────
  const isActiveExecutionView = view === 'execution' && !!activeCampaign

  return (
    <div className="space-y-4">

      {/* Overdue alert */}
      {!isActiveExecutionView && isOverdue && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border"
          style={{ background: `${semantic.error}08`, borderColor: `${semantic.error}22`, boxShadow: SHADOW_SOFT }}>
          <AlertTriangle size={15} className="text-red-500 shrink-0" />
          <p className="text-xs font-medium" style={{ color: TEXT }}>
            Test en retard de <strong>{daysOverdue} jours</strong> — dernier test : {lastCampaign?.date} · Périodicité : {procedure.periodicityMonths} mois
          </p>
        </div>
      )}

      {!isActiveExecutionView && isProcedureLocked && view === 'procedure' && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border"
          style={{ background: `${NAVY}10`, borderColor: `${NAVY}24`, boxShadow: SHADOW_SOFT }}>
          <AlertTriangle size={15} className="shrink-0" style={{ color: NAVY }} />
          <p className="text-xs font-medium" style={{ color: TEXT }}>
            Procédure figée sur la révision publiée. L exécution et l historique des campagnes restent disponibles.
          </p>
        </div>
      )}

      {isActiveExecutionView ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-4" style={{ background: CARD_BG, borderColor: BORDER, boxShadow: SHADOW_CARD }}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Campagne active</p>
            <p className="mt-1 text-sm font-bold" style={{ color: TEXT }}>
              {sif.sifNumber} | Campagne PT-{activeCampaign.date || 'en-cours'} en cours
            </p>
            <p className="mt-1 text-[11px]" style={{ color: TEXT_DIM }}>
              {activeCampaign.team || 'Equipe non renseignee'} · {activeCampaign.verdict ? activeCampaign.verdict.toUpperCase() : 'Verdict en cours'}
            </p>
          </div>
          <button
            onClick={() => setView('history')}
            className="h-8 px-3 text-xs font-semibold rounded-xl border hover:border-[#009BA4] hover:text-[#009BA4] transition-all"
            style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT_DIM }}
          >
            Suspendre
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-2xl border p-1" style={{ background: PAGE_BG, borderColor: BORDER, boxShadow: SHADOW_SOFT }}>
            {([
              { id: 'procedure' as View, label: 'Procedure', icon: ClipboardList },
              { id: 'execution' as View, label: 'Execution', icon: FlaskConical },
              { id: 'history'   as View, label: 'Historique', icon: BarChart3 },
            ]).map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setView(id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                  view === id ? 'text-white shadow-sm' : '',
                )}
                style={view === id ? { background: NAVY } : { color: TEXT_DIM }}
              ><Icon size={12} />{label}</button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {view === 'procedure' && (editMode ? (
              <>
                <button onClick={() => setEditMode(false)}
                  className={cn(inputCls, 'px-3 hover:text-red-500 cursor-pointer')}
                  style={{ color: TEXT_DIM }}>Annuler</button>
                <button onClick={saveProcedure}
                  disabled={isSavingProcedure}
                  className="h-8 px-4 text-xs font-semibold text-white rounded-xl flex items-center gap-1.5 shadow-sm"
                  style={{ background: NAVY }}><Save size={12} />{isSavingProcedure ? 'Sauvegarde…' : 'Sauvegarder'}</button>
              </>
            ) : (
              <button onClick={() => setEditMode(true)}
                disabled={isProcedureLocked}
                className="h-8 px-3 text-xs font-semibold rounded-xl border hover:border-[#009BA4] hover:text-[#009BA4] flex items-center gap-1.5 transition-all"
                style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT_DIM }}><Pencil size={12} />{isProcedureLocked ? 'Figee' : 'Modifier'}</button>
            ))}
            {view === 'execution' && !activeCampaign && (
              <button onClick={() => setActiveCampaign(newCampaign())}
                className="h-8 px-4 text-xs font-semibold text-white rounded-xl flex items-center gap-1.5 shadow-sm"
                style={{ background: TEAL }}><Plus size={13} />Lancer campagne</button>
            )}
            {view === 'execution' && activeCampaign && activeCampaign.closedAt && (
              <button onClick={() => setActiveCampaign(null)}
                className={cn(inputCls, 'px-3 cursor-pointer')}
                style={{ color: TEXT_DIM }}>Fermer</button>
            )}
            <button onClick={() => setShowExport(true)}
              className="h-8 px-3 text-xs font-semibold rounded-xl border hover:border-[#009BA4] hover:text-[#009BA4] flex items-center gap-1.5 transition-all"
              style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT_DIM }}><Download size={12} />PDF</button>
          </div>
        </div>
      )}

      {/* ── View content ── */}
      {view === 'procedure' && (
        <ProcedureView
          procedure={procedure} setProcedure={setProcedure} campaigns={campaigns}
          editMode={editMode} collapsed={collapsed} setCollapsed={setCollapsed}
          isOverdue={isOverdue} daysOverdue={daysOverdue} nextDue={nextDue}
          catsSorted={catsSorted} stepsFor={stepsFor}
          updateStep={updateStep} addStep={addStep} deleteStep={deleteStep}
          addTestCategory={addTestCategory} deleteCategory={deleteCategory} updateCategory={updateCategory}
          addResponseCheck={addResponseCheck}
          updateResponseCheck={updateResponseCheck}
          removeResponseCheck={removeResponseCheck}
        />
      )}

      {view === 'execution' && (
        <CampaignExecutionView
          activeCampaign={activeCampaign} setActiveCampaign={setActiveCampaign}
          catsSorted={executionCatsSorted} stepsFor={executionStepsFor} responseChecks={executionProcedure.responseChecks}
          updateStepResult={updateStepResult}
          updateResponseMeasurement={updateResponseMeasurement}
          onNewCampaign={() => setActiveCampaign(newCampaign())}
        />
      )}

      {view === 'history' && (
        <CampaignHistoryView
          campaigns={campaigns}
          onDownloadCampaignPdf={campaign => downloadRevisionArtifact(campaign.pdfArtifact)}
          onViewCampaign={(c) => { setActiveCampaign(c); setView('execution') }}
        />
      )}

      <div className="rounded-2xl border px-4 py-3" style={{ background: CARD_BG, borderColor: BORDER }}>
        {isActiveExecutionView ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              onClick={() => setActiveCampaign(null)}
              className={cn(inputCls, 'px-3 hover:text-red-500 cursor-pointer')}
              style={{ color: TEXT_DIM }}
            >
              Annuler
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => { void saveCampaignDraft() }}
                disabled={isSavingCampaign}
                className="h-8 px-4 text-xs font-semibold rounded-xl border hover:border-[#009BA4] hover:text-[#009BA4] transition-all disabled:opacity-60"
                style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT_DIM }}
              >
                {isSavingCampaign ? 'Sauvegarde…' : 'Sauver'}
              </button>
              <button
                onClick={() => { void saveCampaign() }}
                disabled={isSavingCampaign}
                className="h-8 px-4 text-xs font-semibold text-white rounded-xl flex items-center gap-1.5 shadow-sm disabled:opacity-60"
                style={{ background: NAVY }}
              >
                Cloturer test
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              onClick={() => onSelectTab?.('verification')}
              className="h-8 px-3 text-xs font-semibold rounded-xl border hover:border-[#009BA4] hover:text-[#009BA4] transition-all"
              style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT_DIM }}
            >
              <span className="inline-flex items-center gap-1.5">
                <ArrowLeft size={12} />
                Retour Verification
              </span>
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowExport(true)}
                className="h-8 px-3 text-xs font-semibold rounded-xl border hover:border-[#009BA4] hover:text-[#009BA4] transition-all"
                style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT_DIM }}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Download size={12} />
                  Exporter PDF
                </span>
              </button>
              <button
                onClick={() => {
                  setView('execution')
                  if (!activeCampaign) setActiveCampaign(newCampaign())
                }}
                className="h-8 px-4 text-xs font-semibold text-white rounded-xl flex items-center gap-1.5 shadow-sm"
                style={{ background: TEAL }}
              >
                {activeCampaign ? 'Reprendre campagne' : 'Lancer campagne'}
                <ArrowRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PDF Export modal */}
      {showExport && (
        <ProofTestPDFExport sif={sif} project={project} procedure={procedure}
          campaigns={campaigns} onClose={() => setShowExport(false)} />
      )}
    </div>
  )
}
