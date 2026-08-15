# Gallery carousel — working recipe (do not regress)

**Status:** production-proven (2026-07-26), iOS lightbox freeze patched 2026-08-15  
**Files:**
- `src/components/HorizontalCarousel.astro` — logos + portfolio strip
- `src/components/preview/PreviewPortfolio.astro` — lightbox enlarge
- `src/layouts/Layout.astro` — `<meta name="pm-release">` (prod version pin)

If gallery breaks again, restore behavior from this doc (and git history around this date), not by reinventing scroll.

**Do not roll back** by deploying an old `dist/` from `profitmedia-site-ru` or another worktree. Always:

1. Commit on `main` in `/Users/lev/Desktop/work/profitmedia-site`
2. Fresh `npm run build` from that commit
3. `npx wrangler pages deploy dist --project-name=profitmedia-site`
4. Confirm live HTML has `<meta name="pm-release" content="2026-08-15-gallery-ios">`

---

## What “good” looks like

1. **One card per click** — never fly across the whole strip.
2. **Circular loop** — both arrows always active when there are 2+ items.
3. **No empty left hole** — strip aligns to the start of the viewport (not centered).
4. **Smooth ~0.4s** `transform` transition.
5. **Lightbox** opens on tap; nav arrows sit **outside** the image; SVG chevrons with `dir="ltr"` (RTL must not mirror glyphs).

---

## Architecture (HorizontalCarousel)

### Do use
- **CSS `transform: translate3d`** on `.carousel-strip` (physical pixels).
- **`dir="ltr"`** on the strip (page is RTL Hebrew).
- **Clone loop:** `[clones][reals][clones]`, start index = `realCount`.
- After animated step into a clone zone → **instant** normalize (`transition: none`) back to matching real index (`± realCount`).
- Clones: `data-carousel-clone`, `aria-hidden`, buttons `disabled` + `pointer-events: none`.
- `busy` lock only for the ~420ms animation; always clear in timeout.

### Do not use
- Native `scrollLeft` / `scrollTo` / `scrollBy` for arrow nav on this RTL site (iOS reports wrong values → stuck arrows / freezes).
- Centering the active card with `itemCenter - viewCenter` (creates a large empty left gap).
- Loop by jumping `0 → last` with a long animated translate (looks like multi-card fly-through).
- Leaving `busy = true` without a failsafe timeout.

### Arrow UX (RTL page)
- **Right** button (`carousel-arrow--edge-start`) = next (`+1`)
- **Left** button (`carousel-arrow--edge-end`) = previous (`-1`)

---

## Lightbox (PreviewPortfolio)

- Inline script (`is:inline`) — more reliable than a deferred module for this handler.
- Slides from real items only:  
  `.carousel-item:not([data-carousel-clone]) [data-lightbox-trigger]`
- Ignore clicks on `.carousel-arrow` and clones.
- Layout: `.lightbox__stage` is a **row** with `dir="ltr"` / `direction: ltr`:
  - **Left** = prev (`‹` SVG path pointing left) — outside the image, pointing **outward**
  - **Center** = image
  - **Right** = next (`›` SVG path pointing right) — outside the image, pointing **outward**
- Do **not** drop `dir="ltr"` on the stage: on an RTL page, flex reverses the row and chevrons look like they point **into** the image.
- Lightbox markup lives **outside** `#portfolio.below-fold`, then JS appends it to `document.body`. Never put `position:fixed` inside `content-visibility: auto` (contain:paint → iOS freeze after opening an image).
- Lock scroll with `position:fixed` + saved `scrollY`, not `overflow:hidden` alone.
- Lightbox `<img>`: `pointer-events: none` + `-webkit-touch-callout: none` so iOS does not open its native image viewer.
- Close button on mobile is `position:fixed` inside the viewport (not `top: -2.75rem`).
- Unlock on close, `pagehide`, `pageshow`, and `visibilitychange`.

---

## Quick regression checklist

- [ ] First load: left arrow works (goes to last card in one step, not a fly-through)
- [ ] Right arrow: one card at a time
- [ ] Many left/right presses: no freeze, no empty left hole
- [ ] Logos carousel: same behavior
- [ ] Tap card → enlarge; arrows **outside** image and pointing **outward** (‹ left, › right); next/prev work; close unlocks scroll
- [ ] Mobile: open a landing image, close it, page still scrolls and arrows still work (no freeze)
- [ ] Live `https://profitmedia.co.il/` HTML includes `pm-release` = `2026-08-15-gallery-ios`

---

## Related messaging work (separate)

Homepage system rewrite brief: `docs/drafts/2026-07-25-homepage-system-messaging.md`  
Do not mix messaging copy changes into carousel fixes.
