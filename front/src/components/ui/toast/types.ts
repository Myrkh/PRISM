export type ToastKind = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  kind: ToastKind
  title: string
  message?: string
  /** ms until auto-dismiss. 0 = persistent (user must close). Default: kind-based */
  duration?: number
}
