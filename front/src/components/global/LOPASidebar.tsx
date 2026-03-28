/**
 * components/global/LOPASidebar.tsx — PRISM
 *
 * Left sidebar for the LOPA global workspace.
 * Shows projects + their studies, lets the user switch context.
 */
import { Plus, Shield } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { usePrismTheme } from '@/styles/usePrismTheme'

export function LOPASidebar() {
  const { BORDER, CARD_BG, PANEL_BG, TEAL, TEXT, TEXT_DIM } = usePrismTheme()

  const projects       = useAppStore(s => s.projects)
  const view           = useAppStore(s => s.view)
  const navigate       = useAppStore(s => s.navigate)
  const createStudy    = useAppStore(s => s.createLOPAStudy)

  const activeProjectId = view.type === 'lopa' ? (view.projectId ?? null) : null
  const activeStudyId   = view.type === 'lopa' ? (view.studyId   ?? null) : null

  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ background: PANEL_BG }}>
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 shrink-0 border-b"
        style={{ borderColor: BORDER, background: CARD_BG }}
      >
        <Shield size={13} style={{ color: TEAL }} />
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEAL }}>
          Études LOPA
        </span>
      </div>

      {/* Project + study list */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
        {projects.length === 0 && (
          <p className="px-3 py-4 text-[10px]" style={{ color: TEXT_DIM }}>Aucun projet.</p>
        )}

        {projects.map(project => {
          const isActiveProject = project.id === activeProjectId
          const studies = project.lopaStudies ?? []

          return (
            <div key={project.id}>
              {/* Project row */}
              <button
                type="button"
                onClick={() => navigate({ type: 'lopa', projectId: project.id })}
                className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors group"
                style={{
                  background: isActiveProject && !activeStudyId ? `${TEAL}10` : 'transparent',
                  borderBottom: `1px solid ${BORDER}`,
                }}
              >
                <span
                  className="flex-1 text-[11px] font-semibold truncate"
                  style={{ color: isActiveProject && !activeStudyId ? TEAL : TEXT }}
                >
                  {project.name}
                </span>
                {studies.length > 0 && (
                  <span
                    className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: `${TEAL}18`, color: TEAL }}
                  >
                    {studies.length}
                  </span>
                )}
                {/* Add study button — shows on hover */}
                <button
                  type="button"
                  title="Nouvelle étude"
                  onClick={e => {
                    e.stopPropagation()
                    const id = createStudy(project.id)
                    navigate({ type: 'lopa', projectId: project.id, studyId: id })
                  }}
                  className="shrink-0 h-5 w-5 items-center justify-center rounded opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
                  style={{ color: TEXT_DIM, display: 'inline-flex' }}
                >
                  <Plus size={11} />
                </button>
              </button>

              {/* Studies */}
              {studies.map(study => {
                const isActive = study.id === activeStudyId
                return (
                  <button
                    key={study.id}
                    type="button"
                    onClick={() => navigate({ type: 'lopa', projectId: project.id, studyId: study.id })}
                    className="flex w-full items-center gap-2 pl-6 pr-3 py-1.5 text-left transition-colors"
                    style={{
                      background: isActive ? `${TEAL}12` : 'transparent',
                      borderBottom: `1px solid ${BORDER}40`,
                    }}
                  >
                    <div
                      className="h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ background: isActive ? TEAL : `${TEXT_DIM}60` }}
                    />
                    <span
                      className="flex-1 text-[10px] truncate"
                      style={{ color: isActive ? TEAL : TEXT_DIM }}
                    >
                      {study.name}
                    </span>
                    <span className="shrink-0 text-[9px]" style={{ color: `${TEXT_DIM}80` }}>
                      {study.scenarios.length} sc.
                    </span>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
