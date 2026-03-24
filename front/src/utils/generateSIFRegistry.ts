/**
 * generateSIFRegistry.ts
 *
 * Génère le fichier .prism/sif-registry.md automatiquement à partir de tous
 * les projets et SIF du workspace. Ce fichier est injecté dans le contexte IA
 * pour lui permettre de distinguer, comparer et naviguer entre les SIF.
 *
 * Format optimisé pour les LLM : structuré, dense, facile à parser.
 */
import type { Project } from '@/core/types'
import { calcSIF } from '@/core/math/pfdCalc'

function formatPFD(pfd: number | undefined): string {
  if (pfd === undefined || pfd === null || isNaN(pfd)) return '—'
  if (pfd === 0) return '0'
  const exp = Math.floor(Math.log10(pfd))
  const mant = pfd / Math.pow(10, exp)
  return `${mant.toFixed(2)}×10⁻${Math.abs(exp)}`
}

function silLabel(sil: number | string | undefined): string {
  if (sil === undefined || sil === null) return '—'
  const n = Number(sil)
  if (isNaN(n) || n === 0) return '—'
  return `SIL ${n}`
}

function phaseLabel(sif: { subsystems?: unknown[]; processSafetyTime?: number; hazardousEvent?: string }): string {
  const s = sif as Record<string, unknown>
  const subsystems = (s.subsystems as unknown[]) ?? []
  // Heuristic: determine phase based on data completeness
  if (!s.hazardousEvent && !s.processSafetyTime) return 'Contexte'
  if (subsystems.length === 0) return 'Contexte'
  const hasComponents = subsystems.some((sub: unknown) => {
    const su = sub as Record<string, unknown>
    return (su.channels as unknown[] ?? []).some((ch: unknown) => {
      const c = ch as Record<string, unknown>
      return ((c.components as unknown[]) ?? []).length > 0
    })
  })
  if (!hasComponents) return 'Architecture'
  return 'Vérification'
}

export function generateSIFRegistry(projects: Project[]): string {
  const now = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })

  const lines: string[] = [
    `# Registre SIF du workspace`,
    `> Auto-généré par PRISM · ${now}`,
    `> Ce fichier liste toutes les SIF actives. L'IA l'utilise pour identifier, comparer et naviguer entre les SIF.`,
    '',
  ]

  const totalSIFs = projects.reduce((acc, p) => acc + (p.sifs?.length ?? 0), 0)
  lines.push(`**${projects.length} projet(s) · ${totalSIFs} SIF(s)**`, '')

  if (totalSIFs === 0) {
    lines.push('_Aucune SIF dans le workspace._')
    return lines.join('\n')
  }

  for (const project of projects) {
    const sifs = project.sifs ?? []
    if (sifs.length === 0) continue

    lines.push(`## Projet : ${project.name}`)
    if (project.description) lines.push(`> ${project.description}`)
    lines.push('')

    for (const sif of sifs) {
      const calc = calcSIF(sif, { projectStandard: project.standard })
      const pfd = formatPFD(calc?.PFD_avg)
      const silAchieved = calc?.SIL !== undefined ? `SIL ${calc.SIL}` : '—'
      const verdict = calc?.meetsTarget ? '✅' : '⚠️'
      const phase = phaseLabel(sif as unknown as Record<string, unknown>)

      lines.push(`### [${sif.sifNumber}] ${sif.title}`)
      lines.push(`- **Phase** : ${phase} | **Révision** : ${sif.revision}`)
      lines.push(`- **SIL cible** : ${silLabel(sif.targetSIL)} | **PFD calculé** : ${pfd} | **SIL atteint** : ${silAchieved} ${verdict}`)

      if (sif.hazardousEvent) {
        lines.push(`- **Danger** : ${sif.hazardousEvent}`)
      }
      if ((sif as unknown as Record<string, unknown>).processSafetyTime) {
        const pst = (sif as unknown as Record<string, unknown>).processSafetyTime as number
        const rt = (sif as unknown as Record<string, unknown>).sifResponseTime as number | undefined
        lines.push(`- **PST** : ${pst}s${rt !== undefined ? ` | **Temps réponse SIF** : ${rt}s` : ''}`)
      }
      if ((sif as unknown as Record<string, unknown>).safeState) {
        lines.push(`- **État sûr** : ${(sif as unknown as Record<string, unknown>).safeState as string}`)
      }

      const subsystems = sif.subsystems ?? []
      if (subsystems.length > 0) {
        const archSummary = subsystems.map(sub => {
          const compCount = sub.channels.reduce((acc, ch) => acc + ch.components.length, 0)
          return `${sub.label} (${sub.type}, ${sub.architecture}, ${compCount} composant(s))`
        }).join(' + ')
        lines.push(`- **Architecture** : ${archSummary}`)
      }

      if (calc && !calc.meetsTarget) {
        lines.push(`- **⚠️ Écart SIL** : PFD ${pfd} dépasse la cible ${silLabel(sif.targetSIL)}`)
      }

      lines.push('')
    }
  }

  return lines.join('\n')
}
