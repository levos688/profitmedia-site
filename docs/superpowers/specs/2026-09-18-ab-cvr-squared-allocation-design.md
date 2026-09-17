# A/B traffic: CVR² exploit-first (all clients)

Date: 2026-09-18  
Status: implemented (2026-09-18)  
Scope: shared allocation policy for **Donhin** (`ab-stats-core`), **home**, **ads**, and **Aran Widgets** (`worker/src/ab-allocate.ts`)

Supersedes the soft-tilt floors of the 2026-09-17 early-ladder change for 2-arm (and multi-arm) experiments when CVR signal exists. Soft-retire / solo rules from [2026-07-26 Donhin hybrid allocation](./2026-07-26-donhin-ab-hybrid-allocation-design.md) stay unless noted.

## Problem

Relative CVR gaps that matter for lead volume (e.g. 6.48% vs 4.93% = **−24%** relative) still left ~40% traffic on the weaker arm (60/40). That wastes FB budget when the goal is maximize leads on small accounts.

Plain `share ∝ CVR` only yields ~57/43 here, so proportional rates alone do not fix the issue. Discrete lift ladders (×1.10 → 55%, ×1.15 → 60%, …) under-shift mid-range gaps.

## Goal

Maximize expected leads while keeping a controlled explore floor so tests can continue and false winners can be corrected.

## Non-goals

- Changing event tracking, CRM intake, or Meta/CAPI.
- Auto-creating new creative variants after solo.
- Replacing dashboard ranking badges (Лучший / Слабый) beyond using the same CVR leader definition.
- Per-client custom formulas (one policy everywhere).

## Decisions locked with user

| Topic | Choice |
|---|---|
| Strategy family | Exploit-first with explore floor (between pure max-leads and balanced learning) |
| Core share formula | `share_i ∝ CVR_i²` then normalize |
| Leader clamp (test alive) | **60–85%** |
| Explore floor (alive lag) | **≥15%** total for all non-retired challengers combined; 2-arm → lag ≥15% |
| Material gap boost | If relative gap ≥ **20%** AND leader conversions ≥ **5** → leader share ≥ **75%** |
| Thin sample | Leader conversions **&lt; 5** → softer clamp **55–65%** (still CVR², no 75% floor) |
| Crush / solo | Keep existing: lift ≥ **3×** → up to 90/10; soft-retire / solo per existing impress floors |
| Warm-start | CTR-only tilt only when leader has **&lt; 2** leads (Aran already); Donhin may keep CVR-only until 2 leads then CVR² |
| UI | Keep CVR Δ badges (п.п. + relative %) on all ab-stats dashboards |
| Rollout | Same formula on Donhin + home + ads + Aran |

## Definitions

- `cvr(v) = conversion / impression` (0 if impression = 0)
- Leader = highest CVR among active (non-retired) arms; ties → more conversions, then existing score
- `rel_gap = (cvr(leader) − cvr(lag)) / cvr(leader)` when `cvr(leader) > 0` (e.g. 0.24 = 24% worse)
- `lift = cvr(leader) / cvr(lag)` when `cvr(lag) > 0`

## Allocation algorithm

Applies to every experiment with ≥2 **active** variants (weights for retired/history arms stay 0).

### 0. Prerequisites

1. If any arm has 0 impressions and established arms have ≥2 leads → keep existing newcomer explore ≤30% catchup (unchanged).
2. Classic vs `*_new_ui` twin: start 50/50 until both have impressions (Aran rule, unchanged).
3. Soft-retire / solo: if existing crush+retire conditions hit → solo / 90-10 as today (takes priority over CVR²).

### 1. Thin or no CVR signal

- Leader conversions **&lt; 2**: equal 50/50 (or Aran CTR warm-start if already implemented).
- Else continue.

### 2. CVR² weights (main path)

For each alive arm `i`:

```
raw_i = max(cvr(i), ε)²    // ε tiny only if needed to avoid 0/0; prefer raw=0 if cvr=0
share_i = raw_i / sum(raw)
```

Then apply clamps:

| Condition | Leader share after clamp |
|---|---|
| Leader conv &lt; 5 | `clamp(share_leader, 0.55, 0.65)` |
| Leader conv ≥ 5 and `rel_gap ≥ 0.20` (vs weakest alive lag, or vs next-best if 2-arm) | `max(share_leader, 0.75)`, then `clamp(..., 0.60, 0.85)` |
| Else (leader conv ≥ 5) | `clamp(share_leader, 0.60, 0.85)` |

Remainder split **equally** among alive challengers. Enforce combined challenger share ≥ **0.15** (if clamp would give leader &gt; 85% while not in crush path, cap leader at 85%).

### 3. Crush path (unchanged priority)

If `lift ≥ 3` (or zero-CVR lag with existing impress floors): allow leader **90%** (or solo). Explore floor of 15% does **not** apply in solo; in 90/10 the lag may be 10%.

### 4. Reason string (dashboard)

Must include:

- mode label (e.g. `CVR²`, `CVR²+gap≥20%`, `Разгром`)
- split percents
- `CVR x.xx% vs y.yy%` and relative gap `−N%` when 2-arm

Example: `CVR²+gap 60pct: 75/25 (CVR 6.48% vs 4.93%, −24%, показов 216/142)`

## Worked example (Donhin popup_scroll)

- A: 14/216 → 6.48%, B: 7/142 → 4.93%
- `rel_gap ≈ 24%`, leader leads = 14 ≥ 5
- Raw CVR² → ~63/37 before boost → material gap → **≥75/25**
- Expected vs old 60/40: more leads per 1000 impressions (~61–62 vs ~59), explore still alive

## Multi-arm (3+)

Same CVR² + clamps on the leader; remainder split equally among alive non-leaders; combined non-leaders ≥15% unless crush retires some to 0.

## Dashboard

- Already: Δ vs best CVR as `±X п.п. (±Y%)` pills; `Δ н/д` when period has no CVR.
- Allocation note uses the new reason string above.
- No separate “traffic should match −24%” UI rule; traffic follows this spec, UI only explains.

## Files to change (implementation)

| Repo | Files |
|---|---|
| profitmedia-site | `functions/api/ab-stats-core.ts`, `home-ab-stats-core.ts`, `ads-ab-stats-core.ts` |
| aran-widgets | `worker/src/ab-allocate.ts` + tests |
| both | Dashboard reason copy only if needed; Δ UI already shipped |

## Success criteria

1. Donhin scroll with current stats allocates **≥75%** to `60pct` (not 60/40).
2. Mild gaps (&lt;20% or &lt;5 leads) stay in 55–65 / 60–85 bands without jumping to 90.
3. Solo/crush still reachable on 3× + impress rules.
4. Unit tests cover: thin sample, material gap, CVR² mid, crush, 3-arm, newcomer.
5. Live `/api/ab-allocate` (Donhin) and Aran allocate reflect the new reasons.

## Rollout

1. Implement + tests in both codebases.
2. Deploy profitmedia-site Pages + aran-widgets Worker.
3. Verify Donhin `popup_scroll` and one Aran twin pair on `fb_ads`.
4. Mark this spec `implemented` with date.
