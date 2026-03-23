import { useEffect, useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { buildDocBlockId, useDocsNavigation } from '@/components/docs/DocsNavigation'
import {
  SidebarBody,
  SidebarSectionTitle,
  sidebarHoverIn,
  sidebarHoverOut,
  sidebarPressDown,
  sidebarPressUp,
} from '@/components/layout/SidebarPrimitives'
import { usePrismTheme } from '@/styles/usePrismTheme'

export function DocsSidebar() {
  const { activeChapter, activeBlock, groupedDocs, scrollToChapter, scrollToBlock } = useDocsNavigation()
  const {
    BORDER,
    PAGE_BG,
    SHADOW_CARD,
    SHADOW_SOFT,
    SURFACE,
    TEAL,
    TEXT,
    TEXT_DIM,
  } = usePrismTheme()

  const chapterToGroup = useMemo(() => {
    const map = new Map<string, string>()
    groupedDocs.forEach(group => {
      group.chapters.forEach(chapter => {
        map.set(chapter.id, group.id)
      })
    })
    return map
  }, [groupedDocs])

  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(groupedDocs.map(group => group.id)))

  const activeGroupId = chapterToGroup.get(activeChapter) ?? groupedDocs[0]?.id ?? ''
  const allGroupsOpen = groupedDocs.length > 0 && groupedDocs.every(group => openGroups.has(group.id))

  useEffect(() => {
    if (!activeGroupId) return
    setOpenGroups(prev => {
      if (prev.has(activeGroupId)) return prev
      const next = new Set(prev)
      next.add(activeGroupId)
      return next
    })
  }, [activeGroupId])

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  const toggleAllGroups = () => {
    setOpenGroups(allGroupsOpen ? new Set<string>() : new Set(groupedDocs.map(group => group.id)))
  }

  return (
    <SidebarBody className="pb-4">
      <div className="mb-3 flex items-center justify-between gap-3 px-2">
        <SidebarSectionTitle className="mb-0 px-0">Table des matières</SidebarSectionTitle>
        <button
          type="button"
          onClick={toggleAllGroups}
          className="rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] transition-[background-color,color,border-color,box-shadow,transform] duration-150 ease-out"
          style={{
            borderColor: `${BORDER}C8`,
            background: PAGE_BG,
            color: TEXT_DIM,
            boxShadow: 'none',
            transform: 'translateY(0) scale(1)',
          }}
          onMouseEnter={e => sidebarHoverIn(e.currentTarget, {
            background: SURFACE,
            borderColor: `${BORDER}D8`,
            boxShadow: SHADOW_SOFT,
            color: TEXT,
          })}
          onMouseLeave={e => {
            sidebarHoverOut(e.currentTarget, {
              background: PAGE_BG,
              borderColor: `${BORDER}C8`,
              boxShadow: 'none',
              color: TEXT_DIM,
            })
            sidebarPressUp(e.currentTarget, 'none')
          }}
          onPointerDown={e => sidebarPressDown(e.currentTarget, SHADOW_SOFT)}
          onPointerUp={e => sidebarPressUp(e.currentTarget, SHADOW_SOFT)}
          onPointerCancel={e => sidebarPressUp(e.currentTarget, 'none')}
        >
          {allGroupsOpen ? 'Réduire' : 'Tout déployer'}
        </button>
      </div>

      <div className="space-y-1">
        {groupedDocs.map((group, groupIndex) => {
          const groupOpen = openGroups.has(group.id)
          const groupActive = activeGroupId === group.id

          return (
            <div
              key={group.id}
              className={groupIndex > 0 ? 'mt-1' : undefined}
            >
              {/* ── Group header ─────────────────────────────────── */}
              <button
                type="button"
                aria-expanded={groupOpen}
                onClick={() => toggleGroup(group.id)}
                className="relative flex w-full items-center gap-2 overflow-hidden rounded-md px-2 py-1.5 text-left transition-[background-color,color,border-color,box-shadow,transform] duration-150 ease-out"
                style={{
                  color: groupActive || groupOpen ? TEXT : TEXT_DIM,
                  background: groupOpen ? SURFACE : 'transparent',
                  border: `1px solid ${groupOpen ? (groupActive ? `${TEAL}24` : `${BORDER}D0`) : 'transparent'}`,
                  boxShadow: groupOpen ? SHADOW_CARD : 'none',
                  transform: 'translateY(0) scale(1)',
                }}
                onMouseEnter={e => {
                  if (!groupOpen) {
                    sidebarHoverIn(e.currentTarget, {
                      background: PAGE_BG,
                      borderColor: `${BORDER}D0`,
                      boxShadow: SHADOW_SOFT,
                      color: TEXT,
                    })
                  }
                }}
                onMouseLeave={e => {
                  if (!groupOpen) {
                    sidebarHoverOut(e.currentTarget, {
                      background: 'transparent',
                      borderColor: 'transparent',
                      boxShadow: 'none',
                      color: TEXT_DIM,
                    })
                  }
                  sidebarPressUp(e.currentTarget, groupOpen ? SHADOW_CARD : 'none')
                }}
                onPointerDown={e => sidebarPressDown(e.currentTarget, SHADOW_SOFT)}
                onPointerUp={e => sidebarPressUp(e.currentTarget, groupOpen ? SHADOW_CARD : SHADOW_SOFT)}
                onPointerCancel={e => sidebarPressUp(e.currentTarget, groupOpen ? SHADOW_CARD : 'none')}
              >
                {/* active bar */}
                <div
                  className="pointer-events-none absolute left-0 top-1 bottom-1 w-0.5 rounded-full transition-[opacity,transform] duration-150"
                  style={{
                    background: TEAL,
                    opacity: groupActive ? 1 : 0,
                    transform: `scaleY(${groupActive ? 1 : 0.5})`,
                  }}
                />
                <ChevronRight
                  size={13}
                  className="shrink-0 transition-transform duration-200"
                  style={{ color: groupOpen ? TEAL : TEXT_DIM, transform: groupOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
                />
                {/* group name — large + bold, then chapter count inline */}
                <span className="flex-1 truncate text-[13px] font-bold tracking-wide" style={{ color: groupOpen ? TEXT : TEXT_DIM }}>
                  {group.label}
                </span>
                <span
                  className="inline-flex shrink-0 items-center justify-center rounded-full border px-1.5 py-0.5 text-[9px] font-bold font-mono"
                  style={{
                    borderColor: groupOpen ? `${TEAL}28` : `${BORDER}A8`,
                    background: groupOpen ? `${TEAL}0E` : PAGE_BG,
                    color: groupOpen ? TEAL : TEXT_DIM,
                  }}
                >
                  {group.chapters.length} ch.
                </span>
              </button>

              {/* ── Chapter list ─────────────────────────────────── */}
              <div
                className="overflow-hidden transition-[max-height,opacity,transform,padding] duration-200"
                style={{
                  maxHeight: groupOpen ? `${group.chapters.length * 200 + 240}px` : '0px',
                  opacity: groupOpen ? 1 : 0,
                  transform: groupOpen ? 'translateY(0)' : 'translateY(-6px)',
                  pointerEvents: groupOpen ? 'auto' : 'none',
                  paddingTop: groupOpen ? '4px' : '0px',
                  paddingBottom: groupOpen ? '4px' : '0px',
                  transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              >
                <div className="relative pl-3">
                  {/* vertical rail */}
                  <div className="absolute left-[13px] top-0 bottom-0 w-px" style={{ background: `${BORDER}55` }} />

                  <div className="space-y-0.5 py-1">
                    {group.chapters.map((chapter, chapterIndex) => {
                      const chapterActive = activeChapter === chapter.id
                      const blocksVisible = chapterActive

                      return (
                        <div key={chapter.id}>
                          {/* chapter row */}
                          <button
                            type="button"
                            onClick={() => scrollToChapter(chapter.id)}
                            className="relative flex w-full items-center gap-2 overflow-hidden rounded-md px-2 py-1.5 text-left transition-[background-color,color,border-color,box-shadow,transform] duration-150 ease-out"
                            style={{
                              background: chapterActive ? SURFACE : 'transparent',
                              border: `1px solid ${chapterActive ? `${TEAL}24` : 'transparent'}`,
                              boxShadow: chapterActive ? SHADOW_SOFT : 'none',
                              transform: 'translateY(0) scale(1)',
                            }}
                            onMouseEnter={e => {
                              if (!chapterActive) {
                                sidebarHoverIn(e.currentTarget, {
                                  background: PAGE_BG,
                                  borderColor: `${BORDER}D0`,
                                  boxShadow: SHADOW_SOFT,
                                  color: TEXT,
                                })
                              }
                            }}
                            onMouseLeave={e => {
                              if (!chapterActive) {
                                sidebarHoverOut(e.currentTarget, {
                                  background: 'transparent',
                                  borderColor: 'transparent',
                                  boxShadow: 'none',
                                  color: TEXT_DIM,
                                })
                              }
                              sidebarPressUp(e.currentTarget, chapterActive ? SHADOW_SOFT : 'none')
                            }}
                            onPointerDown={e => sidebarPressDown(e.currentTarget, SHADOW_SOFT)}
                            onPointerUp={e => sidebarPressUp(e.currentTarget, SHADOW_SOFT)}
                            onPointerCancel={e => sidebarPressUp(e.currentTarget, chapterActive ? SHADOW_SOFT : 'none')}
                          >
                            {/* active bar */}
                            <div
                              className="pointer-events-none absolute left-0 top-1 bottom-1 w-0.5 rounded-full transition-[opacity,transform] duration-150"
                              style={{
                                background: TEAL,
                                opacity: chapterActive ? 1 : 0,
                                transform: `scaleY(${chapterActive ? 1 : 0.5})`,
                              }}
                            />
                            {/* index badge */}
                            <span
                              className="inline-flex h-4 min-w-[18px] shrink-0 items-center justify-center rounded border px-1 text-[9px] font-bold font-mono"
                              style={{
                                borderColor: chapterActive ? `${TEAL}30` : `${BORDER}90`,
                                background: chapterActive ? `${TEAL}12` : 'transparent',
                                color: chapterActive ? TEAL : TEXT_DIM,
                              }}
                            >
                              {String(chapterIndex + 1).padStart(2, '0')}
                            </span>
                            {/* icon */}
                            <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center" style={{ color: chapterActive ? TEAL : TEXT_DIM }}>
                              <chapter.Icon size={13} />
                            </span>
                            {/* title */}
                            <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium leading-snug" style={{ color: chapterActive ? TEXT : TEXT_DIM }}>
                              {chapter.title}
                            </span>
                            {/* block count pill */}
                            <span
                              className="inline-flex shrink-0 items-center justify-center rounded-full border px-1.5 py-0.5 text-[9px] font-bold font-mono"
                              style={{
                                borderColor: chapterActive ? `${TEAL}28` : `${BORDER}70`,
                                background: chapterActive ? `${TEAL}10` : 'transparent',
                                color: chapterActive ? TEAL : TEXT_DIM,
                              }}
                            >
                              {chapter.blocks.length}
                            </span>
                          </button>

                          {/* ── Block sub-list (active chapter only) ── */}
                          <div
                            className="overflow-hidden border-l pl-2.5 transition-[max-height,opacity,transform,padding] duration-200"
                            style={{
                              borderColor: `${TEAL}30`,
                              maxHeight: blocksVisible ? `${chapter.blocks.length * 36 + 12}px` : '0px',
                              opacity: blocksVisible ? 1 : 0,
                              transform: blocksVisible ? 'translateY(0)' : 'translateY(-4px)',
                              pointerEvents: blocksVisible ? 'auto' : 'none',
                              paddingTop: blocksVisible ? '3px' : '0px',
                              paddingBottom: blocksVisible ? '3px' : '0px',
                              transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
                            }}
                          >
                            {chapter.blocks.map((block, blockIndex) => {
                              const blockId = buildDocBlockId(chapter.id, block, blockIndex)
                              const blockActive = activeBlock === blockId
                              return (
                                <button
                                  key={blockId}
                                  type="button"
                                  onClick={() => scrollToBlock(chapter.id, blockId)}
                                  className="relative flex w-full items-center gap-2 overflow-hidden rounded px-2 py-1 text-left transition-[background-color,color,border-color,box-shadow] duration-150 ease-out"
                                  style={{
                                    background: blockActive ? `${TEAL}0C` : 'transparent',
                                    color: blockActive ? TEXT : TEXT_DIM,
                                  }}
                                  onMouseEnter={e => {
                                    if (!blockActive) {
                                      Object.assign(e.currentTarget.style, { background: PAGE_BG, color: TEXT })
                                    }
                                  }}
                                  onMouseLeave={e => {
                                    if (!blockActive) {
                                      Object.assign(e.currentTarget.style, { background: 'transparent', color: TEXT_DIM })
                                    }
                                  }}
                                >
                                  <div
                                    className="pointer-events-none absolute left-0 top-1 bottom-1 w-0.5 rounded-full transition-[opacity] duration-150"
                                    style={{ background: TEAL, opacity: blockActive ? 1 : 0 }}
                                  />
                                  <span
                                    className="shrink-0 text-[9px] font-bold font-mono tabular-nums"
                                    style={{ color: blockActive ? TEAL : `${TEXT_DIM}88`, minWidth: 14 }}
                                  >
                                    {blockIndex + 1}
                                  </span>
                                  <span className="truncate text-[11.5px] leading-snug">{block.title}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </SidebarBody>
  )
}
