/**
 * ArchitectureWorkspace — conteneur minimal pour le Loop Editor.
 *
 * Principes :
 *   - Le canvas ReactFlow prend tout l'espace disponible.
 *   - Zéro chrome parasite (stats, footer nav) → lifecycle bar gère la navigation,
 *     right panel (LoopEditorRightPanel) gère les KPIs et la librairie.
 *   - Seul élément conservé : une micro-barre de statut en haut (1 ligne, discret).
 */
import { type ReactNode } from 'react'
import { Network } from 'lucide-react'
import type { SIF, SIFCalcResult } from '@/core/types'
import { BORDER, TEAL_DIM, TEXT_DIM } from '@/styles/tokens'

interface Props {
  sif: SIF
  result: SIFCalcResult
  children: ReactNode
}

export function ArchitectureWorkspace({ sif, result, children }: Props) {
  const totalChannels = sif.subsystems.reduce((n, s) => n + s.channels.length, 0)
  const redundant     = sif.subsystems.filter(s => s.channels.length > 1).length

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden">

      {/* Micro status bar — 1 ligne, très discret */}
      <div
        className="flex shrink-0 items-center gap-3 border-b px-4 py-2"
        style={{ borderColor: BORDER, background: '#0F1318' }}
      >
        <Network size={12} style={{ color: TEAL_DIM, flexShrink: 0 }} />
        <span className="text-[11px]" style={{ color: TEXT_DIM }}>
          {sif.subsystems.length} sous-système{sif.subsystems.length > 1 ? 's' : ''}
          {' · '}{totalChannels} canal{totalChannels > 1 ? 'aux' : ''}
          {redundant > 0 ? ` · ${redundant} voie${redundant > 1 ? 's' : ''} redondante${redundant > 1 ? 's' : ''}` : ''}
          {result.meetsTarget
            ? <span style={{ color: '#4ADE80' }}> · SIL {result.SIL} ✓</span>
            : <span style={{ color: '#F87171' }}> · SIL {result.SIL} — cible SIL {sif.targetSIL} non atteinte</span>
          }
        </span>
        <span className="ml-auto text-[10px]" style={{ color: `${TEXT_DIM}60` }}>Autosave actif</span>
      </div>

      {/* Canvas ReactFlow — plein écran */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {children}
      </div>

    </div>
  )
}
