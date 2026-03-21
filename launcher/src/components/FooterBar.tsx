/**
 * src/components/FooterBar.tsx — PRISM Launcher
 * Barre de statut ultra-fine. Backend health + version.
 */

import { useEffect, useState } from 'react'
import { colors, semantic, alpha } from '../tokens'
import { useLocaleStrings } from '../i18n/useLocale'
import { getLauncherStrings } from '../i18n/launcher'
import type { ThemeTokens } from '../hooks/useTheme'

type BackendHealth = 'checking' | 'ok' | 'offline'

function useBackendHealth(): BackendHealth {
  const [status, setStatus] = useState<BackendHealth>('checking')
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('http://localhost:8000/health', { signal: AbortSignal.timeout(1500) })
        setStatus(res.ok ? 'ok' : 'offline')
      } catch { setStatus('offline') }
    }
    void check()
    const id = setInterval(check, 15_000)
    return () => clearInterval(id)
  }, [])
  return status
}

export function FooterBar({ t }: { t: ThemeTokens }) {
  const s      = useLocaleStrings(getLauncherStrings)
  const health = useBackendHealth()
  const cfg = {
    checking: { color: t.TEXT_DIM,       dot: t.TEXT_DIM,      label: s.footer.checking  },
    ok:       { color: semantic.success,  dot: semantic.success, label: s.footer.engineOk  },
    offline:  { color: semantic.warning,  dot: semantic.warning, label: s.footer.engineOff },
  }[health]

  return (
    <div
      className="flex h-6 shrink-0 items-center justify-between px-4"
      style={{
        background: t.RAIL_BG,
        borderTop: `1px solid ${alpha(t.BORDER, '60')}`,
      }}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background: cfg.dot,
              boxShadow: health === 'ok' ? `0 0 6px ${cfg.dot}` : 'none',
            }}
          />
          <span className="text-[10px]" style={{ color: cfg.color }}>{cfg.label}</span>
        </div>
        <span style={{ color: alpha(t.BORDER, 'CC') }}>·</span>
        <span className="text-[10px]" style={{ color: t.TEXT_DIM }}>{s.footer.copyright}</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px]" style={{ color: alpha(colors.tealDim, '80') }}>v3.0.2</span>
        <span style={{ color: alpha(t.BORDER, 'CC') }}>·</span>
        <button
          type="button"
          className="text-[10px] transition-colors"
          style={{ color: t.TEXT_DIM }}
          onMouseEnter={e => (e.currentTarget.style.color = t.TEXT)}
          onMouseLeave={e => (e.currentTarget.style.color = t.TEXT_DIM)}
        >
          {s.footer.legal}
        </button>
      </div>
    </div>
  )
}
