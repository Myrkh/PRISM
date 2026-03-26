import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileWarning,
  Gauge,
  ShieldCheck,
} from 'lucide-react'
import { SILBadge } from '@/components/shared/SILBadge'
import { getSifComplianceStrings } from '@/i18n/sifCompliance'
import { useLocaleStrings } from '@/i18n/useLocale'
import type { SIF, SIFCalcResult } from '@/core/types'
import type { SIFTab } from '@/store/types'
import type { ComplianceEvidenceItem, ComplianceItemStatus, ComplianceResult } from './complianceCalc'
import {
  getComplianceOverallStatusKey,
  getCompliancePillLabel,
  localizeComplianceAction,
  localizeComplianceEvidence,
  localizeTechnicalFinding,
} from './complianceUi'
import { semantic } from '@/styles/tokens'
import { usePrismTheme } from '@/styles/usePrismTheme'

interface Props {
  sif: SIF
  result: SIFCalcResult
  compliance: ComplianceResult
  onSelectTab: (tab: SIFTab) => void
  onSelectGap: (gapId: string) => void
  onSelectEvidence: (evidenceId: string) => void
}

function SurfaceCard({
  title,
  hint,
  icon,
  children,
}: {
  title: string
  hint?: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  const { BORDER, CARD_BG, SHADOW_PANEL, SURFACE, TEAL, TEAL_DIM, TEXT_DIM } = usePrismTheme()
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_PANEL }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: TEAL }}>{title}</h3>
          {hint && <p className="mt-1 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>{hint}</p>}
        </div>
        <div
          className="rounded-lg border p-2"
          style={{ borderColor: `${TEAL}33`, background: SURFACE, color: TEAL_DIM }}
        >
          {icon}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  )
}

function MiniMetric({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'success' | 'warning'
}) {
  const { BORDER, SHADOW_SOFT, SURFACE, TEXT, TEXT_DIM } = usePrismTheme()
  const color =
    tone === 'success' ? semantic.success :
    tone === 'warning' ? semantic.warning :
    TEXT

  return (
    <div className="rounded-lg border px-3 py-2.5" style={{ borderColor: BORDER, background: SURFACE, boxShadow: SHADOW_SOFT }}>
      <p className="text-[10px] uppercase tracking-wide" style={{ color: TEXT_DIM }}>{label}</p>
      <p className="mt-1 text-sm font-bold font-mono" style={{ color }}>{value}</p>
    </div>
  )
}

function StatusPill({
  status,
  label,
}: {
  status: ComplianceItemStatus
  label: string
}) {
  const tone =
    status === 'complete'
      ? { color: semantic.success, bg: `${semantic.success}12`, border: `${semantic.success}44` }
      : status === 'missing'
        ? { color: semantic.error, bg: `${semantic.error}12`, border: `${semantic.error}44` }
        : { color: semantic.warning, bg: `${semantic.warning}12`, border: `${semantic.warning}44` }

  return (
    <span
      className="rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide"
      style={{ color: tone.color, background: tone.bg, borderColor: tone.border }}
    >
      {label}
    </span>
  )
}

function ActionButton({
  title,
  hint,
  onClick,
}: {
  title: string
  hint: string
  onClick: () => void
}) {
  const { BORDER, SHADOW_SOFT, SURFACE, TEXT, TEXT_DIM } = usePrismTheme()
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg border px-3 py-3 text-left transition-colors"
      style={{ borderColor: BORDER, background: SURFACE, boxShadow: SHADOW_SOFT }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold" style={{ color: TEXT }}>{title}</p>
        <ArrowRight size={14} style={{ color: TEXT_DIM }} />
      </div>
      <p className="mt-1 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>{hint}</p>
    </button>
  )
}

function EvidenceButton({
  item,
  pillLabel,
  onClick,
}: {
  item: ComplianceEvidenceItem
  pillLabel: string
  onClick: () => void
}) {
  const { BORDER, SHADOW_SOFT, SURFACE, TEXT, TEXT_DIM } = usePrismTheme()
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg border px-3 py-2.5 text-left transition-colors"
      style={{ borderColor: BORDER, background: SURFACE, boxShadow: SHADOW_SOFT }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: TEXT }}>{item.label}</p>
          <p className="mt-0.5 text-xs" style={{ color: TEXT_DIM }}>{item.summary}</p>
        </div>
        <StatusPill status={item.status} label={pillLabel} />
      </div>
    </button>
  )
}

