# Profit Media Russian Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a complete, professionally localized Russian version of Profit Media under `/ru/` with correct international SEO, GEO-friendly content, locale-aware forms, and no regression to existing Hebrew routes.

**Architecture:** Hebrew remains the unprefixed default locale and Russian uses `/ru/`. Shared Astro components read typed locale content through one i18n layer; paired routes come from one registry used by the language switcher, canonical/hreflang generation, schema, and sitemap. Blog bodies move from page-local Astro markup into an Astro 7 build-time Content Collection with paired translation keys and locale-specific slugs.

**Tech Stack:** Astro 7.0.6, TypeScript, Astro Content Collections with `glob()` loader, Markdown, Tailwind CSS 4, Cloudflare Pages/Functions, Node verification scripts.

**Spec:** `docs/superpowers/specs/2026-08-08-russian-localization-design.md`

## Global Constraints

- Keep every existing Hebrew public URL unchanged.
- Use `/ru/` for Russian and language-only `hreflang="ru"`; do not target Russia specifically.
- Use `hreflang="he-IL"` for Hebrew and point `x-default` to the paired Hebrew page.
- Every canonical is self-referencing.
- Russian copy is idiomatic professional Russian, not sentence-by-sentence translation.
- Preserve only verified facts and proof points; do not invent offices, customers, metrics, or geographic presence.
- Profit Media remains an Israeli company that serves Russian-speaking customers remotely worldwide.
- Preserve the current brand colors, Assistant typography, component hierarchy, CTA style, and imagery.
- Hebrew stays RTL; Russian is LTR.
- Disable the Hebrew homepage A/B copy layer on `/ru/`; do not create Russian A/B variants in this release.
- Keep `/ads`, `/deals`, `/avhun`, `/lp`, `/donhin`, `/adv_lp3`, previews, and internal A/B pages out of scope.
- Keep Russian privacy/accessibility pages `noindex`.
- Do not publish partially translated indexable Russian pages.
- Do not create git commits unless the user explicitly requests them.

---

## File Map

### Locale foundation

| File | Responsibility |
| --- | --- |
| `src/i18n/config.ts` | Locale types, direction, hreflang, OG locale, labels |
| `src/i18n/routes.ts` | Stable route IDs and Hebrew/Russian path pairs |
| `src/i18n/seo.ts` | Absolute canonical and alternate-link builders |
| `src/i18n/content.ts` | Typed access to locale content; rejects missing locale bundles |
| `src/i18n/he/{ui,home,about}.ts` | Hebrew bundles/re-exports |
| `src/i18n/ru/{ui,home,about}.ts` | Russian localized bundles |
| `src/components/LanguageSwitcher.astro` | Equivalent-page language links |

### Blog

| File | Responsibility |
| --- | --- |
| `src/content.config.ts` | Astro 7 blog collection schema and loader |
| `src/content/blog/he/*.md` | Three migrated Hebrew articles |
| `src/content/blog/ru/*.md` | Three localized Russian articles |
| `src/lib/blog.ts` | Locale filtering, slug lookup, translation pairing |
| `src/components/blog/BlogArticleLayout.astro` | Shared article chrome, schema, CTA |
| `src/pages/blog/[slug].astro` | Hebrew static article route |
| `src/pages/ru/blog/[slug].astro` | Russian static article route |

### SEO and verification

| File | Responsibility |
| --- | --- |
| `src/lib/schema.ts` | Localized Organization, page, FAQ, and article JSON-LD |
| `src/pages/sitemap.xml.ts` | Generated sitemap with language alternatives |
| `scripts/verify-localization.mjs` | Build-output assertions for routes and SEO |

---

### Task 1: Add locale primitives and route pairing

**Files:**
- Create: `src/i18n/config.ts`
- Create: `src/i18n/routes.ts`
- Create: `src/i18n/seo.ts`
- Modify: `astro.config.mjs`

**Interfaces:**
- Produces: `Locale`, `normalizeLocale()`, `localeDir()`, `localeHreflang()`, `RouteId`, `getLocalizedPath()`, `getRouteAlternates()`, `absoluteUrl()`

