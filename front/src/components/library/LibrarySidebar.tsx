import { useEffect, useRef, useState } from 'react'
import { Activity, ChevronRight, Cpu, FolderPlus, Palette, Trash2, Zap } from 'lucide-react'
import { COLLECTION_PRESET_COLORS } from '@/features/library'
import { LIBRARY_SUBSYSTEM_META } from '@/components/library/LibraryTemplateCard'
import {
  useLibraryNavigation,
  type LibraryCollectionScope,
} from '@/components/library/LibraryNavigation'
import {
  sidebarHoverIn,
  sidebarHoverOut,
  sidebarPressDown,
  sidebarPressUp,
} from '@/components/layout/SidebarPrimitives'
import { useLayout } from '@/components/layout/SIFWorkbenchLayout'
import { getLibraryStrings } from '@/i18n/library'
import { useLocaleStrings } from '@/i18n/useLocale'
import { usePrismTheme } from '@/styles/usePrismTheme'

// ─── Color picker ─────────────────────────────────────────────────────────────
function ColorPicker({
  current,
  onSelect,
  onClose,
}: {
  current: string
  onSelect: (color: string) => void
  onClose: () => void
}) {
  const { BORDER, CARD_BG, SHADOW_PANEL } = usePrismTheme()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute left-6 top-6 z-50 flex flex-wrap gap-1.5 rounded-xl border p-2"
      style={{ background: CARD_BG, borderColor: BORDER, boxShadow: SHADOW_PANEL, width: 128 }}
    >
      {COLLECTION_PRESET_COLORS.map(color => (
        <button
          key={color}
          type="button"
          onClick={() => { onSelect(color); onClose() }}
          className="h-5 w-5 rounded-full border-2 transition-transform hover:scale-110"
          style={{
            background: color,
            borderColor: color === current ? '#fff' : 'transparent',
            outline: color === current ? `2px solid ${color}` : 'none',
            outlineOffset: 1,
          }}
        />
      ))}
    </div>
  )
}

