# Donhin A/B hybrid allocation (signal ladder + soft-retire)

Date: 2026-07-26  
Status: implemented (2026-07-26)  
Scope: `profitmedia-site` Donhin AB (`/donhin/`, `/adv_lp3/`, `/donhin/ab-stats/`)

## Problem

The current hybrid allocator uses impression **catch-up at 90/10** whenever one arm is under-sampled. That incorrectly starves close races (popup delay/scroll) and is unrelated to conversion quality.

Sticky CTA needs the opposite behavior: when CVR gap is huge (e.g. ~1.8% vs ~33%) even with modest lead counts (≥2–3), traffic must shift hard to the winner, then retire the loser.

Dashboard “Лучший / Слабый” badges require ≥40 impressions on **both** active arms, so clear winners with small challenger samples show no rank badges.

## Goals

1. Allocate traffic by **signal strength** (CVR lift + minimum leads), not raw impression imbalance.
2. Soft-retire a clearly losing active variant (weight 0), leave history visible.
3. Warn in the stats UI when an experiment is in `solo` mode.
4. Email Lev once when an experiment first enters `solo`.
5. Restore meaningful Лучший/Слабый badges aligned with the same signal rules.

## Non-goals (this iteration)

- Auto-generating next numeric variants (e.g. popup `27s` hill-climb). After retire, a human requests a new variant.
- Changing quiz/bottom/hero copy experiments beyond the shared allocation rules (3+ arms stay equal until a future design).
- Changing Meta/CAPI or lead delivery.

## Decisions locked with user

| Topic | Choice |
|---|---|
| Signal model | Combo: CVR lift + min leads |
| Min leads for lift tiers | ≥2 |
| Soft-retire rule | CVR ≥ **3×**, leader ≥2 leads, weak ≥**40** impressions → 100/0 |
| Catch-up without win signal | Max **60/40**, never 90/10 |
| Solo email | Only `lev@profitmedia.co.il` |
| Auto next variant | Out of scope |

## Allocation algorithm (2-arm experiments)

Applies to active pairs in `ACTIVE_AB_VARIANTS` with exactly two variants (sticky, popup_delay, popup_scroll, hero_media). Experiments with 3+ active arms remain equal-weight for now.

Definitions:

- `cvr(v) = conversion / impression` (0 if impression = 0)
- `lift = cvr(leader) / cvr(lag)` when `cvr(lag) > 0`; if lag CVR is 0 and leader has ≥2 conversions and lag has ≥40 impressions, treat as strong dominance (eligible for разгром / soft-retire paths)
- Leader/lag chosen by existing `variantScore` (sticky prefers conversions + CVR + CTR; popup uses conversions + CVR)

### Ladder

| Level | Condition | Mode | Split (leader/lag) |
|---|---|---|---|
| Close | lift &lt; 1.5 OR leader.conversions &lt; 2 | `equal` (or mild `catchup`) | 50/50; if impression gap ≥15 and minImp &lt; 40 → at most **60/40** toward under-sampled arm |
| Soft leader | lift ≥ 1.5 AND leader.conversions ≥ 2 | `hybrid` | **65/35** |
| Clear | lift ≥ 2.0 AND leader.conversions ≥ 2 | `hybrid` | **80/20** |
| Crush | lift ≥ 3.0 AND leader.conversions ≥ 2 | `hybrid` | **90/10** |
| Soft-retire | lift ≥ 3.0 AND leader.conversions ≥ 2 AND lag.impression ≥ 40 | `solo` | **100/0** (lag weight 0) |

Priority: evaluate soft-retire first, then crush/clear/soft, else close/catchup.

### Catch-up rewrite

Remove today’s “under-sampled → 90/10” rule. Replace with:

- Only when **no** lift tier qualifies (close), and `maxImp - minImp ≥ 15` (or maxImp ≥ 40 while minImp &lt; 40)
- Cap at **60/40** toward the low-impression arm
- Reason text must say sample catch-up, not “leader”

### Sticky example (expected)

