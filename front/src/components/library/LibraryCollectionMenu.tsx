import { useMemo, useState } from 'react'
import { FileJson, MoreHorizontal, Palette, Trash2 } from 'lucide-react'
import { ContextMenu, type ContextMenuItem } from '@/shared/ContextMenu'
import { usePrismTheme } from '@/styles/usePrismTheme'

export function LibraryCollectionMenu({
  currentColor,
  colorLabel,
  editJsonLabel,
  deleteLabel,
  colors,
  onColorChange,
  onEditJson,
  onDelete,
}: {
  currentColor: string
  colorLabel: string
  editJsonLabel: string
  deleteLabel: string
  colors: readonly string[]
  onColorChange: (color: string) => void
  onEditJson: () => void
  onDelete: () => void
}) {
  const { TEXT, TEXT_DIM } = usePrismTheme()
  const [open, setOpen] = useState(false)

  const items = useMemo<ContextMenuItem[]>(() => ([
    {
      kind: 'custom',
      key: 'colors',
      render: (
        <div className="px-3 pb-2 pt-1.5">
          <div className="mb-1.5 flex items-center gap-2 text-[11px] font-medium" style={{ color: TEXT_DIM }}>
            <Palette size={11} />
            <span>{colorLabel}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {colors.map(color => (
              <button
                key={color}
                type="button"
                title={color}
                className="h-5 w-5 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  background: color,
                  borderColor: color === currentColor ? '#FFFFFF' : 'transparent',
                  outline: color === currentColor ? `2px solid ${color}` : 'none',
                  outlineOffset: 1,
                }}
                onClick={() => {
                  onColorChange(color)
                  setOpen(false)
                }}
              />
            ))}
          </div>
        </div>
      ),
    },
    { kind: 'separator', key: 'sep' },
    {
      kind: 'action',
      key: 'json',
      label: editJsonLabel,
      icon: <FileJson size={12} />,
      onClick: onEditJson,
    },
    {
      kind: 'action',
      key: 'delete',
      label: deleteLabel,
      icon: <Trash2 size={12} />,
      danger: true,
      onClick: onDelete,
    },
  ]), [colorLabel, colors, currentColor, deleteLabel, editJsonLabel, onColorChange, onDelete, onEditJson, TEXT_DIM])

  return (
    <div className="relative">
      <button
        type="button"
        onClick={event => {
          event.stopPropagation()
          setOpen(current => !current)
        }}
        className="flex h-5 w-5 items-center justify-center rounded transition-colors"
        style={{ color: TEXT_DIM }}
        onMouseEnter={event => { event.currentTarget.style.color = TEXT }}
        onMouseLeave={event => { event.currentTarget.style.color = TEXT_DIM }}
        title={editJsonLabel}
      >
        <MoreHorizontal size={13} />
      </button>

      {open && <ContextMenu items={items} onClose={() => setOpen(false)} />}
    </div>
  )
}
