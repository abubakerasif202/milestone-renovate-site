"""Static site generator for Milestone Renovate. Output goes to ./public (the Vercel output directory).

Run:  python build_site.py
"""
from datetime import date
from html import escape
from pathlib import Path
from xml.sax.saxutils import escape as xml_escape
import json
import hashlib
import subprocess
from site_calculator import calculator_page, kitchen_calculator_page, load_pricing
from site_constants import ACN, COMPANY, EMAIL, LICENCE, LICENCE_CLASS, LICENCE_URL, PHONE, PHONE_HREF
from site_legal import estimate_disclaimer_page, privacy_page, terms_page
from site_experiences import (
    postcode_entry,
    platform_tools,
    studio_page,
    CONCEPTS,
    concept_gallery,
    concept_page,
    trust_ribbon,
    booking_page,
    quote_audit_page,
)

ROOT_DIR = Path(__file__).parent
OUT = ROOT_DIR / 'public'
SITE = 'https://milestonerenovate.com'
PARENT = 'https://milestonedevelopment.com.au'
PRICING = load_pricing()
PRICING_REVIEWED = PRICING['reviewed']
OG_IMAGE = f'{SITE}/assets/brand/og-image.png'

# Licensed photographic references; legacy concept IDs remain stable for UI hooks.
CONCEPT_MANIFEST = json.loads((ROOT_DIR / 'assets' / 'renovation-concepts.json').read_text(encoding='utf-8'))
CONCEPT_IMAGES = {image['id']: image for image in CONCEPT_MANIFEST['images']}
IMAGE_ALIASES = {
    'hero-home': 'living-hero', 'kitchen-after': 'kitchen', 'bathroom-after': 'bathroom',
    'whole-home-living': 'whole-home',
    'inspo-materials': 'workspace', 'about-planning': 'construction', 'inspo-entry': 'entrance',
    'inspo-bedroom': 'bedroom', 'inspo-outdoor': 'terrace',
}


def concept_image_data(key):
    image = CONCEPT_IMAGES[key]
    for variant in image['variants']:
        if not (OUT / variant['src'].lstrip('/')).is_file():
            raise FileNotFoundError(f"Missing approved image variant: {variant['src']}")
    # AVIF siblings (scripts/build-concept-avif.mjs) are offered first; the WebP variants remain the fallback.
    avif = [v['avif'] for v in image['variants'] if 'avif' in v]
    if avif and len(avif) != len(image['variants']):
        raise ValueError(f"Incomplete AVIF set for {key}; run scripts/build-concept-avif.mjs")
    for entry in avif:
        if not (OUT / entry['src'].lstrip('/')).is_file():
            raise FileNotFoundError(f"Missing AVIF variant: {entry['src']}")
    return {
        'src': next(v['src'] for v in image['variants'] if v['width'] == 1024),
        'srcset': ', '.join(f"{v['src']} {v['width']}w" for v in image['variants']),
        'avif_srcset': ', '.join(f"{v['avif']['src']} {v['width']}w" for v in image['variants'] if 'avif' in v),
        'width': image['width'], 'height': image['height'], 'alt': image['alt'], 'id': image['id'], 'status': image['status'],
    }


BATHROOM_STYLE_MANIFEST = json.loads((ROOT_DIR / 'assets' / 'bathroom-styles.json').read_text(encoding='utf-8'))


def bathroom_style_imagery():
    """Six photographed bathroom directions for the Design Studio, keyed by style value. Missing files fail the build."""
    styles = {}
    for image in BATHROOM_STYLE_MANIFEST['images']:
        for variant in image['variants']:
            if not (OUT / variant['src'].lstrip('/')).is_file():
                raise FileNotFoundError(f"Missing bathroom style variant: {variant['src']}")
        styles[image['style']] = {
            'label': image['label'], 'summary': image['summary'], 'alt': image['alt'],
            'src': next(v['src'] for v in image['variants'] if v['width'] == 768),
            'srcset': ', '.join(f"{v['src']} {v['width']}w" for v in image['variants']),
            'width': image['width'], 'height': image['height'],
        }
    if len(styles) != 6:
        raise ValueError('The Design Studio needs exactly six bathroom styles.')
    return styles


# Photography is local-only; a missing manifest key fails the build.
uses_remote_images = False


def image_caption(key):
    image = CONCEPT_IMAGES[IMAGE_ALIASES.get(key, key)]
    return 'Milestone work · owner-supplied photograph' if image['status'] == 'owner-confirmed-milestone-work' else 'Renovation inspiration · not Milestone work'


def picture(key, alt, klass='', loading='lazy', sizes='100vw', priority=False):
    concept_key = IMAGE_ALIASES.get(key, key)
    if concept_key in CONCEPT_IMAGES:
        image = concept_image_data(concept_key)
        classes = f"{klass} concept-image concept-image-{image['id']}".strip()
        description = image['alt'] if alt else ''
        priority_attr = ' fetchpriority="high"' if priority else ''
        tag = f'<img class="{escape(classes, quote=True)}" src="{image["src"]}" srcset="{image["srcset"]}" sizes="{escape(sizes, quote=True)}" alt="{escape(description, quote=True)}" width="{image["width"]}" height="{image["height"]}" loading="{loading}" decoding="async"{priority_attr}>'
        if image['avif_srcset']:
            origin = 'milestone-work' if image['status'] == 'owner-confirmed-milestone-work' else 'inspiration'
            return f'<picture data-photo-origin="{origin}"><source type="image/avif" srcset="{image["avif_srcset"]}" sizes="{escape(sizes, quote=True)}">{tag}</picture>'
        return tag
    raise KeyError(f'No licensed local photograph for {key}')



