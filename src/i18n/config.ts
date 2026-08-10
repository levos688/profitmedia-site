export const locales = ['he', 'ru'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'he';

export const localeMeta = {
  he: { dir: 'rtl', hreflang: 'he-IL', ogLocale: 'he_IL', label: 'עברית' },
  ru: { dir: 'ltr', hreflang: 'ru', ogLocale: 'ru_RU', label: 'Русский' },
} as const;

export function normalizeLocale(value?: string): Locale {
  return value === 'ru' ? 'ru' : 'he';
}

export const localeDir = (locale: Locale) => localeMeta[locale].dir;
export const localeHreflang = (locale: Locale) => localeMeta[locale].hreflang;
