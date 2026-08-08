# Profit Media Russian Localization Design

## Goal

Create a complete Russian version of Profit Media for Russian-speaking businesses worldwide while preserving the existing Hebrew URLs, rankings, conversion paths, and visual identity.

The Russian copy will be professionally localized rather than translated sentence by sentence. It must sound natural, retain only substantiated claims, and support conversion, traditional search, and generative search visibility.

## Scope

### Included in the first release

- Homepage
- About page
- Blog index and all three published articles
- Public navigation, footer, forms, modals, validation messages, and accessibility labels
- Russian thank-you, 404, privacy, and accessibility pages
- Language switcher in the header and footer
- Localized metadata, Open Graph, canonical URLs, hreflang, JSON-LD, sitemap entries, and `llms.txt`
- Locale information in lead submissions and analytics

### Excluded

- Paid campaign pages under `/ads`, `/deals`, `/avhun`, and `/lp`
- `/donhin` and `/adv_lp3`, which belong to a separate Russian-language product
- Preview pages, A/B dashboards, and other internal pages
- Russian A/B-test copy

## Audience and Positioning

The Russian version serves Russian-speaking business owners and marketing or sales managers worldwide. Profit Media remains an Israeli company that can deliver its services remotely; the site must not imply offices, employees, or local presence in countries where none exists.

The primary offer remains the Deals-from-Ads System: paid campaign management, a dedicated landing page or quiz, and a CRM feedback loop optimized toward suitable inquiries and deals rather than raw lead volume.

The primary conversion is a free advertising diagnosis conducted fully in Russian.

## URL Architecture

Hebrew remains the unprefixed default locale. Russian uses the `/ru/` prefix.

| Hebrew | Russian |
| --- | --- |
| `/` | `/ru/` |
| `/about` | `/ru/about` |
| `/blog` | `/ru/blog` |
| `/blog/shipur-yahas-hamara` | `/ru/blog/povyshenie-konversii` |
| `/blog/daf-nechita-mul-daf-habayit` | `/ru/blog/lending-ili-glavnaya` |
| `/blog/kampeinim-memumanim-madrich` | `/ru/blog/kontekstnaya-reklama` |
| `/thank-you` | `/ru/thank-you` |
| `/prat` | `/ru/prat` |
| `/hatzara` | `/ru/hatzara` |

The Russian 404 page is rendered for missing paths under `/ru/`. Existing Hebrew URLs are not renamed or redirected.

## Content Architecture

Shared Astro components render both locales. Locale-specific content lives in typed content modules rather than being embedded in components.

Shared UI strings include:

- Navigation and footer labels
- Buttons and CTA labels
- Form labels, placeholders, status messages, and validation errors
- Modal and popup copy
- Accessibility labels and skip links
- Blog card and related-content labels
- Error and thank-you messages

The blog moves to an Astro Content Collection. Each article entry records:

- Locale
- Stable translation key
- Localized slug
- Title and description
- Publication and update dates
- Author
- Reading time
- Hero image and alt text
- FAQ data where applicable

Hebrew and Russian articles are paired by translation key, not by matching slugs.

## Translation Standard

- Preserve facts, meaning, and verified proof points.
- Rewrite syntax and transitions for idiomatic professional Russian.
- Avoid calques from Hebrew, bureaucratic language, keyword stuffing, and exaggerated promises.
- Adapt examples for an international audience when the original Israel-specific detail is not essential.
- Keep Israel-specific examples when they demonstrate real experience, with enough context for an international reader.
- Use consistent terminology for leads, qualified inquiries, conversion, paid campaigns, landing pages, CRM, and sales.
- Maintain the direct, practical, confident brand voice.

The legal pages receive a clearly labelled Russian-language adaptation of the current site information. They do not claim legal applicability outside Israel and remain excluded from indexing.

## International SEO

Every indexable page has:

