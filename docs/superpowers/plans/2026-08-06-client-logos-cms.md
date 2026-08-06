# Client Logos CMS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let CRM operators upload, name, reorder, and publish client carousel logos so `profitmedia.co.il` shows the published set without a full site rebuild.

**Architecture:** pm-crm Worker stores draft rows in D1 and files in R2 (`SITE_ASSETS`). Publish writes an immutable versioned `manifest-vN.json` and points `site_client_logo_publish` at it. Public CDN routes on the Worker serve manifest + binaries without auth. `Clients.astro` keeps static `clientLogos` SSR fallback and swaps in the published list via IntersectionObserver fetch.

**Tech Stack:** Cloudflare Worker + D1 + R2, vanilla CRM HTML/JS, Astro Clients component.

**Spec:** `docs/superpowers/specs/2026-08-06-client-logos-cms-design.md`

## Global Constraints

- Client carousel logos only (not brand logo / favicon).
- Draft edits persist immediately via API; only Publish changes production.
- `alt` required and non-empty for every logo before Publish.
- MIME: `image/png`, `image/webp`, `image/svg+xml`, `image/jpeg`; max **1.5 MB**.
- Public fetch failure → keep static fallback logos.
- Publish failure → do not bump publish pointer.
- One shared published list for all pages using `<Clients />`.
- Auth: existing Bearer `ADMIN_TOKEN` for mutate/list; public CDN routes unauthenticated.

---

## File map

### pm-crm

| File | Responsibility |
|------|----------------|
| `worker/wrangler.toml` | `SITE_ASSETS` R2 binding |
| `worker/migrations/0008_site_client_logos.sql` | Draft + publish tables |
| `worker/schema.sql` | Keep in sync with migration |
| `worker/src/site-client-logos.ts` | Validation, handlers, CDN serve |
| `worker/src/index.ts` | Env + route wiring |
| `public/site.html` | Admin UI |
| `public/js/site-client-logos.js` | DnD upload/reorder + publish |
| `public/css/site.css` | Page styles (match shell) |
| `public/js/api.js` | `apiUpload` |
| `public/js/i18n.js` | he/ru strings |
| `public/{leads,kanban,calendar,stats,archive,lead}.html` | Nav link |

### profitmedia-site

| File | Responsibility |
|------|----------------|
| `src/components/Clients.astro` | Fallback SSR + lazy manifest swap |
| `src/data/site.ts` | Keep `clientLogos` as fallback |

---

### Task 1: R2 binding + D1 migration

**Files:**
- Modify: `worker/wrangler.toml`
- Create: `worker/migrations/0008_site_client_logos.sql`
- Modify: `worker/schema.sql` (append same tables)
- Prerequisite: R2 enabled in Cloudflare Dashboard for the account

- [ ] **Step 1: Create R2 bucket** (Dashboard or `wrangler r2 bucket create pm-crm-site-assets`)

- [ ] **Step 2: Bind R2 in wrangler.toml**

```toml
[[r2_buckets]]
binding = "SITE_ASSETS"
bucket_name = "pm-crm-site-assets"
```

- [ ] **Step 3: Write migration**

```sql
CREATE TABLE IF NOT EXISTS site_client_logo_draft (
  id TEXT PRIMARY KEY,
  r2_key TEXT NOT NULL,
  content_type TEXT NOT NULL,
  alt TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS site_client_logo_publish (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version INTEGER NOT NULL,
  manifest_r2_key TEXT NOT NULL,
  published_at TEXT NOT NULL,
  published_by TEXT
);
```

- [ ] **Step 4: Apply remote migration**

```bash
cd worker && npx wrangler d1 migrations apply pm-crm --remote
```

Expected: migration `0008_site_client_logos` applied.

- [ ] **Step 5: Commit**

```bash
git add worker/wrangler.toml worker/migrations/0008_site_client_logos.sql worker/schema.sql
git commit -m "feat(site): add client logos R2 binding and D1 tables"
```

---

### Task 2: Worker API + public CDN routes

**Files:**
- Create: `worker/src/site-client-logos.ts`
- Modify: `worker/src/index.ts` (Env + routes)

**Interfaces:**
- Consumes: `env.DB`, `env.SITE_ASSETS`, `isAuthorized`, `json`, `withCors`
- Produces handlers used by index router:
  - `handleListClientLogos`, `handleUploadClientLogo`, `handleReorderClientLogos`, `handlePatchClientLogo`, `handleDeleteClientLogo`, `handlePublishClientLogos`, `handlePublicManifest`, `handlePublicAsset`

**Public URL shape (v1, no separate assets domain):**
- `GET https://crm.profitmedia.co.il/cdn/clients/manifest.json`
- `GET https://crm.profitmedia.co.il/cdn/clients/{uuid}.{ext}`

Manifest `src` fields must use that absolute origin (from request URL).

- [ ] **Step 1: Implement pure validators in `site-client-logos.ts`**

```ts
export const ALLOWED_TYPES = new Set([
  'image/png', 'image/webp', 'image/svg+xml', 'image/jpeg',
]);
export const MAX_BYTES = 1.5 * 1024 * 1024;

export function validateUploadMeta(contentType: string, size: number): string | null {
  if (!ALLOWED_TYPES.has(contentType)) return 'Unsupported file type';
  if (size <= 0 || size > MAX_BYTES) return 'File too large (max 1.5MB)';
  return null;
}

export function sanitizeSvg(bytes: ArrayBuffer, contentType: string): ArrayBuffer {
  if (contentType !== 'image/svg+xml') return bytes;
  const text = new TextDecoder().decode(bytes);
  const clean = text
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  return new TextEncoder().encode(clean).buffer;
}
```

