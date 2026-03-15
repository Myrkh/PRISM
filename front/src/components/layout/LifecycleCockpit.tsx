import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight, FileText, FolderPlus, Shield,
  CheckCircle2, Circle, ChevronRight,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import type { Project, SIF } from '@/core/types'
import { calcSIF, formatPFD } from '@/core/math/pfdCalc'
import { BORDER, PANEL_BG, TEAL, TEAL_DIM, TEXT, TEXT_DIM, semantic, dark } from '@/styles/tokens'

const BG = dark.page
const CARD = dark.card2

type LifecycleStepId = 'hazard' | 'allocation' | 'srs' | 'design' | 'validation' | 'operation'

interface FocusSIF { key: string; project: Project; sif: SIF; recommendedStep: LifecycleStepId }

const STEP_ORDER: LifecycleStepId[] = ['hazard', 'allocation', 'srs', 'design', 'validation', 'operation']

const STEP_META: Record<LifecycleStepId, { label: string; shortLabel: string; description: string; accent: string; destination: string; tab?: 'context' | 'architecture' | 'verification' | 'exploitation' }> = {
  hazard:     { label: 'Analyse de danger et de risque',           shortLabel: 'Risque',       description: 'Traçabilité HAZOP / LOPA et scénario dangereux.',               accent: '#F97316', destination: 'HAZOP / LOPA' },
  allocation: { label: 'Affectation aux couches de protection',    shortLabel: 'Allocation',   description: 'Lien entre la fonction de sécurité, les IPL et la cible SIL.',   accent: '#60A5FA', destination: 'Contexte SIF', tab: 'context' },
  srs:        { label: 'Exigences de sécurité / SRS',             shortLabel: 'SRS',          description: 'Exigences, tags process et données fonctionnelles de base.',     accent: '#38BDF8', destination: 'Contexte SIF', tab: 'context' },
  design:     { label: 'Conception / ingénierie',                  shortLabel: 'Conception',   description: "Architecture de la SIF, sous-systèmes et composants.",            accent: '#F59E0B', destination: 'Architecture', tab: 'architecture' },
  validation: { label: 'Validation / mise en service',             shortLabel: 'Validation',   description: 'Vérification SIL et préparation à la mise en service.',          accent: '#A78BFA', destination: 'Vérification', tab: 'verification' },
  operation:  { label: 'Exploitation / maintenance / proof test',  shortLabel: 'Exploitation', description: 'Procédure, campagnes de test et tenue dans le temps.',            accent: '#14B8A6', destination: 'Exploitation', tab: 'exploitation' },
}

