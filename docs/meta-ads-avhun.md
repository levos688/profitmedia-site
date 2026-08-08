# Meta Ads — Profit Media (מערכת עסקאות מהפרסום)

**Landing URL:** https://profitmedia.co.il/avhun/  
**Offer:** אבחון קמפיין חינם → מערכת עסקאות מהפרסום  
**Audience:** בעלי עסקים בישראל עם עסקאות גבוהות (שיחה / וואטסאפ / פגישה)

Before launch: set `PUBLIC_META_PIXEL_ID` in Cloudflare Pages (Production) and republish, so PageView + Lead fire on `/avhun/` and `/avhun/thank-you/`.

---

## Campaign setup

| Setting | Value |
|---------|--------|
| Objective | Leads (Instant Form **or** website — prefer **Website** to `/avhun/`) |
| Optimization | Landing page views → then Leads / conversions once pixel has volume |
| Geo | Israel |
| Language | Hebrew |
| Placements | Advantage+ or Feed + Stories/Reels (Instagram + Facebook) |
| Exclusions | Age < 28 if B2B high-ticket; exclude ecommerce lookalikes if possible |

**Suggested audiences (start 2–3 ad sets):**
1. Interest: digital marketing / small business owners / entrepreneurship + lookalike later from leads
2. Lookalike 1% from CRM closed clients (best) or past lead list
3. Retarget site visitors 30d (home + blog) → `/avhun/`

---

## Primary texts (Hebrew)

### Ad A — Pain
**Primary text:**  
יש לכם לידים מפייסבוק או מגוגל — אבל המכירות לא זזות?  
לעיתים הקמפיין מותאם לכמות טפסים, לא להתאמה לשיחה / וואטסאפ / פגישה.

קבלו אבחון קמפיין חינם תוך 24 שעות — בלי התחייבות.

**Headline:** יש לידים — אבל לא סוגרים?  
**Description:** אבחון חינם · מענה תוך 24 שעות  
**CTA button:** Learn More / Sign Up → Get Quote if available in HE

### Ad B — Offer system
**Primary text:**  
מערכת עסקאות מהפרסום: שאלון חכם + דף נחיתה + קמפיינים בפייסבוק, אינסטגרם וגוגל.  
לא עוד דוח לידים זולים — פניות שמתאימות לתהליך המכירה.

הצעד הראשון: אבחון חינם.

**Headline:** עסקאות מהפרסום — לא רק לידים  
**Description:** 223+ לקוחות · אבחון ללא התחייבות

### Ad C — Proof
**Primary text:**  
לקוח בתחום המטבחים דיווח על יותר מ־₪200,000 במכירות בחודש (שני חודשים רצופים).  
במקרה מתועד אחר — ירידה של עד 46% בעלות לליד.

רוצים לבדוק אם זה רלוונטי לעסק שלכם? אבחון חינם תוך 24 שעות.

**Headline:** תוצאות מהשטח — לא הבטחות  
**Description:** אבחון קמפיין חינם

---

## Creative direction (static / Reel)

Ready-to-upload PNGs (source SVG alongside): `docs/meta-ads-creatives/`

| File | Angle | Size |
|------|--------|------|
| `feed-a-pain.png` | Pain: יש לידים — אבל לא סוגרים? | 1080×1080 |
| `feed-b-system.png` | Offer: מערכת עסקאות מהפרסום | 1080×1080 |
| `feed-c-proof.png` | Proof: ₪200K+ / עד 46% | 1080×1080 |
| `story-a-pain.png` | Same pain for Stories/Reels cover | 1080×1920 |

1. **UGC-style talking head (you):** open with “יש לידים ולא סוגרים?” → 3 bullets (quiz, LP, quality) → CTA אבחון חינם. 15–25s vertical.
2. Upload the three feed PNGs as separate ads (A/B/C) in one ad set first.
3. **Carousel (optional week 2):** (1) הבעיה (2) שאלון (3) דף נחיתה (4) אבחון חינם.

Avoid: promising sales numbers as a guarantee; “הכי זול לליד”.

---

## Ads Manager — launch steps (15 min)

1. Campaign → **Leads** → website → destination `https://profitmedia.co.il/avhun/?utm_source=facebook&utm_medium=paid&utm_campaign=avhun_deals_2026`
2. One CBO campaign, **2 ad sets** max at start: (a) interest/broad IL Hebrew 28–55, (b) retarget site visitors 30d
3. Per ad set: 3 ads = copy A+creative A, B+B, C+C (see texts above)
4. Pixel: PageView on `/avhun/`, Lead on `/avhun/thank-you/` (needs env var below)
5. Budget: ₪100/day × 7 days, then kill losers per checklist

---

## Tracking checklist

- [ ] `PUBLIC_META_PIXEL_ID` on Pages Production
- [ ] Events: PageView on `/avhun/`, Lead on `/avhun/thank-you/`
- [ ] UTM: `utm_source=facebook&utm_medium=paid&utm_campaign=avhun_deals_2026`
- [ ] Form `source` already sends `avhun-meta-lp` to `/api/contact`
- [ ] Verify thank-you redirect after test lead

---

## First budget suggestion

- ₪80–150/day for 7 days learning  
- Kill creatives with CTR < ~0.8% or CPL 2× above target after 50+ clicks  
- Scale winner + launch lookalike from quality leads only
