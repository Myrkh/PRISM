import { Cpu, FileText, Printer, Settings2, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RightPanelSection, RightPanelShell } from '@/components/layout/RightPanelShell'
import { usePrismTheme } from '@/styles/usePrismTheme'
import type { ReportConfig } from './reportTypes'
import { ToggleRow } from './ConfigSection'

interface ReportConfigPanelProps {
  cfg: ReportConfig
  setCfg: <K extends keyof ReportConfig>(key: K, value: ReportConfig[K]) => void
  showPreview: boolean
  onPrint: () => void
  onBackendPrint: () => void
  isExporting: boolean
  isBackendExporting: boolean
}


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
  onBackendPrint,
  isExporting,
  isBackendExporting,
}: ReportConfigPanelProps) {
  const { BORDER, CARD_BG, PAGE_BG, PANEL_BG, TEAL, TEAL_DIM, TEXT, TEXT_DIM, semantic } = usePrismTheme()

  return (
    <RightPanelShell contentBg={PANEL_BG} persistKey="report">
      {/* Export actions — always visible */}
      <div className="shrink-0 border-b px-3 py-3" style={{ borderColor: BORDER }}>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={onBackendPrint}
            disabled={isBackendExporting}
            className="h-8 min-w-[132px] gap-1.5 px-3 text-xs"
            style={{ background: TEAL, color: '#F8FAFC', border: `1px solid ${TEAL}` }}
          >
            {isBackendExporting ? (
              <><span className="animate-spin mr-1">⟳</span> Backend...</>
            ) : (
              <><Cpu size={12} /> Backend PDF</>
            )}
          </Button>

          <Button
            size="sm"
            onClick={onPrint}
            disabled={isExporting}
            className="h-8 min-w-[120px] gap-1.5 px-3 text-xs"
            style={{ background: `${TEAL}14`, color: TEAL_DIM, border: `1px solid ${TEAL}35` }}
          >
            {isExporting ? (
              <><span className="animate-spin mr-1">⟳</span> Front...</>
            ) : (
              <><Printer size={12} /> Front PDF</>
            )}
          </Button>
        </div>
      </div>

      <RightPanelSection id="metadata" label="Metadata" Icon={FileText}>
        <div className="space-y-3">
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
        </div>
      </RightPanelSection>

      <RightPanelSection id="content" label="Content" Icon={FileText}>
        <div className="space-y-3">
          <FieldBlock label="Scope">
            <Textarea rows={3} value={cfg.scope} onChange={e => set('scope', e.target.value)} className="text-xs" />
          </FieldBlock>
          <FieldBlock label="Assumptions note">
            <Textarea rows={3} value={cfg.assumptions} onChange={e => set('assumptions', e.target.value)} className="text-xs" />
            <p className="mt-1 text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
              Utilisé comme note éditoriale au-dessus du registre d'hypothèses du PDF.
            </p>
          </FieldBlock>
          <FieldBlock label="Recommendations">
            <Textarea rows={3} value={cfg.recommendations} onChange={e => set('recommendations', e.target.value)} className="text-xs" />
          </FieldBlock>
        </div>
      </RightPanelSection>

      <RightPanelSection id="sections" label="Sections" Icon={SlidersHorizontal}>
        <div className="space-y-1">
          <ToggleRow label="PFD degradation chart" desc="Sawtooth SVG embedded in PDF." value={cfg.showPFDChart} onChange={v => set('showPFDChart', v)} />
          <ToggleRow label="Subsystem table" desc="Detailed subsystem summary with SIL and architectural data." value={cfg.showSubsystemTable} onChange={v => set('showSubsystemTable', v)} />
          <ToggleRow label="Component parameters" desc="Component-level parameters and proof-test inputs." value={cfg.showComponentTable} onChange={v => set('showComponentTable', v)} />
          <ToggleRow label="Compliance matrix" desc="IEC 61511 verification matrix and checks." value={cfg.showComplianceMatrix} onChange={v => set('showComplianceMatrix', v)} />
          <ToggleRow label="Assumptions" desc="Structured SIF assumption register with statuses and rationale." value={cfg.showAssumptions} onChange={v => set('showAssumptions', v)} />
          <ToggleRow label="Recommendations" desc="Closing engineering actions and follow-up guidance." value={cfg.showRecommendations} onChange={v => set('showRecommendations', v)} />
        </div>
      </RightPanelSection>

      <RightPanelSection id="signatures" label="Signatures" Icon={Settings2}>
        <div className="space-y-3">
          {(['preparedBy', 'checkedBy', 'approvedBy'] as const).map(k => (
            <FieldBlock key={k} label={k.replace('By', ' by').replace(/^./, value => value.toUpperCase())}>
              <Input value={cfg[k]} onChange={e => set(k, e.target.value)} className="text-xs h-8" />
            </FieldBlock>
          ))}
        </div>
      </RightPanelSection>
    </RightPanelShell>
  )
}
