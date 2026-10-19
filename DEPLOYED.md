# Profit Media site – last production deploy

**Do not deploy an older local tree or `profitmedia-site-ru` over this.** Always:

1. Work from `/Users/lev/Desktop/work/profitmedia-site` on `main` (not `profitmedia-site-ru`)
2. `git fetch origin && git checkout main && git pull --ff-only`
3. Confirm `git rev-parse HEAD` equals `origin/main`
4. Confirm this file lists the Donhin form copy round 2 (or newer) and `pm-release` matches Layout
5. Prefer `npm run ship -- "message"` (build + Pages deploy + live `pm-release` check)
6. Or: `npm run build` then `npx wrangler pages deploy dist --project-name=profitmedia-site`

| Field | Value |
|-------|--------|
| Git commit | `b53a433` |
| Feature | Donhin form copy round 2: chances, amount, right. Button fixed to black. Cache bust `donhin-ab.js?v=20261019formtest2` |
| `pm-release` pin | `2026-10-19-donhin-form-copy2` |
| Cloudflare Pages deploy | `https://240110e7.profitmedia-site.pages.dev` |
| Deployed at (IL) | 2026-10-19 |
| Do not roll back past | Any tree older than `2026-10-19-donhin-form-copy2`. Keep short forms, popup arm, and live arms `chances` / `amount` / `right` / black button |
| Live check | https://profitmedia.co.il/donhin/ and https://profitmedia.co.il/adv_lp3/ must include `pm-release` = `2026-10-19-donhin-form-copy2` and `donhin-ab.js?v=20261019formtest2` |

If production looks old, check live HTML for `<meta name="pm-release" content="2026-10-19-donhin-form-copy2">`. Never promote a Cloudflare preview from `feature/russian-localization` or a stale checkout over this pin.
