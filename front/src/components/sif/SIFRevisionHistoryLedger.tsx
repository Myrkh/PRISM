import { useEffect, useMemo, useState } from 'react'
import { Download, GitCompare, Loader2 } from 'lucide-react'
import { getSifOverviewStrings } from '@/i18n/sifOverview'
import { useLocaleStrings } from '@/i18n/useLocale'
import { useAppStore } from '@/store/appStore'
import { calcSIF, formatPFD } from '@/core/math/pfdCalc'
import type { SIF, SIFRevision, SIFStatus } from '@/core/types'
import { downloadRevisionArtifact } from '@/lib/revisionArtifacts'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { SIFRevisionCompare } from '@/components/global/SIFRevisionCompare'

function getStatusCfg(
  status: SIFStatus,
  options: {
    BORDER: string
    PAGE_BG: string
    TEXT_DIM: string
    semantic: ReturnType<typeof usePrismTheme>['semantic']
    labels: ReturnType<typeof getSifOverviewStrings>['shared']['statusShort']
  },
) {
  const { BORDER, PAGE_BG, TEXT_DIM, semantic, labels } = options

  const map: Record<SIFStatus, { label: string; bg: string; color: string; border: string }> = {
    draft: { label: labels.draft, bg: PAGE_BG, color: TEXT_DIM, border: BORDER },
    in_review: { label: labels.in_review, bg: `${semantic.warning}10`, color: semantic.warning, border: `${semantic.warning}28` },
    verified: { label: labels.verified, bg: '#DBEAFE', color: '#2563EB', border: '#93C5FD' },
    approved: { label: labels.approved, bg: `${semantic.success}12`, color: semantic.success, border: `${semantic.success}30` },
    archived: { label: labels.archived, bg: PAGE_BG, color: TEXT_DIM, border: BORDER },
  }

  return map[status]
}

function StatusBadge({ status }: { status: SIFStatus }) {
  const strings = useLocaleStrings(getSifOverviewStrings)
  const { BORDER, PAGE_BG, TEXT_DIM, semantic } = usePrismTheme()
  const cfg = getStatusCfg(status, { BORDER, PAGE_BG, TEXT_DIM, semantic, labels: strings.shared.statusShort })
  return (
    <span
      className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-black tracking-wider"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
    >
      {cfg.label}
    </span>
  )
}

function InlineDelta({ older, newer }: { older: SIFRevision; newer: SIFRevision }) {
  const strings = useLocaleStrings(getSifOverviewStrings)
  const { BORDER, TEXT_DIM, semantic } = usePrismTheme()
  const calcOld = useMemo(() => calcSIF(older.snapshot), [older])
  const calcNew = useMemo(() => calcSIF(newer.snapshot), [newer])

  const parts: string[] = []
  if (older.status !== newer.status) {
    parts.push(
      `${getStatusCfg(older.status, { BORDER, PAGE_BG: 'transparent', TEXT_DIM, semantic, labels: strings.shared.statusShort }).label} → ${getStatusCfg(newer.status, { BORDER, PAGE_BG: 'transparent', TEXT_DIM, semantic, labels: strings.shared.statusShort }).label}`,
    )
  }
  if (calcOld.SIL !== calcNew.SIL) parts.push(strings.history.delta.silChange(calcOld.SIL, calcNew.SIL))
  if (Math.abs(calcOld.PFD_avg - calcNew.PFD_avg) > 1e-12) {
    parts.push(strings.history.delta.pfdChange(formatPFD(calcOld.PFD_avg), formatPFD(calcNew.PFD_avg)))
  }

  const compA = (older.snapshot.subsystems ?? []).reduce((n, s) => n + s.channels.reduce((m, c) => m + c.components.length, 0), 0)
  const compB = (newer.snapshot.subsystems ?? []).reduce((n, s) => n + s.channels.reduce((m, c) => m + c.components.length, 0), 0)
  if (compA !== compB) parts.push(strings.history.delta.componentDelta(compB - compA))
  if (older.snapshot.madeBy !== newer.snapshot.madeBy && newer.snapshot.madeBy) parts.push(strings.history.delta.writer(newer.snapshot.madeBy))

  if (parts.length === 0) {
    return <span className="text-[9px] italic" style={{ color: TEXT_DIM }}>{strings.history.delta.noChangeDetected}</span>
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {parts.map((part, index) => (
        <span key={`${part}-${index}`}>
          {index > 0 && <span style={{ color: TEXT_DIM }}> · </span>}
          <span className="text-[9px] font-semibold" style={{ color: '#60A5FA' }}>{part}</span>
        </span>
      ))}
    </div>
  )
}

