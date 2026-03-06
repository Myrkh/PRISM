
/**
 * ProjectModal — PRISM v3
 *
 * VERSION CORRIGÉE ET STABILISÉE
 *
 * Corrections intégrées :
 *  ✓ Composants `StyledInput` et `StyledTextarea` utilisent `React.forwardRef`
 *    pour être 100% compatibles avec `react-hook-form`.
 *    Ceci corrige les problèmes de validation ("Requis") et de récapitulatif vide.
 *  ✓ La logique existante est préservée.
 */
import React, { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import {
  Folder, X, Check, ChevronRight, ChevronLeft, BookOpen, Loader2,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import type { Project, ProjectStatus } from '@/core/types'

// ─── Design tokens ────────────────────────────────────────────────────────
const BG      = '#0C1117'
const PANEL   = '#14181C'
const CARD    = '#1D232A'
const BORDER  = '#2A3138'
const BORDER2 = '#363F49'
const TEXT    = '#DFE8F1'
const TEXT_DIM= '#8FA0B1'
const TEAL    = '#009BA4'
const TEAL_DIM= '#5FD8D2'
const R       = 8

const STANDARD_CFG = [
  { id: 'IEC61511', label: 'IEC 61511', subtitle: 'Process Safety',
    desc: 'La référence pour les SIS dans les secteurs pétro-chimie, gaz et process industriels.',
    color: '#2563EB', bg: '#0F1B3D', border: '#1D4ED8' },
  { id: 'IEC61508', label: 'IEC 61508', subtitle: 'Functional Safety',
    desc: 'Standard générique pour la sécurité fonctionnelle des E/E/PE — base de IEC 61511.',
    color: '#7C3AED', bg: '#1E0540', border: '#7C3AED' },
  { id: 'ISA84',    label: 'ISA 84',    subtitle: 'ANSI/ISA-84',
    desc: 'Standard américain pour les Safety Instrumented Systems (équivalent IEC 61511).',
    color: '#D97706', bg: '#1A1000', border: '#B45309' },
]

const STATUS_CFG: Record<ProjectStatus, { color: string; label: string; desc: string }> = {
  active:    { color: '#16A34A', label: 'Actif',   desc: 'Projet en cours d\'étude' },
  completed: { color: '#2563EB', label: 'Clôturé', desc: 'Étude terminée et archivée' },
  archived:  { color: '#6B7280', label: 'Archivé', desc: 'Accès en lecture seule' },
}

type PanelTab = 'information' | 'configuration'
const TABS: { id: PanelTab; label: string; hint: string; Icon: React.ElementType }[] = [
  { id: 'information',   label: 'Informations', hint: 'Identité & localisation', Icon: Folder    },
  { id: 'configuration', label: 'Configuration', hint: 'Standard & statut',      Icon: BookOpen  },
]

type FormValues = Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'sifs'>

// ─── Sub-components ───────────────────────────────────────────────────────
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: TEXT_DIM }}>
      {children}{required && <span style={{ color: TEAL }} className="ml-1">*</span>}
    </label>
  )
}

// ✅ CORRECTION: Utilisation de React.forwardRef pour rendre le composant compatible
const StyledInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }
>((props, ref) => {
  const { error, ...rest } = props;
  return (
    <input
      ref={ref} // Le 'ref' est maintenant correctement passé à l'input
      {...rest}
      className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all"
      style={{ background: BG, borderColor: error ? '#EF4444' : BORDER2, color: TEXT }}
      onFocus={(e) => {
        e.target.style.borderColor = TEAL;
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        props.onBlur?.(e); // Important pour la validation de react-hook-form
        e.target.style.borderColor = props.error ? '#EF4444' : BORDER2;
      }}
    />
  );
});
StyledInput.displayName = 'StyledInput'; // Pour le débogage

// ✅ CORRECTION: Idem pour le StyledTextarea
const StyledTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }
>((props, ref) => {
  const { error, ...rest } = props;
  return (
    <textarea
      ref={ref} // Le 'ref' est maintenant correctement passé au textarea
      {...rest}
      className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all resize-none"
      style={{ background: BG, borderColor: error ? '#EF4444' : BORDER2, color: TEXT }}
      onFocus={(e) => {
        e.target.style.borderColor = TEAL;
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        props.onBlur?.(e); // Important pour la validation
        e.target.style.borderColor = props.error ? '#EF4444' : BORDER2;
      }}
    />
  );
});
StyledTextarea.displayName = 'StyledTextarea';


