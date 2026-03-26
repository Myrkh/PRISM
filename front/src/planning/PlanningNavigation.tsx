import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { PlanningStrings } from '@/i18n/planning'
import { getPlanningStrings } from '@/i18n/planning'
import { useAppLocale } from '@/i18n/useLocale'
import { loadSIFAnalysisSettings } from '@/core/models/analysisSettings'
import { useAppStore } from '@/store/appStore'

export type PlanningView = 'month' | 'agenda'
export type CampaignStatus = 'planned' | 'in_progress' | 'completed' | 'overdue'

export interface PlanningCampaign {
  id: string
  title: string
  projectId: string
  projectName: string
  sifIds: string[]
  sifLabels: string[]
  startDate: string
  endDate: string
  status: CampaignStatus
  team: string[]
  notes: string
  verdicts: Record<string, 'pass' | 'fail' | 'conditional' | null>
}

export interface DeadlineGhost {
  id: string
  projectId: string
  sifId: string
  sifNumber: string
  projectName: string
  dueDate: string
  daysRemaining: number
  overdue: boolean
}

export interface NewCampaignDraft {
  startDate: string
  endDate: string
  projectId: string
}

interface PlanningNavigationState {
  view: PlanningView
  currentYear: number
  currentMonth: number
  selectedId: string | null
  filterProjectId: string | null
  isCreating: boolean
  draft: NewCampaignDraft | null
  setView: (view: PlanningView) => void
  prevMonth: () => void
  nextMonth: () => void
  goToToday: () => void
  selectCampaign: (id: string | null) => void
  setFilterProject: (id: string | null) => void
  openCreate: (draft: NewCampaignDraft) => void
  closeCreate: () => void
}

interface PlanningDataState {
  campaigns: PlanningCampaign[]
  deadlines: DeadlineGhost[]
}

const PlanningNavigationContext = createContext<PlanningNavigationState | null>(null)
const PlanningDataContext = createContext<PlanningDataState | null>(null)

function parsePlanningMeta(value: unknown): { title: string | null; endDate: string | null } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { title: null, endDate: null }
  }

  const record = value as Record<string, unknown>
  const title = typeof record.title === 'string' && record.title.trim().length > 0
    ? record.title.trim()
    : null
  const endDate = typeof record.endDate === 'string' && record.endDate.trim().length > 0
    ? record.endDate
    : null

  return { title, endDate }
}

function campaignRuntimeStatus(date: string, verdict: 'pass' | 'fail' | 'conditional' | null): CampaignStatus {
  const scheduled = new Date(date)
  const today = new Date()

  if (verdict === 'pass' || verdict === 'fail' || verdict === 'conditional') return 'completed'
  if (scheduled <= today) {
    return scheduled.toDateString() === today.toDateString() ? 'in_progress' : 'overdue'
  }
  return 'planned'
}

function mergeStatus(current: CampaignStatus, incoming: CampaignStatus): CampaignStatus {
  const ranking: Record<CampaignStatus, number> = {
    overdue: 4,
    in_progress: 3,
    planned: 2,
    completed: 1,
  }
  return ranking[incoming] > ranking[current] ? incoming : current
}

