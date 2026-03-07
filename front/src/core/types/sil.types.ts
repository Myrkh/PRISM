/**
 * core/types/sil.types.ts — PRISM
 *
 * SIL levels, architecture definitions, and their metadata.
 * Foundation types with no dependencies.
 */

// ─── SIL ───────────────────────────────────────────────────────────────────
export type SILLevel = 0 | 1 | 2 | 3 | 4

export interface SILMeta {
  sil: SILLevel
  label: string
  color: string
  bgLight: string
  bgDark: string
  borderLight: string
  borderDark: string
  pfdMin: number
  pfdMax: number
}

export const SIL_META: Record<SILLevel, SILMeta> = {
  0: { sil:0, label:'N/A',   color:'#6B7280', bgLight:'#F9FAFB', bgDark:'#111827', borderLight:'#E5E7EB', borderDark:'#374151', pfdMin:1e-1,  pfdMax:1 },
  1: { sil:1, label:'SIL 1', color:'#16A34A', bgLight:'#F0FDF4', bgDark:'#052E16', borderLight:'#BBF7D0', borderDark:'#15803D', pfdMin:1e-2,  pfdMax:1e-1 },
  2: { sil:2, label:'SIL 2', color:'#2563EB', bgLight:'#EFF6FF', bgDark:'#0F1B3D', borderLight:'#BFDBFE', borderDark:'#1D4ED8', pfdMin:1e-3,  pfdMax:1e-2 },
  3: { sil:3, label:'SIL 3', color:'#D97706', bgLight:'#FFFBEB', bgDark:'#1A1000', borderLight:'#FDE68A', borderDark:'#B45309', pfdMin:1e-4,  pfdMax:1e-3 },
  4: { sil:4, label:'SIL 4', color:'#7C3AED', bgLight:'#F5F3FF', bgDark:'#1E0540', borderLight:'#DDD6FE', borderDark:'#7C3AED', pfdMin:1e-5,  pfdMax:1e-4 },
}

// ─── Architecture ─────────────────────────────────────────────────────────
export type Architecture = '1oo1' | '1oo2' | '2oo2' | '2oo3' | '1oo2D' | 'custom'

export interface ArchitectureMeta {
  label: string
  desc: string
  HFT: number
  channels: number
}

export const ARCHITECTURE_META: Record<Architecture, ArchitectureMeta> = {
  '1oo1':  { label:'1oo1',  desc:'Single channel',                HFT:0, channels:1 },
  '1oo2':  { label:'1oo2',  desc:'1-out-of-2 (fail-safe)',        HFT:1, channels:2 },
  '2oo2':  { label:'2oo2',  desc:'2-out-of-2 (high avail.)',      HFT:0, channels:2 },
  '2oo3':  { label:'2oo3',  desc:'2-out-of-3 (voted)',            HFT:1, channels:3 },
  '1oo2D': { label:'1oo2D', desc:'1oo2 with diagnostics',         HFT:1, channels:2 },
  'custom': { label:'Custom', desc:'Custom boolean AND/OR architecture', HFT:0, channels:2 },
}