# --- shared chrome -----------------------------------------------------------------------------------------
_ICON = '<svg class="mobile-cta-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">{}</svg>'
ICON_PHONE = _ICON.format('<path d="M5 3.5h3.2l1.6 4.2-2.1 1.3a11 11 0 0 0 7.3 7.3l1.3-2.1 4.2 1.6V19a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 3.5 5.1 1.5 1.5 0 0 1 5 3.5Z"/>')
ICON_CALENDAR = _ICON.format('<rect x="3.5" y="5" width="17" height="15.5" rx="1.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>')
NAV = [('Home', '/'), ('Services', '/services'), ('Our Approach', '/about'), ('Inspiration', '/inspiration'), ('Cost Planner', '/bathroom-renovation-cost'), ('Design Studio', '/renovation-design-studio'), ('Contact', '/contact')]


def header(active=''):
    links = ''.join(f'<a href="{url}"' + (' aria-current="page"' if active == title else '') + f'>{title}</a>' for title, url in NAV)
    return f'''<a class="skip" href="#content">Skip to content</a><header class="header" id="header"><div class="wrap nav-inner"><a class="brand" href="/" aria-label="Milestone Renovate home"><img src="/assets/brand/logo-gold.svg" alt="Milestone Renovate" width="205" height="40"></a><nav class="nav" id="navigation" aria-label="Main navigation">{links}<a class="nav-cta" href="/plan-your-renovation">Plan your renovation</a><a class="nav-booking-link" href="/booking">Book 15-min call</a></nav><div class="nav-actions"><a class="call-top" href="{PHONE_HREF}">{PHONE}</a><a href="/booking" class="btn btn-small btn-ghost-light">Book Call <span aria-hidden="true">↗</span></a><a href="/plan-your-renovation" class="btn btn-small btn-gold">Plan your renovation <span aria-hidden="true">↗</span></a><button class="menu-toggle" type="button" aria-controls="navigation" aria-expanded="false" aria-label="Open navigation" data-menu><span></span><span></span></button></div></div></header>'''


def footer():
    return f'''<footer class="footer"><div class="wrap"><div class="footer-top"><div><p class="eyebrow">YOUR NEXT MILESTONE BEGINS HERE</p><h2>Let’s make space for<br><em>what comes next.</em></h2><div class="footer-cta-row"><a href="/plan-your-renovation" class="btn btn-gold">Plan your renovation <span aria-hidden="true">↗</span></a><a href="/booking" class="btn btn-ghost-light">Book 15-min call <span aria-hidden="true">↗</span></a></div></div><div class="footer-aside"><p>Kitchen, bathroom and whole-home renovations for existing Sydney homes, connected to Milestone Development.</p><a href="{PHONE_HREF}">{PHONE}</a><a href="mailto:{EMAIL}">{EMAIL}</a></div></div></div><div class="footer-bar"><div class="wrap footer-bottom"><a class="footer-brand" href="/" aria-label="Milestone Renovate home"><img src="/assets/brand/logo-gold.svg" alt="Milestone Renovate" width="168" height="33"></a><div class="footer-links"><a href="/services">Services</a><a href="/inspiration">Inspiration</a><a href="/bathroom-renovation-cost">Cost Planner</a><a href="/renovation-design-studio">Design Studio</a><a href="/booking">Book Call</a><a href="/quote-audit">Quote Audit</a><a href="/about">About</a><a href="/about#team">Meet the Team</a><a href="/privacy">Privacy Policy</a><a href="/terms">Terms of Use</a><a href="/estimate-disclaimer">Estimate Disclaimer</a><a href="{PARENT}" target="_blank" rel="noopener">Milestone Development ↗</a></div><p class="footer-licence">Renovation work contracted by {COMPANY} · ACN {ACN} · NSW Contractor Licence <a href="{LICENCE_URL}" target="_blank" rel="noopener">{LICENCE}</a> ({LICENCE_CLASS})</p><div class="footer-meta"><small>© {date.today().year} Milestone Renovate. All rights reserved.</small><a class="developer-credit" href="https://abwebstudio.com.au/" target="_blank" rel="noopener noreferrer" aria-label="Website Designed &amp; Developed by AB Web Studio (opens in a new tab)"><img src="/assets/brand/ab-web-studio-footer.webp" alt="AB Web Studio logo" width="448" height="206" loading="lazy" decoding="async"><span>Website Designed &amp; Developed by <strong>AB Web Studio</strong></span></a></div></div></div></footer><nav class="mobile-cta-bar" aria-label="Quick contact actions"><a href="{PHONE_HREF}" class="mobile-cta-btn mobile-cta-call">{ICON_PHONE}<span>Call {PHONE}</span></a><a href="/booking" class="mobile-cta-btn mobile-cta-book">{ICON_CALENDAR}<span>Book 15-min call</span></a></nav>'''



