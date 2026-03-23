/**
 * DocsWindow.tsx — PRISM Launcher
 * Standalone documentation window.
 * Layout: title bar + left TOC sidebar (260 px) + right scrollable content.
 *
 * Faithful clone of DocsSidebar + DocsWorkspace from PRISM front — same visual
 * language, same scroll-tracking logic, same block/chapter rendering.
 * Chapter data sourced via the @/docs Vite alias → no PRISM app store needed.
 */

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react'
import type { CSSProperties, RefObject } from 'react'
import { BookOpenText, ChevronRight, Download, Minus, X } from 'lucide-react'
import { alpha, colors } from '../../tokens'
import { useTheme } from '../../hooks/useTheme'
import type { ThemeTokens } from '../../hooks/useTheme'
import { DOC_CHAPTERS, DOC_GROUPS } from '@/docs/index'
import type {
  DocAction, DocBlock, DocExample, DocResolvedChapter, DocSnippet, DocVisual,
} from '@/docs/types'

// ── Grouped data (static, computed once) ──────────────────────────────────────

const GROUPED = DOC_GROUPS.map(group => ({
  ...group,
  chapters: DOC_CHAPTERS.filter(ch => ch.group === group.id),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildBlockId(chapterId: string, block: DocBlock, index: number): string {
  const slug = block.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  return `${chapterId}::${index + 1}-${slug}`
}

// ── Theme context ─────────────────────────────────────────────────────────────

const ThemeCtx = createContext<ThemeTokens>(null!)
function useT() { return useContext(ThemeCtx) }

// ── Navigation context ────────────────────────────────────────────────────────

type NavValue = {
  activeChapter:    string
  activeBlock:      string
  scrollRef:        RefObject<HTMLDivElement>
  scrollToChapter:  (id: string) => void
  scrollToBlock:    (chapterId: string, blockId: string) => void
  registerSection:  (id: string, node: HTMLElement | null) => void
  registerBlock:    (id: string, node: HTMLElement | null) => void
}
const NavCtx = createContext<NavValue>(null!)
function useNav() { return useContext(NavCtx) }

// ── InlineRichText ─────────────────────────────────────────────────────────────

function InlineRichText({ text, className, style }: {
  text: string; className?: string; style?: CSSProperties
}) {
  const t = useT()
  const parts = text.split(/(`[^`]+`)/g).filter(Boolean)
  return (
    <span className={className} style={style}>
      {parts.map((part, i) =>
        part.startsWith('`') && part.endsWith('`') ? (
          <code
            key={`c${i}`}
            className="rounded px-1.5 py-0.5 text-[0.86em] font-medium font-mono"
            style={{ border: `1px solid ${t.BORDER}`, background: t.PAGE_BG, color: t.TEXT }}
          >
            {part.slice(1, -1)}
          </code>
        ) : (
          <span key={`s${i}`}>{part}</span>
        )
      )}
    </span>
  )
}

// ── ExampleCard ────────────────────────────────────────────────────────────────

function ExampleCard({ example }: { example: DocExample }) {
  const t = useT()
  return (
    <div className="pl-4 py-1 border-l-[2px]" style={{ borderLeftColor: colors.teal }}>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] mb-2" style={{ color: colors.teal }}>
        Exemple concret
      </p>
      <p className="text-[13px] font-semibold leading-snug mb-2" style={{ color: t.TEXT }}>
        {example.title}
      </p>
      <p className="text-[13px] leading-relaxed mb-3" style={{ color: t.TEXT_DIM }}>
        <InlineRichText text={example.summary} />
      </p>
      <ol className="space-y-2">
        {example.steps.map((step, i) => (
          <li key={`step${i}`} className="flex items-start gap-2.5">
            <span className="mt-[3px] text-[11px] font-bold font-mono shrink-0 w-4" style={{ color: `${colors.teal}90` }}>
              {i + 1}.
            </span>
            <span className="text-[13px] leading-relaxed" style={{ color: t.TEXT }}>
              <InlineRichText text={step} />
            </span>
          </li>
        ))}
      </ol>
      {example.result && (
        <p className="mt-3 pt-3 text-[12px] leading-relaxed border-t"
          style={{ color: t.TEXT_DIM, borderColor: `${t.BORDER}28` }}>
          <span style={{ color: t.TEXT }}>→ </span>
          <InlineRichText text={example.result} />
        </p>
      )}
    </div>
  )
}

// ── SnippetCard ────────────────────────────────────────────────────────────────

function SnippetCard({ snippet }: { snippet: DocSnippet }) {
  const isTerminal = snippet.tone === 'terminal'
  const bg         = isTerminal ? '#0d1117' : '#131920'
  const border     = isTerminal ? 'rgba(125,211,199,0.12)' : 'rgba(255,255,255,0.07)'
  const labelColor = isTerminal ? '#7dd3c7' : '#94a3b8'
  const codeColor  = isTerminal ? '#d7fff7' : '#e2e8f0'
  return (
    <div className="rounded-lg overflow-hidden" style={{ background: bg, border: `1px solid ${border}` }}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: border }}>
        <p className="text-[11px] font-semibold font-mono" style={{ color: labelColor }}>{snippet.title}</p>
        {isTerminal && (
          <div className="flex gap-1.5">
            {['#ff5f57', '#febc2e', '#28c840'].map(c => (
              <span key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c, opacity: 0.6 }} />
            ))}
          </div>
        )}
      </div>
      <pre className="overflow-x-auto px-4 py-4 text-[12px] leading-[1.75]">
        <code style={{ color: codeColor }}>{snippet.code}</code>
      </pre>
      {snippet.caption && (
        <div className="px-4 py-2.5 border-t text-[11px] leading-relaxed"
          style={{ borderColor: border, color: 'rgba(148,163,184,0.65)' }}>
          <InlineRichText text={snippet.caption} />
        </div>
      )}
    </div>
  )
}

// ── DocActionsRow ──────────────────────────────────────────────────────────────

function DocActionsRow({ actions }: { actions: DocAction[] }) {
  const t = useT()
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2.5">
        {actions.map(action => (
          <button
            key={action.label}
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-[12.5px] font-medium transition-all duration-150 hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.99]"
            style={{ borderColor: `${colors.teal}24`, background: t.CARD_BG, color: t.TEXT, boxShadow: t.SHADOW_SOFT }}
          >
            <Download size={14} style={{ color: colors.teal }} />
            {action.label}
          </button>
        ))}
      </div>
      {actions.some(a => a.hint) && (
        <div className="space-y-1.5">
          {actions.map(a => a.hint ? (
            <p key={`${a.label}-hint`} className="text-[12px] leading-relaxed" style={{ color: t.TEXT_DIM }}>
              <InlineRichText text={a.hint} />
            </p>
          ) : null)}
        </div>
      )}
    </div>
  )
}

// ── VisualCard ─────────────────────────────────────────────────────────────────

function VisualCard({ visual, variant = 'framed' }: { visual: DocVisual; variant?: 'framed' | 'clean' }) {
  const t = useT()
  const fit         = visual.fit ?? 'cover'
  const maxHeight   = visual.maxHeight ?? (variant === 'clean' ? 560 : 360)
  const usesContain = fit === 'contain'
  return (
    <figure>
      <div
        className={variant === 'clean' ? 'overflow-hidden rounded-xl' : 'overflow-hidden rounded-xl border'}
        style={variant === 'clean'
          ? undefined
          : { borderColor: t.BORDER, background: t.PAGE_BG, boxShadow: t.SHADOW_PANEL }
        }
      >
        <div
          className={usesContain ? 'flex items-center justify-center p-3' : ''}
          style={{ maxHeight, background: usesContain ? `${t.BORDER}0A` : undefined }}
        >
          <img
            src={visual.src} alt={visual.alt} loading="lazy" className="w-full"
            style={{
              display: 'block',
              maxHeight: usesContain ? maxHeight - 24 : maxHeight,
              objectFit: fit,
              objectPosition: visual.objectPosition ?? 'center top',
            }}
          />
        </div>
      </div>
      {visual.caption && (
        <figcaption
          className={variant === 'clean' ? 'mt-2 text-[11.5px] leading-relaxed' : 'mt-2 text-[11.5px] leading-relaxed text-center'}
          style={{ color: t.TEXT_DIM }}
        >
          <InlineRichText text={visual.caption} />
        </figcaption>
      )}
    </figure>
  )
}

// ── ChapterSidebar — sticky right (highlights + section outline) ───────────────

function ChapterSidebar({ chapter }: { chapter: DocResolvedChapter }) {
  const t = useT()
  const { activeChapter, activeBlock, scrollToBlock } = useNav()
  const effectiveBlock = activeChapter === chapter.id ? activeBlock : ''
  return (
    <aside className="hidden xl:block"
      style={{ position: 'sticky', top: 24, maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
      {chapter.highlights.length > 0 && (
        <div className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] mb-3" style={{ color: colors.teal }}>
            Repères
          </p>
          <div className="space-y-3.5">
            {chapter.highlights.map((h, i) => (
              <div key={`${chapter.id}-${h.label}`}
                className={i > 0 ? 'pt-3.5 border-t' : ''}
                style={i > 0 ? { borderColor: `${t.BORDER}28` } : undefined}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] mb-1"
                  style={{ color: `${t.TEXT_DIM}80` }}>
                  {h.label}
                </p>
                <p className="text-[12.5px] font-medium leading-snug" style={{ color: t.TEXT }}>
                  <InlineRichText text={h.value} />
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className={chapter.highlights.length > 0 ? 'border-t pt-5' : ''}
        style={{ borderColor: `${t.BORDER}28` }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] mb-3" style={{ color: colors.teal }}>
          Sections
        </p>
        <nav className="space-y-0">
          {chapter.blocks.map((block, index) => {
            const blockId  = buildBlockId(chapter.id, block, index)
            const isActive = effectiveBlock === blockId
            return (
              <button key={blockId} type="button"
                onClick={() => scrollToBlock(chapter.id, blockId)}
                className="flex items-start gap-2.5 w-full text-left py-1.5">
                <span
                  className="mt-[5px] w-[5px] h-[5px] rounded-full shrink-0 transition-all duration-150"
                  style={{ background: isActive ? colors.teal : `${t.BORDER}70`, transform: isActive ? 'scale(1.4)' : 'scale(1)' }}
                />
                <span className="text-[12.5px] leading-snug transition-colors duration-150"
                  style={{ color: isActive ? t.TEXT : t.TEXT_DIM, fontWeight: isActive ? 500 : 400 }}>
                  {block.title}
                </span>
              </button>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}

// ── ChapterBlock ───────────────────────────────────────────────────────────────

function ChapterBlock({ block, blockId, index, first }: {
  block: DocBlock; blockId: string; index: number; first: boolean
}) {
  const t = useT()
  const { registerBlock } = useNav()
  const visualLayout = block.visual?.layout ?? 'aside'
  const showSplit    = Boolean(block.visual && visualLayout === 'split')
  const showStacked  = Boolean(block.visual && visualLayout === 'stacked')
  const showAside    = Boolean(block.visual && visualLayout === 'aside')
  const snippets     = block.snippets?.length ? block.snippets : block.snippet ? [block.snippet] : []
  const useAside     = showAside || (!showSplit && !showStacked && Boolean(block.example || snippets.length > 0))

  return (
    <section
      ref={node => registerBlock(blockId, node)}
      data-doc-block={blockId}
      className={!first ? 'mt-6' : ''}
      style={{ scrollMarginTop: 24 }}
    >
      <div className="rounded-xl border px-5 py-5 md:px-6 md:py-6"
        style={{ borderColor: t.BORDER, background: t.PAGE_BG, boxShadow: t.SHADOW_PANEL }}>
        <div className={
          showSplit
            ? 'grid gap-8 lg:grid-cols-[minmax(0,1fr),minmax(340px,440px)] lg:items-start lg:gap-10'
            : useAside
              ? 'grid gap-8 xl:grid-cols-[minmax(0,1fr),300px] xl:items-start'
              : ''
        }>
          <div>
            {/* Number divider */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[11px] font-bold font-mono tracking-widest"
                style={{ color: colors.teal, opacity: 0.7 }}>
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="flex-1 h-px" style={{ background: `${t.BORDER}40` }} />
            </div>
            <h3 className="text-[21px] font-semibold tracking-tight leading-snug mb-4" style={{ color: t.TEXT }}>
              {block.title}
            </h3>
            <p className="text-[14.5px] leading-[1.85] max-w-[620px]" style={{ color: t.TEXT_DIM }}>
              <InlineRichText text={block.intro} />
            </p>
            {block.actions && block.actions.length > 0 && (
              <div className="mt-5"><DocActionsRow actions={block.actions} /></div>
            )}
            {block.points.length > 0 && (
              <ul className="mt-5 space-y-0">
                {block.points.map((point, i) => (
                  <li key={`p${i}`}
                    className={`flex items-start gap-3 py-3 ${i < block.points.length - 1 ? 'border-b' : ''}`}
                    style={{ borderColor: `${t.BORDER}28` }}>
                    <span className="mt-[9px] w-[4px] h-[4px] rounded-full shrink-0"
                      style={{ background: `${colors.teal}70` }} />
                    <span className="text-[14px] leading-[1.8]" style={{ color: t.TEXT }}>
                      <InlineRichText text={point} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {showStacked && block.visual && (
              <div className="mt-6"><VisualCard visual={block.visual} /></div>
            )}
            {(showSplit || showStacked) && (block.example || snippets.length > 0) && (
              <div className="mt-6 space-y-5">
                {block.example && <ExampleCard example={block.example} />}
                {snippets.map(s => <SnippetCard key={s.title} snippet={s} />)}
              </div>
            )}
          </div>
          {showSplit && block.visual && (
            <div className="lg:pt-1 lg:self-start">
              <VisualCard visual={block.visual} variant="clean" />
            </div>
          )}
          {useAside && (
            <aside className="space-y-5">
              {showAside && block.visual && <VisualCard visual={block.visual} />}
              {block.example && <ExampleCard example={block.example} />}
              {snippets.map(s => <SnippetCard key={s.title} snippet={s} />)}
            </aside>
          )}
        </div>
      </div>
    </section>
  )
}

// ── ChapterArticle ─────────────────────────────────────────────────────────────

function ChapterArticle({ chapter, chapterIndex, chapterCount }: {
  chapter: DocResolvedChapter; chapterIndex: number; chapterCount: number
}) {
  const t = useT()
  const { registerSection } = useNav()
  return (
    <article
      ref={node => registerSection(chapter.id, node)}
      data-doc-chapter={chapter.id}
      style={{ scrollMarginTop: 24 }}
    >
      <div className="px-8 py-7 md:px-10 border-b" style={{ borderColor: `${t.BORDER}40` }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] font-semibold" style={{ color: colors.tealDim }}>{chapter.kicker}</span>
          <span style={{ color: `${t.TEXT_DIM}30` }}>·</span>
          <span className="text-[11px]" style={{ color: `${t.TEXT_DIM}40` }}>{chapterIndex + 1} / {chapterCount}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ color: colors.teal, background: `${colors.teal}10`, border: `1px solid ${colors.teal}1E` }}>
            <chapter.Icon size={15} />
          </span>
          <h2 className="text-[26px] font-semibold tracking-tight" style={{ color: t.TEXT }}>
            {chapter.title}
          </h2>
        </div>
        <p className="mt-3 text-[14.5px] leading-[1.8] max-w-[580px]" style={{ color: t.TEXT_DIM }}>
          <InlineRichText text={chapter.summary} />
        </p>
      </div>
      <div className="grid xl:grid-cols-[minmax(0,1fr),200px] gap-10 px-8 py-8 md:px-10 md:py-10 xl:items-start">
        <div>
          {chapter.blocks.map((block, index) => (
            <ChapterBlock
              key={`${chapter.id}-${block.title}`}
              block={block}
              blockId={buildBlockId(chapter.id, block, index)}
              index={index}
              first={index === 0}
            />
          ))}
        </div>
        <ChapterSidebar chapter={chapter} />
      </div>
    </article>
  )
}

// ── Left TOC sidebar ───────────────────────────────────────────────────────────

function DocsToc() {
  const t = useT()
  const { activeChapter, scrollToChapter, scrollToBlock } = useNav()

  const chapterToGroup = useMemo(() => {
    const map = new Map<string, string>()
    GROUPED.forEach(g => g.chapters.forEach(ch => map.set(ch.id, g.id)))
    return map
  }, [])

  const activeGroupId = chapterToGroup.get(activeChapter) ?? GROUPED[0]?.id ?? ''
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(GROUPED.map(g => g.id)))
  const allOpen = GROUPED.every(g => openGroups.has(g.id))

  useEffect(() => {
    if (!activeGroupId) return
    setOpenGroups(prev => prev.has(activeGroupId) ? prev : new Set([...prev, activeGroupId]))
  }, [activeGroupId])

  const toggleGroup = (id: string) =>
    setOpenGroups(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  return (
    <div className="flex flex-col overflow-hidden border-r shrink-0"
      style={{ width: 260, borderColor: t.BORDER, background: t.PANEL_BG }}>

      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b px-3 py-2.5"
        style={{ borderColor: t.BORDER }}>
        <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: t.TEXT_DIM }}>
          Table des matières
        </p>
        <button type="button"
          onClick={() => setOpenGroups(allOpen ? new Set() : new Set(GROUPED.map(g => g.id)))}
          className="rounded border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] transition-opacity hover:opacity-80"
          style={{ borderColor: t.BORDER, background: 'transparent', color: t.TEXT_DIM }}>
          {allOpen ? 'Réduire' : 'Tout déployer'}
        </button>
      </div>

      {/* Nav tree */}
      <div className="flex-1 overflow-y-auto space-y-1 px-2 py-2">
        {GROUPED.map((group, gi) => {
          const groupOpen   = openGroups.has(group.id)
          const groupActive = activeGroupId === group.id
          return (
            <div key={group.id} className={gi > 0 ? 'mt-1' : undefined}>

              {/* Group header */}
              <button type="button" onClick={() => toggleGroup(group.id)}
                className="relative flex w-full items-center gap-2 overflow-hidden rounded-md px-2 py-1.5 text-left transition-all duration-150"
                style={{
                  background:  groupOpen ? t.CARD_BG : 'transparent',
                  border:      `1px solid ${groupOpen ? (groupActive ? `${colors.teal}24` : `${t.BORDER}D0`) : 'transparent'}`,
                  boxShadow:   groupOpen ? t.SHADOW_CARD : 'none',
                }}>
                <div className="pointer-events-none absolute left-0 top-1 bottom-1 w-0.5 rounded-full transition-all duration-150"
                  style={{ background: colors.teal, opacity: groupActive ? 1 : 0, transform: `scaleY(${groupActive ? 1 : 0.5})` }} />
                <ChevronRight size={13} className="shrink-0 transition-transform duration-200"
                  style={{ color: groupOpen ? colors.teal : t.TEXT_DIM, transform: groupOpen ? 'rotate(90deg)' : 'rotate(0deg)' }} />
                <span className="flex-1 truncate text-[13px] font-bold tracking-wide"
                  style={{ color: groupOpen ? t.TEXT : t.TEXT_DIM }}>
                  {group.label}
                </span>
                <span className="inline-flex shrink-0 items-center justify-center rounded-full border px-1.5 py-0.5 text-[9px] font-bold font-mono"
                  style={{
                    borderColor: groupOpen ? `${colors.teal}28` : `${t.BORDER}A8`,
                    background:  groupOpen ? `${colors.teal}0E` : t.PAGE_BG,
                    color:       groupOpen ? colors.teal : t.TEXT_DIM,
                  }}>
                  {group.chapters.length} ch.
                </span>
              </button>

              {/* Chapter list (collapsible) */}
              <div className="overflow-hidden transition-all duration-200"
                style={{
                  maxHeight:              groupOpen ? `${group.chapters.length * 200 + 240}px` : '0px',
                  opacity:                groupOpen ? 1 : 0,
                  transform:              groupOpen ? 'translateY(0)' : 'translateY(-6px)',
                  pointerEvents:          groupOpen ? 'auto' : 'none',
                  paddingTop:             groupOpen ? '4px' : '0px',
                  paddingBottom:          groupOpen ? '4px' : '0px',
                  transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
                }}>
                <div className="relative pl-7">
                  {/* Vertical rail */}
                  <div className="absolute left-[13px] top-0 bottom-0 w-px"
                    style={{ background: `${t.BORDER}55` }} />
                  <div className="space-y-0.5 py-1">
                    {group.chapters.map((chapter, ci) => {
                      const chapterActive = activeChapter === chapter.id
                      return (
                        <div key={chapter.id}>
                          {/* Chapter row */}
                          <button type="button" onClick={() => scrollToChapter(chapter.id)}
                            className="relative flex w-full items-center gap-2 overflow-hidden rounded-md px-2 py-1.5 text-left transition-all duration-150"
                            style={{
                              background: chapterActive ? t.CARD_BG : 'transparent',
                              border:     `1px solid ${chapterActive ? `${colors.teal}24` : 'transparent'}`,
                              boxShadow:  chapterActive ? t.SHADOW_SOFT : 'none',
                            }}>
                            <div className="pointer-events-none absolute left-0 top-1 bottom-1 w-0.5 rounded-full transition-all duration-150"
                              style={{ background: colors.teal, opacity: chapterActive ? 1 : 0, transform: `scaleY(${chapterActive ? 1 : 0.5})` }} />
                            {/* Index badge */}
                            <span className="inline-flex h-4 min-w-[18px] shrink-0 items-center justify-center rounded border px-1 text-[9px] font-bold font-mono"
                              style={{
                                borderColor: chapterActive ? `${colors.teal}30` : `${t.BORDER}90`,
                                background:  chapterActive ? `${colors.teal}12` : 'transparent',
                                color:       chapterActive ? colors.teal : t.TEXT_DIM,
                              }}>
                              {String(ci + 1).padStart(2, '0')}
                            </span>
                            {/* Icon */}
                            <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center"
                              style={{ color: chapterActive ? colors.teal : t.TEXT_DIM }}>
                              <chapter.Icon size={13} />
                            </span>
                            {/* Title */}
                            <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium leading-snug"
                              style={{ color: chapterActive ? t.TEXT : t.TEXT_DIM }}>
                              {chapter.title}
                            </span>
                            {/* Block count */}
                            <span className="inline-flex shrink-0 items-center justify-center rounded-full border px-1.5 py-0.5 text-[9px] font-bold font-mono"
                              style={{
                                borderColor: chapterActive ? `${colors.teal}28` : `${t.BORDER}70`,
                                background:  chapterActive ? `${colors.teal}10` : 'transparent',
                                color:       chapterActive ? colors.teal : t.TEXT_DIM,
                              }}>
                              {chapter.blocks.length}
                            </span>
                          </button>

                          {/* Block sub-list */}
                          <div className="ml-5 overflow-hidden border-l pl-2.5 transition-all duration-200"
                            style={{
                              borderColor:              `${colors.teal}30`,
                              maxHeight:                chapterActive ? `${chapter.blocks.length * 36 + 12}px` : '0px',
                              opacity:                  chapterActive ? 1 : 0,
                              transform:                chapterActive ? 'translateY(0)' : 'translateY(-4px)',
                              pointerEvents:            chapterActive ? 'auto' : 'none',
                              paddingTop:               chapterActive ? '3px' : '0px',
                              paddingBottom:            chapterActive ? '3px' : '0px',
                              transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
                            }}>
                            {chapter.blocks.map((block, bi) => {
                              const blockId    = buildBlockId(chapter.id, block, bi)
                              // Note: block active state is read from NavCtx in ChapterSidebar;
                              // here we simply render the nav item
                              return (
                                <button key={blockId} type="button"
                                  onClick={() => scrollToBlock(chapter.id, blockId)}
                                  className="relative flex w-full items-center gap-2 overflow-hidden rounded px-2 py-1 text-left transition-all duration-150"
                                  style={{ color: t.TEXT_DIM }}
                                  onMouseEnter={e => Object.assign(e.currentTarget.style, { background: t.PAGE_BG, color: t.TEXT })}
                                  onMouseLeave={e => Object.assign(e.currentTarget.style, { background: 'transparent', color: t.TEXT_DIM })}
                                >
                                  <span className="shrink-0 text-[9px] font-bold font-mono tabular-nums"
                                    style={{ color: `${t.TEXT_DIM}88`, minWidth: 14 }}>
                                    {bi + 1}
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
    </div>
  )
}

// ── Title bar ──────────────────────────────────────────────────────────────────

function TitleBar() {
  const t = useT()
  return (
    <div className="drag flex h-7 shrink-0 select-none items-center justify-between border-b px-3"
      style={{ background: t.PANEL_BG, borderColor: t.BORDER }}>
      <div className="flex items-center gap-2">
        <BookOpenText size={12} style={{ color: colors.teal }} />
        <span className="text-[11px] font-semibold" style={{ color: t.TEXT_DIM }}>
          Documentation PRISM
        </span>
      </div>
      <div className="no-drag flex items-center gap-0.5">
        {([
          { k: 'min' as const,   Icon: Minus, danger: false, action: () => window.electron?.minimize?.() },
          { k: 'close' as const, Icon: X,     danger: true,  action: () => window.electron?.close?.()   },
        ]).map(({ k, Icon, danger, action }) => (
          <button key={k} type="button" onClick={action}
            className="flex h-5 w-5 items-center justify-center rounded transition-all"
            style={{ color: alpha(t.TEXT_DIM, '38'), background: 'transparent' }}
            onMouseEnter={e => {
              e.currentTarget.style.background = danger ? alpha('#EF4444', '18') : alpha(t.BORDER, '90')
              e.currentTarget.style.color      = danger ? '#EF4444' : alpha(t.TEXT, '80')
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color      = alpha(t.TEXT_DIM, '38')
            }}>
            <Icon size={9} />
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Main content (with RAF scroll tracking) ────────────────────────────────────

function DocsContent() {
  const t = useT()
  const { activeChapter, scrollRef, scrollToChapter } = useNav()

  const totalChapters = GROUPED.reduce((s, g) => s + g.chapters.length, 0)
  const totalSections = GROUPED.reduce((s, g) => s + g.chapters.reduce((cs, ch) => cs + ch.blocks.length, 0), 0)

  return (
    <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-[1380px] flex-col gap-5 px-6 py-6">

        {/* Hero card */}
        <header className="overflow-hidden rounded-xl border"
          style={{ borderColor: t.BORDER, background: t.CARD_BG, boxShadow: t.SHADOW_PANEL }}>
          <div className="flex items-center gap-3 px-8 py-4 border-b" style={{ borderColor: `${t.BORDER}40` }}>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ color: colors.teal, background: `${colors.teal}10`, border: `1px solid ${colors.teal}20` }}>
              <BookOpenText size={14} />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: colors.tealDim }}>
              Aide & documentation
            </span>
            <span className="ml-auto text-[11px] font-medium" style={{ color: `${t.TEXT_DIM}50` }}>
              {totalChapters} chapitres · {totalSections} sections
            </span>
          </div>
          <div className="grid xl:grid-cols-[minmax(0,1fr),1px,280px]">
            <div className="px-8 py-7">
              <h1 className="text-[32px] font-semibold tracking-tight leading-tight mb-4" style={{ color: t.TEXT }}>
                Documentation PRISM
              </h1>
              <p className="text-[14.5px] leading-[1.85] max-w-[520px]" style={{ color: t.TEXT_DIM }}>
                <InlineRichText text="Base d'usage complète. Elle explique comment utiliser le front de A à Z, puis comment le moteur interprète la modélisation pour produire des résultats, des rapports et une traçabilité exploitable." />
              </p>
            </div>
            <div className="hidden xl:block" style={{ background: `${t.BORDER}38` }} />
            <div className="px-7 py-7 border-t xl:border-t-0" style={{ borderColor: `${t.BORDER}30` }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] mb-4" style={{ color: colors.teal }}>
                Comment lire
              </p>
              <ol className="space-y-3.5">
                {[
                  'Choisir un chapitre depuis la table des matières ou depuis les aperçus ci-dessous.',
                  'Utiliser le sommaire interne de chaque chapitre pour naviguer directement à la bonne section.',
                  'Les captures, exemples et snippets illustrent un usage réel — pas du décor.',
                ].map((step, i) => (
                  <li key={`how${i}`} className="flex items-start gap-2.5">
                    <span className="text-[11px] font-bold font-mono mt-[1px] w-4 shrink-0" style={{ color: colors.teal }}>
                      {i + 1}.
                    </span>
                    <p className="text-[12.5px] leading-relaxed" style={{ color: t.TEXT_DIM }}>{step}</p>
                  </li>
                ))}
              </ol>
              <div className="mt-5 pt-5 border-t space-y-3" style={{ borderColor: `${t.BORDER}28` }}>
                {GROUPED.map((group, i) => (
                  <div key={group.id} className={i > 0 ? 'pt-3 border-t' : ''}
                    style={i > 0 ? { borderColor: `${t.BORDER}22` } : undefined}>
                    <p className="text-[12.5px] font-semibold" style={{ color: t.TEXT }}>{group.label}</p>
                    <p className="text-[11.5px] leading-snug mt-0.5" style={{ color: t.TEXT_DIM }}>{group.summary}</p>
                    <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: `${colors.teal}70` }}>
                      {group.chapters.length} ch · {group.chapters.reduce((s, ch) => s + ch.blocks.length, 0)} sec
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* Groups */}
        <div className="space-y-5">
          {GROUPED.map(group => {
            const sectionCount = group.chapters.reduce((s, ch) => s + ch.blocks.length, 0)
            return (
              <section key={group.id} className="space-y-3">
                {/* Group index card (chapter preview pills) */}
                <div className="rounded-xl border px-5 py-5"
                  style={{ borderColor: t.BORDER, background: t.CARD_BG, boxShadow: t.SHADOW_PANEL }}>
                  <div className="flex flex-col gap-1 lg:flex-row lg:items-baseline lg:justify-between mb-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] mb-1" style={{ color: colors.teal }}>
                        {group.label}
                      </p>
                      <p className="text-[13px] leading-relaxed" style={{ color: t.TEXT_DIM }}>{group.summary}</p>
                    </div>
                    <p className="text-[11px] font-medium shrink-0" style={{ color: `${t.TEXT_DIM}60` }}>
                      {group.chapters.length} chapitres · {sectionCount} sections
                    </p>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {group.chapters.map((chapter, index) => {
                      const isActive = activeChapter === chapter.id
                      return (
                        <button key={chapter.id} type="button" onClick={() => scrollToChapter(chapter.id)}
                          className="flex items-start gap-3 w-full text-left px-4 py-3.5 rounded-xl border transition-all duration-150 hover:-translate-y-[1px]"
                          style={{
                            borderColor: isActive ? `${colors.teal}30` : `${t.BORDER}50`,
                            background:  isActive ? `${colors.teal}08` : 'transparent',
                          }}>
                          <span className="text-[10px] font-bold font-mono mt-0.5 w-5 shrink-0"
                            style={{ color: isActive ? colors.teal : `${t.TEXT_DIM}50` }}>
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span style={{ color: isActive ? colors.teal : t.TEXT_DIM }}>
                                <chapter.Icon size={12} />
                              </span>
                              <p className="text-[13px] font-semibold" style={{ color: t.TEXT }}>{chapter.title}</p>
                            </div>
                            <p className="text-[12px] leading-snug" style={{ color: t.TEXT_DIM }}>{chapter.summary}</p>
                            <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.1em]"
                              style={{ color: `${t.TEXT_DIM}50` }}>
                              {chapter.blocks.length} sections
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Chapter articles */}
                <div className="space-y-3">
                  {group.chapters.map((chapter, index) => (
                    <div key={chapter.id} className="overflow-hidden rounded-xl border"
                      style={{
                        borderColor: activeChapter === chapter.id ? `${colors.teal}26` : `${t.BORDER}50`,
                        background:  t.CARD_BG,
                        boxShadow:   t.SHADOW_PANEL,
                      }}>
                      <ChapterArticle
                        chapter={chapter}
                        chapterIndex={index}
                        chapterCount={group.chapters.length}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Root ───────────────────────────────────────────────────────────────────────

export function DocsWindow() {
  const [theme]            = useTheme()
  const [activeChapter, setActiveChapter] = useState(GROUPED[0]?.chapters[0]?.id ?? '')
  const [activeBlock,   setActiveBlock]   = useState('')

  const scrollRef    = useRef<HTMLDivElement>(null)
  const sectionRefs  = useRef(new Map<string, HTMLElement>())
  const blockRefs    = useRef(new Map<string, HTMLElement>())

  const registerSection = useCallback((id: string, node: HTMLElement | null) => {
    if (node) sectionRefs.current.set(id, node)
    else sectionRefs.current.delete(id)
  }, [])

  const registerBlock = useCallback((id: string, node: HTMLElement | null) => {
    if (node) blockRefs.current.set(id, node)
    else blockRefs.current.delete(id)
  }, [])

  const scrollToChapter = useCallback((id: string) => {
    sectionRefs.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const scrollToBlock = useCallback((_chapterId: string, blockId: string) => {
    blockRefs.current.get(blockId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  // RAF-based scroll tracking (identical to PRISM's DocsWorkspace)
  useEffect(() => {
    const root = scrollRef.current
    if (!root) return
    let frame = 0
    const update = () => {
      frame = 0
      const rootTop = root.getBoundingClientRect().top
      let nextChapter = GROUPED[0]?.chapters[0]?.id ?? ''
      let bestC = Infinity
      root.querySelectorAll<HTMLElement>('[data-doc-chapter]').forEach(el => {
        const id = el.dataset.docChapter
        if (!id) return
        const d = Math.abs(el.getBoundingClientRect().top - rootTop - 28)
        if (d < bestC) { bestC = d; nextChapter = id }
      })
      let nextBlock = ''
      let bestB = Infinity
      root.querySelectorAll<HTMLElement>('[data-doc-block]').forEach(el => {
        const id = el.dataset.docBlock
        if (!id || !id.startsWith(`${nextChapter}::`)) return
        const d = Math.abs(el.getBoundingClientRect().top - rootTop - 28)
        if (d < bestB) { bestB = d; nextBlock = id }
      })
      setActiveChapter(nextChapter)
      setActiveBlock(nextBlock)
    }
    const onScroll = () => {
      if (frame) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    }
    update()
    root.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      if (frame) cancelAnimationFrame(frame)
      root.removeEventListener('scroll', onScroll)
    }
  }, [])

  const nav: NavValue = {
    activeChapter,
    activeBlock,
    scrollRef,
    scrollToChapter,
    scrollToBlock,
    registerSection,
    registerBlock,
  }

  return (
    <ThemeCtx.Provider value={theme}>
      <NavCtx.Provider value={nav}>
        <div className="flex h-screen flex-col overflow-hidden" style={{ background: theme.PAGE_BG }}>
          <TitleBar />
          <div className="flex flex-1 min-h-0">
            <DocsToc />
            <DocsContent />
          </div>
        </div>
      </NavCtx.Provider>
    </ThemeCtx.Provider>
  )
}
