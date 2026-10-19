# Profit Media site – last production deploy

**Do not deploy an older local tree or `profitmedia-site-ru` over this.** Always:

1. Work from `/Users/lev/Desktop/work/profitmedia-site` on `main` (not `profitmedia-site-ru`)
2. `git fetch origin && git checkout main && git pull --ff-only`
3. Confirm `git rev-parse HEAD` equals `origin/main`
4. Confirm this file lists the Donhin form copy round 3 (or newer) and `pm-release` matches Layout
5. Prefer `npm run ship -- "message"` (build + Pages deploy + live `pm-release` check)
6. Or: `npm run build` then `npx wrangler pages deploy dist --project-name=profitmedia-site`

| Field | Value |
|-------|--------|
| Git commit | `290bee8` |
| Feature | Donhin form copy round 3: sum, reply, claim. Light button on the blue band, black button in the white popup. The two on-page forms stay different. Cache bust `donhin-ab.js?v=20261019formcopy3` |
| `pm-release` pin | `2026-10-19-donhin-form-copy3` |
| Cloudflare Pages deploy | `https://d8604d5a.profitmedia-site.pages.dev` |
| Deployed at (IL) | 2026-10-19 |
| Do not roll back past | Any tree older than `2026-10-19-donhin-form-copy3`. Keep short forms, popup arm, live arms `sum` / `reply` / `claim`, the two-form difference rule, light buttons on the page, and a black button in the popup |
| Live check | https://profitmedia.co.il/donhin/ and https://profitmedia.co.il/adv_lp3/ must include `pm-release` = `2026-10-19-donhin-form-copy3` and `donhin-ab.js?v=20261019formcopy3` |

If production looks old, check live HTML for `<meta name="pm-release" content="2026-10-19-donhin-form-copy3">`. Never promote a Cloudflare preview from `feature/russian-localization` or a stale checkout over this pin.
