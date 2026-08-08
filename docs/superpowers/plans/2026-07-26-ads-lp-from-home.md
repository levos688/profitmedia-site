# Ads LP from Home — Implementation Plan

Implemented per approved design `docs/superpowers/specs/2026-07-26-ads-lp-from-home-design.md`.

## Done

- [x] `/ads/` slim homepage clone + `pm-ads-ab.js`
- [x] `/ads/thank-you/`, noindex, source `ads-meta-lp`
- [x] `/ads/ab-preview/`, `/ads/ab-stats/`
- [x] APIs `ads-ab-*`, KV `pm_ads_*`
- [x] Middleware auth for `/ads/ab-stats`
- [x] Home stats button → Ads LP stats

## Local review

1. http://127.0.0.1:4322/ads/
2. http://127.0.0.1:4322/ads/ab-preview/
3. Stats API only on Cloudflare / prod (same as Home)
