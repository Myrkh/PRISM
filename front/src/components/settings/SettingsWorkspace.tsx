import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ChevronLeft, Moon, Sun } from 'lucide-react'
import { MODELS } from '@/components/layout/prism-ai/models'
import { KeyboardShortcutsSettings } from './KeyboardShortcutsSettings'
import { ProfileScopeCard } from './ProfileScopeCard'
import { ProfileSettingsPanel } from './ProfileSettingsPanel'
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
import { getAppSettingsSectionDescriptors, getProfileSettingsSectionDescriptors } from '@/core/settings/sections'
import {
  isProfileSettingsSection,
  useAppStore,
  type SettingsSection,
} from '@/store/appStore'
import {
  DECIMAL_ROUNDING_MAX,
  DECIMAL_ROUNDING_MIN,
  DEFAULT_APP_PREFERENCES,
  LANDING_VIEWS,
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

// ─── SettingRow ────────────────────────────────────────────────────────────

function SettingRow({
  label,
  hint,
  align = 'center',
  children,
}: {
  label: string
  hint: string
  align?: 'center' | 'start'
  children: ReactNode
}) {
  const { BORDER, CARD_BG, TEXT, TEXT_DIM } = usePrismTheme()

  return (
    <div
      className={`flex justify-between gap-4 rounded-xl border px-4 py-3 ${align === 'start' ? 'items-start' : 'items-center'}`}
      style={{ borderColor: BORDER, background: CARD_BG }}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold" style={{ color: TEXT }}>{label}</p>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>{hint}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

// ─── SettingBlock (full-width control below label) ────────────────────────

function SettingBlock({
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
    <div className="rounded-xl border px-4 py-3" style={{ borderColor: BORDER, background: CARD_BG }}>
      <p className="text-sm font-semibold" style={{ color: TEXT }}>{label}</p>
      <p className="mt-1 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>{hint}</p>
      <div className="mt-3">{children}</div>
    </div>
  )
}

// ─── SegmentedToggle helper ───────────────────────────────────────────────

function SegmentedToggle({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
}) {
  const { BORDER, PAGE_BG, TEAL, TEXT_DIM } = usePrismTheme()
  return (
    <div className="inline-flex rounded-lg border p-1" style={{ borderColor: BORDER, background: PAGE_BG }}>
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className="rounded-md px-3 py-1.5 text-xs font-semibold transition-colors"
          style={value === opt.value ? { background: TEAL, color: '#fff' } : { color: TEXT_DIM }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────

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
  const inProfileScope = isProfileSettingsSection(section)

  const appSections     = useMemo(() => getAppSettingsSectionDescriptors(strings), [strings])
  const profileSections = useMemo(() => getProfileSettingsSectionDescriptors(strings), [strings])

  const currentSection = (inProfileScope ? profileSections : appSections).find(item => item.id === section)
    ?? (inProfileScope ? profileSections[0] : appSections[0])

  const isDirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved])

  const requestExit = () => {
    if (isDirty) { setShowExitDialog(true); return }
    onExit()
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      const target = document.activeElement as HTMLElement | null
      const isEditing = target !== null && (
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' || target.isContentEditable
      )
      if (isEditing) return
      event.preventDefault()
      requestExit()
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

  const discard             = () => setDraft(saved)
  const resetDraftToDefaults = () => setDraft(DEFAULT_APP_PREFERENCES)
  const confirmExit         = () => { setShowExitDialog(false); onExit() }

  return (
    <>
      <div className="flex-1 min-h-0 px-5 pb-5 pt-2" onClick={requestExit}>
        <div
          className="grid h-full min-h-0 grid-cols-[260px_1fr] overflow-hidden rounded-xl border"
          style={{
            borderColor: BORDER,
            background: CARD_BG,
            boxShadow: isDark ? 'none' : '0 18px 42px rgba(15,23,42,0.05), 0 4px 12px rgba(15,23,42,0.03)',
          }}
          onClick={event => event.stopPropagation()}
        >
          {/* ── Sidebar ── */}
          <aside className="flex flex-col overflow-hidden border-r" style={{ borderColor: BORDER, background: PANEL_BG }}>
            {/* Header: title (app) or back button (profile) */}
            <div className="shrink-0 px-3 pt-3 pb-2">
              {inProfileScope ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSectionChange('general')}
                    className="flex flex-1 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors"
                    style={{ color: TEXT_DIM }}
                    onMouseEnter={event => { event.currentTarget.style.color = TEXT }}
                    onMouseLeave={event => { event.currentTarget.style.color = TEXT_DIM }}
                  >
                    <ChevronLeft size={13} />
                    {strings.scopeSwitcher.backToSettings}
                  </button>
                  {isDirty && (
                    <span
                      className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: TEAL }}
                      title={strings.footer.dirty}
                    />
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between px-2 py-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
                    {strings.sidebarTitle.app}
                  </p>
                  {isDirty && (
                    <span
                      className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: TEAL }}
                      title={strings.footer.dirty}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Section list */}
            <nav className="flex-1 overflow-y-auto px-3 space-y-1">
              {(inProfileScope ? profileSections : appSections).map(({ id, label, hint, Icon }) => {
                const selected = id === section
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onSectionChange(id)}
                    className={cn('relative w-full overflow-hidden rounded-lg border px-2.5 py-2 text-left transition-colors')}
                    style={selected
                      ? { borderColor: `${TEAL}80`, background: CARD_BG }
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
                      style={{ background: TEAL, opacity: selected ? 1 : 0 }}
                    />
                    <div className="pl-4">
                      <div className="flex items-center gap-2">
                        <Icon size={14} style={{ color: selected ? TEAL_DIM : TEXT_DIM }} />
                        <span
                          className={selected ? 'text-sm font-semibold' : 'text-sm'}
                          style={{ color: selected ? TEXT : TEXT_DIM }}
                        >
                          {label}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>{hint}</p>
                    </div>
                  </button>
                )
              })}
            </nav>

            {/* Profile card — sticky footer, always visible */}
            <div className="shrink-0 border-t px-3 py-3" style={{ borderColor: BORDER }}>
              <ProfileScopeCard
                strings={strings}
                onClick={() => onSectionChange('account')}
              />
            </div>
          </aside>

          {/* ── Content ── */}
          <section className="flex min-h-0 flex-col">
            <header className="border-b px-5 py-3 shrink-0" style={{ borderColor: BORDER, background: CARD_BG }}>
              <h1 className="text-base font-bold" style={{ color: TEXT }}>{currentSection.label}</h1>
            </header>

            <div
              className={
                section === 'shortcuts'
                  ? 'flex-1 min-h-0 overflow-hidden'
                  : inProfileScope
                    ? 'flex-1 min-h-0 overflow-y-auto'
                    : 'flex-1 min-h-0 overflow-y-auto p-5'
              }
              style={{ background: CARD_BG }}
            >
              {section === 'shortcuts' ? (
                <KeyboardShortcutsSettings strings={strings.shortcuts} locale={draft.language} />

              ) : inProfileScope ? (
                <ProfileSettingsPanel locale={draft.language} section={section} strings={strings} />

              ) : (
                <div className="space-y-4">

                  {/* ── General ── */}
                  {section === 'general' && (
                    <>
                      <SettingRow label={strings.general.language.label} hint={strings.general.language.hint}>
                        <SegmentedToggle
                          options={[
                            { value: 'fr', label: `FR  ${strings.general.language.fr}` },
                            { value: 'en', label: `EN  ${strings.general.language.en}` },
                          ]}
                          value={draft.language}
                          onChange={v => setDraft(c => ({ ...c, language: v as 'fr' | 'en' }))}
                        />
                      </SettingRow>

                      <SettingRow label={strings.general.theme.label} hint={strings.general.theme.hint}>
                        <div className="inline-flex rounded-lg border p-1" style={{ borderColor: BORDER, background: PAGE_BG }}>
                          <button
                            type="button"
                            onClick={() => setDraft(c => ({ ...c, theme: 'dark' }))}
                            className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors"
                            style={draft.theme === 'dark' ? { background: TEAL, color: '#fff' } : { color: TEXT_DIM }}
                          >
                            <Moon size={13} />{strings.general.theme.dark}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDraft(c => ({ ...c, theme: 'light' }))}
                            className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors"
                            style={draft.theme === 'light' ? { background: TEAL, color: '#fff' } : { color: TEXT_DIM }}
                          >
                            <Sun size={13} />{strings.general.theme.light}
                          </button>
                        </div>
                      </SettingRow>

                      <SettingRow label={strings.general.landingView.label} hint={strings.general.landingView.hint}>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {LANDING_VIEWS.map(view => (
                            <button
                              key={view}
                              type="button"
                              onClick={() => setDraft(c => ({ ...c, defaultLandingView: view }))}
                              className="rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors"
                              style={draft.defaultLandingView === view
                                ? { borderColor: TEAL, background: TEAL, color: '#fff' }
                                : { borderColor: BORDER, background: 'transparent', color: TEXT_DIM }}
                            >
                              {strings.general.landingView.views[view] ?? view}
                            </button>
                          ))}
                        </div>
                      </SettingRow>
                    </>
                  )}

                  {/* ── Workspace ── */}
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
                              const v = Number(event.currentTarget.value)
                              if (Number.isFinite(v)) setDraft(c => ({ ...c, workspaceLeftPanelWidth: v }))
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
                              const v = Number(event.currentTarget.value)
                              if (Number.isFinite(v)) setDraft(c => ({ ...c, workspaceRightPanelWidth: v }))
                            }}
                            className="w-28 text-right"
                          />
                          <span className="text-sm font-semibold" style={{ color: TEXT_DIM }}>{strings.workspace.unit}</span>
                        </div>
                      </SettingRow>

                      <SettingRow label={strings.workspace.rightPanelDefaultState.label} hint={strings.workspace.rightPanelDefaultState.hint}>
                        <SegmentedToggle
                          options={[
                            { value: 'open',   label: strings.workspace.rightPanelDefaultState.open },
                            { value: 'closed', label: strings.workspace.rightPanelDefaultState.closed },
                          ]}
                          value={draft.rightPanelDefaultState}
                          onChange={v => setDraft(c => ({ ...c, rightPanelDefaultState: v as 'open' | 'closed' }))}
                        />
                      </SettingRow>

                      <SettingRow label={strings.workspace.workflowBreadcrumb.label} hint={strings.workspace.workflowBreadcrumb.hint}>
                        <SegmentedToggle
                          options={[
                            { value: 'visible', label: strings.workspace.workflowBreadcrumb.visible },
                            { value: 'hidden',  label: strings.workspace.workflowBreadcrumb.hidden },
                          ]}
                          value={draft.showWorkflowBreadcrumb !== false ? 'visible' : 'hidden'}
                          onChange={v => setDraft(c => ({ ...c, showWorkflowBreadcrumb: v === 'visible' }))}
                        />
                      </SettingRow>

                      <SettingRow label={strings.workspace.commandPalettePosition.label} hint={strings.workspace.commandPalettePosition.hint}>
                        <SegmentedToggle
                          options={[
                            { value: 'top',    label: strings.workspace.commandPalettePosition.top },
                            { value: 'center', label: strings.workspace.commandPalettePosition.center },
                          ]}
                          value={draft.commandPalettePosition}
                          onChange={v => setDraft(c => ({ ...c, commandPalettePosition: v as 'top' | 'center' }))}
                        />
                      </SettingRow>

                      <SettingRow label={strings.workspace.pdfPageSize.label} hint={strings.workspace.pdfPageSize.hint}>
                        <SegmentedToggle
                          options={[
                            { value: 'A4',     label: strings.workspace.pdfPageSize.a4 },
                            { value: 'Letter', label: strings.workspace.pdfPageSize.letter },
                          ]}
                          value={draft.pdfPageSize}
                          onChange={v => setDraft(c => ({ ...c, pdfPageSize: v as 'A4' | 'Letter' }))}
                        />
                      </SettingRow>
                    </>
                  )}

                  {/* ── Engine ── */}
                  {section === 'engine' && (
                    <>
                      <SettingRow label={strings.engine.tolerance.label} hint={strings.engine.tolerance.hint}>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            max="5"
                            step="0.05"
                            value={String(draft.engineCompareTolerancePct)}
                            onChange={event => {
                              const v = Number(event.currentTarget.value)
                              if (Number.isFinite(v)) setDraft(c => ({ ...c, engineCompareTolerancePct: v }))
                            }}
                            className="w-28 text-right"
                          />
                          <span className="text-sm font-semibold" style={{ color: TEXT_DIM }}>{strings.engine.tolerance.unit}</span>
                        </div>
                      </SettingRow>

                      <SettingRow label={strings.engine.scientificNotation.label} hint={strings.engine.scientificNotation.hint}>
                        <div className="inline-flex rounded-lg border p-1" style={{ borderColor: BORDER, background: PAGE_BG }}>
                          <button
                            type="button"
                            onClick={() => setDraft(c => ({ ...c, useScientificNotation: true }))}
                            className="rounded-md px-3 py-1.5 text-xs font-semibold font-mono transition-colors"
                            style={draft.useScientificNotation ? { background: TEAL, color: '#fff' } : { color: TEXT_DIM }}
                          >
                            1.23e-4
                          </button>
                          <button
                            type="button"
                            onClick={() => setDraft(c => ({ ...c, useScientificNotation: false }))}
                            className="rounded-md px-3 py-1.5 text-xs font-semibold font-mono transition-colors"
                            style={!draft.useScientificNotation ? { background: TEAL, color: '#fff' } : { color: TEXT_DIM }}
                          >
                            0.000123
                          </button>
                        </div>
                      </SettingRow>

                      <SettingRow label={strings.engine.decimalRounding.label} hint={strings.engine.decimalRounding.hint}>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={String(DECIMAL_ROUNDING_MIN)}
                            max={String(DECIMAL_ROUNDING_MAX)}
                            step="1"
                            value={String(draft.decimalRoundingDigits)}
                            onChange={event => {
                              const v = Number(event.currentTarget.value)
                              if (Number.isFinite(v)) setDraft(c => ({ ...c, decimalRoundingDigits: v }))
                            }}
                            className="w-28 text-right"
                          />
                          <span className="text-sm font-semibold" style={{ color: TEXT_DIM }}>{strings.engine.decimalRounding.unit}</span>
                        </div>
                      </SettingRow>

                      <SettingRow label={strings.engine.defaultMissionTime.label} hint={strings.engine.defaultMissionTime.hint}>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            value={String(draft.defaultMissionTimeTH)}
                            onChange={event => {
                              const v = Number(event.currentTarget.value)
                              if (Number.isFinite(v) && v > 0) setDraft(c => ({ ...c, defaultMissionTimeTH: v }))
                            }}
                            className="w-28 text-right"
                          />
                          <span className="text-sm font-semibold" style={{ color: TEXT_DIM }}>{strings.engine.defaultMissionTime.unit}</span>
                        </div>
                      </SettingRow>

                      <SettingRow label={strings.engine.defaultProofTestInterval.label} hint={strings.engine.defaultProofTestInterval.hint}>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            value={String(draft.defaultProofTestIntervalTH)}
                            onChange={event => {
                              const v = Number(event.currentTarget.value)
                              if (Number.isFinite(v) && v > 0) setDraft(c => ({ ...c, defaultProofTestIntervalTH: v }))
                            }}
                            className="w-28 text-right"
                          />
                          <span className="text-sm font-semibold" style={{ color: TEXT_DIM }}>{strings.engine.defaultProofTestInterval.unit}</span>
                        </div>
                      </SettingRow>
                    </>
                  )}

                  {/* ── Export ── */}
                  {section === 'export' && (
                    <>
                      <SettingRow label={strings.export.companyName.label} hint={strings.export.companyName.hint}>
                        <Input
                          type="text"
                          placeholder={strings.export.companyName.placeholder}
                          value={draft.reportCompanyName}
                          onChange={event => setDraft(c => ({ ...c, reportCompanyName: event.currentTarget.value }))}
                          className="w-56"
                        />
                      </SettingRow>

                      <SettingRow label={strings.export.confidentialityLabel.label} hint={strings.export.confidentialityLabel.hint}>
                        <Input
                          type="text"
                          placeholder={strings.export.confidentialityLabel.placeholder}
                          value={draft.reportConfidentialityLabel}
                          onChange={event => setDraft(c => ({ ...c, reportConfidentialityLabel: event.currentTarget.value }))}
                          className="w-56"
                        />
                      </SettingRow>

                      <SettingRow label={strings.export.preparedBy.label} hint={strings.export.preparedBy.hint}>
                        <Input
                          type="text"
                          placeholder={strings.export.preparedBy.placeholder}
                          value={draft.reportPreparedBy}
                          onChange={event => setDraft(c => ({ ...c, reportPreparedBy: event.currentTarget.value }))}
                          className="w-56"
                        />
                      </SettingRow>

                      <SettingRow label={strings.export.checkedBy.label} hint={strings.export.checkedBy.hint}>
                        <Input
                          type="text"
                          placeholder={strings.export.checkedBy.placeholder}
                          value={draft.reportCheckedBy}
                          onChange={event => setDraft(c => ({ ...c, reportCheckedBy: event.currentTarget.value }))}
                          className="w-56"
                        />
                      </SettingRow>

                      <SettingRow label={strings.export.approvedBy.label} hint={strings.export.approvedBy.hint}>
                        <Input
                          type="text"
                          placeholder={strings.export.approvedBy.placeholder}
                          value={draft.reportApprovedBy}
                          onChange={event => setDraft(c => ({ ...c, reportApprovedBy: event.currentTarget.value }))}
                          className="w-56"
                        />
                      </SettingRow>

                      <SettingRow label={strings.export.signatureText.label} hint={strings.export.signatureText.hint} align="start">
                        <textarea
                          placeholder={strings.export.signatureText.placeholder}
                          value={draft.reportSignatureText}
                          onChange={event => setDraft(c => ({ ...c, reportSignatureText: event.currentTarget.value }))}
                          rows={3}
                          className="w-64 resize-none rounded-lg border px-3 py-2 text-xs leading-relaxed focus:outline-none focus:ring-1"
                          style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT }}
                        />
                      </SettingRow>
                    </>
                  )}

                  {/* ── PRISM AI ── */}
                  {section === 'ai' && (
                    <>
                      <SettingBlock label={strings.ai.defaultModel.label} hint={strings.ai.defaultModel.hint}>
                        {(() => {
                          const groups = Array.from(new Set(MODELS.map(m => m.group)))
                          return (
                            <div className="space-y-3">
                              {groups.map(group => (
                                <div key={group}>
                                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: TEXT_DIM }}>{group}</p>
                                  <div className="space-y-1">
                                    {MODELS.filter(m => m.group === group).map(model => {
                                      const selected = draft.aiDefaultModel === model.id
                                      return (
                                        <button
                                          key={model.id}
                                          type="button"
                                          onClick={() => setDraft(c => ({ ...c, aiDefaultModel: model.id }))}
                                          className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors"
                                          style={selected
                                            ? { borderColor: TEAL, background: `${TEAL}18` }
                                            : { borderColor: BORDER, background: 'transparent' }}
                                        >
                                          <span className="text-sm font-medium" style={{ color: selected ? TEAL : TEXT }}>{model.label}</span>
                                          <span
                                            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                                            style={selected
                                              ? { background: `${TEAL}30`, color: TEAL }
                                              : { background: BORDER, color: TEXT_DIM }}
                                          >
                                            {model.badge}
                                          </span>
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        })()}
                      </SettingBlock>

                      <SettingRow label={strings.ai.responseLanguage.label} hint={strings.ai.responseLanguage.hint}>
                        <SegmentedToggle
                          options={[
                            { value: 'auto', label: strings.ai.responseLanguage.auto },
                            { value: 'fr',   label: strings.ai.responseLanguage.fr },
                            { value: 'en',   label: strings.ai.responseLanguage.en },
                          ]}
                          value={draft.aiResponseLanguage}
                          onChange={v => setDraft(c => ({ ...c, aiResponseLanguage: v as 'auto' | 'fr' | 'en' }))}
                        />
                      </SettingRow>

                      <SettingRow label={strings.ai.autoAttachSif.label} hint={strings.ai.autoAttachSif.hint}>
                        <SegmentedToggle
                          options={[
                            { value: 'on',  label: strings.ai.autoAttachSif.on },
                            { value: 'off', label: strings.ai.autoAttachSif.off },
                          ]}
                          value={draft.aiAutoAttachSif !== false ? 'on' : 'off'}
                          onChange={v => setDraft(c => ({ ...c, aiAutoAttachSif: v === 'on' }))}
                        />
                      </SettingRow>

                      <SettingRow label={strings.ai.strictModeDefault.label} hint={strings.ai.strictModeDefault.hint}>
                        <SegmentedToggle
                          options={[
                            { value: 'strict', label: strings.ai.strictModeDefault.on },
                            { value: 'open',   label: strings.ai.strictModeDefault.off },
                          ]}
                          value={draft.aiStrictModeDefault ? 'strict' : 'open'}
                          onChange={v => setDraft(c => ({ ...c, aiStrictModeDefault: v === 'strict' }))}
                        />
                      </SettingRow>

                      <SettingRow label={strings.ai.systemPromptAddendum.label} hint={strings.ai.systemPromptAddendum.hint} align="start">
                        <textarea
                          placeholder={strings.ai.systemPromptAddendum.placeholder}
                          value={draft.aiSystemPromptAddendum}
                          onChange={event => setDraft(c => ({ ...c, aiSystemPromptAddendum: event.currentTarget.value }))}
                          rows={4}
                          className="w-64 resize-none rounded-lg border px-3 py-2 text-xs leading-relaxed focus:outline-none focus:ring-1"
                          style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT }}
                        />
                      </SettingRow>
                    </>
                  )}

                </div>
              )}
            </div>

            {/* Footer */}
            <footer className="flex shrink-0 items-center justify-between border-t px-5 py-3" style={{ borderColor: BORDER, background: CARD_BG }}>
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
