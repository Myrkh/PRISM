/**
 * PrismFileEditor — Éditeur des fichiers .prism/
 *
 * Même moteur que NoteEditorWorkspace : CodeMirror 6 + unified/remark/rehype/KaTeX
 * Modes : Éditer | Split (redimensionnable) | Aperçu
 *
 * Fichiers éditables : context.md, conventions.md, standards.md → auto-save
 * Fichiers read-only : sif-registry.md → aperçu uniquement (auto-généré)
 */
import '@/styles/notePreview.css'
import 'katex/dist/katex.min.css'
import { useCallback, useRef, useState } from 'react'
import {
  Columns2, Eye, FileCode2, Lock, PenLine, RefreshCw,
} from 'lucide-react'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { useAppStore } from '@/store/appStore'
import { PRISM_EDITABLE_FILES, PRISM_FILE_META, type PrismEditableFile } from '@/store/types'
import { generateSIFRegistry } from '@/utils/generateSIFRegistry'
import { NoteEditor } from '@/components/workspace/note/NoteEditor'
import { NotePreview } from '@/components/workspace/note/NotePreview'
import { colors } from '@/styles/tokens'

// ─── Types ────────────────────────────────────────────────────────────────────
type EditorMode = 'edit' | 'split' | 'preview'

const MODE_ICONS = { edit: PenLine, split: Columns2, preview: Eye } as const
const MODE_LABELS: Record<EditorMode, string> = { edit: 'Éditer', split: 'Split', preview: 'Aperçu' }

