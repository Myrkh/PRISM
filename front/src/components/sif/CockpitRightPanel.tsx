import { BookOpen, Lock, Package, ShieldCheck, Users } from 'lucide-react'
import type { SIF, SIFCalcResult } from '@/core/types'
import type { ComplianceResult } from '@/components/sif/complianceCalc'
import type { OverviewMetrics } from '@/components/sif/overviewMetrics'
import {
  InspectorReferenceRow,
  InspectorStatusBadge,
  InspectorSurface,
  RightPanelSection,
  RightPanelShell,
} from '@/components/layout/RightPanelShell'
import { semantic } from '@/styles/tokens'
import { usePrismTheme } from '@/styles/usePrismTheme'

interface Props {
  sif: SIF
  result: SIFCalcResult
  compliance: ComplianceResult
  overviewMetrics: OverviewMetrics
}
type ItemStatus = 'complete' | 'review' | 'missing'

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

function ChecklistRow({
  label,
  value,
  status,
}: {
  label: string
  value: string
  status: ItemStatus
}) {
  const { TEXT, TEXT_DIM } = usePrismTheme()
  const meta = statusMeta(status)
  return (
    <InspectorSurface>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>{label}</p>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: TEXT }}>{value}</p>
        </div>
        <InspectorStatusBadge
          label={meta.label}
          color={meta.color}
          background={meta.background}
          borderColor={meta.border}
        />
      </div>
    </InspectorSurface>
  )
}

export function CockpitRightPanel({ sif, result, compliance, overviewMetrics }: Props) {
  const { PANEL_BG, SURFACE, TEAL, TEAL_DIM, TEXT, TEXT_DIM } = usePrismTheme()
  const evidenceById = new Map(compliance.evidenceItems.map(item => [item.id, item]))
  const proofProcedureItem = evidenceById.get('proof-procedure')
  const proofEvidenceItem = evidenceById.get('proof-evidence')
  const reportPackageItem = evidenceById.get('report-package')
  const readiness = Math.round((
    overviewMetrics.tracePct +
    ((overviewMetrics.evidenceCompleteCount / Math.max(1, overviewMetrics.evidenceTotalCount)) * 100) +
    ((overviewMetrics.approvalFilledCount / 3) * 100)
  ) / 3)
  const readinessColor = readiness >= 85 ? semantic.success : readiness >= 50 ? semantic.warning : semantic.error

  const governanceSummary = [
    { label: 'Rédaction', value: sif.madeBy || 'Non renseigné', status: sif.madeBy ? 'complete' : 'missing' as ItemStatus },
    { label: 'Vérification', value: sif.verifiedBy || 'Non renseigné', status: sif.verifiedBy ? 'complete' : 'missing' as ItemStatus },
    { label: 'Approbation', value: sif.approvedBy || 'Non renseigné', status: sif.approvedBy ? 'complete' : 'missing' as ItemStatus },
  ]

  return (
    <RightPanelShell contentBg={PANEL_BG}>
      <RightPanelSection id="ready" label="Ready" Icon={ShieldCheck}>
        <p className="mb-3 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
          État de défense du dossier sans répéter le cockpit central.
        </p>
        <div className="space-y-2">
          {[
            { label: 'Readiness', value: `${readiness}%`, tone: readinessColor },
            { label: 'Calcul', value: result.meetsTarget ? 'Tenu' : 'Sous cible', tone: result.meetsTarget ? semantic.success : semantic.error },
            { label: 'Trace', value: `${overviewMetrics.tracePct}%`, tone: overviewMetrics.tracePct === 100 ? semantic.success : TEXT },
            { label: 'Preuves', value: `${overviewMetrics.evidenceCompleteCount}/${overviewMetrics.evidenceTotalCount}`, tone: TEAL_DIM },
            { label: 'Approbations', value: `${overviewMetrics.approvalFilledCount}/3`, tone: overviewMetrics.approvalFilledCount === 3 ? semantic.success : TEXT },
            { label: 'Hypothèses', value: String(overviewMetrics.pendingAssumptions), tone: overviewMetrics.pendingAssumptions === 0 ? semantic.success : semantic.warning },
          ].map(item => (
            <InspectorSurface key={item.label} className="flex items-center justify-between gap-3 rounded-lg px-2.5 py-2">
              <p className="text-[10px] uppercase tracking-wider" style={{ color: TEXT_DIM }}>{item.label}</p>
              <p className="text-sm font-semibold font-mono" style={{ color: item.tone }}>{item.value}</p>
            </InspectorSurface>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]" style={{ color: TEXT_DIM }}>
          <span style={{ color: TEXT }}>{sif.sifNumber}</span>
          <span>·</span>
          <span>{result.meetsTarget ? 'Base calcul cohérente' : 'Base calcul à reprendre'}</span>
          <InspectorStatusBadge
            label={sif.revisionLockedAt ? `Rév. ${sif.revision} publiée` : `Rév. ${sif.revision} en travail`}
            color={sif.revisionLockedAt ? semantic.success : TEAL_DIM}
            background={sif.revisionLockedAt ? `${semantic.success}10` : `${TEAL}10`}
            borderColor={sif.revisionLockedAt ? `${semantic.success}32` : `${TEAL}35`}
            icon={<Lock size={10} />}
          />
        </div>
      </RightPanelSection>

      <RightPanelSection id="gouvernance" label="Gouvernance" Icon={Users}>
        <div className="space-y-2">
          {governanceSummary.map(item => (
            <ChecklistRow
              key={item.label}
              label={item.label}
              value={item.value}
              status={item.status}
            />
          ))}
        </div>
      </RightPanelSection>

      <RightPanelSection id="package" label="Package Preuve" Icon={Package}>
        <div className="space-y-2">
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
      </RightPanelSection>

      <RightPanelSection id="references" label="Références" Icon={BookOpen}>
        <p className="mb-3 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
          Points utiles pour audit et relecture, sans répéter le cockpit central.
        </p>
        <InspectorSurface>
          <InspectorReferenceRow label="Scenario ID" value={sif.hazopTrace?.scenarioId || 'Non renseigné'} />
          <InspectorReferenceRow label="HAZOP node" value={sif.hazopTrace?.hazopNode || 'Non renseigné'} />
          <InspectorReferenceRow label="LOPA ref." value={sif.hazopTrace?.lopaRef || 'Non renseigné'} />
          <InspectorReferenceRow label="Proof test ref." value={sif.proofTestProcedure?.ref || 'Non renseigné'} />
          <InspectorReferenceRow
            label="Révision"
            value={sif.revisionLockedAt ? `Publiée le ${new Date(sif.revisionLockedAt).toLocaleDateString()}` : `Révision ${sif.revision} en travail`}
          />
        </InspectorSurface>
        <p className="mt-3 text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
          L'historique des révisions et les téléchargements PDF restent dans le cockpit central.
        </p>
      </RightPanelSection>
    </RightPanelShell>
  )
}