- [ ] **Step 1: Define locale primitives**

```ts
// src/i18n/config.ts
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
```

- [ ] **Step 2: Define every paired route in one registry**

```ts
// src/i18n/routes.ts
import type { Locale } from './config';

export const routePairs = {
  home: { he: '/', ru: '/ru/' },
  about: { he: '/about', ru: '/ru/about' },
  blog: { he: '/blog', ru: '/ru/blog' },
  conversionArticle: {
    he: '/blog/shipur-yahas-hamara',
    ru: '/ru/blog/povyshenie-konversii',
  },
  landingArticle: {
    he: '/blog/daf-nechita-mul-daf-habayit',
    ru: '/ru/blog/lending-ili-glavnaya',
  },
  paidCampaignsArticle: {
    he: '/blog/kampeinim-memumanim-madrich',
    ru: '/ru/blog/kontekstnaya-reklama',
  },
  thankYou: { he: '/thank-you', ru: '/ru/thank-you' },
  privacy: { he: '/prat', ru: '/ru/prat' },
  accessibility: { he: '/hatzara', ru: '/ru/hatzara' },
  notFound: { he: '/404', ru: '/ru/404' },
} as const;

export type RouteId = keyof typeof routePairs;

export function getLocalizedPath(routeId: RouteId, locale: Locale): string {
  return routePairs[routeId][locale];
}

export function findRouteId(pathname: string): RouteId | undefined {
  const normalized = pathname !== '/' ? pathname.replace(/\/$/, '') : '/';
  return (Object.keys(routePairs) as RouteId[]).find((id) =>
    Object.values(routePairs[id]).some((path) =>
      (path !== '/' ? path.replace(/\/$/, '') : '/') === normalized
    )
  );
}
```

- [ ] **Step 3: Add absolute SEO URL helpers**

```ts
// src/i18n/seo.ts
import { localeMeta, type Locale } from './config';
import { routePairs, type RouteId } from './routes';

export const SITE_ORIGIN = 'https://profitmedia.co.il';

export const absoluteUrl = (path: string) => new URL(path, SITE_ORIGIN).href;

export function getRouteAlternates(routeId: RouteId) {
  return [
    { hreflang: localeMeta.he.hreflang, href: absoluteUrl(routePairs[routeId].he) },
    { hreflang: localeMeta.ru.hreflang, href: absoluteUrl(routePairs[routeId].ru) },
    { hreflang: 'x-default', href: absoluteUrl(routePairs[routeId].he) },
  ];
}

export function getOgLocale(locale: Locale) {
  return localeMeta[locale].ogLocale;
}
```

- [ ] **Step 4: Enable Astro locale routing**

Add to `defineConfig()` in `astro.config.mjs`:

```js
i18n: {
  defaultLocale: 'he',
  locales: ['he', 'ru'],
  routing: {
    prefixDefaultLocale: false,
  },
},
```

- [ ] **Step 5: Add Russian convenience redirects**

Add to `redirects`:

```js
'/ru/privacy': '/ru/prat',
'/ru/accessibility': '/ru/hatzara',
```

- [ ] **Step 6: Build to validate configuration**

Run: `npm run build`

Expected: exit code 0; existing Hebrew routes still build at their current paths.

---

### Task 2: Make the shared layout and navigation locale-aware

**Files:**
- Modify: `src/layouts/Layout.astro`
- Create: `src/components/LanguageSwitcher.astro`
- Modify: `src/components/Header.astro`
- Modify: `src/components/Footer.astro`
- Modify: `src/styles/global.css`

**Interfaces:**
- `Layout` gains `locale: Locale`, `routeId?: RouteId`, and optional `alternates`
- `LanguageSwitcher` consumes `locale` and `routeId`

- [ ] **Step 1: Replace free-form layout language props with locale-derived values**

Extend `Layout.astro` props:

