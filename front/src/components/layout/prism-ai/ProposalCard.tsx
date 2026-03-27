import { AlertTriangle, ExternalLink, FilePlus2 } from 'lucide-react'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { useAppLocale } from '@/i18n/useLocale'
import type { AIProposal } from './types'

function getCommandLabel(proposal: AIProposal): string {
  if (proposal.kind === 'project_draft') return 'CREATE PROJECT'
  if (proposal.kind === 'library_draft') return 'CREATE LIBRARY'
  return proposal.command === 'create_sif' ? 'CREATE SIF' : 'DRAFT SIF'
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
  const locale = useAppLocale()
  const { BORDER, PAGE_BG, TEXT, TEXT_DIM, TEAL, isDark } = usePrismTheme()
  const actionLabel = completed
    ? (proposal.kind === 'project_draft'
        ? (locale === 'fr' ? 'Ouvrir le projet créé' : 'Open created project')
        : proposal.kind === 'library_draft'
          ? (locale === 'fr' ? 'Ouvrir le template créé' : 'Open created template')
          : (locale === 'fr' ? 'Ouvrir la SIF créée' : 'Open created SIF'))
    : active
      ? (locale === 'fr' ? 'Rouvrir la preview' : 'Reopen preview')
      : (locale === 'fr' ? 'Ouvrir la preview' : 'Open preview')
  const commandLabel = getCommandLabel(proposal)
  const scopeLabel = getScopeLabel(proposal)
  const conflicts = proposal.conflicts ?? []
  const missingData = proposal.missingData ?? []
  const uncertainData = proposal.uncertainData ?? []
  const assumptions = proposal.assumptions ?? []
  const assumptionsLabel = locale === 'fr' ? 'Hypothèses' : 'Assumptions'
  const conflictsLabel = locale === 'fr' ? 'Conflits à résoudre' : 'Conflicts to resolve'
  const missingLabel = locale === 'fr' ? 'Informations manquantes' : 'Missing information'
  const uncertainLabel = locale === 'fr' ? 'Informations insuffisantes' : 'Insufficient information'

  return (
    <div
      className="mt-2 w-full rounded-xl border px-3 py-3"
      style={{
        borderColor: active ? `${TEAL}45` : BORDER,
        background: active ? `${TEAL}10` : (isDark ? 'rgba(255,255,255,0.03)' : PAGE_BG),
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
            event.currentTarget.style.background = `${TEAL}14`
            event.currentTarget.style.borderColor = `${TEAL}45`
          }}
          onMouseLeave={event => {
            event.currentTarget.style.background = 'transparent'
            event.currentTarget.style.borderColor = `${TEAL}35`
          }}
        >
          {completed ? <ExternalLink size={11} /> : <FilePlus2 size={11} />}
          <span>{actionLabel}</span>
        </button>
      </div>

      {conflicts.length > 0 && (
        <div className="mt-3 rounded-lg border px-2.5 py-2" style={{ borderColor: 'rgba(239,68,68,0.32)', background: 'rgba(239,68,68,0.08)' }}>
          <p className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: '#ef4444' }}>
            <AlertTriangle size={11} />
            <span>{conflictsLabel}</span>
          </p>
          <ul className="space-y-1 text-[11px] leading-relaxed" style={{ color: TEXT }}>
            {conflicts.slice(0, 3).map(entry => (
              <li key={entry} className="flex gap-1.5">
                <span style={{ color: '#ef4444' }}>•</span>
                <span>{entry}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {missingData.length > 0 && (
        <div className="mt-3 rounded-lg border px-2.5 py-2" style={{ borderColor: 'rgba(239,68,68,0.24)', background: 'rgba(239,68,68,0.05)' }}>
          <p className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: '#ef4444' }}>
            <AlertTriangle size={11} />
            <span>{missingLabel}</span>
          </p>
          <ul className="space-y-1 text-[11px] leading-relaxed" style={{ color: TEXT }}>
            {missingData.slice(0, 3).map(entry => (
              <li key={entry} className="flex gap-1.5">
                <span style={{ color: '#ef4444' }}>•</span>
                <span>{entry}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {uncertainData.length > 0 && (
        <div className="mt-3 rounded-lg border px-2.5 py-2" style={{ borderColor: 'rgba(245,158,11,0.28)', background: 'rgba(245,158,11,0.08)' }}>
          <p className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: '#f59e0b' }}>
            <AlertTriangle size={11} />
            <span>{uncertainLabel}</span>
          </p>
          <ul className="space-y-1 text-[11px] leading-relaxed" style={{ color: TEXT }}>
            {uncertainData.slice(0, 3).map(entry => (
              <li key={entry} className="flex gap-1.5">
                <span style={{ color: '#f59e0b' }}>•</span>
                <span>{entry}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {assumptions.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: TEXT_DIM }}>
            {assumptionsLabel}
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
