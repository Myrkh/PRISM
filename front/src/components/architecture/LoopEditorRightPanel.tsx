/**
 * LoopEditorRightPanel — PRISM v3 (redesigned)
 *
 * Layout: icon rail (32px) | content
 * Modes:
 *   [Network]   Architecture — config voies/arch/CCF, contraint par la topologie réelle
 *   [Settings2] Composant    — params panel (auto-ouvre à la sélection)
 *   [BookOpen]  Bibliothèque — liste unifiée glissable
 */
import { useEffect, useRef, useState } from 'react'
import {
  Activity,
  Archive,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Cpu,
  Download,
  GripVertical,
  Layers,
  Network,
  RefreshCw,
  Settings2,
  Trash2,
  Upload,
  Zap,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { ComponentParamsPanel } from './ComponentParamsPanel'
import { SubComponentParamsPanel } from './SubComponentParamsPanel'
import type {
  AdvancedParams,
  Architecture,
  ComponentTemplate,
  DevelopedParams,
  SIF,
  SIFChannel,
  SIFComponent,
  SIFSubsystem,
  SubElement,
  SubsystemType,
  VoteType,
} from '@/core/types'
import {
  buildLibraryDragPayload,
  parseComponentTemplateImport,
  serializeComponentTemplates,
  useComponentLibrary,
} from '@/features/library'
import { RightPanelBody, RightPanelSection, RightPanelShell } from '@/components/layout/RightPanelShell'
import { DEFAULT_CHANNEL, DEFAULT_COMPONENT } from '@/core/models/defaults'
import { createDefaultSubComponent } from '@/core/models/subComponents'
import { semantic } from '@/styles/tokens'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { InstrumentationIcon } from '@/components/architecture/InstrumentationIcons'

// ─── Constants ────────────────────────────────────────────────────────────────

const SUB_META: Record<SubsystemType, { color: string; label: string; Icon: React.ElementType }> = {
  sensor:   { color: '#0284C7', label: 'Capteurs',     Icon: Activity },
  logic:    { color: '#7C3AED', label: 'Logique',      Icon: Cpu      },
  actuator: { color: '#EA580C', label: 'Actionneurs',  Icon: Zap      },
}

// Architecture valide selon le nombre de voies
const ARCH_OPTIONS: { value: Architecture; label: string; channels: number | null }[] = [
  { value: '1oo1',   label: '1oo1',   channels: 1    },
  { value: '1oo2',   label: '1oo2',   channels: 2    },
  { value: '2oo2',   label: '2oo2',   channels: 2    },
  { value: '1oo2D',  label: '1oo2D',  channels: 2    },
  { value: '2oo3',   label: '2oo3',   channels: 3    },
  { value: '1oo3',   label: '1oo3',   channels: 3    },
  { value: '2oo4',   label: '2oo4',   channels: 4    },
  { value: 'custom', label: 'Custom', channels: null }, // toujours disponible
]

function getValidArchOptions(channelCount: number) {
  return ARCH_OPTIONS.filter(o => o.channels === null || o.channels === channelCount)
}

function firstValidArch(channelCount: number): Architecture {
  return getValidArchOptions(channelCount)[0]?.value ?? 'custom'
}

const COUNT_OPTIONS = [1, 2, 3, 4]
const VOTE_TYPE_OPTIONS: VoteType[] = ['S', 'A', 'M']
const PANEL_FORM_GRID = 'repeat(auto-fit, minmax(132px, 1fr))'
const PANEL_WIDE_GRID = 'repeat(auto-fit, minmax(148px, 1fr))'
const LIBRARY_PREVIEW_COUNT = 5
const INITIAL_LIBRARY_VISIBLE_COUNT: Record<SubsystemType, number> = {
  sensor: LIBRARY_PREVIEW_COUNT,
  logic: 999,
  actuator: LIBRARY_PREVIEW_COUNT,
}

function formatPctInput(value: number | undefined) {
  return ((value ?? 0) * 100).toFixed(1).replace(/\.0$/, '')
}

function parsePctInput(raw: string, fallback: number) {
  const parsed = Number.parseFloat(raw.replace(',', '.'))
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(1, Math.max(0, parsed / 100))
}

function buildComponentTag(subsystemType: SubsystemType, sifNumber: string, channelIndex: number, componentIndex: number) {
  const prefix = subsystemType === 'sensor' ? 'S' : subsystemType === 'logic' ? 'L' : 'A'
  return `${sifNumber}_${prefix}${channelIndex + 1}.${componentIndex + 1}`
}

function defaultSubComponentFor(component: SIFComponent, index: number): SubElement {
  return createDefaultSubComponent(component, index)
}

function normalizeChannelLabels(channels: SIFChannel[]) {
  return channels.map((channel, index) => ({ ...channel, label: `Channel ${index + 1}` }))
}

function formatLambda(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return 'n/a'
  return `${Number(value).toLocaleString('fr-FR', { maximumFractionDigits: value >= 100 ? 0 : 3 })}`
}

function formatRatio(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return 'n/a'
  return `${(value * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}%`
}

function formatDuration(value: number | null | undefined, unit?: string | null) {
  if (value == null || !Number.isFinite(value)) return 'n/a'
  return `${Number(value).toLocaleString('fr-FR', { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ''}`
}

function hasDevelopedContent(values: DevelopedParams) {
  return [values.lambda_DU, values.lambda_DD, values.lambda_SD, values.lambda_SU].some(value => Math.abs(value ?? 0) > 0)
}

function hasAdvancedContent(values: AdvancedParams) {
  return [
    values.MTTR,
    values.gamma,
    values.lambdaStar,
    values.testDuration,
    values.sigma,
    values.omega1,
    values.omega2,
    values.proofTestCoverage,
    values.lifetime,
    values.DCalarmedOnly,
    values.partialTest.enabled ? 1 : 0,
  ].some(value => value != null && Math.abs(Number(value) || 0) > 0)
}

// ─── Subsystem config section ─────────────────────────────────────────────────

function SubsystemArchSection({
  subsystem,
  projectId,
  sifId,
  sifNumber,
  onOpenCcfBeta,
}: {
  subsystem: SIFSubsystem
  projectId: string
  sifId: string
  sifNumber: string
  onOpenCcfBeta?: (subsystemId: string) => void
}) {
  const { BORDER, CARD_BG, PAGE_BG, SHADOW_SOFT, TEAL, TEAL_DIM, TEXT, TEXT_DIM } = usePrismTheme()
  const updateSubsystem = useAppStore(s => s.updateSubsystem)
  const [open, setOpen] = useState(true)
  const [activeChannelId, setActiveChannelId] = useState<string | null>(subsystem.channels[0]?.id ?? null)

  const meta         = SUB_META[subsystem.type]
  const channelCount = subsystem.channels.length
  const hasCCF       = channelCount > 1
  const ccfEnabled   = hasCCF && (subsystem.ccf.beta > 0 || subsystem.ccf.betaD > 0)
  const validArchs   = getValidArchOptions(channelCount)
  const activeChannel = subsystem.channels.find(channel => channel.id === activeChannelId) ?? subsystem.channels[0] ?? null

  const upd = (patch: Partial<SIFSubsystem>) =>
    updateSubsystem(projectId, sifId, { ...subsystem, ...patch })

  useEffect(() => {
    if (!activeChannelId || !subsystem.channels.some(channel => channel.id === activeChannelId)) {
      setActiveChannelId(subsystem.channels[0]?.id ?? null)
    }
  }, [activeChannelId, subsystem.channels])

  const replaceChannels = (channels: SIFChannel[]) => {
    const normalized = normalizeChannelLabels(channels)
    const nextArchitecture = validArchs.some(option => option.value === subsystem.architecture)
      ? subsystem.architecture
      : firstValidArch(normalized.length)
    upd({
      channels: normalized,
      architecture: getValidArchOptions(normalized.length).some(option => option.value === nextArchitecture)
        ? nextArchitecture
        : firstValidArch(normalized.length),
      ccf: normalized.length > 1 ? subsystem.ccf : { ...subsystem.ccf, beta: 0, betaD: 0 },
    })
  }

  const resizeChannels = (nextCount: number) => {
    const clamped = Math.min(4, Math.max(1, nextCount))
    if (clamped === subsystem.channels.length) return
    const nextChannels = [...subsystem.channels]
    if (clamped > nextChannels.length) {
      while (nextChannels.length < clamped) {
        nextChannels.push(DEFAULT_CHANNEL(subsystem.type, nextChannels.length, sifNumber))
      }
    } else {
      nextChannels.splice(clamped)
    }
    replaceChannels(nextChannels)
  }

  const updateChannel = (channelId: string, patch: Partial<SIFChannel>) => {
    replaceChannels(subsystem.channels.map(channel =>
      channel.id === channelId ? { ...channel, ...patch } : channel,
    ))
  }

  const resizeChannelComponents = (channelId: string, nextCount: number) => {
    const channelIndex = subsystem.channels.findIndex(channel => channel.id === channelId)
    if (channelIndex < 0) return
    const channel = subsystem.channels[channelIndex]
    const clamped = Math.min(4, Math.max(1, nextCount))
    if (clamped === channel.components.length) return

    const nextComponents = [...channel.components]
    if (clamped > nextComponents.length) {
      while (nextComponents.length < clamped) {
        nextComponents.push(
          DEFAULT_COMPONENT(
            subsystem.type,
            buildComponentTag(subsystem.type, sifNumber, channelIndex, nextComponents.length),
          ),
        )
      }
    } else {
      nextComponents.splice(clamped)
    }

    const nextArch = getValidArchOptions(nextComponents.length).some(option => option.value === (channel.architecture ?? '1oo1'))
      ? (channel.architecture ?? '1oo1')
      : firstValidArch(nextComponents.length)

    updateChannel(channelId, {
      components: nextComponents,
      architecture: nextArch,
      beta: nextComponents.length > 1 ? channel.beta : 0,
      betaD: nextComponents.length > 1 ? channel.betaD : 0,
    })
  }

  const resizeComponentSubComponents = (channelId: string, componentId: string, nextCount: number) => {
    const channel = subsystem.channels.find(candidate => candidate.id === channelId)
    if (!channel) return

    const clamped = Math.min(4, Math.max(0, nextCount))

    updateChannel(channelId, {
      components: channel.components.map(component => {
        if (component.id !== componentId) return component

        const current = component.subComponents ?? []
        if (clamped === current.length) return component

        const nextSubComponents = [...current]
        if (clamped > nextSubComponents.length) {
          while (nextSubComponents.length < clamped) {
            nextSubComponents.push(defaultSubComponentFor(component, nextSubComponents.length))
          }
        } else {
          nextSubComponents.splice(clamped)
        }

        return {
          ...component,
          subComponents: nextSubComponents,
        }
      }),
    })
  }

  const toggleSubsystemCcf = () => {
    upd({
      ccf: {
        ...subsystem.ccf,
        beta: ccfEnabled ? 0 : 0.05,
        betaD: ccfEnabled ? 0 : 0.025,
      },
    })
  }

  const toggleChannelCcf = (channel: SIFChannel) => {
    updateChannel(channel.id, {
      beta: channel.beta && channel.beta > 0 ? 0 : 0.05,
      betaD: channel.betaD && channel.betaD > 0 ? 0 : 0.025,
    })
  }

  const currentChannelComponentCount = activeChannel?.components.length ?? 1
  const currentChannelArchOptions = getValidArchOptions(currentChannelComponentCount)
  const currentChannelCcfEnabled = Boolean(activeChannel && currentChannelComponentCount > 1 && ((activeChannel.beta ?? 0) > 0 || (activeChannel.betaD ?? 0) > 0))
  const componentCountLabel = subsystem.type === 'sensor'
    ? 'Number of sensors'
    : subsystem.type === 'logic'
    ? 'Number of solvers'
    : 'Number of final elements'

  return (
    <div className="overflow-hidden rounded-xl border" style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_SOFT }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="prism-action flex w-full min-w-0 items-center gap-2.5 px-3 py-2.5 text-left"
        style={{ background: open ? PAGE_BG : CARD_BG }}
      >
        <div
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded"
          style={{ background: `${meta.color}20` }}
        >
          <meta.Icon size={10} style={{ color: meta.color }} />
        </div>
        <span className="min-w-0 flex-1 truncate text-[11px] font-semibold" style={{ color: TEXT }}>{meta.label}</span>
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className="rounded px-1.5 py-0.5 text-[9px] font-mono font-bold"
            style={{ background: `${meta.color}15`, color: meta.color }}
          >
            {subsystem.architecture}
          </span>
          <span className="text-[9px] font-mono" style={{ color: TEXT_DIM }}>{channelCount}V</span>
          {open
            ? <ChevronDown size={10} style={{ color: TEXT_DIM }} />
            : <ChevronRight size={10} style={{ color: TEXT_DIM }} />
          }
        </div>
      </button>

      {open && (
        <div className="space-y-3 border-t px-3 pb-3 pt-3" style={{ background: PAGE_BG, borderColor: BORDER }}>
          <div className="space-y-2 rounded-lg border p-3" style={{ borderColor: BORDER, background: CARD_BG }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: TEAL }}>
              {meta.label} architecture
            </p>
            <div className="grid gap-2" style={{ gridTemplateColumns: PANEL_FORM_GRID }}>
              <label className="min-w-0 space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Number of channels</span>
                <select
                  value={channelCount}
                  onChange={event => resizeChannels(Number(event.target.value))}
                  className="prism-field h-9 w-full min-w-0 rounded-md border px-2.5 text-sm outline-none"
                  style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT }}
                >
                  {COUNT_OPTIONS.map(count => (
                    <option key={count} value={count}>{count}</option>
                  ))}
                </select>
              </label>

              <label className="min-w-0 space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Configured in</span>
                <select
                  value={subsystem.architecture}
                  onChange={event => upd({ architecture: event.target.value as Architecture })}
                  className="prism-field h-9 w-full min-w-0 rounded-md border px-2.5 text-sm outline-none"
                  style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT }}
                >
                  {validArchs.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label className="min-w-0 space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Vote</span>
                <select
                  value={subsystem.voteType}
                  onChange={event => upd({ voteType: event.target.value as VoteType })}
                  className="prism-field h-9 w-full min-w-0 rounded-md border px-2.5 text-sm outline-none"
                  style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT }}
                >
                  {VOTE_TYPE_OPTIONS.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="rounded-lg border px-3 py-2.5" style={{ borderColor: ccfEnabled ? `${TEAL}35` : BORDER, background: ccfEnabled ? `${TEAL}06` : PAGE_BG }}>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 text-[11px] font-medium" style={{ color: ccfEnabled ? TEAL_DIM : TEXT_DIM }}>
                  <input
                    type="checkbox"
                    checked={ccfEnabled}
                    onChange={toggleSubsystemCcf}
                  />
                  Take into account Common Cause Failures
                </label>
                {subsystem.ccf.assessment?.mode === 'iec61508' && (
                  <span className="rounded px-1.5 py-0.5 text-[8px] font-bold" style={{ background: `${TEAL}18`, color: TEAL_DIM }}>
                    Beta IEC61508-6
                  </span>
                )}
                {onOpenCcfBeta && (
                  <button
                    type="button"
                    onClick={() => onOpenCcfBeta(subsystem.id)}
                    className="prism-action ml-auto rounded-md border px-2 py-1 text-[10px] font-semibold"
                    style={{ borderColor: `${TEAL}30`, background: `${TEAL}10`, color: TEAL_DIM }}
                  >
                    Ouvrir CCF/BETA
                  </button>
                )}
              </div>

              <div className="mt-2 grid gap-2" style={{ gridTemplateColumns: PANEL_WIDE_GRID }}>
                {[
                  { key: 'beta' as const, label: `Beta inter-${subsystem.type === 'sensor' ? 'channels' : subsystem.type === 'logic' ? 'solvers' : 'channels'} (du)`, value: subsystem.ccf.beta },
                  { key: 'betaD' as const, label: 'Beta IEC61508-6 D', value: subsystem.ccf.betaD },
                ].map(field => (
                  <label key={field.key} className="min-w-0 space-y-1">
                    <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>{field.label}</span>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        readOnly={!ccfEnabled || subsystem.ccf.assessment?.mode === 'iec61508'}
                        value={formatPctInput(field.value)}
                        onChange={event => upd({
                          ccf: {
                            ...subsystem.ccf,
                            [field.key]: parsePctInput(event.target.value, field.value),
                          },
                        })}
                        className="prism-field h-9 w-full rounded-md border py-1.5 pl-2.5 pr-7 text-sm font-mono outline-none"
                        style={{
                          background: PAGE_BG,
                          borderColor: BORDER,
                          color: TEXT,
                          opacity: !ccfEnabled ? 0.55 : 1,
                        }}
                      />
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px]" style={{ color: TEXT_DIM }}>%</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {activeChannel && (
            <div className="space-y-2 rounded-lg border p-3" style={{ borderColor: BORDER, background: CARD_BG }}>
              <div className="overflow-x-auto border-b pb-2" style={{ borderColor: `${BORDER}88`, scrollbarWidth: 'thin' }}>
                <div className="flex min-w-max items-center gap-1">
                  {subsystem.channels.map(channel => {
                    const active = channel.id === activeChannel.id
                    return (
                      <button
                        key={channel.id}
                        type="button"
                        onClick={() => setActiveChannelId(channel.id)}
                        className="prism-action shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium"
                        style={{
                          color: active ? meta.color : TEXT_DIM,
                          borderBottom: `2px solid ${active ? meta.color : 'transparent'}`,
                          background: active ? `${meta.color}08` : 'transparent',
                        }}
                      >
                        {channel.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid gap-2" style={{ gridTemplateColumns: PANEL_FORM_GRID }}>
                <label className="min-w-0 space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
                    {componentCountLabel}
                  </span>
                  <select
                    value={currentChannelComponentCount}
                    onChange={event => resizeChannelComponents(activeChannel.id, Number(event.target.value))}
                    className="prism-field h-9 w-full min-w-0 rounded-md border px-2.5 text-sm outline-none"
                    style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT }}
                  >
                    {COUNT_OPTIONS.map(count => (
                      <option key={count} value={count}>{count}</option>
                    ))}
                  </select>
                </label>

                <label className="min-w-0 space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Configured in</span>
                  <select
                    value={currentChannelArchOptions.some(option => option.value === (activeChannel.architecture ?? '1oo1'))
                      ? (activeChannel.architecture ?? '1oo1')
                      : firstValidArch(currentChannelComponentCount)}
                    onChange={event => updateChannel(activeChannel.id, { architecture: event.target.value as Architecture })}
                    className="prism-field h-9 w-full min-w-0 rounded-md border px-2.5 text-sm outline-none"
                    style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT }}
                  >
                    {currentChannelArchOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <label className="min-w-0 space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Vote</span>
                  <select
                    value={subsystem.voteType}
                    onChange={event => upd({ voteType: event.target.value as VoteType })}
                    className="prism-field h-9 w-full min-w-0 rounded-md border px-2.5 text-sm outline-none"
                    style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT }}
                  >
                    {VOTE_TYPE_OPTIONS.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
              </div>

              {subsystem.type === 'actuator' && (
                <div className="rounded-lg border p-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: TEAL }}>Sous-composants par composant</p>
                  <p className="mt-1 text-[10px] leading-relaxed" style={{ color: TEXT_DIM }}>
                    Le channel porte les composants en serie. Chaque composant peut ensuite embarquer ses propres sous-composants.
                  </p>

                  <div className="mt-3 space-y-2">
                    {activeChannel.components.map((component, componentIndex) => {
                      const subComponents = component.subComponents ?? []
                      const subCount = subComponents.length

                      return (
                        <div
                          key={component.id}
                          className="rounded-lg border p-2.5"
                          style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_SOFT }}
                        >
                          <div className="flex items-start gap-2">
                            <div
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border"
                              style={{ borderColor: `${meta.color}24`, background: `${meta.color}10`, color: meta.color }}
                            >
                              <InstrumentationIcon
                                subsystemType={component.subsystemType}
                                instrumentCategory={component.instrumentCategory}
                                instrumentType={component.instrumentType}
                                size={15}
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[11px] font-semibold" style={{ color: TEXT }}>{component.tagName}</p>
                              <p className="truncate text-[9px]" style={{ color: TEXT_DIM }}>
                                {component.instrumentType || `Composant ${componentIndex + 1}`}
                              </p>
                            </div>

                            <span
                              className="rounded px-1.5 py-0.5 text-[8px] font-mono font-bold"
                              style={{ background: `${meta.color}14`, color: meta.color }}
                            >
                              Parent {componentIndex + 1}
                            </span>
                          </div>

                          <div className="mt-2 grid gap-2" style={{ gridTemplateColumns: PANEL_FORM_GRID }}>
                            <label className="min-w-0 space-y-1">
                              <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Number of sub-components</span>
                              <select
                                value={subCount}
                                onChange={event => resizeComponentSubComponents(activeChannel.id, component.id, Number(event.target.value))}
                                className="prism-field h-9 w-full min-w-0 rounded-md border px-2.5 text-sm outline-none"
                                style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT }}
                              >
                                {[0, 1, 2, 3, 4].map(count => (
                                  <option key={count} value={count}>{count}</option>
                                ))}
                              </select>
                            </label>
                          </div>

                          {subCount > 0 && (
                            <div className="mt-2 space-y-1.5 pl-3">
                              {subComponents.map((subComponent, subIndex) => (
                                <div
                                  key={subComponent.id}
                                  className="relative rounded-md border px-2.5 py-2"
                                  style={{ borderColor: BORDER, background: PAGE_BG }}
                                >
                                  <span
                                    className="pointer-events-none absolute -left-3 top-1/2 h-px w-3 -translate-y-1/2"
                                    style={{ background: `${meta.color}42` }}
                                  />
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border"
                                      style={{ borderColor: `${meta.color}1E`, background: `${meta.color}0D`, color: meta.color }}
                                    >
                                      <InstrumentationIcon
                                        subsystemType={component.subsystemType}
                                        instrumentCategory={subComponent.instrumentCategory ?? component.instrumentCategory}
                                        instrumentType={subComponent.instrumentType || subComponent.label}
                                        size={13}
                                      />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-[9px] font-mono font-bold" style={{ color: TEXT }}>{subComponent.tagName}</p>
                                      <p className="truncate text-[9px]" style={{ color: TEXT_DIM }}>
                                        {subComponent.instrumentType || subComponent.label}
                                      </p>
                                    </div>
                                    <span
                                      className="rounded px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-widest"
                                      style={{ background: `${meta.color}12`, color: TEXT_DIM }}
                                    >
                                      SC{subIndex + 1}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {currentChannelComponentCount > 1 && (
                <div className="rounded-lg border px-3 py-2.5" style={{ borderColor: currentChannelCcfEnabled ? `${TEAL}35` : BORDER, background: currentChannelCcfEnabled ? `${TEAL}06` : PAGE_BG }}>
                  <label className="inline-flex items-center gap-2 text-[11px] font-medium" style={{ color: currentChannelCcfEnabled ? TEAL_DIM : TEXT_DIM }}>
                    <input
                      type="checkbox"
                      checked={currentChannelCcfEnabled}
                      onChange={() => toggleChannelCcf(activeChannel)}
                    />
                    Take into account Common Cause Failures
                  </label>

                  <div className="mt-2 grid gap-2" style={{ gridTemplateColumns: PANEL_WIDE_GRID }}>
                    {[
                      { key: 'beta' as const, label: `Beta ${subsystem.type}s (du)`, value: activeChannel.beta ?? 0 },
                      { key: 'betaD' as const, label: `Beta ${subsystem.type}s D`, value: activeChannel.betaD ?? 0 },
                    ].map(field => (
                      <label key={field.key} className="min-w-0 space-y-1">
                        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>{field.label}</span>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            readOnly={!currentChannelCcfEnabled}
                            value={formatPctInput(field.value)}
                            onChange={event => updateChannel(activeChannel.id, {
                              [field.key]: parsePctInput(event.target.value, field.value),
                            })}
                            className="prism-field h-9 w-full rounded-md border py-1.5 pl-2.5 pr-7 text-sm font-mono outline-none"
                            style={{
                              borderColor: BORDER,
                              background: PAGE_BG,
                              color: TEXT,
                              opacity: currentChannelCcfEnabled ? 1 : 0.55,
                            }}
                          />
                          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px]" style={{ color: TEXT_DIM }}>%</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Architecture panel ───────────────────────────────────────────────────────

function ArchitectureConfigPanel({
  sif,
  projectId,
  onOpenCcfBeta,
}: {
  sif: SIF
  projectId: string
  onOpenCcfBeta?: (subsystemId: string) => void
}) {
  const { TEXT_DIM } = usePrismTheme()
  if (sif.subsystems.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <Layers size={18} style={{ color: TEXT_DIM }} />
        <p className="text-xs" style={{ color: TEXT_DIM }}>
          Ajoutez des sous-systèmes depuis le canvas.
        </p>
      </div>
    )
  }

  return (
    <RightPanelBody compact className="space-y-3">
      <div className="space-y-3">
        {sif.subsystems.map(subsystem => (
          <SubsystemArchSection
            key={subsystem.id}
            subsystem={subsystem}
            projectId={projectId}
            sifId={sif.id}
            sifNumber={sif.sifNumber}
            onOpenCcfBeta={onOpenCcfBeta}
          />
        ))}
      </div>
    </RightPanelBody>
  )
}

// ─── Library ──────────────────────────────────────────────────────────────────

type OriginBadge = 'builtin' | 'project' | 'user'

const ORIGIN_STYLE: Record<OriginBadge, { label: string }> = {
  builtin: { label: 'std' },
  project: { label: 'projet' },
  user: { label: 'perso' },
}

function TemplateCard({
  template,
  origin,
  expanded,
  onToggleDetails,
  onArchive,
  onDelete,
}: {
  template: ComponentTemplate
  origin: OriginBadge
  expanded: boolean
  onToggleDetails: (id: string) => void
  onArchive?: (id: string) => void
  onDelete?: (id: string) => void
}) {
  const { BORDER, PAGE_BG, SURFACE, SHADOW_SOFT, TEAL, TEAL_DIM, TEXT, TEXT_DIM } = usePrismTheme()
  const meta = SUB_META[template.subsystemType]
  const orig = ORIGIN_STYLE[origin]
  const originTone = origin === 'builtin'
    ? { color: TEXT_DIM, bg: `${BORDER}60` }
    : origin === 'project'
      ? { color: '#F59E0B', bg: '#F59E0B18' }
      : { color: TEAL_DIM, bg: `${TEAL}15` }
  const snapshot = template.componentSnapshot
  const developedVisible = hasDevelopedContent(snapshot.developed) || snapshot.paramMode === 'developed'
  const advancedVisible = hasAdvancedContent(snapshot.advanced)
  const fieldTone = { border: `${BORDER}A6`, background: PAGE_BG }

  return (
    <div style={{ borderBottom: `1px solid ${BORDER}28` }}>
      <div
        draggable
        onDragStart={e => {
          e.dataTransfer.setData('application/prism-lib', buildLibraryDragPayload(template))
          e.dataTransfer.effectAllowed = 'copy'
        }}
        className="group flex items-center gap-2 px-3 py-2 cursor-grab active:cursor-grabbing transition-colors hover:bg-black/5 dark:hover:bg-[#1A2028]"
      >
        <GripVertical size={10} className="shrink-0 opacity-30 transition-opacity group-hover:opacity-70" style={{ color: meta.color }} />
        <meta.Icon size={11} className="shrink-0" style={{ color: meta.color }} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-medium" style={{ color: TEXT }}>{template.name}</p>
          {(template.manufacturer || template.instrumentType) && (
            <p className="truncate text-[9px]" style={{ color: TEXT_DIM }}>
              {[template.instrumentType, template.manufacturer].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <button
          type="button"
          draggable={false}
          onClick={event => {
            event.stopPropagation()
            onToggleDetails(template.id)
          }}
          className="prism-action flex h-6 w-6 shrink-0 items-center justify-center rounded-md border opacity-0 transition-all group-hover:opacity-100 group-focus-within:opacity-100"
          style={{ borderColor: expanded ? `${meta.color}55` : `${BORDER}A6`, color: expanded ? meta.color : TEXT_DIM, background: expanded ? `${meta.color}10` : PAGE_BG }}
          title={expanded ? 'Masquer le détail' : 'Voir les paramètres'}
        >
          {expanded ? <ChevronDown size={11} /> : <Layers size={11} />}
        </button>
        <span
          className="shrink-0 rounded px-1 py-0.5 text-[8px] font-bold"
          style={{ background: originTone.bg, color: originTone.color }}
        >
          {orig.label}
        </span>
        {(onArchive || onDelete) && (
          <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            {onArchive && (
              <button
                type="button"
                draggable={false}
                onClick={e => { e.stopPropagation(); onArchive(template.id) }}
                className="rounded p-1 transition-colors hover:bg-amber-900/30"
                style={{ color: '#FBBF24' }}
                title="Archiver"
              >
                <Archive size={10} />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                draggable={false}
                onClick={e => { e.stopPropagation(); onDelete(template.id) }}
                className="rounded p-1 transition-colors hover:bg-red-900/30"
                style={{ color: '#F87171' }}
                title="Supprimer"
              >
                <Trash2 size={10} />
              </button>
            )}
          </div>
        )}
      </div>

      {expanded && (
        <div className="px-3 pb-3">
          <div
            className="rounded-xl border px-3 py-3"
            style={{
              borderColor: `${meta.color}28`,
              background: SURFACE,
              boxShadow: SHADOW_SOFT,
            }}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: meta.color }}>
                  {template.instrumentType || meta.label}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed" style={{ color: TEXT }}>
                  {[template.manufacturer, template.dataSource].filter(Boolean).join(' · ') || 'Bibliothèque standard'}
                </p>
              </div>
              {template.sourceReference ? (
                <span className="rounded px-1.5 py-0.5 text-[8px] font-semibold" style={{ background: `${meta.color}12`, color: meta.color }}>
                  {template.sourceReference}
                </span>
              ) : null}
            </div>

            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))' }}>
              <div className="rounded-lg border px-2.5 py-2" style={fieldTone}>
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>lambda</p>
                <p className="mt-1 text-[11px] font-semibold font-mono" style={{ color: TEXT }}>
                  {formatLambda(snapshot.factorized.lambda)}
                </p>
              </div>
              <div className="rounded-lg border px-2.5 py-2" style={fieldTone}>
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>λD/λ</p>
                <p className="mt-1 text-[11px] font-semibold font-mono" style={{ color: TEXT }}>
                  {formatRatio(snapshot.factorized.lambdaDRatio)}
                </p>
              </div>
              <div className="rounded-lg border px-2.5 py-2" style={fieldTone}>
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>DC</p>
                <p className="mt-1 text-[11px] font-semibold font-mono" style={{ color: TEXT }}>
                  {formatRatio(snapshot.factorized.DCd)}
                </p>
              </div>
              <div className="rounded-lg border px-2.5 py-2" style={fieldTone}>
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>T1</p>
                <p className="mt-1 text-[11px] font-semibold font-mono" style={{ color: TEXT }}>
                  {formatDuration(snapshot.test.T1, snapshot.test.T1Unit)}
                </p>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <div className="rounded-lg border px-2.5 py-2" style={fieldTone}>
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Factorisé</p>
                <div className="mt-2 grid gap-2 text-[10px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))' }}>
                  <ParameterReadout label="λ total" value={formatLambda(snapshot.factorized.lambda)} />
                  <ParameterReadout label="λD / λ" value={formatRatio(snapshot.factorized.lambdaDRatio)} />
                  <ParameterReadout label="DCd" value={formatRatio(snapshot.factorized.DCd)} />
                  <ParameterReadout label="DCs" value={formatRatio(snapshot.factorized.DCs)} />
                </div>
              </div>

              {developedVisible && (
                <div className="rounded-lg border px-2.5 py-2" style={fieldTone}>
                  <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Développé</p>
                  <div className="mt-2 grid gap-2 text-[10px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))' }}>
                    <ParameterReadout label="λDU" value={formatLambda(snapshot.developed.lambda_DU)} />
                    <ParameterReadout label="λDD" value={formatLambda(snapshot.developed.lambda_DD)} />
                    <ParameterReadout label="λSD" value={formatLambda(snapshot.developed.lambda_SD)} />
                    <ParameterReadout label="λSU" value={formatLambda(snapshot.developed.lambda_SU)} />
                  </div>
                </div>
              )}

              <div className="rounded-lg border px-2.5 py-2" style={fieldTone}>
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Test</p>
                <div className="mt-2 grid gap-2 text-[10px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))' }}>
                  <ParameterReadout label="Type" value={snapshot.test.testType} />
                  <ParameterReadout label="T1" value={formatDuration(snapshot.test.T1, snapshot.test.T1Unit)} />
                  <ParameterReadout label="T0" value={formatDuration(snapshot.test.T0, snapshot.test.T0Unit)} />
                </div>
              </div>

              {advancedVisible && (
                <div className="rounded-lg border px-2.5 py-2" style={fieldTone}>
                  <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Avancé</p>
                  <div className="mt-2 grid gap-2 text-[10px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))' }}>
                    <ParameterReadout label="MTTR" value={formatDuration(snapshot.advanced.MTTR, 'hr')} />
                    <ParameterReadout label="γ" value={String(snapshot.advanced.gamma ?? 0)} />
                    <ParameterReadout label="λ*" value={formatLambda(snapshot.advanced.lambdaStar)} />
                    <ParameterReadout label="π" value={formatDuration(snapshot.advanced.testDuration, 'hr')} />
                    <ParameterReadout label="PTC" value={formatRatio(snapshot.advanced.proofTestCoverage)} />
                    <ParameterReadout label="Lifetime" value={snapshot.advanced.lifetime == null ? 'n/a' : formatDuration(snapshot.advanced.lifetime, 'yr')} />
                  </div>
                  {snapshot.advanced.partialTest.enabled && (
                    <div className="mt-2 rounded-lg border px-2.5 py-2" style={{ borderColor: `${meta.color}22`, background: `${meta.color}08` }}>
                      <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: meta.color }}>Partial stroke test</p>
                      <div className="mt-2 grid gap-2 text-[10px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))' }}>
                        <ParameterReadout label="Durée" value={formatDuration(snapshot.advanced.partialTest.duration, 'hr')} />
                        <ParameterReadout label="Détection" value={formatRatio(snapshot.advanced.partialTest.detectedFaultsPct)} />
                        <ParameterReadout label="Nb tests" value={String(snapshot.advanced.partialTest.numberOfTests ?? 0)} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ParameterReadout({ label, value }: { label: string; value: string }) {
  const { TEXT, TEXT_DIM } = usePrismTheme()
  return (
    <div>
      <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>{label}</p>
      <p className="mt-1 text-[10px] font-medium font-mono" style={{ color: TEXT }}>{value}</p>
    </div>
  )
}

function LibraryContent({ projectId }: { projectId: string }) {
  const { BORDER, CARD_BG, PAGE_BG, TEAL, TEAL_DIM, TEXT, TEXT_DIM } = usePrismTheme()
  const profileId = useAppStore(state => state.profile?.id ?? null)
  const setSyncError = useAppStore(state => state.setSyncError)
  const {
    builtinTemplates, projectTemplates, userTemplates,
    loading, error, fetchTemplates, importTemplates,
    archiveTemplate, deleteTemplate, clearError,
  } = useComponentLibrary(projectId)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [search, setSearch] = useState('')
  const [openTypes, setOpenTypes] = useState<Set<SubsystemType>>(new Set(['sensor', 'logic', 'actuator']))
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null)
  const [visibleCountByType, setVisibleCountByType] = useState<Record<SubsystemType, number>>(INITIAL_LIBRARY_VISIBLE_COUNT)

  // Unified list: built-in first, then project, then user
  const allTemplates = [
    ...builtinTemplates.map(t => ({ template: t, origin: 'builtin' as OriginBadge })),
    ...projectTemplates.map(t => ({ template: t, origin: 'project' as OriginBadge })),
    ...userTemplates.map(t => ({ template: t, origin: 'user' as OriginBadge })),
  ]

  const filtered = (() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return allTemplates
    return allTemplates.filter(({ template: t }) => {
      const hay = [t.name, t.description, t.instrumentType, t.manufacturer, t.dataSource, t.sourceReference, ...t.tags]
        .filter(Boolean).join(' ').toLowerCase()
      return hay.includes(needle)
    })
  })()

  const bySubsystem: Record<SubsystemType, typeof filtered> = {
    sensor:   filtered.filter(x => x.template.subsystemType === 'sensor'),
    logic:    filtered.filter(x => x.template.subsystemType === 'logic'),
    actuator: filtered.filter(x => x.template.subsystemType === 'actuator'),
  }

  const toggleType = (type: SubsystemType) =>
    setOpenTypes(prev => {
      const next = new Set(prev)
      next.has(type) ? next.delete(type) : next.add(type)
      return next
    })

  const toggleDetails = (id: string) => {
    setExpandedTemplateId(current => current === id ? null : id)
  }

  const showMore = (type: SubsystemType) => {
    setVisibleCountByType(prev => ({
      ...prev,
      [type]: prev[type] + LIBRARY_PREVIEW_COUNT,
    }))
  }

  const showLess = (type: SubsystemType) => {
    setVisibleCountByType(prev => ({
      ...prev,
      [type]: INITIAL_LIBRARY_VISIBLE_COUNT[type],
    }))
    setExpandedTemplateId(current => {
      if (!current) return current
      const visibleTemplateIds = bySubsystem[type]
        .slice(0, INITIAL_LIBRARY_VISIBLE_COUNT[type])
        .map(item => item.template.id)
      return visibleTemplateIds.includes(current) ? current : null
    })
  }

  const reset = () => { setStatusMessage(null); clearError(null); setSyncError(null) }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    reset()
    try {
      const text = await file.text()
      const batchId = crypto.randomUUID()
      const payload = parseComponentTemplateImport(text, 'user', projectId)
      const imported = await importTemplates(payload.map(t => ({ ...t, importBatchId: batchId })))
      setStatusMessage(`${imported.length} template(s) importé(s).`)
    } catch (err: unknown) {
      setSyncError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleExport = () => {
    reset()
    const exportable = userTemplates.length > 0 ? userTemplates : projectTemplates
    if (exportable.length === 0) return
    const scope = userTemplates.length > 0 ? 'user' : 'project'
    const content = serializeComponentTemplates(exportable, profileId, scope === 'project' ? projectId : null)
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `prism-templates-${stamp}.json`
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
    setStatusMessage(`${exportable.length} template(s) exporté(s).`)
  }

  const handleArchive = async (id: string) => {
    reset()
    try { await archiveTemplate(id); setStatusMessage('Archivé.') }
    catch (err: unknown) { setSyncError(err instanceof Error ? err.message : String(err)) }
  }

  const handleDelete = async (id: string) => {
    reset()
    try { await deleteTemplate(id); setStatusMessage('Supprimé.') }
    catch (err: unknown) { setSyncError(err instanceof Error ? err.message : String(err)) }
  }

  return (
    <div className="flex h-full flex-col">
      <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportFile} />

      {/* Header : search + actions */}
      <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-2" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher…"
          className="prism-field min-w-0 flex-1 rounded-md border px-2 py-1.5 text-[11px] outline-none"
          style={{ background: PAGE_BG, borderColor: BORDER, color: TEXT }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="prism-action flex h-7 w-7 items-center justify-center rounded-md border"
          style={{ borderColor: BORDER, color: TEXT_DIM }}
          title="Importer (JSON)"
        >
          <Upload size={11} />
        </button>
        <button
          type="button"
          onClick={handleExport}
          disabled={userTemplates.length === 0 && projectTemplates.length === 0}
          className="prism-action flex h-7 w-7 items-center justify-center rounded-md border disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ borderColor: BORDER, color: TEXT_DIM }}
          title="Exporter mes templates"
        >
          <Download size={11} />
        </button>
        <button
          type="button"
          onClick={() => void fetchTemplates()}
          className="prism-action flex h-7 w-7 items-center justify-center rounded-md border"
          style={{ borderColor: BORDER, color: TEXT_DIM }}
          title="Recharger"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Feedback */}
      {(statusMessage || error) && (
        <div className="shrink-0 px-2.5 pt-2">
          {statusMessage && (
            <div className="rounded-md px-2.5 py-1.5 text-[10px]"
              style={{ background: `${TEAL}10`, color: TEAL_DIM, border: `1px solid ${TEAL}20` }}>
              {statusMessage}
            </div>
          )}
          {error && (
            <div className="rounded-md px-2.5 py-1.5 text-[10px]"
              style={{ background: `${semantic.error}15`, color: semantic.error, border: `1px solid ${semantic.error}30` }}>
              {error}
            </div>
          )}
        </div>
      )}

      {/* Grouped list */}
      <div className="flex-1 overflow-y-auto pt-1">
        {(['sensor', 'logic', 'actuator'] as SubsystemType[]).map(type => {
          const meta  = SUB_META[type]
          const items = bySubsystem[type]
          const open  = openTypes.has(type)
          const visibleCount = search.trim() ? items.length : visibleCountByType[type]
          const visibleItems = items.slice(0, visibleCount)
          const remainingCount = Math.max(0, items.length - visibleItems.length)
          const canShowLess = !search.trim() && visibleCountByType[type] > INITIAL_LIBRARY_VISIBLE_COUNT[type] && items.length > INITIAL_LIBRARY_VISIBLE_COUNT[type]
          return (
            <div key={type}>
              <button
                type="button"
                onClick={() => toggleType(type)}
                className="flex w-full items-center gap-2 px-3 py-1.5 transition-colors hover:bg-black/5 dark:hover:bg-[#1A2028]"
                style={{ borderBottom: `1px solid ${BORDER}` }}
              >
                <meta.Icon size={11} style={{ color: meta.color }} />
                <span className="flex-1 text-left text-[9px] font-bold uppercase tracking-widest" style={{ color: meta.color }}>
                  {meta.label}
                </span>
                <span className="text-[9px] font-mono" style={{ color: TEXT_DIM }}>{items.length}</span>
                {open
                  ? <ChevronDown size={9} style={{ color: TEXT_DIM }} />
                  : <ChevronRight size={9} style={{ color: TEXT_DIM }} />
                }
              </button>
              {open && visibleItems.map(({ template, origin }) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  origin={origin}
                  expanded={expandedTemplateId === template.id}
                  onToggleDetails={toggleDetails}
                  onArchive={origin !== 'builtin' ? handleArchive : undefined}
                  onDelete={origin !== 'builtin' ? handleDelete : undefined}
                />
              ))}
              {open && !search.trim() && remainingCount > 0 && (
                <div style={{ borderBottom: `1px solid ${BORDER}28`, background: PAGE_BG }}>
                  <button
                    type="button"
                    onClick={() => showMore(type)}
                    className="prism-action flex w-full items-center justify-between px-3 py-2 text-left transition-colors"
                    style={{ color: meta.color }}
                  >
                    <span className="text-[10px] font-semibold">Charger plus</span>
                    <span className="text-[9px] font-mono" style={{ color: TEXT_DIM }}>+{remainingCount}</span>
                  </button>
                </div>
              )}
              {open && canShowLess && (
                <div style={{ borderBottom: `1px solid ${BORDER}28`, background: PAGE_BG }}>
                  <button
                    type="button"
                    onClick={() => showLess(type)}
                    className="prism-action flex w-full items-center justify-between px-3 py-2 text-left transition-colors"
                    style={{ color: TEXT_DIM }}
                  >
                    <span className="text-[10px] font-semibold">Voir moins</span>
                    <span className="text-[9px] font-mono">{INITIAL_LIBRARY_VISIBLE_COUNT[type]}</span>
                  </button>
                </div>
              )}
              {open && items.length === 0 && (
                <p className="px-3 py-3 text-center text-[10px]" style={{ color: TEXT_DIM }}>
                  Aucun template{search ? ' correspondant' : ''}.
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div
        className="shrink-0 flex items-center gap-3 px-3 py-2"
        style={{ borderTop: `1px solid ${BORDER}`, background: PAGE_BG }}
      >
        {(Object.entries(ORIGIN_STYLE) as [OriginBadge, typeof ORIGIN_STYLE[OriginBadge]][]).map(([key, s]) => {
          const tone = key === 'builtin'
            ? { color: TEXT_DIM, bg: `${BORDER}60` }
            : key === 'project'
              ? { color: '#F59E0B', bg: '#F59E0B18' }
              : { color: TEAL_DIM, bg: `${TEAL}15` }
          return (
          <span key={key} className="flex items-center gap-1 text-[9px]" style={{ color: TEXT_DIM }}>
            <span className="rounded px-1 py-0.5 text-[8px] font-bold" style={{ background: tone.bg, color: tone.color }}>{s.label}</span>
            {key === 'builtin' ? 'standard' : key === 'project' ? 'projet' : 'personnel'}
          </span>
        )})}
      </div>
    </div>
  )
}

// ─── Empty component state ────────────────────────────────────────────────────

function EmptyComponentState() {
  const { TEAL, TEAL_DIM, TEXT, TEXT_DIM } = usePrismTheme()
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-xl"
        style={{ background: `${TEAL}10`, border: `1px solid ${TEAL}20` }}
      >
        <Settings2 size={16} style={{ color: TEAL_DIM }} />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold" style={{ color: TEXT }}>Aucun composant sélectionné</p>
        <p className="text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
          Cliquez sur un composant ou un sous-composant dans le canvas.
        </p>
      </div>
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

interface Props {
  sif: SIF
  projectId: string
  onOpenCcfBeta?: (subsystemId: string) => void
}

export function LoopEditorRightPanel({ sif, projectId, onOpenCcfBeta }: Props) {
  const { PANEL_BG } = usePrismTheme()
  const selectedId      = useAppStore(state => state.selectedComponentId)
  const selectComponent = useAppStore(state => state.selectComponent)

  // Find selected component or selected sub-component
  let found: {
    comp: (typeof sif.subsystems)[0]['channels'][0]['components'][0]
    subComponent?: SubElement
    subsystemType: SubsystemType
    subsystemId: string
    channelId: string
  } | null = null

  if (selectedId) {
    outer: for (const sub of sif.subsystems) {
      for (const ch of sub.channels) {
        const comp = ch.components.find(c => c.id === selectedId || (c.subComponents ?? []).some(item => item.id === selectedId))
        if (comp) {
          const subComponent = (comp.subComponents ?? []).find(item => item.id === selectedId)
          found = { comp, subComponent, subsystemType: sub.type, subsystemId: sub.id, channelId: ch.id }
          break outer
        }
      }
    }
  }

  return (
    <RightPanelShell contentBg={PANEL_BG} openSectionId={selectedId ? 'component' : undefined} persistKey="architecture">
      <RightPanelSection id="architecture" label="Architecture" Icon={Network} noPadding>
        <ArchitectureConfigPanel sif={sif} projectId={projectId} onOpenCcfBeta={onOpenCcfBeta} />
      </RightPanelSection>

      <RightPanelSection id="component" label="Composant" Icon={Settings2} noPadding>
        {found ? (
          found.subComponent ? (
            <SubComponentParamsPanel
              component={found.comp}
              subComponent={found.subComponent}
              subsystemType={found.subsystemType}
              projectId={projectId}
              sifId={sif.id}
              subsystemId={found.subsystemId}
              channelId={found.channelId}
              onClose={() => selectComponent(null)}
            />
          ) : (
            <ComponentParamsPanel
              component={found.comp}
              subsystemType={found.subsystemType}
              projectId={projectId}
              sifId={sif.id}
              subsystemId={found.subsystemId}
              channelId={found.channelId}
              onClose={() => selectComponent(null)}
            />
          )
        ) : (
          <EmptyComponentState />
        )}
      </RightPanelSection>

      <RightPanelSection id="library" label="Bibliothèque" Icon={BookOpen} noPadding>
        <LibraryContent projectId={projectId} />
      </RightPanelSection>
    </RightPanelShell>
  )
}