export function PlanningNavigationProvider({ children }: { children: ReactNode }) {
  const locale = useAppLocale()
  const strings = useMemo(() => getPlanningStrings(locale), [locale])
  const now = new Date()
  const projects = useAppStore(state => state.projects)

  const [view, setView] = useState<PlanningView>('month')
  const [currentYear, setCurrentYear] = useState(now.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(now.getMonth())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filterProjectId, setFilterProjectId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [draft, setDraft] = useState<NewCampaignDraft | null>(null)

  const prevMonth = useCallback(() => {
    setCurrentMonth(month => {
      if (month === 0) {
        setCurrentYear(year => year - 1)
        return 11
      }
      return month - 1
    })
  }, [])

  const nextMonth = useCallback(() => {
    setCurrentMonth(month => {
      if (month === 11) {
        setCurrentYear(year => year + 1)
        return 0
      }
      return month + 1
    })
  }, [])

  const goToToday = useCallback(() => {
    const today = new Date()
    setCurrentYear(today.getFullYear())
    setCurrentMonth(today.getMonth())
  }, [])

  const selectCampaign = useCallback((id: string | null) => {
    setSelectedId(id)
    if (id) setIsCreating(false)
  }, [])

  const openCreate = useCallback((nextDraft: NewCampaignDraft) => {
    setDraft(nextDraft)
    setIsCreating(true)
    setSelectedId(null)
  }, [])

  const closeCreate = useCallback(() => {
    setIsCreating(false)
    setDraft(null)
  }, [])

  const dataValue = useMemo<PlanningDataState>(() => {
    const campaignsByKey = new Map<string, PlanningCampaign>()
    const deadlines: DeadlineGhost[] = []
    const today = new Date()

    projects.forEach(project => {
      project.sifs.forEach(sif => {
        ;(sif.testCampaigns ?? []).forEach(campaign => {
          const planningMeta = parsePlanningMeta(
            campaign.procedureSnapshot && typeof campaign.procedureSnapshot === 'object'
              ? (campaign.procedureSnapshot as unknown as Record<string, unknown>).planningMeta
              : null,
          )
          const startDate = campaign.date
          const endDate = planningMeta.endDate ?? campaign.date
          const status = campaignRuntimeStatus(startDate, campaign.verdict ?? null)
          const team = campaign.team
            ? campaign.team.split(',').map(entry => entry.trim()).filter(Boolean)
            : []
          const title = planningMeta.title
            ?? (team.length > 0
              ? strings.runtime.defaultCampaignWithTeam(team.join(', '))
              : strings.runtime.defaultCampaignOnDate(strings.runtime.formatDate(startDate)))
          const groupKey = [project.id, startDate, endDate, title, campaign.team ?? ''].join('::')
          const existing = campaignsByKey.get(groupKey)

          if (existing) {
            if (!existing.sifIds.includes(sif.id)) {
              existing.sifIds.push(sif.id)
              existing.sifLabels.push(sif.sifNumber)
            }
            existing.verdicts[sif.id] = campaign.verdict ?? null
            existing.status = mergeStatus(existing.status, status)
            if (!existing.notes && campaign.notes) existing.notes = campaign.notes
            return
          }

          campaignsByKey.set(groupKey, {
            id: groupKey,
            title,
            projectId: project.id,
            projectName: project.name,
            sifIds: [sif.id],
            sifLabels: [sif.sifNumber],
            startDate,
            endDate,
            status,
            team,
            notes: campaign.notes ?? '',
            verdicts: { [sif.id]: campaign.verdict ?? null },
          })
        })

        if (sif.status === 'archived') return

        const settings = loadSIFAnalysisSettings(sif.id)
        const periodicity = (settings?.general as Record<string, unknown> | undefined)?.periodicityMonths as number ?? 12
        const sorted = [...(sif.testCampaigns ?? [])].sort(
          (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime(),
        )
        const lastDate = sorted[0] ? new Date(sorted[0].date) : null
        const dueDate = lastDate
          ? new Date(lastDate.getFullYear(), lastDate.getMonth() + periodicity, lastDate.getDate())
          : new Date(today.getFullYear(), today.getMonth() + 3, 1)
        const daysRemaining = Math.round((dueDate.getTime() - today.getTime()) / 86400000)

        deadlines.push({
          id: `ghost-${sif.id}`,
          projectId: project.id,
          sifId: sif.id,
          sifNumber: sif.sifNumber,
          projectName: project.name,
          dueDate: toDateStr(dueDate),
          daysRemaining,
          overdue: daysRemaining < 0,
        })
      })
    })

    return {
      campaigns: Array.from(campaignsByKey.values()).sort((left, right) => {
        const byDate = left.startDate.localeCompare(right.startDate)
        if (byDate !== 0) return byDate
        return left.title.localeCompare(right.title)
      }),
      deadlines,
    }
  }, [projects, strings])

  const navigationValue = useMemo<PlanningNavigationState>(() => ({
    view,
    currentYear,
    currentMonth,
    selectedId,
    filterProjectId,
    isCreating,
    draft,
    setView,
    prevMonth,
    nextMonth,
    goToToday,
    selectCampaign,
    setFilterProject: setFilterProjectId,
    openCreate,
    closeCreate,
  }), [
    view,
    currentYear,
    currentMonth,
    selectedId,
    filterProjectId,
    isCreating,
    draft,
    prevMonth,
    nextMonth,
    goToToday,
    selectCampaign,
    openCreate,
    closeCreate,
  ])

  return (
    <PlanningNavigationContext.Provider value={navigationValue}>
      <PlanningDataContext.Provider value={dataValue}>
        {children}
      </PlanningDataContext.Provider>
    </PlanningNavigationContext.Provider>
  )
}

export function usePlanningNavigation(): PlanningNavigationState {
  const context = useContext(PlanningNavigationContext)
  if (!context) throw new Error('usePlanningNavigation must be used inside PlanningNavigationProvider')
  return context
}

export function usePlanningData(): PlanningDataState {
  const context = useContext(PlanningDataContext)
  if (!context) throw new Error('usePlanningData must be used inside PlanningNavigationProvider')
  return context
}

const CAMPAIGN_STATUS_TONES: Record<CampaignStatus, {
  color: string
  bg: string
  border: string
}> = {
  planned: { color: '#009BA4', bg: '#009BA415', border: '#009BA430' },
  in_progress: { color: '#F59E0B', bg: '#F59E0B15', border: '#F59E0B30' },
  completed: { color: '#4ADE80', bg: '#4ADE8015', border: '#4ADE8030' },
  overdue: { color: '#EF4444', bg: '#EF444415', border: '#EF444430' },
}

export function getCampaignStatusMeta(strings: Pick<PlanningStrings, 'statusLabels'>): Record<CampaignStatus, {
  label: string
  color: string
  bg: string
  border: string
}> {
  return {
    planned: { label: strings.statusLabels.planned, ...CAMPAIGN_STATUS_TONES.planned },
    in_progress: { label: strings.statusLabels.in_progress, ...CAMPAIGN_STATUS_TONES.in_progress },
    completed: { label: strings.statusLabels.completed, ...CAMPAIGN_STATUS_TONES.completed },
    overdue: { label: strings.statusLabels.overdue, ...CAMPAIGN_STATUS_TONES.overdue },
  }
}

export function buildCalendarGrid(year: number, month: number): Array<{
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  dateStr: string
}> {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDow = (firstDay.getDay() + 6) % 7
  const cells: Array<{ date: Date; isCurrentMonth: boolean; isToday: boolean; dateStr: string }> = []
  const today = new Date()
  const todayStr = toDateStr(today)

  for (let index = startDow - 1; index >= 0; index -= 1) {
    const date = new Date(year, month, -index)
    cells.push({ date, isCurrentMonth: false, isToday: false, dateStr: toDateStr(date) })
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const date = new Date(year, month, day)
    const dateStr = toDateStr(date)
    cells.push({ date, isCurrentMonth: true, isToday: dateStr === todayStr, dateStr })
  }

  const remaining = 42 - cells.length
  for (let day = 1; day <= remaining; day += 1) {
    const date = new Date(year, month + 1, day)
    cells.push({ date, isCurrentMonth: false, isToday: false, dateStr: toDateStr(date) })
  }

  return cells
}

export function toDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
