import i18n from '../i18n/config';

export type Language = 'fr' | 'en';

export const languageService = {
  /**
   * Get the current language
   */
  getCurrentLanguage(): Language {
    return i18n.language as Language;
  },

  /**
   * Detect language from browser
   */
  detectBrowserLanguage(): Language {
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('en')) {
      return 'en';
    }
    return 'fr'; // Default to French
  },

  /**
   * Format date according to language
   */
  formatDate(date: Date | string, format: 'short' | 'long' | 'full' = 'short'): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const lang = this.getCurrentLanguage();

    const options: Intl.DateTimeFormatOptions = {
      short: { year: 'numeric', month: '2-digit', day: '2-digit' },
      long: { year: 'numeric', month: 'long', day: 'numeric' },
      full: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
    }[format];

    return new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-US', options).format(d);
  },

  /**
   * Format number according to language
   */
  formatNumber(num: number, decimals: number = 2): string {
    const lang = this.getCurrentLanguage();
    return new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  },

  /**
   * Format currency according to language
   */
  formatCurrency(amount: number, currency: string = 'EUR'): string {
    const lang = this.getCurrentLanguage();
    return new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  },

  /**
   * Get month names according to language
   */
  getMonthNames(format: 'long' | 'short' = 'long'): string[] {
    const lang = this.getCurrentLanguage();
    const formatter = new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-US', {
      month: format,
    });

    return Array.from({ length: 12 }, (_, i) => {
      const date = new Date(2000, i, 1);
      return formatter.format(date);
    });
  },

  /**
   * Get day names according to language
   */
  getDayNames(format: 'long' | 'short' = 'long'): string[] {
    const lang = this.getCurrentLanguage();
    const formatter = new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-US', {
      weekday: format,
    });

    // Start from Monday (1) to Sunday (0)
    return [1, 2, 3, 4, 5, 6, 0].map((day) => {
      const date = new Date(2000, 0, 2 + day); // Jan 2, 2000 was a Sunday
      return formatter.format(date);
    });
  },

  /**
   * Get relative time string (e.g., "2 days ago")
   */
  getRelativeTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    const lang = this.getCurrentLanguage();

    if (diffSec < 60) {
      return lang === 'fr' ? 'À l\'instant' : 'Just now';
    } else if (diffMin < 60) {
      return lang === 'fr'
        ? `Il y a ${diffMin} minute${diffMin > 1 ? 's' : ''}`
        : `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    } else if (diffHour < 24) {
      return lang === 'fr'
        ? `Il y a ${diffHour} heure${diffHour > 1 ? 's' : ''}`
        : `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    } else if (diffDay < 7) {
      return lang === 'fr'
        ? `Il y a ${diffDay} jour${diffDay > 1 ? 's' : ''}`
        : `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    } else {
      return this.formatDate(d, 'short');
    }
  },
};
