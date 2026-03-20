import { useEffect, useMemo, useRef } from 'react'
import { ArrowUpRight, Command, Search, X } from 'lucide-react'
import { useSearchNavigation } from '@/components/search/SearchNavigation'
import { SEARCH_SCOPE_META, getSearchResultIcon, getSearchScopeTone } from '@/components/search/searchMeta'
import { Input } from '@/components/ui/input'
import { openSearchResult, type SearchResult, type SearchResultGroup } from '@/features/search/searchIndex'
import { useAppStore } from '@/store/appStore'
import { usePrismTheme } from '@/styles/usePrismTheme'

const TAB_LABELS: Record<string, string> = {
  cockpit: 'Cockpit',
  context: 'Contexte',
  architecture: 'Architecture',
  verification: 'Vérification',
  exploitation: 'Exploitation',
  history: 'Historique',
  report: 'Rapport',
  library: 'Bibliothèque',
}

const RESULT_KIND_LABELS: Record<SearchResult['kind'], string> = {
  project: 'Projet',
  sif: 'SIF',
  component: 'Composant',
  subcomponent: 'Sous-composant',
  template: 'Template',
  assumption: 'Hypothèse',
  action: 'Action',
  procedure: 'Procédure',
  campaign: 'Campagne',
  event: 'Événement',
  revision: 'Révision',
  report: 'Rapport',
}

function ResultRow({ result }: { result: SearchResult }) {
  const navigate = useAppStore(s => s.navigate)
  const selectComponent = useAppStore(s => s.selectComponent)
  const { BORDER, PAGE_BG, SHADOW_SOFT, TEXT, TEXT_DIM } = usePrismTheme()
  const Icon = getSearchResultIcon(result.kind)
  const tone = getSearchScopeTone(result.scope)

  return (
    <button
      type="button"
      onClick={() => openSearchResult(result, { navigate, selectComponent })}
      className="group flex w-full items-start gap-3 px-4 py-3.5 text-left transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out"
      style={{
        background: 'transparent',
        borderBottom: `1px solid ${BORDER}26`,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = PAGE_BG
        e.currentTarget.style.boxShadow = SHADOW_SOFT
        e.currentTarget.style.transform = 'translateY(-0.5px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <span
        className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border"
        style={{
          color: tone,
          borderColor: `${tone}22`,
          background: `${tone}10`,
        }}
      >
        <Icon size={16} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-[14px] font-semibold" style={{ color: TEXT }}>
            {result.title}
          </p>
          <span
            className="inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em]"
            style={{
              color: tone,
              borderColor: `${tone}22`,
              background: `${tone}0C`,
            }}
          >
            {RESULT_KIND_LABELS[result.kind]}
          </span>
          <span
            className="inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em]"
            style={{ color: TEXT_DIM, borderColor: `${BORDER}60`, background: PAGE_BG }}
          >
            {TAB_LABELS[result.tab] ?? result.tab}
          </span>
        </div>
        <p className="mt-1 text-[12px] leading-relaxed" style={{ color: TEXT_DIM }}>
          {result.subtitle}
        </p>
        <p className="mt-2 text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
          {result.context}
        </p>
      </div>

      <ArrowUpRight size={14} className="mt-1 shrink-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100" style={{ color: TEXT_DIM }} />
    </button>
  )
}

function ResultGroupSection({
  group,
  preview,
}: {
  group: SearchResultGroup
  preview: boolean
}) {
  const { BORDER, CARD_BG, PAGE_BG, SHADOW_PANEL, TEXT, TEXT_DIM } = usePrismTheme()
  const scopeMeta = SEARCH_SCOPE_META[group.scope]
  const tone = getSearchScopeTone(group.scope)
  const Icon = scopeMeta.Icon

  return (
    <section
      className="overflow-hidden rounded-xl border"
      style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_PANEL }}
    >
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4" style={{ borderColor: `${BORDER}35` }}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border"
              style={{ color: tone, borderColor: `${tone}20`, background: `${tone}10` }}
            >
              <Icon size={15} />
            </span>
            <div>
              <p className="text-sm font-semibold" style={{ color: TEXT }}>{scopeMeta.label}</p>
              <p className="text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>{scopeMeta.hint}</p>
            </div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] font-semibold" style={{ color: TEXT }}>{group.items.length} résultat{group.items.length > 1 ? 's' : ''}</p>
          {preview && (
            <p className="mt-1 text-[10px]" style={{ color: TEXT_DIM }}>Aperçu</p>
          )}
        </div>
      </div>

      <div>
        {group.items.map(result => <ResultRow key={result.id} result={result} />)}
      </div>

      {preview && (
        <div className="border-t px-5 py-3 text-[11px] leading-relaxed" style={{ borderColor: `${BORDER}26`, background: PAGE_BG, color: TEXT_DIM }}>
          Affine la recherche ou choisis la portée dans le panneau gauche pour parcourir l’ensemble des résultats.
        </div>
      )}
    </section>
  )
}

