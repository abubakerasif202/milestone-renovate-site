# Final optimisation evidence — 12 October 2026

> **Historical record.** Dated evidence from an earlier phase; test counts, palette and deployment statements below are as of that date and are superseded by [`STATUS.md`](../STATUS.md) (current verified status) and [`DESIGN.md`](../../DESIGN.md).


Baseline: production commit c19a69f. Chrome mobile Lighthouse 12, default simulated throttling, cold browser per run; identical machine and interleaved HTTP/2 Brotli replicas. Scores are laboratory measurements, not field INP.

## Findings

The baseline trace before-c19a69f-4 reproduces 441ms simulated TBT: site.js update() reads scrollY at line 50 and forces a full-document layout of 721 objects. That real task lasts 246ms, including 216ms Layout and 28ms style recalculation. A second 95ms task includes 85ms Layout after the italic font completes. Lighthouse simulated TBT differs from raw trace durations.

The sentinel IntersectionObserver removes that synchronous startup read. Italic preload eliminates the late font request; calibrated fallbacks and stable heading widths prevent line-wrap jumps. Font axes preserve all used weights while reducing transfer from 171KB to 117KB. Pixel comparisons across 11 weights matched. AVIF alternatives retain the masters and WebP fallback. Phone hero is image-first; cinematic motion remains.

Controlled ablations: removing motion or hero animation did not identify the dominant task. Removing fonts/images was diagnostic only and was not shipped. Blanket content-visibility and optimizeLegibility changes did not provide a reliable improvement and were not retained. Residual candidate slow trace after-final-7 has a 364ms native first-layout task, including 342ms Layout and 17ms style recalculation, without a script caller. It reports 490ms simulated TBT; the remaining variance cannot be claimed eliminated.

## Every saved Lighthouse run