def head(title, description, slug, ldjson, scripts=(), noindex=False, styles=()):
    url = SITE + ('/' + slug if slug else '/')
    t, d = escape(title, quote=True), escape(description, quote=True)
    extra_css = ''.join(f'<link rel="stylesheet" href="/css/{c}">' for c in styles)
    mods = ''.join(f'<script type="module" src="/js/{s}"></script>' for s in scripts)
    robots = '<meta name="robots" content="noindex">' if noindex else ''
    return f'''<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#0F201D"><title>{escape(title)}</title><meta name="description" content="{d}">{robots}<link rel="canonical" href="{url}"><link rel="shortcut icon" href="/favicon.ico"><link rel="icon" href="/assets/brand/favicon-32.png" sizes="32x32" type="image/png"><link rel="icon" href="/assets/brand/icon-192.png" sizes="192x192" type="image/png"><link rel="apple-touch-icon" href="/assets/brand/apple-touch-icon.png"><link rel="manifest" href="/site.webmanifest"><meta property="og:locale" content="en_AU"><meta property="og:type" content="website"><meta property="og:site_name" content="Milestone Renovate"><meta property="og:title" content="{t}"><meta property="og:description" content="{d}"><meta property="og:url" content="{url}"><meta property="og:image" content="{OG_IMAGE}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Milestone Renovate gold architectural logo on forest green"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{t}"><meta name="twitter:description" content="{d}"><meta name="twitter:image" content="{OG_IMAGE}"><link rel="preload" href="/assets/fonts/inter-latin-400-900-normal.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="/assets/fonts/newsreader-latin-400-500-normal.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="/assets/fonts/newsreader-latin-400-500-italic.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="/css/tokens.css"><link rel="stylesheet" href="/css/site.css"><link rel="stylesheet" href="/css/app.css"><link rel="stylesheet" href="/css/planning.css"><link rel="stylesheet" href="/css/concept-images.css">{extra_css}<link rel="stylesheet" href="/css/motion.css"><script type="application/ld+json">{json.dumps(ldjson, ensure_ascii=False)}</script><script defer src="/js/site.js"></script><script defer src="/js/motion.js"></script>{mods}</head>'''


def webpage_ld(title, description, slug, home=False, crumbs=None, service_info=None):
    url = SITE + ('/' + slug if slug else '/')
    page = {'@type': 'WebPage', '@id': url + '#webpage', 'name': title, 'url': url, 'description': description, 'inLanguage': 'en-AU', 'isPartOf': {'@id': SITE + '/#website'}}
    business = {
        '@type': 'HomeAndConstructionBusiness',
        '@id': SITE + '/#organization',
        'name': 'Milestone Renovate',
        'url': SITE + '/',
        'logo': SITE + '/assets/brand/icon-512.png',
        'image': OG_IMAGE,
        'description': 'Kitchen, bathroom and whole-home renovations for existing Sydney homes.',
        'parentOrganization': {'@type': 'Organization', 'name': 'Milestone Development', 'url': PARENT + '/'},
        'legalName': COMPANY,
        'identifier': [
            {'@type': 'PropertyValue', 'propertyID': 'ACN', 'value': ACN},
            {'@type': 'PropertyValue', 'propertyID': 'NSW Contractor Licence', 'value': LICENCE, 'url': LICENCE_URL},
        ],
        'telephone': PHONE,
        'email': EMAIL,
        'areaServed': [
            {'@type': 'City', 'name': 'Sydney'},
            {'@type': 'AdministrativeArea', 'name': 'New South Wales'},
        ],
    }
    if home:
        faqs = {
            '@type': 'FAQPage',
            '@id': url + '#faq',
            'mainEntity': [
                {
                    '@type': 'Question',
                    'name': 'Can we renovate while living in the home?',
                    'acceptedAnswer': {
                        '@type': 'Answer',
                        'text': 'It depends on the scope. Some works can be staged while occupied, while significant renovation may require temporary arrangements. We can discuss practicality during planning.',
                    },
                },
                {
                    '@type': 'Question',
                    'name': 'Do renovation projects require approvals?',
                    'acceptedAnswer': {
                        '@type': 'Answer',
                        'text': 'Some works may need council, strata or other approvals. Requirements depend on the location and nature of the work, especially structural or external changes.',
                    },
                },
                {
                    '@type': 'Question',
                    'name': 'Can you help with planning and finishes?',
                    'acceptedAnswer': {
                        '@type': 'Answer',
                        'text': 'Yes, the enquiry process can start with your layout priorities, design preferences, material ideas and practical buildability questions.',
                    },
                },
                {
                    '@type': 'Question',
                    'name': 'What should I prepare before getting in touch?',
                    'acceptedAnswer': {
                        '@type': 'Answer',
                        'text': 'Share your suburb, type of space, approximate budget and desired timeframe. Reference photos or a simple wish list can help start the conversation.',
                    },
                },
            ],
        }
        graph = [
            {'@type': 'WebSite', '@id': SITE + '/#website', 'name': 'Milestone Renovate', 'url': SITE + '/', 'inLanguage': 'en-AU'},
            business,
            page,
            faqs,
        ]
    else:
        graph = [
            {'@type': 'WebSite', '@id': SITE + '/#website', 'name': 'Milestone Renovate', 'url': SITE + '/'},
            business,
            page,
        ]

    if service_info:
        svc = {
            '@type': 'Service',
            '@id': url + '#service',
            'name': service_info['name'],
            'serviceType': service_info['name'],
            'description': description,
            'provider': {'@id': SITE + '/#organization'},
            'areaServed': {'@type': 'City', 'name': 'Sydney'},
        }
        graph.append(svc)

    if crumbs:
        graph.append({'@type': 'BreadcrumbList', 'itemListElement': [{'@type': 'ListItem', 'position': i, 'name': n, 'item': SITE + u} for i, (n, u) in enumerate(crumbs, 1)]})
    if slug == 'about':
        graph.extend({
            '@type': 'Person',
            '@id': f'{url}#person-{person["slug"]}',
            'name': person['name'],
            'image': f'{SITE}{team_portrait_url(person["slug"], 1122)}',
            'url': f'{url}#team',
            'worksFor': {'@id': SITE + '/#organization'},
        } for person in TEAM)
    return {'@context': 'https://schema.org', '@graph': graph}


