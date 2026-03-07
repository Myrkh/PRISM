/**
 * HazopWorkspace — PRISM v3
 *
 * Registre global HAZOP / LOPA.
 * Affiche les traces HAZOPTrace liées à chaque SIF, groupées par projet.
 * Design inspiré GED — tokens PRISM dark.
 *
 * Sprint 1 :
 *   – Registre des hazopTrace existants sur les SIFs
 *   – Colonnes standard HAZOP : Nœud · Déviation · Cause · IPLs · RRF · SIF liée
 *   – LOPA inline (expand) — placeholder Sprint 2
 *   – Import CSV / Nouveau scénario — disabled Sprint 2
 *   – Filtre par projet
 *
 * Sprint 2 (à venir) :
 *   – Table prism_hazop_scenarios indépendante de la SIF
 *   – LOPA engine (calcul fréquence résiduelle avec IPLs)
 *   – Création SIF depuis une ligne HAZOP (pré-remplissage automatique)
 *   – Import CSV/Excel avec mapping de colonnes
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FlaskConical, ChevronDown, ChevronRight,
  Search, Plus, Upload,
  ExternalLink, AlertTriangle, CheckCircle2,
  Layers, Calculator, Grid3X3, Wrench,
} from 'lucide-react'
import { useAppStore, type SIFTab } from '@/store/appStore'
import type { Project, SIF, HAZOPTrace } from '@/core/types'
import { calcSIF } from '@/core/math/pfdCalc'
import { BORDER, CARD_BG, PAGE_BG, PANEL_BG, TEAL, TEAL_DIM, TEXT, TEXT_DIM } from '@/styles/tokens'
import { IntercalaireCard, IntercalaireTabBar, useLayout } from '@/components/layout/SIFWorkbenchLayout'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

// ─── Design tokens ────────────────────────────────────────────────────────
// ─── Risk matrix cell color ───────────────────────────────────────────────
function riskColor(riskMatrix: string): { bg: string; color: string } {
  const level = riskMatrix?.trim().toUpperCase()
  // Typical risk matrix codes: 1A-1D (low), 2A-3C (medium), 3D-4D (high), 5A+ (critical)
  if (!level) return { bg: '#1A1F24', color: '#8FA0B1' }
  const severity = parseInt(level[0] ?? '0', 10)
  if (severity >= 4)   return { bg: '#EF444415', color: '#F87171' }
  if (severity === 3)  return { bg: '#F59E0B15', color: '#F59E0B' }
  if (severity === 2)  return { bg: '#2563EB15', color: '#60A5FA' }
  return               { bg: '#16A34A15', color: '#4ADE80' }
}

// ─── Coming soon button ───────────────────────────────────────────────────
function ComingSoonBtn({ label, Icon }: { label: string; Icon: React.ElementType }) {
  return (
    <div className="relative group">
      <button
        type="button"
        disabled
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border cursor-not-allowed opacity-40"
        style={{ background: 'transparent', borderColor: BORDER, color: TEXT_DIM }}
      >
        <Icon size={12} />
        {label}
      </button>
      <div
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex
          items-center px-2 py-1 rounded text-[9px] font-bold whitespace-nowrap pointer-events-none z-10"
        style={{ background: '#0F1318', color: TEAL_DIM, border: `1px solid ${BORDER}` }}
      >
        Sprint 2
      </div>
    </div>
  )
}

// ─── HAZOP row ────────────────────────────────────────────────────────────
interface HazopRowData {
  sif: SIF
  trace: HAZOPTrace
  project: Project
}

interface ScenarioDraft {
  projectId: string
  sifId: string
  scenarioId: string
  hazopNode: string
  deviationCause: string
  initiatingEvent: string
  lopaRef: string
  tmel: string
  iplList: string
  riskMatrix: string
  hazopDate: string
  lopaDate: string
  hazopFacilitator: string
}

function scenarioSeed(projects: Project[], projectId: string): string {
  const project = projects.find(p => p.id === projectId)
  const next = (project?.sifs.filter(sif => sif.hazopTrace?.scenarioId).length ?? 0) + 1
  return `SC-${String(next).padStart(3, '0')}`
}

function createScenarioDraft(projects: Project[], preferredProjectId?: string): ScenarioDraft {
  const project = projects.find(p => p.id === preferredProjectId && p.sifs.length > 0)
    ?? projects.find(p => p.sifs.length > 0)

  return {
    projectId: project?.id ?? '',
    sifId: project?.sifs[0]?.id ?? '',
    scenarioId: project ? scenarioSeed(projects, project.id) : '',
    hazopNode: '',
    deviationCause: '',
    initiatingEvent: '',
    lopaRef: '',
    tmel: '0.001',
    iplList: '',
    riskMatrix: '',
    hazopDate: '',
    lopaDate: '',
    hazopFacilitator: '',
  }
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em]"
      style={{ color: TEXT_DIM }}>
      {children}
    </label>
  )
}

const HAZOP_RIGHT_TABS = [
  { id: 'rrf' as const, label: 'RRF Check', Icon: Calculator },
  { id: 'matrix' as const, label: 'Risk Matrix', Icon: Grid3X3 },
  { id: 'actions' as const, label: 'Actions', Icon: Wrench },
]

function parseRiskMatrixLevel(value: string): { severity: number; likelihood: number } | null {
  const v = (value ?? '').trim().toUpperCase()
  if (!v) return null
  const severity = parseInt(v[0] ?? '', 10)
  const letter = v[1] ?? ''
  const likelihood = ['A', 'B', 'C', 'D'].indexOf(letter) + 1
  if (!Number.isFinite(severity) || severity < 1 || severity > 5) return null
  if (likelihood < 1 || likelihood > 4) return null
  return { severity, likelihood }
}

function HazopRightPanel({
  selected,
  initiatingFrequency,
  setInitiatingFrequency,
  onOpenSelected,
}: {
  selected: HazopRowData | null
  initiatingFrequency: number
  setInitiatingFrequency: (next: number) => void
  onOpenSelected: (tab: SIFTab) => void
}) {
  const [activeTab, setActiveTab] = useState<'rrf' | 'matrix' | 'actions'>('rrf')
  const activeIdx = HAZOP_RIGHT_TABS.findIndex(t => t.id === activeTab)

  if (!selected) {
    return (
      <div className="flex h-full flex-col overflow-hidden border-l px-4 py-4"
        style={{ borderColor: BORDER, background: PANEL_BG }}>
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>HAZOP / LOPA</p>
        <div className="mt-3 rounded-xl border px-3 py-4 text-xs"
          style={{ borderColor: BORDER, color: TEXT_DIM, background: '#1D232A' }}>
          Sélectionnez une ligne du registre pour lancer le check RRF et les actions.
        </div>
      </div>
    )
  }

  const { sif, trace, project } = selected
  const calc = calcSIF(sif)
  const requiredRRF = trace.tmel > 0 && initiatingFrequency > 0 ? initiatingFrequency / trace.tmel : null
  const isCoherent = requiredRRF ? calc.RRF >= requiredRRF : null
  const ratio = requiredRRF && calc.RRF > 0 ? requiredRRF / calc.RRF : null
  const matrix = parseRiskMatrixLevel(trace.riskMatrix)

  return (
    <div className="flex h-full flex-col overflow-hidden border-l" style={{ borderColor: BORDER, background: PANEL_BG }}>
      <div className="px-3 pt-3 shrink-0">
        <IntercalaireTabBar tabs={HAZOP_RIGHT_TABS} active={activeTab} onSelect={setActiveTab} cardBg="#23292F" />
      </div>

      <div className="px-3 pb-3 flex-1 overflow-y-auto">
        <IntercalaireCard tabCount={HAZOP_RIGHT_TABS.length} activeIdx={activeIdx} className="p-3 space-y-3">
          <div className="rounded-lg border px-2.5 py-2" style={{ borderColor: BORDER, background: '#1D232A' }}>
            <p className="text-[10px] font-bold font-mono" style={{ color: TEAL }}>{sif.sifNumber}</p>
            <p className="text-[10px]" style={{ color: TEXT_DIM }}>{project.name}</p>
          </div>

          {activeTab === 'rrf' && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>RRF Consistency Check</p>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: TEXT_DIM }}>
                  Fréquence initiatrice (yr⁻¹)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.000001"
                  value={Number.isFinite(initiatingFrequency) ? initiatingFrequency : 0}
                  onChange={e => setInitiatingFrequency(Math.max(0, Number(e.target.value) || 0))}
                  className="h-8 w-full rounded-lg border bg-[#1D232A] px-2 text-xs outline-none"
                  style={{ borderColor: BORDER, color: TEXT }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded border px-2 py-1.5" style={{ borderColor: BORDER, background: '#1D232A' }}>
                  <p style={{ color: TEXT_DIM }}>TMEL (HAZOP)</p>
                  <p className="font-mono font-bold" style={{ color: TEXT }}>
                    {trace.tmel > 0 ? trace.tmel.toExponential(2) : '—'}
                  </p>
                </div>
                <div className="rounded border px-2 py-1.5" style={{ borderColor: BORDER, background: '#1D232A' }}>
                  <p style={{ color: TEXT_DIM }}>RRF requis</p>
                  <p className="font-mono font-bold" style={{ color: TEAL_DIM }}>
                    {requiredRRF ? Math.round(requiredRRF).toLocaleString('fr-FR') : '—'}
                  </p>
                </div>
                <div className="rounded border px-2 py-1.5" style={{ borderColor: BORDER, background: '#1D232A' }}>
                  <p style={{ color: TEXT_DIM }}>RRF calculé (SIF)</p>
                  <p className="font-mono font-bold" style={{ color: TEXT }}>
                    {Math.round(calc.RRF).toLocaleString('fr-FR')}
                  </p>
                </div>
                <div className="rounded border px-2 py-1.5" style={{ borderColor: BORDER, background: '#1D232A' }}>
                  <p style={{ color: TEXT_DIM }}>Verdict</p>
                  <p className="font-bold" style={{ color: isCoherent == null ? TEXT_DIM : isCoherent ? '#4ADE80' : '#F87171' }}>
                    {isCoherent == null ? 'N/A' : isCoherent ? 'Cohérent' : 'Écart'}
                  </p>
                </div>
              </div>

              {ratio != null && isCoherent === false && (
                <div className="rounded-lg border px-2.5 py-2 text-[11px]"
                  style={{ borderColor: '#F8717140', background: '#7F1D1D20', color: '#FCA5A5' }}>
                  RRF requis est ~{ratio.toFixed(2)}x supérieur au RRF calculé.
                </div>
              )}
            </>
          )}

          {activeTab === 'matrix' && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Risk Matrix</p>
              <div className="rounded-lg border px-2.5 py-2 text-[11px]" style={{ borderColor: BORDER, background: '#1D232A' }}>
                <span style={{ color: TEXT_DIM }}>Position scénario:</span>{' '}
                <span className="font-bold" style={{ color: TEAL_DIM }}>{trace.riskMatrix || '—'}</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {Array.from({ length: 5 }, (_, r) =>
                  Array.from({ length: 4 }, (_, c) => {
                    const severity = 5 - r
                    const likelihood = c + 1
                    const letter = ['A', 'B', 'C', 'D'][c]
                    const code = `${severity}${letter}`
                    const active = matrix?.severity === severity && matrix?.likelihood === likelihood
                    const color = riskColor(code)
                    return (
                      <div key={code} className="rounded border py-1 text-center text-[9px] font-bold"
                        style={{
                          borderColor: active ? TEAL : `${color.color}40`,
                          background: active ? `${TEAL}25` : color.bg,
                          color: active ? TEAL_DIM : color.color,
                        }}>
                        {code}
                      </div>
                    )
                  })
                )}
              </div>
            </>
          )}

          {activeTab === 'actions' && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Actions</p>
              <button
                type="button"
                onClick={() => onOpenSelected('overview')}
                className="w-full rounded-lg px-3 py-2 text-xs font-bold border transition-colors"
                style={{ borderColor: BORDER, color: TEXT, background: '#1D232A' }}
              >
                Ouvrir la SIF liée
              </button>
              <button
                type="button"
                onClick={() => onOpenSelected('analysis')}
                className="w-full rounded-lg px-3 py-2 text-xs font-bold border transition-colors"
                style={{ borderColor: BORDER, color: TEXT, background: '#1D232A' }}
              >
                Aller aux calculs
              </button>
              <button
                type="button"
                onClick={() => onOpenSelected('compliance')}
                className="w-full rounded-lg px-3 py-2 text-xs font-bold"
                style={{ background: 'linear-gradient(135deg, #009BA4, #007A82)', color: '#fff' }}
              >
                Vérifier la conformité
              </button>
            </>
          )}
        </IntercalaireCard>
      </div>
    </div>
  )
}

function HazopRow({
  data,
  rowId,
  isExpanded,
  isSelected,
  onSelect,
  onToggle,
  onNavigate,
}: {
  data: HazopRowData
  rowId: string
  isExpanded: boolean
  isSelected: boolean
  onSelect: () => void
  onToggle: () => void
  onNavigate: (projectId: string, sifId: string, tab: SIFTab) => void
}) {
  const { sif, trace, project } = data
  const result = useMemo(() => calcSIF(sif), [sif])
  const risk   = riskColor(trace.riskMatrix)
  const rowStyle = isSelected
    ? { borderColor: BORDER, background: '#1E2A33' }
    : { borderColor: BORDER }

  return (
    <>
      {/* ── Main row ── */}
      <tr
        className="border-b transition-colors"
        style={rowStyle}
        data-row-id={rowId}
        onClick={onSelect}
        onMouseEnter={e => {
          if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.02)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLTableRowElement).style.background = isSelected ? '#1E2A33' : 'transparent'
        }}
      >
        {/* Scénario ID */}
        <td className="px-4 py-3 whitespace-nowrap">
          <span className="font-mono font-black text-[11px]" style={{ color: TEAL }}>
            {trace.scenarioId || '—'}
          </span>
        </td>

        {/* Nœud */}
        <td className="px-4 py-3 max-w-[160px]">
          <p className="text-[11px] truncate font-medium" style={{ color: TEXT }}>
            {trace.hazopNode || '—'}
          </p>
        </td>

        {/* Déviation / Cause */}
        <td className="px-4 py-3 max-w-[200px]">
          <p className="text-[11px] truncate" style={{ color: TEXT }}>
            {trace.deviationCause || '—'}
          </p>
          {trace.initiatingEvent && (
            <p className="text-[10px] mt-0.5 truncate" style={{ color: TEXT_DIM }}>
              {trace.initiatingEvent}
            </p>
          )}
        </td>

        {/* IPLs */}
        <td className="px-4 py-3 max-w-[160px]">
          <p className="text-[11px] truncate" style={{ color: TEXT_DIM }}>
            {trace.iplList || '—'}
          </p>
        </td>

        {/* Matrice de risque */}
        <td className="px-4 py-3 text-center">
          {trace.riskMatrix ? (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-black"
              style={{ background: risk.bg, color: risk.color, border: `1px solid ${risk.color}30` }}
            >
              {trace.riskMatrix}
            </span>
          ) : (
            <span style={{ color: TEXT_DIM }}>—</span>
          )}
        </td>

        {/* TMEL */}
        <td className="px-4 py-3 text-center">
          <span className="text-[11px] font-mono" style={{ color: TEXT_DIM }}>
            {trace.tmel ? `${trace.tmel.toExponential(1)} yr⁻¹` : '—'}
          </span>
        </td>

        {/* SIF liée */}
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={() => onNavigate(project.id, sif.id, 'overview')}
            className="flex items-center gap-1.5 group/sif"
          >
            <span
              className="font-mono font-black text-[11px] group-hover/sif:underline"
              style={{ color: TEAL }}
            >
              {sif.sifNumber}
            </span>
            <ExternalLink size={10} style={{ color: TEXT_DIM }} className="opacity-0 group-hover/sif:opacity-100" />
          </button>
          {result.meetsTarget ? (
            <div className="flex items-center gap-1 mt-0.5">
              <CheckCircle2 size={9} style={{ color: '#4ADE80' }} />
              <span className="text-[9px]" style={{ color: '#4ADE80' }}>SIL{result.SIL} ✓</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 mt-0.5">
              <AlertTriangle size={9} style={{ color: '#F87171' }} />
              <span className="text-[9px]" style={{ color: '#F87171' }}>SIL{result.SIL} gap</span>
            </div>
          )}
        </td>

        {/* LOPA (expand) */}
        <td className="px-4 py-3 text-center">
          <button
            type="button"
            onClick={onToggle}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold border transition-colors"
            style={{
              borderColor: isExpanded ? TEAL : BORDER,
              color:       isExpanded ? TEAL : TEXT_DIM,
              background:  isExpanded ? `${TEAL}12` : 'transparent',
            }}
          >
            {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            LOPA
          </button>
        </td>

        {/* Actions */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onNavigate(project.id, sif.id, 'compliance')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors"
              style={{ borderColor: BORDER, color: TEXT_DIM, background: 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = TEAL; e.currentTarget.style.color = TEAL }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT_DIM }}
            >
              <ExternalLink size={11} />
              Compliance
            </button>
          </div>
        </td>
      </tr>

      {/* ── LOPA expanded ── */}
      {isExpanded && (
        <tr style={{ background: `${TEAL}05` }}>
          <td colSpan={9} className="px-6 py-4">
            <div className="flex items-start gap-6">
              {/* LOPA ref + date */}
              <div className="min-w-[160px]">
                <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: TEXT_DIM }}>
                  Référence LOPA
                </p>
                <p className="text-[12px] font-mono font-bold" style={{ color: TEAL }}>
                  {trace.lopaRef || '—'}
                </p>
                <p className="text-[10px] mt-1" style={{ color: TEXT_DIM }}>
                  {trace.lopaDate ? `Date : ${trace.lopaDate}` : 'Date : —'}
                </p>
              </div>

              {/* IPLs detail */}
              <div className="flex-1">
                <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: TEXT_DIM }}>
                  Couches de protection (IPLs)
                </p>
                {trace.iplList ? (
                  <div className="flex flex-wrap gap-1.5">
                    {trace.iplList.split(',').map((ipl, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2 py-0.5 rounded font-semibold"
                        style={{ background: `${TEAL}12`, color: TEAL_DIM, border: `1px solid ${TEAL}20` }}
                      >
                        {ipl.trim()}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px]" style={{ color: TEXT_DIM }}>
                    Aucun IPL renseigné
                  </p>
                )}
              </div>

              {/* TMEL + Sprint 2 notice */}
              <div className="min-w-[200px]">
                <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: TEXT_DIM }}>
                  LOPA engine
                </p>
                <div
                  className="rounded-lg px-3 py-2.5 text-[10px]"
                  style={{ background: '#1D232A', border: `1px solid ${BORDER}`, color: TEXT_DIM }}
                >
                  <p className="font-semibold mb-1" style={{ color: TEAL_DIM }}>Sprint 2</p>
                  <p>Calcul fréquence résiduelle avec IPLs, validation SIL requis automatique.</p>
                </div>
              </div>
            </div>

            {/* HAZOP meta */}
            <div className="flex items-center gap-4 mt-3 pt-3 border-t text-[10px]" style={{ borderColor: `${BORDER}60` }}>
              <span style={{ color: TEXT_DIM }}>
                Facilitateur HAZOP : <span style={{ color: TEXT }}>{trace.hazopFacilitator || '—'}</span>
              </span>
              <span style={{ color: TEXT_DIM }}>
                Date HAZOP : <span style={{ color: TEXT }}>{trace.hazopDate || '—'}</span>
              </span>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Project section ──────────────────────────────────────────────────────