| Group | Run | Performance | Accessibility | Best practices | SEO | FCP s | LCP s | TBT ms | CLS |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| abl-x_neither | 1 | 100 | 100 | 100 | 100 | 1.30 | 1.31 | 0 | 0.000 |
| abl-x_neither | 2 | 100 | 100 | 100 | 100 | 1.14 | 1.14 | 0 | 0.000 |
| abl-x_neither | 3 | 100 | 100 | 100 | 100 | 1.10 | 1.10 | 0 | 0.000 |
| abl-x_nofonts | 1 | 100 | 100 | 100 | 100 | 1.09 | 1.51 | 0 | 0.000 |
| abl-x_nofonts | 2 | 99 | 100 | 100 | 100 | 1.29 | 1.65 | 0 | 0.000 |
| abl-x_nofonts | 3 | 99 | 100 | 100 | 100 | 1.19 | 1.67 | 0 | 0.000 |
| abl-x_noheroimg | 1 | 99 | 100 | 100 | 100 | 1.21 | 1.97 | 0 | 0.000 |
| abl-x_noheroimg | 2 | 99 | 100 | 100 | 100 | 1.18 | 1.98 | 0 | 0.000 |
| abl-x_noheroimg | 3 | 99 | 100 | 100 | 100 | 1.20 | 1.95 | 0 | 0.000 |
| after-final | 1 | 99 | 100 | 100 | 100 | 1.26 | 2.12 | 0 | 0.000 |
| after-final | 2 | 99 | 100 | 100 | 100 | 1.20 | 1.96 | 0 | 0.000 |
| after-final | 3 | 99 | 100 | 100 | 100 | 1.15 | 1.95 | 0 | 0.000 |
| after-final | 4 | 99 | 100 | 100 | 100 | 1.29 | 2.12 | 10 | 0.000 |
| after-final | 5 | 96 | 100 | 100 | 100 | 1.05 | 2.11 | 184 | 0.000 |
| after-final | 6 | 90 | 100 | 100 | 100 | 1.05 | 2.03 | 365 | 0.000 |
| after-final | 7 | 87 | 100 | 100 | 100 | 1.08 | 2.00 | 490 | 0.000 |
| after-final | 8 | 98 | 100 | 100 | 100 | 1.60 | 1.98 | 66 | 0.000 |
| before-c19a69f | 1 | 97 | 100 | 100 | 100 | 1.37 | 2.43 | 0 | 0.044 |
| before-c19a69f | 2 | 90 | 100 | 100 | 100 | 1.35 | 2.65 | 265 | 0.000 |
| before-c19a69f | 3 | 89 | 100 | 100 | 100 | 1.38 | 2.70 | 285 | 0.000 |
| before-c19a69f | 4 | 84 | 100 | 100 | 100 | 1.38 | 2.86 | 441 | 0.000 |
| before-c19a69f | 5 | 85 | 100 | 100 | 100 | 1.35 | 2.79 | 404 | 0.000 |
| before-c19a69f | 6 | 88 | 100 | 100 | 100 | 1.35 | 2.72 | 342 | 0.000 |
| before-c19a69f | 7 | 79 | 100 | 100 | 100 | 1.38 | 2.92 | 593 | 0.050 |
| before-c19a69f | 8 | 75 | 100 | 100 | 100 | 1.38 | 3.05 | 723 | 0.068 |
| cand1 | 1 | 96 | 100 | 100 | 100 | 1.08 | 2.21 | 150 | 0.000 |
| cand1 | 2 | 86 | 100 | 100 | 100 | 1.01 | 2.22 | 420 | 0.000 |
| cand1 | 3 | 98 | 100 | 100 | 100 | 1.35 | 2.10 | 0 | 0.000 |
| cand1 | 4 | 98 | 100 | 100 | 100 | 1.26 | 2.26 | 0 | 0.000 |
| cand1 | 5 | 98 | 100 | 100 | 100 | 1.32 | 2.27 | 0 | 0.000 |
| cand1 | 6 | 97 | 100 | 100 | 100 | 1.08 | 2.21 | 93 | 0.000 |
| cand1 | 7 | 99 | 100 | 100 | 100 | 1.19 | 2.10 | 30 | 0.000 |
| cand1 | 8 | 99 | 100 | 100 | 100 | 1.17 | 2.10 | 0 | 0.000 |
| cand2 | 1 | 89 | 100 | 100 | 100 | 1.09 | 2.08 | 337 | 0.000 |
| cand2 | 2 | 93 | 100 | 100 | 100 | 1.05 | 2.11 | 290 | 0.000 |
| cand2 | 3 | 98 | 100 | 100 | 100 | 1.39 | 2.12 | 0 | 0.000 |
| cand2 | 4 | 98 | 100 | 100 | 100 | 1.27 | 2.13 | 0 | 0.000 |
| cand2 | 5 | 98 | 100 | 100 | 100 | 1.48 | 2.15 | 0 | 0.000 |
| cand2 | 6 | 99 | 100 | 100 | 100 | 1.29 | 2.10 | 0 | 0.000 |
| cand2 | 7 | 99 | 100 | 100 | 100 | 1.33 | 2.11 | 0 | 0.000 |
| cand2 | 8 | 95 | 100 | 100 | 100 | 1.05 | 2.11 | 217 | 0.000 |
| prod-c19a69f | 1 | 94 | 100 | 100 | 100 | 1.36 | 2.61 | 144 | 0.044 |
| prod-c19a69f | 2 | 95 | 100 | 100 | 100 | 1.36 | 2.59 | 125 | 0.044 |
| prod-c19a69f | 3 | 93 | 100 | 100 | 100 | 1.36 | 2.67 | 205 | 0.000 |
| prod-c19a69f | 4 | 94 | 100 | 100 | 100 | 1.37 | 2.62 | 149 | 0.044 |
| prod-c19a69f | 5 | 97 | 100 | 100 | 100 | 1.37 | 2.42 | 0 | 0.044 |
| prod-c19a69f | 6 | 97 | 100 | 100 | 100 | 1.37 | 2.42 | 0 | 0.044 |
| prod-c19a69f | 7 | 93 | 100 | 100 | 100 | 1.36 | 2.65 | 190 | 0.000 |
| prod-c19a69f | 8 | 93 | 100 | 100 | 100 | 1.59 | 2.64 | 176 | 0.000 |
| replica-base | 1 | 94 | 100 | 100 | 100 | 1.40 | 2.55 | 195 | 0.000 |
| replica-base | 2 | 97 | 100 | 100 | 100 | 1.35 | 2.40 | 0 | 0.044 |
| replica-base | 3 | 93 | 100 | 100 | 100 | 1.28 | 2.52 | 217 | 0.038 |
| replica-base | 4 | 93 | 100 | 100 | 100 | 1.28 | 2.53 | 228 | 0.038 |
| replica-base | 5 | 91 | 100 | 100 | 100 | 1.35 | 2.69 | 241 | 0.000 |
| replica-base | 6 | 92 | 100 | 100 | 100 | 1.35 | 2.54 | 235 | 0.000 |
| replica-base | 7 | 91 | 100 | 100 | 100 | 1.35 | 2.71 | 251 | 0.038 |
| replica-base | 8 | 92 | 100 | 100 | 100 | 1.38 | 2.68 | 202 | 0.000 |
| var-combo | 1 | 98 | 100 | 100 | 100 | 1.04 | 2.41 | 0 | 0.000 |
| var-combo | 2 | 98 | 100 | 100 | 100 | 1.05 | 2.41 | 0 | 0.000 |
| var-combo | 3 | 97 | 100 | 100 | 100 | 1.14 | 2.40 | 0 | 0.000 |
| var-combo | 4 | 96 | 100 | 100 | 100 | 1.05 | 2.41 | 143 | 0.000 |
| var-combo | 5 | 97 | 100 | 100 | 100 | 1.05 | 2.41 | 124 | 0.000 |
| var-combo | 6 | 97 | 100 | 100 | 100 | 1.22 | 2.41 | 0 | 0.000 |
| var-combo | 7 | 97 | 100 | 100 | 100 | 1.20 | 2.44 | 0 | 0.000 |
| var-combo | 8 | 95 | 100 | 100 | 100 | 1.08 | 2.44 | 183 | 0.000 |
| var-combo_noimg | 1 | 97 | 100 | 100 | 100 | 1.17 | 2.57 | 0 | 0.000 |
| var-combo_noimg | 2 | 97 | 100 | 100 | 100 | 1.14 | 2.55 | 0 | 0.000 |
| var-combo_noimg | 3 | 97 | 100 | 100 | 100 | 1.36 | 2.42 | 0 | 0.000 |
| var-combo_noimg | 4 | 97 | 100 | 100 | 100 | 1.05 | 2.48 | 0 | 0.000 |
| var-combo_noimg | 5 | 97 | 100 | 100 | 100 | 1.22 | 2.41 | 0 | 0.000 |
| var-combo_preload | 1 | 97 | 100 | 100 | 100 | 1.18 | 2.42 | 0 | 0.000 |
| var-combo_preload | 2 | 96 | 100 | 100 | 100 | 1.05 | 2.42 | 146 | 0.000 |
| var-combo_preload | 3 | 97 | 100 | 100 | 100 | 1.05 | 2.40 | 0 | 0.000 |
| var-combo_preload | 4 | 97 | 100 | 100 | 100 | 1.08 | 2.44 | 0 | 0.000 |
| var-combo_preload | 5 | 96 | 100 | 100 | 100 | 1.05 | 2.42 | 57 | 0.000 |
| var-cv | 1 | 96 | 100 | 100 | 100 | 1.35 | 2.46 | 123 | 0.044 |
| var-cv | 2 | 91 | 100 | 100 | 100 | 1.35 | 2.66 | 183 | 0.000 |
| var-cv | 3 | 91 | 100 | 100 | 100 | 1.35 | 2.66 | 182 | 0.000 |
| var-cv | 4 | 91 | 100 | 100 | 100 | 1.35 | 2.67 | 196 | 0.000 |
| var-cv | 5 | 96 | 100 | 100 | 100 | 1.35 | 2.45 | 100 | 0.044 |
| var-cv | 6 | 94 | 100 | 100 | 100 | 1.35 | 2.63 | 155 | 0.000 |
| var-cv | 7 | 96 | 100 | 100 | 100 | 1.35 | 2.46 | 114 | 0.044 |
| var-cv | 8 | 96 | 100 | 100 | 100 | 1.35 | 2.52 | 70 | 0.000 |
| var-italic | 1 | 94 | 100 | 100 | 100 | 1.05 | 2.57 | 196 | 0.000 |
| var-italic | 2 | 91 | 100 | 100 | 100 | 1.05 | 2.64 | 254 | 0.000 |
| var-italic | 3 | 90 | 100 | 100 | 100 | 1.05 | 2.66 | 289 | 0.000 |
| var-italic | 4 | 91 | 100 | 100 | 100 | 1.05 | 2.64 | 263 | 0.000 |
| var-italic | 5 | 91 | 100 | 100 | 100 | 1.05 | 2.63 | 249 | 0.000 |
| var-italic | 6 | 91 | 100 | 100 | 100 | 1.05 | 2.64 | 269 | 0.000 |
| var-italic | 7 | 89 | 100 | 100 | 100 | 1.05 | 2.71 | 318 | 0.000 |
| var-italic | 8 | 82 | 100 | 100 | 100 | 1.60 | 2.96 | 466 | 0.000 |
| var-noscrolly | 1 | 97 | 100 | 100 | 100 | 1.35 | 2.40 | 0 | 0.000 |
| var-noscrolly | 2 | 96 | 100 | 100 | 100 | 1.38 | 2.49 | 59 | 0.044 |
| var-noscrolly | 3 | 97 | 100 | 100 | 100 | 1.35 | 2.41 | 0 | 0.044 |
| var-noscrolly | 4 | 97 | 100 | 100 | 100 | 1.35 | 2.41 | 0 | 0.000 |
| var-noscrolly | 5 | 97 | 100 | 100 | 100 | 1.35 | 2.42 | 0 | 0.044 |
| var-noscrolly | 6 | 98 | 100 | 100 | 100 | 1.35 | 2.40 | 0 | 0.000 |
| var-noscrolly | 7 | 97 | 100 | 100 | 100 | 1.35 | 2.41 | 0 | 0.044 |
| var-noscrolly | 8 | 97 | 100 | 100 | 100 | 1.35 | 2.40 | 0 | 0.044 |

