import { useState } from 'react'
import { AlertTriangle, Braces, Check, FolderKanban, Sparkles, X } from 'lucide-react'
import { useAppLocale } from '@/i18n/useLocale'
import { useAppStore } from '@/store/appStore'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { ensureAIProjectDraftWorkspaceNode, findAIProjectDraftWorkspaceNodeId } from '@/components/layout/prism-ai/projectDraftWorkspaceNode'

function MetaRow({ label, value, dim = false }: { label: string; value: string; dim?: boolean }) {
  const { TEXT, TEXT_DIM } = usePrismTheme()
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3 text-[12px] leading-relaxed">
      <span className="font-semibold" style={{ color: TEXT_DIM }}>{label}</span>
      <span className="min-w-0 break-words" style={{ color: dim ? TEXT_DIM : TEXT }}>{value || '—'}</span>
    </div>
  )
}

export function AIProjectDraftPreviewDialog() {
  const locale = useAppLocale()
  const {
    BORDER,
    CARD_BG,
    PAGE_BG,
    PANEL_BG,
    SHADOW_SOFT,
    TEAL,
    TEXT,
    TEXT_DIM,
  } = usePrismTheme()
  const preview = useAppStore(s => s.aiProjectDraftPreview)
  const currentView = useAppStore(s => s.view)
  const applyPreview = useAppStore(s => s.applyAIProjectDraftPreview)
  const discardPreview = useAppStore(s => s.discardAIProjectDraftPreview)
  const navigate = useAppStore(s => s.navigate)
  const { deleteNode, openTab } = useWorkspaceStore()
  const [isApplying, setIsApplying] = useState(false)

  if (!preview) return null

  const meta = preview.prismFile.payload.projectMeta
  const sifs = preview.prismFile.payload.sifs
  const assumptions = preview.assumptions ?? []
  const missingData = preview.missingData ?? []
  const uncertainData = preview.uncertainData ?? []
  const conflicts = preview.conflicts ?? []
  const title = locale === 'fr' ? 'Brouillon projet non appliqué' : 'Unapplied project draft'
  const subtitle = locale === 'fr'
    ? 'Ce projet est une preview temporaire. Rien ne sera sauvegardé tant que vous n’appliquez pas la proposition.'
    : 'This project is a temporary preview. Nothing will be saved until you apply the proposal.'
  const applyLabel = isApplying
    ? (locale === 'fr' ? 'Application…' : 'Applying...')
    : (locale === 'fr' ? 'Appliquer au workspace' : 'Apply to workspace')
  const discardLabel = locale === 'fr' ? 'Annuler la preview' : 'Discard preview'
  const jsonLabel = 'JSON'
  const linkedJsonNodeId = findAIProjectDraftWorkspaceNodeId(preview.messageId)
  if (currentView.type === 'workspace-file' && linkedJsonNodeId && currentView.nodeId === linkedJsonNodeId) {
    return null
  }

  const sections = [
    { kind: 'conflicts', label: locale === 'fr' ? 'Conflits à résoudre' : 'Conflicts to resolve', color: '#ef4444', border: 'rgba(239,68,68,0.34)', bg: 'rgba(239,68,68,0.08)', items: conflicts },
    { kind: 'missing', label: locale === 'fr' ? 'Informations manquantes' : 'Missing information', color: '#ef4444', border: 'rgba(239,68,68,0.24)', bg: 'rgba(239,68,68,0.05)', items: missingData },
    { kind: 'uncertain', label: locale === 'fr' ? 'Informations insuffisantes' : 'Insufficient information', color: '#f59e0b', border: 'rgba(245,158,11,0.28)', bg: 'rgba(245,158,11,0.08)', items: uncertainData },
    { kind: 'assumptions', label: locale === 'fr' ? 'Hypothèses' : 'Assumptions', color: TEAL, border: `${TEAL}28`, bg: `${TEAL}0D`, items: assumptions },
  ].filter(section => section.items.length > 0)

  const removeDraftJson = () => {
    const nodeId = findAIProjectDraftWorkspaceNodeId(preview.messageId)
    if (nodeId) deleteNode(nodeId)
  }

  const handleOpenJson = () => {
    const nodeId = ensureAIProjectDraftWorkspaceNode(preview)
    openTab(nodeId)
    navigate({ type: 'workspace-file', nodeId })
  }

  const handleDiscard = () => {
    removeDraftJson()
    discardPreview()
  }

  const handleApply = async () => {
    setIsApplying(true)
    try {
      const applied = await applyPreview()
      if (applied) removeDraftJson()
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.58)', backdropFilter: 'blur(8px)' }}
      onClick={event => {
        if (event.target === event.currentTarget) handleDiscard()
      }}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-6xl min-w-0 flex-col overflow-hidden rounded-3xl border"
        style={{
          background: PANEL_BG,
          borderColor: `${TEAL}30`,
          boxShadow: SHADOW_SOFT,
        }}
        onClick={event => event.stopPropagation()}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-4 border-b px-6 py-5"
          style={{ borderColor: BORDER, background: `linear-gradient(180deg, ${TEAL}12 0%, ${PANEL_BG} 100%)` }}
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                style={{ borderColor: `${TEAL}35`, color: TEAL, background: `${TEAL}16` }}
              >
                <Sparkles size={10} />
                <span>CREATE PROJECT</span>
              </span>
              <span className="text-[11px] font-semibold" style={{ color: TEXT }}>{title}</span>
            </div>
            <div className="mt-3 flex items-start gap-3">
              <div
                className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                style={{ background: `${TEAL}18`, border: `1px solid ${TEAL}35` }}
              >
                <FolderKanban size={18} style={{ color: TEAL }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold" style={{ color: TEXT }}>{meta.name}</p>
                <p className="mt-1 text-[12px] leading-relaxed" style={{ color: TEXT }}>{preview.summary}</p>
                <p className="mt-1 text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>{subtitle}</p>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleOpenJson}
              className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors"
              style={{ borderColor: BORDER, color: TEXT_DIM, background: PAGE_BG }}
            >
              <Braces size={12} />
              <span>{jsonLabel}</span>
            </button>
            <button
              type="button"
              onClick={handleDiscard}
              className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors"
              style={{ borderColor: BORDER, color: TEXT_DIM, background: PAGE_BG }}
            >
              <X size={12} />
              <span>{discardLabel}</span>
            </button>
            <button
              type="button"
              onClick={() => { void handleApply() }}
              disabled={isApplying}
              className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors"
              style={{ borderColor: `${TEAL}40`, background: `${TEAL}18`, color: TEAL, opacity: isApplying ? 0.65 : 1 }}
            >
              <Check size={12} />
              <span>{applyLabel}</span>
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 xl:grid-cols-[minmax(0,1.15fr)_420px]">
          <div className="min-h-0 overflow-y-auto px-6 py-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,360px)]">
              <section className="rounded-2xl border px-4 py-4" style={{ borderColor: BORDER, background: CARD_BG }}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[12px] font-semibold" style={{ color: TEXT }}>
                      {locale === 'fr' ? 'Métadonnées projet' : 'Project metadata'}
                    </p>
                    <p className="mt-1 text-[11px]" style={{ color: TEXT_DIM }}>
                      {locale === 'fr' ? 'Aperçu exact du contrat .prism proposé par PRISM AI.' : 'Exact preview of the .prism contract proposed by PRISM AI.'}
                    </p>
                  </div>
                  <div className="rounded-full border px-2 py-0.5 text-[10px] font-semibold" style={{ borderColor: `${TEAL}30`, color: TEAL, background: `${TEAL}12` }}>
                    {meta.standard}
                  </div>
                </div>
                <div className="space-y-2.5">
                  <MetaRow label={locale === 'fr' ? 'Nom' : 'Name'} value={meta.name} />
                  <MetaRow label={locale === 'fr' ? 'Référence' : 'Reference'} value={meta.ref || '—'} dim={!meta.ref} />
                  <MetaRow label={locale === 'fr' ? 'Client' : 'Client'} value={meta.client || '—'} dim={!meta.client} />
                  <MetaRow label={locale === 'fr' ? 'Site' : 'Site'} value={meta.site || '—'} dim={!meta.site} />
                  <MetaRow label={locale === 'fr' ? 'Unité' : 'Unit'} value={meta.unit || '—'} dim={!meta.unit} />
                  <MetaRow label={locale === 'fr' ? 'Révision' : 'Revision'} value={meta.revision || '—'} dim={!meta.revision} />
                  <MetaRow label={locale === 'fr' ? 'Statut' : 'Status'} value={meta.status} />
                </div>
                {meta.description && (
                  <div className="mt-4 rounded-xl border px-3 py-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: TEXT_DIM }}>
                      {locale === 'fr' ? 'Description' : 'Description'}
                    </p>
                    <p className="text-[12px] leading-relaxed" style={{ color: TEXT }}>{meta.description}</p>
                  </div>
                )}
              </section>

              <section className="rounded-2xl border px-4 py-4" style={{ borderColor: BORDER, background: CARD_BG }}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[12px] font-semibold" style={{ color: TEXT }}>
                      {locale === 'fr' ? 'Vue projet' : 'Project preview'}
                    </p>
                    <p className="mt-1 text-[11px]" style={{ color: TEXT_DIM }}>
                      {locale === 'fr' ? 'Le projet sera créé avec la structure ci-dessous.' : 'The project will be created with the structure below.'}
                    </p>
                  </div>
                  <div className="rounded-full border px-2 py-0.5 text-[10px] font-semibold" style={{ borderColor: BORDER, color: TEXT_DIM }}>
                    {sifs.length} SIF
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border p-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: `${TEAL}16`, border: `1px solid ${TEAL}28` }}>
                      <FolderKanban size={15} style={{ color: TEAL }} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-semibold" style={{ color: TEXT }}>{meta.name}</p>
                      <p className="text-[10px]" style={{ color: TEXT_DIM }}>{meta.ref || meta.standard}</p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2 pl-4">
                    {sifs.length > 0 ? sifs.map((sif, index) => {
                      const record = sif as unknown as Record<string, unknown>
                      const sifLabel = typeof record.sifNumber === 'string' && record.sifNumber.trim()
                        ? record.sifNumber.trim()
                        : `SIF-${String(index + 1).padStart(3, '0')}`
                      const sifTitle = typeof record.title === 'string' && record.title.trim()
                        ? record.title.trim()
                        : (locale === 'fr' ? 'SIF sans titre' : 'Untitled SIF')
                      return (
                        <div key={`${sifLabel}-${index}`} className="rounded-xl border px-3 py-2" style={{ borderColor: BORDER, background: CARD_BG }}>
                          <p className="text-[11px] font-semibold" style={{ color: TEXT }}>{sifLabel}</p>
                          <p className="mt-0.5 text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>{sifTitle}</p>
                        </div>
                      )
                    }) : (
                      <div className="rounded-xl border px-3 py-2 text-[11px] leading-relaxed" style={{ borderColor: BORDER, background: CARD_BG, color: TEXT_DIM }}>
                        {locale === 'fr'
                          ? 'Aucune SIF n’est encore incluse dans ce brouillon projet.'
                          : 'No SIF is included in this project draft yet.'}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </div>

          <aside className="min-h-0 overflow-y-auto border-l px-5 py-5" style={{ borderColor: BORDER, background: CARD_BG }}>
            <p className="text-[12px] font-semibold" style={{ color: TEXT }}>
              {locale === 'fr' ? 'Gouvernance du draft' : 'Draft governance'}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
              {locale === 'fr'
                ? 'Les écarts, manques et hypothèses sont visibles avant toute création effective du projet.'
                : 'Conflicts, gaps, and assumptions stay visible before the project is actually created.'}
            </p>

            <div className="mt-4 space-y-3">
              {sections.length > 0 ? sections.map(section => (
                <section key={section.kind} className="rounded-2xl border px-3 py-3" style={{ borderColor: section.border, background: section.bg }}>
                  <p className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: section.color }}>
                    <AlertTriangle size={11} />
                    <span>{section.label}</span>
                  </p>
                  <ul className="space-y-1.5 text-[11px] leading-relaxed" style={{ color: TEXT }}>
                    {section.items.map(item => (
                      <li key={item} className="flex gap-1.5">
                        <span style={{ color: section.color }}>•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )) : (
                <div className="rounded-2xl border px-3 py-3 text-[11px] leading-relaxed" style={{ borderColor: `${TEAL}28`, background: `${TEAL}0D`, color: TEXT_DIM }}>
                  {locale === 'fr'
                    ? 'Aucun conflit ni manque détecté dans la proposition actuelle.'
                    : 'No conflicts or missing information detected in the current proposal.'}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
