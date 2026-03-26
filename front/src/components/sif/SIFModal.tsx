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
  ClipboardList,
  Factory,
  ShieldCheck,
  X,
  Shield,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  Check,
  Loader2,
  Folder,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import type { SIF, SIFStatus, SILLevel } from '@/core/types'
import { getSifModalStrings } from '@/i18n/sifModal'
import { useLocaleStrings } from '@/i18n/useLocale'
import { semantic } from '@/styles/tokens'
import { usePrismTheme } from '@/styles/usePrismTheme'

const BORDER2 = '#363F49'
const SIL_CFG: Record<number, { color: string; bg: string; border: string; label: string; pfd: string }> = {
  1: { color: '#16A34A', bg: '#052E16', border: '#15803D', label: 'SIL 1', pfd: '10⁻² → 10⁻¹' },
  2: { color: '#2563EB', bg: '#0F1B3D', border: '#1D4ED8', label: 'SIL 2', pfd: '10⁻³ → 10⁻²' },
  3: { color: '#D97706', bg: '#1A1000', border: '#B45309', label: 'SIL 3', pfd: '10⁻⁴ → 10⁻³' },
  4: { color: '#7C3AED', bg: '#1E0540', border: '#7C3AED', label: 'SIL 4', pfd: '10⁻⁵ → 10⁻⁴' },
}

const ARCH_CFG = [
  { id: '1oo1', label: '1oo1', descKey: 'oneoooneDesc' as const, hft: 0 },
  { id: '1oo2', label: '1oo2', descKey: 'oneootwoDesc' as const, hft: 1 },
  { id: '2oo2', label: '2oo2', descKey: 'twoootwoDesc' as const, hft: 0 },
  { id: '2oo3', label: '2oo3', descKey: 'twooothreeDesc' as const, hft: 1 },
  { id: '1oo2D', label: '1oo2D', descKey: 'oneootwoDDesc' as const, hft: 1 },
]

const STATUS_COLORS: Record<SIFStatus, { color: string }> = {
  draft: { color: '#6B7280' },
  in_review: { color: '#F59E0B' },
  verified: { color: '#0284C7' },
  approved: { color: '#16A34A' },
  archived: { color: '#9333EA' },
}

const SIL_PFD_RANGE: Record<number, { min: number; max: number }> = {
  1: { min: 1e-2, max: 1e-1 },
  2: { min: 1e-3, max: 1e-2 },
  3: { min: 1e-4, max: 1e-3 },
  4: { min: 1e-5, max: 1e-4 },
}

type PanelTab = 'identification' | 'process' | 'traceability'

type FormValues = Omit<SIF,
  'id' | 'projectId' | 'subsystems' | 'testCampaigns' |
  'operationalEvents' | 'hazopTrace' | 'proofTestProcedure' | 'assumptions'>

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  const { TEAL, TEXT_DIM } = usePrismTheme()
  return (
    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
      {children}
      {required && <span style={{ color: TEAL }} className="ml-1">*</span>}
    </label>
  )
}

const StyledInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }>(
  ({ error, ...props }, ref) => {
    const { BORDER, PAGE_BG, TEXT } = usePrismTheme()
    const softBorder = `${BORDER}99`
    return (
      <input
        {...props}
        ref={ref}
        className="prism-field w-full rounded-lg border px-3 py-2 text-sm outline-none"
        style={{ background: PAGE_BG, borderColor: error ? semantic.error : softBorder, color: TEXT }}
      />
    )
  },
)
StyledInput.displayName = 'StyledInput'

const StyledTextarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  (props, ref) => {
    const { BORDER, PAGE_BG, TEXT } = usePrismTheme()
    const softBorder = `${BORDER}99`
    return (
      <textarea
        {...props}
        ref={ref}
        className="prism-field w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none"
        style={{ background: PAGE_BG, borderColor: softBorder, color: TEXT }}
      />
    )
  },
)
StyledTextarea.displayName = 'StyledTextarea'

