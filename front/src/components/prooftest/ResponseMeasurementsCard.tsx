import { SURFACE, BORDER, TEXT, TEXT_DIM } from '@/styles/tokens'
import {
  type PTCampaign,
  type PTResponseCheck,
  type PTResponseMeasurement,
  RESPONSE_CHECK_TYPE_META,
  getResponseMeasurementStatus,
  syncResponseMeasurements,
} from './proofTestTypes'

const TABLE_BG = '#14181C'
const TABLE_HEAD_BG = SURFACE
const TABLE_HOVER = 'rgba(0, 155, 164, 0.04)'
const BORDER_VIS = '#363F49'

const STATUS_META = {
  pending: { label: 'Pending', bg: '#1F2937', color: '#9CA3AF', border: '#374151' },
  pass: { label: 'PASS', bg: '#052E16', color: '#4ADE80', border: '#166534' },
  fail: { label: 'FAIL', bg: '#450A0A', color: '#F87171', border: '#991B1B' },
} as const

interface Props {
  activeCampaign: PTCampaign
  responseChecks: PTResponseCheck[]
  readOnly?: boolean
  updateResponseMeasurement: (checkId: string, patch: Partial<PTResponseMeasurement>) => void
}

export function ResponseMeasurementsCard({
  activeCampaign,
  responseChecks,
  readOnly = false,
  updateResponseMeasurement,
}: Props) {
  if (responseChecks.length === 0) return null

  const measurements = syncResponseMeasurements(responseChecks, activeCampaign.responseMeasurements)

  return (
    <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ background: TABLE_BG, borderColor: BORDER_VIS }}>
      <div className="px-5 py-4 border-b" style={{ background: TABLE_HEAD_BG, borderColor: BORDER }}>
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Mesures dynamiques</p>
        <p className="text-sm font-semibold mt-1" style={{ color: TEXT }}>Releve des temps reels pendant la campagne</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b" style={{ borderColor: BORDER, background: TABLE_HEAD_BG }}>
              <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest w-48" style={{ color: TEXT_DIM }}>Repere / equipement</th>
              <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest w-32" style={{ color: TEXT_DIM }}>Mesure</th>
              <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest w-24" style={{ color: TEXT_DIM }}>Cible</th>
              <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest w-28" style={{ color: TEXT_DIM }}>Limite max</th>
              <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest w-28" style={{ color: TEXT_DIM }}>Mesuree</th>
              <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest w-24" style={{ color: TEXT_DIM }}>Statut</th>
              <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Commentaire</th>
            </tr>
          </thead>
          <tbody>
            {responseChecks.map(check => {
              const measurement = measurements.find(item => item.checkId === check.id)
              const status = getResponseMeasurementStatus(check, measurement)
              const statusMeta = STATUS_META[status]
              const typeMeta = RESPONSE_CHECK_TYPE_META[check.type]

              return (
                <tr
                  key={check.id}
                  className="border-b transition-colors"
                  style={{ borderColor: BORDER }}
                  onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = TABLE_HOVER }}
                  onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
                >
                  <td className="px-4 py-3 align-top">
                    <div className="space-y-1">
                      <p className="font-semibold" style={{ color: TEXT }}>{check.label || 'Untitled check'}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold"
                          style={{ background: `${typeMeta.color}15`, color: typeMeta.color }}
                        >
                          {typeMeta.label}
                        </span>
                        {check.description && (
                          <span className="text-[10px]" style={{ color: TEXT_DIM }}>{check.description}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold" style={{ color: TEXT }}>
                    {typeMeta.label}
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold" style={{ color: TEXT }}>
                    {check.expectedMs !== null ? `${check.expectedMs} ms` : '—'}
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold" style={{ color: TEXT }}>
                    {check.maxAllowedMs !== null ? `${check.maxAllowedMs} ms` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        disabled={readOnly}
                        value={measurement?.measuredMs ?? ''}
                        onChange={e => updateResponseMeasurement(check.id, { measuredMs: e.target.value })}
                        placeholder="0"
                        className="h-8 w-full rounded-xl border border-[#2A3138] bg-[#1D232A] px-3 pr-10 text-xs font-mono text-[#DFE8F1] focus:outline-none focus:ring-2 focus:ring-[#009BA4]/30 focus:border-[#009BA4] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold" style={{ color: TEXT_DIM }}>ms</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center rounded-md border px-2 py-1 text-[10px] font-bold"
                      style={{ background: statusMeta.bg, color: statusMeta.color, borderColor: statusMeta.border }}
                    >
                      {statusMeta.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      disabled={readOnly}
                      value={measurement?.comment ?? ''}
                      onChange={e => updateResponseMeasurement(check.id, { comment: e.target.value })}
                      placeholder="Observation, drift, reset..."
                      className="w-full bg-transparent text-[10px] outline-none border-b border-transparent focus:border-[#009BA4] py-0.5 placeholder:text-[#8FA0B1] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      style={{ color: TEXT }}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
