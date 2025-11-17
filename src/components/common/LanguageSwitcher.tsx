import { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { useLanguage, Language } from '../../hooks/useLanguage';

interface LanguageSwitcherProps {
  variant?: 'default' | 'compact';
  showLabel?: boolean;
}

export function LanguageSwitcher({ variant = 'default', showLabel = true }: LanguageSwitcherProps) {
  const { currentLanguage, changeLanguage, loading, getLanguageName, getLanguageFlag } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const languages: Language[] = ['fr', 'en'];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = async (lang: Language) => {
    await changeLanguage(lang);
    setIsOpen(false);
  };

  if (variant === 'compact') {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
          aria-label="Change language"
        >
          <Globe className="w-5 h-5 text-slate-600" />
          <span className="text-sm font-medium">{getLanguageFlag(currentLanguage)}</span>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
            {languages.map((lang) => (
              <button
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                className="w-full flex items-center justify-between px-4 py-2 hover:bg-slate-50 transition-colors text-left"
              >
                <span className="flex items-center gap-2">
                  <span className="text-xl">{getLanguageFlag(lang)}</span>
                  <span className="text-sm font-medium">{getLanguageName(lang)}</span>
                </span>
                {currentLanguage === lang && (
                  <Check className="w-4 h-4 text-primary-600" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors disabled:opacity-50 bg-white"
        aria-label="Change language"
      >
        <Globe className="w-5 h-5 text-slate-600" />
        <span className="text-xl">{getLanguageFlag(currentLanguage)}</span>
        {showLabel && (
          <span className="text-sm font-medium text-slate-700">
            {getLanguageName(currentLanguage)}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50">
          <div className="px-4 py-2 border-b border-slate-100">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              {currentLanguage === 'fr' ? 'Langue' : 'Language'}
            </p>
          </div>
          {languages.map((lang) => (
            <button
              key={lang}
              onClick={() => handleLanguageChange(lang)}
              className={`w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-left ${
                currentLanguage === lang ? 'bg-primary-50' : ''
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="text-2xl">{getLanguageFlag(lang)}</span>
                <span className="text-sm font-medium text-slate-700">
                  {getLanguageName(lang)}
                </span>
              </span>
              {currentLanguage === lang && (
                <Check className="w-5 h-5 text-primary-600" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
