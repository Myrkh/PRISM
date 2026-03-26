import { renderMarkdownToHtml } from './useMarkdownRender'

interface NotePrintTheme {
  page: string
  panel: string
  card: string
  border: string
  text: string
  textDim: string
  teal: string
  tealDim: string
  codeBg: string
  rowHover: string
}

interface PrintMarkdownNoteOptions {
  title: string
  markdown: string
  theme: NotePrintTheme
}

export interface NotePrintResult {
  kind: 'desktop-pdf' | 'browser-print'
  filePath?: string
}

const EMPTY_PLACEHOLDER = '<p style="opacity:0.35;font-size:13px;font-style:italic">Aucun contenu à afficher.</p>'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildThemeCss(theme: NotePrintTheme): string {
  return `
    :root {
      --prism-page: ${theme.page};
      --prism-panel: ${theme.panel};
      --prism-card: ${theme.card};
      --prism-border: ${theme.border};
      --prism-text: ${theme.text};
      --prism-text-dim: ${theme.textDim};
      --prism-teal: ${theme.teal};
      --prism-teal-dim: ${theme.tealDim};
      --prism-code-bg: ${theme.codeBg};
      --prism-row-hover: ${theme.rowHover};
      --prism-preview-max-width: none;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      min-height: auto !important;
      overflow: visible !important;
      background: var(--prism-page);
      color: var(--prism-text);
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    .prism-note-print-shell {
      display: block !important;
      min-height: auto !important;
      background: var(--prism-page);
    }

    .prism-note-preview {
      display: block !important;
      flex: none !important;
      max-width: none !important;
      width: auto !important;
      height: auto !important;
      min-height: auto !important;
      overflow: visible !important;
      margin: 0 auto !important;
      padding: 28px 32px !important;
      background: var(--prism-page) !important;
    }

    .prism-note-preview tbody tr:hover {
      background: transparent !important;
    }

    .prism-note-preview pre,
    .prism-note-preview blockquote,
    .prism-note-preview table,
    .prism-note-preview img,
    .prism-note-preview .katex-display {
      break-inside: avoid-page;
      page-break-inside: avoid;
    }

    @page {
      size: A4;
      margin: 14mm 12mm;
    }

    @media print {
      html,
      body,
      .prism-note-print-shell,
      .prism-note-preview {
        min-height: auto !important;
        height: auto !important;
        overflow: visible !important;
      }
    }
  `
}

function collectHeadStyles(): string {
  return Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(node => node.outerHTML)
    .join('\n')
}

async function buildPrintableHtml({ title, markdown, theme }: PrintMarkdownNoteOptions): Promise<string> {
  const html = await renderMarkdownToHtml(markdown)
  const styleMarkup = collectHeadStyles()
  const themeCss = buildThemeCss(theme)
  const baseHref = typeof window !== 'undefined' ? window.location.origin : ''

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <base href="${escapeHtml(baseHref)}/" />
    <title>${escapeHtml(title)}</title>
    ${styleMarkup}
    <style>${themeCss}</style>
  </head>
  <body>
    <div class="prism-note-print-shell">
      <div class="prism-note-preview">${html || EMPTY_PLACEHOLDER}</div>
    </div>
  </body>
</html>`
}

function cleanupPrintFrame(frame: HTMLIFrameElement) {
  window.setTimeout(() => {
    if (frame.parentNode) frame.parentNode.removeChild(frame)
  }, 0)
}

async function waitForPrintableDocument(doc: Document): Promise<void> {
  const fontPromise = doc.fonts?.ready ? doc.fonts.ready.catch(() => undefined) : Promise.resolve()
  const imagePromises = Array.from(doc.images).map(image => {
    if (image.complete) return Promise.resolve()
    return new Promise<void>(resolve => {
      const done = () => resolve()
      image.addEventListener('load', done, { once: true })
      image.addEventListener('error', done, { once: true })
    })
  })

  await Promise.all([fontPromise, ...imagePromises])
  await new Promise(resolve => window.setTimeout(resolve, 80))
}

async function browserPrint(html: string): Promise<NotePrintResult> {
  await new Promise<void>((resolve, reject) => {
    const frame = document.createElement('iframe')
    frame.setAttribute('aria-hidden', 'true')
    frame.style.position = 'fixed'
    frame.style.left = '-200vw'
    frame.style.top = '0'
    frame.style.width = '1240px'
    frame.style.height = '1754px'
    frame.style.border = '0'
    frame.style.opacity = '0'
    frame.style.pointerEvents = 'none'

    let settled = false
    const finalize = () => {
      if (settled) return
      settled = true
      cleanupPrintFrame(frame)
      resolve()
    }

    frame.onload = () => {
      const printWindow = frame.contentWindow
      const doc = frame.contentDocument
      if (!printWindow || !doc) {
        cleanupPrintFrame(frame)
        reject(new Error('print-frame-unavailable'))
        return
      }

      const afterPrint = () => {
        printWindow.removeEventListener('afterprint', afterPrint)
        finalize()
      }

      printWindow.addEventListener('afterprint', afterPrint)
      waitForPrintableDocument(doc).then(() => {
        try {
          printWindow.focus()
          printWindow.print()
          window.setTimeout(finalize, 1500)
        } catch (error) {
          printWindow.removeEventListener('afterprint', afterPrint)
          cleanupPrintFrame(frame)
          reject(error instanceof Error ? error : new Error('print-failed'))
        }
      }).catch(error => {
        printWindow.removeEventListener('afterprint', afterPrint)
        cleanupPrintFrame(frame)
        reject(error instanceof Error ? error : new Error('print-failed'))
      })
    }

    document.body.appendChild(frame)

    const doc = frame.contentDocument
    if (!doc) {
      cleanupPrintFrame(frame)
      reject(new Error('print-frame-unavailable'))
      return
    }

    doc.open()
    doc.write(html)
    doc.close()
  })

  return { kind: 'browser-print' }
}

export async function printMarkdownNote(options: PrintMarkdownNoteOptions): Promise<NotePrintResult> {
  const html = await buildPrintableHtml(options)

  if (window.prismDesktop?.exportNotePdf) {
    const result = await window.prismDesktop.exportNotePdf({
      title: options.title,
      html,
      suggestedFileName: options.title,
    })
    if (result.ok) return { kind: 'desktop-pdf', filePath: result.filePath }
    if (result.canceled) throw new Error('desktop-pdf-canceled')
    throw new Error(result.error || 'desktop-pdf-failed')
  }

  return browserPrint(html)
}
