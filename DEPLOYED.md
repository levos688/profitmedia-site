# Profit Media site – last production deploy

**Do not deploy an older local tree or `profitmedia-site-ru` over this.** Always:

1. Work from `/Users/lev/Desktop/work/profitmedia-site` on `main` (not `profitmedia-site-ru`)
2. `git fetch origin && git checkout main && git pull --ff-only`
3. Confirm `git rev-parse HEAD` equals `origin/main`
4. Confirm this file lists the Donhin form contrast (or newer) and `pm-release` matches Layout
5. Prefer `npm run ship -- "message"` (build + Pages deploy + live `pm-release` check)
6. Or: `npm run build` then `npx wrangler pages deploy dist --project-name=profitmedia-site`

| Field | Value |
|-------|--------|
| Git commit | `68fd645` |
| Feature | Donhin form buttons are yellow on the blue band. Privacy link is white and underlined so it does not disappear into the background. |
| `pm-release` pin | `2026-10-19-donhin-form-contrast` |
| Cloudflare Pages deploy | *(filled after ship)* |
| Deployed at (IL) | 2026-10-19 |
| Do not roll back past | Any tree older than `2026-10-19-donhin-form-contrast`. Keep the short forms, the Instagram popup arm, and AB arms `free_check` / `28s` / `40pct` / `risk_reversal` |
| Live check | https://profitmedia.co.il/donhin/ and https://profitmedia.co.il/adv_lp3/ must include `pm-release` = `2026-10-19-donhin-form-contrast` |

If production looks old, check live HTML for `<meta name="pm-release" content="2026-10-19-donhin-form-contrast">`. Never promote a Cloudflare preview from `feature/russian-localization` or a stale checkout over this pin.
