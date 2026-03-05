// Contenu pour : front/src/components/report/ReportConfigPanel.tsx

import { Settings2, Printer, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import type { ReportConfig } from './reportTypes';
import { ConfigSection, ToggleRow } from './ConfigSection';
import { IntercalaireTabBar, IntercalaireCard } from '@/components/layout/SIFWorkbenchLayout';

interface ReportConfigPanelProps {
  cfg: ReportConfig;
  setCfg: <K extends keyof ReportConfig>(key: K, value: ReportConfig[K]) => void;
  showPreview: boolean;
  onPrint: () => void;
  isExporting: boolean;
}

// Les couleurs du thème sombre pour être cohérent
const PANEL_BG = '#1A1F24';
const BORDER = '#2A3138';
const TEXT = '#DFE8F1';
const TEAL = '#009BA4';

export function ReportConfigPanel({
  cfg,
  setCfg: set,
  onPrint,
  isExporting,
}: ReportConfigPanelProps) {
    return (
        // Conteneur principal, COPIE EXACTE de la structure de RightPanel.
        // flex-col, fond, et bordure.
        <div
          className="flex flex-col overflow-hidden h-full"
          style={{ borderLeft: `1px solid ${BORDER}`, background: PANEL_BG }}
        >
          {/* 1. L'en-tête, qui contient la barre d'onglets ET le bouton. */}
          <div className="px-3 pt-3 shrink-0">
            <div className="flex items-end justify-between border-b" style={{ borderColor: BORDER }}>
              
              {/* La barre d'onglets, avec les BONS NOMS de props. */}
              <IntercalaireTabBar
                tabs={[{ id: 'studio', label: 'Report Studio' }]}
                active="studio"
                onSelect={() => {}} // Correction : onSelect -> setActiveTab (mais onSelect est accepté par le composant, laissons onSelect si c'est ce que vous avez)
                cardBg="#23292F"
              />
    
              {/* Le bouton, à côté, comme vous le vouliez. */}
              <Button
                size="sm"
                onClick={onPrint}
                disabled={isExporting}
                className="h-8 p-3 text-xs gap-1.5 min-w-[100px] bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 mb-1"
              >
                {isExporting ? (
                  <><span className="animate-spin mr-1">⟳</span> Generating…</>
                ) : (
                  <><Printer size={12} /> Export PDF</>
                )}
              </Button>
            </div>
          </div>
    
          {/* 2. Le conteneur de la carte, qui gère le scroll. C'EST LA PARTIE QUI MANQUAIT. */}
          <div className="px-3 pb-3 flex-1 overflow-y-auto">
          
            {/* 3. La carte Intercalaire, qui fusionne avec l'onglet. */}
            <IntercalaireCard tabCount={1} activeIdx={0} className="p-3 space-y-3">
              
              {/* TOUT votre contenu va à l'intérieur de cette unique carte. */}
              
           
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
            
              </IntercalaireCard>
      
      <div className="space-y-4 mt-4">
              <ConfigSection title="Content">
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
              </ConfigSection>
      
              <ConfigSection title="Sections">
                <ToggleRow label="PFD degradation chart" desc="Sawtooth SVG embedded in PDF" value={cfg.showPFDChart} onChange={v => set('showPFDChart', v)} />
                <ToggleRow label="Subsystem table" value={cfg.showSubsystemTable} onChange={v => set('showSubsystemTable', v)} />
                <ToggleRow label="Component parameters" value={cfg.showComponentTable} onChange={v => set('showComponentTable', v)} />
                <ToggleRow label="Compliance matrix" value={cfg.showComplianceMatrix} onChange={v => set('showComplianceMatrix', v)} />
                <ToggleRow label="Assumptions" value={cfg.showAssumptions} onChange={v => set('showAssumptions', v)} />
                <ToggleRow label="Recommendations" value={cfg.showRecommendations} onChange={v => set('showRecommendations', v)} />
              </ConfigSection>
      
              <ConfigSection title="Signatures">
                {(['preparedBy', 'checkedBy', 'approvedBy'] as const).map(k => (
                  <div key={k} className="space-y-1.5">
                    <Label className="text-xs capitalize">{k.replace('By', ' by')}</Label>
                    <Input value={cfg[k]} onChange={e => set(k, e.target.value)} className="text-xs h-8" />
                  </div>
                ))}
              </ConfigSection>
              </div>
          </div>
        </div>
      );
    }    