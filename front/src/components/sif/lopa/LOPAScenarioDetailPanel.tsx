/**
 * components/sif/lopa/LOPAScenarioDetailPanel.tsx — PRISM
 *
 * Right-side panel for a selected LOPA scenario:
 *   - Scenario metadata editor
 *   - IPL credit list (add / edit / remove)
 *   - Waterfall chart (gamechanger: log-scale risk reduction visualization)
 */
import { useState } from 'react'
import {
  AlertTriangle, CheckCircle2, ChevronDown, ChevronRight,
  Info, Layers, Plus, Shield, Trash2, X,
} from 'lucide-react'
import type { ConsequenceCategory, IPLCredit, IPLType, LOPAScenario, LOPAScenarioResult } from '@/core/types/lopa.types'
import { IPL_LIBRARY, IPL_TYPE_COLORS, IPL_TYPE_LABELS } from '@/engine/lopa/iplLibrary'
import { formatFrequency, formatRRF } from '@/engine/lopa/calculator'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { semantic } from '@/styles/tokens'

const CONSEQUENCE_LABELS: Record<ConsequenceCategory, string> = {
  safety_personnel:    'Sécurité personnel',
  safety_public:       'Sécurité public',
  environment_local:   'Environnement (local)',
  environment_regional:'Environnement (régional)',
  asset:               'Actifs / équipements',
  production:          'Production / économique',
}

interface Props {
  scenario: LOPAScenario
  result: LOPAScenarioResult
  isLocked: boolean
  onUpdate: (updates: Partial<LOPAScenario>) => void
  onClose: () => void
}

// ─── Waterfall Chart ─────────────────────────────────────────────────────────

