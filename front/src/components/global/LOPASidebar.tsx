/**
 * components/global/LOPASidebar.tsx — PRISM
 *
 * Left sidebar for the LOPA global workspace.
 * Shows projects + their studies; ⋯ menu per study for rename/duplicate/delete.
 */
import { useEffect, useRef, useState } from 'react'
import { Copy, Download, MoreHorizontal, Pencil, Plus, Settings2, Shield, Trash2 } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { exportLOPAReportPdf } from '@/components/report/lopaReportPdf'

// ─── Inline rename input ──────────────────────────────────────────────────────

function InlineRenameInput({
  initialValue,
  onCommit,
  onCancel,
}: {
  initialValue: string
  onCommit: (name: string) => void
  onCancel: () => void
}) {
  const { CARD_BG, TEAL, TEXT } = usePrismTheme()
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.select() }, [])

  const commit = () => {
    const v = ref.current?.value.trim()
    if (v) onCommit(v)
    else onCancel()
  }

  return (
    <input
      ref={ref}
      defaultValue={initialValue}
      className="min-w-0 flex-1 rounded px-1.5 py-0.5 text-[10px] outline-none"
      style={{ background: CARD_BG, border: `1px solid ${TEAL}`, color: TEXT, boxShadow: `0 0 0 2px ${TEAL}22` }}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') { e.preventDefault(); commit() }
        if (e.key === 'Escape') { e.preventDefault(); onCancel() }
      }}
      onClick={e => e.stopPropagation()}
    />
  )
}

// ─── Context menu ─────────────────────────────────────────────────────────────

type MenuItem =
  | { kind: 'action'; label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }
  | { kind: 'separator' }

