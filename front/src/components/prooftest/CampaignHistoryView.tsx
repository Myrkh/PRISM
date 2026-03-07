/**
 * prooftest/CampaignHistoryView.tsx — PRISM
 *
 * Campaign history: KPI strip + past campaign list table.
 */
import { BarChart3 } from 'lucide-react'
import { BORDER, SURFACE, TEAL, TEXT, TEXT_DIM, NAVY } from '@/styles/tokens'
import type { PTCampaign } from './proofTestTypes'

const TABLE_BG      = '#14181C'
const TABLE_HEAD_BG = SURFACE
const TABLE_HOVER   = 'rgba(0, 155, 164, 0.04)'
const BORDER_VIS    = '#363F49'

interface Props {
  campaigns: PTCampaign[]
  onViewCampaign: (campaign: PTCampaign) => void
}

export function CampaignHistoryView({ campaigns, onViewCampaign }: Props) {
  if (campaigns.length === 0) {
    return (
      <div className="rounded-2xl border shadow-sm p-16 text-center" style={{ background: SURFACE, borderColor: BORDER_VIS }}>
        <BarChart3 size={32} className="mx-auto mb-3 opacity-20" style={{ color: NAVY }} />
        <p className="font-semibold text-sm" style={{ color: TEXT }}>Aucun test réalisé</p>
        <p className="text-xs mt-1" style={{ color: TEXT_DIM }}>Les campagnes de test apparaîtront ici</p>
      </div>
    )
  }

  const passRate = Math.round(campaigns.filter(c => c.verdict === 'pass').length / campaigns.length * 100)

  return (
    <div className="space-y-3">
      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Tests réalisés', value: campaigns.length,        color: TEXT },
          { label: 'Taux de réussite', value: `${passRate}%`,        color: '#4ADE80' },
          { label: 'Dernier test',   value: campaigns[0]?.date ?? '—', color: TEAL },
        ].map(k => (
          <div key={k.label} className="rounded-2xl border shadow-sm px-5 py-4" style={{ background: SURFACE, borderColor: BORDER_VIS }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: TEXT_DIM }}>{k.label}</p>
            <p className="text-2xl font-bold font-mono" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Campaign list */}
      <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ background: TABLE_BG, borderColor: BORDER_VIS }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: TABLE_HEAD_BG }}>
              {['Date', 'Équipe', 'Verdict', 'Étapes OK', 'Réalisé par', 'Témoin', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {campaigns.map(c => {
              const ok  = c.stepResults.filter(r => r.result === 'oui' || r.conformant === true).length
              const tot = c.stepResults.length
              const vCfg = c.verdict === 'pass' ? { label: 'PASS', bg: '#052E16', color: '#4ADE80', border: '#15803D30' } :
                           c.verdict === 'fail' ? { label: 'FAIL', bg: '#2A1215', color: '#F87171', border: '#7F1D1D55' } :
                           c.verdict === 'conditional' ? { label: 'COND.', bg: '#1C1500', color: '#F59E0B', border: '#B4530830' } :
                           { label: '—', bg: '#1A1F24', color: '#8FA0B1', border: '#2A3138' }
              return (
                <tr key={c.id}
                  className="border-b transition-colors"
                  style={{ borderColor: BORDER }}
                  onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = TABLE_HOVER }}
                  onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
                >
                  <td className="px-4 py-3 font-mono" style={{ color: TEXT }}>{c.date}</td>
                  <td className="px-4 py-3" style={{ color: TEXT }}>{c.team || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded border"
                      style={{ background: vCfg.bg, color: vCfg.color, borderColor: vCfg.border }}
                    >{vCfg.label}</span>
                  </td>
                  <td className="px-4 py-3 font-mono">
                    <span className={ok === tot ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>{ok}</span>
                    <span style={{ color: TEXT_DIM }}>/ {tot}</span>
                  </td>
                  <td className="px-4 py-3" style={{ color: TEXT }}>{c.conductedBy || '—'}</td>
                  <td className="px-4 py-3" style={{ color: TEXT }}>{c.witnessedBy || '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => onViewCampaign(c)}
                      className="text-[10px] font-semibold transition-colors hover:underline"
                      style={{ color: TEAL }}
                    >Voir →</button>
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
