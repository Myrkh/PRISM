import { useMemo, useState } from 'react'
import { Download, Printer, Wand2, FileBadge2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { formatPFD, formatRRF, formatPct } from '@/core/math/pfdCalc'
import type { Project, SIF, SIFCalcResult } from '@/core/types'

interface SILReportStudioProps {
  project: Project
  sif: SIF
  result: SIFCalcResult
}

type ReportTemplate = 'executive' | 'audit'

export function SILReportStudio({ project, sif, result }: SILReportStudioProps) {
  const [template, setTemplate] = useState<ReportTemplate>('executive')
  const [title, setTitle] = useState(`${sif.sifNumber} — SIL Verification Report`)
  const [docRef, setDocRef] = useState(`${project.ref || 'PRJ'}-${sif.sifNumber}-RPT`)
  const [version, setVersion] = useState(`Rev.${sif.revision}`)

  const [scope, setScope] = useState(sif.description || 'Define the operational scope, process conditions, and boundaries for this safety function.')
  const [assumptions, setAssumptions] = useState('Proof test intervals, diagnostic coverage, and failure rates are based on current engineering data and assumptions.')
  const [recommendations, setRecommendations] = useState(
    result.meetsTarget
      ? `Maintain SIL ${sif.targetSIL} by preserving test intervals and current architecture integrity.`
      : `Improve architecture and/or test strategy to reach SIL ${sif.targetSIL} target before approval.`,
  )

  const [includeAssumptions, setIncludeAssumptions] = useState(true)
  const [includeRecommendations, setIncludeRecommendations] = useState(true)
  const [includeSubsystemTable, setIncludeSubsystemTable] = useState(true)

  const [preparedBy, setPreparedBy] = useState(sif.madeBy || '')
  const [checkedBy, setCheckedBy] = useState(sif.verifiedBy || '')
  const [approvedBy, setApprovedBy] = useState(sif.approvedBy || '')

  const generatedAt = useMemo(() => new Date().toLocaleString(), [])

  const exportPdf = () => {
    const node = document.getElementById('sil-report-preview')
    if (!node) return

    const win = window.open('', '_blank', 'width=1100,height=850')
    if (!win) return

    win.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Inter, Arial, sans-serif; color: #0f172a; margin: 18mm; }
            h1 { margin: 0 0 6px 0; font-size: 24px; }
            h2 { margin: 18px 0 8px 0; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: #475569; }
            .badge { border: 1px solid #cbd5e1; border-radius: 999px; padding: 4px 10px; font-size: 11px; display:inline-block; margin-right: 6px; margin-bottom: 6px; }
            .card { border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px; margin-bottom: 10px; }
            table { border-collapse: collapse; width: 100%; font-size: 11px; }
            th, td { border: 1px solid #e2e8f0; padding: 7px; text-align: left; }
            th { background: #f8fafc; }
            .sig-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-top: 10px; }
            .sig-box { border:1px solid #cbd5e1; border-radius:8px; padding:8px; min-height:56px; }
            .muted { color: #64748b; font-size: 11px; }
            .footer { margin-top: 12px; color:#64748b; font-size:11px; display:flex; justify-content:space-between; }
            .page-break { page-break-before: always; }
            @media print { .no-print { display:none; } }
          </style>
        </head>
        <body>
          ${node.innerHTML}
          <div class="no-print" style="margin-top:12px;"><button onclick="window.print()">Print / Save as PDF</button></div>
        </body>
      </html>
    `)
    win.document.close()
    win.focus()
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.25fr] gap-5">
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold inline-flex items-center gap-2"><Wand2 className="h-4 w-4 text-primary" /> Report studio v2</h3>
          <Button variant="outline" size="sm" onClick={exportPdf} className="gap-2">
            <Download className="h-3.5 w-3.5" /> Export PDF
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5 col-span-2">
            <Label htmlFor="report-title">Report title</Label>
            <Input id="report-title" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Template</Label>
            <Select value={template} onValueChange={v => setTemplate(v as ReportTemplate)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="executive">Executive</SelectItem>
                <SelectItem value="audit">Audit</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="report-ref">Document reference</Label>
            <Input id="report-ref" value={docRef} onChange={e => setDocRef(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-version">Version</Label>
            <Input id="report-version" value={version} onChange={e => setVersion(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="report-scope">Scope</Label>
          <Textarea id="report-scope" rows={3} value={scope} onChange={e => setScope(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="report-assumptions">Assumptions</Label>
          <Textarea id="report-assumptions" rows={3} value={assumptions} onChange={e => setAssumptions(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="report-rec">Recommendations</Label>
          <Textarea id="report-rec" rows={3} value={recommendations} onChange={e => setRecommendations(e.target.value)} />
        </div>

        <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-2">
          <p className="text-xs font-semibold">Report blocks</p>
          {[
            { key: 'assumptions', label: 'Include assumptions', value: includeAssumptions, set: setIncludeAssumptions },
            { key: 'recommendations', label: 'Include recommendations', value: includeRecommendations, set: setIncludeRecommendations },
            { key: 'subsystems', label: 'Include subsystem table', value: includeSubsystemTable, set: setIncludeSubsystemTable },
          ].map(item => (
            <label key={item.key} className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={item.value} onChange={e => item.set(e.target.checked)} />
              {item.label}
            </label>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Prepared by</Label>
            <Input value={preparedBy} onChange={e => setPreparedBy(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Checked by</Label>
            <Input value={checkedBy} onChange={e => setCheckedBy(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Approved by</Label>
            <Input value={approvedBy} onChange={e => setApprovedBy(e.target.value)} />
          </div>
        </div>

        <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
          <Printer className="h-3.5 w-3.5" /> Export uses browser print engine (Save as PDF).
        </p>
      </div>

      <div id="sil-report-preview" className="rounded-xl border bg-card p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-xs text-muted-foreground mt-1">Generated {generatedAt} · {template === 'audit' ? 'Audit template' : 'Executive template'}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="font-mono">Doc: {docRef}</Badge>
          <Badge variant="outline" className="font-mono">{version}</Badge>
          <Badge variant="outline" className="font-mono">Project: {project.name}</Badge>
          <Badge variant="outline" className="font-mono">SIF: {sif.sifNumber}</Badge>
          <Badge className={cn(result.meetsTarget ? 'bg-emerald-600' : 'bg-red-600')}>
            {result.meetsTarget ? `Compliant SIL ${sif.targetSIL}` : `Gap vs SIL ${sif.targetSIL}`}
          </Badge>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2 inline-flex items-center gap-1">
            <FileBadge2 className="h-3.5 w-3.5" /> Executive summary
          </p>
          <p className="text-sm leading-relaxed">
            Calculated performance gives <strong>PFDavg {formatPFD(result.PFD_avg)}</strong> and <strong>RRF {formatRRF(result.RRF)}</strong>,
            corresponding to <strong>SIL {result.SIL}</strong>.
          </p>
        </div>

        <section>
          <h2 className="text-xs uppercase tracking-wide font-semibold text-muted-foreground mb-1">Scope</h2>
          <p className="text-sm leading-relaxed">{scope}</p>
        </section>

        {includeAssumptions && (
          <section>
            <h2 className="text-xs uppercase tracking-wide font-semibold text-muted-foreground mb-1">Assumptions</h2>
            <p className="text-sm leading-relaxed">{assumptions}</p>
          </section>
        )}

        {includeRecommendations && (
          <section>
            <h2 className="text-xs uppercase tracking-wide font-semibold text-muted-foreground mb-1">Recommendations</h2>
            <p className="text-sm leading-relaxed">{recommendations}</p>
          </section>
        )}

        {includeSubsystemTable && (
          <div className="rounded-lg border overflow-hidden page-break">
            <table className="w-full text-xs">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-3 py-2 text-left">Subsystem</th>
                  <th className="px-3 py-2 text-left">Architecture</th>
                  <th className="px-3 py-2 text-left">PFDavg</th>
                  <th className="px-3 py-2 text-left">SFF</th>
                  <th className="px-3 py-2 text-left">DC</th>
                  <th className="px-3 py-2 text-left">SIL</th>
                </tr>
              </thead>
              <tbody>
                {result.subsystems.map((sub, i) => (
                  <tr key={sub.subsystemId} className="border-t">
                    <td className="px-3 py-2">{sif.subsystems[i]?.label ?? 'Subsystem'}</td>
                    <td className="px-3 py-2 font-mono">{sif.subsystems[i]?.architecture ?? '—'}</td>
                    <td className="px-3 py-2 font-mono">{formatPFD(sub.PFD_avg)}</td>
                    <td className="px-3 py-2 font-mono">{formatPct(sub.SFF)}</td>
                    <td className="px-3 py-2 font-mono">{formatPct(sub.DC)}</td>
                    <td className="px-3 py-2">SIL {sub.SIL}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 pt-1">
          {[
            ['Prepared by', preparedBy],
            ['Checked by', checkedBy],
            ['Approved by', approvedBy],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-lg border p-3 min-h-[74px]">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
              <p className="text-sm font-medium">{value || '—'}</p>
            </div>
          ))}
        </div>

        <div className="text-[11px] text-muted-foreground flex items-center justify-between border-t pt-3">
          <span>Methodology: IEC 61508 / IEC 61511 low-demand approach.</span>
          <span>{docRef} · {version}</span>
        </div>
      </div>
    </div>
  )
}
