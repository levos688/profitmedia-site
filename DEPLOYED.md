# Profit Media site – last production deploy

**Do not deploy an older local tree or `profitmedia-site-ru` over this.** Always:

1. Work from `/Users/lev/Desktop/work/profitmedia-site` on `main` (not `profitmedia-site-ru`)
2. `git fetch origin && git checkout main && git pull --ff-only`
3. Confirm `git rev-parse HEAD` equals `origin/main`
4. Confirm this file lists the Donhin design v2 (or newer) and `pm-release` matches Layout
5. Prefer `npm run ship -- "message"` (build + Pages deploy + live `pm-release` check)
6. Or: `npm run build` then `npx wrangler pages deploy dist --project-name=profitmedia-site`

| Field | Value |
|-------|--------|
| Git commit | `cb430d9` |
| Feature | Donhin design variant at /adv_lp3/v2/ and /donhin/v2/. Main page copy test is unchanged: sum, reply, claim. Cache bust `donhin-ab.js?v=20261019designv2` |
| `pm-release` pin | `2026-10-19-donhin-design-v2` |
| Cloudflare Pages deploy | `https://7ffb79f8.profitmedia-site.pages.dev` |
| Deployed at (IL) | 2026-10-19 |
| Do not roll back past | Any tree older than `2026-10-19-donhin-design-v2`. Keep the main-page arms `sum` / `reply` / `claim`, the two-form difference rule, and the separate quiet design page |
| Live check | https://profitmedia.co.il/adv_lp3/ must stay the copy test. https://profitmedia.co.il/adv_lp3/v2/ is the design variant. Both include `pm-release` = `2026-10-19-donhin-design-v2` |

If production looks old, check live HTML for `<meta name="pm-release" content="2026-10-19-donhin-design-v2">`. Never promote a Cloudflare preview from `feature/russian-localization` or a stale checkout over this pin.
