/**
 * src/lib/db.ts
 *
 * Couche d'accès aux données Supabase.
 * — Mapping DB (snake_case) ↔ App (camelCase)
 * — Toutes les fonctions sont async et remontent les erreurs
 * — Les mutations architecture sont groupées (subsystems JSONB)
 */
import { supabase } from './supabase'
import type { Project, SIF, SIFRevision, SIFRevisionArtifact, SIFStatus } from '@/core/types'
import type { LOPAWorksheet, LOPAScenario } from '@/core/types/lopa.types'
import { hydrateSIF } from '@/core/models/hydrate'
import { createDefaultProofTestCampaignArtifact } from '@/core/models/proofTestCampaignWorkflow'
import { createDefaultRevisionArtifact } from '@/core/models/revisionWorkflow'

// ═══════════════════════════════════════════════════════════════
// MAPPERS — DB row → App type
// ═══════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToProject(row: any): Omit<Project, 'sifs'> {
  return {
    id:          row.id,
    name:        row.name        ?? '',
    ref:         row.ref         ?? '',
    client:      row.client      ?? '',
    site:        row.site        ?? '',
    unit:        row.unit        ?? '',
    standard:    row.standard    ?? 'IEC61511',
    revision:    row.revision    ?? 'A',
    description: row.description ?? '',
    status:      row.status      ?? 'active',
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
    riskTolerance: row.risk_tolerance ?? undefined,
    lopaParams:    row.lopa_params    ?? undefined,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToSIF(row: any): SIF {
  return hydrateSIF({
    id:                   row.id,
    projectId:            row.project_id,
    sifNumber:            row.sif_number        ?? '',
    revision:             row.revision          ?? 'A',
    revisionLockedAt:     row.revision_locked_at ?? null,
    lockedRevisionId:     row.locked_revision_id ?? null,
    title:                row.title             ?? '',
    description:          row.description       ?? '',
    pid:                  row.pid               ?? '',
    location:             row.location          ?? '',
    processTag:           row.process_tag       ?? '',
    hazardousEvent:       row.hazardous_event   ?? '',
    demandRate:           Number(row.demand_rate ?? 0.1),
    targetSIL:            Number(row.target_sil ?? 2) as SIF['targetSIL'],
    rrfRequired:          Number(row.rrf_required ?? 100),
    madeBy:               row.made_by           ?? '',
    verifiedBy:           row.verified_by       ?? '',
    approvedBy:           row.approved_by       ?? '',
    date:                 row.doc_date          ?? new Date().toISOString().split('T')[0],
    status:               row.status            ?? 'draft',
    subsystems:           row.subsystems        ?? [],
    assumptions:          row.assumptions       ?? undefined,
    proofTestProcedure:   row.proof_test_procedure ?? undefined,
    testCampaigns:        row.test_campaigns    ?? [],
    operationalEvents:    row.operational_events ?? [],
    hazopTrace:           row.hazop_trace       ?? undefined,
  })
}

type ProjectInput = Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'sifs'>

function projectToRow(data: Partial<ProjectInput>) {
  const row: Record<string, unknown> = {}
  if (data.name        !== undefined) row.name        = data.name
  if (data.ref         !== undefined) row.ref         = data.ref
  if (data.client      !== undefined) row.client      = data.client
  if (data.site        !== undefined) row.site        = data.site
  if (data.unit        !== undefined) row.unit        = data.unit
  if (data.standard    !== undefined) row.standard    = data.standard
  if (data.revision    !== undefined) row.revision    = data.revision
  if (data.description !== undefined) row.description = data.description
  if (data.status        !== undefined) row.status         = data.status
  if (data.riskTolerance !== undefined) row.risk_tolerance = data.riskTolerance
  if (data.lopaParams    !== undefined) row.lopa_params    = data.lopaParams
  return row
}

function sifToRow(data: Partial<SIF>) {
  const row: Record<string, unknown> = {}
  if (data.projectId       !== undefined) row.project_id          = data.projectId
  if (data.sifNumber       !== undefined) row.sif_number          = data.sifNumber
  if (data.revision        !== undefined) row.revision            = data.revision
  if (data.revisionLockedAt !== undefined) row.revision_locked_at = data.revisionLockedAt
  if (data.lockedRevisionId !== undefined) row.locked_revision_id = data.lockedRevisionId
  if (data.title           !== undefined) row.title               = data.title
  if (data.description     !== undefined) row.description         = data.description
  if (data.pid             !== undefined) row.pid                 = data.pid
  if (data.location        !== undefined) row.location            = data.location
  if (data.processTag      !== undefined) row.process_tag         = data.processTag
  if (data.hazardousEvent  !== undefined) row.hazardous_event     = data.hazardousEvent
  if (data.demandRate      !== undefined) row.demand_rate         = data.demandRate
  if (data.targetSIL       !== undefined) row.target_sil          = data.targetSIL
  if (data.rrfRequired     !== undefined) row.rrf_required        = data.rrfRequired
  if (data.madeBy          !== undefined) row.made_by             = data.madeBy
  if (data.verifiedBy      !== undefined) row.verified_by         = data.verifiedBy
  if (data.approvedBy      !== undefined) row.approved_by         = data.approvedBy
  if (data.date            !== undefined) row.doc_date            = data.date
  if (data.status          !== undefined) row.status              = data.status
  if (data.subsystems      !== undefined) row.subsystems          = data.subsystems
  if (data.assumptions     !== undefined) row.assumptions         = data.assumptions
  if (data.proofTestProcedure !== undefined) row.proof_test_procedure = data.proofTestProcedure
  if (data.testCampaigns   !== undefined) row.test_campaigns      = data.testCampaigns
  if (data.operationalEvents !== undefined) row.operational_events = data.operationalEvents
  if (data.hazopTrace      !== undefined) row.hazop_trace         = data.hazopTrace
  return row
}

function shouldRetryWithoutAssumptions(error: { message: string }): boolean {
  const message = error.message.toLowerCase()
  return message.includes('assumptions') && (
    message.includes('column')
    || message.includes('schema cache')
    || message.includes('does not exist')
  )
}

// ═══════════════════════════════════════════════════════════════
// PROJECTS
// ═══════════════════════════════════════════════════════════════

/**
 * Charge tous les projets + leurs SIFs en 2 requêtes parallèles.
 */
export async function fetchAllProjects(): Promise<Project[]> {
  const [
    { data: projRows, error: projErr },
    { data: sifRows, error: sifErr },
    { data: procedureRows, error: procedureErr },
    { data: campaignRows, error: campaignErr },
    { data: lopaStudyRows, error: lopaStudyErr },
    { data: lopaScenarioRows, error: lopaScenarioErr },
  ] =
    await Promise.all([
      supabase.from('prism_projects').select('*').order('created_at'),
      supabase.from('prism_sifs').select('*').order('created_at'),
      supabase.from('prism_proof_procedures').select('*').order('updated_at', { ascending: false }),
      supabase.from('prism_proof_campaigns').select('*').order('date', { ascending: false }),
      supabase.from('prism_lopa_studies').select('*').order('created_at'),
      supabase.from('prism_lopa_scenarios').select('*').order('sort_order'),
    ])

  if (projErr)         throw new Error(`prism_projects: ${projErr.message}`)
  if (sifErr)          throw new Error(`prism_sifs: ${sifErr.message}`)
  if (procedureErr)    throw new Error(`prism_proof_procedures: ${procedureErr.message}`)
  if (campaignErr)     throw new Error(`prism_proof_campaigns: ${campaignErr.message}`)
  // LOPA tables may not exist yet on older instances — treat as empty
  const lopaStudies   = lopaStudyErr   ? [] : (lopaStudyRows   ?? [])
  const lopaScenarios = lopaScenarioErr ? [] : (lopaScenarioRows ?? [])

  const proceduresBySif = (procedureRows ?? []).reduce<Record<string, any>>((acc, row) => {
    const sifId = row.sif_id as string
    if (!acc[sifId]) acc[sifId] = rowToProcedure(row)
    return acc
  }, {})

  const campaignsBySif = (campaignRows ?? []).reduce<Record<string, any[]>>((acc, row) => {
    const sifId = row.sif_id as string
    ;(acc[sifId] ??= []).push(rowToCampaign(row))
    return acc
  }, {})

  const sifsByProject = (sifRows ?? []).reduce<Record<string, SIF[]>>((acc, row) => {
    const pid = row.project_id as string
    const sif = rowToSIF(row)
    sif.proofTestProcedure = proceduresBySif[sif.id] ?? sif.proofTestProcedure
    sif.testCampaigns = campaignsBySif[sif.id] ?? sif.testCampaigns ?? []
    ;(acc[pid] ??= []).push(sif)
    return acc
  }, {})

  // Group scenarios by study_id
  const scenariosByStudy = lopaScenarios.reduce<Record<string, LOPAScenario[]>>((acc, row) => {
    ;(acc[row.study_id as string] ??= []).push(rowToLOPAScenario(row))
    return acc
  }, {})

  // Group studies by project_id
  const lopStudiesByProject = lopaStudies.reduce<Record<string, LOPAWorksheet[]>>((acc, row) => {
    const study = rowToLOPAStudy(row)
    study.scenarios = scenariosByStudy[study.id] ?? []
    ;(acc[row.project_id as string] ??= []).push(study)
    return acc
  }, {})

  return (projRows ?? []).map(row => ({
    ...rowToProject(row),
    sifs: sifsByProject[row.id as string] ?? [],
    lopaStudies: lopStudiesByProject[row.id as string] ?? [],
  }))
}

export async function dbCreateProject(id: string, data: ProjectInput): Promise<void> {
  const { error } = await supabase
    .from('prism_projects')
    .insert({ id, ...projectToRow(data) })
  if (error) throw new Error(`Création projet: ${error.message}`)
}

export async function dbUpdateProject(id: string, data: Partial<ProjectInput>): Promise<void> {
  const { error } = await supabase
    .from('prism_projects')
    .update(projectToRow(data))
    .eq('id', id)
  if (error) throw new Error(`Mise à jour projet: ${error.message}`)
}

export async function dbDeleteProject(id: string): Promise<void> {
  const { error } = await supabase
    .from('prism_projects')
    .delete()
    .eq('id', id)
  if (error) throw new Error(`Suppression projet: ${error.message}`)
}

// ═══════════════════════════════════════════════════════════════
// SIFs
// ═══════════════════════════════════════════════════════════════

export async function dbCreateSIF(id: string, sif: SIF): Promise<void> {
  const row: Record<string, unknown> = { id, ...sifToRow(sif) }
  const { error } = await supabase
    .from('prism_sifs')
    .insert(row)
  if (error && Object.prototype.hasOwnProperty.call(row, 'assumptions') && shouldRetryWithoutAssumptions(error)) {
    const { assumptions, ...fallbackRow } = row
    void assumptions
    const { error: retryError } = await supabase
      .from('prism_sifs')
      .insert(fallbackRow)
    if (retryError) throw new Error(`Création SIF: ${retryError.message}`)
    return
  }
  if (error) throw new Error(`Création SIF: ${error.message}`)
}

export async function dbUpdateSIF(sifId: string, data: Partial<SIF>): Promise<void> {
  const row: Record<string, unknown> = sifToRow(data)
  const { error } = await supabase
    .from('prism_sifs')
    .update(row)
    .eq('id', sifId)
  if (error && Object.prototype.hasOwnProperty.call(row, 'assumptions') && shouldRetryWithoutAssumptions(error)) {
    const { assumptions, ...fallbackRow } = row
    void assumptions
    const { error: retryError } = await supabase
      .from('prism_sifs')
      .update(fallbackRow)
      .eq('id', sifId)
    if (retryError) throw new Error(`Mise à jour SIF: ${retryError.message}`)
    return
  }
  if (error) throw new Error(`Mise à jour SIF: ${error.message}`)
}

export async function dbDeleteSIF(sifId: string): Promise<void> {
  const { error } = await supabase
    .from('prism_sifs')
    .delete()
    .eq('id', sifId)
  if (error) throw new Error(`Suppression SIF: ${error.message}`)
}

// ═══════════════════════════════════════════════════════════════
// PROOF TEST PROCEDURES
// ═══════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToProcedure(row: any) {
  return {
    id:                 row.id,
    sifId:              row.sif_id,
    projectId:          row.project_id,
    ref:                row.ref           ?? '',
    revision:           row.revision      ?? 'A',
    status:             row.status        ?? 'draft',
    periodicityMonths:  Number(row.periodicity_months ?? 12),
    categories:         row.categories    ?? [],
    steps:              row.steps         ?? [],
    responseChecks:     row.response_checks ?? [],
    madeBy:             row.made_by       ?? '',
    madeByDate:         row.made_by_date  ?? '',
    verifiedBy:         row.verified_by   ?? '',
    verifiedByDate:     row.verified_by_date ?? '',
    approvedBy:         row.approved_by   ?? '',
    approvedByDate:     row.approved_by_date ?? '',
    notes:              row.notes         ?? '',
    createdAt:          row.created_at,
    updatedAt:          row.updated_at,
  }
}

