# Mobile performance investigation — 12 Oct 2026

> **Historical record.** Dated evidence from an earlier phase; test counts, palette and deployment statements below are as of that date and are superseded by [`STATUS.md`](../STATUS.md) (current verified status) and [`DESIGN.md`](../../DESIGN.md).


Starting point: production `c19a69f`, mobile Lighthouse scores that swung between 80 and 97 run to run (TBT 0 to 480ms, CLS 0 or 0.044, LCP 2.4 to 2.9s).

## Method
- **Rig.** Lighthouse 12 mobile (default simulated throttling), 8 runs per variant, full traces saved for every run. A local HTTP/2 + Brotli replica serving `public/` with the exact `vercel.json` headers, validated first against production (unmodified `c19a69f` on the replica reproduced the same spread). A/B comparisons were **interleaved** run-by-run so machine-load drift hits both sides equally (this machine showed 40% background load at times).
- **Second rig.** Playwright with 4x CPU throttle and Chromium tracing for fast single-change experiments (long tasks, forced layouts, CLS and LCP per load).
- Every hypothesis was tested as a single-change variant of the baseline before any fix was written.

## Findings (evidence, not assumptions)
| Suspect | Test | Result |
|---|---|---|
| Forced layout in script | Trace of fast vs slow runs; variant without the `scrollY` read | **Cause of the intermittent TBT.** The ~110-260ms first full layout (722 layout objects) is inevitable, but when `site.js` ran before first paint its `window.scrollY` read forced that layout *inside the script*, which the simulation counts after FCP. Fast runs had the same layout outside script (TBT 0). Without the read: TBT 0 in 7 of 8 runs. |
| Font swapping | Italic preload variant; font-delay test (fonts held back 1.5s) | **Cause of CLS 0.038-0.068.** The italic file was not preloaded (requested ~233ms vs ~60ms) and the fallback fonts had different widths, so the headline re-wrapped (paragraph moved 65-117px). The hero `max-width` was also in `ch`, which depends on the font. Fixed: 0.000 at all nine widths tested. |
| Style recalculation | Trace: `UpdateLayoutTree` 10-27ms for ~440 elements | Not significant. |
| Motion initialisation | Variant with `motion.js` removed | No TBT change; init runs in idle time. Not a cause. |
| Hero animation | Variant with entrance animation removed | ~100ms less main-thread work, but no TBT/CLS change. Kept (it is the design). |
| Lazy below-fold images | Variant stripping all 14 lazy images | LCP unchanged (Lighthouse ignores low-priority images). Rejected. |
| Hero image preload | Variant with `<link rel=preload as=image>` | LCP unchanged. Rejected. |
| `content-visibility:auto` | Variant | First layout -60% but ~300ms of deferred work after FCP and scroll-time CLS risk. Rejected. |
| `:has()`, trimmed font stacks, `text-rendering` | Three variants | First-layout cost unchanged. Not causes. |
| LCP | Ablation: remove fonts / hero image / both | LCP 2.41s baseline; **1.65s without fonts, 1.97s without the hero image, 1.14s without both.** LCP is bandwidth-bound on fonts (171KB) and the hero image. |

## Fixes
1. `site.js`: header shadow via an IntersectionObserver sentinel; no synchronous layout read at start-up.
2. Fonts: preload all three; axis-limit the variable fonts to the weights used (Inter 400-900, Newsreader 400-500), 171KB to 117KB with pixel-identical output at every weight (OFL, no Reserved Font Name); calibrated metric-matched fallbacks; `ch` widths converted to `em`; hero headline sized to always fit its column.
3. Images: AVIF first (SSIM within 0.006 of the shipped WebP; 31% smaller overall, hero 74KB to 56KB); inner-page hero images eager with high priority.
4. Reveals/entrances: arrival animations are CSS-driven after an idle-time tagging pass.

## Result (interleaved, identical conditions, 8 pairs)
| | Performance | TBT | LCP | FCP | CLS | Weight |
|---|---|---|---|---|---|---|
| Before (`c19a69f`) median | 86.5 (75-97) | 373ms | 2.75s | 1.38s | 0.000 (max 0.068) | 493KB |
| After median | **98.5** (87-99) | **38ms** | **2.01s** | 1.18s | **0.000 (max 0.000)** | **358KB** |

## Limits
- The first full layout (~110-260ms real, 722 objects) is still a single long task. In 3 of 8 final runs it landed after the simulated FCP and produced TBT 184-490ms. Removing it would mean deferring below-fold layout (`content-visibility`), which was tested and rejected for CLS risk.
- Lab data on a Windows replica. Field (CrUX) behaviour will differ; check Search Console after release.
- `tests/enquiry-client.test.js` had a Node 22-only fragility (unref'd `AbortSignal.timeout`), hardened; the project targets Node 24.
