/// <reference types="vite/client" />


interface PrismDesktopExportPdfResult {
  ok: boolean
  canceled?: boolean
  error?: string
  filePath?: string
}

interface PrismDesktopBridge {
  isDesktop: boolean
  minimize?: () => Promise<unknown> | unknown
  maximize?: () => Promise<unknown> | unknown
  close?: () => Promise<unknown> | unknown
  recordRecentProject?: (data: unknown) => Promise<unknown> | unknown
  exportNotePdf?: (payload: { title: string; html: string; suggestedFileName?: string }) => Promise<PrismDesktopExportPdfResult>
}

declare global {
  interface Window {
    prismDesktop?: PrismDesktopBridge
  }
}

export {}
