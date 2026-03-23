import type React from 'react'

export type CommandItem = {
  id: string
  label: string
  keywords: string
  Icon: React.ElementType
  onSelect: () => void
  isActive: boolean
  meta?: string
  level?: 0 | 1
  /** Keyboard shortcut hint displayed on the right (e.g. "Ctrl+B") */
  shortcut?: string
  /** Render a thin separator line above this item to start a new sub-category */
  separator?: boolean
}

export type CommandGroup = {
  heading: string
  items: CommandItem[]
}

export type IndexedItem = CommandItem & { flatIndex: number }
export type IndexedGroup = Omit<CommandGroup, 'items'> & { items: IndexedItem[] }