export function ComplianceTab({
  sif,
  result,
  compliance,
  onSelectTab,
  onSelectGap,
  onSelectEvidence,
}: Props) {
  const strings = useLocaleStrings(getSifComplianceStrings)
  const { BORDER, SHADOW_SOFT, SURFACE, TEXT, TEXT_DIM } = usePrismTheme()
  const openGaps = Math.max(0, compliance.totalChecks - compliance.passedChecks)
  const metadataPct = Math.round(compliance.metadataCompletion * 100)
  const registerReviews = sif.assumptions.filter(item => item.status !== 'validated').length
  const statusKey = getComplianceOverallStatusKey(result, compliance)
  const statusLabel = strings.overallStatus[statusKey]
  const scoreTone = statusKey === 'compliant' ? 'success' : 'warning'
  const localizedEvidence = compliance.evidenceItems.map(item => localizeComplianceEvidence(strings, sif, result, compliance, item))
  const localizedActions = compliance.actions.map(action => localizeComplianceAction(strings, action))
  const localizedFindings = compliance.technicalFindings.map(finding => localizeTechnicalFinding(strings, finding))

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_1.15fr_0.95fr]">
        <SurfaceCard
          title={strings.tab.complianceStatusTitle}
          hint={strings.tab.complianceStatusHint}
          icon={<Gauge size={16} />}
        >
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: TEXT_DIM }}>
                {strings.tab.statusLabel}
              </p>
              <p className="mt-2 text-3xl font-bold tracking-tight" style={{ color: TEXT }}>{statusLabel}</p>
              <p className="mt-2 text-xs" style={{ color: TEXT_DIM }}>
                {compliance.score}/100 · {strings.tab.checksPassed(compliance.passedChecks, compliance.totalChecks)}
              </p>
            </div>
            <SILBadge sil={result.SIL} size="lg" />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <MiniMetric label={strings.tab.target} value={`SIL ${sif.targetSIL}`} />
            <MiniMetric label={strings.tab.openGaps} value={String(openGaps)} tone={openGaps === 0 ? 'success' : scoreTone} />
            <MiniMetric label={strings.tab.register} value={strings.tab.registerPending(registerReviews)} tone={registerReviews === 0 ? 'success' : 'warning'} />
          </div>
        </SurfaceCard>

        <SurfaceCard
          title={strings.tab.proofGovernanceTitle}
          hint={strings.tab.proofGovernanceHint}
          icon={<ShieldCheck size={16} />}
        >
          <div className="mb-3 grid grid-cols-2 gap-2">
            <MiniMetric label={strings.tab.traceability} value={`${metadataPct}%`} tone={metadataPct === 100 ? 'success' : 'warning'} />
            <MiniMetric
              label={strings.tab.evidenceItems}
              value={`${localizedEvidence.filter(item => item.status === 'complete').length}/${localizedEvidence.length}`}
              tone={localizedEvidence.every(item => item.status === 'complete') ? 'success' : 'warning'}
            />
          </div>

          <div className="space-y-2">
            {localizedEvidence.map(item => (
              <EvidenceButton
                key={item.id}
                item={item}
                pillLabel={getCompliancePillLabel(strings, item.status)}
                onClick={() => onSelectEvidence(item.id)}
              />
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard
          title={strings.tab.nextBestActionsTitle}
          hint={strings.tab.nextBestActionsHint}
          icon={<ClipboardCheck size={16} />}
        >
          <div className="space-y-2">
            {localizedActions.map(action => (
              <ActionButton
                key={action.title}
                title={action.title}
                hint={action.hint}
                onClick={() => onSelectTab(action.tab as SIFTab)}
              />
            ))}
          </div>
        </SurfaceCard>
      </div>

      <SurfaceCard
        title={strings.tab.openComplianceGapsTitle}
        hint={strings.tab.openComplianceGapsHint}
        icon={<FileWarning size={16} />}
      >
        <div className="space-y-2">
          {localizedFindings.length > 0 ? (
            localizedFindings.map(finding => (
              <button
                key={finding.id}
                type="button"
                onClick={() => onSelectGap(finding.id)}
                className="w-full rounded-lg border px-3 py-2.5 text-left transition-colors"
                style={{ borderColor: BORDER, background: SURFACE, boxShadow: SHADOW_SOFT }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: TEXT }}>{finding.title}</p>
                    <p className="mt-0.5 text-xs" style={{ color: TEXT_DIM }}>
                      {finding.subsystemLabel} · {strings.tab.currentExpected(finding.value, finding.expected)}
                    </p>
                  </div>
                  <span
                    className="rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide"
                    style={{ borderColor: `${semantic.warning}55`, color: semantic.warning, background: `${semantic.warning}12` }}
                  >
                    {strings.tab.inspect}
                  </span>
                </div>
              </button>
            ))
          ) : (
            <div
              className="flex items-center gap-2 rounded-lg border px-3 py-3 text-sm"
              style={{ borderColor: `${semantic.success}44`, background: `${semantic.success}10`, color: semantic.success, boxShadow: SHADOW_SOFT }}
            >
              <CheckCircle2 size={14} />
              {strings.tab.noOpenTechnicalGap}
            </div>
          )}
        </div>
      </SurfaceCard>
    </div>
  )
}