```ts
import { localeMeta, normalizeLocale, type Locale } from '../i18n/config';
import { getOgLocale, getRouteAlternates } from '../i18n/seo';
import type { RouteId } from '../i18n/routes';

interface Props {
  // existing props remain
  locale?: Locale;
  routeId?: RouteId;
}

const locale = normalizeLocale(Astro.props.locale);
const lang = locale;
const dir = localeMeta[locale].dir;
const alternates = Astro.props.routeId ? getRouteAlternates(Astro.props.routeId) : [];
```

- [ ] **Step 2: Render canonical, hreflang, localized Open Graph, and analytics language**

```astro
<link rel="canonical" href={canonicalUrl} />
{alternates.map(({ hreflang, href }) => (
  <link rel="alternate" hreflang={hreflang} href={href} />
))}
<meta property="og:locale" content={getOgLocale(locale)} />
<meta
  property="og:locale:alternate"
  content={locale === 'he' ? localeMeta.ru.ogLocale : localeMeta.he.ogLocale}
/>
<script is:inline define:vars={{ locale }}>
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: 'page_context', page_language: locale });
</script>
```

Localize the skip link to `דילוג לתוכן` for Hebrew and `Перейти к содержанию` for Russian.

- [ ] **Step 3: Build the language switcher**

`LanguageSwitcher.astro` resolves `routeId` from the current pathname when not passed. It renders two links with `hreflang`, `lang`, `aria-current`, and a minimum 44px hit area. If no route match exists, links fall back to each language homepage.

- [ ] **Step 4: Update header and footer links**

Add `locale?: Locale` and `routeId?: RouteId` props to `Header.astro` and `Footer.astro`. Prefix About, Blog, legal, logo, and fragment links through `getLocalizedPath()`. Render `<LanguageSwitcher />` in desktop/mobile header and footer.

- [ ] **Step 5: Make direction-sensitive global styles logical**

Replace fixed right-side declarations used by shared content with logical properties such as `text-align: start`, `padding-inline-start`, and `inset-inline-start`. Keep intentional header visual ordering unchanged.

- [ ] **Step 6: Verify shell metadata**

Run: `npm run build`

Expected: exit code 0; generated Hebrew source has `lang="he" dir="rtl"`, `he-IL`, `ru`, and `x-default` links where `routeId` is supplied.

---

### Task 3: Create typed Hebrew and Russian content bundles

**Files:**
- Create: `src/i18n/he/ui.ts`
- Create: `src/i18n/he/home.ts`
- Create: `src/i18n/he/about.ts`
- Create: `src/i18n/ru/ui.ts`
- Create: `src/i18n/ru/home.ts`
- Create: `src/i18n/ru/about.ts`
- Create: `src/i18n/content.ts`
- Modify: `src/data/site.ts`
- Modify: `src/data/about.ts`
- Modify: `src/data/deals.ts`

**Interfaces:**
- Produces: `getUi(locale)`, `getHomeContent(locale)`, `getAboutContent(locale)`
- Locale bundles satisfy the Hebrew source shape with TypeScript `satisfies`

- [ ] **Step 1: Define shared UI string shape**

Include navigation, section labels, form labels/placeholders, validation messages, modal copy, blog labels, accessibility labels, portfolio/lightbox labels, thank-you copy, and 404 copy.

```ts
export interface UiStrings {
  skipLink: string;
  languages: { he: string; ru: string };
  form: {
    name: string;
    phone: string;
    vertical: string;
    submit: string;
    sending: string;
    nameError: string;
    phoneError: string;
    genericError: string;
  };
  blog: {
    title: string;
    allPosts: string;
    readMore: string;
    back: string;
    readingMinutes: (minutes: number) => string;
  };
}
```

- [ ] **Step 2: Preserve Hebrew as the source of truth**

The Hebrew modules re-export current data without rewriting proven working copy. Move only strings that are currently hardcoded in shared components into `src/i18n/he/ui.ts`.

- [ ] **Step 3: Write the Russian homepage bundle**

Translate and edit every public homepage string from `src/data/site.ts` plus the homepage slices `dealsContrast`, `dealsProcess`, and `dealsResults` from `src/data/deals.ts`. Preserve all numeric proof, caveats, image paths, YouTube IDs, and client assets.

