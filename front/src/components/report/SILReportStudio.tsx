import { useCallback, useEffect, useState } from 'react'
import { useLayout } from '@/components/layout/SIFWorkbenchLayout'
import { ReportConfigPanel } from './ReportConfigPanel'
import type { ReportConfig } from './reportTypes'
import {
  ReportDocument,
  buildSILReportPdfBlob,
  getDefaultReportConfig,
} from './silReportPdf'
import type { Project, SIF, SIFCalcResult } from '@/core/types'

interface Props {
  project: Project
  sif: SIF
  result: SIFCalcResult
}

function ReportPanelBridge({
  initialCfg,
  onCfgChange,
  onPrint,
}: {
  initialCfg: ReportConfig
  onCfgChange: (cfg: ReportConfig) => void
  onPrint: () => Promise<void> | void
}) {
  const [panelCfg, setPanelCfg] = useState<ReportConfig>(initialCfg)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    setPanelCfg(initialCfg)
  }, [initialCfg])

  const set = useCallback(<K extends keyof ReportConfig>(key: K, value: ReportConfig[K]) => {
    setPanelCfg(prev => {
      const next = { ...prev, [key]: value }
      onCfgChange(next)
      return next
    })
  }, [onCfgChange])

  const handlePrint = useCallback(async () => {
    setIsExporting(true)
    try {
      await onPrint()
    } finally {
      setIsExporting(false)
    }
  }, [onPrint])

  return (
    <ReportConfigPanel
      cfg={panelCfg}
      setCfg={set}
      showPreview
      onPrint={handlePrint}
      isExporting={isExporting}
    />
  )
}

export function SILReportStudio({ project, sif, result }: Props) {
  const PREVIEW_ID = 'sil-report-preview-v3'
  const { setRightPanelOverride } = useLayout()
  const [cfg, setCfg] = useState<ReportConfig>(() => getDefaultReportConfig({ project, sif, result }))

  useEffect(() => {
    setCfg(getDefaultReportConfig({ project, sif, result }))
  }, [project, result, sif])

  const handlePanelCfgChange = useCallback((next: ReportConfig) => {
    setCfg(next)
  }, [])

  const handlePrint = useCallback(async () => {
    try {
      const { blob, fileName } = await buildSILReportPdfBlob({ project, sif, result, cfg })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = fileName
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('PDF export failed, fallback to print.', error)
      window.print()
    }
  }, [cfg, project, result, sif])

  useEffect(() => {
    setRightPanelOverride(
      <ReportPanelBridge
        initialCfg={cfg}
        onCfgChange={handlePanelCfgChange}
        onPrint={handlePrint}
      />,
    )

    return () => {
      setRightPanelOverride(null)
    }
  }, [cfg, handlePanelCfgChange, handlePrint, setRightPanelOverride, sif.id])

  return (
    <div className="flex-1 min-w-0 overflow-auto rounded-xl border p-4" style={{ background: '#F0F4F8' }}>
      <div className="mx-auto shadow-2xl" style={{ maxWidth: 794 }}>
        <ReportDocument
          id={PREVIEW_ID}
          project={project}
          sif={sif}
          result={result}
          cfg={cfg}
        />
      </div>
    </div>
  )
}
