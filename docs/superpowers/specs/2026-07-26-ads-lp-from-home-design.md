# Ads LP from Homepage — Design

**Status:** Approved (approach B)  
**Date:** 2026-07-26

## Goal

Cold Meta/Google traffic lands on a CRO-slim homepage clone at `/ads/`, with the same A/B surfaces as Home (sticky, bottom form, mid CTA, offer, popup timer/scroll quiz), isolated stats, and thank-you + noindex for ads.

## Routes

| Path | Purpose |
|------|---------|
| `/ads/` | Landing (noindex) |
| `/ads/thank-you/` | Post-submit + Meta Lead if pixel set |
| `/ads/ab-preview/` | Local variant switcher |
| `/ads/ab-stats/` | Dashboard (same `AB_STATS_TOKEN` as Donhin/Home) |

## Content (slim home)

Order: Hero → AgencyStats → NamedOffer → Services → HowItWorks → WhyUs → CampaignResults (incl. MidPageCta) → Clients → Contact.  
Skip: FAQ (noindex LP — not for SEO/AI; adds exit friction), TargetAudience, Video, Portfolio, Blog.  
Chrome: logo-only sticky header (no site nav). Footer kept for privacy/legal.

## AB

- Client: `pm-ads-ab.js` → `window.pmAdsAb` (same experiments as Home)
- APIs: `/api/ads-ab-track`, `/api/ads-ab-allocate`, `/api/ads-ab-stats`
- KV keys: `pm_ads_ab_stats_v1` / `_fb` (+ daily) — same `DONHIN_AB_STATS` binding, separate namespace
- Form `source`: `ads-meta-lp`; thank-you: `/ads/thank-you`
- Components resolve `window.pmAdsAb || window.pmHomeAb` and optional `data-lead-source` / `data-thank-you` on forms

## Home stats link

On `/home/ab-stats`: button/link «Статистика Ads LP» → `/ads/ab-stats/?token=…`

## Out of scope

- Replacing `/avhun/`
- Deploy (local first; user reviews then publish)
