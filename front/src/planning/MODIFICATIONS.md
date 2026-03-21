# ═══════════════════════════════════════════════════════════════
# MODIFICATIONS À FAIRE DANS LES FICHIERS EXISTANTS
# ═══════════════════════════════════════════════════════════════
# 4 fichiers à modifier, chaque modification marquée clairement.
# ───────────────────────────────────────────────────────────────


# ┌─────────────────────────────────────────────────────────────┐
# │  1. store/types.ts                                          │
# └─────────────────────────────────────────────────────────────┘

# Ajouter 'planning' dans AppView (après | { type: 'hazop' })

  | { type: 'hazop' }
+ | { type: 'planning' }
  | { type: 'sif-dashboard'; projectId: string; sifId: string; tab: SIFTab }


# ┌─────────────────────────────────────────────────────────────┐
# │  2. components/layout/IconRail.tsx                          │
# └─────────────────────────────────────────────────────────────┘

# — Ajout de l'import CalendarDays
  import {
    Home, Search, BookOpen, BookOpenText,
    History, Cpu,
+   CalendarDays,
    Settings, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen,
  } from 'lucide-react'

# — Ajout dans GLOBAL_TOOLS entre audit-log et engine
  const GLOBAL_TOOLS = [
    { id: 'search'    as const, Icon: Search,       labelKey: 'search'   as const },
    { id: 'library'   as const, Icon: BookOpen,     labelKey: 'library'  as const },
    { id: 'audit-log' as const, Icon: History,      labelKey: 'audit'    as const },
+   { id: 'planning'  as const, Icon: CalendarDays, labelKey: 'planning' as const },
    { id: 'engine'    as const, Icon: Cpu,           labelKey: 'engine'   as const },
  ] as const


# ┌─────────────────────────────────────────────────────────────┐
# │  3. components/layout/SIFWorkbenchLayout.tsx                │
# └─────────────────────────────────────────────────────────────┘

# — Import du sidebar planning (avec les autres sidebars)
+ import { PlanningSidebar }   from '@/components/planning/PlanningSidebar'
  import { AuditSidebar }      from '@/components/audit/AuditSidebar'
  import { EngineSidebar }     from '@/components/engine/EngineSidebar'

# — Déclaration de showPlanning avec showAudit/showEngine
  const showAudit    = view.type === 'audit-log'
  const showHistory  = view.type === 'sif-history'
  const showEngine   = view.type === 'engine'
  const showHazop    = view.type === 'hazop'
+ const showPlanning = view.type === 'planning'
- const showGlobal   = showAudit || showHistory || showEngine || showHazop
+ const showGlobal   = showAudit || showHistory || showEngine || showHazop || showPlanning

# — Dans le switch sidebar (chaîne de ternaires), ajouter showPlanning
  : showAudit
    ? <AuditSidebar />
    : showEngine
      ? <EngineSidebar />
+     : showPlanning
+       ? <PlanningSidebar campaigns={[]} deadlines={[]} />
        : <ProjectTree projectId={projectId ?? ''} sifId={sifId ?? ''} />

# — Dans le GlobalRightPanelPlaceholder mode (dernier ternaire)
- mode={showAudit ? 'audit' : showHistory ? 'history' : showEngine ? 'engine' : 'hazop'}
+ mode={showAudit ? 'audit' : showHistory ? 'history' : showEngine ? 'engine' : showPlanning ? 'planning' : 'hazop'}


# ┌─────────────────────────────────────────────────────────────┐
# │  4. App.tsx                                                 │
# └─────────────────────────────────────────────────────────────┘

# — Import du workspace et du provider
+ import { PlanningWorkspace }          from '@/components/planning/PlanningWorkspace'
+ import { PlanningRightPanel }         from '@/components/planning/PlanningRightPanel'
+ import { PlanningNavigationProvider } from '@/components/planning/PlanningNavigation'
+ import { usePlanningData }            from '@/components/planning/PlanningWorkspace'

# — hashToView : ajouter la route planning
  if (path === '/hazop')   return { type: 'hazop' }
+ if (path === '/planning') return { type: 'planning' }
  if (path === '/')        return { type: 'projects' }

# — viewToHash : ajouter l'export planning
  if (view.type === 'hazop')    return '#/hazop'
+ if (view.type === 'planning') return '#/planning'
  return '#/'

# — Dans shellContent, ajouter le cas planning
  {view.type === 'hazop' && (
    <HazopWorkspace />
  )}
+ {view.type === 'planning' && (
+   <PlanningWorkspaceConnected />
+ )}

# — Ajouter le composant connecté PlanningWorkspaceConnected
# (juste avant le return principal de App)
+ function PlanningWorkspaceConnected() {
+   const { campaigns, deadlines } = usePlanningData()
+   return <PlanningWorkspace campaigns={campaigns} deadlines={deadlines} />
+ }

# — Dans le bloc SIFWorkbenchLayout, ajouter le provider planning
  } : view.type === 'engine' ? (
    <EngineNavigationProvider>
      <SIFWorkbenchLayout projectId={shellProjectId} sifId={shellSifId}>
        {shellContent}
      </SIFWorkbenchLayout>
    </EngineNavigationProvider>
+ ) : view.type === 'planning' ? (
+   <PlanningNavigationProvider>
+     <SIFWorkbenchLayout projectId={shellProjectId} sifId={shellSifId}>
+       {shellContent}
+     </SIFWorkbenchLayout>
+   </PlanningNavigationProvider>
  ) : (
    <SIFWorkbenchLayout projectId={shellProjectId} sifId={shellSifId}>
      {shellContent}
    </SIFWorkbenchLayout>
  )}


# ┌─────────────────────────────────────────────────────────────┐
# │  5. i18n/locales/fr/shell.ts et en/shell.ts                 │
# └─────────────────────────────────────────────────────────────┘

# Ton système i18n custom — ajouter la clé 'planning' dans iconRail

# fr/shell.ts
  iconRail: {
    ...
    engine:   'Moteur de calcul',
+   planning: 'Planning proof tests',
    docs:     'Aide & documentation',
    settings: 'Paramètres',
  }

# en/shell.ts
  iconRail: {
    ...
    engine:   'Calculation engine',
+   planning: 'Proof test planning',
    docs:     'Help & documentation',
    settings: 'Settings',
  }

# Et dans l'interface ShellStrings (shell.ts à la racine i18n/) :
  iconRail: {
    ...
    engine:   string
+   planning: string
    docs:     string
    settings: string
  }


# ┌─────────────────────────────────────────────────────────────┐
# │  NOTE sur le PlanningSidebar dans SIFWorkbenchLayout        │
# └─────────────────────────────────────────────────────────────┘
# Pour passer les campaigns/deadlines au sidebar depuis le layout,
# la solution la plus propre est d'utiliser le contexte PlanningNavigation.
# Crée un hook usePlanningDataContext() dans PlanningNavigation.tsx
# qui expose les données, puis utilise-le dans PlanningSidebar directement
# (sans passer par props), exactement comme AuditSidebar utilise useAuditNavigation().
# Le PlanningSidebar dans SIFWorkbenchLayout devient alors simplement :
#   : showPlanning ? <PlanningSidebar /> : ...
# sans props.
