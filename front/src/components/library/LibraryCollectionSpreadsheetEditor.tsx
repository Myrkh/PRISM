import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import {
  CompactSelection,
  DataEditor,
  GridCellKind,
  GridColumnIcon,
  type DataEditorRef,
  type EditableGridCell,
  type EditListItem,
  type GridCell,
  type GridColumn,
  type GridSelection,
  type Theme,
} from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'
import { AlertTriangle } from 'lucide-react'
import type { ComponentTemplate } from '@/core/types'
import type { LibraryStrings } from '@/i18n/library'
import { usePrismTheme } from '@/styles/usePrismTheme'
import {
  LIBRARY_COLLECTION_SPREADSHEET_COLUMNS,
  createLibraryCollectionSpreadsheetTemplate,
  getLibraryCollectionSpreadsheetCellState,
  getLibraryCollectionSpreadsheetValue,
  updateLibraryCollectionSpreadsheetTemplate,
  type LibraryCollectionSpreadsheetCellState,
  type LibraryCollectionSpreadsheetColumn,
} from './libraryCollectionSpreadsheetModel'
import { parseLibraryCollectionWorkspaceDocument, serializeLibraryCollectionWorkspaceSourceDocument } from './libraryCollectionWorkspaceJson'

const EMPTY_SELECTION: GridSelection = {
  columns: CompactSelection.empty(),
  rows: CompactSelection.empty(),
}

const LIBRARY_COLLECTION_GRID_WIDTHS_STORAGE_KEY = 'prism_library_collection_grid_widths'
const DEFAULT_FROZEN_COLUMNS = 2
type SpreadsheetColumnWidthMap = Record<string, number>

export interface LibraryCollectionSpreadsheetToolbarState {
  rowCount: number
  selectedRowCount: number
  hasSelection: boolean
  searchOpen: boolean
  freezeColumns: number
}

