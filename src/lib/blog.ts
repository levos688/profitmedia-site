import { getCollection, type CollectionEntry } from 'astro:content';
import type { Locale } from '../i18n/config';

export type BlogPost = CollectionEntry<'blog'>;
export type BlogPostData = BlogPost['data'];
export type BlogTranslationKey = BlogPostData['translationKey'];

export function assertUniquePosts(entries: BlogPost[]): void {
  const routeKeys = new Set<string>();
  const translationKeys = new Set<string>();

  for (const entry of entries) {
    const routeKey = `${entry.data.locale}:${entry.data.slug}`;
    if (routeKeys.has(routeKey)) {
      throw new Error(`Duplicate blog locale and slug: ${routeKey}`);
    }
    routeKeys.add(routeKey);

    const translationKey = `${entry.data.locale}:${entry.data.translationKey}`;
    if (translationKeys.has(translationKey)) {
      throw new Error(`Duplicate blog locale and translation key: ${translationKey}`);
    }
    translationKeys.add(translationKey);
  }
}

async function getValidatedBlogEntries(): Promise<BlogPost[]> {
  const entries = await getCollection('blog');
  assertUniquePosts(entries);

  // Task 6 intentionally launches Hebrew first. Once any translation is added,
  // require the complete pair so a partially translated indexable blog cannot ship.
  if (entries.some(({ data }) => data.locale === 'ru')) {
    const translationLocales = new Map<BlogTranslationKey, Set<Locale>>();
    for (const { data } of entries) {
      const locales = translationLocales.get(data.translationKey) ?? new Set<Locale>();
      locales.add(data.locale);
      translationLocales.set(data.translationKey, locales);
    }

    for (const [translationKey, locales] of translationLocales) {
      if (!locales.has('he') || !locales.has('ru')) {
        throw new Error(`Blog translation pair is incomplete: ${translationKey}`);
      }
    }
  }

  return entries;
}

export async function getBlogPosts(locale: Locale): Promise<BlogPost[]> {
  await getValidatedBlogEntries();
  const entries = await getCollection('blog', ({ data }) => data.locale === locale);
  return entries
    .sort((a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime());
}

export async function getBlogPost(locale: Locale, slug: string): Promise<BlogPost | undefined> {
  const posts = await getBlogPosts(locale);
  return posts.find(({ data }) => data.slug === slug);
}

export async function getBlogTranslation(
  translationKey: BlogTranslationKey,
  locale: Locale,
): Promise<BlogPost | undefined> {
  const posts = await getBlogPosts(locale);
  return posts.find(({ data }) => data.translationKey === translationKey);
}
