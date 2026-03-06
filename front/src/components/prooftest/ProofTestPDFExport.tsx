/**
 * ProofTestPDFExport — PRISM v3
 *
 * Génère un rapport PDF propre (A4) pour une procédure de test + ses campagnes.
 *
 * Pages :
 *  1. Page de garde — SIF info · Procédure ref · Statut · Signatures
 *  2. Procédure complète — toutes les catégories et étapes (tableau)
 *  3+. Campagnes — une section par campagne (date · verdict · résultats étape par étape)
 *
 * Usage :
 *   <ProofTestPDFExport sif={sif} project={project} onClose={() => setShowExport(false)} />
 *
 * Dépendances : jspdf + html2canvas (déjà dans le projet via SILReportStudio)
 */
import { useRef, useCallback, useState } from 'react'
import { Download, X, Printer, CheckCircle2, XCircle, Minus } from 'lucide-react'
import type { Project, SIF } from '@/core/types'

// ─── Types miroirs ────────────────────────────────────────────────────────
type StepResult = 'oui' | 'non' | 'na' | null
type Verdict    = 'pass' | 'fail' | 'conditional' | null

interface PTStepResult {
  stepId: string; result: StepResult
  measuredValue: string; conformant: boolean | null; comment: string
}
interface PTCampaign {
  id: string; date: string; team: string; verdict: Verdict; notes: string
  stepResults: PTStepResult[]; conductedBy: string; witnessedBy: string
}
interface PTStep {
  id: string; categoryId: string; order: number
  action: string; location: string
  resultType: 'oui_non' | 'valeur' | 'personnalisé'; expectedValue: string
}
interface PTProcedure {
  id: string; ref: string; revision: string
  status: 'draft' | 'ifr' | 'approved'; periodicityMonths: number
  categories: { id: string; type: string; title: string; order: number }[]
  steps: PTStep[]
  madeBy: string; madeByDate: string; verifiedBy: string; verifiedByDate: string
  approvedBy: string; approvedByDate: string; notes: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────
const CAT_COLORS: Record<string, string> = {
  preliminary: '#6B7280',
  test:        '#009BA4',
  final:       '#003D5C',
}

const VERDICT_CFG: Record<string, { label: string; bg: string; color: string }> = {
  pass:        { label: 'PASS',        bg: '#DCFCE7', color: '#15803D' },
  fail:        { label: 'FAIL',        bg: '#FEF2F2', color: '#DC2626' },
  conditional: { label: 'CONDITIONNEL',bg: '#FEF9C3', color: '#92400E' },
}

function formatDate(d: string) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) }
  catch { return d }
}

// ─── PDF Page wrapper ─────────────────────────────────────────────────────
function Page({ children, pageNum, total }: { children: React.ReactNode; pageNum: number; total: number }) {
  return (
    <div className="print-page" style={{
      width: 794, minHeight: 1123, background: '#fff', fontFamily: 'Inter, sans-serif',
      fontSize: 11, color: '#1a1a1a', padding: '40px 48px', position: 'relative',
      boxSizing: 'border-box', pageBreakAfter: 'always',
    }}>
      {/* Header strip */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 6,
        background: 'linear-gradient(90deg, #003D5C 0%, #009BA4 100%)',
      }} />

      {children}

      {/* Footer */}
      <div style={{
        position: 'absolute', bottom: 24, left: 48, right: 48,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderTop: '1px solid #E5E7EB', paddingTop: 8,
      }}>
        <span style={{ fontSize: 9, color: '#9CA3AF' }}>PRISM · Rapport Proof Test</span>
        <span style={{ fontSize: 9, color: '#9CA3AF', fontFamily: 'monospace' }}>
          Page {pageNum} / {total}
        </span>
      </div>
    </div>
  )
}

