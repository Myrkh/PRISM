import { AlertTriangle } from 'lucide-react'
import type { SubsystemType } from '@/core/types'
import { useAppLocale } from '@/i18n/useLocale'
import { useAppStore } from '@/store/appStore'
import type { AISIFDraftFieldKey, AISIFDraftFieldState } from '@/store/types'
import { usePrismTheme } from '@/styles/usePrismTheme'

const DANGER = '#ef4444'
const WARNING = '#f59e0b'

export type AIDraftFieldTone = 'default' | 'warning' | 'danger'

export function getAIDraftFieldTone(state: AISIFDraftFieldState | null | undefined): AIDraftFieldTone {
  if (state === 'missing' || state === 'conflict') return 'danger'
  if (state === 'uncertain') return 'warning'
  return 'default'
}

export function useAISIFDraftFieldStatus(sifId: string) {
  const preview = useAppStore(s => (s.aiDraftPreview?.sifId === sifId ? s.aiDraftPreview : null))

  const getFieldState = (key: AISIFDraftFieldKey): AISIFDraftFieldState | null => {
    return preview?.fieldStatus?.[key] ?? null
  }

  const getSubsystemArchitectureState = (subsystemType: SubsystemType): AISIFDraftFieldState | null => {
    if (subsystemType === 'sensor') return getFieldState('sensor_architecture')
    if (subsystemType === 'logic') return getFieldState('logic_architecture')
    return getFieldState('actuator_architecture')
  }

  return {
    preview,
    getFieldState,
    getSubsystemArchitectureState,
  }
}

function getIndicatorLabel(locale: 'fr' | 'en', state: AISIFDraftFieldState | null | undefined): string | null {
  if (state === 'missing') return locale === 'fr' ? 'Info manquante' : 'Missing info'
  if (state === 'uncertain') return locale === 'fr' ? 'Info insuffisante' : 'Insufficient info'
  if (state === 'conflict') return locale === 'fr' ? 'Conflit' : 'Conflict'
  return null
}

export function AIDraftFieldIndicator({
  state,
  compact = false,
}: {
  state: AISIFDraftFieldState | null | undefined
  compact?: boolean
}) {
  const locale = useAppLocale()
  const { isDark, TEXT } = usePrismTheme()
  const tone = getAIDraftFieldTone(state)
  const label = getIndicatorLabel(locale, state)

  if (!label || tone === 'default') return null

  const color = tone === 'danger' ? DANGER : WARNING

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
      style={{
        borderColor: `${color}45`,
        background: tone === 'danger'
          ? (isDark ? 'rgba(239,68,68,0.14)' : 'rgba(239,68,68,0.08)')
          : (isDark ? 'rgba(245,158,11,0.16)' : 'rgba(245,158,11,0.10)'),
        color: compact ? color : TEXT,
      }}
      title={label}
    >
      <AlertTriangle size={compact ? 10 : 11} style={{ color }} />
      {!compact && <span>{label}</span>}
    </span>
  )
}

export function getAIDraftFieldDecoration(state: AISIFDraftFieldState | null | undefined): {
  borderColor?: string
  background?: string
} {
  const tone = getAIDraftFieldTone(state)
  if (tone === 'danger') {
    return {
      borderColor: 'rgba(239,68,68,0.45)',
      background: 'rgba(239,68,68,0.05)',
    }
  }
  if (tone === 'warning') {
    return {
      borderColor: 'rgba(245,158,11,0.42)',
      background: 'rgba(245,158,11,0.06)',
    }
  }
  return {}
}