export async function dbFetchProcedure(sifId: string) {
  const { data, error } = await supabase
    .from('prism_proof_procedures')
    .select('*')
    .eq('sif_id', sifId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`Fetch procédure: ${error.message}`)
  return data ? rowToProcedure(data) : null
}

export async function dbUpsertProcedure(procedure: {
  id: string; sifId: string; projectId: string
  ref: string; revision: string; status: string; periodicityMonths: number
  categories: unknown[]; steps: unknown[]; responseChecks: unknown[]
  madeBy: string; madeByDate: string; verifiedBy: string; verifiedByDate: string
  approvedBy: string; approvedByDate: string; notes: string
}): Promise<void> {
  const { error } = await supabase
    .from('prism_proof_procedures')
    .upsert({
      id:                   procedure.id,
      sif_id:               procedure.sifId,
      project_id:           procedure.projectId,
      ref:                  procedure.ref,
      revision:             procedure.revision,
      status:               procedure.status,
      periodicity_months:   procedure.periodicityMonths,
      categories:           procedure.categories,
      steps:                procedure.steps,
      response_checks:      procedure.responseChecks,
      made_by:              procedure.madeBy,
      made_by_date:         procedure.madeByDate,
      verified_by:          procedure.verifiedBy,
      verified_by_date:     procedure.verifiedByDate,
      approved_by:          procedure.approvedBy,
      approved_by_date:     procedure.approvedByDate,
      notes:                procedure.notes,
    }, { onConflict: 'id' })
  if (error) throw new Error(`Upsert procédure: ${error.message}`)
}

