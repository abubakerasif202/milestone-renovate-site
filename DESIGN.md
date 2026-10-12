# Milestone Renovate — Design System (Forest × Cream × Gold)

An architectural renovation studio, not a builder template: warm cream and pale sage carry the reading surfaces, primary forest `#0F201D` anchors the masthead, footer, primary buttons and feature panels, and the official gold logo colour supplies the detail. Ruby has been retired from the identity.

## Tokens
All colour, type, spacing and motion tokens live in **`public/css/tokens.css`** — change them there only.

| Token | Value | Use |
|---|---|---|
| `--color-forest-deep` | `#0F201D` | **Primary brand green.** Masthead, mobile navigation, footer, CTA panel, primary buttons (`.btn-primary`), focus rings |
| `--color-forest` / `-hover` | `#2A5A4F` / `#234D43` | Secondary green (same 166° hue as the primary, lighter value): italic headline emphasis, selected states, progress, form buttons (`.btn-dark`), circle arrows |
| `--color-forest-tint` | `#E4EDE8` | Selected-option backgrounds |
| `--color-cream` / `--color-paper` | `#F8F6F0` / `#FBF9F3` | Main reading surfaces |
| `--color-sage` | `#E9F1EB` | Alternating section surface, ticker, inner heroes |
| `--color-gold` / `-light` / `-pale` | `#DDB45C` / `#EBC678` / `#F6E1AE` | `#DDB45C` is sampled from the official logo artwork. Text and buttons on deep forest; decorative rules (eyebrow rule, card top rules, tile edges) anywhere |
| `--color-gold-ink` | `#755713` | Gold-toned labels (eyebrows, numbering) on light surfaces |
| `--color-ink` / `-soft` | `#202523` / `#4A5650` | Text |
| `--color-field-border` | `#77867B` | Input borders (3:1 against the field ground) |
| `--color-error` | `#B42318` | Errors only, always paired with an icon and text |

Semantic roles map onto the palette so components never name a hue directly: `--color-accent` (interactive/selected = forest), `--color-accent-deep` (= forest-deep), `--color-accent-soft` (= forest-tint), `--color-emphasis` (italic headline word = forest), `--color-detail` (decorative rules = gold), `--color-label` (eyebrows and numbering = gold-ink).

Distribution target: ~65% cream/white/sage, ~25% forest and secondary green, ~10% gold and detail.

Contrast (WCAG AA): white on `#0F201D` 16.9:1, white on `#2A5A4F` 7.9:1, `#2A5A4F` on cream 7.3:1, gold on `#0F201D` 8.6:1, `#0F201D` on gold 8.6:1, gold-ink on cream 6.2:1 and on sage 5.8:1. **Gold is never text on cream or sage** (about 1.8:1) — use gold-ink there. Automated axe (WCAG 2.2 AA) passes on every page at 1440 and 390px.

## Typography
Newsreader (display, italic accents) and Inter (UI, body), both OFL variable fonts self-hosted as WOFF2 in `public/assets/fonts/` (the CSP allows `font-src 'self'` only). The files are axis-limited to the weights the CSS uses (Inter 400-900, Newsreader 400-500; `scripts/instance_fonts.py`, sources in `assets/fonts-src/`), 117KB in total against 171KB, with identical outlines at every weight. All three (Inter, Newsreader, Newsreader italic) are preloaded; `font-display: swap`.

**Swap stability.** `Newsreader Fallback` and `Inter Fallback` (tokens.css) scale Times New Roman / Arial to the web fonts' measured width and metrics, so a late font swap does not move the layout. Widths that depend on a font's glyph size are written in `em`, never `ch`, and the hero headline is sized so its longest phrase always fits its column; a font swap can then never re-wrap it. If the used weights change, re-run `scripts/instance_fonts.py` and the fallback calibration, and update the weight guard in `tests/e2e/polish.spec.js`.

Hero `clamp(3.5rem,6vw,5.5rem)` desktop, never wider than the column on phones.

