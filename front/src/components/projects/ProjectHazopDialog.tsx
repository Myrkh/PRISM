/**
 * ProjectHazopDialog — PRISM
 *
 * Real HAZOP/LOPA worksheet structure (IEC 61511 / ISO 17776 compliant):
 *
 *  HAZOP columns:
 *    Node · Deviation (Mot-guide + Paramètre) · Cause · Conséquence
 *    · Barrières existantes · Classe de risque (Sévérité × Fréquence)
 *
 *  LOPA columns (per row):
 *    IE Frequency [yr⁻¹] · IPL credits · Mitigated frequency
 *    · TMEL [yr⁻¹] · SIL requis · Catégorie de conséquence
 *
 *  Features:
 *    • Add / delete rows
 *    • Edit mode / preview mode
 *    • CSV import with column mapping
 *    • KORE modal aesthetic: rounded-2xl, navy header, clean table
 */
import { useEffect, useRef, useState } from 'react'
import {
  X, Plus, Trash2, Pencil, Save, Upload, AlertTriangle,
  ChevronDown, Info, FileSpreadsheet,
} from 'lucide-react'
import { nanoid } from 'nanoid'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useAppStore } from '@/store/appStore'
import type { HAZOPTrace, Project } from '@/core/types'
import { cn } from '@/lib/utils'

const NAVY  = '#003D5C'
const NAVY2 = '#002A42'
const TEAL  = '#009BA4'

// ─── Guide words (IEC 61511 / HazOp standard) ─────────────────────────────
const GUIDE_WORDS = ['No/None', 'More', 'Less', 'Reverse', 'As well as', 'Part of', 'Other than', 'Early', 'Late']
const PARAMETERS  = ['Flow', 'Pressure', 'Temperature', 'Level', 'Composition', 'Phase', 'Reaction', 'Speed', 'Signal']
const RISK_SEV    = ['1', '2', '3', '4', '5']
const RISK_FREQ   = ['A', 'B', 'C', 'D', 'E']
const CONS_CATS   = ['Santé/Sécurité', 'Environnement', 'Bien matériel', 'Réputation', 'Financier']

// ─── Row type ─────────────────────────────────────────────────────────────
interface HAZOPRow {
  id: string
  // HAZOP
  sifKey:           string   // linked SIF number
  node:             string
  guideWord:        string
  parameter:        string
  deviation:        string   // computed: guideWord + parameter
  cause:            string
  consequence:      string
  existingSafeguards: string
  riskSeverity:     string   // 1–5
  riskFrequency:    string   // A–E
  riskMatrix:       string   // e.g. "4C"
  // LOPA
  scenarioId:       string
  lopaRef:          string
  ieFrequency:      number   // Initiating Event frequency [yr⁻¹]
  iplCredits:       number   // total IPL credit (log reduction)
  iplList:          string
  mitigatedFreq:    number   // ieFrequency × 10^(-iplCredits)
  tmel:             number   // Target Mitigated Event Likelihood [yr⁻¹]
  requiredPFD:      number   // tmel / ieFrequency (after IPLs removed)
  silRequired:      string   // SIL 1 / 2 / 3 / 4
  consequenceCategory: string
  // Meta
  hazopDate:        string
  hazopFacilitator: string
  lopaDate:         string
  actionOwner:      string
  recommendation:   string
  status:           'open' | 'closed' | 'ongoing'
}

const emptyRow = (): HAZOPRow => ({
  id: nanoid(), sifKey: '', node: '', guideWord: '', parameter: '', deviation: '',
  cause: '', consequence: '', existingSafeguards: '',
  riskSeverity: '3', riskFrequency: 'C', riskMatrix: '3C',
  scenarioId: '', lopaRef: '', ieFrequency: 0.1, iplCredits: 1, iplList: '',
  mitigatedFreq: 0.01, tmel: 0.001, requiredPFD: 0.1, silRequired: 'SIL 1',
  consequenceCategory: 'Santé/Sécurité',
  hazopDate: '', hazopFacilitator: '', lopaDate: '', actionOwner: '', recommendation: '',
  status: 'open',
})

