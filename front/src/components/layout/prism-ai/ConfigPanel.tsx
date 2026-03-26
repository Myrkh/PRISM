import { useState } from 'react'
import { X } from 'lucide-react'
import { usePrismTheme } from '@/styles/usePrismTheme'
import type { ChatConfig } from './types'

export function ConfigPanel({ config, onChange, onClose }: {
  config: ChatConfig
  onChange: (cfg: ChatConfig) => void
  onClose: () => void
}) {
  const { BORDER, TEAL, TEXT, TEXT_DIM, PAGE_BG, isDark } = usePrismTheme()
  const [draft, setDraft] = useState(config)
  const dirty = draft.model !== config.model || draft.systemPrompt !== config.systemPrompt

  const handleSave = () => {
    onChange(draft)
    onClose()
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <div
        className="flex items-center justify-between border-b px-3 py-2.5"
        style={{ borderColor: BORDER }}
      >
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
          Paramètres du chat
        </span>
        <button
          type="button"
          onClick={onClose}
          className="flex h-5 w-5 items-center justify-center rounded transition-colors"
          style={{ color: TEXT_DIM }}
          onMouseEnter={e => { e.currentTarget.style.color = TEXT }}
          onMouseLeave={e => { e.currentTarget.style.color = TEXT_DIM }}
        >
          <X size={12} />
        </button>
      </div>

      <div className="flex flex-col gap-4 p-3">
        {/* System prompt */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
            System prompt
          </label>
          <textarea
            rows={5}
            value={draft.systemPrompt}
            onChange={e => setDraft(d => ({ ...d, systemPrompt: e.target.value }))}
            placeholder="Instructions système pour l'IA…"
            className="w-full resize-none rounded-lg border px-2.5 py-2 text-[11.5px] leading-relaxed outline-none transition-colors"
            style={{
              borderColor: BORDER,
              background: isDark ? 'rgba(255,255,255,0.04)' : PAGE_BG,
              color: TEXT,
            }}
            onFocus={e => { e.currentTarget.style.borderColor = `${TEAL}60` }}
            onBlur={e => { e.currentTarget.style.borderColor = BORDER }}
          />
        </div>

        {/* Save */}
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty}
          className="rounded-lg px-3 py-2 text-[12px] font-semibold transition-all"
          style={{
            background: dirty ? `${TEAL}22` : 'transparent',
            color: dirty ? TEAL : TEXT_DIM,
            border: `1px solid ${dirty ? `${TEAL}40` : BORDER}`,
            opacity: dirty ? 1 : 0.5,
          }}
        >
          Enregistrer
        </button>
      </div>
    </div>
  )
}
