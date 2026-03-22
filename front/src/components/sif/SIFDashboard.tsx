import { useEffect, useMemo, useState } from 'react'
import { ProofTestTab } from '@/components/prooftest/ProofTestTab'
import { useAppStore } from '@/store/appStore'
import { LoopEditorFlow } from '@/components/architecture/LoopEditorFlow'
import { useLayout } from '@/components/layout/SIFWorkbenchLayout'
import { ArchitectureWorkspace } from '@/components/sif/ArchitectureWorkspace'
import { ContextRightPanel } from '@/components/sif/ContextRightPanel'
import { ContextTab } from '@/components/sif/ContextTab'
import { CockpitRightPanel } from '@/components/sif/CockpitRightPanel'
import { ExploitationWorkspace } from '@/components/sif/ExploitationWorkspace'
import { RevisionCloseDialog } from '@/components/sif/RevisionCloseDialog'
import { RevisionLockedOverlay } from '@/components/sif/RevisionLockedOverlay'
import { OverviewTab } from '@/components/sif/OverviewTab'
import { VerificationRightPanel } from '@/components/sif/VerificationRightPanel'
import { VerificationWorkspace } from '@/components/sif/VerificationWorkspace'
import { SILReportStudio } from '@/components/report/SILReportStudio'
import {
  DEFAULT_SIF_ANALYSIS_SETTINGS,
  analysisSettingsToMissionTimeHours,
  loadSIFAnalysisSettings,
  saveSIFAnalysisSettings,
} from '@/core/models/analysisSettings'
import { computeCompliance } from '@/components/sif/complianceCalc'
import { getOverviewMetrics } from '@/components/sif/overviewMetrics'
import { calcSIF } from '@/core/math/pfdCalc'
import { normalizeSIFTab } from '@/store/types'
import { useAppLocale } from '@/i18n/useLocale'

interface Props {
  projectId: string
  sifId: string
  /** When set, drives tab state from outside (secondary split slot). */
  tabOverride?: import('@/store/types').CanonicalSIFTab
  /** When set, tab changes update the caller instead of the primary store. */
  onTabChange?: (tab: import('@/store/types').CanonicalSIFTab) => void
}

