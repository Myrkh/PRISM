import type { ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

function waitForPaint(): Promise<void> {
  return new Promise(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })
}

export async function renderPdfPagesToBlob(input: {
  element: ReactElement
  pageSelector?: string
}): Promise<Blob> {
  const host = document.createElement('div')
  host.style.position = 'fixed'
  host.style.left = '-20000px'
  host.style.top = '0'
  host.style.width = '900px'
  host.style.pointerEvents = 'none'
  host.style.opacity = '0'
  host.style.zIndex = '-1'
  document.body.appendChild(host)

  const root = createRoot(host)

  try {
    root.render(input.element)
    await waitForPaint()

    if (document.fonts?.ready) await document.fonts.ready

    const pages = Array.from(host.querySelectorAll<HTMLElement>(input.pageSelector ?? '.print-page'))
    const targets = pages.length > 0 ? pages : [host]
    let pdf: jsPDF | null = null

    for (let index = 0; index < targets.length; index += 1) {
      const page = targets[index]
      const canvas = await html2canvas(page, {
        backgroundColor: '#ffffff',
        scale: Math.max(2, window.devicePixelRatio || 1),
        useCORS: true,
        logging: false,
        imageTimeout: 0,
        windowWidth: page.scrollWidth,
        windowHeight: page.scrollHeight,
      })

      const pageWidth = canvas.width
      const pageHeight = canvas.height
      const orientation = pageWidth > pageHeight ? 'landscape' : 'portrait'

      if (!pdf) {
        pdf = new jsPDF({
          orientation,
          unit: 'px',
          format: [pageWidth, pageHeight],
          compress: true,
        })
      } else {
        pdf.addPage([pageWidth, pageHeight], orientation)
      }

      pdf.addImage(canvas.toDataURL('image/png', 1), 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST')
    }

    if (!pdf) throw new Error('No PDF pages were rendered.')
    return pdf.output('blob')
  } finally {
    root.unmount()
    host.remove()
  }
}
