import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea, Legend,
} from 'recharts'
import { useAppStore } from '@/store/appStore'
import { logTickFormatter, formatPFD } from '@/core/math/pfdCalc'
import type { SIFAnalysisSettings } from '@/core/models/analysisSettings'
import type { SIF, PFDChartPoint } from '@/core/types'

const SIL_BANDS = [
  { y1: 1e-2, y2: 0.5,  fill: '#16A34A', label: 'SIL 1', labelY: 0.05 },
  { y1: 1e-3, y2: 1e-2, fill: '#2563EB', label: 'SIL 2', labelY: 5e-3 },
  { y1: 1e-4, y2: 1e-3, fill: '#D97706', label: 'SIL 3', labelY: 5e-4 },
  { y1: 1e-5, y2: 1e-4, fill: '#7C3AED', label: 'SIL 4', labelY: 5e-5 },
]

interface Props {
  sif: SIF
  chartData: PFDChartPoint[]
  settings: SIFAnalysisSettings['chart']
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-xl border bg-card shadow-xl px-4 py-3 text-xs">
      <p className="font-mono text-muted-foreground mb-2">t = {label} yr</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-6 mb-1">
          <span style={{ color: p.stroke }}>{p.name}</span>
          <span className="font-mono font-semibold" style={{ color: p.stroke }}>
            {formatPFD(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

function formatLinearTick(value: number): string {
  if (!Number.isFinite(value)) return '0'
  if (value === 0) return '0'
  return value.toExponential(1).replace('e', 'E')
}

export function PFDChart({ sif, chartData, settings }: Props) {
  const isDark = useAppStore(s => s.isDark)

  const gridColor   = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  const axisColor   = isDark ? '#374151' : '#E5E7EB'
  const tickColor   = isDark ? '#6B7280' : '#9CA3AF'
  const totalColor  = settings.totalColor
  const subsystemColors: Record<string, string> = {
    sensor: settings.sensorColor,
    logic: settings.logicColor,
    actuator: settings.actuatorColor,
  }
  const values = chartData.flatMap(point => [
    point.total,
    ...sif.subsystems.map(subsystem => point[subsystem.id] ?? 0),
  ]).filter((value): value is number => Number.isFinite(value) && value > 0)
  const minPositive = values.length > 0 ? Math.min(...values) : 1e-8
  const maxValue = values.length > 0 ? Math.max(...values) : 1e-3
  const yDomain = settings.yScale === 'log'
    ? [Math.max(Math.min(minPositive / 10, 1e-7), 1e-12), Math.max(maxValue * 1.1, 1e-5)]
    : [0, Math.max(maxValue * 1.1, 1e-6)]

  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="mb-5">
        <h3 className="text-sm font-semibold">{settings.title}</h3>
        <p className="text-xs text-muted-foreground mt-1 font-mono">
          {settings.subtitle}
        </p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 8, right: 64, bottom: 24, left: 16 }}>
          {settings.showGrid && (
            <CartesianGrid strokeDasharray="2 6" stroke={gridColor} vertical={false} />
          )}

          {/* SIL bands */}
          {settings.showSILBands && SIL_BANDS.map(({ y1, y2, fill, label }) => (
            <ReferenceArea
              key={label}
              y1={y1} y2={y2}
              fill={fill}
              fillOpacity={isDark ? 0.04 : 0.025}
            />
          ))}

          {/* SIL limit lines */}
          {settings.showSILBands && SIL_BANDS.map(({ y1, fill, label }) => (
            <ReferenceLine
              key={label}
              y={y1}
              stroke={fill}
              strokeDasharray="3 8"
              strokeOpacity={0.5}
              label={{
                value: label, fill, fontSize: 9,
                position: 'right', fontFamily: 'IBM Plex Mono, monospace',
              }}
            />
          ))}

          <XAxis
            dataKey="t"
            stroke={axisColor}
            tick={{ fill: tickColor, fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }}
            label={{
              value: 'Time (years)', position: 'insideBottom', offset: -14,
              fill: tickColor, fontSize: 10,
            }}
          />
          <YAxis
            scale={settings.yScale}
            domain={yDomain}
            stroke={axisColor}
            tick={{ fill: tickColor, fontSize: 9, fontFamily: 'IBM Plex Mono, monospace' }}
            tickFormatter={settings.yScale === 'log' ? logTickFormatter : formatLinearTick}
            label={{ value: 'PFD', angle: -90, position: 'insideLeft', fill: tickColor, fontSize: 10, offset: 8 }}
          />

          <Tooltip content={<ChartTooltip />} />

          {settings.showLegend && (
            <Legend
              formatter={(value, entry: any) => (
                <span style={{
                  color: entry.dataKey === 'total'
                    ? totalColor
                    : sif.subsystems.find(s => s.id === entry.dataKey)?.type
                      ? subsystemColors[sif.subsystems.find(s => s.id === entry.dataKey)!.type]
                      : tickColor,
                  fontSize: 11,
                }}>
                  {value}
                </span>
              )}
            />
          )}

          {settings.showSubsystems && sif.subsystems.map(sub => (
            <Line
              key={sub.id}
              type="linear"
              dataKey={sub.id}
              name={sub.label}
              stroke={subsystemColors[sub.type] ?? tickColor}
              strokeWidth={1.5}
              dot={false}
              opacity={0.7}
            />
          ))}

          <Line
            type="linear"
            dataKey="total"
            name="Total SIF"
            stroke={totalColor}
            strokeWidth={2.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
