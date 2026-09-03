# SEO / GEO operating plan — profitmedia.co.il

**Date:** 2026-09-03  
**Status:** active working plan (not a CRM feature yet)

## Strategy that works now (2026)

Google does **not** reward “fake freshness” (tiny edits every day). It rewards:

1. **Real new useful pages** on money / problem queries
2. **Meaningful updates** to pages that already get impressions
3. **Internal links** that make clusters crawlable
4. **Indexing hygiene** (sitemap, request indexing for new URLs)
5. **E-E-A-T signals** (cases, numbers, founder voice, unique product)

Cadence that works for a small site like ours:

| Rhythm | What |
|--------|------|
| **1 solid HE+RU article every 1–2 weeks** | Better than 4 thin pieces in one day |
| **Same day:** publish + sitemap + GSC request indexing | No artificial delay needed |
| **Between articles:** link refresh + optional 1–2 inline figures | Keeps cluster warm without spam |
| **Avoid:** drip-publishing the same finished article over days “for Google” | Wastes time; Google sees the final URL when crawled |

**Today vs schedule:** if content is ready and good — **publish today**. Schedule only when *you* need time to write/review, not to game freshness.

## Done (recent)

- [x] CPL vs CAC article HE+RU + indexed
- [x] Meta CRM quality feedback HE+RU
- [x] Internal links to CPL cluster
- [x] Hybrid cover system + rule for future chats
- [x] Inline figures: paid ads, proposal (this update)
- [x] Sitemap live (22 URLs)

## Next stages (priority order)

### A. Content (highest leverage)

| # | Item | Why | When |
|---|------|-----|------|
| 3 | **Kitchen case page** (מטבחים / кухни) | Commercial intent + proof | Next 1–2 weeks |
| 4 | **Meta CAPI / offline conversions** HE+RU | Technical long-tail, thin HE competition | After #3 |
| 5 | Refresh top GSC pages (titles/FAQ/links) when impressions appear | Harvest existing crawl | Ongoing monthly |
| — | More inline figures on long posts (choose agency, conversion) | UX + time-on-page | Opportunistic |

### B. Indexing / ops (do with every publish)

1. Deploy site
2. Confirm URL in live `sitemap.xml`
3. GSC → Submit sitemap if Last read stale
4. URL Inspection → Request indexing (HE + RU)
5. Spot-check `pm-release` pin

### C. GEO / AI

- Keep 130–180 word answer block at article starts
- Update `llms.txt` on each new article
- Monthly: ask ChatGPT/Perplexity 3 money questions; note if cited

### D. Do **not** prioritize yet

- Building a full blog CMS inside CRM just to drip-publish
- Thin “update dates” without real edits
- Publishing many articles the same day to look “active”

## Where the plan lives

- **Now:** this file + `docs/superpowers/specs/2026-09-02-seo-content-strategy-design.md`
- **CRM `/leads`:** wrong place (sales pipeline)
- **Future CRM home if built:** **אתר / Site** (same area as client logos CMS), as a **content calendar / checklist**, not as the page renderer
- **Publish + sitemap ownership:** stays in **profitmedia-site** (git → ship → Pages). CRM can later trigger or mirror status, but HTML/sitemap generation belongs to the site.

## Optional later: CRM “Content” under Site

MVP (if we build it):

1. Table of planned articles (title, locale pair, status: idea → draft → ready → published)
2. Link to markdown path / PR / preview URL
3. Checklist: covers, llms, sitemap, GSC requested
4. Button **«סומן כפורסם»** (marks published + stores date) — **not** a full auto-writer

Full “write in CRM → one click rebuilds Pages + sitemap” is a separate product (like logos R2 bridge). Worth it only after content cadence is stable for 4–6 more articles.
