# Client Logos CMS — Design Spec

**Date:** 2026-08-06  
**Status:** Approved for planning  
**Scope:** Homepage / landing **clients carousel** only (not Profit Media brand logo)  
**Surfaces:** `crm.profitmedia.co.il` (admin) + `profitmedia.co.il` (public carousel)

---

## Problem

Client logos in the trust carousel (`Clients.astro` + `clientLogos` in `src/data/site.ts`) are hard-coded static files under `public/images/clients/`. Updating them requires editing code and redeploying the site. Operators need a CRM UI to:

1. Upload new logos (drag-and-drop + file picker)
2. Reorder logos (drag-and-drop)
3. Set a **required** client name (`alt` text)
4. Save a **draft** without changing production
5. **Publish** when ready

---

## Goals

| Goal | Measure |
|------|---------|
| Edit client carousel from CRM | New **Сайт → Логотипы клиентов** page |
| Dual drag-and-drop | File drop for upload + card reorder |
| Draft / publish | Live carousel unchanged until Publish |
| No public TTFB regression | Homepage HTML stays static; carousel data is a small cacheable JSON fetch only when carousel enters/near viewport |
| Safe rollback | Previous published manifest remains available on publish failure |

## Non-goals (this phase)

- Editing Profit Media brand logo / favicon / OG image
- Blog CMS
- Image cropping / AI resize in Worker
- Per-landing-page different client sets (home, `/ads/`, `/deals/` share one published list for v1)
- Multi-admin roles / audit UI beyond `updated_by` email

---

## Current state

| Item | Location |
|------|----------|
| Logo list | `profitmedia-site/src/data/site.ts` → `clientLogos` |
| UI | `profitmedia-site/src/components/Clients.astro` + `HorizontalCarousel.astro` |
| Files | `profitmedia-site/public/images/clients/*` (SVG/PNG) |
| Used on | `index.astro`, `ads/index.astro`, `deals/index.astro`, `deals/system/index.astro`, `preview.astro` |
| CRM | No R2, no upload API; auth is Bearer `ADMIN_TOKEN` |

---

## Chosen approach

**R2 for binaries + D1 for draft/published manifests + CDN JSON for the public site.**

Rejected:

- **Full Pages rebuild on every publish** — 1–3 min latency; needs deploy hook for a list update.
- **Git commit of files** — awkward for DnD reorder/upload UX; binary noise in git.

---

## Architecture

```
┌────────────────────────────┐
│ crm.profitmedia.co.il      │
│ site.html → client logos   │
│ upload / reorder / draft   │
│ Publish → promote draft    │
└─────────────┬──────────────┘
              │ auth Bearer
              ▼
┌────────────────────────────┐
│ pm-crm Worker              │
│ D1: site_client_logos_*    │
│ R2: SITE_ASSETS            │
└─────────────┬──────────────┘
              │ public GET (cached)
              ▼
┌────────────────────────────┐
│ assets.profitmedia.co.il   │  (R2 custom domain or Worker route)
│ /clients/{uuid}.webp       │
│ /clients/manifest.json     │  published snapshot
└─────────────┬──────────────┘
              │ lazy fetch near carousel
              ▼
┌────────────────────────────┐
│ profitmedia.co.il Clients  │
│ fallback: static clientLogos │
└────────────────────────────┘
```

### Data model (pm-crm D1)

```sql
-- Draft working set (editable in CRM)
CREATE TABLE site_client_logo_draft (
  id TEXT PRIMARY KEY,           -- uuid
  r2_key TEXT NOT NULL,
  content_type TEXT NOT NULL,
  alt TEXT NOT NULL,             -- required client name
  sort_order INTEGER NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by TEXT
);

-- Published pointer (one row)
CREATE TABLE site_client_logo_publish (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version INTEGER NOT NULL,
  manifest_r2_key TEXT NOT NULL, -- e.g. clients/manifest-v12.json
  published_at TEXT NOT NULL,
  published_by TEXT
);
```

**Published Manifest JSON** (immutable file in R2):

```json
{
  "version": 12,
  "publishedAt": "2026-08-06T10:00:00.000Z",
  "logos": [
    {
      "id": "…",
      "src": "https://assets.profitmedia.co.il/clients/{uuid}.webp",
      "alt": "Sears"
    }
  ]
}
```

On publish: copy draft order + alts into a new versioned manifest object; bump `site_client_logo_publish.version`. Prior manifest keys stay for rollback / CDN.

### R2 layout

```
clients/{uuid}.{ext}           # binaries (never overwritten; replace = new uuid)
clients/manifest-v{n}.json     # immutable published snapshots
```

