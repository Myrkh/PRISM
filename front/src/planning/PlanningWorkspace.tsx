import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  List,
  Plus,
} from 'lucide-react'
import { useLayout } from '@/components/layout/SIFWorkbenchLayout'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { PlanningRightPanel } from './PlanningRightPanel'
import {
  CAMPAIGN_STATUS_META,
  DAY_NAMES_SHORT,
  MONTH_NAMES_FR,
  buildCalendarGrid,
  formatDateFr,
  toDateStr,
  usePlanningData,
  usePlanningNavigation,
  type DeadlineGhost,
  type PlanningCampaign,
} from './PlanningNavigation'

interface EventPillProps {
  campaign: PlanningCampaign
  compact?: boolean
  selected: boolean
  onClick: (id: string) => void
}

function EventPill({ campaign, compact, selected, onClick }: EventPillProps) {
  const meta = CAMPAIGN_STATUS_META[campaign.status]
  const [hovered, setHovered] = useState(false)

  return (
    <button
      type="button"
      onClick={event => { event.stopPropagation(); onClick(campaign.id) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full rounded-md px-1.5 py-0.5 text-left transition-all duration-100"
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
          className="mt-0.5 truncate leading-tight"
          style={{ fontSize: 9, color: selected ? 'rgba(255,255,255,0.75)' : meta.color, opacity: 0.8 }}
        >
          {campaign.sifLabels.slice(0, 3).join(' · ')}
          {campaign.sifLabels.length > 3 && ` +${campaign.sifLabels.length - 3}`}
        </p>
      )}
    </button>
  )
}

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

interface DayCellProps {
  dateStr: string
  dayNumber: number
  isCurrentMonth: boolean
  isToday: boolean
  campaigns: PlanningCampaign[]
  deadlines: DeadlineGhost[]
  selectedId: string | null
  onDayClick: (dateStr: string) => void
  onEventClick: (id: string) => void
}