function StudyContextMenu({ items, onClose }: { items: MenuItem[]; onClose: () => void }) {
  const { BORDER, CARD_BG, SHADOW_SOFT, TEXT, TEXT_DIM } = usePrismTheme()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute z-50 right-0 top-full mt-0.5 rounded-lg py-1 min-w-[170px]"
      style={{ background: CARD_BG, border: `1px solid ${BORDER}`, boxShadow: `0 8px 24px rgba(0,0,0,0.35), ${SHADOW_SOFT}` }}
      onMouseDown={e => e.stopPropagation()}
    >
      {items.map((item, i) => {
        if (item.kind === 'separator') return <div key={i} className="my-1 h-px" style={{ background: BORDER }} />
        return (
          <button
            key={i} type="button"
            className="flex w-full items-center gap-2 px-3 py-1.5 text-[11px] text-left"
            style={{ color: item.danger ? '#EF4444' : TEXT }}
            onMouseEnter={e => { e.currentTarget.style.background = item.danger ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.05)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            onClick={() => { item.onClick(); onClose() }}
          >
            <span style={{ color: item.danger ? '#EF4444' : TEXT_DIM, flexShrink: 0 }}>{item.icon}</span>
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Main sidebar ─────────────────────────────────────────────────────────────

export function LOPASidebar() {
  const { BORDER, CARD_BG, PANEL_BG, TEAL, TEXT, TEXT_DIM } = usePrismTheme()

  const projects         = useAppStore(s => s.projects)
  const view             = useAppStore(s => s.view)
  const navigate         = useAppStore(s => s.navigate)
  const createStudy      = useAppStore(s => s.createLOPAStudy)
  const renameStudy      = useAppStore(s => s.renameLOPAStudy)
  const deleteStudy      = useAppStore(s => s.deleteLOPAStudy)
  const duplicateStudy   = useAppStore(s => s.duplicateLOPAStudy)

  const activeProjectId = view.type === 'lopa' ? (view.projectId ?? null) : view.type === 'lopa-params' ? view.projectId : null
  const activeStudyId   = view.type === 'lopa' ? (view.studyId   ?? null) : null
  const activeParams    = view.type === 'lopa-params' ? view.projectId : null

  const [menuOpenId,  setMenuOpenId]  = useState<string | null>(null)
  const [renamingId,  setRenamingId]  = useState<string | null>(null)

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

              {/* ⚙ Paramètres LOPA */}
              <button
                type="button"
                onClick={() => navigate({ type: 'lopa-params', projectId: project.id })}
                className="flex w-full items-center gap-2 pl-5 pr-3 py-1.5 text-left transition-colors"
                style={{
                  background: activeParams === project.id ? `${TEAL}12` : 'transparent',
                  borderBottom: `1px solid ${BORDER}40`,
                }}
              >
                <Settings2
                  size={10}
                  style={{ color: activeParams === project.id ? TEAL : `${TEXT_DIM}60`, flexShrink: 0 }}
                />
                <span
                  className="text-[10px] truncate"
                  style={{ color: activeParams === project.id ? TEAL : TEXT_DIM }}
                >
                  Paramètres LOPA
                </span>
              </button>

              {/* Studies */}
              {studies.map(study => {
                const isActive = study.id === activeStudyId
                const isRenaming = renamingId === study.id
                const menuOpen = menuOpenId === study.id

                return (
                  <div key={study.id} className="relative group/study">
                    <button
                      type="button"
                      onClick={() => navigate({ type: 'lopa', projectId: project.id, studyId: study.id })}
                      className="flex w-full items-center gap-2 pl-5 pr-2 py-1.5 text-left transition-colors"
                      style={{
                        background: isActive ? `${TEAL}12` : 'transparent',
                        borderBottom: `1px solid ${BORDER}40`,
                      }}
                    >
                      <div
                        className="h-1.5 w-1.5 rounded-full shrink-0"
                        style={{ background: isActive ? TEAL : `${TEXT_DIM}60` }}
                      />

                      {isRenaming ? (
                        <InlineRenameInput
                          initialValue={study.name}
                          onCommit={name => { renameStudy(project.id, study.id, name); setRenamingId(null) }}
                          onCancel={() => setRenamingId(null)}
                        />
                      ) : (
                        <span
                          className="flex-1 text-[10px] truncate"
                          style={{ color: isActive ? TEAL : TEXT_DIM }}
                          onDoubleClick={e => { e.stopPropagation(); setRenamingId(study.id) }}
                        >
                          {study.name}
                        </span>
                      )}

                      <span className="shrink-0 text-[9px]" style={{ color: `${TEXT_DIM}80` }}>
                        {study.scenarios.length} sc.
                      </span>

                      {/* ⋯ button */}
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          title="Actions"
                          onClick={e => { e.stopPropagation(); setMenuOpenId(menuOpen ? null : study.id) }}
                          className="flex h-5 w-5 items-center justify-center rounded transition-colors opacity-0 group-hover/study:opacity-60 hover:!opacity-100"
                          style={{ color: TEXT_DIM }}
                        >
                          <MoreHorizontal size={11} />
                        </button>

                        {menuOpen && (
                          <StudyContextMenu
                            onClose={() => setMenuOpenId(null)}
                            items={[
                              {
                                kind: 'action',
                                label: 'Renommer',
                                icon: <Pencil size={11} />,
                                onClick: () => setRenamingId(study.id),
                              },
                              {
                                kind: 'action',
                                label: 'Dupliquer',
                                icon: <Copy size={11} />,
                                onClick: () => {
                                  const newId = duplicateStudy(project.id, study.id)
                                  navigate({ type: 'lopa', projectId: project.id, studyId: newId })
                                },
                              },
                              {
                                kind: 'action',
                                label: 'Exporter PDF',
                                icon: <Download size={11} />,
                                onClick: () => { void exportLOPAReportPdf(project, study) },
                              },
                              { kind: 'separator' },
                              {
                                kind: 'action',
                                label: 'Supprimer',
                                icon: <Trash2 size={11} />,
                                danger: true,
                                onClick: () => {
                                  deleteStudy(project.id, study.id)
                                  if (isActive) navigate({ type: 'lopa', projectId: project.id })
                                },
                              },
                            ]}
                          />
                        )}
                      </div>
                    </button>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
