import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Clock3, FileWarning, ListChecks, ShieldAlert, SlidersHorizontal } from 'lucide-react'
import { useAppStore, type SIFTab } from '@/store/appStore'
import { IntercalaireCard, IntercalaireTabBar, useLayout } from '@/components/layout/SIFWorkbenchLayout'
import { calcSIF, formatPFD } from '@/core/math/pfdCalc'
import { cn } from '@/lib/utils'
import { usePrismTheme } from '@/styles/usePrismTheme'

type ReviewIssueType = 'sil_gap' | 'proof_test' | 'traceability'
type Severity = 'high' | 'medium' | 'low'

interface ReviewItem {
  id: string
  projectId: string
  sifId: string
  projectName: string
  sifNumber: string
  sifTitle: string
  type: ReviewIssueType
  severity: Severity
  score: number
  message: string
  actionTab: SIFTab
  targetSIL: number
  achievedSIL: number
  pfd: number
}

function severityScore(sev: Severity): number {
  if (sev === 'high') return 100
  if (sev === 'medium') return 60
  return 30
}

function severityLabel(sev: Severity): string {
  if (sev === 'high') return 'High'
  if (sev === 'medium') return 'Medium'
  return 'Low'
}

function issueLabel(type: ReviewIssueType): string {
  if (type === 'sil_gap') return 'SIL gap'
  if (type === 'proof_test') return 'Proof test'
  return 'Traceability'
}

const REVIEW_RIGHT_TABS = [
  { id: 'filters' as const, label: 'Filters', Icon: SlidersHorizontal },
  { id: 'details' as const, label: 'Details', Icon: FileWarning },
]