function DayCell({
  dateStr,
  dayNumber,
  isCurrentMonth,
  isToday,
  campaigns,
  deadlines,
  selectedId,
  onDayClick,
  onEventClick,
}: DayCellProps) {
  const { BORDER, CARD_BG, TEXT, TEXT_DIM, TEAL, isDark } = usePrismTheme()
  const [hovered, setHovered] = useState(false)

  const maxVisible = 3
  const allEvents = campaigns.length + deadlines.length
  const overflow = allEvents - maxVisible
  const visibleCampaigns = campaigns.slice(0, maxVisible)
  const visibleDeadlines = deadlines.slice(0, Math.max(0, maxVisible - campaigns.length))

  return (
    <div
      onClick={() => isCurrentMonth && onDayClick(dateStr)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative flex cursor-pointer flex-col overflow-hidden border-b border-r transition-colors duration-100"
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
      <div className="flex items-center justify-between px-2 pb-1 pt-1.5">
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

        {isCurrentMonth && hovered && (
          <Plus size={10} style={{ color: TEXT_DIM }} className="opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </div>

      <div className="flex min-h-0 flex-col gap-0.5 px-1 pb-1">
        {visibleCampaigns.map(campaign => (
          <EventPill
            key={campaign.id}
            campaign={campaign}
            compact={allEvents > 2}
            selected={selectedId === campaign.id}
            onClick={onEventClick}
          />
        ))}
        {visibleDeadlines.map(deadline => (
          <GhostPill key={deadline.id} deadline={deadline} />
        ))}
        {overflow > 0 && (
          <p className="px-1.5 text-[9px] font-medium" style={{ color: TEXT_DIM }}>
            +{overflow} autre{overflow > 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  )
}

function AgendaView({
  campaigns,
  selectedId,
  onEventClick,
}: {
  campaigns: PlanningCampaign[]
  selectedId: string | null
  onEventClick: (id: string) => void
}) {
  const { BORDER, PAGE_BG, TEXT, TEXT_DIM, TEAL } = usePrismTheme()

  const grouped = useMemo(() => {
    const map = new Map<string, PlanningCampaign[]>()
    const sorted = [...campaigns].sort((left, right) => left.startDate.localeCompare(right.startDate))
    sorted.forEach(campaign => {
      const key = campaign.startDate
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(campaign)
    })
    return Array.from(map.entries())
  }, [campaigns])

  if (grouped.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <CalendarDays size={32} style={{ color: `${TEAL}40` }} strokeWidth={1.5} />
        <p className="text-[13px]" style={{ color: TEXT_DIM }}>Aucune campagne planifiée</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto space-y-5 px-6 py-4" style={{ scrollbarGutter: 'stable' }}>
      {grouped.map(([date, items]) => (
        <div key={date}>
          <div className="mb-2 flex items-center gap-3">
            <div className="h-px flex-1" style={{ background: BORDER }} />
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
              {formatDateFr(date)}
            </span>
            <div className="h-px flex-1" style={{ background: BORDER }} />
          </div>
          <div className="space-y-2">
            {items.map(campaign => {
              const meta = CAMPAIGN_STATUS_META[campaign.status]
              const selected = selectedId === campaign.id
              return (
                <button
                  key={campaign.id}
                  type="button"
                  onClick={() => onEventClick(campaign.id)}
                  className="w-full rounded-xl border px-4 py-3 text-left transition-all duration-150 hover:scale-[1.005]"
                  style={{
                    background: selected ? `${meta.color}12` : PAGE_BG,
                    borderColor: selected ? meta.color : BORDER,
                    borderLeftWidth: 3,
                    borderLeftColor: meta.color,
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold" style={{ color: TEXT }}>{campaign.title}</p>
                      <p className="mt-0.5 text-[11px]" style={{ color: TEXT_DIM }}>{campaign.projectName}</p>
                      {campaign.sifLabels.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {campaign.sifLabels.map(label => (
                            <span
                              key={label}
                              className="rounded px-1.5 py-0.5 text-[9px] font-bold"
                              style={{ background: `${meta.color}15`, color: meta.color }}
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider"
                      style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
                    >
                      {meta.label}
                    </span>
                  </div>
                  {campaign.team.length > 0 && (
                    <p className="mt-2 text-[10px]" style={{ color: TEXT_DIM }}>
                      👥 {campaign.team.join(', ')}
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

function MonthView({
  campaigns,
  deadlines,
  selectedId,
  onDayClick,
  onEventClick,
}: {
  campaigns: PlanningCampaign[]
  deadlines: DeadlineGhost[]
  selectedId: string | null
  onDayClick: (dateStr: string) => void
  onEventClick: (id: string) => void
}) {
  const { BORDER, CARD_BG, TEXT_DIM, TEAL } = usePrismTheme()
  const { currentYear, currentMonth } = usePlanningNavigation()

  const cells = useMemo(
    () => buildCalendarGrid(currentYear, currentMonth),
    [currentYear, currentMonth],
  )

  const campaignsByDate = useMemo(() => {
    const map = new Map<string, PlanningCampaign[]>()
    campaigns.forEach(campaign => {
      const start = new Date(campaign.startDate)
      const end = new Date(campaign.endDate)
      for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
        const key = toDateStr(new Date(cursor))
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(campaign)
      }
    })
    return map
  }, [campaigns])

  const deadlinesByDate = useMemo(() => {
    const map = new Map<string, DeadlineGhost[]>()
    deadlines.forEach(deadline => {
      if (!map.has(deadline.dueDate)) map.set(deadline.dueDate, [])
      map.get(deadline.dueDate)!.push(deadline)
    })
    return map
  }, [deadlines])

  return (
    <div className="flex h-full flex-col">
      <div className="grid shrink-0 grid-cols-7 border-b" style={{ borderColor: BORDER, background: CARD_BG }}>
        {DAY_NAMES_SHORT.map((day, index) => (
          <div
            key={day}
            className="border-r py-2 text-center last:border-r-0"
            style={{ borderColor: BORDER }}
          >
            <span
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: index >= 5 ? `${TEAL}80` : TEXT_DIM }}
            >
              {day}
            </span>
          </div>
        ))}
      </div>

      <div className="grid flex-1 grid-cols-7 overflow-hidden" style={{ gridTemplateRows: 'repeat(6, 1fr)' }}>
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

export function PlanningWorkspace() {
  const { BORDER, PANEL_BG, TEXT, TEXT_DIM, TEAL, SHADOW_TAB, isDark } = usePrismTheme()
  const { setRightPanelOverride } = useLayout()
  const { campaigns, deadlines } = usePlanningData()
  const {
    view,
    setView,
    currentYear,
    currentMonth,
    prevMonth,
    nextMonth,
    goToToday,
    selectedId,
    filterProjectId,
    selectCampaign,
    openCreate,
  } = usePlanningNavigation()

  useEffect(() => {
    setRightPanelOverride(<PlanningRightPanel />)
    return () => setRightPanelOverride(null)
  }, [setRightPanelOverride])

  const today = toDateStr(new Date())

  const filteredCampaigns = useMemo(
    () => filterProjectId ? campaigns.filter(campaign => campaign.projectId === filterProjectId) : campaigns,
    [campaigns, filterProjectId],
  )
  const filteredDeadlines = useMemo(
    () => filterProjectId ? deadlines.filter(deadline => deadline.projectId === filterProjectId) : deadlines,
    [deadlines, filterProjectId],
  )
  const overdueCount = useMemo(
    () => filteredDeadlines.filter(deadline => deadline.overdue).length,
    [filteredDeadlines],
  )

  const handleDayClick = useCallback((dateStr: string) => {
    openCreate({ startDate: dateStr, endDate: dateStr, projectId: filterProjectId ?? '' })
  }, [filterProjectId, openCreate])

  const handleEventClick = useCallback((id: string) => {
    selectCampaign(selectedId === id ? null : id)
  }, [selectCampaign, selectedId])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div
        className="flex shrink-0 items-center gap-3 border-b px-4 py-2.5"
        style={{
          borderColor: BORDER,
          background: PANEL_BG,
          boxShadow: `${SHADOW_TAB}, inset 0 -1px 0 ${isDark ? 'rgba(0,0,0,0.2)' : 'rgba(15,23,42,0.04)'}`,
        }}
      >
        <button
          type="button"
          onClick={goToToday}
          className="rounded-xl border px-3 py-1 text-[11px] font-semibold transition-all hover:opacity-80"
          style={{ borderColor: BORDER, background: 'transparent', color: TEXT }}
        >
          Aujourd'hui
        </button>

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

        <h2 className="text-[14px] font-bold" style={{ color: TEXT }}>
          {MONTH_NAMES_FR[currentMonth]} {currentYear}
        </h2>

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

        <div className="flex overflow-hidden rounded-xl border" style={{ borderColor: BORDER }}>
          {([
            { id: 'month' as const, Icon: Calendar, label: 'Mois' },
            { id: 'agenda' as const, Icon: List, label: 'Agenda' },
          ] as const).map(option => (
            <button
              key={option.id}
              type="button"
              onClick={() => setView(option.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold transition-colors"
              style={{
                background: view === option.id ? `${TEAL}18` : 'transparent',
                color: view === option.id ? TEAL : TEXT_DIM,
                borderRight: option.id === 'month' ? `1px solid ${BORDER}` : 'none',
              }}
            >
              <option.Icon size={12} />
              {option.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => openCreate({ startDate: today, endDate: today, projectId: filterProjectId ?? '' })}
          className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold transition-opacity hover:opacity-80"
          style={{ background: TEAL, color: '#041014' }}
        >
          <Plus size={13} />
          Campagne
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {view === 'month' ? (
          <MonthView
            campaigns={filteredCampaigns}
            deadlines={filteredDeadlines}
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
