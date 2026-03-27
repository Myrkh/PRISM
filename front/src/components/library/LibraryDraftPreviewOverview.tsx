import { AlertTriangle } from 'lucide-react'
import { usePrismTheme } from '@/styles/usePrismTheme'

type DraftSection = {
  kind: string
  label: string
  color: string
  border: string
  bg: string
  items: string[]
}

function LibraryDraftPreviewMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  const { BORDER, SHADOW_SOFT, SURFACE, TEXT, TEXT_DIM } = usePrismTheme()

  return (
    <div
      className="min-w-0 rounded-lg px-2.5 py-2"
      style={{ background: SURFACE, border: `1px solid ${BORDER}`, boxShadow: SHADOW_SOFT }}
    >
      <p className="text-[8px] uppercase tracking-widest" style={{ color: TEXT_DIM }}>{label}</p>
      <p className="mt-1 truncate text-[11px] font-semibold" style={{ color: TEXT }}>{value}</p>
    </div>
  )
}

export function LibraryDraftPreviewOverview({
  summary,
  sections,
  pfdLabel,
  pfdValue,
  textColor,
  accentColor,
}: {
  summary: string
  sections: DraftSection[]
  pfdLabel: string
  pfdValue: string
  textColor: string
  accentColor: string
}) {
  return (
    <div className="space-y-3">
      <div
        className="rounded-lg border px-3 py-2 text-[11px] leading-relaxed"
        style={{ borderColor: `${accentColor}28`, background: `${accentColor}08`, color: textColor }}
      >
        {summary}
      </div>

      {sections.map(section => (
        <div
          key={section.kind}
          className="rounded-lg border px-3 py-2"
          style={{ borderColor: section.border, background: section.bg }}
        >
          <p className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: section.color }}>
            <AlertTriangle size={11} />
            <span>{section.label}</span>
          </p>
          <ul className="space-y-1 text-[11px] leading-relaxed" style={{ color: textColor }}>
            {section.items.slice(0, 4).map(item => (
              <li key={item} className="flex gap-1.5">
                <span style={{ color: section.color }}>•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="grid gap-2">
        <LibraryDraftPreviewMetric label={pfdLabel} value={pfdValue} />
      </div>
    </div>
  )
}
