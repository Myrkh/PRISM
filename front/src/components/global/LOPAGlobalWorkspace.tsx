/**
 * components/global/LOPAGlobalWorkspace.tsx — PRISM
 *
 * Project-level LOPA (Layer of Protection Analysis) workspace.
 * Covers all scenarios for a project across its SIFs.
 *
 * Features:
 *   - glide-data-grid spreadsheet (scenarios × columns, live-computed)
 *   - "SIF liée" column — each scenario can be linked to a specific SIF
 *   - Slide-in detail panel: IPL editor + waterfall risk reduction chart
 *   - HAZOPTrace auto-import from any project SIF
 *   - Adequacy checker (IEC 61511 / CCPS rules)
 *   - CSV export
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle, ArrowRight, CheckCircle2,
  Download, Info, Plus, Shield,
} from 'lucide-react'
import {
  CompactSelection,
  DataEditor,
  GridCellKind,
  type DataEditorRef,
  type EditableGridCell,
  type GridCell,
  type GridColumn,
  type GridSelection,
  type Item,
  type Theme,
} from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'
import { useAppStore } from '@/store/appStore'
import type { LOPAScenario, SILLevel } from '@/core/types'
import type { LOPAWorksheet } from '@/core/types/lopa.types'
import {
  calculateLOPAScenario,
  calculateLOPAWorksheet,
  checkLOPAAdequacy,
  dominantSILFromWorksheet,
  formatFrequency,
  formatRRF,
  silFromRRF,
} from '@/engine/lopa/calculator'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { semantic } from '@/styles/tokens'
import { LOPAScenarioDetailPanel } from '@/components/sif/lopa/LOPAScenarioDetailPanel'
import { useLayout } from '@/components/layout/SIFWorkbenchLayout'
import { RightPanelSection, RightPanelShell } from '@/components/layout/RightPanelShell'
import { Trash2 } from 'lucide-react'

// ─── Column definitions ────────────────────────────────────────────────────────

type ColId =
  | 'scenarioId'
  | 'sifRef'
  | 'description'
  | 'initiatingEvent'
  | 'ief'
  | 'iefSource'
  | 'condModifier'
  | 'iplCount'
  | 'mef'
  | 'tmel'
  | 'rrf'
  | 'silRequired'

const BASE_COLUMNS: { id: ColId; title: string; width: number; editable: boolean }[] = [
  { id: 'scenarioId',      title: 'Scénario',        width: 90,  editable: true  },
  { id: 'sifRef',          title: 'SIF liée',         width: 110, editable: true  },
  { id: 'description',     title: 'Événement',        width: 190, editable: true  },
  { id: 'initiatingEvent', title: 'Événement init.',  width: 170, editable: true  },
  { id: 'ief',             title: 'IEF [yr⁻¹]',       width: 90,  editable: true  },
  { id: 'iefSource',       title: 'Source',           width: 120, editable: true  },
  { id: 'condModifier',    title: 'Modif. cond.',     width: 80,  editable: false },
  { id: 'iplCount',        title: 'IPL',              width: 55,  editable: false },
  { id: 'mef',             title: 'MEF [yr⁻¹]',       width: 100, editable: false },
  { id: 'tmel',            title: 'TMEL [yr⁻¹]',      width: 100, editable: true  },
  { id: 'rrf',             title: 'RRF',              width: 80,  editable: false },
  { id: 'silRequired',     title: 'SIL requis',       width: 80,  editable: false },
]

const SIL_COLORS: Record<number, string> = {
  0: '#10B981',
  1: '#16A34A',
  2: '#2563EB',
  3: '#D97706',
  4: '#7C3AED',
}

function silLabel(sil: number): string {
  return sil === 0 ? 'OK' : `SIL ${sil}`
}

function buildEmptyScenario(order: number): LOPAScenario {
  return {
    id: crypto.randomUUID(),
    order,
    scenarioId: `SC-${String(order).padStart(3, '0')}`,
    description: '',
    consequenceCategory: 'safety_personnel',
    consequenceDescription: '',
    initiatingEvent: '',
    ief: 0.1,
    iefSource: '',
    ignitionProbability: null,
    occupancyFactor: null,
    ipls: [],
    tmel: 1e-5,
    riskMatrixCell: '',
    sifRef: undefined,
  }
}

// ─── Grid theme builder ────────────────────────────────────────────────────────

function buildGridTheme(
  isDark: boolean,
  BORDER: string,
  CARD_BG: string,
  PAGE_BG: string,
  TEXT: string,
  TEXT_DIM: string,
): Partial<Theme> {
  return {
    accentColor: '#EC4899',
    accentLight: isDark ? 'rgba(236,72,153,0.18)' : 'rgba(236,72,153,0.10)',
    textDark: TEXT,
    textMedium: TEXT_DIM,
    textLight: TEXT_DIM,
    bgCell: isDark ? CARD_BG : '#FFFFFF',
    bgCellMedium: isDark ? PAGE_BG : '#F8F9FA',
    bgHeader: isDark ? PAGE_BG : '#F1F5F9',
    bgHeaderHasFocus: isDark ? CARD_BG : '#E2E8F0',
    bgHeaderHovered: isDark ? CARD_BG : '#E8EDF2',
    borderColor: BORDER,
    drilldownBorder: 'transparent',
    fontFamily: "'Inter', 'SF Pro Text', system-ui, sans-serif",
    baseFontStyle: '11px',
    headerFontStyle: 'bold 10px',
    editorFontSize: '11px',
  }
}

// ─── HAZOPImport dialog ────────────────────────────────────────────────────────

function HAZOPImportDialog({
  sifOptions,
  onImport,
  onClose,
}: {
  sifOptions: { id: string; label: string; hasHazop: boolean }[]
  onImport: (sifId: string) => void
  onClose: () => void
}) {
  const [selected, setSelected] = useState<string>(
    sifOptions.find(s => s.hasHazop)?.id ?? '',
  )
  const { BORDER, CARD_BG, SHADOW_PANEL, TEAL, TEXT, TEXT_DIM } = usePrismTheme()
  const hasSifsWithHazop = sifOptions.some(s => s.hasHazop)

  return (
    <div
      className="absolute left-4 top-12 z-50 w-80 rounded-xl border p-4 space-y-3"
      style={{ background: CARD_BG, borderColor: `${TEAL}30`, boxShadow: SHADOW_PANEL }}
    >
      <div className="flex items-start gap-2">
        <Info size={13} style={{ color: TEAL, flexShrink: 0, marginTop: 1 }} />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: TEAL }}>
            Importer depuis HAZOP
          </p>
          <p className="text-[10px] leading-relaxed" style={{ color: TEXT_DIM }}>
            Choisir la SIF dont les données HAZOP seront importées :
          </p>
        </div>
      </div>

      {!hasSifsWithHazop ? (
        <p className="text-[10px] text-center py-1" style={{ color: TEXT_DIM }}>
          Aucune SIF de ce projet ne possède de données HAZOP.
        </p>
      ) : (
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: BORDER }}>
          {sifOptions.map(opt => (
            <button
              key={opt.id}
              type="button"
              disabled={!opt.hasHazop}
              onClick={() => setSelected(opt.id)}
              className="flex items-center gap-2 w-full px-3 py-2 text-[10px] text-left transition-colors"
              style={{
                background: selected === opt.id ? `${TEAL}15` : 'transparent',
                color: opt.hasHazop ? TEXT : TEXT_DIM,
                opacity: opt.hasHazop ? 1 : 0.45,
                borderBottom: `1px solid ${BORDER}`,
              }}
            >
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: selected === opt.id ? TEAL : BORDER }}
              />
              {opt.label}
              {!opt.hasHazop && (
                <span className="ml-auto text-[9px]" style={{ color: TEXT_DIM }}>sans HAZOP</span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-lg py-1.5 text-[10px] font-semibold"
          style={{ background: `${BORDER}40`, color: TEXT_DIM }}
        >
          Annuler
        </button>
        <button
          type="button"
          disabled={!selected || !hasSifsWithHazop}
          onClick={() => { if (selected) onImport(selected) }}
          className="flex-1 rounded-lg py-1.5 text-[10px] font-semibold disabled:opacity-40"
          style={{ background: TEAL, color: '#041014' }}
        >
          Importer
        </button>
      </div>
    </div>
  )
}

// ─── Results footer ────────────────────────────────────────────────────────────

function LOPAResultsFooter({
  worksheet,
}: {
  worksheet: LOPAWorksheet
}) {
  const { BORDER, CARD_BG, SHADOW_SOFT, TEAL_DIM, TEXT_DIM } = usePrismTheme()

  const results = useMemo(
    () => calculateLOPAWorksheet(worksheet.scenarios),
    [worksheet.scenarios],
  )
  const dominant = dominantSILFromWorksheet(results)
  const silColor = SIL_COLORS[dominant] ?? '#6B7280'

  if (results.length === 0) return null

  return (
    <div
      className="flex items-center gap-3 px-4 py-2 border-t shrink-0 overflow-x-auto"
      style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_SOFT, scrollbarWidth: 'none' }}
    >
      <div className="flex items-center gap-1.5 shrink-0">
        {results.map(r => {
          const color = SIL_COLORS[r.silRequired] ?? '#6B7280'
          return (
            <div
              key={r.scenarioId}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold"
              style={{ background: `${color}15`, color, border: `1px solid ${color}25` }}
            >
              {r.isAdequate ? <CheckCircle2 size={9} /> : <AlertTriangle size={9} />}
              {r.scenarioId} → {silLabel(r.silRequired)}
            </div>
          )
        })}
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: TEXT_DIM }}>
          SIL dominant
        </span>
        <span
          className="px-2.5 py-0.5 rounded-full text-[11px] font-bold"
          style={{ background: `${silColor}18`, color: silColor }}
        >
          {silLabel(dominant)}
        </span>
      </div>
    </div>
  )
}

// ─── Empty state ────────────────────────────────────────────────────────────────

function LOPAEmptyState({ onAdd }: { onAdd: () => void }) {
  const { BORDER, CARD_BG, SHADOW_PANEL, TEAL, TEXT, TEXT_DIM } = usePrismTheme()

  return (
    <div className="flex flex-1 items-center justify-center">
      <div
        className="flex flex-col items-center gap-5 rounded-2xl border px-8 py-8 max-w-sm text-center"
        style={{ background: CARD_BG, borderColor: BORDER, boxShadow: SHADOW_PANEL }}
      >
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl border"
          style={{ background: `${TEAL}12`, borderColor: `${TEAL}30` }}
        >
          <Shield size={22} style={{ color: TEAL }} />
        </div>

        <div>
          <p className="text-sm font-bold mb-1" style={{ color: TEXT }}>
            Aucun scénario
          </p>
          <p className="text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
            Ajoutez le premier scénario pour commencer à analyser les couches de protection et justifier les SIL requis.
          </p>
        </div>

        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-[11px] font-bold"
          style={{ background: TEAL, color: '#041014' }}
        >
          <Plus size={13} />
          Ajouter le 1er scénario
        </button>
      </div>
    </div>
  )
}

// ─── Main workspace ────────────────────────────────────────────────────────────

export function LOPAGlobalWorkspace({ projectId, studyId: studyIdProp }: { projectId?: string; studyId?: string }) {
  const { BORDER, CARD_BG, PAGE_BG, SHADOW_SOFT, TEAL, TEXT, TEXT_DIM, isDark } = usePrismTheme()
  const { setRightPanelOverride } = useLayout()

  const projects       = useAppStore(s => s.projects)
  const project        = useAppStore(s => projectId ? s.projects.find(p => p.id === projectId) : undefined)
  const createStudy    = useAppStore(s => s.createLOPAStudy)
  const addScenario    = useAppStore(s => s.addLOPAScenario)
  const updateScenario = useAppStore(s => s.updateLOPAScenario)
  const deleteScenario = useAppStore(s => s.deleteLOPAScenario)
  const navigate       = useAppStore(s => s.navigate)

  const lopaStudies = project?.lopaStudies ?? []

  // Active study — use prop, or fallback to first study
  const [activeStudyId, setActiveStudyId] = useState<string | null>(
    studyIdProp ?? lopaStudies[0]?.id ?? null,
  )
  const study    = lopaStudies.find(st => st.id === activeStudyId) ?? lopaStudies[0] ?? null
  const scenarios = study?.scenarios ?? []
  const sifs      = project?.sifs ?? []

  // Sync if prop changes
  useEffect(() => {
    if (studyIdProp) setActiveStudyId(studyIdProp)
  }, [studyIdProp])

  // Auto-select first study when studies load
  useEffect(() => {
    if (!activeStudyId && lopaStudies.length > 0) setActiveStudyId(lopaStudies[0].id)
  }, [activeStudyId, lopaStudies])

  const [selectedRow, setSelectedRow]     = useState<number | null>(null)
  const [showHAZOPDialog, setShowHAZOP]   = useState(false)
  const [gridSelection, setGridSelection] = useState<GridSelection>({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty(),
    current: undefined,
  })
  const gridRef = useRef<DataEditorRef>(null)

  const columns = useMemo<GridColumn[]>(
    () => BASE_COLUMNS.map(c => ({ title: c.title, width: c.width })),
    [],
  )

  const results = useMemo(
    () => calculateLOPAWorksheet(scenarios),
    [scenarios],
  )

  const resultById = useMemo(
    () => new Map(results.map(r => [r.scenarioId, r])),
    [results],
  )

  const adequacyIssues = useMemo(
    () => checkLOPAAdequacy(scenarios),
    [scenarios],
  )

  const gridTheme = useMemo(
    () => buildGridTheme(isDark, BORDER, CARD_BG, PAGE_BG, TEXT, TEXT_DIM),
    [isDark, BORDER, CARD_BG, PAGE_BG, TEXT, TEXT_DIM],
  )

  // SIF label map for the "SIF liée" column
  const sifLabelById = useMemo(
    () => new Map(sifs.map(s => [s.id, `${s.sifNumber}${s.title ? ' · ' + s.title : ''}`])),
    [sifs],
  )

  const getCellContent = useCallback(([col, row]: Item): GridCell => {
    const sc = scenarios[row]
    if (!sc) return { kind: GridCellKind.Text, data: '', displayData: '', allowOverlay: false }

    const colDef = BASE_COLUMNS[col]
    const result = resultById.get(sc.scenarioId)

    switch (colDef?.id as ColId) {
      case 'scenarioId':
        return { kind: GridCellKind.Text, data: sc.scenarioId, displayData: sc.scenarioId, allowOverlay: true }
      case 'sifRef': {
        const label = sc.sifRef ? (sifLabelById.get(sc.sifRef) ?? sc.sifRef) : '—'
        return { kind: GridCellKind.Text, data: sc.sifRef ?? '', displayData: label, allowOverlay: true }
      }
      case 'description':
        return { kind: GridCellKind.Text, data: sc.description, displayData: sc.description, allowOverlay: true }
      case 'initiatingEvent':
        return { kind: GridCellKind.Text, data: sc.initiatingEvent, displayData: sc.initiatingEvent, allowOverlay: true }
      case 'ief':
        return { kind: GridCellKind.Text, data: String(sc.ief), displayData: formatFrequency(sc.ief), allowOverlay: true }
      case 'iefSource':
        return { kind: GridCellKind.Text, data: sc.iefSource, displayData: sc.iefSource, allowOverlay: true }
      case 'condModifier': {
        const cond = (sc.ignitionProbability ?? 1) * (sc.occupancyFactor ?? 1)
        return { kind: GridCellKind.Text, data: String(cond), displayData: cond < 1 ? cond.toFixed(2) : '—', allowOverlay: false }
      }
      case 'iplCount':
        return { kind: GridCellKind.Text, data: String(sc.ipls.length), displayData: String(sc.ipls.length || '—'), allowOverlay: false }
      case 'mef': {
        const mef = result?.mef ?? null
        const isOk = mef !== null && result && mef <= result.tmel
        const displayData = mef !== null ? formatFrequency(mef) : '—'
        return {
          kind: GridCellKind.Text,
          data: mef !== null ? String(mef) : '',
          displayData,
          allowOverlay: false,
          themeOverride: mef !== null ? { textDark: isOk ? semantic.success : semantic.error } : undefined,
        }
      }
      case 'tmel':
        return { kind: GridCellKind.Text, data: String(sc.tmel), displayData: formatFrequency(sc.tmel), allowOverlay: true }
      case 'rrf': {
        const rrf = result?.rrf ?? null
        return { kind: GridCellKind.Text, data: rrf !== null ? String(rrf) : '', displayData: rrf !== null ? formatRRF(rrf) : '—', allowOverlay: false }
      }
      case 'silRequired': {
        const sil = result?.silRequired ?? silFromRRF(result?.rrf ?? 0)
        const color = SIL_COLORS[sil] ?? TEXT_DIM
        return {
          kind: GridCellKind.Text,
          data: String(sil),
          displayData: silLabel(sil),
          allowOverlay: false,
          themeOverride: { textDark: color },
        }
      }
      default:
        return { kind: GridCellKind.Text, data: '', displayData: '', allowOverlay: false }
    }
  }, [scenarios, resultById, sifLabelById, TEXT_DIM])

  const onCellEdited = useCallback(([col, row]: Item, newValue: EditableGridCell) => {
    const sc = scenarios[row]
    if (!sc) return
    const colId = BASE_COLUMNS[col]?.id as ColId
    const raw = newValue.kind === GridCellKind.Text ? newValue.data : ''

    if (!study || !projectId) return

    const patch: Partial<LOPAScenario> = {}
    switch (colId) {
      case 'scenarioId':   patch.scenarioId = raw; break
      case 'sifRef':       patch.sifRef = raw || undefined; break
      case 'description':  patch.description = raw; break
      case 'initiatingEvent': patch.initiatingEvent = raw; break
      case 'ief': {
        const n = parseFloat(raw)
        if (!isNaN(n) && n > 0) patch.ief = n
        break
      }
      case 'iefSource': patch.iefSource = raw; break
      case 'tmel': {
        const n = parseFloat(raw)
        if (!isNaN(n) && n > 0) patch.tmel = n
        break
      }
      default: return
    }
    updateScenario(projectId, study.id, sc.id, patch)
  }, [scenarios, study, updateScenario, projectId])

  const handleAddScenario = () => {
    if (!projectId) return
    let targetStudyId = study?.id
    if (!targetStudyId) {
      targetStudyId = createStudy(projectId)
      setActiveStudyId(targetStudyId)
    }
    const newScenario = buildEmptyScenario(scenarios.length + 1)
    addScenario(projectId, targetStudyId, newScenario)
    setTimeout(() => { setSelectedRow(scenarios.length) }, 50)
  }

  const handleImportHAZOP = (sifId: string) => {
    if (!projectId) return
    const sif = sifs.find(s => s.id === sifId)
    if (!sif?.hazopTrace) return
    const h = sif.hazopTrace
    const order = scenarios.length + 1
    const newScenario: LOPAScenario = {
      id: crypto.randomUUID(),
      order,
      scenarioId: h.scenarioId || `SC-${String(order).padStart(3, '0')}`,
      hazopRef: h.scenarioId,
      sifRef: sifId,
      description: sif.hazardousEvent || '',
      consequenceCategory: 'safety_personnel',
      consequenceDescription: h.deviationCause || '',
      initiatingEvent: h.initiatingEvent || '',
      ief: 0.1,
      iefSource: 'HAZOP',
      ignitionProbability: null,
      occupancyFactor: null,
      ipls: [],
      tmel: h.tmel || 1e-5,
      riskMatrixCell: h.riskMatrix || '',
    }
    let targetStudyId = study?.id
    if (!targetStudyId) {
      targetStudyId = createStudy(projectId)
      setActiveStudyId(targetStudyId)
    }
    addScenario(projectId, targetStudyId, newScenario)
    setShowHAZOP(false)
  }

  const handleExportCSV = () => {
    const headers = BASE_COLUMNS.map(c => c.title).join(',')
    const rows = scenarios.map(sc => {
      const result = resultById.get(sc.scenarioId)
      return [
        sc.scenarioId,
        sc.sifRef ? (sifLabelById.get(sc.sifRef) ?? sc.sifRef) : '',
        sc.description,
        sc.initiatingEvent,
        sc.ief,
        sc.iefSource,
        (sc.ignitionProbability ?? 1) * (sc.occupancyFactor ?? 1),
        sc.ipls.length,
        result?.mef ?? '',
        sc.tmel,
        result?.rrf ?? '',
        result?.silRequired ?? '',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    })
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `LOPA_${project?.ref || projectId}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const selectedScenario = selectedRow !== null ? scenarios[selectedRow] : null

  // Wire selected scenario to the right panel via setRightPanelOverride
  useEffect(() => {
    if (!selectedScenario || !projectId || !study) {
      setRightPanelOverride(null)
      return
    }
    const result = results.find(r => r.scenarioId === selectedScenario.scenarioId) ?? calculateLOPAScenario(selectedScenario)
    setRightPanelOverride(
      <RightPanelShell persistKey="lopa-scenario">
        <RightPanelSection id="scenario" label={`${selectedScenario.scenarioId} — IPL & Risque`} Icon={Shield} noPadding>
          <LOPAScenarioDetailPanel
            scenario={selectedScenario}
            result={result}
            isLocked={false}
            onUpdate={updates => updateScenario(projectId, study.id, selectedScenario.id, updates)}
            onClose={() => setSelectedRow(null)}
          />
        </RightPanelSection>
        <RightPanelSection id="actions" label="Actions" Icon={Trash2} variant="static">
          <button
            type="button"
            onClick={() => {
              deleteScenario(projectId, study.id, selectedScenario.id)
              setSelectedRow(null)
            }}
            className="w-full rounded-lg py-1.5 text-[10px] font-semibold border"
            style={{ color: '#EF4444', borderColor: '#EF444430', background: '#EF444408' }}
          >
            Supprimer ce scénario
          </button>
        </RightPanelSection>
      </RightPanelShell>,
    )
    return () => setRightPanelOverride(null)
  }, [selectedScenario, projectId, study, results, updateScenario, deleteScenario, setRightPanelOverride])

  // No project selected — show project picker
  if (!projectId) {
    return (
      <LOPAProjectPicker
        projects={projects}
        onSelect={pid => navigate({ type: 'lopa', projectId: pid })}
      />
    )
  }

  if (!project) return null

  const toolbarProps = {
    projectName: project.name,
    studies: lopaStudies,
    activeStudyId: study?.id ?? null,
    onSelectStudy: setActiveStudyId,
    onCreateStudy: () => {
      if (!projectId) return
      const id = createStudy(projectId)
      setActiveStudyId(id)
    },
    scenarioCount: scenarios.length,
    hasHAZOP: sifs.some(s => !!s.hazopTrace),
    onAdd: handleAddScenario,
    onHAZOPImport: () => setShowHAZOP(true),
    onExport: handleExportCSV,
    adequacyIssues: scenarios.length === 0 ? [] : adequacyIssues,
  }

  // ── Empty state ──
  if (!study || scenarios.length === 0) {
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <LOPAToolbar {...toolbarProps} />
        {showHAZOPDialog && (
          <HAZOPImportDialog
            sifOptions={sifs.map(s => ({
              id: s.id,
              label: `${s.sifNumber}${s.title ? ' · ' + s.title : ''}`,
              hasHazop: !!s.hazopTrace,
            }))}
            onImport={handleImportHAZOP}
            onClose={() => setShowHAZOP(false)}
          />
        )}
        <LOPAEmptyState onAdd={handleAddScenario} />
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden relative">
      <LOPAToolbar {...toolbarProps} />

      {showHAZOPDialog && (
        <HAZOPImportDialog
          sifOptions={sifs.map(s => ({
            id: s.id,
            label: `${s.sifNumber}${s.title ? ' · ' + s.title : ''}`,
            hasHazop: !!s.hazopTrace,
          }))}
          onImport={handleImportHAZOP}
          onClose={() => setShowHAZOP(false)}
        />
      )}

      <div className="flex-1 min-h-0 overflow-hidden relative">
        <div style={{ position: 'absolute', inset: 0 }}>
          <DataEditor
            ref={gridRef}
            columns={columns}
            rows={scenarios.length}
            getCellContent={getCellContent}
            onCellEdited={onCellEdited}
            gridSelection={gridSelection}
            onGridSelectionChange={sel => {
              setGridSelection(sel)
              if (sel.current?.cell) setSelectedRow(sel.current.cell[1])
            }}
            onRowAppended={handleAddScenario}
            trailingRowOptions={{ sticky: false, tint: true, hint: 'Nouveau scénario…' }}
            theme={gridTheme}
            rowMarkers="number"
            smoothScrollX
            smoothScrollY
            width="100%"
            height="100%"
          />
        </div>
      </div>

      <LOPAResultsFooter worksheet={study} />
    </div>
  )
}

// ─── Project picker (no project selected) ──────────────────────────────────────

function LOPAProjectPicker({
  projects,
  onSelect,
}: {
  projects: import('@/core/types').Project[]
  onSelect: (projectId: string) => void
}) {
  const { BORDER, CARD_BG, SHADOW_PANEL, TEAL, TEXT, TEXT_DIM } = usePrismTheme()

  return (
    <div className="flex flex-1 items-center justify-center">
      <div
        className="flex flex-col items-center gap-5 rounded-2xl border px-8 py-8 w-80 text-center"
        style={{ background: CARD_BG, borderColor: BORDER, boxShadow: SHADOW_PANEL }}
      >
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl border"
          style={{ background: `${TEAL}12`, borderColor: `${TEAL}30` }}
        >
          <Shield size={22} style={{ color: TEAL }} />
        </div>
        <div>
          <p className="text-sm font-bold mb-1" style={{ color: TEXT }}>Études LOPA</p>
          <p className="text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
            Sélectionnez un projet pour accéder à ses études LOPA.
          </p>
        </div>
        {projects.length > 0 ? (
          <div className="w-full rounded-xl border overflow-hidden" style={{ borderColor: BORDER }}>
            {projects.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelect(p.id)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] transition-colors hover:opacity-80"
                style={{ color: TEXT, borderBottom: `1px solid ${BORDER}` }}
              >
                <span className="font-semibold truncate">{p.name}</span>
                {p.lopaStudies && p.lopaStudies.length > 0 && (
                  <span className="ml-auto shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: `${TEAL}18`, color: TEAL }}>
                    {p.lopaStudies.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[10px]" style={{ color: TEXT_DIM }}>Aucun projet disponible.</p>
        )}
      </div>
    </div>
  )
}

// ─── Toolbar ───────────────────────────────────────────────────────────────────

function LOPAToolbar({
  projectName,
  studies,
  activeStudyId,
  onSelectStudy,
  onCreateStudy,
  scenarioCount,
  hasHAZOP,
  onAdd,
  onHAZOPImport,
  onExport,
  adequacyIssues,
}: {
  projectName: string
  studies: LOPAWorksheet[]
  activeStudyId: string | null
  onSelectStudy: (id: string) => void
  onCreateStudy: () => void
  scenarioCount: number
  hasHAZOP: boolean
  onAdd: () => void
  onHAZOPImport: () => void
  onExport: () => void
  adequacyIssues: ReturnType<typeof checkLOPAAdequacy>
}) {
  const { BORDER, CARD_BG, SHADOW_SOFT, TEAL, TEXT, TEXT_DIM } = usePrismTheme()

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 border-b shrink-0 flex-wrap"
      style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_SOFT }}
    >
      {/* Title */}
      <div className="flex items-center gap-2 shrink-0">
        <Shield size={14} style={{ color: TEAL }} />
        <span className="text-[11px] font-semibold" style={{ color: TEXT }}>
          LOPA — {projectName}
        </span>
      </div>

      {/* Study tabs */}
      <div className="flex items-center gap-1 ml-2">
        {studies.map(st => (
          <button
            key={st.id}
            type="button"
            onClick={() => onSelectStudy(st.id)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors"
            style={{
              background: activeStudyId === st.id ? `${TEAL}18` : 'transparent',
              color: activeStudyId === st.id ? TEAL : TEXT_DIM,
              border: `1px solid ${activeStudyId === st.id ? `${TEAL}40` : 'transparent'}`,
            }}
          >
            {st.name}
          </button>
        ))}
        <button
          type="button"
          onClick={onCreateStudy}
          title="Nouvelle étude LOPA"
          className="flex h-6 w-6 items-center justify-center rounded-lg transition-colors"
          style={{ color: TEXT_DIM }}
          onMouseEnter={e => { e.currentTarget.style.color = TEXT }}
          onMouseLeave={e => { e.currentTarget.style.color = TEXT_DIM }}
        >
          <Plus size={11} />
        </button>
      </div>

      {/* Scenario count */}
      {scenarioCount > 0 && (
        <span
          className="px-1.5 py-0.5 rounded-full text-[9px] font-bold"
          style={{ background: `${TEAL}18`, color: TEAL }}
        >
          {scenarioCount} scénario{scenarioCount > 1 ? 's' : ''}
        </span>
      )}

      {/* Adequacy warnings */}
      {adequacyIssues.length > 0 && (
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-semibold"
          style={{ background: '#F59E0B15', color: '#F59E0B', border: '1px solid #F59E0B30' }}>
          <AlertTriangle size={9} />
          {adequacyIssues.length} écart{adequacyIssues.length > 1 ? 's' : ''} IEC 61511
        </div>
      )}

      <div className="flex-1" />

      {/* Actions */}
      {hasHAZOP && (
        <button
          type="button"
          onClick={onHAZOPImport}
          title="Importer depuis HAZOP"
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition-all"
          style={{ background: `${TEAL}12`, color: TEAL, border: `1px solid ${TEAL}25` }}
        >
          <ArrowRight size={10} />
          Import HAZOP
        </button>
      )}

      <button
        type="button"
        onClick={onExport}
        title="Export CSV"
        className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
        style={{ color: TEXT_DIM }}
        onMouseEnter={e => { e.currentTarget.style.color = TEXT }}
        onMouseLeave={e => { e.currentTarget.style.color = TEXT_DIM }}
      >
        <Download size={13} />
      </button>

      <button
        type="button"
        onClick={onAdd}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-bold"
        style={{ background: TEAL, color: '#041014' }}
      >
        <Plus size={11} />
        Scénario
      </button>
    </div>
  )
}
