import en from './en.json';
import km from './km.json';

export type Language = 'en' | 'km';

export const translations = { en, km } as const;

export type TranslationKey = keyof typeof en;

export function getNestedValue(obj: any, path: string): string {
  return path.split('.').reduce((acc, part) => acc?.[part], obj) ?? path;
}

export function t(lang: Language, key: string): string {
  return getNestedValue(translations[lang], key);
}

export const defaultLanguage: Language = 'en';

export const languageNames: Record<Language, string> = {
  en: 'English',
  km: 'ភាសាខ្មែរ'
};