function WaterfallChart({ result }: { result: LOPAScenarioResult }) {
  const { BORDER, TEAL, TEXT, TEXT_DIM } = usePrismTheme()

  const steps = result.waterfall.filter(s => !s.isTarget)
  const targetStep = result.waterfall.find(s => s.isTarget)

  if (steps.length < 2) {
    return (
      <div className="flex items-center justify-center h-20 text-xs" style={{ color: TEXT_DIM }}>
        Ajoutez des IPL pour voir le graphique de réduction de risque.
      </div>
    )
  }

  const maxLog = Math.ceil(-Math.log10(steps[steps.length - 1].runningMef)) + 1
  const minLog = Math.floor(-Math.log10(steps[0].runningMef)) - 1
  const logRange = maxLog - minLog

  const toX = (val: number) => {
    if (val <= 0) return 100
    const log = -Math.log10(val)
    return Math.max(0, Math.min(100, ((log - minLog) / logRange) * 100))
  }

  const silColors: Record<number, string> = {
    0: '#10B981',
    1: '#16A34A',
    2: '#2563EB',
    3: '#D97706',
    4: '#7C3AED',
  }
  const barColor = result.isAdequate ? '#10B981' : silColors[result.silRequired] ?? '#EC4899'
  const tmelX = targetStep ? toX(targetStep.runningMef) : null

  return (
    <div className="space-y-1.5">
      {/* Chart area */}
      <div className="relative">
        {/* X-axis labels */}
        <div className="flex justify-between mb-1 text-[9px]" style={{ color: TEXT_DIM }}>
          {Array.from({ length: maxLog - minLog + 1 }, (_, i) => minLog + i).map(exp => (
            <span key={exp}>10⁻{exp}</span>
          ))}
        </div>

        {/* Bars */}
        <div className="space-y-1">
          {steps.map((step, i) => {
            const isFirst = i === 0
            const width = isFirst ? toX(step.runningMef) : toX(steps[i - 1]?.runningMef ?? step.runningMef)
            const currentWidth = toX(step.runningMef)
            const isIef = isFirst

            return (
              <div key={i} className="flex items-center gap-2">
                <div className="w-28 shrink-0 text-[9px] truncate text-right" style={{ color: TEXT_DIM }} title={step.label}>
                  {step.label}
                </div>
                <div className="flex-1 relative h-4">
                  {/* Background track */}
                  <div className="absolute inset-0 rounded-sm" style={{ background: `${BORDER}40` }} />
                  {/* Bar */}
                  <div
                    className="absolute left-0 top-0 h-full rounded-sm transition-all"
                    style={{
                      width: `${currentWidth}%`,
                      background: isIef
                        ? `${TEAL}60`
                        : `${barColor}${Math.round(70 - i * 8).toString(16).padStart(2, '0')}`,
                    }}
                  />
                  {/* TMEL target line */}
                  {tmelX !== null && (
                    <div
                      className="absolute top-0 bottom-0 w-px"
                      style={{ left: `${tmelX}%`, background: result.isAdequate ? '#10B981' : '#EF4444', zIndex: 2 }}
                    />
                  )}
                </div>
                <div className="w-20 shrink-0 text-[9px] font-mono text-right" style={{ color: TEXT }}>
                  {formatFrequency(step.runningMef)}
                </div>
              </div>
            )
          })}

          {/* TMEL row */}
          {targetStep && (
            <div className="flex items-center gap-2 pt-1" style={{ borderTop: `1px dashed ${BORDER}` }}>
              <div className="w-28 shrink-0 text-[9px] truncate text-right font-semibold" style={{ color: result.isAdequate ? '#10B981' : '#EF4444' }}>
                TMEL cible
              </div>
              <div className="flex-1 relative h-4">
                <div className="absolute inset-0 rounded-sm" style={{ background: `${BORDER}40` }} />
                <div
                  className="absolute left-0 top-0 h-full rounded-sm"
                  style={{ width: `${toX(targetStep.runningMef)}%`, background: result.isAdequate ? '#10B98130' : '#EF444420' }}
                />
              </div>
              <div className="w-20 shrink-0 text-[9px] font-mono text-right font-semibold" style={{ color: result.isAdequate ? '#10B981' : '#EF4444' }}>
                {formatFrequency(targetStep.runningMef)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Result pill */}
      <div
        className="mt-2 flex items-center justify-between rounded-lg px-3 py-2"
        style={{
          background: result.isAdequate ? '#10B98112' : `${barColor}12`,
          border: `1px solid ${result.isAdequate ? '#10B98130' : `${barColor}30`}`,
        }}
      >
        <div className="flex items-center gap-1.5">
          {result.isAdequate
            ? <CheckCircle2 size={12} color="#10B981" />
            : <AlertTriangle size={12} color={barColor} />
          }
          <span className="text-[10px] font-semibold" style={{ color: result.isAdequate ? '#10B981' : barColor }}>
            {result.isAdequate
              ? 'Adéquat — MEF ≤ TMEL'
              : result.needsSIF
                ? `SIF requis — SIL ${result.silRequired} (RRF = ${formatRRF(result.rrf)})`
                : `Risque résiduel supérieur à TMEL`
            }
          </span>
        </div>
        <span className="text-[10px] font-mono" style={{ color: TEXT_DIM }}>
          MEF = {formatFrequency(result.mef)}/an
        </span>
      </div>
    </div>
  )
}

// ─── IPL Row ──────────────────────────────────────────────────────────────────

function IPLRow({
  ipl,
  isLocked,
  onUpdate,
  onDelete,
}: {
  ipl: IPLCredit
  isLocked: boolean
  onUpdate: (updates: Partial<IPLCredit>) => void
  onDelete: () => void
}) {
  const { BORDER, CARD_BG, TEXT, TEXT_DIM } = usePrismTheme()
  const [expanded, setExpanded] = useState(false)
  const typeColor = IPL_TYPE_COLORS[ipl.type]

  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: BORDER }}>
      <div className="flex items-center gap-2 px-3 py-2" style={{ background: CARD_BG }}>
        {/* Type badge */}
        <span
          className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide"
          style={{ background: `${typeColor}18`, color: typeColor }}
        >
          {IPL_TYPE_LABELS[ipl.type]}
        </span>

        {/* Tag + description */}
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold truncate block" style={{ color: TEXT }}>
            {ipl.tag || ipl.description || 'IPL sans nom'}
          </span>
        </div>

        {/* PFD badge */}
        <span className="shrink-0 text-[10px] font-mono font-bold" style={{ color: typeColor }}>
          {ipl.pfd.toExponential(0)}
        </span>

        {/* Validated indicator */}
        {ipl.isValidated && <CheckCircle2 size={11} color="#10B981" />}
        {!ipl.isValidated && <AlertTriangle size={11} color="#F59E0B" />}

        {/* Expand */}
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="shrink-0 rounded p-0.5"
          style={{ color: TEXT_DIM }}
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>

        {/* Delete */}
        {!isLocked && (
          <button
            type="button"
            onClick={onDelete}
            className="shrink-0 rounded p-0.5 transition-colors"
            style={{ color: TEXT_DIM }}
            onMouseEnter={e => { e.currentTarget.style.color = semantic.error }}
            onMouseLeave={e => { e.currentTarget.style.color = TEXT_DIM }}
          >
            <Trash2 size={11} />
          </button>
        )}
      </div>

      {expanded && (
        <div className="px-3 py-2 space-y-2 border-t" style={{ borderColor: BORDER }}>
          <FieldRow label="Tag">
            <SmallInput value={ipl.tag} onChange={v => onUpdate({ tag: v })} placeholder="PSV-001" readOnly={isLocked} />
          </FieldRow>
          <FieldRow label="Description">
            <SmallInput value={ipl.description} onChange={v => onUpdate({ description: v })} placeholder="Description IPL" readOnly={isLocked} />
          </FieldRow>
          <FieldRow label="PFD">
            <SmallInput
              value={ipl.pfd.toString()}
              onChange={v => { const n = parseFloat(v); if (!isNaN(n) && n > 0 && n <= 1) onUpdate({ pfd: n }) }}
              placeholder="0.01"
              type="number"
              readOnly={isLocked}
            />
          </FieldRow>
          <FieldRow label="Notes">
            <SmallInput value={ipl.notes} onChange={v => onUpdate({ notes: v })} placeholder="Justification, référence..." readOnly={isLocked} />
          </FieldRow>
          <FieldRow label="Indépendance validée">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={ipl.isValidated}
                onChange={e => onUpdate({ isValidated: e.target.checked })}
                disabled={isLocked}
                className="rounded"
              />
              <span className="text-[10px]" style={{ color: TEXT_DIM }}>Confirmée</span>
            </label>
          </FieldRow>
        </div>
      )}
    </div>
  )
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  const { TEXT_DIM } = usePrismTheme()
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 shrink-0 text-[9px] font-bold uppercase tracking-wide text-right" style={{ color: TEXT_DIM }}>
        {label}
      </span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

