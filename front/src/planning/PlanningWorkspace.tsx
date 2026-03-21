/**
 * planning/PlanningWorkspace.tsx — PRISM
 *
 * Vue principale du module Planning : calendrier mensuel interactif.
 * DA : grille mensuelle style Google Calendar / Linear,
 * avec tokens PRISM, events colorés par statut, ghost events T1.
 */
import { useMemo, useState, useCallback } from 'react'
import {
  ChevronLeft, ChevronRight, CalendarDays,
  Plus, Calendar, List, AlertTriangle,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { usePrismTheme } from '@/styles/usePrismTheme'
import {
  usePlanningNavigation,
  CAMPAIGN_STATUS_META, MONTH_NAMES_FR, DAY_NAMES_SHORT,
  buildCalendarGrid, toDateStr, formatDateFr,
  type PlanningCampaign, type DeadlineGhost,
} from './PlanningNavigation'
import { loadSIFAnalysisSettings } from '@/core/models/analysisSettings'

// ─── Hook: build campaigns from store ─────────────────────────────────────

export function usePlanningData(): {
  campaigns: PlanningCampaign[]
  deadlines: DeadlineGhost[]
} {
  const projects = useAppStore(s => s.projects)

  const campaigns = useMemo<PlanningCampaign[]>(() => {
    const result: PlanningCampaign[] = []
    const now = new Date()

    projects.forEach(project => {
      project.sifs.forEach(sif => {
        ;(sif.testCampaigns ?? []).forEach(campaign => {
          const startDate = campaign.date
          const endDate   = campaign.date
          const start     = new Date(startDate)

          let status: PlanningCampaign['status']
          if (campaign.verdict === 'pass' || campaign.verdict === 'fail' || campaign.verdict === 'conditional') {
            status = 'completed'
          } else if (start <= now) {
            status = start.toDateString() === now.toDateString() ? 'in_progress' : 'overdue'
          } else {
            status = 'planned'
          }

          const existing = result.find(c =>
            c.title === `Campagne ${campaign.date}` && c.projectId === project.id && c.startDate === startDate,
          )

          if (existing) {
            if (!existing.sifIds.includes(sif.id)) {
              existing.sifIds.push(sif.id)
              existing.sifLabels.push(sif.sifNumber)
            }
          } else {
            result.push({
              id:          campaign.id,
              title:       campaign.team ? `Campagne — ${campaign.team}` : `Campagne ${formatDateFr(startDate)}`,
              projectId:   project.id,
              projectName: project.name,
              sifIds:      [sif.id],
              sifLabels:   [sif.sifNumber],
              startDate,
              endDate,
              status,
              team: campaign.team ? campaign.team.split(',').map(s => s.trim()).filter(Boolean) : [],
              notes: campaign.notes ?? '',
              verdicts: { [sif.id]: campaign.verdict ?? null },
            })
          }
        })
      })
    })

    return result
  }, [projects])

  const deadlines = useMemo<DeadlineGhost[]>(() => {
    const result: DeadlineGhost[] = []
    const now = new Date()

    projects.forEach(project => {
      project.sifs.forEach(sif => {
        if (sif.status === 'archived') return
        const settings  = loadSIFAnalysisSettings(sif.id)
        const periodicity = settings?.general?.periodicityMonths ?? 12

        // Dernière campagne
        const sorted = [...(sif.testCampaigns ?? [])].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        )
        const lastDate = sorted[0] ? new Date(sorted[0].date) : null
        const dueDate  = lastDate
          ? new Date(lastDate.getFullYear(), lastDate.getMonth() + periodicity, lastDate.getDate())
          : new Date(now.getFullYear(), now.getMonth() + 3, 1)

        const daysRemaining = Math.round((dueDate.getTime() - now.getTime()) / 86400000)

        result.push({
          id:            `ghost-${sif.id}`,
          sifId:         sif.id,
          sifNumber:     sif.sifNumber,
          projectName:   project.name,
          dueDate:       toDateStr(dueDate),
          daysRemaining,
          overdue:       daysRemaining < 0,
        })
      })
    })

    return result
  }, [projects])

  return { campaigns, deadlines }
}

// ─── Event pill ───────────────────────────────────────────────────────────

interface EventPillProps {
  campaign:   PlanningCampaign
  compact?:   boolean
  selected:   boolean
  onClick:    (id: string) => void
}

