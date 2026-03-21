import { usePrismTheme } from '@/styles/usePrismTheme'
import { getSifExploitationStrings } from '@/i18n/sifExploitation'
import { useLocaleStrings } from '@/i18n/useLocale'
import {
  type PTCampaign,
  type PTResponseCheck,
  type PTResponseMeasurement,
  RESPONSE_CHECK_TYPE_META,
  getResponseMeasurementStatus,
  syncResponseMeasurements,
} from './proofTestTypes'
import { getProofTestResponseCheckTypeLabel } from './proofTestI18n'

const TABLE_HOVER = 'rgba(0, 155, 164, 0.04)'

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
  const strings = useLocaleStrings(getSifExploitationStrings)
  const { BORDER, CARD_BG, PAGE_BG, TEXT, TEXT_DIM, semantic } = usePrismTheme()
  const STATUS_META = {
    pending: { label: strings.responseMeasurements.statuses.pending, bg: PAGE_BG, color: TEXT_DIM, border: BORDER },
    pass: { label: strings.responseMeasurements.statuses.pass, bg: `${semantic.success}12`, color: semantic.success, border: `${semantic.success}30` },
    fail: { label: strings.responseMeasurements.statuses.fail, bg: `${semantic.error}10`, color: semantic.error, border: `${semantic.error}28` },
  } as const

  if (responseChecks.length === 0) return null

  const measurements = syncResponseMeasurements(responseChecks, activeCampaign.responseMeasurements)

  return (
    <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ background: CARD_BG, borderColor: BORDER }}>
      <div className="px-5 py-4 border-b" style={{ background: PAGE_BG, borderColor: BORDER }}>
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>{strings.responseMeasurements.title}</p>
        <p className="text-sm font-semibold mt-1" style={{ color: TEXT }}>{strings.responseMeasurements.subtitle}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b" style={{ borderColor: BORDER, background: PAGE_BG }}>
              <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest w-48" style={{ color: TEXT_DIM }}>{strings.responseMeasurements.tableHeaders.equipment}</th>
              <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest w-32" style={{ color: TEXT_DIM }}>{strings.responseMeasurements.tableHeaders.measurement}</th>
              <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest w-24" style={{ color: TEXT_DIM }}>{strings.responseMeasurements.tableHeaders.target}</th>
              <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest w-28" style={{ color: TEXT_DIM }}>{strings.responseMeasurements.tableHeaders.maxLimit}</th>
              <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest w-28" style={{ color: TEXT_DIM }}>{strings.responseMeasurements.tableHeaders.measured}</th>
              <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest w-24" style={{ color: TEXT_DIM }}>{strings.responseMeasurements.tableHeaders.status}</th>
              <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>{strings.responseMeasurements.tableHeaders.comment}</th>
            </tr>
          </thead>
          <tbody>
            {responseChecks.map(check => {
              const measurement = measurements.find(item => item.checkId === check.id)
              const status = getResponseMeasurementStatus(check, measurement)
              const statusMeta = STATUS_META[status]
              const typeMeta = RESPONSE_CHECK_TYPE_META[check.type]
              const typeLabel = getProofTestResponseCheckTypeLabel(strings, check.type)

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
                      <p className="font-semibold" style={{ color: TEXT }}>{check.label || strings.responseMeasurements.values.untitledCheck}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold"
                          style={{ background: `${typeMeta.color}15`, color: typeMeta.color }}
                        >
                          {typeLabel}
                        </span>
                        {check.description && (
                          <span className="text-[10px]" style={{ color: TEXT_DIM }}>{check.description}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold" style={{ color: TEXT }}>
                    {typeLabel}
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
                        className="h-8 w-full rounded-xl border px-3 pr-10 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#009BA4]/30 focus:border-[#009BA4] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                        style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT }}
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
                      placeholder={strings.responseMeasurements.placeholders.comment}
                      className="w-full bg-transparent text-[10px] outline-none border-b border-transparent focus:border-[#009BA4] py-0.5 placeholder:text-[#667085] dark:placeholder:text-[#8FA0B1] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
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
