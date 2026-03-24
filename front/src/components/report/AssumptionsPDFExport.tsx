import { useCallback, useMemo, useState } from 'react'
import { Download, Printer, X } from 'lucide-react'
import { toast } from '@/components/ui/toast'
import { normalizeSIFAssumptions } from '@/core/models/sifAssumptions'
import type { Project, SIF } from '@/core/types'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { AssumptionsPdfDocument, buildAssumptionsPdfBlob, getAssumptionsPdfPageCount } from './assumptionsPdf'

interface Props {
  sif: SIF
  project: Project
  assumptions: unknown
  onClose: () => void
}

export function AssumptionsPDFExport({ sif, project, assumptions, onClose }: Props) {
  const { BORDER, CARD_BG, PAGE_BG, SURFACE, TEXT, TEXT_DIM, TEAL, isDark } = usePrismTheme()
  const [exporting, setExporting] = useState(false)
  const items = useMemo(() => normalizeSIFAssumptions(assumptions), [assumptions])
  const totalPages = getAssumptionsPdfPageCount(items)

  const handleExport = useCallback(async () => {
    setExporting(true)
    try {
      const { blob, fileName } = await buildAssumptionsPdfBlob({
        sif,
        project,
        assumptions: items,
      })

      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = fileName
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      toast.success('PDF téléchargé', fileName)
    } catch {
      toast.error('Export PDF échoué', 'Vérifiez la console pour plus de détails.')
      window.print()
    } finally {
      setExporting(false)
    }
  }, [items, project, sif])

  return (
    <div className="fixed inset-0 z-[70] flex flex-col" style={{ background: isDark ? '#0C1117' : 'rgba(16, 36, 55, 0.18)' }}>
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-3"
        style={{ background: CARD_BG, borderColor: BORDER }}>
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            style={{ color: TEXT_DIM }}
          >
            <X size={16} />
          </button>
          <div>
            <p className="text-sm font-bold" style={{ color: TEXT }}>Export PDF - Assumptions</p>
            <p className="text-[10px]" style={{ color: TEXT_DIM }}>
              {totalPages} pages
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors hover:border-[#009BA4] hover:text-[#009BA4]"
            style={{ color: TEXT_DIM, borderColor: BORDER, background: SURFACE }}>
            <Printer size={13} /> Imprimer
          </button>
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-bold transition-all disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${TEAL}, #007A82)`, color: '#fff' }}>
            <Download size={13} /> {exporting ? 'Generation...' : 'Telecharger PDF'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto py-8" style={{ background: PAGE_BG }}>
        <div className="mx-auto" style={{ width: 'fit-content' }}>
          <AssumptionsPdfDocument
            project={project}
            sif={sif}
            assumptionsRaw={items}
          />
        </div>
      </div>
    </div>
  )
}
