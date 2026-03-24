/**
 * App.tsx — PRISM v3
 *
 * – Shell unique SIFWorkbenchLayout toujours monté
 * – Chargement initial depuis Supabase (spinner + error state)
 * – ProjectModal + SIFModal à la racine
 * – Hash routing bidirectionnel (#/ et #/project/:id/sif/:id/:tab)
 */
import { useEffect, useRef, useState } from 'react'
import {
  normalizeSIFTab,
  SETTINGS_SECTIONS,
  useAppStore,
  type AppView,
  type SettingsSection,
} from '@/store/appStore'
import { AppHeader } from '@/components/layout/AppHeader'
import { SIFDashboard } from '@/components/sif/SIFDashboard'
import { SIFModal } from '@/components/sif/SIFModal'
import { SIFWorkbenchLayout } from '@/components/layout/SIFWorkbenchLayout'
import { ProjectModal } from '@/components/projects/ProjectModal'
import { ProjectAccessDialog } from '@/components/projects/ProjectAccessDialog'
import { AuthScreen } from '@/components/auth/AuthScreen'
import { SettingsWorkspace } from '@/components/settings/SettingsWorkspace'
import { AuditLogWorkspace } from '@/components/global/AuditLogWorkspace'
import { SIFHistoryWorkspace } from '@/components/global/SIFHistoryWorkspace'
import { EngineWorkspace } from '@/components/global/EngineWorkspace'
import { HazopWorkspace } from '@/components/global/HazopWorkspace'
import { DocsWorkspace } from '@/components/global/DocsWorkspace'
import { SearchWorkspace } from '@/components/global/SearchWorkspace'
import { LibraryWorkspace } from '@/components/global/LibraryWorkspace'
import { DocsNavigationProvider } from '@/components/docs/DocsNavigation'
import { SearchNavigationProvider } from '@/components/search/SearchNavigation'
import { LibraryNavigationProvider } from '@/components/library/LibraryNavigation'
import { AuditNavigationProvider } from '@/components/audit/AuditNavigation'
import { EngineNavigationProvider } from '@/components/engine/EngineNavigation'
import { PlanningWorkspace } from '@/planning/PlanningWorkspace'
import { PlanningNavigationProvider } from '@/planning/PlanningNavigation'
import { fetchAllProjects } from '@/lib/db'
import { NoteEditorWorkspace } from '@/components/workspace/NoteEditorWorkspace'
import { FileViewerWorkspace } from '@/components/workspace/FileViewerWorkspace'
import { useWorkspaceSync } from '@/store/useWorkspaceSync'
import { StatusBar } from '@/components/layout/StatusBar'
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts'
import { ToastStack } from '@/components/ui/toast'

// ─── Hash routing ─────────────────────────────────────────────────────────

function viewToHash(view: AppView): string {
  if (view.type === 'sif-dashboard') {
    return `#/project/${view.projectId}/sif/${view.sifId}/${view.tab}`
  }
  if (view.type === 'search') return '#/search'
  if (view.type === 'planning') return '#/planning'
  if (view.type === 'library') {
    const params = new URLSearchParams()
    if (view.templateId) params.set('template', view.templateId)
    if (view.origin) params.set('origin', view.origin)
    if (view.libraryName) params.set('library', view.libraryName)
    const query = params.toString()
    return query ? `#/library?${query}` : '#/library'
  }
  if (view.type === 'settings') return `#/settings/${view.section}`
  if (view.type === 'docs') return '#/docs'
  if (view.type === 'audit-log') return '#/audit'
  if (view.type === 'sif-history') return '#/history'
  if (view.type === 'engine') return '#/engine'
  if (view.type === 'hazop') return '#/hazop'
  if (view.type === 'home') return '#/home'
  if (view.type === 'note') return `#/note/${view.noteId}`
  if (view.type === 'workspace-file') return `#/file/${view.nodeId}`
  return '#/'
}

