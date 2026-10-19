# Profit Media site – last production deploy

**Do not deploy an older local tree or `profitmedia-site-ru` over this.** Always:

1. Work from `/Users/lev/Desktop/work/profitmedia-site` on `main` (not `profitmedia-site-ru`)
2. `git fetch origin && git checkout main && git pull --ff-only`
3. Confirm `git rev-parse HEAD` equals `origin/main`
4. Confirm this file lists the Donhin popup arm (or newer) and `pm-release` matches Layout
5. Prefer `npm run ship -- "message"` (build + Pages deploy + live `pm-release` check)
6. Or: `npm run build` then `npx wrangler pages deploy dist --project-name=profitmedia-site`

| Field | Value |
|-------|--------|
| Git commit | `f9a7fec` |
| Feature | Donhin popup no longer opens on first paint. Scroll trigger waits 8s, needs 400px of real scroll and 600px of scroll room. Cache bust `donhin-ab.js?v=20261019popup` |
| `pm-release` pin | `2026-10-19-donhin-popup-arm` |
| Cloudflare Pages deploy | `f9a7fec` |
| Deployed at (IL) | 2026-10-19 |
| Do not roll back past | Any tree that calls `onScroll()` immediately inside `initPopup`, or an older `pm-release` than `2026-10-19-donhin-popup-arm`. Also keep chart script `20261016chart` and AB arms `free_check` / `28s` / `40pct` / `risk_reversal` / `dark_band_risk` |
| Live check | https://profitmedia.co.il/donhin/ and https://profitmedia.co.il/adv_lp3/ must include `pm-release` = `2026-10-19-donhin-popup-arm` and `donhin-ab.js?v=20261019popup` |

If production looks old, check live HTML for `<meta name="pm-release" content="2026-10-19-donhin-popup-arm">`. Never promote a Cloudflare preview from `feature/russian-localization` or a stale checkout over this pin.
