/**
 * SIFHistoryWorkspace — PRISM v3 Sprint 2
 *
 * Sprint 2 :
 *   ✓ Snapshots réels depuis prism_sif_revisions (lazy-load on expand)
 *   ✓ Modal "+ Révision" — snapshot avec revisionLabel + description + auteur
 *   ✓ "Comparer ↔" — actif dès que ≥ 2 révisions disponibles
 *   ✓ Delta inline entre révisions (texte bleu, style GED)
 *   ✓ SIFRevisionCompare modal plein écran
 */
import { useState, useMemo, useEffect } from 'react'
import {
  ChevronDown, ChevronRight, GitBranch, GitCompare,
  FileText, FilePlus, Search,
  ExternalLink, Download, X, Loader2, BarChart3, ShieldCheck, SlidersHorizontal,
} from 'lucide-react'
import { useAppStore, type SIFTab } from '@/store/appStore'
import { calcSIF, formatPFD } from '@/core/math/pfdCalc'
import type { Project, SIF, SIFStatus, SIFRevision } from '@/core/types'
import { SIFRevisionCompare } from './SIFRevisionCompare'
import { BORDER, CARD_BG, PAGE_BG, PANEL_BG, TEAL, TEAL_DIM, TEXT, TEXT_DIM } from '@/styles/tokens'
import { IntercalaireCard, IntercalaireTabBar, useLayout } from '@/components/layout/SIFWorkbenchLayout'

// ─── Design tokens ────────────────────────────────────────────────────────
// ─── Status config ────────────────────────────────────────────────────────
const STATUS_CFG: Record<SIFStatus, { label: string; bg: string; color: string; border: string }> = {
  draft:     { label: 'PRE',  bg: '#1A1F24', color: '#8FA0B1', border: '#2A3138' },
  in_review: { label: 'IFR',  bg: '#1C1500', color: '#F59E0B', border: '#B4530830' },
  verified:  { label: 'VER',  bg: '#0F1B3D', color: '#60A5FA', border: '#1D4ED830' },
  approved:  { label: 'APP',  bg: '#052E16', color: '#4ADE80', border: '#15803D30' },
  archived:  { label: 'ARC',  bg: '#1A1F24', color: '#4B5563', border: '#2A3138' },
}

function StatusBadge({ status }: { status: SIFStatus }) {
  const cfg = STATUS_CFG[status]
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black tracking-wider"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  )
}

function PFDPill({ sif }: { sif: SIF }) {
  const result = useMemo(() => calcSIF(sif), [sif])
  const color  = result.meetsTarget ? '#4ADE80' : '#F87171'
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold"
      style={{ background: `${color}12`, color, border: `1px solid ${color}25` }}>
      {formatPFD(result.PFD_avg)}
      <span style={{ color: TEXT_DIM, fontWeight: 400 }}>SIL{result.SIL}</span>
    </span>
  )
}

// ─── Inline delta between two snapshots (blue text like the GED) ──────────
function InlineDelta({ older, newer }: { older: SIFRevision; newer: SIFRevision }) {
  const calcOld = useMemo(() => calcSIF(older.snapshot), [older])
  const calcNew = useMemo(() => calcSIF(newer.snapshot), [newer])

  const parts: string[] = []
  if (older.status !== newer.status) parts.push(`${STATUS_CFG[older.status].label} → ${STATUS_CFG[newer.status].label}`)
  if (calcOld.SIL !== calcNew.SIL)   parts.push(`SIL ${calcOld.SIL} → SIL ${calcNew.SIL}`)
  if (Math.abs(calcOld.PFD_avg - calcNew.PFD_avg) > 1e-12) parts.push(`PFD ${formatPFD(calcOld.PFD_avg)} → ${formatPFD(calcNew.PFD_avg)}`)

  const compA = (older.snapshot.subsystems ?? []).reduce((n, s) => n + s.channels.reduce((m, c) => m + c.components.length, 0), 0)
  const compB = (newer.snapshot.subsystems ?? []).reduce((n, s) => n + s.channels.reduce((m, c) => m + c.components.length, 0), 0)
  if (compA !== compB) parts.push(`${compB > compA ? '+' : ''}${compB - compA} composant${Math.abs(compB - compA) > 1 ? 's' : ''}`)
  if (older.snapshot.madeBy !== newer.snapshot.madeBy && newer.snapshot.madeBy) parts.push(`Rédacteur: ${newer.snapshot.madeBy}`)

  if (parts.length === 0) return <span className="text-[9px] italic" style={{ color: TEXT_DIM }}>Aucun changement détecté</span>

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {parts.map((p, i) => (
        <span key={i}>
          {i > 0 && <span style={{ color: TEXT_DIM }}> · </span>}
          <span className="text-[9px] font-semibold" style={{ color: '#60A5FA' }}>{p}</span>
        </span>
      ))}
    </div>
  )
}

