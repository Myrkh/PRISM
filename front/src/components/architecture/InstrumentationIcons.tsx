import type { CSSProperties, SVGProps } from 'react'
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
}: IconProps & { children: React.ReactNode; viewBox?: string }) {
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

export const SensorSubsystemIcon: IconComponent = props => (
  <SvgBase {...props}>
    <circle cx="12" cy="12" r="2.4" />
    <path d="M12 4.5v2.3" />
    <path d="M12 17.2v2.3" />
    <path d="M4.5 12h2.3" />
    <path d="M17.2 12h2.3" />
    <path d="M6.8 6.8l1.6 1.6" />
    <path d="M15.6 15.6l1.6 1.6" />
    <path d="M17.2 6.8l-1.6 1.6" />
    <path d="M8.4 15.6l-1.6 1.6" />
  </SvgBase>
)

export const LogicSubsystemIcon: IconComponent = props => (
  <SvgBase {...props}>
    <rect x="4" y="5.5" width="16" height="13" rx="2.5" />
    <path d="M8 9h2" />
    <path d="M8 12h2" />
    <path d="M8 15h2" />
    <path d="M14 9h2" />
    <path d="M14 12h2" />
    <path d="M14 15h2" />
    <path d="M12 3.5v2" />
    <path d="M12 18.5v2" />
  </SvgBase>
)

export const ActuatorSubsystemIcon: IconComponent = props => (
  <SvgBase {...props}>
    <path d="M6 12h12" />
    <path d="M12 5v14" />
    <path d="M9 9l3-3 3 3" />
    <path d="M9 15l3 3 3-3" />
    <circle cx="12" cy="12" r="6.8" strokeOpacity="0.28" />
  </SvgBase>
)

export const TransmitterIcon: IconComponent = props => (
  <SvgBase {...props}>
    <circle cx="11.5" cy="12" r="4" />
    <path d="M15.7 8.2a5.9 5.9 0 0 1 0 7.6" />
    <path d="M18.1 6.2a8.7 8.7 0 0 1 0 11.6" />
    <path d="M8.8 12h5.4" />
    <path d="M11.5 9.3v5.4" />
  </SvgBase>
)

export const SwitchSensorIcon: IconComponent = props => (
  <SvgBase {...props}>
    <path d="M5 15.5h5.5" />
    <path d="M13.5 8.5H19" />
    <path d="M10.5 15.5l3-7" />
    <circle cx="5" cy="15.5" r="1.2" />
    <circle cx="19" cy="8.5" r="1.2" />
    <path d="M8 6.5h4" />
    <path d="M10 6.5v3" />
  </SvgBase>
)

export const ControllerIcon: IconComponent = props => (
  <SvgBase {...props}>
    <rect x="4.5" y="5" width="15" height="14" rx="2.4" />
    <path d="M8 9h2.3" />
    <path d="M8 12h2.3" />
    <path d="M8 15h2.3" />
    <rect x="13.2" y="8.4" width="3" height="7.2" rx="0.8" />
    <path d="M7 3.5v1.5" />
    <path d="M12 3.5v1.5" />
    <path d="M17 3.5v1.5" />
    <path d="M7 19v1.5" />
    <path d="M12 19v1.5" />
    <path d="M17 19v1.5" />
  </SvgBase>
)

export const RelayIcon: IconComponent = props => (
  <SvgBase {...props}>
    <path d="M4.5 8.5h3" />
    <path d="M16.5 15.5h3" />
    <path d="M7.5 8.5c2 0 2 7 4 7s2-7 4-7" />
    <path d="M14.5 7.8l2.6 1.7" />
    <path d="M14.5 16.2l2.6-1.7" />
    <path d="M18.2 9.6v4.8" />
  </SvgBase>
)

export const ValveIcon: IconComponent = props => (
  <SvgBase {...props}>
    <path d="M4.5 12h4" />
    <path d="M15.5 12h4" />
    <path d="M8.5 8.5L12 12l-3.5 3.5" />
    <path d="M15.5 8.5L12 12l3.5 3.5" />
    <path d="M12 5v3.5" />
    <path d="M9.2 5h5.6" />
  </SvgBase>
)

export const PositionerIcon: IconComponent = props => (
  <SvgBase {...props}>
    <path d="M4.5 13h4" />
    <path d="M15.5 13h4" />
    <path d="M8.5 9.5L12 13l-3.5 3.5" />
    <path d="M15.5 9.5L12 13l3.5 3.5" />
    <rect x="9.1" y="4.2" width="5.8" height="3.4" rx="1.2" />
    <path d="M12 7.6V9.5" />
    <path d="M17.3 6h2.2" />
  </SvgBase>
)

export const SolenoidIcon: IconComponent = props => (
  <SvgBase {...props}>
    <rect x="4.5" y="9" width="6.5" height="6" rx="1.3" />
    <path d="M11 12h4" />
    <path d="M15 9.2c2 0 2 5.6 4 5.6" />
    <path d="M15 14.8c2 0 2-5.6 4-5.6" />
  </SvgBase>
)

export const GenericComponentIcon: IconComponent = props => (
  <SvgBase {...props}>
    <rect x="5" y="6" width="14" height="12" rx="2.2" />
    <path d="M9 10h6" />
    <path d="M9 14h4" />
  </SvgBase>
)

export const SUBSYSTEM_ICON_MAP: Record<SubsystemType, IconComponent> = {
  sensor: SensorSubsystemIcon,
  logic: LogicSubsystemIcon,
  actuator: ActuatorSubsystemIcon,
}

function resolveComponentIcon(
  subsystemType: SubsystemType,
  instrumentCategory?: InstrumentCategory | null,
  instrumentType?: string | null,
): IconComponent {
  const type = (instrumentType ?? '').toLowerCase()

  if (type.includes('solenoid')) return SolenoidIcon
  if (type.includes('positioner')) return PositionerIcon
  if (type.includes('relay')) return RelayIcon
  if (type.includes('plc') || type.includes('controller')) return ControllerIcon
  if (type.includes('switch')) return SwitchSensorIcon
  if (type.includes('transmitter')) return TransmitterIcon
  if (type.includes('valve')) return ValveIcon

  if (instrumentCategory === 'transmitter') return TransmitterIcon
  if (instrumentCategory === 'switch') return SwitchSensorIcon
  if (instrumentCategory === 'controller') return ControllerIcon
  if (instrumentCategory === 'relay') return RelayIcon
  if (instrumentCategory === 'valve') return ValveIcon
  if (instrumentCategory === 'positioner') return PositionerIcon

  return SUBSYSTEM_ICON_MAP[subsystemType] ?? GenericComponentIcon
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
