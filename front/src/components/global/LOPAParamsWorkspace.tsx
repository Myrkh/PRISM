/**
 * components/global/LOPAParamsWorkspace.tsx — PRISM
 *
 * Project-level LOPA configuration workspace.
 * Accessible via: LOPASidebar → "⚙ Paramètres LOPA" per project.
 *
 * Sections:
 *   1. Matrice de risque — custom G1–G5 (severity) + F1–F5 (frequency) + live preview
 *   2. Bibliothèque IPL projet — site-specific IPL templates
 *   3. Import / Export — JSON template management for reuse across clients
 */
import { useRef, useState } from 'react'
import {
  AlertTriangle, ArrowLeft, CheckCircle2,
  Download, Layers, Plus, Settings2, Trash2, Upload,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import type {
  FrequencyLevel, LOPAProjectParams,
  ProjectIPLTemplate, SeverityLevel,
} from '@/core/types/lopa.types'
import type { IPLType } from '@/core/types'
import { IPL_TYPE_LABELS } from '@/engine/lopa/iplLibrary'
import { usePrismTheme } from '@/styles/usePrismTheme'

// ─── Default values (IEC 61511 / CCPS) ────────────────────────────────────────

const DEFAULT_SEVERITY_LEVELS: SeverityLevel[] = [
  { id: 'G1', name: 'Négligeable',    description: 'Aucune blessure, dommages < 10 k€',                    tmel: 1e-2, color: '#10B981' },
  { id: 'G2', name: 'Mineur',         description: 'Premiers secours, release contenu, 10–100 k€',          tmel: 1e-3, color: '#84CC16' },
  { id: 'G3', name: 'Modéré',         description: 'Soins médicaux, release contrôlé, 100 k€–1 M€',         tmel: 1e-4, color: '#F59E0B' },
  { id: 'G4', name: 'Grave',          description: 'Blessure permanente, release significatif, 1–10 M€',    tmel: 1e-5, color: '#F97316' },
  { id: 'G5', name: 'Catastrophique', description: 'Décès ou multiple, release massif, > 10 M€',            tmel: 1e-6, color: '#EF4444' },
]

const DEFAULT_FREQUENCY_LEVELS: FrequencyLevel[] = [
  { id: 'F1', name: 'Extrêmement rare', rangeLabel: '< 10⁻⁴/yr' },
  { id: 'F2', name: 'Très rare',        rangeLabel: '10⁻⁴–10⁻³/yr' },
  { id: 'F3', name: 'Rare',             rangeLabel: '10⁻³–10⁻²/yr' },
  { id: 'F4', name: 'Occasionnel',      rangeLabel: '10⁻²–10⁻¹/yr' },
  { id: 'F5', name: 'Fréquent',         rangeLabel: '> 10⁻¹/yr' },
]

// Risk level matrix [row=freq F1-F5][col=sev G1-G5]: 0=Low 1=Med 2=High 3=VHigh
const RISK_MATRIX_LEVELS: number[][] = [
  [0, 0, 0, 1, 1],
  [0, 0, 1, 1, 2],
  [0, 1, 1, 2, 3],
  [0, 1, 2, 3, 3],
  [1, 2, 3, 3, 3],
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mergeWithDefaults(params?: LOPAProjectParams): Required<Pick<LOPAProjectParams, 'severityLevels' | 'frequencyLevels' | 'iplTemplates'>> {
  return {
    severityLevels:  params?.severityLevels  ?? DEFAULT_SEVERITY_LEVELS.map(s => ({ ...s })),
    frequencyLevels: params?.frequencyLevels ?? DEFAULT_FREQUENCY_LEVELS.map(f => ({ ...f })),
    iplTemplates:    params?.iplTemplates    ?? [],
  }
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

type Tab = 'matrix' | 'ipl' | 'transfer'

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const { BORDER, CARD_BG, TEAL, TEXT_DIM } = usePrismTheme()
  const tabs: { id: Tab; label: string }[] = [
    { id: 'matrix',   label: 'Matrice de risque' },
    { id: 'ipl',      label: 'Bibliothèque IPL projet' },
    { id: 'transfer', label: 'Import / Export JSON' },
  ]
  return (
    <div className="flex gap-1 px-1" style={{ borderBottom: `1px solid ${BORDER}`, background: CARD_BG }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className="px-4 py-2.5 text-[11px] font-semibold transition-colors relative"
          style={{ color: active === tab.id ? TEAL : TEXT_DIM }}
        >
          {tab.label}
          {active === tab.id && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t" style={{ background: TEAL }} />
          )}
        </button>
      ))}
    </div>
  )
}

