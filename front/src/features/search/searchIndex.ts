import { computeCompliance } from '@/components/sif/complianceCalc'
import { getOverviewMetrics } from '@/components/sif/overviewMetrics'
import { calcSIF } from '@/core/math/pfdCalc'
import type {
  ComponentTemplate,
  Project,
  SIF,
  SIFAssumption,
  SIFComponent,
  SIFRevision,
  SubElement,
  TestCampaign,
} from '@/core/types'
import { getTemplateLibraryName } from '@/features/library'
import type { WorkspaceNode } from '@/store/workspaceStore'
import type { AppView, CanonicalSIFTab } from '@/store/types'

export type SearchScopeId =
  | 'all'
  | 'projects'
  | 'sifs'
  | 'components'
  | 'library'
  | 'assumptions'
  | 'actions'
  | 'proof'
  | 'revisions'
  | 'reports'
  | 'workspace'

export type SearchItemScope = Exclude<SearchScopeId, 'all'>

export type SearchResultKind =
  | 'project'
  | 'sif'
  | 'component'
  | 'subcomponent'
  | 'template'
  | 'assumption'
  | 'action'
  | 'procedure'
  | 'campaign'
  | 'event'
  | 'revision'
  | 'report'
  | 'note'
  | 'workspace-file'

export interface SearchResult {
  id: string
  scope: SearchItemScope
  kind: SearchResultKind
  title: string
  subtitle: string
  context: string
  keywords: string
  projectId: string | null
  projectName: string
  sifId: string | null
  sifLabel: string
  tab: CanonicalSIFTab | 'library'
  componentId?: string
  templateId?: string
  templateOrigin?: 'builtin' | 'project' | 'user' | null
  libraryName?: string | null
  workspaceNodeId?: string
  sortDate?: string | null
}

export type SearchResultGroup = {
  scope: SearchItemScope
  items: SearchResult[]
}

const SEARCH_SCOPE_ORDER: SearchItemScope[] = [
  'projects',
  'sifs',
  'components',
  'library',
  'assumptions',
  'actions',
  'proof',
  'revisions',
  'reports',
  'workspace',
]

const SEARCH_SCOPE_RANK = new Map<SearchItemScope, number>(
  SEARCH_SCOPE_ORDER.map((scope, index) => [scope, index]),
)

