/**
 * components/report/lopaReportPdf.tsx — PRISM
 *
 * PDF export for a LOPA worksheet.
 * Uses the same renderPdfPagesToBlob infrastructure as silReportPdf.
 *
 * Layout (A4 portrait):
 *   Page 1 — Cover (project, study, date, visa block)
 *   Page 2 — Scenarios summary table
 *   Pages 3…n — Per-scenario IPL detail cards
 */
import { renderPdfPagesToBlob } from '@/lib/pdf'
import { useAppStore } from '@/store/appStore'
import {
  calculateLOPAScenario,
  calculateLOPAWorksheet,
  formatFrequency,
  formatRRF,
} from '@/engine/lopa/calculator'
import type { LOPAScenario, LOPAScenarioResult } from '@/core/types/lopa.types'
import type { LOPAWorksheet } from '@/core/types/lopa.types'
import type { Project } from '@/core/types/sif.types'

// ─── Colour constants (print-safe, no tokens — static white background) ───────

const C = {
  teal:    '#0D9488',
  tealBg:  '#F0FDFA',
  border:  '#E2E8F0',
  text:    '#0F172A',
  dim:     '#64748B',
  green:   '#15803D',
  greenBg: '#F0FDF4',
  red:     '#DC2626',
  redBg:   '#FEF2F2',
  amber:   '#B45309',
  amberBg: '#FFFBEB',
  blue:    '#1D4ED8',
  blueBg:  '#EFF6FF',
  gray:    '#94A3B8',
  white:   '#FFFFFF',
  pageBg:  '#F8FAFC',
}

// ─── Waterfall chart — print-safe version (no theme tokens) ──────────────────

