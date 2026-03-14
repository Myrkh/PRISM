import { Settings2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RightPanelShell } from '@/components/layout/RightPanelShell';
import type { ReportConfig } from './reportTypes';
import { ToggleRow } from './ConfigSection';
import { BORDER, CARD_BG, PAGE_BG, PANEL_BG, TEAL_DIM, TEXT, TEXT_DIM } from '@/styles/tokens'
const BG = PAGE_BG

interface ReportConfigPanelProps {
  cfg: ReportConfig;
  setCfg: <K extends keyof ReportConfig>(key: K, value: ReportConfig[K]) => void;
  showPreview: boolean;
  onPrint: () => void;
  isExporting: boolean;
}

// Design tokens copied from other right panels for consistency
const R = 8; // border-radius

const TABS = [{ id: 'studio', label: 'Report Studio', Icon: Settings2 }];

// SectionLabel micro-component, copied from ProofTestRightPanel for consistency
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: TEXT_DIM }}>
      {children}
    </p>
  );
}

export function ReportConfigPanel({
  cfg,
  setCfg: set,
  onPrint,
  isExporting,
}: ReportConfigPanelProps) {
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
            className="h-8 min-w-[100px] gap-1.5 px-3 text-xs bg-sky-500/20 text-sky-300 hover:bg-sky-500/30"
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

          {/* Metadata Section */}
          <div>
            <SectionLabel>Metadata</SectionLabel>
            <div className="rounded-xl border p-3 space-y-3" style={{ background: BG, borderColor: BORDER }}>
              <div className="space-y-1.5">
                <Label className="text-xs">Report title</Label>
                <Input value={cfg.title} onChange={e => set('title', e.target.value)} className="text-xs h-8" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Doc reference</Label>
                  <Input value={cfg.docRef} onChange={e => set('docRef', e.target.value)} className="text-xs h-8 font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Version</Label>
                  <Input value={cfg.version} onChange={e => set('version', e.target.value)} className="text-xs h-8" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Confidentiality</Label>
                <Input value={cfg.confidentialityLabel} onChange={e => set('confidentialityLabel', e.target.value)} className="text-xs h-8" />
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div>
            <SectionLabel>Content</SectionLabel>
            <div className="rounded-xl border p-3 space-y-3" style={{ background: BG, borderColor: BORDER }}>
              <div className="space-y-1.5">
                <Label className="text-xs">Scope</Label>
                <Textarea rows={3} value={cfg.scope} onChange={e => set('scope', e.target.value)} className="text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Assumptions</Label>
                <Textarea rows={3} value={cfg.assumptions} onChange={e => set('assumptions', e.target.value)} className="text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Recommendations</Label>
                <Textarea rows={3} value={cfg.recommendations} onChange={e => set('recommendations', e.target.value)} className="text-xs" />
              </div>
            </div>
          </div>

          {/* Sections Toggle Section */}
          <div>
            <SectionLabel>Sections</SectionLabel>
            <div className="rounded-xl border p-3" style={{ background: BG, borderColor: BORDER }}>
              {/* ToggleRow is a self-contained component that looks fine, let's keep it */}
              <ToggleRow label="PFD degradation chart" desc="Sawtooth SVG embedded in PDF" value={cfg.showPFDChart} onChange={v => set('showPFDChart', v)} />
              <ToggleRow label="Subsystem table" value={cfg.showSubsystemTable} onChange={v => set('showSubsystemTable', v)} />
              <ToggleRow label="Component parameters" value={cfg.showComponentTable} onChange={v => set('showComponentTable', v)} />
              <ToggleRow label="Compliance matrix" value={cfg.showComplianceMatrix} onChange={v => set('showComplianceMatrix', v)} />
              <ToggleRow label="Assumptions" value={cfg.showAssumptions} onChange={v => set('showAssumptions', v)} />
              <ToggleRow label="Recommendations" value={cfg.showRecommendations} onChange={v => set('showRecommendations', v)} />
            </div>
          </div>

          {/* Signatures Section */}
          <div>
            <SectionLabel>Signatures</SectionLabel>
            <div className="rounded-xl border p-3 space-y-3" style={{ background: BG, borderColor: BORDER }}>
              {([ 'preparedBy', 'checkedBy', 'approvedBy'] as const).map(k => (
                <div key={k} className="space-y-1.5">
                  <Label className="text-xs capitalize">{k.replace('By', ' by')}</Label>
                  <Input value={cfg[k]} onChange={e => set(k, e.target.value)} className="text-xs h-8" />
                </div>
              ))}
            </div>
          </div>

        </div>
        </div>
      </div>
    </RightPanelShell>
  );
}
