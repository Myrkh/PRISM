import { useMemo } from 'react'
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  FolderOpen,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { usePrismTheme } from '@/styles/usePrismTheme'
import {
  SidebarBody,
  SidebarSectionTitle,
  sidebarHoverIn,
  sidebarHoverOut,
  sidebarPressDown,
  sidebarPressUp,
} from '@/components/layout/SidebarPrimitives'
import {
  CAMPAIGN_STATUS_META,
  DAY_NAMES_SHORT,
  MONTH_NAMES_FR,
  buildCalendarGrid,
  toDateStr,
  usePlanningData,
  usePlanningNavigation,
  type CampaignStatus,
  type DeadlineGhost,
  type PlanningCampaign,
} from './PlanningNavigation'

function MiniCalendar({ campaigns }: { campaigns: PlanningCampaign[] }) {
  const { TEAL, TEXT, TEXT_DIM } = usePrismTheme()
  const { currentYear, currentMonth, prevMonth, nextMonth, goToToday, openCreate } = usePlanningNavigation()

  const cells = useMemo(
    () => buildCalendarGrid(currentYear, currentMonth),
    [currentYear, currentMonth],
  )

  const datesWithEvents = useMemo(() => {
    const result = new Set<string>()
    campaigns.forEach(campaign => {
      const start = new Date(campaign.startDate)
      const end = new Date(campaign.endDate)
      for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
        result.add(toDateStr(new Date(cursor)))
      }
    })
    return result
  }, [campaigns])

  return (
    <div className="px-2 py-2">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:opacity-70"
          style={{ color: TEXT_DIM }}
        >
          <ChevronLeft size={13} />
        </button>

        <button
          type="button"
          onClick={goToToday}
          className="text-[11px] font-semibold tracking-wide transition-colors hover:opacity-80"
          style={{ color: TEXT }}
        >
          {MONTH_NAMES_FR[currentMonth]} {currentYear}
        </button>

        <button
          type="button"
          onClick={nextMonth}
          className="flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:opacity-70"
          style={{ color: TEXT_DIM }}
        >
          <ChevronRight size={13} />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7">
        {DAY_NAMES_SHORT.map(label => (
          <div
            key={label}
            className="py-0.5 text-center text-[9px] font-bold uppercase tracking-wide"
            style={{ color: TEXT_DIM }}
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map(({ date, dateStr, isCurrentMonth, isToday }) => {
          const hasEvent = datesWithEvents.has(dateStr)
          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => {
                if (isCurrentMonth) {
                  openCreate({ startDate: dateStr, endDate: dateStr, projectId: '' })
                }
              }}
              className="relative flex flex-col items-center justify-center rounded-md py-0.5 transition-colors"
              style={{
                opacity: isCurrentMonth ? 1 : 0.28,
                background: isToday ? `${TEAL}18` : 'transparent',
                border: isToday ? `1px solid ${TEAL}40` : '1px solid transparent',
              }}
            >
              <span
                className="text-[11px] leading-none"
                style={{
                  color: isToday ? TEAL : TEXT,
                  fontWeight: isToday ? 700 : 400,
                }}
              >
                {date.getDate()}
              </span>
              {hasEvent && isCurrentMonth && (
                <span className="mt-0.5 h-1 w-1 rounded-full" style={{ background: TEAL }} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const STATUS_ICONS: Record<CampaignStatus, typeof Circle> = {
  planned: Circle,
  in_progress: Clock,
  completed: CheckCircle2,
  overdue: AlertTriangle,
}

function StatusLegend({ campaigns }: { campaigns: PlanningCampaign[] }) {
  const counts = useMemo(() => {
    const result: Record<CampaignStatus, number> = {
      planned: 0,
      in_progress: 0,
      completed: 0,
      overdue: 0,
    }
    campaigns.forEach(campaign => {
      result[campaign.status] += 1
    })
    return result
  }, [campaigns])

  return (
    <>
      <SidebarSectionTitle className="px-2 pb-1 pt-3">Statuts</SidebarSectionTitle>
      <div className="space-y-0.5 px-2">
        {(Object.entries(CAMPAIGN_STATUS_META) as Array<[CampaignStatus, typeof CAMPAIGN_STATUS_META[CampaignStatus]]>).map(([status, meta]) => {
          const Icon = STATUS_ICONS[status]
          const count = counts[status]
          return (
            <div key={status} className="flex items-center justify-between rounded-md px-2 py-1">
              <div className="flex items-center gap-2">
                <Icon size={11} style={{ color: meta.color }} strokeWidth={2} />
                <span className="text-[11px]" style={{ color: meta.color }}>{meta.label}</span>
              </div>
              {count > 0 && (
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                  style={{ background: meta.bg, color: meta.color }}
                >
                  {count}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

function ProjectFilter() {
  const { BORDER, PAGE_BG, SHADOW_CARD, SHADOW_SOFT, SURFACE, TEXT, TEXT_DIM, TEAL } = usePrismTheme()
  const { filterProjectId, setFilterProject } = usePlanningNavigation()
  const projects = useAppStore(state => state.projects).filter(project => project.status === 'active')

  return (
    <>
      <SidebarSectionTitle className="px-2 pb-1 pt-3">Projet</SidebarSectionTitle>
      <div className="space-y-0.5 px-2">
        {[{ id: null, name: 'Tous les projets' }, ...projects.map(project => ({ id: project.id, name: project.name }))].map(item => {
          const active = filterProjectId === item.id
          return (
            <button
              key={item.id ?? '__all'}
              type="button"
              onClick={() => setFilterProject(item.id)}
              className="relative flex w-full items-center gap-2 overflow-hidden rounded-md px-2.5 py-1.5 text-left transition-all duration-150"
              style={{
                background: active ? SURFACE : 'transparent',
                border: `1px solid ${active ? `${TEAL}24` : 'transparent'}`,
                boxShadow: active ? SHADOW_CARD : 'none',
                color: active ? TEXT : TEXT_DIM,
              }}
              onMouseEnter={event => {
                if (!active) {
                  sidebarHoverIn(event.currentTarget, {
                    background: PAGE_BG,
                    borderColor: `${BORDER}D0`,
                    boxShadow: SHADOW_SOFT,
                    color: TEXT,
                  })
                }
              }}
              onMouseLeave={event => {
                if (!active) {
                  sidebarHoverOut(event.currentTarget, {
                    background: 'transparent',
                    borderColor: 'transparent',
                    boxShadow: 'none',
                    color: TEXT_DIM,
                  })
                }
              }}
              onPointerDown={event => sidebarPressDown(event.currentTarget, SHADOW_SOFT)}
              onPointerUp={event => sidebarPressUp(event.currentTarget, active ? SHADOW_CARD : 'none')}
            >
              <FolderOpen size={11} strokeWidth={active ? 2.1 : 1.8} />
              <span className="truncate text-[11px] font-medium">{item.name}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}

function UpcomingDeadlines({ deadlines }: { deadlines: DeadlineGhost[] }) {
  const navigate = useAppStore(state => state.navigate)
  const { BORDER, TEXT, TEXT_DIM, semantic } = usePrismTheme()

  const sorted = useMemo(
    () => [...deadlines].sort((left, right) => left.daysRemaining - right.daysRemaining).slice(0, 6),
    [deadlines],
  )

  if (sorted.length === 0) return null

  return (
    <>
      <SidebarSectionTitle className="px-2 pb-1 pt-3">
        <span className="flex items-center gap-1.5">
          <CalendarClock size={10} />
          Échéances T1
        </span>
      </SidebarSectionTitle>
      <div className="space-y-1 px-2">
        {sorted.map(deadline => {
          const urgent = deadline.daysRemaining <= 30
          const color = deadline.overdue ? semantic.error : urgent ? semantic.warning : TEXT_DIM
          return (
            <button
              key={deadline.id}
              type="button"
              onClick={() => navigate({
                type: 'sif-dashboard',
                projectId: deadline.projectId,
                sifId: deadline.sifId,
                tab: 'exploitation',
              })}
              className="w-full rounded-lg border px-2.5 py-1.5 text-left transition-opacity hover:opacity-80"
              style={{
                borderColor: deadline.overdue ? `${semantic.error}30` : urgent ? `${semantic.warning}25` : BORDER,
                background: deadline.overdue ? `${semantic.error}08` : 'transparent',
              }}
            >
              <p className="text-[11px] font-semibold" style={{ color: TEXT }}>{deadline.sifNumber}</p>
              <p className="mt-0.5 text-[10px]" style={{ color: TEXT_DIM }}>{deadline.projectName}</p>
              <p className="mt-0.5 text-[10px] font-medium" style={{ color }}>
                {deadline.overdue
                  ? `En retard de ${Math.abs(deadline.daysRemaining)}j`
                  : `Dans ${deadline.daysRemaining}j`}
              </p>
            </button>
          )
        })}
      </div>
    </>
  )
}

export function PlanningSidebar() {
  const { BORDER, PANEL_BG, TEAL, TEXT } = usePrismTheme()
  const { campaigns, deadlines } = usePlanningData()
  const { filterProjectId, openCreate } = usePlanningNavigation()
  const today = toDateStr(new Date())

  const filteredCampaigns = useMemo(
    () => filterProjectId ? campaigns.filter(campaign => campaign.projectId === filterProjectId) : campaigns,
    [campaigns, filterProjectId],
  )
  const filteredDeadlines = useMemo(
    () => filterProjectId ? deadlines.filter(deadline => deadline.projectId === filterProjectId) : deadlines,
    [deadlines, filterProjectId],
  )

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div
        className="flex shrink-0 items-center gap-2 border-b px-3 py-3"
        style={{ borderColor: BORDER, background: PANEL_BG }}
      >
        <CalendarDays size={14} style={{ color: TEAL }} strokeWidth={2} />
        <span className="text-[12px] font-bold tracking-wide" style={{ color: TEXT }}>Planning</span>
      </div>

      <div className="shrink-0 px-2 pb-1 pt-2">
        <button
          type="button"
          onClick={() => openCreate({ startDate: today, endDate: today, projectId: filterProjectId ?? '' })}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl py-1.5 text-[11px] font-bold transition-opacity hover:opacity-80"
          style={{ background: TEAL, color: '#041014' }}
        >
          + Nouvelle campagne
        </button>
      </div>

      <SidebarBody className="overflow-y-auto">
        <MiniCalendar campaigns={filteredCampaigns} />
        <div className="mx-2 my-2 border-t" style={{ borderColor: BORDER }} />
        <ProjectFilter />
        <div className="mx-2 my-2 border-t" style={{ borderColor: BORDER }} />
        <StatusLegend campaigns={filteredCampaigns} />
        <div className="mx-2 my-2 border-t" style={{ borderColor: BORDER }} />
        <UpcomingDeadlines deadlines={filteredDeadlines} />
      </SidebarBody>
    </div>
  )
}
