/**
 * prooftest/ProcedureView.tsx — PRISM
 *
 * Procedure editor: header card, category sections with step tables,
 * and signatures block. Supports edit mode for inline editing.
 */
import {
  Plus, Trash2, ChevronDown, ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BORDER, SURFACE, TEAL, TEXT, TEXT_DIM } from '@/styles/tokens'
import { ExpectedValueDisplay } from './ResultWidgets'
import { ResponseChecksCard } from './ResponseChecksCard'
import type { PTStep, PTCategory, PTProcedure, PTCampaign, ResultType, PTResponseCheck } from './proofTestTypes'
import { LOCATIONS, CAT_META, STATUS_CFG, inputCls } from './proofTestTypes'

// ─── Table design tokens ─────────────────────────────────────────────────
const TABLE_BG      = '#14181C'
const TABLE_HEAD_BG = SURFACE
const TABLE_HOVER   = 'rgba(0, 155, 164, 0.04)'
const BORDER_VIS    = '#363F49'   // Slightly brighter border for card visibility

interface Props {
  procedure: PTProcedure
  setProcedure: React.Dispatch<React.SetStateAction<PTProcedure>>
  campaigns: PTCampaign[]
  editMode: boolean
  collapsed: Set<string>
  setCollapsed: React.Dispatch<React.SetStateAction<Set<string>>>
  isOverdue: boolean
  daysOverdue: number | null
  nextDue: Date | null
  catsSorted: PTCategory[]
  stepsFor: (catId: string) => PTStep[]
  updateStep: (id: string, patch: Partial<PTStep>) => void
  addStep: (catId: string) => void
  deleteStep: (id: string) => void
  addTestCategory: () => void
  deleteCategory: (id: string) => void
  updateCategory: (id: string, title: string) => void
  addResponseCheck: () => void
  updateResponseCheck: (id: string, patch: Partial<PTResponseCheck>) => void
  removeResponseCheck: (id: string) => void
}

