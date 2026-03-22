/**
 * workspace/NoteEditorWorkspace.tsx
 *
 * Markdown note editor with Edit / Preview tabs.
 * Auto-saves to workspaceStore on change (debounced 400ms).
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { FileText } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { WorkspaceTabBar } from './WorkspaceTabBar'

// ─── Simple markdown renderer (no deps) ──────────────────────────────────
function renderMarkdown(raw: string): string {
  // Escape HTML first
  let s = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Fenced code blocks  (``` ... ```)
  s = s.replace(/```(?:[^\n]*)\n([\s\S]*?)```/g, (_, code) =>
    `<pre class="md-pre"><code>${code.trimEnd()}</code></pre>`,
  )

  // Headings
  s = s.replace(/^#{3} (.+)$/gm, '<h3 class="md-h3">$1</h3>')
  s = s.replace(/^#{2} (.+)$/gm, '<h2 class="md-h2">$1</h2>')
  s = s.replace(/^#{1} (.+)$/gm, '<h1 class="md-h1">$1</h1>')

  // Bold / italic
  s = s.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/\*(.+?)\*/g, '<em>$1</em>')

  // Inline code
  s = s.replace(/`([^`\n]+)`/g, '<code class="md-code">$1</code>')

  // Horizontal rule
  s = s.replace(/^---$/gm, '<hr class="md-hr" />')

  // Tables — must come before paragraph processing
  // Matches: header row | separator row | data rows
  s = s.replace(
    /^(\|.+\|)\n\|[-| :]+\|\n((?:\|.+\|\n?)*)/gm,
    (_, header, body) => {
      const parseRow = (row: string) =>
        row.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim())
      const headers = parseRow(header)
        .map(h => `<th class="md-th">${h}</th>`).join('')
      const rows = body.trim().split('\n')
        .filter(Boolean)
        .map((row: string) =>
          '<tr>' + parseRow(row).map(c => `<td class="md-td">${c}</td>`).join('') + '</tr>',
        ).join('')
      return `<table class="md-table"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`
    },
  )

  // Unordered list items
  s = s.replace(/^[-*] (.+)$/gm, '<li class="md-li">$1</li>')
  // Wrap consecutive <li> in <ul>
  s = s.replace(/(<li class="md-li">[\s\S]*?<\/li>)(\n(?!<li))/g, '$1</ul>$2')
  s = s.replace(/(?<!<\/ul>\n)(<li class="md-li">)/, '<ul class="md-ul">$1')
  // Clean up: wrap any orphan li sequences
  s = s.replace(/(<li[^>]*>[\s\S]*?<\/li>)(?=\n|$)(?!\n<\/ul>)/g, '<ul class="md-ul">$1</ul>')

  // Paragraphs: split by blank lines, wrap non-tag blocks
  const blocks = s.split(/\n{2,}/)
  s = blocks.map(block => {
    const trimmed = block.trim()
    if (!trimmed) return ''
    if (/^<(h[1-6]|ul|ol|pre|hr|blockquote)/.test(trimmed)) return trimmed
    // inline newlines → <br>
    return `<p class="md-p">${trimmed.replace(/\n/g, '<br>')}</p>`
  }).join('\n')

  return s
}

// ─── NoteEditorWorkspace ─────────────────────────────────────────────────
export function NoteEditorWorkspace({ noteId }: { noteId: string }) {
  const { BORDER, CARD_BG, PAGE_BG, PANEL_BG, SHADOW_SOFT, TEAL, TEXT, TEXT_DIM, isDark } = usePrismTheme()
  const { nodes, updateNoteContent, renameNode, openTab } = useWorkspaceStore()
  const note = nodes[noteId]

  // Ensure deep-linked noteId is always in the tab bar
  useEffect(() => { openTab(noteId) }, [noteId]) // eslint-disable-line react-hooks/exhaustive-deps

  const [tab, setTab] = useState<'edit' | 'preview'>('edit')
  const [localContent, setLocalContent] = useState(note?.type === 'note' ? note.content : '')
  const [renamingTitle, setRenamingTitle] = useState(false)
  const [titleVal, setTitleVal] = useState(note?.type === 'note' ? note.name : '')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  // Sync localContent if noteId changes
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

  return (
    <div className="flex flex-1 flex-col min-h-0" style={{ background: PAGE_BG }}>
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
            className="flex-1 min-w-0 text-left text-[13px] font-medium truncate transition-colors"
            style={{ color: TEXT }}
            onDoubleClick={() => setRenamingTitle(true)}
            title="Double-cliquer pour renommer"
          >
            {note.name}
          </button>
        )}

        {/* Edit / Preview tabs */}
        <div
          className="flex shrink-0 items-center gap-0.5 rounded-lg p-0.5"
          style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}
        >
          {(['edit', 'preview'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className="rounded-md px-3 py-1 text-[11px] font-medium transition-all"
              style={{
                background: tab === t ? (isDark ? CARD_BG : '#fff') : 'transparent',
                color: tab === t ? TEXT : TEXT_DIM,
                boxShadow: tab === t ? SHADOW_SOFT : 'none',
              }}
            >
              {t === 'edit' ? 'Éditer' : 'Aperçu'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {tab === 'edit' ? (
          <textarea
            value={localContent}
            onChange={e => handleChange(e.target.value)}
            spellCheck={false}
            placeholder="# Ma note&#10;&#10;Commencez à écrire en Markdown..."
            className="flex-1 resize-none p-6 font-mono text-[13px] leading-relaxed outline-none"
            style={{
              background: PAGE_BG,
              color: TEXT,
              caretColor: TEAL,
              lineHeight: 1.7,
            }}
          />
        ) : (
          <div
            className="flex-1 overflow-y-auto p-6 md-preview"
            style={{ background: PAGE_BG, color: TEXT }}
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: renderMarkdown(localContent) || '<p style="opacity:0.4;font-size:13px">Aucun contenu à afficher.</p>' }}
          />
        )}
      </div>

      {/* ── Status bar ── */}
      <div
        className="flex shrink-0 items-center gap-3 border-t px-4 py-1"
        style={{ borderColor: BORDER, background: PANEL_BG }}
      >
        <span className="text-[10px]" style={{ color: TEXT_DIM }}>
          {localContent.length} caractères · {localContent.split(/\n/).length} lignes
        </span>
        <span className="text-[10px] ml-auto" style={{ color: `${TEAL}99` }}>
          Sauvegarde auto
        </span>
      </div>
    </div>
  )
}
