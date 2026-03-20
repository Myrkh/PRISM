import type { ElementType } from 'react'
import {
  Activity,
  Archive,
  ChevronDown,
  Cpu,
  GripVertical,
  Layers,
  Trash2,
  Zap,
} from 'lucide-react'
import type {
  AdvancedParams,
  ComponentTemplate,
  DevelopedParams,
  SubsystemType,
} from '@/core/types'
import { buildLibraryDragPayload } from '@/features/library'
import { usePrismTheme } from '@/styles/usePrismTheme'

export type LibraryOriginBadge = 'builtin' | 'project' | 'user'

export const LIBRARY_PREVIEW_COUNT = 5
export const INITIAL_LIBRARY_VISIBLE_COUNT: Record<SubsystemType, number> = {
  sensor: LIBRARY_PREVIEW_COUNT,
  logic: 999,
  actuator: LIBRARY_PREVIEW_COUNT,
}

export const LIBRARY_SUBSYSTEM_META: Record<SubsystemType, { color: string; label: string; Icon: ElementType }> = {
  sensor:   { color: '#0284C7', label: 'Capteurs',    Icon: Activity },
  logic:    { color: '#7C3AED', label: 'Logique',     Icon: Cpu },
  actuator: { color: '#EA580C', label: 'Actionneurs', Icon: Zap },
}

export const LIBRARY_ORIGIN_STYLE: Record<LibraryOriginBadge, { label: string }> = {
  builtin: { label: 'std' },
  project: { label: 'projet' },
  user: { label: 'perso' },
}

function formatLambda(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return 'n/a'
  return Number(value).toLocaleString('fr-FR', {
    maximumFractionDigits: value >= 100 ? 0 : 3,
  })
}

function formatRatio(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return 'n/a'
  return `${(value * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}%`
}

function formatDuration(value: number | null | undefined, unit?: string | null) {
  if (value == null || !Number.isFinite(value)) return 'n/a'
  return `${Number(value).toLocaleString('fr-FR', { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ''}`
}

function hasDevelopedContent(values: DevelopedParams) {
  return [values.lambda_DU, values.lambda_DD, values.lambda_SD, values.lambda_SU]
    .some(value => Math.abs(value ?? 0) > 0)
}

function hasAdvancedContent(values: AdvancedParams) {
  return [
    values.MTTR,
    values.gamma,
    values.lambdaStar,
    values.testDuration,
    values.sigma,
    values.omega1,
    values.omega2,
    values.proofTestCoverage,
    values.lifetime,
    values.DCalarmedOnly,
    values.partialTest?.enabled ? 1 : 0,
  ].some(value => value != null && Math.abs(Number(value) || 0) > 0)
}

function getOriginTone(origin: LibraryOriginBadge, {
  BORDER,
  TEAL,
  TEAL_DIM,
  TEXT_DIM,
}: {
  BORDER: string
  TEAL: string
  TEAL_DIM: string
  TEXT_DIM: string
}) {
  if (origin === 'builtin') {
    return { color: TEXT_DIM, bg: `${BORDER}60` }
  }
  if (origin === 'project') {
    return { color: '#F59E0B', bg: '#F59E0B18' }
  }
  return { color: TEAL_DIM, bg: `${TEAL}15` }
}

function ParameterReadout({ label, value }: { label: string; value: string }) {
  const { TEXT, TEXT_DIM } = usePrismTheme()
  return (
    <div>
      <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>{label}</p>
      <p className="mt-1 text-[10px] font-medium font-mono" style={{ color: TEXT }}>{value}</p>
    </div>
  )
}

export function LibraryOriginLegend() {
  const { BORDER, PAGE_BG, TEAL, TEAL_DIM, TEXT_DIM } = usePrismTheme()

  return (
    <div
      className="flex flex-wrap items-center gap-3 px-3 py-2"
      style={{ borderTop: `1px solid ${BORDER}`, background: PAGE_BG }}
    >
      {(Object.entries(LIBRARY_ORIGIN_STYLE) as [LibraryOriginBadge, typeof LIBRARY_ORIGIN_STYLE[LibraryOriginBadge]][]).map(([key, entry]) => {
        const tone = getOriginTone(key, { BORDER, TEAL, TEAL_DIM, TEXT_DIM })
        return (
          <span key={key} className="flex items-center gap-1 text-[9px]" style={{ color: TEXT_DIM }}>
            <span className="rounded px-1 py-0.5 text-[8px] font-bold" style={{ background: tone.bg, color: tone.color }}>
              {entry.label}
            </span>
            {key === 'builtin' ? 'standard' : key === 'project' ? 'projet' : 'personnel'}
          </span>
        )
      })}
    </div>
  )
}

