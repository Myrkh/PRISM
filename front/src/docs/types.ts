import type { ElementType } from 'react'

export type DocLocale = 'fr' | 'en'

export type DocGroupId = 'front' | 'engine'

export type DocIconName =
  | 'BookOpenText'
  | 'ClipboardCheck'
  | 'Cpu'
  | 'FileText'
  | 'FlaskConical'
  | 'FolderPlus'
  | 'LayoutDashboard'
  | 'Network'
  | 'Search'
  | 'ShieldCheck'
  | 'TriangleAlert'

export type DocVisual = {
  src: string
  alt: string
  caption: string
  layout?: 'aside' | 'stacked' | 'split'
  fit?: 'cover' | 'contain'
  objectPosition?: string
  maxHeight?: number
}

export type DocSnippet = {
  title: string
  code: string
  tone?: 'terminal' | 'code'
  caption?: string
}

export type DocActionId = 'download-library-json-model'

export type DocAction = {
  label: string
  actionId: DocActionId
  hint?: string
}

export type DocExample = {
  title: string
  summary: string
  steps: string[]
  result?: string
}

export type DocBlock = {
  title: string
  intro: string
  points: string[]
  actions?: DocAction[]
  example?: DocExample
  visual?: DocVisual
  snippet?: DocSnippet
  snippets?: DocSnippet[]
}

export type DocHighlight = {
  label: string
  value: string
}

export type DocChapterData = {
  id: string
  group: DocGroupId
  kicker: string
  title: string
  summary: string
  icon: DocIconName
  highlights: DocHighlight[]
  blocks: DocBlock[]
}

export type LocalizedDocChapterData = Record<DocLocale, DocChapterData>
export type DocChapterSource = DocChapterData | LocalizedDocChapterData

export type DocResolvedChapter = Omit<DocChapterData, 'icon'> & {
  Icon: ElementType
}

export type DocGroupMeta = {
  id: DocGroupId
  label: string
  summary: string
}

export type LocalizedDocGroupMeta = Record<DocLocale, DocGroupMeta>