function WaterfallChartPdf({ result }: { result: LOPAScenarioResult }) {
  const steps = result.waterfall.filter(s => !s.isTarget)
  const targetStep = result.waterfall.find(s => s.isTarget)

  if (steps.length < 2) {
    return (
      <div style={{ padding: '10px 0', fontSize: 9, color: C.dim, textAlign: 'center' }}>
        Aucune couche de protection — graphique non disponible.
      </div>
    )
  }

  const SIL_BAR: Record<number, string> = {
    0: '#10B981', 1: '#16A34A', 2: '#2563EB', 3: '#D97706', 4: '#7C3AED',
  }
  const barColor = result.isAdequate ? '#10B981' : (SIL_BAR[result.silRequired] ?? '#EC4899')

  const maxLog = Math.ceil(-Math.log10(steps[steps.length - 1].runningMef)) + 1
  const minLog = Math.floor(-Math.log10(steps[0].runningMef)) - 1
  const logRange = maxLog - minLog

  const toX = (val: number): number => {
    if (val <= 0) return 100
    const log = -Math.log10(val)
    return Math.max(0, Math.min(100, ((log - minLog) / logRange) * 100))
  }

  const tmelX = targetStep ? toX(targetStep.runningMef) : null
  const LABEL_W = 130
  const VAL_W   = 80

  return (
    <div style={{ width: '100%' }}>
      {/* X-axis tick labels */}
      <div style={{ display: 'flex', marginLeft: LABEL_W + 8, marginRight: VAL_W + 8, justifyContent: 'space-between', marginBottom: 4 }}>
        {Array.from({ length: maxLog - minLog + 1 }, (_, i) => minLog + i).map(exp => (
          <span key={exp} style={{ fontSize: 8, color: C.dim }}>10⁻{exp}</span>
        ))}
      </div>

      {/* Bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {steps.map((step, i) => {
          const currentX = toX(step.runningMef)
          const isIef = i === 0
          // Opacity gradient: first bar full, dimming each step slightly
          const alpha = Math.max(40, 90 - i * 8)
          const hex2 = alpha.toString(16).padStart(2, '0')
          const bg = isIef ? `#0D948890` : `${barColor}${hex2}`

          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Label */}
              <div style={{ width: LABEL_W, flexShrink: 0, fontSize: 8, color: C.dim, textAlign: 'right', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }} title={step.label}>
                {step.label}
              </div>
              {/* Bar track */}
              <div style={{ flex: 1, height: 14, position: 'relative', background: '#E2E8F040', borderRadius: 3, overflow: 'hidden' }}>
                {/* Filled bar */}
                <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${currentX}%`, background: bg, borderRadius: 3 }} />
                {/* TMEL target line */}
                {tmelX !== null && (
                  <div style={{ position: 'absolute', top: 0, bottom: 0, width: 1.5, left: `${tmelX}%`, background: result.isAdequate ? '#10B981' : '#DC2626', zIndex: 2 }} />
                )}
              </div>
              {/* Value */}
              <div style={{ width: VAL_W, flexShrink: 0, fontSize: 8, fontFamily: 'monospace', textAlign: 'right', color: C.text }}>
                {formatFrequency(step.runningMef)}
              </div>
            </div>
          )
        })}

        {/* TMEL row */}
        {targetStep && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4, borderTop: `1px dashed ${C.border}` }}>
            <div style={{ width: LABEL_W, flexShrink: 0, fontSize: 8, fontWeight: 700, color: result.isAdequate ? '#10B981' : '#DC2626', textAlign: 'right' }}>
              TMEL cible
            </div>
            <div style={{ flex: 1, height: 14, position: 'relative', background: '#E2E8F040', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${toX(targetStep.runningMef)}%`, background: result.isAdequate ? '#10B98120' : '#DC262620', borderRadius: 3 }} />
            </div>
            <div style={{ width: VAL_W, flexShrink: 0, fontSize: 8, fontFamily: 'monospace', fontWeight: 700, textAlign: 'right', color: result.isAdequate ? '#10B981' : '#DC2626' }}>
              {formatFrequency(targetStep.runningMef)}
            </div>
          </div>
        )}
      </div>

      {/* Result pill */}
      <div style={{ marginTop: 8, padding: '6px 12px', borderRadius: 6, background: result.isAdequate ? '#10B98112' : `${barColor}12`, border: `1px solid ${result.isAdequate ? '#10B98130' : `${barColor}30`}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: result.isAdequate ? '#10B981' : barColor }}>
          {result.isAdequate
            ? '✓ Adéquat — MEF ≤ TMEL'
            : result.needsSIF
              ? `⚠ SIF requis — SIL ${result.silRequired} (RRF = ${formatRRF(result.rrf)})`
              : '⚠ Risque résiduel supérieur à TMEL'}
        </span>
        <span style={{ fontSize: 9, fontFamily: 'monospace', color: C.dim }}>MEF = {formatFrequency(result.mef)}/an</span>
      </div>
    </div>
  )
}

const SIL_STYLE: Record<number, { bg: string; color: string }> = {
  0: { bg: '#ECFDF5', color: '#15803D' },
  1: { bg: '#ECFDF5', color: '#15803D' },
  2: { bg: '#EFF6FF', color: '#1D4ED8' },
  3: { bg: '#FFFBEB', color: '#B45309' },
  4: { bg: '#FDF4FF', color: '#7E22CE' },
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function PageWrapper({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div
      className="print-page"
      style={{
        width: 794,
        minHeight: 1123,
        background: C.white,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif",
        fontSize: 10,
        color: C.text,
        position: 'relative',
        marginBottom: 8,
      }}
    >
      <div style={{ flex: 1 }}>{children}</div>
      {footer && (
        <div style={{ padding: '8px 40px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {footer}
        </div>
      )}
    </div>
  )
}

function PageFooter({
  projectName,
  studyName,
  pageNum,
  total,
  confidentiality,
}: {
  projectName: string
  studyName: string
  pageNum: number
  total: number
  confidentiality: string
}) {
  return (
    <>
      <span style={{ fontSize: 8, color: C.dim }}>{projectName} · {studyName}</span>
      <span style={{ fontSize: 8, color: C.dim, fontWeight: 600 }}>{confidentiality}</span>
      <span style={{ fontSize: 8, color: C.dim }}>Page {pageNum} / {total}</span>
    </>
  )
}

// ─── Cover page ───────────────────────────────────────────────────────────────

function CoverPage({
  project,
  study,
  prefs,
}: {
  project: Project
  study: LOPAWorksheet
  prefs: ReturnType<typeof useAppStore.getState>['preferences']
}) {
  const scenarios = study.scenarios
  const results = calculateLOPAWorksheet(scenarios)
  const adequate = results.filter(r => r.isAdequate).length
  const needsSIF  = results.filter(r => r.needsSIF).length
  const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <PageWrapper>
      {/* Header band */}
      <div style={{ background: C.teal, padding: '28px 40px 24px', color: C.white }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.75, marginBottom: 6 }}>
          PRISM · Analyse des couches de protection
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.2, marginBottom: 4 }}>
          Rapport LOPA
        </div>
        <div style={{ fontSize: 14, fontWeight: 400, opacity: 0.85 }}>
          {project.name}
        </div>
      </div>

      {/* Study card */}
      <div style={{ margin: '28px 40px 0', padding: 20, background: C.tealBg, borderRadius: 8, border: `1px solid ${C.teal}30` }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: C.teal, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
          Étude
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 4 }}>
          {study.name}
        </div>
        {study.description && (
          <div style={{ fontSize: 10, color: C.dim, lineHeight: 1.5 }}>{study.description}</div>
        )}
      </div>

      {/* KPI row */}
      <div style={{ margin: '20px 40px 0', display: 'flex', gap: 12 }}>
        {[
          { label: 'Scénarios', value: scenarios.length, bg: C.pageBg, color: C.text },
          { label: 'Adéquats', value: adequate, bg: C.greenBg, color: C.green },
          { label: 'SIF requis', value: needsSIF, bg: needsSIF > 0 ? C.redBg : C.pageBg, color: needsSIF > 0 ? C.red : C.dim },
          { label: 'À analyser', value: scenarios.length - adequate - needsSIF, bg: C.pageBg, color: C.dim },
        ].map(k => (
          <div key={k.label} style={{ flex: 1, padding: '12px 14px', background: k.bg, borderRadius: 8, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 9, color: C.dim, marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Visa block */}
      <div style={{ margin: '24px 40px 0', display: 'flex', gap: 12 }}>
        {[
          { role: 'Établi par', name: prefs.reportPreparedBy },
          { role: 'Vérifié par', name: prefs.reportCheckedBy },
          { role: 'Approuvé par', name: prefs.reportApprovedBy },
        ].map(v => (
          <div key={v.role} style={{ flex: 1, border: `1px solid ${C.border}`, borderRadius: 6 }}>
            <div style={{ background: C.pageBg, padding: '5px 10px', borderBottom: `1px solid ${C.border}`, fontSize: 8, color: C.dim, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {v.role}
            </div>
            <div style={{ padding: '8px 10px', fontSize: 10, color: v.name ? C.text : C.gray, minHeight: 32 }}>
              {v.name || '—'}
            </div>
          </div>
        ))}
      </div>

      {/* Date + company */}
      <div style={{ margin: '16px 40px 0', display: 'flex', justifyContent: 'space-between', fontSize: 9, color: C.dim }}>
        <span>Date d'émission : <strong style={{ color: C.text }}>{date}</strong></span>
        {prefs.reportCompanyName && <span>{prefs.reportCompanyName}</span>}
      </div>

      {/* Confidentiality banner */}
      {prefs.reportConfidentialityLabel && (
        <div style={{ margin: '20px 40px 0', padding: '6px 12px', background: C.amberBg, border: `1px solid ${C.amber}30`, borderRadius: 6, fontSize: 9, color: C.amber, fontWeight: 600, textAlign: 'center' }}>
          {prefs.reportConfidentialityLabel}
        </div>
      )}

      {/* IEC 61511 note */}
      <div style={{ margin: '20px 40px 0', padding: '10px 14px', background: C.pageBg, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 9, color: C.dim, lineHeight: 1.5 }}>
        Ce rapport a été généré automatiquement par PRISM conformément à la méthodologie LOPA selon IEC 61511-3.
        Les résultats présentés sont basés sur les données saisies dans l'application et doivent être validés par un ingénieurs sécurité qualifié.
      </div>
    </PageWrapper>
  )
}

// ─── Scenarios summary table ──────────────────────────────────────────────────

function SummaryTablePage({
  project,
  study,
  prefs,
  pageNum,
  totalPages,
}: {
  project: Project
  study: LOPAWorksheet
  prefs: ReturnType<typeof useAppStore.getState>['preferences']
  pageNum: number
  totalPages: number
}) {
  const results = calculateLOPAWorksheet(study.scenarios)
  const resultById = new Map(results.map(r => [r.scenarioId, r]))
  const sifMap = new Map((project.sifs ?? []).map(s => [s.id, s.sifNumber || s.id]))

  const th: React.CSSProperties = {
    padding: '6px 8px',
    background: C.pageBg,
    borderBottom: `1px solid ${C.border}`,
    fontSize: 8,
    fontWeight: 700,
    color: C.dim,
    textAlign: 'left',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    whiteSpace: 'nowrap',
  }

  const td: React.CSSProperties = {
    padding: '5px 8px',
    fontSize: 9,
    color: C.text,
    borderBottom: `1px solid ${C.border}`,
    verticalAlign: 'middle',
  }

  return (
    <PageWrapper footer={<PageFooter projectName={project.name} studyName={study.name} pageNum={pageNum} total={totalPages} confidentiality={prefs.reportConfidentialityLabel} />}>
      <div style={{ padding: '28px 40px 0' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>Tableau récapitulatif des scénarios</div>
        <div style={{ fontSize: 9, color: C.dim, marginBottom: 18 }}>{study.scenarios.length} scénario{study.scenarios.length > 1 ? 's' : ''} — {study.name}</div>

        <table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden' }}>
          <thead>
            <tr>
              <th style={th}>ID</th>
              <th style={{ ...th, width: '22%' }}>Événement dangereux</th>
              <th style={{ ...th, width: '14%' }}>Événement init.</th>
              <th style={th}>IEF [yr⁻¹]</th>
              <th style={th}>IPL</th>
              <th style={th}>MEF [yr⁻¹]</th>
              <th style={th}>TMEL [yr⁻¹]</th>
              <th style={th}>RRF</th>
              <th style={th}>SIL requis</th>
              <th style={th}>Statut</th>
            </tr>
          </thead>
          <tbody>
            {study.scenarios.map((sc, i) => {
              const r = resultById.get(sc.scenarioId)
              const silN = r?.silRequired ?? 0
              const s = SIL_STYLE[silN] ?? SIL_STYLE[0]
              const rowBg = i % 2 === 1 ? C.pageBg : C.white
              return (
                <tr key={sc.id} style={{ background: rowBg }}>
                  <td style={{ ...td, fontWeight: 700, color: C.teal }}>{sc.scenarioId}</td>
                  <td style={{ ...td, fontSize: 8 }}>{sc.description || '—'}</td>
                  <td style={{ ...td, fontSize: 8 }}>{sc.initiatingEvent || '—'}</td>
                  <td style={{ ...td, fontFamily: 'monospace' }}>{formatFrequency(sc.ief)}</td>
                  <td style={{ ...td, textAlign: 'center' }}>{sc.ipls.length}</td>
                  <td style={{ ...td, fontFamily: 'monospace', color: r && r.mef <= r.tmel ? C.green : C.red }}>
                    {r ? formatFrequency(r.mef) : '—'}
                  </td>
                  <td style={{ ...td, fontFamily: 'monospace' }}>{formatFrequency(sc.tmel)}</td>
                  <td style={{ ...td, fontFamily: 'monospace' }}>{r ? formatRRF(r.rrf) : '—'}</td>
                  <td style={td}>
                    <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 8, fontWeight: 700, background: s.bg, color: s.color }}>
                      {silN === 0 ? 'OK' : `SIL ${silN}`}
                    </span>
                  </td>
                  <td style={td}>
                    <span style={{ fontSize: 8, color: r?.isAdequate ? C.green : (r?.needsSIF ? C.red : C.dim) }}>
                      {r?.isAdequate ? '✓ Adéquat' : r?.needsSIF ? '⚠ SIF requis' : '—'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* SIF reference index */}
        {study.scenarios.some(sc => sc.sifRef) && (
          <div style={{ marginTop: 16, fontSize: 8, color: C.dim }}>
            <strong style={{ color: C.text }}>SIF référencées :</strong>{' '}
            {Array.from(new Set(study.scenarios.filter(sc => sc.sifRef).map(sc => sc.sifRef)))
              .map(id => sifMap.get(id!) ?? id)
              .join(' · ')}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}

// ─── Scenario detail pages ────────────────────────────────────────────────────

function ScenarioDetailPage({
  scenario,
  project,
  study,
  prefs,
  pageNum,
  totalPages,
}: {
  scenario: LOPAScenario
  project: Project
  study: LOPAWorksheet
  prefs: ReturnType<typeof useAppStore.getState>['preferences']
  pageNum: number
  totalPages: number
}) {
  const result = calculateLOPAScenario(scenario)
  const silN = result.silRequired
  const s = SIL_STYLE[silN] ?? SIL_STYLE[0]

  const fieldRow = (label: string, value: React.ReactNode) => (
    <tr key={label}>
      <td style={{ padding: '4px 8px', fontSize: 9, color: C.dim, width: '30%', verticalAlign: 'top', borderBottom: `1px solid ${C.border}` }}>{label}</td>
      <td style={{ padding: '4px 8px', fontSize: 9, color: C.text, borderBottom: `1px solid ${C.border}` }}>{value}</td>
    </tr>
  )

  return (
    <PageWrapper footer={<PageFooter projectName={project.name} studyName={study.name} pageNum={pageNum} total={totalPages} confidentiality={prefs.reportConfidentialityLabel} />}>
      <div style={{ padding: '24px 40px 0' }}>
        {/* Scenario header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ padding: '6px 12px', background: C.teal, color: C.white, borderRadius: 6, fontWeight: 800, fontSize: 13 }}>
            {scenario.scenarioId}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{scenario.description || 'Scénario sans titre'}</div>
            <div style={{ fontSize: 9, color: C.dim, marginTop: 2 }}>{scenario.initiatingEvent}</div>
          </div>
          <div style={{ padding: '6px 12px', background: s.bg, borderRadius: 6, fontWeight: 800, fontSize: 12, color: s.color }}>
            {silN === 0 ? 'OK' : `SIL ${silN}`}
          </div>
        </div>

        {/* Data fields */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Données d'entrée</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden' }}>
              <tbody>
                {fieldRow('Fréquence événement init. (IEF)', <span style={{ fontFamily: 'monospace' }}>{formatFrequency(scenario.ief)} yr⁻¹</span>)}
                {fieldRow('Source IEF', scenario.iefSource || '—')}
                {fieldRow('TMEL cible', <span style={{ fontFamily: 'monospace' }}>{formatFrequency(scenario.tmel)} yr⁻¹</span>)}
                {fieldRow('Modif. conditionnelle', (() => {
                  const v = (scenario.ignitionProbability ?? 1) * (scenario.occupancyFactor ?? 1)
                  return v < 1 ? v.toFixed(3) : '—'
                })())}
                {fieldRow('Catégorie conséquence', scenario.consequenceCategory || '—')}
                {scenario.consequenceDescription && fieldRow('Description conséquence', scenario.consequenceDescription)}
              </tbody>
            </table>
          </div>

          {/* Risk result */}
          <div style={{ width: 180 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Résultat</div>
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden' }}>
              {[
                { label: 'MEF', value: formatFrequency(result.mef), mono: true, color: result.mef <= result.tmel ? C.green : C.red },
                { label: 'TMEL', value: formatFrequency(result.tmel), mono: true, color: C.text },
                { label: 'RRF requis', value: formatRRF(result.rrf), mono: true, color: C.text },
                { label: 'SIL requis', value: silN === 0 ? 'OK' : `SIL ${silN}`, mono: false, color: s.color },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 10px', borderBottom: `1px solid ${C.border}`, background: C.white }}>
                  <span style={{ fontSize: 9, color: C.dim }}>{row.label}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: row.color, fontFamily: row.mono ? 'monospace' : 'inherit' }}>{row.value}</span>
                </div>
              ))}
              <div style={{ padding: '8px 10px', background: result.isAdequate ? C.greenBg : C.redBg, textAlign: 'center' }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: result.isAdequate ? C.green : C.red }}>
                  {result.isAdequate ? '✓ Protection adéquate' : '⚠ SIF additionnel requis'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Waterfall chart */}
        {result.waterfall.filter(s => !s.isTarget).length >= 2 && (
          <div style={{ marginBottom: 16, padding: '12px 14px', background: C.pageBg, border: `1px solid ${C.border}`, borderRadius: 6 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
              Réduction de risque — couches de protection (échelle log)
            </div>
            <WaterfallChartPdf result={result} />
          </div>
        )}

        {/* IPL table */}
        {scenario.ipls.length > 0 && (
          <>
            <div style={{ fontSize: 9, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
              Couches de protection indépendantes ({scenario.ipls.length})
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden' }}>
              <thead>
                <tr>
                  {['Description', 'Type', 'PFD / RRF', 'Validé IEC 61511', 'Commentaire'].map(h => (
                    <th key={h} style={{ padding: '5px 8px', background: C.pageBg, borderBottom: `1px solid ${C.border}`, fontSize: 8, fontWeight: 700, color: C.dim, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scenario.ipls.map((ipl, i) => (
                  <tr key={ipl.id} style={{ background: i % 2 === 1 ? C.pageBg : C.white }}>
                    <td style={{ padding: '5px 8px', fontSize: 9 }}>
                      {ipl.tag ? <span style={{ fontFamily: 'monospace', color: C.teal, marginRight: 6 }}>{ipl.tag}</span> : null}
                      {ipl.description}
                    </td>
                    <td style={{ padding: '5px 8px', fontSize: 9, color: C.dim }}>{ipl.type}</td>
                    <td style={{ padding: '5px 8px', fontSize: 9, fontFamily: 'monospace' }}>
                      PFD = {ipl.pfd}
                    </td>
                    <td style={{ padding: '5px 8px', fontSize: 9, color: ipl.isValidated ? C.green : C.dim }}>
                      {ipl.isValidated ? '✓ Oui' : '—'}
                    </td>
                    <td style={{ padding: '5px 8px', fontSize: 9, color: C.dim }}>{ipl.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {scenario.ipls.length === 0 && (
          <div style={{ padding: '10px 14px', background: C.pageBg, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 9, color: C.dim }}>
            Aucune couche de protection indépendante (IPL) documentée pour ce scénario.
          </div>
        )}
      </div>
    </PageWrapper>
  )
}

// ─── Full report document ─────────────────────────────────────────────────────

function LOPAReportDocument({
  project,
  study,
}: {
  project: Project
  study: LOPAWorksheet
}) {
  const prefs = useAppStore.getState().preferences
  // Pages: 1 cover + 1 summary + N scenario details
  const totalPages = 2 + study.scenarios.length

  return (
    <div>
      <CoverPage project={project} study={study} prefs={prefs} />
      <SummaryTablePage project={project} study={study} prefs={prefs} pageNum={2} totalPages={totalPages} />
      {study.scenarios.map((sc, i) => (
        <ScenarioDetailPage
          key={sc.id}
          scenario={sc}
          project={project}
          study={study}
          prefs={prefs}
          pageNum={3 + i}
          totalPages={totalPages}
        />
      ))}
    </div>
  )
}

// ─── Export entry point ───────────────────────────────────────────────────────

export async function exportLOPAReportPdf(project: Project, study: LOPAWorksheet): Promise<void> {
  const prefs = useAppStore.getState().preferences
  const pageFormat = prefs.pdfPageSize ?? 'A4'
  const date = new Date().toISOString().split('T')[0]
  const safeName = (study.name ?? 'LOPA').replace(/[^a-zA-Z0-9_-]/g, '_')
  const fileName = `LOPA_${project.ref || project.id}_${safeName}_${date}.pdf`

  const blob = await renderPdfPagesToBlob({
    pageFormat,
    element: <LOPAReportDocument project={project} study={study} />,
  })

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}
