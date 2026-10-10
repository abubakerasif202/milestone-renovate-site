# Milestone Renovate — Design System (Light Forest × Ruby × Gold)

Revised direction of the Stitch "Architectural Atelier" system. The original Stitch brief used large near-black forest planes; this site is **bright**: warm cream and pale sage dominate, lighter forest green is used for select panels, ruby is the editorial accent, and the approved gold logo is untouched.

## Tokens
All colour, type, spacing and motion tokens live in **`public/css/tokens.css`** — change them there only.

| Token | Value | Use |
|---|---|---|
| `--color-cream` / `--color-paper` | `#F8F6F0` / `#FBF9F3` | Main reading surfaces |
| `--color-sage` | `#E9F1EB` | Alternating section surface, ticker, footer |
| `--color-forest` | `#17624B` | Lighter forest panels, form buttons, calculator result |
| `--color-forest-deep` | `#073E2B` | Compact brand moments only: logo block, footer bar |
| `--color-ruby` / `-deep` / `-soft` | `#9B2144` / `#8B1838` / `#F9E9ED` | Primary CTA, eyebrows, italic accents, active nav, filters, slider handle, selected options, progress |
| `--color-gold` / `-light` / `-pale` | `#DDB45C` / `#EBC678` / `#F6E1AE` | Logo, accents on deep forest only |
| `--color-gold-ink` | `#755713` | Small gold-toned labels on light surfaces |
| `--color-ink` / `-soft` | `#202523` / `#4A5650` | Text |
| `--color-error` | `#B42318` | Errors only — deliberately distinct from ruby, and always paired with an icon and text |

Distribution target: ~65% cream/sage, ~25% forest and green tints, ~10% ruby + gold.

Contrast (WCAG AA): white on ruby 7.8:1, white on forest 7.3:1, gold on `#073E2B` 6.2:1. Gold is never used as body text on light surfaces; gold on `#17624B` is limited to large text. Automated axe (WCAG 2.2 AA) passes on every page at 1440 and 390px.

## Typography
Newsreader (display, italic accents) and Inter (UI, body), both self-hosted variable WOFF2 in `public/assets/fonts/` (the CSP allows `font-src 'self'` only). Hero `clamp(3.5rem,6vw,5.5rem)` desktop / `clamp(2.5rem,8vw,3.5rem)` mobile. Two critical fonts are preloaded; `font-display: swap`.

## Components
- **Masthead**: light cream bar; the gold logo sits in a compact deep-forest block with a ruby underline (gold fails contrast on cream). Active link: ruby underline.
- **Buttons**: `.btn-ruby` primary; `.btn-dark` (forest) for forms; `.btn-gold` only on deep forest; hairline `.text-link` with ruby rule. Arrow nudges on hover.
- **Service tiles**: image-led, cream caption plate with ruby left rule (no dark scrim).
- **Journey**: `<ol>`; horizontal timeline on desktop, vertical on mobile.
- **Before/after slider** (`.compare`): native `<input type=range>` over the stage (pointer, touch, keyboard), position applied via a constructable stylesheet (CSP-safe). Labelled as a demonstration.
- **Gallery filter**: `aria-pressed` buttons, live status region; truthful categories describing what each image shows.
- **Closing CTA**: lighter-forest + cream split panel with a ruby edge.
- **Footer**: sage body, compact deep-forest bar for logo and links.

## Motion
CSS only: staggered hero entrance, scroll-driven reveal and hero image drift (`animation-timeline`, progressive enhancement), transform/opacity only. All disabled under `prefers-reduced-motion`.

## Rules
- AI-generated concept imagery is always labelled; no fabricated projects, counts, testimonials, awards, guarantees or phone numbers.
- Generated pages come from `build_site.py`; run `python build_site.py` after edits. Regenerate image variants with `npm run build:images`.

Original Stitch reference: `architectural_atelier/DESIGN.md` inside the exported ZIP (kept outside the repo).
