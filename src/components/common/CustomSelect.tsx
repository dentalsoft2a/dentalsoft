import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  label: string;
  placeholder?: string;
  required?: boolean;
  icon?: React.ReactNode;
  color?: 'primary' | 'cyan';
}

export default function CustomSelect({
  value,
  onChange,
  options,
  label,
  placeholder = 'Sélectionner...',
  required = false,
  icon,
  color = 'primary'
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const selectRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const colorClasses = {
    primary: {
      icon: 'text-primary-500',
      border: 'border-primary-200',
      focus: 'focus:ring-primary-500/50 focus:border-primary-400 hover:border-primary-300',
      selected: 'bg-primary-50 text-primary-700',
      hover: 'hover:bg-primary-50',
      dot: 'bg-primary-500'
    },
    cyan: {
      icon: 'text-cyan-500',
      border: 'border-cyan-200',
      focus: 'focus:ring-cyan-500/50 focus:border-cyan-400 hover:border-cyan-300',
      selected: 'bg-cyan-50 text-cyan-700',
      hover: 'hover:bg-cyan-50',
      dot: 'bg-cyan-500'
    }
  };

  const colors = colorClasses[color];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === value);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative" ref={selectRef}>
      <label className="block text-sm font-bold text-slate-700 mb-3 transition-colors flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${colors.dot}`}></span>
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full pl-12 pr-12 py-3.5 border ${colors.border} rounded-xl ${colors.focus} outline-none transition-all duration-300 bg-gradient-to-br from-white to-slate-50/30 shadow-sm hover:shadow-md text-left ${!value && 'text-slate-400'}`}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </button>

        <div className={`absolute left-4 top-1/2 -translate-y-1/2 ${colors.icon} pointer-events-none`}>
          {icon}
        </div>

        <ChevronDown className={`w-5 h-5 ${colors.icon} absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => { setIsOpen(false); setSearchTerm(''); }} />
          <div className="absolute z-[101] mt-2 w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-3 border-b border-slate-200">
              <input
                ref={inputRef}
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400 outline-none text-sm"
              />
            </div>

            <div className="max-h-64 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-8 text-center text-slate-500 text-sm">
                  Aucun résultat trouvé
                </div>
              ) : (
                <div className="py-1">
                  {filteredOptions.map((option) => {
                    const isSelected = option.value === value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleSelect(option.value)}
                        className={`w-full px-4 py-3 text-left transition-all duration-150 flex items-center justify-between group ${
                          isSelected
                            ? `${colors.selected} font-bold`
                            : `text-slate-700 ${colors.hover}`
                        }`}
                      >
                        <span>{option.label}</span>
                        {isSelected && (
                          <Check className={`w-4 h-4 ${colors.icon}`} />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
