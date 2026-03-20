import type { AuditStrings } from '@/i18n/audit'

export const auditStringsEn: AuditStrings = {
  localeTag: 'en-US',
  kinds: {
    governance: 'Governance',
    'proof-tests': 'Proof tests',
    operations: 'Operations',
    engine: 'Engine',
  },
  scopes: {
    all: {
      label: 'All events',
      hint: 'Full traceability log view',
    },
    warnings: {
      label: 'Warnings',
      hint: 'Events that require priority review',
    },
    governance: {
      label: 'Governance',
      hint: 'Project creation, updates, and status changes',
    },
    'proof-tests': {
      label: 'Proof tests',
      hint: 'Campaigns and operations verdicts',
    },
    operations: {
      label: 'Operations',
      hint: 'Incidents and events observed in the field',
    },
    engine: {
      label: 'Engine runs',
      hint: 'Backend runs and TS / Python compare',
    },
  },
  header: {
    eyebrow: 'Active traceability',
    title: 'Audit Log',
    description: 'Cross-workspace reading of the useful events, from active dossiers to Engine runs.',
    visible: count => `${count} visible`,
    warnings: count => `${count} warning${count > 1 ? 's' : ''} in scope`,
  },
  search: {
    placeholder: 'Search for a project, SIF, action, or detail…',
    filtered: (count, total) => `${count} results out of ${total}`,
    visibleTotal: count => `${count} visible events`,
  },
  sidebar: {
    title: 'Audit log',
    summaryLoading: 'Syncing Engine runs…',
    summaryProjectFiltered: count => `${count} event${count > 1 ? 's' : ''} in the filtered project`,
    summaryDefault: count => `${count} events rebuilt from active dossiers and backend runs`,
    reset: 'Reset',
    scopeTitle: 'Scope',
    projectsTitle: 'Projects',
    allProjectsLabel: 'All projects',
    allProjectsHint: 'Cross-project view without restriction',
    quickReadTitle: 'Quick read',
    warningsSummary: count => `${count} warning event${count > 1 ? 's' : ''} in the current scope`,
    usage: 'Use the central search to find a project, SIF, action, or Engine run.',
  },
  rightPanel: {
    eventTab: 'Event',
    selectionTitle: 'Selection',
    selectionEmpty: 'Select an event in the log to inspect its context and open the linked view.',
    contextTitle: 'Context',
    contextDate: 'Date',
    contextProject: 'Project',
    contextSif: 'SIF',
    contextActor: 'Actor',
    contextLinkedView: 'Linked view',
    contextEmpty: 'Project context and linked view will appear here once a row is selected.',
    actionTitle: 'Action',
    openEngine: 'Open Engine',
    openSif: 'Open linked SIF',
    actionEmpty: 'This event does not point to a precise navigable view.',
  },
  row: {
    actorFallback: 'System',
    linkedViewFallback: 'Project context only',
  },
  table: {
    level: 'Level',
    date: 'Date',
    event: 'Event',
    context: 'Context',
  },
  badges: {
    warning: 'Warning',
    info: 'Info',
  },
  empty: {
    title: 'No visible events',
    loadingDescription: 'The log is still loading Engine runs. Try again in a moment.',
    resetDescription: 'Adjust the scope in the left panel or clear the search to return to the full log.',
  },
  model: {
    actors: {
      system: 'System',
      unknownProject: 'Unknown project',
    },
    linkedViews: {
      project: 'Project / dossier',
      cockpit: 'Cockpit',
      exploitation: 'Operations',
      engineHistory: 'Engine · History',
    },
    projectCreated: {
      action: 'Project created',
      details: projectName => `Project “${projectName}” was initialized.`,
    },
    projectUpdated: {
      action: 'Project updated',
      details: projectName => `Project “${projectName}” metadata was updated.`,
    },
    sifDate: {
      action: 'SIF record updated',
      details: 'The SIF dossier date was confirmed or adjusted.',
    },
    sifStatus: {
      action: status => `SIF status: ${status}`,
      details: status => `Dossier moved to ${status}.`,
    },
    campaign: {
      action: verdict => `Proof test campaign (${verdict})`,
      defaultDetails: 'Campaign recorded.',
    },
    event: {
      action: type => `Field event: ${type}`,
      defaultDetails: 'Operational event recorded.',
    },
    engine: {
      runLaunched: 'Backend run started',
      runDone: 'Backend run completed',
      runFailed: 'Backend run failed',
      compareLaunched: 'TS / Python compare started',
      compareDone: 'TS / Python compare completed',
      compareFailed: 'TS / Python compare failed',
      batchLaunched: 'Backend batch run started',
      batchDone: 'Backend batch run completed',
      batchFailed: 'Backend batch run failed',
      defaultError: 'The backend returned an error during the calculation.',
      recordedRun: 'Backend run recorded.',
      mode: mode => `Mode ${mode}`,
      sil: value => `SIL ${value}`,
      warnings: count => `${count} warning${count > 1 ? 's' : ''}`,
      runtime: ms => `${ms} ms`,
      version: version => `v${version}`,
    },
  },
}
