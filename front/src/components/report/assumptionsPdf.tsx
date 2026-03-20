import type { ReactNode } from 'react'
import { renderPdfPagesToBlob } from '@/lib/pdf'
import { normalizeSIFAssumptions } from '@/core/models/sifAssumptions'
import type { Project, SIF, SIFAssumption } from '@/core/types'

const STATUS_META: Record<string, { label: string; bg: string; color: string; border: string }> = {
  draft: { label: 'Draft', bg: '#F1F5F9', color: '#64748B', border: '#CBD5E1' },
  review: { label: 'Review', bg: '#FFF7E8', color: '#C27803', border: '#F3D18B' },
  validated: { label: 'Validated', bg: '#EAF8EF', color: '#15803D', border: '#B7E4C7' },
}

const CATEGORY_LABELS: Record<string, string> = {
  process: 'Process',
  proof: 'Proof test',
  architecture: 'Architecture',
  data: 'Data',
  governance: 'Governance',
  other: 'Other',
}

const TAB_LABELS: Record<string, string> = {
  cockpit: 'Cockpit',
  context: 'Context',
  architecture: 'Architecture',
  verification: 'Verification',
  exploitation: 'Exploitation',
  report: 'Report',
  overview: 'Cockpit',
  analysis: 'Verification',
  compliance: 'Verification',
  prooftest: 'Exploitation',
}

