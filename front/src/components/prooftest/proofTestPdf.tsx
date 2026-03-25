import type { ReactNode } from 'react'
import type { Project, SIF } from '@/core/types'
import { getSifExploitationStrings, type SifExploitationStrings } from '@/i18n/sifExploitation'
import { resolveAppLocale, type AppLocale } from '@/i18n/types'
import { renderPdfPagesToBlob } from '@/lib/pdf'
import { useAppStore } from '@/store/appStore'
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
import {
  getProofTestCategoryTitle,
  getProofTestLocationLabel,
  getProofTestResponseCheckTypeLabel,
  getProofTestStatusLabel,
  getProofTestVerdictLabel,
} from './proofTestI18n'

const CAT_COLORS: Record<string, string> = {
  preliminary: '#6B7280',
  test: '#009BA4',
  final: '#003D5C',
}

const VERDICT_STYLES: Record<string, { bg: string; color: string }> = {
  pass: { bg: '#DCFCE7', color: '#15803D' },
  fail: { bg: '#FEF2F2', color: '#DC2626' },
  conditional: { bg: '#FEF9C3', color: '#92400E' },
}

function resolveProofTestPdfLocale(locale?: AppLocale): AppLocale {
  return locale ?? resolveAppLocale(useAppStore.getState().preferences.language)
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

function normalizeProcedureForPdf(sif: SIF, procedureRaw: unknown, locale: AppLocale = 'fr'): PTProcedure {
  const fallback = defaultProcedure(sif, locale)
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

function Page({
  children,
  pageNum,
  total,
  strings,
}: {
  children: ReactNode
  pageNum: number
  total: number
  strings: SifExploitationStrings
}) {
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
        <span style={{ fontSize: 9, color: '#9CA3AF' }}>{strings.pdfDocument.footerTitle}</span>
        <span style={{ fontSize: 9, color: '#9CA3AF', fontFamily: 'monospace' }}>
          {strings.pdfDocument.footerPage(pageNum, total)}
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
  strings,
}: {
  sif: SIF
  project: Project
  procedure: PTProcedure
  campaigns: PTCampaign[]
  pageNum: number
  total: number
  strings: SifExploitationStrings
}) {
  const statusLabel = getProofTestStatusLabel(strings, procedure.status)
  const passes = campaigns.filter(c => c.verdict === 'pass').length
  const passRate = campaigns.length ? Math.round((passes / campaigns.length) * 100) : null

  return (
    <Page pageNum={pageNum} total={total} strings={strings}>
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
          <div style={{ fontSize: 9, color: '#9CA3AF', marginTop: 1 }}>{strings.pdfDocument.productTagline}</div>
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: '#009BA4', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
          {strings.procedure.headerTitle}
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
            {strings.pdfDocument.cover.sifIdentification}
          </div>
          {[
            { label: strings.pdfDocument.cover.project, value: project.name },
            { label: strings.pdfDocument.cover.sifNumber, value: sif.sifNumber },
            { label: strings.pdfDocument.cover.processTag, value: sif.processTag || '—' },
            { label: strings.pdfDocument.cover.location, value: sif.location || '—' },
            { label: strings.pdfDocument.cover.targetSil, value: `SIL ${sif.targetSIL}` },
            { label: strings.pdfDocument.cover.standard, value: project.standard || 'IEC 61511' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #F3F4F6' }}>
              <span style={{ color: '#6B7280' }}>{row.label}</span>
              <span style={{ fontWeight: 600, color: '#111827' }}>{row.value}</span>
            </div>
          ))}
        </div>

        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
            {strings.pdfDocument.cover.procedure}
          </div>
          {[
            { label: strings.rightPanel.status.reference, value: procedure.ref },
            { label: strings.rightPanel.status.revision, value: procedure.revision },
            { label: strings.rightPanel.status.status, value: statusLabel },
            { label: strings.rightPanel.status.periodicity, value: strings.rightPanel.status.periodicityValue(procedure.periodicityMonths) },
            { label: strings.rightPanel.status.steps, value: String(procedure.steps.length) },
            { label: strings.rightPanel.status.testsCompleted, value: String(campaigns.length) },
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
            { label: strings.pdfDocument.cover.campaignCount, value: String(campaigns.length), color: '#003D5C' },
            { label: strings.history.verdicts.pass, value: String(passes), color: '#15803D' },
            { label: strings.history.verdicts.fail, value: String(campaigns.filter(c => c.verdict === 'fail').length), color: '#DC2626' },
            { label: strings.pdfDocument.cover.passRate, value: passRate !== null ? `${passRate}%` : '—', color: passRate !== null && passRate >= 80 ? '#15803D' : '#DC2626' },
          ].map(metric => (
            <div key={metric.label} style={{ border: '1px solid #E5E7EB', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{metric.label}</div>
              <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'monospace', color: metric.color }}>{metric.value}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 20 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>
          {strings.procedure.signaturesTitle}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { label: strings.procedure.signatures.madeBy, name: procedure.madeBy, date: procedure.madeByDate },
            { label: strings.procedure.signatures.verifiedBy, name: procedure.verifiedBy, date: procedure.verifiedByDate },
            { label: strings.procedure.signatures.approvedBy, name: procedure.approvedBy, date: procedure.approvedByDate },
          ].map(sig => (
            <div key={sig.label} style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: 12, minHeight: 70 }}>
              <div style={{ fontSize: 9, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{sig.label}</div>
              <div style={{ fontWeight: 600, color: '#111827', marginBottom: 3 }}>{sig.name || '________________________________'}</div>
              <div style={{ fontSize: 9, color: '#9CA3AF' }}>{sig.date || strings.procedure.placeholders.signatureDate}</div>
            </div>
          ))}
        </div>
      </div>
    </Page>
  )
}

function ProcedurePage({
  procedure,
  pageNum,
  total,
  strings,
}: {
  procedure: PTProcedure
  pageNum: number
  total: number
  strings: SifExploitationStrings
}) {
  const catsSorted = [...procedure.categories].sort((a, b) => a.order - b.order)

  return (
    <Page pageNum={pageNum} total={total} strings={strings}>
      <div style={{ marginTop: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: '#009BA4', letterSpacing: 2, textTransform: 'uppercase' }}>
          {strings.pdfDocument.procedure.detailTitle}
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#003D5C', fontFamily: 'monospace', marginTop: 2 }}>
          {procedure.ref} — {strings.rightPanel.status.revision} {procedure.revision}
        </div>
      </div>

      {catsSorted.map(cat => {
        const catColor = CAT_COLORS[cat.type] ?? '#6B7280'
        const categoryTitle = getProofTestCategoryTitle(strings, cat)
        const steps = procedure.steps
          .filter(step => step.categoryId === cat.id)
          .sort((left, right) => left.order - right.order)
        if (steps.length === 0) return null

        return (
          <div key={cat.id} style={{ marginBottom: 20 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
              background: `${catColor}12`, borderLeft: `3px solid ${catColor}`,
              borderRadius: '0 6px 6px 0', marginBottom: 4,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: catColor, flexShrink: 0 }} />
              <span style={{ fontWeight: 700, color: catColor, fontSize: 11 }}>{categoryTitle}</span>
              <span style={{ fontSize: 9, color: '#9CA3AF', marginLeft: 'auto' }}>{strings.meta.stepCount(steps.length)}</span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
              <thead>
                <tr style={{ background: '#F9FAFB' }}>
                  <th style={{ padding: '5px 8px', textAlign: 'left', color: '#6B7280', fontWeight: 700, fontSize: 9, width: 24, borderBottom: '1px solid #E5E7EB' }}>#</th>
                  <th style={{ padding: '5px 8px', textAlign: 'left', color: '#6B7280', fontWeight: 700, fontSize: 9, borderBottom: '1px solid #E5E7EB' }}>{strings.procedure.tableHeaders.action}</th>
                  <th style={{ padding: '5px 8px', textAlign: 'left', color: '#6B7280', fontWeight: 700, fontSize: 9, width: 100, borderBottom: '1px solid #E5E7EB' }}>{strings.procedure.tableHeaders.location}</th>
                  <th style={{ padding: '5px 8px', textAlign: 'left', color: '#6B7280', fontWeight: 700, fontSize: 9, width: 120, borderBottom: '1px solid #E5E7EB' }}>{strings.procedure.tableHeaders.expectedResult}</th>
                </tr>
              </thead>
              <tbody>
                {steps.map((step, index) => (
                  <tr key={step.id} style={{ borderBottom: '1px solid #F3F4F6', background: index % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td style={{ padding: '5px 8px', fontFamily: 'monospace', fontWeight: 700, color: '#9CA3AF', fontSize: 9 }}>{index + 1}</td>
                    <td style={{ padding: '5px 8px', color: '#111827' }}>{step.action}</td>
                    <td style={{ padding: '5px 8px' }}>
                      <span style={{ fontSize: 9, fontWeight: 700, background: `${catColor}12`, color: catColor, padding: '2px 6px', borderRadius: 4 }}>
                        {getProofTestLocationLabel(strings, step.location)}
                      </span>
                    </td>
                    <td style={{ padding: '5px 8px', fontFamily: step.resultType === 'valeur' ? 'monospace' : undefined, fontWeight: step.resultType === 'valeur' ? 600 : 400, color: step.resultType === 'oui_non' ? '#6B7280' : '#003D5C' }}>
                      {step.resultType === 'oui_non' ? strings.meta.resultTypes.yesNo : step.expectedValue || '—'}
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
            {strings.responseChecks.title}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
            <thead>
              <tr style={{ background: '#F9FAFB' }}>
                <th style={{ padding: '5px 8px', textAlign: 'left', color: '#6B7280', fontWeight: 700, fontSize: 9, borderBottom: '1px solid #E5E7EB' }}>{strings.responseChecks.tableHeaders.equipment}</th>
                <th style={{ padding: '5px 8px', textAlign: 'left', color: '#6B7280', fontWeight: 700, fontSize: 9, width: 120, borderBottom: '1px solid #E5E7EB' }}>{strings.responseChecks.tableHeaders.measurement}</th>
                <th style={{ padding: '5px 8px', textAlign: 'left', color: '#6B7280', fontWeight: 700, fontSize: 9, width: 90, borderBottom: '1px solid #E5E7EB' }}>{strings.responseChecks.tableHeaders.target}</th>
                <th style={{ padding: '5px 8px', textAlign: 'left', color: '#6B7280', fontWeight: 700, fontSize: 9, width: 100, borderBottom: '1px solid #E5E7EB' }}>{strings.responseChecks.tableHeaders.maxLimit}</th>
              </tr>
            </thead>
            <tbody>
              {procedure.responseChecks.map((check, index) => {
                const typeMeta = RESPONSE_CHECK_TYPE_META[check.type]
                return (
                  <tr key={check.id} style={{ borderBottom: '1px solid #F3F4F6', background: index % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td style={{ padding: '5px 8px' }}>
                      <div style={{ fontWeight: 700, color: '#111827' }}>{check.label || strings.responseChecks.values.untitledCheck}</div>
                      {check.description && <div style={{ color: '#6B7280', fontSize: 9, marginTop: 2 }}>{check.description}</div>}
                    </td>
                    <td style={{ padding: '5px 8px' }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: typeMeta.color }}>{getProofTestResponseCheckTypeLabel(strings, check.type)}</span>
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
  strings,
}: {
  campaign: PTCampaign
  procedure: PTProcedure
  index: number
  pageNum: number
  total: number
  strings: SifExploitationStrings
}) {
  const verdictStyle = campaign.verdict ? VERDICT_STYLES[campaign.verdict] : null
  const verdictLabel = campaign.verdict ? getProofTestVerdictLabel(strings, campaign.verdict) : null
  const ok = campaign.stepResults.filter(result => result.result === 'oui' || result.conformant === true).length
  const fail = campaign.stepResults.filter(result => result.result === 'non' || result.conformant === false).length
  const catsSorted = [...procedure.categories].sort((left, right) => left.order - right.order)
  const responseMeasurements = syncResponseMeasurements(procedure.responseChecks, campaign.responseMeasurements)

  return (
    <Page pageNum={pageNum} total={total} strings={strings}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 16, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#009BA4', letterSpacing: 2, textTransform: 'uppercase' }}>
            {strings.pdfDocument.campaign.title(index + 1)}
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#003D5C', fontFamily: 'monospace', marginTop: 2 }}>
            {campaign.date}
          </div>
          {campaign.team && <div style={{ fontSize: 11, color: '#4B5563', marginTop: 2 }}>{strings.pdfDocument.campaign.team(campaign.team)}</div>}
        </div>
        {verdictStyle && verdictLabel && (
          <div style={{ background: verdictStyle.bg, color: verdictStyle.color, fontWeight: 800, fontSize: 14, padding: '6px 16px', borderRadius: 8, border: `1px solid ${verdictStyle.color}30` }}>
            {verdictLabel}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: strings.pdfDocument.campaign.totalSteps, value: String(procedure.steps.length), color: '#003D5C' },
          { label: strings.pdfDocument.campaign.conformant, value: String(ok), color: '#15803D' },
          { label: strings.pdfDocument.campaign.nonConformant, value: String(fail), color: fail > 0 ? '#DC2626' : '#6B7280' },
        ].map(metric => (
          <div key={metric.label} style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>{metric.label}</div>
            <div style={{ fontSize: 18, fontWeight: 900, fontFamily: 'monospace', color: metric.color }}>{metric.value}</div>
          </div>
        ))}
      </div>

      {catsSorted.map(cat => {
        const catColor = CAT_COLORS[cat.type] ?? '#6B7280'
        const categoryTitle = getProofTestCategoryTitle(strings, cat)
        const steps = procedure.steps.filter(step => step.categoryId === cat.id).sort((left, right) => left.order - right.order)
        if (steps.length === 0) return null

        return (
          <div key={cat.id} style={{ marginBottom: 16 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px',
              background: `${catColor}10`, borderLeft: `3px solid ${catColor}`,
              borderRadius: '0 6px 6px 0', marginBottom: 4,
            }}>
              <span style={{ fontWeight: 700, color: catColor, fontSize: 10 }}>{categoryTitle}</span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9.5 }}>
              <thead>
                <tr style={{ background: '#F9FAFB' }}>
                  <th style={{ padding: '4px 8px', textAlign: 'left', color: '#6B7280', fontWeight: 700, fontSize: 8.5, width: 20, borderBottom: '1px solid #E5E7EB' }}>#</th>
                  <th style={{ padding: '4px 8px', textAlign: 'left', color: '#6B7280', fontWeight: 700, fontSize: 8.5, borderBottom: '1px solid #E5E7EB' }}>{strings.procedure.tableHeaders.action}</th>
                  <th style={{ padding: '4px 8px', textAlign: 'left', color: '#6B7280', fontWeight: 700, fontSize: 8.5, width: 90, borderBottom: '1px solid #E5E7EB' }}>{strings.execution.tableHeaders.expected}</th>
                  <th style={{ padding: '4px 8px', textAlign: 'center', color: '#6B7280', fontWeight: 700, fontSize: 8.5, width: 60, borderBottom: '1px solid #E5E7EB' }}>{strings.execution.tableHeaders.result}</th>
                  <th style={{ padding: '4px 8px', textAlign: 'left', color: '#6B7280', fontWeight: 700, fontSize: 8.5, width: 80, borderBottom: '1px solid #E5E7EB' }}>{strings.pdfDocument.campaign.measuredValue}</th>
                  <th style={{ padding: '4px 8px', textAlign: 'left', color: '#6B7280', fontWeight: 700, fontSize: 8.5, width: 90, borderBottom: '1px solid #E5E7EB' }}>{strings.execution.tableHeaders.comment}</th>
                </tr>
              </thead>
              <tbody>
                {steps.map((step, stepIndex) => {
                  const stepResult = campaign.stepResults.find(result => result.stepId === step.id)
                  const isOk = stepResult?.result === 'oui' || stepResult?.conformant === true
                  const isNok = stepResult?.result === 'non' || stepResult?.conformant === false
                  const rowBg = isOk ? '#F0FDF4' : isNok ? '#FEF2F2' : stepIndex % 2 === 0 ? '#fff' : '#FAFAFA'
                  return (
                    <tr key={step.id} style={{ borderBottom: '1px solid #F3F4F6', background: rowBg }}>
                      <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontWeight: 700, color: '#9CA3AF' }}>{stepIndex + 1}</td>
                      <td style={{ padding: '4px 8px', color: '#111827' }}>{step.action}</td>
                      <td style={{ padding: '4px 8px', fontFamily: step.resultType === 'valeur' ? 'monospace' : undefined, color: '#003D5C', fontWeight: step.resultType === 'valeur' ? 600 : 400 }}>
                        {step.resultType === 'oui_non' ? strings.meta.resultTypes.yesNo : step.expectedValue || '—'}
                      </td>
                      <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                        {stepResult?.result === 'oui' ? (
                          <span style={{ color: '#15803D', fontWeight: 700, fontSize: 9 }}>✓ {strings.widgets.resultBadge.yes}</span>
                        ) : stepResult?.result === 'non' ? (
                          <span style={{ color: '#DC2626', fontWeight: 700, fontSize: 9 }}>✗ {strings.widgets.resultBadge.no}</span>
                        ) : stepResult?.result === 'na' ? (
                          <span style={{ color: '#9CA3AF', fontSize: 9 }}>{strings.widgets.resultBadge.na}</span>
                        ) : (
                          <span style={{ color: '#D1D5DB', fontSize: 9 }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontSize: 9, color: isNok ? '#DC2626' : '#374151' }}>
                        {stepResult?.measuredValue || '—'}
                      </td>
                      <td style={{ padding: '4px 8px', fontSize: 9, color: '#6B7280' }}>
                        {stepResult?.comment || ''}
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
            <span style={{ fontWeight: 700, color: '#009BA4', fontSize: 10 }}>{strings.responseMeasurements.title}</span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9.5 }}>
            <thead>
              <tr style={{ background: '#F9FAFB' }}>
                <th style={{ padding: '4px 8px', textAlign: 'left', color: '#6B7280', fontWeight: 700, fontSize: 8.5, borderBottom: '1px solid #E5E7EB' }}>{strings.responseMeasurements.tableHeaders.equipment}</th>
                <th style={{ padding: '4px 8px', textAlign: 'left', color: '#6B7280', fontWeight: 700, fontSize: 8.5, width: 90, borderBottom: '1px solid #E5E7EB' }}>{strings.responseMeasurements.tableHeaders.measurement}</th>
                <th style={{ padding: '4px 8px', textAlign: 'left', color: '#6B7280', fontWeight: 700, fontSize: 8.5, width: 70, borderBottom: '1px solid #E5E7EB' }}>{strings.responseMeasurements.tableHeaders.target}</th>
                <th style={{ padding: '4px 8px', textAlign: 'left', color: '#6B7280', fontWeight: 700, fontSize: 8.5, width: 80, borderBottom: '1px solid #E5E7EB' }}>{strings.responseMeasurements.tableHeaders.maxLimit}</th>
                <th style={{ padding: '4px 8px', textAlign: 'left', color: '#6B7280', fontWeight: 700, fontSize: 8.5, width: 80, borderBottom: '1px solid #E5E7EB' }}>{strings.responseMeasurements.tableHeaders.measured}</th>
                <th style={{ padding: '4px 8px', textAlign: 'center', color: '#6B7280', fontWeight: 700, fontSize: 8.5, width: 60, borderBottom: '1px solid #E5E7EB' }}>{strings.responseMeasurements.tableHeaders.status}</th>
                <th style={{ padding: '4px 8px', textAlign: 'left', color: '#6B7280', fontWeight: 700, fontSize: 8.5, width: 90, borderBottom: '1px solid #E5E7EB' }}>{strings.responseMeasurements.tableHeaders.comment}</th>
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
                      <div style={{ color: '#111827', fontWeight: 700 }}>{check.label || strings.responseMeasurements.values.untitledCheck}</div>
                      {check.description && <div style={{ color: '#6B7280', fontSize: 8.5 }}>{check.description}</div>}
                    </td>
                    <td style={{ padding: '4px 8px', color: typeMeta.color, fontWeight: 700 }}>{getProofTestResponseCheckTypeLabel(strings, check.type)}</td>
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
                      {status === 'pass' ? strings.responseMeasurements.statuses.pass : status === 'fail' ? strings.responseMeasurements.statuses.fail : '—'}
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
            { label: strings.rightPanel.campaign.conductedBy, name: campaign.conductedBy },
            { label: strings.rightPanel.campaign.witnessedBy, name: campaign.witnessedBy },
          ].map(sig => (
            <div key={sig.label} style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 9, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{sig.label}</div>
              <div style={{ fontWeight: 600, color: '#111827', minHeight: 20 }}>
                {sig.name || '________________________________'}
              </div>
              <div style={{ fontSize: 9, color: '#D1D5DB', marginTop: 4, borderTop: '1px solid #F3F4F6', paddingTop: 4 }}>
                {strings.pdfDocument.campaign.signature}
              </div>
            </div>
          ))}
        </div>
        {campaign.notes && (
          <div style={{ marginTop: 10, padding: 10, background: '#FEF9C3', borderRadius: 6, border: '1px solid #FDE68A' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#92400E', marginBottom: 3 }}>{strings.pdfDocument.campaign.notes}</div>
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
  strings,
}: {
  procedure: PTProcedure
  campaigns: PTCampaign[]
  pageNum: number
  total: number
  strings: SifExploitationStrings
}) {
  const datedCampaigns = [...campaigns]
    .filter(campaign => campaign.date)
    .sort((left, right) => left.date.localeCompare(right.date))

  return (
    <Page pageNum={pageNum} total={total} strings={strings}>
      <div style={{ marginTop: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: '#009BA4', letterSpacing: 2, textTransform: 'uppercase' }}>
          {strings.responseChecks.title}
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#003D5C', fontFamily: 'monospace', marginTop: 2 }}>
          {strings.pdfDocument.responseTrends.title}
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
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>{check.label || strings.responseChecks.values.untitledCheck}</div>
                  <div style={{ fontSize: 10, color: typeMeta.color, fontWeight: 700, marginTop: 2 }}>{getProofTestResponseCheckTypeLabel(strings, check.type)}</div>
                  {check.description && <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>{check.description}</div>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, auto)', gap: '4px 12px', textAlign: 'right' }}>
                  <span style={{ fontSize: 9, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1 }}>{strings.responseChecks.tableHeaders.target}</span>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: '#003D5C' }}>
                    {check.expectedMs !== null ? `${check.expectedMs} ms` : '—'}
                  </span>
                  <span style={{ fontSize: 9, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1 }}>{strings.pdfDocument.responseTrends.limit}</span>
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
                  {strings.pdfDocument.responseTrends.empty}
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
  locale,
}: {
  sif: SIF
  project: Project
  procedureRaw: unknown
  campaignsRaw: unknown
  locale?: AppLocale
}) {
  const resolvedLocale = resolveProofTestPdfLocale(locale)
  const strings = getSifExploitationStrings(resolvedLocale)
  const procedure = normalizeProcedureForPdf(sif, procedureRaw, resolvedLocale)
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
        strings={strings}
      />
      <ProcedurePage
        procedure={procedure}
        pageNum={2}
        total={totalPages}
        strings={strings}
      />
      {hasResponseTrendPage && (
        <ResponseTrendsPage
          procedure={procedure}
          campaigns={campaigns}
          pageNum={3}
          total={totalPages}
          strings={strings}
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
          strings={strings}
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
  const { preferences } = useAppStore.getState()
  const locale = resolveAppLocale(preferences.language)
  const pageFormat = preferences.pdfPageSize
  const blob = await renderPdfPagesToBlob({
    pageFormat,
    element: (
      <ProofTestPdfDocument
        sif={input.sif}
        project={input.project}
        procedureRaw={input.procedure}
        campaignsRaw={input.campaigns}
        locale={locale}
      />
    ),
  })

  return { blob, fileName }
}
