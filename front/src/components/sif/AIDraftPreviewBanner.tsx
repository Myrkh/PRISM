import { AlertTriangle, Braces, Check, Sparkles, X } from 'lucide-react'
import { useLocaleStrings } from '@/i18n/useLocale'
import { getAiStrings } from '@/i18n/ai'
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
  const { BORDER, CARD_BG, PAGE_BG, SHADOW_SOFT, TEAL, TEXT, TEXT_DIM, semantic } = usePrismTheme()
  const strings = useLocaleStrings(getAiStrings)
  const { commands, sections, preview: p } = strings.proposals

  const commandLabel = preview.command === 'create_sif' ? commands.createSif : commands.draftSif
  const applyLabel   = isApplying ? p.applying : p.applySif

  const conflicts    = preview.conflicts    ?? []
  const missingData  = preview.missingData  ?? []
  const uncertainData = preview.uncertainData ?? []
  const assumptions  = preview.assumptions  ?? []

  return (
    <div
      className="mb-3 rounded-2xl border px-4 py-3"
      style={{
        borderColor: `${TEAL}38`,
        background: `linear-gradient(180deg, ${TEAL}12 0%, ${CARD_BG} 110px)`,
        boxShadow: SHADOW_SOFT,
      }}
    >
      {/* ── Header row: badge + title + action buttons ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            style={{ borderColor: `${TEAL}35`, color: TEAL, background: `${TEAL}16` }}
          >
            <Sparkles size={10} />
            <span>{commandLabel}</span>
          </span>
          <span className="text-[11px] font-semibold" style={{ color: TEXT }}>
            {p.titleSif}
          </span>
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
            <span>{p.json}</span>
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
            <span>{p.discard}</span>
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

      {/* ── Summary + subtitle — full width ── */}
      <p className="mt-2 text-[12px] font-semibold leading-relaxed" style={{ color: TEXT }}>
        {preview.summary}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
        {p.subtitleSif}
      </p>

      {/* ── Alert sections — wrapping flex so each fills available space ── */}
      {(conflicts.length > 0 || missingData.length > 0 || uncertainData.length > 0 || assumptions.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-3">
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
            <div className="min-w-[200px] flex-1">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: TEXT_DIM }}>
                {sections.assumptions}
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
      )}
    </div>
  )
}

// ─── Internal sub-component ─────────────────────────────────────────────────

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
      className="min-w-[200px] flex-1 rounded-xl border px-3 py-2"
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
        {items.slice(0, 4).map(item => (
          <li key={item} className="flex gap-1.5">
            <span style={{ color }}>•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
