import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { getDocChapters, getDocGroups } from '@/docs'
import type { DocBlock, DocGroupMeta, DocResolvedChapter } from '@/docs/types'
import { useAppLocale } from '@/i18n/useLocale'

export type GroupedDocs = DocGroupMeta & {
  chapters: DocResolvedChapter[]
}

export function buildDocBlockId(chapterId: string, block: DocBlock, index: number) {
  const slug = block.title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${chapterId}::${index + 1}-${slug}`
}

type DocsNavigationContextValue = {
  activeChapter: string
  activeBlock: string
  setActiveChapter: (id: string) => void
  setActiveBlock: (id: string) => void
  groupedDocs: GroupedDocs[]
  registerSection: (id: string, node: HTMLElement | null) => void
  registerBlock: (id: string, node: HTMLElement | null) => void
  scrollToChapter: (id: string) => void
  scrollToBlock: (chapterId: string, blockId: string) => void
}

const DocsNavigationContext = createContext<DocsNavigationContextValue | null>(null)

export function DocsNavigationProvider({ children }: { children: ReactNode }) {
  const locale = useAppLocale()
  const docGroups = useMemo(() => getDocGroups(locale), [locale])
  const docChapters = useMemo(() => getDocChapters(locale), [locale])
  const [activeChapter, setActiveChapter] = useState(docChapters[0]?.id ?? '')
  const [activeBlock, setActiveBlock] = useState('')
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})
  const blockRefs = useRef<Record<string, HTMLElement | null>>({})

  const groupedDocs = useMemo<GroupedDocs[]>(() => (
    docGroups.map(group => ({
      ...group,
      chapters: docChapters.filter(chapter => chapter.group === group.id),
    }))
  ), [docChapters, docGroups])

  useEffect(() => {
    if (!docChapters.some(chapter => chapter.id === activeChapter)) {
      setActiveChapter(docChapters[0]?.id ?? '')
      setActiveBlock('')
    }
  }, [activeChapter, docChapters])

  const registerSection = useCallback((id: string, node: HTMLElement | null) => {
    sectionRefs.current[id] = node
  }, [])

  const registerBlock = useCallback((id: string, node: HTMLElement | null) => {
    blockRefs.current[id] = node
  }, [])

  const scrollToChapter = useCallback((id: string) => {
    setActiveChapter(id)
    setActiveBlock('')
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const scrollToBlock = useCallback((chapterId: string, blockId: string) => {
    setActiveChapter(chapterId)
    setActiveBlock(blockId)
    blockRefs.current[blockId]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ chapterId?: string; blockId?: string }>).detail
      if (!detail?.chapterId) return
      if (detail.blockId) {
        scrollToBlock(detail.chapterId, detail.blockId)
        return
      }
      scrollToChapter(detail.chapterId)
    }

    document.addEventListener('prism:docs:navigate', handler)
    return () => document.removeEventListener('prism:docs:navigate', handler)
  }, [scrollToBlock, scrollToChapter])

  const value = useMemo<DocsNavigationContextValue>(() => ({
    activeChapter,
    activeBlock,
    setActiveChapter,
    setActiveBlock,
    groupedDocs,
    registerSection,
    registerBlock,
    scrollToChapter,
    scrollToBlock,
  }), [activeBlock, activeChapter, groupedDocs, registerBlock, registerSection, scrollToBlock, scrollToChapter])

  return (
    <DocsNavigationContext.Provider value={value}>
      {children}
    </DocsNavigationContext.Provider>
  )
}

export function useDocsNavigation() {
  const context = useContext(DocsNavigationContext)
  if (!context) {
    throw new Error('useDocsNavigation must be used inside DocsNavigationProvider')
  }
  return context
}
