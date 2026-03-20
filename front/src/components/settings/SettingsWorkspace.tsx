import { useEffect, useMemo, useState, type ElementType, type ReactNode } from 'react'
import { Cpu, Moon, Settings2, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useAppStore, type SettingsSection } from '@/store/appStore'
import {
  DEFAULT_APP_PREFERENCES,
  resolveAppPreferences,
  type AppPreferences,
} from '@/core/models/appPreferences'
import { usePrismTheme } from '@/styles/usePrismTheme'

const SECTIONS: {
  id: SettingsSection
  label: string
  hint: string
  Icon: ElementType
}[] = [
  { id: 'general', label: 'Général', hint: 'Apparence et préférences locales', Icon: Settings2 },
  { id: 'engine', label: 'Engine', hint: 'Tolérance de comparaison front / backend', Icon: Cpu },
]

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

function NoteCard({ title, children }: { title: string; children: ReactNode }) {
  const { BORDER, PAGE_BG, TEXT, TEXT_DIM, SHADOW_SOFT } = usePrismTheme()

  return (
    <div
      className="rounded-xl border px-4 py-4"
      style={{ borderColor: BORDER, background: PAGE_BG, boxShadow: SHADOW_SOFT }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: TEXT_DIM }}>{title}</p>
      <div className="mt-2 space-y-2 text-sm leading-relaxed" style={{ color: TEXT }}>
        {children}
      </div>
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
  const resetAppPreferences = useAppStore(s => s.resetAppPreferences)
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

  useEffect(() => {
    setSaved(preferences)
    setDraft(preferences)
  }, [preferences.engineCompareTolerancePct, preferences.theme])

  const isDirty = useMemo(() => {
    const left = JSON.stringify(draft)
    const right = JSON.stringify(saved)
    return left === right ? false : true
  }, [draft, saved])

  const requestExit = () => {
    if (isDirty) {
      const confirmed = window.confirm('Les modifications non enregistrées seront perdues. Quitter les paramètres ?')
      if (confirmed === false) return
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
  }, [requestExit])

  const apply = () => {
    const next = resolveAppPreferences(draft)
    updateAppPreferences(next)
    setSaved(next)
    setDraft(next)
  }

  const discard = () => setDraft(saved)

  const reset = () => {
    setDraft(DEFAULT_APP_PREFERENCES)
  }

  const applyDefaultsNow = () => {
    resetAppPreferences()
    setSaved(DEFAULT_APP_PREFERENCES)
    setDraft(DEFAULT_APP_PREFERENCES)
  }

  return (
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
            Paramètres utiles
          </p>
          <div className="space-y-1">
            {SECTIONS.map(({ id, label, hint, Icon }) => {
              const selected = id === section
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSectionChange(id)}
                  className={cn('w-full rounded-lg border px-2.5 py-2 text-left transition-colors')}
                  style={selected
                    ? { borderColor: `${TEAL}80`, background: CARD_BG }
                    : { borderColor: 'transparent', background: 'transparent' }}
                  onMouseEnter={event => {
                    if (selected === false) {
                      event.currentTarget.style.background = CARD_BG
                      event.currentTarget.style.borderColor = BORDER
                    }
                  }}
                  onMouseLeave={event => {
                    if (selected === false) {
                      event.currentTarget.style.background = 'transparent'
                      event.currentTarget.style.borderColor = 'transparent'
                    }
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={14} style={{ color: selected ? TEAL_DIM : TEXT_DIM }} />
                    <span className={selected ? 'text-sm font-semibold' : 'text-sm'} style={{ color: selected ? TEXT : TEXT_DIM }}>
                      {label}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>{hint}</p>
                </button>
              )
            })}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col">
          <header className="border-b px-5 py-3" style={{ borderColor: BORDER, background: CARD_BG }}>
            <h1 className="text-base font-bold" style={{ color: TEXT }}>Configuration de l’application</h1>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
              Cette vue ne garde que les préférences réellement actives aujourd’hui dans PRISM. Le reste viendra quand la fonction existera vraiment.
            </p>
          </header>

          <div className="flex-1 min-h-0 overflow-y-auto p-5" style={{ background: CARD_BG }}>
            <div className="space-y-4">
              {section === 'general' && (
                <>
                  <SettingRow label="Thème" hint="Choix conservé entre deux ouvertures de l’application sur cet appareil.">
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
                        Sombre
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
                        Clair
                      </button>
                    </div>
                  </SettingRow>

                  <NoteCard title="Stockage actuel">
                    <p>
                      Les préférences de cette page sont stockées localement dans le navigateur ou dans le conteneur desktop de cette machine.
                    </p>
                    <p style={{ color: TEXT_DIM }}>
                      C’est le bon niveau pour le thème et les réglages d’interface. Une synchronisation Supabase pourra être ajoutée plus tard si on veut retrouver ces préférences d’un appareil à l’autre.
                    </p>
                  </NoteCard>
                </>
              )}

              {section === 'engine' && (
                <>
                  <SettingRow label="Tolérance de comparaison" hint="Seuil utilisé par Engine pour qualifier un delta front / backend en aligné ou en dérive.">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="5"
                        step="0.05"
                        value={String(draft.engineCompareTolerancePct)}
                        onChange={event => {
                          const nextValue = Number(event.currentTarget.value)
                          const safeValue = Number.isFinite(nextValue)
                            ? nextValue
                            : draft.engineCompareTolerancePct
                          setDraft(current => ({
                            ...current,
                            engineCompareTolerancePct: safeValue,
                          }))
                        }}
                        className="w-28 text-right"
                      />
                      <span className="text-sm font-semibold" style={{ color: TEXT_DIM }}>%</span>
                    </div>
                  </SettingRow>

                  <NoteCard title="Effet dans Engine">
                    <p>
                      Cette valeur est utilisée dans <span style={{ color: TEAL_DIM }}>Compare TS / Python</span> pour déterminer si un écart reste acceptable ou s’il doit être lu comme une dérive.
                    </p>
                    <p style={{ color: TEXT_DIM }}>
                      Elle influence les verdicts futurs et la lecture du route inspector. Elle n’altère pas les calculs eux-mêmes, seulement l’interprétation comparative.
                    </p>
                  </NoteCard>
                </>
              )}
            </div>
          </div>

          <footer className="flex items-center justify-between border-t px-5 py-3" style={{ borderColor: BORDER, background: CARD_BG }}>
            <p className="text-xs" style={{ color: TEXT_DIM }}>
              {isDirty ? 'Modifications non enregistrées' : 'Préférences enregistrées pour cet appareil'} · Esc pour quitter
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={discard} disabled={isDirty === false}>
                Annuler
              </Button>
              <Button variant="outline" onClick={reset}>
                Revenir aux valeurs par défaut
              </Button>
              <Button onClick={apply} disabled={isDirty === false}>
                Enregistrer
              </Button>
              <Button variant="outline" onClick={applyDefaultsNow}>
                Réinitialiser maintenant
              </Button>
            </div>
          </footer>
        </section>
      </div>
    </div>
  )
}
