/**
 * shared/StatusIcon.tsx — PRISM
 *
 * Simple pass/fail icon for project tree, home screen, etc.
 */
import { CheckCircle2, AlertTriangle } from 'lucide-react'

export function StatusIcon({ ok }: { ok: boolean }) {
  return ok
    ? <CheckCircle2 size={13} className="ml-auto shrink-0 text-emerald-400" />
    : <AlertTriangle size={13} className="ml-auto shrink-0 text-amber-400" />
}
