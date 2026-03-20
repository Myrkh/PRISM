import type { AppLocale } from './types'
import { engineStringsEn } from './locales/en/engine'
import { engineStringsFr } from './locales/fr/engine'

export interface EngineStrings {
  localeTag: string
  sections: Record<'runs' | 'compare' | 'history', { label: string; hint: string }>
  sidebar: {
    title: string
    description: string
    health: {
      healthy: string
      offline: string
      checking: string
    }
    quickReadTitle: string
    totalSifs: (count: number) => string
    belowTarget: (count: number) => string
  }
  header: {
    sectionLabel: string
    titles: Record<'runs' | 'compare' | 'history', string>
    descriptions: Record<'runs' | 'compare' | 'history', string>
    indexedSifs: (count: number) => string
    runsBadge: (running: number, done: number, failed: number) => string
    comparesBadge: (count: number) => string
    historyBadge: (loading: boolean, count: number) => string
    mismatchDrift: (mismatch: number, drift: number) => string
    belowTarget: (count: number) => string
    historySummary: (failed: number, done: number) => string
  }
  search: {
    placeholderCandidates: string
    placeholderHistory: string
    totalCandidatesLabel: string
    totalRunsLabel: string
    allProjects: string
    filtered: (count: number, total: number) => string
    total: (count: number, label: string) => string
  }
  shared: {
    project: string
    sif: string
    target: string
    mode: string
    trigger: string
    status: string
    runtime: string
    warnings: string
    backend: string
    result: string
    started: string
    selection: string
    state: string
    action: string
    actorSystem: string
    unknownProject: string
    untitledSif: string
  }
  sectionHeaders: {
    engine: string
    empty: string
    runs: string
    compare: string
    routeInspector: string
    history: string
  }
  reasons: {
    targetGap: string
    publishedBaseline: string
    operationalEvidence: string
    designCandidate: string
  }
  statuses: {
    published: string
    working: string
    running: string
    error: string
    completed: string
    loading: string
    noHistory: string
    notComparedYet: string
    compareFailed: string
    pythonNotComparedYet: string
    backendVersionMissing: string
    unknownBackendError: string
    open: string
  }
  runs: {
    subtitle: string
    selectionHint: string
    tableHeaders: string[]
    runPython: string
    noResultsTitle: string
    noResultsDescription: string
  }
  compare: {
    subtitle: string
    selectionHint: string
    tableHeaders: string[]
    compareAction: string
    comparing: string
    runAgain: string
    report: string
    noResultsTitle: string
    noResultsDescription: string
    noInspectedTitle: string
    noInspectedDescription: string
    noMaterialDelta: string
  }
  history: {
    subtitle: string
    tableHeaders: string[]
    loadingTitle: string
    loadingDescription: string
    noResultsTitle: string
    noResultsDescription: string
  }
  rightPanel: {
    tabs: {
      payload: string
      backend: string
    }
    selectionTitle: string
    selectionHint: string
    selectionEmpty: string
    payloadTitle: string
    payloadEmpty: string
    backendStateTitle: string
    backendIdle: string
    backendRunning: string
    backendErrorTitle: string
    backendUnknownError: string
    compareTitle: string
    backendRouteTitle: string
    rawPreviewTitle: string
    backendPreviewEmpty: string
    historySelectionTitle: string
    historySelectionHint: string
    historySelectionEmpty: string
    historyPayloadTitle: string
    historyPayloadEmpty: string
    historyRunSummaryTitle: string
    historyRunSummaryEmpty: string
    historyCompareTitle: string
    historyBackendErrorTitle: string
    historyBackendPayloadTitle: string
    historyBackendPayloadEmpty: string
  }
  verdicts: {
    aligned: string
    drift: string
    mismatch: string
  }
  subsystems: {
    sensors: string
    solver: string
    actuators: string
  }
  routeInspector: {
    whyDifferent: string
    globalDelta: string
    backendSignals: string
    requestedMode: string
    runtime: string
    warningsSurfaced: (count: number) => string
    componentTrace: string
    channel: (id: string) => string
    subComponentOf: (parent: string, instrumentType: string) => string
  }
  routeBadges: {
    markov: string
    manufacturerInput: string
    analyticalIec: string
  }
  routeLines: {
    requestedMode: (mode: string) => string
    effectiveArchitecture: (effective: string, input: string) => string
    pfdEngine: (engine: string | null) => string
    pfhEngine: (engine: string | null) => string
    thresholdCheck: (lambdaT1: string, threshold: string) => string
    noThreshold: (lambdaT1: string) => string
    markovTriggered: string
    markovNotTriggered: string
    heterogeneous: string
  }
  compareNotes: {
    pfdDelta: (deltaPct: string, deltaAbs: string) => string
    pfhDelta: (deltaPct: string, deltaAbs: string) => string
    rrfDelta: (deltaPct: string) => string
    silMismatch: (tsSil: string, backendSil: string) => string
    markovTriggered: (subsystems: string) => string
    backendWarnings: (count: number) => string
  }
  empty: {
    noSifTitle: string
    noSifDescription: string
  }
}

const ENGINE_STRINGS: Record<AppLocale, EngineStrings> = {
  fr: engineStringsFr,
  en: engineStringsEn,
}

export function getEngineStrings(locale: AppLocale): EngineStrings {
  return ENGINE_STRINGS[locale]
}
