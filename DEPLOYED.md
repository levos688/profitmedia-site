# Profit Media site – last production deploy

**Do not deploy an older local tree or `profitmedia-site-ru` over this.** Always:

1. Work from `/Users/lev/Desktop/work/profitmedia-site` on `main` (not `profitmedia-site-ru`)
2. `git fetch origin && git checkout main && git pull --ff-only`
3. Confirm `git rev-parse HEAD` equals `origin/main`
4. Confirm this file lists the Donhin form pair (or newer) and `pm-release` matches Layout
5. Prefer `npm run ship -- "message"` (build + Pages deploy + live `pm-release` check)
6. Or: `npm run build` then `npx wrangler pages deploy dist --project-name=profitmedia-site`

| Field | Value |
|-------|--------|
| Git commit | `56bb390` |
| Feature | Donhin forms on one page are always two different copy arms. Top uses bottom_copy, bottom uses bottom_copy_b. Cache bust `donhin-ab.js?v=20261019formpair` |
| `pm-release` pin | `2026-10-19-donhin-form-pair` |
| Cloudflare Pages deploy | `https://3fc97a16.profitmedia-site.pages.dev` |
| Deployed at (IL) | 2026-10-19 |
| Do not roll back past | Any tree older than `2026-10-19-donhin-form-pair`. Keep short forms, popup arm, live arms `chances` / `amount` / `right`, black button, and the rule that the two on-page forms differ |
| Live check | https://profitmedia.co.il/donhin/ and https://profitmedia.co.il/adv_lp3/ must include `pm-release` = `2026-10-19-donhin-form-pair` and `donhin-ab.js?v=20261019formpair` |

If production looks old, check live HTML for `<meta name="pm-release" content="2026-10-19-donhin-form-pair">`. Never promote a Cloudflare preview from `feature/russian-localization` or a stale checkout over this pin.
