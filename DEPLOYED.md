# Profit Media site – last production deploy

**Do not deploy an older local tree or `profitmedia-site-ru` over this.** Always:

1. Work from `/Users/lev/Desktop/work/profitmedia-site` on `main` (not `profitmedia-site-ru`)
2. `git fetch origin && git checkout main && git pull --ff-only`
3. Confirm `git rev-parse HEAD` equals `origin/main`
4. Confirm this file lists the Donhin short forms (or newer) and `pm-release` matches Layout
5. Prefer `npm run ship -- "message"` (build + Pages deploy + live `pm-release` check)
6. Or: `npm run build` then `npx wrangler pages deploy dist --project-name=profitmedia-site`

| Field | Value |
|-------|--------|
| Git commit | `68fd645` |
| Feature | Donhin hero button opens the short form with the same label as the sticky test. On-page quiz replaced by «Получите ответ адвоката». Bottom form uses that same line. Popup quiz unchanged. Cache bust `donhin-ab.js?v=20261019forms` |
| `pm-release` pin | `2026-10-19-donhin-short-forms` |
| Cloudflare Pages deploy | `https://5e853e89.profitmedia-site.pages.dev` |
| Deployed at (IL) | 2026-10-19 |
| Do not roll back past | Any tree that scrolls the hero button to a yes/no quiz, or an older `pm-release` than `2026-10-19-donhin-short-forms`. Keep the Instagram popup arm (8s, 400px scroll, 600px scroll room) and AB arms `free_check` / `28s` / `40pct` / `risk_reversal` |
| Live check | https://profitmedia.co.il/donhin/ and https://profitmedia.co.il/adv_lp3/ must include `pm-release` = `2026-10-19-donhin-short-forms` and `donhin-ab.js?v=20261019forms` |

If production looks old, check live HTML for `<meta name="pm-release" content="2026-10-19-donhin-short-forms">`. Never promote a Cloudflare preview from `feature/russian-localization` or a stale checkout over this pin.
