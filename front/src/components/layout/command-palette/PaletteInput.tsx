/**
 * PaletteInput — the search input shared between TOP and CENTER modes.
 * Renders the mode badge + the text input in a consistent way.
 */
import { useRef, useImperativeHandle, forwardRef } from 'react'
import { Search } from 'lucide-react'
import { usePrismTheme } from '@/styles/usePrismTheme'
import type { ModeConfig } from './modes'

interface Props {
  value: string
  placeholder: string
  modeConfig: ModeConfig | null
  onChange: (raw: string) => void
  onClick?: (e: React.MouseEvent) => void
}

export interface PaletteInputHandle {
  focus: () => void
}

export const PaletteInput = forwardRef<PaletteInputHandle, Props>(
  ({ value, placeholder, modeConfig, onChange, onClick }, ref) => {
    const { TEAL, TEXT, TEXT_DIM } = usePrismTheme()
    const inputRef = useRef<HTMLInputElement>(null)

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
    }))

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVal = modeConfig ? modeConfig.prefix + e.target.value : e.target.value
      onChange(newVal)
    }

    return (
      <>
        <Search size={14} style={{ flexShrink: 0, color: TEAL }} />

        {modeConfig && (
          <span
            className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded"
            style={{
              color:      modeConfig.badgeColor,
              background: `${modeConfig.badgeColor}18`,
              border:     `1px solid ${modeConfig.badgeColor}40`,
            }}
          >
            {modeConfig.badge}
          </span>
        )}

        <input
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onClick={onClick}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-[13px] outline-none min-w-0"
          style={{ color: TEXT }}
          autoComplete="off"
          aria-autocomplete="list"
        />
      </>
    )
  },
)

PaletteInput.displayName = 'PaletteInput'
