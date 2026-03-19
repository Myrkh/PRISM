import type { InstrumentCategory } from '@/core/types'
export const INSTRUMENT_CATEGORIES: InstrumentCategory[] = [
  'transmitter', 'switch', 'valve', 'positioner', 'controller', 'relay', 'other',
]

export const CAT_LABELS: Record<InstrumentCategory, string> = {
  transmitter: 'Transmetteur',
  switch: 'Pressoswitch / Switch',
  valve: 'Vanne',
  positioner: 'Positionneur',
  controller: 'Controleur / PLC',
  relay: 'Relais',
  other: 'Autre',
}

export const INSTRUMENT_TYPES: Record<InstrumentCategory, string[]> = {
  transmitter: [
    'Pressure transmitter',
    'Temperature transmitter',
    'Flow transmitter',
    'Level transmitter',
    'DP transmitter',
  ],
  switch: [
    'Pressure switch',
    'Temperature switch',
    'Flow switch',
    'Level switch',
    'Vibration switch',
  ],
  valve: [
    'On-off valve',
    'Control valve',
    'Solenoid valve',
    'Ball valve',
    'Butterfly valve',
  ],
  positioner: [
    'Electro-pneumatic positioner',
    'Digital positioner',
  ],
  controller: [
    'Safety PLC',
    'Safety relay module',
    'Safety controller',
  ],
  relay: [
    'Safety relay',
    'Interposing relay',
  ],
  other: ['Other'],
}