Use this terminology consistently:

- lead → `лид` when discussing the metric; `обращение` in customer-facing benefit copy
- qualified lead → `целевое обращение` or `квалифицированный лид` where technical precision matters
- landing page → `лендинг` or `посадочная страница`
- paid campaigns → `платная реклама` / `рекламные кампании`
- deal CRM → `CRM для сделок`
- free diagnosis → `бесплатная диагностика рекламы`

- [ ] **Step 4: Write the Russian About bundle**

Translate all exports from `src/data/about.ts`. Keep founder identity, dates, experience, and metrics unchanged. Describe worldwide delivery as remote work; do not imply foreign offices.

- [ ] **Step 5: Add strict locale getters**

```ts
// src/i18n/content.ts
import type { Locale } from './config';
import * as heUi from './he/ui';
import * as ruUi from './ru/ui';
import { home as heHome } from './he/home';
import { home as ruHome } from './ru/home';
import { about as heAbout } from './he/about';
import { about as ruAbout } from './ru/about';

const content = {
  he: { ui: heUi.ui, home: heHome, about: heAbout },
  ru: { ui: ruUi.ui, home: ruHome, about: ruAbout },
} as const;

export const getContent = (locale: Locale) => content[locale];
```

- [ ] **Step 6: Typecheck through the Astro build**

Run: `npm run build`

Expected: exit code 0; missing required fields in either locale fail compilation.

---

### Task 4: Render the localized homepage and About page

**Files:**
- Create: `src/pages/ru/index.astro`
- Create: `src/pages/ru/about.astro`
- Modify: `src/pages/index.astro`
- Modify: `src/pages/about.astro`
- Modify: `src/components/AgencyStats.astro`
- Modify: `src/components/TargetAudience.astro`
- Modify: `src/components/Clients.astro`
- Modify: `src/components/NamedOffer.astro`
- Modify: `src/components/VideoTestimonials.astro`
- Modify: `src/components/BlogPreview.astro`
- Modify: `src/components/StickyMobileCta.astro`
- Modify: `src/components/preview/PreviewHero.astro`
- Modify: `src/components/preview/PreviewPortfolio.astro`
- Modify: `src/components/preview/PreviewFaq.astro`
- Modify: `src/components/deals/DealsContrast.astro`
- Modify: `src/components/deals/DealsResults.astro`
- Modify: `src/components/deals/system/DealsSystemProcess.astro`

**Interfaces:**
- Shared components accept only the localized data slice they render plus `locale` where URLs/date formatting differ.

- [ ] **Step 1: Refactor components away from direct Hebrew imports**

For each component, replace imports from `src/data/site.ts` or `src/data/deals.ts` with typed props. Keep a Hebrew default only where paid out-of-scope pages still instantiate the component without props.

- [ ] **Step 2: Update the Hebrew homepage**

Pass `locale="he"`, `routeId="home"`, Hebrew content slices, and Hebrew header/footer route context. Preserve the existing section order and keep `pm-home-ab.js` enabled only here.

- [ ] **Step 3: Create the Russian homepage**

Mirror the existing homepage component tree with Russian content, `locale="ru"`, `routeId="home"`, `data-locale="ru"`, and `data-thank-you="/ru/thank-you"`. Do not include `/scripts/pm-home-ab.js` and do not mount `HomeAbPopup` on the Russian page in this release.

- [ ] **Step 4: Share the About structure**

Extract the current About body to a reusable component if duplicating the page would copy substantial markup. Pass locale content and localized schema inputs. Replace `.about-founder__badge { text-align: right; }` with `text-align: start`.

- [ ] **Step 5: Verify visible language and direction**

Run: `npm run build`

Expected: `/ru/index.html` and `/ru/about/index.html` exist; Russian pages use LTR and contain no Hebrew UI except the explicit `עברית` language label and names/logos that are proper nouns.

---

### Task 5: Localize forms, API payloads, and utility pages

