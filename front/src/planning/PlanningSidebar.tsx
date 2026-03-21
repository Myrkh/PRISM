/**
 * planning/PlanningSidebar.tsx — PRISM
 *
 * Panneau gauche du module Planning.
 * Même pattern structurel que AuditSidebar / EngineSidebar.
 *   – Mini-calendrier de navigation (mois)
 *   – Filtres projet
 *   – Légende statuts
 *   – Prochaines échéances T1
 */
import { useMemo } from 'react'
import {
  CalendarDays, ChevronLeft, ChevronRight,
  AlertTriangle, Clock, CheckCircle2, Circle,
  FolderOpen, CalendarClock,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { usePrismTheme } from '@/styles/usePrismTheme'
import {
  SidebarBody, SidebarSectionTitle,
  sidebarHoverIn, sidebarHoverOut, sidebarPressDown, sidebarPressUp,
} from '@/components/layout/SidebarPrimitives'
import {
  usePlanningNavigation,
  CAMPAIGN_STATUS_META, MONTH_NAMES_FR, DAY_NAMES_SHORT,
  buildCalendarGrid, toDateStr,
  type CampaignStatus, type PlanningCampaign, type DeadlineGhost,
} from './PlanningNavigation'

// ─── Props ────────────────────────────────────────────────────────────────

interface PlanningSidebarProps {
  campaigns:  PlanningCampaign[]
  deadlines:  DeadlineGhost[]
}

// ─── Mini calendar ────────────────────────────────────────────────────────

function MiniCalendar({ campaigns }: { campaigns: PlanningCampaign[] }) {
  const { BORDER, CARD_BG, PAGE_BG, SURFACE, TEAL, TEXT, TEXT_DIM, isDark } = usePrismTheme()
  const { currentYear, currentMonth, prevMonth, nextMonth, goToToday, openCreate } = usePlanningNavigation()

  const cells = useMemo(
    () => buildCalendarGrid(currentYear, currentMonth),
    [currentYear, currentMonth],
  )

  // Ensemble des dates avec au moins une campagne
  const datesWithEvents = useMemo(() => {
    const set = new Set<string>()
    campaigns.forEach(c => {
      const start = new Date(c.startDate)
      const end   = new Date(c.endDate)
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        set.add(toDateStr(new Date(d)))
      }
    })
    return set
  }, [campaigns])

  return (
    <div className="px-2 py-2">
      {/* Header mois */}
      <div className="flex items-center justify-between mb-2">
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

      {/* Jours */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES_SHORT.map(d => (
          <div key={d} className="text-center text-[9px] font-bold uppercase tracking-wide py-0.5"
            style={{ color: TEXT_DIM }}>
            {d}
          </div>
        ))}
      </div>

      {/* Grille */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map(({ date, isCurrentMonth, isToday, dateStr }) => {
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
                <span
                  className="mt-0.5 h-1 w-1 rounded-full"
                  style={{ background: TEAL }}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Status legend ────────────────────────────────────────────────────────

const STATUS_ICONS: Record<CampaignStatus, typeof Circle> = {
  planned:     Circle,
  in_progress: Clock,
  completed:   CheckCircle2,
  overdue:     AlertTriangle,
}

function StatusLegend({ campaigns }: { campaigns: PlanningCampaign[] }) {
  const { TEXT_DIM } = usePrismTheme()

  const counts = useMemo(() => {
    const c: Record<CampaignStatus, number> = {
      planned: 0, in_progress: 0, completed: 0, overdue: 0,
    }
    campaigns.forEach(camp => { c[camp.status]++ })
    return c
  }, [campaigns])

  return (
    <>
      <SidebarSectionTitle className="px-2 pt-3 pb-1">Statuts</SidebarSectionTitle>
      <div className="px-2 space-y-0.5">
        {(Object.entries(CAMPAIGN_STATUS_META) as [CampaignStatus, typeof CAMPAIGN_STATUS_META[CampaignStatus]][]).map(([status, meta]) => {
          const Icon = STATUS_ICONS[status]
          const count = counts[status]
          return (
            <div
              key={status}
              className="flex items-center justify-between rounded-md px-2 py-1"
            >
              <div className="flex items-center gap-2">
                <Icon size={11} style={{ color: meta.color }} strokeWidth={2} />
                <span className="text-[11px]" style={{ color: meta.color }}>{meta.label}</span>
              </div>
              {count > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
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

// ─── Project filter ───────────────────────────────────────────────────────

function ProjectFilter() {
  const { BORDER, PAGE_BG, SHADOW_CARD, SHADOW_SOFT, SURFACE, TEXT, TEXT_DIM, TEAL } = usePrismTheme()
  const { filterProjectId, setFilterProject } = usePlanningNavigation()
  const projects = useAppStore(s => s.projects).filter(p => p.status === 'active')

  return (
    <>
      <SidebarSectionTitle className="px-2 pt-3 pb-1">Projet</SidebarSectionTitle>
      <div className="px-2 space-y-0.5">
        {[{ id: null, name: 'Tous les projets' }, ...projects.map(p => ({ id: p.id, name: p.name }))].map(item => {
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
              onMouseEnter={e => {
                if (!active) sidebarHoverIn(e.currentTarget, { background: PAGE_BG, borderColor: `${BORDER}D0`, boxShadow: SHADOW_SOFT, color: TEXT })
              }}
              onMouseLeave={e => {
                if (!active) sidebarHoverOut(e.currentTarget, { background: 'transparent', borderColor: 'transparent', boxShadow: 'none', color: TEXT_DIM })
              }}
              onPointerDown={e => sidebarPressDown(e.currentTarget, SHADOW_SOFT)}
              onPointerUp={e => sidebarPressUp(e.currentTarget, active ? SHADOW_CARD : 'none')}
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

// ─── Upcoming deadlines ───────────────────────────────────────────────────

function UpcomingDeadlines({ deadlines }: { deadlines: DeadlineGhost[] }) {
  const { navigate } = useAppStore(s => ({ navigate: s.navigate, projects: s.projects }))
  const { BORDER, TEXT, TEXT_DIM, TEAL, semantic } = usePrismTheme()

  const sorted = useMemo(
    () => [...deadlines].sort((a, b) => a.daysRemaining - b.daysRemaining).slice(0, 6),
    [deadlines],
  )

  if (sorted.length === 0) return null

  return (
    <>
      <SidebarSectionTitle className="px-2 pt-3 pb-1">
        <span className="flex items-center gap-1.5">
          <CalendarClock size={10} />
          Échéances T1
        </span>
      </SidebarSectionTitle>
      <div className="px-2 space-y-1">
        {sorted.map(dl => {
          const urgent = dl.daysRemaining <= 30
          const color  = dl.overdue ? semantic.error : urgent ? semantic.warning : TEXT_DIM
          return (
            <div
              key={dl.id}
              className="rounded-lg border px-2.5 py-1.5"
              style={{
                borderColor: dl.overdue ? `${semantic.error}30` : urgent ? `${semantic.warning}25` : BORDER,
                background: dl.overdue ? `${semantic.error}08` : 'transparent',
              }}
            >
              <p className="text-[11px] font-semibold" style={{ color: TEXT }}>{dl.sifNumber}</p>
              <p className="text-[10px] mt-0.5" style={{ color: TEXT_DIM }}>{dl.projectName}</p>
              <p className="text-[10px] font-medium mt-0.5" style={{ color }}>
                {dl.overdue
                  ? `En retard de ${Math.abs(dl.daysRemaining)}j`
                  : `Dans ${dl.daysRemaining}j`}
              </p>
            </div>
          )
        })}
      </div>
    </>
  )
}

// ─── Main sidebar ─────────────────────────────────────────────────────────

export function PlanningSidebar({ campaigns, deadlines }: PlanningSidebarProps) {
  const { BORDER, PANEL_BG, TEAL, TEXT } = usePrismTheme()
  const { openCreate } = usePlanningNavigation()
  const today = toDateStr(new Date())

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div
        className="shrink-0 flex items-center gap-2 border-b px-3 py-3"
        style={{ borderColor: BORDER, background: PANEL_BG }}
      >
        <CalendarDays size={14} style={{ color: TEAL }} strokeWidth={2} />
        <span className="text-[12px] font-bold tracking-wide" style={{ color: TEXT }}>Planning</span>
      </div>

      {/* Bouton nouvelle campagne */}
      <div className="shrink-0 px-2 pt-2 pb-1">
        <button
          type="button"
          onClick={() => openCreate({ startDate: today, endDate: today, projectId: '' })}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl py-1.5 text-[11px] font-bold transition-opacity hover:opacity-80"
          style={{ background: TEAL, color: '#041014' }}
        >
          + Nouvelle campagne
        </button>
      </div>

      <SidebarBody className="overflow-y-auto">
        {/* Mini calendrier */}
        <MiniCalendar campaigns={campaigns} />

        <div className="mx-2 my-2 border-t" style={{ borderColor: BORDER }} />

        {/* Filtre projet */}
        <ProjectFilter />

        <div className="mx-2 my-2 border-t" style={{ borderColor: BORDER }} />

        {/* Légende */}
        <StatusLegend campaigns={campaigns} />

        <div className="mx-2 my-2 border-t" style={{ borderColor: BORDER }} />

        {/* Échéances */}
        <UpcomingDeadlines deadlines={deadlines} />
      </SidebarBody>
    </div>
  )
}