def shell(title, description, body, active='', slug='', home=False, crumbs=None, scripts=(), noindex=False, service_info=None, styles=()):
    if home:
        scripts = [*scripts, 'opening-intro.js']
        styles = [*styles, 'opening-intro.css']
    return head(title, description, slug, webpage_ld(title, description, slug, home, crumbs, service_info), scripts, noindex, styles) + f'<body>{header(active)}<main id="content">{body}<p class="image-note photography-notice">Photography includes owner-supplied Milestone work and licensed renovation inspiration. Captions identify the source; inspiration images are not Milestone projects. Team portraits are identified separately.</p></main>{footer()}</body></html>'


def kicker(s):
    return f'<p class="eyebrow">{s}</p>'


def split_header(k, title, desc):
    return f'<div class="section-header"><div>{kicker(k)}<h2>{title}</h2></div><p>{desc}</p></div>'


def cta():
    return '''<section class="cta-strip"><div class="wrap cta-panel reveal"><div class="cta-grid-left"><p class="eyebrow">PLAN YOUR RENOVATION</p><h2>Have a space in mind?<br><em>Let’s explore the possibilities.</em></h2></div><div class="cta-grid-right"><p>Tell us what you’re planning. We’ll help you work through the first practical steps.</p><div class="cta-actions"><a class="btn btn-primary" href="/plan-your-renovation">Plan your renovation <span aria-hidden="true">↗</span></a><a class="text-link" href="/contact">Speak to our team <span aria-hidden="true">↗</span></a></div></div></div></section>'''