function chunkAssumptions(items: SIFAssumption[], size: number): SIFAssumption[][] {
  if (!items.length) return [[]]
  const chunks: SIFAssumption[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

function sanitizeFileStem(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '_')
}

function formatDisplayDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function Page({
  children,
  pageNum,
  total,
}: {
  children: ReactNode
  pageNum: number
  total: number
}) {
  return (
    <div
      className="print-page bg-white text-slate-900"
      style={{
        width: 794,
        minHeight: 1123,
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
        fontSize: 11,
        lineHeight: 1.45,
        padding: '44px 48px',
        boxSizing: 'border-box',
        position: 'relative',
        pageBreakAfter: 'always',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 6,
          background: 'linear-gradient(90deg, #003D5C 0%, #009BA4 100%)',
        }}
      />
      {children}
      <div
        className="flex items-center justify-between border-t border-slate-200 pt-3"
        style={{ position: 'absolute', left: 48, right: 48, bottom: 24 }}
      >
        <span className="text-[9px] text-slate-400">PRISM · Assumptions Register</span>
        <span className="text-[9px] font-mono text-slate-400">Page {pageNum} / {total}</span>
      </div>
    </div>
  )
}

function CoverPage({
  project,
  sif,
  assumptions,
  pageNum,
  total,
}: {
  project: Project
  sif: SIF
  assumptions: SIFAssumption[]
  pageNum: number
  total: number
}) {
  const counts = {
    total: assumptions.length,
    validated: assumptions.filter(item => item.status === 'validated').length,
    review: assumptions.filter(item => item.status === 'review').length,
    draft: assumptions.filter(item => item.status === 'draft').length,
  }
  const openReviews = counts.review + counts.draft
  const reviewTone = openReviews === 0
    ? { label: 'Controlled', bg: '#EAF8EF', color: '#15803D', border: '#B7E4C7' }
    : { label: 'Needs review', bg: '#FFF7E8', color: '#C27803', border: '#F3D18B' }
  const generationDate = formatDisplayDate(new Date().toISOString())

  return (
    <Page pageNum={pageNum} total={total}>
      <div className="flex h-full flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-8">
            <div>
              <div className="mb-6 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ background: '#003D5C' }}>
                  PR
                </div>
                <span className="text-sm font-bold text-slate-900">PRISM</span>
                <span className="ml-1 text-xs text-slate-400">SIL Workspace</span>
              </div>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: '#009BA4' }}>
                Standalone Assumptions Register
              </p>
              <h1 className="max-w-xl text-3xl font-bold tracking-tight text-slate-900">
                {sif.sifNumber} — Assumptions Register
              </h1>
              <p className="mt-2 text-sm text-slate-500">{sif.title || sif.description || 'Safety Instrumented Function'}</p>
            </div>

            <div
              className="flex h-28 w-28 shrink-0 flex-col items-center justify-center rounded-2xl border-2"
              style={{ borderColor: reviewTone.border, background: reviewTone.bg }}
            >
              <span className="mb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: reviewTone.color }}>
                Register
              </span>
              <span className="text-3xl font-black" style={{ color: reviewTone.color }}>{counts.total}</span>
              <span className="mt-1 inline-flex min-h-[24px] items-center text-[10px] font-semibold" style={{ color: reviewTone.color }}>{reviewTone.label}</span>
            </div>
          </div>

          <div className="my-10 grid grid-cols-4 gap-4">
            {[
              { label: 'Project', value: project.name || '—' },
              { label: 'Client / Site', value: [project.client, project.site].filter(Boolean).join(' · ') || '—' },
              { label: 'Revision', value: `Rev. ${sif.revision}` },
              { label: 'Generated', value: generationDate },
            ].map(item => (
              <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[9px] uppercase tracking-wider text-slate-400">{item.label}</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total', value: counts.total, tone: '#0F172A', bg: '#F8FAFC' },
              { label: 'Validated', value: counts.validated, tone: '#15803D', bg: '#EAF8EF' },
              { label: 'In review', value: counts.review, tone: '#C27803', bg: '#FFF7E8' },
              { label: 'Draft', value: counts.draft, tone: '#64748B', bg: '#F1F5F9' },
            ].map(item => (
              <div key={item.label} className="rounded-2xl p-5 text-center" style={{ background: item.bg }}>
                <p className="text-[9px] uppercase tracking-wider text-slate-400">{item.label}</p>
                <p className="mt-2 text-3xl font-black" style={{ color: item.tone }}>{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Intent</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              This standalone document isolates the explicit SIF assumptions register so it can be reviewed, challenged,
              shared, or archived without opening the full SIL report. It should stay concise, defensible, and auditable.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-[10px] leading-relaxed text-slate-600">
          <strong className="text-slate-700">Reading rule:</strong> an assumption is acceptable only when its statement,
          rationale, owner and review status remain coherent with the SIF architecture, proof test strategy and source data.
        </div>
      </div>
    </Page>
  )
}

function RegisterPage({
  assumptions,
  pageNum,
  total,
  startIndex,
}: {
  assumptions: SIFAssumption[]
  pageNum: number
  total: number
  startIndex: number
}) {
  return (
    <Page pageNum={pageNum} total={total}>
      <div className="flex h-full flex-col">
        <div className="mb-6 flex items-end justify-between gap-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: '#009BA4' }}>
              Assumptions Register
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Explicit SIF assumptions</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Each item must be specific, reviewable, and linked to the most relevant workspace context.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
            <p className="text-[9px] uppercase tracking-wider text-slate-400">Items on this page</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{assumptions.length}</p>
          </div>
        </div>

        <div className="flex-1 space-y-4">
          {assumptions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm leading-relaxed text-slate-500">
              No explicit assumption has been documented for this SIF yet.
            </div>
          ) : assumptions.map((assumption, index) => {
            const status = STATUS_META[assumption.status] ?? STATUS_META.review
            return (
              <div key={assumption.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Assumption {startIndex + index + 1}</p>
                    <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">
                      {assumption.title || 'Untitled assumption'}
                    </h3>
                  </div>
                  <span
                    className="inline-flex min-h-[28px] items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wide"
                    style={{ background: status.bg, color: status.color, borderColor: status.border }}
                  >
                    {status.label}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    CATEGORY_LABELS[assumption.category] ?? assumption.category,
                    TAB_LABELS[assumption.linkedTab] ?? assumption.linkedTab,
                    assumption.owner ? `Owner: ${assumption.owner}` : null,
                    assumption.reviewDate ? `Review: ${formatDisplayDate(assumption.reviewDate)}` : null,
                  ].filter(Boolean).map(item => (
                    <span key={String(item)} className="inline-flex min-h-[24px] items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                      {item}
                    </span>
                  ))}
                </div>

                <div className="mt-4 grid gap-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Statement</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">{assumption.statement || '—'}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Rationale</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">{assumption.rationale || 'No rationale documented.'}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Page>
  )
}

function ReviewPage({
  assumptions,
  pageNum,
  total,
}: {
  assumptions: SIFAssumption[]
  pageNum: number
  total: number
}) {
  const pending = assumptions.filter(item => item.status !== 'validated')
  const topPending = pending.slice(0, 8)
  const counts = {
    validated: assumptions.filter(item => item.status === 'validated').length,
    review: assumptions.filter(item => item.status === 'review').length,
    draft: assumptions.filter(item => item.status === 'draft').length,
  }

  return (
    <Page pageNum={pageNum} total={total}>
      <div className="flex h-full flex-col">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: '#009BA4' }}>
            Review & sign-off
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Closure sheet</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
            Use this page to close remaining review points, document reviewer comments, and record the final sign-off chain for the assumptions register.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-[1.1fr_0.9fr] gap-6">
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Validated', value: counts.validated, bg: '#EAF8EF', color: '#15803D' },
                { label: 'In review', value: counts.review, bg: '#FFF7E8', color: '#C27803' },
                { label: 'Draft', value: counts.draft, bg: '#F1F5F9', color: '#64748B' },
              ].map(item => (
                <div key={item.label} className="rounded-2xl p-4 text-center" style={{ background: item.bg }}>
                  <p className="text-[9px] uppercase tracking-wider text-slate-400">{item.label}</p>
                  <p className="mt-2 text-3xl font-black" style={{ color: item.color }}>{item.value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">Open points</h3>
                <span className="inline-flex min-h-[26px] items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                  {pending.length} remaining
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {topPending.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm text-slate-500">
                    No open review point remains in the register.
                  </div>
                ) : topPending.map((assumption, index) => {
                  const status = STATUS_META[assumption.status] ?? STATUS_META.review
                  return (
                    <div key={assumption.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Open point {index + 1}</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">{assumption.title || 'Untitled assumption'}</p>
                        </div>
                        <span className="inline-flex min-h-[24px] items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide" style={{ background: status.bg, color: status.color, borderColor: status.border }}>
                          {status.label}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-slate-600">{assumption.statement || 'No statement documented.'}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            {['Prepared by', 'Reviewed by', 'Approved by'].map(label => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</h3>
                <div className="mt-5 space-y-4">
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-slate-400">Name</p>
                    <div className="mt-2 h-9 rounded-lg border border-dashed border-slate-300 bg-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-slate-400">Date</p>
                      <div className="mt-2 h-9 rounded-lg border border-dashed border-slate-300 bg-white" />
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-slate-400">Signature</p>
                      <div className="mt-2 h-9 rounded-lg border border-dashed border-slate-300 bg-white" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Reviewer comments</h3>
          <div className="mt-4 grid grid-cols-2 gap-4">
            {[0, 1].map(index => (
              <div key={index} className="h-28 rounded-xl border border-dashed border-slate-300 bg-white" />
            ))}
          </div>
        </div>
      </div>
    </Page>
  )
}

export function getAssumptionsPdfPageCount(assumptionsRaw: unknown): number {
  const assumptions = normalizeSIFAssumptions(assumptionsRaw)
  const pages = chunkAssumptions(assumptions, 4)
  return 2 + pages.length
}

export function AssumptionsPdfDocument({
  project,
  sif,
  assumptionsRaw,
}: {
  project: Project
  sif: SIF
  assumptionsRaw: unknown
}) {
  const assumptions = normalizeSIFAssumptions(assumptionsRaw)
  const pages = chunkAssumptions(assumptions, 4)
  const totalPages = getAssumptionsPdfPageCount(assumptions)

  return (
    <div className="space-y-6" style={{ width: 'fit-content' }}>
      <CoverPage project={project} sif={sif} assumptions={assumptions} pageNum={1} total={totalPages} />
      {pages.map((pageAssumptions, index) => (
        <RegisterPage
          key={`assumptions-page-${index}`}
          assumptions={pageAssumptions}
          pageNum={index + 2}
          total={totalPages}
          startIndex={index * 4}
        />
      ))}
      <ReviewPage
        assumptions={assumptions}
        pageNum={totalPages}
        total={totalPages}
      />
    </div>
  )
}

export function getAssumptionsPdfFileName(project: Project, sif: SIF): string {
  const stem = [project.ref || project.name || 'PRISM', sif.sifNumber || 'SIF', `ASSUMPTIONS-${sif.revision || 'A'}`]
    .filter(Boolean)
    .join('_')
  return sanitizeFileStem(stem)
}

export async function buildAssumptionsPdfBlob(input: {
  project: Project
  sif: SIF
  assumptions?: unknown
}): Promise<{ blob: Blob; fileName: string }> {
  const assumptions = normalizeSIFAssumptions(input.assumptions ?? input.sif.assumptions)
  const fileName = `${getAssumptionsPdfFileName(input.project, input.sif)}.pdf`
  const blob = await renderPdfPagesToBlob({
    element: (
      <div className="mx-auto shadow-2xl" style={{ maxWidth: 794 }}>
        <AssumptionsPdfDocument
          project={input.project}
          sif={input.sif}
          assumptionsRaw={assumptions}
        />
      </div>
    ),
  })

  return { blob, fileName }
}
