import { AlertTriangle, ExternalLink, FilePlus2 } from 'lucide-react'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { useLocaleStrings } from '@/i18n/useLocale'
import { getAiStrings } from '@/i18n/ai'
import type { AIProposal } from './types'

function getCommandLabel(proposal: AIProposal, labels: ReturnType<typeof getAiStrings>['proposals']['commands']): string {
  if (proposal.kind === 'project_draft') return labels.createProject
  if (proposal.kind === 'library_draft') return labels.createLibrary
  return proposal.command === 'create_sif' ? labels.createSif : labels.draftSif
}

function getScopeLabel(proposal: AIProposal): string {
  if (proposal.kind === 'project_draft') {
    const meta = proposal.prismFile.payload.projectMeta
    return meta.ref?.trim() || meta.name.trim()
  }
  if (proposal.kind === 'library_draft') {
    return proposal.targetProjectName
      ?? proposal.templateInput.libraryName
      ?? proposal.libraryFile.libraryName
      ?? (proposal.targetScope === 'project' ? 'Project library' : 'My Library')
  }
  return proposal.targetProjectName
}

export function ProposalCard({
  proposal,
  active,
  completed,
  onOpen,
}: {
  proposal: AIProposal
  active: boolean
  completed: boolean
  onOpen: () => void
}) {
  const { BORDER, PAGE_BG, TEXT, TEXT_DIM, TEAL, isDark, semantic } = usePrismTheme()
  const strings = useLocaleStrings(getAiStrings)

  const { commands, actions, sections } = strings.proposals

  const actionLabel = completed
    ? (proposal.kind === 'project_draft' ? actions.openProject
      : proposal.kind === 'library_draft' ? actions.openTemplate
      : actions.openSif)
    : active
      ? actions.reopenPreview
      : actions.openPreview

  const commandLabel = getCommandLabel(proposal, commands)
  const scopeLabel   = getScopeLabel(proposal)
  const conflicts    = proposal.conflicts    ?? []
  const missingData  = proposal.missingData  ?? []
  const uncertainData = proposal.uncertainData ?? []
  const assumptions  = proposal.assumptions  ?? []

  return (
    <div
      className="mt-2 w-full rounded-xl border px-3 py-3"
      style={{
        borderColor: active ? `${TEAL}45` : BORDER,
        background:  active ? `${TEAL}10` : (isDark ? 'rgba(255,255,255,0.03)' : PAGE_BG),
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
              style={{ color: TEAL, background: `${TEAL}18`, border: `1px solid ${TEAL}28` }}
            >
              {commandLabel}
            </span>
            <span className="text-[10px] font-medium" style={{ color: TEXT_DIM }}>
              {scopeLabel}
            </span>
          </div>
          <p className="mt-2 text-[12px] font-semibold leading-relaxed" style={{ color: TEXT }}>
            {proposal.summary}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium transition-colors"
          style={{ borderColor: `${TEAL}35`, color: TEAL, background: 'transparent' }}
          onMouseEnter={event => {
            event.currentTarget.style.background    = `${TEAL}14`
            event.currentTarget.style.borderColor   = `${TEAL}45`
          }}
          onMouseLeave={event => {
            event.currentTarget.style.background    = 'transparent'
            event.currentTarget.style.borderColor   = `${TEAL}35`
          }}
        >
          {completed ? <ExternalLink size={11} /> : <FilePlus2 size={11} />}
          <span>{actionLabel}</span>
        </button>
      </div>

      {conflicts.length > 0 && (
        <AlertSection
          title={sections.conflicts}
          items={conflicts}
          color={semantic.error}
          opacity={{ border: '52', bg: '14' }}
          text={TEXT}
        />
      )}

      {missingData.length > 0 && (
        <AlertSection
          title={sections.missing}
          items={missingData}
          color={semantic.error}
          opacity={{ border: '3D', bg: '0D' }}
          text={TEXT}
        />
      )}

      {uncertainData.length > 0 && (
        <AlertSection
          title={sections.uncertain}
          items={uncertainData}
          color={semantic.warning}
          opacity={{ border: '47', bg: '14' }}
          text={TEXT}
        />
      )}

      {assumptions.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: TEXT_DIM }}>
            {sections.assumptions}
          </p>
          <ul className="space-y-1 text-[11px] leading-relaxed" style={{ color: TEXT }}>
            {assumptions.slice(0, 3).map(entry => (
              <li key={entry} className="flex gap-1.5">
                <span style={{ color: TEAL }}>•</span>
                <span>{entry}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ─── Internal sub-component ────────────────────────────────────────────────

function AlertSection({
  title,
  items,
  color,
  opacity,
  text,
}: {
  title: string
  items: string[]
  color: string
  opacity: { border: string; bg: string }
  text: string
}) {
  return (
    <div
      className="mt-3 rounded-lg border px-2.5 py-2"
      style={{
        borderColor: `${color}${opacity.border}`,
        background:  `${color}${opacity.bg}`,
      }}
    >
      <p
        className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide"
        style={{ color }}
      >
        <AlertTriangle size={11} />
        <span>{title}</span>
      </p>
      <ul className="space-y-1 text-[11px] leading-relaxed" style={{ color: text }}>
        {items.slice(0, 3).map(entry => (
          <li key={entry} className="flex gap-1.5">
            <span style={{ color }}>•</span>
            <span>{entry}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
