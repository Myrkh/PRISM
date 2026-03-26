/**
 * useMarkdownRender.ts — Async unified/remark/rehype/KaTeX pipeline
 *
 * Converts markdown → HTML string with:
 *   - GFM (tables, task lists, strikethrough, autolinks)
 *   - LaTeX math: $inline$ and $$block$$ via KaTeX
 *   - Syntax highlighting via highlight.js
 */
import { useEffect, useState } from 'react'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkRehype from 'remark-rehype'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import rehypeStringify from 'rehype-stringify'

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeKatex, { throwOnError: false, strict: false })
  .use(rehypeHighlight, { detect: true, ignoreMissing: true })
  .use(rehypeStringify, { allowDangerousHtml: true })

export async function renderMarkdownToHtml(markdown: string): Promise<string> {
  const file = await processor.process(markdown)
  return String(file)
}

export function useMarkdownRender(markdown: string): { html: string; rendering: boolean } {
  const [html, setHtml] = useState('')
  const [rendering, setRendering] = useState(false)

  useEffect(() => {
    let cancelled = false
    setRendering(true)

    renderMarkdownToHtml(markdown).then(nextHtml => {
      if (!cancelled) {
        setHtml(nextHtml)
        setRendering(false)
      }
    }).catch(() => {
      if (!cancelled) setRendering(false)
    })

    return () => { cancelled = true }
  }, [markdown])

  return { html, rendering }
}
