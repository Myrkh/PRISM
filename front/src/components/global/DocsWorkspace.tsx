import type { CSSProperties } from 'react'
import { useEffect, useRef } from 'react'
import { BookOpenText, Download } from 'lucide-react'
import { buildDocBlockId, useDocsNavigation } from '@/components/docs/DocsNavigation'
import { getDocsUiStrings } from '@/docs/strings'
import type { DocAction, DocActionId, DocBlock, DocExample, DocResolvedChapter, DocSnippet, DocVisual } from '@/docs/types'
import { buildComponentTemplateImportStarter, COMPONENT_TEMPLATE_IMPORT_MODEL_FILENAME } from '@/features/library/templateUtils'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { useAppLocale } from '@/i18n/useLocale'

// ─── Inline code spans ────────────────────────────────────────────────────────

function InlineRichText({
  text,
  className,
  style,
}: {
  text: string
  className?: string
  style?: CSSProperties
}) {
  const { BORDER, PAGE_BG, TEXT } = usePrismTheme()
  const parts = text.split(/(`[^`]+`)/g).filter(Boolean)

  return (
    <span className={className} style={style}>
      {parts.map((part, index) => {
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code
              key={`${part}-${index}`}
              className="rounded px-1.5 py-0.5 text-[0.86em] font-medium font-mono"
              style={{ border: `1px solid ${BORDER}`, background: PAGE_BG, color: TEXT }}
            >
              {part.slice(1, -1)}
            </code>
          )
        }
        return <span key={`${part}-${index}`}>{part}</span>
      })}
    </span>
  )
}

// ─── Sticky right sidebar: Highlights + Outline ───────────────────────────────

function ChapterSidebar({
  chapter,
  activeBlock,
  onSelectBlock,
}: {
  chapter: DocResolvedChapter
  activeBlock: string
  onSelectBlock: (blockId: string) => void
}) {
  const { BORDER, TEAL, TEXT, TEXT_DIM } = usePrismTheme()
  const locale = useAppLocale()
  const docStrings = getDocsUiStrings(locale)

  return (
    <aside
      className="hidden xl:block"
      style={{ position: 'sticky', top: 24, maxHeight: 'calc(100vh - 64px)', overflowY: 'auto' }}
    >
      {/* Highlights */}
      {chapter.highlights.length > 0 && (
        <div className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] mb-3" style={{ color: TEAL }}>
            {docStrings.landmarksTitle}
          </p>
          <div className="space-y-3.5">
            {chapter.highlights.map((h, i) => (
              <div
                key={`${chapter.id}-${h.label}`}
                className={i > 0 ? 'pt-3.5 border-t' : ''}
                style={i > 0 ? { borderColor: `${BORDER}28` } : undefined}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] mb-1" style={{ color: `${TEXT_DIM}80` }}>
                  {h.label}
                </p>
                <p className="text-[12.5px] font-medium leading-snug" style={{ color: TEXT }}>
                  <InlineRichText text={h.value} />
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section outline */}
      <div className={chapter.highlights.length > 0 ? 'border-t pt-5' : ''} style={{ borderColor: `${BORDER}28` }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] mb-3" style={{ color: TEAL }}>
          {docStrings.sectionsTitle}
        </p>
        <nav className="space-y-0">
          {chapter.blocks.map((block, index) => {
            const blockId = buildDocBlockId(chapter.id, block, index)
            const isActive = activeBlock === blockId
            return (
              <button
                key={blockId}
                type="button"
                onClick={() => onSelectBlock(blockId)}
                className="flex items-start gap-2.5 w-full text-left py-1.5"
              >
                <span
                  className="mt-[5px] w-[5px] h-[5px] rounded-full shrink-0 transition-all duration-150"
                  style={{
                    background: isActive ? TEAL : `${BORDER}70`,
                    transform: isActive ? 'scale(1.4)' : 'scale(1)',
                  }}
                />
                <span
                  className="text-[12.5px] leading-snug transition-colors duration-150"
                  style={{ color: isActive ? TEXT : TEXT_DIM, fontWeight: isActive ? 500 : 400 }}
                >
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

// ─── Example callout ──────────────────────────────────────────────────────────

function ExampleCard({ example }: { example: DocExample }) {
  const { BORDER, TEAL, TEXT, TEXT_DIM } = usePrismTheme()
  const locale = useAppLocale()
  const docStrings = getDocsUiStrings(locale)
  return (
    <div className="pl-4 py-1 border-l-[2px]" style={{ borderLeftColor: TEAL }}>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] mb-2" style={{ color: TEAL }}>
        {docStrings.exampleTitle}
      </p>
      <p className="text-[13px] font-semibold leading-snug mb-2" style={{ color: TEXT }}>
        {example.title}
      </p>
      <p className="text-[13px] leading-relaxed mb-3" style={{ color: TEXT_DIM }}>
        <InlineRichText text={example.summary} />
      </p>
      <ol className="space-y-2">
        {example.steps.map((step, i) => (
          <li key={step} className="flex items-start gap-2.5">
            <span className="mt-[3px] text-[11px] font-bold font-mono shrink-0 w-4" style={{ color: `${TEAL}90` }}>
              {i + 1}.
            </span>
            <span className="text-[13px] leading-relaxed" style={{ color: TEXT }}>
              <InlineRichText text={step} />
            </span>
          </li>
        ))}
      </ol>
      {example.result && (
        <p
          className="mt-3 pt-3 text-[12px] leading-relaxed border-t"
          style={{ color: TEXT_DIM, borderColor: `${BORDER}28` }}
        >
          <span style={{ color: TEXT }}>→ </span>
          <InlineRichText text={example.result} />
        </p>
      )}
    </div>
  )
}

// ─── Code snippet ──────────────────────────────────────────────────────────────

function SnippetCard({ snippet }: { snippet: DocSnippet }) {
  const terminalTone = snippet.tone === 'terminal'
  const bg = terminalTone ? '#0d1117' : '#131920'
  const border = terminalTone ? 'rgba(125,211,199,0.12)' : 'rgba(255,255,255,0.07)'
  const labelColor = terminalTone ? '#7dd3c7' : '#94a3b8'
  const codeColor = terminalTone ? '#d7fff7' : '#e2e8f0'

  return (
    <div className="rounded-lg overflow-hidden" style={{ background: bg, border: `1px solid ${border}` }}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: border }}>
        <p className="text-[11px] font-semibold font-mono" style={{ color: labelColor }}>
          {snippet.title}
        </p>
        {terminalTone && (
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
        <div className="px-4 py-2.5 border-t text-[11px] leading-relaxed" style={{ borderColor: border, color: 'rgba(148,163,184,0.65)' }}>
          <InlineRichText text={snippet.caption} />
        </div>
      )}
    </div>
  )
}

function downloadDocArtifact(filename: string, content: string, contentType = 'application/json') {
  const blob = new Blob([content], { type: `${contentType};charset=utf-8` })
  const url = globalThis.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  globalThis.URL.revokeObjectURL(url)
}

function runDocAction(actionId: DocActionId) {
  switch (actionId) {
    case 'download-library-json-model':
      downloadDocArtifact(COMPONENT_TEMPLATE_IMPORT_MODEL_FILENAME, buildComponentTemplateImportStarter())
      break
    default:
      break
  }
}

function DocActionsRow({ actions }: { actions: DocAction[] }) {
  const { CARD_BG, SHADOW_SOFT, TEAL, TEXT, TEXT_DIM } = usePrismTheme()

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2.5">
        {actions.map(action => (
          <button
            key={action.label}
            type="button"
            onClick={() => runDocAction(action.actionId)}
            className="inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-[12.5px] font-medium transition-all duration-150 hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.99]"
            style={{
              borderColor: `${TEAL}24`,
              background: CARD_BG,
              color: TEXT,
              boxShadow: SHADOW_SOFT,
            }}
          >
            <Download size={14} style={{ color: TEAL }} />
            {action.label}
          </button>
        ))}
      </div>
      {actions.some(action => action.hint) && (
        <div className="space-y-1.5">
          {actions.map(action => action.hint ? (
            <p key={`${action.label}-hint`} className="text-[12px] leading-relaxed" style={{ color: TEXT_DIM }}>
              <InlineRichText text={action.hint} />
            </p>
          ) : null)}
        </div>
      )}
    </div>
  )
}

// ─── Visual / screenshot ───────────────────────────────────────────────────────

function VisualCard({
  visual,
  variant = 'framed',
}: {
  visual: DocVisual
  variant?: 'framed' | 'clean'
}) {
  const { BORDER, PAGE_BG, SHADOW_PANEL, TEXT_DIM } = usePrismTheme()
  const fit = visual.fit ?? 'cover'
  const maxHeight = visual.maxHeight ?? (variant === 'clean' ? 560 : 360)
  const usesContain = fit === 'contain'

  return (
    <figure>
      <div
        className={variant === 'clean' ? 'overflow-hidden rounded-xl' : 'overflow-hidden rounded-xl border'}
        style={
          variant === 'clean'
            ? undefined
            : { borderColor: BORDER, background: PAGE_BG, boxShadow: SHADOW_PANEL }
        }
      >
        <div
          className={usesContain ? 'flex items-center justify-center p-3 md:p-4' : ''}
          style={{
            maxHeight,
            background: usesContain ? `${BORDER}0A` : undefined,
          }}
        >
          <img
            src={visual.src}
            alt={visual.alt}
            loading="lazy"
            className="w-full"
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
          style={{ color: TEXT_DIM }}
        >
          <InlineRichText text={visual.caption} />
        </figcaption>
      )}
    </figure>
  )
}

// ─── Single block (section) ────────────────────────────────────────────────────

function ChapterBlock({
  block,
  blockId,
  index,
  isLast: _isLast,
  first,
  register,
}: {
  block: DocBlock
  blockId: string
  index: number
  isLast: boolean
  first: boolean
  register: (id: string, node: HTMLElement | null) => void
}) {
  const { BORDER, PAGE_BG, SHADOW_PANEL, TEAL, TEXT, TEXT_DIM } = usePrismTheme()
  const visualLayout = block.visual?.layout ?? 'aside'
  const showSplitVisual = Boolean(block.visual && visualLayout === 'split')
  const showStackedVisual = Boolean(block.visual && visualLayout === 'stacked')
  const showAsideVisual = Boolean(block.visual && visualLayout === 'aside')
  const snippets = block.snippets?.length ? block.snippets : block.snippet ? [block.snippet] : []
  const supportInline = showSplitVisual || showStackedVisual
  const useAside = showAsideVisual || (!supportInline && Boolean(block.example || snippets.length > 0))

  return (
    <section
      ref={node => register(blockId, node)}
      data-doc-block={blockId}
      className={!first ? 'mt-6' : ''}
      style={{ scrollMarginTop: 24 }}
    >
      <div
        className="rounded-xl border px-5 py-5 md:px-6 md:py-6"
        style={{ borderColor: BORDER, background: PAGE_BG, boxShadow: SHADOW_PANEL }}
      >
        <div
          className={
            showSplitVisual
              ? 'grid gap-8 lg:grid-cols-[minmax(0,1fr),minmax(340px,440px)] lg:items-start lg:gap-10'
              : useAside
                ? 'grid gap-8 xl:grid-cols-[minmax(0,1fr),300px] xl:items-start'
                : ''
          }
        >
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span
                className="text-[11px] font-bold font-mono tracking-widest"
                style={{ color: TEAL, opacity: 0.7 }}
              >
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="flex-1 h-px" style={{ background: `${BORDER}40` }} />
            </div>

            <h3
              className="text-[21px] font-semibold tracking-tight leading-snug mb-4"
              style={{ color: TEXT }}
            >
              {block.title}
            </h3>

            <p className="text-[14.5px] leading-[1.85] max-w-[620px]" style={{ color: TEXT_DIM }}>
              <InlineRichText text={block.intro} />
            </p>

            {block.actions && block.actions.length > 0 && (
              <div className="mt-5">
                <DocActionsRow actions={block.actions} />
              </div>
            )}

            {block.points.length > 0 && (
              <ul className="mt-5 space-y-0">
                {block.points.map((point, i) => (
                  <li
                    key={point}
                    className={`flex items-start gap-3 py-3 ${i < block.points.length - 1 ? 'border-b' : ''}`}
                    style={{ borderColor: `${BORDER}28` }}
                  >
                    <span
                      className="mt-[9px] w-[4px] h-[4px] rounded-full shrink-0"
                      style={{ background: `${TEAL}70` }}
                    />
                    <span className="text-[14px] leading-[1.8]" style={{ color: TEXT }}>
                      <InlineRichText text={point} />
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {showStackedVisual && block.visual && (
              <div className="mt-6">
                <VisualCard visual={block.visual} />
              </div>
            )}

            {(showSplitVisual || showStackedVisual) && (block.example || snippets.length > 0) && (
              <div className="mt-6 space-y-5">
                {block.example && <ExampleCard example={block.example} />}
                {snippets.map(snippet => (
                  <SnippetCard key={snippet.title} snippet={snippet} />
                ))}
              </div>
            )}
          </div>

          {showSplitVisual && block.visual && (
            <div className="lg:pt-1 lg:self-start">
              <VisualCard visual={block.visual} variant="clean" />
            </div>
          )}

          {useAside && (
            <aside className="space-y-5">
              {showAsideVisual && block.visual && <VisualCard visual={block.visual} />}
              {block.example && <ExampleCard example={block.example} />}
              {snippets.map(snippet => (
                <SnippetCard key={snippet.title} snippet={snippet} />
              ))}
            </aside>
          )}
        </div>
      </div>
    </section>
  )
}

// ─── Chapter article ───────────────────────────────────────────────────────────

function ChapterArticle({
  chapter,
  chapterIndex,
  chapterCount,
  activeBlock,
  onSelectBlock,
  registerSection,
  registerBlock,
}: {
  chapter: DocResolvedChapter
  chapterIndex: number
  chapterCount: number
  activeBlock: string
  onSelectBlock: (blockId: string) => void
  registerSection: (id: string, node: HTMLElement | null) => void
  registerBlock: (id: string, node: HTMLElement | null) => void
}) {
  const { BORDER, TEAL, TEAL_DIM, TEXT, TEXT_DIM } = usePrismTheme()

  return (
    <article
      ref={node => registerSection(chapter.id, node)}
      data-doc-chapter={chapter.id}
      style={{ scrollMarginTop: 24 }}
    >
      {/* Chapter header bar */}
      <div
        className="px-8 py-7 md:px-10 border-b"
        style={{ borderColor: `${BORDER}40` }}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] font-semibold" style={{ color: TEAL_DIM }}>
            {chapter.kicker}
          </span>
          <span style={{ color: `${TEXT_DIM}30` }}>·</span>
          <span className="text-[11px]" style={{ color: `${TEXT_DIM}40` }}>
            {chapterIndex + 1} / {chapterCount}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ color: TEAL, background: `${TEAL}10`, border: `1px solid ${TEAL}1E` }}
          >
            <chapter.Icon size={15} />
          </span>
          <h2
            className="text-[26px] font-semibold tracking-tight"
            style={{ color: TEXT }}
          >
            {chapter.title}
          </h2>
        </div>
        <p
          className="mt-3 text-[14.5px] leading-[1.8] max-w-[580px]"
          style={{ color: TEXT_DIM }}
        >
          <InlineRichText text={chapter.summary} />
        </p>
      </div>

      {/* Content: blocks + sticky sidebar */}
      <div className="grid xl:grid-cols-[minmax(0,1fr),200px] gap-10 px-8 py-8 md:px-10 md:py-10 xl:items-start">
        <div>
          {chapter.blocks.map((block, index) => (
            <ChapterBlock
              key={`${chapter.id}-${block.title}`}
              block={block}
              blockId={buildDocBlockId(chapter.id, block, index)}
              index={index}
              isLast={index === chapter.blocks.length - 1}
              first={index === 0}
              register={registerBlock}
            />
          ))}
        </div>
        <ChapterSidebar
          chapter={chapter}
          activeBlock={activeBlock}
          onSelectBlock={onSelectBlock}
        />
      </div>
    </article>
  )
}

// ─── Chapter preview pill (in group index) ─────────────────────────────────────

function ChapterPreviewButton({
  chapter,
  index,
  active,
  onSelect,
}: {
  chapter: DocResolvedChapter
  index: number
  active: boolean
  onSelect: () => void
}) {
  const { BORDER, TEAL, TEXT, TEXT_DIM } = usePrismTheme()
  const locale = useAppLocale()
  const docStrings = getDocsUiStrings(locale)

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex items-start gap-3 w-full text-left px-4 py-3.5 rounded-xl border transition-all duration-150 hover:-translate-y-[1px]"
      style={{
        borderColor: active ? `${TEAL}30` : `${BORDER}50`,
        background: active ? `${TEAL}08` : 'transparent',
      }}
    >
      <span
        className="text-[10px] font-bold font-mono mt-0.5 w-5 shrink-0"
        style={{ color: active ? TEAL : `${TEXT_DIM}50` }}
      >
        {String(index + 1).padStart(2, '0')}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-1">
          <span style={{ color: active ? TEAL : TEXT_DIM }}>
            <chapter.Icon size={12} />
          </span>
          <p className="text-[13px] font-semibold" style={{ color: TEXT }}>
            {chapter.title}
          </p>
        </div>
        <p className="text-[12px] leading-snug" style={{ color: TEXT_DIM }}>
          {chapter.summary}
        </p>
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: `${TEXT_DIM}50` }}>
          {docStrings.sectionCount(chapter.blocks.length)}
        </p>
      </div>
    </button>
  )
}

// ─── Group (index + articles) ──────────────────────────────────────────────────

function GroupDocument({
  group,
  activeChapter,
  activeBlock,
  onSelectChapter,
  onSelectBlock,
  registerSection,
  registerBlock,
}: {
  group: { id: string; label: string; summary: string; chapters: DocResolvedChapter[] }
  activeChapter: string
  activeBlock: string
  onSelectChapter: (chapterId: string) => void
  onSelectBlock: (chapterId: string, blockId: string) => void
  registerSection: (id: string, node: HTMLElement | null) => void
  registerBlock: (id: string, node: HTMLElement | null) => void
}) {
  const { BORDER, CARD_BG, SHADOW_PANEL, TEAL, TEXT, TEXT_DIM } = usePrismTheme()
  const locale = useAppLocale()
  const docStrings = getDocsUiStrings(locale)
  const sectionCount = group.chapters.reduce((s, ch) => s + ch.blocks.length, 0)

  return (
    <section className="space-y-3">
      <div
        className="rounded-xl border px-5 py-5"
        style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_PANEL }}
      >
        <div className="flex flex-col gap-1 lg:flex-row lg:items-baseline lg:justify-between mb-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] mb-1" style={{ color: TEAL }}>
              {group.label}
            </p>
            <p className="text-[13px] leading-relaxed" style={{ color: TEXT_DIM }}>
              {group.summary}
            </p>
          </div>
          <p className="text-[11px] font-medium shrink-0" style={{ color: `${TEXT_DIM}60` }}>
            {docStrings.counts(group.chapters.length, sectionCount)}
          </p>
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {group.chapters.map((chapter, index) => (
            <ChapterPreviewButton
              key={chapter.id}
              chapter={chapter}
              index={index}
              active={activeChapter === chapter.id}
              onSelect={() => onSelectChapter(chapter.id)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {group.chapters.map((chapter, index) => (
          <div
            key={chapter.id}
            className="overflow-hidden rounded-xl border"
            style={{
              borderColor: activeChapter === chapter.id ? `${TEAL}26` : `${BORDER}50`,
              background: CARD_BG,
              boxShadow: SHADOW_PANEL,
            }}
          >
            <ChapterArticle
              chapter={chapter}
              chapterIndex={index}
              chapterCount={group.chapters.length}
              activeBlock={activeChapter === chapter.id ? activeBlock : ''}
              onSelectBlock={blockId => onSelectBlock(chapter.id, blockId)}
              registerSection={registerSection}
              registerBlock={registerBlock}
            />
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Root ──────────────────────────────────────────────────────────────────────

export function DocsWorkspace() {
  const { BORDER, CARD_BG, SHADOW_PANEL, TEAL, TEAL_DIM, TEXT, TEXT_DIM } = usePrismTheme()
  const locale = useAppLocale()
  const docStrings = getDocsUiStrings(locale)
  const {
    activeChapter,
    activeBlock,
    groupedDocs,
    registerSection,
    registerBlock,
    scrollToChapter,
    scrollToBlock,
    setActiveChapter,
    setActiveBlock,
  } = useDocsNavigation()
  const scrollRootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const root = scrollRootRef.current
    if (!root) return undefined
    let frame = 0

    const update = () => {
      frame = 0
      const rootTop = root.getBoundingClientRect().top
      let nextChapter = groupedDocs[0]?.chapters[0]?.id ?? ''
      let bestC = Number.POSITIVE_INFINITY

      root.querySelectorAll<HTMLElement>('[data-doc-chapter]').forEach(el => {
        const id = el.dataset.docChapter
        if (!id) return
        const d = Math.abs(el.getBoundingClientRect().top - rootTop - 28)
        if (d < bestC) { bestC = d; nextChapter = id }
      })

      let nextBlock = ''
      let bestB = Number.POSITIVE_INFINITY
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
      frame = window.requestAnimationFrame(update)
    }

    update()
    root.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      if (frame) cancelAnimationFrame(frame)
      root.removeEventListener('scroll', onScroll)
    }
  }, [groupedDocs, setActiveBlock, setActiveChapter])

  const totalChapters = groupedDocs.reduce((s, g) => s + g.chapters.length, 0)
  const totalSections = groupedDocs.reduce(
    (s, g) => s + g.chapters.reduce((cs, ch) => cs + ch.blocks.length, 0), 0,
  )

  return (
    <div ref={scrollRootRef} className="flex-1 min-h-0 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-[1380px] flex-col gap-5 px-6 py-6">

        {/* ── Hero ──────────────────────────────────────────────────── */}
        <header
          className="overflow-hidden rounded-xl border"
          style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_PANEL }}
        >
          {/* Top strip */}
          <div
            className="flex items-center gap-3 px-8 py-4 border-b"
            style={{ borderColor: `${BORDER}40` }}
          >
            <span
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ color: TEAL, background: `${TEAL}10`, border: `1px solid ${TEAL}20` }}
            >
              <BookOpenText size={14} />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: TEAL_DIM }}>
              {docStrings.heroKicker}
            </span>
            <span className="ml-auto text-[11px] font-medium" style={{ color: `${TEXT_DIM}50` }}>
              {docStrings.counts(totalChapters, totalSections)}
            </span>
          </div>

          {/* Body: 3 col on xl */}
          <div className="grid xl:grid-cols-[minmax(0,1fr),1px,280px]">
            {/* Title + desc */}
            <div className="px-8 py-7">
              <h1
                className="text-[32px] font-semibold tracking-tight leading-tight mb-4"
                style={{ color: TEXT }}
              >
                {docStrings.heroTitle}
              </h1>
              <p className="text-[14.5px] leading-[1.85] max-w-[520px]" style={{ color: TEXT_DIM }}>
                <InlineRichText text={docStrings.heroSummary} />
              </p>
            </div>

            {/* Vertical divider */}
            <div className="hidden xl:block" style={{ background: `${BORDER}38` }} />

            {/* How to read */}
            <div className="px-7 py-7 border-t xl:border-t-0" style={{ borderColor: `${BORDER}30` }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] mb-4" style={{ color: TEAL }}>
                {docStrings.howToReadTitle}
              </p>
              <ol className="space-y-3.5">
                {docStrings.howToReadSteps.map((step, i) => (
                  <li key={step} className="flex items-start gap-2.5">
                    <span className="text-[11px] font-bold font-mono mt-[1px] w-4 shrink-0" style={{ color: TEAL }}>
                      {i + 1}.
                    </span>
                    <p className="text-[12.5px] leading-relaxed" style={{ color: TEXT_DIM }}>{step}</p>
                  </li>
                ))}
              </ol>

              <div className="mt-5 pt-5 border-t space-y-3" style={{ borderColor: `${BORDER}28` }}>
                {groupedDocs.map((group, i) => (
                  <div
                    key={group.id}
                    className={i > 0 ? 'pt-3 border-t' : ''}
                    style={i > 0 ? { borderColor: `${BORDER}22` } : undefined}
                  >
                    <p className="text-[12.5px] font-semibold" style={{ color: TEXT }}>{group.label}</p>
                    <p className="text-[11.5px] leading-snug mt-0.5" style={{ color: TEXT_DIM }}>{group.summary}</p>
                    <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: `${TEAL}70` }}>
                      {docStrings.compactCounts(group.chapters.length, group.chapters.reduce((s, ch) => s + ch.blocks.length, 0))}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* ── Groups ──────────────────────────────────────────────── */}
        <div className="space-y-5">
          {groupedDocs.map(group => (
            <GroupDocument
              key={group.id}
              group={group}
              activeChapter={activeChapter}
              activeBlock={activeBlock}
              onSelectChapter={scrollToChapter}
              onSelectBlock={(chapterId, blockId) => scrollToBlock(chapterId, blockId)}
              registerSection={registerSection}
              registerBlock={registerBlock}
            />
          ))}
        </div>
      </div>
    </div>
  )
}