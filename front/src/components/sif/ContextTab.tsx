import { useEffect, useMemo, useState, type ReactNode } from 'react'
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
import { getSifContextStrings } from '@/i18n/sifContext'
import { useLocaleStrings } from '@/i18n/useLocale'

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

function SectionHeader({ icon, children }: { icon: ReactNode; children: ReactNode }) {
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

function FieldLabel({ children }: { children: ReactNode }) {
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
  const { BORDER, SURFACE, TEXT } = usePrismTheme()
  return (
    <input
      type={type} step={step} value={value} readOnly={readOnly}
      onChange={onChange ? e => onChange(e.target.value) : undefined}
      placeholder={placeholder}
      className="prism-field w-full rounded-lg border px-2.5 py-2 text-xs outline-none"
      style={{
        background: SURFACE, borderColor: BORDER, color: TEXT,
        opacity: readOnly ? 0.6 : 1,
      }}
    />
  )
}

function FTextarea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number
}) {
  const { BORDER, SURFACE, TEXT } = usePrismTheme()
  return (
    <textarea
      value={value} onChange={e => onChange(e.target.value)}
      rows={rows} placeholder={placeholder}
      className="prism-field w-full rounded-lg border px-2.5 py-2 text-xs outline-none resize-none"
      style={{ background: SURFACE, borderColor: BORDER, color: TEXT }}
    />
  )
}

function Card({ children }: { children: ReactNode }) {
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
            className="prism-action flex-1 py-2 rounded-lg text-[13px] font-mono font-bold transition-all"
            style={active
              ? { background: color, color: '#fff', boxShadow: `0 10px 22px ${color}26, 0 0 0 1px ${color}30` }
              : { background: SURFACE, color: TEXT_DIM, border: `1px solid ${BORDER}`, boxShadow: SHADOW_SOFT }
            }>SIL {sil}</button>
        )
      })}
    </div>
  )
}

