import type { CampaignStatus, PlanningView } from '@/planning/PlanningNavigation'
import type { AppLocale } from './types'
import { planningStringsEn } from './locales/en/planning'
import { planningStringsFr } from './locales/fr/planning'

export interface PlanningStrings {
  localeTag: string
  months: string[]
  dayNamesShort: string[]
  viewLabels: Record<PlanningView, string>
  statusLabels: Record<CampaignStatus, string>
  runtime: {
    formatDate: (dateStr: string) => string
    defaultCampaignOnDate: (dateLabel: string) => string
    defaultCampaignWithTeam: (team: string) => string
  }
  workspace: {
    today: string
    overdueCount: (count: number) => string
    createButton: string
    emptyAgenda: string
    otherItems: (count: number) => string
  }
  sidebar: {
    title: string
    newCampaign: string
    statusesTitle: string
    projectTitle: string
    allProjects: string
    deadlinesTitle: string
    overdueByDays: (days: number) => string
    dueInDays: (days: number) => string
  }
  rightPanel: {
    sectionLabel: string
    period: string
    progress: string
    remaining: (count: number) => string
    team: string
    testedSifs: string
    notes: string
    verdicts: {
      pass: string
      conditional: string
      fail: string
    }
    empty: {
      title: string
      description: string
    }
    form: {
      title: string
      titlePlaceholder: string
      start: string
      end: string
      project: string
      sifs: string
      noSifAvailable: string
      team: string
      memberPlaceholder: string
      notes: string
      notesPlaceholder: string
      cancel: string
      create: string
      creating: string
      selectProject: string
      noProjectAvailable: string
    }
  }
}

const PLANNING_STRINGS: Record<AppLocale, PlanningStrings> = {
  fr: planningStringsFr,
  en: planningStringsEn,
}

export function getPlanningStrings(locale: AppLocale): PlanningStrings {
  return PLANNING_STRINGS[locale]
}