## Medians

| Group | N | Performance | LCP s | TBT ms | CLS |
|---|---:|---:|---:|---:|---:|
| abl-x_neither | 3 | 100 | 1.14 | 0 | 0.000 |
| abl-x_nofonts | 3 | 99 | 1.65 | 0 | 0.000 |
| abl-x_noheroimg | 3 | 99 | 1.97 | 0 | 0.000 |
| after-final | 8 | 98.5 | 2.01 | 38 | 0.000 |
| before-c19a69f | 8 | 86.5 | 2.75 | 373 | 0.000 |
| cand1 | 8 | 98 | 2.21 | 15 | 0.000 |
| cand2 | 8 | 98 | 2.11 | 0 | 0.000 |
| prod-c19a69f | 8 | 94 | 2.61 | 146 | 0.044 |
| replica-base | 8 | 92.5 | 2.54 | 222 | 0.019 |
| var-combo | 8 | 97 | 2.41 | 0 | 0.000 |
| var-combo_noimg | 5 | 97 | 2.48 | 0 | 0.000 |
| var-combo_preload | 5 | 97 | 2.42 | 0 | 0.000 |
| var-cv | 8 | 95 | 2.58 | 139 | 0.000 |
| var-italic | 8 | 91 | 2.64 | 266 | 0.000 |
| var-noscrolly | 8 | 97 | 2.41 | 0 | 0.044 |

