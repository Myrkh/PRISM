import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Clock3, FileClock, History, Info, Search, SlidersHorizontal } from 'lucide-react'
import { useAppStore, type SIFTab } from '@/store/appStore'
import { IntercalaireCard, IntercalaireTabBar, useLayout } from '@/components/layout/SIFWorkbenchLayout'
import { cn } from '@/lib/utils'
import { BORDER, CARD_BG, PAGE_BG, PANEL_BG, TEAL, TEXT, TEXT_DIM } from '@/styles/tokens'

type AuditLevel = 'info' | 'warning'

interface AuditEntry {
  id: string
  level: AuditLevel
  timestamp: string
  action: string
  details: string
  actor: string
  projectName: string
  projectId?: string
  sifNumber?: string
  sifId?: string
  actionTab?: SIFTab
}

function formatWhen(ts: string): string {
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ts
  return d.toLocaleString()
}

const AUDIT_RIGHT_TABS = [
  { id: 'filters' as const, label: 'Filters', Icon: SlidersHorizontal },
  { id: 'details' as const, label: 'Details', Icon: FileClock },
]

function AuditLogRightPanel({
  query,
  levelFilter,
  total,
  filtered,
  warningCount,
  selected,
  setQuery,
  setLevelFilter,
  onOpenSelected,
}: {
  query: string
  levelFilter: 'all' | AuditLevel
  total: number
  filtered: number
  warningCount: number
  selected: AuditEntry | null
  setQuery: (next: string) => void
  setLevelFilter: (next: 'all' | AuditLevel) => void
  onOpenSelected: () => void
}) {
  const [activeTab, setActiveTab] = useState<'filters' | 'details'>('filters')
  const activeIdx = AUDIT_RIGHT_TABS.findIndex(t => t.id === activeTab)

  return (
    <div className="flex h-full flex-col overflow-hidden border-l" style={{ borderColor: '#2A3138', background: '#14181C' }}>
      <div className="px-3 pt-3 shrink-0">
        <IntercalaireTabBar tabs={AUDIT_RIGHT_TABS} active={activeTab} onSelect={setActiveTab} cardBg="#23292F" />
      </div>

      <div className="px-3 pb-3 flex-1 overflow-y-auto">
        <IntercalaireCard tabCount={AUDIT_RIGHT_TABS.length} activeIdx={activeIdx} className="p-3 space-y-3">
          {activeTab === 'filters' && (
            <>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#8FA0B1' }}>Audit Log</p>
                <p className="text-xs mt-1" style={{ color: '#DFE8F1' }}>{filtered}/{total} events</p>
              </div>
              <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#8FA0B1' }}>Search</label>
              <div className="flex h-8 items-center gap-2 rounded-lg border px-2" style={{ borderColor: '#2A3138', background: '#1D232A' }}>
                <Search size={13} style={{ color: '#8FA0B1' }} />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="project, sif, action..."
                  className="w-full bg-transparent text-xs outline-none"
                  style={{ color: '#DFE8F1' }}
                />
              </div>

              <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#8FA0B1' }}>Level</label>
              <select
                value={levelFilter}
                onChange={e => setLevelFilter(e.target.value as 'all' | AuditLevel)}
                className="h-8 w-full rounded-lg border bg-[#1D232A] px-2 text-xs outline-none"
                style={{ borderColor: '#2A3138', color: '#DFE8F1' }}
              >
                <option value="all">All levels</option>
                <option value="warning">Warnings</option>
                <option value="info">Info</option>
              </select>

              <div className="rounded-lg border px-2 py-2 text-xs" style={{ borderColor: '#2A3138', background: '#1D232A', color: '#8FA0B1' }}>
                Warning events: <span style={{ color: '#F59E0B' }}>{warningCount}</span>
              </div>
            </>
          )}

          {activeTab === 'details' && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#8FA0B1' }}>Selected Event</p>
              {selected ? (
                <div className="space-y-3 rounded-xl border p-3" style={{ borderColor: '#2A3138', background: '#1D232A' }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#DFE8F1' }}>{selected.action}</p>
                    <p className="text-xs" style={{ color: '#8FA0B1' }}>{formatWhen(selected.timestamp)}</p>
                  </div>
                  <div className="rounded border px-2 py-2" style={{ borderColor: '#2A3138', background: '#14181C' }}>
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: '#8FA0B1' }}>Scope</p>
                    <p className="text-xs mt-1" style={{ color: '#DFE8F1' }}>
                      {selected.projectName}{selected.sifNumber ? ` · ${selected.sifNumber}` : ''}
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#8FA0B1' }}>{selected.details}</p>
                  </div>
                  <div className="text-[11px]" style={{ color: '#8FA0B1' }}>
                    Actor: <span style={{ color: '#DFE8F1' }}>{selected.actor || 'System'}</span>
                  </div>
                  {!!selected.sifId && (
                    <button
                      type="button"
                      onClick={onOpenSelected}
                      className="w-full rounded-lg px-3 py-2 text-xs font-bold"
                      style={{ background: 'linear-gradient(135deg, #009BA4, #007A82)', color: '#fff' }}
                    >
                      Open related SIF
                    </button>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border px-3 py-4 text-xs" style={{ borderColor: '#2A3138', color: '#8FA0B1' }}>
                  Select an event for details.
                </div>
              )}
            </>
          )}
        </IntercalaireCard>
      </div>
    </div>
  )
}

