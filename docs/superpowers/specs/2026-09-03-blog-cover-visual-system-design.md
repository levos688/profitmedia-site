# Blog cover visual system (hybrid)

**Date:** 2026-09-03  
**Decision:** Option B — US-agency hybrid (~70% simplified brand illustration, ~30% editorial photo in brand duotone)

## Problem

- Meta article covers were `1200×675` used in a `1:1` card frame → box-in-box and wrong crop.
- Last two articles used dense UI-diagram art that collapses at card size.
- Full flat-illustration set felt monotone across the grid.

## System (going forward)

### Formats (mandatory)

| Role | Size | Aspect |
|------|------|--------|
| Card / OG square | `1024×1024` | 1:1 |
| Article hero / OG wide | `1536×1024` | 3:2 |

Full-bleed scene. No white inset rectangle on lavender frame.

### Brand tones

- Plum / purple `#651561` family
- Accent yellow `#fcc000` family
- Soft lilac wash backgrounds
- Avoid rainbow / stock-generic cyan-teal tech looks

### Mode A — Simplified illustration (~70%)

- One idea, 3–5 large shapes
- No micro UI rows, no 10-person lists, no tiny toggles
- Readable at ~300px card width
- Good for: checklists, pricing, conversion, funnel concepts

### Mode B — Editorial photo + brand wash (~30%)

- Real photo (hands, desk, meeting, phone, workspace) or photo-like texture
- Strong purple/yellow duotone or color grade
- Optional one large graphic accent (arrow, coin, check) — not a full diagram
- Good for: CRM/quality feedback, case studies, human sales process

### Card test

If the thumbnail cannot be understood in 1 second at phone size, simplify.

## Scope now

1. **Meta CRM feedback** → Mode B (photo/duotone)
2. **CPL vs CAC** → Mode A simplified illustration
3. **Remaining 6 article pairs** (2026-09-03):
   - Choose agency → photo
   - Pricing → simplified
   - Proposal/contract → photo
   - Conversion A/B → simplified
   - Landing vs homepage → simplified
   - Paid campaigns → photo

Later articles keep rotating A/B so the blog grid is not identical tiles.