// ─── Compute SIL from PFD ──────────────────────────────────────────────
function pfdToSIL(pfd: number): string {
  if (pfd >= 0.01)  return 'SIL 1'
  if (pfd >= 0.001) return 'SIL 2'
  if (pfd >= 0.0001) return 'SIL 3'
  return 'SIL 4'
}

function recalcRow(row: HAZOPRow): HAZOPRow {
  const mitigated = row.ieFrequency * Math.pow(10, -row.iplCredits)
  const required  = mitigated > 0 ? row.tmel / mitigated : 0
  const riskMatrix = `${row.riskSeverity}${row.riskFrequency}`
  return {
    ...row,
    deviation:    [row.guideWord, row.parameter].filter(Boolean).join(' — '),
    mitigatedFreq: mitigated,
    requiredPFD:   required,
    silRequired:   required > 0 ? pfdToSIL(required) : '—',
    riskMatrix,
  }
}

// ─── Risk matrix cell color ───────────────────────────────────────────────
function riskColor(sev: string, freq: string) {
  const s = Number(sev)
  const f = ['A','B','C','D','E'].indexOf(freq)
  const score = s * (f + 1)
  if (score >= 15) return { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' }
  if (score >= 9)  return { bg: '#FFF7ED', color: '#EA580C', border: '#FED7AA' }
  if (score >= 4)  return { bg: '#FEFCE8', color: '#CA8A04', border: '#FEF08A' }
  return              { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' }
}

const SIL_COLORS: Record<string, { bg: string; color: string }> = {
  'SIL 1': { bg: '#DBEAFE', color: '#1D4ED8' },
  'SIL 2': { bg: '#EDE9FE', color: '#7C3AED' },
  'SIL 3': { bg: '#FFF7ED', color: '#C2410C' },
  'SIL 4': { bg: '#FEF2F2', color: '#B91C1C' },
  '—':     { bg: '#F9FAFB', color: '#9CA3AF' },
}

const STATUS_CFG = {
  open:    { label: 'Ouvert',   bg: '#FEF9C3', color: '#92400E' },
  closed:  { label: 'Fermé',    bg: '#DCFCE7', color: '#15803D' },
  ongoing: { label: 'En cours', bg: '#DBEAFE', color: '#1D4ED8' },
}

// ─── CSV helpers ──────────────────────────────────────────────────────────
function parseCsv(content: string) {
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (!lines.length) return { headers: [] as string[], rows: [] as Record<string, string>[] }
  const delim = lines[0].includes(';') ? ';' : ','
  const split = (l: string) => l.split(delim).map(x => x.trim().replace(/^"|"$/g, ''))
  const headers = split(lines[0])
  const rows = lines.slice(1).map(l => {
    const cols = split(l); const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = cols[i] ?? '' }); return row
  })
  return { headers, rows }
}

// ─── Editable cell ────────────────────────────────────────────────────────
function ECell({ value, onChange, className, placeholder, type = 'text' }: {
  value: string | number; onChange: (v: string) => void
  className?: string; placeholder?: string; type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        'w-full bg-transparent text-xs outline-none border-0 border-b border-transparent focus:border-[#009BA4] py-0.5 transition-all placeholder:text-gray-300',
        className,
      )}
    />
  )
}

