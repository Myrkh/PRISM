import { Activity, BookTemplate, Cpu, Zap } from 'lucide-react'
import type { SubsystemType } from '@/core/types'
import { InspectorBlock, RightPanelSection, RightPanelShell } from '@/components/layout/RightPanelShell'
import { useAppLocale } from '@/i18n/useLocale'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { useLibraryNavigation } from './LibraryNavigation'
import { useAppStore } from '@/store/appStore'
import { AILibraryDraftInspector } from './AILibraryDraftInspector'
import { LibraryTemplateParamsPanel } from './LibraryTemplateParamsPanel'

const INSPECTOR_STRINGS = {
  fr: {
    sectionLabel: 'Template',
    overview: {
      title: 'Bibliothèque',
      hint: 'La bibliothèque maître sert à créer, qualifier et réutiliser les composants standards du produit.',
      body: "Sélectionnez un template existant pour l'éditer, ou créez un nouveau composant réutilisable depuis zéro.",
      projectScoped: (projectLabel: string, libraryLabel: string | null) => `Projet filtré : ${projectLabel}. Les nouveaux templates peuvent être enregistrés directement dans cette bibliothèque projet${libraryLabel ? ` · ${libraryLabel}` : ''}.`,
      projectDefault: (libraryLabel: string | null) => `Aucun projet filtré. Les nouveaux templates seront créés dans Ma bibliothèque par défaut${libraryLabel ? ` · ${libraryLabel}` : ''}, avec possibilité de basculer vers Projet.`,
    },
    create: {
      title: 'Créer depuis zéro',
      hint: "Le panneau reprend exactement le même gabarit de paramètres que celui utilisé dans l'Architecture des SIF.",
      options: {
        sensor: {
          label: 'Nouveau capteur',
          hint: 'Créer un transmetteur, switch ou instrument de détection depuis zéro.',
        },
        logic: {
          label: 'Nouvelle logique',
          hint: 'Créer un solveur logique, automate ou relais de sécurité réutilisable.',
        },
        actuator: {
          label: 'Nouvel actionneur',
          hint: "Créer une vanne, un package final element ou un accessoire d'arrêt.",
        },
      },
    },
  },
  en: {
    sectionLabel: 'Template',
    overview: {
      title: 'Library',
      hint: 'The master library is used to create, qualify, and reuse the product standard components.',
      body: 'Select an existing template to edit it, or create a reusable component from scratch.',
      projectScoped: (projectLabel: string, libraryLabel: string | null) => `Filtered project: ${projectLabel}. New templates can be saved directly in this project library${libraryLabel ? ` · ${libraryLabel}` : ''}.`,
      projectDefault: (libraryLabel: string | null) => `No filtered project. New templates will be created in My Library by default${libraryLabel ? ` · ${libraryLabel}` : ''}, with the option to switch to Project.`,
    },
    create: {
      title: 'Create from scratch',
      hint: 'This panel reuses the exact same parameter layout as the SIF Architecture editor.',
      options: {
        sensor: {
          label: 'New sensor',
          hint: 'Create a transmitter, switch, or detection instrument from scratch.',
        },
        logic: {
          label: 'New logic solver',
          hint: 'Create a reusable logic solver, PLC, or safety relay from scratch.',
        },
        actuator: {
          label: 'New actuator',
          hint: 'Create a valve, final-element package, or shutdown accessory from scratch.',
        },
      },
    },
  },
} as const

const CREATE_OPTIONS: { type: SubsystemType; Icon: typeof Activity; tone: string }[] = [
  {
    type: 'sensor',
    Icon: Activity,
    tone: '#0284C7',
  },
  {
    type: 'logic',
    Icon: Cpu,
    tone: '#7C3AED',
  },
  {
    type: 'actuator',
    Icon: Zap,
    tone: '#EA580C',
  },
]

function EmptyLibraryInspector() {
  const locale = useAppLocale()
  const strings = INSPECTOR_STRINGS[locale]
  const { BORDER, PAGE_BG, TEXT, TEXT_DIM } = usePrismTheme()
  const { projectFilter, projectFilters, libraryFilter, startCreate } = useLibraryNavigation()
  const projectLabel = projectFilter
    ? projectFilters.find(project => project.id === projectFilter)?.label ?? null
    : null

  return (
    <RightPanelShell persistKey="library">
      <RightPanelSection id="template" label={strings.sectionLabel} Icon={BookTemplate}>
        <div className="space-y-3">
          <InspectorBlock title={strings.overview.title} hint={strings.overview.hint}>
            <div className="space-y-2 text-[12px] leading-relaxed" style={{ color: TEXT_DIM }}>
              <p>{strings.overview.body}</p>
              <div
                className="rounded-lg border px-3 py-2"
                style={{ borderColor: `${BORDER}90`, background: PAGE_BG, color: TEXT }}
              >
                {projectLabel
                  ? strings.overview.projectScoped(projectLabel, libraryFilter)
                  : strings.overview.projectDefault(libraryFilter)}
              </div>
            </div>
          </InspectorBlock>

          <InspectorBlock title={strings.create.title} hint={strings.create.hint}>
            <div className="space-y-2">
              {CREATE_OPTIONS.map(option => {
                const copy = strings.create.options[option.type]
                return (
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
                      <span className="block text-[12px] font-semibold">{copy.label}</span>
                      <span className="mt-1 block text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
                        {copy.hint}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </InspectorBlock>
        </div>
      </RightPanelSection>
    </RightPanelShell>
  )
}

export function LibraryInspector() {
  const aiLibraryDraftPreview = useAppStore(state => state.aiLibraryDraftPreview)
  const {
    editorMode,
    editorState,
    editorSelection,
    projectFilter,
    libraryFilter,
    clearEditor,
    focusSavedTemplate,
  } = useLibraryNavigation()

  if (aiLibraryDraftPreview) {
    return <AILibraryDraftInspector />
  }

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
