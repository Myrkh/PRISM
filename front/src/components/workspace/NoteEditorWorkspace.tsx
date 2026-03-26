/**
 * NoteEditorWorkspace.tsx — PRISM Pro Markdown Note Editor
 *
 * Modes: Edit | Split | Preview
 *   - Edit:    CodeMirror 6 (full syntax highlighting, math, GFM)
 *   - Split:   Editor left + rendered preview right (resizable, scrollable)
 *   - Preview: Full rendered view (unified/remark/rehype/KaTeX)
 *
 * Auto-saves to workspaceStore (debounced 400ms).
 * Split mode: scroll sync toggle (proportional ratio).
 */
import '@/styles/notePreview.css'
import 'katex/dist/katex.min.css'
import { useState, useEffect, useRef, useCallback } from 'react'
import { FileText, Columns2, Eye, PenLine, Link2, Link2Off, Printer } from 'lucide-react'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { toast } from '@/components/ui/toast'
import { WorkspaceTabBar } from './WorkspaceTabBar'
import { NoteEditor } from './note/NoteEditor'
import { NotePreview } from './note/NotePreview'
import { printMarkdownNote } from './note/printMarkdownNote'
import { colors } from '@/styles/tokens'

// ─── Types ───────────────────────────────────────────────────────────────────

type EditorMode = 'edit' | 'split' | 'preview'

const MODE_ICONS = {
  edit:    PenLine,
  split:   Columns2,
  preview: Eye,
} as const

const MODE_LABELS: Record<EditorMode, string> = {
  edit:    'Éditer',
  split:   'Split',
  preview: 'Aperçu',
}

// ─── Component ───────────────────────────────────────────────────────────────

