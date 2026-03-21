/**
 * prooftest/CampaignHistoryView.tsx — PRISM
 *
 * Campaign history: KPI strip + past campaign list table.
 */
import { BarChart3 } from 'lucide-react'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { getSifExploitationStrings } from '@/i18n/sifExploitation'
import { useLocaleStrings } from '@/i18n/useLocale'
import type { PTCampaign } from './proofTestTypes'

const TABLE_HOVER = 'rgba(0, 155, 164, 0.04)'

interface Props {
  campaigns: PTCampaign[]
  onViewCampaign: (campaign: PTCampaign) => void
  onDownloadCampaignPdf: (campaign: PTCampaign) => Promise<void>
}

export function CampaignHistoryView({ campaigns, onViewCampaign, onDownloadCampaignPdf }: Props) {
  const strings = useLocaleStrings(getSifExploitationStrings)
  const { BORDER, CARD_BG, PAGE_BG, TEAL, TEXT, TEXT_DIM, NAVY, SHADOW_CARD, semantic } = usePrismTheme()

  if (campaigns.length === 0) {
    return (
      <div className="rounded-2xl border p-16 text-center" style={{ background: CARD_BG, borderColor: BORDER, boxShadow: SHADOW_CARD }}>
        <BarChart3 size={32} className="mx-auto mb-3 opacity-20" style={{ color: NAVY }} />
        <p className="font-semibold text-sm" style={{ color: TEXT }}>{strings.history.empty.title}</p>
        <p className="text-xs mt-1" style={{ color: TEXT_DIM }}>{strings.history.empty.description}</p>
      </div>
    )
  }

  const passRate = Math.round(campaigns.filter(c => c.verdict === 'pass').length / campaigns.length * 100)
  const kpis = [
    { label: strings.history.metrics.testsCompleted, value: campaigns.length, color: TEXT },
    { label: strings.history.metrics.successRate, value: `${passRate}%`, color: semantic.success },
    { label: strings.history.metrics.lastTest, value: campaigns[0]?.date ?? strings.history.verdicts.none, color: TEAL },
  ]

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-4">
        {kpis.map(kpi => (
          <div key={kpi.label} className="rounded-2xl border px-5 py-4" style={{ background: CARD_BG, borderColor: BORDER, boxShadow: SHADOW_CARD }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: TEXT_DIM }}>{kpi.label}</p>
            <p className="text-2xl font-bold font-mono" style={{ color: kpi.color }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border overflow-hidden" style={{ background: CARD_BG, borderColor: BORDER, boxShadow: SHADOW_CARD }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: PAGE_BG }}>
              {[
                strings.history.tableHeaders.date,
                strings.history.tableHeaders.procedure,
                strings.history.tableHeaders.team,
                strings.history.tableHeaders.verdict,
                strings.history.tableHeaders.okSteps,
                strings.history.tableHeaders.conductedBy,
                strings.history.tableHeaders.witness,
                strings.history.tableHeaders.pdf,
                strings.history.tableHeaders.open,
              ].map((header, index) => (
                <th key={`${header || 'open'}-${index}`} className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {campaigns.map(campaign => {
              const ok = campaign.stepResults.filter(result => result.result === 'oui' || result.conformant === true).length
              const total = campaign.stepResults.length
              const verdictMeta = campaign.verdict === 'pass'
                ? { label: strings.history.verdicts.pass, bg: `${semantic.success}12`, color: semantic.success, border: `${semantic.success}30` }
                : campaign.verdict === 'fail'
                  ? { label: strings.history.verdicts.fail, bg: `${semantic.error}10`, color: semantic.error, border: `${semantic.error}28` }
                  : campaign.verdict === 'conditional'
                    ? { label: strings.history.verdicts.conditional, bg: `${semantic.warning}10`, color: semantic.warning, border: `${semantic.warning}28` }
                    : { label: strings.history.verdicts.none, bg: PAGE_BG, color: TEXT_DIM, border: BORDER }
              return (
                <tr key={campaign.id}
                  className="border-b transition-colors"
                  style={{ borderColor: BORDER }}
                  onMouseEnter={event => { (event.currentTarget as HTMLTableRowElement).style.background = TABLE_HOVER }}
                  onMouseLeave={event => { (event.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
                >
                  <td className="px-4 py-3 font-mono" style={{ color: TEXT }}>{campaign.date}</td>
                  <td className="px-4 py-3 font-mono" style={{ color: TEXT }}>
                    {campaign.procedureSnapshot ? `${campaign.procedureSnapshot.ref} · Rev. ${campaign.procedureSnapshot.revision}` : strings.history.verdicts.none}
                  </td>
                  <td className="px-4 py-3" style={{ color: TEXT }}>{campaign.team || strings.history.verdicts.none}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded border"
                      style={{ background: verdictMeta.bg, color: verdictMeta.color, borderColor: verdictMeta.border }}
                    >{verdictMeta.label}</span>
                  </td>
                  <td className="px-4 py-3 font-mono">
                    <span className="font-bold" style={{ color: ok === total ? semantic.success : semantic.error }}>{ok}</span>
                    <span style={{ color: TEXT_DIM }}>/ {total}</span>
                  </td>
                  <td className="px-4 py-3" style={{ color: TEXT }}>{campaign.conductedBy || strings.history.verdicts.none}</td>
                  <td className="px-4 py-3" style={{ color: TEXT }}>{campaign.witnessedBy || strings.history.verdicts.none}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => { void onDownloadCampaignPdf(campaign) }}
                      disabled={campaign.pdfArtifact.status !== 'ready'}
                      className="text-[10px] font-semibold transition-colors hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ color: campaign.pdfArtifact.status === 'ready' ? TEAL : TEXT_DIM }}
                    >
                      {strings.history.actions.pdf}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => onViewCampaign(campaign)}
                      className="text-[10px] font-semibold transition-colors hover:underline"
                      style={{ color: TEAL }}
                    >{strings.history.actions.view}</button>
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
