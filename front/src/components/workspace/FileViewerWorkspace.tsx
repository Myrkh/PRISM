/**
 * workspace/FileViewerWorkspace.tsx
 *
 * Viewer for PDF and image workspace nodes.
 * - PDF: react-pdf, all pages scrolled vertically, centered, max-width 900px
 * - Image: native <img>, centered, max-width 900px
 * Files are served via short-lived Supabase signed URLs (1h).
 */
import { useState, useEffect, useCallback, Component } from 'react'
import type { ReactNode } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { FileImage, ZoomIn, ZoomOut, RotateCcw, Download, Loader2, AlertCircle } from 'lucide-react'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { getWorkspaceFileUrl } from '@/lib/workspaceStorage'
import { WorkspaceTabBar } from './WorkspaceTabBar'
import { JsonEditorWorkspace } from '@/components/workspace/json/JsonEditorWorkspace'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// ?url lets Vite emit the worker file into dist/assets and gives a resolved URL,
// which is required for Electron's file:// origin (new URL(..., import.meta.url)
// can fail in packaged apps when the worker chunk hash changes).
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

// ─── Error boundary — prevents a pdfjs crash from taking down the whole app ─
class PDFErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null }
  static getDerivedStateFromError(e: unknown) {
    return { error: e instanceof Error ? e.message : 'Erreur PDF' }
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-2" style={{ flex: '1 1 0' }}>
          <AlertCircle size={20} style={{ color: '#F87171' }} />
          <p className="text-[13px]" style={{ color: '#F87171' }}>{this.state.error}</p>
          <button type="button" onClick={() => this.setState({ error: null })}
            className="mt-1 rounded px-3 py-1 text-[12px]"
            style={{ background: 'rgba(248,113,113,0.1)', color: '#F87171', border: '1px solid rgba(248,113,113,0.3)' }}>
            Réessayer
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

const PDF_BASE_WIDTH = 760  // px at scale 1.0

// ─── Shared zoom toolbar controls ────────────────────────────────────────
function ZoomControls({
  scale,
  defaultScale,
  onScale,
  TEXT,
  TEXT_DIM,
}: {
  scale: number
  defaultScale: number
  onScale: (s: number) => void
  TEXT: string
  TEXT_DIM: string
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button type="button" onClick={() => onScale(Math.max(0.3, scale - 0.2))}
        className="flex h-6 w-6 items-center justify-center rounded"
        style={{ color: TEXT_DIM }} onMouseEnter={e => { e.currentTarget.style.color = TEXT }} onMouseLeave={e => { e.currentTarget.style.color = TEXT_DIM }}>
        <ZoomOut size={13} />
      </button>
      <span className="text-[11px] tabular-nums w-10 text-center" style={{ color: TEXT_DIM }}>
        {Math.round(scale * 100)}%
      </span>
      <button type="button" onClick={() => onScale(Math.min(4, scale + 0.2))}
        className="flex h-6 w-6 items-center justify-center rounded"
        style={{ color: TEXT_DIM }} onMouseEnter={e => { e.currentTarget.style.color = TEXT }} onMouseLeave={e => { e.currentTarget.style.color = TEXT_DIM }}>
        <ZoomIn size={13} />
      </button>
      <button type="button" onClick={() => onScale(defaultScale)}
        className="flex h-6 w-6 items-center justify-center rounded" title="Réinitialiser zoom"
        style={{ color: TEXT_DIM }} onMouseEnter={e => { e.currentTarget.style.color = TEXT }} onMouseLeave={e => { e.currentTarget.style.color = TEXT_DIM }}>
        <RotateCcw size={12} />
      </button>
    </div>
  )
}

// ─── PDF Viewer ───────────────────────────────────────────────────────────
function PDFViewer({ url, name }: { url: string; name: string }) {
  const { BORDER, PAGE_BG, PANEL_BG, TEAL, TEXT, TEXT_DIM, SHADOW_SOFT } = usePrismTheme()
  const [numPages, setNumPages] = useState(0)
  const [scale, setScale]       = useState(1.0)

  const pageWidth = Math.round(PDF_BASE_WIDTH * scale)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 0', minHeight: 0, overflow: 'hidden' }}>
      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b px-4"
        style={{ flexShrink: 0, borderColor: BORDER, background: PANEL_BG, height: 40, boxShadow: SHADOW_SOFT }}>
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#F87171' }}>PDF</span>
        <span className="flex-1 min-w-0 truncate text-[13px] font-medium" style={{ color: TEXT }}>{name}</span>
        {numPages > 0 && (
          <span className="text-[11px] tabular-nums shrink-0" style={{ color: TEXT_DIM }}>
            {numPages} page{numPages > 1 ? 's' : ''}
          </span>
        )}
        <div className="w-px h-5 shrink-0" style={{ background: BORDER }} />
        <ZoomControls scale={scale} defaultScale={1.0} onScale={setScale} TEXT={TEXT} TEXT_DIM={TEXT_DIM} />
        <div className="w-px h-5 shrink-0" style={{ background: BORDER }} />
        <a href={url} download={name} target="_blank" rel="noopener noreferrer"
          className="flex h-6 w-6 items-center justify-center rounded transition-colors"
          style={{ color: TEXT_DIM }} title="Télécharger"
          onMouseEnter={e => { e.currentTarget.style.color = TEAL }}
          onMouseLeave={e => { e.currentTarget.style.color = TEXT_DIM }}>
          <Download size={13} />
        </a>
      </div>

      {/* All pages scrollable */}
      <div style={{ flex: '1 1 0', minHeight: 0, overflowY: 'auto', overflowX: 'auto', background: PAGE_BG }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 24px', gap: 24 }}>
          <Document
            file={url}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            loading={
              <div className="flex items-center gap-2 py-12" style={{ color: TEXT_DIM }}>
                <Loader2 size={16} className="animate-spin" />
                <span className="text-[13px]">Chargement PDF…</span>
              </div>
            }
            error={
              <div className="flex items-center gap-2 py-12" style={{ color: '#F87171' }}>
                <AlertCircle size={16} />
                <span className="text-[13px]">Impossible de charger ce PDF.</span>
              </div>
            }
          >
            {Array.from({ length: numPages }, (_, i) => (
              <div key={i} style={{ marginBottom: i < numPages - 1 ? 0 : 0, boxShadow: '0 4px 24px rgba(0,0,0,0.35)', borderRadius: 2 }}>
                <Page
                  pageNumber={i + 1}
                  width={pageWidth}
                  renderTextLayer
                  renderAnnotationLayer
                />
              </div>
            ))}
          </Document>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-3 border-t px-4 py-1"
        style={{ flexShrink: 0, borderColor: BORDER, background: PANEL_BG }}>
        <span className="text-[10px]" style={{ color: TEXT_DIM }}>
          {numPages > 0 ? `${numPages} page${numPages > 1 ? 's' : ''} · ` : ''}Zoom {Math.round(scale * 100)}%
        </span>
        <span className="text-[10px] ml-auto" style={{ color: `${TEAL}99` }}>Lecture seule</span>
      </div>
    </div>
  )
}

// ─── Image Viewer ─────────────────────────────────────────────────────────
function ImageViewer({ url, name }: { url: string; name: string }) {
  const { BORDER, PAGE_BG, PANEL_BG, TEAL, TEXT, TEXT_DIM, SHADOW_SOFT } = usePrismTheme()
  const [scale, setScale] = useState(1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 0', minHeight: 0, overflow: 'hidden' }}>
      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b px-4"
        style={{ flexShrink: 0, borderColor: BORDER, background: PANEL_BG, height: 40, boxShadow: SHADOW_SOFT }}>
        <FileImage size={14} style={{ color: '#A78BFA', flexShrink: 0 }} />
        <span className="flex-1 min-w-0 truncate text-[13px] font-medium" style={{ color: TEXT }}>{name}</span>
        <ZoomControls scale={scale} defaultScale={1} onScale={setScale} TEXT={TEXT} TEXT_DIM={TEXT_DIM} />
        <div className="w-px h-5 shrink-0" style={{ background: BORDER }} />
        <a href={url} download={name} target="_blank" rel="noopener noreferrer"
          className="flex h-6 w-6 items-center justify-center rounded transition-colors"
          style={{ color: TEXT_DIM }} title="Télécharger"
          onMouseEnter={e => { e.currentTarget.style.color = TEAL }}
          onMouseLeave={e => { e.currentTarget.style.color = TEXT_DIM }}>
          <Download size={13} />
        </a>
      </div>

      {/* Image — centered, max-width constrained */}
      <div style={{ flex: '1 1 0', minHeight: 0, overflowY: 'auto', overflowX: 'auto', background: PAGE_BG, display: 'flex', justifyContent: 'center' }}>
        <div style={{ padding: 32, display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
          <img
            src={url}
            alt={name}
            style={{
              width: `${Math.round(900 * scale)}px`,
              maxWidth: 'none',
              display: 'block',
              borderRadius: 4,
              boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
            }}
          />
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-3 border-t px-4 py-1"
        style={{ flexShrink: 0, borderColor: BORDER, background: PANEL_BG }}>
        <span className="text-[10px]" style={{ color: TEXT_DIM }}>Zoom {Math.round(scale * 100)}%</span>
      </div>
    </div>
  )
}

// ─── FileViewerWorkspace ──────────────────────────────────────────────────
export function FileViewerWorkspace({ nodeId }: { nodeId: string }) {
  const { PAGE_BG, TEXT_DIM } = usePrismTheme()
  const { nodes, openTab } = useWorkspaceStore()
  const node = nodes[nodeId]

  // Register in tab bar on mount / nodeId change
  useEffect(() => { openTab(nodeId) }, [nodeId]) // eslint-disable-line react-hooks/exhaustive-deps

  const [url, setUrl]         = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const fetchUrl = useCallback(async () => {
    if (!node || (node.type !== 'pdf' && node.type !== 'image')) return
    setLoading(true)
    setError(null)
    try {
      const signed = await getWorkspaceFileUrl(node.storageKey)
      setUrl(signed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [node])

  useEffect(() => { void fetchUrl() }, [fetchUrl])

  // Shared wrapper that always shows the tab bar
  const wrap = (content: React.ReactNode) => (
    <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 0', minHeight: 0, overflow: 'hidden' }}>
      <WorkspaceTabBar activeNodeId={nodeId} />
      {content}
    </div>
  )

  if (node?.type === 'json') return <JsonEditorWorkspace nodeId={nodeId} />

  if (!node || (node.type !== 'pdf' && node.type !== 'image')) {
    return wrap(
      <div className="flex flex-1 items-center justify-center" style={{ background: PAGE_BG }}>
        <p className="text-[13px]" style={{ color: TEXT_DIM }}>Fichier introuvable.</p>
      </div>
    )
  }

  if (loading) {
    return wrap(
      <div className="flex flex-1 items-center justify-center gap-2" style={{ background: PAGE_BG }}>
        <Loader2 size={16} className="animate-spin" style={{ color: TEXT_DIM }} />
        <span className="text-[13px]" style={{ color: TEXT_DIM }}>Chargement…</span>
      </div>
    )
  }

  if (error || !url) {
    return wrap(
      <div className="flex flex-1 flex-col items-center justify-center gap-2" style={{ background: PAGE_BG }}>
        <AlertCircle size={20} style={{ color: '#F87171' }} />
        <p className="text-[13px]" style={{ color: '#F87171' }}>{error ?? 'Impossible de charger le fichier.'}</p>
        <button type="button" onClick={() => void fetchUrl()}
          className="mt-1 rounded px-3 py-1 text-[12px]"
          style={{ background: 'rgba(248,113,113,0.1)', color: '#F87171', border: '1px solid rgba(248,113,113,0.3)' }}>
          Réessayer
        </button>
      </div>
    )
  }

  if (node.type === 'pdf') return wrap(<PDFErrorBoundary><PDFViewer url={url} name={node.name} /></PDFErrorBoundary>)
  return wrap(<ImageViewer url={url} name={node.name} />)
}
