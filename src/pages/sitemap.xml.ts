import type { APIRoute } from 'astro';
import { routePairs } from '../i18n/routes';
import { getBlogPosts, type BlogTranslationKey } from '../lib/blog';

const SITE_URL = 'https://profitmedia.co.il';
const XHTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';

type LocalizedPaths = { he: string; ru: string; lastmod?: string };

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const absoluteUrl = (path: string): string => `${SITE_URL}${path}`;

const toLastmod = (date: Date): string => date.toISOString().slice(0, 10);

async function getIndexablePairs(): Promise<LocalizedPaths[]> {
  const fixedPairs: LocalizedPaths[] = [
    routePairs.home,
    routePairs.about,
    routePairs.blog,
  ];
  const posts = await Promise.all([getBlogPosts('he'), getBlogPosts('ru')]);
  const articles = new Map<
    BlogTranslationKey,
    Partial<LocalizedPaths> & { lastmodMs?: number }
  >();

  for (const post of posts.flat()) {
    const pair = articles.get(post.data.translationKey) ?? {};
    pair[post.data.locale] = `${routePairs.blog[post.data.locale]}/${post.data.slug}`;
    const stamp = (post.data.updatedDate ?? post.data.publishDate).getTime();
    pair.lastmodMs = Math.max(pair.lastmodMs ?? 0, stamp);
    articles.set(post.data.translationKey, pair);
  }

  const articlePairs = [...articles.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([translationKey, pair]) => {
      if (!pair.he || !pair.ru) {
        throw new Error(`Sitemap cannot include incomplete blog pair: ${translationKey}`);
      }
      return {
        he: pair.he,
        ru: pair.ru,
        lastmod: pair.lastmodMs ? toLastmod(new Date(pair.lastmodMs)) : undefined,
      };
    });

  const expectedPairs = 3 + 7; // home, about, blog index + seven article pairs
  if (fixedPairs.length + articlePairs.length !== expectedPairs) {
    throw new Error(
      `Sitemap must contain exactly ${expectedPairs} indexable route pairs, got ${fixedPairs.length + articlePairs.length}`,
    );
  }

  return [...fixedPairs, ...articlePairs];
}

function renderUrl(path: string, pair: LocalizedPaths): string {
  const heUrl = absoluteUrl(pair.he);
  const ruUrl = absoluteUrl(pair.ru);
  const lines = [
    '  <url>',
    `    <loc>${escapeXml(absoluteUrl(path))}</loc>`,
  ];
  if (pair.lastmod) {
    lines.push(`    <lastmod>${pair.lastmod}</lastmod>`);
  }
  lines.push(
    `    <xhtml:link rel="alternate" hreflang="he-IL" href="${escapeXml(heUrl)}" />`,
    `    <xhtml:link rel="alternate" hreflang="ru" href="${escapeXml(ruUrl)}" />`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(heUrl)}" />`,
    '  </url>',
  );
  return lines.join('\n');
}

export const GET: APIRoute = async () => {
  const pairs = await getIndexablePairs();
  const urls = pairs.flatMap((pair) => [
    renderUrl(pair.he, pair),
    renderUrl(pair.ru, pair),
  ]);
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="${XHTML_NAMESPACE}">`,
    ...urls,
    '</urlset>',
    '',
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
};