// ─── Shared small icon button ─────────────────────────────────────────────────
function IconAction({
  icon: Icon,
  title,
  color,
  onClick,
}: {
  icon: React.ElementType
  title: string
  color?: string
  onClick: () => void
}) {
  const { TEXT, TEXT_DIM } = usePrismTheme()
  return (
    <button
      type="button"
      title={title}
      onClick={event => { event.stopPropagation(); onClick() }}
      className="flex h-5 w-5 items-center justify-center rounded transition-colors"
      style={{ color: color ?? TEXT_DIM }}
      onMouseEnter={e => { e.currentTarget.style.color = color ?? TEXT }}
      onMouseLeave={e => { e.currentTarget.style.color = color ?? TEXT_DIM }}
    >
      <Icon size={12} />
    </button>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({
  label,
  collapsed,
  onToggle,
  actions,
}: {
  label: string
  collapsed: boolean
  onToggle: () => void
  actions?: React.ReactNode
}) {
  const { BORDER, TEXT_DIM } = usePrismTheme()
  return (
    <div
      className="flex shrink-0 items-center gap-1 border-b px-2 py-1.5"
      style={{ borderColor: BORDER }}
    >
      <button
        type="button"
        className="flex flex-1 min-w-0 items-center gap-1.5"
        onClick={onToggle}
      >
        <ChevronRight
          size={12}
          className="shrink-0 transition-transform duration-200"
          style={{ color: TEXT_DIM, transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)' }}
        />
        <span className="truncate text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
          {label}
        </span>
      </button>
      {!collapsed && actions && (
        <div className="flex items-center gap-0.5">
          {actions}
        </div>
      )}
    </div>
  )
}

// ─── Filter row ───────────────────────────────────────────────────────────────
function FilterRow({
  label,
  hint,
  count,
  active,
  tone,
  indent = false,
  onClick,
}: {
  label: string
  hint?: string
  count: number
  active: boolean
  tone: string
  indent?: boolean
  onClick: () => void
}) {
  const { BORDER, PAGE_BG, SHADOW_CARD, SHADOW_SOFT, SURFACE, TEXT, TEXT_DIM } = usePrismTheme()

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex w-full items-center gap-2 rounded-md py-1.5 text-left transition-[background-color,color,border-color,box-shadow] duration-150 ease-out"
      style={{
        paddingLeft: indent ? '1.25rem' : '0.5rem',
        paddingRight: '0.5rem',
        background: active ? SURFACE : 'transparent',
        border: `1px solid ${active ? `${tone}24` : 'transparent'}`,
        boxShadow: active ? SHADOW_CARD : 'none',
        color: active ? TEXT : TEXT_DIM,
      }}
      onMouseEnter={event => {
        if (!active) {
          sidebarHoverIn(event.currentTarget, {
            background: PAGE_BG,
            borderColor: `${BORDER}D0`,
            boxShadow: SHADOW_SOFT,
            color: TEXT,
          })
        }
      }}
      onMouseLeave={event => {
        if (!active) {
          sidebarHoverOut(event.currentTarget, {
            background: 'transparent',
            borderColor: 'transparent',
            boxShadow: 'none',
            color: TEXT_DIM,
          })
        }
        sidebarPressUp(event.currentTarget, active ? SHADOW_CARD : 'none')
      }}
      onPointerDown={event => sidebarPressDown(event.currentTarget, SHADOW_SOFT)}
      onPointerUp={event => sidebarPressUp(event.currentTarget, active ? SHADOW_CARD : SHADOW_SOFT)}
      onPointerCancel={event => sidebarPressUp(event.currentTarget, active ? SHADOW_CARD : 'none')}
    >
      <div
        className="pointer-events-none absolute left-0 top-1 bottom-1 w-0.5 rounded-full transition-[opacity,transform] duration-150 ease-out"
        style={{
          background: tone,
          opacity: active ? 1 : 0,
          transform: `translateX(${active ? '0px' : '-1px'}) scaleY(${active ? 1 : 0.6})`,
        }}
      />
      <span className="min-w-0 flex-1 truncate text-[12px] font-medium leading-tight">
        {label}
        {hint && (
          <span className="ml-1 text-[10px] font-normal" style={{ color: TEXT_DIM }}>
            {hint}
          </span>
        )}
      </span>
      <span
        className="shrink-0 font-mono text-[9px] font-bold"
        style={{ color: active ? tone : TEXT_DIM }}
      >
        {count}
      </span>
    </button>
  )
}

// ─── Collection row ───────────────────────────────────────────────────────────
function CollectionRow({
  name,
  color,
  count,
  active,
  colorTitle,
  deleteTitle,
  onSelect,
  onRename,
  onDelete,
  onColorChange,
}: {
  name: string
  color: string
  count: number
  active: boolean
  colorTitle: string
  deleteTitle: string
  onSelect: () => void
  onRename: (newName: string) => void
  onDelete: () => void
  onColorChange: (color: string) => void
}) {
  const { BORDER, PAGE_BG, SHADOW_CARD, SHADOW_SOFT, SURFACE, TEXT, TEXT_DIM } = usePrismTheme()
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(name)
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (renaming) inputRef.current?.focus()
  }, [renaming])

  const commitRename = () => {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== name) onRename(trimmed)
    setRenaming(false)
  }

  return (
    <div className="group relative">
      {/* Left accent bar */}
      <div
        className="pointer-events-none absolute left-0 top-1 bottom-1 w-0.5 rounded-full transition-[opacity,transform] duration-150 ease-out"
        style={{
          background: color,
          opacity: active ? 1 : 0,
          transform: `translateX(${active ? '0px' : '-1px'}) scaleY(${active ? 1 : 0.6})`,
        }}
      />

      <div
        className="flex w-full items-center gap-1.5 rounded-md py-1.5 pl-2 pr-1 transition-[background-color,border-color,box-shadow] duration-150"
        style={{
          background: active ? SURFACE : 'transparent',
          border: `1px solid ${active ? `${color}24` : 'transparent'}`,
          boxShadow: active ? SHADOW_CARD : 'none',
        }}
        onMouseEnter={event => {
          if (!active) {
            const el = event.currentTarget
            el.style.background = PAGE_BG
            el.style.borderColor = `${BORDER}D0`
            el.style.boxShadow = SHADOW_SOFT
          }
        }}
        onMouseLeave={event => {
          if (!active) {
            const el = event.currentTarget
            el.style.background = 'transparent'
            el.style.borderColor = 'transparent'
            el.style.boxShadow = 'none'
          }
        }}
      >
        {/* Color dot */}
        <div
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: color }}
        />

        {/* Name or rename input */}
        {renaming ? (
          <input
            ref={inputRef}
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') { setRenameValue(name); setRenaming(false) }
            }}
            onClick={e => e.stopPropagation()}
            className="min-w-0 flex-1 bg-transparent text-[12px] outline-none border-b"
            style={{ borderColor: color, color: TEXT }}
          />
        ) : (
          <button
            type="button"
            onClick={onSelect}
            onDoubleClick={() => { setRenameValue(name); setRenaming(true) }}
            className="min-w-0 flex-1 truncate text-left text-[12px] font-medium"
            style={{ color: active ? TEXT : TEXT_DIM }}
          >
            {name}
          </button>
        )}

        {/* Count */}
        {!renaming && (
          <span
            className="shrink-0 font-mono text-[9px] font-bold"
            style={{ color: active ? color : TEXT_DIM }}
          >
            {count}
          </span>
        )}

        {/* Hover actions */}
        {!renaming && (
          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setColorPickerOpen(o => !o) }}
              className="flex h-4 w-4 items-center justify-center rounded transition-colors hover:opacity-70"
              style={{ color: TEXT_DIM }}
              title={colorTitle}
            >
              <Palette size={9} />
            </button>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onDelete() }}
              className="flex h-4 w-4 items-center justify-center rounded transition-colors hover:opacity-70"
              style={{ color: '#F87171' }}
              title={deleteTitle}
            >
              <Trash2 size={9} />
            </button>
          </div>
        )}
      </div>

      {/* Color picker popover */}
      {colorPickerOpen && (
        <ColorPicker
          current={color}
          onSelect={onColorChange}
          onClose={() => setColorPickerOpen(false)}
        />
      )}
    </div>
  )
}

