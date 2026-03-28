import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { renderPdfPagesToBlob } from '@/lib/pdf'
import { useAppStore } from '@/store/appStore'
import {
  calcComponentDC,
  calcComponentPFDValue,
  calcComponentSFF,
  calcSubComponentPFDValue,
  developedToFactorized,
  factorizedToDeveloped,
  formatPFD,
  formatRRF,
  formatPct,
} from '@/core/math/pfdCalc'
import { normalizeSubComponent, type NormalizedSubElement } from '@/core/models/subComponents'
import { assumptionsToReportText } from '@/core/models/sifAssumptions'
import { SIL_META } from '@/core/types'
import type { Project, SIF, SIFCalcResult, SILLevel } from '@/core/types'
import type { ReportConfig } from './reportTypes'

const SUB_COLORS: Record<string, string> = {
  sensor: '#0891B2', logic: '#6366F1', actuator: '#EA580C',
}

const SIL_COLORS: Record<number, string> = {
  0: '#6B7280', 1: '#16A34A', 2: '#2563EB', 3: '#D97706', 4: '#7C3AED',
}

const ASSUMPTION_STATUS_META: Record<string, { label: string; bg: string; color: string; border: string }> = {
  draft: { label: 'Draft', bg: '#F1F5F9', color: '#64748B', border: '#CBD5E1' },
  review: { label: 'Review', bg: '#FFF7E8', color: '#C27803', border: '#F3D18B' },
  validated: { label: 'Validated', bg: '#EAF8EF', color: '#15803D', border: '#B7E4C7' },
}

const ASSUMPTION_CATEGORY_LABELS: Record<string, string> = {
  process: 'Process',
  proof: 'Proof test',
  architecture: 'Architecture',
  data: 'Data',
  governance: 'Governance',
  other: 'Other',
}

const ASSUMPTION_TAB_LABELS: Record<string, string> = {
  cockpit: 'Cockpit',
  context: 'Context',
  architecture: 'Architecture',
  verification: 'Verification',
  exploitation: 'Exploitation',
  report: 'Report',
  overview: 'Cockpit',
  analysis: 'Verification',
  compliance: 'Verification',
  prooftest: 'Exploitation',
}

export function getDefaultReportConfig(input: {
  project: Project
  sif: SIF
  result: SIFCalcResult
  prefs?: {
    reportConfidentialityLabel?: string
    reportPreparedBy?: string
    reportCheckedBy?: string
    reportApprovedBy?: string
  }
}): ReportConfig {
  const { project, sif, result, prefs } = input

  return {
    title: `${sif.sifNumber} — SIL Verification Report`,
    docRef: `${project.ref || 'PRJ'}-${sif.sifNumber}-SIL-RPT`,
    version: `Rev. ${sif.revision}`,
    scope: sif.description || 'Define the scope of this Safety Instrumented Function.',
    hazardDescription: sif.hazardousEvent || '',
    assumptions: assumptionsToReportText(sif.assumptions),
    recommendations: result.meetsTarget
      ? `SIL ${sif.targetSIL} is achieved. Maintain proof test intervals and document any architectural changes during the operational life of the SIF.`
      : `Current architecture does not achieve SIL ${sif.targetSIL}. Consider: (1) increasing architecture redundancy, (2) reducing proof test interval T1, (3) improving diagnostic coverage.`,
    preparedBy: sif.madeBy || prefs?.reportPreparedBy || '',
    checkedBy: sif.verifiedBy || prefs?.reportCheckedBy || '',
    approvedBy: sif.approvedBy || prefs?.reportApprovedBy || '',
    showPFDChart: true,
    showSubsystemTable: true,
    showComponentTable: true,
    showComplianceMatrix: true,
    showAssumptions: true,
    showRecommendations: true,
    confidentialityLabel: prefs?.reportConfidentialityLabel || 'Internal / Restricted',
  }
}

export function getSILReportFileName(cfg: ReportConfig, sif: SIF): string {
  return `${cfg.docRef || sif.sifNumber || 'SIL-Report'}`.replace(/[^a-zA-Z0-9-_]+/g, '_')
}