function ESelect({ value, onChange, options, className }: {
  value: string; onChange: (v: string) => void; options: string[]; className?: string
}) {
  return (
    <select
      value={value} onChange={e => onChange(e.target.value)}
      className={cn('w-full bg-transparent text-xs outline-none border-0 border-b border-transparent focus:border-[#009BA4] py-0.5 transition-all', className)}
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

// ─── Main dialog ──────────────────────────────────────────────────────────
interface Props { project: Project; open: boolean; onOpenChange: (o: boolean) => void }

export function ProjectHazopDialog({ project, open, onOpenChange }: Props) {
  const updateHAZOPTrace = useAppStore(s => s.updateHAZOPTrace)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const [editing, setEditing]   = useState(false)
  const [activeView, setView]   = useState<'hazop' | 'lopa'>('hazop')
  const [rows, setRows]         = useState<HAZOPRow[]>([])

  // CSV state
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvRows,    setCsvRows]    = useState<Record<string, string>[]>([])
  const [showMapping, setShowMapping] = useState(false)

  // Init rows from existing SIF HAZOP traces
  useEffect(() => {
    if (!open) return
    const initial = project.sifs.map(sif => {
      const t = sif.hazopTrace
      const r = emptyRow()
      return recalcRow({
        ...r,
        sifKey:           sif.sifNumber,
        node:             t?.hazopNode ?? '',
        scenarioId:       t?.scenarioId ?? '',
        cause:            t?.initiatingEvent ?? '',
        consequence:      t?.deviationCause ?? '',
        lopaRef:          t?.lopaRef ?? '',
        tmel:             t?.tmel ?? 0.001,
        iplList:          t?.iplList ?? '',
        riskMatrix:       t?.riskMatrix ?? '',
        riskSeverity:     t?.riskMatrix?.slice(0, 1) || '3',
        riskFrequency:    t?.riskMatrix?.slice(1, 2) || 'C',
        hazopDate:        t?.hazopDate ?? '',
        lopaDate:         t?.lopaDate ?? '',
        hazopFacilitator: t?.hazopFacilitator ?? '',
      })
    })
    setRows(initial.length > 0 ? initial : [recalcRow(emptyRow())])
  }, [open, project])

  const updateRow = (id: string, patch: Partial<HAZOPRow>) =>
    setRows(prev => prev.map(r => r.id === id ? recalcRow({ ...r, ...patch }) : r))

  const addRow = () => setRows(prev => [...prev, recalcRow({ ...emptyRow(), sifKey: project.sifs[0]?.sifNumber ?? '' })])

  const deleteRow = (id: string) => setRows(prev => prev.filter(r => r.id !== id))

  const save = () => {
    rows.forEach(row => {
      const sif = project.sifs.find(s => s.sifNumber === row.sifKey)
      if (!sif) return
      const trace: HAZOPTrace = {
        hazopNode: row.node, scenarioId: row.scenarioId,
        deviationCause: row.consequence,
        initiatingEvent: row.cause,
        lopaRef: row.lopaRef, tmel: row.tmel,
        iplList: row.iplList, riskMatrix: row.riskMatrix,
        hazopDate: row.hazopDate, lopaDate: row.lopaDate,
        hazopFacilitator: row.hazopFacilitator,
      }
      updateHAZOPTrace(project.id, sif.id, trace)
    })
    setEditing(false)
  }

  const onImportFile = async (file?: File) => {
    if (!file) return
    const { headers, rows: r } = parseCsv(await file.text())
    setCsvHeaders(headers); setCsvRows(r); setShowMapping(true)
  }

  // ─ HAZOP columns ───────────────────────────────────────────────────────
  const hazopCols = [
    'SIF', 'Nœud', 'Mot-guide', 'Paramètre', 'Déviation', 'Cause', 'Conséquence',
    'Barrières existantes', 'Sévérité', 'Fréquence', 'Risque', 'Recommandation', 'Responsable', 'Statut', '',
  ]

  // ─ LOPA columns ────────────────────────────────────────────────────────
  const lopaCols = [
    'SIF', 'Scénario', 'Réf. LOPA', 'Cat. Conséquence', 'Fréquence IE [yr⁻¹]',
    'IPLs', 'Crédit IPL [log]', 'Fréq. mitigée', 'TMEL [yr⁻¹]', 'PFD requis', 'SIL requis', '',
  ]

  const colsToShow = activeView === 'hazop' ? hazopCols : lopaCols

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] p-0 rounded-2xl overflow-hidden gap-0">

        {/* ── Header ── */}
        <div className="px-6 pt-6 pb-4 border-b" style={{ background: 'white' }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">
                Registre HAZOP / LOPA
              </p>
              <h2 className="text-lg font-bold" style={{ color: NAVY }}>
                {project.ref} — {project.name}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {rows.length} scénario{rows.length !== 1 ? 's' : ''} · IEC 61511 / ISO 17776
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* View toggle */}
              <div className="flex rounded-xl overflow-hidden border border-gray-200">
                {(['hazop', 'lopa'] as const).map(v => (
                  <button key={v} onClick={() => setView(v)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-semibold transition-all',
                      activeView === v ? 'text-white' : 'text-gray-500 hover:text-gray-700 bg-white',
                    )}
                    style={activeView === v ? { background: NAVY } : undefined}
                  >
                    {v === 'hazop' ? 'HAZOP' : 'LOPA'}
                  </button>
                ))}
              </div>

              <button onClick={() => setEditing(v => !v)}
                className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:border-[#009BA4] hover:text-[#009BA4] transition-all"
              >
                <Pencil size={11} />{editing ? 'Aperçu' : 'Modifier'}
              </button>

              <button onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:border-[#009BA4] hover:text-[#009BA4] transition-all"
              >
                <Upload size={11} />Import CSV
              </button>

              <button onClick={save}
                className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-semibold text-white shadow-sm transition-all"
                style={{ background: NAVY }}
                onMouseEnter={e => (e.currentTarget.style.background = NAVY2)}
                onMouseLeave={e => (e.currentTarget.style.background = NAVY)}
              >
                <Save size={11} />Sauvegarder
              </button>

              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
                onChange={e => onImportFile(e.target.files?.[0])} />
            </div>
          </div>

          {/* Info strip */}
          <div className="mt-3 flex items-center gap-2 text-[10px] text-gray-400">
            <Info size={11} />
            <span>
              Remplissez les colonnes HAZOP et LOPA dans chaque vue.
              Les données sont liées aux SIF via le champ <b>SIF</b>.
              Cliquez <b>Sauvegarder</b> pour propager vers les SIF correspondantes.
            </span>
          </div>
        </div>

        {/* ── CSV mapping bar ── */}
        {showMapping && csvHeaders.length > 0 && (
          <div className="px-6 py-3 border-b bg-blue-50/50 flex flex-wrap items-end gap-3">
            <p className="text-xs font-semibold text-gray-700 w-full">Mapping des colonnes CSV :</p>
            {[
              ['sifKey', 'N° SIF'], ['node', 'Nœud'], ['scenarioId', 'Scénario'],
              ['cause', 'Cause'], ['consequence', 'Conséquence'], ['tmel', 'TMEL'],
            ].map(([key, label]) => (
              <div key={key} className="space-y-0.5">
                <p className="text-[9px] uppercase tracking-wider text-gray-400">{label}</p>
                <select className="h-7 text-xs rounded-lg border border-gray-200 px-2">
                  <option value="">—</option>
                  {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
            <button
              onClick={() => setShowMapping(false)}
              className="h-7 px-3 text-xs font-semibold rounded-lg text-white"
              style={{ background: TEAL }}
            >Appliquer</button>
          </div>
        )}

        {/* ── Table ── */}
        <div className="overflow-auto" style={{ maxHeight: '62vh' }}>
          <table className="w-full text-xs border-separate border-spacing-0">
            <thead className="sticky top-0 z-10">
              <tr style={{ background: NAVY }}>
                {colsToShow.map((h, i) => (
                  <th key={i}
                    className={cn(
                      'px-3 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest text-white/80 whitespace-nowrap',
                      i === colsToShow.length - 1 && 'w-10',
                    )}
                  >{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => {
                const rc  = riskColor(row.riskSeverity, row.riskFrequency)
                const sc  = SIL_COLORS[row.silRequired] ?? SIL_COLORS['—']
                const stc = STATUS_CFG[row.status]
                const isEven = ri % 2 === 0

                if (activeView === 'hazop') return (
                  <tr key={row.id}
                    className={cn('border-b border-gray-50 group hover:bg-blue-50/20 transition-colors', isEven ? 'bg-white' : 'bg-gray-50/40')}
                  >
                    {/* SIF key */}
                    <td className="px-3 py-2.5 min-w-[90px]">
                      {editing ? (
                        <select value={row.sifKey} onChange={e => updateRow(row.id, { sifKey: e.target.value })}
                          className="w-full bg-transparent text-xs outline-none border-b border-transparent focus:border-[#009BA4] py-0.5 font-mono font-bold"
                          style={{ color: TEAL }}
                        >
                          <option value="">—</option>
                          {project.sifs.map(s => <option key={s.id} value={s.sifNumber}>{s.sifNumber}</option>)}
                        </select>
                      ) : (
                        <span className="font-mono font-bold text-xs" style={{ color: TEAL }}>{row.sifKey || '—'}</span>
                      )}
                    </td>
                    {/* Node */}
                    <td className="px-3 py-2.5 min-w-[110px]">
                      {editing ? <ECell value={row.node} onChange={v => updateRow(row.id, { node: v })} placeholder="ex: N-01" /> : <span className="text-gray-700">{row.node || <span className="text-gray-300">—</span>}</span>}
                    </td>
                    {/* Guide word */}
                    <td className="px-3 py-2.5 min-w-[100px]">
                      {editing ? <ESelect value={row.guideWord} onChange={v => updateRow(row.id, { guideWord: v })} options={GUIDE_WORDS} /> : <span className="text-gray-600">{row.guideWord || '—'}</span>}
                    </td>
                    {/* Parameter */}
                    <td className="px-3 py-2.5 min-w-[100px]">
                      {editing ? <ESelect value={row.parameter} onChange={v => updateRow(row.id, { parameter: v })} options={PARAMETERS} /> : <span className="text-gray-600">{row.parameter || '—'}</span>}
                    </td>
                    {/* Deviation (computed) */}
                    <td className="px-3 py-2.5 min-w-[140px]">
                      <span className="text-[10px] font-semibold text-gray-500 italic">{row.deviation || '—'}</span>
                    </td>
                    {/* Cause */}
                    <td className="px-3 py-2.5 min-w-[160px]">
                      {editing ? <ECell value={row.cause} onChange={v => updateRow(row.id, { cause: v })} placeholder="Événement initiateur…" /> : <span className="text-gray-700">{row.cause || <span className="text-gray-300">—</span>}</span>}
                    </td>
                    {/* Consequence */}
                    <td className="px-3 py-2.5 min-w-[160px]">
                      {editing ? <ECell value={row.consequence} onChange={v => updateRow(row.id, { consequence: v })} placeholder="Conséquence potentielle…" /> : <span className="text-gray-700">{row.consequence || <span className="text-gray-300">—</span>}</span>}
                    </td>
                    {/* Existing safeguards */}
                    <td className="px-3 py-2.5 min-w-[140px]">
                      {editing ? <ECell value={row.existingSafeguards} onChange={v => updateRow(row.id, { existingSafeguards: v })} placeholder="BPCS, PSV, …" /> : <span className="text-gray-500">{row.existingSafeguards || <span className="text-gray-300">—</span>}</span>}
                    </td>
                    {/* Severity */}
                    <td className="px-3 py-2.5 w-16">
                      {editing ? <ESelect value={row.riskSeverity} onChange={v => updateRow(row.id, { riskSeverity: v })} options={RISK_SEV} /> : <span className="font-mono font-bold text-gray-600">{row.riskSeverity}</span>}
                    </td>
                    {/* Frequency */}
                    <td className="px-3 py-2.5 w-16">
                      {editing ? <ESelect value={row.riskFrequency} onChange={v => updateRow(row.id, { riskFrequency: v })} options={RISK_FREQ} /> : <span className="font-mono font-bold text-gray-600">{row.riskFrequency}</span>}
                    </td>
                    {/* Risk matrix */}
                    <td className="px-3 py-2.5 w-16">
                      <span className="text-[11px] font-black px-2 py-0.5 rounded"
                        style={{ background: rc.bg, color: rc.color, border: `1px solid ${rc.border}` }}
                      >{row.riskMatrix}</span>
                    </td>
                    {/* Recommendation */}
                    <td className="px-3 py-2.5 min-w-[150px]">
                      {editing ? <ECell value={row.recommendation} onChange={v => updateRow(row.id, { recommendation: v })} placeholder="Action corrective…" /> : <span className="text-gray-500 text-[10px] italic">{row.recommendation || <span className="text-gray-300">—</span>}</span>}
                    </td>
                    {/* Action owner */}
                    <td className="px-3 py-2.5 min-w-[100px]">
                      {editing ? <ECell value={row.actionOwner} onChange={v => updateRow(row.id, { actionOwner: v })} placeholder="Responsable" /> : <span className="text-gray-500">{row.actionOwner || <span className="text-gray-300">—</span>}</span>}
                    </td>
                    {/* Status */}
                    <td className="px-3 py-2.5 w-24">
                      {editing ? (
                        <ESelect value={row.status} onChange={v => updateRow(row.id, { status: v as any })} options={['open', 'closed', 'ongoing']} />
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded"
                          style={{ background: stc.bg, color: stc.color }}
                        >{stc.label}</span>
                      )}
                    </td>
                    {/* Delete */}
                    <td className="px-2 py-2.5 w-8">
                      {editing && (
                        <button onClick={() => deleteRow(row.id)} title="Supprimer la ligne"
                          className="p-1 rounded text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        ><Trash2 size={12} /></button>
                      )}
                    </td>
                  </tr>
                )

                // ─ LOPA view ─────────────────────────────────────────────
                return (
                  <tr key={row.id}
                    className={cn('border-b border-gray-50 group hover:bg-blue-50/20 transition-colors', isEven ? 'bg-white' : 'bg-gray-50/40')}
                  >
                    {/* SIF key */}
                    <td className="px-3 py-2.5 min-w-[90px]">
                      <span className="font-mono font-bold" style={{ color: TEAL }}>{row.sifKey || '—'}</span>
                    </td>
                    {/* Scenario ID */}
                    <td className="px-3 py-2.5 min-w-[110px]">
                      {editing ? <ECell value={row.scenarioId} onChange={v => updateRow(row.id, { scenarioId: v })} placeholder="SC-001" className="font-mono" /> : <span className="font-mono text-gray-700">{row.scenarioId || '—'}</span>}
                    </td>
                    {/* LOPA ref */}
                    <td className="px-3 py-2.5 min-w-[110px]">
                      {editing ? <ECell value={row.lopaRef} onChange={v => updateRow(row.id, { lopaRef: v })} placeholder="LOPA-HTL-001" className="font-mono" /> : <span className="font-mono text-gray-600">{row.lopaRef || '—'}</span>}
                    </td>
                    {/* Consequence category */}
                    <td className="px-3 py-2.5 min-w-[130px]">
                      {editing ? <ESelect value={row.consequenceCategory} onChange={v => updateRow(row.id, { consequenceCategory: v })} options={CONS_CATS} /> : <span className="text-gray-600">{row.consequenceCategory}</span>}
                    </td>
                    {/* IE Frequency */}
                    <td className="px-3 py-2.5 min-w-[120px]">
                      {editing ? <ECell value={row.ieFrequency} onChange={v => updateRow(row.id, { ieFrequency: Number(v) || 0 })} type="number" placeholder="0.1" className="font-mono" /> : <span className="font-mono text-gray-700">{row.ieFrequency.toExponential(2)} /an</span>}
                    </td>
                    {/* IPL list */}
                    <td className="px-3 py-2.5 min-w-[150px]">
                      {editing ? <ECell value={row.iplList} onChange={v => updateRow(row.id, { iplList: v })} placeholder="BPCS (1), PSV (1)" /> : <span className="text-gray-500">{row.iplList || '—'}</span>}
                    </td>
                    {/* IPL credits */}
                    <td className="px-3 py-2.5 min-w-[90px]">
                      {editing ? <ECell value={row.iplCredits} onChange={v => updateRow(row.id, { iplCredits: Number(v) || 0 })} type="number" placeholder="2" className="font-mono" /> : <span className="font-mono font-bold text-gray-700">{row.iplCredits} log</span>}
                    </td>
                    {/* Mitigated freq (computed) */}
                    <td className="px-3 py-2.5 min-w-[110px]">
                      <span className="font-mono text-gray-500">{row.mitigatedFreq.toExponential(2)} /an</span>
                    </td>
                    {/* TMEL */}
                    <td className="px-3 py-2.5 min-w-[110px]">
                      {editing ? <ECell value={row.tmel} onChange={v => updateRow(row.id, { tmel: Number(v) || 0 })} type="number" placeholder="0.001" className="font-mono" /> : <span className="font-mono font-bold" style={{ color: NAVY }}>{row.tmel.toExponential(2)} /an</span>}
                    </td>
                    {/* Required PFD (computed) */}
                    <td className="px-3 py-2.5 min-w-[110px]">
                      <span className="font-mono text-gray-600">{row.requiredPFD > 0 ? row.requiredPFD.toExponential(2) : '—'}</span>
                    </td>
                    {/* SIL required (computed) */}
                    <td className="px-3 py-2.5 min-w-[80px]">
                      <span className="text-[11px] font-black px-2 py-0.5 rounded"
                        style={{ background: sc.bg, color: sc.color }}
                      >{row.silRequired}</span>
                    </td>
                    {/* Delete */}
                    <td className="px-2 py-2.5 w-8">
                      {editing && (
                        <button onClick={() => deleteRow(row.id)}
                          className="p-1 rounded text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        ><Trash2 size={12} /></button>
                      )}
                    </td>
                  </tr>
                )
              })}

              {/* Add row */}
              {editing && (
                <tr className="bg-white border-t-2 border-dashed border-gray-200">
                  <td colSpan={colsToShow.length} className="px-4 py-2">
                    <button
                      onClick={addRow}
                      className="flex items-center gap-2 text-xs font-semibold transition-colors"
                      style={{ color: TEAL }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                    >
                      <Plus size={13} />Ajouter un scénario
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50/50">
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <FileSpreadsheet size={12} />
              {rows.length} scénario{rows.length !== 1 ? 's' : ''} · IEC 61511 / ISO 17776
            </span>
            {editing && (
              <span className="flex items-center gap-1 text-amber-500">
                <AlertTriangle size={11} />Mode édition actif
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onOpenChange(false)}
              className="h-9 px-4 text-sm font-medium rounded-xl border border-gray-200 text-gray-600 hover:border-gray-300 transition-all"
            >Fermer</button>
            <button onClick={save}
              className="h-9 px-5 text-sm font-semibold text-white rounded-xl flex items-center gap-2 shadow-sm transition-all"
              style={{ background: NAVY }}
              onMouseEnter={e => (e.currentTarget.style.background = NAVY2)}
              onMouseLeave={e => (e.currentTarget.style.background = NAVY)}
            >
              <Save size={14} />Sauvegarder
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
