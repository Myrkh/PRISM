import { SIL_META, type SILLevel } from '@/core/types'

interface SILGaugeProps {
  pfd: number
  size?: number
}

const ZONE_COLORS: [string, number, number][] = [
  ['#16A34A', 0,   0.25],
  ['#2563EB', 0.25, 0.5],
  ['#D97706', 0.5,  0.75],
  ['#7C3AED', 0.75, 1],
]

const classifySILFromPFD = (pfd: number): SILLevel => {
  if (pfd < 1e-5) return 4
  if (pfd < 1e-4) return 3
  if (pfd < 1e-3) return 2
  if (pfd < 1e-2) return 1
  return 0
}

export function SILGauge({ pfd, size = 120 }: SILGaugeProps) {
  const sil  = classifySILFromPFD(pfd)
  const meta = SIL_META[sil]
  const pct  = 1 - (Math.max(-5, Math.min(-1, pfd > 0 ? Math.log10(pfd) : -5)) + 5) / 4

  const r  = size * 0.40
  const cx = size / 2
  const cy = size * 0.60
  const START_DEG = -210
  const SWEEP_DEG = 240

  const toRad = (d: number) => d * Math.PI / 180
  const pt    = (a: number) => ({
    x: cx + r * Math.cos(toRad(a)),
    y: cy + r * Math.sin(toRad(a)),
  })

  const endDeg = START_DEG + pct * SWEEP_DEG
  const S = pt(START_DEG)
  const E = pt(endDeg)
  const fullEnd = pt(START_DEG + SWEEP_DEG)
  const largeArc = (end: number) => end > START_DEG + SWEEP_DEG / 2 ? 1 : 0

  return (
    <svg
      width={size}
      height={size * 0.72}
      viewBox={`0 0 ${size} ${size * 0.72}`}
      aria-label={`SIL gauge: ${meta.label}`}
    >
      {/* Background zones */}
      {ZONE_COLORS.map(([color, from, to], i) => {
        const a1 = START_DEG + from * SWEEP_DEG
        const a2 = START_DEG + to * SWEEP_DEG
        const p1 = pt(a1), p2 = pt(a2)
        return (
          <path key={i}
            d={`M${p1.x} ${p1.y}A${r} ${r} 0 0 1 ${p2.x} ${p2.y}`}
            fill="none" stroke={`${color}40`} strokeWidth={8} strokeLinecap="round"
          />
        )
      })}

      {/* Track */}
      <path
        d={`M${S.x} ${S.y}A${r} ${r} 0 ${largeArc(START_DEG + SWEEP_DEG)} 1 ${fullEnd.x} ${fullEnd.y}`}
        fill="none" stroke="currentColor" strokeOpacity={0.06}
        strokeWidth={4} strokeLinecap="round"
      />

      {/* Active arc */}
      {pct > 0.01 && (
        <path
          d={`M${S.x} ${S.y}A${r} ${r} 0 ${largeArc(endDeg)} 1 ${E.x} ${E.y}`}
          fill="none" stroke={meta.color} strokeWidth={4} strokeLinecap="round"
        />
      )}

      {/* Needle dot */}
      <circle cx={E.x} cy={E.y} r={5} fill={meta.color} />

      {/* Label */}
      <text
        x={cx} y={cy + r * 0.1}
        textAnchor="middle" dominantBaseline="middle"
        style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontWeight: 700,
          fontSize: size * 0.18,
          fill: meta.color,
        }}
      >
        {meta.label}
      </text>
    </svg>
  )
}
