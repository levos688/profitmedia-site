# Profit Media site – last production deploy

**Do not deploy an older local tree or `profitmedia-site-ru` over this.** Always:

1. Work from `/Users/lev/Desktop/work/profitmedia-site` on `main` (not `profitmedia-site-ru`)
2. `git fetch origin && git checkout main && git pull --ff-only`
3. Confirm `git rev-parse HEAD` equals `origin/main`
4. Confirm this file lists the Donhin form test (or newer) and `pm-release` matches Layout
5. Prefer `npm run ship -- "message"` (build + Pages deploy + live `pm-release` check)
6. Or: `npm run build` then `npx wrangler pages deploy dist --project-name=profitmedia-site`

| Field | Value |
|-------|--------|
| Git commit | `b412200` |
| Feature | Donhin form copy test (answer / compensation / owed) and button color test (black / light gray). Yellow button removed. |
| `pm-release` pin | `2026-10-19-donhin-form-test` |
| Cloudflare Pages deploy | `https://fb0bd347.profitmedia-site.pages.dev` |
| Deployed at (IL) | 2026-10-19 |
| Do not roll back past | Any tree older than `2026-10-19-donhin-form-test`. Keep short forms, popup arm, and live arms `answer` / `compensation` / `owed` / `black` / `mist` |
| Live check | https://profitmedia.co.il/donhin/ and https://profitmedia.co.il/adv_lp3/ must include `pm-release` = `2026-10-19-donhin-form-test` and `donhin-ab.js?v=20261019formtest` |

If production looks old, check live HTML for `<meta name="pm-release" content="2026-10-19-donhin-form-test">`. Never promote a Cloudflare preview from `feature/russian-localization` or a stale checkout over this pin.
