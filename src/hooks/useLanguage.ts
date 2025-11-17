import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export type Language = 'fr' | 'en';

export function useLanguage() {
  const { i18n } = useTranslation();
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  const currentLanguage = i18n.language as Language;

  // Load language preference from database when user logs in
  useEffect(() => {
    if (user && userProfile?.language_preference) {
      const dbLanguage = userProfile.language_preference as Language;
      if (dbLanguage !== currentLanguage) {
        i18n.changeLanguage(dbLanguage);
      }
    }
  }, [user, userProfile?.language_preference]);

  const changeLanguage = async (language: Language) => {
    setLoading(true);
    try {
      // Change language in i18next
      await i18n.changeLanguage(language);

      // Save to localStorage
      localStorage.setItem('i18nextLng', language);

      // Save to database if user is logged in
      if (user) {
        // Check if user is a dentist
        const { data: dentistData } = await supabase
          .from('dentist_accounts')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (dentistData) {
          // Update dentist account
          await supabase
            .from('dentist_accounts')
            .update({ language_preference: language })
            .eq('id', user.id);
        } else {
          // Update user profile
          await supabase
            .from('user_profiles')
            .update({ language_preference: language })
            .eq('id', user.id);
        }
      }
    } catch (error) {
      console.error('Error changing language:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLanguageName = (lang: Language): string => {
    return lang === 'fr' ? 'Français' : 'English';
  };

  const getLanguageFlag = (lang: Language): string => {
    return lang === 'fr' ? '🇫🇷' : '🇬🇧';
  };

  return {
    currentLanguage,
    changeLanguage,
    loading,
    getLanguageName,
    getLanguageFlag,
  };
}
