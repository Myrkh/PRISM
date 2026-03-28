/**
 * KeyboardShortcutsSettings — VS Code-style keyboard shortcuts editor.
 *
 * Table view only. JSON editing is delegated to the dedicated keybindings.json document.
 *
 * Changes are saved immediately.
 */
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Braces, RotateCcw, Search } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { formatKeyEvent } from '@/core/shortcuts/defaults'
import type { SettingsStrings } from '@/i18n/settings'
import {
  buildKeybindingsWorkspaceEntries,
  type KeybindingsWorkspaceEntry,
} from './keybindingsWorkspaceJson'
import { openKeybindingsWorkspaceNode, syncKeybindingsWorkspaceNodeIfExists } from './keybindingsWorkspaceNode'
import { openUserCommandsWorkspaceNode } from './userCommandsWorkspaceNode'

interface Props {
  strings: SettingsStrings['shortcuts']
  locale: string
}

export function KeyboardShortcutsSettings({ strings, locale }: Props) {
  const { BORDER, CARD_BG, PAGE_BG, PANEL_BG, TEAL, TEAL_DIM, TEXT, TEXT_DIM } = usePrismTheme()

  const userKeybindings = useAppStore(s => s.preferences.userKeybindings)
  const setKeybinding = useAppStore(s => s.setKeybinding)
  const resetKeybinding = useAppStore(s => s.resetKeybinding)
  const updatePrefs = useAppStore(s => s.updateAppPreferences)
  const preferences = useAppStore(s => s.preferences)

  const [filter, setFilter] = useState('')
  const [capturing, setCapturing] = useState<string | null>(null)

  const capturingRef = useRef(capturing)
  capturingRef.current = capturing

  useEffect(() => {
    syncKeybindingsWorkspaceNodeIfExists()
  }, [userKeybindings])

  useEffect(() => {
    if (!capturing) return
    const handler = (event: KeyboardEvent) => {
      event.preventDefault()
      event.stopPropagation()
      if (event.key === 'Escape') {
        setCapturing(null)
        return
      }
      const shortcut = formatKeyEvent(event)
      if (!shortcut) return
      setKeybinding(capturingRef.current!, shortcut)
      setCapturing(null)
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [capturing, setKeybinding])

  const allEntries = useMemo(() => buildKeybindingsWorkspaceEntries(userKeybindings), [userKeybindings])

  /** keybinding → list of command IDs sharing it (only entries with 2+ commands) */
  const conflictMap = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const entry of allEntries) {
      if (!entry.keybinding) continue
      const ids = map.get(entry.keybinding) ?? []
      ids.push(entry.id)
      map.set(entry.keybinding, ids)
    }
    return new Map([...map.entries()].filter(([, ids]) => ids.length > 1))
  }, [allEntries])

  const filtered = useMemo(() => {
    const query = filter.toLowerCase().trim()
    if (!query) return allEntries
    return allEntries.filter(entry => {
      const command = (locale === 'fr' ? entry.commandFr : entry.commandEn).toLowerCase()
      const keybinding = entry.keybinding.toLowerCase()
      const when = entry.when.toLowerCase()
      const category = entry.category.toLowerCase()
      return command.includes(query)
        || keybinding.includes(query)
        || when.includes(query)
        || category.includes(query)
        || entry.id.toLowerCase().includes(query)
    })
  }, [allEntries, filter, locale])

  const categories = useMemo(() => {
    const map = new Map<string, KeybindingsWorkspaceEntry[]>()
    for (const entry of filtered) {
      const category = entry.category
      if (!map.has(category)) map.set(category, [])
      map.get(category)!.push(entry)
    }
    return map
  }, [filtered])

  const resetAll = () => {
    updatePrefs({ ...preferences, userKeybindings: {} })
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div
        className="flex items-center gap-2 px-4 py-2.5 border-b shrink-0"
        style={{ borderColor: BORDER, background: PANEL_BG }}
      >
        <div
          className="flex items-center gap-2 flex-1 rounded-lg border px-2.5 h-7"
          style={{ borderColor: BORDER, background: PAGE_BG }}
        >
          <Search size={12} style={{ color: TEXT_DIM, flexShrink: 0 }} />
          <input
            value={filter}
            onChange={event => setFilter(event.target.value)}
            placeholder={strings.searchPlaceholder}
            className="flex-1 bg-transparent text-[12px] outline-none"
            style={{ color: TEXT }}
          />
        </div>

        <button
          type="button"
          onClick={() => openKeybindingsWorkspaceNode()}
          className="flex items-center gap-1.5 rounded-md border px-2.5 h-7 text-[11px] font-medium shrink-0"
          style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT_DIM }}
          title={strings.openJson}
        >
          <Braces size={12} />
          {strings.openJson}
        </button>

        <button
          type="button"
          onClick={() => openUserCommandsWorkspaceNode()}
          className="flex items-center gap-1.5 rounded-md border px-2.5 h-7 text-[11px] font-medium shrink-0"
          style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT_DIM }}
          title={strings.openUserCommandsJson}
        >
          <Braces size={12} />
          {strings.openUserCommandsJson}
        </button>

        {Object.keys(userKeybindings).length > 0 && (
          <button
            type="button"
            onClick={resetAll}
            className="flex items-center gap-1.5 rounded-md border px-2.5 h-7 text-[11px] font-medium shrink-0"
            style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT_DIM }}
          >
            <RotateCcw size={11} />
            {strings.resetAll}
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto" style={{ background: CARD_BG }}>
        <table className="w-full border-collapse" style={{ fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
              {[strings.columns.command, strings.columns.keybinding, strings.columns.when, strings.columns.source].map(column => (
                <th
                  key={column}
                  className="px-4 py-2 text-left font-semibold uppercase tracking-widest"
                  style={{ color: TEXT_DIM, fontSize: 9, background: PANEL_BG }}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from(categories.entries()).map(([category, entries]) => (
              <Fragment key={category}>
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 pt-3 pb-1"
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: TEXT_DIM,
                    }}
                  >
                    {strings.categories[category as keyof typeof strings.categories] ?? category}
                  </td>
                </tr>

                {entries.map(entry => {
                  const overridden = entry.source === 'user'
                  const isCapturing = capturing === entry.id
                  const command = locale === 'fr' ? entry.commandFr : entry.commandEn

                  return (
                    <tr
                      key={entry.id}
                      style={{ borderBottom: `1px solid ${BORDER}20` }}
                      onMouseEnter={event => { event.currentTarget.style.background = `${PAGE_BG}80` }}
                      onMouseLeave={event => { event.currentTarget.style.background = 'transparent' }}
                    >
                      <td className="px-4 py-2" style={{ color: TEXT }}>
                        <div className="flex flex-col gap-0.5">
                          <span>{command}</span>
                          <span className="text-[10px]" style={{ color: TEXT_DIM }}>{entry.id}</span>
                        </div>
                      </td>

                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1.5">
                        {isCapturing ? (
                          <span
                            className="inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] animate-pulse"
                            style={{ borderColor: TEAL, color: TEAL, background: `${TEAL}10` }}
                          >
                            {strings.pressKey}
                            <span style={{ color: TEXT_DIM, fontSize: 10 }}>{strings.pressKeyCancel}</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setCapturing(entry.id)}
                            className="group inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] transition-colors"
                            style={{
                              borderColor: conflictMap.has(entry.keybinding) ? '#F59E0B60' : overridden ? `${TEAL}60` : BORDER,
                              color: conflictMap.has(entry.keybinding) ? '#F59E0B' : overridden ? TEAL_DIM : entry.keybinding ? TEXT : TEXT_DIM,
                              background: conflictMap.has(entry.keybinding) ? '#F59E0B10' : overridden ? `${TEAL}10` : 'transparent',
                            }}
                            title="Click to rebind"
                          >
                            <kbd className="font-mono">{entry.keybinding || strings.unbound}</kbd>
                          </button>
                        )}
                        {conflictMap.has(entry.keybinding) && !isCapturing && (
                          <span
                            title={strings.conflict(
                              conflictMap.get(entry.keybinding)!.filter(id => id !== entry.id).join(', ')
                            )}
                          >
                            <AlertTriangle size={11} style={{ color: '#F59E0B' }} />
                          </span>
                        )}
                        </div>
                      </td>

                      <td className="px-4 py-2" style={{ color: TEXT_DIM }}>
                        {entry.when}
                      </td>

                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                            style={{
                              background: overridden ? `${TEAL}20` : `${BORDER}40`,
                              color: overridden ? TEAL_DIM : TEXT_DIM,
                              border: `1px solid ${overridden ? `${TEAL}40` : BORDER}`,
                            }}
                          >
                            {overridden ? strings.sources.user : strings.sources.default}
                          </span>
                          {overridden && (
                            <button
                              type="button"
                              onClick={() => resetKeybinding(entry.id)}
                              className="opacity-50 hover:opacity-100 transition-opacity"
                              title={strings.reset}
                            >
                              <RotateCcw size={11} style={{ color: TEXT_DIM }} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