# --- pages -------------------------------------------------------------------------------------------------
home = f'''<section class="hero"><div class="wrap hero-grid"><div class="hero-copy">{kicker('THE RENOVATION CHAPTER OF MILESTONE')}<h1><span class="h-line"><span>Space to live.</span></span> <span class="h-line"><span><em>Room to become.</em></span></span></h1><p>Explore thoughtful kitchen, bathroom and whole-home renovations, with practical guidance from the first idea to the next conversation.</p>{postcode_entry()}<div class="hero-buttons"><a class="text-link" href="/renovation-design-studio">Explore the Design Studio <span aria-hidden="true">↗</span></a></div><p class="hero-phone">Prefer to talk? Call <a href="{PHONE_HREF}">{PHONE}</a></p></div><div class="hero-media" data-parallax="-26"><span class="hero-corner" aria-hidden="true"></span><div class="hero-media-inner">{picture('hero-home', 'Brisbane kitchen with pendant lights, stone counters and a timber floor', 'hero-image', 'eager', '(max-width:760px) 100vw, (max-width:1020px) 92vw, 52vw', True)}</div><div class="hero-chip">01 / RENOVATION-LED THINKING<span>MILESTONE WORK · OWNER-SUPPLIED PHOTOGRAPH</span></div></div></div><a class="scroll-cue" href="#after-hero"><i aria-hidden="true"></i><span>Scroll to explore</span></a></section>
<section class="ticker" id="after-hero"><div class="wrap ticker-inner"><span>CONSIDERED DESIGN</span><i></i><span>SMARTER SPACES</span><i></i><span>QUALITY-FOCUSED DETAIL</span><i></i><span>PRACTICAL PLANNING</span></div></section>
{trust_ribbon()}
{platform_tools(picture)}
<section class="section intro"><div class="wrap intro-grid reveal"><div>{kicker('A HOME, REIMAGINED')}<h2>Not a new address.<br><em>A new perspective.</em></h2></div><div><p class="lead">Sometimes the home you love simply needs to evolve with you.</p><p>Milestone Renovate is a renovation brand of Milestone Development. We bring the same thoughtful approach to planning and delivery into existing homes — reworking spaces, reconsidering layouts and elevating everyday living.</p><a class="text-link" href="/about">Discover our approach <span aria-hidden="true">↗</span></a></div></div></section>
<section class="section services-surface"><div class="wrap">{split_header('WHAT WE DO', 'Every space has <em>possibility.</em>', 'From one considered room to a home-wide transformation, start with what matters most to you.')}<div class="service-grid reveal"><a class="service-tile featured" href="/home-renovations">{picture('staircase', 'Timber staircase beside a furnished living space and indoor plants', '', 'lazy', '(max-width:870px) 92vw, 52vw')}<div class="tile-overlay"><span class="service-number">01 / WHOLE HOME</span><h3>Whole-home<br>renovations</h3><span class="circle-arrow" aria-hidden="true">↗</span></div></a><a class="service-tile" href="/kitchen-renovations">{picture('kitchen-after', 'Country kitchen with a timber island, open shelving and large windows', '', 'lazy', '(max-width:600px) 92vw, (max-width:870px) 46vw, 42vw')}<div class="tile-overlay"><span class="service-number">02 / KITCHENS</span><h3>Kitchen<br>renovations</h3><span class="circle-arrow" aria-hidden="true">↗</span></div></a><a class="service-tile" href="/bathroom-renovations">{picture('bathroom-after', 'Brisbane bathroom with a freestanding bath, tiled walls and a leafy plant', '', 'lazy', '(max-width:600px) 92vw, (max-width:870px) 46vw, 42vw')}<div class="tile-overlay"><span class="service-number">03 / BATHROOMS</span><h3>Bathroom<br>renovations</h3><span class="circle-arrow" aria-hidden="true">↗</span></div></a></div><p class="image-note">Milestone kitchen, bathroom and site photographs appear alongside clearly labelled renovation inspiration.</p><a class="text-link center-link" href="/services">All renovation services <span aria-hidden="true">↗</span></a></div></section>
<section class="section journey-section"><div class="wrap">{split_header('THE RENOVATION JOURNEY', 'From first idea <em>to next step.</em>', 'A simple, no-pressure path. You decide how much to share and when.')}<ol class="journey-list reveal"><li><span class="journey-num" aria-hidden="true">1</span><h3>Share your brief</h3><p>Use the guided questionnaire or the short contact form. Skip anything you are unsure about.</p></li><li><span class="journey-num" aria-hidden="true">2</span><h3>We review it</h3><p>Your enquiry is stored securely and passed to the Milestone team with a reference number.</p></li><li><span class="journey-num" aria-hidden="true">3</span><h3>Talk it through</h3><p>The team gets in touch to discuss your priorities, the space and the practical considerations.</p></li><li><span class="journey-num" aria-hidden="true">4</span><h3>Shape the next step</h3><p>Together, work out what a sensible next stage looks like for your home.</p></li></ol></div></section>
<section class="section compare-section"><div class="wrap">{split_header('EXPLORE TWO LAYOUTS', 'Every kitchen has <em>its own rhythm.</em>', 'Drag the handle, or use the arrow keys, to explore two different compact kitchens.')}<figure class="compare reveal" data-compare><div class="compare-stage">{picture('compare-after', 'Compact kitchen with white cabinetry, open shelves and a built-in microwave', 'compare-img', 'lazy', '(max-width:1100px) 92vw, 1100px')}<div class="compare-before" aria-hidden="true">{picture('compare-before', '', 'compare-img', 'lazy', '(max-width:1100px) 92vw, 1100px')}</div><span class="compare-tag t-before">Timber cabinetry</span><span class="compare-tag t-after">Open shelving</span><span class="compare-line" aria-hidden="true"><span class="compare-handle">⇄</span></span><input class="compare-range" type="range" min="0" max="100" value="50" step="1" aria-label="Kitchen inspiration slider: reveal timber cabinetry or open shelving in two different homes"></div><figcaption><strong>Interactive demonstration.</strong> Two unrelated homes, shown for layout inspiration. This is not a before-and-after renovation or completed Milestone Renovate work.</figcaption></figure></div></section>
<section class="section philosophy"><div class="wrap philosophy-grid reveal"><div class="philosophy-media">{picture('about-planning', 'Unfinished room with exposed plumbing, plaster repairs and a work light', '', 'lazy', '(max-width:870px) 92vw, 48vw')}<div class="media-stamp">DESIGN FOR<br><strong>EVERYDAY</strong><br>LIVING.</div></div><div class="philosophy-copy">{kicker('THE MILESTONE APPROACH')}<h2>Good renovations begin <em>before the first wall moves.</em></h2><p>We believe the best spaces are grounded in a real understanding of how you use them. That means asking the right questions, working through constraints, and keeping the big picture in view.</p><div class="principles"><div><b>01</b><div><h3>Understand first</h3><p>Your needs, your home, your budget priorities.</p></div></div><div><b>02</b><div><h3>Plan with purpose</h3><p>Layout, finishes and practical construction thinking.</p></div></div><div><b>03</b><div><h3>Deliver with care</h3><p>Attention to sequence, coordination and detail.</p></div></div></div><a class="text-link" href="/about">How we work <span aria-hidden="true">↗</span></a></div></div></section>
<section class="section inspirations"><div class="wrap">{split_header('LOOK CLOSER', 'A little inspiration.<br><em>A lot of possibility.</em>', 'A collection of real interiors and material ideas to help start a conversation about your space.')}<div class="inspo-grid reveal"><a href="/inspiration" class="inspo-card"><div class="frame">{picture('joinery', 'Milestone timber cabinetry detail', '', 'lazy', '(max-width:600px) 92vw, 36vw')}</div><span>01 / TIMBER &amp; DETAIL</span></a><a href="/inspiration" class="inspo-card"><div class="frame">{picture('inspo-entry', 'Australian weatherboard house with a sheltered verandah and picket fence', '', 'lazy', '(max-width:600px) 92vw, 30vw')}</div><span>02 / A CONSIDERED ARRIVAL</span></a><a href="/inspiration" class="inspo-card"><div class="frame">{picture('inspo-bedroom', 'Bedroom with timber bedside furniture, framed prints and blue cushions', '', 'lazy', '(max-width:600px) 92vw, 26vw')}</div><span>03 / QUIET RETREATS</span></a></div><p class="image-note">Milestone joinery photograph with licensed exterior and bedroom inspiration.</p></div></section>
<section class="section faq-section"><div class="wrap faq-grid"><div>{kicker('GOOD QUESTIONS, GOOD STARTS')}<h2>Wondering where<br><em>to begin?</em></h2><p>Every home is different. Here are a few starting points worth considering.</p></div><div class="faq-list"><details><summary>Can we renovate while living in the home?</summary><p>It depends on the scope. Some works can be staged while occupied, while significant renovation may require temporary arrangements. We can discuss practicality during planning.</p></details><details><summary>Do renovation projects require approvals?</summary><p>Some works may need council, strata or other approvals. Requirements depend on the location and nature of the work, especially structural or external changes.</p></details><details><summary>Can you help with planning and finishes?</summary><p>Yes, the enquiry process can start with your layout priorities, design preferences, material ideas and practical buildability questions.</p></details><details><summary>What should I prepare before getting in touch?</summary><p>Share your suburb, type of space, approximate budget and desired timeframe. Reference photos or a simple wish list can help start the conversation.</p></details></div></div></section>{cta()}'''

