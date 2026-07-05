# Profit Media — Design System (MASTER)

> Generated with [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill), customized for existing brand.

## Pattern: Hero + Social Proof + Lead Form

**Conversion focus:** Free diagnosis lead magnet, ≤3 form fields, social proof before final CTA.

**Sections (current site):**
1. Hero — value proposition + primary CTA
2. Services — capability proof
3. Testimonials — campaign results + video
4. Portfolio — landing page examples (click to enlarge)
5. Clients — logo trust strip
6. Contact — dark form section, benefits + form

**CTA strategy:** One primary action per section. Yellow pill button = primary CTA everywhere.

## Style: Conversion-Optimized + Brand Purple

- High contrast, trust signals, social proof
- Dark contact section for premium feel
- Minimal decoration; clarity over effects
- RTL Hebrew throughout

## Colors (brand — do NOT replace with generic palettes)

| Role | Hex | Token |
|------|-----|-------|
| Primary | `#651561` | `--color-brand-purple` |
| Primary dark | `#5a1c73` | `--color-brand-purple-dark` |
| Accent / CTA | `#fcc000` | `--color-brand-yellow` |
| Pink gradient | `#c60691` | `--color-brand-pink` |
| Section gray | `#e7e7e7` | `--color-brand-gray` |
| Text on dark | `#FFFFFF` | — |
| Text on light | `#1f2937` | — |

## Typography

- **Font:** Assistant (already loaded) — Hebrew-optimized, professional
- **Scale:** Body ≥16px mobile, headings bold/black
- **Line height:** 1.5–1.75 body, tight on hero headlines

## Effects

- Transitions: 150–300ms, ease-out
- Hover: subtle transform/opacity only (no layout shift)
- Focus: 2px yellow ring on dark, purple on light
- Modal scrim: 82% black

## RTL Rules

- `dir="rtl"` on `<html>`
- First DOM element in flex = right side
- Checkbox before text; icon before list item text
- Carousel: right arrow → outward, left arrow ← outward

## Anti-patterns (avoid)

- Duplicate CTAs in header + hero proximity
- Placeholder-only labels (use sr-only labels)
- Emoji as UI icons
- Horizontal scroll on mobile (except intentional carousels)
- Mixing border-radius styles (CTA = pill, cards = 4px)

## Pre-delivery checklist

- [ ] Touch targets ≥44px
- [ ] `cursor-pointer` on all clickables
- [ ] `prefers-reduced-motion` respected
- [ ] Form submit shows loading/success feedback
- [ ] Contrast 4.5:1 on text
- [ ] Test 375px, 768px, 1024px