- `free_consult`: ~220 imp, 4 conv, ~1.82% CVR  
- `ask_lawyer`: ~9 imp, 3 conv, ~33% CVR  
- lift ≫ 3×, leader leads ≥2, lag impressions ≥40 → **`solo` ask_lawyer**, `free_consult` weight 0

### Popup example (expected)

- `22s` ~9.3% vs `25s` ~12.5% → lift ~1.35× → **50/50 or mild catch-up**, not 90/10

## Soft-retire behavior

When mode is `solo`:

1. Allocation weights: winner `1`, all other **active** variants in that experiment `0`.
2. Retired variants remain in stats history with badge «Выключен · история» (same as manually retired).
3. Client `donhin-ab.js` already rebalances sticky when current arm weight ≤15%; extend so weight `0` forces reassignment to the solo winner (once per mode/leader flag).
4. Do **not** remove variant ids from `ACTIVE_AB_VARIANTS` automatically in this iteration — zero weight is enough so traffic stops. Optional later: sync active list from allocation.

## Dashboard UI

1. **Banner / warning** when any experiment (or the focused one) is `solo`:
   - Copy (RU): congratulations — winning variant X; only one variant is receiving traffic; ask to add a new challenger for the next test.
2. Allocation note shows mode + reason (including `solo`).
3. **Badges** «Лучший» / «Слабый»:
   - Prefer signal from allocation: leader → Лучший; lagging active with weight &lt; 0.5 and lift tier ≥ soft → Слабый; weight 0 → Выключен.
   - Fallback: if both have enough data for a lift tier, show win/lose even if challenger &lt; 40 impressions when leader already qualifies for soft/clear/crush.
   - Remove hard requirement that **both** arms need ≥40 impressions before any badge.

## Email notification

- Provider: existing Resend (`RESEND_API_KEY`, `FROM_EMAIL`) as in `functions/api/contact.ts`.
- To: **`lev@profitmedia.co.il` only** (fixed, not Donhin lead recipients).
- Trigger: first transition of an experiment into `mode === 'solo'` for channel `fb_ads`.
- Dedup: KV flag e.g. `ab:notify:solo:{channel}:{experiment}:{leader}` so repeat allocate/stats calls do not re-send.
- When to send: during `ab-allocate` and/or authenticated `ab-stats` computation after allocation is computed (prefer one path: `ab-allocate` on traffic, plus `ab-stats` as backup if allocate is cold — both must honor the same KV dedup key).
- Body: experiment label, winner id/label, loser id, impressions/conversions/CVR for both, short congrats + “предложи новый вариант”.

Failure: log error; do not fail the allocate/stats HTTP response if email fails.

## Client notes

- Keep sticky rebalance when assigned variant weight ≤ 15% or `0`.
- Cache-bust `donhin-ab.js` query param on landing after client changes.

## Testing / acceptance

1. With current sticky numbers → allocate returns `solo` / 100% `ask_lawyer`.
2. With current popup_delay/scroll numbers → not 90/10; close to 50/50 (or ≤60/40 catch-up).
3. Dashboard shows solo warning + Лучший on winner; loser shows Слабый or Выключен.
4. Email sent once to lev@; second allocate does not send again.
5. New visitors (and rebalanced returners) no longer land on weight-0 sticky copy.

## Architecture touchpoints

| File | Change |
|---|---|
| `functions/api/ab-stats-core.ts` | Rewrite `computeHybridAllocation` ladder + solo |
| `functions/api/ab-allocate.ts` | After compute, maybe send solo email |
| `functions/api/ab-stats.ts` | Expose solo in allocation; optional email backup |
| new small helper or inline in allocate | Resend solo mail + KV dedup |
| `public/scripts/donhin-ab.js` | Rebalance on weight 0 |
| `public/scripts/donhin-ab-stats-dashboard.js` | Solo banner, badge rules |
| `src/components/donhin/DonhinLandingPage.astro` | Script `?v=` bump |

## Open follow-ups (explicitly later)

- Popup delay hill-climb (replace loser with winner±2s inside 15–35s bounds).
- Auto-update `ACTIVE_AB_VARIANTS` from KV for numeric experiments.
- Multi-arm (≥3) hybrid ranking.
