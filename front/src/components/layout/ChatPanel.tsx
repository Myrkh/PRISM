/**
 * ChatPanel — PRISM AI chat window
 *
 * Two modes:
 *   floating   — draggable + resizable (default)
 *   maximized  — fixed overlay covering the full workspace (below header + right of rail)
 *
 * Chrome:
 *   [Icon] [PRISM AI] [model badge]  ···  [+] [History] [Config] [Maximize] [Close]
 *
 * Composer:
 *   [textarea]
 *   [Attach] [Model selector]                            [Send]
 *
 * To wire the AI: replace `streamAIResponseStub` with your real implementation.
 * Expected signature:
 *   export async function* streamPRISMAI(
 *     messages: ChatMessage[],
 *     context?: AttachedContext,
 *     config?: ChatConfig,
 *   ): AsyncGenerator<string>
 */
import '@/styles/notePreview.css'
import 'katex/dist/katex.min.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  BookOpen,
  Check,
  ChevronRight,
  Maximize2,
  Minimize2,
  Paperclip,
  Plus,
  Send,
  Settings2,
  Trash2,
  X,
} from 'lucide-react'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { useAppStore } from '@/store/appStore'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { getWorkspaceFileUrl } from '@/lib/workspaceStorage'
import { serializeSIFForAI, streamPRISMAI, type ChatAttachmentPayload, type WorkspaceContext } from '@/lib/aiApi'
import { useMarkdownRender } from '@/components/workspace/note/useMarkdownRender'
import { generateSIFRegistry } from '@/utils/generateSIFRegistry'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface ChatConversation {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: ChatMessage[]
  contextSIFId?: string
  contextSIFName?: string
  attachedWorkspaceItems?: AttachedWorkspaceItem[]
  assistantNoteIds?: Record<string, string>
}

export interface AttachedContext {
  sifId: string
  sifName: string
}

export interface AttachedWorkspaceItem {
  nodeId: string
  nodeName: string
  nodeType: 'note' | 'pdf' | 'image'
}

type AttachableSIF = {
  sifId: string
  sifName: string
  sifNumber: string
  projectName: string
}

export interface ChatConfig {
  model: string
  systemPrompt: string
}

// ─── Persistence ──────────────────────────────────────────────────────────────
const CONVS_KEY   = 'prism_chat_conversations'
const CONFIG_KEY  = 'prism_chat_config'
const ACTIVE_CONV_KEY = 'prism_chat_active_conversation'

const DEFAULT_CONFIG: ChatConfig = {
  model: 'claude-sonnet-4-6',
  systemPrompt: 'Tu es PRISM AI, un assistant expert en sécurité fonctionnelle IEC 61511. Tu aides les ingénieurs à analyser les SIF, calculer les niveaux SIL, et structurer les dossiers de preuve.',
}

const MODELS = [
  { id: 'claude-sonnet-4-6',   label: 'Claude Sonnet 4.6',  badge: 'Anthropic',  group: 'Anthropic' },
  { id: 'claude-opus-4-6',     label: 'Claude Opus 4.6',    badge: 'Puissant',   group: 'Anthropic' },
  { id: 'claude-haiku-4-5',    label: 'Claude Haiku 4.5',   badge: 'Rapide',     group: 'Anthropic' },
  { id: 'mistral-large-latest',label: 'Mistral Large',       badge: 'Souverain',  group: 'Mistral AI' },
  { id: 'mistral-small-latest',label: 'Mistral Small',       badge: 'Économique', group: 'Mistral AI' },
  { id: 'mistral-nemo',        label: 'Mistral Nemo',        badge: 'Local',      group: 'Mistral AI' },
]

function loadConversations(): ChatConversation[] {
  try { return JSON.parse(localStorage.getItem(CONVS_KEY) ?? '[]') } catch { return [] }
}
function saveConversations(convs: ChatConversation[]) {
  localStorage.setItem(CONVS_KEY, JSON.stringify(convs.slice(0, 50)))
}
function loadActiveConversationId(): string | null {
  try { return localStorage.getItem(ACTIVE_CONV_KEY) } catch { return null }
}
function saveActiveConversationId(id: string | null) {
  try {
    if (id) localStorage.setItem(ACTIVE_CONV_KEY, id)
    else localStorage.removeItem(ACTIVE_CONV_KEY)
  } catch {
    // ignore quota / storage errors
  }
}
function loadConfig(): ChatConfig {
  try { return { ...DEFAULT_CONFIG, ...JSON.parse(localStorage.getItem(CONFIG_KEY) ?? '{}') } } catch { return DEFAULT_CONFIG }
}
function saveConfig(cfg: ChatConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg))
}

function genId() { return Math.random().toString(36).slice(2) + Date.now().toString(36) }

function titleFromMessages(msgs: ChatMessage[]): string {
  const first = msgs.find(m => m.role === 'user')
  if (!first) return 'Nouveau chat'
  return first.content.slice(0, 44) + (first.content.length > 44 ? '…' : '')
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000)  return 'À l\'instant'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h`
  return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

// ─── AI stub — replace with real implementation ───────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function* streamAIResponseStub(_msgs: ChatMessage[], _ctx?: AttachedContext, _cfg?: ChatConfig): AsyncGenerator<string> {
  await new Promise(r => setTimeout(r, 600))
  const reply = _ctx
    ? `Je vois que vous avez joint le SIF **${_ctx.sifName}** comme contexte. L'assistant PRISM AI sera bientôt disponible pour analyser ce SIF, calculer les niveaux SIL et vous guider dans la conformité IEC 61511.`
    : 'L\'assistant PRISM AI arrive prochainement — analyse SIL contextuelle, suggestions architecture, diagnostic IEC 61511.'
  // Simulate streaming word by word
  for (const word of reply.split(' ')) {
    await new Promise(r => setTimeout(r, 40))
    yield word + ' '
  }
}

