export const PROJECT_PERMISSION_DEFINITIONS = [
  { key: 'project.view', label: 'Read', shortLabel: 'Read', group: 'Project' },
  { key: 'project.edit', label: 'Edit project', shortLabel: 'Edit', group: 'Project' },
  { key: 'project.delete', label: 'Delete project', shortLabel: 'Delete', group: 'Project' },
  { key: 'sif.create', label: 'Create SIF', shortLabel: 'Create SIF', group: 'SIF' },
  { key: 'sif.edit', label: 'Edit SIF', shortLabel: 'Edit SIF', group: 'SIF' },
  { key: 'sif.delete', label: 'Delete SIF', shortLabel: 'Delete SIF', group: 'SIF' },
  { key: 'library.project.manage', label: 'Manage project library', shortLabel: 'Library', group: 'Library' },
  { key: 'prooftest.manage', label: 'Manage proof tests', shortLabel: 'Proof Test', group: 'Evidence' },
  { key: 'revision.publish', label: 'Publish revisions', shortLabel: 'Publish', group: 'Evidence' },
  { key: 'report.export', label: 'Export reports', shortLabel: 'Export', group: 'Evidence' },
  { key: 'team.manage', label: 'Manage team & rights', shortLabel: 'Team', group: 'Team' },
] as const

export type ProjectPermissionKey = typeof PROJECT_PERMISSION_DEFINITIONS[number]['key']
export type ProjectMemberStatus = 'active' | 'disabled'

export interface ProjectRole {
  id: string
  projectId: string
  roleKey: string
  name: string
  description: string
  color: string
  isSystem: boolean
  sortOrder: number
  permissions: ProjectPermissionKey[]
  createdAt: string
  updatedAt: string
}

export interface ProjectMemberProfile {
  id: string
  email: string
  fullName: string
  avatarUrl: string | null
}

export interface ProjectTeamMember {
  id: string
  projectId: string
  profileId: string
  roleId: string
  status: ProjectMemberStatus
  invitedBy: string | null
  createdAt: string
  updatedAt: string
  profile: ProjectMemberProfile
}

export interface ProjectAccessSnapshot {
  projectId: string
  roles: ProjectRole[]
  members: ProjectTeamMember[]
  currentProfileId: string | null
  canManageTeam: boolean
  initialized: boolean
}
