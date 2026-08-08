# Donhin AB Hybrid Allocation Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax.

**Goal:** Replace impression catch-up 90/10 with a CVR-lift ladder, soft-retire losers to solo 100/0, warn in UI, email lev@ once.

**Architecture:** Rewrite `computeHybridAllocation` in `ab-stats-core.ts`; notify from `ab-allocate` with KV dedup; update dashboard badges/banner and client rebalance on weight 0.

**Tech Stack:** Cloudflare Pages Functions, KV, Resend, vanilla JS dashboard/client.

**Spec:** `docs/superpowers/specs/2026-07-26-donhin-ab-hybrid-allocation-design.md`

---

### Task 1: Allocation ladder + solo mode
- Modify: `functions/api/ab-stats-core.ts`
- [ ] Replace catch-up/hybrid with ladder (50/50, 60/40 catchup, 65/35, 80/20, 90/10, solo 100/0)
- [ ] Export helper types including `solo`

### Task 2: Solo email
- Create: `functions/api/ab-solo-notify.ts` (or inline)
- Modify: `functions/api/ab-allocate.ts` (+ Env RESEND)
- [ ] Send once to lev@profitmedia.co.il on first solo transition

### Task 3: Dashboard + client
- Modify: `public/scripts/donhin-ab-stats-dashboard.js`
- Modify: `public/scripts/donhin-ab.js`
- Modify: `DonhinLandingPage.astro` cache bust
- [ ] Solo banner; badges from allocation signal; rebalance weight 0

### Task 4: Deploy + verify
- [ ] Build, deploy, curl allocate for sticky=solo and popup≠90/10
