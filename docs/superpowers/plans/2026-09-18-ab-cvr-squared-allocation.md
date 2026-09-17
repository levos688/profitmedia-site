# CVR² exploit-first allocation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or subagent-driven-development.

**Goal:** Replace mid-ladder lift tilts with CVR² exploit-first shares (60–85%, explore ≥15%, gap≥20%+≥5 leads → ≥75%) on Donhin/home/ads and Aran.

**Architecture:** Same `allocateExperiment` flow: newcomer + crush/solo unchanged; when leader has ≥2 leads and not crush, compute shares from CVR² + clamps.

**Tech Stack:** TypeScript Cloudflare Pages Functions + Aran Worker; Vitest for Aran.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-18-ab-cvr-squared-allocation-design.md`
- Do not revert ACTIVE_AB_VARIANTS / soft-retire floors
- No Co-authored-by Cursor in commits
- Deploy both clients; verify live allocate

---

### Task 1: profitmedia-site cores

Replace `tierForLift` / `majorityShareFromRates` mid-path with `cvrSquaredShare(...)` in:
- `functions/api/ab-stats-core.ts`
- `functions/api/home-ab-stats-core.ts`
- `functions/api/ads-ab-stats-core.ts`

### Task 2: aran-widgets

Same in `worker/src/ab-allocate.ts`; update `ab-allocate.test.ts`; keep classic/new_ui and CTR warm-start.

### Task 3: deploy + anti-rollback check

Ship site + worker; curl allocate; confirm popup_scroll ≥75%; confirm ACTIVE lists unchanged; pin/version live.

### Task 4: Aran all_time analysis

Recommend disable losing `*_new_ui` and restore stronger classic variants (separate change after user confirms).
