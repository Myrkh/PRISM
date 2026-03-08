/**
 * layout/IconRail.tsx — PRISM
 *
 * Barre d'icônes verticale (extrême gauche).
 * Navigation principale + actions rapides.
 */
import { useState } from 'react'
import {
  Home, FolderPlus, FilePlus, ListChecks, History, GitBranch, FlaskConical,
  Cpu,
  Settings, LogOut,
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { BORDER, RAIL_BG, TEAL, TEXT, TEXT_DIM } from '@/styles/tokens'

// ─── Rail button ──────────────────────────────────────────────────────────
function RailBtn({
  Icon, label, onClick, active = false, danger = false,
}: {
  Icon: React.ElementType; label: string; onClick: () => void
  active?: boolean; danger?: boolean
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button type="button" title={label} onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
      style={{
        background: active ? '#1A2A35' : 'transparent',
        color: danger && hovered ? '#EF4444'
             : active ? TEAL
             : hovered ? TEXT
             : TEXT_DIM,
      }}>
      <Icon size={16} />
    </button>
  )
}

function RailDivider() {
  return <div className="w-6 border-t my-0.5" style={{ borderColor: BORDER }} />
}

// ─── IconRail ─────────────────────────────────────────────────────────────
interface IconRailProps {
  leftOpen: boolean
  rightOpen: boolean
  onToggleLeft: () => void
  onToggleRight: () => void
  showRightToggle: boolean
  showHome: boolean
  showSettings: boolean
  showReview: boolean
  showAudit: boolean
  showHistory: boolean
  showEngine: boolean
  showHazop: boolean
  projectId?: string
}

export function IconRail({
  leftOpen, rightOpen, onToggleLeft, onToggleRight,
  showRightToggle, showHome, showSettings, showReview, showAudit, showHistory, showEngine, showHazop,
  projectId,
}: IconRailProps) {
  const navigate       = useAppStore(s => s.navigate)
  const openNewProject = useAppStore(s => s.openNewProject)
  const openNewSIF     = useAppStore(s => s.openNewSIF)

  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5 py-3 border-r"
      style={{ width: 48, background: RAIL_BG, borderColor: BORDER }}>
      <RailBtn Icon={leftOpen ? PanelLeftClose : PanelLeftOpen}
        label={leftOpen ? 'Fermer le volet' : 'Ouvrir le volet'}
        onClick={onToggleLeft} active={leftOpen} />
      {showRightToggle && (
        <RailBtn Icon={rightOpen ? PanelRightClose : PanelRightOpen}
          label={rightOpen ? 'Fermer propriétés' : 'Ouvrir propriétés'}
          onClick={onToggleRight} active={rightOpen} />
      )}
      <RailDivider />
      <RailBtn Icon={Home} label="Accueil" onClick={() => navigate({ type: 'projects' })} active={showHome} />
      <RailBtn Icon={FolderPlus} label="Nouveau projet" onClick={openNewProject} />
      <RailBtn Icon={FilePlus}   label="Nouvelle SIF"   onClick={() => openNewSIF(projectId || undefined)} />
      <RailDivider />
      <RailBtn Icon={ListChecks}   label="Review Queue"   onClick={() => navigate({ type: 'review-queue' })} active={showReview}  />
      <RailBtn Icon={History}      label="Audit Log"      onClick={() => navigate({ type: 'audit-log' })}   active={showAudit}   />
      <RailBtn Icon={GitBranch}    label="SIF History"    onClick={() => navigate({ type: 'sif-history' })} active={showHistory} />
      <RailBtn Icon={Cpu}          label="Engine"         onClick={() => navigate({ type: 'engine' })}      active={showEngine}  />
      <RailBtn Icon={FlaskConical} label="HAZOP / LOPA"   onClick={() => navigate({ type: 'hazop' })}       active={showHazop}   />
      <div className="flex-1" />
      <RailDivider />
      <RailBtn Icon={Settings} label="Paramètres" onClick={() => navigate({ type: 'settings', section: 'general' })} active={showSettings} />
      <RailBtn Icon={LogOut}   label="Déconnexion" onClick={() => navigate({ type: 'projects' })} danger />
    </div>
  )
}