export async function dbDeleteProcedure(procedureId: string): Promise<void> {
  const { error } = await supabase
    .from('prism_proof_procedures')
    .delete()
    .eq('id', procedureId)
  if (error) throw new Error(`Suppression procédure: ${error.message}`)
}

// ═══════════════════════════════════════════════════════════════
// PROOF TEST CAMPAIGNS
// ═══════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToCampaign(row: any) {
  return {
    id:           row.id,
    procedureId:  row.procedure_id,
    sifId:        row.sif_id,
    projectId:    row.project_id,
    date:         row.date          ?? '',
    team:         row.team          ?? '',
    verdict:      row.verdict       ?? null,
    notes:        row.notes         ?? '',
    conductedBy:  row.conducted_by  ?? '',
    witnessedBy:  row.witnessed_by  ?? '',
    stepResults:  row.step_results  ?? [],
    responseMeasurements: row.response_measurements ?? [],
    procedureSnapshot: typeof row.procedure_snapshot === 'object' && row.procedure_snapshot !== null
      ? row.procedure_snapshot
      : null,
    pdfArtifact: typeof row.pdf_artifact === 'object' && row.pdf_artifact !== null
      ? { ...createDefaultProofTestCampaignArtifact(), ...row.pdf_artifact, bucket: 'prism_prooftest' }
      : createDefaultProofTestCampaignArtifact(),
    closedAt:     row.closed_at     ?? null,
    createdAt:    row.created_at,
    updatedAt:    row.updated_at,
  }
}