**Files:**
- Modify: `src/components/preview/PreviewContactForm.astro`
- Modify: `src/components/preview/LeadCaptureModal.astro`
- Modify: `src/components/preview/HomeAbPopup.astro`
- Modify: `functions/api/contact-types.ts`
- Modify: `functions/api/contact.ts`
- Create: `src/pages/ru/thank-you.astro`
- Create: `src/pages/ru/404.astro`
- Create: `src/pages/ru/prat.astro`
- Create: `src/pages/ru/hatzara.astro`
- Modify: `src/components/ErrorPage.astro`
- Modify: `src/components/LegalDocument.astro`

**Interfaces:**
- Forms accept `locale: Locale`, `strings: UiStrings['form']`, and `thankYouUrl`
- API accepts both `locale?: 'he' | 'ru'` and existing browser `language?: string`

- [ ] **Step 1: Make all form copy and redirects explicit props**

Remove hardcoded Hebrew validation and status text. Set the Russian form body to:

```js
{
  ...existingPayload,
  locale: 'ru',
  language: navigator.language,
}
```

Keep first-touch UTM attribution unchanged.

- [ ] **Step 2: Extend the contact payload**

```ts
export interface ContactPayload {
  // existing fields remain
  locale?: 'he' | 'ru';
  language?: string;
}
```

Include `locale` in CRM/email diagnostic data without changing existing field names or routing.

- [ ] **Step 3: Create Russian thank-you and 404 pages**

Use Russian UI strings, `/ru/` home links, `locale="ru"`, and `noindex`. Ensure the 404 is fully Russian rather than the current mixed English/Hebrew presentation.

- [ ] **Step 4: Adapt legal pages**

Create Russian adaptations of the existing privacy and accessibility information. State that Profit Media is based in Israel and that the Russian text is informational; do not claim universal legal compliance. Keep `noindex`, localized home links, and LTR list spacing.

- [ ] **Step 5: Verify the Cloudflare form flow**

Run: `npm run preview:cf`

Expected: local Cloudflare preview starts; submitting a Russian form posts `locale: "ru"` and redirects to `/ru/thank-you`; Hebrew continues to redirect to `/thank-you`.

---

### Task 6: Migrate the Hebrew blog to an Astro 7 Content Collection

**Files:**
- Create: `src/content.config.ts`
- Create: `src/content/blog/he/shipur-yahas-hamara.md`
- Create: `src/content/blog/he/daf-nechita-mul-daf-habayit.md`
- Create: `src/content/blog/he/kampeinim-memumanim-madrich.md`
- Create: `src/lib/blog.ts`
- Create: `src/components/blog/BlogArticleLayout.astro`
- Create: `src/pages/blog/[slug].astro`
- Modify: `src/pages/blog/index.astro`
- Modify: `src/components/BlogCard.astro`
- Delete after parity check: the three fixed Hebrew article `.astro` files
- Retire after callers migrate: `src/data/blog.ts`

**Interfaces:**
- Produces: `getBlogPosts(locale)`, `getBlogPost(locale, slug)`, `getBlogTranslation(translationKey, locale)`

- [ ] **Step 1: Define the Astro 7 collection**

```ts
// src/content.config.ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.md' }),
  schema: z.object({
    locale: z.enum(['he', 'ru']),
    translationKey: z.enum([
      'conversion-improvement',
      'landing-vs-homepage',
      'paid-campaigns-guide',
    ]),
    slug: z.string(),
    title: z.string(),
    seoTitle: z.string(),
    description: z.string(),
    excerpt: z.string(),
    category: z.string(),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    readingMinutes: z.number().int().positive(),
    author: z.string(),
    image: z.string(),
    imageAlt: z.string(),
    imageWide: z.string(),
    imageWideAlt: z.string(),
    faq: z.array(z.object({ question: z.string(), answer: z.string() })).default([]),
  }),
});

export const collections = { blog };
```

- [ ] **Step 2: Migrate Hebrew bodies without changing their meaning or URLs**

Move article prose, lists, tables, headings, FAQ content, dates, and image metadata from each current `.astro` page into its Markdown entry. Keep the existing three Hebrew slugs exactly.

- [ ] **Step 3: Add typed blog queries**

