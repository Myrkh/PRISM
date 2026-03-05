// ═══════════════════════════════════════════════════════════════════════════
// PRISM — SIFListPage  (DA KORE)
// Registre SIF conforme DA KORE : table blanche sur #F0F4F8
// Header gradient navy · ligne expandable · signatures R/V/A · tri/filtres
// ═══════════════════════════════════════════════════════════════════════════

import { useMemo, useState } from 'react'
import {
  Plus, ArrowLeft, FileText, CheckCircle2, Pencil, Trash2,
  ChevronDown, ChevronRight, Search, ArrowUpDown, ArrowUp,
  ArrowDown, Shield, BarChart3, Activity, AlertTriangle,
} from 'lucide-react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useAppStore } from '@/store/appStore'
import { calcSIF, formatPFD, formatRRF } from '@/core/math/pfdCalc'
import { SIFModal } from './SIFModal'
import type { SIF, SIFStatus } from '@/core/types'

// ─── Tokens ───────────────────────────────────────────────────────────────
const NAVY  = '#003D5C'
const TEAL  = '#009BA4'
const BG    = '#F0F4F8'

const STATUS_CFG: Record<SIFStatus, { code: string; bg: string; color: string; border: string }> = {
  draft:     { code: 'PRE', bg: '#F3F4F6', color: '#6B7280', border: '#D1D5DB' },
  in_review: { code: 'IFR', bg: '#FEF9C3', color: '#92400E', border: '#FDE68A' },
  verified:  { code: 'IFC', bg: '#DCFCE7', color: '#15803D', border: '#86EFAC' },
  approved:  { code: 'FIN', bg: '#DBEAFE', color: '#1D4ED8', border: '#93C5FD' },
}

const SIL_COLOR: Record<number, string> = {
  0: '#6B7280', 1: '#16A34A', 2: '#2563EB', 3: '#D97706', 4: '#7C3AED',
}

// ─── Signature pill ───────────────────────────────────────────────────────
function SigPill({ role, name }: { role: 'R' | 'V' | 'A'; name?: string }) {
  const signed = !!(name?.trim())
  return (
    <span className={[
      'inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border',
      signed
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-gray-50 text-gray-300 border-gray-200',
    ].join(' ')}>
      {signed ? <CheckCircle2 size={8} /> : <Pencil size={8} className="opacity-30" />}
      {role}
    </span>
  )
}

// ─── Sort header cell ──────────────────────────────────────────────────────
function Th({ children, col, sortCol, sortDir, onSort, right, className = '' }: {
  children: React.ReactNode; col?: string; sortCol?: string; sortDir?: string
  onSort?: (c: string) => void; right?: boolean; className?: string
}) {
  return (
    <th
      className={[
        'px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white/75 whitespace-nowrap select-none',
        right ? 'text-right' : 'text-left',
        col ? 'cursor-pointer hover:text-white' : '',
        className,
      ].join(' ')}
      onClick={col ? () => onSort?.(col) : undefined}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {col && (
          sortCol !== col
            ? <ArrowUpDown className="w-3 h-3 opacity-30" />
            : sortDir === 'asc'
              ? <ArrowUp className="w-3 h-3" />
              : <ArrowDown className="w-3 h-3" />
        )}
      </span>
    </th>
  )
}

