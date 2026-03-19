/**
 * prooftest/CampaignHistoryView.tsx — PRISM
 *
 * Campaign history: KPI strip + past campaign list table.
 */
import { BarChart3 } from 'lucide-react'
import { usePrismTheme } from '@/styles/usePrismTheme'
import type { PTCampaign } from './proofTestTypes'

const TABLE_HOVER   = 'rgba(0, 155, 164, 0.04)'

interface Props {
  campaigns: PTCampaign[]
  onViewCampaign: (campaign: PTCampaign) => void
  onDownloadCampaignPdf: (campaign: PTCampaign) => Promise<void>
}

export function CampaignHistoryView({ campaigns, onViewCampaign, onDownloadCampaignPdf }: Props) {
  const { BORDER, CARD_BG, PAGE_BG, TEAL, TEXT, TEXT_DIM, NAVY, SHADOW_CARD, semantic } = usePrismTheme()

  if (campaigns.length === 0) {
    return (
      <div className="rounded-2xl border p-16 text-center" style={{ background: CARD_BG, borderColor: BORDER, boxShadow: SHADOW_CARD }}>
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
          { label: 'Taux de réussite', value: `${passRate}%`,        color: semantic.success },
          { label: 'Dernier test',   value: campaigns[0]?.date ?? '—', color: TEAL },
        ].map(k => (
          <div key={k.label} className="rounded-2xl border px-5 py-4" style={{ background: CARD_BG, borderColor: BORDER, boxShadow: SHADOW_CARD }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: TEXT_DIM }}>{k.label}</p>
            <p className="text-2xl font-bold font-mono" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Campaign list */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: CARD_BG, borderColor: BORDER, boxShadow: SHADOW_CARD }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: PAGE_BG }}>
              {['Date', 'Procédure', 'Équipe', 'Verdict', 'Étapes OK', 'Réalisé par', 'Témoin', 'PDF', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {campaigns.map(c => {
              const ok  = c.stepResults.filter(r => r.result === 'oui' || r.conformant === true).length
              const tot = c.stepResults.length
              const vCfg = c.verdict === 'pass' ? { label: 'PASS', bg: `${semantic.success}12`, color: semantic.success, border: `${semantic.success}30` } :
                           c.verdict === 'fail' ? { label: 'FAIL', bg: `${semantic.error}10`, color: semantic.error, border: `${semantic.error}28` } :
                           c.verdict === 'conditional' ? { label: 'COND.', bg: `${semantic.warning}10`, color: semantic.warning, border: `${semantic.warning}28` } :
                           { label: '—', bg: PAGE_BG, color: TEXT_DIM, border: BORDER }
              return (
                <tr key={c.id}
                  className="border-b transition-colors"
                  style={{ borderColor: BORDER }}
                  onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = TABLE_HOVER }}
                  onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
                >
                  <td className="px-4 py-3 font-mono" style={{ color: TEXT }}>{c.date}</td>
                  <td className="px-4 py-3 font-mono" style={{ color: TEXT }}>
                    {c.procedureSnapshot ? `${c.procedureSnapshot.ref} · Rev. ${c.procedureSnapshot.revision}` : '—'}
                  </td>
                  <td className="px-4 py-3" style={{ color: TEXT }}>{c.team || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded border"
                      style={{ background: vCfg.bg, color: vCfg.color, borderColor: vCfg.border }}
                    >{vCfg.label}</span>
                  </td>
                  <td className="px-4 py-3 font-mono">
                    <span className="font-bold" style={{ color: ok === tot ? semantic.success : semantic.error }}>{ok}</span>
                    <span style={{ color: TEXT_DIM }}>/ {tot}</span>
                  </td>
                  <td className="px-4 py-3" style={{ color: TEXT }}>{c.conductedBy || '—'}</td>
                  <td className="px-4 py-3" style={{ color: TEXT }}>{c.witnessedBy || '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => { void onDownloadCampaignPdf(c) }}
                      disabled={c.pdfArtifact.status !== 'ready'}
                      className="text-[10px] font-semibold transition-colors hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ color: c.pdfArtifact.status === 'ready' ? TEAL : TEXT_DIM }}
                    >
                      PDF
                    </button>
                  </td>
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