function ProjectSection({
  project,
  rows,
  selectedRowId,
  expandedRows,
  onSelectRow,
  onToggle,
  onNavigate,
}: {
  project: Project
  rows: HazopRowData[]
  selectedRowId: string | null
  expandedRows: Set<string>
  onSelectRow: (rowId: string) => void
  onToggle: (id: string) => void
  onNavigate: (projectId: string, sifId: string, tab: SIFTab) => void
}) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <>
      <tr
        className="border-b cursor-pointer select-none"
        style={{ borderColor: BORDER, background: '#1D232A' }}
        onClick={() => setCollapsed(v => !v)}
      >
        <td colSpan={9} className="px-4 py-2.5">
          <div className="flex items-center gap-2">
            {collapsed
              ? <ChevronRight size={13} style={{ color: TEAL }} />
              : <ChevronDown  size={13} style={{ color: TEAL }} />}
            <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: TEAL }}>
              {project.client || 'Sans client'}
            </span>
            <span className="text-[11px] font-semibold" style={{ color: TEXT }}>
              · {project.name}
            </span>
            <span
              className="ml-2 text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: `${TEAL}15`, color: TEAL_DIM }}
            >
              {rows.length} scénario{rows.length > 1 ? 's' : ''}
            </span>
          </div>
        </td>
      </tr>
      {!collapsed && rows.map(r => {
        const rowId = `${r.project.id}:${r.sif.id}`
        return (
          <HazopRow
            key={rowId}
            data={r}
            rowId={rowId}
            isExpanded={expandedRows.has(r.sif.id)}
            isSelected={selectedRowId === rowId}
            onSelect={() => onSelectRow(rowId)}
            onToggle={() => onToggle(r.sif.id)}
            onNavigate={onNavigate}
          />
        )
      })}
    </>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────