function normalizeText(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function buildSifLabel(sif: SIF) {
  return `${sif.sifNumber}${sif.title ? ` — ${sif.title}` : ''}`
}

function buildComponentTitle(component: Pick<SIFComponent, 'tagName' | 'instrumentType'>) {
  return component.tagName?.trim() || component.instrumentType.trim() || 'Component'
}

function buildSubComponentTitle(subComponent: Pick<SubElement, 'tagName' | 'label' | 'instrumentType'>) {
  return subComponent.tagName?.trim()
    || subComponent.label?.trim()
    || subComponent.instrumentType.trim()
    || 'Sous-composant'
}

function getTemplateOrigin(template: ComponentTemplate): 'builtin' | 'project' | 'user' {
  if (template.origin === 'builtin' || template.scope === 'public') return 'builtin'
  return template.scope === 'project' ? 'project' : 'user'
}

function pushLibraryTemplateResult(
  results: SearchResult[],
  template: ComponentTemplate,
  projectNameById: Map<string, string>,
) {
  const templateOrigin = getTemplateOrigin(template)
  const libraryName = getTemplateLibraryName(template)
  const projectName = template.projectId ? projectNameById.get(template.projectId) ?? 'Projet' : 'Bibliothèque maître'
  const originLabel = templateOrigin === 'builtin'
    ? 'Standards validés'
    : templateOrigin === 'project'
      ? 'Templates projet'
      : 'Bibliothèque personnelle'

  results.push({
    id: 'template:' + templateOrigin + ':' + template.id,
    scope: 'library',
    kind: 'template',
    title: template.name,
    subtitle: [template.instrumentType, template.manufacturer || 'Fabricant non renseigné'].filter(Boolean).join(' · '),
    context: ['Bibliothèque maître', originLabel, libraryName, templateOrigin === 'project' ? projectName : null].filter(Boolean).join(' · '),
    keywords: [
      template.name,
      template.description,
      template.instrumentType,
      template.instrumentCategory,
      template.manufacturer,
      template.dataSource,
      template.sourceReference,
      template.componentSnapshot.tagName,
      libraryName,
      originLabel,
      ...template.tags,
    ].join(' '),
    projectId: templateOrigin === 'project' ? template.projectId : null,
    projectName,
    sifId: null,
    sifLabel: '',
    tab: 'library',
    templateId: template.id,
    templateOrigin,
    libraryName,
    sortDate: template.updatedAt || template.createdAt || null,
  })
}

function pushAssumptionResult(results: SearchResult[], project: Project, sif: SIF, assumption: SIFAssumption) {
  const title = assumption.title.trim() || 'Hypothèse'
  const sifLabel = buildSifLabel(sif)

  results.push({
    id: `assumption:${assumption.id}`,
    scope: 'assumptions',
    kind: 'assumption',
    title,
    subtitle: assumption.statement || assumption.rationale || 'Hypothèse de dossier',
    context: `${project.name} · ${sifLabel} · Contexte · ${assumption.category}`,
    keywords: [
      title,
      assumption.statement,
      assumption.rationale,
      assumption.owner,
      assumption.category,
      assumption.status,
      sif.processTag,
      sif.hazardousEvent,
      sifLabel,
      project.name,
    ].join(' '),
    projectId: project.id,
    projectName: project.name,
    sifId: sif.id,
    sifLabel,
    tab: 'context',
    sortDate: assumption.reviewDate || sif.date || null,
  })
}

function pushComponentResult(
  results: SearchResult[],
  project: Project,
  sif: SIF,
  subsystemLabel: string,
  channelLabel: string,
  component: SIFComponent,
) {
  const title = buildComponentTitle(component)
  const sifLabel = buildSifLabel(sif)

  results.push({
    id: `component:${component.id}`,
    scope: 'components',
    kind: 'component',
    title,
    subtitle: `${component.instrumentType} · ${component.manufacturer || 'Fabricant non renseigné'}`,
    context: `${project.name} · ${sifLabel} · ${subsystemLabel} · ${channelLabel}`,
    keywords: [
      component.tagName,
      component.instrumentType,
      component.instrumentCategory,
      component.description,
      component.manufacturer,
      component.dataSource,
      component.nature,
      subsystemLabel,
      channelLabel,
      sif.processTag,
      sifLabel,
      project.name,
    ].join(' '),
    projectId: project.id,
    projectName: project.name,
    sifId: sif.id,
    sifLabel,
    tab: 'architecture',
    componentId: component.id,
  })
}

function pushSubComponentResult(
  results: SearchResult[],
  project: Project,
  sif: SIF,
  subsystemLabel: string,
  channelLabel: string,
  parent: SIFComponent,
  subComponent: SubElement,
) {
  const title = buildSubComponentTitle(subComponent)
  const sifLabel = buildSifLabel(sif)
  const parentLabel = buildComponentTitle(parent)

  results.push({
    id: `subcomponent:${subComponent.id}`,
    scope: 'components',
    kind: 'subcomponent',
    title,
    subtitle: `${subComponent.instrumentType} · sous-composant de ${parentLabel}`,
    context: `${project.name} · ${sifLabel} · ${subsystemLabel} · ${channelLabel}`,
    keywords: [
      subComponent.tagName,
      subComponent.label,
      subComponent.instrumentType,
      subComponent.instrumentCategory,
      subComponent.description,
      subComponent.manufacturer,
      subComponent.dataSource,
      parent.tagName,
      parent.instrumentType,
      subsystemLabel,
      channelLabel,
      sif.processTag,
      sifLabel,
      project.name,
    ].join(' '),
    projectId: project.id,
    projectName: project.name,
    sifId: sif.id,
    sifLabel,
    tab: 'architecture',
    componentId: subComponent.id,
  })
}

function pushCampaignResult(results: SearchResult[], project: Project, sif: SIF, campaign: TestCampaign) {
  const sifLabel = buildSifLabel(sif)
  const verdict = campaign.verdict === 'pass'
    ? 'Conforme'
    : campaign.verdict === 'fail'
      ? 'Échec'
      : 'Conditionnel'

  results.push({
    id: `campaign:${campaign.id}`,
    scope: 'proof',
    kind: 'campaign',
    title: `Campagne du ${campaign.date || 'sans date'}`,
    subtitle: `${verdict} · ${campaign.team || 'Équipe non renseignée'}`,
    context: `${project.name} · ${sifLabel} · Exploitation`,
    keywords: [
      campaign.date,
      campaign.team,
      campaign.operatingMode,
      campaign.verdict,
      campaign.notes,
      campaign.conductedBy,
      campaign.reviewedBy,
      sifLabel,
      project.name,
    ].join(' '),
    projectId: project.id,
    projectName: project.name,
    sifId: sif.id,
    sifLabel,
    tab: 'exploitation',
    sortDate: campaign.date || null,
  })
}

function buildSearchResultsForSif(
  results: SearchResult[],
  project: Project,
  sif: SIF,
  revisions: Record<string, SIFRevision[]>,
) {
  const sifLabel = buildSifLabel(sif)

  results.push({
    id: `sif:${sif.id}`,
    scope: 'sifs',
    kind: 'sif',
    title: sifLabel,
    subtitle: sif.processTag || sif.hazardousEvent || 'SIF',
    context: project.name,
    keywords: [
      sif.sifNumber,
      sif.title,
      sif.processTag,
      sif.hazardousEvent,
      sif.location,
      sif.pid,
      sif.status,
      project.name,
      project.ref,
      project.client,
    ].join(' '),
    projectId: project.id,
    projectName: project.name,
    sifId: sif.id,
    sifLabel,
    tab: 'cockpit',
    sortDate: sif.date || null,
  })

  results.push({
    id: `report:${sif.id}:workspace`,
    scope: 'reports',
    kind: 'report',
    title: `Rapport ${sif.sifNumber}`,
    subtitle: sif.revisionLockedAt ? `Révision ${sif.revision} publiée` : `Révision ${sif.revision} en préparation`,
    context: `${project.name} · ${sifLabel} · Rapport`,
    keywords: [
      'rapport publication pdf report package',
      sif.sifNumber,
      sif.title,
      sif.revision,
      sif.status,
      project.name,
    ].join(' '),
    projectId: project.id,
    projectName: project.name,
    sifId: sif.id,
    sifLabel,
    tab: 'report',
    sortDate: sif.revisionLockedAt || sif.date || null,
  })

  results.push({
    id: `revision:${sif.id}:current`,
    scope: 'revisions',
    kind: 'revision',
    title: `Révision ${sif.revision}`,
    subtitle: sif.revisionLockedAt ? 'Révision publiée' : 'Révision en travail',
    context: `${project.name} · ${sifLabel} · Historique`,
    keywords: [
      'revision historique publication history',
      sif.revision,
      sif.status,
      sif.title,
      sif.sifNumber,
      project.name,
    ].join(' '),
    projectId: project.id,
    projectName: project.name,
    sifId: sif.id,
    sifLabel,
    tab: 'history',
    sortDate: sif.revisionLockedAt || sif.date || null,
  })

  sif.assumptions.forEach(assumption => pushAssumptionResult(results, project, sif, assumption))

  if (sif.proofTestProcedure) {
    results.push({
      id: `procedure:${sif.proofTestProcedure.id}`,
      scope: 'proof',
      kind: 'procedure',
      title: sif.proofTestProcedure.ref || `Procédure ${sif.sifNumber}`,
      subtitle: `${sif.proofTestProcedure.status} · ${sif.proofTestProcedure.periodicityMonths} mois`,
      context: `${project.name} · ${sifLabel} · Exploitation`,
      keywords: [
        sif.proofTestProcedure.ref,
        sif.proofTestProcedure.status,
        sif.proofTestProcedure.notes,
        sif.proofTestProcedure.madeBy,
        sif.proofTestProcedure.verifiedBy,
        sif.proofTestProcedure.approvedBy,
        'procedure proof test exploitation',
        sifLabel,
        project.name,
      ].join(' '),
      projectId: project.id,
      projectName: project.name,
      sifId: sif.id,
      sifLabel,
      tab: 'exploitation',
      sortDate: sif.proofTestProcedure.approvedByDate || sif.proofTestProcedure.madeByDate || null,
    })
  }

  sif.testCampaigns.forEach(campaign => pushCampaignResult(results, project, sif, campaign))

  sif.operationalEvents.forEach(event => {
    results.push({
      id: `event:${event.id}`,
      scope: 'proof',
      kind: 'event',
      title: event.description || event.type,
      subtitle: `${event.type} · ${event.date}`,
      context: `${project.name} · ${sifLabel} · Exploitation`,
      keywords: [
        event.type,
        event.date,
        event.description,
        event.impact,
        event.linkedCampaignId,
        sifLabel,
        project.name,
      ].join(' '),
      projectId: project.id,
      projectName: project.name,
      sifId: sif.id,
      sifLabel,
      tab: 'exploitation',
      sortDate: event.date || null,
    })
  })

  sif.subsystems.forEach(subsystem => {
    subsystem.channels.forEach(channel => {
      channel.components.forEach(component => {
        pushComponentResult(results, project, sif, subsystem.label, channel.label, component)
        ;(component.subComponents ?? []).forEach(subComponent => {
          pushSubComponentResult(results, project, sif, subsystem.label, channel.label, component, subComponent)
        })
      })
    })
  })

  try {
    const calc = calcSIF(sif)
    const compliance = computeCompliance(sif, calc)
    const overview = getOverviewMetrics(sif, calc, compliance)
    const seenActionIds = new Set<string>()

    compliance.actions.forEach(action => {
      const id = `action:${sif.id}:compliance:${action.tab}:${normalizeText(action.title)}`
      if (seenActionIds.has(id)) return
      seenActionIds.add(id)
      results.push({
        id,
        scope: 'actions',
        kind: 'action',
        title: action.title,
        subtitle: action.hint,
        context: `${project.name} · ${sifLabel} · ${action.tab}`,
        keywords: `${action.title} ${action.hint} ${action.tab} ${sifLabel} ${project.name}`,
        projectId: project.id,
        projectName: project.name,
        sifId: sif.id,
        sifLabel,
        tab: action.tab as CanonicalSIFTab,
      })
    })

    overview.actions.forEach(action => {
      const id = `action:${sif.id}:overview:${action.tab}:${action.id}`
      if (seenActionIds.has(id)) return
      seenActionIds.add(id)
      results.push({
        id,
        scope: 'actions',
        kind: 'action',
        title: action.title,
        subtitle: action.hint,
        context: `${project.name} · ${sifLabel} · Cockpit`,
        keywords: `${action.title} ${action.hint} ${action.tab} cockpit ${sifLabel} ${project.name}`,
        projectId: project.id,
        projectName: project.name,
        sifId: sif.id,
        sifLabel,
        tab: action.tab as CanonicalSIFTab,
      })
    })
  } catch {
    // Search should remain available even if a calculation fails on a draft SIF.
  }

  ;(revisions[sif.id] ?? []).forEach(revision => {
    results.push({
      id: `revision:${revision.id}`,
      scope: 'revisions',
      kind: 'revision',
      title: `Révision ${revision.revisionLabel}`,
      subtitle: revision.changeDescription || revision.status,
      context: `${project.name} · ${sifLabel} · Historique`,
      keywords: [
        revision.revisionLabel,
        revision.changeDescription,
        revision.createdBy,
        revision.status,
        'revision history historique publication',
        sifLabel,
        project.name,
      ].join(' '),
      projectId: project.id,
      projectName: project.name,
      sifId: sif.id,
      sifLabel,
      tab: 'history',
      sortDate: revision.createdAt || null,
    })

    if (revision.reportArtifact.status === 'ready') {
      results.push({
        id: `report:${revision.id}:artifact`,
        scope: 'reports',
        kind: 'report',
        title: `Rapport publié ${revision.revisionLabel}`,
        subtitle: revision.reportArtifact.fileName || 'PDF prêt',
        context: `${project.name} · ${sifLabel} · Historique`,
        keywords: [
          revision.revisionLabel,
          revision.reportArtifact.fileName,
          revision.changeDescription,
          'rapport report pdf publie historique',
          sifLabel,
          project.name,
        ].join(' '),
        projectId: project.id,
        projectName: project.name,
        sifId: sif.id,
        sifLabel,
        tab: 'history',
        sortDate: revision.reportArtifact.generatedAt || revision.createdAt || null,
      })
    }
  })
}

function pushWorkspaceNodeResult(results: SearchResult[], node: WorkspaceNode) {
  if (node.type === 'folder') return
  const kind: SearchResultKind = node.type === 'note' ? 'note' : 'workspace-file'
  const subtitle = node.type === 'note'
    ? (node.content.slice(0, 120).replace(/#+\s*/g, '').trim() || 'Note Markdown')
    : node.type === 'pdf'
      ? 'PDF'
      : node.type === 'json'
        ? 'JSON workspace file'
        : 'Image'

  results.push({
    id: `workspace:${node.id}`,
    scope: 'workspace',
    kind,
    title: node.name,
    subtitle,
    context: 'Espace libre',
    keywords: [node.name, node.type === 'note' || node.type === 'json' ? node.content.slice(0, 500) : node.name].join(' '),
    projectId: null,
    projectName: '',
    sifId: null,
    sifLabel: '',
    tab: 'cockpit',
    workspaceNodeId: node.id,
  })
}

export function buildSearchIndex(
  projects: Project[],
  revisions: Record<string, SIFRevision[]>,
  libraryTemplates: ComponentTemplate[] = [],
  workspaceNodes: WorkspaceNode[] = [],
): SearchResult[] {
  const results: SearchResult[] = []
  const projectNameById = new Map(projects.map(project => [project.id, project.name]))

  projects.forEach(project => {
    const firstSif = project.sifs[0]
    results.push({
      id: `project:${project.id}`,
      scope: 'projects',
      kind: 'project',
      title: project.name,
      subtitle: [project.ref, project.client, project.site].filter(Boolean).join(' · ') || 'Projet',
      context: 'Portefeuille projets',
      keywords: [
        project.name,
        project.ref,
        project.client,
        project.site,
        project.unit,
        project.description,
        project.standard,
        project.status,
      ].join(' '),
      projectId: project.id,
      projectName: project.name,
      sifId: firstSif?.id ?? null,
      sifLabel: firstSif ? buildSifLabel(firstSif) : '',
      tab: 'cockpit',
      sortDate: project.updatedAt || project.createdAt || null,
    })

    project.sifs.forEach(sif => buildSearchResultsForSif(results, project, sif, revisions))
  })

  libraryTemplates.forEach(template => pushLibraryTemplateResult(results, template, projectNameById))
  workspaceNodes.forEach(node => pushWorkspaceNodeResult(results, node))

  return results.sort((left, right) => {
    const scopeDelta = (SEARCH_SCOPE_RANK.get(left.scope) ?? 99) - (SEARCH_SCOPE_RANK.get(right.scope) ?? 99)
    if (scopeDelta !== 0) return scopeDelta
    const rightDate = right.sortDate ?? ''
    const leftDate = left.sortDate ?? ''
    if (rightDate !== leftDate) return rightDate.localeCompare(leftDate)
    return left.title.localeCompare(right.title)
  })
}

function matchesAllTokens(result: SearchResult, tokens: string[]) {
  if (!tokens.length) return true
  const haystack = normalizeText(`${result.title} ${result.subtitle} ${result.context} ${result.keywords}`)
  return tokens.every(token => haystack.includes(token))
}

function scoreSearchResult(result: SearchResult, normalizedQuery: string, tokens: string[]) {
  if (!normalizedQuery) return 0

  const title = normalizeText(result.title)
  const subtitle = normalizeText(result.subtitle)
  const context = normalizeText(result.context)
  const keywords = normalizeText(result.keywords)

  let score = 0

  if (title === normalizedQuery) score += 320
  else if (title.startsWith(normalizedQuery)) score += 220
  else if (title.includes(normalizedQuery)) score += 140

  if (subtitle.includes(normalizedQuery)) score += 72
  if (context.includes(normalizedQuery)) score += 44
  if (keywords.includes(normalizedQuery)) score += 26

  tokens.forEach(token => {
    if (title.startsWith(token)) score += 40
    else if (title.includes(token)) score += 24
    if (subtitle.includes(token)) score += 12
    if (context.includes(token)) score += 10
    if (keywords.includes(token)) score += 6
  })

  return score
}

export function filterSearchResults(
  results: SearchResult[],
  query: string,
  options?: {
    scope?: SearchScopeId
    projectId?: string | null
    limit?: number
  },
): SearchResult[] {
  const normalizedQuery = normalizeText(query)
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean)
  const scope = options?.scope ?? 'all'
  const projectId = options?.projectId ?? null

  const filtered = results
    .filter(result => (scope === 'all' ? true : result.scope === scope))
    .filter(result => (projectId ? result.projectId === projectId : true))
    .filter(result => matchesAllTokens(result, tokens))
    .map(result => ({
      result,
      score: scoreSearchResult(result, normalizedQuery, tokens),
    }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score
      const scopeDelta = (SEARCH_SCOPE_RANK.get(left.result.scope) ?? 99) - (SEARCH_SCOPE_RANK.get(right.result.scope) ?? 99)
      if (scopeDelta !== 0) return scopeDelta
      const rightDate = right.result.sortDate ?? ''
      const leftDate = left.result.sortDate ?? ''
      if (rightDate !== leftDate) return rightDate.localeCompare(leftDate)
      return left.result.title.localeCompare(right.result.title)
    })
    .map(entry => entry.result)

  if (!options?.limit || filtered.length <= options.limit) return filtered
  return filtered.slice(0, options.limit)
}

export function groupSearchResults(results: SearchResult[]): SearchResultGroup[] {
  return SEARCH_SCOPE_ORDER
    .map(scope => ({
      scope,
      items: results.filter(result => result.scope === scope),
    }))
    .filter(group => group.items.length > 0)
}

export function getSearchScopeCounts(results: SearchResult[]): Record<SearchItemScope, number> {
  return SEARCH_SCOPE_ORDER.reduce<Record<SearchItemScope, number>>((acc, scope) => {
    acc[scope] = results.filter(result => result.scope === scope).length
    return acc
  }, {
    projects: 0,
    sifs: 0,
    components: 0,
    library: 0,
    assumptions: 0,
    actions: 0,
    proof: 0,
    revisions: 0,
    reports: 0,
    workspace: 0,
  })
}

export function getProjectCounts(results: SearchResult[]): Record<string, number> {
  return results.reduce<Record<string, number>>((acc, result) => {
    if (!result.projectId) return acc
    acc[result.projectId] = (acc[result.projectId] ?? 0) + 1
    return acc
  }, {})
}

export function openSearchResult(
  result: SearchResult,
  helpers: {
    navigate: (view: AppView) => void
    selectComponent: (id: string | null) => void
  },
) {
  const { navigate, selectComponent } = helpers

  if (result.workspaceNodeId) {
    if (result.kind === 'note') {
      navigate({ type: 'note', noteId: result.workspaceNodeId })
    } else {
      navigate({ type: 'workspace-file', nodeId: result.workspaceNodeId })
    }
    return
  }

  if (result.componentId && result.projectId && result.sifId) {
    selectComponent(result.componentId)
    navigate({ type: 'sif-dashboard', projectId: result.projectId, sifId: result.sifId, tab: 'architecture' })
    return
  }

  if (result.templateId) {
    selectComponent(null)
    navigate({
      type: 'library',
      templateId: result.templateId,
      origin: result.templateOrigin ?? undefined,
      libraryName: result.libraryName ?? undefined,
    })
    return
  }

  selectComponent(null)

  if (result.projectId && result.sifId && result.tab !== 'library') {
    navigate({ type: 'sif-dashboard', projectId: result.projectId, sifId: result.sifId, tab: result.tab })
    return
  }

  if (result.projectId && !result.sifId) {
    navigate({ type: 'projects' })
    return
  }

  navigate({ type: 'projects' })
}
