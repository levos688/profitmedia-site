# Design: Deals-from-Ads reposition (home + /ads/)

*Date: 2026-07-28*  
*Approach: B — dual surface, outcome-first messaging, singular voice*

## Decisions locked

| Item | Choice |
|------|--------|
| Product name | מערכת עסקאות מהפרסום |
| Voice | Singular (אני) — solo operator |
| Homepage hero baseline | H3 spirit: «מערכת שמחברת פרסום לעסקאות» |
| Front-door CTA | קבלו אבחון קמפיין חינם only (no «הזמנת מערכת» as primary acquisition) |
| Guarantee in ads | Soft only: free diagnosis, no commitment (no «25% או החזר») |
| ICP | Serious Israeli businesses needing ongoing leads; often already advertising |

## Surfaces

1. **Homepage `/`** — organic/SEO/trust; outcome hero + system below fold  
2. **`/ads/`** — paid traffic LP; same hero AB + shorter path to diagnosis  

## Hero A/B (`hero_copy`)

| Variant id | Role | H1 (Hebrew) |
|------------|------|-------------|
| `system` | Control / brand | מערכת שמחברת פרסום לעסקאות |
| `pain` | Challenger | יש לידים — אבל לא סוגרים עסקאות? |

Shared: singular subtitle framing, diagnosis CTA, proof chips (−46% SKI, ₪200K+ kitchens, 223+).

**Metrics:** impression = visit assignment; click = hero CTA; conversion = any lead on page. Stats via existing home/ads AB dashboards.

## Ad creatives (Meta)

Three primary-text variants (A proof-first, B pain, C system). Banner overlay + feed headline/description per variant (see campaign copy sheet). No hard performance guarantee.

## Out of scope (this iteration)

- Full homepage section reorder / portfolio cut  
- `/avhun` redirect  
- Visual banner PNG generation  
- Retiring `order_system` CTA AB variants (can follow after hero_copy has signal)

## Implementation notes

- Default SSR copy in `site.ts` = `system`  
- Client AB swaps hero fields via `data-ab-hero-*`  
- Register `hero_copy` in `pm-home-ab.js`, `pm-ads-ab.js`, and `ACTIVE_AB_VARIANTS` / `AB_EXPERIMENTS` in home + ads stats cores  
- Preview: `force_hero=system|pain`