function SmallInput({ value, onChange, placeholder, type = 'text', readOnly }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; readOnly?: boolean
}) {
  const { BORDER, SURFACE, TEXT } = usePrismTheme()
  return (
    <input
      type={type} value={value} readOnly={readOnly}
      onChange={readOnly ? undefined : e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded border px-2 py-1 text-[10px] outline-none"
      style={{ background: SURFACE, borderColor: BORDER, color: TEXT, opacity: readOnly ? 0.7 : 1 }}
    />
  )
}

// ─── Add IPL from library panel ───────────────────────────────────────────────

function AddIPLPanel({ onAdd, onClose }: { onAdd: (ipl: IPLCredit) => void; onClose: () => void }) {
  const { BORDER, CARD_BG, PAGE_BG, SHADOW_PANEL, TEAL, TEXT, TEXT_DIM } = usePrismTheme()
  const [customPfd, setCustomPfd] = useState('0.1')
  const [customTag, setCustomTag] = useState('')
  const [customDesc, setCustomDesc] = useState('')
  const [customType, setCustomType] = useState<IPLType>('custom')

  const handleAddFromLibrary = (entryId: string) => {
    const entry = IPL_LIBRARY.find(e => e.id === entryId)
    if (!entry) return
    onAdd({
      id: crypto.randomUUID(),
      type: entry.type,
      tag: '',
      description: entry.name,
      pfd: entry.pfdTypical,
      creditSource: 'library',
      libraryId: entry.id,
      isValidated: false,
      notes: '',
    })
  }

  const handleAddCustom = () => {
    const pfd = parseFloat(customPfd)
    if (isNaN(pfd) || pfd <= 0 || pfd > 1) return
    onAdd({
      id: crypto.randomUUID(),
      type: customType,
      tag: customTag,
      description: customDesc || 'IPL personnalisée',
      pfd,
      creditSource: 'custom',
      isValidated: false,
      notes: '',
    })
  }

  return (
    <div
      className="rounded-xl border p-3 space-y-3"
      style={{ background: PAGE_BG, borderColor: `${TEAL}30`, boxShadow: SHADOW_PANEL }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: TEAL }}>
          Ajouter une IPL
        </span>
        <button type="button" onClick={onClose} style={{ color: TEXT_DIM }}>
          <X size={12} />
        </button>
      </div>

      {/* Library entries */}
      <div className="space-y-1">
        <p className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: TEXT_DIM }}>Bibliothèque IEC 61511</p>
        {IPL_LIBRARY.map(entry => (
          <button
            key={entry.id}
            type="button"
            onClick={() => handleAddFromLibrary(entry.id)}
            className="w-full flex items-start gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors"
            style={{ borderColor: BORDER, background: CARD_BG }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = `${IPL_TYPE_COLORS[entry.type]}40` }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER }}
          >
            <span
              className="shrink-0 mt-0.5 px-1 py-0.5 rounded text-[8px] font-bold"
              style={{ background: `${IPL_TYPE_COLORS[entry.type]}18`, color: IPL_TYPE_COLORS[entry.type] }}
            >
              {IPL_TYPE_LABELS[entry.type]}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-semibold truncate" style={{ color: TEXT }}>{entry.name}</div>
              <div className="text-[9px] truncate" style={{ color: TEXT_DIM }}>PFD = {entry.pfdTypical} — {entry.standard}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Custom IPL */}
      <div className="pt-2 space-y-2" style={{ borderTop: `1px solid ${BORDER}` }}>
        <p className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: TEXT_DIM }}>IPL personnalisée</p>
        <div className="grid grid-cols-2 gap-2">
          <SmallInput value={customTag} onChange={setCustomTag} placeholder="Tag (ex: PSV-003)" />
          <SmallInput value={customPfd} onChange={setCustomPfd} placeholder="PFD (ex: 0.01)" type="number" />
        </div>
        <SmallInput value={customDesc} onChange={setCustomDesc} placeholder="Description..." />
        <select
          value={customType}
          onChange={e => setCustomType(e.target.value as IPLType)}
          className="w-full rounded border px-2 py-1 text-[10px] outline-none"
          style={{ background: CARD_BG, borderColor: BORDER, color: TEXT }}
        >
          {Object.entries(IPL_TYPE_LABELS).map(([type, label]) => (
            <option key={type} value={type}>{label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleAddCustom}
          className="w-full rounded-lg px-3 py-1.5 text-[10px] font-semibold transition-colors"
          style={{ background: `${TEAL}20`, color: TEAL, border: `1px solid ${TEAL}30` }}
        >
          Ajouter
        </button>
      </div>
    </div>
  )
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function LOPAScenarioDetailPanel({ scenario, result, isLocked, onUpdate, onClose }: Props) {
  const { BORDER, CARD_BG, PAGE_BG, SHADOW_PANEL, TEAL, TEAL_DIM, TEXT, TEXT_DIM } = usePrismTheme()
  const [showAddIPL, setShowAddIPL] = useState(false)
  const [sectionOpen, setSectionOpen] = useState({ meta: false, ipls: true, chart: true })

  const toggle = (key: keyof typeof sectionOpen) =>
    setSectionOpen(s => ({ ...s, [key]: !s[key] }))

  const handleAddIPL = (ipl: IPLCredit) => {
    onUpdate({ ipls: [...scenario.ipls, ipl] })
    setShowAddIPL(false)
  }

  const handleUpdateIPL = (iplId: string, updates: Partial<IPLCredit>) => {
    onUpdate({
      ipls: scenario.ipls.map(ipl => ipl.id === iplId ? { ...ipl, ...updates } : ipl),
    })
  }

  const handleDeleteIPL = (iplId: string) => {
    onUpdate({ ipls: scenario.ipls.filter(ipl => ipl.id !== iplId) })
  }

  const silColors: Record<number, string> = {
    0: '#10B981', 1: '#16A34A', 2: '#2563EB', 3: '#D97706', 4: '#7C3AED',
  }
  const silColor = silColors[result.silRequired] ?? '#6B7280'

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ background: PAGE_BG }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0 border-b"
        style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_PANEL }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-mono font-bold" style={{ color: TEAL }}>{scenario.scenarioId}</span>
          <span className="text-[11px] truncate" style={{ color: TEXT }}>{scenario.description || 'Sans titre'}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* SIL result badge */}
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-bold"
            style={{ background: `${silColor}18`, color: silColor }}
          >
            {result.silRequired > 0 ? `SIL ${result.silRequired}` : 'Adéquat'}
          </span>
          <button type="button" onClick={onClose} style={{ color: TEXT_DIM }}>
            <X size={13} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0">

        {/* ── Section: Métadonnées scénario ─────────────────────────────── */}
        <CollapsibleSection
          title="Scénario"
          icon={<Info size={11} />}
          open={sectionOpen.meta}
          onToggle={() => toggle('meta')}
        >
          <div className="space-y-2 pt-1">
            <FieldRow label="ID Scénario">
              <SmallInput value={scenario.scenarioId} onChange={v => onUpdate({ scenarioId: v })} placeholder="SC-001" readOnly={isLocked} />
            </FieldRow>
            <FieldRow label="Réf. HAZOP">
              <SmallInput value={scenario.hazopRef ?? ''} onChange={v => onUpdate({ hazopRef: v || undefined })} placeholder="SC-HAZOP-003" readOnly={isLocked} />
            </FieldRow>
            <FieldRow label="Description">
              <SmallInput value={scenario.description} onChange={v => onUpdate({ description: v })} placeholder="Événement redouté..." readOnly={isLocked} />
            </FieldRow>
            <FieldRow label="Catégorie">
              <select
                value={scenario.consequenceCategory}
                onChange={e => onUpdate({ consequenceCategory: e.target.value as ConsequenceCategory })}
                disabled={isLocked}
                className="w-full rounded border px-2 py-1 text-[10px] outline-none"
                style={{ background: CARD_BG, borderColor: BORDER, color: TEXT }}
              >
                {Object.entries(CONSEQUENCE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </FieldRow>
            <FieldRow label="Événement init.">
              <SmallInput value={scenario.initiatingEvent} onChange={v => onUpdate({ initiatingEvent: v })} placeholder="Défaillance vanne CV-001..." readOnly={isLocked} />
            </FieldRow>
            <FieldRow label="IEF [yr⁻¹]">
              <SmallInput
                type="number"
                value={scenario.ief.toString()}
                onChange={v => { const n = parseFloat(v); if (!isNaN(n) && n > 0) onUpdate({ ief: n }) }}
                placeholder="0.1"
                readOnly={isLocked}
              />
            </FieldRow>
            <FieldRow label="Source IEF">
              <SmallInput value={scenario.iefSource} onChange={v => onUpdate({ iefSource: v })} placeholder="OREDA 2015, p.142" readOnly={isLocked} />
            </FieldRow>
            <FieldRow label="TMEL [yr⁻¹]">
              <SmallInput
                type="number"
                value={scenario.tmel.toString()}
                onChange={v => { const n = parseFloat(v); if (!isNaN(n) && n > 0) onUpdate({ tmel: n }) }}
                placeholder="1e-5"
                readOnly={isLocked}
              />
            </FieldRow>
            <FieldRow label="Cellule risque">
              <SmallInput value={scenario.riskMatrixCell} onChange={v => onUpdate({ riskMatrixCell: v })} placeholder="3C" readOnly={isLocked} />
            </FieldRow>
            <div className="pt-1" style={{ borderTop: `1px solid ${BORDER}` }}>
              <p className="text-[9px] font-semibold uppercase tracking-wide mb-2" style={{ color: TEXT_DIM }}>Modificateurs conditionnels</p>
              <FieldRow label="Prob. ignition">
                <SmallInput
                  type="number"
                  value={scenario.ignitionProbability?.toString() ?? ''}
                  onChange={v => {
                    if (v === '') onUpdate({ ignitionProbability: null })
                    else { const n = parseFloat(v); if (!isNaN(n) && n >= 0 && n <= 1) onUpdate({ ignitionProbability: n }) }
                  }}
                  placeholder="(none) ex: 0.1"
                  readOnly={isLocked}
                />
              </FieldRow>
              <FieldRow label="Taux présence">
                <SmallInput
                  type="number"
                  value={scenario.occupancyFactor?.toString() ?? ''}
                  onChange={v => {
                    if (v === '') onUpdate({ occupancyFactor: null })
                    else { const n = parseFloat(v); if (!isNaN(n) && n >= 0 && n <= 1) onUpdate({ occupancyFactor: n }) }
                  }}
                  placeholder="(none) ex: 0.25"
                  readOnly={isLocked}
                />
              </FieldRow>
            </div>
          </div>
        </CollapsibleSection>

        {/* ── Section: IPL Credits ──────────────────────────────────────── */}
        <CollapsibleSection
          title={`IPL Credits (${scenario.ipls.length})`}
          icon={<Layers size={11} />}
          open={sectionOpen.ipls}
          onToggle={() => toggle('ipls')}
          action={!isLocked && (
            <button
              type="button"
              onClick={() => setShowAddIPL(s => !s)}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold transition-colors"
              style={{ color: TEAL, background: `${TEAL}12`, border: `1px solid ${TEAL}20` }}
            >
              <Plus size={9} /> Ajouter
            </button>
          )}
        >
          {showAddIPL && (
            <AddIPLPanel onAdd={handleAddIPL} onClose={() => setShowAddIPL(false)} />
          )}

          {scenario.ipls.length === 0 && !showAddIPL && (
            <div className="text-center py-4 text-[10px]" style={{ color: TEXT_DIM }}>
              Aucune IPL — cliquez sur Ajouter pour inclure des couches de protection.
            </div>
          )}

          <div className="space-y-1.5">
            {scenario.ipls.map(ipl => (
              <IPLRow
                key={ipl.id}
                ipl={ipl}
                isLocked={isLocked}
                onUpdate={updates => handleUpdateIPL(ipl.id, updates)}
                onDelete={() => handleDeleteIPL(ipl.id)}
              />
            ))}
          </div>

          {/* IPL product summary */}
          {scenario.ipls.length > 0 && (
            <div
              className="mt-2 flex items-center justify-between rounded-lg px-3 py-1.5"
              style={{ background: `${TEAL}08`, border: `1px solid ${TEAL}18` }}
            >
              <span className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: TEXT_DIM }}>
                Crédit total IPL
              </span>
              <span className="text-[10px] font-mono font-bold" style={{ color: TEAL_DIM }}>
                × {result.iplPfdProduct.toExponential(1)}
              </span>
            </div>
          )}
        </CollapsibleSection>

        {/* ── Section: Waterfall Chart ─────────────────────────────────── */}
        <CollapsibleSection
          title="Réduction de risque"
          icon={<Shield size={11} />}
          open={sectionOpen.chart}
          onToggle={() => toggle('chart')}
        >
          <WaterfallChart result={result} />
        </CollapsibleSection>

      </div>
    </div>
  )
}

// ─── CollapsibleSection ───────────────────────────────────────────────────────

function CollapsibleSection({
  title, icon, open, onToggle, children, action,
}: {
  title: string
  icon: React.ReactNode
  open: boolean
  onToggle: () => void
  children: React.ReactNode
  action?: React.ReactNode
}) {
  const { BORDER, TEAL, TEXT_DIM } = usePrismTheme()
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-1.5 pb-1.5 mb-2"
        style={{ borderBottom: `1px solid ${BORDER}` }}
      >
        <span style={{ color: TEAL }}>{icon}</span>
        <span className="flex-1 text-left text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: TEAL }}>
          {title}
        </span>
        {action && <span onClick={e => e.stopPropagation()}>{action}</span>}
        <span style={{ color: TEXT_DIM }}>
          {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        </span>
      </button>
      {open && children}
    </div>
  )
}