export async function dbFetchCampaigns(procedureId: string) {
  const { data, error } = await supabase
    .from('prism_proof_campaigns')
    .select('*')
    .eq('procedure_id', procedureId)
    .order('date', { ascending: false })
  if (error) throw new Error(`Fetch campagnes: ${error.message}`)
  return (data ?? []).map(rowToCampaign)
}

export async function dbCreateCampaign(campaign: {
  id: string; procedureId: string; sifId: string; projectId: string
  date: string; team: string; verdict: string | null; notes: string
  conductedBy: string; witnessedBy: string; stepResults: unknown[]; responseMeasurements: unknown[]
  procedureSnapshot: unknown; pdfArtifact: unknown; closedAt: string | null
}): Promise<void> {
  const { error } = await supabase
    .from('prism_proof_campaigns')
    .insert({
      id:            campaign.id,
      procedure_id:  campaign.procedureId,
      sif_id:        campaign.sifId,
      project_id:    campaign.projectId,
      date:          campaign.date,
      team:          campaign.team,
      verdict:       campaign.verdict,
      notes:         campaign.notes,
      conducted_by:  campaign.conductedBy,
      witnessed_by:  campaign.witnessedBy,
      step_results:  campaign.stepResults,
      response_measurements: campaign.responseMeasurements,
      procedure_snapshot: campaign.procedureSnapshot,
      pdf_artifact: campaign.pdfArtifact,
      closed_at: campaign.closedAt,
    })
  if (error) throw new Error(`Création campagne: ${error.message}`)
}

