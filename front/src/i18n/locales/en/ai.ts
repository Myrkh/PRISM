import type { AiStrings } from '@/i18n/ai'

export const aiStringsEn: AiStrings = {
  proposals: {
    commands: {
      createProject: 'CREATE PROJECT',
      createSif:     'CREATE SIF',
      draftSif:      'DRAFT SIF',
      createLibrary: 'CREATE LIBRARY',
    },
    actions: {
      openProject:    'Open created project',
      openSif:        'Open created SIF',
      openTemplate:   'Open created template',
      reopenPreview:  'Reopen preview',
      openPreview:    'Open preview',
    },
    sections: {
      conflicts:   'Conflicts to resolve',
      missing:     'Missing information',
      uncertain:   'Insufficient information',
      assumptions: 'Assumptions',
    },
    preview: {
      titleSif:        'Unapplied AI draft',
      titleProject:    'Unapplied project draft',
      subtitleSif:     'This SIF is a temporary draft. Nothing will be saved until you apply the proposal.',
      subtitleProject: 'This project is a temporary preview. Nothing will be saved until you apply the proposal.',
      applySif:        'Apply to project',
      applyProject:    'Apply to workspace',
      applying:        'Applying...',
      discard:         'Discard preview',
      json:            'JSON',
      governanceTitle: 'Draft governance',
      governanceHint:  'Conflicts, gaps, and assumptions stay visible before the project is actually created.',
      governanceEmpty: 'No conflicts or missing information detected in the current proposal.',
    },
    projectMeta: {
      sectionTitle: 'Project metadata',
      sectionHint:  'Exact preview of the .prism contract proposed by PRISM AI.',
      name:         'Name',
      reference:    'Reference',
      client:       'Client',
      site:         'Site',
      unit:         'Unit',
      revision:     'Revision',
      status:       'Status',
      description:  'Description',
    },
    projectView: {
      sectionTitle: 'Project preview',
      sectionHint:  'The project will be created with the structure below.',
      empty:        'No SIF is included in this project draft yet.',
      untitledSif:  'Untitled SIF',
    },
  },
}
