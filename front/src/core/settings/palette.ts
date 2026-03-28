import { Braces, FileText, Globe2, Hash, Home, Moon, Sun, Terminal, Timer } from 'lucide-react'
import { toast } from '@/components/ui/toast'
import { executeRegisteredCommand } from '@/core/commands/registry'
import type { CommandGroup, CommandItem } from '@/components/layout/command-palette/types'
import { LANDING_VIEWS, type AppPreferences } from '@/core/models/appPreferences'
import type { SettingsStrings } from '@/i18n/settings'
import type { ShellStrings } from '@/i18n/shell'
import type { SettingsSection } from '@/store/appStore'
import { useAppStore } from '@/store/appStore'
import { getAppSettingsSectionDescriptors, getProfileSettingsSectionDescriptors } from './sections'

interface BuildSettingsPaletteItemsArgs {
  shellStrings: ShellStrings
  settingsStrings: SettingsStrings
  preferences: AppPreferences
  currentSection: SettingsSection | null
  run: (fn: () => void) => void
  navigateToSection: (section: SettingsSection) => void
}

function buildSectionKeywords(section: SettingsSection, label: string, hint: string) {
  return `settings paramètres ${section} ${label} ${hint}`.toLowerCase()
}

export function buildSettingsPaletteItems({
  shellStrings,
  settingsStrings,
  preferences,
  currentSection,
  run,
  navigateToSection,
}: BuildSettingsPaletteItemsArgs): CommandItem[] {
  const updatePreferences = (patch: Partial<AppPreferences>) => {
    useAppStore.getState().updateAppPreferences(patch)
  }

  const generalLabel = settingsStrings.sections.app.general.label
  const workspaceLabel = settingsStrings.sections.app.workspace.label
  const engineLabel = settingsStrings.sections.app.engine.label

  const sectionItems: CommandItem[] = [
    ...getAppSettingsSectionDescriptors(settingsStrings).map(({ id, label, hint, Icon }) => ({
      id: `navigate-settings-${id}`,
      label: `${shellStrings.commandPalette.labels.settings} · ${label}`,
      keywords: buildSectionKeywords(id, label, hint),
      Icon,
      onSelect: () => run(() => navigateToSection(id)),
      isActive: currentSection === id,
      meta: hint,
      level: 0 as const,
    })),
    ...getProfileSettingsSectionDescriptors(settingsStrings).map(({ id, label, hint, Icon }, index) => ({
      id: `navigate-settings-${id}`,
      label: `${shellStrings.commandPalette.labels.settings} · ${label}`,
      keywords: buildSectionKeywords(id, label, hint),
      Icon,
      onSelect: () => run(() => navigateToSection(id)),
      isActive: currentSection === id,
      meta: hint,
      separator: index === 0,
      level: 0 as const,
    })),
  ]

  const actionItems: CommandItem[] = [
    {
      id: 'settings-action-language-fr',
      label: `${generalLabel} · ${settingsStrings.general.language.label} · FR`,
      keywords: 'settings language langue francais fr',
      Icon: Globe2,
      onSelect: () => run(() => updatePreferences({ language: 'fr' })),
      isActive: preferences.language === 'fr',
      separator: true,
      level: 0,
    },
    {
      id: 'settings-action-language-en',
      label: `${generalLabel} · ${settingsStrings.general.language.label} · EN`,
      keywords: 'settings language langue english anglais en',
      Icon: Globe2,
      onSelect: () => run(() => updatePreferences({ language: 'en' })),
      isActive: preferences.language === 'en',
      level: 0,
    },
    {
      id: 'settings-action-theme-dark',
      label: `${generalLabel} · ${settingsStrings.general.theme.label} · ${settingsStrings.general.theme.dark}`,
      keywords: 'settings theme dark sombre',
      Icon: Moon,
      onSelect: () => run(() => updatePreferences({ theme: 'dark' })),
      isActive: preferences.theme === 'dark',
      separator: true,
      level: 0,
    },
    {
      id: 'settings-action-theme-light',
      label: `${generalLabel} · ${settingsStrings.general.theme.label} · ${settingsStrings.general.theme.light}`,
      keywords: 'settings theme light clair',
      Icon: Sun,
      onSelect: () => run(() => updatePreferences({ theme: 'light' })),
      isActive: preferences.theme === 'light',
      level: 0,
    },
    {
      id: 'settings-action-scientific-notation',
      label: engineLabel + ' · ' + (preferences.useScientificNotation
        ? shellStrings.commandPalette.labels.settingsScientificNotationOff
        : shellStrings.commandPalette.labels.settingsScientificNotationOn),
      keywords: 'settings notation scientifique scientific exponential pfd lambda toggle',
      Icon: Hash,
      onSelect: () => run(() => {
        updatePreferences({ useScientificNotation: !preferences.useScientificNotation })
      }),
      isActive: preferences.useScientificNotation,
      separator: true,
      level: 0,
    },
    ...(['2', '3', '4', '5', '6'] as const).map((digits, index) => ({
      id: `settings-action-decimal-${digits}`,
      label: `${engineLabel} · ${shellStrings.commandPalette.labels.settingsDecimalDigits[digits] ?? digits}`,
      keywords: `settings precision précision decimal digits chiffres arrondi rounding ${digits}`,
      Icon: Hash,
      onSelect: () => run(() => {
        updatePreferences({ decimalRoundingDigits: Number(digits) })
        toast.success(shellStrings.commandPalette.labels.settingsDecimalDigits[digits] ?? digits)
      }),
      isActive: preferences.decimalRoundingDigits === Number(digits),
      separator: index === 0,
      level: 0 as const,
    })),
    ...(['A4', 'Letter'] as const).map((pageSize, index) => ({
      id: `settings-action-pdf-${pageSize.toLowerCase()}`,
      label: workspaceLabel + ' · ' + (pageSize === 'A4'
        ? shellStrings.commandPalette.labels.settingsPdfA4
        : shellStrings.commandPalette.labels.settingsPdfLetter),
      keywords: `settings pdf format ${pageSize.toLowerCase()} rapport report export`,
      Icon: FileText,
      onSelect: () => run(() => {
        updatePreferences({ pdfPageSize: pageSize })
        toast.success(
          pageSize === 'A4'
            ? shellStrings.commandPalette.labels.settingsPdfA4
            : shellStrings.commandPalette.labels.settingsPdfLetter,
        )
      }),
      isActive: preferences.pdfPageSize === pageSize,
      separator: index === 0,
      level: 0 as const,
    })),
    ...(['8760', '17520', '26280', '43800', '175200'] as const).map((hours, index) => ({
      id: `settings-action-mission-${hours}`,
      label: `${engineLabel} · ${shellStrings.commandPalette.labels.settingsMissionTimes[hours] ?? `${hours}h`}`,
      keywords: `settings mission time heure durée default par défaut iec 61511 ${hours}`,
      Icon: Timer,
      onSelect: () => run(() => {
        updatePreferences({ defaultMissionTimeTH: Number(hours) })
        toast.success(shellStrings.commandPalette.labels.settingsMissionTimes[hours] ?? `${hours}h`)
      }),
      isActive: preferences.defaultMissionTimeTH === Number(hours),
      separator: index === 0,
      level: 0 as const,
    })),
    {
      id: 'settings-action-shortcuts-json',
      label: `${settingsStrings.sections.app.shortcuts.label} · ${settingsStrings.shortcuts.openJson}`,
      keywords: 'settings shortcuts keyboard keybindings json file open openjson',
      Icon: Braces,
      onSelect: () => run(() => executeRegisteredCommand('openKeybindingsJson')),
      isActive: false,
      separator: true,
      level: 0,
    },
    {
      id: 'settings-action-shortcuts-user-commands-json',
      label: `${settingsStrings.sections.app.shortcuts.label} · ${settingsStrings.shortcuts.openUserCommandsJson}`,
      keywords: 'settings shortcuts user commands usercommands json macro palette prism ai open',
      Icon: Terminal,
      onSelect: () => run(() => executeRegisteredCommand('openUserCommandsJson')),
      isActive: false,
      level: 0,
    },
    ...LANDING_VIEWS.map((landingView, index) => ({
      id: `settings-action-landing-${landingView}`,
      label: `${generalLabel} · ${shellStrings.commandPalette.labels.settingsLandingViews[landingView] ?? landingView}`,
      keywords: `settings landing view écran accueil démarrage startup ${landingView}`,
      Icon: Home,
      onSelect: () => run(() => {
        updatePreferences({ defaultLandingView: landingView })
        toast.success(shellStrings.commandPalette.labels.settingsLandingViews[landingView] ?? landingView)
      }),
      isActive: preferences.defaultLandingView === landingView,
      separator: index === 0,
      level: 0 as const,
    })),
  ]

  return [...sectionItems, ...actionItems]
}