export async function dbUpdateCampaign(campaignId: string, patch: {
  date?: string; verdict?: string | null; team?: string; notes?: string
  conductedBy?: string; witnessedBy?: string; stepResults?: unknown[]; responseMeasurements?: unknown[]
  procedureSnapshot?: unknown; pdfArtifact?: unknown; closedAt?: string | null
}): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row: Record<string, any> = {}
  if (patch.date         !== undefined) row.date          = patch.date
  if (patch.verdict      !== undefined) row.verdict       = patch.verdict
  if (patch.team         !== undefined) row.team          = patch.team
  if (patch.notes        !== undefined) row.notes         = patch.notes
  if (patch.conductedBy  !== undefined) row.conducted_by  = patch.conductedBy
  if (patch.witnessedBy  !== undefined) row.witnessed_by  = patch.witnessedBy
  if (patch.stepResults  !== undefined) row.step_results  = patch.stepResults
  if (patch.responseMeasurements !== undefined) row.response_measurements = patch.responseMeasurements
  if (patch.procedureSnapshot !== undefined) row.procedure_snapshot = patch.procedureSnapshot
  if (patch.pdfArtifact !== undefined) row.pdf_artifact = patch.pdfArtifact
  if (patch.closedAt !== undefined) row.closed_at = patch.closedAt
  const { error } = await supabase
    .from('prism_proof_campaigns')
    .update(row)
    .eq('id', campaignId)
  if (error) throw new Error(`Mise à jour campagne: ${error.message}`)
}

