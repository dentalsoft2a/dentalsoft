import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthPickerProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  required?: boolean;
  color?: 'primary' | 'cyan';
}

export default function MonthPicker({ value, onChange, label, required = false, color = 'primary' }: MonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
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
    if (value) {
      const [year] = value.split('-');
      setCurrentYear(parseInt(year));
    }
  }, [value]);

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return '';
    const [year, month] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric'
    });
  };

  const handleMonthClick = (month: number) => {
    const monthStr = String(month).padStart(2, '0');
    onChange(`${currentYear}-${monthStr}`);
    setIsOpen(false);
  };

  const goToPreviousYear = () => {
    setCurrentYear(currentYear - 1);
  };

  const goToNextYear = () => {
    setCurrentYear(currentYear + 1);
  };

  const isCurrentMonth = (month: number) => {
    const today = new Date();
    return month === today.getMonth() + 1 && currentYear === today.getFullYear();
  };

  const isSelected = (month: number) => {
    if (!value) return false;
    const [year, selectedMonth] = value.split('-');
    return parseInt(selectedMonth) === month && parseInt(year) === currentYear;
  };

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

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
          {value ? formatDisplayDate(value) : 'Sélectionner un mois'}
        </button>
        <Calendar className={`w-4 h-4 md:w-5 md:h-5 ${colors.icon} absolute left-3 md:left-4 top-1/2 -translate-y-1/2 pointer-events-none`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 w-80 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={goToPreviousYear}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>

            <div className="font-bold text-slate-800">
              {currentYear}
            </div>

            <button
              type="button"
              onClick={goToNextYear}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {monthNames.map((monthName, index) => {
              const monthNumber = index + 1;
              const selected = isSelected(monthNumber);
              const current = isCurrentMonth(monthNumber);

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleMonthClick(monthNumber)}
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
                  {monthName}
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 flex gap-2">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                const month = today.getMonth() + 1;
                handleMonthClick(month);
              }}
              className={`flex-1 py-2 px-4 text-sm font-bold ${colors.button} text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-sm`}
            >
              Mois actuel
            </button>
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className="flex-1 py-2 px-4 text-sm font-bold bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all duration-200"
            >
              Effacer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
