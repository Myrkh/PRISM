import { CheckCircle2, FileJson, Loader2, RefreshCw, X } from 'lucide-react'
import type {
  ComponentTemplateImportDecision,
  ComponentTemplateImportIssue,
  ComponentTemplateImportPreview,
} from '@/features/library'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { semantic } from '@/styles/tokens'

const DECISION_LABELS: Record<ComponentTemplateImportDecision, string> = {
  create: 'Creer',
  update: 'Mettre a jour',
  ignore: 'Ignorer',
}

function DecisionButton({
  active,
  disabled,
  label,
  tone,
  onClick,
}: {
  active: boolean
  disabled?: boolean
  label: string
  tone: string
  onClick: () => void
}) {
  const { BORDER, PAGE_BG, SHADOW_SOFT, TEXT, TEXT_DIM } = usePrismTheme()

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center rounded-md border px-2 py-1 text-[10px] font-semibold transition-[background-color,color,border-color,box-shadow] disabled:cursor-not-allowed disabled:opacity-45"
      style={{
        borderColor: active ? tone : `${BORDER}88`,
        background: active ? `${tone}14` : PAGE_BG,
        color: active ? tone : TEXT_DIM,
        boxShadow: active ? SHADOW_SOFT : 'none',
      }}
      onMouseEnter={event => {
        if (!active && !disabled) event.currentTarget.style.color = TEXT
      }}
      onMouseLeave={event => {
        if (!active) event.currentTarget.style.color = TEXT_DIM
      }}
    >
      {label}
    </button>
  )
}

function IssueRow({ issue }: { issue: ComponentTemplateImportIssue }) {
  const tone = issue.severity === 'error' ? semantic.error : '#D97706'
  return (
    <div
      className="rounded-md border px-2.5 py-2 text-[11px] leading-relaxed"
      style={{
        borderColor: `${tone}30`,
        background: `${tone}10`,
        color: tone,
      }}
    >
      {issue.message}
    </div>
  )
}

