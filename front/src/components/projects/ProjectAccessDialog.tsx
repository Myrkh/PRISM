import {
  useEffect,
  useMemo,
  useState,
  type ElementType,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react'
import {
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { PROJECT_PERMISSION_DEFINITIONS, type ProjectPermissionKey, type ProjectRole, type ProjectTeamMember } from '@/core/types'
import { BORDER, PANEL_BG, R, TEAL, TEAL_DIM, TEXT, TEXT_DIM, dark } from '@/styles/tokens'

type AccessTab = 'members' | 'matrix'

const PANEL = PANEL_BG
const BG = dark.page
const CARD = dark.card2
const SURFACE = dark.card
const BORDER2 = '#363F49'

const ACCESS_STATUS = {
  initialized: { color: '#16A34A', label: 'Initialisee' },
  pending: { color: '#F59E0B', label: 'A configurer' },
} as const

const TABS: { id: AccessTab; label: string; hint: string; Icon: ElementType }[] = [
  { id: 'members', label: 'Membres', hint: 'Equipe & roles', Icon: Users },
  { id: 'matrix', label: 'Matrice', hint: 'Permissions cochables', Icon: ShieldCheck },
]

function roleSort(a: ProjectRole, b: ProjectRole) {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
  return a.name.localeCompare(b.name)
}

function memberSort(a: ProjectTeamMember, b: ProjectTeamMember) {
  return (a.profile.fullName || a.profile.email).localeCompare(b.profile.fullName || b.profile.email)
}

function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
      {children}
      {required && <span className="ml-1" style={{ color: TEAL }}>*</span>}
    </label>
  )
}

type StyledInputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean
}

function StyledInput({ error, className = '', ...props }: StyledInputProps) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all disabled:opacity-50 ${className}`}
      style={{ background: BG, borderColor: error ? '#EF4444' : BORDER2, color: TEXT }}
      onFocus={event => { event.target.style.borderColor = TEAL }}
      onBlur={event => { event.target.style.borderColor = error ? '#EF4444' : BORDER2 }}
    />
  )
}

function StyledSelect({ className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all disabled:opacity-50 ${className}`}
      style={{ background: BG, borderColor: BORDER2, color: TEXT }}
      onFocus={event => { event.target.style.borderColor = TEAL }}
      onBlur={event => { event.target.style.borderColor = BORDER2 }}
    />
  )
}

