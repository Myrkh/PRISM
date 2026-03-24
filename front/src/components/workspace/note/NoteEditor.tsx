/**
 * NoteEditor.tsx — CodeMirror 6 editor for PRISM notes
 *
 * Features:
 *   - Markdown syntax highlighting (PRISM palette)
 *   - Live dark/light theme switching via Compartment
 *   - GFM + math language extensions
 *   - Standard editing keybindings (history, bracket matching)
 *   - onScrollPct: emits scroll position (0–1) for split-view sync
 */
import { useEffect, useRef } from 'react'
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine } from '@codemirror/view'
import { EditorState, Compartment, Extension } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { bracketMatching } from '@codemirror/language'
import { createPrismCMExtensions } from './prismCMTheme'

// ─── Props ───────────────────────────────────────────────────────────────────

interface NoteEditorProps {
  value: string
  onChange: (val: string) => void
  isDark: boolean
  /** Called with scroll ratio (0–1) when the user scrolls — used for split sync */
  onScrollPct?: (pct: number) => void
  /** Imperatively scroll the editor to a ratio (0–1) — used for split sync */
  scrollPctRef?: React.MutableRefObject<((pct: number) => void) | null>
}

// ─── Static extensions (independent of theme) ────────────────────────────────

const staticExtensions: Extension[] = [
  history(),
  lineNumbers(),
  highlightActiveLineGutter(),
  highlightActiveLine(),
  bracketMatching(),
  keymap.of([...defaultKeymap, ...historyKeymap]),
  markdown({
    base: markdownLanguage,
    codeLanguages: languages,
    addKeymap: true,
  }),
  EditorView.lineWrapping,
]

// ─── Component ───────────────────────────────────────────────────────────────

export function NoteEditor({ value, onChange, isDark, onScrollPct, scrollPctRef }: NoteEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef      = useRef<EditorView | null>(null)
  const themeComp    = useRef(new Compartment())
  const suppressRef  = useRef(false) // prevents scroll echo

  // ── Mount editor once ──
  useEffect(() => {
    if (!containerRef.current) return

    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          ...staticExtensions,
          themeComp.current.of(createPrismCMExtensions(isDark)),
          EditorView.updateListener.of(update => {
            if (update.docChanged) {
              onChange(update.state.doc.toString())
            }
          }),
        ],
      }),
      parent: containerRef.current,
    })

    viewRef.current = view

    // ── Scroll listener on the CM scroller ──
    const scroller = view.scrollDOM
    const handleScroll = () => {
      if (suppressRef.current) return
      const { scrollTop, scrollHeight, clientHeight } = scroller
      const max = scrollHeight - clientHeight
      if (max > 0 && onScrollPct) onScrollPct(scrollTop / max)
    }
    scroller.addEventListener('scroll', handleScroll, { passive: true })

    // ── Expose imperative scroll function ──
    if (scrollPctRef) {
      scrollPctRef.current = (pct: number) => {
        const { scrollHeight, clientHeight } = scroller
        const max = scrollHeight - clientHeight
        if (max > 0) {
          suppressRef.current = true
          scroller.scrollTop = pct * max
          requestAnimationFrame(() => { suppressRef.current = false })
        }
      }
    }

    return () => {
      scroller.removeEventListener('scroll', handleScroll)
      if (scrollPctRef) scrollPctRef.current = null
      view.destroy()
      viewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Sync external value changes (e.g. note switched) ──
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      })
    }
  }, [value])

  // ── Live theme switching ──
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: themeComp.current.reconfigure(createPrismCMExtensions(isDark)),
    })
  }, [isDark])

  return <div ref={containerRef} style={{ height: '100%', overflow: 'hidden' }} />
}
