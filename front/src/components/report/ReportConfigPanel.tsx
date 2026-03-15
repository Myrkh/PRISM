import { Settings2, Printer, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RightPanelShell } from '@/components/layout/RightPanelShell'
import { usePrismTheme } from '@/styles/usePrismTheme'
import type { ReportConfig } from './reportTypes'
import { ToggleRow } from './ConfigSection'

interface ReportConfigPanelProps {
  cfg: ReportConfig
  setCfg: <K extends keyof ReportConfig>(key: K, value: ReportConfig[K]) => void
  showPreview: boolean
  onPrint: () => void
  isExporting: boolean
}

const TABS = [{ id: 'studio', label: 'Report Studio', Icon: Settings2 }]

function SectionLabel({ children }: { children: React.ReactNode }) {
  const { TEXT_DIM } = usePrismTheme()
  return (
    <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: TEXT_DIM }}>
      {children}
    </p>
  )
}

function SectionCard({
  children,
}: {
  children: React.ReactNode
}) {
  const { BORDER, PAGE_BG } = usePrismTheme()
  return (
    <div className="rounded-xl border p-3 space-y-3" style={{ background: PAGE_BG, borderColor: BORDER }}>
      {children}
    </div>
  )
}

function FieldBlock({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  )
}

export function ReportConfigPanel({
  cfg,
  setCfg: set,
  onPrint,
  isExporting,
}: ReportConfigPanelProps) {
  const { BORDER, CARD_BG, PAGE_BG, PANEL_BG, TEAL, TEAL_DIM, TEXT, TEXT_DIM, semantic } = usePrismTheme()

  return (
    <RightPanelShell
      items={TABS}
      active="studio"
      onSelect={() => {}}
      contentBg={PANEL_BG}
    >
      <div className="flex h-full flex-col overflow-hidden" style={{ background: PANEL_BG }}>
        <div className="shrink-0 border-b px-3 py-3" style={{ borderColor: BORDER }}>
          <Button
            size="sm"
            onClick={onPrint}
            disabled={isExporting}
            className="h-8 min-w-[120px] gap-1.5 px-3 text-xs"
            style={{ background: `${TEAL}14`, color: TEAL_DIM, border: `1px solid ${TEAL}35` }}
          >
            {isExporting ? (
              <><span className="animate-spin mr-1">⟳</span> Generating...</>
            ) : (
              <><Printer size={12} /> Export PDF</>
            )}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          <div className="space-y-4 rounded-xl border p-3" style={{ background: CARD_BG, borderColor: BORDER }}>

          <div className="rounded-xl border p-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <SectionLabel>Report package</SectionLabel>
                <p className="text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
                  Ajuste uniquement les métadonnées et les sections publiées dans le PDF.
                </p>
              </div>
              <div className="rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide"
                style={{ borderColor: `${semantic.success}40`, color: semantic.success, background: `${semantic.success}10` }}>
                PDF
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg border px-3 py-2.5" style={{ borderColor: BORDER, background: CARD_BG }}>
                <p className="text-[10px] uppercase tracking-wide" style={{ color: TEXT_DIM }}>Document ref.</p>
                <p className="mt-1 text-sm font-bold font-mono truncate" style={{ color: TEXT }}>{cfg.docRef || '—'}</p>
              </div>
              <div className="rounded-lg border px-3 py-2.5" style={{ borderColor: BORDER, background: CARD_BG }}>
                <p className="text-[10px] uppercase tracking-wide" style={{ color: TEXT_DIM }}>Version</p>
                <p className="mt-1 text-sm font-bold font-mono truncate" style={{ color: TEXT }}>{cfg.version || '—'}</p>
              </div>
            </div>
          </div>

          {/* Metadata Section */}
          <div>
            <SectionLabel>Metadata</SectionLabel>
            <SectionCard>
              <FieldBlock label="Report title">
                <Input value={cfg.title} onChange={e => set('title', e.target.value)} className="text-xs h-8" />
              </FieldBlock>
              <div className="grid grid-cols-2 gap-2">
                <FieldBlock label="Doc reference">
                  <Input value={cfg.docRef} onChange={e => set('docRef', e.target.value)} className="text-xs h-8 font-mono" />
                </FieldBlock>
                <FieldBlock label="Version">
                  <Input value={cfg.version} onChange={e => set('version', e.target.value)} className="text-xs h-8" />
                </FieldBlock>
              </div>
              <FieldBlock label="Confidentiality">
                <Input value={cfg.confidentialityLabel} onChange={e => set('confidentialityLabel', e.target.value)} className="text-xs h-8" />
              </FieldBlock>
            </SectionCard>
          </div>

          {/* Content Section */}
          <div>
            <SectionLabel>Content</SectionLabel>
            <SectionCard>
              <FieldBlock label="Scope">
                <Textarea rows={3} value={cfg.scope} onChange={e => set('scope', e.target.value)} className="text-xs" />
              </FieldBlock>
              <FieldBlock label="Assumptions note">
                <Textarea rows={3} value={cfg.assumptions} onChange={e => set('assumptions', e.target.value)} className="text-xs" />
                <p className="text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
                  Utilisé comme note éditoriale au-dessus du registre d’hypothèses du PDF.
                </p>
              </FieldBlock>
              <FieldBlock label="Recommendations">
                <Textarea rows={3} value={cfg.recommendations} onChange={e => set('recommendations', e.target.value)} className="text-xs" />
              </FieldBlock>
            </SectionCard>
          </div>

          {/* Sections Toggle Section */}
          <div>
            <SectionLabel>Sections</SectionLabel>
            <SectionCard>
              <ToggleRow label="PFD degradation chart" desc="Sawtooth SVG embedded in PDF." value={cfg.showPFDChart} onChange={v => set('showPFDChart', v)} />
              <ToggleRow label="Subsystem table" desc="Detailed subsystem summary with SIL and architectural data." value={cfg.showSubsystemTable} onChange={v => set('showSubsystemTable', v)} />
              <ToggleRow label="Component parameters" desc="Component-level parameters and proof-test inputs." value={cfg.showComponentTable} onChange={v => set('showComponentTable', v)} />
              <ToggleRow label="Compliance matrix" desc="IEC 61511 verification matrix and checks." value={cfg.showComplianceMatrix} onChange={v => set('showComplianceMatrix', v)} />
              <ToggleRow label="Assumptions" desc="Structured SIF assumption register with statuses and rationale." value={cfg.showAssumptions} onChange={v => set('showAssumptions', v)} />
              <ToggleRow label="Recommendations" desc="Closing engineering actions and follow-up guidance." value={cfg.showRecommendations} onChange={v => set('showRecommendations', v)} />
            </SectionCard>
          </div>

          {/* Signatures Section */}
          <div>
            <SectionLabel>Signatures</SectionLabel>
            <SectionCard>
              {([ 'preparedBy', 'checkedBy', 'approvedBy'] as const).map(k => (
                <FieldBlock key={k} label={k.replace('By', ' by').replace(/^./, value => value.toUpperCase())}>
                  <Input value={cfg[k]} onChange={e => set(k, e.target.value)} className="text-xs h-8" />
                </FieldBlock>
              ))}
            </SectionCard>
          </div>

        </div>
        </div>
      </div>
    </RightPanelShell>
  )
}
