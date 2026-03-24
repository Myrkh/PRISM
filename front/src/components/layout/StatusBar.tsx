/**
 * StatusBar — VS Code-inspired 22px footer bar.
 *
 * Shows: SIF number · tab · PFDavg · SIL verdict · backend status dot.
 * Toggled by preferences.statusBarVisible (default: false).
 * Hidden when no SIF is open.
 */
import { useAppStore, selectSIFCalc } from '@/store/appStore'
import { normalizeSIFTab } from '@/store/types'
import { calcSIF } from '@/core/math/pfdCalc'
import { useFormatValue } from '@/utils/formatValue'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { useLocaleStrings } from '@/i18n/useLocale'
import { getShellStrings } from '@/i18n/shell'
import { useSIFDiagnostics } from '@/core/diagnostics'
import { DiagnosticsBadge } from '@/components/sif/DiagnosticsPanel'

export function StatusBar() {
  const { BORDER, PANEL_BG, TEXT, TEXT_DIM, TEAL } = usePrismTheme()
  const { fmt } = useFormatValue()
  const strings  = useLocaleStrings(getShellStrings)

  const view       = useAppStore(s => s.view)
  const projects   = useAppStore(s => s.projects)
  const visible    = useAppStore(s => s.preferences.statusBarVisible)

  const isSif = view.type === 'sif-dashboard'
  const projectId = isSif ? view.projectId : ''
  const sifId     = isSif ? view.sifId     : ''

  const calc = useAppStore(s => isSif ? selectSIFCalc(s, projectId, sifId) : null)

  const project = projects.find(p => p.id === projectId)
  const sif     = project?.sifs.find(s => s.id === sifId)
  const diagnostics  = useSIFDiagnostics(sif ?? null)

  if (!visible) return null

  const derivedCalc  = calc ?? (sif ? calcSIF(sif) : null)
  const tabLabel     = isSif ? (strings.sifTabLabels[normalizeSIFTab(view.tab)] ?? normalizeSIFTab(view.tab)) : null

  const passColor = '#4ADE80'
  const failColor = '#F87171'

  return (
    <div
      className="flex items-center px-3 gap-4 shrink-0 select-none"
      style={{
        height: 22,
        fontSize: 11,
        borderTop: `1px solid ${BORDER}`,
        background: PANEL_BG,
        color: TEXT_DIM,
      }}
    >
      {!isSif || !sif ? (
        <span>{strings.statusBar.noSIF}</span>
      ) : (
        <>
          {/* SIF number + title */}
          <span style={{ color: TEXT }}>
            {sif.sifNumber}
            {sif.title ? ` · ${sif.title}` : ''}
          </span>

          {/* Current tab */}
          {tabLabel && (
            <>
              <Divider color={BORDER} />
              <span>{tabLabel}</span>
            </>
          )}

          {/* PFD + SIL */}
          {derivedCalc && (
            <>
              <Divider color={BORDER} />
              <span style={{ color: TEAL }}>
                PFD {fmt(derivedCalc.PFD_avg)}
              </span>
              <Divider color={BORDER} />
              <span style={{ fontWeight: 700, color: derivedCalc.meetsTarget ? passColor : failColor }}>
                SIL {derivedCalc.SIL}
                {' '}
                <span style={{ fontWeight: 400 }}>
                  {derivedCalc.meetsTarget ? strings.statusBar.pass : strings.statusBar.fail}
                </span>
              </span>
            </>
          )}
        </>
      )}

      {/* Diagnostics badge */}
      {isSif && sif && (
        <>
          <Divider color={BORDER} />
          <DiagnosticsBadge diagnostics={diagnostics} />
        </>
      )}

      {/* Spacer */}
      <span className="flex-1" />

      {/* Backend status dot */}
      <BackendDot />
    </div>
  )
}

function Divider({ color }: { color: string }) {
  return (
    <span style={{ width: 1, height: 10, background: color, display: 'inline-block', flexShrink: 0 }} />
  )
}

function BackendDot() {
  const { TEXT_DIM } = usePrismTheme()
  // Simple static indicator — could be extended with a real health check
  return (
    <span className="flex items-center gap-1" style={{ color: TEXT_DIM }}>
      <span
        className="inline-block rounded-full"
        style={{ width: 6, height: 6, background: '#4ADE80' }}
      />
      API
    </span>
  )
}
