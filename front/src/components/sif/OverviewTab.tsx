import { ArrowRight, CheckCircle2, FileWarning, Lock, ShieldAlert, ShieldCheck, TimerReset } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SILBadge } from '@/components/shared/SILBadge'
import { formatPFD } from '@/core/math/pfdCalc'
import type { SIF, SIFCalcResult } from '@/core/types'
import type { SIFTab } from '@/store/types'
import type { ComplianceResult } from '@/components/sif/complianceCalc'
import type { OverviewMetrics } from '@/components/sif/overviewMetrics'
import { getOverviewActionCta, OVERVIEW_OPERATIONAL_HEALTH_META } from '@/components/sif/overviewUi'
import { BORDER, PAGE_BG, R, TEAL, TEAL_DIM, TEXT, TEXT_DIM, dark, semantic } from '@/styles/tokens'

const PANEL = dark.panel
const BG = dark.page
const CARD = dark.card2
const BORDER2 = '#363F49'

interface Props {
  sif: SIF
  result: SIFCalcResult
  compliance: ComplianceResult
  overviewMetrics: OverviewMetrics
  isPublishingRevision: boolean
  onSelectTab: (tab: SIFTab) => void
  onCloseRevision: () => void
}

function SectionKicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
      {children}
    </p>
  )
}