Use `getCollection('blog', ({ data }) => data.locale === locale)`. Sort newest first. Throw a build-time error when locale+slug is duplicated or when an indexable entry lacks a translation pair at launch.

- [ ] **Step 4: Build shared article rendering**

`BlogArticleLayout.astro` renders localized breadcrumb/back link, title, dates, reading time, hero image, `<BlogProse><slot /></BlogProse>`, FAQ, contact form, modal, sticky CTA, and article JSON-LD.

- [ ] **Step 5: Generate Hebrew static paths**

In `src/pages/blog/[slug].astro`, return only Hebrew entries from `getStaticPaths()`, render with `render(post)`, and pass `routeId` derived from `translationKey`.

- [ ] **Step 6: Check Hebrew parity before deleting fixed routes**

Run: `npm run build`

Expected: all three original Hebrew URLs build, retain their title/description/body/FAQ, and no duplicate route error occurs. Only then delete the three fixed article `.astro` files.

---

### Task 7: Add the Russian blog index and three edited translations

**Files:**
- Create: `src/content/blog/ru/povyshenie-konversii.md`
- Create: `src/content/blog/ru/lending-ili-glavnaya.md`
- Create: `src/content/blog/ru/kontekstnaya-reklama.md`
- Create: `src/pages/ru/blog/index.astro`
- Create: `src/pages/ru/blog/[slug].astro`
- Modify: `src/components/BlogPreview.astro`
- Modify: `src/components/BlogCard.astro`

- [ ] **Step 1: Translate and edit the conversion article**

Use slug `povyshenie-konversii`, translation key `conversion-improvement`, and retain all real A/B testing claims and caveats. Use Russian search phrasing around conversion improvement, landing-page A/B tests, headlines, buttons, popups, and image/video variants without repetitive keyword insertion.

- [ ] **Step 2: Translate and edit the landing-page article**

Use slug `lending-ili-glavnaya`, translation key `landing-vs-homepage`, and preserve the balanced conditions where a homepage can be sufficient. Localize the comparison table and CTA language.

- [ ] **Step 3: Translate and edit the paid-campaigns guide**

Use slug `kontekstnaya-reklama`, translation key `paid-campaigns-guide`. The article body must cover Meta, Google, Instagram, and other relevant channels; do not falsely redefine all paid advertising as only contextual advertising. Adjust the Russian title/metadata if editorial review shows `Платная реклама` or `Рекламные кампании` better matches the article and search intent while keeping the approved URL slug.

- [ ] **Step 4: Build Russian blog routes**

Use the shared collection and article layout with Russian breadcrumbs, date formatting (`ru-RU`), reading-time wording, CTA, form, schema, canonical, and hreflang.

- [ ] **Step 5: Run editorial QA**

Check every Russian article for calques, unexplained Israel-specific references, unsupported claims, inconsistent terminology, excessive keyword repetition, and accidental Hebrew. Preserve named customers and source caveats.

- [ ] **Step 6: Build all six articles**

Run: `npm run build`

Expected: all six paired article URLs build successfully and every Russian card/link points to its Russian slug.

---

### Task 8: Centralize JSON-LD, sitemap, robots, and AI-readable context

**Files:**
- Create: `src/lib/schema.ts`
- Modify: `src/components/HomeJsonLd.astro`
- Modify: `src/pages/about.astro`
- Modify: `src/pages/ru/about.astro`
- Modify: `src/components/blog/BlogArticleLayout.astro`
- Create: `src/pages/sitemap.xml.ts`
- Delete: `public/sitemap.xml`
- Modify: `public/robots.txt`
- Modify: `public/llms.txt`

**Interfaces:**
- Produces localized schema builders and a generated XML response.

- [ ] **Step 1: Extract localized schema builders**

Create pure builders for Organization, WebSite/WebPage, Service, FAQPage, AboutPage/Person, Blog, BlogPosting, and BreadcrumbList. Every Russian graph uses `inLanguage: 'ru'`; Hebrew uses `he-IL`.

