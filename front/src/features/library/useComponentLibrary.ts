import { useEffect, useMemo, useState } from 'react'
import { BUILTIN_COMPONENT_TEMPLATES } from './builtinCatalog'
import { fetchLambdaDbComponentTemplates } from '@/lib/componentLibraryApi'
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
  const [builtinTemplates, setBuiltinTemplates] = useState(BUILTIN_COMPONENT_TEMPLATES)

  useEffect(() => {
    if (!authUserId || loading || templates.length > 0) return
    void fetchTemplates().catch(() => undefined)
  }, [authUserId, fetchTemplates, loading, templates.length])

  useEffect(() => {
    let active = true

    void fetchLambdaDbComponentTemplates()
      .then(nextTemplates => {
        if (!active || nextTemplates.length === 0) return
        setBuiltinTemplates(nextTemplates)
      })
      .catch(() => undefined)

    return () => {
      active = false
    }
  }, [])

  const projectTemplates = useMemo(
    () => templates.filter(template => !template.isArchived && template.scope === 'project' && template.projectId === projectId),
    [projectId, templates],
  )

  const userTemplates = useMemo(
    () => templates.filter(template => !template.isArchived && template.scope === 'user'),
    [templates],
  )

  return {
    builtinTemplates,
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
