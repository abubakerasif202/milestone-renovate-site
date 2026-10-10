# Visual QA record

## Automated (local, Chrome via Playwright)
- Unit/integration: 40/40 pass. Playwright: 43 pass, 8 skipped (opt-in live/deployed checks).
- axe WCAG 2.2 AA: no violations on all pages at 1440px and 390px, including wizard steps, error states and open mobile menu.
- No horizontal overflow at 320, 390, 768 and 1440px on home, contact, plan, cost planner and services; logo ≥150px wide at every width.
- No inline scripts or `style` attributes; CSP unchanged. No console errors on any page. All local links and assets resolve.
- `npm audit --omit=dev`: 0 vulnerabilities.

## Manually reviewed by screenshot
Home at 1440px (hero, services, slider, concept gallery) and full-page mobile (390px) overview. Home, inspiration, kitchen, contact, plan and cost-planner full-page captures were generated at 1440 and 390.

## Not yet done
- Close visual review at 768, 1024 and 1920px, and of inner pages beyond overflow checks.
- Measured LCP/CLS (Lighthouse). Mitigations in place: explicit image dimensions, `fetchpriority=high` on the hero, responsive `srcset`, preloaded fonts, transform/opacity-only motion.
- Reduced-motion rendering was verified by CSS rule only, not by capture.
- Firefox/Safari: scroll-driven reveal is progressive enhancement and falls back to static content.
- Real form submission against the live pipeline (opt-in test) was not run.

## Known content note
Service tile imagery (e.g. "Kitchen", "Bathroom") are illustrative home exteriors because no room photography exists; they are labelled as illustrative. Replace with approved interior photography when available.
