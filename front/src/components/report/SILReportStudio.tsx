import { useCallback, useEffect, useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { useLayout } from '@/components/layout/SIFWorkbenchLayout'
import { toast } from '@/components/ui/toast'
import {
  analysisSettingsToMissionTimeHours,
  loadSIFAnalysisSettings,
} from '@/core/models/analysisSettings'
import {
  buildSILBackendReportPdf,
  buildSILBackendReportRequest,
} from '@/lib/engineApi'
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
  onBackendPrint,
}: {
  initialCfg: ReportConfig
  onCfgChange: (cfg: ReportConfig) => void
  onPrint: () => Promise<void> | void
  onBackendPrint: () => Promise<void> | void
}) {
  const [panelCfg, setPanelCfg] = useState<ReportConfig>(initialCfg)
  const [isExporting, setIsExporting] = useState(false)
  const [isBackendExporting, setIsBackendExporting] = useState(false)

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

  const handleBackendPrint = useCallback(async () => {
    setIsBackendExporting(true)
    try {
      await onBackendPrint()
    } finally {
      setIsBackendExporting(false)
    }
  }, [onBackendPrint])

  return (
    <ReportConfigPanel
      cfg={panelCfg}
      setCfg={set}
      showPreview
      onPrint={handlePrint}
      onBackendPrint={handleBackendPrint}
      isExporting={isExporting}
      isBackendExporting={isBackendExporting}
    />
  )
}

export function SILReportStudio({ project, sif, result }: Props) {
  const PREVIEW_ID = 'sil-report-preview-v3'
  const { setRightPanelOverride } = useLayout()
  const prefs = useAppStore(s => s.preferences)
  const [cfg, setCfg] = useState<ReportConfig>(() => getDefaultReportConfig({ project, sif, result, prefs }))

  useEffect(() => {
    setCfg(getDefaultReportConfig({ project, sif, result, prefs }))
  }, [project, result, sif, prefs])

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
      toast.success('Rapport SIL téléchargé', fileName)
    } catch (error) {
      console.error('PDF export failed, fallback to print.', error)
      toast.error('Export PDF échoué', 'Passage en mode impression.')
      window.print()
    }
  }, [cfg, project, result, sif])

  const handleBackendPrint = useCallback(async () => {
    const analysisSettings = loadSIFAnalysisSettings(sif.id)
    const { blob, fileName } = await buildSILBackendReportPdf(
      buildSILBackendReportRequest(
        sif,
        {
          projectStandard: project.standard,
          missionTimeHours: analysisSettingsToMissionTimeHours(analysisSettings),
          curvePoints: analysisSettings.chart.curvePoints,
        },
        {
          calculationMode: result.SIL < sif.targetSIL ? 'MARKOV' : 'AUTO',
          includeCurve: cfg.showPFDChart,
        },
        {
          projectName: project.name,
          projectRef: project.ref,
          sifNumber: sif.sifNumber,
          sifTitle: sif.title || sif.description,
          targetSIL: sif.targetSIL,
          title: cfg.title,
          docRef: cfg.docRef,
          version: cfg.version,
          scope: cfg.scope,
          hazardDescription: cfg.hazardDescription,
          assumptions: cfg.assumptions,
          recommendations: cfg.recommendations,
          preparedBy: cfg.preparedBy,
          checkedBy: cfg.checkedBy,
          approvedBy: cfg.approvedBy,
          confidentialityLabel: cfg.confidentialityLabel,
          showPFDChart: cfg.showPFDChart,
          showSubsystemTable: cfg.showSubsystemTable,
          showComponentTable: cfg.showComponentTable,
          showComplianceMatrix: cfg.showComplianceMatrix,
          showAssumptions: cfg.showAssumptions,
          showRecommendations: cfg.showRecommendations,
        },
      ),
    )
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    toast.success('Rapport SIL téléchargé', fileName)
  }, [cfg, project, result.SIL, sif])

  useEffect(() => {
    setRightPanelOverride(
      <ReportPanelBridge
        initialCfg={cfg}
        onCfgChange={handlePanelCfgChange}
        onPrint={handlePrint}
        onBackendPrint={handleBackendPrint}
      />,
    )

    return () => {
      setRightPanelOverride(null)
    }
  }, [cfg, handleBackendPrint, handlePanelCfgChange, handlePrint, setRightPanelOverride, sif.id])

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
