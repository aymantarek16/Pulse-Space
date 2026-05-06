'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Locale, Direction } from '@/types';

interface LanguageContextValue {
  locale: Locale;
  dir: Direction;
  setLocale: (locale: Locale) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: 'ar',
  dir: 'rtl',
  setLocale: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ar');

  const dir: Direction = locale === 'ar' ? 'rtl' : 'ltr';

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('pulse_locale', newLocale);
    document.documentElement.dir = newLocale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLocale;
  };

  useEffect(() => {
    const saved = localStorage.getItem('pulse_locale') as Locale | null;
    const browserLang = navigator.language.startsWith('ar') ? 'ar' : 'en';
    const initial = saved || browserLang;
    setLocaleState(initial);
    document.documentElement.dir = initial === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = initial;
  }, []);

  return (
    <LanguageContext.Provider value={{ locale, dir, setLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