// ─── Layout constants ─────────────────────────────────────────────────────────
const HEADER_H = 48
const RAIL_W   = 48
const STATUS_H = 24
const FLOAT_W  = 380
const FLOAT_H  = 560
const MIN_W    = 280
const MIN_H    = 240
const HANDLE   = 6

// ─── Composite icon: MessageSquare + Sparkles badge ──────────────────────────
export function ChatIcon({ size = 16, color }: { size?: number; color: string }) {
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      <svg
        width={Math.round(size * 0.52)}
        height={Math.round(size * 0.52)}
        viewBox="0 0 24 24"
        fill={color}
        stroke="none"
        style={{ position: 'absolute', bottom: -2, right: -3 }}
      >
        <path d="M12 2 L13.5 10.5 L22 12 L13.5 13.5 L12 22 L10.5 13.5 L2 12 L10.5 10.5 Z" />
      </svg>
    </span>
  )
}

// ─── Resize handle ────────────────────────────────────────────────────────────
type Edge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
const EDGE_CURSOR: Record<Edge, string> = {
  n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize',
  ne: 'nesw-resize', sw: 'nesw-resize', nw: 'nwse-resize', se: 'nwse-resize',
}

function ResizeHandle({ edge, onPD, onPM, onPU }: {
  edge: Edge
  onPD: (e: React.PointerEvent<HTMLDivElement>) => void
  onPM: (e: React.PointerEvent<HTMLDivElement>) => void
  onPU: () => void
}) {
  const style: React.CSSProperties = {
    position: 'absolute', cursor: EDGE_CURSOR[edge], zIndex: 10,
    ...(edge === 'n'  && { top: 0,    left: HANDLE,  right: HANDLE,  height: HANDLE }),
    ...(edge === 's'  && { bottom: 0, left: HANDLE,  right: HANDLE,  height: HANDLE }),
    ...(edge === 'e'  && { right: 0,  top: HANDLE,   bottom: HANDLE, width: HANDLE  }),
    ...(edge === 'w'  && { left: 0,   top: HANDLE,   bottom: HANDLE, width: HANDLE  }),
    ...(edge === 'ne' && { top: 0,    right: 0,  width: HANDLE * 2, height: HANDLE * 2 }),
    ...(edge === 'nw' && { top: 0,    left: 0,   width: HANDLE * 2, height: HANDLE * 2 }),
    ...(edge === 'se' && { bottom: 0, right: 0,  width: HANDLE * 2, height: HANDLE * 2 }),
    ...(edge === 'sw' && { bottom: 0, left: 0,   width: HANDLE * 2, height: HANDLE * 2 }),
  }
  return (
    <div
      style={style}
      onPointerDown={e => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); onPD(e) }}
      onPointerMove={onPM}
      onPointerUp={onPU}
    />
  )
}

// ─── Window action button ─────────────────────────────────────────────────────
function WinBtn({ Icon, title, onClick, active, danger }: {
  Icon: React.ElementType
  title: string
  onClick?: () => void
  active?: boolean
  danger?: boolean
}) {
  const { TEAL, TEXT_DIM, isDark } = usePrismTheme()
  const dangerColor = '#F87171'
  const color = danger ? dangerColor : active ? TEAL : TEXT_DIM
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded transition-all"
      style={{ color }}
      onMouseEnter={e => {
        e.currentTarget.style.background = danger
          ? `${dangerColor}18`
          : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
        e.currentTarget.style.color = danger ? dangerColor : active ? TEAL : TEXT_DIM
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color = color
      }}
    >
      <Icon size={13} />
    </button>
  )
}

function MarkdownMessage({ markdown }: { markdown: string }) {
  const { BORDER, PANEL_BG, TEAL, TEAL_DIM, TEXT, TEXT_DIM, isDark } = usePrismTheme()
  const { html } = useMarkdownRender(markdown)

  return (
    <div
      className="prism-note-preview"
      style={{
        ['--prism-page' as string]: 'transparent',
        ['--prism-panel' as string]: PANEL_BG,
        ['--prism-card' as string]: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
        ['--prism-border' as string]: BORDER,
        ['--prism-text' as string]: TEXT,
        ['--prism-text-dim' as string]: TEXT_DIM,
        ['--prism-teal' as string]: TEAL,
        ['--prism-teal-dim' as string]: TEAL_DIM,
        ['--prism-code-bg' as string]: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
        ['--prism-row-hover' as string]: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        ['--prism-preview-max-width' as string]: 'none',
        padding: 0,
        margin: 0,
        height: 'auto',
        overflowY: 'visible',
        background: 'transparent',
        fontSize: '12.5px',
        lineHeight: 1.65,
      }}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html || '<p style="opacity:0.45;font-style:italic">…</p>' }}
    />
  )
}

