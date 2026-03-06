import { useEffect, useMemo, useState, type ElementType, type ReactNode } from 'react'
import {
  SlidersHorizontal,
  Settings2,
  FlaskConical,
  Database,
  ShieldCheck,
  FileText,
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAppStore, type SettingsSection } from '@/store/appStore'

interface SettingsDraft {
  theme: 'dark' | 'light'
  language: 'fr' | 'en'
  dateFormat: 'dd/mm/yyyy' | 'yyyy-mm-dd'
  density: 'comfortable' | 'compact'
  standardProfile: 'iec61511' | 'iec61508'
  roundingDigits: number
  defaultBeta: number
  defaultProofTestMonths: number
  validationMode: 'front-only' | 'backend-only' | 'compare'
  tolerancePct: number
  logValidationTrace: boolean
  autosave: boolean
  conflictPolicy: 'manual' | 'last-write-wins'
  offlineCache: boolean
  requireApproval: boolean
  signaturePolicy: 'none' | 'approver-only' | 'dual-signature'
  auditRetention: '1y' | '3y' | '7y'
  reportTemplate: 'prism-default' | 'audit-extended'
  watermarkDraft: boolean
  requireReportMetadata: boolean
}

const DEFAULT_DRAFT: Omit<SettingsDraft, 'theme'> = {
  language: 'fr',
  dateFormat: 'dd/mm/yyyy',
  density: 'comfortable',
  standardProfile: 'iec61511',
  roundingDigits: 6,
  defaultBeta: 0.05,
  defaultProofTestMonths: 12,
  validationMode: 'compare',
  tolerancePct: 0.1,
  logValidationTrace: true,
  autosave: true,
  conflictPolicy: 'manual',
  offlineCache: true,
  requireApproval: true,
  signaturePolicy: 'approver-only',
  auditRetention: '7y',
  reportTemplate: 'prism-default',
  watermarkDraft: false,
  requireReportMetadata: true,
}

const SECTIONS: {
  id: SettingsSection
  label: string
  hint: string
  Icon: ElementType
}[] = [
  { id: 'general', label: 'General', hint: 'Theme, language, UX', Icon: Settings2 },
  { id: 'calculation', label: 'Calculation', hint: 'IEC defaults', Icon: SlidersHorizontal },
  { id: 'validation', label: 'Validation', hint: 'Front/Back compare', Icon: FlaskConical },
  { id: 'data', label: 'Data & Sync', hint: 'Autosave and conflicts', Icon: Database },
  { id: 'security', label: 'Security', hint: 'Approvals and retention', Icon: ShieldCheck },
  { id: 'reports', label: 'Reports', hint: 'Template and compliance', Icon: FileText },
]

function initialDraft(isDark: boolean): SettingsDraft {
  return {
    theme: isDark ? 'dark' : 'light',
    ...DEFAULT_DRAFT,
  }
}

function NumberField({
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  value: number
  onChange: (next: number) => void
  min: number
  max: number
  step?: number
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={e => onChange(Number(e.target.value))}
      className="h-9 w-28 rounded-lg border border-[#2A3138] bg-[#1A1F24] px-2.5 text-sm text-[#DFE8F1] outline-none focus:border-[#009BA4]"
    />
  )
}

function SelectField<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (next: T) => void
  options: readonly { label: string; value: T }[]
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as T)}
      className="h-9 min-w-52 rounded-lg border border-[#2A3138] bg-[#1A1F24] px-2.5 text-sm text-[#DFE8F1] outline-none focus:border-[#009BA4]"
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