function EventPill({ campaign, compact, selected, onClick }: EventPillProps) {
  const meta = CAMPAIGN_STATUS_META[campaign.status]
  const [hovered, setHovered] = useState(false)

  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onClick(campaign.id) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full text-left rounded-md px-1.5 py-0.5 transition-all duration-100"
      style={{
        background: selected ? meta.color : hovered ? `${meta.color}28` : `${meta.color}18`,
        border: `1px solid ${selected ? 'transparent' : `${meta.color}35`}`,
        transform: hovered ? 'translateY(-0.5px)' : 'none',
      }}
    >
      <p
        className="truncate font-semibold leading-tight"
        style={{
          fontSize: compact ? 9 : 10,
          color: selected ? '#fff' : meta.color,
        }}
      >
        {campaign.title}
      </p>
      {!compact && campaign.sifLabels.length > 0 && (
        <p
          className="truncate leading-tight mt-0.5"
          style={{ fontSize: 9, color: selected ? 'rgba(255,255,255,0.75)' : meta.color, opacity: 0.8 }}
        >
          {campaign.sifLabels.slice(0, 3).join(' · ')}
          {campaign.sifLabels.length > 3 && ` +${campaign.sifLabels.length - 3}`}
        </p>
      )}
    </button>
  )
}

// ─── Ghost deadline pill ──────────────────────────────────────────────────

function GhostPill({ deadline }: { deadline: DeadlineGhost }) {
  const { TEXT_DIM, semantic } = usePrismTheme()
  const color = deadline.overdue ? semantic.error : deadline.daysRemaining <= 30 ? semantic.warning : TEXT_DIM

  return (
    <div
      className="w-full rounded-md px-1.5 py-0.5"
      style={{
        background: `${color}10`,
        border: `1px dashed ${color}35`,
      }}
    >
      <p className="truncate text-[9px] font-medium" style={{ color }}>
        ⚠ {deadline.sifNumber}
      </p>
    </div>
  )
}

// ─── Day cell ─────────────────────────────────────────────────────────────

interface DayCellProps {
  dateStr:      string
  dayNumber:    number
  isCurrentMonth: boolean
  isToday:      boolean
  campaigns:    PlanningCampaign[]
  deadlines:    DeadlineGhost[]
  selectedId:   string | null
  onDayClick:   (dateStr: string) => void
  onEventClick: (id: string) => void
}

