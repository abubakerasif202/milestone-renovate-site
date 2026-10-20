# Calculator pricing methodology

## Bathroom calculator

`/bathroom-renovation-cost` uses `public/js/lib/bathroom-calculator.js`, the single shared
configuration and pure function for browser and email-only server submissions. The supplied
calculator specification in the local ZIP was inspected only for its three calculator files.
No competitor site, copy, branding or directory data is imported.

Base: AUD $20,000 minimum; maximum = minimum + $10,000. Base time: 2 weeks;
maximum = minimum + 1 week. All deltas are additive, without rounding, multipliers,
postcode surcharges or contingency. The source file and public methodology list every delta.
Small/timber/ground/labour-only are the defaults. Apartment access maps to one explicit access
choice; switching to ground clears the lift selection. DIY savings are independent.
No GST-inclusion policy is asserted for bathroom estimates. Written quotations confirm tax,
inclusions and final cost/timing after inspection, finishes, conditions, approvals and scope.

The prior tier-average bathroom engine and unused weighted planning price engine are removed.
Legacy non-price scope choices remain in `planning-options.js` so saved briefs can be read.
Old bathroom price handoffs are rejected/ignored rather than recalculated with kitchen rates.

## Kitchen guide

`/kitchen-renovation-cost` retains the existing kitchen tier-average model in
`pricing-config.js` and `price-estimate.js`, including its source arithmetic and rounding.
Kitchen numbers are not bathroom numbers. Sources are the existing What's the Damage
Sydney kitchen guide and Martina Hayes Sydney renovation guide. No new source verification
or updated market-price claims were made in this replacement.

## Enquiries

The existing `/api/enquiries` endpoint branches calculator payloads by `enquiryType`.
Calculator submissions validate and recompute with the shared bathroom model and use the
existing configured Resend notifier directly, without Supabase reads or writes. No migration,
table, secret, recipient override or infrastructure change is introduced. Other enquiry routes
retain their existing behavior. Success means provider HTTP acceptance, never verified inbox
delivery. Failure keeps selections and offers `/contact` with validated non-personal options.

Honeypot, minimum fill time, strict schemas, origin checks, payload limits, and bounded
instance-local rate limiting protect this flow. Resend idempotency keys are stable for retries.
The memory rate limiter is per instance, not a durable distributed quota. There is no durable
calculator lead/retry store; if email fails the visitor must retry or use contact/phone.
