import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { usePrismTheme } from '@/styles/usePrismTheme'
import type { AttachableSIF, AttachedContext, AttachedWorkspaceItem } from './types'

export function AttachPicker({
  sifs,
  workspaceItems,
  attachedContext,
  attachedWorkspaceItems,
  onAttachSIF,
  onToggleWorkspaceItem,
  onClose,
}: {
  sifs: AttachableSIF[]
  workspaceItems: AttachedWorkspaceItem[]
  attachedContext: AttachedContext | null
  attachedWorkspaceItems: AttachedWorkspaceItem[]
  onAttachSIF: (sif: AttachableSIF) => void
  onToggleWorkspaceItem: (item: AttachedWorkspaceItem) => void
  onClose: () => void
}) {
  const { BORDER, TEAL, TEXT, TEXT_DIM, PAGE_BG, PANEL_BG, isDark } = usePrismTheme()
  const [query, setQuery] = useState('')
  const normalized = query.trim().toLowerCase()
  const kindLabels: Record<AttachedWorkspaceItem['nodeType'], string> = {
    note: 'Markdown',
    pdf: 'PDF',
    image: 'Image',
    json: 'JSON',
  }

  const filteredSIFs = normalized
    ? sifs.filter(item => `${item.sifNumber} ${item.sifName} ${item.projectName}`.toLowerCase().includes(normalized))
    : sifs
  const filteredWorkspaceItems = normalized
    ? workspaceItems.filter(item => `${item.nodeName} ${item.nodeType}`.toLowerCase().includes(normalized))
    : workspaceItems

  return (
    <div
      className="mb-2 overflow-hidden rounded-xl border"
      style={{ borderColor: BORDER, background: isDark ? 'rgba(0,0,0,0.18)' : PAGE_BG }}
    >
      <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: BORDER, background: PANEL_BG }}>
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
          Joindre du contexte
        </span>
        <button
          type="button"
          onClick={onClose}
          className="flex h-5 w-5 items-center justify-center rounded transition-colors"
          style={{ color: TEXT_DIM }}
          onMouseEnter={e => { e.currentTarget.style.color = TEXT }}
          onMouseLeave={e => { e.currentTarget.style.color = TEXT_DIM }}
        >
          <X size={11} />
        </button>
      </div>

      <div className="border-b p-2" style={{ borderColor: BORDER }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Rechercher une SIF ou un fichier du workspace…"
          className="w-full rounded-lg border px-2.5 py-2 text-[11.5px] outline-none transition-colors"
          style={{
            borderColor: BORDER,
            background: isDark ? 'rgba(255,255,255,0.04)' : PAGE_BG,
            color: TEXT,
          }}
          onFocus={e => { e.currentTarget.style.borderColor = `${TEAL}60` }}
          onBlur={e => { e.currentTarget.style.borderColor = BORDER }}
        />
      </div>

      <div className="max-h-64 overflow-y-auto p-2">
        <div className="flex flex-col gap-1.5">
          <span className="px-1 text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM, opacity: 0.55 }}>
            SIF
          </span>
          {filteredSIFs.length === 0 ? (
            <p className="px-2 py-1 text-[11px]" style={{ color: TEXT_DIM, opacity: 0.55 }}>
              Aucune SIF trouvée.
            </p>
          ) : (
            filteredSIFs.map(item => {
              const active = attachedContext?.sifId === item.sifId
              return (
                <button
                  key={item.sifId}
                  type="button"
                  onClick={() => onAttachSIF(item)}
                  className="flex flex-col items-start rounded-lg border px-3 py-2 text-left transition-colors"
                  style={{
                    borderColor: active ? `${TEAL}50` : BORDER,
                    background: active ? `${TEAL}10` : 'transparent',
                  }}
                >
                  <span className="text-[11.5px] font-medium" style={{ color: TEXT }}>
                    {item.sifNumber} · {item.sifName}
                  </span>
                  <span className="text-[10px]" style={{ color: TEXT_DIM, opacity: 0.7 }}>
                    {item.projectName}
                  </span>
                </button>
              )
            })
          )}
        </div>

        <div className="mt-3 flex flex-col gap-1.5">
          <span className="px-1 text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM, opacity: 0.55 }}>
            Workspace
          </span>
          {filteredWorkspaceItems.length === 0 ? (
            <p className="px-2 py-1 text-[11px]" style={{ color: TEXT_DIM, opacity: 0.55 }}>
              Aucun fichier workspace trouvé.
            </p>
          ) : (
            filteredWorkspaceItems.map(item => {
              const active = attachedWorkspaceItems.some(entry => entry.nodeId === item.nodeId)
              return (
                <button
                  key={item.nodeId}
                  type="button"
                  onClick={() => onToggleWorkspaceItem(item)}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors"
                  style={{
                    borderColor: active ? `${TEAL}50` : BORDER,
                    background: active ? `${TEAL}10` : 'transparent',
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-[11.5px] font-medium" style={{ color: TEXT }}>
                      {item.nodeName}
                    </span>
                    <span className="text-[10px]" style={{ color: TEXT_DIM, opacity: 0.7 }}>
                      {kindLabels[item.nodeType]}
                    </span>
                  </div>
                  {active && <Check size={11} style={{ color: TEAL }} />}
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