type ReportComponentLike = SIF['subsystems'][number]['channels'][number]['components'][number] | NormalizedSubElement

interface ReportComponentRow {
  key: string
  channelLabel: string
  tagName: string
  instrumentType: string
  lambdaValue: number
  dcd: number
  t1: number
  t1Unit: 'hr' | 'yr'
  mttr: number
  sff: number
  dc: number
  pfd: number
  isSubcomponent: boolean
  parentTagName?: string
}

function toReportDeveloped(component: ReportComponentLike) {
  return component.paramMode === 'developed' && component.developed
    ? component.developed
    : factorizedToDeveloped(component.factorized)
}

function toReportFactorized(component: ReportComponentLike) {
  const developed = toReportDeveloped(component)
  return component.paramMode === 'developed'
    ? developedToFactorized(developed, component.factorized)
    : component.factorized
}

function buildReportComponentRows(
  subsystem: SIF['subsystems'][number] | undefined,
  calcComponents: SIFCalcResult['subsystems'][number]['components'],
): ReportComponentRow[] {
  if (!subsystem) return []

  const calcById = new Map(calcComponents.map(component => [component.componentId, component]))
  const rows: ReportComponentRow[] = []

  for (const channel of subsystem.channels) {
    const channelLabel = channel.label || channel.id

    for (const component of channel.components) {
      const calc = calcById.get(component.id)
      const factorized = toReportFactorized(component)
      const developed = toReportDeveloped(component)

      rows.push({
        key: `${channel.id}:${component.id}`,
        channelLabel,
        tagName: component.tagName,
        instrumentType: component.instrumentType || '—',
        lambdaValue: factorized.lambda,
        dcd: factorized.DCd,
        t1: component.test.T1,
        t1Unit: component.test.T1Unit,
        mttr: component.advanced.MTTR,
        sff: calc?.SFF ?? calcComponentSFF(developed),
        dc: calc?.DC ?? calcComponentDC(developed),
        pfd: calc?.PFD_avg ?? calcComponentPFDValue(component),
        isSubcomponent: false,
      })

      for (const subComponent of component.subComponents ?? []) {
        const normalized = normalizeSubComponent(component, subComponent)
        const subFactorized = toReportFactorized(normalized)
        const subDeveloped = toReportDeveloped(normalized)

        rows.push({
          key: `${channel.id}:${component.id}:${subComponent.id}`,
          channelLabel,
          tagName: normalized.tagName,
          instrumentType: normalized.instrumentType || normalized.description || '—',
          lambdaValue: subFactorized.lambda,
          dcd: subFactorized.DCd,
          t1: normalized.test.T1,
          t1Unit: normalized.test.T1Unit,
          mttr: normalized.advanced.MTTR,
          sff: calcComponentSFF(subDeveloped),
          dc: calcComponentDC(subDeveloped),
          pfd: calcSubComponentPFDValue(component, subComponent),
          isSubcomponent: true,
          parentTagName: component.tagName,
        })
      }
    }
  }

  return rows
}

