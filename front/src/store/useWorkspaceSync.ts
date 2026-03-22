/**
 * store/useWorkspaceSync.ts
 *
 * React hook that bridges auth state ↔ workspace Supabase sync.
 * Mount once near the root (App.tsx). Safe to call with no auth.
 */
import { useEffect, useRef } from 'react'
import { useAppStore } from './appStore'
import { initWorkspaceSync } from './workspaceStore'

export function useWorkspaceSync() {
  const authUser = useAppStore(s => s.authUser)
  const prevUserId = useRef<string | null>(null)

  useEffect(() => {
    const userId = authUser?.id ?? null
    if (userId === prevUserId.current) return
    prevUserId.current = userId
    void initWorkspaceSync(userId)
  }, [authUser?.id])
}
