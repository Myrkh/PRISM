import { Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BORDER, SURFACE, TEAL, TEXT, TEXT_DIM } from '@/styles/tokens'
import {
  type PTResponseCheck,
  RESPONSE_CHECK_TYPE_META,
  inputCls,
} from './proofTestTypes'

const TABLE_BG = '#14181C'
const TABLE_HEAD_BG = SURFACE
const TABLE_HOVER = 'rgba(0, 155, 164, 0.04)'
const BORDER_VIS = '#363F49'

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
  return (
    <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ background: TABLE_BG, borderColor: BORDER_VIS }}>
      <div className="px-5 py-4 border-b" style={{ background: TABLE_HEAD_BG, borderColor: BORDER }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Mesures dynamiques</p>
            <p className="text-sm font-semibold mt-1" style={{ color: TEXT }}>Temps de manoeuvre et temps de reponse a relever pendant l&apos;execution</p>
            <p className="text-xs mt-1 max-w-2xl" style={{ color: TEXT_DIM }}>
              Definissez ici les actionneurs et temps cibles a mesurer. Ils seront saisis pendant l&apos;execution, puis traces dans le rapport PDF proof test.
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
              Ajouter une mesure
            </button>
          )}
        </div>
      </div>

      {responseChecks.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: BORDER, background: TABLE_HEAD_BG }}>
                <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest w-48" style={{ color: TEXT_DIM }}>Repere / equipement</th>
                <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Description</th>
                <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest w-36" style={{ color: TEXT_DIM }}>Mesure</th>
                <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest w-28" style={{ color: TEXT_DIM }}>Cible</th>
                <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest w-28" style={{ color: TEXT_DIM }}>Limite max</th>
                {editMode && <th className="w-10" />}
              </tr>
            </thead>
            <tbody>
              {responseChecks.map(check => {
                const meta = RESPONSE_CHECK_TYPE_META[check.type]
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
                          placeholder="XV-101 / Shutdown valve"
                          className={cn(inputCls, 'w-full h-8')}
                        />
                      ) : (
                        <div className="space-y-1">
                          <p className="font-semibold" style={{ color: TEXT }}>{check.label || 'Untitled check'}</p>
                          <span
                            className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold"
                            style={{ background: `${meta.color}15`, color: meta.color }}
                          >
                            {meta.label}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {editMode ? (
                        <input
                          value={check.description}
                          onChange={e => updateResponseCheck(check.id, { description: e.target.value })}
                          placeholder="Close stroke / total SIF reaction"
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
                          {Object.entries(RESPONSE_CHECK_TYPE_META).map(([type, typeMeta]) => (
                            <option key={type} value={type}>{typeMeta.label}</option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold"
                          style={{ background: `${meta.color}15`, color: meta.color }}
                        >
                          {meta.label}
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
                            placeholder="1500"
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
                            placeholder="2000"
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
                          className="p-1 rounded text-[#8FA0B1] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
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
          {editMode
            ? 'Aucune mesure dynamique definie. Ajoutez les temps a relever avant la phase de signature.'
            : 'Aucune mesure dynamique n est configuree pour cette procedure.'}
        </div>
      )}
    </div>
  )
}