function PFDSawtoothSVG({
  chartData,
  sif,
  width = 640,
  height = 200,
}: {
  chartData: { t: number; total: number; [key: string]: number }[]
  sif: SIF
  width?: number
  height?: number
}) {
  if (!chartData.length) return null

  const PAD = { top: 16, right: 48, bottom: 36, left: 52 }
  const W = width - PAD.left - PAD.right
  const H = height - PAD.top - PAD.bottom
  const LOG_MIN = -7
  const LOG_MAX = -0.3

  const logY = (v: number) => {
    const l = Math.log10(Math.max(v, 1e-8))
    return H - ((l - LOG_MIN) / (LOG_MAX - LOG_MIN)) * H
  }

  const tMax = chartData[chartData.length - 1]?.t ?? 6
  const xScale = (t: number) => (t / tMax) * W

  const totalPath = chartData
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(d.t).toFixed(1)},${logY(d.total).toFixed(1)}`)
    .join(' ')

  const subPaths = sif.subsystems.map(sub => ({
    id: sub.id,
    type: sub.type,
    color: SUB_COLORS[sub.type] ?? '#6B7280',
    path: chartData
      .filter(d => d[sub.id] > 0)
      .map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(d.t).toFixed(1)},${logY(d[sub.id]).toFixed(1)}`)
      .join(' '),
  }))

  const silLimits = [
    { pfd: 1e-1, label: 'SIL 1', color: '#16A34A' },
    { pfd: 1e-2, label: 'SIL 2', color: '#2563EB' },
    { pfd: 1e-3, label: 'SIL 3', color: '#D97706' },
    { pfd: 1e-4, label: 'SIL 4', color: '#7C3AED' },
  ]

  const yTicks = [-6, -5, -4, -3, -2, -1].map(exp => ({
    exp,
    y: logY(Math.pow(10, exp)),
    label: `10⁻${Math.abs(exp)}`,
  }))

  const xTicks = Array.from({ length: Math.ceil(tMax) + 1 }, (_, i) => i).filter(t => t <= tMax)

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ fontFamily: 'monospace', overflow: 'visible' }}
    >
      <g transform={`translate(${PAD.left},${PAD.top})`}>
        {yTicks.map(t => (
          <line key={t.exp} x1={0} y1={t.y} x2={W} y2={t.y}
            stroke="#E5E7EB" strokeWidth="0.5" strokeDasharray="3,5" />
        ))}

        {silLimits.map((s, i) => {
          const y1 = logY(s.pfd)
          const y2 = i > 0 ? logY(silLimits[i - 1].pfd) : 0
          return (
            <rect key={s.label} x={0} y={y1} width={W} height={Math.max(0, y2 - y1)}
              fill={s.color} fillOpacity="0.04" />
          )
        })}

        {silLimits.map(s => {
          const y = logY(s.pfd)
          if (y < 0 || y > H) return null
          return (
            <g key={s.label}>
              <line x1={0} y1={y} x2={W} y2={y}
                stroke={s.color} strokeWidth="0.8" strokeDasharray="4,8" opacity="0.7" />
              <text x={W + 4} y={y + 3} fontSize="8" fill={s.color} fontWeight="600">
                {s.label}
              </text>
            </g>
          )
        })}

        {subPaths.map(s => s.path && (
          <path key={s.id} d={s.path}
            fill="none" stroke={s.color} strokeWidth="1.2" opacity="0.6" />
        ))}

        <path d={totalPath} fill="none" stroke="#003D5C" strokeWidth="2" />
        <line x1={0} y1={0} x2={0} y2={H} stroke="#CBD5E1" strokeWidth="1" />
        <line x1={0} y1={H} x2={W} y2={H} stroke="#CBD5E1" strokeWidth="1" />

        {yTicks.map(t => (
          t.y >= 0 && t.y <= H && (
            <text key={t.exp} x={-4} y={t.y + 3} fontSize="8" fill="#64748B"
              textAnchor="end" fontFamily="monospace">
              10⁻{Math.abs(t.exp)}
            </text>
          )
        ))}

        {xTicks.map(t => {
          const x = xScale(t)
          return (
            <g key={t}>
              <line x1={x} y1={H} x2={x} y2={H + 4} stroke="#CBD5E1" strokeWidth="1" />
              <text x={x} y={H + 13} fontSize="8" fill="#64748B" textAnchor="middle">
                {t}
              </text>
            </g>
          )
        })}

        <text x={W / 2} y={H + 26} fontSize="9" fill="#64748B" textAnchor="middle">
          Time (years)
        </text>
        <text x={-38} y={H / 2} fontSize="9" fill="#64748B" textAnchor="middle"
          transform={`rotate(-90, -38, ${H / 2})`}>
          PFD avg
        </text>

        <g transform={`translate(${W - 160}, -4)`}>
          {subPaths.map((s, i) => (
            <g key={s.id} transform={`translate(0, ${i * 13})`}>
              <line x1={0} y1={5} x2={18} y2={5} stroke={s.color} strokeWidth="1.5" />
              <text x={22} y={9} fontSize="8" fill="#475569">{s.type}</text>
            </g>
          ))}
          <g transform={`translate(0, ${subPaths.length * 13})`}>
            <line x1={0} y1={5} x2={18} y2={5} stroke="#003D5C" strokeWidth="2" />
            <text x={22} y={9} fontSize="8" fill="#1E293B" fontWeight="bold">Total SIF</text>
          </g>
        </g>
      </g>
    </svg>
  )
}

