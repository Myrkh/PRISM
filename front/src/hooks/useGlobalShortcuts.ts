/**
 * useGlobalShortcuts — keyboard shortcuts mounted at app root.
 * Reads effective keybindings from preferences (default + user overrides).
 *
 * Supported shortcuts (all configurable via Settings > Keyboard Shortcuts):
 *   toggleLeftPanel   Ctrl+b  — toggle sidebar (skips editable targets)
 *   toggleRightPanel  Ctrl+j  — toggle properties panel (skips editable)
 *   toggleFocusMode   Ctrl+Shift+Z — zen mode
 *   toggleSplitView   Ctrl+\  — split view (skips editable)
 *   globalSearch      Ctrl+Shift+F — navigate to search
 *   commandMode       Ctrl+Shift+P — command palette in commands mode
 *   openChatPanel     Ctrl+I — open PRISM AI chat
 */
import { useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { matchesShortcut, getEffectiveKeybinding } from '@/core/shortcuts/defaults'
import { openPalette } from '@/components/layout/command-palette'

export function useGlobalShortcuts() {
  const toggleLeftPanel      = useAppStore(s => s.toggleLeftPanel)
  const toggleRightPanel     = useAppStore(s => s.toggleRightPanel)
  const toggleFocusMode      = useAppStore(s => s.toggleFocusMode)
  const toggleStatusBar      = useAppStore(s => s.toggleStatusBar)
  const toggleCenteredLayout = useAppStore(s => s.toggleCenteredLayout)
  const toggleChatPanel      = useAppStore(s => s.toggleChatPanel)
  const chatPanelOpen        = useAppStore(s => s.chatPanelOpen)
  const secondSlot           = useAppStore(s => s.secondSlot)
  const openSecondSlot       = useAppStore(s => s.openSecondSlot)
  const closeSecondSlot      = useAppStore(s => s.closeSecondSlot)
  const navigate             = useAppStore(s => s.navigate)
  const userKeybindings      = useAppStore(s => s.preferences.userKeybindings)

  useEffect(() => {
    const kb = (id: string) => getEffectiveKeybinding(id, userKeybindings)

    const handler = (e: KeyboardEvent) => {
      // Ctrl+Shift+P — command palette commands mode
      if (matchesShortcut(e, kb('commandMode'))) {
        e.preventDefault()
        openPalette('>')
        return
      }

      // Ctrl+Shift+F — global search
      if (matchesShortcut(e, kb('globalSearch'))) {
        e.preventDefault()
        navigate({ type: 'search' })
        return
      }

      // Ctrl+I — toggle PRISM AI chat
      if (matchesShortcut(e, kb('openChatPanel'))) {
        e.preventDefault()
        toggleChatPanel()
        return
      }

      // Ctrl+Shift+Z — zen mode (always, even in editable)
      if (matchesShortcut(e, kb('toggleFocusMode'))) {
        e.preventDefault()
        toggleFocusMode()
        return
      }

      // Status bar & centered layout — always, even in editable
      if (matchesShortcut(e, kb('toggleStatusBar'))) {
        e.preventDefault()
        toggleStatusBar()
        return
      }

      if (matchesShortcut(e, kb('toggleCenteredLayout'))) {
        e.preventDefault()
        toggleCenteredLayout()
        return
      }

      // Panel + split shortcuts skip text inputs
      if (isEditable(e.target)) return

      if (matchesShortcut(e, kb('toggleLeftPanel'))) {
        e.preventDefault()
        toggleLeftPanel()
        return
      }

      if (matchesShortcut(e, kb('toggleRightPanel'))) {
        e.preventDefault()
        toggleRightPanel()
        return
      }

      if (matchesShortcut(e, kb('toggleSplitView'))) {
        e.preventDefault()
        if (secondSlot) closeSecondSlot()
        else openSecondSlot()
        return
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [
    toggleLeftPanel, toggleRightPanel, toggleFocusMode,
    toggleStatusBar, toggleCenteredLayout, toggleChatPanel, chatPanelOpen,
    secondSlot, openSecondSlot, closeSecondSlot, navigate, userKeybindings,
  ])
}

function isEditable(target: EventTarget | null): boolean {
  if (!target) return false
  const el = target as HTMLElement
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable
}
