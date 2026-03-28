/**
 * CommandPalette — VS Code-style header-embedded palette with mode support.
 *
 * Inactive : wide trigger bar showing current breadcrumb context.
 * Active   : input replaces breadcrumb, dropdown anchored just below the header.
 *
 * Mode prefixes (see modes.ts):
 *   ''  → default  – all items
 *   '>' → commands – actions/toggles/navigation only
 *   '#' → sif      – SIF search
 *   '@' → symbols  – components in current SIF architecture
 *   '?' → help     – available modes
 */
import { Fragment, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronRight, Search } from 'lucide-react'
import { useLocaleStrings } from '@/i18n/useLocale'
import { getShellStrings } from '@/i18n/shell'
import { useAppStore } from '@/store/appStore'
import { normalizeSIFTab } from '@/store/types'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { useCommandGroups } from './useCommandGroups'
import { detectMode } from './modes'
import { PaletteInput, type PaletteInputHandle } from './PaletteInput'

const LISTBOX_ID = 'prism-palette-listbox'

interface Props {
  onOpenSettings: () => void
  onOpenDocs:     () => void
  onOpenSearch:   () => void
  onOpenLibrary:  () => void
}

export function CommandPalette({ onOpenSettings, onOpenDocs, onOpenSearch, onOpenLibrary }: Props) {
  const { BORDER, CARD_BG, PAGE_BG, PANEL_BG, TEAL, TEAL_DIM, TEXT, TEXT_DIM, isDark: themeIsDark } = usePrismTheme()
  const strings = useLocaleStrings(getShellStrings)

  const [open, setOpen]                   = useState(false)
  const [search, setSearch]               = useState('')
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})

  const triggerRef = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<PaletteInputHandle>(null)
  const itemRefs   = useRef<Array<HTMLButtonElement | null>>([])

  const view                   = useAppStore(s => s.view)
  const projects               = useAppStore(s => s.projects)
  const commandPalettePosition = useAppStore(s => s.preferences.commandPalettePosition)

  // ── Mode detection ──────────────────────────────────────────────────────────

  const { mode, query, config: rawModeConfig } = detectMode(search)

  // Localize mode badge and placeholder from i18n (modes.ts holds colors + structure only).
  const modeConfig = rawModeConfig ? {
    ...rawModeConfig,
    badge:       strings.commandPalette.modes.badges[rawModeConfig.mode as keyof typeof strings.commandPalette.modes.badges],
    placeholder: strings.commandPalette.modes.placeholders[rawModeConfig.mode as keyof typeof strings.commandPalette.modes.placeholders],
  } : null

  // Close palette after executing any action (VS Code behavior).
  const run = (fn: () => void) => { fn(); setOpen(false) }

  const { indexedGroups, visibleItems } = useCommandGroups({
    search: query,
    mode,
    run,
    setSearch,
    onOpenSettings,
    onOpenDocs,
    onOpenSearch,
    onOpenLibrary,
  })

  // ── Breadcrumb shown in trigger when closed ─────────────────────────────────

  const breadcrumb = (() => {
    if (view.type === 'sif-dashboard') {
      const project = projects.find(p => p.id === view.projectId)
      const sif     = project?.sifs.find(s => s.id === view.sifId)
      if (!sif) return null
      const tabLabel = strings.sifTabLabels[normalizeSIFTab(view.tab)] ?? normalizeSIFTab(view.tab)
      const sifLabel = `${sif.sifNumber}${sif.title ? ` · ${sif.title}` : ''}`
      return {
        short:   `${sifLabel}  ›  ${tabLabel}`,
        tooltip: `${project?.name ?? ''}  ›  ${sifLabel}  ›  ${tabLabel}`,
      }
    }
    const label = strings.viewLabels[view.type as keyof typeof strings.viewLabels]
    return label ? { short: label, tooltip: label } : null
  })()

  // ── Listen to prism:palette:* custom events ───────────────────────────────

  useEffect(() => {
    const openHandler = (e: Event) => {
      const detail = (e as CustomEvent<{ search?: string }>).detail
      setSearch(detail?.search ?? '')
      setOpen(true)
    }

    const toggleHandler = (e: Event) => {
      const detail = (e as CustomEvent<{ search?: string }>).detail
      if (typeof detail?.search === 'string') {
        setSearch(detail.search)
        setOpen(true)
        return
      }
      setOpen(prev => !prev)
    }

    document.addEventListener('prism:palette:open', openHandler)
    document.addEventListener('prism:palette:toggle', toggleHandler)
    return () => {
      document.removeEventListener('prism:palette:open', openHandler)
      document.removeEventListener('prism:palette:toggle', toggleHandler)
    }
  }, [])

  // ── On open: focus input + compute dropdown position ───────────────────────

  useEffect(() => {
    if (!open) {
      setSearch('')
      return
    }
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 30)

    if (commandPalettePosition === 'center') {
      const W = Math.min(640, window.innerWidth - 32)
      setDropdownStyle({
        top:   Math.round(window.innerHeight * 0.12),
        left:  Math.round((window.innerWidth - W) / 2),
        width: W,
      })
    } else if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setDropdownStyle({ top: rect.bottom + 6, left: rect.left, width: rect.width })
    }
    return () => clearTimeout(focusTimer)
  }, [open, commandPalettePosition])

  // ── Reset selection when search/items change ────────────────────────────────

  useEffect(() => {
    if (!open) { setSelectedIndex(-1); return }
    const defaultIdx = visibleItems.findIndex(item => item.isActive)
    setSelectedIndex(visibleItems.length === 0 ? -1 : defaultIdx >= 0 ? defaultIdx : 0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, search])

  // ── Keyboard navigation ────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return undefined

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); return }
      if (!visibleItems.length) return

      const isDown = e.key === 'ArrowDown' || ((e.ctrlKey || e.metaKey) && e.key === 'n')
      const isUp   = e.key === 'ArrowUp'   || ((e.ctrlKey || e.metaKey) && e.key === 'p')

      if (isDown) {
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % visibleItems.length)
        return
      }
      if (isUp) {
        e.preventDefault()
        setSelectedIndex(prev => (prev <= 0 ? visibleItems.length - 1 : prev - 1))
        return
      }
      if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault()
        visibleItems[selectedIndex]?.onSelect()
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, selectedIndex, visibleItems])

  // ── Scroll selected item into view ─────────────────────────────────────────

  useEffect(() => {
    if (open && selectedIndex >= 0) {
      itemRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest' })
    }
  }, [open, selectedIndex])

  // ── Active item id for aria-activedescendant ────────────────────────────────

  const activeItemId = selectedIndex >= 0 && visibleItems[selectedIndex]
    ? `palette-item-${visibleItems[selectedIndex].id}`
    : undefined

  // ── Shared results panel ────────────────────────────────────────────────────

  const panelContent = (
    <>
      {/* Results list */}
      <div
        id={LISTBOX_ID}
        className="flex-1 overflow-y-auto py-1.5"
        role="listbox"
        aria-label={strings.commandPalette.placeholder}
        aria-activedescendant={activeItemId}
      >
        {visibleItems.length === 0 && (
          <p
            className="py-10 text-center text-[13px]"
            style={{ color: TEXT_DIM }}
            role="status"
            aria-live="polite"
            aria-atomic
          >
            {mode === 'default'
              ? strings.commandPalette.noResults(query || search)
              : strings.commandPalette.modes.noResultsByMode(mode, query)}
          </p>
        )}

        {indexedGroups.map(group => (
          <div key={group.heading} className="mb-0.5">
            <p
              className="px-3 pt-2 pb-1 text-[9px] font-bold uppercase tracking-widest"
              style={{ color: TEXT_DIM }}
            >
              {group.heading}
            </p>

            {group.items.map(item => {
              const isSelected = item.flatIndex === selectedIndex
              return (
                <Fragment key={item.id}>
                  {item.separator && (
                    <div className="mx-3 my-1" style={{ height: 1, background: `${BORDER}80` }} />
                  )}
                  <button
                    id={`palette-item-${item.id}`}
                    ref={node => { itemRefs.current[item.flatIndex] = node }}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={item.onSelect}
                    onMouseEnter={() => setSelectedIndex(item.flatIndex)}
                    className={`group w-full flex items-center gap-2.5 py-2 text-left ${item.level === 1 ? 'pl-8 pr-3' : 'px-3'}`}
                    style={{ background: isSelected ? PAGE_BG : 'transparent' }}
                  >
                    <div
                      className="w-6 h-6 shrink-0 rounded-md flex items-center justify-center transition-colors"
                      style={{
                        background: item.isActive ? `${TEAL}20` : PAGE_BG,
                        border:     `1px solid ${item.isActive ? `${TEAL}50` : BORDER}`,
                      }}
                    >
                      <item.Icon size={12} style={{ color: item.isActive ? TEAL : TEXT_DIM }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        className="truncate text-[13px] font-semibold"
                        style={{ color: item.isActive ? TEAL_DIM : TEXT }}
                      >
                        {item.label}
                      </p>
                      {item.meta && (
                        <p className="text-[10px] truncate mt-0.5" style={{ color: TEXT_DIM }}>
                          {item.meta}
                        </p>
                      )}
                    </div>

                    {item.shortcut && !item.isActive && (
                      <kbd
                        className="shrink-0 text-[9px] font-mono px-1.5 py-0.5 rounded"
                        style={{ border: `1px solid ${BORDER}`, color: TEXT_DIM, background: PAGE_BG }}
                      >
                        {item.shortcut}
                      </kbd>
                    )}

                    {item.isActive && (
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
                        style={{ background: `${TEAL}20`, color: TEAL_DIM, border: `1px solid ${TEAL}40` }}
                      >
                        {strings.commandPalette.labels.active}
                      </span>
                    )}

                    <ChevronRight
                      size={11}
                      style={{ color: BORDER, flexShrink: 0 }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </button>
                </Fragment>
              )
            })}
          </div>
        ))}
      </div>

      {/* Keyboard hints footer */}
      <div
        className="flex items-center gap-4 px-3 py-2 border-t shrink-0"
        style={{ borderColor: BORDER }}
      >
        {[
          { key: '↑↓',  label: strings.commandPalette.labels.navigate },
          { key: '↵',   label: strings.commandPalette.labels.select },
          { key: 'esc', label: strings.commandPalette.labels.close },
        ].map(({ key, label }) => (
          <span key={key} className="flex items-center gap-1 text-[10px]" style={{ color: TEXT_DIM }}>
            <kbd
              className="font-mono px-1 rounded text-[9px]"
              style={{ border: `1px solid ${BORDER}` }}
            >
              {key}
            </kbd>
            {label}
          </span>
        ))}

        {mode === 'default' && (
          <span className="ml-auto text-[10px] font-mono" style={{ color: TEXT_DIM }}>
            {strings.commandPalette.modes.hintSuffix}
          </span>
        )}
      </div>
    </>
  )

  const panelSharedStyle: React.CSSProperties = {
    ...dropdownStyle,
    maxHeight: '62vh',
    background: PANEL_BG,
    borderColor: BORDER,
    boxShadow: `0 8px 24px rgba(0,0,0,${themeIsDark ? '0.5' : '0.15'}), 0 0 0 1px ${BORDER}, 0 0 48px ${TEAL}06`,
    backgroundImage: themeIsDark
      ? 'linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0) 100%)'
      : 'none',
  }

  // ── Portal (avoids header clipping) ────────────────────────────────────────

  const portal = open && typeof document !== 'undefined'
    ? createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div
            className="fixed z-50 flex flex-col rounded-xl border overflow-hidden"
            style={panelSharedStyle}
            role="dialog"
            aria-label={strings.commandPalette.placeholder}
            aria-modal
            onClick={e => e.stopPropagation()}
          >
            {/* CENTER MODE: input bar inside the portal panel */}
            {commandPalettePosition === 'center' && (
              <div
                className="flex items-center gap-2.5 px-3 py-2.5 shrink-0 border-b"
                style={{ borderColor: BORDER }}
              >
                <PaletteInput
                  ref={inputRef}
                  value={query}
                  placeholder={modeConfig?.placeholder ?? strings.commandPalette.placeholder}
                  modeConfig={modeConfig}
                  onChange={setSearch}
                />
              </div>
            )}

            {panelContent}
          </div>
        </>,
        document.body,
      )
    : null

  // ── Trigger bar (always in header) ─────────────────────────────────────────

  return (
    <div ref={triggerRef} className="w-full max-w-[560px]">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={LISTBOX_ID}
        className="w-full flex items-center gap-2 rounded-lg px-3 h-8 transition-all text-left"
        style={{
          border:     `1px solid ${open ? `${TEAL}60` : BORDER}`,
          background: open && commandPalettePosition === 'top' ? `${TEAL}08` : 'transparent',
          color:      TEXT_DIM,
        }}
        onMouseEnter={e => {
          if (!open) {
            e.currentTarget.style.borderColor = `${TEAL}60`
            e.currentTarget.style.color = TEXT
          }
        }}
        onMouseLeave={e => {
          if (!open) {
            e.currentTarget.style.borderColor = BORDER
            e.currentTarget.style.color = TEXT_DIM
          }
        }}
      >
        <Search size={12} style={{ flexShrink: 0, color: open ? TEAL : 'inherit' }} />

        {/* TOP MODE + open: input in trigger bar */}
        {commandPalettePosition === 'top' && open ? (
          <div className="flex flex-1 items-center gap-1.5 min-w-0">
            <PaletteInput
              ref={inputRef}
              value={query}
              placeholder={modeConfig?.placeholder ?? strings.commandPalette.placeholder}
              modeConfig={modeConfig}
              onChange={setSearch}
              onClick={e => e.stopPropagation()}
            />
          </div>
        ) : (
          <span
            className="flex-1 truncate text-[13px]"
            title={breadcrumb?.tooltip}
            style={{ color: breadcrumb ? TEXT : TEXT_DIM }}
          >
            {breadcrumb?.short ?? strings.commandPalette.buttonLabel}
          </span>
        )}

        <kbd
          className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-mono font-bold"
          style={{ background: CARD_BG, border: `1px solid ${BORDER}`, color: TEXT_DIM }}
        >
          ⌘K
        </kbd>
      </button>

      {portal}
    </div>
  )
}
