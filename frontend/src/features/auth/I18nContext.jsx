import { createContext, useContext } from 'react';
import { t as translate } from './i18n';

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const locale = 'en';

  const t = (key) => translate('en', key);

  return (
    <I18nContext.Provider value={{ locale, locales: [{ code: 'en', label: 'English', flag: '🇬🇧' }], changeLocale: () => {}, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
