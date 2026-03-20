import { useEffect, useState } from 'react'
import { Cpu, GitCompareArrows, History } from 'lucide-react'
import { calcSIF } from '@/core/math/pfdCalc'
import { useAppStore } from '@/store/appStore'
import { usePrismTheme } from '@/styles/usePrismTheme'
import {
  SidebarBody,
  SidebarSectionTitle,
  sidebarHoverIn,
  sidebarHoverOut,
  sidebarPressDown,
  sidebarPressUp,
} from '@/components/layout/SidebarPrimitives'
import { useEngineNavigation, type EngineSection } from './EngineNavigation'
import { getEngineStrings } from '@/i18n/engine'
import { useLocaleStrings } from '@/i18n/useLocale'

const SECTION_META: Record<EngineSection, { Icon: typeof Cpu; tone: string }> = {
  runs: { Icon: Cpu, tone: '#0F9CA6' },
  compare: { Icon: GitCompareArrows, tone: '#2563EB' },
  history: { Icon: History, tone: '#7C3AED' },
}

function EngineSidebarButton({
  section,
  label,
  hint,
  active,
  onClick,
}: {
  section: EngineSection
  label: string
  hint: string
  active: boolean
  onClick: () => void
}) {
  const { BORDER, PAGE_BG, SHADOW_CARD, SHADOW_SOFT, SURFACE, TEXT, TEXT_DIM } = usePrismTheme()
  const meta = SECTION_META[section]
  const Icon = meta.Icon

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex w-full items-start gap-2 overflow-hidden rounded-md px-2.5 py-2 text-left transition-[background-color,color,border-color,box-shadow,transform] duration-150 ease-out"
      style={{
        background: active ? SURFACE : 'transparent',
        border: `1px solid ${active ? `${meta.tone}24` : 'transparent'}`,
        boxShadow: active ? SHADOW_CARD : 'none',
        color: active ? TEXT : TEXT_DIM,
        transform: 'translateY(0) scale(1)',
      }}
      onMouseEnter={e => {
        if (!active) {
          sidebarHoverIn(e.currentTarget, {
            background: PAGE_BG,
            borderColor: `${BORDER}D0`,
            boxShadow: SHADOW_SOFT,
            color: TEXT,
          })
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          sidebarHoverOut(e.currentTarget, {
            background: 'transparent',
            borderColor: 'transparent',
            boxShadow: 'none',
            color: TEXT_DIM,
          })
        }
        sidebarPressUp(e.currentTarget, active ? SHADOW_CARD : 'none')
      }}
      onPointerDown={e => sidebarPressDown(e.currentTarget, SHADOW_SOFT)}
      onPointerUp={e => sidebarPressUp(e.currentTarget, active ? SHADOW_CARD : SHADOW_SOFT)}
      onPointerCancel={e => sidebarPressUp(e.currentTarget, active ? SHADOW_CARD : 'none')}
    >
      <div
        className="pointer-events-none absolute left-0 top-1 bottom-1 w-0.5 rounded-full transition-[opacity,transform] duration-150 ease-out"
        style={{
          background: meta.tone,
          opacity: active ? 1 : 0,
          transform: `translateX(${active ? '0px' : '-1px'}) scaleY(${active ? 1 : 0.6})`,
        }}
      />
      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center" style={{ color: active ? meta.tone : TEXT_DIM }}>
        <Icon size={15} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{label}</p>
        <p className="truncate text-[10px] leading-relaxed" style={{ color: TEXT_DIM }}>{hint}</p>
      </div>
    </button>
  )
}

type BackendHealthState = 'checking' | 'healthy' | 'offline'

export function EngineSidebar() {
  const strings = useLocaleStrings(getEngineStrings)
  const projects = useAppStore(s => s.projects)
  const { activeSection, setActiveSection, sections } = useEngineNavigation()
  const { BORDER, PAGE_BG, TEXT, TEXT_DIM, TEAL, semantic } = usePrismTheme()
  const [backendHealth, setBackendHealth] = useState<BackendHealthState>('checking')
  const [backendVersion, setBackendVersion] = useState<string | null>(null)

  const allSifs = projects.flatMap(project => project.sifs)
  const driftCandidates = allSifs.filter(sif => !calcSIF(sif).meetsTarget).length

  useEffect(() => {
    let active = true

    const checkHealth = async () => {
      try {
        const response = await fetch('/api/health', {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        })
        if (!response.ok) throw new Error(`Health check failed: ${response.status}`)
        const payload = await response.json() as { status?: string; version?: string }
        if (!active) return
        setBackendHealth(payload.status === 'ok' ? 'healthy' : 'offline')
        setBackendVersion(payload.version ?? null)
      } catch {
        if (!active) return
        setBackendHealth('offline')
        setBackendVersion(null)
      }
    }

    void checkHealth()
    const timer = window.setInterval(() => { void checkHealth() }, 30000)

    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [])

  const healthLabel = backendHealth === 'healthy'
    ? strings.sidebar.health.healthy
    : backendHealth === 'offline'
      ? strings.sidebar.health.offline
      : strings.sidebar.health.checking

  return (
    <SidebarBody className="pb-4">
      <div className="mb-3 px-2">
        <SidebarSectionTitle className="mb-0 px-0">{strings.sidebar.title}</SidebarSectionTitle>
        <p className="mt-1 text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
          {strings.sidebar.description}
        </p>
      </div>

      <div className="space-y-1">
        {sections.map(section => (
          <EngineSidebarButton
            key={section.id}
            section={section.id}
            label={section.label}
            hint={section.hint}
            active={activeSection === section.id}
            onClick={() => setActiveSection(section.id)}
          />
        ))}
      </div>

      <div className="mt-4 px-2">
        <div className="flex items-center gap-2 text-[10px] leading-none" style={{ color: TEXT_DIM }}>
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background: backendHealth === 'healthy' ? semantic.success : backendHealth === 'offline' ? semantic.error : TEAL,
              opacity: backendHealth === 'checking' ? 0.8 : 1,
            }}
          />
          <span style={{ color: TEXT }}>{healthLabel}</span>
          {backendVersion && backendHealth === 'healthy' && (
            <span style={{ color: TEXT_DIM }}>v{backendVersion}</span>
          )}
        </div>
      </div>

      <div className="mt-5 border-t pt-4" style={{ borderColor: `${BORDER}33` }}>
        <SidebarSectionTitle>{strings.sidebar.quickReadTitle}</SidebarSectionTitle>
        <div className="space-y-2 px-2 text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
          <div className="rounded-md border px-3 py-2" style={{ borderColor: `${BORDER}70`, background: PAGE_BG, color: TEXT }}>
            {strings.sidebar.totalSifs(allSifs.length)}
          </div>
          <p>{strings.sidebar.belowTarget(driftCandidates)}</p>
        </div>
      </div>
    </SidebarBody>
  )
}
