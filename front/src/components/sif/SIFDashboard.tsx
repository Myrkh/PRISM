import { useMemo, useState, useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts'
import { ProofTestTab } from '@/components/prooftest/ProofTestTab'
import { useAppStore } from '@/store/appStore'
import { SILBadge } from '@/components/shared/SILBadge'
import { LoopEditorFlow } from '@/components/architecture/LoopEditorFlow'
import { useLayout } from '@/components/layout/SIFWorkbenchLayout'
import { PFDChart } from '@/components/analysis/PFDChart'
import { AnalysisRightPanel } from '@/components/analysis/AnalysisRightPanel'
import { ComplianceTab } from '@/components/sif/ComplianceTab'
import { ComplianceRightPanel } from '@/components/sif/ComplianceRightPanel'
import { OverviewRightPanel } from '@/components/sif/OverviewRightPanel'
import { OverviewTab } from '@/components/sif/OverviewTab'
import { RevisionCloseDialog } from '@/components/sif/RevisionCloseDialog'
import { RevisionLockedOverlay } from '@/components/sif/RevisionLockedOverlay'
import { SIFVerdictBanner } from '@/components/sif/SIFVerdictBanner'
import { SILReportStudio } from '@/components/report/SILReportStudio'
import { calcSIF, formatPFD, formatRRF, formatPct } from '@/core/math/pfdCalc'
import {
  DEFAULT_SIF_ANALYSIS_SETTINGS,
  analysisSettingsToMissionTimeHours,
  getAnalysisSubsystemColors,
  loadSIFAnalysisSettings,
  saveSIFAnalysisSettings,
} from '@/core/models/analysisSettings'
import { computeCompliance } from '@/components/sif/complianceCalc'
import { getOverviewMetrics } from '@/components/sif/overviewMetrics'
import type { SILLevel, SIFAssumption } from '@/core/types'

interface ContributionRow {
  key: string
  label: string
  color: string
  pfd: number
  rrf: number
  sil: SILLevel
  contributionPct: number
}

function ContributionTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null

  const row = payload[0].payload as ContributionRow

  return (
    <div className="rounded-xl border bg-card shadow-xl px-4 py-3 text-xs">
      <p className="font-semibold mb-1">{row.label}</p>
      <p className="font-mono text-muted-foreground">PFD {formatPFD(row.pfd)}</p>
      <p className="font-mono text-muted-foreground">RRF {formatRRF(row.rrf)}</p>
      <p className="font-mono text-muted-foreground">{row.contributionPct.toFixed(1)}%</p>
    </div>
  )
}

interface Props { projectId: string; sifId: string }

