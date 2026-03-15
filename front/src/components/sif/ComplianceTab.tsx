import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileWarning,
  Gauge,
  ShieldCheck,
} from 'lucide-react'
import { SILBadge } from '@/components/shared/SILBadge'
import type { SIF, SIFCalcResult } from '@/core/types'
import type { SIFTab } from '@/store/types'
import type { ComplianceEvidenceItem, ComplianceItemStatus, ComplianceResult } from './complianceCalc'
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
  const { BORDER, CARD_BG, TEAL, TEAL_DIM, TEXT, TEXT_DIM } = usePrismTheme()
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: BORDER, background: CARD_BG }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: TEXT }}>{title}</h3>
          {hint && <p className="mt-1 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>{hint}</p>}
        </div>
        <div
          className="rounded-lg border p-2"
          style={{ borderColor: `${TEAL}33`, background: `${TEAL}12`, color: TEAL_DIM }}
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
  const { BORDER, PAGE_BG, TEXT, TEXT_DIM } = usePrismTheme()
  const color =
    tone === 'success' ? semantic.success :
    tone === 'warning' ? semantic.warning :
    TEXT

  return (
    <div className="rounded-lg border px-3 py-2.5" style={{ borderColor: BORDER, background: PAGE_BG }}>
      <p className="text-[10px] uppercase tracking-wide" style={{ color: TEXT_DIM }}>{label}</p>
      <p className="mt-1 text-sm font-bold font-mono" style={{ color }}>{value}</p>
    </div>
  )
}

function StatusPill({ status }: { status: ComplianceItemStatus }) {
  const tone =
    status === 'complete'
      ? { color: semantic.success, bg: `${semantic.success}12`, border: `${semantic.success}44`, label: 'OK' }
      : status === 'missing'
        ? { color: semantic.error, bg: `${semantic.error}12`, border: `${semantic.error}44`, label: 'Missing' }
        : { color: semantic.warning, bg: `${semantic.warning}12`, border: `${semantic.warning}44`, label: 'Review' }

  return (
    <span
      className="rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide"
      style={{ color: tone.color, background: tone.bg, borderColor: tone.border }}
    >
      {tone.label}
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
  const { BORDER, PAGE_BG, TEXT, TEXT_DIM } = usePrismTheme()
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg border px-3 py-3 text-left transition-colors"
      style={{ borderColor: BORDER, background: PAGE_BG }}
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
  onClick,
}: {
  item: ComplianceEvidenceItem
  onClick: () => void
}) {
  const { BORDER, PAGE_BG, TEXT, TEXT_DIM } = usePrismTheme()
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg border px-3 py-2.5 text-left transition-colors"
      style={{ borderColor: BORDER, background: PAGE_BG }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: TEXT }}>{item.label}</p>
          <p className="mt-0.5 text-xs" style={{ color: TEXT_DIM }}>{item.summary}</p>
        </div>
        <StatusPill status={item.status} />
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
  const { BORDER, PAGE_BG, TEXT, TEXT_DIM } = usePrismTheme()
  const openGaps = Math.max(0, compliance.totalChecks - compliance.passedChecks)
  const metadataPct = Math.round(compliance.metadataCompletion * 100)
  const registerReviews = sif.assumptions.filter(item => item.status !== 'validated').length
  const statusLabel =
    !result.meetsTarget ? 'Non-compliant' :
    openGaps > 0 || compliance.missingMetadata.length > 0 ? 'Review' :
    'Compliant'
  const scoreTone =
    statusLabel === 'Compliant' ? 'success' :
    statusLabel === 'Review' ? 'warning' :
    'warning'

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_1.15fr_0.95fr] gap-4">
        <SurfaceCard
          title="Compliance Status"
          hint="Verdict compact pour la SIF courante, sans répéter l’analyse détaillée ni les vues globales."
          icon={<Gauge size={16} />}
        >
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: TEXT_DIM }}>
                Status
              </p>
              <p className="mt-2 text-3xl font-bold tracking-tight" style={{ color: TEXT }}>{statusLabel}</p>
              <p className="mt-2 text-xs" style={{ color: TEXT_DIM }}>
                {compliance.score}/100 · {compliance.passedChecks}/{compliance.totalChecks} checks passed
              </p>
            </div>
            <SILBadge sil={result.SIL} size="lg" />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <MiniMetric label="Target" value={`SIL ${sif.targetSIL}`} />
            <MiniMetric label="Open gaps" value={String(openGaps)} tone={openGaps === 0 ? 'success' : scoreTone} />
            <MiniMetric label="Register" value={`${registerReviews} pending`} tone={registerReviews === 0 ? 'success' : 'warning'} />
          </div>
        </SurfaceCard>

        <SurfaceCard
          title="Proof & Governance Readiness"
          hint="Présence des preuves minimales attendues pour défendre la SIF sans recopier les contenus métier complets."
          icon={<ShieldCheck size={16} />}
        >
          <div className="mb-3 grid grid-cols-2 gap-2">
            <MiniMetric label="Traceability" value={`${metadataPct}%`} tone={metadataPct === 100 ? 'success' : 'warning'} />
            <MiniMetric
              label="Evidence items"
              value={`${compliance.evidenceItems.filter(item => item.status === 'complete').length}/${compliance.evidenceItems.length}`}
              tone={compliance.evidenceItems.every(item => item.status === 'complete') ? 'success' : 'warning'}
            />
          </div>

          <div className="space-y-2">
            {compliance.evidenceItems.map(item => (
              <EvidenceButton key={item.id} item={item} onClick={() => onSelectEvidence(item.id)} />
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard
          title="Next Best Actions"
          hint="Actions courtes et utiles, orientées vers la correction des points réellement bloquants."
          icon={<ClipboardCheck size={16} />}
        >
          <div className="space-y-2">
            {compliance.actions.map(action => (
              <ActionButton
                key={action.title}
                title={action.title}
                hint={action.hint}
                onClick={() => onSelectTab(action.tab)}
              />
            ))}
          </div>
        </SurfaceCard>
      </div>

      <SurfaceCard
        title="Open Compliance Gaps"
        hint="Écarts priorisés à inspecter dans le panneau droit, puis à corriger dans l’onglet métier concerné."
        icon={<FileWarning size={16} />}
      >
        <div className="space-y-2">
          {compliance.technicalFindings.length > 0 ? (
            compliance.technicalFindings.map(finding => (
              <button
                key={finding.id}
                type="button"
                onClick={() => onSelectGap(finding.id)}
                className="w-full rounded-lg border px-3 py-2.5 text-left transition-colors"
                style={{ borderColor: BORDER, background: PAGE_BG }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: TEXT }}>{finding.title}</p>
                    <p className="mt-0.5 text-xs" style={{ color: TEXT_DIM }}>
                      {finding.subsystemLabel} · Current {finding.value} · Expected {finding.expected}
                    </p>
                  </div>
                  <span
                    className="rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide"
                    style={{ borderColor: `${semantic.warning}55`, color: semantic.warning, background: `${semantic.warning}12` }}
                  >
                    Inspect
                  </span>
                </div>
              </button>
            ))
          ) : (
            <div
              className="flex items-center gap-2 rounded-lg border px-3 py-3 text-sm"
              style={{ borderColor: `${semantic.success}44`, background: `${semantic.success}10`, color: semantic.success }}
            >
              <CheckCircle2 size={14} />
              No open technical gap is currently blocking the compliance view.
            </div>
          )}
        </div>
      </SurfaceCard>
    </div>
  )
}