export async function dbDeleteCampaign(campaignId: string): Promise<void> {
  const { error } = await supabase
    .from('prism_proof_campaigns')
    .delete()
    .eq('id', campaignId)
  if (error) throw new Error(`Suppression campagne: ${error.message}`)
}
// ═══════════════════════════════════════════════════════════════
// SIF REVISIONS
// ═══════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToRevisionArtifact(row: any, bucket: string): SIFRevisionArtifact {
  return {
    ...createDefaultRevisionArtifact(bucket),
    ...(typeof row === 'object' && row !== null ? row : {}),
    bucket,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToRevision(row: any): SIFRevision {
  return {
    id:                row.id,
    sifId:             row.sif_id,
    projectId:         row.project_id,
    revisionLabel:     row.revision_label    ?? '',
    status:            (row.status           ?? 'draft') as SIFStatus,
    changeDescription: row.change_description ?? '',
    createdBy:         row.created_by        ?? '',
    createdAt:         row.created_at,
    snapshot:          hydrateSIF(row.snapshot ?? {}),
    reportArtifact:    rowToRevisionArtifact(row.report_artifact, 'prism_report'),
    proofTestArtifact: rowToRevisionArtifact(row.proof_test_artifact, 'prism_prooftest'),
    reportConfigSnapshot: typeof row.report_config_snapshot === 'object' && row.report_config_snapshot !== null
      ? row.report_config_snapshot
      : null,
  }
}

/**
 * Fetch all revisions for a SIF, sorted newest first.
 */
export async function dbFetchRevisions(sifId: string): Promise<SIFRevision[]> {
  const { data, error } = await supabase
    .from('prism_sif_revisions')
    .select('*')
    .eq('sif_id', sifId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Fetch révisions: ${error.message}`)
  return (data ?? []).map(rowToRevision)
}

/**
 * Insert a new frozen revision snapshot.
 * The snapshot field should be a complete copy of the SIF at that point.
 */
export async function dbCreateRevision(revision: {
  id: string
  sifId: string
  projectId: string
  revisionLabel: string
  status: SIFStatus
  changeDescription: string
  createdBy: string
  snapshot: SIF
  reportArtifact: SIFRevisionArtifact
  proofTestArtifact: SIFRevisionArtifact
  reportConfigSnapshot: Record<string, unknown> | null
}): Promise<void> {
  const { error } = await supabase
    .from('prism_sif_revisions')
    .insert({
      id:                 revision.id,
      sif_id:             revision.sifId,
      project_id:         revision.projectId,
      revision_label:     revision.revisionLabel,
      status:             revision.status,
      change_description: revision.changeDescription,
      created_by:         revision.createdBy,
      snapshot:           revision.snapshot,
      report_artifact:    revision.reportArtifact,
      proof_test_artifact: revision.proofTestArtifact,
      report_config_snapshot: revision.reportConfigSnapshot,
    })
  if (error) throw new Error(`Création révision: ${error.message}`)
}

/**
 * Delete a revision by id (admin use only — revisions are normally immutable).
 */
export async function dbDeleteRevision(revisionId: string): Promise<void> {
  const { error } = await supabase
    .from('prism_sif_revisions')
    .delete()
    .eq('id', revisionId)
  if (error) throw new Error(`Suppression révision: ${error.message}`)
}

// ═══════════════════════════════════════════════════════════════
// LOPA STUDIES & SCENARIOS
// ═══════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToLOPAStudy(row: any): LOPAWorksheet {
  return {
    id:          row.id,
    projectId:   row.project_id,
    name:        row.name        ?? 'Étude LOPA',
    description: row.description ?? '',
    scenarios:   [],  // filled by caller
    frozenAt:    row.frozen_at   ?? null,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToLOPAScenario(row: any): LOPAScenario {
  return {
    id:                     row.id,
    order:                  row.sort_order          ?? 0,
    scenarioId:             row.scenario_id         ?? '',
    sifRef:                 row.sif_ref             ?? undefined,
    hazopRef:               row.hazop_ref           ?? undefined,
    description:            row.description         ?? '',
    consequenceCategory:    row.consequence_category ?? 'safety_personnel',
    consequenceDescription: row.consequence_description ?? '',
    initiatingEvent:        row.initiating_event    ?? '',
    ief:                    Number(row.ief          ?? 0.1),
    iefSource:              row.ief_source          ?? '',
    ignitionProbability:    row.ignition_probability != null ? Number(row.ignition_probability) : null,
    occupancyFactor:        row.occupancy_factor    != null ? Number(row.occupancy_factor) : null,
    ipls:                   row.ipls                ?? [],
    tmel:                   Number(row.tmel         ?? 1e-5),
    riskMatrixCell:         row.risk_matrix_cell    ?? '',
  }
}

function lopaScenarioToRow(sc: LOPAScenario, studyId: string, projectId: string): Record<string, unknown> {
  return {
    id:                      sc.id,
    study_id:                studyId,
    project_id:              projectId,
    scenario_id:             sc.scenarioId,
    sort_order:              sc.order,
    sif_ref:                 sc.sifRef       ?? null,
    hazop_ref:               sc.hazopRef     ?? null,
    description:             sc.description,
    consequence_category:    sc.consequenceCategory,
    consequence_description: sc.consequenceDescription,
    initiating_event:        sc.initiatingEvent,
    ief:                     sc.ief,
    ief_source:              sc.iefSource,
    ignition_probability:    sc.ignitionProbability ?? null,
    occupancy_factor:        sc.occupancyFactor     ?? null,
    ipls:                    sc.ipls,
    tmel:                    sc.tmel,
    risk_matrix_cell:        sc.riskMatrixCell,
  }
}

// ── Studies ──────────────────────────────────────────────────────────────────

export async function dbCreateLOPAStudy(
  study: Pick<LOPAWorksheet, 'id' | 'projectId' | 'name' | 'description'>,
): Promise<void> {
  const { error } = await supabase.from('prism_lopa_studies').insert({
    id:          study.id,
    project_id:  study.projectId,
    name:        study.name,
    description: study.description ?? '',
  })
  if (error) throw new Error(`Création étude LOPA: ${error.message}`)
}

export async function dbUpdateLOPAStudy(
  studyId: string,
  data: Partial<Pick<LOPAWorksheet, 'name' | 'description' | 'frozenAt'>>,
): Promise<void> {
  const row: Record<string, unknown> = {}
  if (data.name        !== undefined) row.name        = data.name
  if (data.description !== undefined) row.description = data.description
  if (data.frozenAt    !== undefined) row.frozen_at   = data.frozenAt
  const { error } = await supabase.from('prism_lopa_studies').update(row).eq('id', studyId)
  if (error) throw new Error(`Mise à jour étude LOPA: ${error.message}`)
}

export async function dbDeleteLOPAStudy(studyId: string): Promise<void> {
  const { error } = await supabase.from('prism_lopa_studies').delete().eq('id', studyId)
  if (error) throw new Error(`Suppression étude LOPA: ${error.message}`)
}

// ── Scenarios ─────────────────────────────────────────────────────────────────

/** Upsert a single scenario (create or update). */
export async function dbUpsertLOPAScenario(
  sc: LOPAScenario,
  studyId: string,
  projectId: string,
): Promise<void> {
  const { error } = await supabase
    .from('prism_lopa_scenarios')
    .upsert(lopaScenarioToRow(sc, studyId, projectId), { onConflict: 'id' })
  if (error) throw new Error(`Upsert scénario LOPA: ${error.message}`)
}

export async function dbDeleteLOPAScenario(scenarioId: string): Promise<void> {
  const { error } = await supabase.from('prism_lopa_scenarios').delete().eq('id', scenarioId)
  if (error) throw new Error(`Suppression scénario LOPA: ${error.message}`)
}

/** Batch-update sort_order for reordering. */
export async function dbReorderLOPAScenarios(
  orderedIds: string[],
): Promise<void> {
  if (orderedIds.length === 0) return
  // One upsert per row with just id + sort_order
  const rows = orderedIds.map((id, i) => ({ id, sort_order: i }))
  const { error } = await supabase
    .from('prism_lopa_scenarios')
    .upsert(rows, { onConflict: 'id' })
  if (error) throw new Error(`Réordonnancement scénarios LOPA: ${error.message}`)
}
