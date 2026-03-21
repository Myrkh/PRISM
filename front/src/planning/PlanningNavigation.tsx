/**
 * planning/PlanningNavigation.tsx — PRISM
 *
 * Context de navigation pour le module Planning.
 * Même pattern que EngineNavigation / AuditNavigation.
 * Gère : vue active (month/agenda), mois affiché, campagne sélectionnée,
 * projet filtré, et état de la modale de création.
 */
import {
  createContext, useContext, useState, useCallback,
  type ReactNode,
} from 'react'

// ─── Types ────────────────────────────────────────────────────────────────

export type PlanningView = 'month' | 'agenda'

export type CampaignStatus = 'planned' | 'in_progress' | 'completed' | 'overdue'

/** Campagne planifiée (enrichie pour l'affichage) */
export interface PlanningCampaign {
  id: string
  title: string
  projectId: string
  projectName: string
  sifIds: string[]           // SIFs concernées
  sifLabels: string[]        // labels affichés
  startDate: string          // ISO date YYYY-MM-DD
  endDate: string            // ISO date YYYY-MM-DD
  status: CampaignStatus
  team: string[]             // noms membres
  notes: string
  verdicts: Record<string, 'pass' | 'fail' | 'conditional' | null>
}

/** Deadline T1 automatique calculée depuis analysisSettings */
export interface DeadlineGhost {
  id: string
  sifId: string
  sifNumber: string
  projectName: string
  dueDate: string            // ISO date
  daysRemaining: number
  overdue: boolean
}

export interface NewCampaignDraft {
  startDate: string
  endDate: string
  projectId: string
}

interface PlanningNavigationState {
  view:              PlanningView
  currentYear:       number
  currentMonth:      number      // 0-indexed
  selectedId:        string | null
  filterProjectId:   string | null
  isCreating:        boolean
  draft:             NewCampaignDraft | null

  setView:           (v: PlanningView) => void
  prevMonth:         () => void
  nextMonth:         () => void
  goToToday:         () => void
  selectCampaign:    (id: string | null) => void
  setFilterProject:  (id: string | null) => void
  openCreate:        (draft: NewCampaignDraft) => void
  closeCreate:       () => void
}

// ─── Context ──────────────────────────────────────────────────────────────

const PlanningNavigationContext = createContext<PlanningNavigationState | null>(null)

export function PlanningNavigationProvider({ children }: { children: ReactNode }) {
  const now = new Date()
  const [view,            setView]            = useState<PlanningView>('month')
  const [currentYear,     setCurrentYear]     = useState(now.getFullYear())
  const [currentMonth,    setCurrentMonth]    = useState(now.getMonth())
  const [selectedId,      setSelectedId]      = useState<string | null>(null)
  const [filterProjectId, setFilterProjectId] = useState<string | null>(null)
  const [isCreating,      setIsCreating]      = useState(false)
  const [draft,           setDraft]           = useState<NewCampaignDraft | null>(null)

  const prevMonth = useCallback(() => {
    setCurrentMonth(m => {
      if (m === 0) { setCurrentYear(y => y - 1); return 11 }
      return m - 1
    })
  }, [])

  const nextMonth = useCallback(() => {
    setCurrentMonth(m => {
      if (m === 11) { setCurrentYear(y => y + 1); return 0 }
      return m + 1
    })
  }, [])

  const goToToday = useCallback(() => {
    const t = new Date()
    setCurrentYear(t.getFullYear())
    setCurrentMonth(t.getMonth())
  }, [])

  const selectCampaign = useCallback((id: string | null) => {
    setSelectedId(id)
    if (id) setIsCreating(false)
  }, [])

  const openCreate = useCallback((d: NewCampaignDraft) => {
    setDraft(d)
    setIsCreating(true)
    setSelectedId(null)
  }, [])

  const closeCreate = useCallback(() => {
    setIsCreating(false)
    setDraft(null)
  }, [])

  return (
    <PlanningNavigationContext.Provider value={{
      view, currentYear, currentMonth,
      selectedId, filterProjectId, isCreating, draft,
      setView, prevMonth, nextMonth, goToToday,
      selectCampaign, setFilterProject: setFilterProjectId,
      openCreate, closeCreate,
    }}>
      {children}
    </PlanningNavigationContext.Provider>
  )
}

export function usePlanningNavigation(): PlanningNavigationState {
  const ctx = useContext(PlanningNavigationContext)
  if (!ctx) throw new Error('usePlanningNavigation must be used inside PlanningNavigationProvider')
  return ctx
}

// ─── Helpers ──────────────────────────────────────────────────────────────

export const CAMPAIGN_STATUS_META: Record<CampaignStatus, {
  label: string; color: string; bg: string; border: string
}> = {
  planned:     { label: 'Planifiée',   color: '#009BA4', bg: '#009BA415', border: '#009BA430' },
  in_progress: { label: 'En cours',    color: '#F59E0B', bg: '#F59E0B15', border: '#F59E0B30' },
  completed:   { label: 'Terminée',    color: '#4ADE80', bg: '#4ADE8015', border: '#4ADE8030' },
  overdue:     { label: 'En retard',   color: '#EF4444', bg: '#EF444415', border: '#EF444430' },
}

export const MONTH_NAMES_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

export const DAY_NAMES_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

/** Retourne les jours d'un mois pour la grille calendrier (lundi = début) */
export function buildCalendarGrid(year: number, month: number): Array<{
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  dateStr: string  // YYYY-MM-DD
}> {
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)

  // Lundi=0 … Dimanche=6
  let startDow = (firstDay.getDay() + 6) % 7
  let endDow   = (lastDay.getDay() + 6) % 7

  const cells: Array<{ date: Date; isCurrentMonth: boolean; isToday: boolean; dateStr: string }> = []
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  // Jours du mois précédent
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    cells.push({ date: d, isCurrentMonth: false, isToday: false, dateStr: toDateStr(d) })
  }

  // Jours du mois courant
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d)
    const dateStr = toDateStr(date)
    cells.push({ date, isCurrentMonth: true, isToday: dateStr === todayStr, dateStr })
  }

  // Jours du mois suivant pour compléter la grille (6 semaines)
  const remaining = 42 - cells.length
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i)
    cells.push({ date: d, isCurrentMonth: false, isToday: false, dateStr: toDateStr(d) })
  }

  return cells
}

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function formatDateFr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${d} ${MONTH_NAMES_FR[(m ?? 1) - 1]?.slice(0, 3) ?? ''} ${y}`
}
