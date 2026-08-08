# Profit Media CRM (pm-crm) — Design

**Status:** approved 2026-07-27  
**Approach:** clone `aran-crm` → `pm-crm` on `crm.profitmedia.co.il`

## Goal

Internal CRM for Profit Media leads from site forms (homepage + `/ads/`), with attribution by campaign / audience / ad, deal amount tracking, and quality stats.

## Out of scope (MVP)

- Branches / showrooms
- WhatsApp meeting message template (calendar + Waze prefill)
- Meta/Zapier intake wiring (route may exist; not connected)
- Age / gender (no data from click)
- Meta CAPI feedback
- Multi-user roles

## Architecture

```
Site forms (home, /ads/) → /api/contact (Resend + Telegram as today)
                            └─► pm-crm POST /api/lead/intake (best-effort, X-Intake-Key)

Admin → https://crm.profitmedia.co.il (login → leads / kanban / lead / calendar / stats)
```

Stack: Cloudflare Worker + D1 + static assets (same as aran-crm). Email via Resend.

## Data model (leads)

| Field | Source |
|-------|--------|
| name, phone, email | form |
| status | default `new` |
| deal_amount | manual in CRM |
| lead_source | `home` / `ads` / form source |
| lead_audience | `utm_content` |
| lead_ad_id | `utm_term` |
| lead_campaign | `utm_campaign` |
| utm_source, utm_medium | UTM |
| quiz_answer, vertical | form |
| page_url, landing_url | form |
| next_action_at / note | reminder |
| meeting_at | optional meeting time (no branch) |
| notes, call_logs | CRM |

No `branch` column usage in UI (column may remain null for schema compatibility).

## Statuses

Keep Aran-compatible set: new, no_answer, callback, in_progress, serious, meeting, won, lost.

## Stats (variant A)

Table grouped by audience (`lead_audience`) and ad (`lead_ad_id`):

- leads count
- won count
- close rate %
- sum of deal_amount (won)

Filters: campaign, date range, page source (home/ads).

## Branding

- Logo: Profit Media
- Colors: `#651561`, `#5a1c73`, `#c60691`, `#fcc000`
- From email: `Profit Media CRM <noreply@profitmedia.co.il>`
- Notify: `lev@profitmedia.co.il`

## UTM convention (ads)

```
https://profitmedia.co.il/ads/?utm_source=facebook&utm_medium=paid&utm_campaign=...&utm_content=<audience>&utm_term=<ad_id>
```

## Auth

`ADMIN_EMAILS=lev@profitmedia.co.il` + `ADMIN_PASSWORD` / `ADMIN_TOKEN` / `INTAKE_KEY` / `RESEND_API_KEY`.
