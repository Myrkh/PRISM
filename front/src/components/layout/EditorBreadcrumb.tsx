/**
 * EditorBreadcrumb — thin contextual path bar above the editor area.
 * VS Code-style: Project › SIF-003 — Title › Architecture
 * Height: 26px, tokens-based, dark/light aware.
 */
import { ChevronRight } from 'lucide-react'
import { normalizeSIFTab } from '@/store/types'
import { useAppStore } from '@/store/appStore'
import { usePrismTheme } from '@/styles/usePrismTheme'

const TAB_LABELS: Record<string, string> = {
  cockpit:      'Cockpit',
  context:      'Context',
  architecture: 'Architecture',
  verification: 'Verification',
  exploitation: 'Operations',
  report:       'Report',
}

type Crumb = { label: string; onClick?: () => void }

export function EditorBreadcrumb() {
  const { BORDER, PANEL_BG, TEXT, TEXT_DIM } = usePrismTheme()
  const view     = useAppStore(s => s.view)
  const projects = useAppStore(s => s.projects)
  const navigate = useAppStore(s => s.navigate)

  let crumbs: Crumb[] = []

  if (view.type === 'sif-dashboard') {
    const project = projects.find(p => p.id === view.projectId)
    const sif     = project?.sifs.find(s => s.id === view.sifId)
    const tab     = normalizeSIFTab(view.tab)

    if (project) crumbs.push({ label: project.name, onClick: () => navigate({ type: 'projects' }) })
    if (sif) {
      const sifLabel = sif.title ? `${sif.sifNumber} — ${sif.title}` : sif.sifNumber
      crumbs.push({
        label: sifLabel,
        onClick: tab !== 'cockpit' ? () => navigate({ ...view, tab: 'cockpit' }) : undefined,
      })
    }
    const tabLabel = TAB_LABELS[tab]
    if (tabLabel && tab !== 'cockpit') crumbs.push({ label: tabLabel })
  } else if (view.type === 'settings') {
    crumbs.push({ label: 'Settings', onClick: () => navigate({ type: 'settings', section: 'general' }) })
    if (view.section) {
      const sectionLabels: Record<string, string> = {
        general: 'General', workspace: 'Workspace', engine: 'Engine', shortcuts: 'Keyboard Shortcuts',
      }
      crumbs.push({ label: sectionLabels[view.section] ?? view.section })
    }
  } else {
    const viewLabels: Record<string, string> = {
      projects: 'Projects', library: 'Library', engine: 'Engine',
      'audit-log': 'Audit Log', planning: 'Test Planning', hazop: 'HAZOP / LOPA',
      docs: 'Help & Docs', search: 'Global Search', 'sif-history': 'SIF History',
    }
    const label = viewLabels[view.type]
    if (label) crumbs.push({ label })
  }

  if (crumbs.length === 0) return null

  return (
    <div
      className="flex items-center shrink-0 px-3 border-b overflow-hidden"
      style={{ height: 26, borderColor: BORDER, background: PANEL_BG }}
    >
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center min-w-0">
          {i > 0 && (
            <ChevronRight
              size={11}
              className="mx-1 shrink-0"
              style={{ color: TEXT_DIM, opacity: 0.5 }}
            />
          )}
          {crumb.onClick ? (
            <button
              type="button"
              onClick={crumb.onClick}
              className="text-[11px] truncate max-w-[200px] transition-colors"
              style={{ color: TEXT_DIM }}
              onMouseEnter={e => { e.currentTarget.style.color = TEXT }}
              onMouseLeave={e => { e.currentTarget.style.color = TEXT_DIM as string }}
            >
              {crumb.label}
            </button>
          ) : (
            <span
              className="text-[11px] truncate max-w-[200px]"
              style={{ color: TEXT, fontWeight: i === crumbs.length - 1 ? 500 : 400 }}
            >
              {crumb.label}
            </span>
          )}
        </span>
      ))}
    </div>
  )
}
