import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowRight,
  Binary,
  Bot,
  Boxes,
  Braces,
  CheckCircle2,
  Clock3,
  Cpu,
  Database,
  FlaskConical,
  Sigma,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { IntercalaireCard, IntercalaireTabBar, useLayout } from '@/components/layout/SIFWorkbenchLayout'
import { calcSIF } from '@/core/math/pfdCalc'
import { BORDER, CARD_BG, PAGE_BG, PANEL_BG, TEAL, TEXT, TEXT_DIM } from '@/styles/tokens'

type EngineTab = 'runs' | 'contracts' | 'artifacts' | 'compare'
type EngineRightTab = 'snapshot' | 'integration'

const ENGINE_TABS = [
  { id: 'runs' as const, label: 'Runs', hint: 'Queue & candidates' },
  { id: 'contracts' as const, label: 'API / Modes', hint: 'Contract & job model' },
  { id: 'artifacts' as const, label: 'Outputs', hint: 'Artifacts & retention' },
  { id: 'compare' as const, label: 'Compare', hint: 'TS vs Python' },
]

const ENGINE_RIGHT_TABS = [
  { id: 'snapshot' as const, label: 'Snapshot', Icon: Activity },
  { id: 'integration' as const, label: 'Integration', Icon: Braces },
]

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
      {children}
    </p>
  )
}

function StatCard({ label, value, hint, color = TEXT }: { label: string; value: string; hint: string; color?: string }) {
  return (
    <div className="rounded-2xl border px-5 py-4 shadow-sm" style={{ background: CARD_BG, borderColor: BORDER }}>
      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: TEXT_DIM }}>{label}</p>
      <p className="mt-1 text-2xl font-black font-mono" style={{ color }}>{value}</p>
      <p className="mt-1 text-xs" style={{ color: TEXT_DIM }}>{hint}</p>
    </div>
  )
}

