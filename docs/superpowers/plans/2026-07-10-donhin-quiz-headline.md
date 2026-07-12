# Donhin Quiz Headline Copy Update — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the overpromising quiz headline «Пройдите быстрый тест и узнайте свои шансы» with honest copy that promises a free lawyer consultation instead of instant “chance assessment”.

**Architecture:** Single source of truth — one string constant in `src/pages/donhin/index.astro` frontmatter, reused by the inline quiz section `<h2>` and the popup `<h2>`. No logic changes; copy-only. Step-2 headings («Запишитесь на бесплатную консультацию») already align with the new promise and stay unchanged.

**Tech Stack:** Astro static page (`index.astro`), no API or test harness for copy.

**Recommended copy (final):**

> **Ответьте на вопрос и получите бесплатную консультацию адвоката**

Why this wording:
- Honest — the form does not calculate “chances”; it collects a quiz answer + contact for a callback.
- Value-focused — “бесплатная консультация адвоката” is the real offer.
- Short enough for mobile popup title (fits ~2 lines on narrow screens).
- Consistent with existing step-2 CTA «Запишитесь на бесплатную консультацию».

Alternatives considered (not used):
- «Один вопрос — бесплатная консультация адвоката» — punchy but less explicit about the action.
- «Узнайте, можете ли вы претендовать на компенсацию» — still implies instant legal assessment.

---

## File map

| File | Role |
|------|------|
| `src/pages/donhin/index.astro` | Only file to change — add constant + replace 2 headline strings |
| `docs/superpowers/plans/2026-07-10-donhin-quiz-headline.md` | This plan |

**Out of scope (already correct, do not change):**
- Hero CTA: «Запишитесь на бесплатную консультацию»
- Quiz step 2 heading: «Запишитесь на бесплатную консультацию»
- Bottom form: «Оставьте заявку для бесплатной консультации»
- Meta description, benefit «Бесплатная консультация»

---

### Task 1: Add shared headline constant

**Files:**
- Modify: `src/pages/donhin/index.astro` (frontmatter, after `cases` array ~line 36)

- [ ] **Step 1: Add constant in frontmatter**

After the `cases` array closing `];`, add:

```astro
const quizFormTitle = 'Ответьте на вопрос и получите бесплатную консультацию адвоката';
```

- [ ] **Step 2: Verify build still parses**

Run: `cd /Users/lev/Desktop/work/profitmedia-site && npm run build`

Expected: `Complete!` with no Astro errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/donhin/index.astro
git commit -m "Add shared Donhin quiz form title constant."
```

---

### Task 2: Replace inline quiz section headline

**Files:**
- Modify: `src/pages/donhin/index.astro:104`

- [ ] **Step 1: Replace hardcoded `<h2>` text**

Change:

```astro
<h2 class="donhin-form-section__title">Пройдите быстрый тест и узнайте свои шансы</h2>
```

To:

```astro
<h2 class="donhin-form-section__title">{quizFormTitle}</h2>
```

- [ ] **Step 2: Confirm old phrase is gone from built HTML**

Run:

```bash
npm run build
rg "Пройдите быстрый тест" dist/donhin/index.html
```

Expected: no matches.

Run:

```bash
rg "Ответьте на вопрос и получите бесплатную консультацию адвоката" dist/donhin/index.html
```

Expected: at least 1 match (inline section).

- [ ] **Step 3: Commit**

```bash
git add src/pages/donhin/index.astro
git commit -m "Update Donhin inline quiz section headline copy."
```

---

### Task 3: Replace popup headline

**Files:**
- Modify: `src/pages/donhin/index.astro:249`

- [ ] **Step 1: Replace popup `<h2>` text**

Change:

```astro
<h2 id="donhin-popup-title" class="donhin-popup__title">Пройдите быстрый тест и узнайте свои шансы</h2>
```

To:

```astro
<h2 id="donhin-popup-title" class="donhin-popup__title">{quizFormTitle}</h2>
```

- [ ] **Step 2: Verify both occurrences in build output**

Run:

```bash
npm run build
rg -c "Ответьте на вопрос и получите бесплатную консультацию адвоката" dist/donhin/index.html
```

Expected: `2` (inline quiz + popup).

Run:

```bash
rg "Пройдите быстрый тест|узнайте свои шансы" src/ dist/
```

Expected: no matches anywhere in repo build artifacts / source.

- [ ] **Step 3: Commit and push**

```bash
git add src/pages/donhin/index.astro
git commit -m "Update Donhin popup quiz headline to promise free consultation."
git push
```

---

### Task 4: Manual QA checklist

**Files:** none (verification only)

- [ ] **Step 1: Visual check inline form**

Open: `https://profitmedia.co.il/donhin/#form-quiz`

Confirm `<h2>` above the blue quiz box shows: **Ответьте на вопрос и получите бесплатную консультацию адвоката**

- [ ] **Step 2: Visual check popup**

Open `/donhin/`, wait 15s or scroll to page bottom.

Confirm popup title matches the same phrase.

- [ ] **Step 3: Confirm step 2 unchanged**

After selecting Да/Нет → Следующий, step 2 still shows: **Запишитесь на бесплатную консультацию**

---

## Self-review

| Spec requirement | Task |
|----------------|------|
| Replace overpromising “узнайте свои шансы” copy | Tasks 2–3 |
| Update everywhere in quiz form + popup | Tasks 2–3 (only 2 occurrences in codebase) |
| Promise free consultation instead | Constant `quizFormTitle` |
| DRY — one phrase, two places | Task 1 |
| Push to production | Task 3 step 3 |

No placeholders. No logic changes required.
