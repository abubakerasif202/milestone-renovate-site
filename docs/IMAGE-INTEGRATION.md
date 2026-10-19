# Local renovation photography

The current collection contains 29 genuine photographs: 13 user-supplied photographs expressly approved as Milestone work, plus 16 licensed inspiration photographs of other interiors, housing, residential framing and carpentry. It replaces 19 active AI image identities (11 shared concepts, six bathroom styles and two comparison images). Ten dormant legacy identities were also retired: 176 obsolete WebP/AVIF derivatives in total. The initial inventory covers 202 image assets, including responsive derivatives, protected branding, portraits and vector fallbacks, across all 22 routes. Thirteen subsequently supplied owner photographs were also inspected; their intake and approval records are in `docs/audits/photography-owner-intake.json`. See `docs/audits/photography-inventory-before.json` for files, aspect ratios, original route references, source components, priorities and replacement subjects.

## Provenance and permitted use

`assets/photography/licences.json` records each local master, responsive output files, stock source URL or supplied original filename, photographer when known, download URL where applicable, licence/permission, commercial-use permission, attribution requirement, retrieval date and current page usage. For the 16 retained stock photographs, individual original Unsplash pages were checked for “Free to use under the Unsplash License”; Unsplash+ images were rejected. The Unsplash licence permits downloading, modification and commercial website use without mandatory attribution. Photographer credits remain in the manifest. No competitor portfolio photographs were used.

Stock photographs were visually inspected and source descriptions/available camera and location metadata reviewed. This provides stock-source provenance, not an independent audit of a property's construction history. Photographs show real spaces and work; they do not verify when a room was renovated, its budget, client, builder or completion date. Brisbane compact-kitchen, Sydney weatherboard and Australian framing provenance is retained where supplied by the photographer. Other locations remain as published or unspecified. No overseas stock interior is advertised as an Australian project. The extension hero shows residential framing, not a falsely documented completed extension.

The 13 owner-supplied photographs are expressly confirmed Milestone work, with the user approval recorded in the licence manifest. Stock photographs are renovation inspiration, never proof of Milestone workmanship. Homepage and gallery disclosures, service captions, studio captions, concept pages and the site-wide notice make this distinction. The carpentry photograph is explicitly stock, not Milestone staff. Named team portraits and their existing AI-editing disclosure are unchanged. Brand logos, icons, typography, navigation, opening animation, forms, pricing, business facts and tool contracts are preserved.

The homepage slider compares **two unrelated compact kitchens**, labelled by cabinetry/storage direction. It is explicitly not a before-and-after transformation. Concept routes remain design discussions using identified Milestone or stock reference photography; no site-specific case study, suburb, cost or completion date is invented. Bathroom style photographs are material/colour references rather than literal reproductions of every style or selection.

## Pipeline

Owner-supplied originals remain untouched in Downloads; committed copies have descriptive filenames. Masters are committed under `assets/photography/`, outside public output. Maximum downloaded stock width is 1600px; owner photographs retain their supplied 1200/1600px dimensions. `scripts/build-photography.mjs` generates capped 1448px local WebP and AVIF derivatives, stripping metadata and preserving each source's ratio. Main photographs use available 480/768/1024/1280 widths and a full-width variant capped at 1448px (1200px for narrower supplied originals); bathroom style selectors use 480/768/1448. No upscaling. WebP quality is 77; AVIF starts at 44, reducing where necessary to remain smaller than the corresponding WebP. The historical concept/bathroom build entry points delegate to this pipeline.

The generator reads the existing manifest interfaces. Main pictures offer AVIF with WebP fallback, intrinsic dimensions, `srcset` and layout-specific `sizes`. Studio selectors/previews retain responsive WebP and lazy loading. Below-fold photography is lazy; page heroes use eager loading and high fetch priority. Existing stable frames and image crops are retained. Missing image keys fail the build; there is no remote fallback.

On Windows, from the repository root:

```powershell
node scripts/build-photography.mjs
python build_site.py
node scripts/validate-photography.mjs
npm.cmd test
npx.cmd playwright test
```

The validator also refreshes the manifest's per-image page list. It checks all generated HTML image paths and responsive variants, dimensions, alt attributes and licence records. Browser tests cover loading, external requests, layout shift and overflow across all 22 local routes at 375/768/1440px, plus studio selection, keyboard navigation, sharing and accessibility. `package.json` has no TypeScript or lint command; use Python compilation, Node syntax checks and `git diff --check` for changed source syntax/whitespace.

## Future image changes

1. Verify the original photo page and intended commercial licence. Reject CGI, generated interiors, watermarks and uncertain permissions. Do not use search thumbnails as licence evidence.
2. Add the reasonably sized authorised download and a complete licence record. Describe only visible subjects and verified location metadata.
3. Use a new descriptive filename when changing a photograph; the site's immutable asset caching makes filename reuse inappropriate.
4. Rebuild both manifests and the site; validate local paths; run relevant tests and inspect local crops at all three target widths.
5. Search all source/manifests/HTML/CSS/JS references before removing an obsolete asset. Preserve named team/brand/UI assets.
6. Replace stock with genuine Milestone portfolio material only when owner-approved project documentation and publication permissions are available. Document before/after continuity before presenting a transformation.

No live-site crawl, screenshot comparison, image copying, push or deployment was performed for this overhaul.
