import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, FileText, FolderPlus } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import type { Project, SIF } from '@/core/types'
import { calcSIF } from '@/core/math/pfdCalc'
import { BORDER, PANEL_BG, TEAL, TEXT, TEXT_DIM } from '@/styles/tokens'

type LifecycleStepId =
  | 'hazard'
  | 'allocation'
  | 'srs'
  | 'design'
  | 'validation'
  | 'operation'

interface FocusSIF {
  key: string
  project: Project
  sif: SIF
  recommendedStep: LifecycleStepId
}

const STEP_ORDER: LifecycleStepId[] = ['hazard', 'allocation', 'srs', 'design', 'validation', 'operation']

const STEP_META: Record<LifecycleStepId, {
  label: string
  shortLabel: string
  description: string
  accent: string
  destination: string
  tab?: 'context' | 'architecture' | 'verification' | 'exploitation'
}> = {
  hazard: {
    label: 'Analyse de danger et de risque',
    shortLabel: 'Risque',
    description: 'Traçabilité HAZOP / LOPA et scénario dangereux.',
    accent: '#F97316',
    destination: 'HAZOP / LOPA',
  },
  allocation: {
    label: 'Affectation aux couches de protection',
    shortLabel: 'Allocation',
    description: 'Lien entre la fonction de sécurité, les IPL et la cible SIL.',
    accent: '#60A5FA',
    destination: 'Contexte SIF',
    tab: 'context',
  },
  srs: {
    label: 'Exigences de sécurité / SRS',
    shortLabel: 'SRS',
    description: 'Exigences, tags process et données fonctionnelles de base.',
    accent: '#38BDF8',
    destination: 'Contexte SIF',
    tab: 'context',
  },
  design: {
    label: 'Conception / ingénierie',
    shortLabel: 'Conception',
    description: "Architecture de la SIF, sous-systèmes et composants.",
    accent: '#F59E0B',
    destination: 'Architecture',
    tab: 'architecture',
  },
  validation: {
    label: 'Validation / mise en service',
    shortLabel: 'Validation',
    description: 'Vérification SIL et préparation à la mise en service.',
    accent: '#A78BFA',
    destination: 'Vérification',
    tab: 'verification',
  },
  operation: {
    label: 'Exploitation / maintenance / proof test',
    shortLabel: 'Exploitation',
    description: 'Procédure, campagnes de test et tenue dans le temps.',
    accent: '#14B8A6',
    destination: 'Exploitation',
    tab: 'exploitation',
  },
}

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  }
}

