import type { PlanningStrings } from '@/i18n/planning'

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1, 12)
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export const planningStringsEn: PlanningStrings = {
  localeTag: 'en-US',
  months: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ],
  dayNamesShort: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  viewLabels: {
    month: 'Month',
    agenda: 'Agenda',
  },
  statusLabels: {
    planned: 'Planned',
    in_progress: 'In progress',
    completed: 'Completed',
    overdue: 'Overdue',
  },
  runtime: {
    formatDate,
    defaultCampaignOnDate: dateLabel => `Campaign ${dateLabel}`,
    defaultCampaignWithTeam: team => `Campaign — ${team}`,
  },
  workspace: {
    today: 'Today',
    overdueCount: count => `${count} overdue deadline${count > 1 ? 's' : ''}`,
    createButton: 'Campaign',
    emptyAgenda: 'No campaign scheduled',
    otherItems: count => `+${count} more`,
  },
  sidebar: {
    title: 'Planning',
    newCampaign: 'New campaign',
    statusesTitle: 'Statuses',
    projectTitle: 'Project',
    allProjects: 'All projects',
    deadlinesTitle: 'T1 deadlines',
    overdueByDays: days => `${days}d overdue`,
    dueInDays: days => `In ${days}d`,
  },
  rightPanel: {
    sectionLabel: 'Campaign',
    period: 'Period',
    progress: 'Progress',
    remaining: count => `${count} remaining`,
    team: 'Team',
    testedSifs: 'Tested SIFs',
    notes: 'Notes',
    verdicts: {
      pass: 'Pass',
      conditional: 'Cond.',
      fail: 'Fail',
    },
    empty: {
      title: 'Select a campaign',
      description: 'or click a day to schedule a new one',
    },
    form: {
      title: 'Title',
      titlePlaceholder: 'e.g. T2 2025 shutdown — HP unit',
      start: 'Start',
      end: 'End',
      project: 'Project',
      sifs: 'Affected SIFs',
      noSifAvailable: 'No active SIF with an available proof-test procedure in this project.',
      team: 'Team',
      memberPlaceholder: 'First Last',
      notes: 'Notes',
      notesPlaceholder: 'Hot-work permit required, restricted access…',
      cancel: 'Cancel',
      create: 'Create',
      creating: 'Creating…',
      selectProject: 'Select a project',
      noProjectAvailable: 'No project available',
    },
  },
}
