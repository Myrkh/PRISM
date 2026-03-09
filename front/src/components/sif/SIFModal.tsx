/**
 * SIFModal — PRISM v3
 *
 * Corrections vs version précédente :
 *  ✓ shouldUnregister: false  → valeurs conservées entre onglets
 *  ✓ Onglets rendus display:block/none (jamais démontés)
 *  ✓ Bouton "Créer" toujours visible (pas besoin d'aller au dernier onglet)
 *  ✓ Plus de prop projectId — résolu depuis le store (newSIFProjectId)
 *  ✓ Sélecteur de projet si aucun contexte projet actif
 *  ✓ createSIF / updateSIF async avec loading + erreur
 */
import { useEffect, useState, forwardRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import {
  ClipboardList, Factory, ShieldCheck, X, Shield,
  ChevronRight, ChevronLeft, AlertTriangle, Check, Loader2, Folder,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import type { SIF, SIFStatus, SILLevel } from '@/core/types'
import { BORDER, CARD_BG, PAGE_BG, PANEL_BG, R, TEAL, TEAL_DIM, TEXT, TEXT_DIM, dark } from '@/styles/tokens'

const PANEL = dark.panel
const BG = dark.page
const CARD = dark.card

// ─── Design tokens ────────────────────────────────────────────────────────
const BORDER2  = '#363F49'
const SIL_CFG: Record<number, { color: string; bg: string; border: string; label: string; pfd: string }> = {
  1: { color: '#16A34A', bg: '#052E16', border: '#15803D', label: 'SIL 1', pfd: '10⁻² → 10⁻¹' },
  2: { color: '#2563EB', bg: '#0F1B3D', border: '#1D4ED8', label: 'SIL 2', pfd: '10⁻³ → 10⁻²' },
  3: { color: '#D97706', bg: '#1A1000', border: '#B45309', label: 'SIL 3', pfd: '10⁻⁴ → 10⁻³' },
  4: { color: '#7C3AED', bg: '#1E0540', border: '#7C3AED', label: 'SIL 4', pfd: '10⁻⁵ → 10⁻⁴' },
}

const ARCH_CFG = [
  { id: '1oo1',  label: '1oo1',  desc: 'Single channel',     hft: 0 },
  { id: '1oo2',  label: '1oo2',  desc: '1-out-of-2',         hft: 1 },
  { id: '2oo2',  label: '2oo2',  desc: '2-out-of-2',         hft: 0 },
  { id: '2oo3',  label: '2oo3',  desc: '2-out-of-3 voted',   hft: 1 },
  { id: '1oo2D', label: '1oo2D', desc: '1oo2 with diags.',   hft: 1 },
]

const STATUS_CFG: Record<SIFStatus, { color: string; label: string }> = {
  draft:     { color: '#6B7280', label: 'Draft'     },
  in_review: { color: '#F59E0B', label: 'In Review' },
  verified:  { color: '#0284C7', label: 'Verified'  },
  approved:  { color: '#16A34A', label: 'Approved'  },
  archived:  { color: '#9333EA', label: 'Archived'  },
}

const SIL_PFD_RANGE: Record<number, { min: number; max: number }> = {
  1: { min: 1e-2, max: 1e-1 },
  2: { min: 1e-3, max: 1e-2 },
  3: { min: 1e-4, max: 1e-3 },
  4: { min: 1e-5, max: 1e-4 },
}

type PanelTab = 'identification' | 'process' | 'traceability'
const TABS: { id: PanelTab; label: string; hint: string; Icon: React.ElementType }[] = [
  { id: 'identification', label: 'Identification', hint: 'Scope & statut',       Icon: ClipboardList },
  { id: 'process',        label: 'Process',         hint: 'Risques & demande',    Icon: Factory       },
  { id: 'traceability',   label: 'Traçabilité',     hint: 'Responsables & dates', Icon: ShieldCheck   },
]

type FormValues = Omit<SIF,
  'id' | 'projectId' | 'subsystems' | 'testCampaigns' |
  'operationalEvents' | 'hazopTrace' | 'proofTestProcedure' | 'assumptions'>

// ─── Sub-components ───────────────────────────────────────────────────────
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: TEXT_DIM }}>
      {children}{required && <span style={{ color: TEAL }} className="ml-1">*</span>}
    </label>
  )
}

const StyledInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }>(
  ({ error, ...props }, ref) => {
    return (
      <input
        {...props}
        ref={ref}
        className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all"
        style={{ background: BG, borderColor: error ? '#EF4444' : BORDER2, color: TEXT }}
        onFocus={e => (e.target.style.borderColor = TEAL)}
        onBlur={e => (e.target.style.borderColor = error ? '#EF4444' : BORDER2)}
      />
    )
  }
)
StyledInput.displayName = 'StyledInput'

const StyledTextarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  (props, ref) => {
    return (
      <textarea
        {...props}
        ref={ref}
        className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all resize-none"
        style={{ background: BG, borderColor: BORDER2, color: TEXT }}
        onFocus={e => (e.target.style.borderColor = TEAL)}
        onBlur={e => (e.target.style.borderColor = BORDER2)}
      />
    )
  }
)
StyledTextarea.displayName = 'StyledTextarea'

function StyledSelect({ value, onChange, options }: {
  value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full rounded-lg border px-3 py-2 text-sm outline-none appearance-none"
      style={{ background: BG, borderColor: BORDER2, color: TEXT }}
      onFocus={e => (e.target.style.borderColor = TEAL)}
      onBlur={e => (e.target.style.borderColor = BORDER2)}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────
export function SIFModal() {
  const isOpen          = useAppStore(s => s.isSIFModalOpen)
  const editingId       = useAppStore(s => s.editingSIFId)
  const newSIFProjectId = useAppStore(s => s.newSIFProjectId)
  const closeModal      = useAppStore(s => s.closeSIFModal)
  const createSIF       = useAppStore(s => s.createSIF)
  const updateSIF       = useAppStore(s => s.updateSIF)
  const navigate        = useAppStore(s => s.navigate)
  const projects        = useAppStore(s => s.projects)
  const view            = useAppStore(s => s.view)

  // Résolution du projet cible :
  // 1. newSIFProjectId (passé par openNewSIF(id))
  // 2. projet actif dans la vue courante
  // 3. premier projet de la liste
  const resolvedProjectId =
    newSIFProjectId ??
    (view.type === 'sif-dashboard' ? view.projectId : null) ??
    projects[0]?.id ??
    null

  // Sélecteur de projet si plusieurs projets et aucun contexte
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const effectiveProjectId = selectedProjectId ?? resolvedProjectId

  const project = effectiveProjectId ? projects.find(p => p.id === effectiveProjectId) : undefined
  const editing = editingId
    ? projects.flatMap(p => p.sifs).find(s => s.id === editingId)
    : undefined

  const editingProject = editing
    ? projects.find(p => p.sifs.some(s => s.id === editing.id))
    : undefined

  const targetProject = editingProject ?? project
  const nextRef = `SIF-${String((targetProject?.sifs.length ?? 0) + 1).padStart(3, '0')}`

  const [activeTab, setActiveTab] = useState<PanelTab>('identification')
  const [initArch, setInitArch]   = useState('1oo1')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // ── shouldUnregister: false ← FIX PRINCIPAL ──────────────────────────
  const { register, handleSubmit, reset, control, watch, formState: { errors } } =
    useForm<FormValues>({
      shouldUnregister: false,
      defaultValues: {
        sifNumber: '', revision: 'A', title: '', description: '',
        pid: '', location: '', processTag: '', hazardousEvent: '',
        demandRate: 0.1, targetSIL: 2 as SILLevel, rrfRequired: 100,
        madeBy: '', verifiedBy: '', approvedBy: '',
        date: new Date().toISOString().split('T')[0],
        status: 'draft' as SIFStatus,
      },
    })

  useEffect(() => {
    if (!isOpen) return
    setActiveTab('identification')
    setSubmitError(null)
    setSelectedProjectId(null)
    if (editing) {
      reset({
        sifNumber: editing.sifNumber, revision: editing.revision,
        title: editing.title, description: editing.description,
        pid: editing.pid, location: editing.location,
        processTag: editing.processTag, hazardousEvent: editing.hazardousEvent,
        demandRate: editing.demandRate, targetSIL: editing.targetSIL,
        rrfRequired: editing.rrfRequired, madeBy: editing.madeBy,
        verifiedBy: editing.verifiedBy, approvedBy: editing.approvedBy,
        date: editing.date, status: editing.status,
      })
    } else {
      reset({
        sifNumber: nextRef, revision: 'A', title: '', description: '',
        pid: '', location: '', processTag: '', hazardousEvent: '',
        demandRate: 0.1, targetSIL: 2 as SILLevel, rrfRequired: 100,
        madeBy: '', verifiedBy: '', approvedBy: '',
        date: new Date().toISOString().split('T')[0], status: 'draft' as SIFStatus,
      })
      setInitArch('1oo1')
    }
  }, [editing, isOpen, reset, nextRef])

  const onSubmit = async (data: FormValues) => {
    const pid = editing ? (editingProject?.id ?? '') : (effectiveProjectId ?? '')
    if (!pid) { setSubmitError('Aucun projet sélectionné'); return }

    setSubmitting(true)
    setSubmitError(null)
    try {
      if (editing) {
        await updateSIF(pid, editing.id, data)
        closeModal()
      } else {
        const sif = await createSIF(pid, { ...data, initArchitecture: initArch } as Partial<SIF>)
        closeModal()
        navigate({ type: 'sif-dashboard', projectId: pid, sifId: sif.id, tab: 'architecture' })
      }
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  const watchedSIL    = watch('targetSIL') as number
  const watchedStatus = watch('status') as SIFStatus
  const activeIdx     = TABS.findIndex(t => t.id === activeTab)

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) closeModal() }}
    >
      <div
        className="relative flex flex-col rounded-2xl border shadow-2xl"
        style={{
          background: PANEL, borderColor: BORDER,
          width: '100%', maxWidth: 720, maxHeight: '90vh',
          boxShadow: `0 0 0 1px ${BORDER}, 0 24px 60px rgba(0,0,0,0.6)`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 shrink-0"
          style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${TEAL}20`, border: `1px solid ${TEAL}40` }}>
              <Shield size={18} style={{ color: TEAL }} />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: TEXT }}>
                {editing ? `Modifier ${editing.sifNumber}` : 'Nouvelle SIF'}
              </h2>
              <p className="text-[11px]" style={{ color: TEXT_DIM }}>
                {targetProject?.name ?? 'Sélectionner un projet'} · Safety Instrumented Function
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold"
              style={{
                background: `${STATUS_CFG[watchedStatus]?.color}18`,
                border: `1px solid ${STATUS_CFG[watchedStatus]?.color}40`,
                color: STATUS_CFG[watchedStatus]?.color,
              }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_CFG[watchedStatus]?.color }} />
              {STATUS_CFG[watchedStatus]?.label}
            </div>
            <button onClick={closeModal} style={{ color: TEXT_DIM }}
              className="rounded-lg p-1.5 transition-colors"
              onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
              onMouseLeave={e => (e.currentTarget.style.color = TEXT_DIM)}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Sélecteur de projet (si plusieurs projets et création) ── */}
        {!editing && projects.length > 1 && (
          <div className="px-6 pt-3 shrink-0">
            <div className="flex items-center gap-3 rounded-xl border p-3"
              style={{ background: BG, borderColor: effectiveProjectId ? `${TEAL}40` : BORDER2 }}>
              <Folder size={14} style={{ color: effectiveProjectId ? TEAL : TEXT_DIM }} />
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: TEXT_DIM }}>
                  Projet cible
                </p>
                <select
                  value={effectiveProjectId ?? ''}
                  onChange={e => setSelectedProjectId(e.target.value || null)}
                  className="w-full bg-transparent text-sm outline-none appearance-none"
                  style={{ color: effectiveProjectId ? TEXT : TEXT_DIM }}>
                  <option value="">— Sélectionner un projet —</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab bar intercalaire ── */}
        <div className="px-6 pt-4 shrink-0">
          <div className="flex items-end" style={{ borderBottom: `1px solid ${BORDER}` }}>
            {TABS.map((tab) => {
              const isActive = tab.id === activeTab
              return (
                <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-2 px-4 py-2.5 text-left transition-all shrink-0"
                  style={isActive ? {
                    background: CARD, color: TEAL_DIM,
                    borderTop: `1px solid ${BORDER}`, borderLeft: `1px solid ${BORDER}`,
                    borderRight: `1px solid ${BORDER}`, borderBottom: `1px solid ${CARD}`,
                    borderRadius: `${R}px ${R}px 0 0`, marginBottom: '-1px', zIndex: 10,
                  } : { color: TEXT_DIM }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = TEXT }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = TEXT_DIM }}>
                  <tab.Icon size={13} />
                  <div>
                    <p className="text-[12px] font-semibold leading-tight">{tab.label}</p>
                    <p className="text-[9px] leading-tight opacity-60">{tab.hint}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          {/* Tous les onglets montés simultanément (display:block/none)
              pour que register() ne démonte jamais ses champs. */}
          <div className="flex-1 overflow-y-auto"
            style={{
              background: CARD, margin: '0 24px',
              borderLeft: `1px solid ${BORDER}`, borderRight: `1px solid ${BORDER}`,
              borderRadius: `${activeIdx === 0 ? 0 : R}px ${activeIdx === TABS.length - 1 ? 0 : R}px ${R}px ${R}px`,
            }}>

            {/* ══ IDENTIFICATION ══ */}
            <div className="p-6 space-y-5" style={{ display: activeTab === 'identification' ? 'block' : 'none' }}>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <FieldLabel required>Numéro SIF</FieldLabel>
                  <StyledInput placeholder={nextRef} error={!!errors.sifNumber}
                    {...register('sifNumber', { required: 'Requis' })} />
                </div>
                <div>
                  <FieldLabel>Révision</FieldLabel>
                  <StyledInput placeholder="A" {...register('revision')} />
                </div>
                <div>
                  <FieldLabel>Date</FieldLabel>
                  <StyledInput type="date" {...register('date')} />
                </div>
              </div>

              <div>
                <FieldLabel required>Titre de la SIF</FieldLabel>
                <StyledInput
                  placeholder="Ex. Très haut niveau LSHH001, fermeture vanne XVS001"
                  error={!!errors.title}
                  {...register('title', { required: 'Requis' })}
                />
                {errors.title && <p className="text-[10px] mt-1" style={{ color: '#EF4444' }}>{errors.title.message}</p>}
              </div>

              <div>
                <FieldLabel>Description</FieldLabel>
                <StyledTextarea rows={2}
                  placeholder="Description détaillée de la fonction instrumentée de sécurité…"
                  {...register('description')} />
              </div>

              {/* SIL selector — visual cards */}
              <div>
                <FieldLabel required>SIL Cible</FieldLabel>
                <Controller name="targetSIL" control={control} render={({ field }) => (
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map(sil => {
                      const cfg = SIL_CFG[sil]
                      const sel = Number(field.value) === sil
                      return (
                        <button key={sil} type="button"
                          onClick={() => field.onChange(sil as SILLevel)}
                          className="relative rounded-xl border p-3 text-center transition-all"
                          style={sel ? { background: cfg.bg, borderColor: cfg.border, boxShadow: `0 0 16px ${cfg.color}30` }
                            : { background: BG, borderColor: BORDER2 }}>
                          {sel && (
                            <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                              style={{ background: cfg.color }}>
                              <Check size={9} color="#fff" />
                            </div>
                          )}
                          <p className="text-sm font-black mb-0.5" style={{ color: sel ? cfg.color : TEXT_DIM }}>{cfg.label}</p>
                          <p className="text-[9px] font-mono" style={{ color: sel ? `${cfg.color}90` : '#4B5563' }}>
                            PFD {cfg.pfd}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                )} />
              </div>

              {/* Statut + Architecture initiale */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Statut</FieldLabel>
                  <Controller name="status" control={control} render={({ field }) => (
                    <StyledSelect value={field.value} onChange={field.onChange}
                      options={[
                        { value: 'draft',     label: 'Draft'     },
                        { value: 'in_review', label: 'In Review' },
                        { value: 'verified',  label: 'Verified'  },
                        { value: 'approved',  label: 'Approved'  },
                      ]} />
                  )} />
                </div>
                {!editing && (
                  <div>
                    <FieldLabel>Architecture initiale</FieldLabel>
                    <div className="flex gap-1.5 flex-wrap">
                      {ARCH_CFG.map(a => (
                        <button key={a.id} type="button"
                          onClick={() => setInitArch(a.id)}
                          title={`${a.desc} · HFT=${a.hft}`}
                          className="rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-all"
                          style={initArch === a.id
                            ? { background: `${TEAL}18`, borderColor: TEAL, color: TEAL_DIM }
                            : { background: BG, borderColor: BORDER2, color: TEXT_DIM }}>
                          {a.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[9px] mt-1.5" style={{ color: TEXT_DIM }}>
                      {ARCH_CFG.find(a => a.id === initArch)?.desc} · HFT={ARCH_CFG.find(a => a.id === initArch)?.hft}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ══ PROCESS ══ */}
            <div className="p-6 space-y-5" style={{ display: activeTab === 'process' ? 'block' : 'none' }}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Référence P&amp;ID</FieldLabel>
                  <StyledInput placeholder="Ex. P&ID-0001-Rev.B" {...register('pid')} />
                </div>
                <div>
                  <FieldLabel>Localisation / Unité</FieldLabel>
                  <StyledInput placeholder="Ex. Unité 12 — Section réacteur" {...register('location')} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Tag process</FieldLabel>
                  <StyledInput placeholder="Ex. LSHH-1001" {...register('processTag')} />
                </div>
                <div>
                  <FieldLabel>Taux de sollicitation (yr⁻¹)</FieldLabel>
                  <StyledInput type="number" step="0.001" placeholder="0.1"
                    {...register('demandRate', { valueAsNumber: true })} />
                </div>
              </div>
              <div>
                <FieldLabel>Événement dangereux</FieldLabel>
                <StyledTextarea rows={3}
                  placeholder="Décrivez le scénario de danger que cette SIF est conçue pour prévenir…"
                  {...register('hazardousEvent')} />
              </div>

              {/* RRF */}
              <div>
                <FieldLabel>Facteur de réduction du risque requis (RRF)</FieldLabel>
                <div className="flex gap-3 items-center">
                  <div className="flex-1">
                    <StyledInput type="number" placeholder="100"
                      {...register('rrfRequired', { valueAsNumber: true })} />
                  </div>
                  <div className="text-sm" style={{ color: TEXT_DIM }}>= PFD<sub>avg</sub> &lt;</div>
                  <div className="w-24 rounded-lg border px-3 py-2 text-sm font-mono text-center"
                    style={{ background: BG, borderColor: BORDER2, color: TEAL_DIM }}>
                    {(watch('rrfRequired') ?? 0) > 0
                      ? (1 / (watch('rrfRequired') as number)).toExponential(1)
                      : '—'}
                  </div>
                </div>
                <p className="text-[10px] mt-1.5" style={{ color: TEXT_DIM }}>
                  SIL {watchedSIL} → RRF entre{' '}
                  {Math.round(1 / (SIL_PFD_RANGE[watchedSIL]?.max ?? 0.1))} et{' '}
                  {Math.round(1 / (SIL_PFD_RANGE[watchedSIL]?.min ?? 0.001))}
                </p>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl p-3"
                style={{ background: '#1A1000', border: '1px solid #B4530920' }}>
                <AlertTriangle size={14} className="shrink-0 mt-0.5" style={{ color: '#F59E0B' }} />
                <p className="text-[11px] leading-relaxed" style={{ color: '#D97706' }}>
                  La description de l'événement dangereux est requise pour la traçabilité HAZOP/LOPA et la conformité IEC 61511.
                </p>
              </div>
            </div>

            {/* ══ TRAÇABILITÉ ══ */}
            <div className="p-6 space-y-5" style={{ display: activeTab === 'traceability' ? 'block' : 'none' }}>
              <div className="rounded-xl border p-4 space-y-3" style={{ background: BG, borderColor: BORDER }}>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
                  Signataires & Responsables
                </p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <FieldLabel>Établi par</FieldLabel>
                    <StyledInput placeholder="Nom / initiales" {...register('madeBy')} />
                  </div>
                  <div>
                    <FieldLabel>Vérifié par</FieldLabel>
                    <StyledInput placeholder="Nom / initiales" {...register('verifiedBy')} />
                  </div>
                  <div>
                    <FieldLabel>Approuvé par</FieldLabel>
                    <StyledInput placeholder="Nom / initiales" {...register('approvedBy')} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Révision</FieldLabel>
                  <StyledInput placeholder="A" {...register('revision')} />
                </div>
                <div>
                  <FieldLabel>Date du document</FieldLabel>
                  <StyledInput type="date" {...register('date')} />
                </div>
              </div>

              <div className="rounded-xl border p-4" style={{ background: `${TEAL}08`, borderColor: `${TEAL}25` }}>
                <p className="text-[11px] font-semibold mb-1" style={{ color: TEAL_DIM }}>Gestion documentaire</p>
                <p className="text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
                  L'historique des révisions, les liens HAZOP/LOPA, et les campagnes de proof test
                  sont disponibles après création depuis les onglets <strong>Compliance</strong> et <strong>Proof Test</strong>.
                </p>
              </div>

              {/* Récapitulatif live — se remplit car shouldUnregister:false */}
              <div className="rounded-xl border p-4" style={{ background: BG, borderColor: BORDER }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: TEXT_DIM }}>
                  Récapitulatif
                </p>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                  {[
                    ['Numéro',       watch('sifNumber') || nextRef],
                    ['Titre',        watch('title')     || '—'],
                    ['SIL Cible',    `SIL ${watchedSIL}`],
                    ['Statut',       STATUS_CFG[watchedStatus]?.label ?? '—'],
                    ['Tag process',  watch('processTag') || '—'],
                    ['Architecture', !editing ? initArch : '(inchangée)'],
                    ['Projet',       targetProject?.name ?? '—'],
                    ['Tag P&ID',     watch('pid') || '—'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2">
                      <span style={{ color: TEXT_DIM }}>{k}</span>
                      <span className="font-semibold truncate" style={{ color: TEXT }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Erreur submit */}
          {submitError && (
            <div className="mx-6 mt-3 rounded-lg px-3 py-2 text-xs"
              style={{ background: '#EF444415', border: '1px solid #EF444440', color: '#F87171' }}>
              ⚠ {submitError}
            </div>
          )}

          {/* ── Footer ── */}
          <div className="flex items-center justify-between px-6 py-4 shrink-0"
            style={{ borderTop: `1px solid ${BORDER}` }}>
            {/* Progress dots */}
            <div className="flex gap-1.5">
              {TABS.map(tab => (
                <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                  className="w-2 h-2 rounded-full transition-all"
                  style={{ background: activeTab === tab.id ? TEAL : BORDER2 }} />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {activeIdx > 0 && (
                <button type="button" onClick={() => setActiveTab(TABS[activeIdx - 1].id)}
                  className="flex items-center gap-1 rounded-lg border px-3 py-2 text-sm transition-colors"
                  style={{ borderColor: BORDER2, color: TEXT_DIM, background: BG }}
                  onMouseEnter={e => (e.currentTarget.style.color = TEXT)}
                  onMouseLeave={e => (e.currentTarget.style.color = TEXT_DIM)}>
                  <ChevronLeft size={14} /> Précédent
                </button>
              )}
              {activeIdx < TABS.length - 1 && (
                <button type="button" onClick={() => setActiveTab(TABS[activeIdx + 1].id)}
                  className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
                  style={{ borderColor: `${TEAL}50`, color: TEAL_DIM, background: `${TEAL}10` }}>
                  Suivant <ChevronRight size={14} />
                </button>
              )}
              <button type="button" onClick={closeModal}
                className="rounded-lg border px-4 py-2 text-sm transition-colors"
                style={{ borderColor: BORDER2, color: TEXT_DIM, background: BG }}
                onMouseEnter={e => (e.currentTarget.style.color = TEXT)}
                onMouseLeave={e => (e.currentTarget.style.color = TEXT_DIM)}>
                Annuler
              </button>
              {/* Créer/Sauvegarder — toujours visible sur tous les onglets */}
              <button type="submit" disabled={submitting || (!editing && !effectiveProjectId)}
                className="flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-bold transition-all disabled:opacity-50"
                style={{
                  background: `linear-gradient(135deg, ${TEAL}, #007A82)`,
                  color: '#fff', boxShadow: `0 4px 14px ${TEAL}40`,
                }}
                onMouseEnter={e => { if (!submitting) e.currentTarget.style.boxShadow = `0 6px 20px ${TEAL}60` }}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = `0 4px 14px ${TEAL}40`)}>
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                {submitting ? 'Enregistrement…' : editing ? 'Sauvegarder' : 'Créer la SIF'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