// ─── Matrix editor ────────────────────────────────────────────────────────────

function MatrixEditor({
  severityLevels,
  frequencyLevels,
  onChange,
}: {
  severityLevels: SeverityLevel[]
  frequencyLevels: FrequencyLevel[]
  onChange: (sev: SeverityLevel[], freq: FrequencyLevel[]) => void
}) {
  const { BORDER, CARD_BG, TEXT, TEXT_DIM, TEAL } = usePrismTheme()

  const updateSev = (idx: number, patch: Partial<SeverityLevel>) => {
    const next = severityLevels.map((s, i) => i === idx ? { ...s, ...patch } : s)
    onChange(next, frequencyLevels)
  }
  const updateFreq = (idx: number, patch: Partial<FrequencyLevel>) => {
    const next = frequencyLevels.map((f, i) => i === idx ? { ...f, ...patch } : f)
    onChange(severityLevels, next)
  }
  const resetToDefaults = () => onChange(
    DEFAULT_SEVERITY_LEVELS.map(s => ({ ...s })),
    DEFAULT_FREQUENCY_LEVELS.map(f => ({ ...f })),
  )

  return (
    <div className="space-y-6">
      {/* Live preview */}
      <div>
        <h3 className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: TEXT_DIM }}>
          Aperçu — Matrice 5×5
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[9px]">
            <thead>
              <tr>
                <th className="w-24 pb-1" />
                {severityLevels.map(s => (
                  <th key={s.id} className="pb-1 px-1 text-center font-bold" style={{ color: s.color }}>
                    {s.id}<br />
                    <span className="font-normal" style={{ color: TEXT_DIM }}>{s.name}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {frequencyLevels.map((f, fi) => (
                <tr key={f.id}>
                  <td className="pr-2 py-0.5 text-right">
                    <span className="font-bold" style={{ color: TEXT_DIM }}>{f.id}</span>
                    <span className="ml-1" style={{ color: TEXT_DIM }}>{f.rangeLabel}</span>
                  </td>
                  {severityLevels.map((s, si) => {
                    const level = RISK_MATRIX_LEVELS[fi][si]
                    const alpha = ['22', '40', '60', '90'][level]
                    return (
                      <td key={s.id} className="px-1 py-0.5 text-center">
                        <div
                          className="rounded text-[8px] font-semibold py-1"
                          style={{
                            background: `${s.color}${alpha}`,
                            color: level >= 2 ? '#fff' : s.color,
                            minWidth: 36,
                          }}
                        >
                          {s.id[1]}{f.id[1]}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="h-px" style={{ background: BORDER }} />

      {/* Severity levels table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
            Niveaux de sévérité (G1–G5)
          </h3>
          <button
            type="button"
            onClick={resetToDefaults}
            className="text-[9px] px-2 py-0.5 rounded"
            style={{ color: TEXT_DIM, border: `1px solid ${BORDER}` }}
          >
            Réinitialiser IEC 61511
          </button>
        </div>
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: BORDER }}>
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr style={{ background: CARD_BG, borderBottom: `1px solid ${BORDER}` }}>
                {['ID', 'Nom', 'Description', 'TMEL [yr⁻¹]', 'Couleur'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[8px] font-bold uppercase tracking-wide" style={{ color: TEXT_DIM }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {severityLevels.map((s, i) => (
                <tr key={s.id} style={{ borderTop: i > 0 ? `1px solid ${BORDER}` : undefined }}>
                  <td className="px-3 py-2">
                    <span className="font-bold font-mono" style={{ color: s.color }}>{s.id}</span>
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="text"
                      value={s.name}
                      onChange={e => updateSev(i, { name: e.target.value })}
                      className="w-full rounded border px-2 py-0.5 text-[10px] outline-none"
                      style={{ background: 'transparent', borderColor: BORDER, color: TEXT }}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="text"
                      value={s.description}
                      onChange={e => updateSev(i, { description: e.target.value })}
                      className="w-full rounded border px-2 py-0.5 text-[10px] outline-none"
                      style={{ background: 'transparent', borderColor: BORDER, color: TEXT }}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="text"
                      value={s.tmel.toExponential(0)}
                      onChange={e => {
                        const n = parseFloat(e.target.value)
                        if (!isNaN(n) && n > 0) updateSev(i, { tmel: n })
                      }}
                      className="w-24 rounded border px-2 py-0.5 text-[10px] font-mono outline-none"
                      style={{ background: 'transparent', borderColor: BORDER, color: TEXT }}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="color"
                      value={s.color}
                      onChange={e => updateSev(i, { color: e.target.value })}
                      className="w-8 h-6 rounded cursor-pointer border-0 outline-none"
                      title="Couleur de la colonne"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Frequency levels table */}
      <div>
        <h3 className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: TEXT_DIM }}>
          Niveaux de fréquence (F1–F5)
        </h3>
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: BORDER }}>
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr style={{ background: CARD_BG, borderBottom: `1px solid ${BORDER}` }}>
                {['ID', 'Nom', 'Plage fréquence'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[8px] font-bold uppercase tracking-wide" style={{ color: TEXT_DIM }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {frequencyLevels.map((f, i) => (
                <tr key={f.id} style={{ borderTop: i > 0 ? `1px solid ${BORDER}` : undefined }}>
                  <td className="px-3 py-2">
                    <span className="font-bold font-mono" style={{ color: TEXT_DIM }}>{f.id}</span>
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="text"
                      value={f.name}
                      onChange={e => updateFreq(i, { name: e.target.value })}
                      className="w-full rounded border px-2 py-0.5 text-[10px] outline-none"
                      style={{ background: 'transparent', borderColor: BORDER, color: TEXT }}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="text"
                      value={f.rangeLabel}
                      onChange={e => updateFreq(i, { rangeLabel: e.target.value })}
                      className="w-40 rounded border px-2 py-0.5 text-[10px] font-mono outline-none"
                      style={{ background: 'transparent', borderColor: BORDER, color: TEXT }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── IPL library editor ───────────────────────────────────────────────────────

function IPLLibraryEditor({
  templates,
  onChange,
}: {
  templates: ProjectIPLTemplate[]
  onChange: (templates: ProjectIPLTemplate[]) => void
}) {
  const { BORDER, CARD_BG, TEXT, TEXT_DIM, TEAL } = usePrismTheme()
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<Partial<ProjectIPLTemplate>>({})

  const startAdd = () => {
    const id = crypto.randomUUID()
    setDraft({ id, type: 'psv', tag: '', description: '', pfd: 0.01, standard: '', notes: '' })
    setEditing(id)
  }

  const commitDraft = () => {
    if (!draft.id || !draft.description || !draft.pfd) return
    const entry: ProjectIPLTemplate = {
      id: draft.id,
      type: (draft.type ?? 'custom') as IPLType,
      tag: draft.tag ?? '',
      description: draft.description ?? '',
      pfd: draft.pfd,
      standard: draft.standard ?? '',
      notes: draft.notes ?? '',
    }
    const existing = templates.findIndex(t => t.id === entry.id)
    if (existing >= 0) {
      onChange(templates.map((t, i) => i === existing ? entry : t))
    } else {
      onChange([...templates, entry])
    }
    setEditing(null)
    setDraft({})
  }

  const remove = (id: string) => onChange(templates.filter(t => t.id !== id))

  return (
    <div className="space-y-4">
      <p className="text-[10px] leading-relaxed" style={{ color: TEXT_DIM }}>
        Définissez les IPL standards de votre site (types de PSV, bunds normalisés, etc.).
        Ces entrées apparaîtront en priorité dans le sélecteur IPL de chaque scénario.
      </p>

      {/* Table */}
      {templates.length > 0 && (
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: BORDER }}>
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr style={{ background: CARD_BG, borderBottom: `1px solid ${BORDER}` }}>
                {['Type', 'Tag', 'Description', 'PFD', 'Référence', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[8px] font-bold uppercase tracking-wide" style={{ color: TEXT_DIM }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {templates.map((t, i) => (
                <tr
                  key={t.id}
                  style={{ borderTop: i > 0 ? `1px solid ${BORDER}` : undefined }}
                >
                  <td className="px-3 py-2 text-[9px]" style={{ color: TEXT_DIM }}>{IPL_TYPE_LABELS[t.type]}</td>
                  <td className="px-3 py-2 font-mono font-semibold" style={{ color: TEXT }}>{t.tag || '—'}</td>
                  <td className="px-3 py-2" style={{ color: TEXT }}>{t.description}</td>
                  <td className="px-3 py-2 font-mono" style={{ color: TEAL }}>{t.pfd.toExponential(0)}</td>
                  <td className="px-3 py-2 text-[9px]" style={{ color: TEXT_DIM }}>{t.standard || '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => { setDraft({ ...t }); setEditing(t.id) }}
                        className="text-[9px] px-1.5 py-0.5 rounded"
                        style={{ color: TEXT_DIM, border: `1px solid ${BORDER}` }}
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(t.id)}
                        className="rounded p-0.5 transition-colors"
                        style={{ color: TEXT_DIM }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#EF4444' }}
                        onMouseLeave={e => { e.currentTarget.style.color = TEXT_DIM }}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {templates.length === 0 && editing === null && (
        <div className="flex items-center justify-center h-20 rounded-lg border border-dashed text-[10px]"
          style={{ borderColor: BORDER, color: TEXT_DIM }}>
          Aucun template — cliquez sur Ajouter pour créer votre première IPL site standard.
        </div>
      )}

      {/* Edit form */}
      {editing !== null && (
        <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: `${TEAL}30`, background: CARD_BG }}>
          <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: TEAL }}>
            {templates.find(t => t.id === editing) ? 'Modifier IPL' : 'Nouvelle IPL'}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[8px] font-bold uppercase tracking-wide" style={{ color: TEXT_DIM }}>Type</label>
              <select
                value={draft.type ?? 'psv'}
                onChange={e => setDraft(d => ({ ...d, type: e.target.value as IPLType }))}
                className="mt-0.5 w-full rounded border px-2 py-1 text-[10px] outline-none"
                style={{ background: CARD_BG, borderColor: BORDER, color: TEXT }}
              >
                {Object.entries(IPL_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[8px] font-bold uppercase tracking-wide" style={{ color: TEXT_DIM }}>Tag site</label>
              <input
                type="text"
                value={draft.tag ?? ''}
                onChange={e => setDraft(d => ({ ...d, tag: e.target.value }))}
                placeholder="PSV-TYPE-A"
                className="mt-0.5 w-full rounded border px-2 py-1 text-[10px] outline-none"
                style={{ background: 'transparent', borderColor: BORDER, color: TEXT }}
              />
            </div>
            <div className="col-span-2">
              <label className="text-[8px] font-bold uppercase tracking-wide" style={{ color: TEXT_DIM }}>Description</label>
              <input
                type="text"
                value={draft.description ?? ''}
                onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                placeholder="PSV ressort simple — DN50 — tarée à 10 barg"
                className="mt-0.5 w-full rounded border px-2 py-1 text-[10px] outline-none"
                style={{ background: 'transparent', borderColor: BORDER, color: TEXT }}
              />
            </div>
            <div>
              <label className="text-[8px] font-bold uppercase tracking-wide" style={{ color: TEXT_DIM }}>PFD</label>
              <input
                type="text"
                value={draft.pfd?.toString() ?? '0.01'}
                onChange={e => { const n = parseFloat(e.target.value); if (!isNaN(n) && n > 0 && n <= 1) setDraft(d => ({ ...d, pfd: n })) }}
                placeholder="0.01"
                className="mt-0.5 w-full rounded border px-2 py-1 text-[10px] font-mono outline-none"
                style={{ background: 'transparent', borderColor: BORDER, color: TEXT }}
              />
            </div>
            <div>
              <label className="text-[8px] font-bold uppercase tracking-wide" style={{ color: TEXT_DIM }}>Référence / Standard</label>
              <input
                type="text"
                value={draft.standard ?? ''}
                onChange={e => setDraft(d => ({ ...d, standard: e.target.value }))}
                placeholder="Site standard rev. B"
                className="mt-0.5 w-full rounded border px-2 py-1 text-[10px] outline-none"
                style={{ background: 'transparent', borderColor: BORDER, color: TEXT }}
              />
            </div>
            <div className="col-span-2">
              <label className="text-[8px] font-bold uppercase tracking-wide" style={{ color: TEXT_DIM }}>Notes</label>
              <input
                type="text"
                value={draft.notes ?? ''}
                onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
                placeholder="Conditions d'application, maintenance requise…"
                className="mt-0.5 w-full rounded border px-2 py-1 text-[10px] outline-none"
                style={{ background: 'transparent', borderColor: BORDER, color: TEXT }}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setEditing(null); setDraft({}) }}
              className="flex-1 rounded-lg py-1.5 text-[10px] font-semibold"
              style={{ background: `${BORDER}40`, color: TEXT_DIM }}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={commitDraft}
              className="flex-1 rounded-lg py-1.5 text-[10px] font-semibold"
              style={{ background: `${TEAL}20`, color: TEAL, border: `1px solid ${TEAL}30` }}
            >
              {templates.find(t => t.id === editing) ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={startAdd}
        disabled={editing !== null}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-semibold transition-colors disabled:opacity-40"
        style={{ background: `${TEAL}12`, color: TEAL, border: `1px solid ${TEAL}25` }}
      >
        <Plus size={11} />
        Ajouter une IPL site standard
      </button>
    </div>
  )
}

// ─── Import / Export ──────────────────────────────────────────────────────────

function TransferSection({
  params,
  projectName,
  onImport,
}: {
  params: LOPAProjectParams
  projectName: string
  onImport: (imported: LOPAProjectParams) => void
}) {
  const { BORDER, CARD_BG, TEXT, TEXT_DIM, TEAL } = usePrismTheme()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importOk, setImportOk] = useState(false)

  const handleExport = () => {
    const payload = { ...params, exportedFrom: projectName, exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `LOPA_params_${projectName.replace(/\s+/g, '_')}.json`
    a.click()
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError(null)
    setImportOk(false)
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as LOPAProjectParams
        if (!parsed || typeof parsed !== 'object') throw new Error('Format invalide')
        // Basic validation
        if (parsed.severityLevels && !Array.isArray(parsed.severityLevels)) throw new Error('severityLevels invalide')
        if (parsed.frequencyLevels && !Array.isArray(parsed.frequencyLevels)) throw new Error('frequencyLevels invalide')
        onImport(parsed)
        setImportOk(true)
      } catch (err) {
        setImportError(err instanceof Error ? err.message : 'Erreur de parsing JSON')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="space-y-4 max-w-lg">
      <p className="text-[10px] leading-relaxed" style={{ color: TEXT_DIM }}>
        Exportez les paramètres LOPA de ce projet sous forme de fichier JSON.
        Réimportez-le dans un autre projet pour appliquer les mêmes critères de risque
        (idéal pour les projets du même client ou du même site).
      </p>

      <div className="grid grid-cols-2 gap-3">
        {/* Export */}
        <button
          type="button"
          onClick={handleExport}
          className="flex items-center justify-center gap-2 rounded-xl border px-4 py-4 transition-colors"
          style={{ borderColor: BORDER, background: CARD_BG }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = `${TEAL}40` }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER }}
        >
          <Download size={18} style={{ color: TEAL }} />
          <div className="text-left">
            <p className="text-[11px] font-semibold" style={{ color: TEXT }}>Exporter</p>
            <p className="text-[9px]" style={{ color: TEXT_DIM }}>Template JSON client</p>
          </div>
        </button>

        {/* Import */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex items-center justify-center gap-2 rounded-xl border px-4 py-4 transition-colors"
          style={{ borderColor: BORDER, background: CARD_BG }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = `${TEAL}40` }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER }}
        >
          <Upload size={18} style={{ color: TEAL }} />
          <div className="text-left">
            <p className="text-[11px] font-semibold" style={{ color: TEXT }}>Importer</p>
            <p className="text-[9px]" style={{ color: TEXT_DIM }}>Appliquer un template</p>
          </div>
        </button>
      </div>

      <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />

      {importError && (
        <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-[10px]"
          style={{ background: '#EF444412', border: '1px solid #EF444430', color: '#EF4444' }}>
          <AlertTriangle size={12} />
          {importError}
        </div>
      )}
      {importOk && (
        <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-[10px]"
          style={{ background: '#10B98112', border: '1px solid #10B98130', color: '#10B981' }}>
          <CheckCircle2 size={12} />
          Paramètres importés — cliquez sur Enregistrer pour confirmer.
        </div>
      )}

      <div className="rounded-lg border p-3 text-[9px] leading-relaxed" style={{ borderColor: BORDER, color: TEXT_DIM }}>
        <p className="font-semibold mb-1" style={{ color: TEXT }}>Contenu du fichier JSON :</p>
        <ul className="space-y-0.5 list-disc list-inside">
          <li>Niveaux de sévérité G1–G5 (noms, TMEL, couleurs)</li>
          <li>Niveaux de fréquence F1–F5 (noms, plages)</li>
          <li>Bibliothèque IPL projet (templates site)</li>
          <li>Table de tolérance au risque (TMEL par catégorie)</li>
        </ul>
      </div>
    </div>
  )
}

// ─── Main workspace ────────────────────────────────────────────────────────────

export function LOPAParamsWorkspace({ projectId }: { projectId: string }) {
  const { BORDER, CARD_BG, PAGE_BG, SHADOW_SOFT, TEAL, TEXT, TEXT_DIM } = usePrismTheme()

  const project      = useAppStore(s => s.projects.find(p => p.id === projectId))
  const updateProject = useAppStore(s => s.updateProject)
  const navigate     = useAppStore(s => s.navigate)

  const [activeTab, setActiveTab] = useState<Tab>('matrix')
  const [saved, setSaved] = useState(false)

  // Local draft — merged from project.lopaParams or defaults
  const initial = mergeWithDefaults(project?.lopaParams)
  const [severityLevels,  setSeverityLevels]  = useState<SeverityLevel[]>(initial.severityLevels)
  const [frequencyLevels, setFrequencyLevels] = useState<FrequencyLevel[]>(initial.frequencyLevels)
  const [iplTemplates,    setIplTemplates]    = useState<ProjectIPLTemplate[]>(initial.iplTemplates)

  if (!project) return null

  const handleSave = () => {
    const params: LOPAProjectParams = {
      severityLevels,
      frequencyLevels,
      iplTemplates,
      riskTolerance: project.lopaParams?.riskTolerance ?? project.riskTolerance,
      updatedAt: new Date().toISOString(),
    }
    void updateProject(projectId, { lopaParams: params })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleImport = (imported: LOPAProjectParams) => {
    if (imported.severityLevels)  setSeverityLevels(imported.severityLevels)
    if (imported.frequencyLevels) setFrequencyLevels(imported.frequencyLevels)
    if (imported.iplTemplates)    setIplTemplates(imported.iplTemplates)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: PAGE_BG }}>

      {/* Header */}
      <div
        className="flex items-center gap-3 px-6 py-3 shrink-0 border-b"
        style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_SOFT }}
      >
        <button
          type="button"
          onClick={() => navigate({ type: 'lopa', projectId })}
          className="rounded p-1 transition-colors"
          style={{ color: TEXT_DIM }}
          onMouseEnter={e => { e.currentTarget.style.color = TEXT }}
          onMouseLeave={e => { e.currentTarget.style.color = TEXT_DIM }}
        >
          <ArrowLeft size={14} />
        </button>
        <Settings2 size={14} style={{ color: TEAL }} />
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold" style={{ color: TEXT }}>
            Paramètres LOPA
          </p>
          <p className="text-[10px]" style={{ color: TEXT_DIM }}>{project.name}</p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-[10px] font-bold transition-colors"
          style={{
            background: saved ? '#10B98120' : `${TEAL}20`,
            color: saved ? '#10B981' : TEAL,
            border: `1px solid ${saved ? '#10B98140' : `${TEAL}35`}`,
          }}
        >
          {saved ? <><CheckCircle2 size={11} /> Enregistré</> : 'Enregistrer'}
        </button>
      </div>

      {/* Tab bar */}
      <TabBar active={activeTab} onChange={setActiveTab} />

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
        {activeTab === 'matrix' && (
          <MatrixEditor
            severityLevels={severityLevels}
            frequencyLevels={frequencyLevels}
            onChange={(sev, freq) => { setSeverityLevels(sev); setFrequencyLevels(freq) }}
          />
        )}
        {activeTab === 'ipl' && (
          <IPLLibraryEditor
            templates={iplTemplates}
            onChange={setIplTemplates}
          />
        )}
        {activeTab === 'transfer' && (
          <TransferSection
            params={{ severityLevels, frequencyLevels, iplTemplates }}
            projectName={project.name}
            onImport={handleImport}
          />
        )}
      </div>
    </div>
  )
}