export function NoteEditorWorkspace({ noteId }: { noteId: string }) {
  const {
    BORDER, CARD_BG, PAGE_BG, PANEL_BG, SHADOW_SOFT, TEAL,
    TEXT, TEXT_DIM, isDark,
  } = usePrismTheme()

  const { nodes, updateNoteContent, renameNode, openTab, pendingRenameId, clearPendingRename } = useWorkspaceStore()
  const note = nodes[noteId]

  // Push tab to VS Code bar
  useEffect(() => { openTab(noteId) }, [noteId]) // eslint-disable-line react-hooks/exhaustive-deps

  const [mode, setMode]                 = useState<EditorMode>('edit')
  const [localContent, setLocalContent] = useState(note?.type === 'note' ? note.content : '')
  const [renamingTitle, setRenamingTitle] = useState(false)
  const [printingPdf, setPrintingPdf]   = useState(false)

  // Auto-rename when this note was just created from the command palette
  useEffect(() => {
    if (pendingRenameId === noteId) {
      clearPendingRename()
      setRenamingTitle(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [titleVal, setTitleVal]         = useState(note?.type === 'note' ? note.name : '')
  const [splitPct, setSplitPct]         = useState(50)
  const [syncScroll, setSyncScroll]     = useState(false)
  // 0–1 scroll ratio driven by whichever pane the user scrolled last
  const [scrollPct, setScrollPct]       = useState(0)

  const saveTimer    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const titleRef     = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Imperative handle to scroll the CM editor from outside
  const editorScrollRef = useRef<((pct: number) => void) | null>(null)

  // Sync when noteId changes
  useEffect(() => {
    if (note?.type === 'note') {
      setLocalContent(note.content)
      setTitleVal(note.name)
    }
  }, [noteId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = useCallback((val: string) => {
    setLocalContent(val)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => updateNoteContent(noteId, val), 400)
  }, [noteId, updateNoteContent])

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])

  useEffect(() => {
    if (renamingTitle) titleRef.current?.select()
  }, [renamingTitle])

  const commitTitle = () => {
    if (titleVal.trim()) renameNode(noteId, titleVal.trim())
    else setTitleVal(note?.type === 'note' ? note.name : '')
    setRenamingTitle(false)
  }

  // ── Scroll sync callbacks ──
  const handleEditorScroll = useCallback((pct: number) => {
    if (!syncScroll) return
    setScrollPct(pct)
  }, [syncScroll])

  const handlePreviewScroll = useCallback((pct: number) => {
    if (!syncScroll) return
    // Drive the CM editor scroll imperatively to avoid re-render loop
    editorScrollRef.current?.(pct)
  }, [syncScroll])

  // ── Resizable split divider ──
  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const container = containerRef.current
    if (!container) return
    const onMove = (ev: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      const pct = Math.min(80, Math.max(20, ((ev.clientX - rect.left) / rect.width) * 100))
      setSplitPct(pct)
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  // ── CSS vars for notePreview.css ──
  const cssVars: React.CSSProperties = {
    ['--prism-page' as string]:      PAGE_BG,
    ['--prism-panel' as string]:     PANEL_BG,
    ['--prism-card' as string]:      CARD_BG,
    ['--prism-border' as string]:    BORDER,
    ['--prism-text' as string]:      TEXT,
    ['--prism-text-dim' as string]:  TEXT_DIM,
    ['--prism-teal' as string]:      TEAL,
    ['--prism-teal-dim' as string]:  colors.tealDim,
    ['--prism-code-bg' as string]:   isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    ['--prism-row-hover' as string]: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
  }

  const handlePrintPdf = useCallback(async () => {
    setPrintingPdf(true)
    try {
      const result = await printMarkdownNote({
        title: note?.type === 'note' ? note.name : 'Note',
        markdown: localContent,
        theme: isDark
          ? {
              page: '#FFFFFF',
              panel: '#F8FAFC',
              card: '#F8FAFC',
              border: '#D7E0EA',
              text: '#0F172A',
              textDim: '#64748B',
              teal: TEAL,
              tealDim: colors.tealDim,
              codeBg: 'rgba(15,23,42,0.05)',
              rowHover: 'rgba(15,23,42,0.03)',
            }
          : {
              page: PAGE_BG,
              panel: PANEL_BG,
              card: CARD_BG,
              border: BORDER,
              text: TEXT,
              textDim: TEXT_DIM,
              teal: TEAL,
              tealDim: colors.tealDim,
              codeBg: 'rgba(0,0,0,0.05)',
              rowHover: 'rgba(0,0,0,0.02)',
            },
      })
      if (result.kind === 'desktop-pdf') {
        toast.success('PDF exporté', result.filePath ?? 'Note enregistrée en PDF.')
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'desktop-pdf-canceled') {
        return
      }
      toast.error('Impression PDF impossible', 'Impossible de préparer le rendu PDF de la note.')
    } finally {
      setPrintingPdf(false)
    }
  }, [BORDER, CARD_BG, PAGE_BG, PANEL_BG, TEAL, TEXT, TEXT_DIM, isDark, localContent, note?.name])

  // ── Not found ──
  if (!note || note.type !== 'note') {
    return (
      <div className="flex flex-1 flex-col min-h-0" style={{ background: PAGE_BG }}>
        <WorkspaceTabBar activeNodeId={noteId} />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-[13px]" style={{ color: TEXT_DIM }}>Note introuvable.</p>
        </div>
      </div>
    )
  }

  const wordCount = localContent.trim() ? localContent.trim().split(/\s+/).length : 0
  const lineCount = localContent.split(/\n/).length
  const charCount = localContent.length

  return (
    <div className="flex flex-1 flex-col min-h-0" style={{ background: PAGE_BG, ...cssVars }}>
      {/* ── VS Code tab bar ── */}
      <WorkspaceTabBar activeNodeId={noteId} />

      {/* ── Toolbar ── */}
      <div
        className="flex shrink-0 items-center gap-3 border-b px-4"
        style={{ borderColor: BORDER, background: PANEL_BG, height: 40, boxShadow: SHADOW_SOFT }}
      >
        <FileText size={14} style={{ color: TEAL, flexShrink: 0 }} />

        {/* Note title */}
        {renamingTitle ? (
          <input
            ref={titleRef}
            value={titleVal}
            onChange={e => setTitleVal(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={e => {
              if (e.key === 'Enter') commitTitle()
              if (e.key === 'Escape') { setTitleVal(note.name); setRenamingTitle(false) }
            }}
            className="flex-1 min-w-0 rounded px-1.5 py-0.5 text-[13px] font-medium outline-none"
            style={{
              background: CARD_BG,
              border: `1px solid ${TEAL}60`,
              color: TEXT,
              boxShadow: `0 0 0 2px ${TEAL}18`,
            }}
          />
        ) : (
          <button
            type="button"
            className="flex-1 min-w-0 text-left text-[13px] font-medium truncate"
            style={{ color: TEXT }}
            onDoubleClick={() => setRenamingTitle(true)}
            title="Double-cliquer pour renommer"
          >
            {note.name}
          </button>
        )}

        {/* Sync scroll button — only visible in split mode */}
        {mode === 'split' && (
          <button
            type="button"
            onClick={() => setSyncScroll(v => !v)}
            title={syncScroll ? 'Désactiver le scroll synchronisé' : 'Activer le scroll synchronisé'}
            className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-all"
            style={{
              background: syncScroll
                ? isDark ? `${TEAL}22` : `${TEAL}15`
                : 'transparent',
              color: syncScroll ? TEAL : TEXT_DIM,
              border: `1px solid ${syncScroll ? TEAL + '55' : 'transparent'}`,
            }}
          >
            {syncScroll ? <Link2 size={11} /> : <Link2Off size={11} />}
            Sync
          </button>
        )}

        {/* Mode toggle: Edit | Split | Preview */}
        <div
          className="flex shrink-0 items-center gap-0.5 rounded-lg p-0.5"
          style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}
        >
          {(['edit', 'split', 'preview'] as EditorMode[]).map(m => {
            const Icon = MODE_ICONS[m]
            const active = mode === m
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                title={MODE_LABELS[m]}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all"
                style={{
                  background: active ? (isDark ? CARD_BG : '#fff') : 'transparent',
                  color: active ? TEXT : TEXT_DIM,
                  boxShadow: active ? SHADOW_SOFT : 'none',
                }}
              >
                <Icon size={11} />
                {MODE_LABELS[m]}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => { void handlePrintPdf() }}
          disabled={printingPdf}
          title="Imprimer / enregistrer en PDF"
          className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-all disabled:opacity-50"
          style={{
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            color: printingPdf ? TEAL : TEXT_DIM,
            border: `1px solid ${printingPdf ? `${TEAL}55` : BORDER}`,
          }}
        >
          <Printer size={11} />
          {printingPdf ? 'PDF…' : 'PDF'}
        </button>
      </div>

      {/* ── Content area ── */}
      <div ref={containerRef} className="flex flex-1 min-h-0">

        {/* Edit mode */}
        {mode === 'edit' && (
          <div className="prism-cm-editor flex-1 min-h-0">
            <NoteEditor value={localContent} onChange={handleChange} isDark={isDark} />
          </div>
        )}

        {/* Preview mode */}
        {mode === 'preview' && (
          <div className="flex flex-1 min-h-0">
            <NotePreview markdown={localContent} />
          </div>
        )}

        {/* Split mode */}
        {mode === 'split' && (
          <>
            {/* Editor pane */}
            <div
              className="prism-cm-editor min-h-0"
              style={{ width: `${splitPct}%`, flexShrink: 0 }}
            >
              <NoteEditor
                value={localContent}
                onChange={handleChange}
                isDark={isDark}
                onScrollPct={handleEditorScroll}
                scrollPctRef={editorScrollRef}
              />
            </div>

            {/* Resizable divider */}
            <div
              onMouseDown={startDrag}
              className="flex-shrink-0 cursor-col-resize transition-colors"
              style={{
                width: 5,
                background: BORDER,
                borderLeft:  `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'}`,
                borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'}`,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = TEAL + '66' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = BORDER }}
            />

            {/* Preview pane — flex + min-h-0 lets prism-note-preview overflow-y: auto work */}
            <div
              className="flex min-h-0"
              style={{ width: `${100 - splitPct}%`, flexShrink: 0 }}
            >
              <NotePreview
                markdown={localContent}
                scrollPct={syncScroll ? scrollPct : undefined}
                onScrollPct={handlePreviewScroll}
              />
            </div>
          </>
        )}
      </div>

      {/* ── Status bar ── */}
      <div
        className="flex shrink-0 items-center gap-4 border-t px-4 py-1"
        style={{ borderColor: BORDER, background: PANEL_BG }}
      >
        <span className="text-[10px]" style={{ color: TEXT_DIM }}>
          {wordCount} mots · {lineCount} lignes · {charCount} caractères
        </span>
        <span className="text-[10px] ml-auto" style={{ color: `${TEAL}99` }}>
          Sauvegarde auto
        </span>
      </div>
    </div>
  )
}
