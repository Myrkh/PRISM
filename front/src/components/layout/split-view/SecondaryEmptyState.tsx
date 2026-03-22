/**
 * split-view/SecondaryEmptyState.tsx
 *
 * Welcome screen for the empty secondary pane.
 * Shows the PRISM logo + a SIF picker grouped by project.
 * Selecting a SIF calls loadSIFInSecondSlot().
 */
import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { usePrismTheme } from '@/styles/usePrismTheme'

export function SecondaryEmptyState() {
  const { BORDER, CARD_BG, PAGE_BG, PANEL_BG, TEAL, TEXT, TEXT_DIM, SHADOW_SOFT, isDark } = usePrismTheme()
  const projects           = useAppStore(s => s.projects)
  const loadSIFInSecondSlot = useAppStore(s => s.loadSIFInSecondSlot)

  // Which project group is expanded (all collapsed by default)
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(
    projects.length === 1 ? projects[0].id : null,
  )

  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-8 px-6 py-10"
      style={{ background: PAGE_BG }}
    >
      {/* PRISM identity */}
      <div className="flex flex-col items-center gap-3">
        <div
          className="relative flex h-14 w-14 items-center justify-center rounded-2xl border"
          style={{
            background: isDark ? '#0F151D' : '#F4F7FA',
            borderColor: BORDER,
            boxShadow: SHADOW_SOFT,
          }}
        >
          <div
            className="absolute inset-0 rounded-2xl blur-xl"
            style={{ background: `${TEAL}22` }}
          />
          <img src="/favicon2.png" alt="PRISM" className="relative h-9 w-9 object-contain" />
        </div>
        <p className="text-[11px] font-black tracking-[0.2em]" style={{ color: TEXT_DIM }}>
          PRISM
        </p>
      </div>

      {/* Instruction */}
      <p className="text-center text-[13px]" style={{ color: TEXT_DIM }}>
        Sélectionnez une SIF à comparer
      </p>

      {/* SIF picker */}
      {projects.length === 0 ? (
        <p className="text-[12px]" style={{ color: TEXT_DIM }}>Aucun projet disponible</p>
      ) : (
        <div
          className="w-full max-w-[280px] overflow-hidden rounded-xl border"
          style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_SOFT, maxHeight: 320, overflowY: 'auto' }}
        >
          {projects.map((project, pi) => {
            const isExpanded = expandedProjectId === project.id
            return (
              <div key={project.id}>
                {/* Project header */}
                {pi > 0 && <div className="h-px" style={{ background: BORDER }} />}
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors"
                  style={{ background: isExpanded ? `${TEAL}0A` : 'transparent' }}
                  onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = PAGE_BG }}
                  onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = 'transparent' }}
                  onClick={() => setExpandedProjectId(isExpanded ? null : project.id)}
                >
                  <ChevronRight
                    size={12}
                    style={{
                      color: TEAL,
                      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.15s ease',
                      flexShrink: 0,
                    }}
                  />
                  <span
                    className="truncate text-[11px] font-bold uppercase tracking-widest"
                    style={{ color: isExpanded ? TEAL : TEXT_DIM }}
                  >
                    {project.name}
                  </span>
                  <span
                    className="ml-auto shrink-0 text-[10px]"
                    style={{ color: TEXT_DIM }}
                  >
                    {project.sifs.length}
                  </span>
                </button>

                {/* SIF list */}
                {isExpanded && project.sifs.map((sif, si) => (
                  <div key={sif.id}>
                    {si > 0 && <div className="mx-3 h-px" style={{ background: BORDER }} />}
                    <button
                      type="button"
                      className="flex w-full items-start gap-2.5 px-4 py-2 text-left transition-colors"
                      style={{ background: 'transparent' }}
                      onMouseEnter={e => { e.currentTarget.style.background = PAGE_BG }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                      onClick={() => loadSIFInSecondSlot(project.id, sif.id)}
                    >
                      <span
                        className="mt-0.5 shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase"
                        style={{ background: `${TEAL}18`, color: TEAL }}
                      >
                        {sif.sifNumber}
                      </span>
                      <span
                        className="truncate text-[12px]"
                        style={{ color: sif.title ? TEXT : TEXT_DIM }}
                      >
                        {sif.title || 'Sans titre'}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
