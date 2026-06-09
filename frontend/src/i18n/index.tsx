import React, { createContext, useContext } from 'react';
import en from './en';
import hi from './hi';
import kn from './kn';
import { useSettingsStore } from '../store/settingsStore';

export type TranslationKey = keyof typeof en;
export type Translations = Record<TranslationKey, string>;

const dictionaries: Record<string, Translations> = { 
  English: en as Translations, 
  Hindi: hi as Translations, 
  Kannada: kn as Translations 
};

// Context — holds the active dictionary
const I18nContext = createContext<Translations>(en);

/**
 * Wrap the app with this provider. It reads the language from settingsStore
 * and re-renders all consumers instantly when the language changes.
 */
export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const language = useSettingsStore(s => s.language);
  const dict = dictionaries[language] ?? en;
  return <I18nContext.Provider value={dict}>{children}</I18nContext.Provider>;
};

/**
 * useT() — returns a translation function t(key).
 * Usage:  const t = useT();  t('connect')  → "Connect" / "ಕನೆಕ್ಟ್ ಮಾಡಿ" / "कनेक्ट करें"
 */
export function useT(): (key: TranslationKey) => string {
  const dict = useContext(I18nContext);
  return (key: TranslationKey) => dict[key] ?? en[key] ?? key;
}
