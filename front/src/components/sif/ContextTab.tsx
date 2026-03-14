import { useEffect, useMemo, useState } from 'react'
import { Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAppStore } from '@/store/appStore'
import type { HAZOPTrace, SIF } from '@/core/types'
import type { ComplianceResult } from '@/components/sif/complianceCalc'
import type { OverviewMetrics } from '@/components/sif/overviewMetrics'
import type { SIFTab } from '@/store/types'
import { BORDER, CARD_BG, PAGE_BG, TEAL, TEAL_DIM, TEXT, TEXT_DIM, semantic } from '@/styles/tokens'

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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[10px] font-bold uppercase tracking-[0.14em] mb-1.5" style={{ color: TEXT_DIM }}>
      {children}
    </label>
  )
}

function SurfaceCard({
  title,
  hint,
  children,
}: {
  title: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: BORDER, background: CARD_BG }}>
      <div className="mb-4">
        <p className="text-sm font-semibold" style={{ color: TEXT }}>{title}</p>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>{hint}</p>
      </div>
      {children}
    </div>
  )
}

export function ContextTab({ projectId, sif, compliance, overviewMetrics, onSelectTab }: Props) {
  const updateSIF = useAppStore(s => s.updateSIF)
  const updateHAZOPTrace = useAppStore(s => s.updateHAZOPTrace)

  const [draft, setDraft] = useState<ContextDraft>(() => buildDraft(sif))
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    setDraft(buildDraft(sif))
    setSaveError(null)
  }, [sif])

  const baseline = useMemo(() => JSON.stringify(buildDraft(sif)), [sif])
  const isDirty = JSON.stringify(draft) !== baseline

  const updateDraft = <K extends keyof ContextDraft>(key: K, value: ContextDraft[K]) =>
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
      setSaveError(error instanceof Error ? error.message : 'Impossible d’enregistrer le contexte.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex min-h-full flex-col gap-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <SurfaceCard
          title="Identification"
          hint="Numero, titre, P&ID, zone et tag process de la SIF."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <FieldLabel>SIF No</FieldLabel>
              <Input value={sif.sifNumber} readOnly />
            </div>
            <div>
              <FieldLabel>Titre</FieldLabel>
              <Input value={draft.title} onChange={event => updateDraft('title', event.target.value)} />
            </div>
            <div>
              <FieldLabel>P&amp;ID / Zone</FieldLabel>
              <Input value={draft.pid} onChange={event => updateDraft('pid', event.target.value)} />
            </div>
            <div>
              <FieldLabel>Localisation</FieldLabel>
              <Input value={draft.location} onChange={event => updateDraft('location', event.target.value)} />
            </div>
            <div>
              <FieldLabel>Process tag</FieldLabel>
              <Input value={draft.processTag} onChange={event => updateDraft('processTag', event.target.value)} />
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Description</FieldLabel>
              <Textarea rows={3} value={draft.description} onChange={event => updateDraft('description', event.target.value)} />
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard
          title="HAZOP / LOPA"
          hint="Scenario initiateur, references HAZOP / LOPA et IPLs independantes."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <FieldLabel>Hazardous event</FieldLabel>
              <Textarea rows={4} value={draft.hazardousEvent} onChange={event => updateDraft('hazardousEvent', event.target.value)} />
            </div>
            <div>
              <FieldLabel>Scenario ID</FieldLabel>
              <Input value={draft.scenarioId} onChange={event => updateDraft('scenarioId', event.target.value)} />
            </div>
            <div>
              <FieldLabel>HAZOP node</FieldLabel>
              <Input value={draft.hazopNode} onChange={event => updateDraft('hazopNode', event.target.value)} />
            </div>
            <div>
              <FieldLabel>LOPA Ref.</FieldLabel>
              <Input value={draft.lopaRef} onChange={event => updateDraft('lopaRef', event.target.value)} />
            </div>
            <div className="md:col-span-2">
              <FieldLabel>IPLs independantes</FieldLabel>
              <Textarea rows={3} value={draft.iplList} onChange={event => updateDraft('iplList', event.target.value)} />
            </div>
            <div>
              <FieldLabel>Risk matrix</FieldLabel>
              <Input value={draft.riskMatrix} onChange={event => updateDraft('riskMatrix', event.target.value)} />
            </div>
            <div>
              <FieldLabel>TMEL [yr-1]</FieldLabel>
              <Input type="number" step="0.000001" value={draft.tmel} onChange={event => updateDraft('tmel', Number(event.target.value) || 0)} />
            </div>
            <div>
              <FieldLabel>Facilitateur HAZOP</FieldLabel>
              <Input value={draft.hazopFacilitator} onChange={event => updateDraft('hazopFacilitator', event.target.value)} />
            </div>
            <div>
              <FieldLabel>Date HAZOP</FieldLabel>
              <Input type="date" value={draft.hazopDate} onChange={event => updateDraft('hazopDate', event.target.value)} />
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Evenement initiateur</FieldLabel>
              <Textarea rows={3} value={draft.initiatingEvent} onChange={event => updateDraft('initiatingEvent', event.target.value)} />
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Deviation / cause</FieldLabel>
              <Textarea rows={3} value={draft.deviationCause} onChange={event => updateDraft('deviationCause', event.target.value)} />
            </div>
          </div>
        </SurfaceCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SurfaceCard
          title="Paramètres SRS"
          hint="Taux de demande, RRF requis et niveau SIL cible issus de l'étude LOPA."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <FieldLabel>Demand rate [yr-1]</FieldLabel>
              <Input type="number" step="0.01" value={draft.demandRate} onChange={event => updateDraft('demandRate', Number(event.target.value) || 0)} />
            </div>
            <div>
              <FieldLabel>RRF requis</FieldLabel>
              <Input type="number" step="1" value={draft.rrfRequired} onChange={event => updateDraft('rrfRequired', Number(event.target.value) || 0)} />
            </div>
            <div>
              <FieldLabel>SIL cible</FieldLabel>
              <select
                value={draft.targetSIL}
                onChange={event => updateDraft('targetSIL', Number(event.target.value) as SIF['targetSIL'])}
                className="flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm"
                style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT }}
              >
                {[1, 2, 3, 4].map(level => <option key={level} value={level}>{`SIL ${level}`}</option>)}
              </select>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard
          title="Signataires"
          hint="Établi, vérifié, approuvé — traçabilité documentaire de la révision."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <FieldLabel>Établi par</FieldLabel>
              <Input value={draft.madeBy} onChange={event => updateDraft('madeBy', event.target.value)} />
            </div>
            <div>
              <FieldLabel>Vérifié par</FieldLabel>
              <Input value={draft.verifiedBy} onChange={event => updateDraft('verifiedBy', event.target.value)} />
            </div>
            <div>
              <FieldLabel>Approuvé par</FieldLabel>
              <Input value={draft.approvedBy} onChange={event => updateDraft('approvedBy', event.target.value)} />
            </div>
            <div>
              <FieldLabel>Date document</FieldLabel>
              <Input type="date" value={draft.date} onChange={event => updateDraft('date', event.target.value)} />
            </div>
          </div>
        </SurfaceCard>
      </div>

      {/* Save bar — save uniquement, pas de navigation (lifecycle bar) */}
      <div className="flex shrink-0 items-center justify-between gap-3 px-1 pb-1" style={{ marginTop: 'auto' }}>
        {saveError
          ? <p className="text-xs" style={{ color: semantic.error }}>{saveError}</p>
          : <p className="text-xs" style={{ color: TEXT_DIM }}>{isDirty ? 'Modifications non enregistrées.' : 'Contexte à jour.'}</p>
        }
        <Button size="sm" variant="outline" onClick={handleSave} disabled={!isDirty || isSaving} className="h-8 text-xs shrink-0">
          <Save size={12} />
          {isSaving ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </div>
    </div>
  )
}
