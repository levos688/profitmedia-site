# Profit Media site – last production deploy

**Do not deploy an older local tree or `profitmedia-site-ru` over this.** Always:

1. Work from `/Users/lev/Desktop/work/profitmedia-site` on `main` (not `profitmedia-site-ru`)
2. `git fetch origin && git checkout main && git pull --ff-only`
3. Confirm `git rev-parse HEAD` equals `origin/main`
4. Confirm this file lists Donhin AB psychology challengers (or newer) and `pm-release` matches Layout
5. Prefer `npm run ship -- "message"` (build + Pages deploy + live `pm-release` check)
6. Or: `npm run build` then `npx wrangler pages deploy dist --project-name=profitmedia-site`

| Field | Value |
|-------|--------|
| Git commit | *(set after ship)* |
| Feature | Donhin AB: retire losers + psychology challengers (`free_check`, `28s`, `40pct`, `risk_reversal`, `dark_band_risk`); cache bust `?v=20261014psych` |
| `pm-release` pin | `2026-10-14-donhin-ab-psych` |
| Cloudflare Pages deploy | *(set after ship)* |
| Deployed at (IL) | 2026-10-14 |
| Do not roll back past | Any tree without `ACTIVE_AB_VARIANTS` free_check / 28s / 40pct / risk_reversal / dark_band_risk |
| Live check | https://profitmedia.co.il/donhin/ — HTML must include `pm-release` = `2026-10-14-donhin-ab-psych` and `donhin-ab.js?v=20261014psych` |

If production looks “old”, check live HTML for `<meta name="pm-release" content="2026-10-14-donhin-ab-psych">`. Never promote a Cloudflare preview from `feature/russian-localization` or a stale checkout over this pin.