export function ReportDocument({
  project,
  sif,
  result,
  cfg,
  id,
}: {
  project: Project
  sif: SIF
  result: SIFCalcResult
  cfg: ReportConfig
  id: string
}) {
  const meta = SIL_META[result.SIL as SILLevel]
  const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
  const defaultAssumptionsText = assumptionsToReportText(sif.assumptions)
  const assumptionsNote = cfg.assumptions.trim()
  const assumptionsNoteIsCustom = assumptionsNote.length > 0 && assumptionsNote !== defaultAssumptionsText.trim()

  return (
    <div
      id={id}
      className="bg-white text-slate-900 text-xs leading-relaxed"
      style={{ fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif", minWidth: 640 }}
    >
      <div className="relative min-h-[297mm] flex flex-col justify-between p-12 border-b-2 border-slate-200 print-page">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: '#003D5C' }}>PR</div>
              <span className="text-sm font-bold text-slate-900">PRISM</span>
              <span className="text-xs text-slate-400 ml-1">SIL Workspace</span>
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-3" style={{ color: '#009BA4' }}>
              SIL Verification Report
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2 max-w-lg leading-tight">
              {cfg.title}
            </h1>
            <p className="text-sm text-slate-500">{sif.title || sif.sifNumber}</p>
          </div>

          <div
            className="flex flex-col items-center justify-center w-28 h-28 rounded-2xl border-2 shrink-0"
            style={{ borderColor: meta.color, background: `${meta.color}12` }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: meta.color }}>Result</span>
            <span className="text-4xl font-black" style={{ color: meta.color }}>{result.SIL}</span>
            <span className="text-[10px] font-semibold mt-1" style={{ color: meta.color }}>
              {result.meetsTarget ? '✓ Compliant' : '✗ Gap'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 my-10">
          {[
            { label: 'PFDavg', value: formatPFD(result.PFD_avg), mono: true },
            { label: 'RRF', value: formatRRF(result.RRF), mono: true },
            { label: 'Target SIL', value: `SIL ${sif.targetSIL}`, mono: false },
            { label: 'Status', value: sif.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()), mono: false },
          ].map(({ label, value, mono }) => (
            <div key={label} className="rounded-xl border border-gray-200 px-4 py-3" style={{ background: '#F8FAFC' }}>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 mb-1">{label}</p>
              <p className={cn('text-xl font-bold', mono && 'font-mono')}>{value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-x-8 gap-y-3 mb-8">
          {[
            ['Document ref.', cfg.docRef],
            ['Version', cfg.version],
            ['Date', date],
            ['Project', project.name],
            ['SIF number', sif.sifNumber],
            ['P&ID', sif.pid || '—'],
            ['Location', sif.location || '—'],
            ['Standard', project.standard],
            ['Confidentiality', cfg.confidentialityLabel || 'Internal'],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">{label}</p>
              <p className="text-xs font-medium">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            ['Prepared by', cfg.preparedBy],
            ['Checked by', cfg.checkedBy],
            ['Approved by', cfg.approvedBy],
          ].map(([role, name]) => (
            <div key={role as string} className="border border-gray-200 rounded-xl p-4 min-h-[72px]">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 mb-2">{role}</p>
              <p className="text-xs font-semibold">{name || '_______________'}</p>
              <div className="mt-3 border-b border-slate-200 w-full" />
              <p className="text-[9px] text-slate-400 mt-1">Date / Signature</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-6 text-[9px] text-slate-400">
          <span>PRISM · IEC 61508 / IEC 61511 low-demand mode · Preliminary calculation — not a substitute for formal SIL assessment</span>
          <span>{cfg.docRef} · Page 1</span>
        </div>
      </div>

      <div className="p-10 print-page" style={{ pageBreakBefore: 'always' }}>
        <h2 className="text-base font-bold mb-1">1. Executive Summary</h2>
        <div className="w-12 h-0.5 bg-[#009BA4] mb-5" />

        <div
          className="rounded-xl border-l-4 p-4 mb-6 flex items-center justify-between"
          style={{
            borderColor: result.meetsTarget ? '#16A34A' : '#EF4444',
            background: result.meetsTarget ? '#F0FDF4' : '#FEF2F2',
          }}
        >
          <div className="flex items-center gap-3">
            {result.meetsTarget
              ? <CheckCircle2 size={18} color="#16A34A" />
              : <AlertTriangle size={18} color="#EF4444" />
            }
            <div>
              <p className="text-sm font-bold">
                {result.meetsTarget
                  ? `SIL ${sif.targetSIL} requirement is met`
                  : `SIL ${sif.targetSIL} requirement is NOT met`
                }
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Calculated SIL {result.SIL} · PFDavg = {formatPFD(result.PFD_avg)} · RRF = {formatRRF(result.RRF)}
              </p>
            </div>
          </div>
          <div
            className="text-3xl font-black px-5 py-2 rounded-xl"
            style={{ color: meta.color, background: `${meta.color}15` }}
          >
            SIL {result.SIL}
          </div>
        </div>

        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Scope</h3>
        <p className="text-xs leading-relaxed text-slate-700 mb-5">{cfg.scope || '—'}</p>

        {sif.hazardousEvent && (
          <>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Hazardous Event</h3>
            <p className="text-xs leading-relaxed text-slate-700 mb-5">{sif.hazardousEvent}</p>
          </>
        )}

        {cfg.showPFDChart && (
          <div className="mb-6">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-3">
              2. PFD Degradation — Sawtooth Pattern
            </h3>
            <div className="rounded-xl border border-gray-200 p-4" style={{ background: '#F8FAFC' }}>
              <PFDSawtoothSVG chartData={result.chartData} sif={sif} width={580} height={180} />
              <p className="text-[9px] text-slate-400 mt-2 text-center">
                Figure 1 — PFDavg sawtooth over proof test cycles (IEC 61511 §11) · Log₁₀ scale
              </p>
            </div>
          </div>
        )}

        {cfg.showAssumptions && (
          <>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2 mt-5">
              Assumptions & Limitations
            </h3>
            {assumptionsNoteIsCustom && (
              <div className="mb-3 rounded-xl border border-slate-200 p-3" style={{ background: '#F8FAFC' }}>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Report note</p>
                <p className="text-xs leading-relaxed text-slate-700">{assumptionsNote}</p>
              </div>
            )}

            {sif.assumptions.length > 0 ? (
              <div className="space-y-3">
                {sif.assumptions.map(assumption => {
                  const status = ASSUMPTION_STATUS_META[assumption.status] ?? ASSUMPTION_STATUS_META.review
                  return (
                    <div key={assumption.id} className="rounded-xl border border-slate-200 p-3" style={{ background: '#F8FAFC' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">
                            {assumption.title || 'Untitled assumption'}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            <span
                              className="inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                              style={{ background: status.bg, color: status.color, borderColor: status.border }}
                            >
                              {status.label}
                            </span>
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                              {ASSUMPTION_CATEGORY_LABELS[assumption.category] ?? assumption.category}
                            </span>
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                              {ASSUMPTION_TAB_LABELS[assumption.linkedTab] ?? assumption.linkedTab}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-3">
                        <div>
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Statement</p>
                          <p className="text-xs leading-relaxed text-slate-700">{assumption.statement || '—'}</p>
                        </div>

                        {assumption.rationale && (
                          <div>
                            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Rationale</p>
                            <p className="text-xs leading-relaxed text-slate-700">{assumption.rationale}</p>
                          </div>
                        )}

                        {(assumption.owner || assumption.reviewDate) && (
                          <div className="flex flex-wrap gap-4 border-t border-slate-200 pt-2">
                            <div>
                              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Owner</p>
                              <p className="text-[11px] text-slate-700">{assumption.owner || '—'}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Review date</p>
                              <p className="text-[11px] text-slate-700">{assumption.reviewDate || '—'}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs leading-relaxed text-slate-700">{cfg.assumptions}</p>
            )}
          </>
        )}
      </div>

      {cfg.showSubsystemTable && (
        <div className="p-10 print-page" style={{ pageBreakBefore: 'always' }}>
          <h2 className="text-base font-bold mb-1">3. Subsystem Breakdown</h2>
          <div className="w-12 h-0.5 bg-[#009BA4] mb-5" />

          <table className="w-full border-collapse mb-6 text-xs">
            <thead>
              <tr className="text-white" style={{ background: '#003D5C' }}>
                {['Subsystem', 'Architecture', 'PFDavg', 'RRF', 'SFF', 'DC', 'HFT', 'SIL'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.subsystems.map((sub, i) => {
                const subsystem = sif.subsystems[i]
                const color = SUB_COLORS[sub.type] ?? '#6B7280'
                const silColor = SIL_COLORS[sub.SIL] ?? '#6B7280'
                return (
                  <tr key={sub.subsystemId} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-3 py-2 font-semibold border-l-2" style={{ color, borderColor: color }}>
                      {subsystem?.label}
                    </td>
                    <td className="px-3 py-2 font-mono">{subsystem?.architecture}</td>
                    <td className="px-3 py-2 font-mono font-semibold">{formatPFD(sub.PFD_avg)}</td>
                    <td className="px-3 py-2 font-mono">{formatRRF(sub.RRF)}</td>
                    <td className="px-3 py-2 font-mono">{formatPct(sub.SFF)}</td>
                    <td className="px-3 py-2 font-mono">{formatPct(sub.DC)}</td>
                    <td className="px-3 py-2 font-mono">{sub.HFT}</td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 rounded-full text-white text-[10px] font-bold"
                        style={{ background: silColor }}>
                        SIL {sub.SIL}
                      </span>
                    </td>
                  </tr>
                )
              })}
              <tr className="text-white font-bold" style={{ background: '#002A42' }}>
                <td className="px-3 py-2.5" colSpan={2}>Total SIF (series model)</td>
                <td className="px-3 py-2.5 font-mono">{formatPFD(result.PFD_avg)}</td>
                <td className="px-3 py-2.5 font-mono">{formatRRF(result.RRF)}</td>
                <td colSpan={3} />
                <td className="px-3 py-2.5">
                  <span className="px-2 py-0.5 rounded-full text-white text-[10px] font-bold"
                    style={{ background: meta.color }}>
                    SIL {result.SIL}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>

          {result.subsystems.map((sub, i) => {
            const subsystem = sif.subsystems[i]
            const color = SUB_COLORS[sub.type] ?? '#6B7280'
            return (
              <div key={sub.subsystemId} className="mb-4 rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-2.5 flex items-center justify-between"
                  style={{ background: `${color}12`, borderBottom: `2px solid ${color}30` }}>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                    <span className="font-bold text-xs" style={{ color }}>{subsystem?.label}</span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                      style={{ background: `${color}20`, color }}>
                      {subsystem?.architecture}
                    </span>
                  </div>
                  <div className="flex gap-4 text-[10px] font-mono text-slate-500">
                    <span>PFD {formatPFD(sub.PFD_avg)}</span>
                    <span>SFF {formatPct(sub.SFF)}</span>
                    <span>DC {formatPct(sub.DC)}</span>
                    <span>HFT {sub.HFT}</span>
                  </div>
                </div>
                {cfg.showComponentTable && subsystem?.channels.flatMap(ch => ch.components).length > 0 && (() => {
                  const componentRows = buildReportComponentRows(subsystem, sub.components)
                  return (
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="border-b border-gray-200" style={{ background: '#F8FAFC' }}>
                          {['Tag', 'Type', 'λ (×10⁻⁶ h⁻¹)', 'DCd', 'T1', 'MTTR', 'SFF', 'DC', 'PFD'].map(h => (
                            <th key={h} className="px-3 py-1.5 text-left font-semibold text-slate-500">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {componentRows.map((row, ci) => (
                          <tr
                            key={row.key}
                            className={row.isSubcomponent ? 'bg-slate-50/80' : ci % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}
                          >
                            <td className="px-3 py-1.5" style={{ color }}>
                              <div className={cn('space-y-0.5', row.isSubcomponent && 'pl-4')}>
                                <p className="font-mono font-semibold">{row.tagName}</p>
                                <p className="text-[9px] text-slate-400">
                                  {row.isSubcomponent
                                    ? `Sub-component of ${row.parentTagName} · ${row.channelLabel}`
                                    : row.channelLabel}
                                </p>
                              </div>
                            </td>
                            <td className="px-3 py-1.5">{row.instrumentType}</td>
                            <td className="px-3 py-1.5 font-mono">{row.lambdaValue.toFixed(2)}</td>
                            <td className="px-3 py-1.5 font-mono">{(row.dcd * 100).toFixed(0)}%</td>
                            <td className="px-3 py-1.5 font-mono">{row.t1} {row.t1Unit}</td>
                            <td className="px-3 py-1.5 font-mono">{row.mttr} h</td>
                            <td className="px-3 py-1.5 font-mono">{formatPct(row.sff)}</td>
                            <td className="px-3 py-1.5 font-mono">{formatPct(row.dc)}</td>
                            <td className="px-3 py-1.5 font-mono font-semibold">{formatPFD(row.pfd)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                })()}
              </div>
            )
          })}
        </div>
      )}

      {cfg.showComplianceMatrix && (
        <div className="p-10 print-page" style={{ pageBreakBefore: 'always' }}>
          <h2 className="text-base font-bold mb-1">4. Compliance Matrix</h2>
          <div className="w-12 h-0.5 bg-[#009BA4] mb-5" />
          <p className="text-xs text-slate-500 mb-5">
            Compliance verification per IEC 61511-1:2016 Table 6 and IEC 61508-2:2010 §C.3
          </p>

          {result.subsystems.map((sub, i) => {
            const subsystem = sif.subsystems[i]
            const color = SUB_COLORS[sub.type] ?? '#6B7280'
            const sffReq = sub.HFT === 0 ? 0.6 : 0.9
            const checks = [
              { label: `SFF ≥ ${formatPct(sffReq)} (IEC 61508-2 Table 2)`, value: formatPct(sub.SFF), ok: sub.SFF >= sffReq },
              { label: `HFT ≥ ${sub.SIL >= 2 ? 1 : 0} (IEC 61511-1 Table 6)`, value: String(sub.HFT), ok: sub.HFT >= (sub.SIL >= 2 ? 1 : 0) },
              { label: 'DC dangerous ≥ 60%', value: formatPct(sub.DC), ok: sub.DC >= 0.6 },
              { label: 'PFDavg within SIL band', value: formatPFD(sub.PFD_avg), ok: sub.SIL > 0 },
            ]
            const allOk = checks.every(c => c.ok)
            return (
              <div key={sub.subsystemId} className="mb-4 rounded-xl border overflow-hidden"
                style={{ borderColor: allOk ? '#BBF7D0' : '#FECACA' }}>
                <div className="flex items-center justify-between px-4 py-2.5"
                  style={{ background: allOk ? '#F0FDF4' : '#FEF2F2' }}>
                  <span className="font-bold text-xs" style={{ color }}>{subsystem?.label}</span>
                  <span className={cn('flex items-center gap-1.5 text-xs font-semibold',
                    allOk ? 'text-emerald-600' : 'text-red-600')}>
                    {allOk ? '✓ Compliant' : '✗ Non-compliant'}
                  </span>
                </div>
                <table className="w-full text-[10px]">
                  <tbody>
                    {checks.map(c => (
                      <tr key={c.label} className="border-t border-slate-100">
                        <td className="px-4 py-2 text-slate-600">{c.label}</td>
                        <td className="px-4 py-2 font-mono font-semibold">{c.value}</td>
                        <td className="px-4 py-2 text-right">
                          <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-bold',
                            c.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}>
                            {c.ok ? 'PASS' : 'FAIL'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}

          <div
            className="mt-6 rounded-xl border-2 p-5 flex items-center justify-between"
            style={{
              borderColor: result.meetsTarget ? '#16A34A' : '#EF4444',
              background: result.meetsTarget ? '#F0FDF4' : '#FEF2F2',
            }}
          >
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Final Verdict — IEC 61511 Low Demand Mode
              </p>
              <p className="text-xl font-bold font-mono">PFDavg = {formatPFD(result.PFD_avg)}</p>
              <p className="text-xs text-slate-600 mt-1">
                {result.meetsTarget
                  ? `✓ Meets SIL ${sif.targetSIL} requirement (PFD target: ${formatPFD(Math.pow(10, -sif.targetSIL))})`
                  : `✗ Does not meet SIL ${sif.targetSIL} — review architecture and/or proof test intervals`
                }
              </p>
            </div>
            <div className="text-center">
              <p className="text-[9px] uppercase tracking-wider text-slate-400 mb-1">Required RRF</p>
              <p className="text-lg font-bold font-mono">{sif.rrfRequired ?? '—'}</p>
              <p className="text-[9px] text-slate-500 mt-1">Achieved: {formatRRF(result.RRF)}</p>
            </div>
            <div className="text-center px-6 py-4 rounded-xl"
              style={{ background: `${meta.color}15`, border: `2px solid ${meta.color}` }}>
              <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: meta.color }}>Result</p>
              <p className="text-4xl font-black" style={{ color: meta.color }}>SIL {result.SIL}</p>
            </div>
          </div>

          {cfg.showRecommendations && (
            <div className="mt-5">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Recommendations
              </h3>
              <p className="text-xs leading-relaxed text-slate-700">{cfg.recommendations}</p>
            </div>
          )}

          <div className="mt-8 p-4 rounded-lg border text-[9px] leading-relaxed" style={{ background: '#F0F4F8', borderColor: '#E2E8F0', color: '#64748B' }}>
            <strong className="text-slate-700">Methodology: </strong>
            IEC 61508-6:2010 Annex B Eq. B.10a/B.11 · SFF per IEC 61508-2:2010 §C.3 ·
            HFT per IEC 61511-1:2016 Table 6 · β-factor CCF per IEC 61508-6 Annex D ·
            Low demand mode · Series model for SIF total PFD.
            <br />
            <strong className="text-amber-600">⚠ </strong>
            This document is a preliminary engineering calculation. It is not a substitute for
            a formal SIL verification performed by a competent person in accordance with IEC 61511.
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-6 text-[9px] text-slate-400">
            <span>PRISM · SIL Workspace · {project.name} · {sif.sifNumber} · {date}</span>
            <span>{cfg.docRef} · {cfg.version} · Page 4</span>
          </div>
        </div>
      )}
    </div>
  )
}

export async function buildSILReportPdfBlob(input: {
  project: Project
  sif: SIF
  result: SIFCalcResult
  cfg?: ReportConfig
}): Promise<{ blob: Blob; cfg: ReportConfig; fileName: string }> {
  const cfg = input.cfg ?? getDefaultReportConfig(input)
  const fileName = getSILReportFileName(cfg, input.sif)
  const pageFormat = useAppStore.getState().preferences.pdfPageSize
  const blob = await renderPdfPagesToBlob({
    pageFormat,
    element: (
      <div className="mx-auto shadow-2xl" style={{ maxWidth: 794 }}>
        <ReportDocument
          id="sil-report-publication-preview"
          project={input.project}
          sif={input.sif}
          result={input.result}
          cfg={cfg}
        />
      </div>
    ),
  })

  return { blob, cfg, fileName: `${fileName}.pdf` }
}
