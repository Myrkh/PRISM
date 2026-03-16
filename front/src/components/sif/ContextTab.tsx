import { useEffect, useMemo, useState } from 'react'
import {
  Save, AlertTriangle, Shield, Users,
  Hash,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import type { HAZOPTrace, SIF, SILLevel } from '@/core/types'
import type { ComplianceResult } from '@/components/sif/complianceCalc'
import type { OverviewMetrics } from '@/components/sif/overviewMetrics'
import type { SIFTab } from '@/store/types'
import { semantic } from '@/styles/tokens'
import { usePrismTheme } from '@/styles/usePrismTheme'

type ContextDraft = Pick<
  SIF,
  | 'title'
  | 'description'
  | 'pid'
  | 'location'
  | 'processTag'
  | 'hazardousEvent'
  | 'demandRate'
  | 'targetSIL'
  | 'rrfRequired'
  | 'madeBy'
  | 'verifiedBy'
  | 'approvedBy'
  | 'date'
> & HAZOPTrace

interface Props {
  projectId: string
  sif: SIF
  compliance: ComplianceResult
  overviewMetrics: OverviewMetrics
  onSelectTab: (tab: SIFTab) => void
}

function buildDraft(sif: SIF): ContextDraft {
  return {
    title: sif.title,
    description: sif.description,
    pid: sif.pid,
    location: sif.location,
    processTag: sif.processTag,
    hazardousEvent: sif.hazardousEvent,
    demandRate: sif.demandRate,
    targetSIL: sif.targetSIL,
    rrfRequired: sif.rrfRequired,
    madeBy: sif.madeBy,
    verifiedBy: sif.verifiedBy,
    approvedBy: sif.approvedBy,
    date: sif.date,
    hazopNode: sif.hazopTrace?.hazopNode ?? '',
    scenarioId: sif.hazopTrace?.scenarioId ?? '',
    deviationCause: sif.hazopTrace?.deviationCause ?? '',
    initiatingEvent: sif.hazopTrace?.initiatingEvent ?? '',
    lopaRef: sif.hazopTrace?.lopaRef ?? '',
    tmel: sif.hazopTrace?.tmel ?? 0,
    iplList: sif.hazopTrace?.iplList ?? '',
    riskMatrix: sif.hazopTrace?.riskMatrix ?? '',
    hazopDate: sif.hazopTrace?.hazopDate ?? '',
    lopaDate: sif.hazopTrace?.lopaDate ?? '',
    hazopFacilitator: sif.hazopTrace?.hazopFacilitator ?? '',
  }
}

// ── Design primitives ─────────────────────────────────────────────────────

function SectionHeader({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  const { BORDER, SHADOW_SOFT, TEAL } = usePrismTheme()
  return (
    <div className="flex items-center gap-2 pb-2 mb-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
      <span
        className="inline-flex h-6 w-6 items-center justify-center rounded-md border"
        style={{ color: TEAL, background: `${TEAL}10`, borderColor: `${TEAL}22`, boxShadow: SHADOW_SOFT }}
      >
        {icon}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: TEAL }}>{children}</span>
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  const { TEXT_DIM } = usePrismTheme()
  return (
    <label className="block text-[9px] font-bold uppercase tracking-[0.12em] mb-1" style={{ color: TEXT_DIM }}>
      {children}
    </label>
  )
}

function FInput({ value, onChange, placeholder, type = 'text', step, readOnly }: {
  value: string | number; onChange?: (v: string) => void
  placeholder?: string; type?: string; step?: string; readOnly?: boolean
}) {
  const { BORDER, SHADOW_SOFT, SURFACE, TEAL, TEXT } = usePrismTheme()
  return (
    <input
      type={type} step={step} value={value} readOnly={readOnly}
      onChange={onChange ? e => onChange(e.target.value) : undefined}
      placeholder={placeholder}
      className="w-full rounded-lg border px-2.5 py-2 text-xs outline-none transition-all"
      style={{
        background: SURFACE, borderColor: BORDER, color: TEXT,
        boxShadow: SHADOW_SOFT,
        opacity: readOnly ? 0.6 : 1,
      }}
      onFocus={e => {
        if (!readOnly) {
          e.target.style.borderColor = TEAL
          e.target.style.boxShadow = `0 0 0 1px ${TEAL}18, ${SHADOW_SOFT}`
        }
      }}
      onBlur={e => {
        e.target.style.borderColor = BORDER
        e.target.style.boxShadow = SHADOW_SOFT
      }}
    />
  )
}

function FTextarea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number
}) {
  const { BORDER, SHADOW_SOFT, SURFACE, TEAL, TEXT } = usePrismTheme()
  return (
    <textarea
      value={value} onChange={e => onChange(e.target.value)}
      rows={rows} placeholder={placeholder}
      className="w-full rounded-lg border px-2.5 py-2 text-xs outline-none resize-none transition-all"
      style={{ background: SURFACE, borderColor: BORDER, color: TEXT, boxShadow: SHADOW_SOFT }}
      onFocus={e => {
        e.target.style.borderColor = TEAL
        e.target.style.boxShadow = `0 0 0 1px ${TEAL}18, ${SHADOW_SOFT}`
      }}
      onBlur={e => {
        e.target.style.borderColor = BORDER
        e.target.style.boxShadow = SHADOW_SOFT
      }}
    />
  )
}

