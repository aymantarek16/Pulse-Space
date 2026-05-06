'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from './translations';

export function useTranslation() {
  const { locale } = useLanguage();
  const t = translations[locale];
  return { t, locale };
}
