import { Settings2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ borderLeft: `1px solid ${BORDER}`, background: PANEL_BG }}
    >
      {/* 1. Tab Bar Header */}
      <div className="px-3 pt-3 shrink-0">
        <div className="flex items-end justify-between border-b" style={{ borderColor: BORDER }}>
          <div className="flex items-end">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className="relative flex items-center gap-1.5 px-3 py-2 text-left shrink-0"
                style={{
                  background: CARD_BG,
                  borderTop: `1px solid ${BORDER}`,
                  borderLeft: `1px solid ${BORDER}`,
                  borderRight: `1px solid ${BORDER}`,
                  borderBottom: `1px solid ${CARD_BG}`,
                  borderRadius: `${R}px ${R}px 0 0`,
                  color: TEAL_DIM,
                  marginBottom: '-1px',
                  zIndex: 10,
                }}
              >
                <tab.Icon size={11} />
                <span className="text-[12px] font-semibold whitespace-nowrap">{tab.label}</span>
              </button>
            ))}
          </div>
          <Button
            size="sm"
            onClick={onPrint}
            disabled={isExporting}
            className="h-8 px-3 text-xs gap-1.5 min-w-[100px] bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 mb-1"
          >
            {isExporting ? (
              <><span className="animate-spin mr-1">⟳</span> Generating...</>
            ) : (
              <><Printer size={12} /> Export PDF</>
            )}
          </Button>
        </div>
      </div>

      {/* 2. Scrolling Card Body */}
      <div
        className="flex-1 overflow-y-auto"
        style={{
          background: CARD_BG,
          borderLeft: `1px solid ${BORDER}`,
          borderRight: `1px solid ${BORDER}`,
          borderBottom: `1px solid ${BORDER}`,
          borderRadius: `0 ${R}px ${R}px ${R}px`,
          margin: '0 12px 12px',
        }}
      >
        {/* All content now goes inside this single scrollable container */}
        <div className="p-3 space-y-4">

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
  );
}
