# Profit Media site – last production deploy

**Do not deploy an older local tree or `profitmedia-site-ru` over this.** Always:

1. Work from `/Users/lev/Desktop/work/profitmedia-site` on `main` (not `profitmedia-site-ru`)
2. `git fetch origin && git checkout main && git pull --ff-only`
3. Confirm `git rev-parse HEAD` equals `origin/main`
4. Prefer `npm run ship -- "message"` (build + Pages deploy + live `pm-release` check)
5. Or: `npm run build` then `npx wrangler pages deploy dist --project-name=profitmedia-site`

| Field | Value |
|-------|--------|
| Git commit | `9c41e3e` |
| Feature | Donhin privacy policy page `/donhin/prat/` + footer link |
| `pm-release` pin | `2026-09-17-donhin-prat` |
| Deployed at (IL) | 2026-09-17 |
| Live URL | https://profitmedia.co.il/donhin/prat/ |

If production looks “old”, check live HTML for `<meta name="pm-release" content="2026-09-17-donhin-prat">`. Never promote a Cloudflare preview from `feature/russian-localization` over this pin.
