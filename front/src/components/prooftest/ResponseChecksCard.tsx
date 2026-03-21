import { Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { getSifExploitationStrings } from '@/i18n/sifExploitation'
import { useLocaleStrings } from '@/i18n/useLocale'
import {
  type PTResponseCheck,
  RESPONSE_CHECK_TYPE_META,
  inputCls,
} from './proofTestTypes'
import { getProofTestResponseCheckTypeLabel } from './proofTestI18n'

const TABLE_HOVER = 'rgba(0, 155, 164, 0.04)'

interface Props {
  editMode: boolean
  responseChecks: PTResponseCheck[]
  addResponseCheck: () => void
  updateResponseCheck: (id: string, patch: Partial<PTResponseCheck>) => void
  removeResponseCheck: (id: string) => void
}

function parseNullableNumber(value: string): number | null {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function ResponseChecksCard({
  editMode,
  responseChecks,
  addResponseCheck,
  updateResponseCheck,
  removeResponseCheck,
}: Props) {
  const strings = useLocaleStrings(getSifExploitationStrings)
  const { BORDER, CARD_BG, PAGE_BG, TEAL, TEXT, TEXT_DIM, SHADOW_CARD } = usePrismTheme()

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: CARD_BG, borderColor: BORDER, boxShadow: SHADOW_CARD }}>
      <div className="px-5 py-4 border-b" style={{ background: PAGE_BG, borderColor: BORDER }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>{strings.responseChecks.title}</p>
            <p className="text-sm font-semibold mt-1" style={{ color: TEXT }}>{strings.responseChecks.subtitle}</p>
            <p className="text-xs mt-1 max-w-2xl" style={{ color: TEXT_DIM }}>
              {strings.responseChecks.description}
            </p>
          </div>
          {editMode && (
            <button
              type="button"
              onClick={addResponseCheck}
              className="h-8 px-3 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 shrink-0"
              style={{ background: TEAL }}
            >
              <Plus size={12} />
              {strings.responseChecks.actions.add}
            </button>
          )}
        </div>
      </div>

      {responseChecks.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: BORDER, background: PAGE_BG }}>
                <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest w-48" style={{ color: TEXT_DIM }}>{strings.responseChecks.tableHeaders.equipment}</th>
                <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>{strings.responseChecks.tableHeaders.description}</th>
                <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest w-36" style={{ color: TEXT_DIM }}>{strings.responseChecks.tableHeaders.measurement}</th>
                <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest w-28" style={{ color: TEXT_DIM }}>{strings.responseChecks.tableHeaders.target}</th>
                <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest w-28" style={{ color: TEXT_DIM }}>{strings.responseChecks.tableHeaders.maxLimit}</th>
                {editMode && <th className="w-10" />}
              </tr>
            </thead>
            <tbody>
              {responseChecks.map(check => {
                const meta = RESPONSE_CHECK_TYPE_META[check.type]
                const typeLabel = getProofTestResponseCheckTypeLabel(strings, check.type)
                return (
                  <tr
                    key={check.id}
                    className="border-b group transition-colors"
                    style={{ borderColor: BORDER }}
                    onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = TABLE_HOVER }}
                    onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
                  >
                    <td className="px-4 py-3 align-top">
                      {editMode ? (
                        <input
                          value={check.label}
                          onChange={e => updateResponseCheck(check.id, { label: e.target.value })}
                          placeholder={strings.responseChecks.placeholders.label}
                          className={cn(inputCls, 'w-full h-8')}
                        />
                      ) : (
                        <div className="space-y-1">
                          <p className="font-semibold" style={{ color: TEXT }}>{check.label || strings.responseChecks.values.untitledCheck}</p>
                          <span
                            className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold"
                            style={{ background: `${meta.color}15`, color: meta.color }}
                          >
                            {typeLabel}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {editMode ? (
                        <input
                          value={check.description}
                          onChange={e => updateResponseCheck(check.id, { description: e.target.value })}
                          placeholder={strings.responseChecks.placeholders.description}
                          className={cn(inputCls, 'w-full h-8')}
                        />
                      ) : (
                        <span style={{ color: TEXT_DIM }}>{check.description || '—'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {editMode ? (
                        <select
                          value={check.type}
                          onChange={e => updateResponseCheck(check.id, { type: e.target.value as PTResponseCheck['type'] })}
                          className={cn(inputCls, 'w-full h-8')}
                        >
                          {Object.keys(RESPONSE_CHECK_TYPE_META).map(type => (
                            <option key={type} value={type}>{getProofTestResponseCheckTypeLabel(strings, type as PTResponseCheck['type'])}</option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold"
                          style={{ background: `${meta.color}15`, color: meta.color }}
                        >
                          {typeLabel}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {editMode ? (
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={check.expectedMs ?? ''}
                            onChange={e => updateResponseCheck(check.id, { expectedMs: parseNullableNumber(e.target.value) })}
                            placeholder={strings.responseChecks.placeholders.expectedMs}
                            className={cn(inputCls, 'w-full h-8 pr-10 font-mono')}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold" style={{ color: TEXT_DIM }}>ms</span>
                        </div>
                      ) : (
                        <span className="font-mono font-semibold" style={{ color: TEXT }}>
                          {check.expectedMs !== null ? `${check.expectedMs} ms` : '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {editMode ? (
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={check.maxAllowedMs ?? ''}
                            onChange={e => updateResponseCheck(check.id, { maxAllowedMs: parseNullableNumber(e.target.value) })}
                            placeholder={strings.responseChecks.placeholders.maxAllowedMs}
                            className={cn(inputCls, 'w-full h-8 pr-10 font-mono')}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold" style={{ color: TEXT_DIM }}>ms</span>
                        </div>
                      ) : (
                        <span className="font-mono font-semibold" style={{ color: TEXT }}>
                          {check.maxAllowedMs !== null ? `${check.maxAllowedMs} ms` : '—'}
                        </span>
                      )}
                    </td>
                    {editMode && (
                      <td className="px-2 py-3 align-top">
                        <button
                          type="button"
                          onClick={() => removeResponseCheck(check.id)}
                          className="p-1 rounded opacity-0 group-hover:opacity-100 transition-all"
                          style={{ color: TEXT_DIM }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-5 py-6 text-sm text-center" style={{ color: TEXT_DIM }}>
          {editMode ? strings.responseChecks.values.emptyEdit : strings.responseChecks.values.emptyReadOnly}
        </div>
      )}
    </div>
  )
}