function EngineRightPanel({
  totalSifs,
  criticalCandidates,
  totalCampaigns,
}: {
  totalSifs: number
  criticalCandidates: number
  totalCampaigns: number
}) {
  const [activeTab, setActiveTab] = useState<EngineRightTab>('snapshot')
  const activeIdx = ENGINE_RIGHT_TABS.findIndex(tab => tab.id === activeTab)

  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ background: PANEL_BG }}>
      <div className="flex-1 overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
        <div className="sticky top-0 z-10 px-3 pt-3" style={{ background: PANEL_BG }}>
          <IntercalaireTabBar tabs={ENGINE_RIGHT_TABS} active={activeTab} onSelect={setActiveTab} cardBg={CARD_BG} />
        </div>
        <div className="px-3 pb-3">
          <IntercalaireCard tabCount={ENGINE_RIGHT_TABS.length} activeIdx={activeIdx} className="p-3 space-y-3">
          {activeTab === 'snapshot' && (
            <>
              <div>
                <SectionLabel>Engine Snapshot</SectionLabel>
                <p className="mt-2 text-sm font-semibold" style={{ color: TEXT }}>Hybrid compute model ready</p>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
                  TypeScript remains the live calculation layer. The Engine workspace is ready to dispatch advanced Python jobs when the backend is connected.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border px-3 py-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
                  <p className="text-[9px] uppercase tracking-wider" style={{ color: TEXT_DIM }}>Tracked SIFs</p>
                  <p className="mt-1 text-lg font-black font-mono" style={{ color: TEXT }}>{totalSifs}</p>
                </div>
                <div className="rounded-xl border px-3 py-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
                  <p className="text-[9px] uppercase tracking-wider" style={{ color: TEXT_DIM }}>Proof campaigns</p>
                  <p className="mt-1 text-lg font-black font-mono" style={{ color: TEXT }}>{totalCampaigns}</p>
                </div>
              </div>

              <div className="rounded-xl border px-3 py-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
                <p className="text-[9px] uppercase tracking-wider" style={{ color: TEXT_DIM }}>High-value candidates</p>
                <p className="mt-1 text-lg font-black font-mono" style={{ color: criticalCandidates > 0 ? '#F87171' : '#4ADE80' }}>
                  {criticalCandidates}
                </p>
                <p className="mt-1 text-xs" style={{ color: TEXT_DIM }}>
                  SIFs that currently miss target SIL and would benefit first from a backend Markov or Monte Carlo run.
                </p>
              </div>
            </>
          )}

          {activeTab === 'integration' && (
            <>
              <div>
                <SectionLabel>Integration Path</SectionLabel>
                <div className="mt-2 space-y-2">
                  {[
                    'POST /engine/runs submits a frozen payload to Python',
                    'GET /engine/runs/:id returns status, results, logs, and outputs',
                    'Outputs stay separate from revision PDFs and proof-test archives',
                    'Compare tab reconciles live TS estimates against authoritative Python runs',
                  ].map(item => (
                    <div key={item} className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT }}>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          </IntercalaireCard>
        </div>
      </div>
    </div>
  )
}

export function EngineWorkspace() {
  const projects = useAppStore(s => s.projects)
  const navigate = useAppStore(s => s.navigate)
  const { setRightPanelOverride } = useLayout()
  const [activeTab, setActiveTab] = useState<EngineTab>('runs')

  const stats = useMemo(() => {
    const allSifs = projects.flatMap(project => project.sifs)
    const totalCampaigns = allSifs.reduce((acc, sif) => acc + (sif.testCampaigns?.length ?? 0), 0)
    const criticalCandidates = allSifs.filter(sif => !calcSIF(sif).meetsTarget).length
    const publishedSifs = allSifs.filter(sif => Boolean(sif.revisionLockedAt)).length
    const readyProcedures = allSifs.filter(sif => sif.proofTestProcedure?.status === 'approved').length
    return {
      allSifs,
      totalSifs: allSifs.length,
      totalCampaigns,
      criticalCandidates,
      publishedSifs,
      readyProcedures,
    }
  }, [projects])

  const candidateRows = useMemo(() => (
    stats.allSifs
      .map(sif => {
        const project = projects.find(entry => entry.id === sif.projectId)
        const result = calcSIF(sif)
        const reason = !result.meetsTarget
          ? 'Target gap'
          : sif.revisionLockedAt
            ? 'Published baseline'
            : (sif.testCampaigns?.length ?? 0) > 0
              ? 'Operational evidence available'
              : 'Design candidate'
        return {
          id: sif.id,
          projectId: sif.projectId,
          projectName: project?.name ?? 'Unknown project',
          sifNumber: sif.sifNumber,
          title: sif.title || sif.description || 'Untitled SIF',
          currentSil: result.SIL,
          targetSil: sif.targetSIL,
          reason,
          recommendation: !result.meetsTarget ? 'Markov baseline' : 'Monte Carlo stress',
          status: sif.revisionLockedAt ? 'Published' : 'Working',
        }
      })
      .sort((left, right) => {
        const leftScore = left.currentSil < left.targetSil ? 0 : left.status === 'Published' ? 1 : 2
        const rightScore = right.currentSil < right.targetSil ? 0 : right.status === 'Published' ? 1 : 2
        return leftScore - rightScore || left.sifNumber.localeCompare(right.sifNumber)
      })
  ), [projects, stats.allSifs])

  useEffect(() => {
    setRightPanelOverride(
      <EngineRightPanel
        totalSifs={stats.totalSifs}
        criticalCandidates={stats.criticalCandidates}
        totalCampaigns={stats.totalCampaigns}
      />,
    )
    return () => setRightPanelOverride(null)
  }, [setRightPanelOverride, stats.criticalCandidates, stats.totalCampaigns, stats.totalSifs])

  const activeIdx = ENGINE_TABS.findIndex(tab => tab.id === activeTab)
  const runPayloadFields = [
    ['mode', 'markov | monte_carlo | sensitivity | batch_compare'],
    ['scope', 'working_snapshot | published_revision'],
    ['projectId', 'uuid'],
    ['sifId', 'uuid'],
    ['revisionId', 'uuid | null'],
    ['analysis', 'missionTimeHours, demandMode, proofTestIntervalHours'],
    ['options', 'seed?, samples?, solver?, tolerances?'],
  ] as const
  const jobLifecycle = [
    ['queued', 'Accepted by the backend and waiting for worker capacity'],
    ['running', 'Solver executing with live progress and logs'],
    ['succeeded', 'Final result and outputs persisted'],
    ['failed', 'Run stopped with an explicit error payload'],
    ['cancelled', 'User or system interrupted the run before completion'],
  ] as const
  const resultShape = [
    ['summary', 'pfdavg, sil, rrf, pass/fail, warnings'],
    ['backend', 'engineVersion, mode, runtimeMs, seed, samples'],
    ['series', 'trace-ready arrays for plots and convergence'],
    ['comparison', 'optional TS vs Python deltas'],
  ] as const
  const expectedOutputs = [
    ['manifest.json', 'Immutable run metadata and input digest'],
    ['result.json', 'Primary result payload returned by Python'],
    ['traces.json', 'Convergence, occupancy, or simulation traces'],
    ['plots/*', 'PNG/SVG charts generated by the backend'],
  ] as const
  const comparisonSignals = [
    ['PFDavg', 'Absolute and percentage delta between TS and Python'],
    ['SIL', 'Target/achieved classification agreement or mismatch'],
    ['RRF', 'Decision-grade delta for quick engineering review'],
    ['Warnings', 'Validation or modeling warnings emitted by either engine'],
  ] as const

  return (
    <div
      className="flex flex-1 min-h-0 flex-col overflow-y-auto overflow-x-hidden px-5 py-5"
      style={{ scrollbarGutter: 'stable' }}
    >
      <div className="grid grid-cols-4 gap-4 shrink-0">
        <StatCard label="Tracked SIFs" value={String(stats.totalSifs)} hint="Current PRISM estate visible to the engine" />
        <StatCard label="Published Baselines" value={String(stats.publishedSifs)} hint="Frozen revisions ready for authoritative runs" color="#60A5FA" />
        <StatCard label="Approved Procedures" value={String(stats.readyProcedures)} hint="Proof-test procedures with stable execution baselines" color="#4ADE80" />
        <StatCard label="Campaign Records" value={String(stats.totalCampaigns)} hint="Operational evidence already available for calibration" color={TEAL} />
      </div>

      <div className="mt-4 shrink-0">
        <IntercalaireTabBar tabs={ENGINE_TABS} active={activeTab} onSelect={setActiveTab} cardBg={CARD_BG} />
      </div>

      <div className="pt-0">
        <IntercalaireCard tabCount={ENGINE_TABS.length} activeIdx={activeIdx} className="p-5">
          {activeTab === 'runs' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-4 shrink-0">
                <div className="rounded-2xl border p-4" style={{ borderColor: BORDER, background: PAGE_BG }}>
                  <div className="flex items-center gap-2">
                    <Cpu size={14} style={{ color: TEAL }} />
                    <p className="text-sm font-semibold" style={{ color: TEXT }}>Queue not connected yet</p>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
                    This workspace is ready for job submission, polling, and artifacts. Once your Python service is ready, this card becomes the live queue.
                  </p>
                </div>
                <div className="rounded-2xl border p-4" style={{ borderColor: BORDER, background: PAGE_BG }}>
                  <div className="flex items-center gap-2">
                    <Sigma size={14} style={{ color: '#60A5FA' }} />
                    <p className="text-sm font-semibold" style={{ color: TEXT }}>Target solver modes</p>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
                    Markov chains, stiff solvers, Monte Carlo, sensitivity sweeps, and batch comparison between TS preview and backend results.
                  </p>
                </div>
                <div className="rounded-2xl border p-4" style={{ borderColor: BORDER, background: PAGE_BG }}>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} style={{ color: '#4ADE80' }} />
                    <p className="text-sm font-semibold" style={{ color: TEXT }}>Frontend already ready</p>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
                    Navigation, right panel, and candidate targeting are in place, so you can plug job creation as soon as your backend contract is fixed.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ borderColor: BORDER, background: CARD_BG }}>
                <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: BORDER, background: PAGE_BG }}>
                  <div>
                    <SectionLabel>Run Candidates</SectionLabel>
                    <p className="mt-1 text-sm font-semibold" style={{ color: TEXT }}>Best starting points for backend runs</p>
                  </div>
                  <div className="text-xs" style={{ color: TEXT_DIM }}>
                    No runs submitted yet
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: PAGE_BG }}>
                        {['SIF', 'Project', 'Current / Target', 'Recommendation', 'Reason', 'Status', 'Open'].map(head => (
                          <th key={head} className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
                            {head}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {candidateRows.map(row => (
                        <tr key={row.id} className="border-t" style={{ borderColor: BORDER }}>
                          <td className="px-4 py-3">
                            <p className="font-semibold" style={{ color: TEXT }}>{row.sifNumber}</p>
                            <p className="text-[10px]" style={{ color: TEXT_DIM }}>{row.title}</p>
                          </td>
                          <td className="px-4 py-3" style={{ color: TEXT }}>{row.projectName}</td>
                          <td className="px-4 py-3 font-mono" style={{ color: row.currentSil >= row.targetSil ? '#4ADE80' : '#F87171' }}>
                            SIL {row.currentSil} / SIL {row.targetSil}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center rounded-md px-2 py-1 text-[10px] font-semibold" style={{ background: `${TEAL}15`, color: TEAL }}>
                              {row.recommendation}
                            </span>
                          </td>
                          <td className="px-4 py-3" style={{ color: TEXT_DIM }}>{row.reason}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center rounded-md px-2 py-1 text-[10px] font-semibold" style={{ background: row.status === 'Published' ? '#0F1B3D' : '#1A1F24', color: row.status === 'Published' ? '#60A5FA' : TEXT_DIM }}>
                              {row.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => navigate({ type: 'sif-dashboard', projectId: row.projectId, sifId: row.id, tab: 'verification' })}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold"
                              style={{ color: TEAL }}
                            >
                              Open
                              <ArrowRight size={11} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'contracts' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border p-4 shadow-sm" style={{ borderColor: BORDER, background: PAGE_BG }}>
                <div className="flex items-center gap-2">
                  <Boxes size={14} style={{ color: '#60A5FA' }} />
                  <p className="text-sm font-semibold" style={{ color: TEXT }}>Run payload</p>
                </div>
                <div className="mt-3 space-y-2">
                  {runPayloadFields.map(([field, desc]) => (
                    <div key={field} className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: BORDER, background: CARD_BG }}>
                      <p className="font-mono font-semibold" style={{ color: TEAL }}>{field}</p>
                      <p className="mt-1" style={{ color: TEXT }}>{desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border p-4 shadow-sm" style={{ borderColor: BORDER, background: PAGE_BG }}>
                <div className="flex items-center gap-2">
                  <Bot size={14} style={{ color: TEAL }} />
                  <p className="text-sm font-semibold" style={{ color: TEXT }}>Job lifecycle</p>
                </div>
                <div className="mt-3 space-y-2">
                  {jobLifecycle.map(([status, desc]) => (
                    <div key={status} className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: BORDER, background: CARD_BG }}>
                      <p className="font-mono font-semibold" style={{ color: TEAL }}>{status}</p>
                      <p className="mt-1" style={{ color: TEXT }}>{desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border p-4 shadow-sm" style={{ borderColor: BORDER, background: PAGE_BG }}>
                <div className="flex items-center gap-2">
                  <Sigma size={14} style={{ color: '#4ADE80' }} />
                  <p className="text-sm font-semibold" style={{ color: TEXT }}>Result structure</p>
                </div>
                <div className="mt-3 space-y-2">
                  {resultShape.map(([field, desc]) => (
                    <div key={field} className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: BORDER, background: CARD_BG }}>
                      <p className="font-mono font-semibold" style={{ color: TEAL }}>{field}</p>
                      <p className="mt-1" style={{ color: TEXT }}>{desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border p-4 shadow-sm" style={{ borderColor: BORDER, background: PAGE_BG }}>
                <div className="flex items-center gap-2">
                  <Database size={14} style={{ color: '#60A5FA' }} />
                  <p className="text-sm font-semibold" style={{ color: TEXT }}>Expected outputs</p>
                </div>
                <div className="mt-3 space-y-2">
                  {expectedOutputs.map(([field, desc]) => (
                    <div key={field} className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: BORDER, background: CARD_BG }}>
                      <p className="font-mono font-semibold" style={{ color: TEAL }}>{field}</p>
                      <p className="mt-1" style={{ color: TEXT }}>{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'artifacts' && (
            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  title: 'Run manifest',
                  icon: Binary,
                  desc: 'Immutable record of solver mode, version, inputs, and timestamps for each backend run.',
                },
                {
                  title: 'Trace plots',
                  icon: Activity,
                  desc: 'Convergence plots, state occupancy charts, and simulation traces returned by Python.',
                },
                {
                  title: 'Calibration pack',
                  icon: FlaskConical,
                  desc: 'Structured package to retain TS baseline, Python run outputs, and comparison evidence together.',
                },
                {
                  title: 'Retention policy',
                  icon: Clock3,
                  desc: 'Keep raw runs separable from SIF revision PDFs, so regulatory snapshots stay clean while engine research can evolve.',
                },
              ].map(item => (
                <div key={item.title} className="rounded-2xl border p-5 shadow-sm" style={{ borderColor: BORDER, background: PAGE_BG }}>
                  <div className="flex items-center gap-2">
                    <item.icon size={14} style={{ color: TEAL }} />
                    <p className="text-sm font-semibold" style={{ color: TEXT }}>{item.title}</p>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>{item.desc}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'compare' && (
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-2xl border p-4 shadow-sm" style={{ borderColor: BORDER, background: PAGE_BG }}>
                <div className="flex items-center gap-2">
                  <Cpu size={14} style={{ color: TEAL }} />
                  <p className="text-sm font-semibold" style={{ color: TEXT }}>TypeScript live path</p>
                </div>
                <div className="mt-3 space-y-2">
                  {[
                    'Instant feedback during editing',
                    'Always available in the UI',
                    'Best for interactive design and quick iteration',
                  ].map(line => (
                    <div key={line} className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: BORDER, background: CARD_BG, color: TEXT }}>
                      {line}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border p-4 shadow-sm" style={{ borderColor: BORDER, background: PAGE_BG }}>
                <div className="flex items-center gap-2">
                  <Bot size={14} style={{ color: '#60A5FA' }} />
                  <p className="text-sm font-semibold" style={{ color: TEXT }}>Python authoritative path</p>
                </div>
                <div className="mt-3 space-y-2">
                  {[
                    'Markov, Monte Carlo, sensitivity, and batch jobs',
                    'Worker-backed execution with persisted outputs',
                    'Best for formal runs, calibration, and deeper validation',
                  ].map(line => (
                    <div key={line} className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: BORDER, background: CARD_BG, color: TEXT }}>
                      {line}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border p-4 shadow-sm" style={{ borderColor: BORDER, background: PAGE_BG }}>
                <div className="flex items-center gap-2">
                  <Activity size={14} style={{ color: '#4ADE80' }} />
                  <p className="text-sm font-semibold" style={{ color: TEXT }}>Comparison signals</p>
                </div>
                <div className="mt-3 space-y-2">
                  {comparisonSignals.map(([metric, desc]) => (
                    <div key={metric} className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: BORDER, background: CARD_BG }}>
                      <p className="font-mono font-semibold" style={{ color: TEAL }}>{metric}</p>
                      <p className="mt-1" style={{ color: TEXT }}>{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </IntercalaireCard>
      </div>
    </div>
  )
}