// ─── Page 1 : Cover ───────────────────────────────────────────────────────
function CoverPage({ sif, project, procedure, campaigns, pageNum, total }: {
  sif: SIF; project: Project; procedure: PTProcedure; campaigns: PTCampaign[]
  pageNum: number; total: number
}) {
  const statusCfg = {
    draft:    { label: 'BROUILLON', bg: '#F3F4F6', color: '#6B7280' },
    ifr:      { label: 'IFR',      bg: '#FEF9C3', color: '#92400E' },
    approved: { label: 'APPROUVÉ', bg: '#DCFCE7', color: '#15803D' },
  }[procedure.status]

  const passes = campaigns.filter(c => c.verdict === 'pass').length
  const passRate = campaigns.length ? Math.round(passes / campaigns.length * 100) : null

  return (
    <Page pageNum={pageNum} total={total}>
      {/* Logo / Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, marginBottom: 48 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: 'linear-gradient(135deg, #003D5C, #009BA4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 14, fontFamily: 'monospace' }}>P</span>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#003D5C', letterSpacing: 2 }}>PRISM</div>
          <div style={{ fontSize: 9, color: '#9CA3AF', marginTop: 1 }}>Functional Safety Workbench</div>
        </div>
      </div>

      {/* Title block */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: '#009BA4', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
          Procédure de Test Périodique
        </div>
        <div style={{ fontSize: 28, fontWeight: 900, color: '#003D5C', fontFamily: 'monospace', marginBottom: 4 }}>
          {procedure.ref} · Rev. {procedure.revision}
        </div>
        <div style={{ fontSize: 14, color: '#4B5563', fontWeight: 500 }}>
          {sif.sifNumber}{sif.title ? ` — ${sif.title}` : ''}
        </div>
      </div>

      {/* Horizontal rule */}
      <div style={{ borderTop: '2px solid #003D5C', marginBottom: 24 }} />

      {/* Two column info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        {/* Left: SIF info */}
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
            Identification SIF
          </div>
          {[
            { label: 'Projet',         value: project.name },
            { label: 'Numéro SIF',     value: sif.sifNumber },
            { label: 'Tag Process',    value: sif.processTag || '—' },
            { label: 'Localisation',   value: sif.location || '—' },
            { label: 'SIL cible',      value: `SIL ${sif.targetSIL}` },
            { label: 'Norme',          value: project.standard || 'IEC 61511' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #F3F4F6' }}>
              <span style={{ color: '#6B7280' }}>{row.label}</span>
              <span style={{ fontWeight: 600, color: '#111827' }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Right: Procedure info */}
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
            Procédure
          </div>
          {[
            { label: 'Référence',      value: procedure.ref },
            { label: 'Révision',       value: procedure.revision },
            { label: 'Statut',         value: statusCfg.label },
            { label: 'Périodicité',    value: `${procedure.periodicityMonths} mois` },
            { label: 'Nb étapes',      value: String(procedure.steps.length) },
            { label: 'Tests réalisés', value: String(campaigns.length) },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #F3F4F6' }}>
              <span style={{ color: '#6B7280' }}>{row.label}</span>
              <span style={{ fontWeight: 600, color: '#111827' }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* KPIs strip */}
      {campaigns.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 32 }}>
          {[
            { label: 'Campagnes',  value: String(campaigns.length), color: '#003D5C' },
            { label: 'PASS',       value: String(passes),           color: '#15803D' },
            { label: 'FAIL',       value: String(campaigns.filter(c => c.verdict === 'fail').length), color: '#DC2626' },
            { label: 'Taux',       value: passRate !== null ? `${passRate}%` : '—', color: passRate !== null && passRate >= 80 ? '#15803D' : '#DC2626' },
          ].map(k => (
            <div key={k.label} style={{ border: '1px solid #E5E7EB', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'monospace', color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Signatures block */}
      <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 20 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>
          Signatures de la procédure
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { label: 'Établi par', name: procedure.madeBy, date: procedure.madeByDate },
            { label: 'Vérifié par', name: procedure.verifiedBy, date: procedure.verifiedByDate },
            { label: 'Approuvé par', name: procedure.approvedBy, date: procedure.approvedByDate },
          ].map(sig => (
            <div key={sig.label} style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: 12, minHeight: 70 }}>
              <div style={{ fontSize: 9, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{sig.label}</div>
              <div style={{ fontWeight: 600, color: '#111827', marginBottom: 3 }}>{sig.name || '________________________________'}</div>
              <div style={{ fontSize: 9, color: '#9CA3AF' }}>{sig.date || 'Date / Signature'}</div>
            </div>
          ))}
        </div>
      </div>
    </Page>
  )
}

// ─── Page 2 : Procédure complète ──────────────────────────────────────────
function ProcedurePage({ procedure, pageNum, total }: {
  procedure: PTProcedure; pageNum: number; total: number
}) {
  const catsSorted = [...procedure.categories].sort((a, b) => a.order - b.order)

  return (
    <Page pageNum={pageNum} total={total}>
      <div style={{ marginTop: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: '#009BA4', letterSpacing: 2, textTransform: 'uppercase' }}>
          Détail de la procédure
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#003D5C', fontFamily: 'monospace', marginTop: 2 }}>
          {procedure.ref} — Révision {procedure.revision}
        </div>
      </div>

      {catsSorted.map(cat => {
        const catColor = CAT_COLORS[cat.type] ?? '#6B7280'
        const steps = procedure.steps
          .filter(s => s.categoryId === cat.id)
          .sort((a, b) => a.order - b.order)
        if (steps.length === 0) return null

        return (
          <div key={cat.id} style={{ marginBottom: 20 }}>
            {/* Category header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
              background: `${catColor}12`, borderLeft: `3px solid ${catColor}`,
              borderRadius: '0 6px 6px 0', marginBottom: 4,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: catColor, flexShrink: 0 }} />
              <span style={{ fontWeight: 700, color: catColor, fontSize: 11 }}>{cat.title}</span>
              <span style={{ fontSize: 9, color: '#9CA3AF', marginLeft: 'auto' }}>{steps.length} étape{steps.length > 1 ? 's' : ''}</span>
            </div>

            {/* Steps table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
              <thead>
                <tr style={{ background: '#F9FAFB' }}>
                  <th style={{ padding: '5px 8px', textAlign: 'left', color: '#6B7280', fontWeight: 700, fontSize: 9, width: 24, borderBottom: '1px solid #E5E7EB' }}>#</th>
                  <th style={{ padding: '5px 8px', textAlign: 'left', color: '#6B7280', fontWeight: 700, fontSize: 9, borderBottom: '1px solid #E5E7EB' }}>Action</th>
                  <th style={{ padding: '5px 8px', textAlign: 'left', color: '#6B7280', fontWeight: 700, fontSize: 9, width: 100, borderBottom: '1px solid #E5E7EB' }}>Lieu</th>
                  <th style={{ padding: '5px 8px', textAlign: 'left', color: '#6B7280', fontWeight: 700, fontSize: 9, width: 120, borderBottom: '1px solid #E5E7EB' }}>Résultat attendu</th>
                </tr>
              </thead>
              <tbody>
                {steps.map((step, si) => (
                  <tr key={step.id} style={{ borderBottom: '1px solid #F3F4F6', background: si % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td style={{ padding: '5px 8px', fontFamily: 'monospace', fontWeight: 700, color: '#9CA3AF', fontSize: 9 }}>{si + 1}</td>
                    <td style={{ padding: '5px 8px', color: '#111827' }}>{step.action}</td>
                    <td style={{ padding: '5px 8px' }}>
                      <span style={{ fontSize: 9, fontWeight: 700, background: `${catColor}12`, color: catColor, padding: '2px 6px', borderRadius: 4 }}>
                        {step.location}
                      </span>
                    </td>
                    <td style={{ padding: '5px 8px', fontFamily: step.resultType === 'valeur' ? 'monospace' : undefined, fontWeight: step.resultType === 'valeur' ? 600 : 400, color: step.resultType === 'oui_non' ? '#6B7280' : '#003D5C' }}>
                      {step.resultType === 'oui_non' ? 'OUI / NON' : step.expectedValue || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </Page>
  )
}

// ─── Page(s) campagnes ────────────────────────────────────────────────────
function CampaignPage({ campaign, procedure, index, pageNum, total }: {
  campaign: PTCampaign; procedure: PTProcedure
  index: number; pageNum: number; total: number
}) {
  const vcfg = campaign.verdict ? VERDICT_CFG[campaign.verdict] : null
  const ok   = campaign.stepResults.filter(r => r.result === 'oui' || r.conformant === true).length
  const fail = campaign.stepResults.filter(r => r.result === 'non' || r.conformant === false).length
  const catsSorted = [...procedure.categories].sort((a, b) => a.order - b.order)

  return (
    <Page pageNum={pageNum} total={total}>
      {/* Campaign header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 16, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#009BA4', letterSpacing: 2, textTransform: 'uppercase' }}>
            Campagne de test #{index + 1}
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#003D5C', fontFamily: 'monospace', marginTop: 2 }}>
            {campaign.date}
          </div>
          {campaign.team && <div style={{ fontSize: 11, color: '#4B5563', marginTop: 2 }}>Équipe : {campaign.team}</div>}
        </div>
        {vcfg && (
          <div style={{ background: vcfg.bg, color: vcfg.color, fontWeight: 800, fontSize: 14, padding: '6px 16px', borderRadius: 8, border: `1px solid ${vcfg.color}30` }}>
            {vcfg.label}
          </div>
        )}
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Étapes total', value: String(procedure.steps.length), color: '#003D5C' },
          { label: 'Conformes',    value: String(ok),   color: '#15803D' },
          { label: 'Non-conformes',value: String(fail), color: fail > 0 ? '#DC2626' : '#6B7280' },
        ].map(k => (
          <div key={k.label} style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>{k.label}</div>
            <div style={{ fontSize: 18, fontWeight: 900, fontFamily: 'monospace', color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Steps results */}
      {catsSorted.map(cat => {
        const catColor = CAT_COLORS[cat.type] ?? '#6B7280'
        const steps = procedure.steps.filter(s => s.categoryId === cat.id).sort((a, b) => a.order - b.order)
        if (steps.length === 0) return null

        return (
          <div key={cat.id} style={{ marginBottom: 16 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px',
              background: `${catColor}10`, borderLeft: `3px solid ${catColor}`,
              borderRadius: '0 6px 6px 0', marginBottom: 4,
            }}>
              <span style={{ fontWeight: 700, color: catColor, fontSize: 10 }}>{cat.title}</span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9.5 }}>
              <thead>
                <tr style={{ background: '#F9FAFB' }}>
                  <th style={{ padding: '4px 8px', textAlign: 'left', color: '#6B7280', fontWeight: 700, fontSize: 8.5, width: 20, borderBottom: '1px solid #E5E7EB' }}>#</th>
                  <th style={{ padding: '4px 8px', textAlign: 'left', color: '#6B7280', fontWeight: 700, fontSize: 8.5, borderBottom: '1px solid #E5E7EB' }}>Action</th>
                  <th style={{ padding: '4px 8px', textAlign: 'left', color: '#6B7280', fontWeight: 700, fontSize: 8.5, width: 90, borderBottom: '1px solid #E5E7EB' }}>Attendu</th>
                  <th style={{ padding: '4px 8px', textAlign: 'center', color: '#6B7280', fontWeight: 700, fontSize: 8.5, width: 60, borderBottom: '1px solid #E5E7EB' }}>Résultat</th>
                  <th style={{ padding: '4px 8px', textAlign: 'left', color: '#6B7280', fontWeight: 700, fontSize: 8.5, width: 80, borderBottom: '1px solid #E5E7EB' }}>Valeur mesurée</th>
                  <th style={{ padding: '4px 8px', textAlign: 'left', color: '#6B7280', fontWeight: 700, fontSize: 8.5, width: 90, borderBottom: '1px solid #E5E7EB' }}>Commentaire</th>
                </tr>
              </thead>
              <tbody>
                {steps.map((step, si) => {
                  const sr = campaign.stepResults.find(r => r.stepId === step.id)
                  const isOk   = sr?.result === 'oui' || sr?.conformant === true
                  const isNok  = sr?.result === 'non' || sr?.conformant === false
                  const rowBg  = isOk ? '#F0FDF4' : isNok ? '#FEF2F2' : si % 2 === 0 ? '#fff' : '#FAFAFA'
                  return (
                    <tr key={step.id} style={{ borderBottom: '1px solid #F3F4F6', background: rowBg }}>
                      <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontWeight: 700, color: '#9CA3AF' }}>{si + 1}</td>
                      <td style={{ padding: '4px 8px', color: '#111827' }}>{step.action}</td>
                      <td style={{ padding: '4px 8px', fontFamily: step.resultType === 'valeur' ? 'monospace' : undefined, color: '#003D5C', fontWeight: step.resultType === 'valeur' ? 600 : 400 }}>
                        {step.resultType === 'oui_non' ? 'OUI/NON' : step.expectedValue || '—'}
                      </td>
                      <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                        {sr?.result === 'oui' ? (
                          <span style={{ color: '#15803D', fontWeight: 700, fontSize: 9 }}>✓ OUI</span>
                        ) : sr?.result === 'non' ? (
                          <span style={{ color: '#DC2626', fontWeight: 700, fontSize: 9 }}>✗ NON</span>
                        ) : sr?.result === 'na' ? (
                          <span style={{ color: '#9CA3AF', fontSize: 9 }}>N/A</span>
                        ) : (
                          <span style={{ color: '#D1D5DB', fontSize: 9 }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontSize: 9, color: isNok ? '#DC2626' : '#374151' }}>
                        {sr?.measuredValue || '—'}
                      </td>
                      <td style={{ padding: '4px 8px', fontSize: 9, color: '#6B7280' }}>
                        {sr?.comment || ''}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}

      {/* Campaign signatures */}
      <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 14, marginTop: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            { label: 'Réalisé par', name: campaign.conductedBy },
            { label: 'Témoin',      name: campaign.witnessedBy },
          ].map(sig => (
            <div key={sig.label} style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 9, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{sig.label}</div>
              <div style={{ fontWeight: 600, color: '#111827', minHeight: 20 }}>
                {sig.name || '________________________________'}
              </div>
              <div style={{ fontSize: 9, color: '#D1D5DB', marginTop: 4, borderTop: '1px solid #F3F4F6', paddingTop: 4 }}>
                Signature
              </div>
            </div>
          ))}
        </div>
        {campaign.notes && (
          <div style={{ marginTop: 10, padding: 10, background: '#FEF9C3', borderRadius: 6, border: '1px solid #FDE68A' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#92400E', marginBottom: 3 }}>NOTES</div>
            <div style={{ fontSize: 10, color: '#78350F' }}>{campaign.notes}</div>
          </div>
        )}
      </div>
    </Page>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────
interface Props {
  sif: SIF
  project: Project
  procedure: unknown
  campaigns: unknown[]
  onClose: () => void
}

export function ProofTestPDFExport({ sif, project, procedure: procedureRaw, campaigns: campaignsRaw, onClose }: Props) {
  const procedure = procedureRaw as PTProcedure
  const campaigns = campaignsRaw as PTCampaign[]
  const previewRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)

  const totalPages = 2 + campaigns.length  // cover + procedure + N campaigns

  const handleExport = useCallback(async () => {
    const root = previewRef.current
    if (!root) return
    setExporting(true)

    try {
      if (document.fonts?.ready) await document.fonts.ready

      const html2canvas = (await import('html2canvas')).default
      const { jsPDF }   = await import('jspdf')

      const pages = Array.from(root.querySelectorAll<HTMLElement>('.print-page'))
      let pdf: InstanceType<typeof jsPDF> | null = null

      for (const page of pages) {
        const canvas = await html2canvas(page, {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true,
          logging: false,
        })
        const W = canvas.width
        const H = canvas.height
        if (!pdf) {
          pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [W, H], compress: true })
        } else {
          pdf.addPage([W, H], 'portrait')
        }
        pdf.addImage(canvas.toDataURL('image/png', 1), 'PNG', 0, 0, W, H, undefined, 'FAST')
      }

      const filename = `PT_${sif.sifNumber}_${procedure.ref}_Rev${procedure.revision}`.replace(/[^a-zA-Z0-9_-]/g, '_')
      pdf?.save(`${filename}.pdf`)
    } catch {
      window.print()
    } finally {
      setExporting(false)
    }
  }, [sif, procedure])

  return (
    <div className="fixed inset-0 z-[70] flex flex-col" style={{ background: '#0C1117' }}>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 border-b"
        style={{ background: '#14181C', borderColor: '#2A3138' }}>
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors"
            style={{ color: '#8FA0B1' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#1D232A')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <X size={16} />
          </button>
          <div>
            <p className="text-sm font-bold" style={{ color: '#DFE8F1' }}>Export PDF — Proof Test</p>
            <p className="text-[10px]" style={{ color: '#8FA0B1' }}>
              {procedure.ref} · {campaigns.length} campagne{campaigns.length > 1 ? 's' : ''} · {totalPages} pages
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
            style={{ color: '#8FA0B1', borderColor: '#2A3138' }}>
            <Printer size={13} /> Imprimer
          </button>
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #009BA4, #007A82)', color: '#fff' }}>
            <Download size={13} /> {exporting ? 'Génération…' : 'Télécharger PDF'}
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="flex-1 overflow-auto py-8" style={{ background: '#1A1F24' }}>
        <div ref={previewRef} className="mx-auto space-y-6" style={{ width: 'fit-content' }}>
          <CoverPage
            sif={sif} project={project} procedure={procedure} campaigns={campaigns}
            pageNum={1} total={totalPages}
          />
          <ProcedurePage
            procedure={procedure} pageNum={2} total={totalPages}
          />
          {campaigns.map((c, i) => (
            <CampaignPage
              key={c.id} campaign={c} procedure={procedure}
              index={i} pageNum={3 + i} total={totalPages}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