- [ ] **Step 2: Implement list / upload / reorder / patch / delete / publish**

Behavior from spec:
- Upload → R2 `clients/{uuid}.{ext}` + draft row at end `sort_order`
- Reorder → replace `sort_order` by index in `id[]`; 400 if unknown id
- Patch `{ alt }` → trim; allow empty in draft; Publish rejects blank
- Delete → delete draft row; leave R2 object (GC later)
- Publish → require ≥1 logo and every `alt.trim()`; write `clients/manifest-v{n}.json`; upsert publish row; on R2 failure do not update D1 publish pointer
- List → `{ draft, published: { version, publishedAt, publishedBy } | null }` with draft items including `previewUrl: /cdn/clients/{file}`

- [ ] **Step 3: Wire routes in `index.ts` before ASSETS.fetch**

```ts
SITE_ASSETS: R2Bucket;
// ...
if (url.pathname === '/cdn/clients/manifest.json' && request.method === 'GET') {
  return withCors(await handlePublicManifest(request, env));
}
const cdnAsset = url.pathname.match(/^\/cdn\/clients\/([a-zA-Z0-9._-]+)$/);
if (cdnAsset && request.method === 'GET') {
  return withCors(await handlePublicAsset(env, cdnAsset[1]));
}
// auth API routes under /api/site/client-logos...
```

- [ ] **Step 4: Typecheck**

```bash
cd worker && npx tsc --noEmit
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add worker/src/site-client-logos.ts worker/src/index.ts
git commit -m "feat(site): client logos draft API and public CDN routes"
```

---

### Task 3: CRM UI (`site.html`)

**Files:**
- Create: `public/site.html`, `public/js/site-client-logos.js`, `public/css/site.css`
- Modify: `public/js/api.js` — add `apiUpload`
- Modify: `public/js/i18n.js` — `nav.site` + `site.*` he/ru
- Modify: nav on all main HTML pages

- [ ] **Step 1: `apiUpload`**

```js
async function apiUpload(path, formData) {
  const response = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });
  if (response.status === 401) {
    sessionStorage.removeItem('adminToken');
    window.location.href = '/login.html';
    throw new Error('Unauthorized');
  }
  return response.json();
}
```

- [ ] **Step 2: Build `site.html` shell** — same header/subnav as `archive.html`, active Site link; main: dropzone, draft list, dirty banner, Preview + Publish.

- [ ] **Step 3: `site-client-logos.js`**
  - `requireAuth()` + load list
  - dropzone + file input: multi upload via `apiUpload('/site/client-logos/upload', fd)`
  - cards: `<img>` from `previewUrl`, required name input (PATCH on blur), delete, drag handle
  - reorder: HTML5 DnD → `PATCH /site/client-logos/reorder` with ordered ids
  - dirty: stringify draft ids+alts+order vs last known published snapshot fingerprint from list payload
  - Preview: modal mirroring carousel tile sizes from site CSS
  - Publish: confirm → `POST /site/client-logos/publish`

- [ ] **Step 4: i18n + nav link on all CRM pages**

- [ ] **Step 5: Deploy worker + smoke-test upload/reorder/publish via CRM**

- [ ] **Step 6: Commit**

```bash
git add public/site.html public/js/site-client-logos.js public/css/site.css public/js/api.js public/js/i18n.js public/*.html
git commit -m "feat(site): CRM UI for client logos draft and publish"
```

---

### Task 4: Public site carousel consumer

**Files:**
- Modify: `src/components/Clients.astro` in profitmedia-site

- [ ] **Step 1: Keep SSR map over `clientLogos`**

- [ ] **Step 2: Add script** — IntersectionObserver on `#clients`; fetch `https://crm.profitmedia.co.il/cdn/clients/manifest.json`; if `logos.length`, rebuild carousel items with `src`/`alt`; ignore errors.

```js
const MANIFEST = 'https://crm.profitmedia.co.il/cdn/clients/manifest.json';
```

- [ ] **Step 3: Deploy site (or preview) and verify fallback + swap**

- [ ] **Step 4: Commit**

```bash
git add src/components/Clients.astro
git commit -m "feat(clients): load published logos manifest with static fallback"
```

---

### Task 5: Seed + first publish (manual)

- [ ] Upload current `public/images/clients/*` used by `clientLogos` via CRM (or a one-off script using ADMIN_TOKEN).
- [ ] Set real client names for `alt` where known (Sears, Activitec, …).
- [ ] Publish once; hard-refresh homepage and confirm carousel.

---

## Testing checklist

- [ ] Unauthorized mutation → 401
- [ ] Bad MIME / oversized → 400
- [ ] Reorder unknown id → 400; draft unchanged
- [ ] Publish empty draft or blank alt → 400
- [ ] Successful publish bumps version; prior manifest key remains in R2
- [ ] Public page shows fallback offline / on 5xx
- [ ] After publish, carousel updates within CDN `max-age` window (~60s + SWMR)

## Rollout note

If R2 is not yet enabled on the CF account, enable it in the Dashboard before Task 1 bucket create. Until then, Worker binding deploy will fail.
