import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import en, { TranslationKey } from '../i18n/en';
import bn from '../i18n/bn';
import hi from '../i18n/hi';
import ar from '../i18n/ar';

export type Language = 'en' | 'bn' | 'hi' | 'ar';
const LANGUAGE_KEY = 'fleetpro_admin_language';
const VALID_LANGUAGES: Language[] = ['en', 'bn', 'hi', 'ar'];
const RTL_LANGUAGES: Language[] = ['ar'];

export const LANGUAGE_META: Record<Language, { nativeName: string; englishName: string }> = {
  en: { nativeName: 'English', englishName: 'English' },
  bn: { nativeName: 'বাংলা', englishName: 'Bengali' },
  hi: { nativeName: 'हिन्दी', englishName: 'Hindi' },
  ar: { nativeName: 'العربية', englishName: 'Arabic' },
};

const DICTS: Record<Language, Record<string, string>> = { en, bn, hi, ar };

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  /** Cycles en → bn → hi → ar → en. Settings.tsx uses setLanguage directly
   * for its 4-way picker; this stays only for any legacy single-tap toggle. */
  toggleLanguage: () => void;
  isRtl: boolean;
  /** Translate a key, optionally interpolating {{var}} placeholders. Falls
   * back to English (never a raw key, never blank) if a translation for
   * the active language hasn't been added yet — see the note in hi.ts /
   * ar.ts about which keys are still pending native translation. */
  t: (key: TranslationKey | string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default is always English, regardless of browser/system locale.
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(LANGUAGE_KEY);
      return VALID_LANGUAGES.includes(saved as Language) ? (saved as Language) : 'en';
    } catch {
      return 'en';
    }
  });

  const isRtl = RTL_LANGUAGES.includes(language);

  // Global Language Rule: the *entire* app follows one active language, with
  // no per-page exceptions — that includes native browser behavior (text
  // direction, screen-reader language) which only `<html>` attributes can
  // drive, not React state alone.
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
  }, [language, isRtl]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LANGUAGE_KEY, lang);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    const order: Language[] = ['en', 'bn', 'hi', 'ar'];
    const next = order[(order.indexOf(language) + 1) % order.length];
    setLanguage(next);
  }, [language, setLanguage]);

  const t = useCallback(
    (key: TranslationKey | string, vars?: Record<string, string | number>) => {
      const dict = DICTS[language];
      let text = dict[key] ?? en[key as TranslationKey] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          text = text.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
        }
      }
      return text;
    },
    [language]
  );

  const value = useMemo(
    () => ({ language, setLanguage, toggleLanguage, isRtl, t }),
    [language, setLanguage, toggleLanguage, isRtl, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
