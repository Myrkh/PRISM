import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Toast, ToastKind } from './types'

const DEFAULT_DURATION: Record<ToastKind, number> = {
  success: 4000,
  info: 4000,
  warning: 6000,
  error: 0,  // persistent — user must dismiss
}

interface ToastState {
  toasts: Toast[]
  push: (toast: Omit<Toast, 'id'>) => string  // returns id
  dismiss: (id: string) => void
  dismissAll: () => void
}

export const useToastStore = create<ToastState>()(
  immer(set => ({
    toasts: [],
    push: (toast) => {
      const id = crypto.randomUUID()
      set(state => {
        state.toasts.push({
          ...toast,
          id,
          duration: toast.duration ?? DEFAULT_DURATION[toast.kind],
        })
        // Keep max 5 toasts — drop oldest
        if (state.toasts.length > 5) state.toasts.splice(0, state.toasts.length - 5)
      })
      return id
    },
    dismiss: (id) => set(state => {
      state.toasts = state.toasts.filter(t => t.id !== id)
    }),
    dismissAll: () => set(state => { state.toasts = [] }),
  })),
)

/** Convenience hook for pushing toasts */
export function useToast() {
  const push = useToastStore(s => s.push)
  return {
    success: (title: string, message?: string) => push({ kind: 'success', title, message }),
    error:   (title: string, message?: string) => push({ kind: 'error',   title, message }),
    warning: (title: string, message?: string) => push({ kind: 'warning', title, message }),
    info:    (title: string, message?: string) => push({ kind: 'info',    title, message }),
  }
}

/** Imperative version (usable outside React components) */
export const toast = {
  success: (title: string, message?: string) => useToastStore.getState().push({ kind: 'success', title, message }),
  error:   (title: string, message?: string) => useToastStore.getState().push({ kind: 'error',   title, message }),
  warning: (title: string, message?: string) => useToastStore.getState().push({ kind: 'warning', title, message }),
  info:    (title: string, message?: string) => useToastStore.getState().push({ kind: 'info',    title, message }),
}