// ─── New revision modal ───────────────────────────────────────────────────
interface NewRevisionModalProps {
  sif: SIF
  onClose: () => void
  onConfirm: (revisionLabel: string, changeDescription: string, createdBy: string) => Promise<void>
}

function NewRevisionModal({ sif, onClose, onConfirm }: NewRevisionModalProps) {
  const [revisionLabel,     setRevisionLabel]     = useState(sif.revision || 'A')
  const [changeDescription, setChangeDescription] = useState('')
  const [createdBy,         setCreatedBy]         = useState(sif.madeBy || '')
  const [saving,            setSaving]            = useState(false)
  const [error,             setError]             = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!revisionLabel.trim()) { setError('Le label de révision est requis.'); return }
    setSaving(true)
    setError(null)
    try {
      await onConfirm(revisionLabel.trim(), changeDescription.trim(), createdBy.trim())
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }}>
      <div className="rounded-2xl overflow-hidden shadow-2xl"
        style={{ width: 440, background: PANEL_BG, border: `1px solid ${BORDER}` }}>

        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: BORDER }}>
          <div className="flex items-center gap-2">
            <FilePlus size={15} style={{ color: TEAL }} />
            <span className="text-sm font-black" style={{ color: TEXT }}>Nouvelle révision</span>
          </div>
          <button type="button" onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ color: TEXT_DIM }}
            onMouseEnter={e => { e.currentTarget.style.color = '#EF4444' }}
            onMouseLeave={e => { e.currentTarget.style.color = TEXT_DIM }}>
            <X size={14} />
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          <p className="text-[11px]" style={{ color: TEXT_DIM }}>
            Un snapshot de l'état actuel de{' '}
            <strong style={{ color: TEXT }}>{sif.sifNumber}</strong> sera figé.
          </p>
          {[
            { label: 'Label de révision *', value: revisionLabel, set: setRevisionLabel, placeholder: 'ex. B, C, 2, Rev.D…' },
            { label: 'Objet de la révision', value: changeDescription, set: setChangeDescription, placeholder: 'ex. Architecture modifiée — capteur redondant ajouté' },
            { label: 'Établi par', value: createdBy, set: setCreatedBy, placeholder: 'Nom Prénom' },
          ].map(field => (
            <div key={field.label} className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>{field.label}</label>
              <input type="text" value={field.value} onChange={e => field.set(e.target.value)}
                placeholder={field.placeholder}
                className="h-9 rounded-lg border px-3 text-sm outline-none"
                style={{ background: CARD_BG, borderColor: BORDER, color: TEXT }}
                onFocus={e => { e.currentTarget.style.borderColor = TEAL }}
                onBlur={e => { e.currentTarget.style.borderColor = BORDER }}
              />
            </div>
          ))}
          {error && <p className="text-[11px] px-3 py-2 rounded-lg" style={{ background: '#EF444415', color: '#F87171' }}>{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: BORDER }}>
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-lg text-[12px] font-semibold border"
            style={{ borderColor: BORDER, color: TEXT_DIM, background: 'transparent' }}>
            Annuler
          </button>
          <button type="button" onClick={handleSubmit}
            disabled={saving || !revisionLabel.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-black"
            style={{ background: 'linear-gradient(135deg, #009BA4, #007A82)', color: '#fff', opacity: saving || !revisionLabel.trim() ? 0.5 : 1 }}>
            {saving && <Loader2 size={12} className="animate-spin" />}
            Créer le snapshot
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Expanded revision list ───────────────────────────────────────────────
function RevisionList({
  sif, revisions, loading, onCompare, onNavigate,
}: {
  sif: SIF
  revisions: SIFRevision[]
  loading: boolean
  onCompare: (older: SIFRevision, newer: SIFRevision) => void
  onNavigate: (tab: SIFTab) => void
}) {
  void sif // used for context, may be used later
  return (
    <div className="overflow-hidden rounded-xl border" style={{ borderColor: `${TEAL}35`, background: '#121820' }}>
      <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] table-fixed border-collapse">
        <colgroup>
          <col style={{ width: '60px' }} />
          <col style={{ width: '90px' }} />
          <col style={{ width: '120px' }} />
          <col style={{ width: '160px' }} />
          <col style={{ width: 'auto' }} />
          <col style={{ width: '220px' }} />
        </colgroup>
        <thead>
          <tr className="border-b" style={{ borderColor: BORDER, background: '#1D232A' }}>
            {(['Rév.', 'Statut', 'Date', 'Établi par', 'Objet', 'Actions'] as const).map((label, i) => (
                  <th key={label} className="px-4 py-2 text-left text-[9px] font-bold uppercase tracking-widest whitespace-nowrap"
                    style={{
                      color: TEXT_DIM,
                    }}>
                {label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 size={12} className="animate-spin" style={{ color: TEAL }} />
                  <span className="text-[11px]" style={{ color: TEXT_DIM }}>Chargement…</span>
                </div>
              </td>
            </tr>
          ) : revisions.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-3 text-[11px] italic" style={{ color: TEXT_DIM }}>
                Aucun snapshot. Utilisez "+ Révision" pour figer l'état actuel de cette SIF.
              </td>
            </tr>
          ) : (
            revisions.map((rev, i) => {
              const prev = revisions[i + 1] // older
              const isNewest = i === 0
              return (
                [
                  <tr key={rev.id} className="border-b" style={{ borderColor: `${BORDER}60`, background: isNewest ? `${TEAL}06` : 'transparent' }}>
                    <td className="px-4 py-2.5 align-top">
                      <span className="font-mono font-black text-[11px]" style={{ color: isNewest ? TEAL : TEXT }}>
                        {rev.revisionLabel}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 align-top"><StatusBadge status={rev.status} /></td>
                    <td className="px-4 py-2.5 align-top text-[11px] whitespace-nowrap" style={{ color: TEXT_DIM }}>
                      {new Date(rev.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-2.5 align-top text-[11px] whitespace-nowrap" style={{ color: TEXT }}>{rev.createdBy || '—'}</td>
                    <td className="px-4 py-2.5 align-top text-[11px] truncate" style={{ color: TEXT_DIM }}>{rev.changeDescription || '—'}</td>
                    <td className="px-4 py-2.5 align-top whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <button type="button" onClick={() => onNavigate('report')}
                          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] border transition-colors whitespace-nowrap"
                          style={{ borderColor: BORDER, color: TEXT_DIM }}
                          onMouseEnter={e => { e.currentTarget.style.color = TEAL; e.currentTarget.style.borderColor = TEAL }}
                          onMouseLeave={e => { e.currentTarget.style.color = TEXT_DIM; e.currentTarget.style.borderColor = BORDER }}>
                          <Download size={10} /> PDF
                        </button>
                        {prev && (
                          <button type="button" onClick={() => onCompare(prev, rev)}
                            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] border transition-colors whitespace-nowrap"
                            style={{ borderColor: BORDER, color: TEXT_DIM }}
                            onMouseEnter={e => { e.currentTarget.style.color = TEAL; e.currentTarget.style.borderColor = TEAL }}
                            onMouseLeave={e => { e.currentTarget.style.color = TEXT_DIM; e.currentTarget.style.borderColor = BORDER }}>
                            <GitCompare size={10} /> vs {prev.revisionLabel}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>,
                  prev ? (
                    <tr key={`${rev.id}-delta`} className="border-b" style={{ borderColor: `${BORDER}40`, background: '#0F151A' }}>
                      <td colSpan={6} className="px-4 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px]" style={{ color: TEXT_DIM }}>{prev.revisionLabel} → {rev.revisionLabel}</span>
                          <span style={{ color: BORDER }}>·</span>
                          <InlineDelta older={prev} newer={rev} />
                        </div>
                      </td>
                    </tr>
                  ) : null,
                ]
              )
            })
          )}
        </tbody>
      </table>
      </div>
    </div>
  )
}

// ─── SIF row ──────────────────────────────────────────────────────────────
function SIFRow({
  sif, project, isExpanded, onToggle, onNavigate, onNewRevision, onCompare,
}: {
  sif: SIF
  project: Project
  isExpanded: boolean
  onToggle: () => void
  onNavigate: (tab: SIFTab) => void
  onNewRevision: () => void
  onCompare: (older: SIFRevision, newer: SIFRevision) => void
}) {
  void project
  const revisions      = useAppStore(s => s.revisions[sif.id] ?? null)
  const fetchRevisions = useAppStore(s => s.fetchRevisions)
  const [loadingRevs, setLoadingRevs] = useState(false)

  useEffect(() => {
    if (!isExpanded || revisions !== null) return
    setLoadingRevs(true)
    fetchRevisions(sif.id).finally(() => setLoadingRevs(false))
  }, [isExpanded, revisions, fetchRevisions, sif.id])

  const revCount = revisions?.length ?? null

  return (
    <>
      <tr className="border-b group transition-colors" style={{ borderColor: BORDER }}
        onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.02)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}>

        <td className="px-4 py-3 whitespace-nowrap">
          <span className="font-mono font-black text-[12px]" style={{ color: TEAL }}>{sif.sifNumber}</span>
        </td>
        <td className="px-4 py-3 overflow-hidden">
          <p className="text-[12px] font-medium truncate" style={{ color: TEXT }}>{sif.title || '—'}</p>
          {sif.processTag && <p className="text-[10px] mt-0.5 truncate" style={{ color: TEXT_DIM }}>{sif.processTag}</p>}
        </td>
        <td className="px-4 py-3 text-center">
          <span className="font-mono font-bold text-[12px]" style={{ color: TEXT }}>{sif.revision || 'A'}</span>
        </td>
        <td className="px-4 py-3"><StatusBadge status={sif.status} /></td>
        <td className="px-4 py-3 whitespace-nowrap">
          <span className="text-[11px]" style={{ color: TEXT_DIM }}>{sif.date || '—'}</span>
        </td>
        <td className="px-4 py-3"><span className="text-[11px]" style={{ color: TEXT }}>{sif.madeBy || '—'}</span></td>
        <td className="px-4 py-3"><span className="text-[11px]" style={{ color: TEXT }}>{sif.verifiedBy || '—'}</span></td>
        <td className="px-4 py-3"><PFDPill sif={sif} /></td>

        <td className="px-4 py-3 text-center">
          <button type="button" onClick={onToggle}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold border transition-colors"
            style={{ borderColor: isExpanded ? TEAL : BORDER, color: isExpanded ? TEAL : TEXT_DIM, background: isExpanded ? `${TEAL}12` : 'transparent' }}>
            {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
            {revCount === null ? '…' : `${revCount} rév.`}
          </button>
        </td>

        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            {[
              { label: 'Ouvrir', Icon: ExternalLink, onClick: () => onNavigate('overview') },
              { label: 'PDF',    Icon: Download,     onClick: () => onNavigate('report') },
            ].map(btn => (
              <button key={btn.label} type="button" onClick={btn.onClick}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors"
                style={{ borderColor: BORDER, color: TEXT_DIM, background: 'transparent' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = TEAL; e.currentTarget.style.color = TEAL }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT_DIM }}>
                <btn.Icon size={11} /> {btn.label}
              </button>
            ))}
            <button type="button" onClick={onNewRevision}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors"
              style={{ borderColor: `${TEAL}60`, color: TEAL, background: `${TEAL}10` }}
              onMouseEnter={e => { e.currentTarget.style.background = `${TEAL}22` }}
              onMouseLeave={e => { e.currentTarget.style.background = `${TEAL}10` }}>
              <FilePlus size={11} /> + Révision
            </button>
          </div>
        </td>
      </tr>

      {isExpanded && (
        <tr style={{ background: `${TEAL}04` }}>
          <td colSpan={10} className="px-4 py-3">
            <RevisionList
              sif={sif}
              revisions={revisions ?? []}
              loading={loadingRevs}
              onCompare={onCompare}
              onNavigate={onNavigate}
            />
          </td>
        </tr>
      )}
    </>
  )
}

const SIF_HISTORY_COLUMNS = [
  '120px', // N° SIF
  '260px', // Désignation
  '70px',  // Rév.
  '90px',  // Statut
  '120px', // Date
  '140px', // Rédacteur
  '140px', // Vérificateur
  '120px', // PFD / SIL
  '100px', // Historique
  '320px', // Actions
] as const

const SIF_HISTORY_HEADERS = ['N° SIF', 'Désignation', 'Rév.', 'Statut', 'Date', 'Rédacteur', 'Vérificateur', 'PFD / SIL', 'Historique', 'Actions'] as const

function SIFHistoryColGroup() {
  return (
    <colgroup>
      {SIF_HISTORY_COLUMNS.map((w, i) => <col key={i} style={{ width: w }} />)}
    </colgroup>
  )
}

function SIFHistoryHeaderRow() {
  return (
    <tr className="border-b" style={{ borderColor: BORDER, background: '#1D232A' }}>
      {SIF_HISTORY_HEADERS.map((label, i) => (
        <th key={label} className="px-4 py-2.5 whitespace-nowrap"
          style={{
            color: TEXT_DIM,
            fontSize: 9,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            textAlign: (i === 2 || i === 8) ? 'center' : 'left',
          }}>
          {label}
        </th>
      ))}
    </tr>
  )
}

// ─── Project section ──────────────────────────────────────────────────────
function ProjectSection({
  project, expandedSIFs, onToggleSIF, onNavigate, onNewRevision, onCompare,
}: {
  project: Project
  expandedSIFs: Set<string>
  onToggleSIF: (id: string) => void
  onNavigate: (projectId: string, sifId: string, tab: SIFTab) => void
  onNewRevision: (projectId: string, sif: SIF) => void
  onCompare: (older: SIFRevision, newer: SIFRevision) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  if (project.sifs.length === 0) return null

  return (
    <section>
      <button
        type="button"
        className="w-full px-1 py-2.5 text-left rounded-lg"
        style={{ background: 'transparent' }}
        onClick={() => setCollapsed(v => !v)}
      >
        <div className="flex items-center gap-2">
          {collapsed ? <ChevronRight size={13} style={{ color: TEAL }} /> : <ChevronDown size={13} style={{ color: TEAL }} />}
          <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: TEAL }}>{project.client || 'Sans client'}</span>
          <span className="text-[11px] font-semibold" style={{ color: TEXT }}>· {project.name}</span>
          <span className="text-[11px]" style={{ color: TEXT_DIM }}>({project.ref})</span>
          <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${TEAL}15`, color: TEAL_DIM }}>
            {project.sifs.length} SIF{project.sifs.length > 1 ? 's' : ''}
          </span>
        </div>
      </button>

      {!collapsed && (
        <div className="pt-1 pb-3">
          <div className="overflow-hidden rounded-xl border" style={{ borderColor: BORDER, background: '#14181C' }}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1460px] table-fixed border-collapse">
                <SIFHistoryColGroup />
                <thead>
                  <SIFHistoryHeaderRow />
                </thead>
                <tbody>
                  {project.sifs.map(sif => (
                    <SIFRow key={sif.id} sif={sif} project={project}
                      isExpanded={expandedSIFs.has(sif.id)}
                      onToggle={() => onToggleSIF(sif.id)}
                      onNavigate={(tab) => onNavigate(project.id, sif.id, tab)}
                      onNewRevision={() => onNewRevision(project.id, sif)}
                      onCompare={onCompare}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

const HISTORY_RIGHT_TABS = [
  { id: 'insights' as const, label: 'Insights', Icon: BarChart3 },
  { id: 'gates' as const, label: 'Quality', Icon: ShieldCheck },
  { id: 'scope' as const, label: 'Scope', Icon: SlidersHorizontal },
]

function HistoryRightPanel({
  totalProjects,
  totalSifs,
  approvedCount,
  draftCount,
  missingVerifier,
  missingApprover,
  snapshotCount,
  sifsWithSnapshots,
  revisionMissingMeta,
  statusFilter,
  authorFilter,
  authorOptions,
  setStatusFilter,
  setAuthorFilter,
  onResetScope,
}: {
  totalProjects: number
  totalSifs: number
  approvedCount: number
  draftCount: number
  missingVerifier: number
  missingApprover: number
  snapshotCount: number
  sifsWithSnapshots: number
  revisionMissingMeta: number
  statusFilter: 'all' | SIFStatus
  authorFilter: string
  authorOptions: string[]
  setStatusFilter: (next: 'all' | SIFStatus) => void
  setAuthorFilter: (next: string) => void
  onResetScope: () => void
}) {
  const [activeTab, setActiveTab] = useState<'insights' | 'gates' | 'scope'>('insights')
  const activeIdx = HISTORY_RIGHT_TABS.findIndex(t => t.id === activeTab)
  const approvalRate = totalSifs > 0 ? (approvedCount / totalSifs) * 100 : 0

  return (
    <div className="flex h-full flex-col overflow-hidden border-l" style={{ borderColor: BORDER, background: PANEL_BG }}>
      <div className="px-3 pt-3 shrink-0">
        <IntercalaireTabBar
          tabs={HISTORY_RIGHT_TABS}
          active={activeTab}
          onSelect={setActiveTab}
          cardBg="#23292F"
          labelSize="sm"
        />
      </div>

      <div className="px-3 pb-3 flex-1 overflow-y-auto">
        <IntercalaireCard tabCount={HISTORY_RIGHT_TABS.length} activeIdx={activeIdx} className="p-3 space-y-3">
          {activeTab === 'insights' && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Historique Global</p>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded border px-2 py-1.5" style={{ borderColor: BORDER, background: '#1D232A' }}>
                  <p style={{ color: TEXT_DIM }}>Projets (scope)</p>
                  <p className="font-bold" style={{ color: TEXT }}>{totalProjects}</p>
                </div>
                <div className="rounded border px-2 py-1.5" style={{ borderColor: BORDER, background: '#1D232A' }}>
                  <p style={{ color: TEXT_DIM }}>SIFs (scope)</p>
                  <p className="font-bold" style={{ color: TEXT }}>{totalSifs}</p>
                </div>
                <div className="rounded border px-2 py-1.5" style={{ borderColor: BORDER, background: '#1D232A' }}>
                  <p style={{ color: TEXT_DIM }}>Snapshots chargés</p>
                  <p className="font-bold" style={{ color: TEAL_DIM }}>{snapshotCount}</p>
                </div>
                <div className="rounded border px-2 py-1.5" style={{ borderColor: BORDER, background: '#1D232A' }}>
                  <p style={{ color: TEXT_DIM }}>SIF avec snapshots</p>
                  <p className="font-bold" style={{ color: TEXT }}>{sifsWithSnapshots}</p>
                </div>
              </div>
              <div className="rounded-lg border px-2.5 py-2 text-[11px]" style={{ borderColor: BORDER, background: '#1D232A' }}>
                <p style={{ color: TEXT_DIM }}>Taux de SIF approuvées</p>
                <p className="font-bold" style={{ color: approvalRate >= 70 ? '#4ADE80' : '#F59E0B' }}>
                  {approvalRate.toFixed(1)}%
                </p>
              </div>
            </>
          )}

          {activeTab === 'gates' && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Quality Gates</p>
              <div className="space-y-2 text-[11px]">
                <div className="rounded border px-2.5 py-2" style={{ borderColor: BORDER, background: '#1D232A' }}>
                  <p style={{ color: TEXT_DIM }}>SIF sans vérificateur</p>
                  <p className="font-bold" style={{ color: missingVerifier > 0 ? '#F59E0B' : '#4ADE80' }}>{missingVerifier}</p>
                </div>
                <div className="rounded border px-2.5 py-2" style={{ borderColor: BORDER, background: '#1D232A' }}>
                  <p style={{ color: TEXT_DIM }}>SIF sans approbateur</p>
                  <p className="font-bold" style={{ color: missingApprover > 0 ? '#F59E0B' : '#4ADE80' }}>{missingApprover}</p>
                </div>
                <div className="rounded border px-2.5 py-2" style={{ borderColor: BORDER, background: '#1D232A' }}>
                  <p style={{ color: TEXT_DIM }}>Révisions sans métadonnées</p>
                  <p className="font-bold" style={{ color: revisionMissingMeta > 0 ? '#F87171' : '#4ADE80' }}>{revisionMissingMeta}</p>
                </div>
                <div className="rounded border px-2.5 py-2" style={{ borderColor: BORDER, background: '#1D232A' }}>
                  <p style={{ color: TEXT_DIM }}>SIF en brouillon</p>
                  <p className="font-bold" style={{ color: draftCount > 0 ? '#60A5FA' : '#4ADE80' }}>{draftCount}</p>
                </div>
              </div>
            </>
          )}

          {activeTab === 'scope' && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Filtres Avancés</p>
              <div className="space-y-2">
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: TEXT_DIM }}>Statut SIF</p>
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as 'all' | SIFStatus)}
                    className="h-8 w-full rounded-lg border bg-[#1D232A] px-2 text-xs outline-none"
                    style={{ borderColor: BORDER, color: TEXT }}
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="draft">Draft</option>
                    <option value="in_review">In Review</option>
                    <option value="verified">Verified</option>
                    <option value="approved">Approved</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: TEXT_DIM }}>Rédacteur</p>
                  <select
                    value={authorFilter}
                    onChange={e => setAuthorFilter(e.target.value)}
                    className="h-8 w-full rounded-lg border bg-[#1D232A] px-2 text-xs outline-none"
                    style={{ borderColor: BORDER, color: TEXT }}
                  >
                    <option value="all">Tous les auteurs</option>
                    {authorOptions.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={onResetScope}
                  className="w-full rounded-lg px-3 py-2 text-xs font-bold border"
                  style={{ borderColor: BORDER, color: TEXT, background: '#1D232A' }}
                >
                  Réinitialiser les filtres
                </button>
              </div>
            </>
          )}
        </IntercalaireCard>
      </div>
    </div>
  )
}

// ─── Main workspace ───────────────────────────────────────────────────────
export function SIFHistoryWorkspace() {
  const projects       = useAppStore(s => s.projects)
  const navigate       = useAppStore(s => s.navigate)
  const createRevision = useAppStore(s => s.createRevision)
  const revisionsBySif = useAppStore(s => s.revisions)
  const { setRightPanelOverride } = useLayout()

  const [search,        setSearch]      = useState('')
  const [statusFilter,  setStatusFilter] = useState<'all' | SIFStatus>('all')
  const [authorFilter,  setAuthorFilter] = useState<string>('all')
  const [expandedSIFs,  setExpanded]    = useState<Set<string>>(new Set())
  const [newRevTarget,  setNewRevTarget] = useState<{ projectId: string; sif: SIF } | null>(null)
  const [compareTarget, setCompareTarget] = useState<{ older: SIFRevision; newer: SIFRevision } | null>(null)

  const handleNavigate = (projectId: string, sifId: string, tab: SIFTab) =>
    navigate({ type: 'sif-dashboard', projectId, sifId, tab })

  const handleToggleSIF = (sifId: string) =>
    setExpanded(prev => { const n = new Set(prev); n.has(sifId) ? n.delete(sifId) : n.add(sifId); return n })

  const handleCreateRevision = async (revisionLabel: string, changeDescription: string, createdBy: string) => {
    if (!newRevTarget) return
    await createRevision(newRevTarget.projectId, newRevTarget.sif.id, { revisionLabel, changeDescription, createdBy })
    setExpanded(prev => new Set([...prev, newRevTarget.sif.id]))
  }

  const authorOptions = useMemo(() => {
    const set = new Set<string>()
    projects.forEach(p => p.sifs.forEach(s => { if (s.madeBy?.trim()) set.add(s.madeBy.trim()) }))
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'))
  }, [projects])

  const filtered = useMemo<Project[]>(() => {
    const q = search.trim().toLowerCase()
    return projects
      .map(p => ({ ...p, sifs: p.sifs.filter(s =>
        (statusFilter === 'all' || s.status === statusFilter) &&
        (authorFilter === 'all' || (s.madeBy ?? '').trim() === authorFilter) &&
        (
          !q ||
          s.sifNumber.toLowerCase().includes(q) ||
          (s.title ?? '').toLowerCase().includes(q) ||
          (s.processTag ?? '').toLowerCase().includes(q)
        )
      )}))
      .filter(p => p.sifs.length > 0)
  }, [projects, search, statusFilter, authorFilter])

  const totalSIFs = filtered.reduce((acc, p) => acc + p.sifs.length, 0)
  const approvedCount = filtered.reduce((acc, p) => acc + p.sifs.filter(s => s.status === 'approved').length, 0)
  const draftCount = filtered.reduce((acc, p) => acc + p.sifs.filter(s => s.status === 'draft').length, 0)
  const missingVerifier = filtered.reduce((acc, p) => acc + p.sifs.filter(s => !s.verifiedBy?.trim()).length, 0)
  const missingApprover = filtered.reduce((acc, p) => acc + p.sifs.filter(s => !s.approvedBy?.trim()).length, 0)
  const snapshotCount = useMemo(
    () => Object.values(revisionsBySif).reduce((acc, revs) => acc + revs.length, 0),
    [revisionsBySif],
  )
  const sifsWithSnapshots = useMemo(
    () => Object.values(revisionsBySif).filter(revs => revs.length > 0).length,
    [revisionsBySif],
  )
  const revisionMissingMeta = useMemo(
    () =>
      Object.values(revisionsBySif)
        .flat()
        .filter(r => !r.createdBy?.trim() || !r.changeDescription?.trim()).length,
    [revisionsBySif],
  )

  const resetScopeFilters = () => {
    setStatusFilter('all')
    setAuthorFilter('all')
  }

  useEffect(() => {
    setRightPanelOverride(
      <HistoryRightPanel
        totalProjects={filtered.length}
        totalSifs={totalSIFs}
        approvedCount={approvedCount}
        draftCount={draftCount}
        missingVerifier={missingVerifier}
        missingApprover={missingApprover}
        snapshotCount={snapshotCount}
        sifsWithSnapshots={sifsWithSnapshots}
        revisionMissingMeta={revisionMissingMeta}
        statusFilter={statusFilter}
        authorFilter={authorFilter}
        authorOptions={authorOptions}
        setStatusFilter={setStatusFilter}
        setAuthorFilter={setAuthorFilter}
        onResetScope={resetScopeFilters}
      />,
    )
    return () => setRightPanelOverride(null)
  }, [
    approvedCount,
    authorFilter,
    authorOptions,
    draftCount,
    filtered.length,
    missingApprover,
    missingVerifier,
    revisionMissingMeta,
    setRightPanelOverride,
    sifsWithSnapshots,
    snapshotCount,
    statusFilter,
    totalSIFs,
  ])

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden" style={{ background: PAGE_BG }}>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: BORDER, background: PANEL_BG }}>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${TEAL}20`, border: `1px solid ${TEAL}30` }}>
            <GitBranch size={15} style={{ color: TEAL }} />
          </div>
          <div>
            <h1 className="text-sm font-black" style={{ color: TEXT }}>Historique des révisions SIF</h1>
            <p className="text-[10px]" style={{ color: TEXT_DIM }}>
              {totalSIFs} SIF{totalSIFs !== 1 ? 's' : ''} · {filtered.length} projet{filtered.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border px-3 h-8" style={{ borderColor: BORDER, background: CARD_BG, width: 280 }}>
          <Search size={13} style={{ color: TEXT_DIM, flexShrink: 0 }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher SIF, titre, tag…"
            className="flex-1 bg-transparent text-xs outline-none" style={{ color: TEXT }} />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto min-h-0">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-24">
            <FileText size={32} style={{ color: TEXT_DIM, opacity: 0.3 }} />
            <p className="text-sm font-semibold" style={{ color: TEXT_DIM }}>
              {(search || statusFilter !== 'all' || authorFilter !== 'all')
                ? 'Aucun résultat pour ces filtres'
                : 'Aucune SIF dans ce projet'}
            </p>
          </div>
        ) : (
          <div className="mx-6 my-4 space-y-2">
            <div>
              {filtered.map(project => (
                <ProjectSection key={project.id} project={project}
                  expandedSIFs={expandedSIFs}
                  onToggleSIF={handleToggleSIF}
                  onNavigate={handleNavigate}
                  onNewRevision={(pid, sif) => setNewRevTarget({ projectId: pid, sif })}
                  onCompare={(older, newer) => setCompareTarget({ older, newer })}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {newRevTarget && (
        <NewRevisionModal
          sif={newRevTarget.sif}
          onClose={() => setNewRevTarget(null)}
          onConfirm={handleCreateRevision}
        />
      )}
      {compareTarget && (
        <SIFRevisionCompare
          older={compareTarget.older}
          newer={compareTarget.newer}
          onClose={() => setCompareTarget(null)}
        />
      )}
    </div>
  )
}