export function SearchWorkspace() {
  const {
    query,
    deferredQuery,
    scope,
    projectFilter,
    groupedResults,
    previewGroups,
    totalIndexed,
    totalVisible,
    projectFilters,
    missingRevisionCount,
    setQuery,
  } = useSearchNavigation()
  const { BORDER, CARD_BG, PAGE_BG, SHADOW_PANEL, TEAL, TEAL_DIM, TEXT, TEXT_DIM } = usePrismTheme()
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const projectLabel = useMemo(() => {
    if (!projectFilter) return null
    return projectFilters.find(project => project.id === projectFilter)?.label ?? null
  }, [projectFilter, projectFilters])

  const showingPreview = !deferredQuery.trim() && scope === 'all' && !projectFilter
  const displayGroups = showingPreview ? previewGroups : groupedResults
  const displayedCount = displayGroups.reduce((sum, group) => sum + group.items.length, 0)

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-[1380px] flex-col gap-5 px-6 py-6">
        <section
          className="overflow-hidden rounded-xl border"
          style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_PANEL }}
        >
          <div className="border-b px-6 py-4" style={{ borderColor: `${BORDER}35` }}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: TEAL_DIM }}>
                  Recherche transverse
                </p>
                <h1 className="mt-2 text-[28px] font-semibold tracking-tight" style={{ color: TEXT }}>
                  Retrouver n’importe quel objet utile du dossier
                </h1>
                <p className="mt-2 max-w-[780px] text-[14px] leading-[1.8]" style={{ color: TEXT_DIM }}>
                  Projet, SIF, composant, template de bibliothèque, hypothèse, action, proof test, révision ou rapport. Chaque résultat ouvre directement la bonne vue du produit.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-[11px]">
                <span className="inline-flex items-center rounded-full border px-2.5 py-1" style={{ color: TEAL, borderColor: `${TEAL}28`, background: `${TEAL}10` }}>
                  {deferredQuery ? `${totalVisible} résultats filtrés` : `${totalIndexed} objets indexés`}
                </span>
                <span className="inline-flex items-center rounded-full border px-2.5 py-1" style={{ color: TEXT_DIM, borderColor: `${BORDER}70`, background: PAGE_BG }}>
                  <Command size={12} className="mr-1" />
                  Ctrl/Cmd + K pour l’accès rapide
                </span>
              </div>
            </div>
          </div>

          <div className="px-6 py-5">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: TEXT_DIM }} />
              <Input
                ref={inputRef}
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Ex. XV-101, SIF-204, bypass, proof test, révision B, Safety PLC..."
                className="h-12 rounded-xl pl-10 pr-11 text-[14px]"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border transition-colors"
                  style={{ borderColor: `${BORDER}70`, color: TEXT_DIM, background: PAGE_BG }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
              <span className="inline-flex items-center rounded-full border px-2.5 py-1" style={{ color: TEAL, borderColor: `${TEAL}22`, background: `${TEAL}0C` }}>
                {SEARCH_SCOPE_META[scope].label}
              </span>
              {projectLabel && (
                <span className="inline-flex items-center rounded-full border px-2.5 py-1" style={{ color: TEXT_DIM, borderColor: `${BORDER}70`, background: PAGE_BG }}>
                  {projectLabel}
                </span>
              )}
              {showingPreview && (
                <span className="inline-flex items-center rounded-full border px-2.5 py-1" style={{ color: TEXT_DIM, borderColor: `${BORDER}70`, background: PAGE_BG }}>
                  Aperçu des principales occurrences par catégorie
                </span>
              )}
              {!showingPreview && (
                <span className="inline-flex items-center rounded-full border px-2.5 py-1" style={{ color: TEXT_DIM, borderColor: `${BORDER}70`, background: PAGE_BG }}>
                  {displayedCount} élément{displayedCount > 1 ? 's' : ''} affiché{displayedCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {missingRevisionCount > 0 && (
              <p className="mt-3 text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
                L’historique se complète progressivement pendant le chargement des révisions publiées.
              </p>
            )}
          </div>
        </section>

        {displayGroups.length === 0 ? (
          <section
            className="rounded-xl border px-6 py-7"
            style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_PANEL }}
          >
            <p className="text-sm font-semibold" style={{ color: TEXT }}>Aucun résultat</p>
            <p className="mt-2 max-w-[720px] text-[13px] leading-relaxed" style={{ color: TEXT_DIM }}>
              Essaie un tag instrument, un identifiant de SIF, un fabricant, une hypothèse, un type de campagne, une révision ou un template de bibliothèque. La recherche couvre aussi les sous-composants et les actions calculées du cockpit.
            </p>
          </section>
        ) : (
          <div className="space-y-4">
            {displayGroups.map(group => (
              <ResultGroupSection
                key={group.scope}
                group={group}
                preview={showingPreview}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
