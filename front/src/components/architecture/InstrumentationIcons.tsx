import type { CSSProperties, ReactNode } from 'react'
import type { InstrumentCategory, SubsystemType } from '@/core/types'

type IconProps = {
  size?: number
  className?: string
  style?: CSSProperties
}

type IconComponent = (props: IconProps) => JSX.Element

function SvgBase({
  size = 16,
  className,
  style,
  children,
  viewBox = '0 0 24 24',
}: IconProps & { children: ReactNode; viewBox?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const TransmitterIcon: IconComponent = props => (
  <SvgBase {...props}>
    <circle cx="12" cy="12" r="9" />
    <line x1="3" y1="12" x2="21" y2="12" />
  </SvgBase>
)

export const SwitchSensorIcon: IconComponent = props => (
  <SvgBase {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 14L11 14L14 10" />
    <circle cx="14.5" cy="9.5" r="1.5" />
  </SvgBase>
)

export const LimitSwitchIcon: IconComponent = props => (
  <SvgBase {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 15h4" />
    <path d="M12 15l4-5" />
    <circle cx="16.5" cy="9.5" r="1.2" />
  </SvgBase>
)

export const LogicSolverIcon: IconComponent = props => (
  <SvgBase {...props}>
    <rect x="3" y="3" width="18" height="18" rx="1" />
    <polygon points="12,3 21,12 12,21 3,12" />
  </SvgBase>
)

export const RelayIcon: IconComponent = props => (
  <SvgBase {...props}>
    <polygon points="12,2 22,12 12,22 2,12" />
  </SvgBase>
)

export const ValveIcon: IconComponent = props => (
  <SvgBase {...props}>
    <path d="M4 6V18L20 6V18Z" />
  </SvgBase>
)

export const PositionerIcon: IconComponent = props => (
  <SvgBase {...props}>
    <path d="M4 12V20L20 12V20Z" />
    <line x1="12" y1="16" x2="12" y2="6" />
    <line x1="8" y1="6" x2="16" y2="6" />
    <rect x="13" y="9" width="5" height="4" />
  </SvgBase>
)

export const SolenoidValveIcon: IconComponent = props => (
  <SvgBase {...props}>
    <path d="M4 12V20L20 12V20Z" />
    <line x1="12" y1="16" x2="12" y2="8" />
    <rect x="9" y="4" width="6" height="4" />
    <path d="M9 8L15 4" />
  </SvgBase>
)

export const SolenoidIcon: IconComponent = props => (
  <SvgBase {...props}>
    <rect x="5" y="9" width="6.5" height="6" rx="1.2" />
    <path d="M11.5 12H16" />
    <path d="M16 9.5c1.8 0 1.8 5 3.5 5" />
    <path d="M16 14.5c1.8 0 1.8-5 3.5-5" />
  </SvgBase>
)

export const MotorIcon: IconComponent = props => (
  <SvgBase {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 15V9l4 4 4-4v6" />
  </SvgBase>
)

export const PumpIcon: IconComponent = props => (
  <SvgBase {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 16L16 12L8 8Z" />
  </SvgBase>
)

export const ContactorIcon: IconComponent = props => (
  <SvgBase {...props}>
    <path d="M6 14h3" />
    <path d="M15 14h3" />
    <path d="M9 14l5-6" />
    <path d="M12 10V4" strokeDasharray="2 2" />
    <path d="M10 4h4" />
  </SvgBase>
)

export const GenericComponentIcon: IconComponent = props => (
  <SvgBase {...props}>
    <rect x="5" y="5" width="14" height="14" rx="2" strokeDasharray="3 3" />
  </SvgBase>
)

function resolveComponentIcon(
  subsystemType: SubsystemType,
  instrumentCategory?: InstrumentCategory | null,
  instrumentType?: string | null,
): IconComponent {
  const type = (instrumentType ?? '').toLowerCase()

  if (type.includes('limit') || type.includes('position switch')) return LimitSwitchIcon
  if (type.includes('solenoid valve')) return SolenoidValveIcon
  if (type === 'solenoid' || type.startsWith('sov')) return SolenoidIcon
  if (type.includes('positioner')) return PositionerIcon
  if (type.includes('relay')) return RelayIcon
  if (type.includes('plc') || type.includes('logic solver') || type.includes('controller') || type.includes('sis')) return LogicSolverIcon
  if (type.includes('switch')) return SwitchSensorIcon
  if (type.includes('transmitter')) return TransmitterIcon
  if (type.includes('valve')) return ValveIcon
  if (type.includes('motor')) return MotorIcon
  if (type.includes('pump')) return PumpIcon
  if (type.includes('contactor')) return ContactorIcon

  if (instrumentCategory === 'transmitter') return TransmitterIcon
  if (instrumentCategory === 'switch') return SwitchSensorIcon
  if (instrumentCategory === 'controller') return LogicSolverIcon
  if (instrumentCategory === 'relay') return RelayIcon
  if (instrumentCategory === 'valve') return ValveIcon
  if (instrumentCategory === 'positioner') return PositionerIcon

  return GenericComponentIcon
}

export function InstrumentationIcon({
  subsystemType,
  instrumentCategory,
  instrumentType,
  size = 16,
  className,
  style,
}: {
  subsystemType: SubsystemType
  instrumentCategory?: InstrumentCategory | null
  instrumentType?: string | null
  size?: number
  className?: string
  style?: CSSProperties
}) {
  const Icon = resolveComponentIcon(subsystemType, instrumentCategory, instrumentType)
  return <Icon size={size} className={className} style={style} />
}
