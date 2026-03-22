export type { BuiltinComponentSeed, LibraryDragPayload, LibraryPanelScope } from './catalogTypes'
export { BUILTIN_COMPONENT_TEMPLATES } from './builtinCatalog'
export {
  COMPONENT_TEMPLATE_EXPORT_FORMAT,
  COMPONENT_TEMPLATE_SCHEMA_VERSION,
  createBuiltinComponentTemplate,
  buildComponentTemplateImportStarter,
  analyzeComponentTemplateImport,
  getTemplateLibraryName,
  instantiateComponentTemplate,
  buildLibraryDragPayload,
  parseLibraryDragPayload,
  serializeComponentTemplates,
  parseComponentTemplateImport,
  getTemplateCategoryLabel,
  getPanelScopeLabel,
  type ComponentTemplateImportDecision,
  type ComponentTemplateImportDuplicate,
  type ComponentTemplateImportIssue,
  type ComponentTemplateImportPreview,
  type ComponentTemplateImportPreviewEntry,
} from './templateUtils'
export { useComponentLibrary } from './useComponentLibrary'
export { useLibraryCollections, COLLECTION_PRESET_COLORS, type LibraryCollection } from './useLibraryCollections'
