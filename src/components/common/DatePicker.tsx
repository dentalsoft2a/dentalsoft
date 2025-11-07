import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  required?: boolean;
  color?: 'primary' | 'cyan';
}

export default function DatePicker({ value, onChange, label, required = false, color = 'primary' }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const pickerRef = useRef<HTMLDivElement>(null);

  const colorClasses = {
    primary: {
      icon: 'text-primary-500',
      border: 'border-primary-200',
      focus: 'focus:ring-primary-500/50 focus:border-primary-400 hover:border-primary-300',
      button: 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700',
      selected: 'bg-gradient-to-br from-primary-500 to-primary-600 text-white',
      today: 'border-2 border-primary-500',
      hover: 'hover:bg-primary-50'
    },
    cyan: {
      icon: 'text-cyan-500',
      border: 'border-cyan-200',
      focus: 'focus:ring-cyan-500/50 focus:border-cyan-400 hover:border-cyan-300',
      button: 'bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700',
      selected: 'bg-gradient-to-br from-cyan-500 to-cyan-600 text-white',
      today: 'border-2 border-cyan-500',
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
      setCurrentMonth(new Date(value));
    }
  }, [value]);

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    for (let i = 0; i < (startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1); i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const handleDateClick = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    onChange(`${year}-${month}-${day}`);
    setIsOpen(false);
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const isSelected = (date: Date) => {
    if (!value) return false;
    const selectedDate = new Date(value);
    return date.getDate() === selectedDate.getDate() &&
           date.getMonth() === selectedDate.getMonth() &&
           date.getFullYear() === selectedDate.getFullYear();
  };

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

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
          {value ? formatDisplayDate(value) : 'Sélectionner une date'}
        </button>
        <Calendar className={`w-4 h-4 md:w-5 md:h-5 ${colors.icon} absolute left-3 md:left-4 top-1/2 -translate-y-1/2 pointer-events-none`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 w-80 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>

            <div className="font-bold text-slate-800">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </div>

            <button
              type="button"
              onClick={goToNextMonth}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-xs font-bold text-slate-500 text-center py-2"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {getDaysInMonth(currentMonth).map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const selected = isSelected(date);
              const today = isToday(date);

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleDateClick(date)}
                  className={`
                    aspect-square rounded-lg text-sm font-medium transition-all duration-200
                    ${selected
                      ? `${colors.selected} shadow-md scale-105`
                      : today
                        ? `${colors.today} text-slate-900 font-bold`
                        : `text-slate-700 ${colors.hover}`
                    }
                  `}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 flex gap-2">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                handleDateClick(today);
              }}
              className={`flex-1 py-2 px-4 text-sm font-bold ${colors.button} text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-sm`}
            >
              Aujourd'hui
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