function Card({ children }: { children: React.ReactNode }) {
  const { BORDER, CARD_BG, SHADOW_PANEL } = usePrismTheme()
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_PANEL }}>
      {children}
    </div>
  )
}

const SIL_COLORS: Record<number, string> = { 1: '#16A34A', 2: '#2563EB', 3: '#D97706', 4: '#7C3AED' }

function SILSelector({ value, onChange }: { value: SILLevel; onChange: (v: SILLevel) => void }) {
  const { BORDER, SHADOW_SOFT, SURFACE, TEXT_DIM } = usePrismTheme()
  return (
    <div className="flex gap-1.5">
      {([1, 2, 3, 4] as SILLevel[]).map(sil => {
        const active = value === sil
        const color = SIL_COLORS[sil]
        return (
          <button key={sil} type="button" onClick={() => onChange(sil)}
            className="flex-1 py-2 rounded-lg text-[13px] font-mono font-bold transition-all"
            style={active
              ? { background: color, color: '#fff', boxShadow: `0 10px 22px ${color}26, 0 0 0 1px ${color}30` }
              : { background: SURFACE, color: TEXT_DIM, border: `1px solid ${BORDER}`, boxShadow: SHADOW_SOFT }
            }>SIL {sil}</button>
        )
      })}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────

export function ContextTab({ projectId, sif, compliance, overviewMetrics, onSelectTab }: Props) {
  const { BORDER, CARD_BG, SHADOW_CARD, SHADOW_PANEL, SURFACE, TEAL, TEAL_DIM, TEXT_DIM } = usePrismTheme()
  const updateSIF = useAppStore(s => s.updateSIF)
  const updateHAZOPTrace = useAppStore(s => s.updateHAZOPTrace)

  const [draft, setDraft] = useState<ContextDraft>(() => buildDraft(sif))
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => { setDraft(buildDraft(sif)); setSaveError(null) }, [sif])

  const baseline = useMemo(() => JSON.stringify(buildDraft(sif)), [sif])
  const isDirty = JSON.stringify(draft) !== baseline

  const upd = <K extends keyof ContextDraft>(key: K, value: ContextDraft[K]) =>
    setDraft(prev => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    setIsSaving(true); setSaveError(null)
    try {
      await updateSIF(projectId, sif.id, {
        title: draft.title, description: draft.description,
        pid: draft.pid, location: draft.location, processTag: draft.processTag,
        hazardousEvent: draft.hazardousEvent,
        demandRate: Number(draft.demandRate),
        targetSIL: Number(draft.targetSIL) as SIF['targetSIL'],
        rrfRequired: Number(draft.rrfRequired),
        madeBy: draft.madeBy, verifiedBy: draft.verifiedBy,
        approvedBy: draft.approvedBy, date: draft.date,
      })
      updateHAZOPTrace(projectId, sif.id, {
        hazopNode: draft.hazopNode, scenarioId: draft.scenarioId,
        deviationCause: draft.deviationCause, initiatingEvent: draft.initiatingEvent,
        lopaRef: draft.lopaRef, tmel: Number(draft.tmel) || 0,
        iplList: draft.iplList, riskMatrix: draft.riskMatrix,
        hazopDate: draft.hazopDate, lopaDate: draft.lopaDate,
        hazopFacilitator: draft.hazopFacilitator,
      })
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Impossible d\'enregistrer.')
    } finally { setIsSaving(false) }
  }

  return (
    <div className="flex min-h-full flex-col gap-5">

      {/* Row 1: Identification + SRS */}
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <SectionHeader icon={<Hash size={12} />}>Identification</SectionHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <FieldLabel>SIF No</FieldLabel>
              <FInput value={sif.sifNumber} readOnly />
            </div>
            <div>
              <FieldLabel>Titre</FieldLabel>
              <FInput value={draft.title} onChange={v => upd('title', v)} placeholder="ESD haute pression V-101" />
            </div>
            <div>
              <FieldLabel>P&amp;ID / Zone</FieldLabel>
              <FInput value={draft.pid} onChange={v => upd('pid', v)} placeholder="P&ID-001-A" />
            </div>
            <div>
              <FieldLabel>Localisation</FieldLabel>
              <FInput value={draft.location} onChange={v => upd('location', v)} placeholder="Unité 100 – Zone ATEX" />
            </div>
            <div>
              <FieldLabel>Process tag</FieldLabel>
              <FInput value={draft.processTag} onChange={v => upd('processTag', v)} placeholder="PT-101" />
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Description fonctionnelle</FieldLabel>
              <FTextarea value={draft.description} onChange={v => upd('description', v)} placeholder="Isoler l'alimentation gaz en cas de haute pression…" rows={3} />
            </div>
          </div>
        </Card>

        <Card>
          <SectionHeader icon={<Shield size={12} />}>Exigences SRS</SectionHeader>
          <div className="space-y-4">
            <div>
              <FieldLabel>SIL cible</FieldLabel>
              <SILSelector value={draft.targetSIL} onChange={v => upd('targetSIL', v)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Demand rate [yr⁻¹]</FieldLabel>
                <FInput type="number" step="0.01" value={draft.demandRate} onChange={v => upd('demandRate', Number(v) || 0)} />
              </div>
              <div>
                <FieldLabel>RRF requis</FieldLabel>
                <FInput type="number" step="1" value={draft.rrfRequired} onChange={v => upd('rrfRequired', Number(v) || 0)} />
              </div>
            </div>
            <div className="rounded-lg border p-3 flex items-center justify-between" style={{ borderColor: `${TEAL}25`, background: `${TEAL}06` }}>
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TEXT_DIM }}>PFD max admissible</span>
              <span className="text-sm font-mono font-bold" style={{ color: TEAL_DIM }}>
                {draft.rrfRequired > 0 ? (1 / draft.rrfRequired).toExponential(1) : '—'}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Row 2: HAZOP/LOPA */}
      <Card>
        <SectionHeader icon={<AlertTriangle size={12} />}>HAZOP / LOPA — Traçabilité du scénario</SectionHeader>
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="space-y-3">
            <div>
              <FieldLabel>Événement dangereux</FieldLabel>
              <FTextarea value={draft.hazardousEvent} onChange={v => upd('hazardousEvent', v)} placeholder="Surpression V-101 → rupture…" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>HAZOP node</FieldLabel>
                <FInput value={draft.hazopNode} onChange={v => upd('hazopNode', v)} placeholder="Node 3" />
              </div>
              <div>
                <FieldLabel>Scenario ID</FieldLabel>
                <FInput value={draft.scenarioId} onChange={v => upd('scenarioId', v)} placeholder="SC-003" />
              </div>
            </div>
            <div>
              <FieldLabel>Événement initiateur</FieldLabel>
              <FTextarea value={draft.initiatingEvent} onChange={v => upd('initiatingEvent', v)} placeholder="Défaillance régulateur PCV-101…" rows={2} />
            </div>
            <div>
              <FieldLabel>Déviation / Cause</FieldLabel>
              <FTextarea value={draft.deviationCause} onChange={v => upd('deviationCause', v)} placeholder="Haute pression – blocage vanne…" rows={2} />
            </div>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>LOPA Ref.</FieldLabel>
                <FInput value={draft.lopaRef} onChange={v => upd('lopaRef', v)} placeholder="LOPA-001" />
              </div>
              <div>
                <FieldLabel>Risk matrix</FieldLabel>
                <FInput value={draft.riskMatrix} onChange={v => upd('riskMatrix', v)} placeholder="C4-L3" />
              </div>
            </div>
            <div>
              <FieldLabel>TMEL [yr⁻¹]</FieldLabel>
              <FInput type="number" step="0.000001" value={draft.tmel} onChange={v => upd('tmel', Number(v) || 0)} />
            </div>
            <div>
              <FieldLabel>IPLs indépendantes</FieldLabel>
              <FTextarea value={draft.iplList} onChange={v => upd('iplList', v)} placeholder="PSV-101 (RRF 10), BPCS alarm…" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Facilitateur HAZOP</FieldLabel>
                <FInput value={draft.hazopFacilitator} onChange={v => upd('hazopFacilitator', v)} />
              </div>
              <div>
                <FieldLabel>Date HAZOP</FieldLabel>
                <FInput type="date" value={draft.hazopDate} onChange={v => upd('hazopDate', v)} />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Row 3: Signataires */}
      <Card>
        <SectionHeader icon={<Users size={12} />}>Signataires — Traçabilité documentaire</SectionHeader>
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <FieldLabel>Établi par</FieldLabel>
            <FInput value={draft.madeBy} onChange={v => upd('madeBy', v)} />
          </div>
          <div>
            <FieldLabel>Vérifié par</FieldLabel>
            <FInput value={draft.verifiedBy} onChange={v => upd('verifiedBy', v)} />
          </div>
          <div>
            <FieldLabel>Approuvé par</FieldLabel>
            <FInput value={draft.approvedBy} onChange={v => upd('approvedBy', v)} />
          </div>
          <div>
            <FieldLabel>Date document</FieldLabel>
            <FInput type="date" value={draft.date} onChange={v => upd('date', v)} />
          </div>
        </div>
      </Card>

      {/* Floating save bar */}
      <div
        className="sticky bottom-0 flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5"
        style={{
          background: CARD_BG,
          borderColor: isDirty ? `${TEAL}40` : BORDER,
          boxShadow: SHADOW_PANEL,
        }}
      >
        {saveError
          ? <p className="text-xs flex items-center gap-1.5" style={{ color: semantic.error }}>
              <AlertTriangle size={11} />{saveError}
            </p>
          : <p className="text-[11px]" style={{ color: isDirty ? TEAL_DIM : TEXT_DIM }}>
              {isDirty ? 'Modifications non enregistrées' : 'Contexte à jour'}
            </p>
        }
        <button type="button" onClick={handleSave} disabled={!isDirty || isSaving}
          className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-[11px] font-bold transition-all disabled:opacity-40"
          style={isDirty
            ? { background: TEAL, color: '#041014', boxShadow: `0 12px 24px ${TEAL}26, 0 0 0 1px ${TEAL}20` }
            : { background: SURFACE, color: TEXT_DIM, boxShadow: SHADOW_CARD }
          }>
          <Save size={12} />
          {isSaving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}