export function LibraryTemplateCard({
  template,
  origin,
  expanded,
  onToggleDetails,
  onArchive,
  onDelete,
  selected = false,
  onSelect,
  dragEnabled = false,
}: {
  template: ComponentTemplate
  origin: LibraryOriginBadge
  expanded: boolean
  onToggleDetails: (id: string) => void
  onArchive?: (id: string) => void
  onDelete?: (id: string) => void
  selected?: boolean
  onSelect?: () => void
  dragEnabled?: boolean
}) {
  const { BORDER, PAGE_BG, SURFACE, SHADOW_SOFT, TEAL, TEAL_DIM, TEXT, TEXT_DIM } = usePrismTheme()
  const meta = LIBRARY_SUBSYSTEM_META[template.subsystemType]
  const originStyle = LIBRARY_ORIGIN_STYLE[origin]
  const originTone = getOriginTone(origin, { BORDER, TEAL, TEAL_DIM, TEXT_DIM })
  const snapshot = template.componentSnapshot
  const developedVisible = hasDevelopedContent(snapshot.developed) || snapshot.paramMode === 'developed'
  const advancedVisible = hasAdvancedContent(snapshot.advanced)
  const fieldTone = { border: `${BORDER}A6`, background: PAGE_BG }

  return (
    <div style={{ borderBottom: `1px solid ${BORDER}28` }}>
      <div
        draggable={dragEnabled}
        onClick={() => onSelect?.()}
        onDragStart={event => {
          if (!dragEnabled) return
          event.dataTransfer.setData('application/prism-lib', buildLibraryDragPayload(template))
          event.dataTransfer.effectAllowed = 'copy'
        }}
        role={onSelect ? 'button' : undefined}
        tabIndex={onSelect ? 0 : undefined}
        onKeyDown={event => {
          if (!onSelect) return
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onSelect()
          }
        }}
        className={`group relative flex items-center gap-2 px-3 py-2 transition-[background-color,box-shadow,transform] ${dragEnabled ? 'cursor-grab active:cursor-grabbing' : onSelect ? 'cursor-pointer' : ''}`}
        style={{
          background: selected ? SURFACE : 'transparent',
          boxShadow: selected ? SHADOW_SOFT : 'none',
        }}
      >
        <div
          className="pointer-events-none absolute left-0 top-1 bottom-1 w-0.5 rounded-full transition-[opacity,transform] duration-150 ease-out"
          style={{
            background: meta.color,
            opacity: selected ? 1 : 0,
            transform: `translateX(${selected ? '0px' : '-1px'}) scaleY(${selected ? 1 : 0.55})`,
          }}
        />
        <GripVertical
          size={10}
          className={`shrink-0 transition-opacity ${dragEnabled ? 'opacity-30 group-hover:opacity-70' : 'opacity-0'}`}
          style={{ color: meta.color }}
        />
        <meta.Icon size={11} className="shrink-0" style={{ color: meta.color }} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-medium" style={{ color: TEXT }}>{template.name}</p>
          {(template.libraryName || template.manufacturer || template.instrumentType) && (
            <p className="truncate text-[9px]" style={{ color: TEXT_DIM }}>
              {[template.libraryName, template.instrumentType, template.manufacturer].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <button
          type="button"
          draggable={false}
          onClick={event => {
            event.stopPropagation()
            onToggleDetails(template.id)
          }}
          className="prism-action flex h-6 w-6 shrink-0 items-center justify-center rounded-md border opacity-0 transition-all group-hover:opacity-100 group-focus-within:opacity-100"
          style={{
            borderColor: expanded ? `${meta.color}55` : `${BORDER}A6`,
            color: expanded ? meta.color : TEXT_DIM,
            background: expanded ? `${meta.color}10` : PAGE_BG,
          }}
          title={expanded ? 'Masquer le détail' : 'Voir les paramètres'}
        >
          {expanded ? <ChevronDown size={11} /> : <Layers size={11} />}
        </button>
        <span
          className="shrink-0 rounded px-1 py-0.5 text-[8px] font-bold"
          style={{ background: originTone.bg, color: originTone.color }}
        >
          {originStyle.label}
        </span>
        {(onArchive || onDelete) && (
          <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            {onArchive && (
              <button
                type="button"
                draggable={false}
                onClick={event => {
                  event.stopPropagation()
                  onArchive(template.id)
                }}
                className="rounded p-1 transition-colors hover:bg-amber-900/30"
                style={{ color: '#FBBF24' }}
                title="Archiver"
              >
                <Archive size={10} />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                draggable={false}
                onClick={event => {
                  event.stopPropagation()
                  onDelete(template.id)
                }}
                className="rounded p-1 transition-colors hover:bg-red-900/30"
                style={{ color: '#F87171' }}
                title="Supprimer"
              >
                <Trash2 size={10} />
              </button>
            )}
          </div>
        )}
      </div>

      {expanded && (
        <div className="px-3 pb-3">
          <div
            className="rounded-xl border px-3 py-3"
            style={{
              borderColor: `${meta.color}28`,
              background: SURFACE,
              boxShadow: SHADOW_SOFT,
            }}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: meta.color }}>
                  {template.instrumentType || meta.label}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed" style={{ color: TEXT }}>
                  {[template.manufacturer, template.dataSource].filter(Boolean).join(' · ') || 'Bibliothèque standard'}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                {template.libraryName ? (
                  <span className="rounded px-1.5 py-0.5 text-[8px] font-semibold" style={{ background: `${meta.color}12`, color: meta.color }}>
                    {template.libraryName}
                  </span>
                ) : null}
                {template.sourceReference ? (
                  <span className="rounded px-1.5 py-0.5 text-[8px] font-semibold" style={{ background: `${meta.color}12`, color: meta.color }}>
                    {template.sourceReference}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))' }}>
              <div className="rounded-lg border px-2.5 py-2" style={fieldTone}>
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>lambda</p>
                <p className="mt-1 text-[11px] font-semibold font-mono" style={{ color: TEXT }}>
                  {formatLambda(snapshot.factorized.lambda)}
                </p>
              </div>
              <div className="rounded-lg border px-2.5 py-2" style={fieldTone}>
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>λD/λ</p>
                <p className="mt-1 text-[11px] font-semibold font-mono" style={{ color: TEXT }}>
                  {formatRatio(snapshot.factorized.lambdaDRatio)}
                </p>
              </div>
              <div className="rounded-lg border px-2.5 py-2" style={fieldTone}>
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>DC</p>
                <p className="mt-1 text-[11px] font-semibold font-mono" style={{ color: TEXT }}>
                  {formatRatio(snapshot.factorized.DCd)}
                </p>
              </div>
              <div className="rounded-lg border px-2.5 py-2" style={fieldTone}>
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>T1</p>
                <p className="mt-1 text-[11px] font-semibold font-mono" style={{ color: TEXT }}>
                  {formatDuration(snapshot.test.T1, snapshot.test.T1Unit)}
                </p>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <div className="rounded-lg border px-2.5 py-2" style={fieldTone}>
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Factorisé</p>
                <div className="mt-2 grid gap-2 text-[10px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))' }}>
                  <ParameterReadout label="λ total" value={formatLambda(snapshot.factorized.lambda)} />
                  <ParameterReadout label="λD / λ" value={formatRatio(snapshot.factorized.lambdaDRatio)} />
                  <ParameterReadout label="DCd" value={formatRatio(snapshot.factorized.DCd)} />
                  <ParameterReadout label="DCs" value={formatRatio(snapshot.factorized.DCs)} />
                </div>
              </div>

              {developedVisible && (
                <div className="rounded-lg border px-2.5 py-2" style={fieldTone}>
                  <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Développé</p>
                  <div className="mt-2 grid gap-2 text-[10px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))' }}>
                    <ParameterReadout label="λDU" value={formatLambda(snapshot.developed.lambda_DU)} />
                    <ParameterReadout label="λDD" value={formatLambda(snapshot.developed.lambda_DD)} />
                    <ParameterReadout label="λSD" value={formatLambda(snapshot.developed.lambda_SD)} />
                    <ParameterReadout label="λSU" value={formatLambda(snapshot.developed.lambda_SU)} />
                  </div>
                </div>
              )}

              <div className="rounded-lg border px-2.5 py-2" style={fieldTone}>
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Test</p>
                <div className="mt-2 grid gap-2 text-[10px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))' }}>
                  <ParameterReadout label="Type" value={snapshot.test.testType} />
                  <ParameterReadout label="T1" value={formatDuration(snapshot.test.T1, snapshot.test.T1Unit)} />
                  <ParameterReadout label="T0" value={formatDuration(snapshot.test.T0, snapshot.test.T0Unit)} />
                </div>
              </div>

              {advancedVisible && (
                <div className="rounded-lg border px-2.5 py-2" style={fieldTone}>
                  <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Avancé</p>
                  <div className="mt-2 grid gap-2 text-[10px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))' }}>
                    <ParameterReadout label="MTTR" value={formatDuration(snapshot.advanced.MTTR, 'hr')} />
                    <ParameterReadout label="γ" value={String(snapshot.advanced.gamma ?? 0)} />
                    <ParameterReadout label="λ*" value={formatLambda(snapshot.advanced.lambdaStar)} />
                    <ParameterReadout label="π" value={formatDuration(snapshot.advanced.testDuration, 'hr')} />
                    <ParameterReadout label="PTC" value={formatRatio(snapshot.advanced.proofTestCoverage)} />
                    <ParameterReadout label="Lifetime" value={snapshot.advanced.lifetime == null ? 'n/a' : formatDuration(snapshot.advanced.lifetime, 'yr')} />
                  </div>
                  {snapshot.advanced.partialTest?.enabled && (
                    <div className="mt-2 rounded-lg border px-2.5 py-2" style={{ borderColor: `${meta.color}22`, background: `${meta.color}08` }}>
                      <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: meta.color }}>Partial stroke test</p>
                      <div className="mt-2 grid gap-2 text-[10px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))' }}>
                        <ParameterReadout label="Durée" value={formatDuration(snapshot.advanced.partialTest.duration, 'hr')} />
                        <ParameterReadout label="Détection" value={formatRatio(snapshot.advanced.partialTest.detectedFaultsPct)} />
                        <ParameterReadout label="Nb tests" value={String(snapshot.advanced.partialTest.numberOfTests ?? 0)} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