// ── Helpers (unchanged logic) ─────────────────────────────────────────────
function polarToCartesian(cx: number, cy: number, r: number, deg: number) { const rad = ((deg - 90) * Math.PI) / 180; return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) } }
function describeArc(cx: number, cy: number, iR: number, oR: number, sa: number, ea: number) { const os = polarToCartesian(cx, cy, oR, ea), oe = polarToCartesian(cx, cy, oR, sa), is_ = polarToCartesian(cx, cy, iR, sa), ie = polarToCartesian(cx, cy, iR, ea), lg = ea - sa <= 180 ? '0' : '1'; return `M ${os.x} ${os.y} A ${oR} ${oR} 0 ${lg} 0 ${oe.x} ${oe.y} L ${is_.x} ${is_.y} A ${iR} ${iR} 0 ${lg} 1 ${ie.x} ${ie.y} Z` }
function hasHazardData(sif: SIF) { return Boolean(sif.hazopTrace?.hazopNode && sif.hazopTrace?.scenarioId && sif.hazopTrace?.initiatingEvent && sif.hazopTrace?.lopaRef) }
function hasAllocationData(sif: SIF) { return Boolean(sif.targetSIL && sif.rrfRequired > 0 && sif.hazopTrace?.iplList && sif.hazopTrace?.lopaRef) }
function hasSrsData(sif: SIF) { return Boolean(sif.processTag && sif.hazardousEvent && sif.location && sif.description) }
function hasDesignData(sif: SIF) { return sif.subsystems.some(s => s.channels.some(c => c.components.length > 0)) }
function hasValidationData(p: Project, sif: SIF) { const r = calcSIF(sif, { projectStandard: p.standard }); return r.meetsTarget && (sif.status === 'verified' || sif.status === 'approved') }
function hasOperationData(sif: SIF) { return Boolean(sif.proofTestProcedure || sif.testCampaigns.length > 0) }
function getRecommendedStep(p: Project, sif: SIF): LifecycleStepId { if (!hasHazardData(sif)) return 'hazard'; if (!hasAllocationData(sif)) return 'allocation'; if (!hasSrsData(sif)) return 'srs'; if (!hasDesignData(sif)) return 'design'; if (!hasValidationData(p, sif)) return 'validation'; return 'operation' }
function stepState(p: Project, sif: SIF, id: LifecycleStepId): 'done' | 'current' | 'upcoming' { const ci = STEP_ORDER.indexOf(getRecommendedStep(p, sif)), si = STEP_ORDER.indexOf(id); return si < ci ? 'done' : si === ci ? 'current' : 'upcoming' }
function getStepHint(p: Project, sif: SIF, id: LifecycleStepId): string { if (id === 'hazard') return hasHazardData(sif) ? 'HAZOP / LOPA renseigné.' : 'Compléter scénario, LOPA, noeud HAZOP.'; if (id === 'allocation') return hasAllocationData(sif) ? `SIL ${sif.targetSIL} et IPLs liées.` : 'Renseigner IPLs, LOPA ref et cible SIL.'; if (id === 'srs') return hasSrsData(sif) ? `Tag ${sif.processTag || 'process'} renseigné.` : 'Définir tag, événement, lieu, description.'; if (id === 'design') return hasDesignData(sif) ? 'Composants affectés.' : 'Architecture non configurée.'; if (id === 'validation') { const r = calcSIF(sif, { projectStandard: p.standard }); return hasValidationData(p, sif) ? `SIL ${r.SIL} atteint.` : `SIL ${r.SIL} / cible ${sif.targetSIL}.` } return hasOperationData(sif) ? 'Proof tests engagés.' : 'Aucune campagne de test.' }
function buildFocusSifs(projects: Project[]): FocusSIF[] { return projects.flatMap(p => p.sifs.filter(s => s.status !== 'archived').map(sif => ({ key: `${p.id}:${sif.id}`, project: p, sif, recommendedStep: getRecommendedStep(p, sif) }))) }
function completedSteps(p: Project, sif: SIF): number { return STEP_ORDER.indexOf(getRecommendedStep(p, sif)) }

// ── Main ──────────────────────────────────────────────────────────────────

