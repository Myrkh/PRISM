import { Monitor, Moon, Settings2, Sun } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/lib/utils'

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const isDark = useAppStore(s => s.isDark)
  const setTheme = useAppStore(s => s.setTheme)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <section className="space-y-3">
            <p className="text-sm font-semibold">Appearance</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'light', icon: Sun, title: 'Light', active: !isDark, onClick: () => setTheme(false) },
                { id: 'dark', icon: Moon, title: 'Dark', active: isDark, onClick: () => setTheme(true) },
              ].map(opt => {
                const Icon = opt.icon
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={opt.onClick}
                    className={cn(
                      'rounded-xl border p-3 text-left transition-all',
                      opt.active
                        ? 'border-primary/40 bg-primary/10 shadow-sm'
                        : 'border-border/70 hover:border-border hover:bg-muted/30',
                    )}
                  >
                    <div className="mb-2 inline-flex rounded-md border border-border/70 bg-background/60 p-1.5">
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-semibold">{opt.title}</p>
                    <p className="text-xs text-muted-foreground">Optimized for {opt.title.toLowerCase()} environments</p>
                  </button>
                )
              })}
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
              <Monitor className="h-3.5 w-3.5" />
              System theme mode can be added in a next iteration.
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-sm font-semibold">Workspace</p>
            <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Compact density</p>
                  <p className="text-xs text-muted-foreground">Reduce spacing in dashboards (coming soon)</p>
                </div>
                <Switch disabled checked={false} aria-label="Compact density" />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Email notifications</p>
                  <p className="text-xs text-muted-foreground">Notify approvals and review transitions</p>
                </div>
                <Switch disabled checked={true} aria-label="Email notifications" />
              </div>
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
