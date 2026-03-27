/**
 * NoteEditor.tsx — CodeMirror 6 markdown editor for PRISM notes.
 */
import { EditorView } from '@codemirror/view'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import type { Extension } from '@codemirror/state'
import { CodeEditor } from '@/components/workspace/code/CodeEditor'

interface NoteEditorProps {
  value: string
  onChange: (val: string) => void
  isDark: boolean
  onScrollPct?: (pct: number) => void
  scrollPctRef?: React.MutableRefObject<((pct: number) => void) | null>
}

const markdownExtensions: Extension[] = [
  markdown({
    base: markdownLanguage,
    codeLanguages: languages,
    addKeymap: true,
  }),
  EditorView.lineWrapping,
]

export function NoteEditor(props: NoteEditorProps) {
  return <CodeEditor {...props} extensions={markdownExtensions} />
}