// ─── Main ─────────────────────────────────────────────────────────────────
export function ProjectModal() {
  const isOpen        = useAppStore(s => s.isProjectModalOpen)
  const editingId     = useAppStore(s => s.editingProjectId)
  const closeModal    = useAppStore(s => s.closeProjectModal)
  const createProject = useAppStore(s => s.createProject)
  const updateProject = useAppStore(s => s.updateProject)
  const projects      = useAppStore(s => s.projects)

  const editing = editingId ? projects.find(p => p.id === editingId) : undefined
  const [activeTab, setActiveTab] = useState<PanelTab>('information')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { register, handleSubmit, reset, control, watch, formState: { errors } } =
    useForm<FormValues>({
      shouldUnregister: false,
      defaultValues: {
        name: '', ref: '', client: '', site: '', unit: '',
        standard: 'IEC61511', revision: 'A', description: '', status: 'active',
      },
    })

  useEffect(() => {
    if (!isOpen) return
    setActiveTab('information')
    setSubmitError(null)
    reset(editing ? {
      name: editing.name, ref: editing.ref, client: editing.client,
      site: editing.site, unit: editing.unit, standard: editing.standard,
      revision: editing.revision, description: editing.description, status: editing.status,
    } : {
      name: '', ref: '', client: '', site: '', unit: '',
      standard: 'IEC61511', revision: 'A', description: '', status: 'active',
    })
  }, [editing, isOpen, reset])

  const onSubmit = async (data: FormValues) => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      if (editing) {
        await updateProject(editing.id, data)
      } else {
        await createProject(data)
      }
      closeModal()
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  const watchedStandard = watch('standard')
  const watchedStatus   = watch('status') as ProjectStatus
  const watchedName     = watch('name')
  const activeIdx       = TABS.findIndex(t => t.id === activeTab)

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
          background: PANEL, borderColor: BORDER, width: '100%', maxWidth: 600, maxHeight: '88vh',
          boxShadow: `0 0 0 1px ${BORDER}, 0 24px 60px rgba(0,0,0,0.6)`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 shrink-0"
          style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${TEAL}20`, border: `1px solid ${TEAL}40` }}>
              <Folder size={18} style={{ color: TEAL }} />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: TEXT }}>
                {editing ? `Modifier ${editing.name}` : 'Nouveau Projet'}
              </h2>
              <p className="text-[11px]" style={{ color: TEXT_DIM }}>
                {editing ? `${editing.ref || '—'} · ${editing.sifs.length} SIF` : 'Créer un nouveau projet PRISM'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold"
              style={{
                background: `${STATUS_CFG[watchedStatus]?.color}18`,
                border:     `1px solid ${STATUS_CFG[watchedStatus]?.color}40`,
                color:       STATUS_CFG[watchedStatus]?.color,
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

        {/* Tab bar intercalaire */}
        <div className="px-6 pt-4 shrink-0">
          <div className="flex items-end" style={{ borderBottom: `1px solid ${BORDER}` }}>
            {TABS.map((tab) => {
              const isActive = tab.id === activeTab
              return (
                <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-2 px-4 py-2.5 transition-all shrink-0"
                  style={isActive ? {
                    background: CARD, color: TEAL_DIM,
                    borderTop: `1px solid ${BORDER}`, borderLeft: `1px solid ${BORDER}`,
                    borderRight: `1px solid ${BORDER}`, borderBottom: `1px solid ${CARD}`,
                    borderRadius: `${R}px ${R}px 0 0`, marginBottom: '-1px', zIndex: 10,
                  } : { color: TEXT_DIM }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = TEXT }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = TEXT_DIM }}
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

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto" style={{ background: CARD, margin: '0 24px',
            borderLeft: `1px solid ${BORDER}`, borderRight: `1px solid ${BORDER}`,
            borderRadius: `${activeIdx === 0 ? 0 : R}px ${activeIdx === TABS.length - 1 ? 0 : R}px ${R}px ${R}px` }}>

            {/* ── INFORMATIONS ── */}
            <div className="p-6 space-y-5" style={{ display: activeTab === 'information' ? 'block' : 'none' }}>
              <div className="col-span-2">
                <FieldLabel required>Nom du projet</FieldLabel>
                <StyledInput placeholder="Ex. DMDS Unit 12 — Sécurités procédé"
                  error={!!errors.name} {...register('name', { required: 'Requis' })} />
                {errors.name && <p className="text-[10px] mt-1" style={{ color: '#EF4444' }}>{errors.name.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Référence document</FieldLabel>
                  <StyledInput placeholder="Ex. HTL-001-SI" {...register('ref')} />
                </div>
                <div>
                  <FieldLabel>Révision</FieldLabel>
                  <StyledInput placeholder="A" {...register('revision')} />
                </div>
              </div>
              <div className="rounded-xl border p-4 space-y-3" style={{ background: BG, borderColor: BORDER }}>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Localisation</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <FieldLabel>Client</FieldLabel>
                    <StyledInput placeholder="Raison sociale" {...register('client')} />
                  </div>
                  <div>
                    <FieldLabel>Site</FieldLabel>
                    <StyledInput placeholder="Ex. Le Havre" {...register('site')} />
                  </div>
                  <div>
                    <FieldLabel>Unité / Zone</FieldLabel>
                    <StyledInput placeholder="Ex. Unité 12" {...register('unit')} />
                  </div>
                </div>
              </div>
              <div>
                <FieldLabel>Description du périmètre</FieldLabel>
                <StyledTextarea rows={3} placeholder="Périmètre, objectifs, contraintes…" {...register('description')} />
              </div>
            </div>

            {/* ── CONFIGURATION ── */}
            <div className="p-6 space-y-5" style={{ display: activeTab === 'configuration' ? 'block' : 'none' }}>
              <div>
                <FieldLabel required>Norme de référence</FieldLabel>
                <Controller name="standard" control={control} render={({ field }) => (
                  <div className="space-y-2">
                    {STANDARD_CFG.map(std => {
                      const sel = field.value === std.id
                      return (
                        <button key={std.id} type="button" onClick={() => field.onChange(std.id)}
                          className="relative w-full rounded-xl border p-4 text-left transition-all"
                          style={sel ? { background: std.bg, borderColor: std.border, boxShadow: `0 0 16px ${std.color}25` }
                            : { background: BG, borderColor: BORDER2 }}>
                          <div className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5"
                              style={sel ? { borderColor: std.color, background: std.color } : { borderColor: BORDER2 }}>
                              {sel && <Check size={10} color="#fff" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-sm font-bold" style={{ color: sel ? std.color : TEXT }}>{std.label}</span>
                                <span className="text-[10px] rounded px-1.5 py-0.5 font-semibold"
                                  style={{ background: `${std.color}20`, color: std.color }}>{std.subtitle}</span>
                              </div>
                              <p className="text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>{std.desc}</p>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )} />
              </div>

              <div>
                <FieldLabel>Statut du projet</FieldLabel>
                <Controller name="status" control={control} render={({ field }) => (
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.entries(STATUS_CFG) as [ProjectStatus, typeof STATUS_CFG[ProjectStatus]][]).map(([id, cfg]) => {
                      const sel = field.value === id
                      return (
                        <button key={id} type="button" onClick={() => field.onChange(id)}
                          className="rounded-xl border p-3 text-left transition-all"
                          style={sel ? { background: `${cfg.color}15`, borderColor: `${cfg.color}50` }
                            : { background: BG, borderColor: BORDER2 }}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                            <span className="text-[11px] font-bold" style={{ color: sel ? cfg.color : TEXT }}>{cfg.label}</span>
                          </div>
                          <p className="text-[9px] leading-relaxed" style={{ color: TEXT_DIM }}>{cfg.desc}</p>
                        </button>
                      )
                    })}
                  </div>
                )} />
              </div>

              {/* Récapitulatif live */}
              <div className="rounded-xl border p-4" style={{ background: BG, borderColor: BORDER }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: TEXT_DIM }}>Récapitulatif</p>
                <div className="space-y-1.5 text-xs">
                  {[
                    ['Nom',     watchedName || '—'],
                    ['Ref',     watch('ref') || '—'],
                    ['Client',  watch('client') || '—'],
                    ['Site',    watch('site') || '—'],
                    ['Norme',   watchedStandard],
                    ['Statut',  STATUS_CFG[watchedStatus]?.label],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span style={{ color: TEXT_DIM }}>{k}</span>
                      <span className="font-semibold" style={{ color: TEXT }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Erreur submit */}
          {submitError && (
            <div className="mx-6 mt-3 rounded-lg px-3 py-2 text-xs" style={{ background: '#EF444415', border: '1px solid #EF444440', color: '#F87171' }}>
              ⚠ {submitError}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderTop: `1px solid ${BORDER}` }}>
            <div className="flex gap-1.5">
              {TABS.map(tab => (
                <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                  className="w-2 h-2 rounded-full transition-all"
                  style={{ background: activeTab === tab.id ? TEAL : BORDER2 }}
                />
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
              <button type="submit" disabled={submitting}
                className="flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-bold transition-all disabled:opacity-60"
                style={{
                  background: `linear-gradient(135deg, ${TEAL}, #007A82)`,
                  color: '#fff', boxShadow: `0 4px 14px ${TEAL}40`,
                }}
                onMouseEnter={e => { if (!submitting) e.currentTarget.style.boxShadow = `0 6px 20px ${TEAL}60` }}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = `0 4px 14px ${TEAL}40`)}>
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Folder size={14} />}
                {submitting ? 'Enregistrement…' : editing ? 'Sauvegarder' : 'Créer le projet'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