function ReviewQueueRightPanel({
  total,
  filtered,
  highCount,
  mediumCount,
  lowCount,
  severityFilter,
  typeFilter,
  selected,
  setSeverityFilter,
  setTypeFilter,
  onOpenSelected,
}: {
  total: number
  filtered: number
  highCount: number
  mediumCount: number
  lowCount: number
  severityFilter: 'all' | Severity
  typeFilter: 'all' | ReviewIssueType
  selected: ReviewItem | null
  setSeverityFilter: (next: 'all' | Severity) => void
  setTypeFilter: (next: 'all' | ReviewIssueType) => void
  onOpenSelected: () => void
}) {
  const { BORDER, CARD_BG, PAGE_BG, PANEL_BG, SHADOW_PANEL, SHADOW_SOFT, TEAL, TEXT, TEXT_DIM, isDark } = usePrismTheme()
  const [activeTab, setActiveTab] = useState<'filters' | 'details'>('filters')
  const activeIdx = REVIEW_RIGHT_TABS.findIndex(t => t.id === activeTab)

  return (
    <div className="flex h-full flex-col overflow-hidden border-l" style={{ borderColor: BORDER, background: PANEL_BG }}>
      <div className="px-3 pt-3 shrink-0">
        <IntercalaireTabBar tabs={REVIEW_RIGHT_TABS} active={activeTab} onSelect={setActiveTab} cardBg={CARD_BG} />
      </div>

      <div className="px-3 pb-3 flex-1 overflow-y-auto">
        <IntercalaireCard tabCount={REVIEW_RIGHT_TABS.length} activeIdx={activeIdx} className="p-3 space-y-3">
          {activeTab === 'filters' && (
            <>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Review Queue</p>
                <p className="text-xs mt-1" style={{ color: TEXT }}>{filtered}/{total} items</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded border px-2 py-1.5" style={{ borderColor: '#7F1D1D', background: '#7F1D1D20' }}>
                  <p className="text-[9px] uppercase" style={{ color: '#FCA5A5' }}>High</p>
                  <p className="text-sm font-bold" style={{ color: '#F87171' }}>{highCount}</p>
                </div>
                <div className="rounded border px-2 py-1.5" style={{ borderColor: '#92400E', background: '#92400E20' }}>
                  <p className="text-[9px] uppercase" style={{ color: '#FCD34D' }}>Medium</p>
                  <p className="text-sm font-bold" style={{ color: '#F59E0B' }}>{mediumCount}</p>
                </div>
                <div className="rounded border px-2 py-1.5" style={{ borderColor: '#1E3A8A', background: '#1E3A8A20' }}>
                  <p className="text-[9px] uppercase" style={{ color: '#93C5FD' }}>Low</p>
                  <p className="text-sm font-bold" style={{ color: '#60A5FA' }}>{lowCount}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: TEXT_DIM }}>Severity</p>
                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value as 'all' | Severity)}
                    className="h-8 w-full rounded-lg border px-2 text-xs outline-none"
                    style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT }}
                  >
                    <option value="all">All severities</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: TEXT_DIM }}>Type</p>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as 'all' | ReviewIssueType)}
                    className="h-8 w-full rounded-lg border px-2 text-xs outline-none"
                    style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT }}
                  >
                    <option value="all">All issue types</option>
                    <option value="sil_gap">SIL gap</option>
                    <option value="proof_test">Proof test</option>
                    <option value="traceability">Traceability</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {activeTab === 'details' && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Selected Item</p>
              {selected ? (
                <div className="space-y-3 rounded-xl border p-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: TEXT }}>{selected.sifNumber}</p>
                    <p className="text-[11px]" style={{ color: TEXT_DIM }}>{selected.projectName}</p>
                  </div>
                  <div className="rounded border px-2 py-2" style={{ borderColor: BORDER, background: CARD_BG }}>
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: TEXT_DIM }}>
                      {issueLabel(selected.type)} · {severityLabel(selected.severity)}
                    </p>
                    <p className="mt-1 text-xs" style={{ color: TEXT }}>{selected.message}</p>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenSelected}
                    className="w-full rounded-lg px-3 py-2 text-xs font-bold"
                    style={{ background: 'linear-gradient(135deg, #009BA4, #007A82)', color: '#fff' }}
                  >
                    Open in dashboard
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border px-3 py-4 text-xs" style={{ borderColor: BORDER, color: TEXT_DIM, background: PAGE_BG }}>
                  Select an item to inspect details.
                </div>
              )}
            </>
          )}
        </IntercalaireCard>
      </div>
    </div>
  )
}

