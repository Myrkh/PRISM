import { Activity, BookTemplate, Cpu, Zap } from 'lucide-react'
import type { SubsystemType } from '@/core/types'
import { InspectorBlock, RightPanelBody, RightPanelShell } from '@/components/layout/RightPanelShell'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { useLibraryNavigation } from './LibraryNavigation'
import { LibraryTemplateParamsPanel } from './LibraryTemplateParamsPanel'

const CREATE_OPTIONS: { type: SubsystemType; label: string; hint: string; Icon: typeof Activity; tone: string }[] = [
  {
    type: 'sensor',
    label: 'Nouveau capteur',
    hint: 'Créer un transmetteur, switch ou instrument de détection depuis zéro.',
    Icon: Activity,
    tone: '#0284C7',
  },
  {
    type: 'logic',
    label: 'Nouvelle logique',
    hint: 'Créer un solveur logique, automate ou relais de sécurité réutilisable.',
    Icon: Cpu,
    tone: '#7C3AED',
  },
  {
    type: 'actuator',
    label: 'Nouvel actionneur',
    hint: "Créer une vanne, un package final element ou un accessoire d'arrêt.",
    Icon: Zap,
    tone: '#EA580C',
  },
]

function EmptyLibraryInspector() {
  const { BORDER, PAGE_BG, TEXT, TEXT_DIM } = usePrismTheme()
  const { projectFilter, projectFilters, libraryFilter, startCreate } = useLibraryNavigation()
  const projectLabel = projectFilter
    ? projectFilters.find(project => project.id === projectFilter)?.label ?? null
    : null

  return (
    <RightPanelShell
      items={[{ id: 'template', label: 'Template', Icon: BookTemplate }]}
      active="template"
      onSelect={() => {}}
    >
      <RightPanelBody compact className="space-y-3">
        <InspectorBlock title="Bibliothèque" hint="La bibliothèque maître sert à créer, qualifier et réutiliser les composants standards du produit.">
          <div className="space-y-2 text-[12px] leading-relaxed" style={{ color: TEXT_DIM }}>
            <p>
              Sélectionnez un template existant pour l’éditer, ou créez un nouveau composant réutilisable depuis zéro.
            </p>
            <div
              className="rounded-lg border px-3 py-2"
              style={{ borderColor: `${BORDER}90`, background: PAGE_BG, color: TEXT }}
            >
              {projectLabel
                ? `Projet filtré : ${projectLabel}. Les nouveaux templates peuvent être enregistrés directement dans cette bibliothèque projet${libraryFilter ? ` · ${libraryFilter}` : ''}.`
                : `Aucun projet filtré. Les nouveaux templates seront créés dans My Library par défaut${libraryFilter ? ` · ${libraryFilter}` : ''}, avec possibilité de basculer vers Project.`}
            </div>
          </div>
        </InspectorBlock>

        <InspectorBlock title="Créer depuis zéro" hint="Le panneau reprend exactement le même gabarit de paramètres que celui utilisé dans l’Architecture des SIF.">
          <div className="space-y-2">
            {CREATE_OPTIONS.map(option => (
              <button
                key={option.type}
                type="button"
                onClick={() => startCreate(option.type)}
                className="prism-action flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-all"
                style={{ borderColor: `${option.tone}22`, background: `${option.tone}0F`, color: TEXT }}
              >
                <span
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border"
                  style={{ borderColor: `${option.tone}26`, background: `${option.tone}14`, color: option.tone }}
                >
                  <option.Icon size={15} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[12px] font-semibold">{option.label}</span>
                  <span className="mt-1 block text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
                    {option.hint}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </InspectorBlock>
      </RightPanelBody>
    </RightPanelShell>
  )
}

export function LibraryInspector() {
  const {
    editorMode,
    editorState,
    editorSelection,
    projectFilter,
    libraryFilter,
    clearEditor,
    focusSavedTemplate,
  } = useLibraryNavigation()

  if (editorMode === 'empty') {
    return <EmptyLibraryInspector />
  }

  if (editorMode === 'create' && editorState.kind === 'create') {
    return (
      <LibraryTemplateParamsPanel
        mode="create"
        subsystemType={editorState.subsystemType}
        defaultProjectId={projectFilter}
        defaultLibraryName={editorState.libraryName ?? libraryFilter ?? null}
        onSaved={focusSavedTemplate}
        onClose={clearEditor}
      />
    )
  }

  if (!editorSelection) {
    return <EmptyLibraryInspector />
  }

  return (
    <LibraryTemplateParamsPanel
      mode={editorMode === 'clone' ? 'clone' : 'edit'}
      template={editorSelection.template}
      origin={editorSelection.origin}
      subsystemType={editorSelection.template.subsystemType}
      defaultProjectId={projectFilter}
      defaultLibraryName={editorSelection.template.libraryName ?? libraryFilter ?? null}
      onSaved={focusSavedTemplate}
      onClose={clearEditor}
    />
  )
}
