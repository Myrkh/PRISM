import { type ReactNode } from 'react'
import { ArrowRight, CheckCircle2, FileWarning, GitBranch, Lock, ShieldAlert, ShieldCheck, TimerReset } from 'lucide-react'
import { getSifOverviewStrings, type SifOverviewStrings } from '@/i18n/sifOverview'
import { useLocaleStrings } from '@/i18n/useLocale'
import { Button } from '@/components/ui/button'
import { SILBadge } from '@/components/shared/SILBadge'
import { formatPFD } from '@/core/math/pfdCalc'
import type { SIF, SIFCalcResult } from '@/core/types'
import type { SIFTab } from '@/store/types'
import type { ComplianceResult } from '@/components/sif/complianceCalc'
import type { OverviewMetrics } from '@/components/sif/overviewMetrics'
import { getOverviewActionCta, getOverviewOperationalHealthMeta } from '@/components/sif/overviewUi'
import { SIFRevisionHistoryLedger } from '@/components/sif/SIFRevisionHistoryLedger'
import { colors, semantic } from '@/styles/tokens'
import { usePrismTheme } from '@/styles/usePrismTheme'

interface Props {
  sif: SIF
  result: SIFCalcResult
  compliance: ComplianceResult
  overviewMetrics: OverviewMetrics
  isPublishingRevision: boolean
  onSelectTab: (tab: SIFTab) => void
  onCloseRevision: () => void
}

function SectionKicker({ children }: { children: ReactNode }) {
  const { TEXT_DIM } = usePrismTheme()
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
      {children}
    </p>
  )
}

function SectionHeader({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  const { BORDER, SHADOW_SOFT, TEAL } = usePrismTheme()
  return (
    <div className="mb-3 flex items-center gap-2 border-b pb-2" style={{ borderColor: BORDER }}>
      <span
        className="inline-flex h-6 w-6 items-center justify-center rounded-md border"
        style={{ color: TEAL, background: `${TEAL}10`, borderColor: `${TEAL}22`, boxShadow: SHADOW_SOFT }}
      >
        {icon}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: TEAL }}>
        {children}
      </span>
    </div>
  )
}

