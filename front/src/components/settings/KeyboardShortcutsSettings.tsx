/**
 * KeyboardShortcutsSettings — VS Code-style keyboard shortcuts editor.
 *
 * Table view: Command | Keybinding | When | Source
 * JSON view:  user overrides only, editable
 *
 * Changes are saved immediately (no draft/save cycle).
 */
import { useState, useEffect, useRef, useMemo } from 'react'
import { RotateCcw, Code2, Table2, Search, AlertCircle } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { usePrismTheme } from '@/styles/usePrismTheme'
import {
  DEFAULT_KEYBINDINGS,
  formatKeyEvent,
  type KeybindingEntry,
} from '@/core/shortcuts/defaults'
import type { SettingsStrings } from '@/i18n/settings'

interface Props {
  strings: SettingsStrings['shortcuts']
  locale: string
}

export function KeyboardShortcutsSettings({ strings, locale }: Props) {
  const { BORDER, CARD_BG, PAGE_BG, PANEL_BG, TEAL, TEAL_DIM, TEXT, TEXT_DIM } = usePrismTheme()

  const userKeybindings  = useAppStore(s => s.preferences.userKeybindings)
  const setKeybinding    = useAppStore(s => s.setKeybinding)
  const resetKeybinding  = useAppStore(s => s.resetKeybinding)
  const updatePrefs      = useAppStore(s => s.updateAppPreferences)
  const preferences      = useAppStore(s => s.preferences)

  const [filter, setFilter]     = useState('')
  const [jsonMode, setJsonMode] = useState(false)
  const [jsonText, setJsonText] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [capturing, setCapturing] = useState<string | null>(null)  // id being captured

  // Sync JSON text when opening JSON view
  useEffect(() => {
    if (jsonMode) {
      setJsonText(JSON.stringify(userKeybindings, null, 2))
      setJsonError(null)
    }
  }, [jsonMode, userKeybindings])

  // Key capture listener
  const capturingRef = useRef(capturing)
  capturingRef.current = capturing

  useEffect(() => {
    if (!capturing) return
    const handler = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.key === 'Escape') { setCapturing(null); return }
      const shortcut = formatKeyEvent(e)
      if (!shortcut) return
      setKeybinding(capturingRef.current!, shortcut)
      setCapturing(null)
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [capturing, setKeybinding])

  // Filter entries
  const filtered = useMemo(() => {
    const q = filter.toLowerCase()
    if (!q) return DEFAULT_KEYBINDINGS
    return DEFAULT_KEYBINDINGS.filter(e => {
      const cmd = (locale === 'fr' ? e.commandFr : e.commandEn).toLowerCase()
      const kb  = (userKeybindings[e.id] ?? e.keybinding).toLowerCase()
      return cmd.includes(q) || kb.includes(q)
    })
  }, [filter, userKeybindings, locale])

  // Group by category
  const categories = useMemo(() => {
    const map = new Map<string, KeybindingEntry[]>()
    for (const entry of filtered) {
      const cat = entry.category
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(entry)
    }
    return map
  }, [filtered])

  const handleJsonSave = () => {
    try {
      const parsed = JSON.parse(jsonText)
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('Expected an object')
      }
      updatePrefs({ ...preferences, userKeybindings: parsed as Record<string, string> })
      setJsonError(null)
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Invalid JSON')
    }
  }

  const resetAll = () => {
    updatePrefs({ ...preferences, userKeybindings: {} })
  }

  const effectiveBinding = (entry: KeybindingEntry) =>
    userKeybindings[entry.id] ?? entry.keybinding

  const isOverridden = (id: string) => id in userKeybindings

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 border-b shrink-0"
        style={{ borderColor: BORDER, background: PANEL_BG }}
      >
        {/* Search */}
        <div
          className="flex items-center gap-2 flex-1 rounded-lg border px-2.5 h-7"
          style={{ borderColor: BORDER, background: PAGE_BG }}
        >
          <Search size={12} style={{ color: TEXT_DIM, flexShrink: 0 }} />
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder={strings.searchPlaceholder}
            className="flex-1 bg-transparent text-[12px] outline-none"
            style={{ color: TEXT }}
          />
        </div>

        {/* JSON/Table toggle */}
        <button
          type="button"
          onClick={() => setJsonMode(m => !m)}
          className="flex items-center gap-1.5 rounded-md border px-2.5 h-7 text-[11px] font-medium shrink-0"
          style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT_DIM }}
        >
          {jsonMode ? <Table2 size={12} /> : <Code2 size={12} />}
          {jsonMode ? strings.tableToggle : strings.jsonToggle}
        </button>

        {/* Reset all */}
        {Object.keys(userKeybindings).length > 0 && (
          <button
            type="button"
            onClick={resetAll}
            className="flex items-center gap-1.5 rounded-md border px-2.5 h-7 text-[11px] font-medium shrink-0"
            style={{ borderColor: `${BORDER}`, background: PAGE_BG, color: TEXT_DIM }}
          >
            <RotateCcw size={11} />
            {strings.resetAll}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto" style={{ background: CARD_BG }}>
        {jsonMode ? (
          // ── JSON view ────────────────────────────────────────────────────
          <div className="p-4 flex flex-col gap-3 h-full">
            <p className="text-[11px]" style={{ color: TEXT_DIM }}>{strings.jsonHint}</p>
            <textarea
              value={jsonText}
              onChange={e => { setJsonText(e.target.value); setJsonError(null) }}
              onBlur={handleJsonSave}
              className="flex-1 rounded-lg border p-3 font-mono text-[12px] resize-none outline-none min-h-[200px]"
              style={{
                borderColor: jsonError ? '#EF4444' : BORDER,
                background: PAGE_BG,
                color: TEXT,
              }}
              spellCheck={false}
            />
            {jsonError && (
              <div className="flex items-center gap-2 text-[11px]" style={{ color: '#F87171' }}>
                <AlertCircle size={12} />
                {jsonError}
              </div>
            )}
          </div>
        ) : (
          // ── Table view ───────────────────────────────────────────────────
          <table className="w-full border-collapse" style={{ fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {[strings.columns.command, strings.columns.keybinding, strings.columns.when, strings.columns.source].map(col => (
                  <th
                    key={col}
                    className="px-4 py-2 text-left font-semibold uppercase tracking-widest"
                    style={{ color: TEXT_DIM, fontSize: 9, background: PANEL_BG }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from(categories.entries()).map(([cat, entries]) => (
                <>
                  {/* Category separator */}
                  <tr key={`cat-${cat}`}>
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
                      {strings.categories[cat as keyof typeof strings.categories] ?? cat}
                    </td>
                  </tr>

                  {entries.map(entry => {
                    const kb         = effectiveBinding(entry)
                    const overridden = isOverridden(entry.id)
                    const isCapturing = capturing === entry.id
                    const cmd = locale === 'fr' ? entry.commandFr : entry.commandEn

                    return (
                      <tr
                        key={entry.id}
                        style={{ borderBottom: `1px solid ${BORDER}20` }}
                        onMouseEnter={e => (e.currentTarget.style.background = PAGE_BG + '80')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        {/* Command */}
                        <td className="px-4 py-2" style={{ color: TEXT }}>
                          {cmd}
                        </td>

                        {/* Keybinding — clickable cell */}
                        <td className="px-4 py-2">
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
                                borderColor: overridden ? `${TEAL}60` : BORDER,
                                color: overridden ? TEAL_DIM : kb ? TEXT : TEXT_DIM,
                                background: overridden ? `${TEAL}10` : 'transparent',
                              }}
                              title="Click to rebind"
                            >
                              <kbd className="font-mono">{kb || strings.unbound}</kbd>
                            </button>
                          )}
                        </td>

                        {/* When */}
                        <td className="px-4 py-2" style={{ color: TEXT_DIM }}>
                          {entry.when}
                        </td>

                        {/* Source + reset button */}
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
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
