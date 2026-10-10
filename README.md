# Milestone Renovate

A renovation-focused sister website to Milestone Development, built as lightweight static HTML, CSS and JavaScript. No build step or package install is required.

## Included
- Responsive premium editorial homepage
- Dedicated service overview and four service detail pages
- About, visual inspiration, contact and privacy pages
- Click-to-call and an accessible email-based renovation enquiry form
- Search metadata, sitemap, robots.txt, Vercel clean URLs and responsive menu
- Official supplied Milestone architectural logo mark displayed in the header, footer and favicon
- Visual design references linked to the existing public Milestone Development GitHub repository, with offline SVG illustration fallbacks

## Preview locally

From the project folder:

```bash
python serve.py
```

Open http://localhost:8765/ . The bundled preview server supports clean routes such as `/about`. Vercel also serves clean routes using `vercel.json`.

## Deploy on Vercel

Create a **new** Vercel project for this sister website. Upload or connect the contents of this folder; framework preset should be **Other** and output directory `.` (no build command). Add `milestonerenovate.com` and `www.milestonerenovate.com` to the project, then configure DNS according to your project-specific Vercel instructions.

**Do not attach or deploy this site to the existing Milestone Development Vercel project.**

## Before launch
1. Confirm the legal trading name and permission to use Milestone Development's brand, phone and email (`1800 008 883`, `admin@milestonedevelopment.com.au`).
2. Replace the source images with owned, licensed renovation images; the current linked images are concept/illustrative references, not completed projects.
3. Replace the email-app-based enquiry with a secure server-side submission handler and test deliverability, spam prevention and consent/privacy copy.
4. Update the privacy notice if adding analytics, tracking, or a backend.
5. Verify `milestonerenovate.com` is owned and DNS points to this **new** project before launch.
6. Add real projects, testimonials, licences, reviews and warranty statements only with client-approved proof.

## Maintenance
Run `python build_site.py` only if modifying the optional generator. HTML output is already included. The site's source of truth is the generated `.html`, `css/site.css` and `js/site.js`.
