import type { LibraryStrings } from '@/i18n/library'

export const libraryStringsEn: LibraryStrings = {
  sourceScopeLabels: {
    all: 'Full catalogue',
    builtin: 'Validated standards',
    project: 'Project templates',
    user: 'Personal library',
  },
  sourceMeta: {
    all: { label: 'Whole catalogue', hint: 'Standards, project templates, and personal library' },
    builtin: { label: 'Validated standards', hint: 'lambda_db catalogue and validated base' },
    project: { label: 'Project templates', hint: 'Components specific to one or more projects' },
    user: { label: 'Personal library', hint: 'My reusable templates and private imports' },
  },
  subsystemHints: {
    sensor: 'Transmitters, sensors, and switches used in instrumented chains.',
    logic: 'Logic solvers, safety PLCs, and associated relays.',
    actuator: 'Final elements, valves, positioners, and shutdown accessories.',
  },
  header: {
    eyebrow: 'Master library',
    title: 'Manage reusable components',
    description: 'One source for validated standards, project templates, and the personal library.',
    filteredCount: count => `${count} filtered results`,
    availableCount: count => `${count} templates available`,
  },
  searchPlaceholder: 'Ex. Rosemount, level switch, Safety PLC, SOV, positioner…',
  ctas: {
    newSensor: 'New sensor',
    newLogic: 'New logic',
    newActuator: 'New actuator',
    import: 'Import',
    importModel: 'JSON model',
    export: 'Export',
    reload: 'Reload',
    importModelTitle: 'Download an import-compatible JSON model',
    exportTitle: 'Export visible templates',
    reloadTitle: 'Reload the library',
    createTitle: typeLabel => `Create a ${typeLabel.toLowerCase()} template`,
  },
  importTarget: (projectLabel, libraryLabel) => projectLabel
    ? `Import into ${projectLabel}${libraryLabel ? ` · ${libraryLabel}` : ''}`
    : `Import into my library${libraryLabel ? ` · ${libraryLabel}` : ''}`,
  chips: {
    validatedStandards: count => `${count} validated standards`,
    projectTemplates: count => `${count} project templates`,
    personalTemplates: count => `${count} personal templates`,
  },
  status: {
    noSelection: 'No entries selected for import.',
    imported: (count, created, updated) => `${count} template(s) imported · ${created} created · ${updated} updated.`,
    exported: count => `${count} template(s) exported.`,
    importModelDownloaded: 'JSON model downloaded.',
    archived: 'Template archived.',
    deleted: 'Template deleted.',
  },
  family: {
    templateCount: count => `${count} template${count > 1 ? 's' : ''}`,
    partLabel: {
      sensor: 'Sensor side',
      logic: 'Logic side',
      actuator: 'Actuator side',
    },
    empty: 'No template matches the active filters for this family.',
    showMore: 'Load more',
    showLess: 'Show less',
  },
  sidebar: {
    title: 'Master library',
    summary: (query, totalVisible, totalIndexed) => query
      ? `${totalVisible} result${totalVisible > 1 ? 's' : ''} for “${query}”`
      : `${totalIndexed} templates available in the global catalogue`,
    reset: 'Reset',
    originTitle: 'Origin',
    familiesTitle: 'Families',
    allFamiliesLabel: 'All families',
    allFamiliesHint: 'Sensors, logic, and actuators',
    namedLibrariesTitle: 'Libraries',
    allLibrariesLabel: 'All libraries',
    allLibrariesHint: 'Named personal and project libraries',
    noNamedLibraries: 'No named library matches the active filters. Create one from the right panel to separate client, site, or internal standard references.',
    projectsTitle: 'Projects',
    allProjectsLabel: 'All projects',
    allProjectsHint: 'Validated standards and the personal library stay visible',
    usageTitle: 'Usage',
    usagePrimary: 'The master library is used to manage standards, project templates, and personal references.',
    usageSecondary: 'Search by type, manufacturer, reference, named library, or source to quickly find a reusable component.',
    collectionHint: {
      project: 'Project library',
      user: 'Personal library',
      mixed: 'Mixed project + personal library',
    },
  },
}
