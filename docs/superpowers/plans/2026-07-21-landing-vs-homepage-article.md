# Landing vs Homepage Blog Article — Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax.

**Goal:** Ship approved Hebrew article at `/blog/daf-nechita-mul-daf-habayit` with images, schema, sitemap, and production deploy.

**Architecture:** Mirror existing `kampeinim-memumanim-madrich.astro` pattern; register post in `blog.ts`; extend BlogProse for tables.

**Tech Stack:** Astro static site, Cloudflare Pages, brand illustration assets.

## Global Constraints

- Hebrew copy as approved; Latin slug only
- No sales guarantees; CTA = free diagnosis
- Match first article visual system (purple/yellow flat art)
- Do not deploy unrelated `/avhun` WIP

---

### Task 1: Images

- [ ] Generate square + wide PNGs into `public/images/blog/`

### Task 2: Data + styles

- [ ] Add post metadata to `src/data/blog.ts`
- [ ] Add table styles to `BlogProse.astro`

### Task 3: Article page

- [ ] Create `src/pages/blog/daf-nechita-mul-daf-habayit.astro` with full body, FAQ, JSON-LD

### Task 4: Sitemap + ship

- [ ] Update `public/sitemap.xml`
- [ ] Build and `wrangler pages deploy`
- [ ] Commit SEO/article files (exclude avhun WIP)