SERVICES = [
    ('Whole-home renovations', '/home-renovations', 'Rework how rooms connect, flow and function.'),
    ('Kitchen renovations', '/kitchen-renovations', 'Make everyday cooking, gathering and movement feel natural.'),
    ('Bathroom renovations', '/bathroom-renovations', 'Consider storage, finishes, comfort and practical detail.'),
]
services_html = ''.join(f'<a href="{u}" class="service-row"><span>0{i}</span><div><h3>{escape(t)}</h3><p>{d}</p></div><span class="service-row-arrow" aria-hidden="true">↗</span></a>' for i, (t, u, d) in enumerate(SERVICES, 1))
services = f'''<section class="inner-hero"><div class="wrap"><p class="eyebrow inverse">RENOVATION SERVICES</p><h1>Spaces made for <em>living.</em></h1><p>Whether you are changing one room or reshaping the way your entire home works, we start with your priorities.</p></div><div class="inner-hero-image">{picture('whole-home-living', 'Living and dining room with timber flooring and daylight from glazed doors', '', 'eager', '(max-width:870px) 100vw, 48vw', True)}</div></section><section class="section"><div class="wrap">{split_header('WHAT WE CAN EXPLORE', 'Considered solutions<br><em>for your home.</em>', 'We’ll work through the design questions, practical realities and construction considerations of each project.')}<div class="services-list">{services_html}</div><figure class="craft-reference"><div class="frame">{picture('craft', 'Carpentry in a workshop', sizes='(max-width:870px) 92vw, 60vw')}</div><figcaption>Craftsmanship reference · licensed stock photograph, not Milestone staff or work.</figcaption></figure></div></section><section class="section surface-alt"><div class="wrap intro-grid"><div>{kicker('NOT JUST A NEW LOOK')}<h2>Better spaces, <em>better everyday moments.</em></h2></div><div><p class="lead">A renovation should feel right to live in, not only good to look at.</p><p>Thoughtful layouts, durable materials, daylight, storage and the relationship between rooms all influence how a home feels after the work is finished.</p><a class="text-link" href="/plan-your-renovation">Plan your renovation <span aria-hidden="true">↗</span></a></div></div></section>{cta()}'''

# Display order and source-file names follow the user-confirmed portrait identities.
# Roles and biographies are intentionally omitted because verified copy was not supplied.
TEAM = [
    dict(slug='james-creswick', name='James Creswick', alt='James Creswick, smiling with light-brown hair in a green Milestone Development shirt'),
    dict(slug='kamala-najafi', name='Kamala Najafi', alt='Kamala Najafi, dark-haired and bearded in a green Milestone Renovate shirt'),
    dict(slug='muhammad-mohsini', name='Muhammad Mohsini', alt='Muhammad Mohsini, clean-shaven with dark hair in a green Milestone Renovate shirt'),
]
TEAM_WIDTHS = (480, 800, 1122)


def team_portrait_url(slug, width):
    path = f'/assets/img/team/{slug}-{width}.webp'
    # Asset responses are immutable for a year. Changed bytes need a new cache key.
    version = hashlib.sha256((OUT / path.lstrip('/')).read_bytes()).hexdigest()[:12]
    return f'{path}?v={version}'


def team_card(person):
    files = [OUT / 'assets' / 'img' / 'team' / f"{person['slug']}-{n}.webp" for n in TEAM_WIDTHS]
    missing = [f.name for f in files if not f.exists()]
    if missing:
        raise SystemExit(f'Team portrait variants missing ({", ".join(missing)}); run `npm run build:team`.')
    srcset = ', '.join(f"{team_portrait_url(person['slug'], n)} {n}w" for n in TEAM_WIDTHS)
    return f'<article class="team-card"><div class="team-photo"><img src="{team_portrait_url(person["slug"], 800)}" srcset="{srcset}" sizes="(max-width:760px) min(92vw, 440px), (max-width:1020px) 46vw, 430px" width="1122" height="1402" loading="lazy" decoding="async" alt="{escape(person["alt"], quote=True)}"></div><div class="team-body"><h3>{escape(person["name"])}</h3></div></article>'