function SurfaceCard({
  children,
  className = '',
  style,
}: {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  const { BORDER, CARD_BG, SHADOW_CARD } = usePrismTheme()
  return (
    <div
      className={`rounded-2xl border ${className}`.trim()}
      style={{
        borderColor: BORDER,
        background: CARD_BG,
        boxShadow: SHADOW_CARD,
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
  children: ReactNode
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
  const { BORDER, SHADOW_SOFT, SURFACE, TEXT_DIM } = usePrismTheme()
  return (
    <div className="rounded-xl border px-3.5 py-3" style={{ borderColor: BORDER, background: SURFACE, boxShadow: SHADOW_SOFT }}>
      <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>{label}</p>
      <p className="mt-1 text-sm font-semibold font-mono" style={{ color: tone }}>{value}</p>
    </div>
  )
}

function SignalCard({
  eyebrow,
  icon,
  title,
  value,
  detail,
  tone,
  children,
}: {
  eyebrow: string
  icon: ReactNode
  title: string
  value: string
  detail: string
  tone: string
  children: ReactNode
}) {
  const { TEXT, TEXT_DIM } = usePrismTheme()
  return (
    <SurfaceCard className="p-5">
      <SectionHeader icon={icon}>{eyebrow}</SectionHeader>
      <p className="text-base font-semibold tracking-tight" style={{ color: TEXT }}>{title}</p>
      <p className="mt-2 text-2xl font-semibold font-mono tracking-tight" style={{ color: tone }}>{value}</p>
      <p className="mt-2 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>{detail}</p>
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
  strings: SifOverviewStrings,
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
      label: strings.overview.decision.technicalActionRequired,
      summary: !result.meetsTarget
        ? strings.overview.decision.technicalSummaryBelowTarget(sif.targetSIL)
        : strings.overview.decision.technicalSummaryFindings(technicalFindings),
      color: semantic.error,
      background: `${semantic.error}12`,
      border: `${semantic.error}3A`,
      Icon: FileWarning,
    }
  }

  if (overviewMetrics.isOverdue || overviewMetrics.openFaults > 0 || overviewMetrics.bypassHours > 0) {
    const exposureBits = [
      overviewMetrics.isOverdue ? strings.overview.decision.exposureBits.overdueProofTest : null,
      overviewMetrics.openFaults > 0 ? strings.overview.decision.exposureBits.openFaults(overviewMetrics.openFaults) : null,
      overviewMetrics.bypassHours > 0 ? strings.overview.decision.exposureBits.bypassHours(overviewMetrics.bypassHours.toFixed(1)) : null,
    ].filter(Boolean).join(', ')

    return {
      label: strings.overview.decision.operationalExposure,
      summary: strings.overview.decision.operationalExposureSummary(exposureBits),
      color: semantic.warning,
      background: `${semantic.warning}12`,
      border: `${semantic.warning}38`,
      Icon: ShieldAlert,
    }
  }

  if (governanceGaps > 0) {
    return {
      label: strings.overview.decision.dossierToConsolidate,
      summary: strings.overview.decision.dossierToConsolidateSummary(governanceGaps),
      color: colors.tealDim,
      background: `${colors.teal}10`,
      border: `${colors.teal}35`,
      Icon: Lock,
    }
  }

  if (sif.revisionLockedAt) {
    return {
      label: strings.overview.decision.revisionPublished,
      summary: strings.overview.decision.revisionPublishedSummary,
      color: semantic.success,
      background: `${semantic.success}10`,
      border: `${semantic.success}32`,
      Icon: CheckCircle2,
    }
  }

  return {
    label: strings.overview.decision.readyForClosure,
    summary: strings.overview.decision.readyForClosureSummary,
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
  const strings = useLocaleStrings(getSifOverviewStrings)
  const { BORDER, CARD_BG, SHADOW_CARD, SHADOW_SOFT, SURFACE, TEAL, TEAL_DIM, TEXT, TEXT_DIM, R } = usePrismTheme()
  const formatDate = (value: string | Date, options?: Intl.DateTimeFormatOptions) => new Date(value).toLocaleDateString(strings.localeTag, options)
  const operationalHealth = getOverviewOperationalHealthMeta(TEXT_DIM, strings)[overviewMetrics.operationalHealth]
  const decision = getDecisionState(sif, result, compliance, overviewMetrics, strings)
  const priorityActions = overviewMetrics.actions.filter(action => action.id !== 'stable-overview')
  const governanceReady = overviewMetrics.tracePct === 100
    && overviewMetrics.metadataPct === 100
    && overviewMetrics.approvalFilledCount === 3
    && overviewMetrics.pendingAssumptions === 0
    && overviewMetrics.evidenceCompleteCount === overviewMetrics.evidenceTotalCount

  const governanceTitle = governanceReady ? strings.overview.signalCards.governanceReady : strings.overview.signalCards.governanceIncomplete
  const operationsValue = overviewMetrics.nextDue
    ? formatDate(overviewMetrics.nextDue)
    : (sif.proofTestProcedure ? strings.overview.operations.toSchedule : strings.overview.operations.missingProcedure)
  const operationsDetail = overviewMetrics.isOverdue
    ? strings.overview.operations.overdueDetail
    : overviewMetrics.lastCampaign
      ? strings.overview.operations.lastCampaignOn(formatDate(overviewMetrics.lastCampaign.date))
      : strings.overview.operations.noCampaignYet
  const leadAction = priorityActions[0]

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <SurfaceCard className="p-4">
          <SectionHeader icon={<decision.Icon size={12} />}>{strings.overview.sections.decision}</SectionHeader>
          <p className="text-lg font-semibold tracking-tight" style={{ color: TEXT }}>
            {sif.sifNumber} · {sif.title || strings.overview.defaultTitle}
          </p>
          <p className="mt-2 text-sm leading-6" style={{ color: TEXT_DIM }}>
            {decision.summary}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <SILBadge sil={result.SIL} size="md" />
            <StatusPill color={decision.color} background={decision.background} borderColor={decision.border}>
              <decision.Icon size={11} />
              {decision.label}
            </StatusPill>
            <StatusPill color={TEAL_DIM} background={`${TEAL}10`} borderColor={`${TEAL}35`}>
              {strings.overview.pills.targetSil(sif.targetSIL)}
            </StatusPill>
            <StatusPill
              color={sif.revisionLockedAt ? semantic.success : TEXT}
              background={sif.revisionLockedAt ? `${semantic.success}10` : `${TEXT_DIM}14`}
              borderColor={sif.revisionLockedAt ? `${semantic.success}32` : `${TEXT_DIM}28`}
            >
              {sif.revisionLockedAt
                ? strings.overview.pills.revisionPublished(sif.revision)
                : strings.overview.pills.revisionWorking(sif.revision)}
            </StatusPill>
          </div>

          <div className="mt-4 rounded-lg border px-3 py-3" style={{ borderColor: BORDER, background: SURFACE, boxShadow: SHADOW_SOFT }}>
            <SectionKicker>{strings.overview.sections.dangerousEvent}</SectionKicker>
            <p className="mt-2 text-sm leading-6" style={{ color: TEXT }}>
              {sif.hazardousEvent || strings.overview.dangerousEventMissing}
            </p>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <InlineMetric label={strings.overview.inlineMetrics.achievedSil} value={`SIL ${result.SIL}`} tone={result.meetsTarget ? semantic.success : semantic.error} />
            <InlineMetric label={strings.overview.inlineMetrics.checks} value={`${compliance.passedChecks}/${compliance.totalChecks}`} tone={TEXT} />
            <InlineMetric label={strings.overview.inlineMetrics.trace} value={`${overviewMetrics.tracePct}%`} tone={overviewMetrics.tracePct === 100 ? semantic.success : TEAL_DIM} />
            <InlineMetric label={strings.overview.inlineMetrics.approvals} value={`${overviewMetrics.approvalFilledCount}/3`} tone={overviewMetrics.approvalFilledCount === 3 ? semantic.success : TEAL_DIM} />
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-4">
          <SectionHeader icon={<Lock size={12} />}>{strings.overview.sections.revisionNext}</SectionHeader>
          <p className="text-base font-semibold tracking-tight" style={{ color: TEXT }}>
            {sif.processTag || sif.location || strings.overview.scopeToSpecify}
          </p>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
            {sif.location || strings.overview.locationMissing} · {sif.date || strings.overview.dateMissing}
          </p>

          <div className="mt-4 grid gap-2">
            <InlineMetric label={strings.overview.inlineMetrics.pfdavg} value={formatPFD(result.PFD_avg)} tone={result.meetsTarget ? semantic.success : semantic.error} />
            <InlineMetric label={strings.overview.inlineMetrics.requiredRrf} value={String(sif.rrfRequired)} tone={TEAL_DIM} />
            <InlineMetric label={strings.overview.inlineMetrics.findings} value={`${compliance.technicalFindings.length}`} tone={compliance.technicalFindings.length === 0 ? semantic.success : semantic.warning} />
            <InlineMetric label={strings.overview.inlineMetrics.evidence} value={`${overviewMetrics.evidenceCompleteCount}/${overviewMetrics.evidenceTotalCount}`} tone={TEXT} />
          </div>

          <div className="mt-4 rounded-lg border px-3 py-3" style={{ borderColor: BORDER, background: SURFACE, boxShadow: SHADOW_SOFT }}>
            <SectionKicker>{strings.overview.nextStep}</SectionKicker>
            <p className="mt-2 text-sm font-semibold" style={{ color: TEXT }}>
              {leadAction ? leadAction.title : strings.overview.noBlockingTitle}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
              {leadAction ? leadAction.hint : strings.overview.noBlockingHint}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onSelectTab(leadAction ? leadAction.tab : 'report')}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold"
              style={{ borderColor: `${TEAL}55`, background: `${TEAL}12`, color: TEAL_DIM, boxShadow: SHADOW_SOFT }}
            >
              {leadAction ? getOverviewActionCta(leadAction.tab, strings) : strings.overview.primaryCtaReport}
              <ArrowRight size={12} />
            </button>

            {!sif.revisionLockedAt && (
              <Button
                variant="outline"
                size="sm"
                onClick={onCloseRevision}
                disabled={isPublishingRevision}
                className="h-9 justify-center text-xs"
                style={{ borderRadius: R, background: SURFACE, borderColor: BORDER, color: TEXT, boxShadow: SHADOW_CARD }}
              >
                <Lock size={12} />
                {isPublishingRevision ? strings.overview.publishing : strings.overview.closeRevision(sif.revision)}
              </Button>
            )}
          </div>
        </SurfaceCard>
      </div>

      <SurfaceCard className="p-5">
        <SectionHeader icon={<GitBranch size={12} />}>{strings.overview.sections.revisionHistory}</SectionHeader>
        <p className="text-sm leading-relaxed" style={{ color: TEXT_DIM }}>
          {strings.overview.revisionHistoryDescription}
        </p>
        <div className="mt-4">
          <SIFRevisionHistoryLedger sif={sif} />
        </div>
      </SurfaceCard>

      <div className="grid gap-3 xl:grid-cols-3">
        <SignalCard
          eyebrow={strings.overview.signalCards.integrityEyebrow}
          icon={<CheckCircle2 size={12} />}
          title={result.meetsTarget ? strings.overview.signalCards.integrityHeld : strings.overview.signalCards.integrityBelowTarget}
          value={formatPFD(result.PFD_avg)}
          detail={strings.overview.signalCards.integrityDetail(sif.targetSIL, result.SIL)}
          tone={result.meetsTarget ? semantic.success : semantic.error}
        >
          <InlineMetric
            label={strings.overview.inlineMetrics.findings}
            value={`${compliance.technicalFindings.length}`}
            tone={compliance.technicalFindings.length === 0 ? semantic.success : semantic.warning}
          />
          <InlineMetric
            label={strings.overview.inlineMetrics.checks}
            value={`${compliance.passedChecks}/${compliance.totalChecks}`}
            tone={TEXT}
          />
        </SignalCard>

        <SignalCard
          eyebrow={strings.overview.signalCards.operationsEyebrow}
          icon={<TimerReset size={12} />}
          title={operationalHealth.label}
          value={operationsValue}
          detail={operationsDetail}
          tone={overviewMetrics.isOverdue ? semantic.error : operationalHealth.color}
        >
          <InlineMetric
            label={strings.overview.inlineMetrics.openFaults}
            value={`${overviewMetrics.openFaults}`}
            tone={overviewMetrics.openFaults === 0 ? semantic.success : semantic.warning}
          />
          <InlineMetric
            label={strings.overview.inlineMetrics.bypassInhibit}
            value={`${overviewMetrics.bypassHours.toFixed(1)} h`}
            tone={overviewMetrics.bypassHours === 0 ? semantic.success : TEXT}
          />
        </SignalCard>

        <SignalCard
          eyebrow={strings.overview.signalCards.governanceEyebrow}
          icon={<ShieldCheck size={12} />}
          title={governanceTitle}
          value={strings.overview.signalCards.governanceTrace(overviewMetrics.tracePct)}
          detail={strings.overview.signalCards.governanceDetail(
            overviewMetrics.approvalFilledCount,
            overviewMetrics.evidenceCompleteCount,
            overviewMetrics.evidenceTotalCount,
          )}
          tone={governanceReady ? semantic.success : TEAL_DIM}
        >
          <InlineMetric
            label={strings.overview.inlineMetrics.metadata}
            value={`${overviewMetrics.metadataPct}%`}
            tone={overviewMetrics.metadataPct === 100 ? semantic.success : TEXT}
          />
          <InlineMetric
            label={strings.overview.inlineMetrics.assumptionsUnderReview}
            value={`${overviewMetrics.pendingAssumptions}`}
            tone={overviewMetrics.pendingAssumptions === 0 ? semantic.success : semantic.warning}
          />
        </SignalCard>
      </div>

      <SurfaceCard className="p-5">
        <SectionHeader icon={<FileWarning size={12} />}>{strings.overview.sections.priorityActions}</SectionHeader>
        <p className="text-sm leading-relaxed" style={{ color: TEXT_DIM }}>
          {strings.overview.priorityActionsDescription}
        </p>

        {priorityActions.length === 0 ? (
          <div
            className="mt-4 rounded-xl border px-4 py-4"
            style={{ borderColor: `${semantic.success}32`, background: `${semantic.success}08`, boxShadow: SHADOW_SOFT }}
          >
            <div className="flex items-start gap-3">
              <CheckCircle2 size={16} style={{ color: semantic.success, flexShrink: 0, marginTop: 2 }} />
              <div className="min-w-0">
                <p className="text-sm font-semibold" style={{ color: semantic.success }}>
                  {strings.overview.noPriorityTitle}
                </p>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
                  {strings.overview.noPriorityDescription}
                </p>
                <button
                  type="button"
                  onClick={() => onSelectTab('report')}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-semibold"
                  style={{ borderColor: `${TEAL}55`, background: `${TEAL}12`, color: TEAL_DIM, boxShadow: SHADOW_SOFT }}
                >
                  {strings.overview.primaryCtaReport}
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
                className="rounded-xl border p-4"
                style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_CARD }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-[11px] font-bold"
                    style={{ borderColor: `${TEAL}26`, background: `${TEAL}10`, color: TEAL_DIM, boxShadow: SHADOW_SOFT }}
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
                  style={{ borderColor: `${TEAL}55`, background: `${TEAL}12`, color: TEAL_DIM, boxShadow: SHADOW_SOFT }}
                >
                  {getOverviewActionCta(action.tab, strings)}
                  <ArrowRight size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <div className="rounded-xl border px-3 py-3" style={{ borderColor: BORDER, background: SURFACE, boxShadow: SHADOW_SOFT }}>
            <div className="flex items-start gap-2">
              <CheckCircle2 size={14} style={{ color: result.meetsTarget ? semantic.success : semantic.warning, flexShrink: 0, marginTop: 2 }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: TEXT }}>{strings.overview.statusCards.integrityCalculated}</p>
                <p className="mt-1 text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
                  {result.meetsTarget ? strings.overview.statusCards.integrityHeld : strings.overview.statusCards.integrityBelow}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border px-3 py-3" style={{ borderColor: BORDER, background: SURFACE, boxShadow: SHADOW_SOFT }}>
            <div className="flex items-start gap-2">
              <TimerReset size={14} style={{ color: operationalHealth.color, flexShrink: 0, marginTop: 2 }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: TEXT }}>{strings.overview.statusCards.operationsWindow}</p>
                <p className="mt-1 text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
                  {operationsDetail}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border px-3 py-3" style={{ borderColor: BORDER, background: SURFACE, boxShadow: SHADOW_SOFT }}>
            <div className="flex items-start gap-2">
              <ShieldCheck size={14} style={{ color: governanceReady ? semantic.success : TEAL_DIM, flexShrink: 0, marginTop: 2 }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: TEXT }}>{strings.overview.statusCards.dossierDefensibility}</p>
                <p className="mt-1 text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
                  {governanceReady ? strings.overview.statusCards.dossierReady : strings.overview.statusCards.dossierIncomplete}
                </p>
              </div>
            </div>
          </div>
        </div>
      </SurfaceCard>
    </div>
  )
}