function describeArc(cx: number, cy: number, innerRadius: number, outerRadius: number, startAngle: number, endAngle: number) {
  const outerStart = polarToCartesian(cx, cy, outerRadius, endAngle)
  const outerEnd = polarToCartesian(cx, cy, outerRadius, startAngle)
  const innerStart = polarToCartesian(cx, cy, innerRadius, startAngle)
  const innerEnd = polarToCartesian(cx, cy, innerRadius, endAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${innerEnd.x} ${innerEnd.y}`,
    'Z',
  ].join(' ')
}

function hasHazardData(sif: SIF): boolean {
  return Boolean(
    sif.hazopTrace?.hazopNode
    && sif.hazopTrace?.scenarioId
    && sif.hazopTrace?.initiatingEvent
    && sif.hazopTrace?.lopaRef,
  )
}

function hasAllocationData(sif: SIF): boolean {
  return Boolean(
    sif.targetSIL
    && sif.rrfRequired > 0
    && sif.hazopTrace?.iplList
    && sif.hazopTrace?.lopaRef,
  )
}

function hasSrsData(sif: SIF): boolean {
  return Boolean(
    sif.processTag
    && sif.hazardousEvent
    && sif.location
    && sif.description,
  )
}

function hasDesignData(sif: SIF): boolean {
  return sif.subsystems.some(subsystem =>
    subsystem.channels.some(channel => channel.components.length > 0),
  )
}

function hasValidationData(project: Project, sif: SIF): boolean {
  const result = calcSIF(sif, { projectStandard: project.standard })
  return result.meetsTarget && (sif.status === 'verified' || sif.status === 'approved')
}

function hasOperationData(sif: SIF): boolean {
  return Boolean(sif.proofTestProcedure || sif.testCampaigns.length > 0)
}

function getRecommendedStep(project: Project, sif: SIF): LifecycleStepId {
  if (!hasHazardData(sif)) return 'hazard'
  if (!hasAllocationData(sif)) return 'allocation'
  if (!hasSrsData(sif)) return 'srs'
  if (!hasDesignData(sif)) return 'design'
  if (!hasValidationData(project, sif)) return 'validation'
  return 'operation'
}

function getStepHint(project: Project, sif: SIF, stepId: LifecycleStepId): string {
  if (stepId === 'hazard') {
    return hasHazardData(sif)
      ? 'La base HAZOP / LOPA est renseignée.'
      : 'Compléter le scénario dangereux, la référence LOPA et le noeud HAZOP.'
  }
  if (stepId === 'allocation') {
    return hasAllocationData(sif)
      ? `Cible SIL ${sif.targetSIL} et couches de protection liées.`
      : 'Renseigner la couche de protection, la référence LOPA et la cible SIL.'
  }
  if (stepId === 'srs') {
    return hasSrsData(sif)
      ? `Tag ${sif.processTag || 'process'} et exigence fonctionnelle renseignés.`
      : 'Définir tag process, événement dangereux, lieu et description.'
  }
  if (stepId === 'design') {
    return hasDesignData(sif)
      ? 'Des composants sont déjà affectés à la fonction de sécurité.'
      : "L'architecture de la SIF n'est pas encore réellement configurée."
  }
  if (stepId === 'validation') {
    const result = calcSIF(sif, { projectStandard: project.standard })
    return hasValidationData(project, sif)
      ? `SIL atteint: ${result.SIL} / cible ${sif.targetSIL}.`
      : `Vérification requise: SIL atteint ${result.SIL} / cible ${sif.targetSIL}.`
  }
  return hasOperationData(sif)
    ? 'La phase exploitation / proof test est déjà engagée.'
    : 'Aucune procédure ni campagne de proof test enregistrée.'
}

function buildFocusSifs(projects: Project[]): FocusSIF[] {
  return projects.flatMap(project =>
    project.sifs
      .filter(sif => sif.status !== 'archived')
      .map(sif => ({
        key: `${project.id}:${sif.id}`,
        project,
        sif,
        recommendedStep: getRecommendedStep(project, sif),
      })),
  )
}

function stepState(project: Project, sif: SIF, stepId: LifecycleStepId): 'done' | 'current' | 'upcoming' {
  const recommended = getRecommendedStep(project, sif)
  const currentIndex = STEP_ORDER.indexOf(recommended)
  const stepIndex = STEP_ORDER.indexOf(stepId)
  if (stepIndex < currentIndex) return 'done'
  if (stepIndex === currentIndex) return 'current'
  return 'upcoming'
}

export function LifecycleCockpit() {
  const projects = useAppStore(state => state.projects)
  const navigate = useAppStore(state => state.navigate)
  const openNewProject = useAppStore(state => state.openNewProject)
  const openNewSIF = useAppStore(state => state.openNewSIF)
  const canCreateSIF = projects.some(project => project.status === 'active')

  const focusSifs = useMemo(() => buildFocusSifs(projects), [projects])
  const [selectedKey, setSelectedKey] = useState<string>(focusSifs[0]?.key ?? '')
  const [selectedStep, setSelectedStep] = useState<LifecycleStepId>('hazard')
  const [hoveredStep, setHoveredStep] = useState<LifecycleStepId | null>(null)

  useEffect(() => {
    if (!focusSifs.length) {
      setSelectedKey('')
      return
    }
    if (!focusSifs.some(item => item.key === selectedKey)) {
      setSelectedKey(focusSifs[0].key)
    }
  }, [focusSifs, selectedKey])

  const selected = focusSifs.find(item => item.key === selectedKey) ?? focusSifs[0] ?? null

  useEffect(() => {
    if (selected) setSelectedStep(selected.recommendedStep)
  }, [selected?.key, selected?.recommendedStep])

  const previewStepId = hoveredStep ?? selectedStep
  const previewStep = STEP_META[previewStepId]

  const openStep = (stepId: LifecycleStepId) => {
    if (!selected) return
    const step = STEP_META[stepId]
    if (stepId === 'hazard') {
      navigate({ type: 'hazop' })
      return
    }
    navigate({
      type: 'sif-dashboard',
      projectId: selected.project.id,
      sifId: selected.sif.id,
      tab: step.tab ?? 'context',
    })
  }

  if (!focusSifs.length) {
    return (
      <div
        className="rounded-[26px] border px-8 py-7"
        style={{
          borderColor: BORDER,
          background: 'linear-gradient(145deg, #101720 0%, #131A22 42%, #0C1117 100%)',
        }}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: '#5FD8D2' }}>
          Cycle de vie SIF
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight" style={{ color: TEXT }}>
          Le cercle devient l'entrée dans le cycle de vie de la fonction de sécurité.
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7" style={{ color: TEXT_DIM }}>
          Crée un projet puis une SIF. Le cercle permettra ensuite de rentrer directement dans l'étape utile:
          danger, allocation, SRS, conception, validation ou exploitation.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={openNewProject}
            className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold"
            style={{ background: `linear-gradient(135deg, ${TEAL}, #007A82)`, color: '#fff' }}
          >
            <FolderPlus size={16} />
            Nouveau projet
          </button>
          <button
            type="button"
            onClick={() => openNewSIF()}
            disabled={!canCreateSIF}
            className="inline-flex items-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold disabled:opacity-40"
            style={{ borderColor: BORDER, background: PANEL_BG, color: TEXT }}
          >
            <FileText size={16} />
            Première SIF
          </button>
        </div>
      </div>
    )
  }

  const circleSize = 460
  const viewBoxSize = 420
  const center = 210
  const innerRadius = 126
  const outerRadius = 178
  const sweep = 360 / STEP_ORDER.length

  return (
    <div
      className="rounded-[26px] border px-8 py-7"
      style={{
        borderColor: BORDER,
        background: 'linear-gradient(145deg, #101720 0%, #131A22 36%, #0C1117 100%)',
      }}
    >
      <div className="flex flex-col gap-5 border-b pb-6 xl:flex-row xl:items-end xl:justify-between" style={{ borderColor: '#22303B' }}>
        <div className="max-w-3xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: '#5FD8D2' }}>
            Cycle de vie SIF
          </p>
          <h1 className="mt-3 text-[32px] font-black tracking-tight" style={{ color: TEXT }}>
            Cercle interactif de navigation lifecycle.
          </h1>
          <p className="mt-4 text-sm leading-7" style={{ color: TEXT_DIM }}>
            Basé sur le fil métier SIF: analyse de danger, affectation aux couches de protection, SRS,
            conception, validation, puis exploitation / maintenance.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={openNewProject}
            className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold"
            style={{ borderColor: BORDER, background: PANEL_BG, color: TEXT }}
          >
            <FolderPlus size={15} />
            Nouveau projet
          </button>
          <button
            type="button"
            onClick={() => openNewSIF()}
            disabled={!canCreateSIF}
            className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold disabled:opacity-40"
            style={{ background: `linear-gradient(135deg, ${TEAL}, #007A82)`, color: '#fff' }}
          >
            <FileText size={15} />
            Nouvelle SIF
          </button>
        </div>
      </div>

      <div className="mt-6">
        <label className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: TEXT_DIM }}>
          Fonction de sécurité ciblée
        </label>
        <select
          value={selectedKey}
          onChange={event => setSelectedKey(event.target.value)}
          className="mt-3 h-12 w-full rounded-2xl border px-4 text-sm outline-none transition-colors"
          style={{
            borderColor: BORDER,
            background: '#10161D',
            color: TEXT,
          }}
        >
          {projects.map(project => (
            <optgroup key={project.id} label={project.name}>
              {project.sifs
                .filter(sif => sif.status !== 'archived')
                .map(sif => (
                  <option key={sif.id} value={`${project.id}:${sif.id}`}>
                    {sif.sifNumber} - {sif.title || 'Sans titre'}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </div>

      {selected && (
        <div className="mt-8 flex flex-col items-center" onMouseLeave={() => setHoveredStep(null)}>
          <div className="relative" style={{ width: circleSize, maxWidth: '100%' }}>
            <svg viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} className="w-full h-auto">
              <defs>
                <radialGradient id="lifecycle-core" cx="50%" cy="50%" r="62%">
                  <stop offset="0%" stopColor="#13202B" />
                  <stop offset="68%" stopColor="#111821" />
                  <stop offset="100%" stopColor="#0C1117" />
                </radialGradient>
              </defs>

              <circle cx={center} cy={center} r={outerRadius + 12} fill="#0B1015" stroke="#1F2933" strokeWidth="1" />
              <circle cx={center} cy={center} r={innerRadius - 12} fill="url(#lifecycle-core)" stroke="#1F2933" strokeWidth="1" />

              {STEP_ORDER.map((stepId, index) => {
                const step = STEP_META[stepId]
                const startAngle = -90 + index * sweep + 2.4
                const endAngle = startAngle + sweep - 4.8
                const path = describeArc(center, center, innerRadius, outerRadius, startAngle, endAngle)
                const labelPoint = polarToCartesian(center, center, 152, startAngle + (sweep - 4.8) / 2)
                const connectorPoint = polarToCartesian(center, center, (innerRadius + outerRadius) / 2, -90 + (index + 1) * sweep)
                const state = stepState(selected.project, selected.sif, stepId)
                const isSelected = selectedStep === stepId
                const isHovered = hoveredStep === stepId
                const isPreviewed = previewStepId === stepId
                const fillAlpha = state === 'done' ? '28' : state === 'current' ? '2D' : '14'

                return (
                  <g key={stepId}>
                    <path
                      d={path}
                      fill={`${step.accent}${fillAlpha}`}
                      stroke={isPreviewed ? step.accent : '#26303A'}
                      strokeWidth={isPreviewed ? 2.5 : 1}
                      style={{
                        cursor: 'pointer',
                        filter: isHovered || isSelected ? `drop-shadow(0 0 12px ${step.accent}55)` : 'none',
                        transition: 'filter 160ms ease, stroke-width 160ms ease',
                      }}
                      onMouseEnter={() => setHoveredStep(stepId)}
                      onClick={() => {
                        setSelectedStep(stepId)
                        openStep(stepId)
                      }}
                    />

                    <text
                      x={labelPoint.x}
                      y={labelPoint.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={isPreviewed ? '#F8FBFF' : '#D5E0EA'}
                      fontSize="11"
                      fontWeight="700"
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      onMouseEnter={() => setHoveredStep(stepId)}
                      onClick={() => {
                        setSelectedStep(stepId)
                        openStep(stepId)
                      }}
                    >
                      {step.shortLabel}
                    </text>

                    {index < STEP_ORDER.length - 1 && (
                      <g>
                        <circle
                          cx={connectorPoint.x}
                          cy={connectorPoint.y}
                          r={11}
                          fill="#0F151D"
                          stroke={isPreviewed ? step.accent : '#22303B'}
                          strokeWidth={isPreviewed ? 2 : 1}
                        />
                        <circle
                          cx={connectorPoint.x}
                          cy={connectorPoint.y}
                          r={5}
                          fill={step.accent}
                          opacity={isPreviewed ? 0.95 : 0.55}
                        />
                      </g>
                    )}
                  </g>
                )
              })}
            </svg>

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className="flex h-[178px] w-[178px] flex-col items-center justify-center rounded-full border text-center"
                style={{
                  borderColor: '#22303B',
                  background: 'radial-gradient(circle at 50% 35%, #18232D 0%, #10161D 58%, #0D1218 100%)',
                  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.02), 0 12px 24px rgba(0,0,0,0.28)',
                }}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: TEXT_DIM }}>
                  Fonction de sécurité
                </p>
                <p className="mt-2 text-2xl font-black tracking-tight" style={{ color: TEXT }}>
                  {selected.sif.sifNumber}
                </p>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
                  {selected.project.name}
                </p>
                
              </div>
            </div>
          </div>

          <div className="mt-6 w-full max-w-4xl rounded-[22px] border px-5 py-5" style={{ borderColor: '#22303B', background: '#10161D' }}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: previewStep.accent }}>
                  {previewStep.destination}
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight" style={{ color: TEXT }}>
                  {previewStep.label}
                </h2>
                <p className="mt-3 text-sm leading-7" style={{ color: TEXT_DIM }}>
                  {previewStep.description}
                </p>
                <p className="mt-3 text-sm leading-7" style={{ color: TEXT_DIM }}>
                  {getStepHint(selected.project, selected.sif, previewStepId)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => openStep(previewStepId)}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold"
                style={{ background: `linear-gradient(135deg, ${previewStep.accent}, #0F1720)`, color: '#fff' }}
              >
                Ouvrir cette étape
                <ArrowRight size={15} />
              </button>
            </div>

            <div className="mt-6 grid gap-2 md:grid-cols-2 xl:grid-cols-6">
              {STEP_ORDER.map(stepId => {
                const step = STEP_META[stepId]
                const active = previewStepId === stepId
                const recommended = selected.recommendedStep === stepId
                return (
                  <button
                    key={stepId}
                    type="button"
                    onMouseEnter={() => setHoveredStep(stepId)}
                    onClick={() => {
                      setSelectedStep(stepId)
                      openStep(stepId)
                    }}
                    className="flex min-h-[82px] flex-col items-start justify-between rounded-[18px] border px-4 py-3 text-left transition-colors"
                    style={{
                      borderColor: active ? `${step.accent}55` : '#22303B',
                      background: active ? `${step.accent}10` : '#0F151D',
                    }}
                  >
                    <span className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: active ? step.accent : TEXT_DIM }}>
                      {step.shortLabel}
                    </span>
                    <span className="text-sm font-semibold leading-5" style={{ color: active ? TEXT : '#C7D0D9' }}>
                      {step.label}
                    </span>
                    {recommended ? (
                      <span
                        className="rounded-full border px-2 py-0.5 text-[10px] font-bold"
                        style={{
                          borderColor: `${step.accent}44`,
                          background: `${step.accent}18`,
                          color: step.accent,
                        }}
                      >
                        Recommandée
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold" style={{ color: TEXT_DIM }}>
                        {step.destination}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
