import { useEffect, useRef, useState } from 'react'
import { Activity, ChevronRight, Cpu, FolderPlus, Zap } from 'lucide-react'
import { toast } from '@/components/ui/toast'
import { COLLECTION_PRESET_COLORS } from '@/features/library'
import { LibraryCollectionRow } from '@/components/library/LibraryCollectionRow'
import { ensureLibraryCollectionWorkspaceNode } from '@/components/library/libraryCollectionWorkspaceNode'
import { getLibrarySubsystemMeta } from '@/components/library/libraryUi'
import { useLibraryNavigation } from '@/components/library/LibraryNavigation'
import {
  sidebarHoverIn,
  sidebarHoverOut,
  sidebarPressDown,
  sidebarPressUp,
} from '@/components/layout/SidebarPrimitives'
import { useLayout } from '@/components/layout/SIFWorkbenchLayout'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useAppStore } from '@/store/appStore'
import { getLibraryStrings } from '@/i18n/library'
import { useAppLocale, useLocaleStrings } from '@/i18n/useLocale'
import { ConfirmDialog, useConfirmDialog } from '@/shared/ConfirmDialog'
import { usePrismTheme } from '@/styles/usePrismTheme'

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
      onMouseEnter={event => { event.currentTarget.style.color = color ?? TEXT }}
      onMouseLeave={event => { event.currentTarget.style.color = color ?? TEXT_DIM }}
    >
      <Icon size={12} />
    </button>
  )
}

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
    <div className="flex shrink-0 items-center gap-1 border-b px-2 py-1.5" style={{ borderColor: BORDER }}>
      <button type="button" className="flex min-w-0 flex-1 items-center gap-1.5" onClick={onToggle}>
        <ChevronRight
          size={12}
          className="shrink-0 transition-transform duration-200"
          style={{ color: TEXT_DIM, transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)' }}
        />
        <span className="truncate text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
          {label}
        </span>
      </button>
      {!collapsed && actions ? <div className="flex items-center gap-0.5">{actions}</div> : null}
    </div>
  )
}

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
        className="pointer-events-none absolute bottom-1 left-0 top-1 w-0.5 rounded-full transition-[opacity,transform] duration-150 ease-out"
        style={{
          background: tone,
          opacity: active ? 1 : 0,
          transform: `translateX(${active ? '0px' : '-1px'}) scaleY(${active ? 1 : 0.6})`,
        }}
      />
      <span className="min-w-0 flex-1 truncate text-[12px] font-medium leading-tight">
        {label}
        {hint ? (
          <span className="ml-1 text-[10px] font-normal" style={{ color: TEXT_DIM }}>
            {hint}
          </span>
        ) : null}
      </span>
      <span className="shrink-0 font-mono text-[9px] font-bold" style={{ color: active ? tone : TEXT_DIM }}>
        {count}
      </span>
    </button>
  )
}

