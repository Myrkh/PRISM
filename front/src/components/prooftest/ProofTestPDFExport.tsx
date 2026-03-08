import { useCallback, useState } from 'react'
import { Download, Printer, X } from 'lucide-react'
import type { Project, SIF } from '@/core/types'
import {
  ProofTestPdfDocument,
  buildProofTestPdfBlob,
} from './proofTestPdf'

interface Props {
  sif: SIF
  project: Project
  procedure: unknown
  campaigns: unknown[]
  onClose: () => void
}

export function ProofTestPDFExport({ sif, project, procedure, campaigns, onClose }: Props) {
  const [exporting, setExporting] = useState(false)
  const hasResponseTrendPage = Boolean(
    typeof procedure === 'object'
      && procedure !== null
      && Array.isArray((procedure as { responseChecks?: unknown[] }).responseChecks)
      && ((procedure as { responseChecks?: unknown[] }).responseChecks?.length ?? 0) > 0,
  )
  const totalPages = 2 + campaigns.length + (hasResponseTrendPage ? 1 : 0)

  const handleExport = useCallback(async () => {
    setExporting(true)
    try {
      const { blob, fileName } = await buildProofTestPdfBlob({
        sif,
        project,
        procedure,
        campaigns,
      })

      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = fileName
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch {
      window.print()
    } finally {
      setExporting(false)
    }
  }, [campaigns, procedure, project, sif])

  return (
    <div className="fixed inset-0 z-[70] flex flex-col" style={{ background: '#0C1117' }}>
      <div className="flex items-center justify-between px-4 py-3 shrink-0 border-b"
        style={{ background: '#14181C', borderColor: '#2A3138' }}>
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors"
            style={{ color: '#8FA0B1' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#1D232A')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <X size={16} />
          </button>
          <div>
            <p className="text-sm font-bold" style={{ color: '#DFE8F1' }}>Export PDF — Proof Test</p>
            <p className="text-[10px]" style={{ color: '#8FA0B1' }}>
              {totalPages} pages
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
            style={{ color: '#8FA0B1', borderColor: '#2A3138' }}>
            <Printer size={13} /> Imprimer
          </button>
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #009BA4, #007A82)', color: '#fff' }}>
            <Download size={13} /> {exporting ? 'Génération…' : 'Télécharger PDF'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto py-8" style={{ background: '#1A1F24' }}>
        <div className="mx-auto" style={{ width: 'fit-content' }}>
          <ProofTestPdfDocument
            sif={sif}
            project={project}
            procedureRaw={procedure}
            campaignsRaw={campaigns}
          />
        </div>
      </div>
    </div>
  )
}
