# Cost calculator: pricing methodology (v2026-10-12)

The calculator at `/bathroom-renovation-cost` shows **indicative Sydney market ranges in AUD (GST inclusive)** and
indicative timelines for **bathrooms and kitchens**. They are benchmarks compiled from published guides.
They are **not approved Milestone Renovate rates and not a quote**. Whole-home and extension work is routed to a
detailed-quote enquiry because published Sydney pricing is too thin to estimate responsibly.

All numbers live in `public/js/lib/pricing-config.js`. The engine is `public/js/lib/price-estimate.js`
(the same code runs in the browser and on the server, which recomputes the range for the staff notification and
never trusts client-sent prices). The public "How the estimate works" section is rendered from the same config.

## 1. Sources (reviewed 12 Oct 2026)

| ID | Source | Date | Used for |
|---|---|---|---|
| wtd-bath | What's the Damage, Sydney bathroom cost 2026 | verified Oct 2026, GST incl. | tier ranges, ensuite -20-30%, 3-6 week timeline, lead times |
| wtd-kitchen | What's the Damage, Sydney kitchen cost 2026 | verified Oct 2026, GST incl. | kitchen tiers, 10-14 week programme |
| wtd-breakdown | What's the Damage, bathroom cost breakdown | Oct 2026 | demolition & disposal $1,150-$3,450 |
| mh-guide | Martina Hayes, Renovation cost Sydney 2026 | 13 Jul 2026, GST incl. | tier ranges (builder guide; tile/fixture/cabinet supply included; appliances extra) |
| tfo | TFO bathroom renovation cost 2026 | 2026 | plumbing relocation $3,000-$7,000+ |
| wtd-report | What's the Damage annual report | Jun 2026 | plumbing relocation $2,000-$6,000 (cross-check) |
| cylex-hidden | Hidden costs in a Sydney bathroom renovation | 2026 | older homes +$1,500-$4,000; strata/lift/acoustic extras |

Caveats: several sources are marketing or lead-generation content. They disagree materially (the aggregator is
roughly half the builder guide's figures). That is why the base range averages the two.

## 2. Base ranges

Base = equal-weight mean of the two published **lows** and of the two published **highs** for each tier.

| Project / tier | WTD | Martina Hayes | Base used |
|---|---|---|---|
| Bathroom standard | $11,500-$23,000 | $25,000-$30,000 | $18,250-$26,500 |
| Bathroom mid-range | $23,000-$40,250 | $30,000-$45,000 | $26,500-$42,625 |
| Bathroom premium | $40,250-$63,250 | $45,000-$90,000 | $42,625-$76,625 |
| Kitchen standard | $13,800-$28,750 | $28,000-$45,000 | $20,900-$36,875 |
| Kitchen mid-range | $28,750-$51,750 | $45,000-$75,000 | $36,875-$63,375 |
| Kitchen premium | $51,750-$92,000 | $75,000-$130,000 | $63,375-$111,000 |

Bathroom base = medium room. Final output is rounded down (low) / up (high) to the nearest $500, then checked
(finite, positive, low <= high). GST is already in every source, so none is added.

## 3. Adjustments and their basis

`source` = a published figure; `assumption` = Milestone planning allowance with **no published figure**.
**Assumptions need calibration against real Milestone quotes before the calculator is promoted.**

| Item | Adjustment | Basis |
|---|---|---|
| Small bathroom (<=4 m2) | x0.75 | source (ensuites 20-30% cheaper; midpoint) |
| Large bathroom (>8 m2) | x1.2 | **assumption** (no large-bathroom tier published; per-m2 rates fall with size) |
| Layout change / plumbing relocation | +$2,000 to +$7,000 | source (TFO; WTD report) |
| Older home | +$1,500 to +$4,000 | source (hidden-conditions guide) |
| You demolish | -$2,300 | source (midpoint of published demolition cost) |
| Wall removal | +$1,500 to +$6,000 | **assumption** (structural assessment required) |
| Recessed niche | +$300 to +$1,000 | **assumption** (product ~$165 + labour; no AU installed price found) |
| Apartment access / strata | +$1,000 to +$3,000 | **assumption** (extras listed, not priced) |
| Timber floor | +$500 to +$2,500 | **assumption** |
| Kitchen layout / wall removal | not priced | listed as "not separately priced", confirmed in the quote |
| Labour-only | not priced | no evidence; the notice explains labour-only is quoted separately |
| DIY painting | not offered | no published saving |

Timelines: bathroom 3-6 weeks on site (WTD) plus up to 8 weeks before start for strata approval or custom-order
lead times (WTD); kitchen 2-3 weeks on site, 10-14 weeks design sign-off to completion (WTD). A contingency is
**not** included; the page says so and cites the older-home figure rather than inventing a percentage.

## 4. Benchmark scenarios

Dream Renovations Group's public calculator (bathroom) was driven in a real browser on 12 Oct 2026 by selecting
its options and reading the on-page result. No private API was called, no contact details were entered, and no
formula or wording is reproduced. Observed outputs are listed for comparison only; they are not used in the
calculation. Milestone figures are mid-range finish.

| Scenario | Milestone (this calculator) | Observed DRG output |
|---|---|---|
| Small, timber floor, ground access | $20,000 - $34,500 | $25,000 - $35,000, 2-3 weeks |
| Small, concrete slab | $19,500 - $32,000 | $27,000 - $37,000, 2.5-3.5 weeks |
| Medium, standard | $26,500 - $43,000 | $29,000 - $39,000, 3-4 weeks |
| Medium, apartment | $27,500 - $46,000 | $30,000 - $40,000, 3.5-4.5 weeks |
| Medium, changing layout | $28,500 - $50,000 | $30,500 - $40,500, 3.5-4.5 weeks |
| Large, premium scope (walls + layout + niche) | $54,500 - $106,000 | $34,600 - $44,600, 4.5-5.5 weeks |
| Medium, labour only | $26,500 - $43,000 (not priced separately) | $24,000 - $34,000, 3-4 weeks |
| Medium, all inclusive | $26,500 - $43,000 | $29,000 - $39,000, 3-4 weeks |
| Medium, DIY demolition | $24,000 - $40,500 | $26,500 - $36,500, 2.5-3.5 weeks |
| Medium, DIY painting | $26,500 - $43,000 (not offered) | $28,000 - $38,000, 3-4 weeks |
| Medium, recessed niche | $26,500 - $44,000 | $29,600 - $39,600, 3-4 weeks |
| Medium, removing walls | $28,000 - $49,000 | $30,500 - $40,500, 3.5-4.5 weeks |

Observations (not claims about their method): the competitor's output is a fixed-width $10,000 band that moves in
steps; Milestone's ranges are wider (about $16,500 at the medium baseline) because the independent sources
disagree. Baseline midpoints are close ($34,750 vs $34,000). The large premium case diverges strongly: this
calculator publishes the premium tier's $76,625 upper base from Sydney builder and aggregator guides, while the
competitor's observed band stayed near $45,000. Milestone timelines are a single published 3-6 week window and do
not vary by size; the competitor's vary from 2 to 5.5 weeks.

## 5. Open items for the business

1. Calibrate the five assumption allowances (large size, wall removal, niche, apartment, timber floor) against
   real Milestone quotes, then flip their `basis` to `source` with an internal reference.
2. Decide whether the wide premium range is acceptable or should be narrowed once real quotes exist.
3. Provide labour-only evidence if a labour-only price is wanted.
4. Home-renovation and extension pricing need an approved rate card.
5. Re-review the sources every quarter; bump `PRICING_VERSION` and `PRICING_REVIEWED`.
