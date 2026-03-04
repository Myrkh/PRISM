import { Plus, FolderOpen, Clock, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/store/appStore'
import { SILBadge } from '@/components/shared/SILBadge'
import { calcSIF, formatPFD, formatRRF } from '@/core/math/pfdCalc'
import { classifySIL } from '@/core/math/pfdCalc'
import { ProjectModal } from './ProjectModal'
import type { Project, SILLevel } from '@/core/types'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  completed: 'Completed',
  archived: 'Archived',
}
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500',
  completed: 'bg-blue-500',
  archived: 'bg-gray-400',
}

function ProjectCard({ project }: { project: Project }) {
  const navigate       = useAppStore(s => s.navigate)
  const openEditProject = useAppStore(s => s.openEditProject)

  const { totalPFD, worstSIL } = useMemo(() => {
    if (project.sifs.length === 0) return { totalPFD: null, worstSIL: null }
    const results = project.sifs.map(sif => calcSIF(sif))
    const worst   = results.reduce((min, r) => Math.min(min, r.SIL), 4 as SILLevel)
    return {
      totalPFD: results[0]?.PFD_avg ?? null,
      worstSIL: worst as SILLevel,
    }
  }, [project])

  return (
    <div
      onClick={() => navigate({ type: 'sif-list', projectId: project.id })}
      className="group relative rounded-xl border bg-card p-5 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-border/80"
    >
      {/* Status dot */}
      <span
        className={cn(
          'absolute top-4 right-4 w-2 h-2 rounded-full',
          STATUS_COLORS[project.status],
        )}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-tight truncate">{project.name}</h3>
          <p className="text-xs text-muted-foreground font-mono mt-1">
            {project.ref} · {project.site || project.client || '—'}
          </p>
        </div>
        {worstSIL !== null && <SILBadge sil={worstSIL} />}
      </div>

      {/* PFD strip */}
      {totalPFD !== null ? (
        <div className="bg-muted/50 rounded-lg px-3 py-2.5 mb-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">PFD avg</p>
          <p className="text-lg font-bold font-mono leading-none" style={{ color: worstSIL ? undefined : 'inherit' }}>
            {formatPFD(totalPFD)}
          </p>
          <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
            RRF = {formatRRF(1 / totalPFD)}
          </p>
        </div>
      ) : (
        <div className="bg-muted/50 rounded-lg px-3 py-2.5 mb-3 text-xs text-muted-foreground">
          No SIFs yet
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Layers size={11} />
          {project.sifs.length} SIF{project.sifs.length !== 1 ? 's' : ''}
        </div>
        <div className="flex items-center gap-1">
          <span className="font-mono text-[10px] border border-border rounded px-1.5 py-0.5">
            {project.standard}
          </span>
        </div>
      </div>

      {/* Bottom accent bar */}
      <div
        className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl opacity-60"
        style={{ background: `linear-gradient(90deg, ${worstSIL ? '#2563EB' : '#6B7280'}, transparent)` }}
      />
    </div>
  )
}

export function ProjectsPage() {
  const projects       = useAppStore(s => s.projects)
  const openNewProject = useAppStore(s => s.openNewProject)

  const stats = useMemo(() => ({
    total:    projects.length,
    active:   projects.filter(p => p.status === 'active').length,
    verified: projects.filter(p => p.sifs.some(s => s.status === 'verified' || s.status === 'approved')).length,
    sifs:     projects.reduce((n, p) => n + p.sifs.length, 0),
  }), [projects])

  return (
    <div className="flex flex-col min-h-[calc(100vh-56px)]">
      <div className="max-w-6xl w-full mx-auto px-6 py-10 flex-1">

        {/* Page header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">
              Projects
            </p>
            <h1 className="text-3xl font-bold tracking-tight">SIF Verification</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Manage Safety Instrumented Functions · IEC 61508 / IEC 61511 / ISA-84
            </p>
          </div>
          <Button onClick={openNewProject} className="gap-2">
            <Plus size={15} />
            New Project
          </Button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Projects', value: stats.total },
            { label: 'Active', value: stats.active },
            { label: 'With verified SIF', value: stats.verified },
            { label: 'Total SIFs', value: stats.sifs },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border bg-card px-5 py-4">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
              <p className="text-2xl font-bold font-mono">{value}</p>
            </div>
          ))}
        </div>

        {/* Project grid */}
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <FolderOpen size={28} className="text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold mb-1">No projects yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first project to start verifying SIFs.
            </p>
            <Button onClick={openNewProject} variant="outline" className="gap-2">
              <Plus size={14} />
              Create project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(p => <ProjectCard key={p.id} project={p} />)}
          </div>
        )}
      </div>

      <ProjectModal />
    </div>
  )
}
