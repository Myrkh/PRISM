/**
 * NotePreview.tsx — Rendered markdown preview for PRISM notes
 *
 * Uses the unified/remark/rehype/KaTeX pipeline.
 * Accepts scrollPct (0–1) to sync scroll with the editor in split mode.
 */
import { useEffect, useRef } from 'react'
import { useMarkdownRender } from './useMarkdownRender'

interface NotePreviewProps {
  markdown: string
  /** Scroll ratio (0–1) driven externally for split-view sync */
  scrollPct?: number
  /** Called with scroll ratio (0–1) when user scrolls — for reverse sync */
  onScrollPct?: (pct: number) => void
}

const EMPTY_PLACEHOLDER = '<p style="opacity:0.35;font-size:13px;font-style:italic">Aucun contenu à afficher.</p>'

export function NotePreview({ markdown, scrollPct, onScrollPct }: NotePreviewProps) {
  const { html } = useMarkdownRender(markdown)
  const containerRef = useRef<HTMLDivElement>(null)
  const suppressRef  = useRef(false)

  // ── Incoming scroll from editor ──
  useEffect(() => {
    if (scrollPct === undefined) return
    const el = containerRef.current
    if (!el) return
    const max = el.scrollHeight - el.clientHeight
    if (max <= 0) return
    suppressRef.current = true
    el.scrollTop = scrollPct * max
    requestAnimationFrame(() => { suppressRef.current = false })
  }, [scrollPct])

  // ── Outgoing scroll to editor ──
  useEffect(() => {
    const el = containerRef.current
    if (!el || !onScrollPct) return
    const handleScroll = () => {
      if (suppressRef.current) return
      const max = el.scrollHeight - el.clientHeight
      if (max > 0) onScrollPct(el.scrollTop / max)
    }
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [onScrollPct])

  return (
    <div
      ref={containerRef}
      className="prism-note-preview"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html || EMPTY_PLACEHOLDER }}
    />
  )
}
