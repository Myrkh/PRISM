/**
 * src/components/FooterBar.tsx — PRISM Launcher
 * Barre de pied de page persistante.
 * Gauche : copyright + statut système (backend health, DB size).
 * Droite : version, Legal, Privacy.
 */

import { useEffect, useState } from 'react'
import { colors, semantic, alpha } from '../tokens'
import type { ThemeTokens } from '../hooks/useTheme'

type BackendHealth = 'checking' | 'ok' | 'offline'

function useBackendHealth(): BackendHealth {
  const [status, setStatus] = useState<BackendHealth>('checking')

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('http://localhost:8000/health', {
          signal: AbortSignal.timeout(1500),
        })
        setStatus(res.ok ? 'ok' : 'offline')
      } catch {
        setStatus('offline')
      }
    }
    void check()
    const id = setInterval(check, 15_000)
    return () => clearInterval(id)
  }, [])

  return status
}

interface FooterBarProps {
  t: ThemeTokens
}

export function FooterBar({ t }: FooterBarProps) {
  const health = useBackendHealth()

  const healthCfg = {
    checking: { color: t.TEXT_DIM,        dot: t.TEXT_DIM,       label: 'Vérification…'  },
    ok:       { color: semantic.success,   dot: semantic.success,  label: 'Backend opérationnel' },
    offline:  { color: semantic.warning,   dot: semantic.warning,  label: 'Backend hors ligne'   },
  }[health]

  return (
    <div
      className="flex h-7 shrink-0 items-center justify-between border-t px-4"
      style={{ background: t.RAIL_BG, borderColor: t.BORDER }}
    >
      {/* Gauche */}
      <div className="flex items-center gap-4">
        <span className="text-[10px]" style={{ color: t.TEXT_DIM }}>
          © 2025 PRISM Engineering
        </span>

        {/* Séparateur */}
        <span style={{ color: t.BORDER }}>·</span>

        {/* Statut backend */}
        <div className="flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background: healthCfg.dot,
              boxShadow:  health === 'ok' ? `0 0 5px ${healthCfg.dot}` : 'none',
            }}
          />
          <span className="text-[10px]" style={{ color: healthCfg.color }}>
            {healthCfg.label}
          </span>
        </div>
      </div>

      {/* Droite */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-mono" style={{ color: alpha(colors.tealDim, 'AA') }}>
          v3.0.2
        </span>
        <span style={{ color: t.BORDER }}>·</span>
        <FooterLink t={t} label="Legal" />
        <FooterLink t={t} label="Privacy" />
      </div>
    </div>
  )
}

function FooterLink({ t, label }: { t: ThemeTokens; label: string }) {
  return (
    <button
      type="button"
      className="text-[10px] transition-colors"
      style={{ color: t.TEXT_DIM }}
      onMouseEnter={e => (e.currentTarget.style.color = t.TEXT)}
      onMouseLeave={e => (e.currentTarget.style.color = t.TEXT_DIM)}
    >
      {label}
    </button>
  )
}