def team_section():
    cards = ''.join(team_card(person) for person in TEAM)
    intro = 'Meet James Creswick, Kamala Najafi and Muhammad Mohsini.'
    return f'<section class="section team-section" id="team" aria-labelledby="team-heading"><div class="wrap"><p class="eyebrow">MEET THE TEAM</p><h2 id="team-heading">A hands-on team. Thoughtful renovations. <em>Careful attention to detail.</em></h2><p class="team-intro">{intro}</p><div class="team-grid">{cards}</div></div></section>'


about = f'''<section class="inner-hero about-bg"><div class="wrap"><p class="eyebrow inverse">OUR STORY &amp; APPROACH</p><h1>Built on experience.<br><em>Made personal.</em></h1><p>Milestone Renovate brings the renovation conversation into focus — as the renovation brand of Milestone Development.</p><a class="text-link" href="#team">Meet the team <span aria-hidden="true">↓</span></a></div><div class="inner-hero-image">{picture('about-planning', 'Unfinished room with exposed plumbing, plaster repairs and a work light', '', 'eager', '(max-width:870px) 100vw, 48vw', True)}</div></section><section class="section"><div class="wrap intro-grid"><div>{kicker('ONE MILESTONE FAMILY')}<h2>A specialist focus.<br><em>A shared foundation.</em></h2></div><div><p class="lead">A good renovation balances the way a space looks with the way it needs to work.</p><p>As the renovation brand of Milestone Development, Milestone Renovate concentrates on existing homes: the opportunities, challenges and details that come with transforming familiar spaces.</p><p>We place practical planning alongside design intent so the next stage of your home feels considered from the beginning.</p><p>Renovation building work is contracted by {COMPANY} (ACN {ACN}), which holds NSW Contractor Licence <a class="inline-link" href="{LICENCE_URL}" target="_blank" rel="noopener">{LICENCE}</a> in the {LICENCE_CLASS} class. You can check it on the NSW Government’s Verify NSW register.</p><a class="text-link" href="{PARENT}" target="_blank" rel="noopener">Visit Milestone Development <span aria-hidden="true">↗</span></a></div></div></section>{team_section()}<section class="section services-surface"><div class="wrap">{split_header('OUR PRINCIPLES', 'The thinking behind <em>every transformation.</em>', 'Simple values that shape the conversation from your initial enquiry onwards.')}<div class="value-grid"><article><span>01 / CLARITY</span><h3>Clear from the start.</h3><p>Understanding needs, priorities, constraints and next steps.</p></article><article><span>02 / CRAFT</span><h3>Details matter.</h3><p>Materials, construction sequence and finish should work as one.</p></article><article><span>03 / COLLABORATION</span><h3>Ideas in conversation.</h3><p>Good solutions come from listening and working through options together.</p></article></div></div></section><section class="section"><div class="wrap">{split_header('HOW AN ENQUIRY WORKS', 'From first idea <em>to next conversation.</em>', 'A simple, no-pressure start.')}<div class="value-grid"><article><span>STEP 01</span><h3>Share your brief.</h3><p>Use the guided questionnaire or the short contact form. Skip anything you are unsure about.</p></article><article><span>STEP 02</span><h3>We review it.</h3><p>Your enquiry is stored securely and passed to the Milestone team with your reference number.</p></article><article><span>STEP 03</span><h3>We get in touch.</h3><p>The team contacts you to talk through your priorities and the practical next steps.</p></article></div></div></section>{cta()}'''

