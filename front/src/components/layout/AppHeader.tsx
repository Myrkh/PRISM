/**
 * AppHeader.tsx — PRISM v4
 *
 * Grid: [Logo 288px] | [CommandPaletteBar 1fr] | [Right Tools auto]
 */
import { Minus, Square, X } from 'lucide-react'

const isDesktop = typeof window !== 'undefined' && !!(window as { prismDesktop?: { isDesktop?: boolean } }).prismDesktop?.isDesktop

import { useAppStore } from '@/store/appStore'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { CommandPalette } from './command-palette'
import { LayoutControls } from './layout-controls'
import { ChatPanel } from './ChatPanel'

export function AppHeader() {
  const { BORDER, RAIL_BG, TEXT_DIM, SHADOW_TAB, TEAL, isDark: themeIsDark } = usePrismTheme()
  const navigate = useAppStore(s => s.navigate)
  const chatPanelOpen = useAppStore(s => s.chatPanelOpen)
  const toggleChatPanel = useAppStore(s => s.toggleChatPanel)

  return (
    <header
      className='relative sticky top-0 z-50 grid h-12 items-center border-b'
      style={{
        gridTemplateColumns: '288px 1fr auto',
        background: RAIL_BG,
        borderColor: BORDER,
        boxShadow: SHADOW_TAB + ', inset 0 1px 0 ' + (themeIsDark ? 'rgba(255,255,255,0.085)' : 'rgba(255,255,255,0.92)') + ', inset 0 -1px 0 ' + (themeIsDark ? 'rgba(0,0,0,0.28)' : 'rgba(15,23,42,0.06)'),
        ...(isDesktop && { WebkitAppRegion: 'drag' } as React.CSSProperties),
      }}
    >
      <div
        className='relative z-10 flex h-full items-center border-r px-2'
        style={{
          borderColor: BORDER,
          boxShadow: 'inset -1px 0 0 ' + (themeIsDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.82)') + ', inset 0 1px 0 ' + (themeIsDark ? 'rgba(255,255,255,0.04)' : 'transparent'),
          ...(isDesktop && { WebkitAppRegion: 'no-drag' } as React.CSSProperties),
        }}
      >
        <button
          onClick={() => navigate({ type: 'projects' })}
          className='flex items-center gap-2 transition-opacity hover:opacity-85'
        >
          <img src='/favicon2.png' alt='PRISM' className='h-8 w-8 rounded object-contain' />
          <span className='text-[17px] font-black tracking-widest' style={{ color: TEXT_DIM }}>
            PRISM
          </span>
        </button>
      </div>

      <div aria-hidden='true' className='min-w-0' />
      <div
        className='relative z-10 flex items-center justify-end gap-2 px-3'
        style={isDesktop ? { WebkitAppRegion: 'no-drag' } as React.CSSProperties : undefined}
      >
        <LayoutControls />

        {isDesktop && <div className='h-4 w-px shrink-0' style={{ background: BORDER }} />}

        {isDesktop && (
          <div className='ml-1 flex items-center' style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            {[
              { icon: Minus, action: 'minimize', hover: themeIsDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
              { icon: Square, action: 'maximize', hover: themeIsDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
              { icon: X, action: 'close', hover: '#e81123' },
            ].map(({ icon: Icon, action, hover }) => (
              <button
                key={action}
                type='button'
                className='flex h-12 w-11 items-center justify-center transition-colors'
                style={{ color: TEXT_DIM }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = hover
                  if (action === 'close') e.currentTarget.style.color = '#fff'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = TEXT_DIM
                }}
                onClick={() => (window as { prismDesktop?: Record<string, () => void> }).prismDesktop?.[action]?.()}
              >
                <Icon size={11} strokeWidth={1.5} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        className='pointer-events-none absolute inset-x-0 top-0 flex h-full items-center justify-center px-4'
        style={isDesktop ? { WebkitAppRegion: 'no-drag' } as React.CSSProperties : undefined}
      >
        <div className='pointer-events-auto flex min-w-0 items-center gap-2' style={{ transform: 'translateX(18px)' }}>
          <div className='min-w-0' style={{ width: 'clamp(320px, 40vw, 560px)' }}>
            <CommandPalette
              onOpenSettings={() => navigate({ type: 'settings', section: 'general' })}
              onOpenDocs={() => navigate({ type: 'docs' })}
              onOpenSearch={() => navigate({ type: 'search' })}
              onOpenLibrary={() => navigate({ type: 'library' })}
            />
          </div>

          <button
            type='button'
            title='PRISM AI Chat (⌘I)'
            onClick={toggleChatPanel}
            className='inline-flex h-8 w-9 shrink-0 items-center justify-center rounded-md transition-all'
            style={chatPanelOpen ? {
              border: '1px solid ' + TEAL + '40',
              background: TEAL + '14',
              boxShadow: '0 0 0 1px ' + TEAL + '22',
            } : {
              border: '1px solid transparent',
              background: 'transparent',
              boxShadow: 'none',
            }}
            onMouseEnter={event => {
              if (chatPanelOpen) return
              event.currentTarget.style.background = themeIsDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
              const img = event.currentTarget.querySelector('img')
              if (img) img.style.opacity = '1'
            }}
            onMouseLeave={event => {
              if (chatPanelOpen) return
              event.currentTarget.style.background = 'transparent'
              const img = event.currentTarget.querySelector('img')
              if (img) img.style.opacity = '0.88'
            }}
          >
            <img
              src='/prism_ai.png'
              alt='PRISM AI'
              className='h-5 w-auto select-none object-contain'
              draggable={false}
              style={{ opacity: chatPanelOpen ? 1 : 0.88 }}
            />
          </button>
        </div>
      </div>
      {chatPanelOpen && <ChatPanel onClose={toggleChatPanel} />}
    </header>
  )
}
