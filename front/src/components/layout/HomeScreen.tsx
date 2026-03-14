/**
 * layout/HomeScreen.tsx — PRISM
 *
 * Ecran d'accueil recentre sur la navigation lifecycle SIF.
 */
import { FolderPlus } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { LifecycleCockpit } from '@/components/layout/LifecycleCockpit'
import { PAGE_BG, TEAL, TEXT, TEXT_DIM } from '@/styles/tokens'

export function HomeScreen() {
  const projects = useAppStore(state => state.projects)
  const openNewProject = useAppStore(state => state.openNewProject)

  return (
    <div className="flex-1 overflow-y-auto p-8" style={{ background: PAGE_BG }}>
      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-5">
          <div
            className="w-20 h-20 rounded-3xl border-2 border-dashed flex items-center justify-center"
            style={{ borderColor: `${TEAL}30` }}
          >
            <FolderPlus size={32} style={{ color: `${TEAL}50` }} />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold mb-1" style={{ color: TEXT }}>Aucun projet</p>
            <p className="text-sm" style={{ color: TEXT_DIM }}>Créez votre premier projet pour commencer</p>
          </div>
          <button
            onClick={openNewProject}
            className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold"
            style={{ background: `linear-gradient(135deg, ${TEAL}, #007A82)`, color: '#fff' }}
          >
            <FolderPlus size={15} /> Créer un projet
          </button>
        </div>
      ) : (
        <LifecycleCockpit />
      )}
    </div>
  )
}