// ─── Editable file editor (Edit | Split | Preview) ───────────────────────────
function EditableEditor({
  filename,
  value,
  onChange,
}: {
  filename: PrismEditableFile
  value: string
  onChange: (v: string) => void
}) {
  const {
    BORDER, CARD_BG, PAGE_BG, PANEL_BG, SHADOW_SOFT, TEAL, TEXT, TEXT_DIM, isDark,
  } = usePrismTheme()

  const [mode, setMode]           = useState<EditorMode>('edit')
  const [splitPct, setSplitPct]   = useState(50)
  const containerRef              = useRef<HTMLDivElement>(null)
  const meta                      = PRISM_FILE_META[filename]

  // Resizable split divider
  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const container = containerRef.current
    if (!container) return
    const onMove = (ev: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      setSplitPct(Math.min(80, Math.max(20, ((ev.clientX - rect.left) / rect.width) * 100)))
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0
  const lineCount = value.split(/\n/).length

  // CSS vars for notePreview.css
  const cssVars: React.CSSProperties = {
    ['--prism-page' as string]:              PAGE_BG,
    ['--prism-panel' as string]:             PANEL_BG,
    ['--prism-card' as string]:              isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    ['--prism-border' as string]:            BORDER,
    ['--prism-text' as string]:              TEXT,
    ['--prism-text-dim' as string]:          TEXT_DIM,
    ['--prism-teal' as string]:              TEAL,
    ['--prism-teal-dim' as string]:          colors.tealDim,
    ['--prism-code-bg' as string]:           isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    ['--prism-row-hover' as string]:         isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    ['--prism-preview-max-width' as string]: 'none',
  }

  return (
    <div className="flex flex-1 min-w-0 flex-col overflow-hidden" style={cssVars}>
      {/* Toolbar */}
      <div
        className="flex shrink-0 items-center gap-3 border-b px-4"
        style={{ height: 40, borderColor: BORDER, background: PANEL_BG, boxShadow: SHADOW_SOFT }}
      >
        <span className="flex-1 min-w-0 truncate text-[11px]" style={{ color: TEXT_DIM, opacity: 0.65 }}>
          {meta.hint}
        </span>

        {/* Mode toggle */}
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
      </div>

      {/* Content */}
      <div ref={containerRef} className="flex flex-1 min-h-0">
        {mode === 'edit' && (
          <div className="prism-cm-editor flex-1 min-h-0">
            <NoteEditor value={value} onChange={onChange} isDark={isDark} />
          </div>
        )}

        {mode === 'preview' && (
          <div className="flex flex-1 min-h-0">
            <NotePreview markdown={value} />
          </div>
        )}

        {mode === 'split' && (
          <>
            <div className="prism-cm-editor min-h-0" style={{ width: `${splitPct}%`, flexShrink: 0 }}>
              <NoteEditor value={value} onChange={onChange} isDark={isDark} />
            </div>

            {/* Divider */}
            <div
              onMouseDown={startDrag}
              className="flex-shrink-0 cursor-col-resize transition-colors"
              style={{
                width: 5,
                background: BORDER,
                borderLeft:  `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'}`,
                borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'}`,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = `${TEAL}66` }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = BORDER }}
            />

            <div className="flex min-h-0" style={{ width: `${100 - splitPct}%`, flexShrink: 0 }}>
              <NotePreview markdown={value} />
            </div>
          </>
        )}
      </div>

      {/* Status bar */}
      <div
        className="flex shrink-0 items-center gap-4 border-t px-4 py-1"
        style={{ borderColor: BORDER, background: PANEL_BG }}
      >
        <span className="text-[10px]" style={{ color: TEXT_DIM }}>
          {wordCount} mots · {lineCount} lignes
        </span>
        <span className="ml-auto text-[10px] font-medium" style={{ color: `${TEAL}99` }}>
          Sauvegarde auto
        </span>
      </div>
    </div>
  )
}

// ─── Read-only registry viewer ────────────────────────────────────────────────
function RegistryViewer({ source }: { source: string }) {
  const {
    BORDER, PAGE_BG, PANEL_BG, SHADOW_SOFT, TEAL, TEXT_DIM, isDark,
  } = usePrismTheme()

  const cssVars: React.CSSProperties = {
    ['--prism-page' as string]:              PAGE_BG,
    ['--prism-panel' as string]:             PANEL_BG,
    ['--prism-card' as string]:              isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    ['--prism-border' as string]:            BORDER,
    ['--prism-teal' as string]:              TEAL,
    ['--prism-teal-dim' as string]:          colors.tealDim,
    ['--prism-code-bg' as string]:           isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    ['--prism-row-hover' as string]:         isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    ['--prism-preview-max-width' as string]: 'none',
  }

  return (
    <div className="flex flex-1 min-w-0 flex-col overflow-hidden" style={cssVars}>
      {/* Toolbar */}
      <div
        className="flex shrink-0 items-center gap-2 border-b px-4"
        style={{ height: 40, borderColor: BORDER, background: PANEL_BG, boxShadow: SHADOW_SOFT }}
      >
        <RefreshCw size={11} style={{ color: TEAL }} />
        <span className="text-[11px] font-semibold" style={{ color: TEAL }}>
          Généré automatiquement
        </span>
        <span className="text-[11px]" style={{ color: TEXT_DIM, opacity: 0.6 }}>
          · mis à jour à chaque modification de SIF
        </span>
        <div className="ml-auto flex items-center gap-1" style={{ color: TEXT_DIM, opacity: 0.45 }}>
          <Lock size={10} />
          <span className="text-[10px]">Lecture seule</span>
        </div>
      </div>

      {/* Content — NotePreview full width */}
      <div className="flex flex-1 min-h-0">
        <NotePreview markdown={source} />
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function PrismFileEditor({ filename }: { filename: PrismEditableFile | 'sif-registry.md' }) {
  const { BORDER, PANEL_BG, TEAL, TEAL_DIM, TEXT, TEXT_DIM, isDark } = usePrismTheme()
  const prismFiles   = useAppStore(s => s.prismFiles)
  const setPrismFile = useAppStore(s => s.setPrismFile)
  const projects     = useAppStore(s => s.projects)
  const navigate     = useAppStore(s => s.navigate)

  const isRegistry = filename === 'sif-registry.md'
  const registryMd = isRegistry ? generateSIFRegistry(projects) : ''

  const handleChange = useCallback((content: string) => {
    if (!isRegistry) setPrismFile(filename as PrismEditableFile, content)
  }, [filename, isRegistry, setPrismFile])

  const tabs: Array<{ id: PrismEditableFile | 'sif-registry.md'; label: string; auto?: boolean }> = [
    { id: 'context.md',      label: 'Contexte' },
    { id: 'conventions.md',  label: 'Conventions' },
    { id: 'standards.md',    label: 'Normes' },
    { id: 'sif-registry.md', label: 'Registre SIF', auto: true },
  ]

  return (
    <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
      {/* ── Chrome header ──────────────────────────────────────────────────── */}
      <div
        className="flex shrink-0 items-center gap-2 border-b px-4"
        style={{
          height: 44,
          borderColor: BORDER,
          background: isDark ? `${TEAL}0A` : `${TEAL}06`,
        }}
      >
        <FileCode2 size={14} style={{ color: TEAL, flexShrink: 0 }} />
        <span className="text-[12px] font-bold tracking-wide" style={{ color: TEAL }}>.prism/</span>
        <span className="text-[12px] font-medium" style={{ color: TEXT }}>{filename}</span>
        {isRegistry && (
          <span
            className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest"
            style={{ background: `${TEAL}14`, color: TEAL_DIM }}
          >
            auto-généré
          </span>
        )}
      </div>

      {/* ── Tab bar ────────────────────────────────────────────────────────── */}
      <div
        className="flex shrink-0 items-end border-b"
        style={{ borderColor: BORDER, background: PANEL_BG }}
      >
        {tabs.map(tab => {
          const active = tab.id === filename
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => navigate({ type: 'prism-file', filename: tab.id })}
              className="relative flex items-center gap-1.5 px-3 py-2 text-[11.5px] font-medium transition-colors"
              style={{
                color: active ? TEAL : TEXT_DIM,
                borderBottom: active ? `2px solid ${TEAL}` : '2px solid transparent',
                background: active ? `${TEAL}08` : 'transparent',
              }}
            >
              {tab.label}
              {tab.auto && (
                <span
                  className="rounded px-1 text-[8.5px] font-bold uppercase tracking-widest"
                  style={{ background: `${TEAL}14`, color: TEAL_DIM }}
                >
                  auto
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {isRegistry ? (
          <RegistryViewer source={registryMd} />
        ) : (
          <EditableEditor
            filename={filename as PrismEditableFile}
            value={prismFiles[filename as PrismEditableFile] ?? ''}
            onChange={handleChange}
          />
        )}
      </div>
    </div>
  )
}