function StyledSelect({ value, onChange, options }: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  const { BORDER, PAGE_BG, TEXT } = usePrismTheme()
  const softBorder = `${BORDER}99`
  return (
    <select
      value={value}
      onChange={event => onChange(event.target.value)}
      className="prism-field w-full appearance-none rounded-lg border px-3 py-2 text-sm outline-none"
      style={{ background: PAGE_BG, borderColor: softBorder, color: TEXT }}
    >
      {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  )
}

export function SIFModal() {
  const strings = useLocaleStrings(getSifModalStrings)
  const { BORDER, CARD_BG, PAGE_BG, PANEL_BG, R, TEAL, TEAL_DIM, TEXT, TEXT_DIM } = usePrismTheme()
  const softBorder = `${BORDER}99`
  const isOpen = useAppStore(s => s.isSIFModalOpen)
  const editingId = useAppStore(s => s.editingSIFId)
  const newSIFProjectId = useAppStore(s => s.newSIFProjectId)
  const closeModal = useAppStore(s => s.closeSIFModal)
  const createSIF = useAppStore(s => s.createSIF)
  const updateSIF = useAppStore(s => s.updateSIF)
  const navigate = useAppStore(s => s.navigate)
  const projects = useAppStore(s => s.projects)
  const view = useAppStore(s => s.view)

  const resolvedProjectId =
    newSIFProjectId ??
    (view.type === 'sif-dashboard' ? view.projectId : null) ??
    projects[0]?.id ??
    null

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
  const [initArch, setInitArch] = useState('1oo1')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const tabs: { id: PanelTab; label: string; hint: string; Icon: React.ElementType }[] = [
    { id: 'identification', label: strings.tabs.identification.label, hint: strings.tabs.identification.hint, Icon: ClipboardList },
    { id: 'process', label: strings.tabs.process.label, hint: strings.tabs.process.hint, Icon: Factory },
    { id: 'traceability', label: strings.tabs.traceability.label, hint: strings.tabs.traceability.hint, Icon: ShieldCheck },
  ]
  const statusCfg: Record<SIFStatus, { color: string; label: string }> = {
    draft: { color: STATUS_COLORS.draft.color, label: strings.statuses.draft },
    in_review: { color: STATUS_COLORS.in_review.color, label: strings.statuses.inReview },
    verified: { color: STATUS_COLORS.verified.color, label: strings.statuses.verified },
    approved: { color: STATUS_COLORS.approved.color, label: strings.statuses.approved },
    archived: { color: STATUS_COLORS.archived.color, label: strings.statuses.archived },
  }
  const architectureOptions = ARCH_CFG.map(option => ({
    ...option,
    description: strings.architectures[option.descKey],
  }))

  const { register, handleSubmit, reset, control, watch, formState: { errors } } = useForm<FormValues>({
    shouldUnregister: false,
    defaultValues: {
      sifNumber: '',
      revision: 'A',
      title: '',
      description: '',
      pid: '',
      location: '',
      processTag: '',
      hazardousEvent: '',
      demandRate: 0.1,
      targetSIL: 2 as SILLevel,
      rrfRequired: 100,
      madeBy: '',
      verifiedBy: '',
      approvedBy: '',
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
        sifNumber: editing.sifNumber,
        revision: editing.revision,
        title: editing.title,
        description: editing.description,
        pid: editing.pid,
        location: editing.location,
        processTag: editing.processTag,
        hazardousEvent: editing.hazardousEvent,
        demandRate: editing.demandRate,
        targetSIL: editing.targetSIL,
        rrfRequired: editing.rrfRequired,
        madeBy: editing.madeBy,
        verifiedBy: editing.verifiedBy,
        approvedBy: editing.approvedBy,
        date: editing.date,
        status: editing.status,
      })
    } else {
      reset({
        sifNumber: nextRef,
        revision: 'A',
        title: '',
        description: '',
        pid: '',
        location: '',
        processTag: '',
        hazardousEvent: '',
        demandRate: 0.1,
        targetSIL: 2 as SILLevel,
        rrfRequired: 100,
        madeBy: '',
        verifiedBy: '',
        approvedBy: '',
        date: new Date().toISOString().split('T')[0],
        status: 'draft' as SIFStatus,
      })
      setInitArch('1oo1')
    }
  }, [editing, isOpen, nextRef, reset])

  const onSubmit = async (data: FormValues) => {
    const pid = editing ? (editingProject?.id ?? '') : (effectiveProjectId ?? '')
    if (!pid) {
      setSubmitError(strings.validation.noProjectSelected)
      return
    }

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
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : String(error))
    } finally {
      setSubmitting(false)
    }
  }

  const watchedSIL = watch('targetSIL') as number
  const watchedStatus = watch('status') as SIFStatus
  const activeIdx = tabs.findIndex(tab => tab.id === activeTab)
  const selectedArchitecture = architectureOptions.find(option => option.id === initArch)

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={event => { if (event.target === event.currentTarget) closeModal() }}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-[720px] flex-col rounded-2xl border shadow-2xl"
        style={{
          background: PANEL_BG,
          borderColor: BORDER,
          boxShadow: `0 0 0 1px ${BORDER}, 0 24px 60px rgba(0,0,0,0.6)`,
        }}
        onClick={event => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between px-6 pb-4 pt-5" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${TEAL}20`, border: `1px solid ${TEAL}40` }}>
              <Shield size={18} style={{ color: TEAL }} />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: TEXT }}>
                {editing ? strings.header.edit(editing.sifNumber) : strings.header.create}
              </h2>
              <p className="text-[11px]" style={{ color: TEXT_DIM }}>
                {targetProject?.name ?? strings.header.subtitleFallback} · {strings.header.functionName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold"
              style={{
                background: `${statusCfg[watchedStatus]?.color}18`,
                border: `1px solid ${statusCfg[watchedStatus]?.color}40`,
                color: statusCfg[watchedStatus]?.color,
              }}
            >
              <div className="h-1.5 w-1.5 rounded-full" style={{ background: statusCfg[watchedStatus]?.color }} />
              {statusCfg[watchedStatus]?.label}
            </div>
            <button
              onClick={closeModal}
              style={{ color: TEXT_DIM }}
              className="rounded-lg p-1.5 transition-colors"
              onMouseEnter={event => { event.currentTarget.style.color = '#EF4444' }}
              onMouseLeave={event => { event.currentTarget.style.color = TEXT_DIM }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {!editing && projects.length > 1 && (
          <div className="shrink-0 px-6 pt-3">
            <div className="flex items-center gap-3 rounded-xl border p-3" style={{ background: PAGE_BG, borderColor: effectiveProjectId ? `${TEAL}40` : softBorder }}>
              <Folder size={14} style={{ color: effectiveProjectId ? TEAL : TEXT_DIM }} />
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
                  {strings.projectSelector.targetProject}
                </p>
                <select
                  value={effectiveProjectId ?? ''}
                  onChange={event => setSelectedProjectId(event.target.value || null)}
                  className="w-full appearance-none bg-transparent text-sm outline-none"
                  style={{ color: effectiveProjectId ? TEXT : TEXT_DIM }}
                >
                  <option value="">{strings.projectSelector.placeholder}</option>
                  {projects.map(projectOption => (
                    <option key={projectOption.id} value={projectOption.id}>{projectOption.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="shrink-0 px-6 pt-4">
          <div className="flex items-end" style={{ borderBottom: `1px solid ${BORDER}` }}>
            {tabs.map(tab => {
              const isActive = tab.id === activeTab
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className="flex shrink-0 items-center gap-2 px-4 py-2.5 text-left transition-all"
                  style={isActive ? {
                    background: CARD_BG,
                    color: TEAL_DIM,
                    borderTop: `1px solid ${BORDER}`,
                    borderLeft: `1px solid ${BORDER}`,
                    borderRight: `1px solid ${BORDER}`,
                    borderBottom: `1px solid ${CARD_BG}`,
                    borderRadius: `${R}px ${R}px 0 0`,
                    marginBottom: '-1px',
                    zIndex: 10,
                  } : { color: TEXT_DIM }}
                  onMouseEnter={event => { if (!isActive) event.currentTarget.style.color = TEXT }}
                  onMouseLeave={event => { if (!isActive) event.currentTarget.style.color = TEXT_DIM }}
                >
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

        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
          <div
            className="flex-1 overflow-y-auto"
            style={{
              background: CARD_BG,
              margin: '0 24px',
              borderLeft: `1px solid ${BORDER}`,
              borderRight: `1px solid ${BORDER}`,
              borderRadius: `${activeIdx === 0 ? 0 : R}px ${activeIdx === tabs.length - 1 ? 0 : R}px ${R}px ${R}px`,
            }}
          >
            <div className="space-y-5 p-6" style={{ display: activeTab === 'identification' ? 'block' : 'none' }}>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <FieldLabel required>{strings.fields.sifNumber}</FieldLabel>
                  <StyledInput placeholder={nextRef} error={Boolean(errors.sifNumber)} {...register('sifNumber', { required: strings.validation.required })} />
                </div>
                <div>
                  <FieldLabel>{strings.fields.revision}</FieldLabel>
                  <StyledInput placeholder={strings.fields.revisionPlaceholder} {...register('revision')} />
                </div>
                <div>
                  <FieldLabel>{strings.fields.date}</FieldLabel>
                  <StyledInput type="date" {...register('date')} />
                </div>
              </div>

              <div>
                <FieldLabel required>{strings.fields.title}</FieldLabel>
                <StyledInput
                  placeholder={strings.fields.titlePlaceholder}
                  error={Boolean(errors.title)}
                  {...register('title', { required: strings.validation.required })}
                />
                {errors.title && <p className="mt-1 text-[10px]" style={{ color: '#EF4444' }}>{errors.title.message}</p>}
              </div>

              <div>
                <FieldLabel>{strings.fields.description}</FieldLabel>
                <StyledTextarea rows={2} placeholder={strings.fields.descriptionPlaceholder} {...register('description')} />
              </div>

              <div>
                <FieldLabel required>{strings.fields.targetSil}</FieldLabel>
                <Controller
                  name="targetSIL"
                  control={control}
                  render={({ field }) => (
                    <div className="grid grid-cols-4 gap-2">
                      {[1, 2, 3, 4].map(sil => {
                        const cfg = SIL_CFG[sil]
                        const selected = Number(field.value) === sil
                        return (
                          <button
                            key={sil}
                            type="button"
                            onClick={() => field.onChange(sil as SILLevel)}
                            className="relative rounded-xl border p-3 text-center transition-all"
                            style={selected
                              ? { background: cfg.bg, borderColor: cfg.border, boxShadow: `0 0 16px ${cfg.color}30` }
                              : { background: PAGE_BG, borderColor: softBorder }}
                          >
                            {selected && (
                              <div className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full" style={{ background: cfg.color }}>
                                <Check size={9} color="#fff" />
                              </div>
                            )}
                            <p className="mb-0.5 text-sm font-black" style={{ color: selected ? cfg.color : TEXT_DIM }}>{cfg.label}</p>
                            <p className="text-[9px] font-mono" style={{ color: selected ? `${cfg.color}90` : TEXT_DIM }}>
                              PFD {cfg.pfd}
                            </p>
                          </button>
                        )
                      })}
                    </div>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>{strings.fields.status}</FieldLabel>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <StyledSelect
                        value={field.value}
                        onChange={field.onChange}
                        options={[
                          { value: 'draft', label: strings.statuses.draft },
                          { value: 'in_review', label: strings.statuses.inReview },
                          { value: 'verified', label: strings.statuses.verified },
                          { value: 'approved', label: strings.statuses.approved },
                        ]}
                      />
                    )}
                  />
                </div>
                {!editing && (
                  <div>
                    <FieldLabel>{strings.fields.initialArchitecture}</FieldLabel>
                    <div className="flex flex-wrap gap-1.5">
                      {architectureOptions.map(option => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setInitArch(option.id)}
                          title={strings.architectures.summary(option.description, option.hft)}
                          className="rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-all"
                          style={initArch === option.id
                            ? { background: `${TEAL}18`, borderColor: TEAL, color: TEAL_DIM }
                            : { background: PAGE_BG, borderColor: softBorder, color: TEXT_DIM }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1.5 text-[9px]" style={{ color: TEXT_DIM }}>
                      {selectedArchitecture ? strings.architectures.summary(selectedArchitecture.description, selectedArchitecture.hft) : ''}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-5 p-6" style={{ display: activeTab === 'process' ? 'block' : 'none' }}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>{strings.fields.pid}</FieldLabel>
                  <StyledInput placeholder={strings.fields.pidPlaceholder} {...register('pid')} />
                </div>
                <div>
                  <FieldLabel>{strings.fields.location}</FieldLabel>
                  <StyledInput placeholder={strings.fields.locationPlaceholder} {...register('location')} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>{strings.fields.processTag}</FieldLabel>
                  <StyledInput placeholder={strings.fields.processTagPlaceholder} {...register('processTag')} />
                </div>
                <div>
                  <FieldLabel>{strings.fields.demandRate}</FieldLabel>
                  <StyledInput type="number" step="0.001" placeholder={strings.fields.demandRatePlaceholder} {...register('demandRate', { valueAsNumber: true })} />
                </div>
              </div>
              <div>
                <FieldLabel>{strings.fields.hazardousEvent}</FieldLabel>
                <StyledTextarea rows={3} placeholder={strings.fields.hazardousEventPlaceholder} {...register('hazardousEvent')} />
              </div>

              <div>
                <FieldLabel>{strings.fields.rrfRequired}</FieldLabel>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <StyledInput type="number" placeholder={strings.fields.rrfRequiredPlaceholder} {...register('rrfRequired', { valueAsNumber: true })} />
                  </div>
                  <div className="text-sm" style={{ color: TEXT_DIM }}>{strings.helpers.pfdThreshold}</div>
                  <div className="w-24 rounded-lg border px-3 py-2 text-center text-sm font-mono" style={{ background: PAGE_BG, borderColor: softBorder, color: TEAL_DIM }}>
                    {(watch('rrfRequired') ?? 0) > 0
                      ? (1 / (watch('rrfRequired') as number)).toExponential(1)
                      : '—'}
                  </div>
                </div>
                <p className="mt-1.5 text-[10px]" style={{ color: TEXT_DIM }}>
                  {strings.helpers.silRange(
                    watchedSIL,
                    Math.round(1 / (SIL_PFD_RANGE[watchedSIL]?.max ?? 0.1)),
                    Math.round(1 / (SIL_PFD_RANGE[watchedSIL]?.min ?? 0.001)),
                  )}
                </p>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl p-3" style={{ background: '#1A1000', border: '1px solid #B4530920' }}>
                <AlertTriangle size={14} className="mt-0.5 shrink-0" style={{ color: '#F59E0B' }} />
                <p className="text-[11px] leading-relaxed" style={{ color: '#D97706' }}>
                  {strings.alerts.hazardousEventTraceability}
                </p>
              </div>
            </div>

            <div className="space-y-5 p-6" style={{ display: activeTab === 'traceability' ? 'block' : 'none' }}>
              <div className="space-y-3 rounded-xl border p-4" style={{ background: PAGE_BG, borderColor: BORDER }}>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
                  {strings.traceability.signatories}
                </p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <FieldLabel>{strings.fields.establishedBy}</FieldLabel>
                    <StyledInput placeholder={strings.fields.initialsPlaceholder} {...register('madeBy')} />
                  </div>
                  <div>
                    <FieldLabel>{strings.fields.verifiedBy}</FieldLabel>
                    <StyledInput placeholder={strings.fields.initialsPlaceholder} {...register('verifiedBy')} />
                  </div>
                  <div>
                    <FieldLabel>{strings.fields.approvedBy}</FieldLabel>
                    <StyledInput placeholder={strings.fields.initialsPlaceholder} {...register('approvedBy')} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>{strings.fields.revision}</FieldLabel>
                  <StyledInput placeholder={strings.fields.revisionPlaceholder} {...register('revision')} />
                </div>
                <div>
                  <FieldLabel>{strings.fields.documentDate}</FieldLabel>
                  <StyledInput type="date" {...register('date')} />
                </div>
              </div>

              <div className="rounded-xl border p-4" style={{ background: `${TEAL}08`, borderColor: `${TEAL}25` }}>
                <p className="mb-1 text-[11px] font-semibold" style={{ color: TEAL_DIM }}>{strings.traceability.documentManagementTitle}</p>
                <p className="text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
                  {strings.traceability.documentManagementBody}
                </p>
              </div>

              <div className="rounded-xl border p-4" style={{ background: PAGE_BG, borderColor: BORDER }}>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
                  {strings.traceability.summaryTitle}
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  {[
                    [strings.traceability.rows.number, watch('sifNumber') || nextRef],
                    [strings.traceability.rows.title, watch('title') || '—'],
                    [strings.traceability.rows.targetSil, `SIL ${watchedSIL}`],
                    [strings.traceability.rows.status, statusCfg[watchedStatus]?.label ?? '—'],
                    [strings.traceability.rows.processTag, watch('processTag') || '—'],
                    [strings.traceability.rows.architecture, !editing ? initArch : strings.architectures.unchanged],
                    [strings.traceability.rows.project, targetProject?.name ?? '—'],
                    [strings.traceability.rows.pid, watch('pid') || '—'],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="flex justify-between gap-2">
                      <span style={{ color: TEXT_DIM }}>{label}</span>
                      <span className="truncate font-semibold" style={{ color: TEXT }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {submitError && (
            <div className="mx-6 mt-3 rounded-lg px-3 py-2 text-xs" style={{ background: `${semantic.error}15`, border: `1px solid ${semantic.error}40`, color: semantic.error }}>
              ⚠ {submitError}
            </div>
          )}

          <div className="flex shrink-0 items-center justify-between px-6 py-4" style={{ borderTop: `1px solid ${BORDER}` }}>
            <div className="flex gap-1.5">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className="h-2 w-2 rounded-full transition-all"
                  style={{ background: activeTab === tab.id ? TEAL : softBorder }}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {activeIdx > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab(tabs[activeIdx - 1].id)}
                  className="flex items-center gap-1 rounded-lg border px-3 py-2 text-sm transition-colors"
                  style={{ borderColor: softBorder, color: TEXT_DIM, background: PAGE_BG }}
                  onMouseEnter={event => { event.currentTarget.style.color = TEXT }}
                  onMouseLeave={event => { event.currentTarget.style.color = TEXT_DIM }}
                >
                  <ChevronLeft size={14} /> {strings.footer.previous}
                </button>
              )}
              {activeIdx < tabs.length - 1 && (
                <button
                  type="button"
                  onClick={() => setActiveTab(tabs[activeIdx + 1].id)}
                  className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
                  style={{ borderColor: `${TEAL}50`, color: TEAL_DIM, background: `${TEAL}10` }}
                >
                  {strings.footer.next} <ChevronRight size={14} />
                </button>
              )}
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border px-4 py-2 text-sm transition-colors"
                style={{ borderColor: softBorder, color: TEXT_DIM, background: PAGE_BG }}
                onMouseEnter={event => { event.currentTarget.style.color = TEXT }}
                onMouseLeave={event => { event.currentTarget.style.color = TEXT_DIM }}
              >
                {strings.footer.cancel}
              </button>
              <button
                type="submit"
                disabled={submitting || (!editing && !effectiveProjectId)}
                className="flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-bold transition-all disabled:opacity-50"
                style={{
                  background: `linear-gradient(135deg, ${TEAL}, #007A82)`,
                  color: '#fff',
                  boxShadow: `0 4px 14px ${TEAL}40`,
                }}
                onMouseEnter={event => { if (!submitting) event.currentTarget.style.boxShadow = `0 6px 20px ${TEAL}60` }}
                onMouseLeave={event => { event.currentTarget.style.boxShadow = `0 4px 14px ${TEAL}40` }}
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                {submitting ? strings.footer.saving : editing ? strings.footer.save : strings.footer.create}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
