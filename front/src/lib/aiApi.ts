/**
 * aiApi.ts — Client PRISM AI
 *
 * Appelle le backend FastAPI /api/ai/chat en streaming SSE.
 * Expose streamPRISMAI() qui remplace streamAIResponseStub dans ChatPanel.
 *
 * Usage dans ChatPanel.tsx :
 *   import { streamPRISMAI } from '@/lib/aiApi'
 *   // Remplacer streamAIResponseStub par streamPRISMAI
 */

import type { ChatMessage, AttachedContext, ChatConfig } from '@/components/layout/prism-ai/types'
import type { SIF } from '@/core/types'

// ─── Types workspace context ──────────────────────────────────────────────────

export interface WorkspaceContext {
  context_md?: string        // .prism/context.md
  conventions_md?: string    // .prism/conventions.md
  standards_md?: string      // .prism/standards.md
  sif_registry_md?: string   // .prism/sif-registry.md (auto-généré)
  active_sif_json?: object   // SIF active sérialisée
}

export interface ChatAttachmentPayload {
  kind: 'note' | 'pdf' | 'image'
  node_id: string
  name: string
  content?: string
  url?: string
}

export type ChatResponseMode = 'default' | 'draft_note'

export interface ChatRequestOptions {
  strictMode?: boolean
  responseMode?: ChatResponseMode
}

// ─── Sérialisation SIF → contexte JSON ───────────────────────────────────────

/**
 * Sérialise une SIF complète en objet JSON pour injection dans le contexte IA.
 * Ne pas inclure les données volumineuses inutiles (ex: blobs PDF).
 */
export function serializeSIFForAI(sif: SIF): object {
  return {
    id: sif.id,
    sifNumber: sif.sifNumber,
    title: sif.title,
    revision: sif.revision,
    description: sif.description,
    processTag: sif.processTag,
    hazardousEvent: sif.hazardousEvent,
    targetSIL: sif.targetSIL,
    demandRate: sif.demandRate,
    processSafetyTime: sif.processSafetyTime,
    sifResponseTime: sif.sifResponseTime,
    safeState: sif.safeState,
    subsystems: (sif.subsystems ?? []).map(sub => ({
      id: sub.id,
      type: sub.type,
      label: sub.label,
      architecture: sub.architecture,
      ccf: sub.ccf,
      channels: (sub.channels ?? []).map(ch => ({
        id: ch.id,
        label: ch.label,
        architecture: ch.architecture,
        components: (ch.components ?? []).map(comp => ({
          id: comp.id,
          tagName: comp.tagName,
          subsystemType: comp.subsystemType,
          manufacturer: comp.manufacturer,
          instrumentType: comp.instrumentType,
          paramMode: comp.paramMode,
          factorized: comp.factorized,
        })),
      })),
    })),
  }
}

// ─── Stream SSE depuis le backend ────────────────────────────────────────────

/**
 * Stream une réponse PRISM AI depuis le backend FastAPI.
 *
 * C'est LA fonction à brancher dans ChatPanel.tsx à la place de streamAIResponseStub.
 *
 * @param messages   Historique de la conversation
 * @param context    Contexte SIF attaché (optionnel)
 * @param config     Config chat (modèle, system prompt)
 * @param workspace  Contexte workspace .prism/ (optionnel)
 */
export async function* streamPRISMAI(
  messages: ChatMessage[],
  context?: AttachedContext,
  config?: ChatConfig,
  workspace?: WorkspaceContext,
  attachments?: ChatAttachmentPayload[],
  options?: ChatRequestOptions,
): AsyncGenerator<string> {
  const model = config?.model ?? null
  const provider = model?.startsWith('mistral-') || model?.startsWith('codestral-')
    ? 'mistral'
    : model?.startsWith('claude-')
      ? 'anthropic'
      : null  // utilise la config serveur (définie dans .env)

  const body = {
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    context: context
      ? {
          sif_id: context.sifId,
          sif_name: context.sifName,
        }
      : null,
    workspace: workspace ?? null,
    attachments: attachments ?? [],
    custom_system_prompt: config?.systemPrompt ?? '',
    strict_mode: options?.strictMode ?? false,
    response_mode: options?.responseMode ?? 'default',
    provider,
    model,
  }

  let response: Response
  try {
    response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (err) {
    yield `❌ Impossible de contacter le backend PRISM. Vérifier que le serveur est démarré. (${String(err)})`
    return
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    yield `❌ Erreur backend (${response.status}): ${text || response.statusText}`
    return
  }

  if (!response.body) {
    yield '❌ Le serveur n\'a pas retourné de stream.'
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''  // conserver la ligne incomplète

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') return
        try {
          // Le backend escape les \n en \\n pour le format SSE
          const text = JSON.parse(data) as string
          yield text.replace(/\\n/g, '\n')
        } catch {
          // ligne SSE malformée — ignorer
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

// ─── Health check ─────────────────────────────────────────────────────────────

export async function checkAIHealth(): Promise<{
  provider: string
  ollama_reachable?: boolean
  anthropic_key_set?: boolean
  knowledge_base: { files: Array<{ id: string; exists: boolean }> }
}> {
  const resp = await fetch('/api/ai/health')
  if (!resp.ok) throw new Error(`AI health check failed: ${resp.status}`)
  return resp.json() as Promise<ReturnType<typeof checkAIHealth>>
}

// ─── Modèles disponibles ──────────────────────────────────────────────────────

export async function fetchAvailableModels(): Promise<{
  provider: string
  models: Array<{ id: string; label: string; recommended?: boolean }>
  current: string
}> {
  const resp = await fetch('/api/ai/models')
  if (!resp.ok) throw new Error(`Failed to fetch AI models: ${resp.status}`)
  return resp.json() as Promise<ReturnType<typeof fetchAvailableModels>>
}