export function LifecycleCockpit() {
  const projects = useAppStore(s => s.projects)
  const navigate = useAppStore(s => s.navigate)
  const openNewProject = useAppStore(s => s.openNewProject)
  const openNewSIF = useAppStore(s => s.openNewSIF)
  const canCreateSIF = projects.some(p => p.status === 'active')

  const focusSifs = useMemo(() => buildFocusSifs(projects), [projects])
  const [selectedKey, setSelectedKey] = useState(focusSifs[0]?.key ?? '')
  const [selectedStep, setSelectedStep] = useState<LifecycleStepId>('hazard')
  const [hoveredStep, setHoveredStep] = useState<LifecycleStepId | null>(null)

  useEffect(() => { if (!focusSifs.length) { setSelectedKey(''); return } if (!focusSifs.some(i => i.key === selectedKey)) setSelectedKey(focusSifs[0].key) }, [focusSifs, selectedKey])
  const selected = focusSifs.find(i => i.key === selectedKey) ?? focusSifs[0] ?? null
  useEffect(() => { if (selected) setSelectedStep(selected.recommendedStep) }, [selected?.key, selected?.recommendedStep])

  const previewStepId = hoveredStep ?? selectedStep
  const previewStep = STEP_META[previewStepId]

  const openStep = (stepId: LifecycleStepId) => { if (!selected) return; if (stepId === 'hazard') { navigate({ type: 'hazop' }); return } navigate({ type: 'sif-dashboard', projectId: selected.project.id, sifId: selected.sif.id, tab: STEP_META[stepId].tab ?? 'context' }) }

  if (!focusSifs.length) {
    return (
      <div className="rounded-2xl border p-8" style={{ borderColor: BORDER, background: CARD }}>
        <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: TEAL_DIM }}>Cockpit</span>
        <h1 className="mt-2 text-2xl font-black tracking-tight" style={{ color: TEXT }}>Commencez par créer un projet et une SIF.</h1>
        <p className="mt-3 text-sm leading-relaxed max-w-xl" style={{ color: TEXT_DIM }}>Le cockpit guide chaque fonction de sécurité à travers le cycle de vie IEC 61511.</p>
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={openNewProject} className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold" style={{ background: `linear-gradient(135deg, ${TEAL}, #007A82)`, color: '#fff' }}><FolderPlus size={15} />Nouveau projet</button>
          <button type="button" onClick={() => openNewSIF()} disabled={!canCreateSIF} className="inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold disabled:opacity-40" style={{ borderColor: BORDER, background: BG, color: TEXT }}><FileText size={15} />Première SIF</button>
        </div>
      </div>
    )
  }

  const sifCalc = selected ? calcSIF(selected.sif, { projectStandard: selected.project.standard }) : null
  const done = selected ? completedSteps(selected.project, selected.sif) : 0
  const pct = Math.round((done / STEP_ORDER.length) * 100)

  const VS = 340, C = 170, IR = 100, OR = 145, SW = 60

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] shrink-0" style={{ color: TEAL_DIM }}>Cockpit</span>
          <select value={selectedKey} onChange={e => setSelectedKey(e.target.value)} className="h-9 min-w-[240px] rounded-lg border px-3 text-sm outline-none" style={{ borderColor: BORDER, background: BG, color: TEXT }}>
            {projects.map(p => <optgroup key={p.id} label={p.name}>{p.sifs.filter(s => s.status !== 'archived').map(s => <option key={s.id} value={`${p.id}:${s.id}`}>{s.sifNumber} — {s.title || 'Sans titre'}</option>)}</optgroup>)}
          </select>
        </div>
        <div className="flex gap-2 shrink-0">
          <button type="button" onClick={openNewProject} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold" style={{ borderColor: BORDER, background: BG, color: TEXT_DIM }}><FolderPlus size={12} />Projet</button>
          <button type="button" onClick={() => openNewSIF()} disabled={!canCreateSIF} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold disabled:opacity-40" style={{ background: TEAL, color: '#041014' }}><FileText size={12} />Nouvelle SIF</button>
        </div>
      </div>

      {selected && (
        <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
          {/* LEFT — Circle + detail */}
          <div className="rounded-2xl border p-5" style={{ borderColor: BORDER, background: CARD }}>
            <div className="flex flex-col items-center" onMouseLeave={() => setHoveredStep(null)}>
              <div className="relative" style={{ width: 320, maxWidth: '100%' }}>
                <svg viewBox={`0 0 ${VS} ${VS}`} className="w-full h-auto">
                  <defs><radialGradient id="lc-c" cx="50%" cy="50%" r="62%"><stop offset="0%" stopColor="#13202B" /><stop offset="68%" stopColor="#111821" /><stop offset="100%" stopColor="#0C1117" /></radialGradient></defs>
                  <circle cx={C} cy={C} r={OR + 10} fill="#0B1015" stroke="#1F2933" strokeWidth="0.5" />
                  <circle cx={C} cy={C} r={IR - 10} fill="url(#lc-c)" stroke="#1F2933" strokeWidth="0.5" />
                  {STEP_ORDER.map((stepId, i) => {
                    const step = STEP_META[stepId], sa = -90 + i * SW + 2, ea = sa + SW - 4
                    const path = describeArc(C, C, IR, OR, sa, ea)
                    const lp = polarToCartesian(C, C, (IR + OR) / 2, sa + (SW - 4) / 2)
                    const state = stepState(selected.project, selected.sif, stepId)
                    const isPrev = previewStepId === stepId
                    const fa = state === 'done' ? '28' : state === 'current' ? '2D' : '14'
                    return (
                      <g key={stepId}>
                        <path d={path} fill={`${step.accent}${fa}`} stroke={isPrev ? step.accent : '#26303A'} strokeWidth={isPrev ? 2 : 0.5}
                          style={{ cursor: 'pointer', filter: isPrev ? `drop-shadow(0 0 10px ${step.accent}50)` : 'none', transition: 'all 150ms ease' }}
                          onMouseEnter={() => setHoveredStep(stepId)} onClick={() => { setSelectedStep(stepId); openStep(stepId) }} />
                        <text x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle" fill={isPrev ? '#F8FBFF' : '#AAB8C8'}
                          fontSize="9.5" fontWeight="700" style={{ cursor: 'pointer', userSelect: 'none', letterSpacing: '0.04em' }}
                          onMouseEnter={() => setHoveredStep(stepId)} onClick={() => { setSelectedStep(stepId); openStep(stepId) }}>{step.shortLabel}</text>
                      </g>
                    )
                  })}
                </svg>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center text-center" style={{ width: IR * 1.3 }}>
                    <p className="text-[22px] font-black tracking-tight" style={{ color: TEXT }}>{selected.sif.sifNumber}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: TEXT_DIM }}>{selected.sif.title || selected.project.name}</p>
                    {sifCalc && <div className="mt-2 flex items-center gap-2">
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-mono font-bold" style={{ background: sifCalc.meetsTarget ? `${semantic.success}20` : `${semantic.error}20`, color: sifCalc.meetsTarget ? semantic.success : semantic.error }}>SIL {sifCalc.SIL}</span>
                      <span className="text-[9px] font-mono" style={{ color: TEXT_DIM }}>{formatPFD(sifCalc.PFD_avg)}</span>
                    </div>}
                  </div>
                </div>
              </div>
            </div>

            {/* Step detail */}
            <div className="mt-5 rounded-xl border p-4" style={{ borderColor: `${previewStep.accent}30`, background: `${previewStep.accent}06` }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: previewStep.accent }}>{previewStep.destination}</span>
                  <h3 className="mt-1 text-[15px] font-bold" style={{ color: TEXT }}>{previewStep.label}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>{getStepHint(selected.project, selected.sif, previewStepId)}</p>
                </div>
                <button type="button" onClick={() => openStep(previewStepId)} className="shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold" style={{ background: previewStep.accent, color: '#fff' }}>Ouvrir<ArrowRight size={12} /></button>
              </div>
            </div>
          </div>

          {/* RIGHT — KPIs */}
          <div className="space-y-4">
            {sifCalc && (
              <div className="rounded-2xl border p-4" style={{ borderColor: sifCalc.meetsTarget ? `${semantic.success}30` : `${semantic.error}30`, background: CARD }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Verdict SIL</span>
                  <Shield size={14} style={{ color: sifCalc.meetsTarget ? semantic.success : semantic.error }} />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black font-mono" style={{ color: sifCalc.meetsTarget ? semantic.success : semantic.error }}>SIL {sifCalc.SIL}</span>
                  <span className="text-sm" style={{ color: TEXT_DIM }}>/ cible {selected.sif.targetSIL}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg p-2.5" style={{ background: BG }}><p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>PFDavg</p><p className="text-sm font-mono font-bold mt-0.5" style={{ color: TEAL_DIM }}>{formatPFD(sifCalc.PFD_avg)}</p></div>
                  <div className="rounded-lg p-2.5" style={{ background: BG }}><p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>RRF</p><p className="text-sm font-mono font-bold mt-0.5" style={{ color: TEXT }}>{Math.round(sifCalc.RRF).toLocaleString()}</p></div>
                </div>
              </div>
            )}

            <div className="rounded-2xl border p-4" style={{ borderColor: BORDER, background: CARD }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Lifecycle</span>
                <span className="text-[13px] font-bold font-mono" style={{ color: pct >= 80 ? semantic.success : TEAL_DIM }}>{pct}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: `${TEAL}12` }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: pct >= 80 ? semantic.success : TEAL }} />
              </div>
              <div className="mt-3 space-y-1">
                {STEP_ORDER.map(stepId => {
                  const state = stepState(selected.project, selected.sif, stepId), step = STEP_META[stepId]
                  return (
                    <button key={stepId} type="button" onClick={() => { setSelectedStep(stepId); openStep(stepId) }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all text-left group"
                      style={{ background: previewStepId === stepId ? `${step.accent}10` : 'transparent' }}
                      onMouseEnter={() => setHoveredStep(stepId)} onMouseLeave={() => setHoveredStep(null)}>
                      {state === 'done' ? <CheckCircle2 size={12} style={{ color: step.accent }} /> : state === 'current' ? <Circle size={12} style={{ color: step.accent }} fill={step.accent} /> : <Circle size={12} style={{ color: '#3A4550' }} />}
                      <span className="flex-1 text-[11px] font-medium" style={{ color: state === 'upcoming' ? TEXT_DIM : TEXT }}>{step.shortLabel}</span>
                      <ChevronRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: TEXT_DIM }} />
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="rounded-2xl border p-4" style={{ borderColor: BORDER, background: CARD }}>
              <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Informations</span>
              <div className="mt-2 space-y-1.5">
                {[
                  { l: 'Projet', v: selected.project.name },
                  { l: 'Standard', v: selected.project.standard },
                  { l: 'Statut', v: selected.sif.status },
                  { l: 'Révision', v: selected.sif.revision || '—' },
                  { l: 'Composants', v: String(selected.sif.subsystems.reduce((s, sub) => s + sub.channels.reduce((cs, ch) => cs + ch.components.length, 0), 0)) },
                ].map(({ l, v }) => (
                  <div key={l} className="flex items-center justify-between py-1">
                    <span className="text-[10px]" style={{ color: TEXT_DIM }}>{l}</span>
                    <span className="text-[11px] font-semibold font-mono" style={{ color: TEXT }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