function getCollectionTone(scope: LibraryCollectionScope) {
  if (scope === 'project') return '#F59E0B'
  if (scope === 'user') return '#0284C7'
  return '#0F766E'
}

const PRISM_TONE = '#0F766E'
const MY_LIBRARY_TONE = '#0284C7'
const PROJECT_TONE = '#F59E0B'

// ─── LibrarySidebar ───────────────────────────────────────────────────────────
export function LibrarySidebar() {
  const {
    sourceScope,
    subsystemScope,
    projectFilter,
    libraryFilter,
    sourceCounts,
    subsystemCounts,
    projectFilters,
    libraryFilters,
    collections,
    setSourceScope,
    setSubsystemScope,
    setProjectFilter,
    setLibraryFilter,
    startCreate,
    clearFilters,
    createCollection,
    renameCollection,
    deleteCollection,
    setCollectionColor,
  } = useLibraryNavigation()
  const { setRightPanelOpen } = useLayout()
  const s = useLocaleStrings(getLibraryStrings).sidebar
  const { BORDER, PANEL_BG, TEXT_DIM, SHADOW_SOFT, isDark } = usePrismTheme()

  const [prismCollapsed,  setPrismCollapsed]  = useState(false)
  const [myLibCollapsed,  setMyLibCollapsed]  = useState(false)
  const [familyCollapsed, setFamilyCollapsed] = useState(false)

  // Inline new collection input
  const [newCollectionOpen, setNewCollectionOpen] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const collectionInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (newCollectionOpen) collectionInputRef.current?.focus()
  }, [newCollectionOpen])

  const handleCreate = (type: 'sensor' | 'logic' | 'actuator') => {
    startCreate(type)
    setRightPanelOpen(true)
  }

  const handleCreateCollection = () => {
    const name = newCollectionName.trim()
    if (!name) return
    createCollection(name)
    setLibraryFilter(name)
    setNewCollectionOpen(false)
    setNewCollectionName('')
  }

  const handleDeleteCollection = (name: string) => {
    deleteCollection(name)
    if (libraryFilter === name) setLibraryFilter(null)
  }

  // Merge local collections + tag-derived filters into a unified list
  // All names known from localStorage OR from template tags
  const allCollectionNames = Array.from(new Set([
    ...collections.map(c => c.name),
    ...libraryFilters.map(f => f.id),
  ]))
  const collectionRows = allCollectionNames.map(name => {
    const local = collections.find(c => c.name === name)
    const derived = libraryFilters.find(f => f.id === name)
    return {
      name,
      color: local?.color ?? (derived ? getCollectionTone(derived.scope) : '#64748B'),
      count: derived?.count ?? 0,
    }
  }).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count
    return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
  })

  const prismActive     = sourceScope === 'builtin'
  const myLibAllActive  = sourceScope === 'custom' && !projectFilter
  const myTemplatesActive = sourceScope === 'user' && !projectFilter
  const isProjectActive = (id: string) => sourceScope === 'project' && projectFilter === id

  const hasActiveFilters = sourceScope !== 'all' || subsystemScope !== 'all' || Boolean(projectFilter) || Boolean(libraryFilter)

  return (
    <div
      className="flex h-full flex-col min-h-0 overflow-hidden"
      style={{
        background: PANEL_BG,
        boxShadow: `${SHADOW_SOFT}, inset -1px 0 0 ${isDark ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.78)'}`,
      }}
    >
      {/* ── Header ── */}
      <div
        className="flex shrink-0 items-center justify-between border-b px-3 py-2"
        style={{ borderColor: BORDER }}
      >
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
          {s.title}
        </span>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-[9px] font-semibold uppercase tracking-wider transition-opacity"
            style={{ color: TEXT_DIM }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.6' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
          >
            {s.reset}
          </button>
        )}
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 min-h-0 overflow-y-auto">

        {/* ─ CATALOGUE PRISM ─ */}
        <SectionHeader
          label={s.prismCatalogueTitle}
          collapsed={prismCollapsed}
          onToggle={() => setPrismCollapsed(c => !c)}
        />
        {!prismCollapsed && (
          <div className="px-2 py-1.5 space-y-0.5">
            <FilterRow
              label={s.prismCatalogueTitle}
              hint={s.prismCatalogueHint}
              count={sourceCounts.builtin}
              active={prismActive}
              tone={PRISM_TONE}
              onClick={() => { setSourceScope('builtin'); setProjectFilter(null) }}
            />
          </div>
        )}

        {/* ─ MA BIBLIOTHÈQUE ─ */}
        <SectionHeader
          label={s.myLibraryTitle}
          collapsed={myLibCollapsed}
          onToggle={() => setMyLibCollapsed(c => !c)}
          actions={
            <>
              <IconAction icon={Activity} title={s.newSensorTitle}    color={LIBRARY_SUBSYSTEM_META.sensor.color}   onClick={() => handleCreate('sensor')} />
              <IconAction icon={Cpu}      title={s.newLogicTitle}     color={LIBRARY_SUBSYSTEM_META.logic.color}    onClick={() => handleCreate('logic')} />
              <IconAction icon={Zap}      title={s.newActuatorTitle}  color={LIBRARY_SUBSYSTEM_META.actuator.color} onClick={() => handleCreate('actuator')} />
              <IconAction icon={FolderPlus} title={s.newCollectionTitle} onClick={() => setNewCollectionOpen(o => !o)} />
            </>
          }
        />
        {!myLibCollapsed && (
          <div className="px-2 py-1.5 space-y-0.5">
            <FilterRow
              label={s.myLibraryAllLabel}
              count={sourceCounts.custom}
              active={myLibAllActive}
              tone={MY_LIBRARY_TONE}
              onClick={() => { setSourceScope('custom'); setProjectFilter(null); setLibraryFilter(null) }}
            />
            <FilterRow
              label={s.myLibraryPersonalLabel}
              hint={s.myLibraryPersonalHint}
              count={sourceCounts.user}
              active={myTemplatesActive}
              tone={MY_LIBRARY_TONE}
              indent
              onClick={() => { setSourceScope('user'); setProjectFilter(null); setLibraryFilter(null) }}
            />
            {projectFilters.filter(p => p.count > 0).map(project => (
              <FilterRow
                key={project.id}
                label={project.label}
                count={project.count}
                active={isProjectActive(project.id)}
                tone={PROJECT_TONE}
                indent
                onClick={() => { setSourceScope('project'); setProjectFilter(project.id); setLibraryFilter(null) }}
              />
            ))}

            {/* Collections divider + rows */}
            {(collectionRows.length > 0 || newCollectionOpen) && (
              <>
                <div
                  className="mx-1 my-1.5 border-t"
                  style={{ borderColor: `${BORDER}60` }}
                />

                {/* Inline new collection input */}
                {newCollectionOpen && (
                  <div className="mb-1 flex items-center gap-1">
                    <input
                      ref={collectionInputRef}
                      type="text"
                      value={newCollectionName}
                      onChange={e => setNewCollectionName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleCreateCollection()
                        if (e.key === 'Escape') { setNewCollectionOpen(false); setNewCollectionName('') }
                      }}
                      placeholder={s.newCollectionPlaceholder}
                      className="min-w-0 flex-1 rounded border px-2 py-1 text-[11px] outline-none"
                      style={{ borderColor: BORDER, background: 'transparent' }}
                    />
                    <button
                      type="button"
                      onClick={handleCreateCollection}
                      className="shrink-0 rounded px-1.5 py-1 text-[10px] font-semibold"
                      style={{ background: MY_LIBRARY_TONE, color: '#fff' }}
                    >
                      {s.newCollectionConfirm}
                    </button>
                  </div>
                )}

                {collectionRows.map(col => (
                  <CollectionRow
                    key={col.name}
                    name={col.name}
                    color={col.color}
                    count={col.count}
                    active={libraryFilter === col.name}
                    colorTitle={s.collectionColorTitle}
                    deleteTitle={s.collectionDeleteTitle}
                    onSelect={() => setLibraryFilter(libraryFilter === col.name ? null : col.name)}
                    onRename={newName => renameCollection(col.name, newName)}
                    onDelete={() => handleDeleteCollection(col.name)}
                    onColorChange={color => setCollectionColor(col.name, color)}
                  />
                ))}
              </>
            )}
          </div>
        )}

        {/* ─ FAMILLE ─ */}
        <SectionHeader
          label={s.familiesTitle}
          collapsed={familyCollapsed}
          onToggle={() => setFamilyCollapsed(c => !c)}
        />
        {!familyCollapsed && (
          <div className="px-2 py-1.5 space-y-0.5">
            <FilterRow
              label={s.allFamiliesLabel}
              count={subsystemCounts.all}
              active={subsystemScope === 'all'}
              tone={PRISM_TONE}
              onClick={() => setSubsystemScope('all')}
            />
            {(['sensor', 'logic', 'actuator'] as const).map(type => {
              const meta = LIBRARY_SUBSYSTEM_META[type]
              return (
                <FilterRow
                  key={type}
                  label={meta.label}
                  count={subsystemCounts[type]}
                  active={subsystemScope === type}
                  tone={meta.color}
                  onClick={() => setSubsystemScope(type)}
                />
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
