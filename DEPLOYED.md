# Profit Media site – last production deploy

**Do not deploy an older local tree or `profitmedia-site-ru` over this.** Always:

1. Work from `/Users/lev/Desktop/work/profitmedia-site` on `main` (not `profitmedia-site-ru`)
2. `git fetch origin && git checkout main && git pull --ff-only`
3. Confirm `git rev-parse HEAD` equals `origin/main`
4. Confirm this file lists the Donhin v2 cards (or newer) and `pm-release` matches Layout
5. Prefer `npm run ship -- "message"` (build + Pages deploy + live `pm-release` check)
6. Or: `npm run build` then `npx wrangler pages deploy dist --project-name=profitmedia-site`

| Field | Value |
|-------|--------|
| Git commit | `1be7f10` |
| Feature | Donhin v2 benefit cards are centered, icons 56px, tighter gaps. Main page copy test unchanged. |
| `pm-release` pin | `2026-10-19-donhin-v2-cards` |
| Cloudflare Pages deploy | `https://3cbcab33.profitmedia-site.pages.dev` |
| Deployed at (IL) | 2026-10-19 |
| Do not roll back past | Any tree older than `2026-10-19-donhin-v2-cards`. Keep the main-page arms `sum` / `reply` / `claim`, the two-form difference rule, and the quiet design page |
| Live check | https://profitmedia.co.il/adv_lp3/ stays the copy test. https://profitmedia.co.il/adv_lp3/v2/ has centered benefit cards. Both include `pm-release` = `2026-10-19-donhin-v2-cards` |

If production looks old, check live HTML for `<meta name="pm-release" content="2026-10-19-donhin-v2-cards">`. Never promote a Cloudflare preview from `feature/russian-localization` or a stale checkout over this pin.
