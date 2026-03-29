/**
 * components/global/LOPARiskToleranceEditor.tsx — PRISM
 *
 * Project-level risk tolerance table for LOPA.
 * Maps each consequence category to a TMEL [yr⁻¹] threshold.
 * When defined, new LOPA scenarios auto-populate TMEL from this table.
 *
 * Based on IEC 61511-3 / company risk criteria (e.g. ALARP thresholds).
 */
import { useState } from 'react'
import { CheckCircle2, Info } from 'lucide-react'
import type { ConsequenceCategory, RiskToleranceTable } from '@/core/types/lopa.types'
import { usePrismTheme } from '@/styles/usePrismTheme'

const CONSEQUENCE_LABELS: Record<ConsequenceCategory, string> = {
  safety_personnel:     'Sécurité personnel',
  safety_public:        'Sécurité public',
  environment_local:    'Environnement (local)',
  environment_regional: 'Environnement (régional)',
  asset:                'Actifs / équipements',
  production:           'Production / économique',
}

const CONSEQUENCE_ORDER: ConsequenceCategory[] = [
  'safety_personnel',
  'safety_public',
  'environment_local',
  'environment_regional',
  'asset',
  'production',
]

/** Default TMEL values (suggested — user can override) */
const DEFAULT_TMELS: Record<ConsequenceCategory, number> = {
  safety_personnel:     1e-5,   // IEC 61511: 10⁻⁵/yr for safety (personnel)
  safety_public:        1e-6,   // 10⁻⁶/yr for public risk
  environment_local:    1e-4,   // 10⁻⁴/yr for local env
  environment_regional: 1e-5,   // 10⁻⁵/yr for regional env
  asset:                1e-3,   // 10⁻³/yr for asset / business
  production:           1e-2,   // 10⁻²/yr for production
}

interface Props {
  riskTolerance?: RiskToleranceTable
  onSave: (table: RiskToleranceTable) => void
  readOnly?: boolean
}

export function LOPARiskToleranceEditor({ riskTolerance, onSave, readOnly }: Props) {
  const { BORDER, CARD_BG, TEXT, TEXT_DIM, TEAL } = usePrismTheme()

  // Local editable state — draft values as strings for input binding
  const [draft, setDraft] = useState<Partial<Record<ConsequenceCategory, string>>>(() => {
    const initial: Partial<Record<ConsequenceCategory, string>> = {}
    for (const cat of CONSEQUENCE_ORDER) {
      if (riskTolerance?.[cat] !== undefined) {
        initial[cat] = riskTolerance[cat]!.toExponential(0)
      }
    }
    return initial
  })
  const [saved, setSaved] = useState(false)

  const handleChange = (cat: ConsequenceCategory, value: string) => {
    setDraft(d => ({ ...d, [cat]: value }))
    setSaved(false)
  }

  const handleLoadDefaults = () => {
    const defaults: Partial<Record<ConsequenceCategory, string>> = {}
    for (const cat of CONSEQUENCE_ORDER) {
      defaults[cat] = DEFAULT_TMELS[cat].toExponential(0)
    }
    setDraft(defaults)
    setSaved(false)
  }

  const handleSave = () => {
    const table: RiskToleranceTable = {}
    for (const cat of CONSEQUENCE_ORDER) {
      const raw = draft[cat]
      if (raw !== undefined && raw.trim() !== '') {
        const n = parseFloat(raw)
        if (!isNaN(n) && n > 0) table[cat] = n
      }
    }
    onSave(table)
    setSaved(true)
  }

  return (
    <div className="space-y-3">
      {/* Explainer */}
      <div
        className="flex items-start gap-2 rounded-lg px-3 py-2.5"
        style={{ background: `${TEAL}08`, border: `1px solid ${TEAL}15` }}
      >
        <Info size={11} style={{ color: TEAL, flexShrink: 0, marginTop: 1 }} />
        <p className="text-[9px] leading-relaxed" style={{ color: TEXT_DIM }}>
          Définissez les fréquences cibles (TMEL) par catégorie de conséquence.
          Ces valeurs seront automatiquement proposées lors de la création d'un nouveau scénario LOPA.
        </p>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden" style={{ borderColor: BORDER }}>
        <div
          className="grid grid-cols-2 px-3 py-1.5 text-[8px] font-bold uppercase tracking-widest"
          style={{ background: CARD_BG, color: TEXT_DIM, borderBottom: `1px solid ${BORDER}` }}
        >
          <span>Catégorie</span>
          <span className="text-right">TMEL [yr⁻¹]</span>
        </div>

        {CONSEQUENCE_ORDER.map((cat, i) => {
          const value = draft[cat] ?? ''
          const parsed = parseFloat(value)
          const isValid = !isNaN(parsed) && parsed > 0

          return (
            <div
              key={cat}
              className="grid grid-cols-2 items-center gap-2 px-3 py-2"
              style={{
                borderTop: i > 0 ? `1px solid ${BORDER}` : undefined,
              }}
            >
              <span className="text-[10px]" style={{ color: TEXT }}>
                {CONSEQUENCE_LABELS[cat]}
              </span>
              <div className="flex items-center justify-end gap-1">
                {isValid && (
                  <span className="text-[8px] font-mono" style={{ color: TEXT_DIM }}>
                    {parsed.toExponential(0)}
                  </span>
                )}
                <input
                  type="text"
                  value={value}
                  readOnly={readOnly}
                  onChange={readOnly ? undefined : e => handleChange(cat, e.target.value)}
                  placeholder={DEFAULT_TMELS[cat].toExponential(0)}
                  className="w-24 rounded border px-2 py-0.5 text-[10px] font-mono text-right outline-none"
                  style={{
                    background: 'transparent',
                    borderColor: isValid ? `${TEAL}40` : value ? '#EF444440' : BORDER,
                    color: TEXT,
                    opacity: readOnly ? 0.7 : 1,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Actions */}
      {!readOnly && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLoadDefaults}
            className="flex-1 rounded-lg py-1.5 text-[9px] font-semibold transition-colors"
            style={{ background: `${BORDER}40`, color: TEXT_DIM, border: `1px solid ${BORDER}` }}
          >
            Valeurs IEC 61511
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 rounded-lg py-1.5 text-[9px] font-semibold transition-colors flex items-center justify-center gap-1"
            style={{ background: `${TEAL}20`, color: TEAL, border: `1px solid ${TEAL}30` }}
          >
            {saved && <CheckCircle2 size={9} />}
            {saved ? 'Enregistré' : 'Enregistrer'}
          </button>
        </div>
      )}
    </div>
  )
}
