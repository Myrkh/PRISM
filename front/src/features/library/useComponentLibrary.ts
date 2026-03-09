import { useEffect, useMemo } from 'react'
import { BUILTIN_COMPONENT_TEMPLATES } from './builtinCatalog'
import { useAppStore } from '@/store/appStore'

export function useComponentLibrary(projectId: string) {
  const authUserId = useAppStore(state => state.authUser?.id ?? null)
  const templates = useAppStore(state => state.componentTemplates)
  const loading = useAppStore(state => state.componentTemplatesLoading)
  const error = useAppStore(state => state.componentTemplatesError)
  const fetchTemplates = useAppStore(state => state.fetchComponentTemplates)
  const saveTemplate = useAppStore(state => state.saveComponentTemplate)
  const importTemplates = useAppStore(state => state.importComponentTemplates)
  const archiveTemplate = useAppStore(state => state.archiveComponentTemplate)
  const deleteTemplate = useAppStore(state => state.deleteComponentTemplate)
  const clearError = useAppStore(state => state.setComponentTemplatesError)

  useEffect(() => {
    if (!authUserId || loading || templates.length > 0) return
    void fetchTemplates().catch(() => undefined)
  }, [authUserId, fetchTemplates, loading, templates.length])

  const projectTemplates = useMemo(
    () => templates.filter(template => !template.isArchived && template.scope === 'project' && template.projectId === projectId),
    [projectId, templates],
  )

  const userTemplates = useMemo(
    () => templates.filter(template => !template.isArchived && template.scope === 'user'),
    [templates],
  )

  return {
    builtinTemplates: BUILTIN_COMPONENT_TEMPLATES,
    projectTemplates,
    userTemplates,
    loading,
    error,
    fetchTemplates,
    saveTemplate,
    importTemplates,
    archiveTemplate,
    deleteTemplate,
    clearError,
  }
}
