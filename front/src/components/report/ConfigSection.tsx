// Contenu pour : front/src/components/report/ConfigSection.tsx

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { CARD_BG, TEXT, TEXT_DIM } from '@/styles/tokens'

// Couleurs du thème pour la cohérence visuelle
const BORDER = '#2F3740';

export function ConfigSection({
  title,
  defaultOpen = true,
  children,
  className = ''
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    // La carte, stylisée pour correspondre au panneau "Properties"
    <div
      className={'rounded-lg border ${className}'}
      style={{ background: CARD_BG, borderColor: BORDER }}
    >
      {/* Le titre de la section, qui est aussi le bouton pour déplier */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-3 text-left"
      >
        <span
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: TEXT_DIM }}
        >
          {title}
        </span>
        {open ? <ChevronUp size={14} style={{ color: TEXT_DIM }} /> : <ChevronDown size={14} style={{ color: TEXT_DIM }} />}
      </button>

      {/* Le contenu qui s'affiche ou se masque */}
      {open && (
        <div className="px-3 pb-3 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}

export function ToggleRow({
  label,
  desc,
  value,
  onChange,
}: {
  label:string;
  desc?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-medium" style={{ color: TEXT }}>
          {label}
        </p>
        {desc && (
          <p className="text-[10px]" style={{ color: TEXT_DIM }}>
            {desc}
          </p>
        )}
      </div>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}
