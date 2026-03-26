import type { ElementType } from 'react'
import { Activity, Cpu, Zap } from 'lucide-react'
import type { InstrumentCategory, SubsystemType, TestType } from '@/core/types'
import type { AppLocale } from '@/i18n/types'

const SUBSYSTEM_BASE: Record<SubsystemType, { color: string; Icon: ElementType }> = {
  sensor: { color: '#0284C7', Icon: Activity },
  logic: { color: '#7C3AED', Icon: Cpu },
  actuator: { color: '#EA580C', Icon: Zap },
}

const SUBSYSTEM_LABELS = {
  fr: {
    sensor: { singularLabel: 'Capteur', pluralLabel: 'Capteurs' },
    logic: { singularLabel: 'Logique', pluralLabel: 'Logique' },
    actuator: { singularLabel: 'Actionneur', pluralLabel: 'Actionneurs' },
  },
  en: {
    sensor: { singularLabel: 'Sensor', pluralLabel: 'Sensors' },
    logic: { singularLabel: 'Logic', pluralLabel: 'Logic' },
    actuator: { singularLabel: 'Actuator', pluralLabel: 'Actuators' },
  },
} as const satisfies Record<AppLocale, Record<SubsystemType, { singularLabel: string; pluralLabel: string }>>

const CATEGORY_LABELS: Record<AppLocale, Record<InstrumentCategory, string>> = {
  fr: {
    transmitter: 'Transmetteur',
    switch: 'Pressoswitch / Switch',
    valve: 'Vanne',
    positioner: 'Positionneur',
    controller: 'Controleur / PLC',
    relay: 'Relais',
    other: 'Autre',
  },
  en: {
    transmitter: 'Transmitter',
    switch: 'Switch',
    valve: 'Valve',
    positioner: 'Positioner',
    controller: 'Controller / PLC',
    relay: 'Relay',
    other: 'Other',
  },
}

const TEST_TYPE_META: Record<AppLocale, Record<TestType, { label: string; description: string }>> = {
  fr: {
    stopped: { label: 'Arrêt unité', description: "Testé lors d'un arrêt unité" },
    online: { label: 'En ligne', description: 'Test complet en service' },
    partial: { label: 'PST (partiel)', description: 'Course partielle (vanne)' },
    none: { label: 'Aucun test', description: 'Pas de test de preuve' },
  },
  en: {
    stopped: { label: 'Unit shutdown', description: 'Tested during a unit shutdown' },
    online: { label: 'Online', description: 'Full test while in service' },
    partial: { label: 'PST (partial)', description: 'Partial stroke test (valve)' },
    none: { label: 'No test', description: 'No proof test' },
  },
}

const INSTRUMENT_TYPE_LABELS: Record<string, Record<AppLocale, string>> = {
  'Pressure transmitter': { fr: 'Transmetteur de pression', en: 'Pressure transmitter' },
  'Temperature transmitter': { fr: 'Transmetteur de température', en: 'Temperature transmitter' },
  'Flow transmitter': { fr: 'Transmetteur de débit', en: 'Flow transmitter' },
  'Level transmitter': { fr: 'Transmetteur de niveau', en: 'Level transmitter' },
  'DP transmitter': { fr: 'Transmetteur de pression différentielle', en: 'DP transmitter' },
  'Pressure switch': { fr: 'Pressostat', en: 'Pressure switch' },
  'Temperature switch': { fr: 'Thermostat', en: 'Temperature switch' },
  'Flow switch': { fr: 'Détecteur de débit', en: 'Flow switch' },
  'Level switch': { fr: 'Détecteur de niveau', en: 'Level switch' },
  'Vibration switch': { fr: 'Détecteur de vibration', en: 'Vibration switch' },
  'On-off valve': { fr: 'Vanne TOR', en: 'On-off valve' },
  'Control valve': { fr: 'Vanne de régulation', en: 'Control valve' },
  'Solenoid valve': { fr: 'Électrovanne', en: 'Solenoid valve' },
  'Ball valve': { fr: 'Vanne à boisseau sphérique', en: 'Ball valve' },
  'Butterfly valve': { fr: 'Vanne papillon', en: 'Butterfly valve' },
  'Electro-pneumatic positioner': { fr: 'Positionneur électropneumatique', en: 'Electro-pneumatic positioner' },
  'Digital positioner': { fr: 'Positionneur numérique', en: 'Digital positioner' },
  'Safety PLC': { fr: 'Automate de sécurité', en: 'Safety PLC' },
  'Safety relay module': { fr: 'Module relais de sécurité', en: 'Safety relay module' },
  'Safety controller': { fr: 'Contrôleur de sécurité', en: 'Safety controller' },
  'Safety relay': { fr: 'Relais de sécurité', en: 'Safety relay' },
  'Interposing relay': { fr: "Relais d'interface", en: 'Interposing relay' },
  Other: { fr: 'Autre', en: 'Other' },
}

