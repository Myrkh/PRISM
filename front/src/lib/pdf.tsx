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

// Standard page dimensions in mm (portrait)
const PAGE_FORMAT_DIMS: Record<'A4' | 'Letter', { w: number; h: number }> = {
  A4:     { w: 210,   h: 297   },
  Letter: { w: 215.9, h: 279.4 },
}

export async function renderPdfPagesToBlob(input: {
  element: ReactElement
  pageSelector?: string
  /** When provided, output uses a standard page size. Default: pixel-for-pixel (legacy). */
  pageFormat?: 'A4' | 'Letter'
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

      if (input.pageFormat) {
        // Standard page size mode — scale content to fit within the page
        const dims = PAGE_FORMAT_DIMS[input.pageFormat]
        const availW = orientation === 'portrait' ? dims.w : dims.h
        const availH = orientation === 'portrait' ? dims.h : dims.w
        const scale  = Math.min(availW / pageWidth, availH / pageHeight)
        const imgW   = pageWidth  * scale
        const imgH   = pageHeight * scale
        const offsetX = (availW - imgW) / 2
        const offsetY = (availH - imgH) / 2

        if (!pdf) {
          pdf = new jsPDF({ orientation, unit: 'mm', format: input.pageFormat.toLowerCase() as 'a4' | 'letter', compress: true })
        } else {
          pdf.addPage(input.pageFormat.toLowerCase() as 'a4' | 'letter', orientation)
        }
        pdf.addImage(canvas.toDataURL('image/png', 1), 'PNG', offsetX, offsetY, imgW, imgH, undefined, 'FAST')
      } else {
        // Legacy mode — pixel-for-pixel
        if (!pdf) {
          pdf = new jsPDF({ orientation, unit: 'px', format: [pageWidth, pageHeight], compress: true })
        } else {
          pdf.addPage([pageWidth, pageHeight], orientation)
        }
        pdf.addImage(canvas.toDataURL('image/png', 1), 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST')
      }
    }

    if (!pdf) throw new Error('No PDF pages were rendered.')
    return pdf.output('blob')
  } finally {
    root.unmount()
    host.remove()
  }
}
