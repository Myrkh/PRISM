/**
 * layout/HomeScreen.tsx — PRISM
 *
 * Page d'accueil : liste projets + SIFs avec métriques PFD/SIL.
 * Actions par projet : Modifier | Clôturer | Archiver | Supprimer
 * Actions par SIF    : Modifier | Archiver | Supprimer
 */
import { useState, useRef } from 'react'
import {
  FolderPlus, FilePlus, Folder,
  CheckCircle2,
  Pencil, Trash2, Archive, CheckCheck, MoreHorizontal, Plus, ChevronRight, X,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { calcSIF, formatPFD } from '@/core/math/pfdCalc'
import { SILBadge } from '@/components/shared/SILBadge'
import { BORDER, CARD_BG, PAGE_BG, PANEL_BG, TEAL, TEXT, TEXT_DIM } from '@/styles/tokens'
import { statusColors, statusLabels } from '@/styles/tokens'
import { ConfirmDialog, useConfirmDialog } from '@/shared/ConfirmDialog'
import type { SIFStatus } from '@/core/types'

export function HomeScreen() {
  const navigate        = useAppStore(s => s.navigate)
  const openNewProject  = useAppStore(s => s.openNewProject)
  const openEditProject = useAppStore(s => s.openEditProject)
  const openNewSIF      = useAppStore(s => s.openNewSIF)
  const openEditSIF     = useAppStore(s => s.openEditSIF)
  const deleteProject   = useAppStore(s => s.deleteProject)
  const deleteSIF       = useAppStore(s => s.deleteSIF)
  const updateProject   = useAppStore(s => s.updateProject)
  const updateSIF       = useAppStore(s => s.updateSIF)
  const projects        = useAppStore(s => s.projects)

  // Menu contextuel
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const closeMenu = () => setOpenMenu(null)

  // Confirm dialog
  const confirm = useConfirmDialog()

  const totalSIFs = projects.reduce((a, p) => a + p.sifs.length, 0)
  const totalOk   = projects.reduce((acc, project) => (
    acc + project.sifs.filter(sif => calcSIF(sif, { projectStandard: project.standard }).meetsTarget).length
  ), 0)

  // ─── Menu button helper ────────────────────────────────────────────────
  const MenuBtn = ({ icon: Icon, label, color, hoverColor, onClick }: {
    icon: React.ElementType; label: string; color?: string; hoverColor?: string; onClick: () => void
  }) => (
    <button className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs text-left transition-colors"
      style={{ color: color ?? TEXT_DIM }}
      onMouseEnter={e => { e.currentTarget.style.background = hoverColor ? `${hoverColor}15` : '#1E242B'; e.currentTarget.style.color = hoverColor ?? TEXT }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = color ?? TEXT_DIM }}
      onClick={onClick}>
      <Icon size={13} style={hoverColor ? { color: hoverColor } : undefined} /> {label}
    </button>
  )

  return (
    <div className="flex-1 overflow-y-auto p-8" style={{ background: PAGE_BG }} onClick={closeMenu}>

      <ConfirmDialog
        open={confirm.state.open} title={confirm.state.title} message={confirm.state.message}
        confirmLabel={confirm.state.confirmLabel} danger={confirm.state.danger}
        loading={confirm.loading}
        onConfirm={confirm.execute}
        onCancel={confirm.cancel}
      />

      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight mb-1" style={{ color: TEXT }}>
            Tableau de bord
          </h1>
          <p className="text-sm" style={{ color: TEXT_DIM }}>
            {projects.length} projet{projects.length > 1 ? 's' : ''} · {totalSIFs} SIF · {totalOk}/{totalSIFs} conformes
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={openNewProject}
            className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all"
            style={{ borderColor: BORDER, color: TEXT_DIM, background: PANEL_BG }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = TEAL; e.currentTarget.style.color = TEXT }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT_DIM }}>
            <FolderPlus size={15} /> Nouveau projet
          </button>
          <button onClick={() => openNewSIF()}
            disabled={projects.filter(p => p.status === 'active').length === 0}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all disabled:opacity-40"
            style={{
              background: `linear-gradient(135deg, ${TEAL}, #007A82)`,
              color: '#fff', boxShadow: `0 4px 14px ${TEAL}40`,
            }}>
            <FilePlus size={15} /> Nouvelle SIF
          </button>
        </div>
      </div>

      {/* Empty state */}
      {projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-5">
          <div className="w-20 h-20 rounded-3xl border-2 border-dashed flex items-center justify-center"
            style={{ borderColor: `${TEAL}30` }}>
            <FolderPlus size={32} style={{ color: `${TEAL}50` }} />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold mb-1" style={{ color: TEXT }}>Aucun projet</p>
            <p className="text-sm" style={{ color: TEXT_DIM }}>Créez votre premier projet pour commencer</p>
          </div>
          <button onClick={openNewProject}
            className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold"
            style={{ background: `linear-gradient(135deg, ${TEAL}, #007A82)`, color: '#fff' }}>
            <FolderPlus size={15} /> Créer un projet
          </button>
        </div>
      )}

      {/* Projects */}
      <div className="space-y-6">
        {projects.map(proj => {
          const projCalcs = proj.sifs.map(sif => ({
            sif,
            calc: calcSIF(sif, { projectStandard: proj.standard }),
          }))
          const allOk     = projCalcs.length === 0 || projCalcs.every(x => x.calc.meetsTarget)
          const isArchived  = proj.status === 'archived'
          const isCompleted = proj.status === 'completed'
          const sc = statusColors[proj.status] ?? '#6B7280'

          return (
            <div key={proj.id} className="rounded-2xl border overflow-hidden"
              style={{ background: PANEL_BG, borderColor: BORDER, opacity: isArchived ? 0.7 : 1 }}>

              {/* Project header row */}
              <div className="flex items-center justify-between px-5 py-3 border-b"
                style={{ background: CARD_BG, borderColor: BORDER }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: `${TEAL}20`, border: `1px solid ${TEAL}30` }}>
                    <Folder size={14} style={{ color: TEAL }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: TEXT }}>{proj.name}</p>
                    <p className="text-[10px]" style={{ color: TEXT_DIM }}>
                      {[proj.ref, proj.client, proj.standard].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold"
                    style={{ background: `${sc}18`, border: `1px solid ${sc}40`, color: sc }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: sc }} />
                    {statusLabels[proj.status] ?? proj.status}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${allOk ? 'text-emerald-400' : 'text-amber-400'}`}
                    style={{ background: allOk ? '#052E1620' : '#78350F20', border: `1px solid ${allOk ? '#15803D40' : '#B4530940'}` }}>
                    {allOk ? '✓ OK' : '⚠ À vérifier'}
                  </span>

                  {/* Actions projet */}
                  <div className="relative" onClick={e => e.stopPropagation()} ref={menuRef}>
                    <button
                      className="flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] transition-all"
                      style={{ borderColor: BORDER, color: TEXT_DIM, background: 'transparent' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = TEAL; e.currentTarget.style.color = TEXT }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT_DIM }}
                      onClick={() => setOpenMenu(openMenu === `proj-${proj.id}` ? null : `proj-${proj.id}`)}>
                      <MoreHorizontal size={13} />
                    </button>
                    {openMenu === `proj-${proj.id}` && (
                      <div className="absolute right-0 top-full mt-1 z-40 rounded-xl border shadow-2xl overflow-hidden w-48"
                        style={{ background: '#14181C', borderColor: BORDER }}>
                        {!isArchived && !isCompleted && (
                          <MenuBtn icon={Plus} label="Nouvelle SIF" hoverColor={TEAL} onClick={() => { openNewSIF(proj.id); closeMenu() }} />
                        )}
                        <MenuBtn icon={Pencil} label="Modifier" onClick={() => { openEditProject(proj.id); closeMenu() }} />
                        {proj.status === 'active' && (
                          <MenuBtn icon={CheckCheck} label="Clôturer" hoverColor="#60A5FA" onClick={() => {
                            closeMenu()
                            confirm.show({
                              title: `Clôturer "${proj.name}"`,
                              message: 'L\'étude sera marquée comme terminée. Les données restent accessibles en lecture.',
                              confirmLabel: 'Clôturer',
                              onConfirm: () => updateProject(proj.id, { status: 'completed' }),
                            })
                          }} />
                        )}
                        {proj.status !== 'archived' && (
                          <MenuBtn icon={Archive} label="Archiver" hoverColor="#F59E0B" onClick={() => {
                            closeMenu()
                            confirm.show({
                              title: `Archiver "${proj.name}"`,
                              message: 'Le projet sera archivé. Il peut être réactivé à tout moment.',
                              confirmLabel: 'Archiver',
                              onConfirm: () => updateProject(proj.id, { status: 'archived' }),
                            })
                          }} />
                        )}
                        {proj.status === 'archived' && (
                          <MenuBtn icon={CheckCircle2} label="Réactiver" hoverColor="#4ADE80"
                            onClick={() => { closeMenu(); updateProject(proj.id, { status: 'active' }) }} />
                        )}
                        <div className="border-t my-0.5" style={{ borderColor: BORDER }} />
                        <MenuBtn icon={Trash2} label="Supprimer" color="#EF4444" hoverColor="#EF4444" onClick={() => {
                          closeMenu()
                          confirm.show({
                            title: `Supprimer "${proj.name}"`,
                            message: `Cette action supprimera définitivement le projet et ses ${proj.sifs.length} SIF${proj.sifs.length > 1 ? 's' : ''}. Irréversible.`,
                            confirmLabel: 'Supprimer définitivement',
                            danger: true,
                            onConfirm: () => deleteProject(proj.id),
                          })
                        }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SIFs list */}
              {proj.sifs.length === 0 ? (
                <div className="px-5 py-4 flex items-center gap-3">
                  <p className="text-sm" style={{ color: TEXT_DIM }}>Aucune SIF —</p>
                  {!isArchived && !isCompleted && (
                    <button onClick={() => openNewSIF(proj.id)}
                      className="text-sm font-semibold" style={{ color: TEAL }}>
                      + Créer une SIF
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: BORDER }}>
                  {proj.sifs.map(sif => {
                    const r   = calcSIF(sif, { projectStandard: proj.standard })
                    const sifSc = statusColors[sif.status] ?? '#6B7280'
                    return (
                      <div key={sif.id}
                        className="group flex items-center gap-4 px-5 py-3 transition-colors"
                        onMouseEnter={e => (e.currentTarget.style.background = '#1E242B')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

                        <div className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: r.meetsTarget ? '#4ADE80' : '#F87171' }} />

                        <button type="button" className="flex-1 min-w-0 text-left"
                          onClick={() => navigate({ type: 'sif-dashboard', projectId: proj.id, sifId: sif.id, tab: 'overview' })}>
                          <p className="text-sm font-semibold truncate" style={{ color: TEXT }}>
                            {sif.sifNumber}
                            {sif.title && <span className="font-normal ml-2" style={{ color: TEXT_DIM }}>— {sif.title}</span>}
                          </p>
                          <p className="text-[10px]" style={{ color: TEXT_DIM }}>
                            {sif.subsystems.map(s => s.architecture).join(' + ') || 'Aucun sous-système'}
                            {sif.processTag && ` · ${sif.processTag}`}
                          </p>
                        </button>

                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right">
                            <p className="text-[9px] uppercase tracking-wider" style={{ color: TEXT_DIM }}>PFD</p>
                            <p className="text-xs font-mono font-bold"
                              style={{ color: r.meetsTarget ? '#4ADE80' : '#F87171' }}>
                              {formatPFD(r.PFD_avg)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] uppercase tracking-wider" style={{ color: TEXT_DIM }}>Cible</p>
                            <p className="text-xs font-bold" style={{ color: '#60A5FA' }}>SIL {sif.targetSIL}</p>
                          </div>
                          <SILBadge sil={r.SIL} size="sm" />

                          <div className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: `${sifSc}20`, border: `1px solid ${sifSc}40`, color: sifSc }}>
                            {statusLabels[sif.status] ?? sif.status}
                          </div>

                          {/* SIF actions menu */}
                          <div className="relative opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={e => e.stopPropagation()}>
                            <button
                              className="flex items-center justify-center w-7 h-7 rounded-lg border"
                              style={{ borderColor: BORDER, color: TEXT_DIM, background: 'transparent' }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = TEAL; e.currentTarget.style.color = TEXT }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT_DIM }}
                              onClick={() => setOpenMenu(openMenu === `sif-${sif.id}` ? null : `sif-${sif.id}`)}>
                              <MoreHorizontal size={12} />
                            </button>
                            {openMenu === `sif-${sif.id}` && (
                              <div className="absolute right-0 top-full mt-1 z-40 rounded-xl border shadow-2xl overflow-hidden w-44"
                                style={{ background: '#14181C', borderColor: BORDER }}>
                                <MenuBtn icon={ChevronRight} label="Ouvrir" hoverColor={TEAL}
                                  onClick={() => { closeMenu(); navigate({ type: 'sif-dashboard', projectId: proj.id, sifId: sif.id, tab: 'overview' }) }} />
                                <MenuBtn icon={Pencil} label="Modifier"
                                  onClick={() => { closeMenu(); openEditSIF(sif.id) }} />
                                {sif.status !== 'approved' && (
                                  <MenuBtn icon={CheckCheck} label="Approuver" hoverColor="#4ADE80"
                                    onClick={() => { closeMenu(); updateSIF(proj.id, sif.id, { status: 'approved' as SIFStatus }) }} />
                                )}
                                {sif.status !== 'archived' && (
                                  <MenuBtn icon={Archive} label="Archiver" hoverColor="#F59E0B" onClick={() => {
                                    closeMenu()
                                    confirm.show({
                                      title: `Archiver "${sif.sifNumber}"`,
                                      message: 'La SIF sera archivée. Elle restera accessible en lecture.',
                                      confirmLabel: 'Archiver',
                                      onConfirm: () => updateSIF(proj.id, sif.id, { status: 'archived' as SIFStatus }),
                                    })
                                  }} />
                                )}
                                <div className="border-t my-0.5" style={{ borderColor: BORDER }} />
                                <MenuBtn icon={Trash2} label="Supprimer" color="#EF4444" hoverColor="#EF4444" onClick={() => {
                                  closeMenu()
                                  confirm.show({
                                    title: `Supprimer "${sif.sifNumber}"`,
                                    message: 'Suppression définitive de la SIF et de toute son architecture. Irréversible.',
                                    confirmLabel: 'Supprimer définitivement',
                                    danger: true,
                                    onConfirm: () => deleteSIF(proj.id, sif.id),
                                  })
                                }} />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