Keep the Organization address in Israel. For remote service availability, use a truthful worldwide `areaServed` value on the Service, not a false set of office locations. Add Russian to `availableLanguage`.

- [ ] **Step 2: Replace inline schema**

Pass visible localized copy into schema builders so JSON-LD exactly matches page content. Do not retain Hebrew names/descriptions inside Russian graphs.

- [ ] **Step 3: Generate the sitemap from route pairs and blog entries**

`src/pages/sitemap.xml.ts` returns `application/xml`. Include only the six indexable pairs: homepage, About, blog index, and three articles. For each URL, emit reciprocal `xhtml:link` entries for `he-IL`, `ru`, and `x-default`.

- [ ] **Step 4: Update crawler files**

Add `/ru/prat` and `/ru/hatzara` to relevant disallow rules in `robots.txt`. Keep the sitemap URL unchanged. Add a Russian section to `llms.txt` linking to `/ru/`, `/ru/about`, `/ru/blog`, and the three Russian articles.

- [ ] **Step 5: Build and inspect generated SEO files**

Run: `npm run build`

Expected: `dist/sitemap.xml` exists, contains 12 indexable URLs and reciprocal alternatives, and no legal/thank-you/internal route appears.

---

### Task 9: Add automated build-output verification and visual QA

**Files:**
- Create: `scripts/verify-localization.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add deterministic static verification**

The script reads `dist/` and asserts:

```js
const routePairs = [
  ['index.html', 'ru/index.html'],
  ['about/index.html', 'ru/about/index.html'],
  ['blog/index.html', 'ru/blog/index.html'],
  ['blog/shipur-yahas-hamara/index.html', 'ru/blog/povyshenie-konversii/index.html'],
  ['blog/daf-nechita-mul-daf-habayit/index.html', 'ru/blog/lending-ili-glavnaya/index.html'],
  ['blog/kampeinim-memumanim-madrich/index.html', 'ru/blog/kontekstnaya-reklama/index.html'],
];
```

For each pair, assert file existence, correct `lang`/`dir`, self-canonical, reciprocal hreflang, and expected route-specific title. Assert Russian pages contain Cyrillic text and do not contain known Hebrew UI phrases such as `קבלו אבחון`, `שאלות נפוצות`, or `המשך קריאה`, excluding the `עברית` switcher label.

- [ ] **Step 2: Add the verification command**

```json
"verify:i18n": "npm run build && node scripts/verify-localization.mjs"
```

- [ ] **Step 3: Run the complete static gate**

Run: `npm run verify:i18n`

Expected: exit code 0 with all 12 indexable page checks passing.

- [ ] **Step 4: Run browser QA**

Start with `astro dev --background` per repository rules. Verify `/`, `/ru/`, `/about`, `/ru/about`, both blog indexes, and all article pairs at 375px, 768px, and 1024px.

Check:

- Language switcher preserves equivalent pages.
- Header, footer, forms, carousels, modal, FAQ, portfolio lightbox, and sticky CTA are usable.
- Russian pages are LTR with no horizontal overflow.
- Touch targets are at least 44px.
- Keyboard focus is visible.
- Reduced-motion preference prevents nonessential animation.
- Russian form errors, loading state, and redirect are Russian.
- Hebrew rendering and homepage A/B behavior remain unchanged.

- [ ] **Step 5: Validate schema and final diff**

Validate representative Hebrew and Russian homepage/article JSON-LD with a structured-data validator. Review `git diff` to confirm no out-of-scope paid/internal pages or unrelated untracked files were modified.

---

## Release Gate

Release only when:

- `npm run verify:i18n` exits 0.
- All six indexable Hebrew/Russian pairs have self-canonicals and reciprocal hreflang.
- Sitemap contains all 12 indexable URLs and no noindex URLs.
- All Russian public copy has completed editorial review.
- Russian and Hebrew forms reach their same-language thank-you pages.
- The Hebrew homepage still runs its existing A/B layer; the Russian homepage does not.
- Browser QA passes at 375px, 768px, and 1024px.
- No existing Hebrew route changes or redirects.
- No user-owned untracked files are staged, deleted, or overwritten.
