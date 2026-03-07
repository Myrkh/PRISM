/**
 * src/lib/db.ts
 *
 * Couche d'accès aux données Supabase.
 * — Mapping DB (snake_case) ↔ App (camelCase)
 * — Toutes les fonctions sont async et remontent les erreurs
 * — Les mutations architecture sont groupées (subsystems JSONB)
 */
import { supabase } from './supabase'
import type { Project, SIF, SIFRevision, SIFStatus } from '@/core/types'

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
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToSIF(row: any): SIF {
  return {
    id:                   row.id,
    projectId:            row.project_id,
    sifNumber:            row.sif_number        ?? '',
    revision:             row.revision          ?? 'A',
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
    proofTestProcedure:   row.proof_test_procedure ?? undefined,
    testCampaigns:        row.test_campaigns    ?? [],
    operationalEvents:    row.operational_events ?? [],
    hazopTrace:           row.hazop_trace       ?? undefined,
  }
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
  if (data.status      !== undefined) row.status      = data.status
  return row
}

function sifToRow(data: Partial<SIF>) {
  const row: Record<string, unknown> = {}
  if (data.projectId       !== undefined) row.project_id          = data.projectId
  if (data.sifNumber       !== undefined) row.sif_number          = data.sifNumber
  if (data.revision        !== undefined) row.revision            = data.revision
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
  if (data.proofTestProcedure !== undefined) row.proof_test_procedure = data.proofTestProcedure
  if (data.testCampaigns   !== undefined) row.test_campaigns      = data.testCampaigns
  if (data.operationalEvents !== undefined) row.operational_events = data.operationalEvents
  if (data.hazopTrace      !== undefined) row.hazop_trace         = data.hazopTrace
  return row
}

// ═══════════════════════════════════════════════════════════════
// PROJECTS
// ═══════════════════════════════════════════════════════════════

/**
 * Charge tous les projets + leurs SIFs en 2 requêtes parallèles.
 */
export async function fetchAllProjects(): Promise<Project[]> {
  const [{ data: projRows, error: projErr }, { data: sifRows, error: sifErr }] =
    await Promise.all([
      supabase.from('prism_projects').select('*').order('created_at'),
      supabase.from('prism_sifs').select('*').order('created_at'),
    ])

  if (projErr) throw new Error(`prism_projects: ${projErr.message}`)
  if (sifErr)  throw new Error(`prism_sifs: ${sifErr.message}`)

  const sifsByProject = (sifRows ?? []).reduce<Record<string, SIF[]>>((acc, row) => {
    const pid = row.project_id as string
    ;(acc[pid] ??= []).push(rowToSIF(row))
    return acc
  }, {})

  return (projRows ?? []).map(row => ({
    ...rowToProject(row),
    sifs: sifsByProject[row.id as string] ?? [],
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
  const { error } = await supabase
    .from('prism_sifs')
    .insert({ id, ...sifToRow(sif) })
  if (error) throw new Error(`Création SIF: ${error.message}`)
}

export async function dbUpdateSIF(sifId: string, data: Partial<SIF>): Promise<void> {
  const { error } = await supabase
    .from('prism_sifs')
    .update(sifToRow(data))
    .eq('id', sifId)
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
    .maybeSingle()
  if (error) throw new Error(`Fetch procédure: ${error.message}`)
  return data ? rowToProcedure(data) : null
}

export async function dbUpsertProcedure(procedure: {
  id: string; sifId: string; projectId: string
  ref: string; revision: string; status: string; periodicityMonths: number
  categories: unknown[]; steps: unknown[]
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
  conductedBy: string; witnessedBy: string; stepResults: unknown[]
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
    })
  if (error) throw new Error(`Création campagne: ${error.message}`)
}

export async function dbUpdateCampaign(campaignId: string, patch: {
  verdict?: string | null; team?: string; notes?: string
  conductedBy?: string; witnessedBy?: string; stepResults?: unknown[]
}): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row: Record<string, any> = {}
  if (patch.verdict      !== undefined) row.verdict       = patch.verdict
  if (patch.team         !== undefined) row.team          = patch.team
  if (patch.notes        !== undefined) row.notes         = patch.notes
  if (patch.conductedBy  !== undefined) row.conducted_by  = patch.conductedBy
  if (patch.witnessedBy  !== undefined) row.witnessed_by  = patch.witnessedBy
  if (patch.stepResults  !== undefined) row.step_results  = patch.stepResults
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
    snapshot:          row.snapshot          ?? {},
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