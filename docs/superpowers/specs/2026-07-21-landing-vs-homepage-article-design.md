# Design: Blog article — landing page vs homepage

**Date:** 2026-07-21  
**Status:** Approved by user (Hebrew copy + Latin slug)

## Goal

Publish second blog post targeting Israeli high-ticket owners who send paid ads to the homepage. Capture queries around דף נחיתה / קידום דף נחיתה; support SEO + GEO extractability; CTA to free campaign diagnosis.

## URL

`https://profitmedia.co.il/blog/daf-nechita-mul-daf-habayit` (Latin slug — ops clarity; keyword in title/H1)

## Content

Approved Hebrew draft covering: short answer block, definition, comparison table, when homepage is OK, why paid traffic suffers on busy homepage, LP checklist, soft case, FAQ (6), diagnosis CTA.

## Assets

- Square cover `public/images/blog/daf-nechita-mul-daf-habayit-square.png` (1:1) — blog card
- Wide hero `public/images/blog/daf-nechita-mul-daf-habayit-wide.png` (3:2) — article figure  
Style: flat illustration, brand purple `#651561` + yellow `#fcc000`, white background (match first post).

## Technical

- Add post to `src/data/blog.ts`
- New page `src/pages/blog/daf-nechita-mul-daf-habayit.astro` (same pattern as first article: Layout, schema BlogPosting + FAQ + Breadcrumb, MidPageCta, BlogFaq, contact form)
- Table styles in `BlogProse.astro`
- Add URL to `public/sitemap.xml`
- Deploy Cloudflare Pages `profitmedia-site`