export function AuditLogWorkspace() {
  const projects = useAppStore(s => s.projects)
  const navigate = useAppStore(s => s.navigate)
  const { setRightPanelOverride } = useLayout()

  const [query, setQuery] = useState('')
  const [levelFilter, setLevelFilter] = useState<'all' | AuditLevel>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const entries = useMemo<AuditEntry[]>(() => {
    const list: AuditEntry[] = []

    projects.forEach(project => {
      list.push({
        id: `project-created-${project.id}`,
        level: 'info',
        timestamp: project.createdAt,
        action: 'Project created',
        details: `Project "${project.name}" initialized.`,
        actor: 'System',
        projectName: project.name,
        projectId: project.id,
      })

      if (project.updatedAt && project.updatedAt !== project.createdAt) {
        list.push({
          id: `project-updated-${project.id}-${project.updatedAt}`,
          level: 'info',
          timestamp: project.updatedAt,
          action: 'Project updated',
          details: `Project "${project.name}" metadata updated.`,
          actor: 'System',
          projectName: project.name,
          projectId: project.id,
        })
      }

      project.sifs.forEach(sif => {
        if (sif.date) {
          list.push({
            id: `sif-date-${project.id}-${sif.id}-${sif.date}`,
            level: 'info',
            timestamp: sif.date,
            action: 'SIF record updated',
            details: 'SIF record date changed/confirmed.',
            actor: sif.madeBy || 'System',
            projectName: project.name,
            projectId: project.id,
            sifNumber: sif.sifNumber,
            sifId: sif.id,
            actionTab: 'cockpit',
          })
        }

        if (sif.status !== 'draft') {
          list.push({
            id: `sif-status-${project.id}-${sif.id}-${sif.status}`,
            level: 'info',
            timestamp: project.updatedAt,
            action: `SIF status: ${sif.status}`,
            details: `Status transition to ${sif.status}.`,
            actor: sif.verifiedBy || sif.approvedBy || 'System',
            projectName: project.name,
            projectId: project.id,
            sifNumber: sif.sifNumber,
            sifId: sif.id,
            actionTab: 'cockpit',
          })
        }

        ;(sif.testCampaigns ?? []).forEach(campaign => {
          list.push({
            id: `campaign-${project.id}-${sif.id}-${campaign.id}`,
            level: campaign.verdict === 'fail' || campaign.verdict === 'conditional' ? 'warning' : 'info',
            timestamp: campaign.date,
            action: `Proof test campaign (${campaign.verdict})`,
            details: campaign.notes || 'Campaign recorded.',
            actor: campaign.conductedBy || campaign.reviewedBy || 'System',
            projectName: project.name,
            projectId: project.id,
            sifNumber: sif.sifNumber,
            sifId: sif.id,
            actionTab: 'exploitation',
          })
        })

        ;(sif.operationalEvents ?? []).forEach(event => {
          const warning = event.impact === 'negative' || event.type === 'fault_detected'
          list.push({
            id: `event-${project.id}-${sif.id}-${event.id}`,
            level: warning ? 'warning' : 'info',
            timestamp: event.date,
            action: `Operational event: ${event.type}`,
            details: event.description || 'Field operational event.',
            actor: 'System',
            projectName: project.name,
            projectId: project.id,
            sifNumber: sif.sifNumber,
            sifId: sif.id,
            actionTab: 'exploitation',
          })
        })
      })
    })

    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [projects])

  const filteredEntries = useMemo(() => {
    const q = query.trim().toLowerCase()
    return entries.filter(entry => {
      if (levelFilter !== 'all' && entry.level !== levelFilter) return false
      if (!q) return true
      const haystack = `${entry.action} ${entry.details} ${entry.projectName} ${entry.sifNumber ?? ''}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [entries, levelFilter, query])

  useEffect(() => {
    if (!filteredEntries.length) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !filteredEntries.some(e => e.id === selectedId)) {
      setSelectedId(filteredEntries[0].id)
    }
  }, [filteredEntries, selectedId])

  const selected = filteredEntries.find(e => e.id === selectedId) ?? null
  const warningCount = entries.filter(e => e.level === 'warning').length

  const openSelected = useCallback(() => {
    if (!selected?.projectId || !selected?.sifId) return
    navigate({
      type: 'sif-dashboard',
      projectId: selected.projectId,
      sifId: selected.sifId,
      tab: selected.actionTab ?? 'cockpit',
    })
  }, [navigate, selected])

  useEffect(() => {
    setRightPanelOverride(
      <AuditLogRightPanel
        query={query}
        levelFilter={levelFilter}
        total={entries.length}
        filtered={filteredEntries.length}
        warningCount={warningCount}
        selected={selected}
        setQuery={setQuery}
        setLevelFilter={setLevelFilter}
        onOpenSelected={openSelected}
      />,
    )
    return () => setRightPanelOverride(null)
  }, [entries.length, filteredEntries.length, levelFilter, openSelected, query, selected, setRightPanelOverride, warningCount])

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden" style={{ background: PAGE_BG }}>
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: BORDER, background: PANEL_BG }}>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${TEAL}20`, border: `1px solid ${TEAL}30` }}>
            <History size={15} style={{ color: TEAL }} />
          </div>
          <div>
            <h1 className="text-sm font-black" style={{ color: TEXT }}>Audit Log</h1>
            <p className="text-[10px]" style={{ color: TEXT_DIM }}>
              {filteredEntries.length} event{filteredEntries.length !== 1 ? 's' : ''} filtré{filteredEntries.length !== 1 ? 's' : ''} · {entries.length} total
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border px-3 h-8 text-xs" style={{ borderColor: BORDER, background: CARD_BG, color: TEXT_DIM }}>
          <span>Warnings: {warningCount}</span>
          <span>·</span>
          <span>Info: {entries.length - warningCount}</span>
        </div>
      </div>
      <div className="flex-1 overflow-auto min-h-0">
        {filteredEntries.length === 0 ? (
          <div className="flex min-h-[220px] items-center justify-center rounded-xl border mx-6 my-4" style={{ borderColor: '#2A3138', background: '#14181C' }}>
            <p className="text-sm" style={{ color: '#8FA0B1' }}>No events match current filters.</p>
          </div>
        ) : (
          <div className="mx-6 my-4 overflow-hidden rounded-2xl border" style={{ borderColor: '#2A3138', background: '#14181C' }}>
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: '#2A3138', background: '#1D232A' }}>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: '#8FA0B1' }}>Level</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: '#8FA0B1' }}>Timestamp</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: '#8FA0B1' }}>Action</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: '#8FA0B1' }}>Scope</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map(entry => {
                  const active = entry.id === selectedId
                  return (
                    <tr
                      key={entry.id}
                      className={cn('cursor-pointer border-b last:border-b-0', active ? 'bg-[#1E2A33]' : 'hover:bg-[#1D232A]')}
                      style={{ borderColor: '#2A3138' }}
                      onClick={() => setSelectedId(entry.id)}
                    >
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold',
                            entry.level === 'warning'
                              ? 'border-amber-400/40 bg-amber-500/10 text-amber-300'
                              : 'border-blue-400/40 bg-blue-500/10 text-blue-300',
                          )}
                        >
                          {entry.level === 'warning' ? <AlertTriangle size={11} /> : <Info size={11} />}
                          {entry.level === 'warning' ? 'Warning' : 'Info'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-xs" style={{ color: '#8FA0B1' }}>
                          <Clock3 size={12} />
                          {formatWhen(entry.timestamp)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold" style={{ color: '#DFE8F1' }}>{entry.action}</p>
                        <p className="text-xs" style={{ color: '#8FA0B1' }}>{entry.details}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileClock size={12} style={{ color: '#8FA0B1' }} />
                          <p className="text-xs" style={{ color: '#8FA0B1' }}>
                            {entry.projectName}{entry.sifNumber ? ` · ${entry.sifNumber}` : ''}
                          </p>
                        </div>
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