function SurfaceCard({
  children,
  className = '',
  style,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      className={`rounded-2xl border ${className}`.trim()}
      style={{
        borderColor: BORDER,
        background: CARD,
        boxShadow: `0 0 0 1px ${BORDER}, 0 24px 60px rgba(0,0,0,0.32)`,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function StatusPill({
  children,
  color,
  background,
  borderColor,
}: {
  children: React.ReactNode
  color: string
  background: string
  borderColor: string
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold"
      style={{ color, background, borderColor }}
    >
      {children}
    </span>
  )
}

function InlineMetric({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: string
}) {
  return (
    <div className="rounded-xl border px-3 py-2.5" style={{ borderColor: BORDER, background: PAGE_BG }}>
      <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>{label}</p>
      <p className="mt-1 text-sm font-semibold font-mono" style={{ color: tone }}>{value}</p>
    </div>
  )
}

function SignalCard({
  eyebrow,
  title,
  value,
  detail,
  tone,
  accent,
  children,
}: {
  eyebrow: string
  title: string
  value: string
  detail: string
  tone: string
  accent: string
  children: React.ReactNode
}) {
  return (
    <SurfaceCard className="overflow-hidden p-4" style={{ borderColor: `${accent}35` }}>
      <div className="mb-4 rounded-lg px-3 py-2" style={{ background: `${accent}10`, border: `1px solid ${accent}24` }}>
        <SectionKicker>{eyebrow}</SectionKicker>
        <p className="mt-1 text-base font-semibold tracking-tight" style={{ color: TEXT }}>{title}</p>
      </div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold font-mono tracking-tight" style={{ color: tone }}>{value}</p>
          <p className="mt-2 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>{detail}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {children}
      </div>
    </SurfaceCard>
  )
}

type DecisionState = {
  label: string
  summary: string
  color: string
  background: string
  border: string
  Icon: React.ElementType
}

function getDecisionState(
  sif: SIF,
  result: SIFCalcResult,
  compliance: ComplianceResult,
  overviewMetrics: OverviewMetrics,
): DecisionState {
  const technicalFindings = compliance.technicalFindings.length
  const governanceGaps = [
    overviewMetrics.tracePct < 100,
    overviewMetrics.metadataPct < 100,
    overviewMetrics.approvalFilledCount < 3,
    overviewMetrics.pendingAssumptions > 0,
    overviewMetrics.evidenceCompleteCount < overviewMetrics.evidenceTotalCount,
  ].filter(Boolean).length

  if (!result.meetsTarget || technicalFindings > 0) {
    return {
      label: 'Action technique requise',
      summary: !result.meetsTarget
        ? `La justification actuelle ne tient pas encore le SIL ${sif.targetSIL} visé.`
        : `${technicalFindings} point${technicalFindings > 1 ? 's' : ''} technique${technicalFindings > 1 ? 's restent' : ' reste'} à fermer avant clôture.`,
      color: semantic.error,
      background: `${semantic.error}12`,
      border: `${semantic.error}3A`,
      Icon: FileWarning,
    }
  }

  if (overviewMetrics.isOverdue || overviewMetrics.openFaults > 0 || overviewMetrics.bypassHours > 0) {
    const exposureBits = [
      overviewMetrics.isOverdue ? 'proof test en retard' : null,
      overviewMetrics.openFaults > 0 ? `${overviewMetrics.openFaults} défaut${overviewMetrics.openFaults > 1 ? 's' : ''} ouvert${overviewMetrics.openFaults > 1 ? 's' : ''}` : null,
      overviewMetrics.bypassHours > 0 ? `${overviewMetrics.bypassHours.toFixed(1)} h de bypass / inhibit` : null,
    ].filter(Boolean)

    return {
      label: 'Exposition exploitation à traiter',
      summary: `Le calcul tient, mais l'exploitation demande une action sur ${exposureBits.join(', ')}.`,
      color: semantic.warning,
      background: `${semantic.warning}12`,
      border: `${semantic.warning}38`,
      Icon: ShieldAlert,
    }
  }

  if (governanceGaps > 0) {
    return {
      label: 'Dossier à consolider',
      summary: `${governanceGaps} signal${governanceGaps > 1 ? 'aux' : ''} de gouvernance reste${governanceGaps > 1 ? 'nt' : ''} à fermer avant publication défendable.`,
      color: TEAL_DIM,
      background: `${TEAL}10`,
      border: `${TEAL}35`,
      Icon: Lock,
    }
  }

  if (sif.revisionLockedAt) {
    return {
      label: 'Révision publiée',
      summary: 'La base est gelée. Le cockpit pilote maintenant le suivi exploitation et la préparation de la prochaine révision.',
      color: semantic.success,
      background: `${semantic.success}10`,
      border: `${semantic.success}32`,
      Icon: CheckCircle2,
    }
  }

  return {
    label: 'Prêt pour clôture',
    summary: 'Calcul, exploitation et gouvernance sont alignés. La révision peut être clôturée sans signal faible ouvert.',
    color: semantic.success,
    background: `${semantic.success}10`,
    border: `${semantic.success}32`,
    Icon: ShieldCheck,
  }
}

export function OverviewTab({
  sif,
  result,
  compliance,
  overviewMetrics,
  isPublishingRevision,
  onSelectTab,
  onCloseRevision,
}: Props) {
  const operationalHealth = OVERVIEW_OPERATIONAL_HEALTH_META[overviewMetrics.operationalHealth]
  const decision = getDecisionState(sif, result, compliance, overviewMetrics)
  const priorityActions = overviewMetrics.actions.filter(action => action.id !== 'stable-overview')
  const governanceReady = overviewMetrics.tracePct === 100
    && overviewMetrics.metadataPct === 100
    && overviewMetrics.approvalFilledCount === 3
    && overviewMetrics.pendingAssumptions === 0
    && overviewMetrics.evidenceCompleteCount === overviewMetrics.evidenceTotalCount

  const governanceTitle = governanceReady ? 'Dossier cohérent' : 'Dossier incomplet'
  const operationsValue = overviewMetrics.nextDue
    ? overviewMetrics.nextDue.toLocaleDateString()
    : (sif.proofTestProcedure ? 'À planifier' : 'Procédure absente')
  const operationsDetail = overviewMetrics.isOverdue
    ? 'Le proof test dépasse la date prévue.'
    : overviewMetrics.lastCampaign
      ? `Dernière campagne le ${new Date(overviewMetrics.lastCampaign.date).toLocaleDateString()}.`
      : 'Aucune campagne exécutée n’est encore liée à cette SIF.'
  const leadAction = priorityActions[0]

  return (
    <div className="space-y-5">
      <SurfaceCard className="overflow-hidden" style={{ borderColor: decision.border }}>
        <div className="border-b px-6 pt-5 pb-4" style={{ borderColor: BORDER }}>
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-4">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border"
                  style={{ background: `${decision.color}18`, borderColor: `${decision.color}40` }}
                >
                  <decision.Icon size={18} style={{ color: decision.color }} />
                </div>

                <div className="min-w-0 flex-1">
                  <SectionKicker>SIF Cockpit</SectionKicker>
                  <h2 className="mt-2 text-[24px] font-bold tracking-tight" style={{ color: TEXT }}>
                    {sif.sifNumber} · {sif.title || 'Safety Instrumented Function'}
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6" style={{ color: TEXT_DIM }}>
                    {decision.summary}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <SILBadge sil={result.SIL} size="md" />
                    <StatusPill color={decision.color} background={decision.background} borderColor={decision.border}>
                      <decision.Icon size={11} />
                      {decision.label}
                    </StatusPill>
                    <StatusPill
                      color={TEAL_DIM}
                      background={`${TEAL}10`}
                      borderColor={`${TEAL}35`}
                    >
                      SIL cible {sif.targetSIL}
                    </StatusPill>
                    <StatusPill
                      color={sif.revisionLockedAt ? semantic.success : TEXT}
                      background={sif.revisionLockedAt ? `${semantic.success}10` : `${TEXT_DIM}14`}
                      borderColor={sif.revisionLockedAt ? `${semantic.success}32` : `${TEXT_DIM}28`}
                    >
                      {sif.revisionLockedAt ? `Rév. ${sif.revision} publiée` : `Rév. ${sif.revision} en travail`}
                    </StatusPill>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full shrink-0 xl:max-w-[320px]">
              <div
                className="rounded-2xl border p-4"
                style={{
                  background: PANEL,
                  borderColor: BORDER,
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.03)`,
                }}
              >
                <SectionKicker>Fiche rapide</SectionKicker>
                <p className="mt-2 text-base font-semibold tracking-tight" style={{ color: TEXT }}>
                  {sif.processTag || sif.location || 'Scope à préciser'}
                </p>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
                  {sif.location || 'Localisation non renseignée'} · {sif.date || 'Date non renseignée'}
                </p>

                <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                  <InlineMetric label="PFDavg" value={formatPFD(result.PFD_avg)} tone={result.meetsTarget ? semantic.success : semantic.error} />
                  <InlineMetric label="RRF requis" value={String(sif.rrfRequired)} tone={TEAL_DIM} />
                  <InlineMetric label="Findings" value={`${compliance.technicalFindings.length}`} tone={compliance.technicalFindings.length === 0 ? semantic.success : semantic.warning} />
                  <InlineMetric label="Preuves" value={`${overviewMetrics.evidenceCompleteCount}/${overviewMetrics.evidenceTotalCount}`} tone={TEXT} />
                </div>

                {!sif.revisionLockedAt && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCloseRevision}
                    disabled={isPublishingRevision}
                    className="mt-4 h-9 w-full justify-center text-xs"
                    style={{ borderRadius: R }}
                  >
                    <Lock size={12} />
                    {isPublishingRevision ? 'Publication…' : `Clôturer rév. ${sif.revision}`}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 px-6 py-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div
            className="rounded-2xl border p-4"
            style={{ background: BG, borderColor: BORDER2 }}
          >
            <SectionKicker>Point de décision</SectionKicker>
            <p className="mt-2 text-lg font-semibold tracking-tight" style={{ color: TEXT }}>
              {result.meetsTarget ? 'Base de calcul cohérente pour décision' : 'Base de calcul à reprendre avant décision'}
            </p>
            <p className="mt-2 text-sm leading-6" style={{ color: TEXT_DIM }}>
              {sif.hazardousEvent || 'Événement dangereux non documenté.'}
            </p>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <InlineMetric label="SIL obtenu" value={`SIL ${result.SIL}`} tone={result.meetsTarget ? semantic.success : semantic.error} />
              <InlineMetric label="Checks" value={`${compliance.passedChecks}/${compliance.totalChecks}`} tone={TEXT} />
              <InlineMetric label="Trace" value={`${overviewMetrics.tracePct}%`} tone={overviewMetrics.tracePct === 100 ? semantic.success : TEAL_DIM} />
              <InlineMetric label="Approbations" value={`${overviewMetrics.approvalFilledCount}/3`} tone={overviewMetrics.approvalFilledCount === 3 ? semantic.success : TEAL_DIM} />
            </div>
          </div>

          <div
            className="rounded-2xl border p-4"
            style={{ background: BG, borderColor: BORDER2 }}
          >
            <SectionKicker>Cap suivant</SectionKicker>
            <p className="mt-2 text-lg font-semibold tracking-tight" style={{ color: TEXT }}>
              {leadAction ? leadAction.title : 'Rien de bloquant à traiter'}
            </p>
            <p className="mt-2 text-sm leading-6" style={{ color: TEXT_DIM }}>
              {leadAction
                ? leadAction.hint
                : 'Le cockpit est stable. Tu peux préparer le rapport ou clôturer la révision si la fenêtre de publication est la bonne.'}
            </p>

            <div className="mt-4 rounded-xl border px-3 py-3" style={{ borderColor: BORDER, background: CARD }}>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Exploitation</p>
              <p className="mt-1 text-sm font-semibold" style={{ color: overviewMetrics.isOverdue ? semantic.error : TEXT }}>
                {operationsValue}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
                {operationsDetail}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onSelectTab(leadAction ? leadAction.tab : 'report')}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold"
              style={{ borderColor: `${TEAL}55`, background: `${TEAL}12`, color: TEAL_DIM }}
            >
              {leadAction ? getOverviewActionCta(leadAction.tab) : 'Ouvrir le rapport'}
              <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </SurfaceCard>

      <div className="grid gap-3 xl:grid-cols-3">
        <SignalCard
          eyebrow="Intégrité"
          title={result.meetsTarget ? 'SIL tenu' : 'Sous la cible'}
          value={formatPFD(result.PFD_avg)}
          detail={`PFDavg actuel. Cible: SIL ${sif.targetSIL} / obtenu: SIL ${result.SIL}.`}
          tone={result.meetsTarget ? semantic.success : semantic.error}
          accent={result.meetsTarget ? semantic.success : semantic.error}
        >
          <InlineMetric
            label="Findings"
            value={`${compliance.technicalFindings.length}`}
            tone={compliance.technicalFindings.length === 0 ? semantic.success : semantic.warning}
          />
          <InlineMetric
            label="Checks"
            value={`${compliance.passedChecks}/${compliance.totalChecks}`}
            tone={TEXT}
          />
        </SignalCard>

        <SignalCard
          eyebrow="Exploitation"
          title={operationalHealth.label}
          value={operationsValue}
          detail={operationsDetail}
          tone={overviewMetrics.isOverdue ? semantic.error : operationalHealth.color}
          accent={operationalHealth.color}
        >
          <InlineMetric
            label="Défauts ouverts"
            value={`${overviewMetrics.openFaults}`}
            tone={overviewMetrics.openFaults === 0 ? semantic.success : semantic.warning}
          />
          <InlineMetric
            label="Bypass / inhibit"
            value={`${overviewMetrics.bypassHours.toFixed(1)} h`}
            tone={overviewMetrics.bypassHours === 0 ? semantic.success : TEXT}
          />
        </SignalCard>

        <SignalCard
          eyebrow="Gouvernance"
          title={governanceTitle}
          value={`${overviewMetrics.tracePct}% trace`}
          detail={`Approbations ${overviewMetrics.approvalFilledCount}/3 · preuves ${overviewMetrics.evidenceCompleteCount}/${overviewMetrics.evidenceTotalCount}.`}
          tone={governanceReady ? semantic.success : TEAL_DIM}
          accent={governanceReady ? semantic.success : TEAL}
        >
          <InlineMetric
            label="Métadonnées"
            value={`${overviewMetrics.metadataPct}%`}
            tone={overviewMetrics.metadataPct === 100 ? semantic.success : TEXT}
          />
          <InlineMetric
            label="Hypothèses en revue"
            value={`${overviewMetrics.pendingAssumptions}`}
            tone={overviewMetrics.pendingAssumptions === 0 ? semantic.success : semantic.warning}
          />
        </SignalCard>
      </div>

      <SurfaceCard className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <SectionKicker>Actions prioritaires</SectionKicker>
            <h3 className="mt-2 text-lg font-semibold tracking-tight" style={{ color: TEXT }}>
              Ce qui mérite une action maintenant
            </h3>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: TEXT_DIM }}>
              Le cockpit ne garde ici que les actions qui changent la décision ou la défendabilité du dossier.
            </p>
          </div>
        </div>

        {priorityActions.length === 0 ? (
          <div
            className="mt-4 rounded-2xl border px-4 py-4"
            style={{ borderColor: `${semantic.success}32`, background: `${semantic.success}10` }}
          >
            <div className="flex items-start gap-3">
              <CheckCircle2 size={16} style={{ color: semantic.success, flexShrink: 0, marginTop: 2 }} />
              <div className="min-w-0">
                <p className="text-sm font-semibold" style={{ color: semantic.success }}>
                  Aucun point prioritaire ouvert
                </p>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
                  Le cockpit est stable. Tu peux basculer vers le rapport ou clôturer la révision si c’est la bonne fenêtre de publication.
                </p>
                <button
                  type="button"
                  onClick={() => onSelectTab('report')}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-semibold"
                  style={{ borderColor: `${TEAL}55`, background: `${TEAL}12`, color: TEAL_DIM }}
                >
                  Ouvrir le rapport
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {priorityActions.slice(0, 4).map((action, index) => (
              <div
                key={action.id}
                className="rounded-2xl border p-4"
                style={{ borderColor: BORDER2, background: BG }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[11px] font-bold"
                    style={{ borderColor: BORDER, background: CARD, color: TEAL_DIM }}
                  >
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold" style={{ color: TEXT }}>{action.title}</p>
                    <p className="mt-1 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>{action.hint}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectTab(action.tab)}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-semibold"
                  style={{ borderColor: `${TEAL}55`, background: `${TEAL}12`, color: TEAL_DIM }}
                >
                  {getOverviewActionCta(action.tab)}
                  <ArrowRight size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <div className="rounded-xl border px-3 py-3" style={{ borderColor: BORDER2, background: BG }}>
            <div className="flex items-start gap-2">
              <CheckCircle2 size={14} style={{ color: result.meetsTarget ? semantic.success : semantic.warning, flexShrink: 0, marginTop: 2 }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: TEXT }}>Intégrité calculée</p>
                <p className="mt-1 text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
                  {result.meetsTarget
                    ? 'Le calcul tient la cible demandée.'
                    : 'Le calcul reste sous la cible demandée.'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border px-3 py-3" style={{ borderColor: BORDER2, background: BG }}>
            <div className="flex items-start gap-2">
              <TimerReset size={14} style={{ color: operationalHealth.color, flexShrink: 0, marginTop: 2 }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: TEXT }}>Fenêtre exploitation</p>
                <p className="mt-1 text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
                  {operationsDetail}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border px-3 py-3" style={{ borderColor: BORDER2, background: BG }}>
            <div className="flex items-start gap-2">
              <ShieldCheck size={14} style={{ color: governanceReady ? semantic.success : TEAL_DIM, flexShrink: 0, marginTop: 2 }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: TEXT }}>Défendabilité dossier</p>
                <p className="mt-1 text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
                  {governanceReady
                    ? 'Le dossier est cohérent pour audit et rapport.'
                    : 'Le calcul peut être bon, mais le dossier reste à consolider.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </SurfaceCard>
    </div>
  )
}
