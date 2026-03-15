import { FileText, Lock, ShieldCheck } from 'lucide-react'
import type { SIF, SIFCalcResult } from '@/core/types'
import type { ComplianceResult } from '@/components/sif/complianceCalc'
import type { OverviewMetrics } from '@/components/sif/overviewMetrics'
import { RightPanelShell } from '@/components/layout/RightPanelShell'
import { BORDER, PANEL_BG, TEAL, TEAL_DIM, TEXT, TEXT_DIM, dark, semantic } from '@/styles/tokens'

const BG = dark.page
const CARD = dark.card2
const BORDER2 = '#363F49'

interface Props {
  sif: SIF
  result: SIFCalcResult
  compliance: ComplianceResult
  overviewMetrics: OverviewMetrics
}

type ItemStatus = 'complete' | 'review' | 'missing'

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
      {children}
    </p>
  )
}

function PanelCard({
  children,
  style,
}: {
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div
      className="rounded-2xl border p-3"
      style={{
        borderColor: BORDER,
        background: CARD,
        boxShadow: `0 0 0 1px ${BORDER}, 0 18px 34px rgba(0,0,0,0.22)`,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function MiniMetric({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: string
}) {
  return (
    <div className="rounded-xl border px-2.5 py-2" style={{ borderColor: BORDER2, background: BG }}>
      <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>{label}</p>
      <p className="mt-1 text-sm font-semibold font-mono" style={{ color: tone }}>{value}</p>
    </div>
  )
}

function statusMeta(status: ItemStatus) {
  if (status === 'complete') {
    return {
      label: 'Complet',
      color: semantic.success,
      background: `${semantic.success}10`,
      border: `${semantic.success}32`,
    }
  }

  if (status === 'review') {
    return {
      label: 'À revoir',
      color: semantic.warning,
      background: `${semantic.warning}10`,
      border: `${semantic.warning}32`,
    }
  }

  return {
    label: 'Manquant',
    color: semantic.error,
    background: `${semantic.error}10`,
    border: `${semantic.error}32`,
  }
}

function StatusBadge({ status }: { status: ItemStatus }) {
  const meta = statusMeta(status)
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold"
      style={{ color: meta.color, background: meta.background, borderColor: meta.border }}
    >
      {meta.label}
    </span>
  )
}

function ChecklistRow({
  label,
  value,
  status,
}: {
  label: string
  value: string
  status: ItemStatus
}) {
  return (
    <div className="rounded-xl border px-3 py-2.5" style={{ borderColor: BORDER2, background: BG }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>{label}</p>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: TEXT }}>{value}</p>
        </div>
        <StatusBadge status={status} />
      </div>
    </div>
  )
}

function ReferenceRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b py-2 last:border-b-0" style={{ borderColor: BORDER2 }}>
      <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: TEXT_DIM }}>{label}</span>
      <span className="max-w-[58%] text-right text-sm leading-relaxed" style={{ color: TEXT }}>{value}</span>
    </div>
  )
}