export function ProjectAccessDialog() {
  const projectId = useAppStore(state => state.projectAccessProjectId)
  const closeDialog = useAppStore(state => state.closeProjectAccess)
  const fetchProjectAccess = useAppStore(state => state.fetchProjectAccess)
  const initializeProjectAccess = useAppStore(state => state.initializeProjectAccess)
  const createProjectRole = useAppStore(state => state.createProjectRole)
  const updateProjectRole = useAppStore(state => state.updateProjectRole)
  const deleteProjectRole = useAppStore(state => state.deleteProjectRole)
  const setProjectRolePermission = useAppStore(state => state.setProjectRolePermission)
  const addProjectMemberByEmail = useAppStore(state => state.addProjectMemberByEmail)
  const updateProjectMemberRole = useAppStore(state => state.updateProjectMemberRole)
  const updateProjectMemberStatus = useAppStore(state => state.updateProjectMemberStatus)
  const removeProjectMember = useAppStore(state => state.removeProjectMember)
  const projectAccessByProject = useAppStore(state => state.projectAccessByProject)
  const loading = useAppStore(state => state.projectAccessLoading)
  const error = useAppStore(state => state.projectAccessError)
  const setProjectAccessError = useAppStore(state => state.setProjectAccessError)
  const project = useAppStore(state => (
    projectId ? state.projects.find(entry => entry.id === projectId) ?? null : null
  ))

  const [activeTab, setActiveTab] = useState<AccessTab>('members')
  const [memberEmail, setMemberEmail] = useState('')
  const [newMemberRoleId, setNewMemberRoleId] = useState('')
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleDescription, setNewRoleDescription] = useState('')
  const [newRoleColor, setNewRoleColor] = useState('#0EA5E9')

  const snapshot = projectId ? projectAccessByProject[projectId] : undefined

  useEffect(() => {
    if (!projectId) return
    void fetchProjectAccess(projectId).catch(() => undefined)
  }, [fetchProjectAccess, projectId])

  useEffect(() => {
    if (!projectId) {
      setActiveTab('members')
      setMemberEmail('')
      setNewMemberRoleId('')
      setNewRoleName('')
      setNewRoleDescription('')
      setNewRoleColor('#0EA5E9')
      setProjectAccessError(null)
    }
  }, [projectId, setProjectAccessError])

  const roles = useMemo(
    () => (snapshot?.roles ?? []).slice().sort(roleSort),
    [snapshot?.roles],
  )

  const members = useMemo(
    () => (snapshot?.members ?? []).slice().sort(memberSort),
    [snapshot?.members],
  )

  useEffect(() => {
    if (!newMemberRoleId && roles.length > 0) {
      setNewMemberRoleId(roles[0].id)
    }
  }, [newMemberRoleId, roles])

  const canManageTeam = snapshot?.canManageTeam ?? false
  const initialized = snapshot?.initialized ?? false
  const activeIdx = TABS.findIndex(tab => tab.id === activeTab)
  const activeStatus = initialized ? ACCESS_STATUS.initialized : ACCESS_STATUS.pending

  const handleRefresh = async () => {
    if (!projectId) return
    setProjectAccessError(null)
    try {
      await fetchProjectAccess(projectId)
    } catch {
      // error already stored
    }
  }

  const handleInitialize = async () => {
    if (!projectId) return
    setProjectAccessError(null)
    try {
      await initializeProjectAccess(projectId)
    } catch {
      // error already stored
    }
  }

  const handleAddMember = async () => {
    if (!projectId || !memberEmail.trim() || !newMemberRoleId) return
    try {
      await addProjectMemberByEmail(projectId, memberEmail.trim(), newMemberRoleId)
      setMemberEmail('')
    } catch {
      // error already stored
    }
  }

  const handleAddRole = async () => {
    if (!projectId || !newRoleName.trim()) return
    const roleKey = newRoleName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')

    try {
      await createProjectRole(projectId, {
        roleKey: roleKey || `role_${Date.now()}`,
        name: newRoleName.trim(),
        description: newRoleDescription.trim(),
        color: newRoleColor,
        sortOrder: roles.length * 10 + 100,
      })

      setNewRoleName('')
      setNewRoleDescription('')
      setNewRoleColor('#0EA5E9')
    } catch {
      // error already stored
    }
  }

  if (!projectId) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={event => { if (event.target === event.currentTarget) closeDialog() }}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-[1180px] flex-col rounded-2xl border shadow-2xl"
        style={{
          background: PANEL,
          borderColor: BORDER,
          boxShadow: `0 0 0 1px ${BORDER}, 0 24px 60px rgba(0,0,0,0.6)`,
        }}
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 pb-4 pt-5 shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
              style={{ background: `${TEAL}20`, border: `1px solid ${TEAL}40` }}
            >
              <ShieldCheck size={18} style={{ color: TEAL }} />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: TEXT }}>
                Equipe & droits
              </h2>
              <p className="text-[11px]" style={{ color: TEXT_DIM }}>
                {project?.name ?? 'Projet'} · matrice persistante des roles et permissions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold"
              style={{
                background: `${activeStatus.color}18`,
                border: `1px solid ${activeStatus.color}40`,
                color: activeStatus.color,
              }}
            >
              <div className="h-1.5 w-1.5 rounded-full" style={{ background: activeStatus.color }} />
              {activeStatus.label}
            </div>
            <div
              className="rounded-full border px-2.5 py-1 text-[10px] font-bold"
              style={{ borderColor: `${TEAL}30`, background: `${TEAL}10`, color: TEAL_DIM }}
            >
              {members.length} membre{members.length > 1 ? 's' : ''}
            </div>
            <button
              type="button"
              onClick={() => void handleRefresh()}
              className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors"
              style={{ borderColor: BORDER2, color: TEXT_DIM }}
              onMouseEnter={event => {
                event.currentTarget.style.borderColor = TEAL
                event.currentTarget.style.color = TEXT
              }}
              onMouseLeave={event => {
                event.currentTarget.style.borderColor = BORDER2
                event.currentTarget.style.color = TEXT_DIM
              }}
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              Refresh
            </button>
            <button
              type="button"
              onClick={closeDialog}
              className="rounded-lg p-1.5 transition-colors"
              style={{ color: TEXT_DIM }}
              onMouseEnter={event => { event.currentTarget.style.color = '#EF4444' }}
              onMouseLeave={event => { event.currentTarget.style.color = TEXT_DIM }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="px-6 pt-4 shrink-0">
          <div className="flex items-end" style={{ borderBottom: `1px solid ${BORDER}` }}>
            {TABS.map(tab => {
              const isActive = tab.id === activeTab
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className="flex shrink-0 items-center gap-2 px-4 py-2.5 text-left transition-all"
                  style={isActive
                    ? {
                        background: CARD,
                        color: TEAL_DIM,
                        borderTop: `1px solid ${BORDER}`,
                        borderLeft: `1px solid ${BORDER}`,
                        borderRight: `1px solid ${BORDER}`,
                        borderBottom: `1px solid ${CARD}`,
                        borderRadius: `${R}px ${R}px 0 0`,
                        marginBottom: '-1px',
                        zIndex: 10,
                      }
                    : { color: TEXT_DIM }}
                  onMouseEnter={event => { if (!isActive) event.currentTarget.style.color = TEXT }}
                  onMouseLeave={event => { if (!isActive) event.currentTarget.style.color = TEXT_DIM }}
                >
                  <tab.Icon size={13} />
                  <div>
                    <p className="text-[12px] font-semibold leading-tight">{tab.label}</p>
                    <p className="text-[9px] leading-tight opacity-60">{tab.hint}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div
          className="mx-6 flex-1 overflow-y-auto"
          style={{
            background: CARD,
            borderLeft: `1px solid ${BORDER}`,
            borderRight: `1px solid ${BORDER}`,
            borderRadius: `${activeIdx === 0 ? 0 : R}px ${activeIdx === TABS.length - 1 ? 0 : R}px ${R}px ${R}px`,
          }}
        >
          <div className="space-y-5 p-6" style={{ display: activeTab === 'members' ? 'block' : 'none' }}>
            {!initialized && (
              <div className="rounded-xl border p-5" style={{ background: BG, borderColor: `${TEAL}35` }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEAL_DIM }}>
                      Initialisation
                    </p>
                    <p className="mt-2 text-sm font-semibold" style={{ color: TEXT }}>
                      Projet sans matrice initialisee
                    </p>
                    <p className="mt-1 max-w-2xl text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
                      Cree les roles par defaut, attribue le premier Owner et active la gestion persistante
                      des membres et permissions dans Supabase.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleInitialize()}
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50"
                    style={{ background: TEAL, color: '#041014' }}
                    disabled={loading}
                  >
                    {loading ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                    Initialiser la matrice
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl border px-4 py-3 text-xs" style={{ borderColor: '#7F1D1D55', background: '#7F1D1D20', color: '#FCA5A5' }}>
                {error}
              </div>
            )}

            {initialized && !canManageTeam && (
              <div className="rounded-xl border px-4 py-3 text-xs" style={{ background: BG, borderColor: `${TEAL}22`, color: TEXT_DIM }}>
                Votre role actuel permet la consultation de la matrice, mais pas la modification des membres ni des droits.
              </div>
            )}

            {initialized && (
              <>
                <div className="rounded-xl border p-4" style={{ background: BG, borderColor: BORDER }}>
                  <div className="mb-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
                      Ajouter un membre
                    </p>
                    <p className="mt-2 text-sm font-semibold" style={{ color: TEXT }}>
                      Rattacher un profil existant au projet
                    </p>
                    <p className="mt-1 text-xs" style={{ color: TEXT_DIM }}>
                      Le profil doit deja exister dans `profiles` via une premiere connexion.
                    </p>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr_auto]">
                    <div>
                      <FieldLabel required>Email</FieldLabel>
                      <StyledInput
                        value={memberEmail}
                        onChange={event => setMemberEmail(event.target.value)}
                        placeholder="email@entreprise.com"
                        disabled={!canManageTeam}
                      />
                    </div>
                    <div>
                      <FieldLabel required>Role</FieldLabel>
                      <StyledSelect
                        value={newMemberRoleId}
                        onChange={event => setNewMemberRoleId(event.target.value)}
                        disabled={!canManageTeam || roles.length === 0}
                      >
                        {roles.map(role => (
                          <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                      </StyledSelect>
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => void handleAddMember()}
                        disabled={!canManageTeam || !memberEmail.trim() || !newMemberRoleId}
                        className="inline-flex h-[42px] items-center gap-2 rounded-lg px-4 text-sm font-semibold disabled:opacity-50"
                        style={{ background: TEAL, color: '#041014' }}
                      >
                        <Plus size={13} />
                        Ajouter
                      </button>
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border" style={{ background: BG, borderColor: BORDER }}>
                  <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
                        Equipe projet
                      </p>
                      <p className="mt-1 text-sm font-semibold" style={{ color: TEXT }}>
                        Membres, role actif et statut de participation
                      </p>
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
                      {members.length} ligne{members.length > 1 ? 's' : ''}
                    </div>
                  </div>

                  <div className="overflow-auto">
                    <table className="min-w-full text-sm">
                      <thead style={{ background: SURFACE }}>
                        <tr>
                          {['Membre', 'Email', 'Role', 'Statut', 'Actions'].map(label => (
                            <th
                              key={label}
                              className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest"
                              style={{ color: TEXT_DIM }}
                            >
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {members.map(member => {
                          const isSelf = member.profileId === snapshot?.currentProfileId
                          return (
                            <tr key={member.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                              <td className="px-4 py-3" style={{ color: TEXT }}>
                                {member.profile.fullName || 'Sans nom'}
                              </td>
                              <td className="px-4 py-3" style={{ color: TEXT_DIM }}>
                                {member.profile.email}
                              </td>
                              <td className="px-4 py-3">
                                <StyledSelect
                                  value={member.roleId}
                                  onChange={event => {
                                    void updateProjectMemberRole(projectId, member.id, event.target.value).catch(() => undefined)
                                  }}
                                  disabled={!canManageTeam}
                                  className="max-w-[200px]"
                                >
                                  {roles.map(role => (
                                    <option key={role.id} value={role.id}>{role.name}</option>
                                  ))}
                                </StyledSelect>
                              </td>
                              <td className="px-4 py-3">
                                <StyledSelect
                                  value={member.status}
                                  onChange={event => {
                                    void updateProjectMemberStatus(
                                      projectId,
                                      member.id,
                                      event.target.value as ProjectTeamMember['status'],
                                    ).catch(() => undefined)
                                  }}
                                  disabled={!canManageTeam}
                                  className="max-w-[160px]"
                                >
                                  <option value="active">Active</option>
                                  <option value="disabled">Disabled</option>
                                </StyledSelect>
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    void removeProjectMember(projectId, member.id).catch(() => undefined)
                                  }}
                                  disabled={!canManageTeam || isSelf}
                                  className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50"
                                  style={{ borderColor: '#7F1D1D55', background: '#7F1D1D20', color: '#FCA5A5' }}
                                >
                                  <Trash2 size={11} />
                                  Retirer
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                        {members.length === 0 && (
                          <tr style={{ borderTop: `1px solid ${BORDER}` }}>
                            <td colSpan={5} className="px-4 py-10 text-center text-sm" style={{ color: TEXT_DIM }}>
                              Aucun membre pour ce projet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="space-y-5 p-6" style={{ display: activeTab === 'matrix' ? 'block' : 'none' }}>
            {!initialized && (
              <div className="rounded-xl border p-5" style={{ background: BG, borderColor: `${TEAL}35` }}>
                <p className="text-sm font-semibold" style={{ color: TEXT }}>
                  La matrice doit etre initialisee avant de pouvoir cocher des permissions.
                </p>
                <button
                  type="button"
                  onClick={() => void handleInitialize()}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50"
                  style={{ background: TEAL, color: '#041014' }}
                  disabled={loading}
                >
                  {loading ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                  Initialiser maintenant
                </button>
              </div>
            )}

            {error && (
              <div className="rounded-xl border px-4 py-3 text-xs" style={{ borderColor: '#7F1D1D55', background: '#7F1D1D20', color: '#FCA5A5' }}>
                {error}
              </div>
            )}

            {initialized && (
              <>
                <div className="grid gap-5 xl:grid-cols-[1.1fr_1.3fr]">
                  <div className="rounded-xl border p-4" style={{ background: BG, borderColor: BORDER }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
                      Nouveau role
                    </p>
                    <p className="mt-2 text-sm font-semibold" style={{ color: TEXT }}>
                      Ajouter un role personnalisable
                    </p>
                    <p className="mt-1 text-xs" style={{ color: TEXT_DIM }}>
                      Le role apparaitra immediatement dans la matrice avec ses cases a cocher.
                    </p>

                    <div className="mt-4 space-y-4">
                      <div>
                        <FieldLabel required>Nom du role</FieldLabel>
                        <StyledInput
                          value={newRoleName}
                          onChange={event => setNewRoleName(event.target.value)}
                          placeholder="Reliability Engineer"
                          disabled={!canManageTeam}
                        />
                      </div>
                      <div>
                        <FieldLabel>Description</FieldLabel>
                        <StyledInput
                          value={newRoleDescription}
                          onChange={event => setNewRoleDescription(event.target.value)}
                          placeholder="Responsable des calculs et analyses"
                          disabled={!canManageTeam}
                        />
                      </div>
                      <div className="grid grid-cols-[120px_1fr] gap-3">
                        <div>
                          <FieldLabel>Couleur</FieldLabel>
                          <input
                            type="color"
                            value={newRoleColor}
                            onChange={event => setNewRoleColor(event.target.value)}
                            disabled={!canManageTeam}
                            className="h-[42px] w-full rounded-lg border p-1 disabled:opacity-50"
                            style={{ borderColor: BORDER2, background: BG }}
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => void handleAddRole()}
                            disabled={!canManageTeam || !newRoleName.trim()}
                            className="inline-flex h-[42px] items-center gap-2 rounded-lg px-4 text-sm font-semibold disabled:opacity-50"
                            style={{ background: TEAL, color: '#041014' }}
                          >
                            <Plus size={13} />
                            Ajouter le role
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border p-4" style={{ background: BG, borderColor: BORDER }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
                      Regles
                    </p>
                    <p className="mt-2 text-sm font-semibold" style={{ color: TEXT }}>
                      Matrice de responsabilite persistante
                    </p>
                    <div className="mt-3 space-y-2 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
                      <p>Chaque case cochee cree ou supprime une permission persistante dans Supabase.</p>
                      <p>Le role `Owner` reste protege et conserve tous les droits critiques.</p>
                      <p>Les roles systeme sont modifiables dans leurs permissions, sauf suppression.</p>
                    </div>
                  </div>
                </div>

                <div className="overflow-auto rounded-xl border" style={{ background: BG, borderColor: BORDER }}>
                  <table className="min-w-full border-separate border-spacing-0 text-sm">
                    <thead>
                      <tr>
                        <th
                          className="sticky left-0 top-0 z-30 min-w-[280px] px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest"
                          style={{ background: SURFACE, color: TEXT_DIM }}
                        >
                          Role
                        </th>
                        {PROJECT_PERMISSION_DEFINITIONS.map(permission => (
                          <th
                            key={permission.key}
                            className="sticky top-0 min-w-[110px] px-2 py-3 text-center text-[10px] font-bold uppercase tracking-widest"
                            style={{ background: SURFACE, color: TEXT_DIM }}
                          >
                            <div>{permission.shortLabel}</div>
                            <div className="mt-1 text-[9px] font-medium normal-case" style={{ color: '#6D7E90' }}>
                              {permission.group}
                            </div>
                          </th>
                        ))}
                        <th
                          className="sticky top-0 px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest"
                          style={{ background: SURFACE, color: TEXT_DIM }}
                        >
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {roles.map(role => {
                        const locked = role.roleKey === 'owner'
                        return (
                          <tr key={role.id}>
                            <td
                              className="sticky left-0 z-20 min-w-[280px] border-t px-4 py-4 align-top"
                              style={{ background: BG, borderColor: BORDER }}
                            >
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <span className="h-3 w-3 rounded-full" style={{ background: role.color }} />
                                  <StyledInput
                                    defaultValue={role.name}
                                    onBlur={event => {
                                      const next = event.target.value.trim()
                                      if (next && next !== role.name) {
                                        void updateProjectRole(projectId, role.id, { name: next }).catch(() => undefined)
                                      }
                                    }}
                                    disabled={!canManageTeam || role.isSystem}
                                  />
                                </div>

                                <StyledInput
                                  defaultValue={role.description}
                                  onBlur={event => {
                                    const next = event.target.value
                                    if (next !== role.description) {
                                      void updateProjectRole(projectId, role.id, { description: next }).catch(() => undefined)
                                    }
                                  }}
                                  disabled={!canManageTeam || role.isSystem}
                                  className="text-xs"
                                />

                                <div className="flex items-center gap-2">
                                  <input
                                    type="color"
                                    defaultValue={role.color}
                                    onBlur={event => {
                                      const next = event.target.value
                                      if (next !== role.color) {
                                        void updateProjectRole(projectId, role.id, { color: next }).catch(() => undefined)
                                      }
                                    }}
                                    disabled={!canManageTeam || role.isSystem}
                                    className="h-9 w-12 rounded-lg border p-1 disabled:opacity-50"
                                    style={{ borderColor: BORDER2, background: BG }}
                                  />
                                  <span
                                    className="rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-widest"
                                    style={{
                                      borderColor: role.isSystem ? `${TEAL}30` : `${role.color}50`,
                                      background: role.isSystem ? `${TEAL}10` : `${role.color}14`,
                                      color: role.isSystem ? TEAL_DIM : role.color,
                                    }}
                                  >
                                    {role.isSystem ? 'Systeme' : 'Custom'}
                                  </span>
                                  {locked && (
                                    <span className="text-[10px] font-semibold" style={{ color: TEXT_DIM }}>
                                      Full access verrouille
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {PROJECT_PERMISSION_DEFINITIONS.map(permission => {
                              const checked = role.permissions.includes(permission.key as ProjectPermissionKey)
                              return (
                                <td
                                  key={permission.key}
                                  className="border-t px-2 py-4 text-center"
                                  style={{ background: BG, borderColor: BORDER }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={!canManageTeam || locked}
                                    onChange={event => {
                                      void setProjectRolePermission(
                                        projectId,
                                        role.id,
                                        permission.key as ProjectPermissionKey,
                                        event.target.checked,
                                      ).catch(() => undefined)
                                    }}
                                    className="h-4 w-4 accent-[#009BA4] disabled:opacity-50"
                                  />
                                </td>
                              )
                            })}

                            <td className="border-t px-4 py-4 text-center" style={{ background: BG, borderColor: BORDER }}>
                              <button
                                type="button"
                                onClick={() => {
                                  void deleteProjectRole(projectId, role.id).catch(() => undefined)
                                }}
                                disabled={!canManageTeam || role.isSystem}
                                className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50"
                                style={{ borderColor: '#7F1D1D55', background: '#7F1D1D20', color: '#FCA5A5' }}
                              >
                                <Trash2 size={11} />
                                Supprimer
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 px-6 py-4 shrink-0" style={{ borderTop: `1px solid ${BORDER}` }}>
          <p className="text-[11px]" style={{ color: TEXT_DIM }}>
            Les roles, memberships et permissions de cette matrice sont persistes dans Supabase.
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleRefresh()}
              className="rounded-lg border px-3 py-2 text-sm font-semibold"
              style={{ borderColor: BORDER2, background: BG, color: TEXT }}
            >
              Actualiser
            </button>
            <button
              type="button"
              onClick={closeDialog}
              className="rounded-lg border px-3 py-2 text-sm font-semibold"
              style={{ borderColor: BORDER2, background: BG, color: TEXT }}
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