MIME whitelist: `image/png`, `image/webp`, `image/svg+xml`, `image/jpeg`.  
Max size: **1.5 MB** per file.  
SVG: accept for v1 but strip scripts on upload (or store only after basic sanitization); prefer PNG/WebP in UI copy.

### API (pm-crm, all Bearer-authenticated except public manifest)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/site/client-logos` | Draft list + published version meta |
| POST | `/api/site/client-logos/upload` | Multipart upload → R2 + insert draft |
| PATCH | `/api/site/client-logos/reorder` | Body: ordered `id[]` |
| PATCH | `/api/site/client-logos/:id` | Update `alt` |
| DELETE | `/api/site/client-logos/:id` | Remove from draft (R2 object may remain for GC later) |
| POST | `/api/site/client-logos/publish` | Write new manifest, update publish row |
| GET | `/api/site/client-logos/published` | Public JSON (or serve only from assets domain) |

Public consumers should hit the **CDN/assets URL** for the current manifest, not the CRM API, so CRM does not sit on the public path.

### Admin UI (CRM)

- New nav item: **אתר** / **Сайт** → `site.html` (sub-section: client logos; future room for blog)
- Components (vanilla JS + existing `shell.css` / `admin.css` patterns):
  - **Dropzone** for multi-file upload (File upload pattern: types/size shown; progress; thumbnail preview after selection)
  - **Card grid / list** of draft logos: thumbnail, required name field, delete
  - **Reorder** via HTML5 DnD (or lightweight Sortable) — clear drag handle; keyboard: optional v1.1
  - Dirty-state banner when draft ≠ published (compare draft fingerprint vs published version meta)
  - Persistence: upload / reorder / alt / delete call their APIs immediately (no separate “Save draft” for v1); Publish promotes the current draft
  - Preview: modal / iframe with carousel mock of the current draft
  - Publish: confirm dialog, then promote
- i18n: he + ru keys under `nav.site`, `site.clientLogos.*`
- Reuse `requireAuth()` + `api.js`; extend with `apiUpload(path, FormData)`

### Public site (`Clients.astro`)

1. Keep current `clientLogos` as **SSR fallback** in the HTML.
2. Add a small client script that IntersectionObserver-loads published `manifest.json` and replaces carousel items if fetch succeeds.
3. Cache-Control on manifest: `public, max-age=60, s-maxage=300, stale-while-revalidate=86400` (short enough for updates; long enough for CDN).
4. Cache-Control on `clients/{uuid}.*`: `public, max-age=31536000, immutable`.
5. Shared on all pages that already use `<Clients />` — one published list for v1.

Preview.astro / avhun hardcoded subsets: **out of scope** unless they already import `Clients`; avhun keeps its own array until a later phase.

---

## Error handling

| Case | Behavior |
|------|----------|
| Upload too large / bad MIME | 400 + toast in CRM; no draft row |
| Reorder with unknown id | 400; draft unchanged |
| Publish with empty draft | 400 — carousel must have ≥1 logo |
| Publish with blank `alt` | 400 — all alts required |
| R2 write fails mid-publish | Do not bump publish pointer; leave previous version live |
| Public fetch fails | Leave fallback static logos |

---

## Testing

- Unit (Worker): MIME/size validation; reorder persistence; publish writes manifest + bumps version only on success
- Manual: upload 3 files → rename → reorder → save draft → confirm live site unchanged → publish → confirm carousel updates after short cache window
- Manual: force public fetch fail → fallback logos render
- Accessibility: every logo has non-empty `alt`; dropzone keyboard-activatable (browse button)

---

## Security

- All mutate endpoints: existing `isAuthorized()` Bearer token
- Do not reuse `INTAKE_KEY` for uploads
- Fixed R2 key namespace; no client-supplied paths
- Optional later: CSP on CRM pages when accepting SVG

---

## Rollout

1. Add R2 bucket + binding on pm-crm (+ public assets route)
2. Migration + APIs + seed draft from current `clientLogos` (upload existing files once or link as external fallback until first publish)
3. CRM `site.html` UI
4. Site `Clients.astro` lazy manifest consumer + deploy
5. First Publish from CRM after verifying preview

---

## Open decisions (locked)

| Topic | Decision |
|-------|----------|
| What to edit | Client carousel only |
| DnD | Both upload dropzone + reorder |
| Publish model | Draft then explicit Publish |
| Client name | Required `alt` |
| Approach | R2 + D1 + CDN manifest |
| Shared list | One published list for home/ads/deals Clients component |
