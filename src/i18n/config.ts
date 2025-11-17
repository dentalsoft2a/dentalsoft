import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import commonFr from '../locales/fr/common.json';
import pagesFr from '../locales/fr/pages.json';
import formsFr from '../locales/fr/forms.json';
import pdfFr from '../locales/fr/pdf.json';
import emailsFr from '../locales/fr/emails.json';

import commonEn from '../locales/en/common.json';
import pagesEn from '../locales/en/pages.json';
import formsEn from '../locales/en/forms.json';
import pdfEn from '../locales/en/pdf.json';
import emailsEn from '../locales/en/emails.json';

const resources = {
  fr: {
    common: commonFr,
    pages: pagesFr,
    forms: formsFr,
    pdf: pdfFr,
    emails: emailsFr,
  },
  en: {
    common: commonEn,
    pages: pagesEn,
    forms: formsEn,
    pdf: pdfEn,
    emails: emailsEn,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'fr',
    defaultNS: 'common',
    ns: ['common', 'pages', 'forms', 'pdf', 'emails'],
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