GALLERY_FILTERS = [('all', 'All references'), ('arrival', 'Exteriors &amp; arrival'), ('living', 'Kitchens &amp; living'), ('retreat', 'Bathrooms &amp; bedrooms'), ('materials', 'Materials &amp; planning')]
gallery_items = [
        ('kitchen-after', 'Light kitchen with stone island and timber stools', 'Warmth in the details', 'living'),
    ('inspo-entry', 'Timber front door with stone steps and planting', 'A welcoming arrival', 'arrival'),
    ('bathroom-after', 'Calm bathroom with stone bath and sage tiles', 'A quiet start to the day', 'retreat'),
    ('inspo-outdoor', 'Kitchen and dining opening to an alfresco space', 'A garden-facing dining space', 'living'),
    ('inspo-materials', 'Oak, stone and brass material samples', 'A place to plan', 'materials'),
    ('whole-home-living', 'Open-plan living area with terrace', 'Room to gather', 'living'),
    ('inspo-bedroom', 'Calm main bedroom with sage feature wall', 'A restful retreat', 'retreat'),
    ('about-planning', 'Renovation work in progress', 'The work behind the finishes', 'materials'),
    ('laundry', 'Utility sink and cabinetry', 'A practical utility space', 'living'),
    ('detail', 'Vanity and shower details', 'Everyday finishing details', 'materials'),
    ('joinery', 'Full-height timber cabinetry', 'Joinery in detail', 'materials'),
    ('compact-bathroom', 'Compact bathroom vanity and shower', 'Making a compact room work', 'retreat'),
    ('shower-tiling', 'Tiled walk-in shower', 'Shower tiling and glazing', 'retreat'),
    ('bath-layout', 'Bathroom with bath and vanity', 'Room for bathing', 'retreat'),
    ('site-floor', 'Bathroom floor work in progress', 'Site work in progress', 'materials'),
    ('shower-preparation', 'Shower enclosure in progress', 'Preparing the shower space', 'materials'),
    ('craft', 'Carpentry in a workshop', 'Hands at work', 'materials'),
    ('compare-before', 'Compact kitchen with timber cabinets', 'Compact kitchen ideas', 'living'),
    ('vanity', 'Sunlit marble double vanity', 'Light and everyday detail', 'retreat'),
    ('staircase', 'Curved staircase in a light-filled foyer', 'Timber and circulation', 'living'),
]
filter_bar = '<div class="filter-bar" role="group" aria-label="Filter design references" data-filter-bar>' + ''.join(f'<button class="filter-btn" type="button" data-filter="{k}" aria-pressed="{"true" if k == "all" else "false"}">{l}</button>' for k, l in GALLERY_FILTERS) + '</div><p class="sr-only" id="filter-status" role="status" aria-live="polite"></p>'
inspiration = f'''<section class="inner-hero"><div class="wrap"><p class="eyebrow inverse">DESIGN INSPIRATION</p><h1>Imagine the <em>possibilities.</em></h1><p>Ideas for light, texture, proportion and better flow. Explore owner-supplied photographs of Milestone work alongside clearly labelled renovation inspiration from other homes.</p></div><div class="inner-hero-image">{picture('inspo-outdoor', 'Dining room with timber beams, upholstered seating and garden-facing windows', '', 'eager', '(max-width:870px) 100vw, 48vw', True)}</div></section><section class="section"><div class="wrap">{split_header('A VISUAL CONVERSATION', 'Details worth …8617 tokens truncated…404'))

    write('robots.txt', f'User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: {SITE}/sitemap.xml\n')

    # Truthful modification dates reflecting actual substantive content revisions.
    # Pages that have not undergone substantive content changes retain their original revision date,
    # preventing false lastmod refresh when build scripts are modified.
    PAGE_LASTMOD = {
        '': '2026-10-20',
        'services': '2026-10-20',
        'about': '2026-10-20',
        'inspiration': '2026-10-20',
        'contact': '2026-10-20',
        'privacy': '2026-10-12',
        'terms': '2026-10-12',
        'estimate-disclaimer': '2026-10-12',
        'plan-your-renovation': '2026-10-20',
        'bathroom-renovation-cost': '2026-10-12',
        'booking': '2026-10-20',
        'quote-audit': '2026-10-20',
        'renovation-design-studio': '2026-10-11',
        'kitchen-renovations': '2026-10-20',
        'bathroom-renovations': '2026-10-20',
        'home-renovations': '2026-10-20',
    }

    urls = [''] + [p[5] for p in pages if p[5]] + list(pdetails)
    sitemap_items = []
    for u in urls:
        loc = xml_escape(SITE + ('/' + u if u else '/'))
        lastmod = PAGE_LASTMOD.get(u, '2026-10-11' if u.startswith('concepts/') else '2026-10-12')
        sitemap_items.append(f'<url><loc>{loc}</loc><lastmod>{lastmod}</lastmod></url>\n')

    write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(sitemap_items) + '</urlset>\n')

    img_src = " https://raw.githubusercontent.com" if uses_remote_images else ''
    csp = f"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:{img_src}; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
    vercel = {
        '$schema': 'https://openapi.vercel.sh/vercel.json',
        'outputDirectory': 'public',
        'cleanUrls': True,
        'trailingSlash': False,
        'redirects': [
            {'source': '/:path*', 'has': [{'type': 'host', 'value': 'www.milestonerenovate.com'}], 'destination': 'https://milestonerenovate.com/:path*', 'permanent': True},
            # retired pages: Milestone Renovate no longer markets extensions or an approvals checker
            *({'source': route, 'destination': '/services', 'permanent': True} for route in RETIRED_ROUTES),
        ],
        'headers': [
            {'source': '/(.*)', 'headers': [
                {'key': 'X-Content-Type-Options', 'value': 'nosniff'},
                {'key': 'Referrer-Policy', 'value': 'strict-origin-when-cross-origin'},
                {'key': 'X-Frame-Options', 'value': 'DENY'},
                {'key': 'Strict-Transport-Security', 'value': 'max-age=31536000; includeSubDomains'},
                {'key': 'Permissions-Policy', 'value': 'camera=(), microphone=(), geolocation=()'},
                {'key': 'Content-Security-Policy', 'value': csp},
            ]},
            {'source': '/assets/(.*)', 'headers': [{'key': 'Cache-Control', 'value': 'public, max-age=31536000, immutable'}]},
            # keep preview / default *.vercel.app deployments out of search indexes
            {'source': '/(.*)', 'has': [{'type': 'host', 'value': '.*\\.vercel\\.app'}], 'headers': [{'key': 'X-Robots-Tag', 'value': 'noindex, nofollow'}]},
        ],
        'regions': ['syd1'],
        # Daily backstop that re-sends failed staff notifications (needs CRON_SECRET; see docs/DEPLOYMENT.md). Daily = valid on every Vercel plan.
        'crons': [{'path': '/api/notifications/retry', 'schedule': '0 20 * * *'}],
    }
    (ROOT_DIR / 'vercel.json').write_text(json.dumps(vercel, indent=2) + '\n', encoding='utf-8')
    print('Generated', len(list(OUT.rglob('*.html'))), 'pages; remote images in use:', uses_remote_images)


if __name__ == '__main__':
    build()
