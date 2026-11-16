import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@/i18n/locales/en.json';
import es from '@/i18n/locales/es.json';
import ru from '@/i18n/locales/ru.json';

export const resources = {
  ru: { translation: ru },
  en: { translation: en },
  es: { translation: es },
} as const;

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: 'ru',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v4',
  });
}

export default i18n;
