import { AlertTriangle, Braces, Check, Sparkles, X } from 'lucide-react'
import { useAppLocale } from '@/i18n/useLocale'
import { usePrismTheme } from '@/styles/usePrismTheme'
import type { AISIFDraftPreview } from '@/store/types'

export function AIDraftPreviewBanner({
  preview,
  isApplying,
  onApply,
  onDiscard,
  onOpenJson,
}: {
  preview: AISIFDraftPreview
  isApplying: boolean
  onApply: () => void
  onDiscard: () => void
  onOpenJson: () => void
}) {
  const locale = useAppLocale()
  const { BORDER, CARD_BG, PAGE_BG, SHADOW_SOFT, TEAL, TEXT, TEXT_DIM } = usePrismTheme()
  const title = locale === 'fr' ? 'Brouillon IA non appliqué' : 'Unapplied AI draft'
  const subtitle = locale === 'fr'
    ? 'Cette SIF est un brouillon temporaire. Rien ne sera sauvegardé tant que vous n’appliquez pas la proposition.'
    : 'This SIF is a temporary draft. Nothing will be saved until you apply the proposal.'
  const conflicts = preview.conflicts ?? []
  const missingData = preview.missingData ?? []
  const uncertainData = preview.uncertainData ?? []
  const assumptions = preview.assumptions ?? []
  const assumptionsLabel = locale === 'fr' ? 'Hypothèses' : 'Assumptions'
  const conflictsLabel = locale === 'fr' ? 'Conflits à résoudre' : 'Conflicts to resolve'
  const missingLabel = locale === 'fr' ? 'Informations manquantes' : 'Missing information'
  const uncertainLabel = locale === 'fr' ? 'Informations insuffisantes' : 'Insufficient information'
  const jsonLabel = 'JSON'
  const applyLabel = isApplying
    ? (locale === 'fr' ? 'Application…' : 'Applying...')
    : (locale === 'fr' ? 'Appliquer au projet' : 'Apply to project')
  const discardLabel = locale === 'fr' ? 'Annuler la preview' : 'Discard preview'

  return (
    <div
      className="mb-3 rounded-2xl border px-4 py-3"
      style={{
        borderColor: `${TEAL}38`,
        background: `linear-gradient(180deg, ${TEAL}12 0%, ${CARD_BG} 110px)`,
        boxShadow: SHADOW_SOFT,
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              style={{ borderColor: `${TEAL}35`, color: TEAL, background: `${TEAL}16` }}
            >
              <Sparkles size={10} />
              <span>{preview.command === 'create_sif' ? 'CREATE SIF' : 'DRAFT SIF'}</span>
            </span>
            <span className="text-[11px] font-semibold" style={{ color: TEXT }}>
              {title}
            </span>
          </div>
          <p className="mt-2 text-[12px] font-semibold leading-relaxed" style={{ color: TEXT }}>
            {preview.summary}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
            {subtitle}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onOpenJson}
            className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors"
            style={{ borderColor: BORDER, color: TEXT_DIM, background: PAGE_BG }}
            onMouseEnter={event => {
              event.currentTarget.style.borderColor = `${TEAL}30`
              event.currentTarget.style.color = TEXT
            }}
            onMouseLeave={event => {
              event.currentTarget.style.borderColor = BORDER
              event.currentTarget.style.color = TEXT_DIM
            }}
          >
            <Braces size={12} />
            <span>{jsonLabel}</span>
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors"
            style={{ borderColor: BORDER, color: TEXT_DIM, background: PAGE_BG }}
            onMouseEnter={event => {
              event.currentTarget.style.borderColor = `${TEAL}30`
              event.currentTarget.style.color = TEXT
            }}
            onMouseLeave={event => {
              event.currentTarget.style.borderColor = BORDER
              event.currentTarget.style.color = TEXT_DIM
            }}
          >
            <X size={12} />
            <span>{discardLabel}</span>
          </button>
          <button
            type="button"
            onClick={onApply}
            disabled={isApplying}
            className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors"
            style={{
              borderColor: `${TEAL}40`,
              background: `${TEAL}18`,
              color: TEAL,
              opacity: isApplying ? 0.65 : 1,
            }}
          >
            <Check size={12} />
            <span>{applyLabel}</span>
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {conflicts.length > 0 && (
          <div className="rounded-xl border px-3 py-2" style={{ borderColor: 'rgba(239,68,68,0.34)', background: 'rgba(239,68,68,0.08)' }}>
            <p className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: '#ef4444' }}>
              <AlertTriangle size={11} />
              <span>{conflictsLabel}</span>
            </p>
            <ul className="space-y-1 text-[11px] leading-relaxed" style={{ color: TEXT }}>
              {conflicts.slice(0, 4).map(item => (
                <li key={item} className="flex gap-1.5">
                  <span style={{ color: '#ef4444' }}>•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {missingData.length > 0 && (
          <div className="rounded-xl border px-3 py-2" style={{ borderColor: 'rgba(239,68,68,0.24)', background: 'rgba(239,68,68,0.05)' }}>
            <p className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: '#ef4444' }}>
              <AlertTriangle size={11} />
              <span>{missingLabel}</span>
            </p>
            <ul className="space-y-1 text-[11px] leading-relaxed" style={{ color: TEXT }}>
              {missingData.slice(0, 4).map(item => (
                <li key={item} className="flex gap-1.5">
                  <span style={{ color: '#ef4444' }}>•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {uncertainData.length > 0 && (
          <div className="rounded-xl border px-3 py-2" style={{ borderColor: 'rgba(245,158,11,0.28)', background: 'rgba(245,158,11,0.08)' }}>
            <p className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: '#f59e0b' }}>
              <AlertTriangle size={11} />
              <span>{uncertainLabel}</span>
            </p>
            <ul className="space-y-1 text-[11px] leading-relaxed" style={{ color: TEXT }}>
              {uncertainData.slice(0, 4).map(item => (
                <li key={item} className="flex gap-1.5">
                  <span style={{ color: '#f59e0b' }}>•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {assumptions.length > 0 && (
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: TEXT_DIM }}>
              {assumptionsLabel}
            </p>
            <ul className="space-y-1 text-[11px] leading-relaxed" style={{ color: TEXT }}>
              {assumptions.slice(0, 4).map(item => (
                <li key={item} className="flex gap-1.5">
                  <span style={{ color: TEAL }}>•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
