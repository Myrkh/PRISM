/**
 * useSymbolGroups — builds the '@' mode symbol groups:
 *   - SIF components (all SIFs, sorted with current SIF first)
 *   - Library templates (grouped by library name)
 */
import { useMemo } from 'react'
import { Activity, Cpu, Zap } from 'lucide-react'
import { useAppLocale } from '@/i18n/useLocale'
import { useAppStore } from '@/store/appStore'
import { useComponentLibrary } from '@/features/library'
import type { CommandGroup } from './types'

function componentIconFor(subsystemType: string) {
  if (subsystemType === 'sensor') return Activity
  if (subsystemType === 'actuator') return Zap
  return Cpu
}

export function useSymbolGroups(run: (fn: () => void) => void): CommandGroup[] {
  const locale        = useAppLocale()
  const projects      = useAppStore(s => s.projects)
  const view          = useAppStore(s => s.view)
  const navigate      = useAppStore(s => s.navigate)
  const selectComponent = useAppStore(s => s.selectComponent)

  const currentSifId = view.type === 'sif-dashboard' ? view.sifId : null

  const { builtinTemplates, allProjectTemplates, userTemplates } = useComponentLibrary(null)

  const libraryTemplates = useMemo(
    () => [...builtinTemplates, ...allProjectTemplates, ...userTemplates],
    [builtinTemplates, allProjectTemplates, userTemplates],
  )

  return useMemo(() => {
    const groups: CommandGroup[] = []

    // ── SIF components ──────────────────────────────────────────────────────

    const sifEntries = projects
      .flatMap(project => project.sifs.map(sif => ({ project, sif })))
      .sort((a, b) => {
        if (a.sif.id === currentSifId) return -1
        if (b.sif.id === currentSifId) return 1
        const labelA = `${a.sif.sifNumber} ${a.sif.title ?? ''}`.trim().toLowerCase()
        const labelB = `${b.sif.sifNumber} ${b.sif.title ?? ''}`.trim().toLowerCase()
        return labelA.localeCompare(labelB, locale, { sensitivity: 'base' })
      })

    for (const { project, sif } of sifEntries) {
      const items = sif.subsystems.flatMap(subsystem =>
        subsystem.channels.flatMap(channel =>
          channel.components.map(component => ({
            id: `sym-${component.id}`,
            label: component.tagName || component.instrumentType,
            keywords: [
              component.tagName ?? '',
              component.instrumentType,
              subsystem.label,
              sif.sifNumber,
              sif.title ?? '',
              project.name,
              'composant component symbol architecture',
            ].join(' ').toLowerCase(),
            Icon: componentIconFor(component.subsystemType),
            meta: [project.ref || project.name, subsystem.label].filter(Boolean).join(' · '),
            onSelect: () => run(() => {
              navigate({ type: 'sif-dashboard', projectId: project.id, sifId: sif.id, tab: 'architecture' })
              selectComponent(component.id)
            }),
            isActive: false,
            level: 0 as const,
          })),
        ),
      )

      if (items.length > 0) {
        groups.push({
          heading: `SIF · ${sif.sifNumber}${sif.title ? ` · ${sif.title}` : ''}`,
          items: items.sort((a, b) => a.label.localeCompare(b.label, locale, { sensitivity: 'base' })),
        })
      }
    }

    // ── Library templates ────────────────────────────────────────────────────

    const libraryGroups = new Map<string, CommandGroup['items']>()

    const sortedTemplates = [...libraryTemplates].sort((a, b) => {
      const libA = (a.libraryName || '').toLowerCase()
      const libB = (b.libraryName || '').toLowerCase()
      if (libA !== libB) return libA.localeCompare(libB, locale, { sensitivity: 'base' })
      return a.name.localeCompare(b.name, locale, { sensitivity: 'base' })
    })

    for (const template of sortedTemplates) {
      const libraryLabel = template.libraryName?.trim()
        || (template.origin === 'builtin'
          ? (locale === 'fr' ? 'Standards intégrés' : 'Built-in')
          : template.projectId
            ? (locale === 'fr' ? 'Projet' : 'Project')
            : (locale === 'fr' ? 'Personnel' : 'Personal'))

      const heading = `Library · ${libraryLabel}`
      const items = libraryGroups.get(heading) ?? []

      items.push({
        id: `library-template-${template.id}`,
        label: template.name,
        keywords: [
          template.name,
          template.libraryName ?? '',
          template.subsystemType,
          template.instrumentType,
          template.manufacturer,
          ...(template.tags ?? []),
        ].join(' ').toLowerCase(),
        Icon: componentIconFor(template.subsystemType),
        meta: [template.subsystemType, template.manufacturer || template.dataSource]
          .filter(Boolean)
          .join(' · '),
        onSelect: () => run(() => {
          navigate({
            type: 'library',
            templateId: template.id,
            origin: template.origin === 'builtin' ? 'builtin' : template.projectId ? 'project' : 'user',
            libraryName: template.libraryName ?? null,
          })
          useAppStore.getState().setRightPanelOpen(true)
        }),
        isActive: view.type === 'library' && view.templateId === template.id,
        level: 0 as const,
      })

      libraryGroups.set(heading, items)
    }

    for (const [heading, items] of libraryGroups.entries()) {
      groups.push({ heading, items })
    }

    return groups
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSifId, libraryTemplates, locale, projects, view])
}