export function LibraryImportReviewDialog({
  fileName,
  preview,
  decisions,
  busy,
  onDecisionChange,
  onApplySuggested,
  onBulkDecision,
  onClose,
  onConfirm,
}: {
  fileName: string
  preview: ComponentTemplateImportPreview
  decisions: Record<string, ComponentTemplateImportDecision>
  busy: boolean
  onDecisionChange: (entryId: string, decision: ComponentTemplateImportDecision) => void
  onApplySuggested: () => void
  onBulkDecision: (decision: Extract<ComponentTemplateImportDecision, 'create' | 'update'>) => void
  onClose: () => void
  onConfirm: () => void
}) {
  const { BORDER, CARD_BG, PAGE_BG, PANEL_BG, SHADOW_CARD, SHADOW_SOFT, TEAL, TEAL_DIM, TEXT, TEXT_DIM } = usePrismTheme()

  const decisionCounts = preview.entries.reduce((acc, entry) => {
    const decision = decisions[entry.id] ?? entry.suggestedDecision
    acc[decision] += 1
    if (entry.issues.some(issue => issue.severity === 'error')) acc.invalid += 1
    if (entry.issues.some(issue => issue.severity === 'warning')) acc.warning += 1
    return acc
  }, {
    create: 0,
    update: 0,
    ignore: 0,
    invalid: 0,
    warning: 0,
  })

  const actionableCount = preview.entries.filter(entry => {
    const decision = decisions[entry.id] ?? entry.suggestedDecision
    return Boolean(entry.template) && decision !== 'ignore'
  }).length

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center px-6 py-8"
      style={{ background: 'rgba(7, 11, 18, 0.58)' }}
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-[1180px] flex-col overflow-hidden rounded-[26px] border"
        style={{ background: PANEL_BG, borderColor: `${BORDER}80`, boxShadow: SHADOW_CARD }}
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b px-6 py-5" style={{ borderColor: `${BORDER}35` }}>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: TEAL_DIM }}>
              Previsualisation d'import
            </p>
            <h2 className="mt-2 text-[24px] font-semibold tracking-tight" style={{ color: TEXT }}>
              Verifier avant d'ecrire dans la bibliotheque
            </h2>
            <p className="mt-2 text-[13px] leading-[1.8]" style={{ color: TEXT_DIM }}>
              {fileName} · {preview.entries.length} entree{preview.entries.length > 1 ? 's' : ''} analysee{preview.entries.length > 1 ? 's' : ''}
              {preview.libraryName ? ` · ${preview.libraryName}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors"
            style={{ borderColor: `${BORDER}80`, background: PAGE_BG, color: TEXT_DIM }}
          >
            <X size={15} />
          </button>
        </div>

        <div className="grid gap-5 border-b px-6 py-4 xl:grid-cols-[minmax(0,1fr)_320px]" style={{ borderColor: `${BORDER}35` }}>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-xl border px-4 py-3" style={{ borderColor: `${TEAL}22`, background: `${TEAL}10` }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: TEAL_DIM }}>Creer</p>
              <p className="mt-2 text-[22px] font-semibold" style={{ color: TEAL }}>{decisionCounts.create}</p>
            </div>
            <div className="rounded-xl border px-4 py-3" style={{ borderColor: `${semantic.warning}22`, background: `${semantic.warning}10` }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: semantic.warning }}>Mettre a jour</p>
              <p className="mt-2 text-[22px] font-semibold" style={{ color: semantic.warning }}>{decisionCounts.update}</p>
            </div>
            <div className="rounded-xl border px-4 py-3" style={{ borderColor: `${BORDER}70`, background: PAGE_BG }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: TEXT_DIM }}>Ignorer</p>
              <p className="mt-2 text-[22px] font-semibold" style={{ color: TEXT }}>{decisionCounts.ignore}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="rounded-xl border px-4 py-3" style={{ borderColor: `${BORDER}70`, background: PAGE_BG }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: TEXT_DIM }}>Controles</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onApplySuggested}
                  className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-[11px] font-semibold transition-colors"
                  style={{ borderColor: `${BORDER}80`, background: PAGE_BG, color: TEXT_DIM }}
                >
                  <RefreshCw size={13} />
                  Recommande
                </button>
                <button
                  type="button"
                  onClick={() => onBulkDecision('create')}
                  className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-[11px] font-semibold transition-colors"
                  style={{ borderColor: `${TEAL}30`, background: `${TEAL}10`, color: TEAL }}
                >
                  <CheckCircle2 size={13} />
                  Tout creer
                </button>
                <button
                  type="button"
                  onClick={() => onBulkDecision('update')}
                  className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-[11px] font-semibold transition-colors"
                  style={{ borderColor: `${semantic.warning}30`, background: `${semantic.warning}10`, color: semantic.warning }}
                >
                  <RefreshCw size={13} />
                  Tout mettre a jour
                </button>
              </div>
            </div>
            <div className="rounded-xl border px-4 py-3 text-[11px] leading-relaxed" style={{ borderColor: `${BORDER}70`, background: PAGE_BG, color: TEXT_DIM }}>
              {decisionCounts.warning} entree{decisionCounts.warning > 1 ? 's' : ''} avec avertissement · {decisionCounts.invalid} invalide{decisionCounts.invalid > 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {preview.globalIssues.length > 0 && (
          <div className="space-y-2 border-b px-6 py-4" style={{ borderColor: `${BORDER}35` }}>
            {preview.globalIssues.map(issue => <IssueRow key={issue.code + issue.message} issue={issue} />)}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-3">
            {preview.entries.map(entry => {
              const decision = decisions[entry.id] ?? entry.suggestedDecision
              const hasErrors = entry.issues.some(issue => issue.severity === 'error')
              const snapshot = entry.template?.componentSnapshot ?? null
              const tone = hasErrors ? semantic.error : (entry.duplicate ? semantic.warning : TEAL)

              return (
                <section
                  key={entry.id}
                  className="rounded-2xl border"
                  style={{ borderColor: `${tone}24`, background: CARD_BG, boxShadow: SHADOW_SOFT }}
                >
                  <div className="grid gap-4 px-5 py-4 xl:grid-cols-[minmax(0,1fr)_220px] xl:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border" style={{ borderColor: `${tone}22`, background: `${tone}10`, color: tone }}>
                          <FileJson size={16} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-semibold" style={{ color: TEXT }}>{entry.sourceName}</p>
                          <p className="mt-1 text-[11px]" style={{ color: TEXT_DIM }}>
                            {(snapshot?.subsystemType ?? 'template') + ' · ' + (snapshot?.instrumentType || 'Type a completer') + (snapshot?.manufacturer ? ' · ' + snapshot.manufacturer : '') + (entry.template?.libraryName ? ' · ' + entry.template.libraryName : '')}
                          </p>
                        </div>
                        {entry.duplicate && (
                          <span className="inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-semibold" style={{ borderColor: `${semantic.warning}30`, background: `${semantic.warning}10`, color: semantic.warning }}>
                            {'Doublon ' + (entry.duplicate.kind === 'id' ? 'ID' : 'bibliotheque')}
                          </span>
                        )}
                      </div>

                      {entry.issues.length > 0 ? (
                        <div className="mt-4 space-y-2">
                          {entry.issues.map((issue, index) => (
                            <IssueRow key={entry.id + issue.code + index} issue={issue} />
                          ))}
                        </div>
                      ) : (
                        <div className="mt-4 rounded-md border px-3 py-2 text-[11px]" style={{ borderColor: `${TEAL}22`, background: `${TEAL}10`, color: TEAL_DIM }}>
                          Analyse propre. Le template peut etre importe tel quel.
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border px-4 py-3" style={{ borderColor: `${BORDER}70`, background: PAGE_BG }}>
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: TEXT_DIM }}>Decision</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {entry.availableDecisions.map(option => (
                          <DecisionButton
                            key={option}
                            label={DECISION_LABELS[option]}
                            active={decision === option}
                            tone={option === 'create' ? TEAL : (option === 'update' ? semantic.warning : TEXT_DIM)}
                            onClick={() => onDecisionChange(entry.id, option)}
                          />
                        ))}
                      </div>
                      {entry.duplicate && (
                        <p className="mt-3 text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
                          {'Reference existante: ' + entry.duplicate.name + (entry.duplicate.libraryName ? ' · ' + entry.duplicate.libraryName : '')}
                        </p>
                      )}
                    </div>
                  </div>
                </section>
              )
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-t px-6 py-4" style={{ borderColor: `${BORDER}35` }}>
          <div className="text-[12px] leading-relaxed" style={{ color: TEXT_DIM }}>
            {actionableCount > 0
              ? actionableCount + ' entree' + (actionableCount > 1 ? 's' : '') + ' sera' + (actionableCount > 1 ? 'ont' : '') + ' importee' + (actionableCount > 1 ? 's' : '') + '.'
              : 'Aucune entree selectionnee pour import.'}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-[12px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              style={{ borderColor: `${BORDER}80`, background: PAGE_BG, color: TEXT_DIM }}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy || actionableCount === 0}
              className="inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-[12px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              style={{ borderColor: `${TEAL}30`, background: `${TEAL}12`, color: TEAL }}
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Importer la selection
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
