import { Plus, FolderOpen, Layers, Table2, Upload, Save, Pencil, CalendarDays, FileText, Users, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useAppStore } from '@/store/appStore'
import { SILBadge } from '@/components/shared/SILBadge'
import { calcSIF, formatPFD, formatRRF } from '@/core/math/pfdCalc'
import { ProjectModal } from './ProjectModal'
import type { HAZOPTrace, Project, SILLevel } from '@/core/types'
import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type RowDraft = {
  sifId: string
  sifNumber: string
  sifTitle: string
  hazopNode: string
  scenarioId: string
  initiatingEvent: string
  lopaRef: string
  iplList: string
  riskMatrix: string
  tmel: number
  hazopDate: string
}

type CsvMapping = {
  sifKey: string
  hazopNode: string
  scenarioId: string
  initiatingEvent: string
  lopaRef: string
  iplList: string
  riskMatrix: string
  tmel: string
  hazopDate: string
}

const emptyMapping: CsvMapping = {
  sifKey: '', hazopNode: '', scenarioId: '', initiatingEvent: '', lopaRef: '', iplList: '', riskMatrix: '', tmel: '', hazopDate: '',
}

function parseCsv(content: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = content.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  if (!lines.length) return { headers: [], rows: [] }
  const delimiter = lines[0].includes(';') ? ';' : ','
  const split = (line: string) => line.split(delimiter).map(x => x.trim().replace(/^"|"$/g, ''))
  const headers = split(lines[0])
  const rows = lines.slice(1).map(line => {
    const cols = split(line)
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = cols[idx] ?? '' })
    return row
  })
  return { headers, rows }
}

function toDraft(project: Project): RowDraft[] {
  return project.sifs.map(sif => ({
    sifId: sif.id,
    sifNumber: sif.sifNumber,
    sifTitle: sif.title,
    hazopNode: sif.hazopTrace?.hazopNode ?? '',
    scenarioId: sif.hazopTrace?.scenarioId ?? '',
    initiatingEvent: sif.hazopTrace?.initiatingEvent ?? '',
    lopaRef: sif.hazopTrace?.lopaRef ?? '',
    iplList: sif.hazopTrace?.iplList ?? '',
    riskMatrix: sif.hazopTrace?.riskMatrix ?? '',
    tmel: sif.hazopTrace?.tmel ?? 0.001,
    hazopDate: sif.hazopTrace?.hazopDate ?? '',
  }))
}