export function ProcedureView({
  procedure, setProcedure, campaigns, editMode,
  collapsed, setCollapsed, isOverdue, daysOverdue, nextDue,
  catsSorted, stepsFor, updateStep, addStep, deleteStep,
  addTestCategory, deleteCategory, updateCategory,
  addResponseCheck, updateResponseCheck, removeResponseCheck,
}: Props) {
  const sm = STATUS_CFG[procedure.status]

  const toggleCollapse = (catId: string) =>
    setCollapsed(s => { const n = new Set(s); n.has(catId) ? n.delete(catId) : n.add(catId); return n })

  return (
    <div className="space-y-3">

      {/* Procedure header card */}
      <div className="rounded-2xl border shadow-sm p-5" style={{ background: SURFACE, borderColor: BORDER_VIS }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Procédure de test périodique</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded border"
                style={{ background: sm.bg, color: sm.color, borderColor: sm.border }}
              >{sm.label}</span>
            </div>
            {editMode ? (
              <input value={procedure.ref} onChange={e => setProcedure(p => ({ ...p, ref: e.target.value }))}
                className={cn(inputCls, 'w-56 font-mono font-bold text-sm mb-1')} />
            ) : (
              <p className="font-mono font-bold text-sm" style={{ color: TEXT }}>{procedure.ref} · Rev. {procedure.revision}</p>
            )}
          </div>

          {/* Key params */}
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: TEXT_DIM }}>Périodicité</p>
              {editMode ? (
                <input type="number" value={procedure.periodicityMonths}
                  onChange={e => setProcedure(p => ({ ...p, periodicityMonths: Number(e.target.value) }))}
                  className={cn(inputCls, 'w-16 text-center font-mono font-bold text-base mt-0.5')} />
              ) : (
                <p className="font-mono font-bold text-lg" style={{ color: TEXT }}>{procedure.periodicityMonths}<span className="text-xs font-normal ml-0.5" style={{ color: TEXT_DIM }}>mois</span></p>
              )}
            </div>
            <div className="text-center">
              <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: TEXT_DIM }}>Tests réalisés</p>
              <p className="font-mono font-bold text-lg" style={{ color: TEAL }}>{campaigns.length}</p>
            </div>
            {nextDue && (
              <div className="text-center">
                <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: TEXT_DIM }}>Prochain test</p>
                <p className={cn('font-mono font-bold text-sm', isOverdue ? 'text-red-500' : 'text-emerald-600')}>
                  {isOverdue ? `J+${daysOverdue}` : nextDue.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category sections */}
      {catsSorted.map(cat => {
        const meta  = CAT_META[cat.type]
        const steps = stepsFor(cat.id)
        const isCollapsed = collapsed.has(cat.id)

        return (
          <div key={cat.id} className="rounded-2xl border shadow-sm overflow-hidden" style={{ background: TABLE_BG, borderColor: BORDER_VIS }}>

            {/* Category header */}
            <div className="flex items-center gap-3 px-5 py-3 border-b"
              style={{ background: TABLE_HEAD_BG, borderColor: BORDER }}
            >
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: meta.color }} />
              {editMode && !meta.locked ? (
                <input value={cat.title}
                  onChange={e => updateCategory(cat.id, e.target.value)}
                  className="flex-1 bg-transparent text-sm font-bold outline-none border-b border-dashed focus:border-[#009BA4] py-0.5 transition-all"
                  style={{ color: meta.color }}
                />
              ) : (
                <span className="flex-1 text-sm font-bold" style={{ color: meta.color }}>{cat.title}</span>
              )}
              <span className="text-[10px] font-semibold" style={{ color: TEXT_DIM }}>{steps.length} étape{steps.length !== 1 ? 's' : ''}</span>
              {editMode && cat.type === 'test' && (
                <button onClick={() => deleteCategory(cat.id)}
                  className="p-1 rounded text-[#8FA0B1] hover:text-red-400 transition-colors"
                ><Trash2 size={12} /></button>
              )}
              <button onClick={() => toggleCollapse(cat.id)}
                className="p-1 rounded text-[#8FA0B1] hover:text-[#DFE8F1] transition-colors"
              >
                {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </button>
            </div>

            {/* Steps table */}
            {!isCollapsed && (
              <>
                {steps.length > 0 && (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b" style={{ borderColor: BORDER, background: TABLE_HEAD_BG }}>
                        <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest w-8" style={{ color: TEXT_DIM }}>#</th>
                        <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Action</th>
                        <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest w-36" style={{ color: TEXT_DIM }}>Lieu</th>
                        <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest w-28" style={{ color: TEXT_DIM }}>Type résultat</th>
                        <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest w-44" style={{ color: TEXT_DIM }}>Résultat attendu</th>
                        {editMode && <th className="w-8" />}
                      </tr>
                    </thead>
                    <tbody>
                      {steps.map((step, si) => (
                        <tr key={step.id}
                          className="border-b group transition-colors"
                          style={{ borderColor: BORDER }}
                          onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = TABLE_HOVER }}
                          onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
                        >
                          <td className="px-4 py-2.5 font-mono font-bold text-[10px]" style={{ color: TEXT_DIM }}>{si + 1}</td>
                          <td className="px-4 py-2.5">
                            {editMode ? (
                              <input value={step.action}
                                onChange={e => updateStep(step.id, { action: e.target.value })}
                                placeholder="Décrire l'action à réaliser…"
                                className="w-full bg-transparent text-xs outline-none border-b border-transparent text-[#DFE8F1] focus:border-[#009BA4] py-0.5 placeholder:text-[#8FA0B1] transition-all"
                              />
                            ) : (
                              <span style={{ color: TEXT }}>{step.action}</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            {editMode ? (
                              <select value={step.location}
                                onChange={e => updateStep(step.id, { location: e.target.value })}
                                className="w-full bg-transparent text-xs outline-none border-b border-transparent text-[#DFE8F1] focus:border-[#009BA4] py-0.5 transition-all"
                              >
                                {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                              </select>
                            ) : (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                style={{ background: `${TEAL}15`, color: TEAL }}
                              >{step.location}</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            {editMode ? (
                              <select value={step.resultType}
                                onChange={e => updateStep(step.id, { resultType: e.target.value as ResultType })}
                                className="w-full bg-transparent text-xs outline-none border-b border-transparent text-[#DFE8F1] focus:border-[#009BA4] py-0.5 transition-all"
                              >
                                <option value="oui_non">Oui / Non</option>
                                <option value="valeur">Valeur</option>
                                <option value="personnalisé">Personnalisé</option>
                              </select>
                            ) : (
                              <span className="text-[10px] font-semibold" style={{ color: TEXT_DIM }}>
                                {step.resultType === 'oui_non' ? 'Oui / Non' : step.resultType === 'valeur' ? 'Valeur' : 'Personnalisé'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            {editMode && step.resultType !== 'oui_non' ? (
                              <input value={step.expectedValue}
                                onChange={e => updateStep(step.id, { expectedValue: e.target.value })}
                                placeholder={step.resultType === 'valeur' ? 'ex: < 500 ms, ≥ 4 mA…' : 'Décrire le résultat attendu…'}
                                className="w-full bg-transparent text-xs outline-none border-b border-transparent text-[#DFE8F1] focus:border-[#009BA4] py-0.5 placeholder:text-[#8FA0B1] transition-all font-mono"
                              />
                            ) : (
                              <ExpectedValueDisplay step={step} />
                            )}
                          </td>
                          {editMode && (
                            <td className="px-2 py-2.5">
                              <button onClick={() => deleteStep(step.id)}
                                className="p-1 rounded text-[#8FA0B1] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                              ><Trash2 size={12} /></button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {editMode && (
                  <div className="px-4 py-2 border-t border-dashed" style={{ borderColor: BORDER }}>
                    <button onClick={() => addStep(cat.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
                      style={{ color: TEAL }}
                    ><Plus size={12} />Ajouter une étape</button>
                  </div>
                )}

                {steps.length === 0 && !editMode && (
                  <div className="px-4 py-4 text-xs text-center" style={{ color: TEXT_DIM }}>
                    Aucune étape — cliquez sur Modifier pour en ajouter
                  </div>
                )}
              </>
            )}
          </div>
        )
      })}

      {/* Add test category button */}
      {editMode && (
        <button onClick={addTestCategory}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed text-sm font-semibold transition-all hover:border-[#009BA4] hover:text-[#009BA4]"
          style={{ color: TEXT_DIM, borderColor: BORDER, background: SURFACE }}
        ><Plus size={14} />Ajouter une catégorie de test</button>
      )}

      <ResponseChecksCard
        editMode={editMode}
        responseChecks={procedure.responseChecks}
        addResponseCheck={addResponseCheck}
        updateResponseCheck={updateResponseCheck}
        removeResponseCheck={removeResponseCheck}
      />

      {/* Signatures */}
      <div className="rounded-2xl border shadow-sm p-5" style={{ background: SURFACE, borderColor: BORDER_VIS }}>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: TEXT_DIM }}>Signatures de la procédure</p>
        <div className="grid grid-cols-3 gap-4">
          {[
            { key: 'madeBy' as const,     keyDate: 'madeByDate' as const,     label: 'Établi par' },
            { key: 'verifiedBy' as const,  keyDate: 'verifiedByDate' as const,  label: 'Vérifié par' },
            { key: 'approvedBy' as const,  keyDate: 'approvedByDate' as const,  label: 'Approuvé par' },
          ].map(({ key, keyDate, label }) => (
            <div key={key} className="border rounded-xl p-4 min-h-[80px]" style={{ borderColor: BORDER_VIS, background: TABLE_BG }}>
              <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: TEXT_DIM }}>{label}</p>
              {editMode ? (
                <div className="space-y-1.5">
                  <input value={procedure[key]} onChange={e => setProcedure(p => ({ ...p, [key]: e.target.value }))}
                    placeholder="Nom Prénom" className={cn(inputCls, 'w-full h-7')} />
                  <input type="date" value={procedure[keyDate]} onChange={e => setProcedure(p => ({ ...p, [keyDate]: e.target.value }))}
                    className={cn(inputCls, 'w-full h-7')} />
                </div>
              ) : (
                <>
                  <p className="text-xs font-semibold" style={{ color: TEXT }}>{procedure[key] || '_______________'}</p>
                  <p className="text-[10px] mt-1" style={{ color: TEXT_DIM }}>{procedure[keyDate] || 'Date / Signature'}</p>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