function Row({
  label,
  hint,
  children,
}: {
  label: string
  hint: string
  children: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-[#2A3138] bg-[#1D232A] px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-[#DFE8F1]">{label}</p>
        <p className="text-xs text-[#8FA0B1]">{hint}</p>
      </div>
      {children}
    </div>
  )
}

interface SettingsWorkspaceProps {
  section: SettingsSection
  onSectionChange: (section: SettingsSection) => void
  onExit: () => void
}

export function SettingsWorkspace({ section, onSectionChange, onExit }: SettingsWorkspaceProps) {
  const isDark = useAppStore(s => s.isDark)
  const setTheme = useAppStore(s => s.setTheme)

  const [saved, setSaved] = useState<SettingsDraft>(() => initialDraft(isDark))
  const [draft, setDraft] = useState<SettingsDraft>(() => initialDraft(isDark))

  const isDirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved])

  const requestExit = () => {
    if (isDirty) {
      const ok = window.confirm('Unsaved changes will be lost. Exit settings?')
      if (!ok) return
    }
    onExit()
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return

      const target = document.activeElement as HTMLElement | null
      const isEditingElement =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      if (isEditingElement) return

      e.preventDefault()
      requestExit()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [requestExit])

  const apply = () => {
    setTheme(draft.theme === 'dark')
    setSaved(draft)
  }

  const discard = () => setDraft(saved)

  const reset = () => {
    const next = initialDraft(isDark)
    setDraft(next)
  }

  return (
    <div className="flex-1 min-h-0 px-5 pb-5 pt-2" onClick={requestExit}>
      <div
        className="grid h-full min-h-0 grid-cols-[240px_1fr] overflow-hidden rounded-xl border border-[#2A3138] bg-[#23292F]"
        onClick={e => e.stopPropagation()}
      >
        <aside className="overflow-y-auto border-r border-[#2A3138] bg-[#14181C] p-3">
          <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8FA0B1]">Settings</p>
          <div className="space-y-1">
            {SECTIONS.map(({ id, label, hint, Icon }) => {
              const selected = id === section
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSectionChange(id)}
                  className={cn(
                    'w-full rounded-lg border px-2.5 py-2 text-left transition-colors',
                    selected
                      ? 'border-[#009BA480] bg-[#1D232A]'
                      : 'border-transparent hover:border-[#2A3138] hover:bg-[#1D232A]',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={14} className={selected ? 'text-[#5FD8D2]' : 'text-[#8FA0B1]'} />
                    <span className={selected ? 'text-sm font-semibold text-[#DFE8F1]' : 'text-sm text-[#8FA0B1]'}>{label}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#8FA0B1]">{hint}</p>
                </button>
              )
            })}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col">
          <header className="border-b border-[#2A3138] px-5 py-3">
            <h1 className="text-base font-bold text-[#DFE8F1]">Configuration Workspace</h1>
            <p className="text-xs text-[#8FA0B1]">
              Vue avancée de configuration. Les quick settings via command palette restent disponibles.
            </p>
          </header>

          <div className="flex-1 min-h-0 overflow-y-auto p-5">
            <div className="space-y-3">
              {section === 'general' && (
                <>
                  <Row label="Theme" hint="Applied instantly after save.">
                    <div className="inline-flex rounded-lg border border-[#2A3138] bg-[#14181C] p-1">
                      <button
                        type="button"
                        onClick={() => setDraft(d => ({ ...d, theme: 'dark' }))}
                        className={cn('rounded px-3 py-1 text-xs', draft.theme === 'dark' ? 'bg-[#009BA4] text-white' : 'text-[#8FA0B1]')}
                      >
                        Dark
                      </button>
                      <button
                        type="button"
                        onClick={() => setDraft(d => ({ ...d, theme: 'light' }))}
                        className={cn('rounded px-3 py-1 text-xs', draft.theme === 'light' ? 'bg-[#009BA4] text-white' : 'text-[#8FA0B1]')}
                      >
                        Light
                      </button>
                    </div>
                  </Row>
                  <Row label="Language" hint="UI language preference.">
                    <SelectField
                      value={draft.language}
                      onChange={(language) => setDraft(d => ({ ...d, language }))}
                      options={[
                        { label: 'French', value: 'fr' },
                        { label: 'English', value: 'en' },
                      ]}
                    />
                  </Row>
                  <Row label="Date format" hint="Display format in forms and reports.">
                    <SelectField
                      value={draft.dateFormat}
                      onChange={(dateFormat) => setDraft(d => ({ ...d, dateFormat }))}
                      options={[
                        { label: 'DD/MM/YYYY', value: 'dd/mm/yyyy' },
                        { label: 'YYYY-MM-DD', value: 'yyyy-mm-dd' },
                      ]}
                    />
                  </Row>
                  <Row label="Density" hint="Comfortable or compact spacing.">
                    <SelectField
                      value={draft.density}
                      onChange={(density) => setDraft(d => ({ ...d, density }))}
                      options={[
                        { label: 'Comfortable', value: 'comfortable' },
                        { label: 'Compact', value: 'compact' },
                      ]}
                    />
                  </Row>
                </>
              )}

              {section === 'calculation' && (
                <>
                  <Row label="Standard profile" hint="Default profile for new projects.">
                    <SelectField
                      value={draft.standardProfile}
                      onChange={(standardProfile) => setDraft(d => ({ ...d, standardProfile }))}
                      options={[
                        { label: 'IEC 61511', value: 'iec61511' },
                        { label: 'IEC 61508', value: 'iec61508' },
                      ]}
                    />
                  </Row>
                  <Row label="Rounding digits" hint="Default numeric precision for KPIs and exports.">
                    <NumberField
                      value={draft.roundingDigits}
                      min={2}
                      max={12}
                      onChange={(roundingDigits) => setDraft(d => ({ ...d, roundingDigits }))}
                    />
                  </Row>
                  <Row label="Default beta" hint="Initial beta-factor for new components.">
                    <NumberField
                      value={draft.defaultBeta}
                      min={0}
                      max={1}
                      step={0.01}
                      onChange={(defaultBeta) => setDraft(d => ({ ...d, defaultBeta }))}
                    />
                  </Row>
                  <Row label="Proof test period (months)" hint="Pre-filled in new SIF procedures.">
                    <NumberField
                      value={draft.defaultProofTestMonths}
                      min={1}
                      max={60}
                      onChange={(defaultProofTestMonths) => setDraft(d => ({ ...d, defaultProofTestMonths }))}
                    />
                  </Row>
                </>
              )}

              {section === 'validation' && (
                <>
                  <Row label="Validation mode" hint="How Front/Backend engines are compared.">
                    <SelectField
                      value={draft.validationMode}
                      onChange={(validationMode) => setDraft(d => ({ ...d, validationMode }))}
                      options={[
                        { label: 'Compare (recommended)', value: 'compare' },
                        { label: 'Front only', value: 'front-only' },
                        { label: 'Backend only', value: 'backend-only' },
                      ]}
                    />
                  </Row>
                  <Row label="Tolerance (%)" hint="Accepted delta before mismatch warning.">
                    <NumberField
                      value={draft.tolerancePct}
                      min={0}
                      max={5}
                      step={0.05}
                      onChange={(tolerancePct) => setDraft(d => ({ ...d, tolerancePct }))}
                    />
                  </Row>
                  <Row label="Store validation traces" hint="Persist comparison details in logs.">
                    <Switch
                      checked={draft.logValidationTrace}
                      onCheckedChange={(logValidationTrace) => setDraft(d => ({ ...d, logValidationTrace }))}
                      aria-label="Store validation traces"
                    />
                  </Row>
                </>
              )}

              {section === 'data' && (
                <>
                  <Row label="Autosave" hint="Save user edits continuously.">
                    <Switch
                      checked={draft.autosave}
                      onCheckedChange={(autosave) => setDraft(d => ({ ...d, autosave }))}
                      aria-label="Autosave"
                    />
                  </Row>
                  <Row label="Conflict policy" hint="Strategy when concurrent edits are detected.">
                    <SelectField
                      value={draft.conflictPolicy}
                      onChange={(conflictPolicy) => setDraft(d => ({ ...d, conflictPolicy }))}
                      options={[
                        { label: 'Manual merge', value: 'manual' },
                        { label: 'Last write wins', value: 'last-write-wins' },
                      ]}
                    />
                  </Row>
                  <Row label="Offline cache" hint="Keep a local cache for desktop/on-prem usage.">
                    <Switch
                      checked={draft.offlineCache}
                      onCheckedChange={(offlineCache) => setDraft(d => ({ ...d, offlineCache }))}
                      aria-label="Offline cache"
                    />
                  </Row>
                </>
              )}

              {section === 'security' && (
                <>
                  <Row label="Approval required" hint="Require validation before status transitions.">
                    <Switch
                      checked={draft.requireApproval}
                      onCheckedChange={(requireApproval) => setDraft(d => ({ ...d, requireApproval }))}
                      aria-label="Approval required"
                    />
                  </Row>
                  <Row label="Signature policy" hint="Electronic sign-off policy for approvals.">
                    <SelectField
                      value={draft.signaturePolicy}
                      onChange={(signaturePolicy) => setDraft(d => ({ ...d, signaturePolicy }))}
                      options={[
                        { label: 'No signature', value: 'none' },
                        { label: 'Approver only', value: 'approver-only' },
                        { label: 'Dual signature', value: 'dual-signature' },
                      ]}
                    />
                  </Row>
                  <Row label="Audit retention" hint="Retention target for audit logs.">
                    <SelectField
                      value={draft.auditRetention}
                      onChange={(auditRetention) => setDraft(d => ({ ...d, auditRetention }))}
                      options={[
                        { label: '1 year', value: '1y' },
                        { label: '3 years', value: '3y' },
                        { label: '7 years', value: '7y' },
                      ]}
                    />
                  </Row>
                </>
              )}

              {section === 'reports' && (
                <>
                  <Row label="Report template" hint="Default template used in report studio.">
                    <SelectField
                      value={draft.reportTemplate}
                      onChange={(reportTemplate) => setDraft(d => ({ ...d, reportTemplate }))}
                      options={[
                        { label: 'PRISM default', value: 'prism-default' },
                        { label: 'Audit extended', value: 'audit-extended' },
                      ]}
                    />
                  </Row>
                  <Row label="Watermark drafts" hint="Mark non-approved exports as draft.">
                    <Switch
                      checked={draft.watermarkDraft}
                      onCheckedChange={(watermarkDraft) => setDraft(d => ({ ...d, watermarkDraft }))}
                      aria-label="Watermark drafts"
                    />
                  </Row>
                  <Row label="Required metadata" hint="Block export if mandatory fields are missing.">
                    <Switch
                      checked={draft.requireReportMetadata}
                      onCheckedChange={(requireReportMetadata) => setDraft(d => ({ ...d, requireReportMetadata }))}
                      aria-label="Required metadata"
                    />
                  </Row>
                </>
              )}
            </div>
          </div>

          <footer className="flex items-center justify-between border-t border-[#2A3138] px-5 py-3">
            <p className="text-xs text-[#8FA0B1]">
              {isDirty ? 'Unsaved changes' : 'All changes saved for current session'} · Press Esc to exit
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={discard} disabled={!isDirty}>
                Discard
              </Button>
              <Button variant="outline" onClick={reset}>
                Reset defaults
              </Button>
              <Button onClick={apply} disabled={!isDirty}>
                Save changes
              </Button>
            </div>
          </footer>
        </section>
      </div>
    </div>
  )
}
