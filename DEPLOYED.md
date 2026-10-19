# Profit Media site – last production deploy

**Do not deploy an older local tree or `profitmedia-site-ru` over this.** Always:

1. Work from `/Users/lev/Desktop/work/profitmedia-site` on `main` (not `profitmedia-site-ru`)
2. `git fetch origin && git checkout main && git pull --ff-only`
3. Confirm `git rev-parse HEAD` equals `origin/main`
4. Confirm this file lists the Donhin page design test (or newer) and `pm-release` matches Layout
5. Prefer `npm run ship -- "message"` (build + Pages deploy + live `pm-release` check)
6. Or: `npm run build` then `npx wrangler pages deploy dist --project-name=profitmedia-site`

| Field | Value |
|-------|--------|
| Git commit | `25fb754` |
| Feature | Donhin page design A/B on the main URL: current vs quiet. Hero photo/video stays separate. Stats include the new test. Cache bust `donhin-ab.js?v=20261019pagedesign` |
| `pm-release` pin | `2026-10-19-donhin-page-design` |
| Cloudflare Pages deploy | `https://641c8b9c.profitmedia-site.pages.dev` |
| Deployed at (IL) | 2026-10-19 |
| Do not roll back past | Any tree older than `2026-10-19-donhin-page-design`. Keep arms `sum` / `reply` / `claim`, the two-form difference rule, and the page design test `current` / `quiet` |
| Live check | https://profitmedia.co.il/adv_lp3/ and https://profitmedia.co.il/donhin/ include `pm-release` = `2026-10-19-donhin-page-design` and `donhin-ab.js?v=20261019pagedesign` |

If production looks old, check live HTML for `<meta name="pm-release" content="2026-10-19-donhin-page-design">`. Never promote a Cloudflare preview from `feature/russian-localization` or a stale checkout over this pin.
