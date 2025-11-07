import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface YearPickerProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  required?: boolean;
  color?: 'primary' | 'cyan';
}

export default function YearPicker({ value, onChange, label, required = false, color = 'primary' }: YearPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [displayDecade, setDisplayDecade] = useState(Math.floor(value / 10) * 10);
  const pickerRef = useRef<HTMLDivElement>(null);

  const colorClasses = {
    primary: {
      icon: 'text-primary-500',
      border: 'border-primary-200',
      focus: 'focus:ring-primary-500/50 focus:border-primary-400 hover:border-primary-300',
      button: 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700',
      selected: 'bg-gradient-to-br from-primary-500 to-primary-600 text-white',
      hover: 'hover:bg-primary-50'
    },
    cyan: {
      icon: 'text-cyan-500',
      border: 'border-cyan-200',
      focus: 'focus:ring-cyan-500/50 focus:border-cyan-400 hover:border-cyan-300',
      button: 'bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700',
      selected: 'bg-gradient-to-br from-cyan-500 to-cyan-600 text-white',
      hover: 'hover:bg-cyan-50'
    }
  };

  const colors = colorClasses[color];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setDisplayDecade(Math.floor(value / 10) * 10);
  }, [value]);

  const handleYearClick = (year: number) => {
    onChange(year);
    setIsOpen(false);
  };

  const goToPreviousDecade = () => {
    setDisplayDecade(displayDecade - 10);
  };

  const goToNextDecade = () => {
    setDisplayDecade(displayDecade + 10);
  };

  const isCurrentYear = (year: number) => {
    const today = new Date();
    return year === today.getFullYear();
  };

  const isSelected = (year: number) => {
    return year === value;
  };

  const getYearsInDecade = () => {
    const years = [];
    for (let i = 0; i < 12; i++) {
      years.push(displayDecade + i);
    }
    return years;
  };

  return (
    <div className="relative" ref={pickerRef}>
      <label className="block text-xs md:text-sm font-bold text-slate-700 mb-2 transition-colors flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${color === 'cyan' ? 'bg-cyan-500' : 'bg-primary-500'}`}></span>
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full pl-10 md:pl-12 pr-3 md:pr-5 py-2 md:py-3 text-sm border ${colors.border} rounded-lg md:rounded-xl ${colors.focus} outline-none transition-all bg-gradient-to-br from-white to-slate-50/30 shadow-sm text-left ${!value && 'text-slate-400'}`}
        >
          {value || 'Sélectionner une année'}
        </button>
        <Calendar className={`w-4 h-4 md:w-5 md:h-5 ${colors.icon} absolute left-3 md:left-4 top-1/2 -translate-y-1/2 pointer-events-none`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 w-80 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={goToPreviousDecade}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>

            <div className="font-bold text-slate-800">
              {displayDecade} - {displayDecade + 11}
            </div>

            <button
              type="button"
              onClick={goToNextDecade}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {getYearsInDecade().map((year) => {
              const selected = isSelected(year);
              const current = isCurrentYear(year);

              return (
                <button
                  key={year}
                  type="button"
                  onClick={() => handleYearClick(year)}
                  className={`
                    py-3 px-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${selected
                      ? `${colors.selected} shadow-md scale-105`
                      : current
                        ? `border-2 ${color === 'cyan' ? 'border-cyan-500' : 'border-primary-500'} text-slate-900 font-bold`
                        : `text-slate-700 ${colors.hover}`
                    }
                  `}
                >
                  {year}
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 flex gap-2">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                handleYearClick(today.getFullYear());
              }}
              className={`flex-1 py-2 px-4 text-sm font-bold ${colors.button} text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-sm`}
            >
              Année actuelle
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex-1 py-2 px-4 text-sm font-bold bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all duration-200"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
