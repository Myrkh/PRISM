declare module 'jspdf' {
    export default class jsPDF {
      constructor(options?: unknown)
      addImage(...args: unknown[]): void
      addPage(...args: unknown[]): void
      save(filename?: string): void
      setFontSize(size: number): void
      text(text: string, x: number, y: number, options?: unknown): void
      splitTextToSize(text: string, maxWidth: number): string[]
      internal: { pageSize: { getWidth(): number; getHeight(): number } }
    }
  }