function hashToView(hash: string): AppView | null {
  const raw = hash.replace(/^#/, '') || '/'
  const [path, queryString = ''] = raw.split('?')
  const m    = path.match(/^\/project\/([^/]+)\/sif\/([^/]+)\/([^/]+)$/)
  if (m) {
    const tab = normalizeSIFTab(m[3])
    return { type: 'sif-dashboard', projectId: m[1], sifId: m[2], tab }
  }
  const mSettings = path.match(/^\/settings(?:\/([^/]+))?$/)
  if (mSettings) {
    const section = mSettings[1] as SettingsSection | undefined
    return {
      type: 'settings',
      section: section && SETTINGS_SECTIONS.includes(section) ? section : 'general',
    }
  }
  if (path === '/search') return { type: 'search' }
  if (path === '/planning') return { type: 'planning' }
  if (path === '/library') {
    const params = new URLSearchParams(queryString)
    const templateId = params.get('template') || undefined
    const originParam = params.get('origin')
    const libraryName = params.get('library') || undefined
    const origin = originParam === 'builtin' || originParam === 'project' || originParam === 'user'
      ? originParam
      : undefined
    return {
      type: 'library',
      ...(templateId ? { templateId } : {}),
      ...(origin ? { origin } : {}),
      ...(libraryName ? { libraryName } : {}),
    }
  }
  if (path === '/docs') return { type: 'docs' }
  if (path === '/review') return { type: 'audit-log' }
  if (path === '/audit') return { type: 'audit-log' }
  if (path === '/history') return { type: 'sif-history' }
  if (path === '/engine') return { type: 'engine' }
  if (path === '/hazop') return { type: 'hazop' }
  if (path === '/home') return { type: 'home' }
  if (path.startsWith('/note/')) return { type: 'note', noteId: path.slice(6) }
  if (path.startsWith('/file/')) return { type: 'workspace-file', nodeId: path.slice(6) }
  if (path === '/') return { type: 'projects' }
  return null
}

function landingViewToAppView(landing: string): AppView {
  switch (landing) {
    case 'library':   return { type: 'library' }
    case 'engine':    return { type: 'engine' }
    case 'audit-log': return { type: 'audit-log' }
    case 'planning':  return { type: 'planning' }
    case 'hazop':     return { type: 'hazop' }
    default:          return { type: 'projects' }
  }
}

// ─── Loading screen ───────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'radial-gradient(1200px 600px at 50% 10%, #111A23 0%, #0C1117 55%)' }}
    >
      <div
        className="flex w-[320px] flex-col items-center gap-4 rounded-2xl border px-6 py-7"
        style={{ background: '#1A2028CC', borderColor: '#2A3340' }}
      >
        <div className="relative">
          <div className="absolute inset-0 rounded-2xl blur-xl" style={{ background: '#009BA433' }} />
          <div
            className="relative h-14 w-14 rounded-xl border flex items-center justify-center"
            style={{ background: '#0F151D', borderColor: '#2E3948' }}
          >
            <img src="/favicon2.png" alt="PRISM" className="h-9 w-9 object-contain" />
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm font-semibold tracking-wide" style={{ color: '#5FD8D2' }}>Chargement PRISM…</p>
          <p className="mt-1 text-[11px]" style={{ color: '#8FA0B1' }}>Synchronisation des projets et SIF</p>
        </div>

        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="h-1.5 w-1.5 rounded-full animate-pulse"
              style={{ background: '#009BA4', animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ErrorScreen({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-5"
      style={{ background: '#0C1117' }}>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{ background: '#EF444420', border: '1px solid #EF444440' }}>
        <span className="text-xl">⚠</span>
      </div>
      <div className="text-center max-w-md">
        <p className="text-base font-bold mb-1" style={{ color: '#DFE8F1' }}>Connexion Supabase impossible</p>
        <p className="text-xs font-mono px-3 py-2 rounded-lg mt-2" style={{ background: '#1D232A', color: '#F87171' }}>{error}</p>
        <p className="text-xs mt-2" style={{ color: '#8FA0B1' }}>
          Vérifiez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env.local
        </p>
      </div>
      <button onClick={onRetry}
        className="px-5 py-2 rounded-xl text-sm font-bold"
        style={{ background: 'linear-gradient(135deg, #009BA4, #007A82)', color: '#fff' }}>
        Réessayer
      </button>
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────

export default function App() {
  const view           = useAppStore(s => s.view)
  const navigate       = useAppStore(s => s.navigate)
  const focusMode      = useAppStore(s => s.focusMode)
  const secondSlot     = useAppStore(s => s.secondSlot)
  const setSecondSlotTab = useAppStore(s => s.setSecondSlotTab)
  const isDark         = useAppStore(s => s.isDark)
  const preferences    = useAppStore(s => s.preferences)
  const projects       = useAppStore(s => s.projects)
  const setProjects = useAppStore(s => s.setProjects)
  const initializeAuth = useAppStore(s => s.initializeAuth)
  const authLoading = useAppStore(s => s.authLoading)
  const authUser    = useAppStore(s => s.authUser)
  const syncError   = useAppStore(s => s.syncError)
  const setSyncError = useAppStore(s => s.setSyncError)
  const authError   = useAppStore(s => s.authError)
  const setAuthError = useAppStore(s => s.setAuthError)

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const lastNonSettingsViewRef = useRef<AppView>(landingViewToAppView(
    useAppStore.getState().preferences.defaultLandingView,
  ))
  const authUserId = authUser?.id ?? null

  // Workspace ↔ Supabase sync
  useWorkspaceSync()
  // Global keyboard shortcuts (Ctrl+B, Ctrl+J, Ctrl+Shift+Z, etc.)
  useGlobalShortcuts()

  // Dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  // Zen mode → OS fullscreen (hides Windows taskbar)
  useEffect(() => {
    if (focusMode) {
      document.documentElement.requestFullscreen?.().catch(() => {})
    } else if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {})
    }
  }, [focusMode])

  // Initial data load from Supabase
  const loadData = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const data = await fetchAllProjects()
      setProjects(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setLoadError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void initializeAuth() }, [initializeAuth])
  useEffect(() => {
    if (authLoading || !authUserId) return
    void loadData()
  }, [authLoading, authUserId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep track of previous non-settings view for ESC exit in settings
  useEffect(() => {
    if (view.type !== 'settings') {
      lastNonSettingsViewRef.current = view
    }
  }, [view])

  // Store → Hash
  useEffect(() => {
    const h = viewToHash(view)
    if (window.location.hash !== h) window.history.pushState(null, '', h)
  }, [view])

  // Hash → Store (initial + browser back/forward)
  useEffect(() => {
    const sync = () => {
      const parsed = hashToView(window.location.hash)
      if (!parsed) { navigate(landingViewToAppView(preferences.defaultLandingView)); return }
      if (parsed.type === 'sif-dashboard') {
        const proj = projects.find(p => p.id === parsed.projectId)
        const sif  = proj?.sifs.find(s => s.id === parsed.sifId)
        if (!proj || !sif) { navigate(landingViewToAppView(preferences.defaultLandingView)); return }
      }
      navigate(parsed)
    }
    // Don't sync hash until data is loaded (avoids redirect to home before projects load)
    if (!loading) sync()
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps

  if (authLoading) return <LoadingScreen />
  if (!authUser) return <AuthScreen />
  if (loading) return <LoadingScreen />
  if (loadError) return <ErrorScreen error={loadError} onRetry={loadData} />

  const shellProjectId = view.type === 'sif-dashboard' ? view.projectId : ''
  const shellSifId = view.type === 'sif-dashboard' ? view.sifId : ''

  // Secondary split pane — built here to avoid circular imports with SIFWorkbenchLayout.
  // null when no SIF is selected (secondary shows empty/welcome state).
  const secondaryContent = (secondSlot?.projectId && secondSlot?.sifId) ? (
    <SIFDashboard
      projectId={secondSlot.projectId}
      sifId={secondSlot.sifId}
      tabOverride={secondSlot.tab}
      onTabChange={setSecondSlotTab}
    />
  ) : null

  const shellContent = (
    <>
      {view.type === 'search' && (
        <SearchWorkspace />
      )}
      {view.type === 'planning' && (
        <PlanningWorkspace />
      )}
      {view.type === 'library' && (
        <LibraryWorkspace />
      )}
      {view.type === 'settings' && (
        <SettingsWorkspace
          section={view.section}
          onSectionChange={(section) => navigate({ type: 'settings', section })}
          onExit={() => navigate(lastNonSettingsViewRef.current ?? { type: 'projects' })}
        />
      )}
      {view.type === 'docs' && (
        <DocsWorkspace />
      )}
      {view.type === 'audit-log' && (
        <AuditLogWorkspace />
      )}
      {view.type === 'sif-history' && (
        <SIFHistoryWorkspace />
      )}
      {view.type === 'engine' && (
        <EngineWorkspace />
      )}
      {view.type === 'hazop' && (
        <HazopWorkspace />
      )}
      {view.type === 'sif-dashboard' && (
        <SIFDashboard projectId={view.projectId} sifId={view.sifId} />
      )}
      {view.type === 'note' && (
        <NoteEditorWorkspace key={view.noteId} noteId={view.noteId} />
      )}
      {view.type === 'workspace-file' && (
        <FileViewerWorkspace nodeId={view.nodeId} />
      )}
    </>
  )

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background text-foreground antialiased">
      <AppHeader />

      {/* Bannière d'erreur de sync (mutations) */}
      {syncError && (
        <div
          className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl border px-4 py-3 shadow-xl text-sm"
          style={{ background: '#1D232A', borderColor: '#EF444440', color: '#F87171', maxWidth: 380 }}
        >
          <span>⚠ Sync Supabase : {syncError}</span>
          <button onClick={() => setSyncError(null)}
            className="ml-auto text-xs underline opacity-70 hover:opacity-100">
            OK
          </button>
        </div>
      )}

      {authError && (
        <div
          className="fixed bottom-20 right-4 z-50 flex items-center gap-3 rounded-xl border px-4 py-3 shadow-xl text-sm"
          style={{ background: '#1D232A', borderColor: '#F59E0B55', color: '#FBBF24', maxWidth: 420 }}
        >
          <span>⚠ Auth Supabase : {authError}</span>
          <button onClick={() => setAuthError(null)}
            className="ml-auto text-xs underline opacity-70 hover:opacity-100">
            OK
          </button>
        </div>
      )}

      {/* Shell universel */}
      {view.type === 'docs' ? (
        <DocsNavigationProvider>
          <SIFWorkbenchLayout projectId={shellProjectId} sifId={shellSifId}>
            {shellContent}
          </SIFWorkbenchLayout>
        </DocsNavigationProvider>
      ) : view.type === 'search' ? (
        <SearchNavigationProvider>
          <SIFWorkbenchLayout projectId={shellProjectId} sifId={shellSifId}>
            {shellContent}
          </SIFWorkbenchLayout>
        </SearchNavigationProvider>
      ) : view.type === 'planning' ? (
        <PlanningNavigationProvider>
          <SIFWorkbenchLayout projectId={shellProjectId} sifId={shellSifId}>
            {shellContent}
          </SIFWorkbenchLayout>
        </PlanningNavigationProvider>
      ) : view.type === 'library' ? (
        <LibraryNavigationProvider>
          <SIFWorkbenchLayout projectId={shellProjectId} sifId={shellSifId}>
            {shellContent}
          </SIFWorkbenchLayout>
        </LibraryNavigationProvider>
      ) : view.type === 'audit-log' ? (
        <AuditNavigationProvider>
          <SIFWorkbenchLayout projectId={shellProjectId} sifId={shellSifId}>
            {shellContent}
          </SIFWorkbenchLayout>
        </AuditNavigationProvider>
      ) : view.type === 'engine' ? (
        <EngineNavigationProvider>
          <SIFWorkbenchLayout projectId={shellProjectId} sifId={shellSifId}>
            {shellContent}
          </SIFWorkbenchLayout>
        </EngineNavigationProvider>
      ) : (
        <SIFWorkbenchLayout projectId={shellProjectId} sifId={shellSifId} secondaryContent={secondaryContent}>
          {shellContent}
        </SIFWorkbenchLayout>
      )}

      {/* Status bar — 22px footer, toggled by preferences.statusBarVisible */}
      <StatusBar />

      {/* Modales à la racine — disponibles depuis toutes les vues */}
      <ProjectModal />
      <ProjectAccessDialog />
      <SIFModal />
      <ToastStack />
    </div>
  )
}
