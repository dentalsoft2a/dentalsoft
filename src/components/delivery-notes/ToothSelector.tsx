import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';

interface ToothSelectorProps {
  selectedTeeth: string[];
  onChange: (teeth: string[]) => void;
}

const TEETH_DATA = [
  {
    group: 'Maxillaire droit (adulte)',
    teeth: [
      { value: '18', label: '18 (Troisième molaire supérieure droite)' },
      { value: '17', label: '17 (Deuxième molaire supérieure droite)' },
      { value: '16', label: '16 (Première molaire supérieure droite)' },
      { value: '15', label: '15 (Deuxième prémolaire supérieure droite)' },
      { value: '14', label: '14 (Première prémolaire supérieure droite)' },
      { value: '13', label: '13 (Canine supérieure droite)' },
      { value: '12', label: '12 (Incisive latérale supérieure droite)' },
      { value: '11', label: '11 (Incisive centrale supérieure droite)' },
    ]
  },
  {
    group: 'Maxillaire gauche (adulte)',
    teeth: [
      { value: '21', label: '21 (Incisive centrale supérieure gauche)' },
      { value: '22', label: '22 (Incisive latérale supérieure gauche)' },
      { value: '23', label: '23 (Canine supérieure gauche)' },
      { value: '24', label: '24 (Première prémolaire supérieure gauche)' },
      { value: '25', label: '25 (Deuxième prémolaire supérieure gauche)' },
      { value: '26', label: '26 (Première molaire supérieure gauche)' },
      { value: '27', label: '27 (Deuxième molaire supérieure gauche)' },
      { value: '28', label: '28 (Troisième molaire supérieure gauche)' },
    ]
  },
  {
    group: 'Mandibulaire gauche (adulte)',
    teeth: [
      { value: '38', label: '38 (Troisième molaire inférieure gauche)' },
      { value: '37', label: '37 (Deuxième molaire inférieure gauche)' },
      { value: '36', label: '36 (Première molaire inférieure gauche)' },
      { value: '35', label: '35 (Deuxième prémolaire inférieure gauche)' },
      { value: '34', label: '34 (Première prémolaire inférieure gauche)' },
      { value: '33', label: '33 (Canine inférieure gauche)' },
      { value: '32', label: '32 (Incisive latérale inférieure gauche)' },
      { value: '31', label: '31 (Incisive centrale inférieure gauche)' },
    ]
  },
  {
    group: 'Mandibulaire droit (adulte)',
    teeth: [
      { value: '41', label: '41 (Incisive centrale inférieure droite)' },
      { value: '42', label: '42 (Incisive latérale inférieure droite)' },
      { value: '43', label: '43 (Canine inférieure droite)' },
      { value: '44', label: '44 (Première prémolaire inférieure droite)' },
      { value: '45', label: '45 (Deuxième prémolaire inférieure droite)' },
      { value: '46', label: '46 (Première molaire inférieure droite)' },
      { value: '47', label: '47 (Deuxième molaire inférieure droite)' },
      { value: '48', label: '48 (Troisième molaire inférieure droite)' },
    ]
  }
];

export default function ToothSelector({ selectedTeeth, onChange }: ToothSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownHeight = 384; // max-h-96 = 24rem = 384px
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      // Ouvrir vers le haut si pas assez d'espace en bas
      const shouldOpenUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

      setDropdownPosition({
        top: shouldOpenUpward
          ? rect.top + window.scrollY - dropdownHeight - 4
          : rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleScroll = (e: Event) => {
      // Ne fermer que si le scroll ne provient pas du dropdown lui-même
      if (isOpen && e.target !== e.currentTarget) {
        const dropdown = document.querySelector('[data-tooth-dropdown]');
        if (dropdown && !dropdown.contains(e.target as Node)) {
          setIsOpen(false);
        }
      }
    };

    if (isOpen) {
      window.addEventListener('scroll', handleScroll, true);
      return () => window.removeEventListener('scroll', handleScroll, true);
    }
  }, [isOpen]);

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

  const displayText = selectedTeeth.length === 0
    ? 'Sélectionner des dents'
    : selectedTeeth.join(', ');

  const dropdown = isOpen ? createPortal(
    <>
      <div
        className="fixed inset-0 z-[99998]"
        onClick={() => setIsOpen(false)}
      />
      <div
        data-tooth-dropdown
        className="fixed z-[99999] bg-white border border-slate-200 rounded-lg shadow-2xl max-h-96 overflow-y-auto"
        style={{
          top: `${dropdownPosition.top}px`,
          left: `${dropdownPosition.left}px`,
          width: `${dropdownPosition.width}px`
        }}
      >
            <div className="sticky top-0 bg-white border-b border-slate-200 p-3 flex items-center justify-between z-10">
              <span className="text-sm font-bold text-slate-700">
                {selectedTeeth.length} dent{selectedTeeth.length !== 1 ? 's' : ''} sélectionnée{selectedTeeth.length !== 1 ? 's' : ''}
              </span>
              {selectedTeeth.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearAll();
                  }}
                  className="text-xs text-red-600 hover:text-red-700 font-semibold"
                >
                  Tout effacer
                </button>
              )}
            </div>

            {TEETH_DATA.map((section) => (
              <div key={section.group} className="border-b border-slate-100 last:border-b-0">
                <div className="px-3 py-2 bg-slate-50">
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    {section.group}
                  </h4>
                </div>
                <div className="p-2">
                  {section.teeth.map((tooth) => {
                    const isSelected = selectedTeeth.includes(tooth.value);
                    return (
                      <button
                        key={tooth.value}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTooth(tooth.value);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg mb-1 transition-all flex items-center gap-2 ${
                          isSelected
                            ? 'bg-primary-100 text-primary-900 font-semibold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            isSelected
                              ? 'border-primary-500 bg-primary-500'
                              : 'border-slate-300'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className="text-sm">{tooth.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
      </div>
    </>,
    document.body
  ) : null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400 outline-none transition-all hover:border-primary-300 bg-white shadow-sm text-left flex items-center justify-between"
      >
        <span className={selectedTeeth.length === 0 ? 'text-slate-400' : 'text-slate-900'}>
          {displayText}
        </span>
        <div className="flex items-center gap-2">
          {selectedTeeth.length > 0 && (
            <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-bold rounded-full">
              {selectedTeeth.length}
            </span>
          )}
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {dropdown}
    </div>
  );
}
