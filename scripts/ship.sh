#!/usr/bin/env bash
# npm run ship -- "commit message"
# Comment (commit) → push main → build → Cloudflare Pages deploy → verify live pin.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ "$ROOT" == *profitmedia-site-ru* ]]; then
  echo "Refusing: ship from /Users/lev/Desktop/work/profitmedia-site, not profitmedia-site-ru." >&2
  exit 1
fi

branch="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$branch" != "main" ]]; then
  echo "Refusing: ship only from main (now on $branch)." >&2
  exit 1
fi

PIN="$(sed -n 's/.*name="pm-release" content="\([^"]*\)".*/\1/p' src/layouts/Layout.astro | head -1)"
if [[ -z "$PIN" ]]; then
  echo "Refusing: missing pm-release in src/layouts/Layout.astro" >&2
  exit 1
fi

MSG="${1:-}"
if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  if [[ -z "$MSG" ]]; then
    echo "Dirty tree. Pass a commit message:" >&2
    echo "  npm run ship -- \"your message\"" >&2
    git status -sb
    exit 1
  fi
  # Tracked edits only — never scoop untracked dumps like docs/meta-ads-creatives.
  git add -u -- src docs scripts public package.json wrangler.toml astro.config.mjs
  git add -- scripts/ship.sh package.json
  if git diff --cached --quiet; then
    echo "Nothing staged under src/docs/scripts/public. Stage files, then retry." >&2
    git status -sb
    exit 1
  fi
  git commit -m "$MSG"
fi

echo "Building $PIN ..."
npm run build

DIST_PIN="$(sed -n 's/.*name="pm-release" content="\([^"]*\)".*/\1/p' dist/index.html | head -1)"
if [[ "$DIST_PIN" != "$PIN" ]]; then
  echo "Build pin mismatch: Layout=$PIN dist=$DIST_PIN" >&2
  exit 1
fi

git push origin main

npx wrangler pages deploy dist --project-name=profitmedia-site --commit-dirty=true

echo "Checking live pin..."
LIVE=""
for i in 1 2 3 4 5; do
  sleep 2
  LIVE="$(curl -sS -A 'Mozilla/5.0' -H 'Cache-Control: no-cache' "https://profitmedia.co.il/?v=$(date +%s)" \
    | sed -n 's/.*name="pm-release" content="\([^"]*\)".*/\1/p' | head -1)"
  if [[ "$LIVE" == "$PIN" ]]; then
    echo "Shipped. Live pin: $PIN"
    exit 0
  fi
  echo "Live still '$LIVE' (want $PIN), retry $i/5..."
done

echo "ROLLBACK RISK: live pin is '$LIVE', expected '$PIN'." >&2
exit 1