## Business copy

No approved records substantiated business hours or senior staff titles, so these were neutrally reworded. NSW Planning describes CDC as conditional fast-track assessment, not a guaranteed 20-day outcome. The four-question guide now presents possible pathways and requires professional verification; booking confirmation now says request received rather than falsely reserving a calendar slot. Verified company, licence, phone and email remain.

Source: https://www.planning.nsw.gov.au/assess-and-regulate/development-assessment/planning-approval-pathways/complying-development

## Data protection

No Supabase records, tables, integrations, backend API handlers or deployment configuration were modified. Production testing excludes the real-submission test.

## Validation and release

Build and unit results: build generates 22 pages; 121 unit tests pass; dependency audit has zero production vulnerabilities. Browser and production results are appended after the release gates complete.

Earlier investigation traces were inspected and summarised above; another session subsequently cleaned their temporary directories. The independent production traces retained here are .tmp/live-final-1 through .tmp/live-final-8, each with report.json, report-0.trace.json and report-0.devtoolslog.json.

## Independent production verification

Implementation commit: aec1d3c7f77044d60e077c0af8d0f2a8fe1dc26a. Vercel deployment dpl_7MWkiLVkXgjgjxL1tj5ozoss9xWV is Ready and aliased to milestonerenovate.com.

| Run | Performance | Accessibility | Best practices | SEO | LCP s | TBT ms | CLS |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | 99 | 100 | 100 | 100 | 1.995 | 0 | 0.000 |
| 2 | 99 | 100 | 100 | 100 | 2.149 | 1 | 0.000 |
| 3 | 98 | 100 | 100 | 100 | 2.132 | 0 | 0.000 |
| 4 | 99 | 100 | 100 | 100 | 1.965 | 0 | 0.000 |
| 5 | 99 | 100 | 100 | 100 | 1.971 | 0 | 0.000 |
| 6 | 99 | 100 | 100 | 100 | 1.963 | 0 | 0.000 |
| 7 | 99 | 100 | 100 | 100 | 2.119 | 0 | 0.000 |
| 8 | 99 | 100 | 100 | 100 | 1.964 | 0 | 0.000 |

Medians: performance 99; accessibility/best practices/SEO 100; LCP 1.983s; TBT 0ms; CLS 0.000.

Independent local verification: 121 unit tests pass, build generates 22 pages, zero production dependency vulnerabilities. Full browser run passed 175 checks; 13 interrupted/failing checks were rerun. Twelve passed immediately; the remaining enquiry test passed after refreshing the disposable local store (the existing test data correctly triggered duplicate protection). Thus all 188 active checks passed across the run and reruns, with 8 skipped. These were not claimed as one uninterrupted green run. No live submissions or database changes.