function DayCell({
  dateStr, dayNumber, isCurrentMonth, isToday,
  campaigns, deadlines, selectedId, onDayClick, onEventClick,
}: DayCellProps) {
  const { BORDER, CARD_BG, PAGE_BG, TEXT, TEXT_DIM, TEAL, isDark } = usePrismTheme()
  const [hovered, setHovered] = useState(false)

  const MAX_VISIBLE = 3
  const allEvents  = campaigns.length + deadlines.length
  const overflow   = allEvents - MAX_VISIBLE

  const visibleCampaigns = campaigns.slice(0, MAX_VISIBLE)
  const visibleDeadlines = deadlines.slice(0, Math.max(0, MAX_VISIBLE - campaigns.length))

  return (
    <div
      onClick={() => isCurrentMonth && onDayClick(dateStr)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex flex-col border-r border-b overflow-hidden cursor-pointer transition-colors duration-100 group"
      style={{
        minHeight: 96,
        borderColor: BORDER,
        background: isToday
          ? (isDark ? '#009BA408' : '#009BA405')
          : hovered && isCurrentMonth
            ? (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.012)')
            : CARD_BG,
        opacity: isCurrentMonth ? 1 : 0.38,
      }}
    >
      {/* Day number */}
      <div className="flex items-center justify-between px-2 pt-1.5 pb-1">
        <span
          className="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold leading-none transition-all"
          style={{
            background: isToday ? TEAL : 'transparent',
            color: isToday ? '#fff' : isCurrentMonth ? TEXT : TEXT_DIM,
            fontWeight: isToday ? 700 : isCurrentMonth ? 500 : 400,
          }}
        >
          {dayNumber}
        </span>

        {/* "+" au hover */}
        {isCurrentMonth && hovered && (
          <Plus size={10} style={{ color: TEXT_DIM }} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>

      {/* Events */}
      <div className="flex flex-col gap-0.5 px-1 pb-1 min-h-0">
        {visibleCampaigns.map(c => (
          <EventPill
            key={c.id}
            campaign={c}
            compact={allEvents > 2}
            selected={selectedId === c.id}
            onClick={onEventClick}
          />
        ))}
        {visibleDeadlines.map(dl => (
          <GhostPill key={dl.id} deadline={dl} />
        ))}
        {overflow > 0 && (
          <p className="text-[9px] px-1.5 font-medium" style={{ color: TEXT_DIM }}>
            +{overflow} autre{overflow > 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Agenda view ──────────────────────────────────────────────────────────

function AgendaView({
  campaigns, selectedId, onEventClick,
}: {
  campaigns: PlanningCampaign[]
  selectedId: string | null
  onEventClick: (id: string) => void
}) {
  const { BORDER, CARD_BG, PAGE_BG, TEXT, TEXT_DIM, TEAL } = usePrismTheme()

  const grouped = useMemo(() => {
    const map = new Map<string, PlanningCampaign[]>()
    const sorted = [...campaigns].sort((a, b) => a.startDate.localeCompare(b.startDate))
    sorted.forEach(c => {
      const key = c.startDate
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(c)
    })
    return Array.from(map.entries())
  }, [campaigns])

  if (grouped.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <CalendarDays size={32} style={{ color: `${TEAL}40` }} strokeWidth={1.5} />
        <p className="text-[13px]" style={{ color: TEXT_DIM }}>Aucune campagne planifiée</p>
      </div>
    )
  }

  return (
    <div className="overflow-y-auto h-full px-6 py-4 space-y-5" style={{ scrollbarGutter: 'stable' }}>
      {grouped.map(([date, items]) => (
        <div key={date}>
          <div className="flex items-center gap-3 mb-2">
            <div
              className="h-px flex-1"
              style={{ background: BORDER }}
            />
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
              {formatDateFr(date)}
            </span>
            <div className="h-px flex-1" style={{ background: BORDER }} />
          </div>
          <div className="space-y-2">
            {items.map(c => {
              const meta     = CAMPAIGN_STATUS_META[c.status]
              const selected = selectedId === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onEventClick(c.id)}
                  className="w-full text-left rounded-xl border px-4 py-3 transition-all duration-150 hover:scale-[1.005]"
                  style={{
                    background: selected ? `${meta.color}12` : PAGE_BG,
                    borderColor: selected ? meta.color : BORDER,
                    borderLeftWidth: 3,
                    borderLeftColor: meta.color,
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold" style={{ color: TEXT }}>{c.title}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: TEXT_DIM }}>{c.projectName}</p>
                      {c.sifLabels.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {c.sifLabels.map(label => (
                            <span
                              key={label}
                              className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                              style={{ background: `${meta.color}15`, color: meta.color }}
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span
                      className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider"
                      style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
                    >
                      {meta.label}
                    </span>
                  </div>
                  {c.team.length > 0 && (
                    <p className="text-[10px] mt-2" style={{ color: TEXT_DIM }}>
                      👥 {c.team.join(', ')}
                    </p>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Month view ────────────────────────────────────────────────────────────

function MonthView({
  campaigns, deadlines, selectedId, onDayClick, onEventClick,
}: {
  campaigns:    PlanningCampaign[]
  deadlines:    DeadlineGhost[]
  selectedId:   string | null
  onDayClick:   (dateStr: string) => void
  onEventClick: (id: string) => void
}) {
  const { BORDER, CARD_BG, TEXT_DIM, TEAL, isDark } = usePrismTheme()
  const { currentYear, currentMonth } = usePlanningNavigation()

  const cells = useMemo(
    () => buildCalendarGrid(currentYear, currentMonth),
    [currentYear, currentMonth],
  )

  // Index campagnes par date
  const campaignsByDate = useMemo(() => {
    const map = new Map<string, PlanningCampaign[]>()
    campaigns.forEach(c => {
      const start = new Date(c.startDate)
      const end   = new Date(c.endDate)
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = toDateStr(new Date(d))
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(c)
      }
    })
    return map
  }, [campaigns])

  // Index deadlines par date
  const deadlinesByDate = useMemo(() => {
    const map = new Map<string, DeadlineGhost[]>()
    deadlines.forEach(dl => {
      if (!map.has(dl.dueDate)) map.set(dl.dueDate, [])
      map.get(dl.dueDate)!.push(dl)
    })
    return map
  }, [deadlines])

  return (
    <div className="flex flex-col h-full">
      {/* Day headers */}
      <div
        className="grid grid-cols-7 shrink-0 border-b"
        style={{ borderColor: BORDER, background: CARD_BG }}
      >
        {DAY_NAMES_SHORT.map((day, i) => (
          <div
            key={day}
            className="py-2 text-center border-r last:border-r-0"
            style={{ borderColor: BORDER }}
          >
            <span
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: i >= 5 ? `${TEAL}80` : TEXT_DIM }}
            >
              {day}
            </span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        className="flex-1 grid grid-cols-7 overflow-hidden"
        style={{ gridTemplateRows: 'repeat(6, 1fr)' }}
      >
        {cells.map(cell => (
          <DayCell
            key={cell.dateStr}
            dateStr={cell.dateStr}
            dayNumber={cell.date.getDate()}
            isCurrentMonth={cell.isCurrentMonth}
            isToday={cell.isToday}
            campaigns={campaignsByDate.get(cell.dateStr) ?? []}
            deadlines={deadlinesByDate.get(cell.dateStr) ?? []}
            selectedId={selectedId}
            onDayClick={onDayClick}
            onEventClick={onEventClick}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Main workspace ────────────────────────────────────────────────────────

export function PlanningWorkspace({
  campaigns,
  deadlines,
}: {
  campaigns: PlanningCampaign[]
  deadlines: DeadlineGhost[]
}) {
  const { BORDER, CARD_BG, PAGE_BG, PANEL_BG, TEXT, TEXT_DIM, TEAL, SHADOW_TAB, isDark } = usePrismTheme()
  const {
    view, setView,
    currentYear, currentMonth,
    prevMonth, nextMonth, goToToday,
    selectedId, filterProjectId,
    selectCampaign, openCreate,
  } = usePlanningNavigation()

  const today = toDateStr(new Date())

  const filteredCampaigns = useMemo(
    () => filterProjectId
      ? campaigns.filter(c => c.projectId === filterProjectId)
      : campaigns,
    [campaigns, filterProjectId],
  )

  const overdueCount = useMemo(
    () => deadlines.filter(d => d.overdue).length,
    [deadlines],
  )

  const handleDayClick = useCallback((dateStr: string) => {
    openCreate({ startDate: dateStr, endDate: dateStr, projectId: '' })
  }, [openCreate])

  const handleEventClick = useCallback((id: string) => {
    selectCampaign(selectedId === id ? null : id)
  }, [selectCampaign, selectedId])

  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* ── Toolbar ── */}
      <div
        className="shrink-0 flex items-center gap-3 border-b px-4 py-2.5"
        style={{
          borderColor: BORDER,
          background: PANEL_BG,
          boxShadow: `${SHADOW_TAB}, inset 0 -1px 0 ${isDark ? 'rgba(0,0,0,0.2)' : 'rgba(15,23,42,0.04)'}`,
        }}
      >
        {/* Aujourd'hui */}
        <button
          type="button"
          onClick={goToToday}
          className="rounded-xl border px-3 py-1 text-[11px] font-semibold transition-all hover:opacity-80"
          style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT }}
        >
          Aujourd'hui
        </button>

        {/* Prev / Next */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={prevMonth}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-opacity hover:opacity-70"
            style={{ color: TEXT_DIM }}
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-opacity hover:opacity-70"
            style={{ color: TEXT_DIM }}
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Titre mois */}
        <h2 className="text-[14px] font-bold" style={{ color: TEXT }}>
          {MONTH_NAMES_FR[currentMonth]} {currentYear}
        </h2>

        {/* Alerte overdue */}
        {overdueCount > 0 && (
          <div
            className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1"
            style={{ borderColor: '#EF444430', background: '#EF444410' }}
          >
            <AlertTriangle size={11} style={{ color: '#EF4444' }} />
            <span className="text-[10px] font-bold" style={{ color: '#EF4444' }}>
              {overdueCount} échéance{overdueCount > 1 ? 's' : ''} dépassée{overdueCount > 1 ? 's' : ''}
            </span>
          </div>
        )}

        <div className="flex-1" />

        {/* View toggle */}
        <div
          className="flex rounded-xl border overflow-hidden"
          style={{ borderColor: BORDER }}
        >
          {([
            { id: 'month' as const, Icon: Calendar, label: 'Mois' },
            { id: 'agenda' as const, Icon: List,     label: 'Agenda' },
          ] as const).map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setView(opt.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold transition-colors"
              style={{
                background: view === opt.id ? `${TEAL}18` : 'transparent',
                color: view === opt.id ? TEAL : TEXT_DIM,
                borderRight: opt.id === 'month' ? `1px solid ${BORDER}` : 'none',
              }}
            >
              <opt.Icon size={12} />
              {opt.label}
            </button>
          ))}
        </div>

        {/* Bouton nouvelle campagne */}
        <button
          type="button"
          onClick={() => openCreate({ startDate: today, endDate: today, projectId: '' })}
          className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold transition-opacity hover:opacity-80"
          style={{ background: TEAL, color: '#041014' }}
        >
          <Plus size={13} />
          Campagne
        </button>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {view === 'month' ? (
          <MonthView
            campaigns={filteredCampaigns}
            deadlines={deadlines}
            selectedId={selectedId}
            onDayClick={handleDayClick}
            onEventClick={handleEventClick}
          />
        ) : (
          <AgendaView
            campaigns={filteredCampaigns}
            selectedId={selectedId}
            onEventClick={handleEventClick}
          />
        )}
      </div>
    </div>
  )
}
