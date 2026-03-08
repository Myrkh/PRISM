import type { ReactNode } from 'react'
import type { Project, SIF } from '@/core/types'
import { renderPdfPagesToBlob } from '@/lib/pdf'
import {
  type PTCampaign,
  type PTResponseCheck,
  type PTResponseMeasurement,
  type PTProcedure,
  type PTStepResult,
  createDefaultCampaignArtifact,
  defaultProcedure,
  getResponseMeasurementStatus,
  parseMeasuredMs,
  RESPONSE_CHECK_TYPE_META,
  syncResponseMeasurements,
} from './proofTestTypes'

const CAT_COLORS: Record<string, string> = {
  preliminary: '#6B7280',
  test: '#009BA4',
  final: '#003D5C',
}

const VERDICT_CFG: Record<string, { label: string; bg: string; color: string }> = {
  pass: { label: 'PASS', bg: '#DCFCE7', color: '#15803D' },
  fail: { label: 'FAIL', bg: '#FEF2F2', color: '#DC2626' },
  conditional: { label: 'CONDITIONNEL', bg: '#FEF9C3', color: '#92400E' },
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : []
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function normalizeProcedureForPdf(sif: SIF, procedureRaw: unknown): PTProcedure {
  const fallback = defaultProcedure(sif)
  const source = typeof procedureRaw === 'object' && procedureRaw !== null ? procedureRaw as Record<string, unknown> : null
  if (!source) return fallback

  return {
    ...fallback,
    ...source,
    id: asString(source.id) || fallback.id,
    ref: asString(source.ref) || fallback.ref,
    revision: asString(source.revision) || sif.revision || fallback.revision,
    status: (asString(source.status) || fallback.status) as PTProcedure['status'],
    categories: asArray(source.categories) as PTProcedure['categories'],
    steps: asArray(source.steps) as PTProcedure['steps'],
    responseChecks: asArray(source.responseChecks).map(normalizeResponseCheck),
    madeBy: asString(source.madeBy) || fallback.madeBy,
    madeByDate: asString(source.madeByDate),
    verifiedBy: asString(source.verifiedBy) || fallback.verifiedBy,
    verifiedByDate: asString(source.verifiedByDate),
    approvedBy: asString(source.approvedBy) || fallback.approvedBy,
    approvedByDate: asString(source.approvedByDate),
    notes: asString(source.notes),
  }
}

function normalizeResponseCheck(responseCheck: unknown): PTResponseCheck {
  const source = typeof responseCheck === 'object' && responseCheck !== null ? responseCheck as Record<string, unknown> : null
  return {
    id: asString(source?.id),
    label: asString(source?.label),
    description: asString(source?.description),
    type: (asString(source?.type) || 'sif_response') as PTResponseCheck['type'],
    expectedMs: asNullableNumber(source?.expectedMs),
    maxAllowedMs: asNullableNumber(source?.maxAllowedMs),
  }
}

function normalizeStepResult(stepResult: unknown): PTStepResult {
  const source = typeof stepResult === 'object' && stepResult !== null ? stepResult as Record<string, unknown> : null
  return {
    stepId: asString(source?.stepId),
    result: (source?.result ?? null) as PTStepResult['result'],
    measuredValue: asString(source?.measuredValue),
    conformant: typeof source?.conformant === 'boolean' ? source.conformant : null,
    comment: asString(source?.comment),
  }
}

function normalizeResponseMeasurement(responseMeasurement: unknown): PTResponseMeasurement {
  const source = typeof responseMeasurement === 'object' && responseMeasurement !== null ? responseMeasurement as Record<string, unknown> : null
  return {
    checkId: asString(source?.checkId),
    measuredMs: asString(source?.measuredMs),
    comment: asString(source?.comment),
  }
}

function normalizeCampaignsForPdf(campaignsRaw: unknown): PTCampaign[] {
  return asArray<unknown>(campaignsRaw).map(raw => {
    const source = typeof raw === 'object' && raw !== null ? raw as Record<string, unknown> : null
    return {
      id: asString(source?.id),
      date: asString(source?.date),
      team: asString(source?.team),
      verdict: (source?.verdict ?? null) as PTCampaign['verdict'],
      notes: asString(source?.notes),
      stepResults: asArray(source?.stepResults).map(normalizeStepResult),
      responseMeasurements: asArray(source?.responseMeasurements).map(normalizeResponseMeasurement),
      procedureSnapshot: null,
      pdfArtifact: typeof source?.pdfArtifact === 'object' && source?.pdfArtifact !== null
        ? { ...createDefaultCampaignArtifact(), ...source.pdfArtifact }
        : createDefaultCampaignArtifact(),
      closedAt: asString(source?.closedAt) || null,
      conductedBy: asString(source?.conductedBy),
      witnessedBy: asString(source?.witnessedBy),
    }
  })
}

export function getProofTestPdfFileName(sif: SIF, procedureRaw: unknown): string {
  const procedure = normalizeProcedureForPdf(sif, procedureRaw)
  return `PT_${sif.sifNumber}_${procedure.ref}_Rev${procedure.revision}`.replace(/[^a-zA-Z0-9_-]/g, '_')
}

function Page({ children, pageNum, total }: { children: ReactNode; pageNum: number; total: number }) {
  return (
    <div className="print-page" style={{
      width: 794, minHeight: 1123, background: '#fff', fontFamily: 'Inter, sans-serif',
      fontSize: 11, color: '#1a1a1a', padding: '40px 48px', position: 'relative',
      boxSizing: 'border-box', pageBreakAfter: 'always',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 6,
        background: 'linear-gradient(90deg, #003D5C 0%, #009BA4 100%)',
      }} />

      {children}

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

function CoverPage({
  sif,
  project,
  procedure,
  campaigns,
  pageNum,
  total,
}: {
  sif: SIF
  project: Project
  procedure: PTProcedure
  campaigns: PTCampaign[]
  pageNum: number
  total: number
}) {
  const statusCfg = {
    draft: { label: 'BROUILLON', bg: '#F3F4F6', color: '#6B7280' },
    ifr: { label: 'IFR', bg: '#FEF9C3', color: '#92400E' },
    approved: { label: 'APPROUVÉ', bg: '#DCFCE7', color: '#15803D' },
  }[procedure.status]

  const passes = campaigns.filter(c => c.verdict === 'pass').length
  const passRate = campaigns.length ? Math.round((passes / campaigns.length) * 100) : null

  return (
    <Page pageNum={pageNum} total={total}>
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

      <div style={{ borderTop: '2px solid #003D5C', marginBottom: 24 }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
            Identification SIF
          </div>
          {[
            { label: 'Projet', value: project.name },
            { label: 'Numéro SIF', value: sif.sifNumber },
            { label: 'Tag Process', value: sif.processTag || '—' },
            { label: 'Localisation', value: sif.location || '—' },
            { label: 'SIL cible', value: `SIL ${sif.targetSIL}` },
            { label: 'Norme', value: project.standard || 'IEC 61511' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #F3F4F6' }}>
              <span style={{ color: '#6B7280' }}>{row.label}</span>
              <span style={{ fontWeight: 600, color: '#111827' }}>{row.value}</span>
            </div>
          ))}
        </div>

        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
            Procédure
          </div>
          {[
            { label: 'Référence', value: procedure.ref },
            { label: 'Révision', value: procedure.revision },
            { label: 'Statut', value: statusCfg.label },
            { label: 'Périodicité', value: `${procedure.periodicityMonths} mois` },
            { label: 'Nb étapes', value: String(procedure.steps.length) },
            { label: 'Tests réalisés', value: String(campaigns.length) },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #F3F4F6' }}>
              <span style={{ color: '#6B7280' }}>{row.label}</span>
              <span style={{ fontWeight: 600, color: '#111827' }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {campaigns.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 32 }}>
          {[
            { label: 'Campagnes', value: String(campaigns.length), color: '#003D5C' },
            { label: 'PASS', value: String(passes), color: '#15803D' },
            { label: 'FAIL', value: String(campaigns.filter(c => c.verdict === 'fail').length), color: '#DC2626' },
            { label: 'Taux', value: passRate !== null ? `${passRate}%` : '—', color: passRate !== null && passRate >= 80 ? '#15803D' : '#DC2626' },
          ].map(k => (
            <div key={k.label} style={{ border: '1px solid #E5E7EB', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'monospace', color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

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

function ProcedurePage({ procedure, pageNum, total }: { procedure: PTProcedure; pageNum: number; total: number }) {
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
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
              background: `${catColor}12`, borderLeft: `3px solid ${catColor}`,
              borderRadius: '0 6px 6px 0', marginBottom: 4,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: catColor, flexShrink: 0 }} />
              <span style={{ fontWeight: 700, color: catColor, fontSize: 11 }}>{cat.title}</span>
              <span style={{ fontSize: 9, color: '#9CA3AF', marginLeft: 'auto' }}>{steps.length} étape{steps.length > 1 ? 's' : ''}</span>
            </div>

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

      {procedure.responseChecks.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#009BA4', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
            Mesures dynamiques
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
            <thead>
              <tr style={{ background: '#F9FAFB' }}>
                <th style={{ padding: '5px 8px', textAlign: 'left', color: '#6B7280', fontWeight: 700, fontSize: 9, borderBottom: '1px solid #E5E7EB' }}>Repere / equipement</th>
                <th style={{ padding: '5px 8px', textAlign: 'left', color: '#6B7280', fontWeight: 700, fontSize: 9, width: 120, borderBottom: '1px solid #E5E7EB' }}>Mesure</th>
                <th style={{ padding: '5px 8px', textAlign: 'left', color: '#6B7280', fontWeight: 700, fontSize: 9, width: 90, borderBottom: '1px solid #E5E7EB' }}>Cible</th>
                <th style={{ padding: '5px 8px', textAlign: 'left', color: '#6B7280', fontWeight: 700, fontSize: 9, width: 100, borderBottom: '1px solid #E5E7EB' }}>Limite max</th>
              </tr>
            </thead>
            <tbody>
              {procedure.responseChecks.map((check, index) => {
                const typeMeta = RESPONSE_CHECK_TYPE_META[check.type]
                return (
                  <tr key={check.id} style={{ borderBottom: '1px solid #F3F4F6', background: index % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td style={{ padding: '5px 8px' }}>
                      <div style={{ fontWeight: 700, color: '#111827' }}>{check.label || 'Untitled check'}</div>
                      {check.description && <div style={{ color: '#6B7280', fontSize: 9, marginTop: 2 }}>{check.description}</div>}
                    </td>
                    <td style={{ padding: '5px 8px' }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: typeMeta.color }}>{typeMeta.label}</span>
                    </td>
                    <td style={{ padding: '5px 8px', fontFamily: 'monospace', fontWeight: 700, color: '#003D5C' }}>
                      {check.expectedMs !== null ? `${check.expectedMs} ms` : '—'}
                    </td>
                    <td style={{ padding: '5px 8px', fontFamily: 'monospace', fontWeight: 700, color: '#003D5C' }}>
                      {check.maxAllowedMs !== null ? `${check.maxAllowedMs} ms` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Page>
  )
}

function CampaignPage({
  campaign,
  procedure,
  index,
  pageNum,
  total,
}: {
  campaign: PTCampaign
  procedure: PTProcedure
  index: number
  pageNum: number
  total: number
}) {
  const vcfg = campaign.verdict ? VERDICT_CFG[campaign.verdict] : null
  const ok = campaign.stepResults.filter(r => r.result === 'oui' || r.conformant === true).length
  const fail = campaign.stepResults.filter(r => r.result === 'non' || r.conformant === false).length
  const catsSorted = [...procedure.categories].sort((a, b) => a.order - b.order)
  const responseMeasurements = syncResponseMeasurements(procedure.responseChecks, campaign.responseMeasurements)

  return (
    <Page pageNum={pageNum} total={total}>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Étapes total', value: String(procedure.steps.length), color: '#003D5C' },
          { label: 'Conformes', value: String(ok), color: '#15803D' },
          { label: 'Non-conformes', value: String(fail), color: fail > 0 ? '#DC2626' : '#6B7280' },
        ].map(k => (
          <div key={k.label} style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>{k.label}</div>
            <div style={{ fontSize: 18, fontWeight: 900, fontFamily: 'monospace', color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

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
                  const isOk = sr?.result === 'oui' || sr?.conformant === true
                  const isNok = sr?.result === 'non' || sr?.conformant === false
                  const rowBg = isOk ? '#F0FDF4' : isNok ? '#FEF2F2' : si % 2 === 0 ? '#fff' : '#FAFAFA'
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

      {procedure.responseChecks.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px',
            background: '#EEF8FA', borderLeft: '3px solid #009BA4',
            borderRadius: '0 6px 6px 0', marginBottom: 4,
          }}>
            <span style={{ fontWeight: 700, color: '#009BA4', fontSize: 10 }}>Mesures dynamiques</span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9.5 }}>
            <thead>
              <tr style={{ background: '#F9FAFB' }}>
                <th style={{ padding: '4px 8px', textAlign: 'left', color: '#6B7280', fontWeight: 700, fontSize: 8.5, borderBottom: '1px solid #E5E7EB' }}>Repere / equipement</th>
                <th style={{ padding: '4px 8px', textAlign: 'left', color: '#6B7280', fontWeight: 700, fontSize: 8.5, width: 90, borderBottom: '1px solid #E5E7EB' }}>Mesure</th>
                <th style={{ padding: '4px 8px', textAlign: 'left', color: '#6B7280', fontWeight: 700, fontSize: 8.5, width: 70, borderBottom: '1px solid #E5E7EB' }}>Cible</th>
                <th style={{ padding: '4px 8px', textAlign: 'left', color: '#6B7280', fontWeight: 700, fontSize: 8.5, width: 80, borderBottom: '1px solid #E5E7EB' }}>Limite max</th>
                <th style={{ padding: '4px 8px', textAlign: 'left', color: '#6B7280', fontWeight: 700, fontSize: 8.5, width: 80, borderBottom: '1px solid #E5E7EB' }}>Mesuree</th>
                <th style={{ padding: '4px 8px', textAlign: 'center', color: '#6B7280', fontWeight: 700, fontSize: 8.5, width: 60, borderBottom: '1px solid #E5E7EB' }}>Statut</th>
                <th style={{ padding: '4px 8px', textAlign: 'left', color: '#6B7280', fontWeight: 700, fontSize: 8.5, width: 90, borderBottom: '1px solid #E5E7EB' }}>Commentaire</th>
              </tr>
            </thead>
            <tbody>
              {procedure.responseChecks.map((check, index) => {
                const measurement = responseMeasurements.find(item => item.checkId === check.id)
                const status = getResponseMeasurementStatus(check, measurement)
                const typeMeta = RESPONSE_CHECK_TYPE_META[check.type]
                const rowBg = status === 'pass' ? '#F0FDF4' : status === 'fail' ? '#FEF2F2' : index % 2 === 0 ? '#fff' : '#FAFAFA'
                return (
                  <tr key={check.id} style={{ borderBottom: '1px solid #F3F4F6', background: rowBg }}>
                    <td style={{ padding: '4px 8px' }}>
                      <div style={{ color: '#111827', fontWeight: 700 }}>{check.label || 'Untitled check'}</div>
                      {check.description && <div style={{ color: '#6B7280', fontSize: 8.5 }}>{check.description}</div>}
                    </td>
                    <td style={{ padding: '4px 8px', color: typeMeta.color, fontWeight: 700 }}>{typeMeta.label}</td>
                    <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontWeight: 700, color: '#003D5C' }}>
                      {check.expectedMs !== null ? `${check.expectedMs} ms` : '—'}
                    </td>
                    <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontWeight: 700, color: '#003D5C' }}>
                      {check.maxAllowedMs !== null ? `${check.maxAllowedMs} ms` : '—'}
                    </td>
                    <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontWeight: 700, color: status === 'fail' ? '#DC2626' : '#374151' }}>
                      {measurement?.measuredMs ? `${measurement.measuredMs} ms` : '—'}
                    </td>
                    <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 700, color: status === 'pass' ? '#15803D' : status === 'fail' ? '#DC2626' : '#9CA3AF' }}>
                      {status === 'pass' ? 'PASS' : status === 'fail' ? 'FAIL' : '—'}
                    </td>
                    <td style={{ padding: '4px 8px', fontSize: 9, color: '#6B7280' }}>{measurement?.comment || ''}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 14, marginTop: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            { label: 'Réalisé par', name: campaign.conductedBy },
            { label: 'Témoin', name: campaign.witnessedBy },
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

function ResponseTrendsPage({
  procedure,
  campaigns,
  pageNum,
  total,
}: {
  procedure: PTProcedure
  campaigns: PTCampaign[]
  pageNum: number
  total: number
}) {
  const datedCampaigns = [...campaigns]
    .filter(campaign => campaign.date)
    .sort((left, right) => left.date.localeCompare(right.date))

  return (
    <Page pageNum={pageNum} total={total}>
      <div style={{ marginTop: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: '#009BA4', letterSpacing: 2, textTransform: 'uppercase' }}>
          Dynamic response trends
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#003D5C', fontFamily: 'monospace', marginTop: 2 }}>
          Mesures dynamiques consolidees
        </div>
      </div>

      <div style={{ display: 'grid', gap: 14 }}>
        {procedure.responseChecks.map(check => {
          const typeMeta = RESPONSE_CHECK_TYPE_META[check.type]
          const points = datedCampaigns
            .map(campaign => {
              const measurement = syncResponseMeasurements(procedure.responseChecks, campaign.responseMeasurements)
                .find(item => item.checkId === check.id)
              const measured = parseMeasuredMs(measurement?.measuredMs ?? '')
              return {
                campaign,
                measurement,
                measured,
                status: getResponseMeasurementStatus(check, measurement),
              }
            })
            .filter(point => point.measured !== null)

          const scaleMax = Math.max(
            check.maxAllowedMs ?? 0,
            check.expectedMs ?? 0,
            ...points.map(point => point.measured ?? 0),
            100,
          )
          const thresholdRatio = check.maxAllowedMs !== null && scaleMax > 0
            ? Math.min(1, check.maxAllowedMs / scaleMax)
            : null

          return (
            <div key={check.id} style={{ border: '1px solid #E5E7EB', borderRadius: 12, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>{check.label || 'Untitled check'}</div>
                  <div style={{ fontSize: 10, color: typeMeta.color, fontWeight: 700, marginTop: 2 }}>{typeMeta.label}</div>
                  {check.description && <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>{check.description}</div>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, auto)', gap: '4px 12px', textAlign: 'right' }}>
                  <span style={{ fontSize: 9, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1 }}>Cible</span>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: '#003D5C' }}>
                    {check.expectedMs !== null ? `${check.expectedMs} ms` : '—'}
                  </span>
                  <span style={{ fontSize: 9, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1 }}>Limite</span>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: '#003D5C' }}>
                    {check.maxAllowedMs !== null ? `${check.maxAllowedMs} ms` : '—'}
                  </span>
                </div>
              </div>

              {points.length > 0 ? (
                <div style={{ position: 'relative', height: 138, borderRadius: 10, background: '#F9FAFB', border: '1px solid #F3F4F6', padding: '12px 10px 26px' }}>
                  {thresholdRatio !== null && (
                    <div style={{
                      position: 'absolute',
                      left: 10,
                      right: 10,
                      bottom: `${26 + (thresholdRatio * 88)}px`,
                      borderTop: '1px dashed #DC2626',
                    }} />
                  )}
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6, height: 100 }}>
                    {points.map(point => {
                      const measured = point.measured ?? 0
                      const barHeight = scaleMax > 0 ? Math.max(10, (measured / scaleMax) * 88) : 10
                      const barColor = point.status === 'fail' ? '#DC2626' : '#009BA4'
                      return (
                        <div key={point.campaign.id} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                          <div style={{ fontSize: 8.5, fontFamily: 'monospace', color: '#374151', marginBottom: 4 }}>
                            {measured} ms
                          </div>
                          <div style={{ width: '100%', maxWidth: 26, height: `${barHeight}px`, borderRadius: '6px 6px 0 0', background: barColor }} />
                          <div style={{ fontSize: 8, color: '#9CA3AF', marginTop: 6, whiteSpace: 'nowrap' }}>
                            {point.campaign.date.slice(5) || '—'}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ border: '1px dashed #D1D5DB', borderRadius: 10, padding: '18px 12px', textAlign: 'center', color: '#9CA3AF', fontSize: 10 }}>
                  Aucune mesure enregistree pour cette grandeur.
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Page>
  )
}

export function ProofTestPdfDocument({
  sif,
  project,
  procedureRaw,
  campaignsRaw,
}: {
  sif: SIF
  project: Project
  procedureRaw: unknown
  campaignsRaw: unknown
}) {
  const procedure = normalizeProcedureForPdf(sif, procedureRaw)
  const campaigns = normalizeCampaignsForPdf(campaignsRaw)
  const hasResponseTrendPage = procedure.responseChecks.length > 0
  const totalPages = 2 + campaigns.length + (hasResponseTrendPage ? 1 : 0)

  return (
    <div className="space-y-6" style={{ width: 'fit-content' }}>
      <CoverPage
        sif={sif}
        project={project}
        procedure={procedure}
        campaigns={campaigns}
        pageNum={1}
        total={totalPages}
      />
      <ProcedurePage
        procedure={procedure}
        pageNum={2}
        total={totalPages}
      />
      {hasResponseTrendPage && (
        <ResponseTrendsPage
          procedure={procedure}
          campaigns={campaigns}
          pageNum={3}
          total={totalPages}
        />
      )}
      {campaigns.map((campaign, index) => (
        <CampaignPage
          key={campaign.id || `${campaign.date}-${index}`}
          campaign={campaign}
          procedure={procedure}
          index={index}
          pageNum={3 + index + (hasResponseTrendPage ? 1 : 0)}
          total={totalPages}
        />
      ))}
    </div>
  )
}

export async function buildProofTestPdfBlob(input: {
  sif: SIF
  project: Project
  procedure: unknown
  campaigns: unknown
}): Promise<{ blob: Blob; fileName: string }> {
  const fileName = `${getProofTestPdfFileName(input.sif, input.procedure)}.pdf`
  const blob = await renderPdfPagesToBlob({
    element: (
      <ProofTestPdfDocument
        sif={input.sif}
        project={input.project}
        procedureRaw={input.procedure}
        campaignsRaw={input.campaigns}
      />
    ),
  })

  return { blob, fileName }
}
