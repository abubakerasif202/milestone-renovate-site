# Milestone Renovate — Design System (Light Forest × Ruby × Gold)

Revised direction of the Stitch "Architectural Atelier" system. The original Stitch brief used large near-black forest planes; this site is **bright**: warm cream and pale sage dominate, lighter forest green is used for select panels, ruby is the editorial accent, and the approved gold logo is untouched.

## Tokens
All colour, type, spacing and motion tokens live in **`public/css/tokens.css`** — change them there only.

| Token | Value | Use |
|---|---|---|
| `--color-cream` / `--color-paper` | `#F8F6F0` / `#FBF9F3` | Main reading surfaces |
| `--color-sage` | `#E9F1EB` | Alternating section surface, ticker, footer |
| `--color-forest` | `#17624B` | Lighter forest panels, form buttons, calculator result |
| `--color-forest-deep` | `#0F201D` | Deep brand surfaces: masthead, mobile navigation, footer bar |
| `--color-ruby` / `-deep` / `-soft` | `#9B2144` / `#8B1838` / `#F9E9ED` | Primary CTA, eyebrows, italic accents, active nav, filters, slider handle, selected options, progress |
| `--color-gold` / `-light` / `-pale` | `#DDB45C` / `#EBC678` / `#F6E1AE` | Logo, accents on deep forest only |
| `--color-gold-ink` | `#755713` | Small gold-toned labels on light surfaces |
| `--color-ink` / `-soft` | `#202523` / `#4A5650` | Text |
| `--color-error` | `#B42318` | Errors only — deliberately distinct from ruby, and always paired with an icon and text |

Distribution target: ~65% cream/sage, ~25% forest and green tints, ~10% ruby + gold.

Contrast (WCAG AA): white on ruby 7.8:1, white on forest 7.3:1, gold on `#0F201D` exceeds 7:1. Gold is never used as body text on light surfaces; gold on `#17624B` is limited to large text. Automated axe (WCAG 2.2 AA) passes on every page at 1440 and 390px.

## Typography
Newsreader (display, italic accents) and Inter (UI, body), both OFL variable fonts self-hosted as WOFF2 in `public/assets/fonts/` (the CSP allows `font-src 'self'` only). The files are axis-limited to the weights the CSS uses (Inter 400-900, Newsreader 400-500; `scripts/instance_fonts.py`, sources in `assets/fonts-src/`), 117KB in total against 171KB, with identical outlines at every weight. All three (Inter, Newsreader, Newsreader italic) are preloaded; `font-display: swap`.

**Swap stability.** `Newsreader Fallback` and `Inter Fallback` (tokens.css) scale Times New Roman / Arial to the web fonts' measured width and metrics, so a late font swap does not move the layout. Widths that depend on a font's glyph size are written in `em`, never `ch`, and the hero headline is sized so its longest phrase always fits its column; a font swap can then never re-wrap it. If the used weights change, re-run `scripts/instance_fonts.py` and the fallback calibration, and update the weight guard in `tests/e2e/polish.spec.js`.

Hero `clamp(3.5rem,6vw,5.5rem)` desktop, never wider than the column on phones.

## Components
- **Masthead**: full-width deep-forest bar (`--color-masthead`). The approved transparent gold logo sits directly on it — no tile, plate or boxed treatment (gold on cream is ~1.8:1, so the logo is only ever placed on deep forest). Cream links; gold hover/active underline (ruby fails contrast on deep forest). Logo hover changes brightness only, never scale. Once scrolled it gains a shadow; its height never changes.
- **Mobile menu**: full-height deep-forest panel under the masthead, display-serif links staggered in, toggle morphs to ×, Tab loops inside while open, Escape closes, page scroll locks and the mobile dock slides away.
- **Buttons**: `.btn-ruby` primary; `.btn-dark` (forest) for forms; `.btn-gold` only on deep forest; hairline `.text-link` with ruby rule. Arrow nudges on hover.
- **Service tiles**: image-led, cream caption plate with ruby left rule (no dark scrim).
- **Phone hero**: image-first below 760px: the photograph leads, full-bleed under the masthead, with its AI-generated-concept disclosure chip on it, then the headline and postcode entry. Only the visual order changes (the DOM stays copy-first); tablets and desktops are unchanged.
- **Journey**: `<ol>`; horizontal timeline on desktop, vertical on mobile.
- **Before/after slider** (`.compare`): native `<input type=range>` over the stage (pointer, touch, keyboard), position applied via a constructable stylesheet (CSP-safe). Labelled as a demonstration.
- **Gallery filter**: `aria-pressed` buttons, live status region; truthful categories describing what each image shows.
- **Closing CTA**: lighter-forest + cream split panel with a ruby edge.
- **Footer**: sage body, compact deep-forest bar for logo and links.

## Motion
One shared system: `css/motion.css` + `js/motion.js` (no libraries; CSP-safe). Tokens: `--ease-out`, `--ease-in-out`, `--dur-*`, `--m-rise` in `tokens.css`.
- **Hero entrance (CSS only)**: eyebrow, then the headline line by line through masks (`.h-line`, authored in `build_site.py`), then copy and CTA; the image unveils top-down and settles from 1.08 scale to its full composition. Inner heroes use the same sequence.
- **Scroll reveals (JS-gated)**: `motion.js` tags blocks below the fold (`.m-reveal`, `.m-mask` for headings), staggers siblings and reveals each once via IntersectionObserver. Nothing on screen at load is ever hidden; without JS, or with reduced motion, nothing is hidden at all. Print shows everything.
- **Depth**: `[data-parallax]` layers drift by their value in px using the `translate` property, one rAF per scroll frame, only while on screen and only ≥761px.
- **Details**: journey rule draws in ruby, then steps land; cards draw a gold top rule on hover/focus; page-to-page cross-fade via `@view-transition` where supported.
- **Forms and tools**: while a form sends, the button gains a spinner and the form softens and stops taking input (`aria-busy`; a static dotted ring under reduced motion); on success the panel rises in and a decorative drawn tick (aria-hidden) appears while focus moves to the panel. Questionnaire steps wipe in from the side they are reached from (forward/back). Calculator steps gain a gold tick once the visitor has chosen in them, and the estimate gets a one-shot gold sweep when a change moves it; the figures themselves are never animated differently from the calculation.
- Transform / opacity / clip-path only; no animation fades legible text. Everything is off under `prefers-reduced-motion`.

## Images
Approved concept images ship as AVIF (first) with the existing WebP variants as fallback, via `<picture>` (`build_site.py`). AVIF quality is chosen per variant as the lowest quality whose SSIM against the PNG master is within 0.006 of the shipped q83 WebP (`scripts/build-concept-avif.mjs`), which is 31% smaller overall and 24% on the hero. Above-the-fold hero images are `loading="eager"` with `fetchpriority="high"`.

## Rules
- AI-generated concept imagery is always labelled; no fabricated projects, counts, testimonials, awards, guarantees or phone numbers.
- Generated pages come from `build_site.py`; run `python build_site.py` after edits. Regenerate image variants with `npm run build:images`.

Original Stitch reference: `architectural_atelier/DESIGN.md` inside the exported ZIP (kept outside the repo).