export function SIFRevisionHistoryLedger({ sif }: { sif: SIF }) {
  const strings = useLocaleStrings(getSifOverviewStrings)
  const { BORDER, PAGE_BG, SURFACE, TEAL, TEAL_DIM, TEXT, TEXT_DIM } = usePrismTheme()
  const revisions = useAppStore(s => s.revisions[sif.id] ?? null)
  const fetchRevisions = useAppStore(s => s.fetchRevisions)
  const setSyncError = useAppStore(s => s.setSyncError)
  const [isLoading, setIsLoading] = useState(false)
  const [compareTarget, setCompareTarget] = useState<{ older: SIFRevision; newer: SIFRevision } | null>(null)

  useEffect(() => {
    if (revisions !== null) return
    setIsLoading(true)
    fetchRevisions(sif.id).finally(() => setIsLoading(false))
  }, [fetchRevisions, revisions, sif.id])

  const publishedRevisions = revisions ?? []
  const lastPublishedAt = publishedRevisions[0]?.createdAt ?? null
  const formatCompactDate = (value: string) => new Date(value).toLocaleDateString(strings.localeTag, { day: '2-digit', month: 'short', year: 'numeric' })

  const handleDownloadArtifact = async (revision: SIFRevision, kind: 'report' | 'prooftest') => {
    try {
      await downloadRevisionArtifact(kind === 'report' ? revision.reportArtifact : revision.proofTestArtifact)
    } catch (err: unknown) {
      setSyncError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <>
      <div id="sif-revision-history" className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border px-3 py-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
          <div className="min-w-0">
            <p className="text-xs font-semibold" style={{ color: TEXT }}>
              {sif.revisionLockedAt ? strings.history.summaryPublished(sif.revision) : strings.history.summaryWorking(sif.revision)}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
              {sif.revisionLockedAt
                ? strings.history.lastPublicationOn(new Date(sif.revisionLockedAt).toLocaleDateString(strings.localeTag))
                : strings.history.workingDescription}
            </p>
          </div>

          <div className="grid min-w-[220px] gap-2 sm:grid-cols-2">
            <div className="rounded-lg border px-3 py-2" style={{ borderColor: BORDER, background: SURFACE }}>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>{strings.history.snapshots}</p>
              <p className="mt-1 text-sm font-semibold font-mono" style={{ color: TEAL_DIM }}>{publishedRevisions.length}</p>
            </div>
            <div className="rounded-lg border px-3 py-2" style={{ borderColor: BORDER, background: SURFACE }}>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>{strings.history.lastPublication}</p>
              <p className="mt-1 text-sm font-semibold" style={{ color: lastPublishedAt ? TEXT : TEXT_DIM }}>
                {lastPublishedAt ? formatCompactDate(lastPublishedAt) : strings.history.none}
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border" style={{ borderColor: BORDER, background: SURFACE }}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] table-fixed border-collapse">
              <colgroup>
                <col style={{ width: '72px' }} />
                <col style={{ width: '96px' }} />
                <col style={{ width: '128px' }} />
                <col style={{ width: '152px' }} />
                <col style={{ width: 'auto' }} />
                <col style={{ width: '340px' }} />
              </colgroup>
              <thead>
                <tr className="border-b" style={{ borderColor: BORDER, background: PAGE_BG }}>
                  {Object.values(strings.history.tableHeaders).map(label => (
                    <th
                      key={label}
                      className="px-4 py-2 text-left text-[9px] font-bold uppercase tracking-widest whitespace-nowrap"
                      style={{ color: TEXT_DIM }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Loader2 size={12} className="animate-spin" style={{ color: TEAL }} />
                        <span className="text-[11px]" style={{ color: TEXT_DIM }}>{strings.history.loading}</span>
                      </div>
                    </td>
                  </tr>
                ) : publishedRevisions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-4 text-[11px] italic" style={{ color: TEXT_DIM }}>
                      {strings.history.empty}
                    </td>
                  </tr>
                ) : (
                  publishedRevisions.map((revision, index) => {
                    const previous = publishedRevisions[index + 1]
                    const isNewest = index === 0

                    return [
                      <tr
                        key={revision.id}
                        className="border-b"
                        style={{ borderColor: `${BORDER}66`, background: isNewest ? `${TEAL}06` : 'transparent' }}
                      >
                        <td className="px-4 py-2.5 align-top">
                          <span className="font-mono text-[11px] font-black" style={{ color: isNewest ? TEAL : TEXT }}>
                            {revision.revisionLabel}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 align-top"><StatusBadge status={revision.status} /></td>
                        <td className="px-4 py-2.5 align-top whitespace-nowrap text-[11px]" style={{ color: TEXT_DIM }}>
                          {formatCompactDate(revision.createdAt)}
                        </td>
                        <td className="px-4 py-2.5 align-top whitespace-nowrap text-[11px]" style={{ color: TEXT }}>
                          {revision.createdBy || '—'}
                        </td>
                        <td className="px-4 py-2.5 align-top text-[11px]" style={{ color: TEXT_DIM }}>
                          {revision.changeDescription || '—'}
                        </td>
                        <td className="px-4 py-2.5 align-top whitespace-nowrap">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => { void handleDownloadArtifact(revision, 'report') }}
                              disabled={revision.reportArtifact.status !== 'ready'}
                              className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] border transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                              style={{ borderColor: BORDER, color: TEXT_DIM }}
                              onMouseEnter={event => {
                                if (revision.reportArtifact.status !== 'ready') return
                                event.currentTarget.style.color = TEAL
                                event.currentTarget.style.borderColor = TEAL
                              }}
                              onMouseLeave={event => {
                                event.currentTarget.style.color = TEXT_DIM
                                event.currentTarget.style.borderColor = BORDER
                              }}
                            >
                              <Download size={10} />
                              {strings.history.buttons.reportPdf}
                            </button>

                            <button
                              type="button"
                              onClick={() => { void handleDownloadArtifact(revision, 'prooftest') }}
                              disabled={revision.proofTestArtifact.status !== 'ready'}
                              className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] border transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                              style={{ borderColor: BORDER, color: TEXT_DIM }}
                              onMouseEnter={event => {
                                if (revision.proofTestArtifact.status !== 'ready') return
                                event.currentTarget.style.color = TEAL
                                event.currentTarget.style.borderColor = TEAL
                              }}
                              onMouseLeave={event => {
                                event.currentTarget.style.color = TEXT_DIM
                                event.currentTarget.style.borderColor = BORDER
                              }}
                            >
                              <Download size={10} />
                              {strings.history.buttons.proofTestPdf}
                            </button>

                            {previous && (
                              <button
                                type="button"
                                onClick={() => setCompareTarget({ older: previous, newer: revision })}
                                className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] border transition-colors"
                                style={{ borderColor: BORDER, color: TEXT_DIM }}
                                onMouseEnter={event => {
                                  event.currentTarget.style.color = TEAL
                                  event.currentTarget.style.borderColor = TEAL
                                }}
                                onMouseLeave={event => {
                                  event.currentTarget.style.color = TEXT_DIM
                                  event.currentTarget.style.borderColor = BORDER
                                }}
                              >
                                <GitCompare size={10} />
                                {strings.history.buttons.compareWith(previous.revisionLabel)}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>,
                      previous ? (
                        <tr key={`${revision.id}-delta`} className="border-b" style={{ borderColor: `${BORDER}40`, background: PAGE_BG }}>
                          <td colSpan={6} className="px-4 py-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px]" style={{ color: TEXT_DIM }}>
                                {previous.revisionLabel} → {revision.revisionLabel}
                              </span>
                              <span style={{ color: BORDER }}>·</span>
                              <InlineDelta older={previous} newer={revision} />
                            </div>
                          </td>
                        </tr>
                      ) : null,
                    ]
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {compareTarget && (
        <SIFRevisionCompare
          older={compareTarget.older}
          newer={compareTarget.newer}
          onClose={() => setCompareTarget(null)}
        />
      )}
    </>
  )
}
