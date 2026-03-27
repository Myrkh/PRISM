import { useEffect, useRef, useState } from 'react'
import { LibraryCollectionMenu } from '@/components/library/LibraryCollectionMenu'
import { usePrismTheme } from '@/styles/usePrismTheme'

export function LibraryCollectionRow({
  name,
  color,
  count,
  active,
  menuColors,
  colorLabel,
  editJsonLabel,
  deleteLabel,
  onSelect,
  onRename,
  onEditJson,
  onDelete,
  onColorChange,
}: {
  name: string
  color: string
  count: number
  active: boolean
  menuColors: readonly string[]
  colorLabel: string
  editJsonLabel: string
  deleteLabel: string
  onSelect: () => void
  onRename: (newName: string) => void
  onEditJson: () => void
  onDelete: () => void
  onColorChange: (color: string) => void
}) {
  const { BORDER, PAGE_BG, SHADOW_CARD, SHADOW_SOFT, SURFACE, TEXT, TEXT_DIM } = usePrismTheme()
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (renaming) inputRef.current?.focus()
  }, [renaming])

  useEffect(() => {
    if (!renaming) setRenameValue(name)
  }, [name, renaming])

  const commitRename = () => {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== name) onRename(trimmed)
    else setRenameValue(name)
    setRenaming(false)
  }

  return (
    <div className="group relative">
      <div
        className="pointer-events-none absolute bottom-1 left-0 top-1 w-0.5 rounded-full transition-[opacity,transform] duration-150 ease-out"
        style={{
          background: color,
          opacity: active ? 1 : 0,
          transform: `translateX(${active ? '0px' : '-1px'}) scaleY(${active ? 1 : 0.6})`,
        }}
      />

      <div
        className="flex w-full items-center gap-1.5 rounded-md py-1.5 pl-2 pr-1 transition-[background-color,border-color,box-shadow] duration-150"
        style={{
          background: active ? SURFACE : 'transparent',
          border: `1px solid ${active ? `${color}24` : 'transparent'}`,
          boxShadow: active ? SHADOW_CARD : 'none',
        }}
        onMouseEnter={event => {
          if (!active) {
            const element = event.currentTarget
            element.style.background = PAGE_BG
            element.style.borderColor = `${BORDER}D0`
            element.style.boxShadow = SHADOW_SOFT
          }
        }}
        onMouseLeave={event => {
          if (!active) {
            const element = event.currentTarget
            element.style.background = 'transparent'
            element.style.borderColor = 'transparent'
            element.style.boxShadow = 'none'
          }
        }}
      >
        <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />

        {renaming ? (
          <input
            ref={inputRef}
            value={renameValue}
            onChange={event => setRenameValue(event.target.value)}
            onBlur={commitRename}
            onKeyDown={event => {
              if (event.key === 'Enter') commitRename()
              if (event.key === 'Escape') {
                setRenameValue(name)
                setRenaming(false)
              }
            }}
            onClick={event => event.stopPropagation()}
            className="min-w-0 flex-1 border-b bg-transparent text-[12px] outline-none"
            style={{ borderColor: color, color: TEXT }}
          />
        ) : (
          <button
            type="button"
            onClick={onSelect}
            onDoubleClick={() => {
              setRenameValue(name)
              setRenaming(true)
            }}
            className="min-w-0 flex-1 truncate text-left text-[12px] font-medium"
            style={{ color: active ? TEXT : TEXT_DIM }}
          >
            {name}
          </button>
        )}

        {!renaming && (
          <span className="shrink-0 font-mono text-[9px] font-bold" style={{ color: active ? color : TEXT_DIM }}>
            {count}
          </span>
        )}

        {!renaming && (
          <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
            <LibraryCollectionMenu
              currentColor={color}
              colorLabel={colorLabel}
              editJsonLabel={editJsonLabel}
              deleteLabel={deleteLabel}
              colors={menuColors}
              onColorChange={onColorChange}
              onEditJson={onEditJson}
              onDelete={onDelete}
            />
          </div>
        )}
      </div>
    </div>
  )
}
