import type {
  ProjectAccessSnapshot,
  ProjectMemberStatus,
  ProjectPermissionKey,
  ProjectRole,
  ProjectTeamMember,
} from '@/core/types'
import { supabase } from './supabase'

type JsonRecord = Record<string, unknown>

function asRecord(value: unknown): JsonRecord | null {
  return typeof value === 'object' && value !== null ? value as JsonRecord : null
}

function normalizePermissions(value: unknown): ProjectPermissionKey[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is ProjectPermissionKey => typeof entry === 'string')
}

function rowToRole(value: unknown): ProjectRole {
  const row = asRecord(value) ?? {}
  return {
    id: String(row.id ?? ''),
    projectId: String(row.projectId ?? row.project_id ?? ''),
    roleKey: String(row.roleKey ?? row.role_key ?? ''),
    name: String(row.name ?? ''),
    description: String(row.description ?? ''),
    color: String(row.color ?? '#009BA4'),
    isSystem: Boolean(row.isSystem ?? row.is_system),
    sortOrder: Number(row.sortOrder ?? row.sort_order ?? 0),
    permissions: normalizePermissions(row.permissions),
    createdAt: String(row.createdAt ?? row.created_at ?? ''),
    updatedAt: String(row.updatedAt ?? row.updated_at ?? ''),
  }
}

function rowToMember(value: unknown): ProjectTeamMember {
  const row = asRecord(value) ?? {}
  const profile = asRecord(row.profile) ?? {}

  return {
    id: String(row.id ?? ''),
    projectId: String(row.projectId ?? row.project_id ?? ''),
    profileId: String(row.profileId ?? row.profile_id ?? ''),
    roleId: String(row.roleId ?? row.role_id ?? ''),
    status: row.status === 'disabled' ? 'disabled' : 'active',
    invitedBy: typeof row.invitedBy === 'string' ? row.invitedBy : typeof row.invited_by === 'string' ? row.invited_by : null,
    createdAt: String(row.createdAt ?? row.created_at ?? ''),
    updatedAt: String(row.updatedAt ?? row.updated_at ?? ''),
    profile: {
      id: String(profile.id ?? row.profile_id ?? ''),
      email: String(profile.email ?? ''),
      fullName: String(profile.fullName ?? profile.full_name ?? profile.email ?? ''),
      avatarUrl: typeof profile.avatarUrl === 'string' ? profile.avatarUrl : typeof profile.avatar_url === 'string' ? profile.avatar_url : null,
    },
  }
}

export async function dbFetchProjectAccess(projectId: string): Promise<ProjectAccessSnapshot> {
  const { data, error } = await supabase.rpc('prism_get_project_access', {
    target_project_id: projectId,
  })

  if (error) throw new Error(`Project access: ${error.message}`)

  const payload = asRecord(data) ?? {}
  return {
    projectId: String(payload.projectId ?? projectId),
    roles: Array.isArray(payload.roles) ? payload.roles.map(rowToRole) : [],
    members: Array.isArray(payload.members) ? payload.members.map(rowToMember) : [],
    currentProfileId: typeof payload.currentProfileId === 'string' ? payload.currentProfileId : null,
    canManageTeam: Boolean(payload.canManageTeam),
    initialized: Boolean(payload.initialized),
  }
}

export async function dbInitializeProjectAccess(projectId: string): Promise<void> {
  const { error } = await supabase.rpc('prism_initialize_project_access', {
    target_project_id: projectId,
  })

  if (error) throw new Error(`Initialize project access: ${error.message}`)
}

export async function dbCreateProjectRole(input: {
  projectId: string
  roleKey: string
  name: string
  description: string
  color: string
  sortOrder: number
}): Promise<void> {
  const { error } = await supabase
    .from('prism_project_roles')
    .insert({
      project_id: input.projectId,
      role_key: input.roleKey,
      name: input.name,
      description: input.description,
      color: input.color,
      sort_order: input.sortOrder,
      is_system: false,
    })

  if (error) throw new Error(`Create project role: ${error.message}`)
}

export async function dbUpdateProjectRole(roleId: string, patch: {
  name?: string
  description?: string
  color?: string
  sortOrder?: number
}): Promise<void> {
  const row: Record<string, unknown> = {}
  if (patch.name !== undefined) row.name = patch.name
  if (patch.description !== undefined) row.description = patch.description
  if (patch.color !== undefined) row.color = patch.color
  if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder

  const { error } = await supabase
    .from('prism_project_roles')
    .update(row)
    .eq('id', roleId)

  if (error) throw new Error(`Update project role: ${error.message}`)
}

export async function dbDeleteProjectRole(roleId: string): Promise<void> {
  const { error } = await supabase
    .from('prism_project_roles')
    .delete()
    .eq('id', roleId)

  if (error) throw new Error(`Delete project role: ${error.message}`)
}

export async function dbSetProjectRolePermission(
  roleId: string,
  permission: ProjectPermissionKey,
  enabled: boolean,
): Promise<void> {
  if (enabled) {
    const { error } = await supabase
      .from('prism_project_role_permissions')
      .upsert({ role_id: roleId, permission }, { onConflict: 'role_id,permission' })
    if (error) throw new Error(`Update role permission: ${error.message}`)
    return
  }

  const { error } = await supabase
    .from('prism_project_role_permissions')
    .delete()
    .eq('role_id', roleId)
    .eq('permission', permission)

  if (error) throw new Error(`Update role permission: ${error.message}`)
}

export async function dbAddProjectMemberByEmail(projectId: string, email: string, roleId: string): Promise<void> {
  const { error } = await supabase.rpc('prism_add_project_member_by_email', {
    target_project_id: projectId,
    member_email: email,
    target_role_id: roleId,
  })

  if (error) throw new Error(`Add project member: ${error.message}`)
}

export async function dbUpdateProjectMemberRole(memberId: string, roleId: string): Promise<void> {
  const { error } = await supabase
    .from('prism_project_memberships')
    .update({ role_id: roleId })
    .eq('id', memberId)

  if (error) throw new Error(`Update project member role: ${error.message}`)
}

export async function dbUpdateProjectMemberStatus(memberId: string, status: ProjectMemberStatus): Promise<void> {
  const { error } = await supabase
    .from('prism_project_memberships')
    .update({ status })
    .eq('id', memberId)

  if (error) throw new Error(`Update project member status: ${error.message}`)
}

export async function dbRemoveProjectMember(memberId: string): Promise<void> {
  const { error } = await supabase
    .from('prism_project_memberships')
    .delete()
    .eq('id', memberId)

  if (error) throw new Error(`Remove project member: ${error.message}`)
}
