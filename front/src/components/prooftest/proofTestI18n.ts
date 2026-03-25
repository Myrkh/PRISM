import type { SifExploitationStrings } from '@/i18n/sifExploitation'
import type { CatType, PTCategory, ProofTestLocation, ResponseCheckType, ResultType, Status, Verdict } from './proofTestTypes'

const LOCATION_KEY_BY_VALUE: Record<string, keyof SifExploitationStrings['meta']['locations']> = {
  SDC: 'sdc',
  CCR: 'sdc',
  'Local Instrumentation': 'localInstrumentation',
  'Poste Électrique (PE)': 'electricalSubstation',
  'Electrical Substation': 'electricalSubstation',
  Terrain: 'field',
  Field: 'field',
  'Salle de Contrôle': 'controlRoom',
  'Control Room': 'controlRoom',
  'Tableau Électrique': 'electricalPanel',
  'Electrical Panel': 'electricalPanel',
  Autre: 'other',
  Other: 'other',
}

export function getProofTestLocationLabel(strings: SifExploitationStrings, location: ProofTestLocation): string {
  const key = LOCATION_KEY_BY_VALUE[location]
  return key ? strings.meta.locations[key] : location
}

export function getProofTestCategoryLabel(strings: SifExploitationStrings, type: CatType): string {
  return strings.meta.categoryLabels[type]
}

export function getProofTestCategoryTitle(strings: SifExploitationStrings, category: PTCategory): string {
  return category.type === 'test'
    ? category.title || strings.meta.categoryLabels.test
    : strings.meta.categoryLabels[category.type]
}

export function getProofTestStatusLabel(strings: SifExploitationStrings, status: Status): string {
  return strings.meta.procedureStatuses[status]
}

export function getProofTestResultTypeLabel(strings: SifExploitationStrings, resultType: ResultType): string {
  if (resultType === 'oui_non') return strings.meta.resultTypes.yesNo
  if (resultType === 'valeur') return strings.meta.resultTypes.value
  return strings.meta.resultTypes.custom
}

export function getProofTestResponseCheckTypeLabel(strings: SifExploitationStrings, type: ResponseCheckType): string {
  if (type === 'valve_open') return strings.meta.responseCheckTypes.valveOpen
  if (type === 'valve_close') return strings.meta.responseCheckTypes.valveClose
  return strings.meta.responseCheckTypes.sifResponse
}

export function getProofTestVerdictLabel(strings: SifExploitationStrings, verdict: Exclude<Verdict, null>): string {
  if (verdict === 'pass') return strings.proofTestTab.verdicts.pass
  if (verdict === 'conditional') return strings.proofTestTab.verdicts.conditional
  return strings.proofTestTab.verdicts.fail
}