const PRISM_TONE = '#0F766E'
const MY_LIBRARY_TONE = '#0284C7'
const PROJECT_TONE = '#F59E0B'

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
    collectionsLoading,
    collectionsError,
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
    getCollectionTemplates,
  } = useLibraryNavigation()
  const { setRightPanelOpen } = useLayout()
  const openTab = useWorkspaceStore(state => state.openTab)
  const setJsonEditorMode = useWorkspaceStore(state => state.setJsonEditorMode)
  const locale = useAppLocale()
  const s = useLocaleStrings(getLibraryStrings).sidebar
  const subsystemMeta = getLibrarySubsystemMeta(locale)
  const { BORDER, PANEL_BG, TEXT_DIM, SHADOW_SOFT, isDark } = usePrismTheme()
  const defaultClosed = useAppStore(state => state.preferences.rightPanelDefaultState) === 'closed'
  const projects = useAppStore(state => state.projects)
  const navigate = useAppStore(state => state.navigate)
  const ownerProfileId = useAppStore(state => state.profile?.id ?? state.authUser?.id ?? null)

  const [prismCollapsed, setPrismCollapsed] = useState(defaultClosed)
  const [myLibCollapsed, setMyLibCollapsed] = useState(defaultClosed)
  const [familyCollapsed, setFamilyCollapsed] = useState(defaultClosed)
  const [newCollectionOpen, setNewCollectionOpen] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const collectionInputRef = useRef<HTMLInputElement>(null)
  const confirmDelete = useConfirmDialog()

  useEffect(() => {
    if (newCollectionOpen) collectionInputRef.current?.focus()
  }, [newCollectionOpen])

  const handleCreate = (type: 'sensor' | 'logic' | 'actuator') => {
    startCreate(type)
    setRightPanelOpen(true)
  }

  const handleCreateCollection = async () => {
    const name = newCollectionName.trim()
    if (!name) return
    try {
      const created = await createCollection(name, {
        scope: sourceScope === 'project' && projectFilter ? 'project' : 'user',
        projectId: sourceScope === 'project' ? projectFilter : null,
      })
      if (!created) return
      setLibraryFilter(created.name)
      setNewCollectionOpen(false)
      setNewCollectionName('')
    } catch (error) {
      toast.error('Collection impossible', error instanceof Error ? error.message : String(error))
    }
  }

  const handleRenameCollection = async (collectionId: string, currentName: string, newName: string) => {
    try {
      const updated = await renameCollection(collectionId, newName)
      if (updated && libraryFilter === currentName) setLibraryFilter(updated.name)
    } catch (error) {
      toast.error('Renommage impossible', error instanceof Error ? error.message : String(error))
    }
  }

  const handleCollectionColorChange = async (collectionId: string, color: string) => {
    try {
      await setCollectionColor(collectionId, color)
    } catch (error) {
      toast.error('Couleur impossible', error instanceof Error ? error.message : String(error))
    }
  }

  const handleOpenCollectionDocument = (collection: (typeof collections)[number], mode: 'json' | 'table') => {
    if (!ownerProfileId) {
      toast.error('Collection indisponible', 'Utilisateur authentifié introuvable.')
      return
    }
    const projectName = collection.projectId
      ? projects.find(project => project.id === collection.projectId)?.name ?? null
      : null
    const nodeId = ensureLibraryCollectionWorkspaceNode(
      collection,
      getCollectionTemplates(collection.id),
      ownerProfileId,
      projectName,
    )
    setJsonEditorMode(nodeId, mode)
    openTab(nodeId)
    navigate({ type: 'workspace-file', nodeId })
  }

  const handleDeleteCollection = (collection: (typeof collections)[number]) => {
    confirmDelete.show({
      title: s.collectionDeleteConfirmTitle,
      message: s.collectionDeleteConfirmMessage(collection.name),
      confirmLabel: s.collectionDeleteConfirmAction,
      danger: true,
      onConfirm: async () => {
        await deleteCollection(collection.id)
        if (libraryFilter === collection.name) setLibraryFilter(null)
      },
    })
  }

  const collectionRows = collections.map(collection => ({
    ...collection,
    count: libraryFilters.find(filter => filter.id === collection.name)?.count ?? 0,
  }))

  const prismActive = sourceScope === 'builtin'
  const myLibAllActive = sourceScope === 'custom' && !projectFilter
  const myTemplatesActive = sourceScope === 'user' && !projectFilter
  const isProjectActive = (id: string) => sourceScope === 'project' && projectFilter === id
  const hasActiveFilters = sourceScope !== 'all' || subsystemScope !== 'all' || Boolean(projectFilter) || Boolean(libraryFilter)

  return (
    <>
      <div
        className="flex h-full min-h-0 flex-col overflow-hidden"
        style={{
          background: PANEL_BG,
          boxShadow: `${SHADOW_SOFT}, inset -1px 0 0 ${isDark ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.78)'}, inset 0 1px 0 ${isDark ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.88)'}`,
        }}
      >
        <div className="flex shrink-0 items-center justify-between border-b px-3 py-2" style={{ borderColor: BORDER }}>
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
            {s.title}
          </span>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="text-[9px] font-semibold uppercase tracking-wider transition-opacity"
              style={{ color: TEXT_DIM }}
              onMouseEnter={event => { event.currentTarget.style.opacity = '0.6' }}
              onMouseLeave={event => { event.currentTarget.style.opacity = '1' }}
            >
              {s.reset}
            </button>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <SectionHeader
            label={s.prismCatalogueTitle}
            collapsed={prismCollapsed}
            onToggle={() => setPrismCollapsed(current => !current)}
          />
          {!prismCollapsed ? (
            <div className="space-y-0.5 px-2 py-1.5">
              <FilterRow
                label={s.prismCatalogueTitle}
                hint={s.prismCatalogueHint}
                count={sourceCounts.builtin}
                active={prismActive}
                tone={PRISM_TONE}
                onClick={() => { setSourceScope('builtin'); setProjectFilter(null) }}
              />
            </div>
          ) : null}

          <SectionHeader
            label={s.myLibraryTitle}
            collapsed={myLibCollapsed}
            onToggle={() => setMyLibCollapsed(current => !current)}
            actions={(
              <>
                <IconAction icon={Activity} title={s.newSensorTitle} color={subsystemMeta.sensor.color} onClick={() => handleCreate('sensor')} />
                <IconAction icon={Cpu} title={s.newLogicTitle} color={subsystemMeta.logic.color} onClick={() => handleCreate('logic')} />
                <IconAction icon={Zap} title={s.newActuatorTitle} color={subsystemMeta.actuator.color} onClick={() => handleCreate('actuator')} />
                <IconAction icon={FolderPlus} title={s.newCollectionTitle} onClick={() => setNewCollectionOpen(current => !current)} />
              </>
            )}
          />
          {!myLibCollapsed ? (
            <div className="space-y-0.5 px-2 py-1.5">
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
              {projectFilters.filter(project => project.count > 0).map(project => (
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

              {newCollectionOpen || collectionRows.length > 0 || collectionsLoading || collectionsError ? (
                <>
                  <div className="mx-1 my-1.5 border-t" style={{ borderColor: `${BORDER}60` }} />

                  {newCollectionOpen ? (
                    <div className="mb-1 flex items-center gap-1">
                      <input
                        ref={collectionInputRef}
                        type="text"
                        value={newCollectionName}
                        onChange={event => setNewCollectionName(event.target.value)}
                        onKeyDown={event => {
                          if (event.key === 'Enter') void handleCreateCollection()
                          if (event.key === 'Escape') {
                            setNewCollectionOpen(false)
                            setNewCollectionName('')
                          }
                        }}
                        placeholder={s.newCollectionPlaceholder}
                        className="min-w-0 flex-1 rounded border px-2 py-1 text-[11px] outline-none"
                        style={{ borderColor: BORDER, background: 'transparent' }}
                      />
                      <button
                        type="button"
                        onClick={() => { void handleCreateCollection() }}
                        className="shrink-0 rounded px-1.5 py-1 text-[10px] font-semibold"
                        style={{ background: MY_LIBRARY_TONE, color: '#fff' }}
                      >
                        {s.newCollectionConfirm}
                      </button>
                    </div>
                  ) : null}

                  {collectionsError ? (
                    <p className="px-2 py-1 text-[10px]" style={{ color: '#F59E0B' }}>
                      {collectionsError}
                    </p>
                  ) : null}

                  {collectionRows.map(collection => (
                    <LibraryCollectionRow
                      key={collection.id}
                      name={collection.name}
                      color={collection.color}
                      count={collection.count}
                      active={libraryFilter === collection.name}
                      menuColors={COLLECTION_PRESET_COLORS}
                      colorLabel={s.collectionColorTitle}
                      editTableLabel={s.collectionEditTableTitle}
                      editJsonLabel={s.collectionEditJsonTitle}
                      deleteLabel={s.collectionDeleteTitle}
                      onSelect={() => setLibraryFilter(libraryFilter === collection.name ? null : collection.name)}
                      onRename={nextName => { void handleRenameCollection(collection.id, collection.name, nextName) }}
                      onEditTable={() => handleOpenCollectionDocument(collection, 'table')}
                      onEditJson={() => handleOpenCollectionDocument(collection, 'json')}
                      onDelete={() => handleDeleteCollection(collection)}
                      onColorChange={color => { void handleCollectionColorChange(collection.id, color) }}
                    />
                  ))}
                </>
              ) : null}
            </div>
          ) : null}

          <SectionHeader
            label={s.familiesTitle}
            collapsed={familyCollapsed}
            onToggle={() => setFamilyCollapsed(current => !current)}
          />
          {!familyCollapsed ? (
            <div className="space-y-0.5 px-2 py-1.5">
              <FilterRow
                label={s.allFamiliesLabel}
                count={subsystemCounts.all}
                active={subsystemScope === 'all'}
                tone={PRISM_TONE}
                onClick={() => setSubsystemScope('all')}
              />
              {(['sensor', 'logic', 'actuator'] as const).map(type => {
                const meta = subsystemMeta[type]
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
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete.state.open}
        title={confirmDelete.state.title}
        message={confirmDelete.state.message}
        confirmLabel={confirmDelete.state.confirmLabel}
        danger={confirmDelete.state.danger}
        loading={confirmDelete.loading}
        onConfirm={() => { void confirmDelete.execute() }}
        onCancel={confirmDelete.cancel}
      />
    </>
  )
}
