/**
 * ArchitectureWorkspace — coque minimale pour le composeur d'architecture.
 *
 * Principes :
 *   - le workspace central prend tout l'espace disponible
 *   - aucun header local : la navigation vit deja dans le shell SIF
 *   - le loop editor gere seul son propre rythme visuel
 */
import type { ReactNode } from 'react'
import type { SIF, SIFCalcResult } from '@/core/types'

interface Props {
  sif: SIF
  result: SIFCalcResult
  children: ReactNode
}

export function ArchitectureWorkspace({ children }: Props) {
  return (
    <div className="flex min-h-full flex-col">
      <div className="flex flex-1">
        {children}
      </div>
    </div>
  )
}