export function SIFDashboard({ projectId, sifId, tabOverride, onTabChange }: Props) {
  const view = useAppStore(s => s.view)
  const setTab = useAppStore(s => s.setTab)
  // In split mode, route tab changes to the secondary slot instead of the primary store
  const handleTabChange = onTabChange ?? setTab
  const openEditSIF = useAppStore(s => s.openEditSIF)
  const publishRevision = useAppStore(s => s.publishRevision)
  const startNextRevision = useAppStore(s => s.startNextRevision)
  const updateSIF = useAppStore(s => s.updateSIF)
  const { setRightPanelOverride } = useLayout()
  const locale = useAppLocale()
  const project = useAppStore(s => s.projects.find(p => p.id === projectId))
  const sif = project?.sifs.find(s => s.id === sifId)

  const storeTab = view.type === 'sif-dashboard' ? normalizeSIFTab(view.tab) : 'cockpit'
  const activeTab = tabOverride ?? storeTab
  const resolvedTab = activeTab === 'history' ? 'cockpit' : activeTab
  const [analysisSettings, setAnalysisSettings] = useState(() =>
    sif ? loadSIFAnalysisSettings(sif.id) : DEFAULT_SIF_ANALYSIS_SETTINGS,
  )
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false)
  const [isPublishingRevision, setIsPublishingRevision] = useState(false)
  const [isStartingNextRevision, setIsStartingNextRevision] = useState(false)

  useEffect(() => {
    if (activeTab !== 'history') return
    handleTabChange('cockpit')
  }, [activeTab, handleTabChange])

  useEffect(() => {
    if (!sif) return
    setAnalysisSettings(loadSIFAnalysisSettings(sif.id))
  }, [resolvedTab, sif?.id])

  useEffect(() => {
    if (!sif) return
    saveSIFAnalysisSettings(sif.id, analysisSettings)
  }, [analysisSettings, sif])

  const result = useMemo(() => {
    if (!sif) return null
    return calcSIF(sif, {
      projectStandard: project?.standard,
      missionTimeHours: analysisSettingsToMissionTimeHours(analysisSettings),
      curvePoints: analysisSettings.chart.curvePoints,
    })
  }, [analysisSettings, project?.standard, sif])

  const compliance = useMemo(
    () => (sif && result ? computeCompliance(sif, result) : null),
    [result, sif],
  )
  const overviewMetrics = useMemo(
    () => (sif && result && compliance ? getOverviewMetrics(sif, result, compliance, locale) : null),
    [compliance, locale, result, sif],
  )

  useEffect(() => {
    if (!sif || !result || !compliance || !overviewMetrics) return

    if (resolvedTab === 'cockpit') {
      setRightPanelOverride(
        <CockpitRightPanel
          sif={sif}
          result={result}
          compliance={compliance}
          overviewMetrics={overviewMetrics}
        />,
      )
      return () => setRightPanelOverride(null)
    }

    if (resolvedTab === 'context') {
      setRightPanelOverride(
        <ContextRightPanel
          sif={sif}
          compliance={compliance}
          overviewMetrics={overviewMetrics}
          onOpenEditSheet={() => openEditSIF(sif.id)}
          onSelectTab={setTab}
        />,
      )
      return () => setRightPanelOverride(null)
    }

    if (resolvedTab === 'verification') {
      setRightPanelOverride(
        <VerificationRightPanel
          sif={sif}
          result={result}
          compliance={compliance}
          settings={analysisSettings}
          onChangeSettings={setAnalysisSettings}
          onResetSettings={() => setAnalysisSettings(DEFAULT_SIF_ANALYSIS_SETTINGS)}
          onUpdateAssumptions={async assumptions => {
            await updateSIF(projectId, sif.id, { assumptions })
          }}
          onSelectTab={setTab}
        />,
      )
      return () => setRightPanelOverride(null)
    }

    if (resolvedTab !== 'architecture' && resolvedTab !== 'exploitation' && resolvedTab !== 'report') {
      setRightPanelOverride(null)
    }

    return undefined
  }, [
    resolvedTab,
    compliance,
    openEditSIF,
    updateSIF,
    overviewMetrics,
    result,
    setRightPanelOverride,
    setTab,
    sif,
  ])

  if (!project || !sif || !result || !compliance || !overviewMetrics) return null

  const isLocked = Boolean(sif.revisionLockedAt)
  const lockCurrentTab = isLocked && resolvedTab !== 'exploitation' && resolvedTab !== 'report'

  const handlePublishRevision = async (payload: { changeDescription: string; createdBy: string }) => {
    setIsPublishingRevision(true)
    try {
      await publishRevision(projectId, sif.id, payload)
      handleTabChange('cockpit')
    } finally {
      setIsPublishingRevision(false)
    }
  }

  const handleStartNextRevision = async () => {
    setIsStartingNextRevision(true)
    try {
      await startNextRevision(projectId, sif.id)
      handleTabChange('cockpit')
    } finally {
      setIsStartingNextRevision(false)
    }
  }

  if (resolvedTab === 'architecture') {
    return (
      <>
        <div className="relative flex flex-1 min-h-0 min-w-0 flex-col overflow-y-auto px-3 pb-3 pt-2">
          <div
            className="relative flex min-h-full min-w-0 flex-col transition-[filter,opacity] duration-200"
            style={{
              filter: isLocked ? 'blur(3px)' : 'none',
              opacity: isLocked ? 0.45 : 1,
              pointerEvents: isLocked ? 'none' : 'auto',
              userSelect: isLocked ? 'none' : 'auto',
            }}
          >
            <ArchitectureWorkspace
              sif={sif}
              result={result}
            >
              <LoopEditorFlow sif={sif} projectId={projectId} />
            </ArchitectureWorkspace>
          </div>

          {isLocked && (
            <RevisionLockedOverlay
              sif={sif}
              isStartingNextRevision={isStartingNextRevision}
              onStartNextRevision={handleStartNextRevision}
            />
          )}
        </div>

        {isCloseDialogOpen && (
          <RevisionCloseDialog
            sif={sif}
            onClose={() => setIsCloseDialogOpen(false)}
            onConfirm={handlePublishRevision}
          />
        )}
      </>
    )
  }

  return (
    <>
      <div className="relative flex-1 min-h-0 overflow-y-auto px-3 pb-3 pt-2">
        <div
          className="space-y-4 transition-[filter,opacity] duration-200"
          style={{
            filter: lockCurrentTab ? 'blur(3px)' : 'none',
            opacity: lockCurrentTab ? 0.45 : 1,
            pointerEvents: lockCurrentTab ? 'none' : 'auto',
            userSelect: lockCurrentTab ? 'none' : 'auto',
          }}
        >
          {resolvedTab === 'cockpit' && (
            <OverviewTab
              sif={sif}
              result={result}
              compliance={compliance}
              overviewMetrics={overviewMetrics}
              isPublishingRevision={isPublishingRevision}
              onSelectTab={handleTabChange}
              onCloseRevision={() => setIsCloseDialogOpen(true)}
            />
          )}

          {resolvedTab === 'context' && (
            <ContextTab
              projectId={projectId}
              sif={sif}
              compliance={compliance}
              overviewMetrics={overviewMetrics}
              onSelectTab={handleTabChange}
            />
          )}

          {resolvedTab === 'verification' && (
            <VerificationWorkspace
              sif={sif}
              result={result}
              compliance={compliance}
              settings={analysisSettings}
              onChangeSettings={setAnalysisSettings}
              onResetSettings={() => setAnalysisSettings(DEFAULT_SIF_ANALYSIS_SETTINGS)}
              onSelectTab={handleTabChange}
              onSelectGap={() => {}}
              onSelectEvidence={() => {}}
            />
          )}

          {resolvedTab === 'exploitation' && (
            <ExploitationWorkspace
              project={project}
              sif={sif}
            >
              <ProofTestTab project={project} sif={sif} onSelectTab={handleTabChange} />
            </ExploitationWorkspace>
          )}

          {resolvedTab === 'report' && (
            <SILReportStudio project={project} sif={sif} result={result} />
          )}
        </div>

        {lockCurrentTab && (
          <RevisionLockedOverlay
            sif={sif}
            isStartingNextRevision={isStartingNextRevision}
            onStartNextRevision={handleStartNextRevision}
          />
        )}
      </div>

      {isCloseDialogOpen && (
        <RevisionCloseDialog
          sif={sif}
          onClose={() => setIsCloseDialogOpen(false)}
          onConfirm={handlePublishRevision}
        />
      )}
    </>
  )
}
