import { useState, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';

interface MultiShadeSelectorProps {
  selectedShades: string[];
  onChange: (shades: string[]) => void;
}

const SHADE_GROUPS = [
  {
    label: 'Teintes A (Rougeâtre-brunâtre)',
    shades: ['A1', 'A2', 'A3', 'A3.5', 'A4']
  },
  {
    label: 'Teintes B (Jaunâtre-rougeâtre)',
    shades: ['B1', 'B2', 'B3', 'B4']
  },
  {
    label: 'Teintes C (Grisâtre)',
    shades: ['C1', 'C2', 'C3', 'C4']
  },
  {
    label: 'Teintes D (Brun-grisâtre)',
    shades: ['D2', 'D3', 'D4']
  },
  {
    label: 'Teintes Blanchiment',
    shades: ['BL1', 'BL2', 'BL3', 'BL4']
  },
  {
    label: '3D Master - Niveau 1 (Clair)',
    shades: ['1M1', '1M2', '2L1.5', '2L2.5', '2M1', '2M2', '2M3', '2R1.5', '2R2.5']
  },
  {
    label: '3D Master - Niveau 2 (Moyen)',
    shades: ['3L1.5', '3L2.5', '3M1', '3M2', '3M3', '3R1.5', '3R2.5']
  },
  {
    label: '3D Master - Niveau 3 (Moyen-Foncé)',
    shades: ['4L1.5', '4L2.5', '4M1', '4M2', '4M3', '4R1.5', '4R2.5']
  },
  {
    label: '3D Master - Niveau 4 (Foncé)',
    shades: ['5M1', '5M2', '5M3']
  }
];

export default function MultiShadeSelector({ selectedShades, onChange }: MultiShadeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleShade = (shade: string) => {
    const newShades = selectedShades.includes(shade)
      ? selectedShades.filter(s => s !== shade)
      : [...selectedShades, shade];
    onChange(newShades);
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className="group/item">
      <label className="block text-xs font-bold text-slate-700 mb-1.5 transition-colors group-focus-within/item:text-primary-600 flex items-center gap-1.5">
        <span className="w-1 h-1 rounded-full bg-primary-500 group-focus-within/item:scale-150 transition-transform"></span>
        Teinte(s)
      </label>

      <div className="relative" ref={containerRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400 outline-none transition-all hover:border-primary-300 bg-white/80 shadow-sm text-left"
        >
          {selectedShades.length === 0 ? (
            <span className="text-slate-400">Sélectionner une ou plusieurs teintes</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {selectedShades.map(shade => (
                <span
                  key={shade}
                  className="inline-flex items-center px-2 py-0.5 bg-primary-100 text-primary-800 rounded text-xs font-medium"
                >
                  {shade}
                </span>
              ))}
            </div>
          )}
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-96 overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-3 py-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">
                {selectedShades.length} teinte(s) sélectionnée(s)
              </span>
              {selectedShades.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs text-red-600 hover:text-red-700 font-medium"
                >
                  Tout effacer
                </button>
              )}
            </div>

            {SHADE_GROUPS.map((group, groupIndex) => (
              <div key={groupIndex} className="border-b border-slate-100 last:border-b-0">
                <div className="px-3 py-2 bg-slate-50">
                  <h4 className="text-xs font-semibold text-slate-700">{group.label}</h4>
                </div>
                <div className="grid grid-cols-3 gap-1 p-2">
                  {group.shades.map(shade => {
                    const isSelected = selectedShades.includes(shade);
                    return (
                      <button
                        key={shade}
                        type="button"
                        onClick={() => toggleShade(shade)}
                        className={`relative px-3 py-2 text-sm rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'border-primary-500 bg-primary-50 text-primary-900 font-semibold'
                            : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50'
                        }`}
                      >
                        {shade}
                        {isSelected && (
                          <Check className="absolute top-0.5 right-0.5 w-3 h-3 text-primary-600" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-3 py-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
