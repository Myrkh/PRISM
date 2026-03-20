import { useEffect, useMemo, useState } from 'react'
import { BookOpenText, ChevronRight } from 'lucide-react'
import { buildDocBlockId, useDocsNavigation } from '@/components/docs/DocsNavigation'
import {
  SidebarBody,
  SidebarSectionTitle,
  sidebarHoverIn,
  sidebarHoverOut,
  sidebarPressDown,
  sidebarPressUp,
} from '@/components/layout/SidebarPrimitives'
import { cn } from '@/lib/utils'
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
      <div className="mb-2 flex items-center justify-between gap-3 px-2">
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

      <div className="space-y-2">
        {groupedDocs.map((group, groupIndex) => {
          const groupOpen = openGroups.has(group.id)
          const groupActive = activeGroupId === group.id
          const groupBlockCount = group.chapters.reduce((sum, chapter) => sum + chapter.blocks.length, 0)

          return (
            <div
              key={group.id}
              className={cn(groupIndex > 0 && 'pt-2')}
              style={groupIndex > 0 ? { borderTop: `1px solid ${BORDER}33` } : undefined}
            >
              <button
                type="button"
                aria-expanded={groupOpen}
                onClick={() => toggleGroup(group.id)}
                className="relative flex w-full items-center gap-2 overflow-hidden rounded-md px-2 py-2 text-left transition-[background-color,color,border-color,box-shadow,transform] duration-150 ease-out"
                style={{
                  color: groupActive || groupOpen ? TEXT : TEXT_DIM,
                  background: groupActive || groupOpen ? SURFACE : 'transparent',
                  border: `1px solid ${(groupActive || groupOpen) ? (groupActive ? `${TEAL}24` : `${BORDER}D0`) : 'transparent'}`,
                  boxShadow: groupActive || groupOpen ? SHADOW_CARD : 'none',
                  transform: 'translateY(0) scale(1)',
                }}
                onMouseEnter={e => {
                  if (!groupActive && !groupOpen) {
                    sidebarHoverIn(e.currentTarget, {
                      background: PAGE_BG,
                      borderColor: `${BORDER}D0`,
                      boxShadow: SHADOW_SOFT,
                      color: TEXT,
                    })
                  }
                }}
                onMouseLeave={e => {
                  if (!groupActive && !groupOpen) {
                    sidebarHoverOut(e.currentTarget, {
                      background: 'transparent',
                      borderColor: 'transparent',
                      boxShadow: 'none',
                      color: TEXT_DIM,
                    })
                  }
                  sidebarPressUp(e.currentTarget, groupActive || groupOpen ? SHADOW_CARD : 'none')
                }}
                onPointerDown={e => sidebarPressDown(e.currentTarget, SHADOW_SOFT)}
                onPointerUp={e => sidebarPressUp(e.currentTarget, groupActive || groupOpen ? SHADOW_CARD : SHADOW_SOFT)}
                onPointerCancel={e => sidebarPressUp(e.currentTarget, groupActive || groupOpen ? SHADOW_CARD : 'none')}
              >
                <div
                  className="pointer-events-none absolute left-0 top-1 bottom-1 w-0.5 rounded-full transition-[opacity,transform] duration-150 ease-out"
                  style={{
                    background: TEAL,
                    opacity: groupActive || groupOpen ? 1 : 0,
                    transform: `translateX(${groupActive || groupOpen ? '0px' : '-1px'}) scaleY(${groupActive || groupOpen ? 1 : 0.6})`,
                  }}
                />
                <ChevronRight
                  size={14}
                  className="shrink-0 transition-transform duration-200"
                  style={{ transform: groupOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
                />
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center" style={{ color: groupActive || groupOpen ? TEAL : TEXT_DIM }}>
                  <BookOpenText size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{group.label}</p>
                  <p className="truncate text-[10px] leading-relaxed" style={{ color: TEXT_DIM }}>{group.summary}</p>
                </div>
                <span
                  className="inline-flex shrink-0 items-center justify-center rounded-full border px-1.5 py-0.5 text-[9px] font-bold font-mono"
                  style={{
                    borderColor: `${BORDER}A8`,
                    background: PAGE_BG,
                    color: groupActive ? TEAL : TEXT_DIM,
                  }}
                >
                  {group.chapters.length}/{groupBlockCount}
                </span>
              </button>

              <div
                className="overflow-hidden transition-[max-height,opacity,transform,padding] duration-200"
                style={{
                  maxHeight: groupOpen ? `${Math.max(84, group.chapters.length * 96 + 240)}px` : '0px',
                  opacity: groupOpen ? 1 : 0,
                  transform: groupOpen ? 'translateY(0)' : 'translateY(-6px)',
                  pointerEvents: groupOpen ? 'auto' : 'none',
                  paddingTop: groupOpen ? '4px' : '0px',
                  paddingBottom: groupOpen ? '2px' : '0px',
                  transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              >
                <div className="relative pl-8">
                  <div className="absolute left-[15px] top-0 bottom-0 w-px" style={{ background: `${BORDER}55` }} />
                  <div className="space-y-1 py-1">
                    {group.chapters.map((chapter, chapterIndex) => {
                      const chapterActive = activeChapter === chapter.id
                      return (
                        <div key={chapter.id} className="space-y-1">
                          <button
                            type="button"
                            onClick={() => scrollToChapter(chapter.id)}
                            className="relative flex w-full items-start gap-2 overflow-hidden rounded-md px-2.5 py-2 text-left transition-[background-color,color,border-color,box-shadow,transform] duration-150 ease-out"
                            style={{
                              background: chapterActive ? SURFACE : 'transparent',
                              border: `1px solid ${chapterActive ? `${TEAL}24` : 'transparent'}`,
                              boxShadow: chapterActive ? SHADOW_SOFT : 'none',
                              color: chapterActive ? TEXT : TEXT_DIM,
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
                            onPointerUp={e => sidebarPressUp(e.currentTarget, chapterActive ? SHADOW_SOFT : SHADOW_SOFT)}
                            onPointerCancel={e => sidebarPressUp(e.currentTarget, chapterActive ? SHADOW_SOFT : 'none')}
                          >
                            <div
                              className="pointer-events-none absolute left-0 top-1 bottom-1 w-0.5 rounded-full transition-[opacity,transform] duration-150 ease-out"
                              style={{
                                background: TEAL,
                                opacity: chapterActive ? 1 : 0,
                                transform: `translateX(${chapterActive ? '0px' : '-1px'}) scaleY(${chapterActive ? 1 : 0.6})`,
                              }}
                            />
                            <span
                              className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full border px-1 text-[9px] font-bold font-mono transition-[background-color,color,border-color,box-shadow,transform] duration-150 ease-out"
                              style={{
                                borderColor: chapterActive ? `${TEAL}28` : `${BORDER}A0`,
                                background: chapterActive ? `${TEAL}10` : PAGE_BG,
                                color: chapterActive ? TEAL : TEXT_DIM,
                                boxShadow: chapterActive ? SHADOW_SOFT : 'none',
                                transform: chapterActive ? 'scale(1)' : 'scale(0.96)',
                              }}
                            >
                              {String(chapterIndex + 1).padStart(2, '0')}
                            </span>
                            <span className="mt-[1px] inline-flex h-5 w-5 shrink-0 items-center justify-center" style={{ color: chapterActive ? TEAL : TEXT_DIM }}>
                              <chapter.Icon size={14} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm leading-snug" style={{ color: TEXT }}>{chapter.title}</p>
                              <p className="mt-0.5 truncate text-[10px] leading-relaxed" style={{ color: TEXT_DIM }}>{chapter.kicker}</p>
                            </div>
                            <span
                              className="mt-0.5 inline-flex shrink-0 items-center justify-center rounded-full border px-1.5 py-0.5 text-[9px] font-bold font-mono"
                              style={{
                                borderColor: chapterActive ? `${TEAL}28` : `${BORDER}A0`,
                                background: chapterActive ? `${TEAL}10` : PAGE_BG,
                                color: chapterActive ? TEAL : TEXT_DIM,
                              }}
                            >
                              {chapter.blocks.length}
                            </span>
                          </button>

                          <div
                            className="ml-6 space-y-0.5 overflow-hidden border-l pl-3 transition-[max-height,opacity,transform,padding] duration-200"
                            style={{
                              borderColor: `${BORDER}AA`,
                              maxHeight: chapterActive ? `${chapter.blocks.length * 34 + 12}px` : '0px',
                              opacity: chapterActive ? 1 : 0,
                              transform: chapterActive ? 'translateY(0)' : 'translateY(-6px)',
                              pointerEvents: chapterActive ? 'auto' : 'none',
                              paddingTop: chapterActive ? '4px' : '0px',
                              paddingBottom: chapterActive ? '4px' : '0px',
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
                                  className="relative flex w-full items-center gap-2 overflow-hidden rounded-md px-2.5 py-1.5 text-left text-[12px] transition-[background-color,color,border-color,box-shadow,transform] duration-150 ease-out"
                                  style={{
                                    background: blockActive ? SURFACE : 'transparent',
                                    border: `1px solid ${blockActive ? `${TEAL}24` : 'transparent'}`,
                                    boxShadow: blockActive ? SHADOW_SOFT : 'none',
                                    color: blockActive ? TEXT : TEXT_DIM,
                                    transform: 'translateY(0) scale(1)',
                                  }}
                                  onMouseEnter={e => {
                                    if (!blockActive) {
                                      sidebarHoverIn(e.currentTarget, {
                                        background: PAGE_BG,
                                        borderColor: `${BORDER}D0`,
                                        boxShadow: SHADOW_SOFT,
                                        color: TEXT,
                                      })
                                    }
                                  }}
                                  onMouseLeave={e => {
                                    if (!blockActive) {
                                      sidebarHoverOut(e.currentTarget, {
                                        background: 'transparent',
                                        borderColor: 'transparent',
                                        boxShadow: 'none',
                                        color: TEXT_DIM,
                                      })
                                    }
                                    sidebarPressUp(e.currentTarget, blockActive ? SHADOW_SOFT : 'none')
                                  }}
                                  onPointerDown={e => sidebarPressDown(e.currentTarget, SHADOW_SOFT)}
                                  onPointerUp={e => sidebarPressUp(e.currentTarget, blockActive ? SHADOW_SOFT : SHADOW_SOFT)}
                                  onPointerCancel={e => sidebarPressUp(e.currentTarget, blockActive ? SHADOW_SOFT : 'none')}
                                >
                                  <div
                                    className="pointer-events-none absolute left-0 top-1 bottom-1 w-0.5 rounded-full transition-[opacity,transform] duration-150 ease-out"
                                    style={{
                                      background: TEAL,
                                      opacity: blockActive ? 1 : 0,
                                      transform: `translateX(${blockActive ? '0px' : '-1px'}) scaleY(${blockActive ? 1 : 0.6})`,
                                    }}
                                  />
                                  <span
                                    className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full border px-1 text-[9px] font-bold font-mono transition-[background-color,color,border-color,box-shadow,transform] duration-150 ease-out"
                                    style={{
                                      borderColor: blockActive ? `${TEAL}28` : `${BORDER}A0`,
                                      background: blockActive ? `${TEAL}10` : PAGE_BG,
                                      color: blockActive ? TEAL : TEXT_DIM,
                                      boxShadow: blockActive ? SHADOW_SOFT : 'none',
                                      transform: blockActive ? 'scale(1)' : 'scale(0.96)',
                                    }}
                                  >
                                    {blockIndex + 1}
                                  </span>
                                  <span className="truncate">{block.title}</span>
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