- A self-referencing canonical URL
- A mutual Hebrew/Russian hreflang pair
- `hreflang="he-IL"` for Hebrew
- Language-only `hreflang="ru"` for globally targeted Russian
- `hreflang="x-default"` pointing to the Hebrew root equivalent
- A localized title, meta description, H1, Open Graph title, and Open Graph description
- Correct `lang` and `dir` attributes

The sitemap is generated from the route/content source of truth and includes all indexable Hebrew and Russian URLs with language alternatives. Legal, thank-you, internal, and advertising pages remain excluded as appropriate.

Russian slugs use readable Latin transliteration. Existing Hebrew transliterated slugs remain unchanged.

## Structured Data and GEO

Russian pages use localized JSON-LD with `inLanguage: "ru"`. The Organization remains based in Israel, while service availability accurately reflects remote work with customers worldwide.

The Russian content is made extractable for search and answer engines through:

- Direct answers near the beginning of relevant sections
- Clear question-based headings
- Self-contained explanations of services, process, limits, and outcomes
- Natural FAQ sections
- Named author, dates, verified metrics, and real examples
- Internal links between service explanations and relevant articles
- A Russian section in `llms.txt`

No separate hidden or AI-only content is created. GEO improvements must also improve the visible human experience.

## Layout and Direction

Hebrew remains `lang="he"` and `dir="rtl"`. Russian uses `lang="ru"` and `dir="ltr"`.

The existing Profit Media design, colors, imagery, and component hierarchy remain unchanged. Locale-specific layout rules remove hardcoded RTL alignment where it would render Russian incorrectly.

The language switcher:

- Appears in the header and footer
- Links to the translated equivalent of the current page
- Falls back to the destination-language homepage only when no equivalent exists
- Uses explicit language names: `עברית` and `Русский`
- Meets the existing 44px touch-target and focus-state requirements

Assistant remains the primary font if its Cyrillic files render correctly. Otherwise, the implementation adds the appropriate Cyrillic subset without changing the visible brand style.

## Forms and Analytics

Russian forms:

- Display all labels, errors, loading states, and success messages in Russian
- Submit `locale=ru`
- Preserve the current UTM and attribution fields
- Redirect to `/ru/thank-you`

The analytics data layer exposes `page_language` so Hebrew and Russian traffic and conversion can be compared. Existing tracking identifiers and Hebrew events remain intact.

## Error Handling

- Missing translations fail visibly during development rather than silently showing Hebrew.
- Missing article translation pairs omit the language alternative until a translation exists.
- Invalid locale values fall back to Hebrew only at the routing boundary.
- Canonical and hreflang URLs are produced by one shared helper to prevent cross-locale canonical mistakes.
- Form errors stay on the current locale and never redirect users to the other language.

## Verification

The release is ready when:

1. The production build succeeds.
2. Every included Hebrew page has the expected Russian equivalent.
3. Canonical and reciprocal hreflang links are correct on every indexable pair.
4. Sitemap URLs and language alternatives match the built routes.
5. JSON-LD is valid and localized.
6. No unintended Hebrew UI text appears on Russian public pages.
7. No Russian copy appears on Hebrew public pages.
8. Header/footer switching preserves the equivalent page.
9. Russian forms submit the locale and reach the Russian thank-you page.
10. Existing Hebrew routes and form flows continue to work.
11. Key pages are checked at 375px, 768px, and 1024px.
12. LTR/RTL alignment, focus states, touch targets, and reduced-motion behavior remain accessible.

## Rollout

Implementation proceeds in four bounded stages:

1. Locale infrastructure, shared metadata helpers, route pairing, and language switcher.
2. Homepage, About, shared UI, forms, and utility pages.
3. Blog Content Collection migration and Russian article localization.
4. Sitemap, JSON-LD, `llms.txt`, analytics, and full regression verification.

The Russian pages should launch together once all indexable page pairs, metadata, and hreflang links are complete. Partially translated indexable pages are not published.
