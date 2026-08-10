import type { Locale } from '../i18n/config';

export interface BlogPairDescriptor {
  locale: Locale;
  translationKey: string;
}

export function hasBlogTranslationPair(
  currentPost: BlogPairDescriptor,
  candidates: readonly BlogPairDescriptor[],
): boolean {
  const pairedLocale: Locale = currentPost.locale === 'he' ? 'ru' : 'he';
  return candidates.some(
    (candidate) =>
      candidate.locale === pairedLocale &&
      candidate.translationKey === currentPost.translationKey,
  );
}
