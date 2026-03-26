import '@/styles/notePreview.css'
import 'katex/dist/katex.min.css'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { useMarkdownRender } from '@/components/workspace/note/useMarkdownRender'

export function MarkdownMessage({ markdown }: { markdown: string }) {
  const { BORDER, PANEL_BG, TEAL, TEAL_DIM, TEXT, TEXT_DIM, isDark } = usePrismTheme()
  const { html } = useMarkdownRender(markdown)

  return (
    <div
      className="prism-note-preview"
      style={{
        ['--prism-page' as string]: 'transparent',
        ['--prism-panel' as string]: PANEL_BG,
        ['--prism-card' as string]: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
        ['--prism-border' as string]: BORDER,
        ['--prism-text' as string]: TEXT,
        ['--prism-text-dim' as string]: TEXT_DIM,
        ['--prism-teal' as string]: TEAL,
        ['--prism-teal-dim' as string]: TEAL_DIM,
        ['--prism-code-bg' as string]: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
        ['--prism-row-hover' as string]: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        ['--prism-preview-max-width' as string]: 'none',
        padding: 0,
        margin: 0,
        height: 'auto',
        overflowY: 'visible',
        background: 'transparent',
        fontSize: '12.5px',
        lineHeight: 1.65,
      }}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html || '<p style="opacity:0.45;font-style:italic">…</p>' }}
    />
  )
}
