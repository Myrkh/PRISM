/**
 * CodeEditor.tsx — shared CodeMirror 6 editor shell for PRISM workspace files.
 *
 * Reuses the existing PRISM theme and scroll-sync behavior while allowing
 * different language/extension stacks (Markdown, JSON/plain text, ...).
 */
import { useEffect, useRef } from 'react'
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine } from '@codemirror/view'
import { EditorState, Compartment, type Extension } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { bracketMatching } from '@codemirror/language'
import { createPrismCMExtensions } from '@/components/workspace/note/prismCMTheme'

interface CodeEditorProps {
  value: string
  onChange: (val: string) => void
  isDark: boolean
  extensions?: Extension[]
  onScrollPct?: (pct: number) => void
  scrollPctRef?: React.MutableRefObject<((pct: number) => void) | null>
  fontSizePx?: number
  horizontalScroll?: boolean
  lineNumberAlign?: 'end' | 'center'
}

const baseExtensions: Extension[] = [
  history(),
  lineNumbers(),
  highlightActiveLineGutter(),
  highlightActiveLine(),
  bracketMatching(),
  keymap.of([...defaultKeymap, ...historyKeymap]),
]

function createEditorOptions(fontSizePx: number, horizontalScroll: boolean, lineNumberAlign: 'end' | 'center'): Extension {
  return EditorView.theme({
    '&': { width: '100%', minWidth: '0', fontSize: `${fontSizePx}px` },
    '.cm-gutters': { fontSize: `${Math.max(11, fontSizePx - 1)}px` },
    '.cm-lineNumbers .cm-gutterElement': {
      display: 'flex',
      alignItems: 'center',
      justifyContent: lineNumberAlign === 'center' ? 'center' : 'flex-end',
      padding: 0,
    },
    '.cm-scroller': horizontalScroll ? { overflowX: 'auto', overflowY: 'auto', maxWidth: '100%' } : {},
    '.cm-content': horizontalScroll ? { minWidth: 'max-content', paddingRight: '32px' } : {},
  })
}

export function CodeEditor({ value, onChange, isDark, extensions = [], onScrollPct, scrollPctRef, fontSizePx = 13, horizontalScroll = false, lineNumberAlign = 'end' }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const themeComp = useRef(new Compartment())
  const optionsComp = useRef(new Compartment())
  const suppressRef = useRef(false)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!containerRef.current) return

    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          ...baseExtensions,
          ...extensions,
          themeComp.current.of(createPrismCMExtensions(isDark)),
          optionsComp.current.of(createEditorOptions(fontSizePx, horizontalScroll, lineNumberAlign)),
          EditorView.updateListener.of(update => {
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString())
            }
          }),
        ],
      }),
      parent: containerRef.current,
    })

    viewRef.current = view

    const scroller = view.scrollDOM
    const handleScroll = () => {
      if (suppressRef.current) return
      const { scrollTop, scrollHeight, clientHeight } = scroller
      const max = scrollHeight - clientHeight
      if (max > 0 && onScrollPct) onScrollPct(scrollTop / max)
    }
    scroller.addEventListener('scroll', handleScroll, { passive: true })

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
  }, [])

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

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: themeComp.current.reconfigure(createPrismCMExtensions(isDark)),
    })
  }, [isDark])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: optionsComp.current.reconfigure(createEditorOptions(fontSizePx, horizontalScroll, lineNumberAlign)),
    })
  }, [fontSizePx, horizontalScroll, lineNumberAlign])

  return <div ref={containerRef} style={{ height: '100%', width: '100%', minWidth: 0, overflow: 'hidden' }} />
}