export function CockpitRightPanel({ sif, result, compliance, overviewMetrics }: Props) {
  const evidenceById = new Map(compliance.evidenceItems.map(item => [item.id, item]))
  const proofProcedureItem = evidenceById.get('proof-procedure')
  const proofEvidenceItem = evidenceById.get('proof-evidence')
  const reportPackageItem = evidenceById.get('report-package')

  const governanceSummary = [
    { label: 'Rédaction', value: sif.madeBy || 'Non renseigné', status: sif.madeBy ? 'complete' : 'missing' as ItemStatus },
    { label: 'Vérification', value: sif.verifiedBy || 'Non renseigné', status: sif.verifiedBy ? 'complete' : 'missing' as ItemStatus },
    { label: 'Approbation', value: sif.approvedBy || 'Non renseigné', status: sif.approvedBy ? 'complete' : 'missing' as ItemStatus },
  ]

  return (
    <RightPanelShell
      items={[{ id: 'dossier', label: 'Dossier', Icon: ShieldCheck }]}
      active="dossier"
      onSelect={() => {}}
      contentBg={PANEL_BG}
    >
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3" style={{ scrollbarGutter: 'stable' }}>
        <PanelCard style={{ borderColor: result.meetsTarget ? `${semantic.success}32` : `${semantic.error}32` }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
                style={{
                  background: result.meetsTarget ? `${semantic.success}12` : `${semantic.error}12`,
                  borderColor: result.meetsTarget ? `${semantic.success}32` : `${semantic.error}32`,
                }}
              >
                <ShieldCheck size={16} style={{ color: result.meetsTarget ? semantic.success : semantic.error }} />
              </div>
              <div className="min-w-0">
                <SectionTitle>Dossier cockpit</SectionTitle>
                <p className="mt-1 text-sm font-semibold" style={{ color: TEXT }}>
                  {sif.sifNumber} · {sif.title || 'Safety Instrumented Function'}
                </p>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
                  {result.meetsTarget ? 'Base calcul cohérente pour une lecture audit.' : 'Base calcul à reprendre avant défense dossier.'}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <span
                className="inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-semibold"
                style={{
                  color: result.meetsTarget ? semantic.success : semantic.error,
                  background: result.meetsTarget ? `${semantic.success}10` : `${semantic.error}10`,
                  borderColor: result.meetsTarget ? `${semantic.success}32` : `${semantic.error}32`,
                }}
              >
                {result.meetsTarget ? 'Calcul tenu' : 'Calcul sous cible'}
              </span>
              <span
                className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold"
                style={{
                  color: sif.revisionLockedAt ? semantic.success : TEAL_DIM,
                  background: sif.revisionLockedAt ? `${semantic.success}10` : `${TEAL}10`,
                  borderColor: sif.revisionLockedAt ? `${semantic.success}32` : `${TEAL}35`,
                }}
              >
                <Lock size={10} />
                {sif.revisionLockedAt ? `Rév. ${sif.revision} publiée` : `Rév. ${sif.revision} en travail`}
              </span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <MiniMetric label="Trace" value={`${overviewMetrics.tracePct}%`} tone={overviewMetrics.tracePct === 100 ? semantic.success : TEAL_DIM} />
            <MiniMetric label="Preuves" value={`${overviewMetrics.evidenceCompleteCount}/${overviewMetrics.evidenceTotalCount}`} tone={TEAL_DIM} />
            <MiniMetric label="Approbations" value={`${overviewMetrics.approvalFilledCount}/3`} tone={overviewMetrics.approvalFilledCount === 3 ? semantic.success : TEAL_DIM} />
            <MiniMetric label="Hypothèses" value={`${overviewMetrics.pendingAssumptions}`} tone={overviewMetrics.pendingAssumptions === 0 ? semantic.success : semantic.warning} />
          </div>
        </PanelCard>

        <PanelCard>
          <SectionTitle>Chaîne de gouvernance</SectionTitle>
          <div className="mt-3 space-y-2">
            {governanceSummary.map(item => (
              <ChecklistRow
                key={item.label}
                label={item.label}
                value={item.value}
                status={item.status}
              />
            ))}
          </div>
        </PanelCard>

        <PanelCard>
          <SectionTitle>Package de preuve</SectionTitle>
          <div className="mt-3 space-y-2">
            <ChecklistRow
              label="Procédure proof test"
              value={proofProcedureItem?.summary || 'Non documentée'}
              status={(proofProcedureItem?.status ?? 'missing') as ItemStatus}
            />
            <ChecklistRow
              label="Campagnes enregistrées"
              value={proofEvidenceItem?.summary || 'Aucune campagne'}
              status={(proofEvidenceItem?.status ?? 'missing') as ItemStatus}
            />
            <ChecklistRow
              label="Package rapport"
              value={reportPackageItem?.summary || 'À compléter'}
              status={(reportPackageItem?.status ?? 'review') as ItemStatus}
            />
          </div>
        </PanelCard>

        <PanelCard>
          <div className="flex items-start gap-2">
            <FileText size={14} style={{ color: TEAL_DIM, flexShrink: 0, marginTop: 2 }} />
            <div>
              <SectionTitle>Références critiques</SectionTitle>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
                Ce panneau ne répète pas le cockpit central. Il garde les points utiles pour audit et relecture.
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-xl border px-3 py-2" style={{ borderColor: BORDER2, background: BG }}>
            <ReferenceRow label="Scenario ID" value={sif.hazopTrace?.scenarioId || 'Non renseigné'} />
            <ReferenceRow label="HAZOP node" value={sif.hazopTrace?.hazopNode || 'Non renseigné'} />
            <ReferenceRow label="LOPA ref." value={sif.hazopTrace?.lopaRef || 'Non renseigné'} />
            <ReferenceRow label="Proof test ref." value={sif.proofTestProcedure?.ref || 'Non renseigné'} />
            <ReferenceRow
              label="Révision"
              value={sif.revisionLockedAt ? `Publiée le ${new Date(sif.revisionLockedAt).toLocaleDateString()}` : `Révision ${sif.revision} en travail`}
            />
          </div>
        </PanelCard>
      </div>
    </RightPanelShell>
  )
}
