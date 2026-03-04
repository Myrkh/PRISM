import { ShieldCheck, Sun, Moon, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAppStore, selectCurrentSIF } from '@/store/appStore'
import { SILBadge } from '@/components/shared/SILBadge'
import { calcSIF } from '@/core/math/pfdCalc'
import { useMemo } from 'react'

export function AppHeader() {
  const isDark       = useAppStore(s => s.isDark)
  const toggleTheme  = useAppStore(s => s.toggleTheme)
  const view         = useAppStore(s => s.view)
  const navigate     = useAppStore(s => s.navigate)
  const projects     = useAppStore(s => s.projects)
  const sif          = useAppStore(selectCurrentSIF)

  const project = view.type !== 'projects'
    ? projects.find(p => p.id === (view as { projectId: string }).projectId)
    : undefined

  const calcResult = useMemo(() => sif ? calcSIF(sif) : null, [sif])

  return (
    <header className="sticky top-0 z-50 h-14 flex items-center gap-3 px-6 border-b bg-background">
      {/* Logo */}
      <button
        onClick={() => navigate({ type: 'projects' })}
        className="flex items-center gap-2.5 shrink-0 hover:opacity-80 transition-opacity"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
          <ShieldCheck size={16} className="text-white" strokeWidth={2.5} />
        </div>
        <div>
          <span className="text-sm font-bold tracking-tight">SafeLoop</span>
          <span className="hidden sm:inline text-xs text-muted-foreground ml-2">SIL Verification</span>
        </div>
      </button>

      {/* Breadcrumb */}
      {project && (
        <>
          <ChevronRight size={14} className="text-muted-foreground shrink-0" />
          <button
            onClick={() => navigate({ type: 'sif-list', projectId: project.id })}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors truncate max-w-[160px]"
          >
            {project.name}
          </button>
        </>
      )}

      {sif && (
        <>
          <ChevronRight size={14} className="text-muted-foreground shrink-0" />
          <span className="text-sm font-medium truncate max-w-[160px]">{sif.sifNumber}</span>
        </>
      )}

      <div className="flex-1" />

      {/* Standards */}
      <div className="hidden md:flex items-center gap-1.5">
        {['IEC 61508', 'IEC 61511', 'ISA-84'].map(s => (
          <Badge key={s} variant="outline" className="text-[10px] font-mono px-2 py-0.5">
            {s}
          </Badge>
        ))}
      </div>

      {/* Live SIL result */}
      {calcResult && (
        <div className="flex items-center gap-2 pl-3">
          <span className="text-xs text-muted-foreground">Result</span>
          <SILBadge sil={calcResult.SIL} size="md" />
        </div>
      )}

      {/* Theme toggle */}
      <Button variant="ghost" size="icon" onClick={toggleTheme} className="ml-2">
        {isDark ? <Sun size={15} /> : <Moon size={15} />}
      </Button>
    </header>
  )
}