## Components
- **Masthead**: full-width `#0F201D` bar. The official transparent gold logo sits directly on it at its native proportions — no tile, plate, filter or recolouring; hover draws a gold hairline under the mark. Cream links with a gold underline for hover and the current page. Actions: `.btn-gold` “Plan your renovation” (primary) and `.btn-ghost-light` “Book Call”. The phone number joins the row from 1680px (where the row widens to 1560px); the ghost button hides below 1280px. Gains a shadow once scrolled; its height never changes.
- **Mobile menu**: full-height deep-forest panel under the masthead, display-serif links staggered in, gold primary and ghost secondary actions, toggle morphs to ×, Tab loops inside while open, Escape closes, page scroll locks and the mobile dock slides away. The mobile dock pairs a deep-forest “Call” with a gold “Book 15-min call”.
- **Buttons**: `.btn-primary` (`#0F201D`, hover secondary green) on light surfaces; `.btn-dark` (secondary green) for form submits; `.btn-gold` primary and `.btn-ghost-light` secondary on deep forest; `.btn-outline`; hairline `.text-link` with a secondary-green rule. Arrow nudges on hover.
- **Eyebrows**: uppercase gold-ink label after a 28px gold rule; gold on deep-forest surfaces.
- **Service tiles**: image-led, cream caption plate with a gold left rule, gold-ink number and a forest circle arrow (no dark scrim).
- **Phone hero**: image-first below 760px: the photograph leads, full-bleed under the masthead, with its AI-generated-concept disclosure chip on it, then the headline and postcode entry. Only the visual order changes (the DOM stays copy-first); tablets and desktops are unchanged.
- **Journey**: `<ol>`; horizontal timeline on desktop, vertical on mobile; forest numerals and rule.
- **Before/after slider** (`.compare`): native `<input type=range>` over the stage (pointer, touch, keyboard), position applied via a constructable stylesheet (CSP-safe); deep-forest handle with gold glyph. Labelled as a demonstration. Concept pages show the pair as two equal 16:9 frames (`.concept-pair`).
- **Gallery filter**: `aria-pressed` buttons (selected = secondary green), live status region; truthful categories describing what each image shows.
- **Closing CTA**: deep-forest + cream split panel with a gold edge and gold italic.
- **Footer**: deep forest throughout — gold eyebrow, white headline with gold italic, gold and ghost actions, cream contact links with gold underlines — over a darker bar (`#0A1715`) holding the logo, links, licence and copyright.

## Motion
One shared system: `css/motion.css` + `js/motion.js` (no libraries; CSP-safe). Tokens: `--ease-out`, `--ease-in-out`, `--dur-*`, `--m-rise` in `tokens.css`.
- **Hero entrance (CSS only)**: eyebrow, then the headline line by line through masks (`.h-line`, authored in `build_site.py`), then copy and CTA; the image unveils top-down and settles from 1.08 scale to its full composition. Inner heroes use the same sequence.
- **Scroll reveals (JS-gated)**: `motion.js` tags blocks below the fold (`.m-reveal`, `.m-mask` for headings), staggers siblings and reveals each once via IntersectionObserver. Nothing on screen at load is ever hidden; without JS, or with reduced motion, nothing is hidden at all. Print shows everything.
- **Depth**: `[data-parallax]` layers drift by their value in px using the `translate` property, one rAF per scroll frame, only while on screen and only ≥761px.
- **Details**: journey rule draws in secondary green, then steps land; cards draw a gold top rule on hover/focus; page-to-page cross-fade via `@view-transition` where supported.
- **Forms and tools**: while a form sends, the button gains a spinner and the form softens and stops taking input (`aria-busy`; a static dotted ring under reduced motion); on success the panel rises in and a decorative drawn tick (aria-hidden) appears while focus moves to the panel. Questionnaire steps wipe in from the side they are reached from (forward/back). Calculator steps gain a gold tick once the visitor has chosen in them, and the estimate gets a one-shot gold sweep when a change moves it; the figures themselves are never animated differently from the calculation.
- Transform / opacity / clip-path only; no animation fades legible text. Everything is off under `prefers-reduced-motion`.

## Images
Approved concept images ship as AVIF (first) with the existing WebP variants as fallback, via `<picture>` (`build_site.py`). AVIF quality is chosen per variant as the lowest quality whose SSIM against the PNG master is within 0.006 of the shipped q83 WebP (`scripts/build-concept-avif.mjs`), which is 31% smaller overall and 24% on the hero. Above-the-fold hero images are `loading="eager"` with `fetchpriority="high"`.

## Rules
- AI-generated concept imagery is always labelled; no fabricated projects, counts, testimonials, awards, guarantees or phone numbers.
- Generated pages come from `build_site.py`; run `python build_site.py` after edits. Regenerate image variants with `npm run build:images`.

Original Stitch reference: `architectural_atelier/DESIGN.md` inside the exported ZIP (kept outside the repo).
