import React from 'react';
import { useTheme } from './ThemeProvider';
import { cx } from '../utils/classes';

const OPTIONS = [
  { id: 'compact',     glyph: '▔',  label: 'CMPCT' },
  { id: 'normal',      glyph: '─',  label: 'NORM'  },
  { id: 'comfortable', glyph: '▁',  label: 'CMFT'  }
];

function DensitySwitch() {
  const { density, setDensity } = useTheme();
  return (
    <div className="inline-flex items-stretch border border-line h-7" role="group" aria-label="Density">
      {OPTIONS.map((opt, i) => {
        const active = density === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            title={`Density · ${opt.label}`}
            onClick={() => setDensity(opt.id)}
            className={cx(
              'px-2 text-[10px] smallcaps-tight font-mono',
              active ? 'bg-accent/15 text-accent' : 'text-muted hover:text-text',
              i > 0 && 'border-l border-line'
            )}
          >
            <span className="mr-1">{opt.glyph}</span>{opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default DensitySwitch;