const DATA_SOURCE_LABELS: Record<AppLocale, Record<string, string>> = {
  fr: {
    'SIL-DB': 'Base SIL certifiée',
    OREDA: 'OREDA',
    EXIDA: 'exida',
    Manufacturer: 'Constructeur',
    Custom: 'Données propres',
  },
  en: {
    'SIL-DB': 'Certified SIL database',
    OREDA: 'OREDA',
    EXIDA: 'exida',
    Manufacturer: 'Manufacturer',
    Custom: 'Custom data',
  },
}

const ORIGIN_BADGE_LABELS = {
  fr: { builtin: 'PRISM', project: 'projet', user: 'perso' },
  en: { builtin: 'PRISM', project: 'project', user: 'personal' },
} as const satisfies Record<AppLocale, Record<'builtin' | 'project' | 'user', string>>

const ORIGIN_TEXT_LABELS = {
  fr: { builtin: 'standard', project: 'projet', user: 'personnel' },
  en: { builtin: 'standard', project: 'project', user: 'personal' },
} as const satisfies Record<AppLocale, Record<'builtin' | 'project' | 'user', string>>

export function getLibraryLocaleTag(locale: AppLocale) {
  return locale === 'en' ? 'en-US' : 'fr-FR'
}

export function getLibrarySubsystemMeta(locale: AppLocale) {
  return {
    sensor: {
      ...SUBSYSTEM_BASE.sensor,
      ...SUBSYSTEM_LABELS[locale].sensor,
      label: SUBSYSTEM_LABELS[locale].sensor.pluralLabel,
    },
    logic: {
      ...SUBSYSTEM_BASE.logic,
      ...SUBSYSTEM_LABELS[locale].logic,
      label: SUBSYSTEM_LABELS[locale].logic.pluralLabel,
    },
    actuator: {
      ...SUBSYSTEM_BASE.actuator,
      ...SUBSYSTEM_LABELS[locale].actuator,
      label: SUBSYSTEM_LABELS[locale].actuator.pluralLabel,
    },
  }
}

export function getLibraryCategoryLabels(locale: AppLocale) {
  return CATEGORY_LABELS[locale]
}

export function getLibraryTestTypeMeta(locale: AppLocale) {
  return TEST_TYPE_META[locale]
}

export function formatLibraryTestType(locale: AppLocale, value: TestType) {
  return TEST_TYPE_META[locale][value].label
}

export function getLibraryInstrumentTypeLabel(locale: AppLocale, value: string) {
  return INSTRUMENT_TYPE_LABELS[value]?.[locale] ?? value
}

export function getLibraryDataSourceLabel(locale: AppLocale, value: string) {
  return DATA_SOURCE_LABELS[locale][value] ?? value
}

export function getLibraryOriginBadgeLabels(locale: AppLocale) {
  return ORIGIN_BADGE_LABELS[locale]
}

export function getLibraryOriginTextLabels(locale: AppLocale) {
  return ORIGIN_TEXT_LABELS[locale]
}