function deriveAssistantNoteName(markdown: string): string {
  const firstMeaningfulLine = markdown
    .split('\n')
    .map(line => line.trim())
    .find(line => line.length > 0)

  const cleaned = (firstMeaningfulLine ?? '')
    .replace(/^#{1,6}\s*/, '')
    .replace(/^[-*+]\s+/, '')
    .replace(/^\d+\.\s+/, '')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/[`*_>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  const base = cleaned || 'Note'
  const truncated = base.length > 56 ? `${base.slice(0, 55).trim()}...` : base
  return `PRISM AI - ${truncated}`
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({
  msg,
  noteId,
  noteActionsEnabled,
  createNoteLabel,
  openNoteLabel,
  onNoteAction,
}: {
  msg: ChatMessage
  noteId?: string
  noteActionsEnabled: boolean
  createNoteLabel: string
  openNoteLabel: string
  onNoteAction: (msg: ChatMessage) => void
}) {
  const { TEAL, TEXT, TEXT_DIM, BORDER, PAGE_BG, isDark } = usePrismTheme()
  const isUser = msg.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[85%] rounded-2xl rounded-tr-sm px-3 py-2 text-[12.5px] leading-relaxed"
          style={{
            background: `${TEAL}18`,
            border: `1px solid ${TEAL}30`,
            color: TEXT,
          }}
        >
          {msg.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <div
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
        style={{ background: `${TEAL}18`, border: `1px solid ${TEAL}28` }}
      >
        <ChatIcon size={10} color={TEAL} />
      </div>
      <div className="flex max-w-[85%] flex-col items-start gap-1.5">
        <div
          className="w-full rounded-2xl rounded-tl-sm px-3 py-2 text-[12.5px] leading-relaxed"
          style={{
            background: isDark ? 'rgba(255,255,255,0.04)' : PAGE_BG,
            border: `1px solid ${BORDER}`,
            color: TEXT,
          }}
        >
          {msg.content ? (
            <MarkdownMessage markdown={msg.content} />
          ) : (
            <span className="flex gap-1 py-0.5">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="inline-block h-1.5 w-1.5 rounded-full animate-bounce"
                  style={{ background: TEAL, animationDelay: `${i * 150}ms` }}
                />
              ))}
            </span>
          )}
        </div>
        {noteActionsEnabled && msg.content.trim() && (
          <button
            type="button"
            onClick={() => onNoteAction(msg)}
            className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-medium transition-colors"
            style={{
              borderColor: noteId ? `${TEAL}35` : BORDER,
              background: noteId ? `${TEAL}10` : 'transparent',
              color: noteId ? TEAL : TEXT_DIM,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = noteId ? `${TEAL}16` : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)')
              e.currentTarget.style.borderColor = noteId ? `${TEAL}45` : `${TEAL}28`
              e.currentTarget.style.color = noteId ? TEAL : TEXT
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = noteId ? `${TEAL}10` : 'transparent'
              e.currentTarget.style.borderColor = noteId ? `${TEAL}35` : BORDER
              e.currentTarget.style.color = noteId ? TEAL : TEXT_DIM
            }}
          >
            {noteId ? <BookOpen size={11} /> : <Plus size={11} />}
            <span>{noteId ? openNoteLabel : createNoteLabel}</span>
          </button>
        )}
      </div>
    </div>
  )
}

// ─── History sidebar ──────────────────────────────────────────────────────────
function HistorySidebar({ conversations, currentId, onLoad, onDelete, onClose }: {
  conversations: ChatConversation[]
  currentId: string | null
  onLoad: (conv: ChatConversation) => void
  onDelete: (id: string, e: React.MouseEvent) => void
  onClose: () => void
}) {
  const { BORDER, TEAL, TEXT, TEXT_DIM, PAGE_BG, PANEL_BG, isDark } = usePrismTheme()
  return (
    <div
      className="flex h-full w-52 shrink-0 flex-col border-r"
      style={{ borderColor: BORDER, background: isDark ? 'rgba(0,0,0,0.2)' : PAGE_BG }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between border-b px-3 py-2"
        style={{ borderColor: BORDER }}
      >
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
          Historique
        </span>
        <button
          type="button"
          onClick={onClose}
          className="flex h-5 w-5 items-center justify-center rounded transition-colors"
          style={{ color: TEXT_DIM }}
          onMouseEnter={e => { e.currentTarget.style.color = TEXT }}
          onMouseLeave={e => { e.currentTarget.style.color = TEXT_DIM }}
        >
          <ChevronRight size={12} />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-1">
        {conversations.length === 0 ? (
          <p className="px-3 py-4 text-center text-[11px]" style={{ color: TEXT_DIM, opacity: 0.5 }}>
            Aucune conversation
          </p>
        ) : (
          conversations.map(conv => (
            <button
              key={conv.id}
              type="button"
              onClick={() => onLoad(conv)}
              className="group relative flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left transition-colors"
              style={{
                background: conv.id === currentId ? `${TEAL}10` : 'transparent',
                borderLeft: conv.id === currentId ? `2px solid ${TEAL}` : '2px solid transparent',
              }}
              onMouseEnter={e => {
                if (conv.id !== currentId) e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'
              }}
              onMouseLeave={e => {
                if (conv.id !== currentId) e.currentTarget.style.background = 'transparent'
              }}
            >
              <span className="w-full truncate text-[11.5px] font-medium leading-tight" style={{ color: TEXT }}>
                {conv.title}
              </span>
              <span className="text-[10px]" style={{ color: TEXT_DIM, opacity: 0.6 }}>
                {formatRelativeTime(conv.updatedAt)}
              </span>
              {/* Delete button */}
              <span
                role="button"
                tabIndex={-1}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-100"
                style={{ color: TEXT_DIM }}
                onMouseEnter={e => { e.currentTarget.style.color = '#F87171' }}
                onMouseLeave={e => { e.currentTarget.style.color = TEXT_DIM }}
                onClick={e => onDelete(conv.id, e as unknown as React.MouseEvent)}
              >
                <Trash2 size={10} />
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

// ─── Config panel ─────────────────────────────────────────────────────────────
function ConfigPanel({ config, onChange, onClose }: {
  config: ChatConfig
  onChange: (cfg: ChatConfig) => void
  onClose: () => void
}) {
  const { BORDER, TEAL, TEXT, TEXT_DIM, PAGE_BG, PANEL_BG, isDark } = usePrismTheme()
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

// ─── Attach picker ───────────────────────────────────────────────────────────
function AttachPicker({
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

// ─── Main component ───────────────────────────────────────────────────────────
interface ChatPanelProps {
  onClose: () => void
}

export function ChatPanel({ onClose }: ChatPanelProps) {
  const { BORDER, PANEL_BG, PAGE_BG, TEAL, TEAL_DIM, TEXT, TEXT_DIM, isDark } = usePrismTheme()

  // ── Store: current SIF context ──────────────────────────────────────────────
  const view     = useAppStore(s => s.view)
  const navigate = useAppStore(s => s.navigate)
  const projects = useAppStore(s => s.projects)
  const prismFiles = useAppStore(s => s.prismFiles)
  const appLocale = useAppStore(s => s.preferences.language)
  const workspaceNodes = useWorkspaceStore(s => s.nodes)
  const createWorkspaceNote = useWorkspaceStore(s => s.createNote)
  const updateWorkspaceNoteContent = useWorkspaceStore(s => s.updateNoteContent)
  const openWorkspaceTab = useWorkspaceStore(s => s.openTab)
  const clearWorkspacePendingRename = useWorkspaceStore(s => s.clearPendingRename)
  const currentSIF = view.type === 'sif-dashboard'
    ? projects.flatMap(p => p.sifs).find(s => s.id === view.sifId) ?? null
    : null
  const allSIFs: AttachableSIF[] = projects
    .flatMap(project => project.sifs.map(sif => ({
      sifId: sif.id,
      sifName: sif.title || 'Sans titre',
      sifNumber: sif.sifNumber || 'SIF',
      projectName: project.name,
    })))
    .sort((a, b) => `${a.sifNumber} ${a.sifName}`.localeCompare(`${b.sifNumber} ${b.sifName}`, 'fr', { sensitivity: 'base' }))
  const workspaceItems: AttachedWorkspaceItem[] = Object.values(workspaceNodes)
    .filter(node => node.type === 'note' || node.type === 'pdf' || node.type === 'image')
    .map(node => ({
      nodeId: node.id,
      nodeName: node.name,
      nodeType: node.type,
    }))
    .sort((a, b) => a.nodeName.localeCompare(b.nodeName, 'fr', { sensitivity: 'base' }))
  const createNoteLabel = appLocale === 'fr' ? 'Créer une note' : 'Create note'
  const openNoteLabel = appLocale === 'fr' ? 'Ouvrir la note' : 'Open note'

  // ── Chat state ──────────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState<ChatConversation[]>(loadConversations)
  const initialActiveConversation = (() => {
    const activeId = loadActiveConversationId()
    if (!activeId) return null
    return conversations.find(conv => conv.id === activeId) ?? null
  })()
  const [currentConvId, setCurrentConvId] = useState<string | null>(initialActiveConversation?.id ?? null)
  const [messages, setMessages]           = useState<ChatMessage[]>(initialActiveConversation?.messages ?? [])
  const [input, setInput]                 = useState('')
  const [isStreaming, setIsStreaming]     = useState(false)
  const [attachedContext, setAttachedContext] = useState<AttachedContext | null>(
    initialActiveConversation?.contextSIFId
      ? { sifId: initialActiveConversation.contextSIFId, sifName: initialActiveConversation.contextSIFName ?? '' }
      : null,
  )
  const [attachedWorkspaceItems, setAttachedWorkspaceItems] = useState<AttachedWorkspaceItem[]>(initialActiveConversation?.attachedWorkspaceItems ?? [])
  const [config, setConfig]               = useState<ChatConfig>(loadConfig)
  const [assistantNoteIds, setAssistantNoteIds] = useState<Record<string, string>>(initialActiveConversation?.assistantNoteIds ?? {})

  // ── UI state ────────────────────────────────────────────────────────────────
  const [historyOpen, setHistoryOpen]   = useState(false)
  const [configOpen, setConfigOpen]     = useState(false)
  const [attachPickerOpen, setAttachPickerOpen] = useState(false)
  const [maximized, setMaximized]       = useState(false)

  // ── Window geometry ─────────────────────────────────────────────────────────
  const [pos,  setPos]  = useState(() => ({
    x: Math.max(RAIL_W + 16, window.innerWidth - FLOAT_W - 80),
    y: HEADER_H + 16,
  }))
  const [size, setSize] = useState({ w: FLOAT_W, h: FLOAT_H })

  // ── Drag ────────────────────────────────────────────────────────────────────
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null)

  const onDragDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: pos.x, oy: pos.y }
    e.currentTarget.setPointerCapture(e.pointerId)
    e.preventDefault()
  }, [pos])

  const onDragMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    setPos({
      x: Math.max(0, dragRef.current.ox + e.clientX - dragRef.current.startX),
      y: Math.max(0, dragRef.current.oy + e.clientY - dragRef.current.startY),
    })
  }, [])

  const onDragUp = useCallback(() => { dragRef.current = null }, [])

  // ── Resize ──────────────────────────────────────────────────────────────────
  const resizeRef = useRef<{
    edge: Edge; startX: number; startY: number
    startW: number; startH: number; startPX: number; startPY: number
  } | null>(null)

  const onResizeDown = useCallback((edge: Edge, e: React.PointerEvent<HTMLDivElement>) => {
    resizeRef.current = {
      edge, startX: e.clientX, startY: e.clientY,
      startW: size.w, startH: size.h, startPX: pos.x, startPY: pos.y,
    }
  }, [size, pos])

  const onResizeMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const r = resizeRef.current
    if (!r) return
    const dx = e.clientX - r.startX
    const dy = e.clientY - r.startY
    let { startW: w, startH: h, startPX: x, startPY: y } = r
    if (r.edge.includes('e')) w = Math.max(MIN_W, w + dx)
    if (r.edge.includes('s')) h = Math.max(MIN_H, h + dy)
    if (r.edge.includes('w')) { w = Math.max(MIN_W, w - dx); x = r.startPX + r.startW - w }
    if (r.edge.includes('n')) { h = Math.max(MIN_H, h - dy); y = r.startPY + r.startH - h }
    setSize({ w, h })
    setPos({ x, y })
  }, [])

  const onResizeUp = useCallback(() => { resizeRef.current = null }, [])

  const makeRP = (edge: Edge) => ({
    edge,
    onPD: (e: React.PointerEvent<HTMLDivElement>) => onResizeDown(edge, e),
    onPM: onResizeMove,
    onPU: onResizeUp,
  })

  // ── Conversation persistence ─────────────────────────────────────────────────
  const persistCurrentConversation = useCallback((
    msgs: ChatMessage[],
    ctx: AttachedContext | null,
    workspaceItemsToPersist: AttachedWorkspaceItem[],
    convId: string | null,
    assistantNotesToPersist: Record<string, string>,
  ) => {
    if (msgs.length === 0) return convId
    const id = convId ?? genId()
    const conv: ChatConversation = {
      id,
      title: titleFromMessages(msgs),
      createdAt: msgs[0].timestamp,
      updatedAt: Date.now(),
      messages: msgs,
      contextSIFId: ctx?.sifId,
      contextSIFName: ctx?.sifName,
      attachedWorkspaceItems: workspaceItemsToPersist,
      assistantNoteIds: assistantNotesToPersist,
    }
    setConversations(prev => {
      const next = [conv, ...prev.filter(c => c.id !== id)]
      saveConversations(next)
      return next
    })
    saveActiveConversationId(id)
    return id
  }, [])

  // ── New chat ────────────────────────────────────────────────────────────────
  const handleNewChat = useCallback(() => {
    persistCurrentConversation(messages, attachedContext, attachedWorkspaceItems, currentConvId, assistantNoteIds)
    setMessages([])
    setAssistantNoteIds({})
    setCurrentConvId(null)
    saveActiveConversationId(null)
    setAttachedContext(null)
    setAttachedWorkspaceItems([])
    setAttachPickerOpen(false)
    setHistoryOpen(false)
    setConfigOpen(false)
  }, [messages, attachedContext, attachedWorkspaceItems, currentConvId, assistantNoteIds, persistCurrentConversation])

  // ── Load conversation ────────────────────────────────────────────────────────
  const handleLoadConversation = useCallback((conv: ChatConversation) => {
    persistCurrentConversation(messages, attachedContext, attachedWorkspaceItems, currentConvId, assistantNoteIds)
    setMessages(conv.messages)
    setAssistantNoteIds(conv.assistantNoteIds ?? {})
    setCurrentConvId(conv.id)
    saveActiveConversationId(conv.id)
    setAttachedContext(conv.contextSIFId ? { sifId: conv.contextSIFId, sifName: conv.contextSIFName ?? '' } : null)
    setAttachedWorkspaceItems(conv.attachedWorkspaceItems ?? [])
    setAttachPickerOpen(false)
    setHistoryOpen(false)
  }, [messages, attachedContext, attachedWorkspaceItems, currentConvId, assistantNoteIds, persistCurrentConversation])

  // ── Delete conversation ──────────────────────────────────────────────────────
  const handleDeleteConversation = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setConversations(prev => {
      const next = prev.filter(c => c.id !== id)
      saveConversations(next)
      return next
    })
    if (currentConvId === id) {
      setMessages([])
      setAssistantNoteIds({})
      setCurrentConvId(null)
      saveActiveConversationId(null)
    }
  }, [currentConvId])

  // ── Attachments ───────────────────────────────────────────────────────────────
  const toggleAttachPicker = useCallback(() => {
    setAttachPickerOpen(open => !open)
    setHistoryOpen(false)
    setConfigOpen(false)
  }, [])

  const handleAttachSIFSelection = useCallback((sif: AttachableSIF) => {
    setAttachedContext({ sifId: sif.sifId, sifName: sif.sifName })
    setAttachPickerOpen(false)
  }, [])

  const toggleWorkspaceAttachment = useCallback((item: AttachedWorkspaceItem) => {
    setAttachedWorkspaceItems(prev => (
      prev.some(entry => entry.nodeId === item.nodeId)
        ? prev.filter(entry => entry.nodeId !== item.nodeId)
        : [...prev, item]
    ))
  }, [])

  const removeWorkspaceAttachment = useCallback((nodeId: string) => {
    setAttachedWorkspaceItems(prev => prev.filter(entry => entry.nodeId !== nodeId))
  }, [])

  // ── Config save ──────────────────────────────────────────────────────────────
  const handleConfigChange = useCallback((cfg: ChatConfig) => {
    setConfig(cfg)
    saveConfig(cfg)
  }, [])

  const findExistingAssistantNoteId = useCallback((msg: ChatMessage) => {
    const mappedNoteId = assistantNoteIds[msg.id]
    if (mappedNoteId) return mappedNoteId

    const expectedName = deriveAssistantNoteName(msg.content)
    return Object.values(workspaceNodes).find(node => (
      node.type === 'note'
      && node.name === expectedName
      && node.content === msg.content
    ))?.id
  }, [assistantNoteIds, workspaceNodes])

  useEffect(() => {
    const recoveredAssistantNoteIds = messages.reduce<Record<string, string>>((acc, msg) => {
      if (msg.role !== 'assistant' || assistantNoteIds[msg.id] || !msg.content.trim()) return acc
      const noteId = findExistingAssistantNoteId(msg)
      if (noteId) acc[msg.id] = noteId
      return acc
    }, {})

    if (Object.keys(recoveredAssistantNoteIds).length === 0) return

    const nextAssistantNoteIds = { ...assistantNoteIds, ...recoveredAssistantNoteIds }
    setAssistantNoteIds(nextAssistantNoteIds)
    const persistedConvId = persistCurrentConversation(messages, attachedContext, attachedWorkspaceItems, currentConvId, nextAssistantNoteIds)
    if (persistedConvId && !currentConvId) setCurrentConvId(persistedConvId)
  }, [assistantNoteIds, attachedContext, attachedWorkspaceItems, currentConvId, findExistingAssistantNoteId, messages, persistCurrentConversation])

  const handleAssistantNoteAction = useCallback((msg: ChatMessage) => {
    if (msg.role !== 'assistant' || !msg.content.trim()) return

    const existingNoteId = findExistingAssistantNoteId(msg)
    if (existingNoteId) {
      openWorkspaceTab(existingNoteId)
      navigate({ type: 'note', noteId: existingNoteId })

      if (assistantNoteIds[msg.id] !== existingNoteId) {
        const nextAssistantNoteIds = { ...assistantNoteIds, [msg.id]: existingNoteId }
        setAssistantNoteIds(nextAssistantNoteIds)
        const persistedConvId = persistCurrentConversation(messages, attachedContext, attachedWorkspaceItems, currentConvId, nextAssistantNoteIds)
        if (persistedConvId && !currentConvId) setCurrentConvId(persistedConvId)
      }
      return
    }

    const noteId = createWorkspaceNote(null, deriveAssistantNoteName(msg.content))
    updateWorkspaceNoteContent(noteId, msg.content)
    clearWorkspacePendingRename()
    openWorkspaceTab(noteId)
    navigate({ type: 'note', noteId })
    const nextAssistantNoteIds = { ...assistantNoteIds, [msg.id]: noteId }
    setAssistantNoteIds(nextAssistantNoteIds)
    const persistedConvId = persistCurrentConversation(messages, attachedContext, attachedWorkspaceItems, currentConvId, nextAssistantNoteIds)
    if (persistedConvId && !currentConvId) setCurrentConvId(persistedConvId)
  }, [assistantNoteIds, attachedContext, attachedWorkspaceItems, clearWorkspacePendingRename, createWorkspaceNote, currentConvId, findExistingAssistantNoteId, messages, navigate, openWorkspaceTab, persistCurrentConversation, updateWorkspaceNoteContent])

  // ── Send message ─────────────────────────────────────────────────────────────
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isStreaming) return

    const userMsg: ChatMessage = { id: genId(), role: 'user', content: text, timestamp: Date.now() }
    const updatedMsgs = [...messages, userMsg]
    setMessages(updatedMsgs)
    setInput('')
    setIsStreaming(true)

    const assistantId = genId()
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', timestamp: Date.now() }])

    try {
      const attachedSIF = attachedContext?.sifId
        ? projects.flatMap(project => project.sifs).find(sif => sif.id === attachedContext.sifId) ?? null
        : null
      const contextSIF = attachedSIF ?? currentSIF
      const workspaceContext: WorkspaceContext = {
        context_md: prismFiles['context.md'] ?? '',
        conventions_md: prismFiles['conventions.md'] ?? '',
        standards_md: prismFiles['standards.md'] ?? '',
        sif_registry_md: generateSIFRegistry(projects),
        active_sif_json: contextSIF ? serializeSIFForAI(contextSIF) : undefined,
      }
      const workspaceAttachments: ChatAttachmentPayload[] = []
      for (const item of attachedWorkspaceItems) {
        const node = workspaceNodes[item.nodeId]
        if (!node) continue
        if (node.type === 'note') {
          workspaceAttachments.push({
            kind: 'note',
            node_id: node.id,
            name: node.name,
            content: node.content,
          })
          continue
        }
        if (node.type === 'pdf' || node.type === 'image') {
          let url: string | undefined
          try {
            url = await getWorkspaceFileUrl(node.storageKey)
          } catch {
            url = undefined
          }
          workspaceAttachments.push({
            kind: node.type,
            node_id: node.id,
            name: node.name,
            ...(url ? { url } : {}),
          })
        }
      }

      let accumulated = ''
      for await (const chunk of streamPRISMAI(
        updatedMsgs,
        attachedContext ?? undefined,
        config,
        workspaceContext,
        workspaceAttachments,
      )) {
        accumulated += chunk
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: accumulated } : m))
      }
      // Persist after assistant replies
      const finalMsgs = [...updatedMsgs, { id: assistantId, role: 'assistant' as const, content: accumulated, timestamp: Date.now() }]
      const newId = persistCurrentConversation(finalMsgs, attachedContext, attachedWorkspaceItems, currentConvId, assistantNoteIds)
      if (newId && !currentConvId) setCurrentConvId(newId)
    } finally {
      setIsStreaming(false)
    }
  }, [input, isStreaming, messages, attachedContext, attachedWorkspaceItems, assistantNoteIds, config, currentConvId, currentSIF, persistCurrentConversation, prismFiles, projects, workspaceNodes])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }, [handleSend])

  // ── Styles ───────────────────────────────────────────────────────────────────
  const shadow = isDark
    ? '0 32px 64px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.4), inset 1px 0 0 rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)'
    : '0 32px 64px rgba(15,23,42,0.22), 0 8px 24px rgba(15,23,42,0.14), inset 1px 0 0 rgba(255,255,255,0.8), inset 0 1px 0 rgba(255,255,255,0.95)'

  const maxStyle: React.CSSProperties = {
    position: 'fixed', left: RAIL_W, top: HEADER_H, right: 0, bottom: STATUS_H,
    width: 'auto', height: 'auto', borderRadius: 0,
  }
  const floatStyle: React.CSSProperties = {
    position: 'fixed', left: pos.x, top: pos.y, width: size.w, height: size.h,
  }

  const attachmentCount = (attachedContext ? 1 : 0) + attachedWorkspaceItems.length

  return createPortal(
    <div
      className="flex flex-col overflow-hidden border"
      style={{
        ...(maximized ? maxStyle : floatStyle),
        zIndex: 9000,
        borderColor: maximized ? BORDER : `${TEAL}28`,
        background: PANEL_BG,
        backgroundImage: isDark
          ? 'linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0) 80px)'
          : 'none',
        boxShadow: shadow,
        borderRadius: maximized ? 0 : 14,
      }}
    >
      {/* Resize handles — floating only */}
      {!maximized && (['n','s','e','w','ne','nw','se','sw'] as Edge[]).map(edge => (
        <ResizeHandle key={edge} {...makeRP(edge)} />
      ))}

      {/* ── Chrome header ───────────────────────────────────────────────────── */}
      <div
        className="flex shrink-0 select-none items-center gap-1 px-2.5"
        style={{
          height: 38,
          cursor: maximized ? 'default' : 'grab',
          borderBottom: `1px solid ${BORDER}`,
          background: isDark ? `${TEAL}0A` : `${TEAL}07`,
        }}
        onPointerDown={maximized ? undefined : onDragDown}
        onPointerMove={maximized ? undefined : onDragMove}
        onPointerUp={maximized ? undefined : onDragUp}
      >
        <img
          src="/prism_ai.png"
          alt="PRISM AI"
          className="h-6 w-auto shrink-0 select-none object-contain"
          draggable={false}
        />
        <span className="ml-1 text-[11px] font-bold tracking-wide" style={{ color: TEAL }}>
          PRISM AI
        </span>

        <div className="flex-1" />

        <div className="flex items-center gap-0.5" style={{ pointerEvents: 'auto' }}>
          <WinBtn Icon={Plus}     title="Nouveau chat (⌘N)"                   onClick={handleNewChat} />
          <WinBtn Icon={BookOpen} title="Historique des conversations"          onClick={() => { setHistoryOpen(v => !v); setConfigOpen(false) }} active={historyOpen} />

          <div className="mx-1 h-3.5 w-px" style={{ background: BORDER }} />

          <WinBtn Icon={Settings2} title="Paramètres du chat" onClick={() => { setConfigOpen(v => !v); setHistoryOpen(false) }} active={configOpen} />
          <WinBtn
            Icon={maximized ? Minimize2 : Maximize2}
            title={maximized ? 'Réduire (restaurer en fenêtre)' : 'Maximiser (plein workspace)'}
            onClick={() => setMaximized(v => !v)}
            active={maximized}
          />
          <WinBtn Icon={X} title="Fermer" onClick={onClose} danger />
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* History sidebar */}
        {historyOpen && (
          <HistorySidebar
            conversations={conversations}
            currentId={currentConvId}
            onLoad={handleLoadConversation}
            onDelete={handleDeleteConversation}
            onClose={() => setHistoryOpen(false)}
          />
        )}

        {/* Main content or config */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {configOpen ? (
            <ConfigPanel config={config} onChange={handleConfigChange} onClose={() => setConfigOpen(false)} />
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-3 py-3">
                {messages.length === 0 ? (
                  /* Empty state */
                  <div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
                    <img
                      src="/prism_ai.png"
                      alt="PRISM AI"
                      className="h-24 w-auto select-none object-contain"
                      draggable={false}
                    />
                    <div>
                      <p className="text-[12.5px] font-semibold" style={{ color: TEXT_DIM }}>PRISM AI</p>
                      <p className="mt-1.5 text-[11px] leading-relaxed max-w-[220px]" style={{ color: TEXT_DIM, opacity: 0.55 }}>
                        Analyse SIL contextuelle, suggestions architecture IEC 61511, diagnostic en langage naturel.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {messages.map(msg => (
                      <MessageBubble
                        key={msg.id}
                        msg={msg}
                        noteId={findExistingAssistantNoteId(msg)}
                        noteActionsEnabled={!isStreaming}
                        createNoteLabel={createNoteLabel}
                        openNoteLabel={openNoteLabel}
                        onNoteAction={handleAssistantNoteAction}
                      />
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Input area */}
              <div
                className="shrink-0 border-t px-2.5 py-2"
                style={{ borderColor: BORDER }}
              >
                {attachPickerOpen && (
                  <AttachPicker
                    sifs={allSIFs}
                    workspaceItems={workspaceItems}
                    attachedContext={attachedContext}
                    attachedWorkspaceItems={attachedWorkspaceItems}
                    onAttachSIF={handleAttachSIFSelection}
                    onToggleWorkspaceItem={toggleWorkspaceAttachment}
                    onClose={() => setAttachPickerOpen(false)}
                  />
                )}

                {(attachedContext || attachedWorkspaceItems.length > 0) && (
                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                    {attachedContext && (
                      <div
                        className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
                        style={{ borderColor: `${TEAL}30`, background: `${TEAL}0E`, color: TEAL }}
                      >
                        <Paperclip size={9} />
                        <span className="rounded px-1 py-0 text-[8px] font-bold uppercase tracking-wide" style={{ background: `${TEAL}24`, color: TEAL }}>
                          SIF
                        </span>
                        <span className="max-w-[170px] truncate">{attachedContext.sifName}</span>
                        <button
                          type="button"
                          onClick={() => setAttachedContext(null)}
                          className="ml-0.5 flex h-3 w-3 items-center justify-center rounded-full transition-colors"
                          style={{ color: TEAL }}
                          onMouseEnter={e => { e.currentTarget.style.background = `${TEAL}30` }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                        >
                          <X size={8} />
                        </button>
                      </div>
                    )}
                    {attachedWorkspaceItems.map(item => (
                      <div
                        key={item.nodeId}
                        className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
                        style={{ borderColor: `${TEAL}30`, background: `${TEAL}0E`, color: TEAL }}
                      >
                        <Paperclip size={9} />
                        <span className="rounded px-1 py-0 text-[8px] font-bold uppercase tracking-wide" style={{ background: `${TEAL}24`, color: TEAL }}>
                          {item.nodeType}
                        </span>
                        <span className="max-w-[150px] truncate">{item.nodeName}</span>
                        <button
                          type="button"
                          onClick={() => removeWorkspaceAttachment(item.nodeId)}
                          className="ml-0.5 flex h-3 w-3 items-center justify-center rounded-full transition-colors"
                          style={{ color: TEAL }}
                          onMouseEnter={e => { e.currentTarget.style.background = `${TEAL}30` }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                        >
                          <X size={8} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Input row */}
                <div
                  className="rounded-xl border px-2.5 py-2 transition-colors"
                  style={{ borderColor: BORDER, background: isDark ? 'rgba(255,255,255,0.04)' : PAGE_BG }}
                  onFocus={() => {}} // handled by textarea
                >
                  <textarea
                    rows={1}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Message PRISM AI… (⏎ envoyer, ⇧⏎ nouvelle ligne)"
                    className="w-full resize-none bg-transparent text-[12px] leading-relaxed outline-none"
                    style={{
                      color: TEXT,
                      maxHeight: 120,
                      overflowY: 'auto',
                    }}
                    onInput={e => {
                      const t = e.currentTarget
                      t.style.height = 'auto'
                      t.style.height = `${Math.min(t.scrollHeight, 120)}px`
                    }}
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <button
                        type="button"
                        onClick={toggleAttachPicker}
                        className="flex h-7 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-[10px] font-medium transition-colors"
                        style={{
                          borderColor: attachPickerOpen || attachmentCount > 0 ? `${TEAL}50` : BORDER,
                          background: attachPickerOpen || attachmentCount > 0 ? `${TEAL}12` : 'transparent',
                          color: attachPickerOpen || attachmentCount > 0 ? TEAL : TEXT_DIM,
                        }}
                      >
                        <Paperclip size={11} />
                        <span>Joindre</span>
                        {attachmentCount > 0 && (
                          <span
                            className="rounded-full px-1 py-0 text-[8px] font-bold"
                            style={{ background: `${TEAL}18`, color: TEAL }}
                          >
                            {attachmentCount}
                          </span>
                        )}
                      </button>

                      <div className="min-w-0 max-w-[220px] flex-1">
                        <select
                          value={config.model}
                          onChange={e => handleConfigChange({ ...config, model: e.target.value })}
                          className="h-7 w-full rounded-lg border px-2.5 text-[10px] font-medium outline-none"
                          style={{
                            borderColor: BORDER,
                            background: isDark ? 'rgba(255,255,255,0.03)' : PANEL_BG,
                            color: TEXT,
                          }}
                        >
                          {(['Anthropic', 'Mistral AI'] as const).map(group => (
                            <optgroup key={group} label={group}>
                              {MODELS.filter(m => m.group === group).map(model => (
                                <option key={model.id} value={model.id}>
                                  {model.label}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => { void handleSend() }}
                      disabled={!input.trim() || isStreaming}
                      className="flex h-7 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[10px] font-semibold transition-all"
                      style={{
                        background: input.trim() && !isStreaming ? `${TEAL}22` : 'transparent',
                        color: input.trim() && !isStreaming ? TEAL : TEXT_DIM,
                        opacity: input.trim() && !isStreaming ? 1 : 0.4,
                        border: `1px solid ${input.trim() && !isStreaming ? `${TEAL}40` : BORDER}`,
                      }}
                    >
                      <span>Envoyer</span>
                      <Send size={11} />
                    </button>
                  </div>
                </div>

                <p className="mt-1 text-center text-[9px]" style={{ color: TEXT_DIM, opacity: 0.35 }}>
                  {config.model} · PRISM AI peut faire des erreurs
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
