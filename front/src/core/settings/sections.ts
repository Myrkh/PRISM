import { Cpu, FileText, Keyboard, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, UserRound, type LucideIcon } from 'lucide-react'
import type { SettingsStrings } from '@/i18n/settings'
import type { AppSettingsSection, ProfileSettingsSection } from '@/store/appStore'

export interface SettingsSectionDescriptor<TSection extends string> {
  id: TSection
  label: string
  hint: string
  Icon: LucideIcon
}

export function getAppSettingsSectionDescriptors(
  strings: SettingsStrings,
): SettingsSectionDescriptor<AppSettingsSection>[] {
  return [
    {
      id: 'general',
      label: strings.sections.app.general.label,
      hint: strings.sections.app.general.hint,
      Icon: Settings2,
    },
    {
      id: 'workspace',
      label: strings.sections.app.workspace.label,
      hint: strings.sections.app.workspace.hint,
      Icon: SlidersHorizontal,
    },
    {
      id: 'engine',
      label: strings.sections.app.engine.label,
      hint: strings.sections.app.engine.hint,
      Icon: Cpu,
    },
    {
      id: 'shortcuts',
      label: strings.sections.app.shortcuts.label,
      hint: strings.sections.app.shortcuts.hint,
      Icon: Keyboard,
    },
    {
      id: 'export',
      label: strings.sections.app.export.label,
      hint: strings.sections.app.export.hint,
      Icon: FileText,
    },
    {
      id: 'ai',
      label: strings.sections.app.ai.label,
      hint: strings.sections.app.ai.hint,
      Icon: Sparkles,
    },
  ]
}

export function getProfileSettingsSectionDescriptors(
  strings: SettingsStrings,
): SettingsSectionDescriptor<ProfileSettingsSection>[] {
  return [
    {
      id: 'account',
      label: strings.sections.profile.account.label,
      hint: strings.sections.profile.account.hint,
      Icon: UserRound,
    },
    {
      id: 'session',
      label: strings.sections.profile.session.label,
      hint: strings.sections.profile.session.hint,
      Icon: ShieldCheck,
    },
  ]
}
