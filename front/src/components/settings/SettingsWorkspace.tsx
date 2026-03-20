import { useEffect, useMemo, useState, type ElementType, type ReactNode } from 'react'
import { Cpu, Moon, Settings2, SlidersHorizontal, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { useAppStore, type SettingsSection } from '@/store/appStore'
import {
  DEFAULT_APP_PREFERENCES,
  WORKSPACE_LEFT_PANEL_WIDTH_MAX,
  WORKSPACE_LEFT_PANEL_WIDTH_MIN,
  WORKSPACE_RIGHT_PANEL_WIDTH_MAX,
  WORKSPACE_RIGHT_PANEL_WIDTH_MIN,
  resolveAppPreferences,
  type AppPreferences,
} from '@/core/models/appPreferences'
import { getSettingsStrings } from '@/i18n/settings'
import { resolveAppLocale } from '@/i18n/types'
import { usePrismTheme } from '@/styles/usePrismTheme'

function SettingRow({
  label,
  hint,
  children,
}: {
  label: string
  hint: string
  children: ReactNode
}) {
  const { BORDER, CARD_BG, TEXT, TEXT_DIM } = usePrismTheme()

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border px-4 py-3" style={{ borderColor: BORDER, background: CARD_BG }}>
      <div className="min-w-0">
        <p className="text-sm font-semibold" style={{ color: TEXT }}>{label}</p>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>{hint}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

interface SettingsWorkspaceProps {
  section: SettingsSection
  onSectionChange: (section: SettingsSection) => void
  onExit: () => void
}

export function SettingsWorkspace({ section, onSectionChange, onExit }: SettingsWorkspaceProps) {
  const preferences = useAppStore(s => s.preferences)
  const updateAppPreferences = useAppStore(s => s.updateAppPreferences)
  const {
    BORDER,
    CARD_BG,
    PAGE_BG,
    PANEL_BG,
    TEAL,
    TEAL_DIM,
    TEXT,
    TEXT_DIM,
    isDark,
  } = usePrismTheme()

  const [saved, setSaved] = useState<AppPreferences>(preferences)
  const [draft, setDraft] = useState<AppPreferences>(preferences)
  const [showExitDialog, setShowExitDialog] = useState(false)

  useEffect(() => {
    setSaved(preferences)
    setDraft(preferences)
  }, [preferences])

  const locale = resolveAppLocale(draft.language)
  const strings = useMemo(() => getSettingsStrings(locale), [locale])

  const sections: {
    id: SettingsSection
    label: string
    hint: string
    Icon: ElementType
  }[] = useMemo(() => [
    { id: 'general', label: strings.sections.general.label, hint: strings.sections.general.hint, Icon: Settings2 },
    { id: 'workspace', label: strings.sections.workspace.label, hint: strings.sections.workspace.hint, Icon: SlidersHorizontal },
    { id: 'engine', label: strings.sections.engine.label, hint: strings.sections.engine.hint, Icon: Cpu },
  ], [strings])

  const currentSection = sections.find(item => item.id === section) ?? sections[0]
  const isDirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved])

  const requestExit = () => {
    if (isDirty) {
      setShowExitDialog(true)
      return
    }
    onExit()
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        const target = document.activeElement as HTMLElement | null
        const isEditingElement = target === null
          ? false
          : target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.tagName === 'SELECT' ||
            target.isContentEditable

        if (isEditingElement) return

        event.preventDefault()
        requestExit()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isDirty, onExit, draft, saved])

  const apply = () => {
    const next = resolveAppPreferences(draft)
    updateAppPreferences(next)
    setSaved(next)
    setDraft(next)
  }

  const discard = () => setDraft(saved)

  const resetDraftToDefaults = () => {
    setDraft(DEFAULT_APP_PREFERENCES)
  }

  const confirmExit = () => {
    setShowExitDialog(false)
    onExit()
  }

  return (
    <>
      <div className="flex-1 min-h-0 px-5 pb-5 pt-2" onClick={requestExit}>
        <div
          className="grid h-full min-h-0 grid-cols-[240px_1fr] overflow-hidden rounded-xl border"
          style={{
            borderColor: BORDER,
            background: CARD_BG,
            boxShadow: isDark ? 'none' : '0 18px 42px rgba(15,23,42,0.05), 0 4px 12px rgba(15,23,42,0.03)',
          }}
          onClick={event => event.stopPropagation()}
        >
          <aside className="overflow-y-auto border-r p-3" style={{ borderColor: BORDER, background: PANEL_BG }}>
            <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: TEXT_DIM }}>
              {strings.sidebarTitle}
            </p>
            <div className="space-y-1">
              {sections.map(({ id, label, hint, Icon }) => {
                const selected = id === section
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onSectionChange(id)}
                    className={cn('relative w-full overflow-hidden rounded-lg border px-2.5 py-2 text-left transition-colors')}
                    style={selected
                      ? { borderColor: TEAL + '80', background: CARD_BG }
                      : { borderColor: 'transparent', background: 'transparent' }}
                    onMouseEnter={event => {
                      if (!selected) {
                        event.currentTarget.style.background = CARD_BG
                        event.currentTarget.style.borderColor = BORDER
                      }
                    }}
                    onMouseLeave={event => {
                      if (!selected) {
                        event.currentTarget.style.background = 'transparent'
                        event.currentTarget.style.borderColor = 'transparent'
                      }
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-1.5 left-1.5 w-1 rounded-full transition-opacity"
                      style={{
                        background: TEAL,
                        opacity: selected ? 1 : 0,
                      }}
                    />
                    <div className="pl-4">
                      <div className="flex items-center gap-2">
                        <Icon size={14} style={{ color: selected ? TEAL_DIM : TEXT_DIM }} />
                        <span className={selected ? 'text-sm font-semibold' : 'text-sm'} style={{ color: selected ? TEXT : TEXT_DIM }}>
                          {label}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>{hint}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </aside>

          <section className="flex min-h-0 flex-col">
            <header className="border-b px-5 py-3" style={{ borderColor: BORDER, background: CARD_BG }}>
              <h1 className="text-base font-bold" style={{ color: TEXT }}>{currentSection.label}</h1>
            </header>

            <div className="flex-1 min-h-0 overflow-y-auto p-5" style={{ background: CARD_BG }}>
              <div className="space-y-4">
                {section === 'general' && (
                  <>
                    <SettingRow label={strings.general.language.label} hint={strings.general.language.hint}>
                      <div className="inline-flex rounded-lg border p-1" style={{ borderColor: BORDER, background: PAGE_BG }}>
                        <button
                          type="button"
                          onClick={() => setDraft(current => ({ ...current, language: 'fr' }))}
                          className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors"
                          style={draft.language === 'fr'
                            ? { background: TEAL, color: '#fff' }
                            : { color: TEXT_DIM }}
                        >
                          FR
                          {strings.general.language.fr}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDraft(current => ({ ...current, language: 'en' }))}
                          className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors"
                          style={draft.language === 'en'
                            ? { background: TEAL, color: '#fff' }
                            : { color: TEXT_DIM }}
                        >
                          EN
                          {strings.general.language.en}
                        </button>
                      </div>
                    </SettingRow>

                    <SettingRow label={strings.general.theme.label} hint={strings.general.theme.hint}>
                      <div className="inline-flex rounded-lg border p-1" style={{ borderColor: BORDER, background: PAGE_BG }}>
                        <button
                          type="button"
                          onClick={() => setDraft(current => ({ ...current, theme: 'dark' }))}
                          className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors"
                          style={draft.theme === 'dark'
                            ? { background: TEAL, color: '#fff' }
                            : { color: TEXT_DIM }}
                        >
                          <Moon size={13} />
                          {strings.general.theme.dark}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDraft(current => ({ ...current, theme: 'light' }))}
                          className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors"
                          style={draft.theme === 'light'
                            ? { background: TEAL, color: '#fff' }
                            : { color: TEXT_DIM }}
                        >
                          <Sun size={13} />
                          {strings.general.theme.light}
                        </button>
                      </div>
                    </SettingRow>
                  </>
                )}

                {section === 'workspace' && (
                  <>
                    <SettingRow
                      label={strings.workspace.leftPanel.label}
                      hint={strings.workspace.leftPanel.hint(WORKSPACE_LEFT_PANEL_WIDTH_MIN, WORKSPACE_LEFT_PANEL_WIDTH_MAX)}
                    >
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={String(WORKSPACE_LEFT_PANEL_WIDTH_MIN)}
                          max={String(WORKSPACE_LEFT_PANEL_WIDTH_MAX)}
                          step="10"
                          value={String(draft.workspaceLeftPanelWidth)}
                          onChange={event => {
                            const nextValue = Number(event.currentTarget.value)
                            if (!Number.isFinite(nextValue)) return
                            setDraft(current => ({
                              ...current,
                              workspaceLeftPanelWidth: nextValue,
                            }))
                          }}
                          className="w-28 text-right"
                        />
                        <span className="text-sm font-semibold" style={{ color: TEXT_DIM }}>{strings.workspace.unit}</span>
                      </div>
                    </SettingRow>

                    <SettingRow
                      label={strings.workspace.rightPanel.label}
                      hint={strings.workspace.rightPanel.hint(WORKSPACE_RIGHT_PANEL_WIDTH_MIN, WORKSPACE_RIGHT_PANEL_WIDTH_MAX)}
                    >
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={String(WORKSPACE_RIGHT_PANEL_WIDTH_MIN)}
                          max={String(WORKSPACE_RIGHT_PANEL_WIDTH_MAX)}
                          step="10"
                          value={String(draft.workspaceRightPanelWidth)}
                          onChange={event => {
                            const nextValue = Number(event.currentTarget.value)
                            if (!Number.isFinite(nextValue)) return
                            setDraft(current => ({
                              ...current,
                              workspaceRightPanelWidth: nextValue,
                            }))
                          }}
                          className="w-28 text-right"
                        />
                        <span className="text-sm font-semibold" style={{ color: TEXT_DIM }}>{strings.workspace.unit}</span>
                      </div>
                    </SettingRow>
                  </>
                )}

                {section === 'engine' && (
                  <SettingRow label={strings.engine.tolerance.label} hint={strings.engine.tolerance.hint}>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="5"
                        step="0.05"
                        value={String(draft.engineCompareTolerancePct)}
                        onChange={event => {
                          const nextValue = Number(event.currentTarget.value)
                          if (!Number.isFinite(nextValue)) return
                          setDraft(current => ({
                            ...current,
                            engineCompareTolerancePct: nextValue,
                          }))
                        }}
                        className="w-28 text-right"
                      />
                      <span className="text-sm font-semibold" style={{ color: TEXT_DIM }}>{strings.engine.tolerance.unit}</span>
                    </div>
                  </SettingRow>
                )}
              </div>
            </div>

            <footer className="flex items-center justify-between border-t px-5 py-3" style={{ borderColor: BORDER, background: CARD_BG }}>
              <p className="text-xs" style={{ color: TEXT_DIM }}>
                {isDirty ? strings.footer.dirty : strings.footer.saved} · {strings.footer.esc}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={discard} disabled={!isDirty}>
                  {strings.actions.discard}
                </Button>
                <Button variant="outline" onClick={resetDraftToDefaults}>
                  {strings.actions.draftDefaults}
                </Button>
                <Button onClick={apply} disabled={!isDirty}>
                  {strings.actions.save}
                </Button>
              </div>
            </footer>
          </section>
        </div>
      </div>

      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{strings.confirmExit.title}</AlertDialogTitle>
            <AlertDialogDescription>{strings.confirmExit.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{strings.confirmExit.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmExit}>{strings.confirmExit.confirm}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
