import { useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { AppHeader } from '@/components/layout/AppHeader'
import { ProjectsPage } from '@/components/projects/ProjectsPage'
import { SIFListPage } from '@/components/sif/SIFListPage'
import { SIFDashboard } from '@/components/sif/SIFDashboard'
import { SIFModal } from '@/components/sif/SIFModal'
import { SIFWorkbenchLayout } from '@/components/layout/SIFWorkbenchLayout'

export default function App() {
  const view   = useAppStore(s => s.view)
  const isDark = useAppStore(s => s.isDark)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <AppHeader />

      {view.type === 'projects' && <ProjectsPage />}

      {view.type === 'sif-list' && (
        <>
          <SIFListPage projectId={view.projectId} />
          <SIFModal projectId={view.projectId} />
        </>
      )}

      {view.type === 'sif-dashboard' && (
        <>
          <SIFWorkbenchLayout projectId={view.projectId} sifId={view.sifId}>
            <SIFDashboard projectId={view.projectId} sifId={view.sifId} />
          </SIFWorkbenchLayout>
          <SIFModal projectId={view.projectId} />
        </>
      )}
    </div>
  )
}
