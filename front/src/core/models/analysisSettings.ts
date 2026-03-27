const HOURS_PER_YEAR = 8760
const STORAGE_PREFIX = 'prism-sif-analysis-settings:'

export type AnalysisTimeUnit = 'yr' | 'hr'
export type AnalysisScale = 'log' | 'linear'

export interface SIFAnalysisSettings {
  general: {
    missionTime: number
    missionTimeUnit: AnalysisTimeUnit
  }
  chart: {
    title: string
    subtitle: string
    yScale: AnalysisScale
    showGrid: boolean
    showLegend: boolean
    showSILBands: boolean
    showSubsystems: boolean
    curvePoints: number
    totalColor: string
    sensorColor: string
    logicColor: string
    actuatorColor: string
  }
  pie: {
    title: string
    subtitle: string
    showLabels: boolean
    innerRadius: number
    outerRadius: number
  }
}

export const DEFAULT_SIF_ANALYSIS_SETTINGS: SIFAnalysisSettings = {
  general: {
    missionTime: 30,
    missionTimeUnit: 'yr',
  },
  chart: {
    title: 'PFD Degradation',
    subtitle: 'Instantaneous PFD(t) over the selected mission time',
    yScale: 'log',
    showGrid: true,
    showLegend: true,
    showSILBands: true,
    showSubsystems: true,
    curvePoints: 300,
    totalColor: '#F9FAFB',
    sensorColor: '#0891B2',
    logicColor: '#6366F1',
    actuatorColor: '#EA580C',
  },
  pie: {
    title: 'Contribution to Total SIF PFD',
    subtitle: 'Visual split of the computed PFDavg between sensors, solver and actuators.',
    showLabels: true,
    innerRadius: 64,
    outerRadius: 102,
  },
}

function mergeSettings(value: unknown): SIFAnalysisSettings {
  const source = typeof value === 'object' && value !== null ? value as Record<string, any> : {}
  const general = typeof source.general === 'object' && source.general !== null ? source.general : {}
  const chart = typeof source.chart === 'object' && source.chart !== null ? source.chart : {}
  const pie = typeof source.pie === 'object' && source.pie !== null ? source.pie : {}

  return {
    general: {
      missionTime: typeof general.missionTime === 'number' && general.missionTime > 0
        ? general.missionTime
        : DEFAULT_SIF_ANALYSIS_SETTINGS.general.missionTime,
      missionTimeUnit: general.missionTimeUnit === 'hr' ? 'hr' : DEFAULT_SIF_ANALYSIS_SETTINGS.general.missionTimeUnit,
    },
    chart: {
      ...DEFAULT_SIF_ANALYSIS_SETTINGS.chart,
      ...chart,
      yScale: chart.yScale === 'linear' ? 'linear' : DEFAULT_SIF_ANALYSIS_SETTINGS.chart.yScale,
      curvePoints: typeof chart.curvePoints === 'number' && chart.curvePoints >= 60
        ? Math.round(chart.curvePoints)
        : DEFAULT_SIF_ANALYSIS_SETTINGS.chart.curvePoints,
    },
    pie: {
      ...DEFAULT_SIF_ANALYSIS_SETTINGS.pie,
      ...pie,
      innerRadius: typeof pie.innerRadius === 'number'
        ? Math.max(24, Math.min(Math.round(pie.innerRadius), 120))
        : DEFAULT_SIF_ANALYSIS_SETTINGS.pie.innerRadius,
      outerRadius: typeof pie.outerRadius === 'number'
        ? Math.max(48, Math.min(Math.round(pie.outerRadius), 160))
        : DEFAULT_SIF_ANALYSIS_SETTINGS.pie.outerRadius,
    },
  }
}

export function getSIFAnalysisSettingsKey(sifId: string): string {
  return `${STORAGE_PREFIX}${sifId}`
}

export function loadSIFAnalysisSettings(sifId: string): SIFAnalysisSettings {
  if (typeof window === 'undefined') return DEFAULT_SIF_ANALYSIS_SETTINGS

  try {
    const raw = window.localStorage.getItem(getSIFAnalysisSettingsKey(sifId))
    if (!raw) return DEFAULT_SIF_ANALYSIS_SETTINGS
    return mergeSettings(JSON.parse(raw))
  } catch {
    return DEFAULT_SIF_ANALYSIS_SETTINGS
  }
}

export function saveSIFAnalysisSettings(sifId: string, settings: SIFAnalysisSettings): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(
    getSIFAnalysisSettingsKey(sifId),
    JSON.stringify(mergeSettings(settings)),
  )
}

export function analysisSettingsToMissionTimeHours(settings: SIFAnalysisSettings): number {
  return settings.general.missionTimeUnit === 'yr'
    ? settings.general.missionTime * HOURS_PER_YEAR
    : settings.general.missionTime
}

export function getAnalysisSubsystemColors(settings: SIFAnalysisSettings): Record<'sensor' | 'logic' | 'actuator', string> {
  return {
    sensor: settings.chart.sensorColor,
    logic: settings.chart.logicColor,
    actuator: settings.chart.actuatorColor,
  }
}

export function clearSIFAnalysisSettings(sifId: string): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(getSIFAnalysisSettingsKey(sifId))
}
