import { useMemo } from 'react'
import { Plus, ArrowLeft, FileText, CheckCircle2, AlertTriangle, Clock, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useAppStore } from '@/store/appStore'
import { SILBadge } from '@/components/shared/SILBadge'
import { calcSIF, formatPFD, formatRRF } from '@/core/math/pfdCalc'
import { SIFModal } from './SIFModal'
import type { SIF, SIFStatus } from '@/core/types'
import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<SIFStatus, { label: string; icon: React.ElementType; color: string }> = {
  draft:     { label: 'Draft',     icon: FileText,      color: 'text-muted-foreground' },
  in_review: { label: 'In Review', icon: Clock,         color: 'text-amber-500' },
  verified:  { label: 'Verified',  icon: CheckCircle2,  color: 'text-emerald-500' },
  approved:  { label: 'Approved',  icon: CheckCircle2,  color: 'text-blue-500' },
}

function SIFRow({ sif, projectId }: { sif: SIF; projectId: string }) {
  const navigate    = useAppStore(s => s.navigate)
  const openEdit    = useAppStore(s => s.openEditSIF)
  const deleteSIF   = useAppStore(s => s.deleteSIF)

  const result      = useMemo(() => calcSIF(sif), [sif])
  const status      = STATUS_CONFIG[sif.status]
  const StatusIcon  = status.icon
  const meetsTarget = result.SIL >= sif.targetSIL

  return (
    <div
      onClick={() => navigate({ type: 'sif-dashboard', projectId, sifId: sif.id, tab: 'overview' })}
      className="group grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-4 px-5 py-4 border-b last:border-0 cursor-pointer hover:bg-muted/40 transition-colors"
    >
      {/* SIF number */}
      <div className="min-w-[80px]">
        <p className="text-sm font-mono font-semibold">{sif.sifNumber}</p>
        <p className="text-xs text-muted-foreground">Rev. {sif.revision}</p>
      </div>

      {/* Title + meta */}
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{sif.title}</p>
        <p className="text-xs text-muted-foreground truncate">
          {[sif.location, sif.pid, sif.processTag].filter(Boolean).join(' · ') || 'No description'}
        </p>
      </div>

      {/* PFD */}
      <div className="text-right min-w-[100px]">
        <p className="text-sm font-mono font-semibold">{formatPFD(result.PFD_avg)}</p>
        <p className="text-xs text-muted-foreground font-mono">RRF {formatRRF(result.RRF)}</p>
      </div>

      {/* SIL result */}
      <div className="flex flex-col items-end gap-1 min-w-[80px]">
        <SILBadge sil={result.SIL} />
        {meetsTarget
          ? <span className="text-[10px] text-emerald-500 flex items-center gap-1"><CheckCircle2 size={10} />meets target</span>
          : <span className="text-[10px] text-red-500 flex items-center gap-1"><AlertTriangle size={10} />below SIL {sif.targetSIL}</span>
        }
      </div>

      {/* Status */}
      <div className={cn('flex items-center gap-1.5 text-xs', status.color)}>
        <StatusIcon size={13} />
        {status.label}
      </div>

      {/* Actions */}
      <div
        className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={e => e.stopPropagation()}
      >
        <Button
          variant="ghost" size="icon" className="h-7 w-7"
          onClick={() => openEdit(sif.id)}
        >
          <Pencil size={13} />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
              <Trash2 size={13} />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {sif.sifNumber}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the SIF and all its data. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={() => deleteSIF(projectId, sif.id)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

export function SIFListPage({ projectId }: { projectId: string }) {
  const navigate      = useAppStore(s => s.navigate)
  const openNewSIF    = useAppStore(s => s.openNewSIF)
  const openEditProject = useAppStore(s => s.openEditProject)
  const project       = useAppStore(s => s.projects.find(p => p.id === projectId))

  if (!project) return null

  const sifStats = useMemo(() => {
    const results = project.sifs.map(sif => ({ sif, result: calcSIF(sif) }))
    return {
      total:    results.length,
      verified: results.filter(r => r.sif.status === 'verified' || r.sif.status === 'approved').length,
      sil3Plus: results.filter(r => r.result.SIL >= 3).length,
    }
  }, [project.sifs])

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">

      {/* Back + title */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate({ type: 'projects' })} className="gap-2">
            <ArrowLeft size={14} /> Projects
          </Button>
          <div className="w-px h-5 bg-border" />
          <div>
            <h2 className="text-xl font-bold tracking-tight">{project.name}</h2>
            <p className="text-xs text-muted-foreground font-mono">{project.ref} · {project.standard}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => openEditProject(project.id)}>
            Edit project
          </Button>
          <Button size="sm" onClick={openNewSIF} className="gap-2">
            <Plus size={14} />
            New SIF
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total SIFs', value: sifStats.total },
          { label: 'Verified / Approved', value: sifStats.verified },
          { label: 'SIL 3 or higher', value: sifStats.sil3Plus },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border bg-card px-5 py-4">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
            <p className="text-2xl font-bold font-mono">{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b bg-muted/30 grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4">
          {['SIF', 'Description', 'PFD avg', 'Result', 'Status', ''].map((h, i) => (
            <span key={i} className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              {h}
            </span>
          ))}
        </div>

        {project.sifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <FileText size={32} className="mb-3 opacity-40" />
            <p className="text-sm font-medium">No SIFs yet</p>
            <p className="text-xs mt-1">Create your first Safety Instrumented Function</p>
            <Button onClick={openNewSIF} variant="outline" size="sm" className="mt-4 gap-2">
              <Plus size={13} />
              New SIF
            </Button>
          </div>
        ) : (
          project.sifs.map(sif => (
            <SIFRow key={sif.id} sif={sif} projectId={projectId} />
          ))
        )}
      </div>

      <SIFModal projectId={projectId} />
    </div>
  )
}