export function SIFDashboard({ projectId, sifId }: Props) {
  const view        = useAppStore(s => s.view)
  const navigate    = useAppStore(s => s.navigate)
  const setTab      = useAppStore(s => s.setTab)
  const updateSIF   = useAppStore(s => s.updateSIF)
  const publishRevision = useAppStore(s => s.publishRevision)
  const startNextRevision = useAppStore(s => s.startNextRevision)
  const { setRightPanelOverride } = useLayout()
  const project     = useAppStore(s => s.projects.find(p => p.id === projectId))
  const sif         = project?.sifs.find(s => s.id === sifId)

  const activeTab = view.type === 'sif-dashboard' ? view.tab : 'overview'
  const [analysisSettings, setAnalysisSettings] = useState(() =>
    sif ? loadSIFAnalysisSettings(sif.id) : DEFAULT_SIF_ANALYSIS_SETTINGS
  )
  const [selectedComplianceGapId, setSelectedComplianceGapId] = useState<string | null>(null)
  const [selectedComplianceEvidenceId, setSelectedComplianceEvidenceId] = useState<string | null>(null)
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false)
  const [isPublishingRevision, setIsPublishingRevision] = useState(false)
  const [isStartingNextRevision, setIsStartingNextRevision] = useState(false)

  useEffect(() => {
    if (!sif) return
    setAnalysisSettings(loadSIFAnalysisSettings(sif.id))
  }, [activeTab, sif?.id])

  useEffect(() => {
    setSelectedComplianceGapId(null)
    setSelectedComplianceEvidenceId(null)
  }, [activeTab, sif?.id])

  useEffect(() => {
    if (!sif) return
    saveSIFAnalysisSettings(sif.id, analysisSettings)
  }, [analysisSettings, sif])

  const subsystemColors = useMemo(() => getAnalysisSubsystemColors(analysisSettings), [analysisSettings])
  const getSubsystemColor = (type: string) =>
    type === 'sensor' || type === 'logic' || type === 'actuator'
      ? subsystemColors[type]
      : '#6B7280'
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

  // Tabs with their own contextual right panels are responsible for mounting them.
  // This dashboard effect only manages the panels it owns directly.
  useEffect(() => {
    if (activeTab === 'overview' && sif && result && compliance) {
      setRightPanelOverride(
        <OverviewRightPanel
          sif={sif}
          result={result}
          compliance={compliance}
          onSelectTab={setTab}
        />,
      )
      return () => setRightPanelOverride(null)
    } else if (activeTab === 'analysis' && sif) {
      setRightPanelOverride(
        <AnalysisRightPanel
          settings={analysisSettings}
          onChange={setAnalysisSettings}
          onReset={() => setAnalysisSettings(DEFAULT_SIF_ANALYSIS_SETTINGS)}
        />,
      )
      return () => setRightPanelOverride(null)
    } else if (activeTab === 'compliance' && sif && result && compliance) {
      setRightPanelOverride(
        <ComplianceRightPanel
          sif={sif}
          result={result}
          compliance={compliance}
          selectedGapId={selectedComplianceGapId}
          selectedEvidenceId={selectedComplianceEvidenceId}
          onSelectTab={setTab}
          onUpdateAssumptions={(assumptions: SIFAssumption[]) => updateSIF(projectId, sif.id, { assumptions })}
        />,
      )
      return () => setRightPanelOverride(null)
    } else if (activeTab !== 'architecture' && activeTab !== 'prooftest' && activeTab !== 'report') {
      setRightPanelOverride(null)
    }
  }, [
    activeTab,
    analysisSettings,
    compliance,
    projectId,
    result,
    selectedComplianceEvidenceId,
    selectedComplianceGapId,
    setRightPanelOverride,
    setTab,
    sif,
    updateSIF,
  ])

  const overviewMetrics = useMemo(
    () => (sif && result && compliance ? getOverviewMetrics(sif, result, compliance) : null),
    [compliance, result, sif],
  )

  const contributionRows = useMemo<ContributionRow[]>(() => {
    if (!result || !sif) return []

    const totalPFD = Number.isFinite(result.PFD_avg) && result.PFD_avg > 0 ? result.PFD_avg : 0

    return result.subsystems.map((sub, index) => ({
      key: sub.subsystemId,
      label: sif.subsystems[index]?.label ?? sub.type,
      color: getSubsystemColor(sub.type),
      pfd: sub.PFD_avg,
      rrf: sub.RRF,
      sil: sub.SIL,
      contributionPct: totalPFD > 0 && Number.isFinite(sub.PFD_avg)
        ? (sub.PFD_avg / totalPFD) * 100
        : 0,
    }))
  }, [getSubsystemColor, result, sif])

  if (!project || !sif || !result || !compliance || !overviewMetrics) return null

  const contributionTableRows: ContributionRow[] = [
    ...contributionRows,
    {
      key: 'sif-total',
      label: 'SIF',
      color: '#DFE8F1',
      pfd: result.PFD_avg,
      rrf: result.RRF,
      sil: result.SIL,
      contributionPct: 100,
    },
  ]
  const contributionPieRows = contributionRows.filter(row => row.contributionPct > 0)

  const isLocked = Boolean(sif.revisionLockedAt)
  const lockCurrentTab = isLocked && activeTab !== 'prooftest'

  const handlePublishRevision = async (payload: { changeDescription: string; createdBy: string }) => {
    setIsPublishingRevision(true)
    try {
      await publishRevision(projectId, sif.id, payload)
      setTab('overview')
    } finally {
      setIsPublishingRevision(false)
    }
  }

  const handleStartNextRevision = async () => {
    setIsStartingNextRevision(true)
    try {
      await startNextRevision(projectId, sif.id)
      setTab('overview')
    } finally {
      setIsStartingNextRevision(false)
    }
  }

  if (activeTab === 'architecture') {
    return (
      <>
        <div className="relative flex flex-1 min-h-0">
          <div
            className="flex flex-1 min-h-0 transition-[filter,opacity] duration-200"
            style={{
              filter: isLocked ? 'blur(3px)' : 'none',
              opacity: isLocked ? 0.45 : 1,
              pointerEvents: isLocked ? 'none' : 'auto',
              userSelect: isLocked ? 'none' : 'auto',
            }}
          >
            <LoopEditorFlow sif={sif} projectId={projectId} />
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
      <div className="flex-1 overflow-y-auto min-h-0 px-6 py-5 relative">
        <div
          className="space-y-0 transition-[filter,opacity] duration-200"
          style={{
            filter: lockCurrentTab ? 'blur(3px)' : 'none',
            opacity: lockCurrentTab ? 0.45 : 1,
            pointerEvents: lockCurrentTab ? 'none' : 'auto',
            userSelect: lockCurrentTab ? 'none' : 'auto',
          }}
        >

          {/* ════ OVERVIEW ════ */}
          {activeTab === 'overview' && (
            <OverviewTab
              sif={sif}
              result={result}
              compliance={compliance}
              overviewMetrics={overviewMetrics}
              getSubsystemColor={getSubsystemColor}
              isPublishingRevision={isPublishingRevision}
              onSelectTab={setTab}
              onOpenHazop={() => navigate({ type: 'hazop' })}
              onCloseRevision={() => setIsCloseDialogOpen(true)}
            />
          )}

          {/* ════ ANALYSIS ════ */}
          {activeTab === 'analysis' && (
            <div className="space-y-5">
              <PFDChart sif={sif} chartData={result.chartData} settings={analysisSettings.chart} />

              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="px-5 py-3 border-b bg-muted/30">
                  <h3 className="text-sm font-semibold">Subsystem Breakdown</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/20">
                      {['Subsystem', 'Architecture', 'PFD avg', 'RRF', 'SFF', 'DC', 'HFT', 'SIL'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.subsystems.map((sub, i) => {
                      const subsystem = sif.subsystems[i]
                      const color = getSubsystemColor(sub.type)
                      return (
                        <tr key={sub.subsystemId} className="border-b hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-semibold text-xs" style={{ color }}>{subsystem?.label}</td>
                          <td className="px-4 py-3 font-mono text-xs">{subsystem?.architecture}</td>
                          <td className="px-4 py-3 font-mono text-xs font-semibold">{formatPFD(sub.PFD_avg)}</td>
                          <td className="px-4 py-3 font-mono text-xs">{formatRRF(sub.RRF)}</td>
                          <td className="px-4 py-3 font-mono text-xs">{formatPct(sub.SFF)}</td>
                          <td className="px-4 py-3 font-mono text-xs">{formatPct(sub.DC)}</td>
                          <td className="px-4 py-3 font-mono text-xs">{sub.HFT}</td>
                          <td className="px-4 py-3"><SILBadge sil={sub.SIL} size="sm" /></td>
                        </tr>
                      )
                    })}
                    <tr className="bg-muted/30 font-semibold">
                      <td className="px-4 py-3 text-xs" colSpan={2}>Total SIF (series)</td>
                      <td className="px-4 py-3 font-mono text-xs">{formatPFD(result.PFD_avg)}</td>
                      <td className="px-4 py-3 font-mono text-xs">{formatRRF(result.RRF)}</td>
                      <td colSpan={3} />
                      <td className="px-4 py-3"><SILBadge sil={result.SIL} /></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="px-5 py-3 border-b bg-muted/30">
                  <h3 className="text-sm font-semibold">{analysisSettings.pie.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {analysisSettings.pie.subtitle}
                  </p>
                </div>
                <div className="p-5">
                  {contributionPieRows.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie
                            data={contributionPieRows}
                            dataKey="contributionPct"
                            nameKey="label"
                            cx="50%"
                            cy="50%"
                            innerRadius={analysisSettings.pie.innerRadius}
                            outerRadius={analysisSettings.pie.outerRadius}
                            paddingAngle={2}
                            label={analysisSettings.pie.showLabels
                              ? ({ percent }) => `${((percent ?? 0) * 100).toFixed(1)}%`
                              : false}
                            labelLine={false}
                          >
                            {contributionPieRows.map(row => (
                              <Cell key={row.key} fill={row.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip content={<ContributionTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>

                      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                        {contributionPieRows.map(row => (
                          <div key={row.key} className="rounded-lg border px-3 py-2.5 bg-muted/20">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ background: row.color }} />
                              <span className="text-sm font-medium">{row.label}</span>
                            </div>
                            <p className="text-xs font-mono mt-1 text-muted-foreground">
                              {row.contributionPct.toFixed(1)}% · PFD {formatPFD(row.pfd)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                      No contribution data available.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="px-5 py-3 border-b bg-muted/30">
                  <h3 className="text-sm font-semibold">Contribution Summary</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/20">
                      {['Element', 'AVG PFD', 'RRF', 'Computed SIL', 'Contribution %'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {contributionTableRows.map(row => (
                      <tr key={row.key} className="border-b hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {row.key !== 'sif-total' && (
                              <div className="w-2 h-2 rounded-full" style={{ background: row.color }} />
                            )}
                            <span className="font-semibold text-xs">{row.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs font-semibold">{formatPFD(row.pfd)}</td>
                        <td className="px-4 py-3 font-mono text-xs">{formatRRF(row.rrf)}</td>
                        <td className="px-4 py-3"><SILBadge sil={row.sil} size="sm" /></td>
                        <td className="px-4 py-3 font-mono text-xs">{row.contributionPct.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <SIFVerdictBanner sif={sif} result={result} />
            </div>
          )}

          {/* ════ COMPLIANCE ════ */}
          {activeTab === 'compliance' && (
            <ComplianceTab
              sif={sif}
              result={result}
              compliance={compliance}
              onSelectTab={setTab}
              onSelectGap={gapId => {
                setSelectedComplianceEvidenceId(null)
                setSelectedComplianceGapId(gapId)
              }}
              onSelectEvidence={evidenceId => {
                setSelectedComplianceGapId(null)
                setSelectedComplianceEvidenceId(evidenceId)
              }}
            />
          )}

          {/* ════ PROOF TEST ════ */}
          {activeTab === 'prooftest' && (
            <ProofTestTab project={project} sif={sif} />
          )}

          {/* ════ REPORT ════ */}
          {activeTab === 'report' && (
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