export function ContextTab({ projectId, sif }: Props) {
  const strings = useLocaleStrings(getSifContextStrings)
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
    setIsSaving(true)
    setSaveError(null)
    try {
      await updateSIF(projectId, sif.id, {
        title: draft.title,
        description: draft.description,
        pid: draft.pid,
        location: draft.location,
        processTag: draft.processTag,
        hazardousEvent: draft.hazardousEvent,
        demandRate: Number(draft.demandRate),
        targetSIL: Number(draft.targetSIL) as SIF['targetSIL'],
        rrfRequired: Number(draft.rrfRequired),
        madeBy: draft.madeBy,
        verifiedBy: draft.verifiedBy,
        approvedBy: draft.approvedBy,
        date: draft.date,
      })
      updateHAZOPTrace(projectId, sif.id, {
        hazopNode: draft.hazopNode,
        scenarioId: draft.scenarioId,
        deviationCause: draft.deviationCause,
        initiatingEvent: draft.initiatingEvent,
        lopaRef: draft.lopaRef,
        tmel: Number(draft.tmel) || 0,
        iplList: draft.iplList,
        riskMatrix: draft.riskMatrix,
        hazopDate: draft.hazopDate,
        lopaDate: draft.lopaDate,
        hazopFacilitator: draft.hazopFacilitator,
      })
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : strings.save.fallbackError)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex min-h-full flex-col gap-5">
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <SectionHeader icon={<Hash size={12} />}>{strings.sections.identification}</SectionHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <FieldLabel>{strings.fields.sifNumber}</FieldLabel>
              <FInput value={sif.sifNumber} readOnly />
            </div>
            <div>
              <FieldLabel>{strings.fields.title}</FieldLabel>
              <FInput value={draft.title} onChange={v => upd('title', v)} placeholder={strings.placeholders.title} />
            </div>
            <div>
              <FieldLabel>{strings.fields.pidZone}</FieldLabel>
              <FInput value={draft.pid} onChange={v => upd('pid', v)} placeholder={strings.placeholders.pidZone} />
            </div>
            <div>
              <FieldLabel>{strings.fields.location}</FieldLabel>
              <FInput value={draft.location} onChange={v => upd('location', v)} placeholder={strings.placeholders.location} />
            </div>
            <div>
              <FieldLabel>{strings.fields.processTag}</FieldLabel>
              <FInput value={draft.processTag} onChange={v => upd('processTag', v)} placeholder={strings.placeholders.processTag} />
            </div>
            <div className="md:col-span-2">
              <FieldLabel>{strings.fields.functionalDescription}</FieldLabel>
              <FTextarea value={draft.description} onChange={v => upd('description', v)} placeholder={strings.placeholders.functionalDescription} rows={3} />
            </div>
          </div>
        </Card>

        <Card>
          <SectionHeader icon={<Shield size={12} />}>{strings.sections.srs}</SectionHeader>
          <div className="space-y-4">
            <div>
              <FieldLabel>{strings.fields.targetSil}</FieldLabel>
              <SILSelector value={draft.targetSIL} onChange={v => upd('targetSIL', v)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>{strings.fields.demandRate}</FieldLabel>
                <FInput type="number" step="0.01" value={draft.demandRate} onChange={v => upd('demandRate', Number(v) || 0)} />
              </div>
              <div>
                <FieldLabel>{strings.fields.requiredRrf}</FieldLabel>
                <FInput type="number" step="1" value={draft.rrfRequired} onChange={v => upd('rrfRequired', Number(v) || 0)} />
              </div>
            </div>
            <div className="rounded-lg border p-3 flex items-center justify-between" style={{ borderColor: `${TEAL}25`, background: `${TEAL}06` }}>
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TEXT_DIM }}>{strings.fields.maxAdmissiblePfd}</span>
              <span className="text-sm font-mono font-bold" style={{ color: TEAL_DIM }}>
                {draft.rrfRequired > 0 ? (1 / draft.rrfRequired).toExponential(1) : '—'}
              </span>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <SectionHeader icon={<AlertTriangle size={12} />}>{strings.sections.hazop}</SectionHeader>
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="space-y-3">
            <div>
              <FieldLabel>{strings.fields.hazardousEvent}</FieldLabel>
              <FTextarea value={draft.hazardousEvent} onChange={v => upd('hazardousEvent', v)} placeholder={strings.placeholders.hazardousEvent} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>{strings.fields.hazopNode}</FieldLabel>
                <FInput value={draft.hazopNode} onChange={v => upd('hazopNode', v)} placeholder={strings.placeholders.hazopNode} />
              </div>
              <div>
                <FieldLabel>{strings.fields.scenarioId}</FieldLabel>
                <FInput value={draft.scenarioId} onChange={v => upd('scenarioId', v)} placeholder={strings.placeholders.scenarioId} />
              </div>
            </div>
            <div>
              <FieldLabel>{strings.fields.initiatingEvent}</FieldLabel>
              <FTextarea value={draft.initiatingEvent} onChange={v => upd('initiatingEvent', v)} placeholder={strings.placeholders.initiatingEvent} rows={2} />
            </div>
            <div>
              <FieldLabel>{strings.fields.deviationCause}</FieldLabel>
              <FTextarea value={draft.deviationCause} onChange={v => upd('deviationCause', v)} placeholder={strings.placeholders.deviationCause} rows={2} />
            </div>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>{strings.fields.lopaRef}</FieldLabel>
                <FInput value={draft.lopaRef} onChange={v => upd('lopaRef', v)} placeholder={strings.placeholders.lopaRef} />
              </div>
              <div>
                <FieldLabel>{strings.fields.riskMatrix}</FieldLabel>
                <FInput value={draft.riskMatrix} onChange={v => upd('riskMatrix', v)} placeholder={strings.placeholders.riskMatrix} />
              </div>
            </div>
            <div>
              <FieldLabel>{strings.fields.tmel}</FieldLabel>
              <FInput type="number" step="0.000001" value={draft.tmel} onChange={v => upd('tmel', Number(v) || 0)} />
            </div>
            <div>
              <FieldLabel>{strings.fields.independentIpls}</FieldLabel>
              <FTextarea value={draft.iplList} onChange={v => upd('iplList', v)} placeholder={strings.placeholders.independentIpls} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>{strings.fields.hazopFacilitator}</FieldLabel>
                <FInput value={draft.hazopFacilitator} onChange={v => upd('hazopFacilitator', v)} />
              </div>
              <div>
                <FieldLabel>{strings.fields.hazopDate}</FieldLabel>
                <FInput type="date" value={draft.hazopDate} onChange={v => upd('hazopDate', v)} />
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <SectionHeader icon={<Users size={12} />}>{strings.sections.signatories}</SectionHeader>
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <FieldLabel>{strings.fields.preparedBy}</FieldLabel>
            <FInput value={draft.madeBy} onChange={v => upd('madeBy', v)} />
          </div>
          <div>
            <FieldLabel>{strings.fields.verifiedBy}</FieldLabel>
            <FInput value={draft.verifiedBy} onChange={v => upd('verifiedBy', v)} />
          </div>
          <div>
            <FieldLabel>{strings.fields.approvedBy}</FieldLabel>
            <FInput value={draft.approvedBy} onChange={v => upd('approvedBy', v)} />
          </div>
          <div>
            <FieldLabel>{strings.fields.documentDate}</FieldLabel>
            <FInput type="date" value={draft.date} onChange={v => upd('date', v)} />
          </div>
        </div>
      </Card>

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
              {isDirty ? strings.save.dirty : strings.save.saved}
            </p>
        }
        <button type="button" onClick={handleSave} disabled={!isDirty || isSaving}
          className="prism-action flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-[11px] font-bold transition-all disabled:opacity-40"
          style={isDirty
            ? { background: TEAL, color: '#041014', boxShadow: `0 12px 24px ${TEAL}26, 0 0 0 1px ${TEAL}20` }
            : { background: SURFACE, color: TEXT_DIM, boxShadow: SHADOW_CARD }
          }>
          <Save size={12} />
          {isSaving ? strings.save.saving : strings.save.save}
        </button>
      </div>
    </div>
  )
}
