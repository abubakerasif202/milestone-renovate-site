# Approved architectural concepts

All 11 approved concepts are indexed in `assets/renovation-concepts.json`, including original filenames, private semantic master paths, dimensions, placements, alt text, focal position and AI concept status. Timestamped originals supplied in `public/assets/img` were preserved unchanged and excluded from the feature commit. Identical semantic masters are retained in `incoming-images/renovation-concepts` outside the published output.

Rebuild derivatives with `node scripts/build-renovation-concepts.mjs`, then run `python build_site.py`. Sharp was already installed. Quality 83, effort 6; metadata is stripped. All sources are 1448 x 1086. Five widths per image (480, 768, 1024, 1280, 1448) produce 55 WebPs without upscaling. The original-width variant uses the descriptive filename without a size suffix. Existing one-year immutable asset caching is retained; these assets have new names. Changed masters require new filename identities before future deployment.

Primary placements: living homepage hero; olive kitchen kitchen page; spa bathroom bathroom page; waterfront extension extensions page; workspace studio/planning; open-plan interior whole-home page; bedroom, entrance, vanity, staircase and terrace inspiration gallery. The homepage also uses distinct detail/entrance/staircase views. All images remain explicitly conceptual. No new claim of completed work or generated user-specific design is made.

Generator source owns all responsive references. Images have srcset/sizes, intrinsic dimensions, focal crops, stable frames and lazy loading below the fold. Only justified page hero imagery uses high loading priority. Reduced-motion preferences disable image effects. Original logo, typography, palette, business facts, existing comparative concepts and API/database contracts remain intact.

See `IMAGE-INTEGRATION-VALIDATION.md` for screenshots and test evidence; `PLATFORM-PREVIEW-VALIDATION.md` distinguishes authenticated preview HTML checks from browser protection limitations. Neither feature branch was merged into main or promoted to production.