export interface LibraryCollectionSpreadsheetHandle {
  focus: () => void
  addRow: () => Promise<void>
  deleteSelectedRows: () => void
  duplicateSelectedRows: () => void
  copySelection: () => Promise<void>
  pasteSelection: () => Promise<void>
  fillDown: () => Promise<void>
  fillRight: () => Promise<void>
  toggleSearch: () => void
  toggleFreezeColumns: () => void
  resetColumnWidths: () => void
  fitColumns: () => void
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function loadPersistedColumnWidths(collectionId: string | null): SpreadsheetColumnWidthMap {
  if (typeof window === 'undefined' || !collectionId) return {}
  try {
    const raw = window.localStorage.getItem(LIBRARY_COLLECTION_GRID_WIDTHS_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!isRecord(parsed)) return {}
    const entry = parsed[collectionId]
    if (!isRecord(entry)) return {}
    return Object.fromEntries(
      Object.entries(entry).filter(([, width]) => typeof width === 'number' && Number.isFinite(width)),
    ) as SpreadsheetColumnWidthMap
  } catch {
    return {}
  }
}

function savePersistedColumnWidths(collectionId: string | null, widths: SpreadsheetColumnWidthMap) {
  if (typeof window === 'undefined' || !collectionId) return
  try {
    const raw = window.localStorage.getItem(LIBRARY_COLLECTION_GRID_WIDTHS_STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : {}
    const next = isRecord(parsed) ? { ...parsed } : {}
    next[collectionId] = widths
    window.localStorage.setItem(LIBRARY_COLLECTION_GRID_WIDTHS_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // ignore storage errors for UI-only state
  }
}

function cloneTemplate(template: ComponentTemplate): ComponentTemplate {
  if (typeof globalThis.structuredClone === 'function') return globalThis.structuredClone(template)
  return JSON.parse(JSON.stringify(template)) as ComponentTemplate
}

function duplicateTemplate(template: ComponentTemplate): ComponentTemplate {
  const cloned = cloneTemplate(template)
  return {
    ...cloned,
    id: globalThis.crypto?.randomUUID?.() ?? `template-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: cloned.name ? `${cloned.name} copy` : 'Template copy',
    createdAt: null,
    updatedAt: null,
  }
}

function getColumnIcon(column: LibraryCollectionSpreadsheetColumn) {
  if (column.kind === 'number') return GridColumnIcon.HeaderNumber
  if (column.kind === 'boolean') return GridColumnIcon.HeaderBoolean
  return GridColumnIcon.HeaderString
}

function buildCellThemeOverride(
  state: LibraryCollectionSpreadsheetCellState,
  isDark: boolean,
  textColor: string,
  dimColor: string,
): Partial<Theme> | undefined {
  if (state === 'normal') return undefined
  if (state === 'error') {
    return {
      bgCell: isDark ? 'rgba(239, 68, 68, 0.16)' : 'rgba(254, 226, 226, 0.92)',
      bgCellMedium: isDark ? 'rgba(239, 68, 68, 0.22)' : 'rgba(254, 202, 202, 0.94)',
      borderColor: isDark ? 'rgba(248, 113, 113, 0.28)' : 'rgba(239, 68, 68, 0.22)',
      textDark: textColor,
      textMedium: dimColor,
    }
  }
  return {
    bgCell: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(254, 243, 199, 0.96)',
    bgCellMedium: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(253, 230, 138, 0.98)',
    borderColor: isDark ? 'rgba(251, 191, 36, 0.26)' : 'rgba(245, 158, 11, 0.22)',
    textDark: textColor,
    textMedium: dimColor,
  }
}

function buildGridCell(
  column: LibraryCollectionSpreadsheetColumn,
  template: Parameters<typeof getLibraryCollectionSpreadsheetCellState>[0],
  isDark: boolean,
  textColor: string,
  dimColor: string,
): GridCell {
  const value = getLibraryCollectionSpreadsheetValue(template, column.id)
  const cellState = getLibraryCollectionSpreadsheetCellState(template, column)
  const themeOverride = buildCellThemeOverride(cellState, isDark, textColor, dimColor)

  if (column.kind === 'boolean') {
    return {
      kind: GridCellKind.Boolean,
      allowOverlay: false,
      data: Boolean(value),
      readonly: false,
      themeOverride,
      contentAlign: 'center',
    }
  }

  if (column.kind === 'number') {
    const displayData = typeof value === 'number' && Number.isFinite(value)
      ? String(value)
      : value === null
        ? ''
        : Number.isNaN(value as number)
          ? ''
          : String(value ?? '')
    return {
      kind: GridCellKind.Number,
      allowOverlay: true,
      readonly: false,
      data: typeof value === 'number' && Number.isFinite(value) ? value : undefined,
      displayData,
      themeOverride,
      contentAlign: 'right',
    }
  }

  return {
    kind: GridCellKind.Text,
    allowOverlay: true,
    readonly: false,
    data: String(value ?? ''),
    displayData: String(value ?? ''),
    themeOverride,
  }
}

function extractEditedValue(column: LibraryCollectionSpreadsheetColumn, nextValue: EditableGridCell): string | number | boolean | null {
  if (column.kind === 'boolean') {
    return nextValue.kind === GridCellKind.Boolean ? Boolean(nextValue.data) : false
  }

  if (column.kind === 'number') {
    if (nextValue.kind === GridCellKind.Number) return nextValue.data ?? null
    if ('data' in nextValue && typeof nextValue.data === 'string' && nextValue.data.trim().length === 0) return null
    const numeric = Number('data' in nextValue ? nextValue.data : null)
    return Number.isFinite(numeric) ? numeric : null
  }

  if (nextValue.kind === GridCellKind.Text) return nextValue.data
  if ('data' in nextValue) return String(nextValue.data ?? '')
  return ''
}

function buildGridTheme(
  isDark: boolean,
  textColor: string,
  dimColor: string,
  borderColor: string,
  panelBg: string,
  pageBg: string,
  accentColor: string,
): Partial<Theme> {
  return {
    accentColor,
    accentFg: '#FFFFFF',
    accentLight: isDark ? 'rgba(15, 118, 110, 0.2)' : 'rgba(15, 118, 110, 0.12)',
    textDark: textColor,
    textMedium: dimColor,
    textLight: isDark ? 'rgba(148, 163, 184, 0.78)' : 'rgba(100, 116, 139, 0.82)',
    textBubble: textColor,
    bgIconHeader: dimColor,
    fgIconHeader: '#FFFFFF',
    textHeader: textColor,
    textGroupHeader: dimColor,
    textHeaderSelected: '#FFFFFF',
    bgCell: panelBg,
    bgCellMedium: pageBg,
    bgHeader: panelBg,
    bgHeaderHasFocus: pageBg,
    bgHeaderHovered: pageBg,
    bgBubble: pageBg,
    bgBubbleSelected: panelBg,
    bgSearchResult: isDark ? 'rgba(245, 158, 11, 0.18)' : 'rgba(254, 243, 199, 0.96)',
    borderColor,
    horizontalBorderColor: borderColor,
    drilldownBorder: 'transparent',
    linkColor: accentColor,
    cellHorizontalPadding: 10,
    cellVerticalPadding: 6,
    headerFontStyle: '600 12px',
    baseFontStyle: '12px',
    markerFontStyle: '10px',
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    editorFontSize: '12px',
    lineHeight: 1.45,
    roundingRadius: 10,
  }
}

export const LibraryCollectionSpreadsheetEditor = forwardRef<LibraryCollectionSpreadsheetHandle, {
  content: string
  onChange: (value: string) => void
  invalidMessage: string | null
  isDark: boolean
  strings: LibraryStrings['collectionEditor']
  onStateChange?: (state: LibraryCollectionSpreadsheetToolbarState) => void
}>(function LibraryCollectionSpreadsheetEditor({
  content,
  onChange,
  invalidMessage,
  isDark,
  strings,
  onStateChange,
}, ref) {
  const { BORDER, PANEL_BG, PAGE_BG, SHADOW_SOFT, TEAL, TEXT, TEXT_DIM } = usePrismTheme()
  const gridRef = useRef<DataEditorRef | null>(null)
  const [gridSelection, setGridSelection] = useState<GridSelection>(EMPTY_SELECTION)
  const [columnWidths, setColumnWidths] = useState<SpreadsheetColumnWidthMap>({})
  const [showSearch, setShowSearch] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [freezeColumns, setFreezeColumns] = useState(DEFAULT_FROZEN_COLUMNS)

  const parsed = useMemo(() => {
    if (invalidMessage) return { ok: false as const, error: invalidMessage }
    return parseLibraryCollectionWorkspaceDocument(content)
  }, [content, invalidMessage])

  const parsedValue = parsed.ok ? parsed.value : null
  const parseError = parsed.ok ? null : parsed.error
  const collectionId = parsedValue?.collection.id ?? null

  useEffect(() => {
    setGridSelection(EMPTY_SELECTION)
  }, [content])

  useEffect(() => {
    setColumnWidths(loadPersistedColumnWidths(collectionId))
  }, [collectionId])

  useEffect(() => {
    savePersistedColumnWidths(collectionId, columnWidths)
  }, [collectionId, columnWidths])

  const gridColumns = useMemo<readonly GridColumn[]>(() => (
    LIBRARY_COLLECTION_SPREADSHEET_COLUMNS.map(column => ({
      id: column.id,
      title: column.title,
      group: column.group,
      width: columnWidths[column.id] ?? column.width,
      icon: getColumnIcon(column),
    }))
  ), [columnWidths])

  const gridTheme = useMemo(
    () => buildGridTheme(isDark, TEXT, TEXT_DIM, BORDER, PANEL_BG, PAGE_BG, TEAL),
    [BORDER, PAGE_BG, PANEL_BG, TEAL, TEXT, TEXT_DIM, isDark],
  )

  const selectedRows = useMemo(() => {
    if (!parsedValue) return [] as number[]
    return gridSelection.rows
      .toArray()
      .filter(rowIndex => rowIndex >= 0 && rowIndex < parsedValue.templates.length)
      .sort((left, right) => left - right)
  }, [gridSelection.rows, parsedValue])

  const hasSelection = selectedRows.length > 0 || Boolean(gridSelection.current)

  useEffect(() => {
    onStateChange?.({
      rowCount: parsedValue?.templates.length ?? 0,
      selectedRowCount: selectedRows.length,
      hasSelection,
      searchOpen: showSearch,
      freezeColumns,
    })
  }, [freezeColumns, hasSelection, onStateChange, parsedValue?.templates.length, selectedRows.length, showSearch])

  const commitTemplates = useCallback((templates: ComponentTemplate[]) => {
    if (!parsedValue) return
    onChange(
      serializeLibraryCollectionWorkspaceSourceDocument({
        collection: parsedValue.collection,
        templates,
        exportedByProfileId: parsedValue.exportedByProfileId,
      }),
    )
  }, [onChange, parsedValue])

  const applyEdits = useCallback((templates: ComponentTemplate[], edits: readonly EditListItem[]) => {
    if (!parsedValue) return null
    const nextTemplates = [...templates]
    let changed = false

    for (const edit of edits) {
      const [columnIndex, rowIndex] = edit.location
      const column = LIBRARY_COLLECTION_SPREADSHEET_COLUMNS[columnIndex]
      if (!column || rowIndex < 0) continue

      while (rowIndex >= nextTemplates.length) {
        nextTemplates.push(createLibraryCollectionSpreadsheetTemplate(parsedValue.collection))
        changed = true
      }

      const current = nextTemplates[rowIndex]
      if (!current) continue
      nextTemplates[rowIndex] = updateLibraryCollectionSpreadsheetTemplate(
        current,
        column.id,
        extractEditedValue(column, edit.value),
        parsedValue.collection,
      )
      changed = true
    }

    return changed ? nextTemplates : null
  }, [parsedValue])

  const handleAddRow = useCallback(async () => {
    if (gridRef.current) {
      await gridRef.current.appendRow(0, true)
      return
    }
    if (!parsedValue) return
    commitTemplates([
      ...parsedValue.templates,
      createLibraryCollectionSpreadsheetTemplate(parsedValue.collection),
    ])
  }, [commitTemplates, parsedValue])

  const handleDeleteRows = useCallback(() => {
    if (!parsedValue || selectedRows.length === 0) return
    const nextTemplates = parsedValue.templates.filter((_, rowIndex) => !selectedRows.includes(rowIndex))
    setGridSelection(EMPTY_SELECTION)
    commitTemplates(nextTemplates)
  }, [commitTemplates, parsedValue, selectedRows])

  const handleDuplicateRows = useCallback(() => {
    if (!parsedValue || selectedRows.length === 0) return
    const duplicates = selectedRows.map(rowIndex => duplicateTemplate(parsedValue.templates[rowIndex]))
    const insertAfter = selectedRows[selectedRows.length - 1] ?? parsedValue.templates.length - 1
    const nextTemplates = [...parsedValue.templates]
    nextTemplates.splice(insertAfter + 1, 0, ...duplicates)
    commitTemplates(nextTemplates)
  }, [commitTemplates, parsedValue, selectedRows])

  const handleCellsEdited = useCallback((edits: readonly EditListItem[]) => {
    if (!parsedValue || edits.length === 0) return false
    const nextTemplates = applyEdits(parsedValue.templates, edits)
    if (!nextTemplates) return false
    commitTemplates(nextTemplates)
    return true
  }, [applyEdits, commitTemplates, parsedValue])

  const handleCellEdited = useCallback((item: readonly [number, number], nextValue: EditableGridCell) => {
    void handleCellsEdited([{ location: item, value: nextValue }])
  }, [handleCellsEdited])

  const handleColumnResize = useCallback((column: GridColumn, newSize: number) => {
    const columnId = typeof column.id === 'string' ? column.id : null
    if (!columnId) return
    setColumnWidths(current => ({
      ...current,
      [columnId]: Math.max(80, Math.min(420, Math.round(newSize))),
    }))
  }, [])

  useImperativeHandle(ref, () => ({
    focus: () => {
      gridRef.current?.focus()
    },
    addRow: () => handleAddRow(),
    deleteSelectedRows: () => {
      handleDeleteRows()
    },
    duplicateSelectedRows: () => {
      handleDuplicateRows()
    },
    copySelection: async () => {
      await gridRef.current?.emit('copy')
    },
    pasteSelection: async () => {
      await gridRef.current?.emit('paste')
    },
    fillDown: async () => {
      await gridRef.current?.emit('fill-down')
    },
    fillRight: async () => {
      await gridRef.current?.emit('fill-right')
    },
    toggleSearch: () => {
      setShowSearch(current => !current)
    },
    toggleFreezeColumns: () => {
      setFreezeColumns(current => current > 0 ? 0 : DEFAULT_FROZEN_COLUMNS)
    },
    resetColumnWidths: () => {
      setColumnWidths({})
    },
    fitColumns: () => {
      gridRef.current?.remeasureColumns(
        CompactSelection.fromSingleSelection([0, LIBRARY_COLLECTION_SPREADSHEET_COLUMNS.length]),
      )
    },
  }), [handleAddRow, handleDeleteRows, handleDuplicateRows])

  const getCellContent = useCallback(([columnIndex, rowIndex]: readonly [number, number]) => {
    if (!parsedValue) {
      return {
        kind: GridCellKind.Text,
        allowOverlay: false,
        readonly: true,
        data: '',
        displayData: '',
      } satisfies GridCell
    }
    const column = LIBRARY_COLLECTION_SPREADSHEET_COLUMNS[columnIndex]
    const template = parsedValue.templates[rowIndex]
    return buildGridCell(column, template, isDark, TEXT, TEXT_DIM)
  }, [TEXT, TEXT_DIM, isDark, parsedValue])

  if (!parsedValue) {
    return (
      <div className="flex h-full min-h-0 min-w-0 items-center justify-center p-6" style={{ background: PAGE_BG }}>
        <div
          className="max-w-lg rounded-2xl border px-5 py-4"
          style={{ borderColor: BORDER, background: PANEL_BG, boxShadow: SHADOW_SOFT }}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full p-2" style={{ background: 'rgba(245, 158, 11, 0.14)', color: '#F59E0B' }}>
              <AlertTriangle size={16} />
            </div>
            <div className="space-y-1">
              <p className="text-[13px] font-semibold" style={{ color: TEXT }}>
                {strings.invalidTitle}
              </p>
              <p className="text-[12px] leading-5" style={{ color: TEXT_DIM }}>
                {strings.invalidDescription}
              </p>
              <p className="text-[11px] leading-5" style={{ color: '#F59E0B' }}>
                {parseError}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden" style={{ background: PAGE_BG }}>
      <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
        <DataEditor
          ref={gridRef}
          width="100%"
          height="100%"
          columns={gridColumns}
          rows={parsedValue.templates.length}
          getCellContent={getCellContent}
          onCellEdited={handleCellEdited}
          onCellsEdited={handleCellsEdited}
          onGridSelectionChange={setGridSelection}
          onPaste={true}
          onColumnResize={handleColumnResize}
          onColumnResizeEnd={handleColumnResize}
          gridSelection={gridSelection}
          theme={gridTheme}
          cellActivationBehavior="double-click"
          fillHandle
          keybindings={{ downFill: true, rightFill: true }}
          freezeColumns={freezeColumns}
          showSearch={showSearch}
          searchValue={searchValue}
          onSearchValueChange={setSearchValue}
          onSearchClose={() => setShowSearch(false)}
          rowSelectionMode="multi"
          rowHeight={34}
          headerHeight={34}
          groupHeaderHeight={28}
          rowMarkers={{ kind: 'both', width: 44 }}
          getCellsForSelection
          smoothScrollX
          smoothScrollY
          overscrollX={180}
          overscrollY={64}
          minColumnWidth={80}
          maxColumnWidth={420}
          onRowAppended={async () => {
            if (!parsedValue) return undefined
            commitTemplates([
              ...parsedValue.templates,
              createLibraryCollectionSpreadsheetTemplate(parsedValue.collection),
            ])
            return 'bottom'
          }}
          trailingRowOptions={{
            hint: strings.addRow,
            tint: true,
          }}
        />
      </div>
    </div>
  )
})
