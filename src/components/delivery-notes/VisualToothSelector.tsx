import { useState } from 'react';
import { Check, X, Grid3x3 } from 'lucide-react';

interface VisualToothSelectorProps {
  selectedTeeth: string[];
  onChange: (teeth: string[]) => void;
}

const UPPER_RIGHT_TEETH = ['18', '17', '16', '15', '14', '13', '12', '11'];
const UPPER_LEFT_TEETH = ['21', '22', '23', '24', '25', '26', '27', '28'];
const LOWER_LEFT_TEETH = ['38', '37', '36', '35', '34', '33', '32', '31'];
const LOWER_RIGHT_TEETH = ['41', '42', '43', '44', '45', '46', '47', '48'];

const ALL_TEETH = [
  ...UPPER_RIGHT_TEETH,
  ...UPPER_LEFT_TEETH,
  ...LOWER_LEFT_TEETH,
  ...LOWER_RIGHT_TEETH
].sort((a, b) => parseInt(a) - parseInt(b));

export default function VisualToothSelector({ selectedTeeth, onChange }: VisualToothSelectorProps) {
  const [hoveredTooth, setHoveredTooth] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'visual' | 'grid'>('visual');

  const toggleTooth = (toothValue: string) => {
    if (selectedTeeth.includes(toothValue)) {
      onChange(selectedTeeth.filter(t => t !== toothValue));
    } else {
      onChange([...selectedTeeth, toothValue].sort((a, b) => parseInt(a) - parseInt(b)));
    }
  };

  const clearAll = () => {
    onChange([]);
  };

  const renderTooth = (toothNumber: string) => {
    const isSelected = selectedTeeth.includes(toothNumber);
    const isHovered = hoveredTooth === toothNumber;

    return (
      <button
        key={toothNumber}
        type="button"
        onClick={() => toggleTooth(toothNumber)}
        onMouseEnter={() => setHoveredTooth(toothNumber)}
        onMouseLeave={() => setHoveredTooth(null)}
        className={`
          relative w-8 h-10 md:w-9 md:h-11 rounded-md border-2 flex items-center justify-center
          font-bold text-[10px] md:text-xs transition-all duration-200 cursor-pointer flex-shrink-0
          ${isSelected
            ? 'bg-gradient-to-br from-primary-500 to-cyan-500 border-primary-600 text-white shadow-lg scale-105'
            : 'bg-white border-slate-300 text-slate-700 hover:border-primary-400 hover:bg-primary-50'
          }
          ${isHovered && !isSelected ? 'shadow-md scale-105' : ''}
          active:scale-95
        `}
        title={`Dent ${toothNumber}`}
      >
        <span className="relative z-10">{toothNumber}</span>
        {isSelected && (
          <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full flex items-center justify-center shadow-md">
            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="w-full bg-gradient-to-br from-slate-50 to-white p-3 md:p-4 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-6 bg-gradient-to-b from-primary-500 to-cyan-500 rounded-full"></div>
          <div>
            <h3 className="text-sm md:text-base font-bold text-slate-800">Sélection des dents</h3>
            <p className="text-xs text-slate-600">
              {selectedTeeth.length > 0
                ? `${selectedTeeth.length} dent${selectedTeeth.length !== 1 ? 's' : ''} sélectionnée${selectedTeeth.length !== 1 ? 's' : ''}`
                : 'Cliquez sur les dents pour les sélectionner'
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileView(mobileView === 'visual' ? 'grid' : 'visual')}
            className="md:hidden flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary-600 hover:bg-primary-50 rounded-lg transition-all border border-primary-200"
          >
            <Grid3x3 className="w-3.5 h-3.5" />
            {mobileView === 'visual' ? 'Grille' : 'Visuel'}
          </button>
          {selectedTeeth.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-all"
            >
              <X className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tout effacer</span>
            </button>
          )}
        </div>
      </div>

      {mobileView === 'grid' && (
        <div className="md:hidden">
          <div className="grid grid-cols-8 gap-2">
            {ALL_TEETH.map((tooth) => {
              const isSelected = selectedTeeth.includes(tooth);
              return (
                <button
                  key={tooth}
                  type="button"
                  onClick={() => toggleTooth(tooth)}
                  className={`
                    relative aspect-square rounded-lg border-2 flex items-center justify-center
                    font-bold text-xs transition-all duration-200 cursor-pointer
                    ${isSelected
                      ? 'bg-gradient-to-br from-primary-500 to-cyan-500 border-primary-600 text-white shadow-lg'
                      : 'bg-white border-slate-300 text-slate-700 active:bg-primary-50'
                    }
                  `}
                >
                  <span>{tooth}</span>
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                      <Check className="w-2 h-2 text-white" strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className={`space-y-4 ${mobileView === 'grid' ? 'hidden md:block' : ''}`}>
        <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-center gap-1 mb-2">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Mâchoire supérieure (Maxillaire)</h4>
          </div>

          <div className="flex items-center justify-center gap-2 md:gap-3">
            <div className="flex items-center gap-0.5">
              {UPPER_RIGHT_TEETH.map(renderTooth)}
            </div>

            <div className="w-px h-10 bg-slate-300"></div>

            <div className="flex items-center gap-0.5">
              {UPPER_LEFT_TEETH.map(renderTooth)}
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 mt-2 text-xs text-slate-500">
            <span className="font-medium">Droite</span>
            <span>•</span>
            <span className="font-medium">Gauche</span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-20 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
        </div>

        <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-center gap-1 mb-2">
            <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Mâchoire inférieure (Mandibulaire)</h4>
          </div>

          <div className="flex items-center justify-center gap-4 mt-2 text-xs text-slate-500 order-first mb-2">
            <span className="font-medium">Gauche</span>
            <span>•</span>
            <span className="font-medium">Droite</span>
          </div>

          <div className="flex items-center justify-center gap-2 md:gap-3">
            <div className="flex items-center gap-0.5">
              {LOWER_LEFT_TEETH.map(renderTooth)}
            </div>

            <div className="w-px h-10 bg-slate-300"></div>

            <div className="flex items-center gap-0.5">
              {LOWER_RIGHT_TEETH.map(renderTooth)}
            </div>
          </div>
        </div>
      </div>

      {selectedTeeth.length > 0 && (
        <div className="mt-4 p-3 bg-gradient-to-r from-primary-50 to-cyan-50 rounded-lg border border-primary-200">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">Dents sélectionnées:</span>
            {selectedTeeth.map((tooth) => (
              <span
                key={tooth}
                className="inline-flex items-center gap-1 px-2 py-1 bg-white text-primary-700 text-xs font-bold rounded-md border border-primary-200 shadow-sm"
              >
                {tooth}
                <button
                  type="button"
                  onClick={() => toggleTooth(tooth)}
                  className="hover:bg-red-100 rounded transition-colors p-0.5"
                >
                  <X className="w-3 h-3 text-red-600" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
