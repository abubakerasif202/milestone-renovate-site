# Stitch integration

Source: `stitch_milestone_renovate_design_system (1).zip` (extracted outside the repo; nothing from it is shipped verbatim).

## What was taken from each prototype
| Stitch file | Used for |
|---|---|
| Animated luxury homepage | Overall rhythm, editorial typography, service tiles, process section, hero staging |
| Portfolio case studies | Staggered editorial image composition, category filter |
| Before/after slider | Interactive comparison component (rebuilt accessibly, no Tailwind/CDN) |
| Marketing suite | Inspiration only; no copy reused |

## Intentional differences from Stitch
- **Palette**: lighter forest, cream/sage dominant, ruby accents (requested), instead of full-bleed near-black green.
- **Business accuracy**: removed the fabricated 1300 number, 54 projects, named luxury properties (Bellevue Hill, Toorak, Paddington, Cottesloe), awards, 10-year warranty, fixed-price and testimonial claims, the estimator with dollar figures, and the "12 commissions" scarcity line.
- **Dependencies**: no Tailwind CDN, no external images or fonts; everything is self-hosted and CSP-clean.
- **Imagery**: only the seven existing illustrative images are available, so the "portfolio" is a labelled concept gallery and the slider is a labelled demonstration.

## Preserved unchanged
`api/`, `lib/`, `supabase/`, `vercel.json` output, `public/js/lib/*`, `enquiry-form.js`, `wizard-ui.js`, `calculator-ui.js`, all form markup and field names, validation, consent, honeypot, idempotency, SEO routes, sitemap and metadata. No backend file was modified; unit tests (40) pass.

## Added
`public/css/tokens.css`, `public/js/interactions.js`, `public/assets/fonts/`, responsive image variants (`*-640/1024/1440.webp`), `scripts/make-responsive-images.mjs`. Home headline changed to "Space to live. Room to become." and the matching e2e assertion updated.
