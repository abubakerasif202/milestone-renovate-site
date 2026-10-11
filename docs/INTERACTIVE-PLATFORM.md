# Renovation planning platform

The implementation keeps the Python generator, static HTML/CSS, vanilla modules, Vercel functions, Supabase lead store and Resend notification outbox. `build_site.py` composes server-rendered content from `site_experiences.py`. Regenerate with `npm run build:site`.

## Experiences

- `/bathroom-renovation-cost`: dimensions or direct floor area, size presets, existing floor and access, renovation scope, fixtures, waterproofing, tiling, access needs, upgrades and preferred timing. Live results explain scope, uncertainty and three alternative scenarios. The site-assessment CTA transfers structured choices to the questionnaire.
- `/renovation-design-studio`: room-adaptive guided moodboard with eight architectural directions, colour and finish samples, practical recommendations, reload recovery, printable summary and a share link containing only finite design selections.
- `/`: postcode-first entry and prominent planner/studio cards.
- `/concepts/warm-kitchen`, `/concepts/calm-bathroom`, `/concepts/connected-living`: generator-backed concept studies linked from inspiration. Every study is explicitly conceptual; no suburb, client attribution or completed-project claim is invented.

## Calculator methodology and approval gate

`public/js/lib/estimate.js` is the version-controlled configuration interface. `RATE_CARD.approved` remains false. Floor area is supplied directly or calculated as length Ã— width. Unitless scope weights classify light, moderate, substantial or complex coordination. They are editorial planning assumptions, not monetary rates, probabilities or an engineering assessment. Existing access and accessibility requirements remain in comparison scenarios.

No construction-duration assumptions are approved. Intended timing is the homeowner's preference; the result does not promise a build duration.

To prepare approved pricing, populate the `RATE_CARD` configuration through a reviewed code change, supplying:

- Version and source date, approval evidence and explicit GST treatment (`inclusive` or `exclusive`).
- Assumptions and exclusions, positive rounding increment, and approved uncertainty range.
- Per-square-metre rates for renovation/finish combinations, plumbing adjustments, flat site/upgrades and explicit adjustments for every extended selection (including zero where approved).

The engine rejects missing/invalid approved inputs. It returns low/high values with provenance and assumptions only for an approved card. A reviewed rendering change and tests are also required to activate the public priced view; the present UI intentionally renders scope guidance only. Never publish a fixture test card. No estimate is a binding quote.

## AI and imagery

No project-authorised image provider was found in the repository or project configuration. Read-only Vercel environment-name listings for Preview and Production confirm only Supabase, Resend and existing security/origin settings; no image-provider variable is configured. Secret values were not retrieved. A globally present provider credential is not site authorisation. No paid generation call or provider adapter is activated. The moodboard works with approved existing local concept assets, CSS material illustrations and selectable palettes. The reference image is labelled as an existing AI concept that does not render the chosen design. Samples are illustrative, not product specifications.

## Lead integration and privacy

The finite planner/studio context travels under `wizard.planning`, validated by the server's strict Zod schema and stored in the existing `wizard_data` JSONB. Staff notification rendering and retry reconstruction retain the planning context. No schema migration, production database write or RLS change is required.

Browser session drafts contain only validated choices, dimensions and postcode. They exclude name, email, phone, consent, free-text suburb and notes. Share links contain design choices only; storage-unavailable handoff uses validated query parameters. Questionnaire contact details and consent must be provided in the current sitting. Existing idempotency, storage-before-success, rate limiting and durable retry behaviour remain in place.

## Demonstration

1. Enter a postcode on the homepage and continue to the location-prefilled brief.
2. Choose a bathroom preset, then change access, plumbing and finish level. Inspect drivers and compare alternatives; carry selections into the site-assessment brief.
3. Choose a room in the studio. Select a direction, palette and finishes, then review the board. Print or copy its share link. Discuss the design to transfer the selections to the questionnaire.
4. Reload an incomplete questionnaire; safe choices recover, while contact details, consent and free-text notes do not.

## Release boundary

Feature-branch preview only. Do not merge or promote without approval. Production enquiries/emails, migrations, environment changes and DNS changes require separate explicit approval. Local form tests use the in-memory dev store and mock notifier; those tests do not prove live production delivery. See `INTERACTIVE-VALIDATION.md` for final evidence and limitations.