export function buildSettingsPaletteGroups(args: BuildSettingsPaletteItemsArgs): CommandGroup[] {
  const { shellStrings, settingsStrings, currentSection, run, navigateToSection } = args
  const allItems = buildSettingsPaletteItems(args)

  const pick = (prefix: string) => allItems.filter(item => item.id.startsWith(prefix))
  const openSectionItem = (section: SettingsSection, label: string, hint: string, Icon: CommandItem['Icon']): CommandItem => ({
    id: `settings-open-${section}`,
    label: `${shellStrings.commandPalette.labels.settings} · ${label}`,
    keywords: buildSectionKeywords(section, label, hint),
    Icon,
    onSelect: () => run(() => navigateToSection(section)),
    isActive: currentSection === section,
    meta: hint,
    level: 0,
  })

  const appSections = getAppSettingsSectionDescriptors(settingsStrings)
  const profileSections = getProfileSettingsSectionDescriptors(settingsStrings)
  const generalSection = appSections.find(section => section.id === 'general')
  const workspaceSection = appSections.find(section => section.id === 'workspace')
  const engineSection = appSections.find(section => section.id === 'engine')
  const shortcutsSection = appSections.find(section => section.id === 'shortcuts')
  const accountSection = profileSections.find(section => section.id === 'account')
  const sessionSection = profileSections.find(section => section.id === 'session')

  return [
    {
      heading: `${shellStrings.commandPalette.labels.settings} · ${settingsStrings.sections.app.general.label}`,
      items: [
        ...(generalSection ? [openSectionItem('general', generalSection.label, generalSection.hint, generalSection.Icon)] : []),
        ...pick('settings-action-language-'),
        ...pick('settings-action-theme-'),
        ...pick('settings-action-landing-'),
      ],
    },
    {
      heading: `${shellStrings.commandPalette.labels.settings} · ${settingsStrings.sections.app.workspace.label}`,
      items: [
        ...(workspaceSection ? [openSectionItem('workspace', workspaceSection.label, workspaceSection.hint, workspaceSection.Icon)] : []),
        ...pick('settings-action-pdf-'),
      ],
    },
    {
      heading: `${shellStrings.commandPalette.labels.settings} · ${settingsStrings.sections.app.engine.label}`,
      items: [
        ...(engineSection ? [openSectionItem('engine', engineSection.label, engineSection.hint, engineSection.Icon)] : []),
        ...pick('settings-action-scientific-notation'),
        ...pick('settings-action-decimal-'),
        ...pick('settings-action-mission-'),
      ],
    },
    {
      heading: `${shellStrings.commandPalette.labels.settings} · ${settingsStrings.sections.app.shortcuts.label}`,
      items: shortcutsSection
        ? [
            openSectionItem('shortcuts', shortcutsSection.label, shortcutsSection.hint, shortcutsSection.Icon),
            ...pick('settings-action-shortcuts-'),
          ]
        : pick('settings-action-shortcuts-'),
    },
    {
      heading: `${shellStrings.commandPalette.labels.settings} · ${settingsStrings.sections.profile.account.label}`,
      items: accountSection
        ? [openSectionItem('account', accountSection.label, accountSection.hint, accountSection.Icon)]
        : [],
    },
    {
      heading: `${shellStrings.commandPalette.labels.settings} · ${settingsStrings.sections.profile.session.label}`,
      items: sessionSection
        ? [openSectionItem('session', sessionSection.label, sessionSection.hint, sessionSection.Icon)]
        : [],
    },
  ].filter(group => group.items.length > 0)
}