function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ background: `${TEAL}12`, border: `1px solid ${TEAL}25` }}
      >
        <FlaskConical size={28} style={{ color: TEAL, opacity: 0.6 }} />
      </div>
      <div className="text-center max-w-sm">
        <p className="text-sm font-bold mb-1.5" style={{ color: TEXT }}>
          {hasSearch ? 'Aucun scénario trouvé' : 'Aucune trace HAZOP renseignée'}
        </p>
        <p className="text-[12px] leading-relaxed" style={{ color: TEXT_DIM }}>
          {hasSearch
            ? 'Affinez votre recherche ou vérifiez le filtre projet.'
            : 'Associez une trace HAZOP à vos SIFs depuis l\'onglet Dashboard de chaque SIF. L\'import CSV et les scénarios indépendants arriveront en Sprint 2.'}
        </p>
      </div>
    </div>
  )
}

function NewScenarioModal({
  open,
  onOpenChange,
  projects,
  draft,
  setDraft,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  projects: Project[]
  draft: ScenarioDraft
  setDraft: React.Dispatch<React.SetStateAction<ScenarioDraft>>
  onSubmit: () => void
}) {
  const selectedProject = projects.find(project => project.id === draft.projectId) ?? null
  const sifOptions = selectedProject?.sifs ?? []
  const selectedSif = sifOptions.find(sif => sif.id === draft.sifId) ?? null
  const hasOverwriteRisk = !!selectedSif?.hazopTrace
  const canSubmit = !!draft.projectId
    && !!draft.sifId
    && !!draft.scenarioId.trim()
    && !!draft.hazopNode.trim()
    && !!draft.deviationCause.trim()
    && !!draft.iplList.trim()
    && !!draft.riskMatrix.trim()
    && Number(draft.tmel) > 0
  const inputStyle = {
    background: '#151B22',
    borderColor: BORDER,
    color: TEXT,
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl border-0 bg-transparent p-0 shadow-none">
        <div className="overflow-hidden rounded-[28px] border"
          style={{
            borderColor: BORDER,
            background: 'linear-gradient(180deg, #1B222B 0%, #131920 100%)',
            boxShadow: '0 24px 64px rgba(3, 7, 12, 0.48)',
          }}>
          <DialogHeader className="border-b px-7 py-6" style={{ borderColor: BORDER }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: TEAL_DIM }}>
              HAZOP / LOPA
            </p>
            <DialogTitle className="text-xl font-black" style={{ color: TEXT }}>
              Nouveau scénario
            </DialogTitle>
            <p className="max-w-2xl text-[12px] leading-relaxed" style={{ color: TEXT_DIM }}>
              La trace créée sera rattachée à une SIF existante. La table HAZOP indépendante arrivera plus tard,
              donc cette modale remplit le registre actuel avec les champs attendus par le tableau.
            </p>
          </DialogHeader>

          <div className="grid gap-6 px-7 py-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>Projet</FieldLabel>
                  <select
                    value={draft.projectId}
                    onChange={e => {
                      const nextProjectId = e.target.value
                      const nextProject = projects.find(project => project.id === nextProjectId)
                      setDraft(prev => ({
                        ...prev,
                        projectId: nextProjectId,
                        sifId: nextProject?.sifs[0]?.id ?? '',
                        scenarioId: nextProjectId ? scenarioSeed(projects, nextProjectId) : '',
                      }))
                    }}
                    className="h-11 w-full rounded-2xl border px-3 text-sm outline-none"
                    style={inputStyle}
                  >
                    <option value="">Sélectionner un projet</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <FieldLabel>SIF liée</FieldLabel>
                  <select
                    value={draft.sifId}
                    onChange={e => setDraft(prev => ({ ...prev, sifId: e.target.value }))}
                    className="h-11 w-full rounded-2xl border px-3 text-sm outline-none"
                    style={inputStyle}
                    disabled={!selectedProject}
                  >
                    <option value="">Sélectionner une SIF</option>
                    {sifOptions.map(sif => (
                      <option key={sif.id} value={sif.id}>
                        {sif.sifNumber} · {sif.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>ID scénario</FieldLabel>
                  <input
                    value={draft.scenarioId}
                    onChange={e => setDraft(prev => ({ ...prev, scenarioId: e.target.value }))}
                    placeholder="SC-001"
                    className="h-11 w-full rounded-2xl border px-3 text-sm outline-none"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <FieldLabel>Nœud HAZOP</FieldLabel>
                  <input
                    value={draft.hazopNode}
                    onChange={e => setDraft(prev => ({ ...prev, hazopNode: e.target.value }))}
                    placeholder="Node 3 - HP Separator"
                    className="h-11 w-full rounded-2xl border px-3 text-sm outline-none"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>Déviation / Cause</FieldLabel>
                  <textarea
                    value={draft.deviationCause}
                    onChange={e => setDraft(prev => ({ ...prev, deviationCause: e.target.value }))}
                    placeholder="High pressure - blocked outlet"
                    className="min-h-[112px] w-full rounded-2xl border px-3 py-3 text-sm outline-none resize-none"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <FieldLabel>IPLs existants</FieldLabel>
                  <textarea
                    value={draft.iplList}
                    onChange={e => setDraft(prev => ({ ...prev, iplList: e.target.value }))}
                    placeholder="BPCS, PSV-101, operator response"
                    className="min-h-[112px] w-full rounded-2xl border px-3 py-3 text-sm outline-none resize-none"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <FieldLabel>Matrice de risque</FieldLabel>
                  <input
                    value={draft.riskMatrix}
                    onChange={e => setDraft(prev => ({ ...prev, riskMatrix: e.target.value.toUpperCase() }))}
                    placeholder="4C"
                    className="h-11 w-full rounded-2xl border px-3 text-sm font-mono outline-none"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <FieldLabel>TMEL [yr^-1]</FieldLabel>
                  <input
                    type="number"
                    min={0}
                    step="0.000001"
                    value={draft.tmel}
                    onChange={e => setDraft(prev => ({ ...prev, tmel: e.target.value }))}
                    className="h-11 w-full rounded-2xl border px-3 text-sm font-mono outline-none"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <FieldLabel>Référence LOPA</FieldLabel>
                  <input
                    value={draft.lopaRef}
                    onChange={e => setDraft(prev => ({ ...prev, lopaRef: e.target.value }))}
                    placeholder="LOPA-HTL-003"
                    className="h-11 w-full rounded-2xl border px-3 text-sm outline-none"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>Événement initiateur</FieldLabel>
                  <input
                    value={draft.initiatingEvent}
                    onChange={e => setDraft(prev => ({ ...prev, initiatingEvent: e.target.value }))}
                    placeholder="Loss of outflow / CV-001 fails closed"
                    className="h-11 w-full rounded-2xl border px-3 text-sm outline-none"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <FieldLabel>Facilitateur HAZOP</FieldLabel>
                  <input
                    value={draft.hazopFacilitator}
                    onChange={e => setDraft(prev => ({ ...prev, hazopFacilitator: e.target.value }))}
                    placeholder="Nom Prénom"
                    className="h-11 w-full rounded-2xl border px-3 text-sm outline-none"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>Date HAZOP</FieldLabel>
                  <input
                    type="date"
                    value={draft.hazopDate}
                    onChange={e => setDraft(prev => ({ ...prev, hazopDate: e.target.value }))}
                    className="h-11 w-full rounded-2xl border px-3 text-sm font-mono outline-none"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <FieldLabel>Date LOPA</FieldLabel>
                  <input
                    type="date"
                    value={draft.lopaDate}
                    onChange={e => setDraft(prev => ({ ...prev, lopaDate: e.target.value }))}
                    className="h-11 w-full rounded-2xl border px-3 text-sm font-mono outline-none"
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border p-5"
                style={{ borderColor: `${TEAL}3A`, background: `linear-gradient(180deg, ${TEAL}14 0%, rgba(0,0,0,0) 100%)` }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: TEAL_DIM }}>
                  Aperçu registre
                </p>
                <div className="mt-4 space-y-3 text-[12px]">
                  {[
                    ['Scénario', draft.scenarioId || '—'],
                    ['Nœud HAZOP', draft.hazopNode || '—'],
                    ['Déviation / Cause', draft.deviationCause || '—'],
                    ['IPLs existants', draft.iplList || '—'],
                    ['Matrice', draft.riskMatrix || '—'],
                    ['TMEL', draft.tmel || '—'],
                    ['SIF liée', selectedSif ? `${selectedSif.sifNumber}` : '—'],
                  ].map(([label, value]) => (
                    <div key={label} className="border-b pb-2 last:border-0 last:pb-0"
                      style={{ borderColor: `${BORDER}AA` }}>
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: TEXT_DIM }}>
                        {label}
                      </p>
                      <p className="mt-1" style={{ color: TEXT }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border p-5"
                style={{ borderColor: BORDER, background: '#151B22' }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: TEXT_DIM }}>
                  Comportement
                </p>
                <p className="mt-3 text-[12px] leading-relaxed" style={{ color: TEXT_DIM }}>
                  Le scénario est rattaché à la SIF sélectionnée et apparaît immédiatement dans le registre HAZOP/LOPA
                  ainsi que dans la traçabilité de cette SIF.
                </p>
                <p className="mt-3 text-[11px]" style={{ color: TEXT_DIM }}>
                  Champs requis : projet, SIF, ID scénario, nœud, déviation/cause, IPLs, matrice, TMEL.
                </p>
                {hasOverwriteRisk && (
                  <div className="mt-4 rounded-2xl border px-3 py-2.5 text-[11px]"
                    style={{ borderColor: '#F59E0B55', background: '#2B2110', color: '#FCD34D' }}>
                    Cette SIF possède déjà une trace HAZOP. Enregistrer remplacera la trace actuelle.
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="border-t px-7 py-5" style={{ borderColor: BORDER }}>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-2xl border px-4 py-2 text-xs font-bold transition-colors"
              style={{ borderColor: BORDER, color: TEXT_DIM, background: '#151B22' }}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={!canSubmit}
              className="rounded-2xl px-4 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #009BA4, #007A82)', color: '#fff' }}
            >
              Créer le scénario
            </button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main workspace ───────────────────────────────────────────────────────
export function HazopWorkspace() {
  const projects  = useAppStore(s => s.projects)
  const navigate  = useAppStore(s => s.navigate)
  const updateHAZOPTrace = useAppStore(s => s.updateHAZOPTrace)
  const { setRightPanelOverride } = useLayout()

  const [search,       setSearch]       = useState('')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [expandedRows,  setExpanded]     = useState<Set<string>>(new Set())
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null)
  const [initiatingFrequency, setInitiatingFrequency] = useState<number>(1e-2)
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState(false)
  const [scenarioDraft, setScenarioDraft] = useState<ScenarioDraft>(() => createScenarioDraft([]))

  const handleNavigate = (projectId: string, sifId: string, tab: SIFTab) => {
    navigate({ type: 'sif-dashboard', projectId, sifId, tab })
  }

  const handleToggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Build flat list of rows (only SIFs with hazopTrace)
  const allRows = useMemo<HazopRowData[]>(() => {
    return projects.flatMap(project =>
      project.sifs
        .filter(sif => sif.hazopTrace != null)
        .map(sif => ({ sif, trace: sif.hazopTrace as HAZOPTrace, project }))
    )
  }, [projects])

  // Apply filters
  const filtered = useMemo<HazopRowData[]>(() => {
    const q = search.trim().toLowerCase()
    return allRows.filter(r => {
      const matchProject = projectFilter === 'all' || r.project.id === projectFilter
      const matchSearch  = !q ||
        r.trace.scenarioId?.toLowerCase().includes(q) ||
        r.trace.hazopNode?.toLowerCase().includes(q) ||
        r.trace.deviationCause?.toLowerCase().includes(q) ||
        r.sif.sifNumber.toLowerCase().includes(q)
      return matchProject && matchSearch
    })
  }, [allRows, search, projectFilter])

  // Group by project
  const byProject = useMemo<Array<{ project: Project; rows: HazopRowData[] }>>(() => {
    const map = new Map<string, { project: Project; rows: HazopRowData[] }>()
    for (const row of filtered) {
      const existing = map.get(row.project.id)
      if (existing) {
        existing.rows.push(row)
      } else {
        map.set(row.project.id, { project: row.project, rows: [row] })
      }
    }
    return Array.from(map.values())
  }, [filtered])

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedRowId(null)
      return
    }
    if (!selectedRowId || !filtered.some(r => `${r.project.id}:${r.sif.id}` === selectedRowId)) {
      setSelectedRowId(`${filtered[0].project.id}:${filtered[0].sif.id}`)
    }
  }, [filtered, selectedRowId])

  const selectedRow = useMemo(
    () => filtered.find(r => `${r.project.id}:${r.sif.id}` === selectedRowId) ?? null,
    [filtered, selectedRowId],
  )

  const openSelected = useCallback((tab: SIFTab) => {
    if (!selectedRow) return
    navigate({ type: 'sif-dashboard', projectId: selectedRow.project.id, sifId: selectedRow.sif.id, tab })
  }, [navigate, selectedRow])

  const hasAnySif = projects.some(project => project.sifs.length > 0)

  const openNewScenarioModal = useCallback(() => {
    const preferredProjectId = projectFilter !== 'all'
      ? projectFilter
      : selectedRow?.project.id
    setScenarioDraft(createScenarioDraft(projects, preferredProjectId))
    setIsScenarioModalOpen(true)
  }, [projectFilter, projects, selectedRow])

  const submitScenario = useCallback(() => {
    if (!scenarioDraft.projectId || !scenarioDraft.sifId) return
    const tmel = Number(scenarioDraft.tmel)
    if (!scenarioDraft.scenarioId.trim() || !scenarioDraft.hazopNode.trim() || !scenarioDraft.deviationCause.trim()) return
    if (!scenarioDraft.iplList.trim() || !scenarioDraft.riskMatrix.trim() || !Number.isFinite(tmel) || tmel <= 0) return

    const trace: HAZOPTrace = {
      scenarioId: scenarioDraft.scenarioId.trim(),
      hazopNode: scenarioDraft.hazopNode.trim(),
      deviationCause: scenarioDraft.deviationCause.trim(),
      initiatingEvent: scenarioDraft.initiatingEvent.trim(),
      lopaRef: scenarioDraft.lopaRef.trim(),
      tmel,
      iplList: scenarioDraft.iplList.trim(),
      riskMatrix: scenarioDraft.riskMatrix.trim().toUpperCase(),
      hazopDate: scenarioDraft.hazopDate,
      lopaDate: scenarioDraft.lopaDate,
      hazopFacilitator: scenarioDraft.hazopFacilitator.trim(),
    }

    updateHAZOPTrace(scenarioDraft.projectId, scenarioDraft.sifId, trace)

    const newRowId = `${scenarioDraft.projectId}:${scenarioDraft.sifId}`
    setProjectFilter(scenarioDraft.projectId)
    setSearch('')
    setSelectedRowId(newRowId)
    setExpanded(prev => {
      const next = new Set(prev)
      next.add(newRowId)
      return next
    })
    setIsScenarioModalOpen(false)
  }, [scenarioDraft, updateHAZOPTrace])

  useEffect(() => {
    setRightPanelOverride(
      <HazopRightPanel
        selected={selectedRow}
        initiatingFrequency={initiatingFrequency}
        setInitiatingFrequency={setInitiatingFrequency}
        onOpenSelected={openSelected}
      />,
    )
    return () => setRightPanelOverride(null)
  }, [initiatingFrequency, openSelected, selectedRow, setRightPanelOverride])

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden" style={{ background: PAGE_BG }}>

      {/* ── Header ── */}
      <div
        className="flex items-center justify-between gap-4 px-6 py-4 border-b shrink-0 flex-wrap"
        style={{ borderColor: BORDER, background: PANEL_BG }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: `${TEAL}20`, border: `1px solid ${TEAL}30` }}
          >
            <FlaskConical size={15} style={{ color: TEAL }} />
          </div>
          <div>
            <h1 className="text-sm font-black" style={{ color: TEXT }}>Registre HAZOP / LOPA</h1>
            <p className="text-[10px]" style={{ color: TEXT_DIM }}>
              {filtered.length} scénario{filtered.length !== 1 ? 's' : ''} · IEC 61511 cl. 8
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Project filter */}
          <select
            value={projectFilter}
            onChange={e => setProjectFilter(e.target.value)}
            className="h-8 rounded-lg border text-xs px-2 pr-7 outline-none appearance-none"
            style={{ background: CARD_BG, borderColor: BORDER, color: TEXT, minWidth: 160 }}
          >
            <option value="all">Tous les projets</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Search */}
          <div
            className="flex items-center gap-2 rounded-xl border px-3 h-8"
            style={{ borderColor: BORDER, background: CARD_BG, width: 240 }}
          >
            <Search size={13} style={{ color: TEXT_DIM, flexShrink: 0 }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Scénario, nœud, déviation…"
              className="flex-1 bg-transparent text-xs outline-none"
              style={{ color: TEXT }}
            />
          </div>

          {/* Disabled Sprint 2 actions */}
          <ComingSoonBtn label="Importer CSV" Icon={Upload} />
          <button
            type="button"
            onClick={openNewScenarioModal}
            disabled={!hasAnySif}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: CARD_BG, borderColor: BORDER, color: TEXT }}
          >
            <Plus size={12} />
            Nouveau scénario
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto min-h-0">
        {filtered.length === 0 ? (
          <EmptyState hasSearch={search.length > 0 || projectFilter !== 'all'} />
        ) : (
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10" style={{ background: PANEL_BG }}>
              <tr className="border-b" style={{ borderColor: BORDER }}>
                {[
                  { label: 'Scénario',         w: '110px' },
                  { label: 'Nœud HAZOP',        w: '150px' },
                  { label: 'Déviation / Cause', w: '200px' },
                  { label: 'IPLs existants',    w: '150px' },
                  { label: 'Matrice',           w: '80px',  center: true },
                  { label: 'TMEL',              w: '110px', center: true },
                  { label: 'SIF liée',          w: '110px' },
                  { label: 'LOPA',              w: '70px',  center: true },
                  { label: 'Actions',           w: 'auto'  },
                ].map(col => (
                  <th
                    key={col.label}
                    className="px-4 py-2.5"
                    style={{
                      width: col.w,
                      color: TEXT_DIM,
                      fontSize: 9,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      textAlign: col.center ? 'center' : 'left',
                    }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byProject.map(({ project, rows }) => (
                <ProjectSection
                  key={project.id}
                  project={project}
                  rows={rows}
                  selectedRowId={selectedRowId}
                  expandedRows={expandedRows}
                  onSelectRow={setSelectedRowId}
                  onToggle={handleToggle}
                  onNavigate={handleNavigate}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Sprint 2 notice ── */}
      <div
        className="shrink-0 px-6 py-2.5 flex items-center gap-2 border-t text-[10px]"
        style={{ borderColor: BORDER, background: PANEL_BG, color: TEXT_DIM }}
      >
        <Layers size={11} style={{ color: TEAL_DIM }} />
        <span>
          <strong style={{ color: TEAL_DIM }}>Sprint 2</strong>
          {' '}— Table HAZOP indépendante, LOPA engine (fréquence résiduelle), création SIF depuis scénario, import CSV avec mapping
        </span>
      </div>

      <NewScenarioModal
        open={isScenarioModalOpen}
        onOpenChange={setIsScenarioModalOpen}
        projects={projects}
        draft={scenarioDraft}
        setDraft={setScenarioDraft}
        onSubmit={submitScenario}
      />
    </div>
  )
}
