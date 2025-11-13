import { useState, useRef, useEffect } from 'react';
import { Check, X, ChevronDown } from 'lucide-react';

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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    <div className="w-full bg-gradient-to-br from-slate-50 to-white p-3 md:p-4 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-6 bg-gradient-to-b from-primary-500 to-cyan-500 rounded-full"></div>
          <div>
            <h3 className="text-sm md:text-base font-bold text-slate-800">Sélection des dents</h3>
            <p className="text-xs text-slate-600">
              {selectedTeeth.length > 0
                ? `${selectedTeeth.length} dent${selectedTeeth.length !== 1 ? 's' : ''} sélectionnée${selectedTeeth.length !== 1 ? 's' : ''}`
                : 'Sélectionnez les dents'
              }
            </p>
          </div>
        </div>
        {selectedTeeth.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-all"
          >
            <X className="w-3.5 h-3.5" />
            Tout effacer
          </button>
        )}
      </div>

      <div className="md:hidden mb-4 relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
        >
          <span>
            {selectedTeeth.length > 0
              ? `${selectedTeeth.length} dent${selectedTeeth.length !== 1 ? 's' : ''} sélectionnée${selectedTeeth.length !== 1 ? 's' : ''}`
              : 'Sélectionner des dents'
            }
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {isDropdownOpen && (
          <div className="absolute z-50 w-full mt-2 bg-white border-2 border-slate-300 rounded-lg shadow-xl max-h-80 overflow-y-auto">
            <div className="p-2 border-b border-slate-200 sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Sélectionnez les dents</span>
                {selectedTeeth.length > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearAll();
                    }}
                    className="text-xs text-red-600 hover:text-red-700 font-medium"
                  >
                    Tout effacer
                  </button>
                )}
              </div>
            </div>
            <div className="p-1">
              {ALL_TEETH.map((tooth) => {
                const isSelected = selectedTeeth.includes(tooth);
                return (
                  <button
                    key={tooth}
                    type="button"
                    onClick={() => toggleTooth(tooth)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-primary-500 to-cyan-500 text-white shadow-md'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>Dent {tooth}</span>
                    {isSelected && (
                      <Check className="w-4 h-4" strokeWidth={3} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="hidden md:block space-y-4">
        <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-center gap-1 mb-3">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Mâchoire supérieure (Maxillaire)</h4>
          </div>

          <div className="flex items-center justify-center gap-4 mb-2 text-xs text-slate-500">
            <span className="font-medium">Droite</span>
            <span>•</span>
            <span className="font-medium">Gauche</span>
          </div>

          <svg viewBox="0 0 800 180" className="w-full max-w-4xl mx-auto">
            <defs>
              <filter id="tooth-shadow">
                <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.15"/>
              </filter>
            </defs>

            {/* Gencives supérieures */}
            <path
              d="M 50 140 Q 100 120, 150 115 Q 200 110, 250 108 Q 300 107, 350 106 Q 400 106, 450 106 Q 500 107, 550 108 Q 600 110, 650 115 Q 700 120, 750 140"
              fill="#FFB8B8"
              stroke="#FF9999"
              strokeWidth="1.5"
              opacity="0.6"
            />

            {/* Upper Right Teeth (18-11) */}
            {UPPER_RIGHT_TEETH.map((tooth, index) => {
              const isSelected = selectedTeeth.includes(tooth);
              const isHovered = hoveredTooth === tooth;
              const positions = [
                { x: 65, y: 95, width: 28, height: 32, type: 'molar' },    // 18
                { x: 105, y: 85, width: 28, height: 32, type: 'molar' },   // 17
                { x: 145, y: 78, width: 26, height: 30, type: 'molar' },   // 16
                { x: 183, y: 73, width: 24, height: 28, type: 'premolar' }, // 15
                { x: 219, y: 70, width: 24, height: 28, type: 'premolar' }, // 14
                { x: 255, y: 68, width: 22, height: 30, type: 'canine' },  // 13
                { x: 289, y: 67, width: 20, height: 28, type: 'incisor' }, // 12
                { x: 321, y: 66, width: 20, height: 28, type: 'incisor' }  // 11
              ];
              const pos = positions[index];

              return (
                <g
                  key={tooth}
                  onMouseEnter={() => setHoveredTooth(tooth)}
                  onMouseLeave={() => setHoveredTooth(null)}
                  onClick={() => toggleTooth(tooth)}
                  className="cursor-pointer transition-all duration-200"
                  style={{ transformOrigin: `${pos.x + pos.width/2}px ${pos.y + pos.height/2}px` }}
                >
                  <rect
                    x={pos.x}
                    y={pos.y}
                    width={pos.width}
                    height={pos.height}
                    rx={pos.type === 'canine' ? 3 : 4}
                    fill={isSelected ? 'url(#tooth-gradient)' : '#FFFFF0'}
                    stroke={isSelected ? '#0EA5E9' : isHovered ? '#60A5FA' : '#E2E8F0'}
                    strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1.5}
                    filter={isHovered || isSelected ? 'url(#tooth-shadow)' : ''}
                    className={`transition-all duration-200 ${isHovered ? 'scale-105' : ''}`}
                  />
                  <text
                    x={pos.x + pos.width/2}
                    y={pos.y + pos.height/2 + 4}
                    textAnchor="middle"
                    className="text-[11px] font-bold select-none pointer-events-none"
                    fill={isSelected ? '#FFFFFF' : '#475569'}
                  >
                    {tooth}
                  </text>
                  {isSelected && (
                    <circle
                      cx={pos.x + pos.width - 4}
                      cy={pos.y + 4}
                      r="5"
                      fill="#10B981"
                    />
                  )}
                  {isSelected && (
                    <path
                      d={`M ${pos.x + pos.width - 6} ${pos.y + 4} L ${pos.x + pos.width - 4} ${pos.y + 6} L ${pos.x + pos.width - 2} ${pos.y + 2}`}
                      stroke="white"
                      strokeWidth="1.5"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                </g>
              );
            })}

            {/* Ligne médiane */}
            <line x1="400" y1="60" x2="400" y2="110" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="3,3" />

            {/* Upper Left Teeth (21-28) */}
            {UPPER_LEFT_TEETH.map((tooth, index) => {
              const isSelected = selectedTeeth.includes(tooth);
              const isHovered = hoveredTooth === tooth;
              const positions = [
                { x: 459, y: 66, width: 20, height: 28, type: 'incisor' }, // 21
                { x: 491, y: 67, width: 20, height: 28, type: 'incisor' }, // 22
                { x: 523, y: 68, width: 22, height: 30, type: 'canine' },  // 23
                { x: 557, y: 70, width: 24, height: 28, type: 'premolar' }, // 24
                { x: 593, y: 73, width: 24, height: 28, type: 'premolar' }, // 25
                { x: 629, y: 78, width: 26, height: 30, type: 'molar' },   // 26
                { x: 667, y: 85, width: 28, height: 32, type: 'molar' },   // 27
                { x: 707, y: 95, width: 28, height: 32, type: 'molar' }    // 28
              ];
              const pos = positions[index];

              return (
                <g
                  key={tooth}
                  onMouseEnter={() => setHoveredTooth(tooth)}
                  onMouseLeave={() => setHoveredTooth(null)}
                  onClick={() => toggleTooth(tooth)}
                  className="cursor-pointer transition-all duration-200"
                  style={{ transformOrigin: `${pos.x + pos.width/2}px ${pos.y + pos.height/2}px` }}
                >
                  <rect
                    x={pos.x}
                    y={pos.y}
                    width={pos.width}
                    height={pos.height}
                    rx={pos.type === 'canine' ? 3 : 4}
                    fill={isSelected ? 'url(#tooth-gradient)' : '#FFFFF0'}
                    stroke={isSelected ? '#0EA5E9' : isHovered ? '#60A5FA' : '#E2E8F0'}
                    strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1.5}
                    filter={isHovered || isSelected ? 'url(#tooth-shadow)' : ''}
                    className={`transition-all duration-200 ${isHovered ? 'scale-105' : ''}`}
                  />
                  <text
                    x={pos.x + pos.width/2}
                    y={pos.y + pos.height/2 + 4}
                    textAnchor="middle"
                    className="text-[11px] font-bold select-none pointer-events-none"
                    fill={isSelected ? '#FFFFFF' : '#475569'}
                  >
                    {tooth}
                  </text>
                  {isSelected && (
                    <circle
                      cx={pos.x + pos.width - 4}
                      cy={pos.y + 4}
                      r="5"
                      fill="#10B981"
                    />
                  )}
                  {isSelected && (
                    <path
                      d={`M ${pos.x + pos.width - 6} ${pos.y + 4} L ${pos.x + pos.width - 4} ${pos.y + 6} L ${pos.x + pos.width - 2} ${pos.y + 2}`}
                      stroke="white"
                      strokeWidth="1.5"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                </g>
              );
            })}

            {/* Gradient pour les dents sélectionnées */}
            <defs>
              <linearGradient id="tooth-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#06B6D4" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="relative">
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-20 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-center gap-1 mb-3">
            <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Mâchoire inférieure (Mandibulaire)</h4>
          </div>

          <div className="flex items-center justify-center gap-4 mb-2 text-xs text-slate-500">
            <span className="font-medium">Gauche</span>
            <span>•</span>
            <span className="font-medium">Droite</span>
          </div>

          <svg viewBox="0 0 800 180" className="w-full max-w-4xl mx-auto">
            {/* Gencives inférieures */}
            <path
              d="M 50 40 Q 100 60, 150 65 Q 200 70, 250 72 Q 300 73, 350 74 Q 400 74, 450 74 Q 500 73, 550 72 Q 600 70, 650 65 Q 700 60, 750 40"
              fill="#FFB8B8"
              stroke="#FF9999"
              strokeWidth="1.5"
              opacity="0.6"
            />

            {/* Lower Left Teeth (38-31) */}
            {LOWER_LEFT_TEETH.map((tooth, index) => {
              const isSelected = selectedTeeth.includes(tooth);
              const isHovered = hoveredTooth === tooth;
              const positions = [
                { x: 707, y: 53, width: 28, height: 32, type: 'molar' },   // 38
                { x: 667, y: 63, width: 28, height: 32, type: 'molar' },   // 37
                { x: 629, y: 70, width: 26, height: 30, type: 'molar' },   // 36
                { x: 593, y: 77, width: 24, height: 28, type: 'premolar' }, // 35
                { x: 557, y: 80, width: 24, height: 28, type: 'premolar' }, // 34
                { x: 523, y: 82, width: 22, height: 30, type: 'canine' },  // 33
                { x: 491, y: 83, width: 20, height: 26, type: 'incisor' }, // 32
                { x: 459, y: 84, width: 20, height: 26, type: 'incisor' }  // 31
              ];
              const pos = positions[index];

              return (
                <g
                  key={tooth}
                  onMouseEnter={() => setHoveredTooth(tooth)}
                  onMouseLeave={() => setHoveredTooth(null)}
                  onClick={() => toggleTooth(tooth)}
                  className="cursor-pointer transition-all duration-200"
                  style={{ transformOrigin: `${pos.x + pos.width/2}px ${pos.y + pos.height/2}px` }}
                >
                  <rect
                    x={pos.x}
                    y={pos.y}
                    width={pos.width}
                    height={pos.height}
                    rx={pos.type === 'canine' ? 3 : 4}
                    fill={isSelected ? 'url(#tooth-gradient-lower)' : '#FFFFF0'}
                    stroke={isSelected ? '#06B6D4' : isHovered ? '#22D3EE' : '#E2E8F0'}
                    strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1.5}
                    filter={isHovered || isSelected ? 'url(#tooth-shadow)' : ''}
                    className={`transition-all duration-200 ${isHovered ? 'scale-105' : ''}`}
                  />
                  <text
                    x={pos.x + pos.width/2}
                    y={pos.y + pos.height/2 + 4}
                    textAnchor="middle"
                    className="text-[11px] font-bold select-none pointer-events-none"
                    fill={isSelected ? '#FFFFFF' : '#475569'}
                  >
                    {tooth}
                  </text>
                  {isSelected && (
                    <circle
                      cx={pos.x + pos.width - 4}
                      cy={pos.y + 4}
                      r="5"
                      fill="#10B981"
                    />
                  )}
                  {isSelected && (
                    <path
                      d={`M ${pos.x + pos.width - 6} ${pos.y + 4} L ${pos.x + pos.width - 4} ${pos.y + 6} L ${pos.x + pos.width - 2} ${pos.y + 2}`}
                      stroke="white"
                      strokeWidth="1.5"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                </g>
              );
            })}

            {/* Ligne médiane */}
            <line x1="400" y1="70" x2="400" y2="120" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="3,3" />

            {/* Lower Right Teeth (41-48) */}
            {LOWER_RIGHT_TEETH.map((tooth, index) => {
              const isSelected = selectedTeeth.includes(tooth);
              const isHovered = hoveredTooth === tooth;
              const positions = [
                { x: 321, y: 84, width: 20, height: 26, type: 'incisor' }, // 41
                { x: 289, y: 83, width: 20, height: 26, type: 'incisor' }, // 42
                { x: 255, y: 82, width: 22, height: 30, type: 'canine' },  // 43
                { x: 219, y: 80, width: 24, height: 28, type: 'premolar' }, // 44
                { x: 183, y: 77, width: 24, height: 28, type: 'premolar' }, // 45
                { x: 145, y: 70, width: 26, height: 30, type: 'molar' },   // 46
                { x: 105, y: 63, width: 28, height: 32, type: 'molar' },   // 47
                { x: 65, y: 53, width: 28, height: 32, type: 'molar' }     // 48
              ];
              const pos = positions[index];

              return (
                <g
                  key={tooth}
                  onMouseEnter={() => setHoveredTooth(tooth)}
                  onMouseLeave={() => setHoveredTooth(null)}
                  onClick={() => toggleTooth(tooth)}
                  className="cursor-pointer transition-all duration-200"
                  style={{ transformOrigin: `${pos.x + pos.width/2}px ${pos.y + pos.height/2}px` }}
                >
                  <rect
                    x={pos.x}
                    y={pos.y}
                    width={pos.width}
                    height={pos.height}
                    rx={pos.type === 'canine' ? 3 : 4}
                    fill={isSelected ? 'url(#tooth-gradient-lower)' : '#FFFFF0'}
                    stroke={isSelected ? '#06B6D4' : isHovered ? '#22D3EE' : '#E2E8F0'}
                    strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1.5}
                    filter={isHovered || isSelected ? 'url(#tooth-shadow)' : ''}
                    className={`transition-all duration-200 ${isHovered ? 'scale-105' : ''}`}
                  />
                  <text
                    x={pos.x + pos.width/2}
                    y={pos.y + pos.height/2 + 4}
                    textAnchor="middle"
                    className="text-[11px] font-bold select-none pointer-events-none"
                    fill={isSelected ? '#FFFFFF' : '#475569'}
                  >
                    {tooth}
                  </text>
                  {isSelected && (
                    <circle
                      cx={pos.x + pos.width - 4}
                      cy={pos.y + 4}
                      r="5"
                      fill="#10B981"
                    />
                  )}
                  {isSelected && (
                    <path
                      d={`M ${pos.x + pos.width - 6} ${pos.y + 4} L ${pos.x + pos.width - 4} ${pos.y + 6} L ${pos.x + pos.width - 2} ${pos.y + 2}`}
                      stroke="white"
                      strokeWidth="1.5"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                </g>
              );
            })}

            {/* Gradient pour les dents inférieures sélectionnées */}
            <defs>
              <linearGradient id="tooth-gradient-lower" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06B6D4" />
                <stop offset="100%" stopColor="#0891B2" />
              </linearGradient>
            </defs>
          </svg>
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