export function ReviewQueueWorkspace() {
  const { BORDER, CARD_BG, PAGE_BG, PANEL_BG, SHADOW_PANEL, SHADOW_SOFT, TEAL, TEXT, TEXT_DIM, isDark } = usePrismTheme()
  const projects = useAppStore(s => s.projects)
  const navigate = useAppStore(s => s.navigate)
  const { setRightPanelOverride } = useLayout()

  const [severityFilter, setSeverityFilter] = useState<'all' | Severity>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | ReviewIssueType>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const items = useMemo<ReviewItem[]>(() => {
    const now = Date.now()
    const dayMs = 24 * 60 * 60 * 1000
    const next: ReviewItem[] = []

    projects.forEach(project => {
      project.sifs.forEach(sif => {
        const result = calcSIF(sif)
        const base = {
          projectId: project.id,
          sifId: sif.id,
          projectName: project.name,
          sifNumber: sif.sifNumber,
          sifTitle: sif.title || sif.description || '',
          targetSIL: sif.targetSIL,
          achievedSIL: result.SIL,
          pfd: result.PFD_avg,
        }

        if (!result.meetsTarget) {
          next.push({
            ...base,
            id: `${project.id}-${sif.id}-sil`,
            type: 'sil_gap',
            severity: 'high',
            score: severityScore('high') + Math.max(0, (sif.targetSIL - result.SIL) * 8),
            message: `Achieved SIL ${result.SIL}, target SIL ${sif.targetSIL}. Current PFDavg: ${formatPFD(result.PFD_avg)}.`,
            actionTab: 'verification',
          })
        }

        const campaigns = [...(sif.testCampaigns ?? [])].sort((a, b) => b.date.localeCompare(a.date))
        const periodMonths = sif.proofTestProcedure?.periodicityMonths ?? 12
        if (campaigns.length === 0) {
          next.push({
            ...base,
            id: `${project.id}-${sif.id}-proof-missing`,
            type: 'proof_test',
            severity: 'medium',
            score: severityScore('medium') + 8,
            message: 'No proof test campaign recorded yet.',
            actionTab: 'exploitation',
          })
        } else {
          const last = campaigns[0]
          const lastDateMs = new Date(last.date).getTime()
          if (!Number.isNaN(lastDateMs)) {
            const nextDue = lastDateMs + periodMonths * 30.44 * dayMs
            const overdueDays = Math.floor((now - nextDue) / dayMs)
            if (overdueDays > 0) {
              const sev: Severity = overdueDays > 30 ? 'high' : 'medium'
              next.push({
                ...base,
                id: `${project.id}-${sif.id}-proof-overdue`,
                type: 'proof_test',
                severity: sev,
                score: severityScore(sev) + Math.min(40, overdueDays / 2),
                message: `Proof test overdue by ${overdueDays} day(s). Last campaign: ${last.date}.`,
                actionTab: 'exploitation',
              })
            }
          }
        }

        const requiredFields = [
          sif.pid,
          sif.location,
          sif.processTag,
          sif.hazardousEvent,
          sif.madeBy,
          sif.verifiedBy,
          sif.approvedBy,
          sif.hazopTrace?.hazopNode,
          sif.hazopTrace?.scenarioId,
          sif.hazopTrace?.lopaRef,
        ]
        const missing = requiredFields.filter(v => !v || !String(v).trim()).length
        if (missing >= 3) {
          const sev: Severity = missing >= 6 ? 'high' : 'medium'
          next.push({
            ...base,
            id: `${project.id}-${sif.id}-trace`,
            type: 'traceability',
            severity: sev,
            score: severityScore(sev) + missing,
            message: `${missing} mandatory traceability fields are missing.`,
            actionTab: 'context',
          })
        }
      })
    })

    return next.sort((a, b) => b.score - a.score)
  }, [projects])

  const filteredItems = useMemo(
    () =>
      items.filter(item => {
        if (severityFilter !== 'all' && item.severity !== severityFilter) return false
        if (typeFilter !== 'all' && item.type !== typeFilter) return false
        return true
      }),
    [items, severityFilter, typeFilter],
  )

  useEffect(() => {
    if (!filteredItems.length) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !filteredItems.some(i => i.id === selectedId)) {
      setSelectedId(filteredItems[0].id)
    }
  }, [filteredItems, selectedId])

  const selected = filteredItems.find(i => i.id === selectedId) ?? null

  const openSelected = useCallback(() => {
    if (!selected) return
    navigate({
      type: 'sif-dashboard',
      projectId: selected.projectId,
      sifId: selected.sifId,
      tab: selected.actionTab,
    })
  }, [navigate, selected])

  const highCount = items.filter(i => i.severity === 'high').length
  const mediumCount = items.filter(i => i.severity === 'medium').length
  const lowCount = items.filter(i => i.severity === 'low').length

  useEffect(() => {
    setRightPanelOverride(
      <ReviewQueueRightPanel
        total={items.length}
        filtered={filteredItems.length}
        highCount={highCount}
        mediumCount={mediumCount}
        lowCount={lowCount}
        severityFilter={severityFilter}
        typeFilter={typeFilter}
        selected={selected}
        setSeverityFilter={setSeverityFilter}
        setTypeFilter={setTypeFilter}
        onOpenSelected={openSelected}
      />,
    )
    return () => setRightPanelOverride(null)
  }, [
    filteredItems.length,
    highCount,
    items.length,
    lowCount,
    mediumCount,
    openSelected,
    selected,
    setRightPanelOverride,
    severityFilter,
    typeFilter,
  ])

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden" style={{ background: PAGE_BG }}>
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: BORDER, background: PANEL_BG }}>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${TEAL}20`, border: `1px solid ${TEAL}30` }}>
            <ListChecks size={15} style={{ color: TEAL }} />
          </div>
          <div>
            <h1 className="text-sm font-black" style={{ color: TEXT }}>Review Queue</h1>
            <p className="text-[10px]" style={{ color: TEXT_DIM }}>
              {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} filtré{filteredItems.length !== 1 ? 's' : ''} · {items.length} total
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border px-3 h-8 text-xs" style={{ borderColor: BORDER, background: CARD_BG, color: TEXT_DIM }}>
          <span>High: {highCount}</span>
          <span>·</span>
          <span>Medium: {mediumCount}</span>
          <span>·</span>
          <span>Low: {lowCount}</span>
        </div>
      </div>
      <div className="flex-1 overflow-auto min-h-0">
        {filteredItems.length === 0 ? (
          <div
            className="mx-6 my-4 flex min-h-[220px] items-center justify-center rounded-xl border"
            style={{
              borderColor: BORDER,
              background: PAGE_BG,
              boxShadow: SHADOW_SOFT,
            }}
          >
            <p className="text-sm" style={{ color: TEXT_DIM }}>No items match current filters.</p>
          </div>
        ) : (
          <div
            className="mx-6 my-4 overflow-hidden rounded-2xl border"
            style={{
              borderColor: BORDER,
              background: CARD_BG,
              boxShadow: SHADOW_PANEL,
            }}
          >
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: BORDER, background: PAGE_BG }}>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Priority</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Issue</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>SIF</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Snapshot</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => {
                  const active = item.id === selectedId
                  return (
                    <tr
                      key={item.id}
                      className="cursor-pointer border-b last:border-b-0"
                      style={{
                        borderColor: BORDER,
                        background: active ? (isDark ? '#1E2A33' : `${TEAL}10`) : 'transparent',
                      }}
                      onMouseEnter={e => {
                        if (!active) e.currentTarget.style.background = isDark ? '#1D232A' : `${PAGE_BG}`
                      }}
                      onMouseLeave={e => {
                        if (!active) e.currentTarget.style.background = 'transparent'
                      }}
                      onClick={() => setSelectedId(item.id)}
                    >
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold',
                            item.severity === 'high' && 'border-red-400/40 bg-red-500/10 text-red-300',
                            item.severity === 'medium' && 'border-amber-400/40 bg-amber-500/10 text-amber-300',
                            item.severity === 'low' && 'border-blue-400/40 bg-blue-500/10 text-blue-300',
                          )}
                        >
                          {item.severity === 'high' && <AlertTriangle size={11} />}
                          {item.severity === 'medium' && <Clock3 size={11} />}
                          {item.severity === 'low' && <FileWarning size={11} />}
                          {severityLabel(item.severity)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {item.type === 'sil_gap' && <ShieldAlert size={13} className="text-red-400" />}
                          {item.type === 'proof_test' && <Clock3 size={13} className="text-amber-400" />}
                          {item.type === 'traceability' && <FileWarning size={13} className="text-blue-400" />}
                          <div>
                            <p className="text-sm font-semibold" style={{ color: TEXT }}>{issueLabel(item.type)}</p>
                            <p className="text-xs" style={{ color: TEXT_DIM }}>{item.message}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold" style={{ color: '#DFE8F1' }}>{item.sifNumber}</p>
                        <p className="text-xs" style={{ color: '#8FA0B1' }}>{item.projectName}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-mono" style={{ color: '#8FA0B1' }}>
                          SIL {item.achievedSIL} / Target {item.targetSIL}
                        </p>
                        <p className="text-xs font-mono" style={{ color: '#8FA0B1' }}>PFDavg {formatPFD(item.pfd)}</p>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