function ProjectHazopDialog({
  project,
  open,
  onOpenChange,
}: {
  project: Project
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const updateHAZOPTrace = useAppStore(s => s.updateHAZOPTrace)
  const [editing, setEditing] = useState(false)
  const [rows, setRows] = useState<RowDraft[]>(() => toDraft(project))
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<CsvMapping>(emptyMapping)
  const fileRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (open) {
      setRows(toDraft(project))
      setCsvHeaders([])
      setCsvRows([])
      setMapping(emptyMapping)
      setEditing(false)
    }
  }, [open, project])

  const updateRow = (sifId: string, patch: Partial<RowDraft>) => {
    setRows(prev => prev.map(row => row.sifId === sifId ? { ...row, ...patch } : row))
  }

  const save = () => {
    rows.forEach(row => {
      const trace: HAZOPTrace = {
        hazopNode: row.hazopNode,
        scenarioId: row.scenarioId,
        deviationCause: '',
        initiatingEvent: row.initiatingEvent,
        lopaRef: row.lopaRef,
        tmel: row.tmel,
        iplList: row.iplList,
        riskMatrix: row.riskMatrix,
        hazopDate: row.hazopDate,
        lopaDate: '',
        hazopFacilitator: '',
      }
      updateHAZOPTrace(project.id, row.sifId, trace)
    })
    setEditing(false)
  }

  const onImportFile = async (file?: File) => {
    if (!file) return
    const text = await file.text()
    const parsed = parseCsv(text)
    setCsvHeaders(parsed.headers)
    setCsvRows(parsed.rows)
    setMapping(prev => ({ ...prev, sifKey: parsed.headers.find(h => /sif|tag|id/i.test(h)) ?? '' }))
  }

  const applyImport = () => {
    if (!csvRows.length || !mapping.sifKey) return
    const byKey = new Map(csvRows.map(row => [row[mapping.sifKey]?.toLowerCase().trim(), row]))
    setRows(prev => prev.map(row => {
      const hit = byKey.get(row.sifNumber.toLowerCase()) ?? byKey.get(row.sifTitle.toLowerCase())
      if (!hit) return row
      return {
        ...row,
        hazopNode: mapping.hazopNode ? hit[mapping.hazopNode] ?? row.hazopNode : row.hazopNode,
        scenarioId: mapping.scenarioId ? hit[mapping.scenarioId] ?? row.scenarioId : row.scenarioId,
        initiatingEvent: mapping.initiatingEvent ? hit[mapping.initiatingEvent] ?? row.initiatingEvent : row.initiatingEvent,
        lopaRef: mapping.lopaRef ? hit[mapping.lopaRef] ?? row.lopaRef : row.lopaRef,
        iplList: mapping.iplList ? hit[mapping.iplList] ?? row.iplList : row.iplList,
        riskMatrix: mapping.riskMatrix ? hit[mapping.riskMatrix] ?? row.riskMatrix : row.riskMatrix,
        tmel: mapping.tmel ? Number(hit[mapping.tmel] ?? row.tmel) || row.tmel : row.tmel,
        hazopDate: mapping.hazopDate ? hit[mapping.hazopDate] ?? row.hazopDate : row.hazopDate,
      }
    }))
    setEditing(true)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-base">HAZOP / LOPA Register — {project.ref || project.name}</DialogTitle>
          <p className="text-xs text-muted-foreground">Editable register + CSV import with column mapping.</p>
          <div className="flex items-center gap-2 pt-2">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditing(v => !v)}>
              <Pencil size={12} className="mr-1" /> {editing ? 'Preview mode' : 'Edit mode'}
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => fileRef.current?.click()}>
              <Upload size={12} className="mr-1" /> Import CSV
            </Button>
            <Button size="sm" className="h-7 text-xs" onClick={save}>
              <Save size={12} className="mr-1" /> Save HAZOP
            </Button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={e => onImportFile(e.target.files?.[0])} />
          </div>
        </DialogHeader>

        {csvHeaders.length > 0 && (
          <div className="px-6 py-3 border-b bg-muted/20">
            <p className="text-xs font-semibold mb-2">CSV column mapping</p>
            <div className="grid grid-cols-5 gap-2">
              {([
                ['sifKey', 'SIF key'], ['hazopNode', 'Node'], ['scenarioId', 'Scenario'], ['initiatingEvent', 'Initiating'], ['lopaRef', 'LOPA'],
                ['iplList', 'IPLs'], ['riskMatrix', 'Risk'], ['tmel', 'TMEL'], ['hazopDate', 'Date'],
              ] as const).map(([key, label]) => (
                <div key={key} className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
                  <Select value={mapping[key]} onValueChange={v => setMapping(prev => ({ ...prev, [key]: v }))}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{csvHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <Button size="sm" className="h-7 text-xs mt-2" onClick={applyImport}>Apply import</Button>
          </div>
        )}

        <div className="overflow-auto max-h-[68vh] px-6 pb-6">
          <table className="w-full text-xs border-separate border-spacing-0 mt-4">
            <thead className="sticky top-0 bg-[#003D5C] z-10">
              <tr>
                {['SIF', 'Node', 'Scenario', 'Initiating event', 'LOPA ref', 'IPLs', 'Risk', 'TMEL', 'Date'].map(h => (
                  <th key={h} className="text-left px-3 py-2 border-b border-[#002A42] text-[10px] uppercase tracking-wider text-white/80 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.sifId} className={cn('odd:bg-muted/10', idx % 2 === 0 && 'bg-muted/5')}>
                  <td className="px-3 py-2 align-top">
                    <p className="font-semibold">{row.sifNumber}</p>
                    <p className="text-muted-foreground">{row.sifTitle}</p>
                  </td>
                  {editing ? (
                    <>
                      <td className="px-2 py-1"><Input className="h-7 text-xs" value={row.hazopNode} onChange={e => updateRow(row.sifId, { hazopNode: e.target.value })} /></td>
                      <td className="px-2 py-1"><Input className="h-7 text-xs font-mono" value={row.scenarioId} onChange={e => updateRow(row.sifId, { scenarioId: e.target.value })} /></td>
                      <td className="px-2 py-1"><Input className="h-7 text-xs" value={row.initiatingEvent} onChange={e => updateRow(row.sifId, { initiatingEvent: e.target.value })} /></td>
                      <td className="px-2 py-1"><Input className="h-7 text-xs font-mono" value={row.lopaRef} onChange={e => updateRow(row.sifId, { lopaRef: e.target.value })} /></td>
                      <td className="px-2 py-1"><Input className="h-7 text-xs" value={row.iplList} onChange={e => updateRow(row.sifId, { iplList: e.target.value })} /></td>
                      <td className="px-2 py-1"><Input className="h-7 text-xs font-mono" value={row.riskMatrix} onChange={e => updateRow(row.sifId, { riskMatrix: e.target.value })} /></td>
                      <td className="px-2 py-1"><Input type="number" step="0.0001" className="h-7 text-xs font-mono" value={row.tmel} onChange={e => updateRow(row.sifId, { tmel: Number(e.target.value) || 0 })} /></td>
                      <td className="px-2 py-1"><Input className="h-7 text-xs font-mono" value={row.hazopDate} onChange={e => updateRow(row.sifId, { hazopDate: e.target.value })} /></td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2">{row.hazopNode || '—'}</td>
                      <td className="px-3 py-2 font-mono">{row.scenarioId || '—'}</td>
                      <td className="px-3 py-2">{row.initiatingEvent || '—'}</td>
                      <td className="px-3 py-2 font-mono">{row.lopaRef || '—'}</td>
                      <td className="px-3 py-2">{row.iplList || '—'}</td>
                      <td className="px-3 py-2 font-mono">{row.riskMatrix || '—'}</td>
                      <td className="px-3 py-2 font-mono">{row.tmel.toExponential(2)} /yr</td>
                      <td className="px-3 py-2 font-mono">{row.hazopDate || '—'}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500',
  completed: 'bg-blue-500',
  archived: 'bg-gray-400',
}

function ProjectCard({ project }: { project: Project }) {
  const navigate       = useAppStore(s => s.navigate)
  const [isHazopOpen, setHazopOpen] = useState(false)
  const hazopCount = project.sifs.filter(sif => sif.hazopTrace).length

  const { totalPFD, worstSIL } = useMemo(() => {
    if (project.sifs.length === 0) return { totalPFD: null, worstSIL: null }
    const results = project.sifs.map(sif => calcSIF(sif))
    const silLevels = results.map(r => r.SIL)
    const worst = silLevels.reduce<SILLevel>((min, sil) => (sil < min ? sil : min), 4)
    return {
      totalPFD: results[0]?.PFD_avg ?? null,
      worstSIL: worst,
    }
  }, [project])

  return (
    <>
      <div
        onClick={() => navigate({ type: 'sif-list', projectId: project.id })}
        className="group relative rounded-3xl border border-[#E5E7EB] bg-white p-6 cursor-pointer transition-all hover:shadow-[0_12px_32px_rgba(2,42,66,0.08)] hover:-translate-y-0.5"
      >
        <span className={cn('absolute top-4 right-4 w-2 h-2 rounded-full', STATUS_COLORS[project.status])} />

        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#E6F5F6] text-[#003D5C] flex items-center justify-center">
              <Briefcase size={16} />
            </div>
            <div className="min-w-0">
              <h3 className="text-[30px] sm:text-[32px] font-semibold leading-tight truncate text-[#003D5C]">{project.name}</h3>
              <p className="text-xs text-[#8A94A6] font-mono mt-1">{project.ref}</p>
            </div>
          </div>
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#003D5C] text-white font-semibold">Chef de Projet</span>
        </div>

        {totalPFD !== null ? (
          <div className="bg-[#F8FAFC] rounded-xl px-3 py-2.5 mb-3">
            <p className="text-[10px] text-[#8A94A6] uppercase tracking-wider mb-1">PFD avg</p>
            <p className="text-lg font-bold font-mono leading-none text-[#003D5C]">{formatPFD(totalPFD)}</p>
            <p className="text-[11px] text-[#8A94A6] font-mono mt-0.5">RRF = {formatRRF(1 / totalPFD)}</p>
          </div>
        ) : (
          <div className="bg-muted/50 rounded-lg px-3 py-2.5 mb-3 text-xs text-muted-foreground">No SIFs yet</div>
        )}

        <p className="text-sm text-[#58657A] mb-4">{project.description || `${project.client || 'Projet'} ${project.site || ''}`}</p>

        <div className="grid grid-cols-3 gap-3 text-[#8A94A6] text-xs mb-4">
          <div className="flex items-center gap-1.5"><FileText size={13} /> {project.sifs.length * 6} documents</div>
          <div className="flex items-center gap-1.5"><Users size={13} /> {Math.max(1, Math.min(5, project.sifs.length))} membres</div>
          <div className="flex items-center gap-1.5 justify-end"><CalendarDays size={13} /> {new Date(project.updatedAt).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'})}</div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Layers size={11} />
            {project.sifs.length} SIF{project.sifs.length !== 1 ? 's' : ''}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" className="h-8 px-3 text-[11px] bg-[#003D5C] hover:bg-[#002A42] text-white" onClick={(e) => { e.stopPropagation(); setHazopOpen(true) }}>
              <Table2 size={12} className="mr-1" /> Registre ({hazopCount})
            </Button>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl opacity-60" style={{ background: `linear-gradient(90deg, ${worstSIL ? '#2563EB' : '#6B7280'}, transparent)` }} />
      </div>
      <ProjectHazopDialog project={project} open={isHazopOpen} onOpenChange={setHazopOpen} />
    </>
  )
}

export function ProjectsPage() {
  const projects       = useAppStore(s => s.projects)
  const openNewProject = useAppStore(s => s.openNewProject)
  const createProject = useAppStore(s => s.createProject)
  const createSIF = useAppStore(s => s.createSIF)
  const updateHAZOPTrace = useAppStore(s => s.updateHAZOPTrace)


  const seedDemoProjects = () => {
    if (projects.length > 0) return
    const demo = [
      { name: 'Modernisation Unité 12', ref: 'HTL001', client: 'Artelia Le Havre', site: 'Le Havre', unit: 'U12' },
      { name: 'Audit Sécurité Process', ref: 'RKL042', client: 'Audit Sécurité Rouen', site: 'Rouen', unit: 'A1' },
      { name: 'Revamping F&G Réseau', ref: 'FG-118', client: 'TotalEnergies', site: 'Normandie', unit: 'F&G' },
      { name: 'Upgrade SIS Distillation', ref: 'SIS-507', client: 'Arkema', site: 'Marseille', unit: 'DST-3' },
    ]

    demo.forEach((item, index) => {
      const project = createProject({
        name: item.name,
        ref: item.ref,
        client: item.client,
        site: item.site,
        unit: item.unit,
        standard: 'IEC61511',
        revision: 'A',
        description: `Projet ${item.name} — ${item.client}`,
        status: index === 1 ? 'completed' : 'active',
      })

      const sif = createSIF(project.id, {
        title: 'High pressure trip',
        status: index % 2 === 0 ? 'verified' : 'draft',
        targetSIL: 2,
        demandRate: 0.1,
        madeBy: 'Y. Dumont',
        verifiedBy: 'P. Michel',
        approvedBy: 'M. Lead',
      })

      updateHAZOPTrace(project.id, sif.id, {
        hazopNode: `Node ${index + 3} — ${item.unit}`,
        scenarioId: `SC-00${index + 1}`,
        deviationCause: 'High pressure deviation',
        initiatingEvent: 'Control valve fails open',
        lopaRef: `LOPA-${index + 1}`,
        tmel: 0.001,
        iplList: 'BPCS, PSV-101',
        riskMatrix: '4C',
        hazopDate: '2026-02-10',
        lopaDate: '2026-02-11',
        hazopFacilitator: 'Y. Dumont',
      })
    })
  }

  const stats = useMemo(() => ({
    total: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    verified: projects.filter(p => p.sifs.some(s => s.status === 'verified' || s.status === 'approved')).length,
    sifs: projects.reduce((n, p) => n + p.sifs.length, 0),
  }), [projects])

  return (
    <div className="flex flex-col min-h-[calc(100vh-56px)] bg-[#F7F8FA]">
      <div className="max-w-6xl w-full mx-auto px-6 py-10 flex-1">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Projects</p>
            <h1 className="text-5xl font-bold tracking-tight text-[#003D5C]">Mes projets</h1>
            <p className="text-[#8A94A6] mt-2 text-xl">{stats.active} projets actifs</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="h-11 rounded-2xl border-[#D8DEE8] text-[#003D5C] bg-white">
              <Table2 size={15} className="mr-2" /> Registre
              <span className="ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#E6F5F6] text-[#009BA4] text-xs font-bold">{projects.length}</span>
            </Button>
            <Button variant="outline" onClick={seedDemoProjects} className="h-11 rounded-2xl border-[#D8DEE8] text-[#003D5C] bg-white">Voir avec 4 projets</Button>
            <Button onClick={openNewProject} className="h-11 rounded-2xl bg-[#003D5C] hover:bg-[#002A42] text-white gap-2"><Plus size={15} />Nouveau projet</Button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Projects', value: stats.total },
            { label: 'Active', value: stats.active },
            { label: 'With verified SIF', value: stats.verified },
            { label: 'Total SIFs', value: stats.sifs },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-2xl border border-[#E5E7EB] bg-white px-5 py-4">
              <p className="text-[11px] font-medium text-[#8A94A6] uppercase tracking-wider mb-1">{label}</p>
              <p className="text-2xl font-bold font-mono text-[#003D5C]">{value}</p>
            </div>
          ))}
        </div>

        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4"><FolderOpen size={28} className="text-muted-foreground" /></div>
            <h3 className="text-base font-semibold mb-1">No projects yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create your first project to start verifying SIFs.</p>
            <div className="flex gap-2">
              <Button onClick={seedDemoProjects} variant="outline" className="gap-2">Voir avec 4 projets</Button>
              <Button onClick={openNewProject} variant="outline" className="gap-2"><Plus size={14} />Create project</Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{projects.map(p => <ProjectCard key={p.id} project={p} />)}</div>
        )}
      </div>
      <ProjectModal />
    </div>
  )
}