// ─── Expanded row ──────────────────────────────────────────────────────────
function ExpandedRow({
  sif, projectId,
}: { sif: SIF; projectId: string }) {
  const navigate     = useAppStore(s => s.navigate)
  const openEditSIF  = useAppStore(s => s.openEditSIF)
  const deleteSIF    = useAppStore(s => s.deleteSIF)

  const sm = STATUS_CFG[sif.status] ?? STATUS_CFG.draft
  const result = calcSIF(sif)

  const infoItems = [
    { label: 'P&ID', value: sif.pid },
    { label: 'Zone / Location', value: sif.location },
    { label: 'Tag Process', value: sif.processTag },
    { label: 'Événement Dangereux', value: sif.hazardousEvent },
    { label: 'Taux de Sollicitation', value: sif.demandRate ? `${sif.demandRate} /an` : undefined },
  ].filter(x => x.value)

  return (
    <tr style={{ background: `${NAVY}03` }}>
      <td colSpan={9} className="px-4 pb-4 pt-1">
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          {/* Inner header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100"
            style={{ background: BG }}
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold" style={{ color: NAVY }}>
                {sif.sifNumber} · rév. {sif.revision}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: sm.bg, color: sm.color, border: `1px solid ${sm.border}` }}
              >{sm.code}</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate({ type: 'sif-dashboard', projectId, sifId: sif.id, tab: 'overview' })}
                className="h-7 px-3 text-xs font-semibold rounded-lg text-white flex items-center gap-1.5 transition-all"
                style={{ background: NAVY }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                <BarChart3 size={11} /> Dashboard
              </button>
              <button
                onClick={() => openEditSIF(sif.id)}
                className="h-7 px-3 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 flex items-center gap-1.5 hover:border-gray-300 transition-all"
              >
                <Pencil size={10} /> Modifier
              </button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="h-7 px-2 text-xs rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 flex items-center transition-all">
                    <Trash2 size={11} />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer ce SIF ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est irréversible. Le SIF <strong>{sif.title || sif.sifNumber}</strong> et toutes ses données seront supprimés.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteSIF(projectId, sif.id)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Supprimer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Body */}
          <div className="grid grid-cols-2 gap-0 divide-x divide-gray-100">
            {/* Left — context info */}
            <div className="p-4">
              <p className="text-[9px] font-bold uppercase tracking-widest mb-3" style={{ color: '#9CA3AF' }}>
                Contexte Process
              </p>
              {infoItems.length > 0 ? (
                <dl className="space-y-2">
                  {infoItems.map(({ label, value }) => (
                    <div key={label} className="flex justify-between gap-4">
                      <dt className="text-xs text-gray-400 shrink-0">{label}</dt>
                      <dd className="text-xs font-medium text-gray-700 text-right">{value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-xs text-gray-300 italic">Aucune information renseignée</p>
              )}
            </div>

            {/* Right — SIL metrics */}
            <div className="p-4">
              <p className="text-[9px] font-bold uppercase tracking-widest mb-3" style={{ color: '#9CA3AF' }}>
                Résultats SIL
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'PFDavg', value: formatPFD(result.PFD_avg) },
                  { label: 'RRF', value: result.RRF < 1 ? '—' : Math.round(result.RRF).toLocaleString() },
                  { label: 'SIL atteint', value: `SIL ${result.SIL}`, color: SIL_COLOR[result.SIL] },
                  { label: 'Objectif', value: `SIL ${sif.targetSIL}`, color: result.meetsTarget ? '#15803D' : '#DC2626' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-lg px-3 py-2.5" style={{ background: BG }}>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">{label}</p>
                    <p className="text-sm font-bold font-mono" style={{ color: color ?? NAVY }}>{value}</p>
                  </div>
                ))}
              </div>
              {/* Compliance badge */}
              <div className={[
                'mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold',
                result.meetsTarget ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700',
              ].join(' ')}>
                {result.meetsTarget
                  ? <CheckCircle2 size={13} />
                  : <AlertTriangle size={13} />
                }
                {result.meetsTarget
                  ? `Conforme SIL ${sif.targetSIL} ✓`
                  : `SIL ${sif.targetSIL} non atteint — action requise`
                }
              </div>
            </div>
          </div>

          {/* Signatures row */}
          <div className="flex items-center gap-6 px-4 py-3 border-t border-gray-100" style={{ background: BG }}>
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>
              Signatures
            </p>
            {[
              { role: 'R' as const, label: 'Rédacteur', name: sif.madeBy },
              { role: 'V' as const, label: 'Vérificateur', name: sif.verifiedBy },
              { role: 'A' as const, label: 'Approbateur', name: sif.approvedBy },
            ].map(({ role, label, name }) => (
              <div key={role} className="flex items-center gap-2">
                <SigPill role={role} name={name} />
                <span className="text-xs text-gray-500">{name || <span className="text-gray-300 italic">—</span>}</span>
              </div>
            ))}
            {sif.date && (
              <span className="ml-auto text-xs font-mono text-gray-400">{sif.date}</span>
            )}
          </div>
        </div>
      </td>
    </tr>
  )
}

// ─── SIF row ───────────────────────────────────────────────────────────────
function SIFRow({
  sif, projectId, sortedIdx,
  expandedId, setExpandedId,
  sortCol, sortDir, onSort,
}: {
  sif: SIF; projectId: string; sortedIdx: number
  expandedId: string | null; setExpandedId: (id: string | null) => void
  sortCol: string; sortDir: string; onSort: (c: string) => void
}) {
  const navigate    = useAppStore(s => s.navigate)
  const isExpanded  = expandedId === sif.id
  const sm          = STATUS_CFG[sif.status] ?? STATUS_CFG.draft
  const result      = useMemo(() => calcSIF(sif), [sif])
  const silColor    = SIL_COLOR[result.SIL] ?? '#6B7280'

  return (
    <>
      <tr
        className="border-b border-gray-100 hover:bg-blue-50/20 transition-colors group"
        style={{ background: isExpanded ? `${NAVY}03` : undefined }}
      >
        {/* Expand toggle */}
        <td className="w-10 pl-3 pr-1 py-3.5">
          <button
            onClick={() => setExpandedId(isExpanded ? null : sif.id)}
            className="w-6 h-6 flex items-center justify-center rounded transition-all text-gray-400 hover:text-gray-600"
          >
            {isExpanded
              ? <ChevronDown size={13} />
              : <ChevronRight size={13} />
            }
          </button>
        </td>

        {/* SIF number */}
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate({ type: 'sif-dashboard', projectId, sifId: sif.id, tab: 'overview' })}
              className="font-mono font-bold text-xs transition-colors hover:underline"
              style={{ color: NAVY }}
            >
              {sif.sifNumber}
            </button>
            <span className="text-[9px] font-bold text-gray-400">rév.{sif.revision}</span>
          </div>
        </td>

        {/* Title */}
        <td className="px-4 py-3.5 max-w-[220px]">
          <p className="text-xs font-semibold text-gray-800 truncate">{sif.title || '—'}</p>
          {sif.pid && (
            <p className="text-[10px] text-gray-400 font-mono truncate mt-0.5">{sif.pid}</p>
          )}
        </td>

        {/* Status */}
        <td className="px-4 py-3.5">
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded"
            style={{ background: sm.bg, color: sm.color, border: `1px solid ${sm.border}` }}
          >
            {sm.code}
          </span>
        </td>

        {/* SIL */}
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-1.5">
            <span
              className="text-xs font-bold font-mono px-2 py-0.5 rounded-full"
              style={{ background: `${silColor}15`, color: silColor }}
            >
              SIL {result.SIL}
            </span>
            {!result.meetsTarget && (
              <AlertTriangle size={11} className="text-amber-500 shrink-0" />
            )}
          </div>
        </td>

        {/* PFDavg */}
        <td className="px-4 py-3.5 font-mono text-xs font-semibold" style={{ color: NAVY }}>
          {formatPFD(result.PFD_avg)}
        </td>

        {/* Signatures */}
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-1">
            <SigPill role="R" name={sif.madeBy} />
            <SigPill role="V" name={sif.verifiedBy} />
            <SigPill role="A" name={sif.approvedBy} />
          </div>
        </td>

        {/* Date */}
        <td className="px-4 py-3.5 font-mono text-[10px] text-gray-400">
          {sif.date || '—'}
        </td>

        {/* Actions */}
        <td className="px-4 py-3.5 text-right">
          <button
            onClick={() => navigate({ type: 'sif-dashboard', projectId, sifId: sif.id, tab: 'overview' })}
            className="h-7 px-3 text-xs font-semibold rounded-lg text-white flex items-center gap-1.5 ml-auto transition-all"
            style={{ background: NAVY }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <Activity size={11} /> Ouvrir
          </button>
        </td>
      </tr>

      {isExpanded && (
        <ExpandedRow sif={sif} projectId={projectId} />
      )}
    </>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────
interface Props { projectId: string }

export function SIFListPage({ projectId }: Props) {
  const navigate    = useAppStore(s => s.navigate)
  const openNewSIF  = useAppStore(s => s.openNewSIF)
  const project     = useAppStore(s => s.projects.find(p => p.id === projectId))

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatusFilter] = useState<SIFStatus | 'all'>('all')
  const [sortCol, setSortCol]       = useState('sifNumber')
  const [sortDir, setSortDir]       = useState<'asc' | 'desc'>('asc')

  const onSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const sifs = project?.sifs ?? []

  const sorted = useMemo(() => {
    let filtered = sifs
    if (statusFilter !== 'all') filtered = filtered.filter(s => s.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      filtered = filtered.filter(s =>
        s.sifNumber.toLowerCase().includes(q) ||
        (s.title || '').toLowerCase().includes(q) ||
        (s.pid || '').toLowerCase().includes(q) ||
        (s.location || '').toLowerCase().includes(q)
      )
    }
    return [...filtered].sort((a, b) => {
      let va: string | number, vb: string | number
      if (sortCol === 'sifNumber') { va = a.sifNumber; vb = b.sifNumber }
      else if (sortCol === 'title') { va = a.title || ''; vb = b.title || '' }
      else if (sortCol === 'status') { va = a.status; vb = b.status }
      else if (sortCol === 'date') { va = a.date || ''; vb = b.date || '' }
      else { va = a.sifNumber; vb = b.sifNumber }
      return sortDir === 'asc'
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va))
    })
  }, [sifs, search, statusFilter, sortCol, sortDir])

  // Stats
  const stats = useMemo(() => {
    const results = sifs.map(s => ({ s, r: calcSIF(s) }))
    return {
      total:      sifs.length,
      verified:   sifs.filter(s => s.status === 'verified' || s.status === 'approved').length,
      compliant:  results.filter(x => x.r.meetsTarget).length,
      needsWork:  results.filter(x => !x.r.meetsTarget).length,
    }
  }, [sifs])

  if (!project) return null

  return (
    <div className="min-h-[calc(100vh-56px)]" style={{ background: BG }}>
      <div className="max-w-[1400px] mx-auto px-6 py-8">

        {/* Page header — KORE style */}
        <div className="flex items-end justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate({ type: 'projects' })}
              className="h-9 w-9 rounded-xl flex items-center justify-center border border-gray-200 bg-white text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-all"
            >
              <ArrowLeft size={15} />
            </button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: NAVY }}>
                {project.name}
              </h1>
              <p className="text-sm mt-0.5" style={{ color: '#58657A' }}>
                {project.ref && <span className="font-mono mr-2">{project.ref}</span>}
                {stats.total} SIF{stats.total !== 1 ? 's' : ''} enregistré{stats.total !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <button
            onClick={openNewSIF}
            className="h-10 rounded-xl px-5 text-sm font-semibold gap-2 shadow-sm text-white flex items-center transition-opacity hover:opacity-90"
            style={{ background: NAVY }}
          >
            <Plus size={16} /> Nouveau SIF
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'SIFs',              value: stats.total,     icon: FileText },
            { label: 'Émis (IFC/FIN)',    value: stats.verified,  icon: CheckCircle2 },
            { label: 'Conformes SIL',     value: stats.compliant, icon: Shield },
            { label: 'Action requise',    value: stats.needsWork, icon: AlertTriangle },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 px-5 py-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#8A94A6' }}>
                  {label}
                </p>
                <Icon size={14} style={{ color: '#C4C9D4' }} />
              </div>
              <p className="text-3xl font-bold font-mono" style={{ color: NAVY }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3 mb-4 flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un SIF…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-9 pl-8 pr-3 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-[#009BA4] focus:bg-white transition-all"
            />
          </div>

          {/* Status filter pills */}
          <div className="flex items-center gap-1.5">
            {(['all', 'draft', 'in_review', 'verified', 'approved'] as const).map(s => {
              const cfg = s !== 'all' ? STATUS_CFG[s] : null
              const active = statusFilter === s
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all"
                  style={active
                    ? { background: NAVY, color: 'white' }
                    : { background: '#F3F4F6', color: '#6B7280' }
                  }
                >
                  {s === 'all' ? 'Tous' : cfg?.code}
                </button>
              )
            })}
          </div>
        </div>

        {/* Table */}
        {sorted.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: `${NAVY}0D` }}>
              <FileText size={24} style={{ color: NAVY }} />
            </div>
            <h3 className="text-base font-bold mb-1" style={{ color: NAVY }}>
              {sifs.length === 0 ? 'Aucun SIF enregistré' : 'Aucun résultat'}
            </h3>
            <p className="text-sm mb-5" style={{ color: '#8A94A6' }}>
              {sifs.length === 0
                ? 'Créez votre premier SIF pour commencer la vérification SIL.'
                : 'Essayez de modifier vos filtres.'}
            </p>
            {sifs.length === 0 && (
              <button
                onClick={openNewSIF}
                className="h-10 rounded-xl px-5 text-sm font-semibold text-white flex items-center gap-2"
                style={{ background: NAVY }}
              >
                <Plus size={14} /> Créer un SIF
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full">
              <thead>
                <tr style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #005078 100%)` }}>
                  <th className="w-10 pl-3" />
                  <Th col="sifNumber" sortCol={sortCol} sortDir={sortDir} onSort={onSort}>N°</Th>
                  <Th col="title" sortCol={sortCol} sortDir={sortDir} onSort={onSort}>Titre</Th>
                  <Th col="status" sortCol={sortCol} sortDir={sortDir} onSort={onSort}>Statut</Th>
                  <Th>SIL</Th>
                  <Th>PFDavg</Th>
                  <Th>Sigs.</Th>
                  <Th col="date" sortCol={sortCol} sortDir={sortDir} onSort={onSort}>Date</Th>
                  <Th right>—</Th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {sorted.map((sif, idx) => (
                  <SIFRow
                    key={sif.id} sif={sif} projectId={projectId} sortedIdx={idx}
                    expandedId={expandedId} setExpandedId={setExpandedId}
                    sortCol={sortCol} sortDir={sortDir} onSort={onSort}
                  />
                ))}
              </tbody>
            </table>

            {/* Footer count */}
            <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between"
              style={{ background: BG }}
            >
              <p className="text-[10px] font-medium" style={{ color: '#9CA3AF' }}>
                {sorted.length} SIF{sorted.length !== 1 ? 's' : ''} affiché{sorted.length !== 1 ? 's' : ''}
                {sifs.length !== sorted.length && ` sur ${sifs.length}`}
              </p>
              <p className="text-[10px] font-mono" style={{ color: '#C4C9D4' }}>
                IEC 61511-1:2016
              </p>
            </div>
          </div>
        )}
      </div>

      <SIFModal projectId={projectId} />
    </div>
  )
}
