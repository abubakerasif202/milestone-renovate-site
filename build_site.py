"""Static site generator for Milestone Renovate. Output goes to ./public (the Vercel output directory).

Run:  python build_site.py
"""
from datetime import date
from html import escape
from pathlib import Path
from xml.sax.saxutils import escape as xml_escape
import json
import subprocess
from site_experiences import (
    postcode_entry,
    platform_tools,
    studio_page,
    planner_page,
    CONCEPTS,
    concept_gallery,
    concept_page,
    trust_ribbon,
    booking_page,
    quote_audit_page,
    approvals_page,
)

ROOT_DIR = Path(__file__).parent
OUT = ROOT_DIR / 'public'
SITE = 'https://milestonerenovate.com'
PARENT = 'https://milestonedevelopment.com.au'
PHONE = '1800 008 883'
PHONE_HREF = 'tel:1800008883'
EMAIL = 'admin@milestonedevelopment.com.au'  # parent contact; approval for this brand still to be confirmed
OG_IMAGE = f'{SITE}/assets/brand/og-image.png'
PRIVACY_UPDATED = '2026-10-10'  # bump only when the privacy notice text actually changes (never use the build date)

# Approved concept assets: all image output is derived from the central manifest.
CONCEPT_MANIFEST = json.loads((ROOT_DIR / 'assets' / 'renovation-concepts.json').read_text(encoding='utf-8'))
CONCEPT_IMAGES = {image['id']: image for image in CONCEPT_MANIFEST['images']}
IMAGE_ALIASES = {
    'hero-home': 'living-hero', 'kitchen-after': 'kitchen', 'bathroom-after': 'bathroom',
    'whole-home-living': 'whole-home', 'extension-rear': 'extension',
    'inspo-materials': 'workspace', 'about-planning': 'workspace', 'inspo-entry': 'entrance',
    'inspo-bedroom': 'bedroom', 'inspo-outdoor': 'terrace',
}


def concept_image_data(key):
    image = CONCEPT_IMAGES[key]
    for variant in image['variants']:
        if not (OUT / variant['src'].lstrip('/')).is_file():
            raise FileNotFoundError(f"Missing approved image variant: {variant['src']}")
    return {
        'src': next(v['src'] for v in image['variants'] if v['width'] == 1024),
        'srcset': ', '.join(f"{v['src']} {v['width']}w" for v in image['variants']),
        'width': image['width'], 'height': image['height'], 'alt': image['alt'], 'id': image['id'],
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


# --- images: prefer local copies in public/assets/img, fall back to the parent's public repo -------------------
REMOTE_IMG = 'https://raw.githubusercontent.com/abubakerasif202/milestonedevelopment-site/main/public/assets/photography/{}.webp'
IMAGE_KEYS = ['hero-home', 'kitchen-after', 'bathroom-after', 'whole-home-living', 'extension-rear', 'compare-before', 'compare-after', 'inspo-materials', 'inspo-entry', 'inspo-outdoor', 'inspo-bedroom', 'about-planning']
uses_remote_images = False


IMG_DIMS = {'hero-home': (1254, 1254), 'inspo-materials': (1122, 1402), 'inspo-entry': (1122, 1402)}  # everything else is 1672x941
IMG_WIDTHS = (640, 1024, 1440)  # variants produced by scripts/make-responsive-images.mjs


def picture(key, alt, klass='', loading='lazy', sizes='100vw', priority=False):
    global uses_remote_images
    concept_key = IMAGE_ALIASES.get(key, key)
    if concept_key in CONCEPT_IMAGES:
        image = concept_image_data(concept_key)
        classes = f"{klass} concept-image concept-image-{image['id']}".strip()
        description = image['alt'] if alt else ''
        priority_attr = ' fetchpriority="high"' if priority else ''
        return f'<img class="{escape(classes, quote=True)}" src="{image["src"]}" srcset="{image["srcset"]}" sizes="{escape(sizes, quote=True)}" alt="{escape(description, quote=True)}" width="{image["width"]}" height="{image["height"]}" loading="{loading}" decoding="async"{priority_attr}>'
    local = (OUT / 'assets' / 'img' / f'{key}.webp').exists()
    w, h = IMG_DIMS.get(key, (1672, 941))
    if local:
        has_variants = all((OUT / 'assets' / 'img' / f'{key}-{n}.webp').exists() for n in IMG_WIDTHS)
        src, fallback = f'/assets/img/{key}.webp', ''
        srcset = ''
        if has_variants:
            variants = ', '.join(f'/assets/img/{key}-{n}.webp {n}w' for n in IMG_WIDTHS)
            srcset = f' srcset="{variants}, {src} {w}w" sizes="{sizes}"'
    else:
        uses_remote_images = True
        src = REMOTE_IMG.format(key)
        srcset = ''
        fallback = f''' referrerpolicy="no-referrer" data-fallback="/assets/fallback-{key}.svg"'''
    prio = ' fetchpriority="high"' if priority else ''
    return f'<img class="{klass}" src="{src}"{srcset} alt="{escape(alt)}" width="{w}" height="{h}" loading="{loading}" decoding="async"{prio}{fallback}>'


# --- shared chrome -----------------------------------------------------------------------------------------
NAV = [('Home', '/'), ('Services', '/services'), ('Our Approach', '/about'), ('Inspiration', '/inspiration'), ('Cost Planner', '/bathroom-renovation-cost'), ('Approvals', '/approvals-guide'), ('Design Studio', '/renovation-design-studio'), ('Contact', '/contact')]


def header(active=''):
    links = ''.join(f'<a href="{url}"' + (' aria-current="page"' if active == title else '') + f'>{title}</a>' for title, url in NAV)
    return f'''<a class="skip" href="#content">Skip to content</a><header class="header" id="header"><div class="wrap nav-inner"><a class="brand" href="/" aria-label="Milestone Renovate home"><img src="/assets/brand/logo-gold.svg" alt="Milestone Renovate" width="205" height="40"></a><nav class="nav" id="navigation" aria-label="Main navigation">{links}<a class="nav-cta" href="/plan-your-renovation">Plan your renovation</a><a class="nav-booking-link" href="/booking">Book 15-min call</a></nav><div class="nav-actions"><a class="call-top" href="{PHONE_HREF}">{PHONE}</a><a href="/booking" class="btn btn-small btn-gold">Book Call <span aria-hidden="true">↗</span></a><a href="/plan-your-renovation" class="btn btn-small btn-ruby">Plan your renovation <span aria-hidden="true">↗</span></a><button class="menu-toggle" type="button" aria-controls="navigation" aria-expanded="false" aria-label="Open navigation" data-menu><span></span><span></span></button></div></div></header>'''


def footer():
    return f'''<footer class="footer"><div class="wrap"><div class="footer-top"><div><p class="eyebrow">YOUR NEXT MILESTONE BEGINS HERE</p><h2>Let’s make space for<br><em>what comes next.</em></h2><div class="footer-cta-row"><a href="/plan-your-renovation" class="btn btn-ruby">Plan your renovation <span aria-hidden="true">↗</span></a><a href="/booking" class="btn btn-gold">Book 15-min call <span aria-hidden="true">↗</span></a></div></div><div class="footer-aside"><p>Thoughtful home renovations and extensions, connected to the expertise of Milestone Development.</p><a href="{PHONE_HREF}">{PHONE}</a><a href="mailto:{EMAIL}">{EMAIL}</a></div></div></div><div class="footer-bar"><div class="wrap footer-bottom"><a class="footer-brand" href="/" aria-label="Milestone Renovate home"><img src="/assets/brand/logo-gold.svg" alt="Milestone Renovate" width="168" height="33"></a><div class="footer-links"><a href="/services">Services</a><a href="/inspiration">Inspiration</a><a href="/bathroom-renovation-cost">Cost Planner</a><a href="/approvals-guide">Approvals Guide</a><a href="/renovation-design-studio">Design Studio</a><a href="/booking">Book Call</a><a href="/quote-audit">Quote Audit</a><a href="/about">About</a><a href="/privacy">Privacy</a><a href="{PARENT}" target="_blank" rel="noopener">Milestone Development ↗</a></div><small>© {date.today().year} Milestone Renovate. All rights reserved.</small></div></div></footer><div class="mobile-cta-bar" aria-label="Quick contact actions"><a href="{PHONE_HREF}" class="mobile-cta-btn mobile-cta-call"><span class="mobile-cta-icon">📞</span><span>Call 1800 008 883</span></a><a href="/booking" class="mobile-cta-btn mobile-cta-book"><span class="mobile-cta-icon">📅</span><span>Book 15-Min Call</span></a></div>'''



def head(title, description, slug, ldjson, scripts=(), noindex=False):
    url = SITE + ('/' + slug if slug else '/')
    t, d = escape(title, quote=True), escape(description, quote=True)
    mods = ''.join(f'<script type="module" src="/js/{s}"></script>' for s in scripts)
    robots = '<meta name="robots" content="noindex">' if noindex else ''
    return f'''<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#073E2B"><title>{escape(title)}</title><meta name="description" content="{d}">{robots}<link rel="canonical" href="{url}"><link rel="shortcut icon" href="/favicon.ico"><link rel="icon" href="/assets/brand/favicon-32.png" sizes="32x32" type="image/png"><link rel="icon" href="/assets/brand/icon-192.png" sizes="192x192" type="image/png"><link rel="apple-touch-icon" href="/assets/brand/apple-touch-icon.png"><link rel="manifest" href="/site.webmanifest"><meta property="og:locale" content="en_AU"><meta property="og:type" content="website"><meta property="og:site_name" content="Milestone Renovate"><meta property="og:title" content="{t}"><meta property="og:description" content="{d}"><meta property="og:url" content="{url}"><meta property="og:image" content="{OG_IMAGE}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Milestone Renovate gold architectural logo on forest green"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{t}"><meta name="twitter:description" content="{d}"><meta name="twitter:image" content="{OG_IMAGE}"><link rel="preload" href="/assets/fonts/inter-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="/assets/fonts/newsreader-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="/css/tokens.css"><link rel="stylesheet" href="/css/site.css"><link rel="stylesheet" href="/css/app.css"><link rel="stylesheet" href="/css/planning.css"><link rel="stylesheet" href="/css/concept-images.css"><script type="application/ld+json">{json.dumps(ldjson, ensure_ascii=False)}</script><script defer src="/js/site.js"></script>{mods}</head>'''


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
        'description': 'Thoughtful kitchen, bathroom, whole-home and extension renovations for Sydney residences.',
        'parentOrganization': {'@type': 'Organization', 'name': 'Milestone Development', 'url': PARENT + '/'},
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
    return {'@context': 'https://schema.org', '@graph': graph}


def shell(title, description, body, active='', slug='', home=False, crumbs=None, scripts=(), noindex=False, service_info=None):
    return head(title, description, slug, webpage_ld(title, description, slug, home, crumbs, service_info), scripts, noindex) + f'<body>{header(active)}<main id="content">{body}</main>{footer()}</body></html>'


def kicker(s):
    return f'<p class="eyebrow">{s}</p>'


def split_header(k, title, desc):
    return f'<div class="section-header"><div>{kicker(k)}<h2>{title}</h2></div><p>{desc}</p></div>'


def cta():
    return '''<section class="cta-strip"><div class="wrap cta-panel reveal"><div class="cta-grid-left"><p class="eyebrow">PLAN YOUR RENOVATION</p><h2>Have a space in mind?<br><em>Let’s explore the possibilities.</em></h2></div><div class="cta-grid-right"><p>Tell us what you’re planning. We’ll help you work through the first practical steps.</p><div class="cta-actions"><a class="btn btn-ruby" href="/plan-your-renovation">Plan your renovation <span aria-hidden="true">↗</span></a><a class="text-link" href="/contact">Speak to our team <span aria-hidden="true">↗</span></a></div></div></div></section>'''


# --- pages -------------------------------------------------------------------------------------------------
home = f'''<section class="hero"><div class="wrap hero-grid"><div class="hero-copy">{kicker('THE RENOVATION CHAPTER OF MILESTONE')}<h1>Space to live. <em>Room to become.</em></h1><p>Explore thoughtful kitchen, bathroom, whole-home and extension renovations, with practical guidance from the first idea to the next conversation.</p>{postcode_entry()}<div class="hero-buttons"><a class="text-link" href="/renovation-design-studio">Explore the Design Studio <span aria-hidden="true">↗</span></a></div><p class="hero-phone">Prefer to talk? Call <a href="{PHONE_HREF}">{PHONE}</a></p></div><div class="hero-media"><span class="hero-corner" aria-hidden="true"></span><div class="hero-media-inner">{picture('hero-home', 'AI-generated concept of a contemporary Australian home with timber cladding and a native garden', 'hero-image', 'eager', '(max-width:1020px) 92vw, 52vw', True)}</div><div class="hero-chip">01 / RENOVATION-LED THINKING<span>SYDNEY • NSW · AI-GENERATED CONCEPT</span></div></div></div></section>
<section class="ticker"><div class="wrap ticker-inner"><span>CONSIDERED DESIGN</span><i></i><span>SMARTER SPACES</span><i></i><span>QUALITY-FOCUSED DETAIL</span><i></i><span>PRACTICAL PLANNING</span></div></section>
{trust_ribbon()}
{platform_tools(picture)}
<section class="section intro"><div class="wrap intro-grid reveal"><div>{kicker('A HOME, REIMAGINED')}<h2>Not a new address.<br><em>A new perspective.</em></h2></div><div><p class="lead">Sometimes the home you love simply needs to evolve with you.</p><p>Milestone Renovate is a renovation-focused sister brand of Milestone Development. We bring the same thoughtful approach to planning and delivery into existing homes — reworking spaces, reconsidering layouts and elevating everyday living.</p><a class="text-link" href="/about">Discover our approach <span aria-hidden="true">↗</span></a></div></div></section>
<section class="section services-surface"><div class="wrap">{split_header('WHAT WE DO', 'Every space has <em>possibility.</em>', 'From one considered room to a home-wide transformation, start with what matters most to you.')}<div class="service-grid reveal"><a class="service-tile featured" href="/home-renovations">{picture('staircase', 'AI-generated concept of an architectural staircase and foyer', '', 'lazy', '(max-width:870px) 92vw, 34vw')}<div class="tile-overlay"><span class="service-number">01 / WHOLE HOME</span><h3>Whole-home<br>renovations</h3><span class="circle-arrow" aria-hidden="true">↗</span></div></a><a class="service-tile" href="/kitchen-renovations">{picture('kitchen-after', 'AI-generated concept of a light, renovated kitchen with stone and timber', '', 'lazy', '(max-width:870px) 92vw, 34vw')}<div class="tile-overlay"><span class="service-number">02 / KITCHENS</span><h3>Kitchen<br>renovations</h3><span class="circle-arrow" aria-hidden="true">↗</span></div></a><a class="service-tile" href="/bathroom-renovations">{picture('bathroom-after', 'AI-generated concept of a calm bathroom with a stone bath and sage tiles', '', 'lazy', '(max-width:870px) 92vw, 34vw')}<div class="tile-overlay"><span class="service-number">03 / BATHROOMS</span><h3>Bathroom<br>renovations</h3><span class="circle-arrow" aria-hidden="true">↗</span></div></a><a class="service-tile" href="/extensions">{picture('terrace', 'AI-generated concept of a sheltered harbour terrace', '', 'lazy', '(max-width:870px) 92vw, 68vw')}<div class="tile-overlay"><span class="service-number">04 / EXTENSIONS</span><h3>Extensions &amp;<br>additions</h3><span class="circle-arrow" aria-hidden="true">↗</span></div></a></div><p class="image-note">Images are AI-generated concept imagery for design discussion, not a portfolio of completed Milestone Renovate projects.</p><a class="text-link center-link" href="/services">All renovation services <span aria-hidden="true">↗</span></a></div></section>
<section class="section journey-section"><div class="wrap">{split_header('THE RENOVATION JOURNEY', 'From first idea <em>to next step.</em>', 'A simple, no-pressure path. You decide how much to share and when.')}<ol class="journey-list reveal"><li><span class="journey-num" aria-hidden="true">1</span><h3>Share your brief</h3><p>Use the guided questionnaire or the short contact form. Skip anything you are unsure about.</p></li><li><span class="journey-num" aria-hidden="true">2</span><h3>We review it</h3><p>Your enquiry is stored securely and passed to the Milestone team with a reference number.</p></li><li><span class="journey-num" aria-hidden="true">3</span><h3>Talk it through</h3><p>The team gets in touch to discuss your priorities, the space and the practical considerations.</p></li><li><span class="journey-num" aria-hidden="true">4</span><h3>Shape the next step</h3><p>Together, work out what a sensible next stage looks like for your home.</p></li></ol></div></section>
<section class="section compare-section"><div class="wrap">{split_header('SEE THE SHIFT', 'A different way <em>to read a home.</em>', 'Drag the handle, or use the arrow keys, to compare a dated kitchen with a reimagined concept.')}<figure class="compare reveal" data-compare><div class="compare-stage">{picture('compare-after', 'AI-generated concept of the renovated kitchen', 'compare-img', 'lazy', '(max-width:1100px) 92vw, 1100px')}<div class="compare-before" aria-hidden="true">{picture('compare-before', '', 'compare-img', 'lazy', '(max-width:1100px) 92vw, 1100px')}</div><span class="compare-tag t-before">Before (concept)</span><span class="compare-tag t-after">After (concept)</span><span class="compare-line" aria-hidden="true"><span class="compare-handle">⇄</span></span><input class="compare-range" type="range" min="0" max="100" value="50" step="1" aria-label="Comparison slider: drag to reveal the existing view or the reimagined concept"></div><figcaption><strong>Interactive demonstration.</strong> Both views are AI-generated concept images of the same room, not a completed project. Real before-and-after photography will replace them once approved project material is available.</figcaption></figure></div></section>
<section class="section philosophy"><div class="wrap philosophy-grid reveal"><div class="philosophy-media">{picture('about-planning', 'AI-generated concept of a planning table with plans, material samples and a scale model', '', 'lazy', '(max-width:870px) 92vw, 48vw')}<div class="media-stamp">DESIGN FOR<br><strong>EVERYDAY</strong><br>LIVING.</div></div><div class="philosophy-copy">{kicker('THE MILESTONE APPROACH')}<h2>Good renovations begin <em>before the first wall moves.</em></h2><p>We believe the best spaces are grounded in a real understanding of how you use them. That means asking the right questions, working through constraints, and keeping the big picture in view.</p><div class="principles"><div><b>01</b><div><h3>Understand first</h3><p>Your needs, your home, your budget priorities.</p></div></div><div><b>02</b><div><h3>Plan with purpose</h3><p>Layout, finishes and practical construction thinking.</p></div></div><div><b>03</b><div><h3>Deliver with care</h3><p>Attention to sequence, coordination and detail.</p></div></div></div><a class="text-link" href="/about">How we work <span aria-hidden="true">↗</span></a></div></div></section>
<section class="section inspirations"><div class="wrap">{split_header('LOOK CLOSER', 'A little inspiration.<br><em>A lot of possibility.</em>', 'A collection of architectural concepts and material ideas to help start a conversation about your space.')}<div class="inspo-grid reveal"><a href="/inspiration" class="inspo-card"><div class="frame">{picture('vanity', 'AI-generated concept of a marble double vanity', '', 'lazy', '(max-width:600px) 92vw, 36vw')}</div><span>01 / STONE &amp; DETAIL</span></a><a href="/inspiration" class="inspo-card"><div class="frame">{picture('inspo-entry', 'AI-generated concept of a timber front door with stone steps and native planting', '', 'lazy', '(max-width:600px) 92vw, 30vw')}</div><span>02 / A CONSIDERED ARRIVAL</span></a><a href="/inspiration" class="inspo-card"><div class="frame">{picture('inspo-bedroom', 'AI-generated concept of a calm main bedroom with a sage feature wall', '', 'lazy', '(max-width:600px) 92vw, 26vw')}</div><span>03 / QUIET RETREATS</span></a></div><p class="image-note">AI-generated concept imagery for design discussion only — not photographs of completed Milestone Renovate projects.</p></div></section>
<section class="section faq-section"><div class="wrap faq-grid"><div>{kicker('GOOD QUESTIONS, GOOD STARTS')}<h2>Wondering where<br><em>to begin?</em></h2><p>Every home is different. Here are a few starting points worth considering.</p></div><div class="faq-list"><details><summary>Can we renovate while living in the home?</summary><p>It depends on the scope. Some works can be staged while occupied, while significant renovation may require temporary arrangements. We can discuss practicality during planning.</p></details><details><summary>Do renovation projects require approvals?</summary><p>Some works may need council, strata or other approvals. Requirements depend on the location and nature of the work, especially structural or external changes.</p></details><details><summary>Can you help with planning and finishes?</summary><p>Yes, the enquiry process can start with your layout priorities, design preferences, material ideas and practical buildability questions.</p></details><details><summary>What should I prepare before getting in touch?</summary><p>Share your suburb, type of space, approximate budget and desired timeframe. Reference photos or a simple wish list can help start the conversation.</p></details></div></div></section>{cta()}'''

SERVICES = [
    ('Whole-home renovations', '/home-renovations', 'Rework how rooms connect, flow and function.'),
    ('Kitchen renovations', '/kitchen-renovations', 'Make everyday cooking, gathering and movement feel natural.'),
    ('Bathroom renovations', '/bathroom-renovations', 'Consider storage, finishes, comfort and practical detail.'),
    ('Extensions & additions', '/extensions', 'Explore possibilities for more space without losing the character of home.'),
]
services_html = ''.join(f'<a href="{u}" class="service-row"><span>0{i}</span><div><h3>{escape(t)}</h3><p>{d}</p></div><span class="service-row-arrow" aria-hidden="true">↗</span></a>' for i, (t, u, d) in enumerate(SERVICES, 1))
services = f'''<section class="inner-hero"><div class="wrap"><p class="eyebrow inverse">RENOVATION SERVICES</p><h1>Spaces made for <em>living.</em></h1><p>Whether you are changing one room or reshaping the way your entire home works, we start with your priorities.</p></div><div class="inner-hero-image">{picture('whole-home-living', 'AI-generated concept of an open-plan living area')}</div></section><section class="section"><div class="wrap">{split_header('WHAT WE CAN EXPLORE', 'Considered solutions<br><em>for your home.</em>', 'We’ll work through the design questions, practical realities and construction considerations of each project.')}<div class="services-list">{services_html}</div></div></section><section class="section surface-alt"><div class="wrap intro-grid"><div>{kicker('NOT JUST A NEW LOOK')}<h2>Better spaces, <em>better everyday moments.</em></h2></div><div><p class="lead">A renovation should feel right to live in, not only good to look at.</p><p>Thoughtful layouts, durable materials, daylight, storage and the relationship between rooms all influence how a home feels after the work is finished.</p><a class="text-link" href="/plan-your-renovation">Plan your renovation <span aria-hidden="true">↗</span></a></div></div></section>{cta()}'''

about = f'''<section class="inner-hero about-bg"><div class="wrap"><p class="eyebrow inverse">OUR STORY &amp; APPROACH</p><h1>Built on experience.<br><em>Made personal.</em></h1><p>Milestone Renovate brings the renovation conversation into focus — as a sister brand to Milestone Development.</p></div><div class="inner-hero-image">{picture('about-planning', 'AI-generated concept of a planning table with plans and material samples')}</div></section><section class="section"><div class="wrap intro-grid"><div>{kicker('ONE MILESTONE FAMILY')}<h2>A specialist focus.<br><em>A shared foundation.</em></h2></div><div><p class="lead">A good renovation balances the way a space looks with the way it needs to work.</p><p>As a sister website to Milestone Development, Milestone Renovate concentrates on existing homes: the opportunities, challenges and details that come with transforming familiar spaces.</p><p>We place practical planning alongside design intent so the next stage of your home feels considered from the beginning.</p><a class="text-link" href="{PARENT}" target="_blank" rel="noopener">Visit Milestone Development <span aria-hidden="true">↗</span></a></div></div></section><section class="section services-surface"><div class="wrap">{split_header('OUR PRINCIPLES', 'The thinking behind <em>every transformation.</em>', 'Simple values that shape the conversation from your initial enquiry onwards.')}<div class="value-grid"><article><span>01 / CLARITY</span><h3>Clear from the start.</h3><p>Understanding needs, priorities, constraints and next steps.</p></article><article><span>02 / CRAFT</span><h3>Details matter.</h3><p>Materials, construction sequence and finish should work as one.</p></article><article><span>03 / COLLABORATION</span><h3>Ideas in conversation.</h3><p>Good solutions come from listening and working through options together.</p></article></div></div></section><section class="section"><div class="wrap">{split_header('HOW AN ENQUIRY WORKS', 'From first idea <em>to next conversation.</em>', 'A simple, no-pressure start.')}<div class="value-grid"><article><span>STEP 01</span><h3>Share your brief.</h3><p>Use the guided questionnaire or the short contact form. Skip anything you are unsure about.</p></article><article><span>STEP 02</span><h3>We review it.</h3><p>Your enquiry is stored securely and passed to the Milestone team with your reference number.</p></article><article><span>STEP 03</span><h3>We get in touch.</h3><p>The team contacts you to talk through your priorities and the practical next steps.</p></article></div></div></section>{cta()}'''

GALLERY_FILTERS = [('all', 'All references'), ('arrival', 'Exteriors &amp; arrival'), ('living', 'Kitchens &amp; living'), ('retreat', 'Bathrooms &amp; bedrooms'), ('materials', 'Materials &amp; planning')]
gallery_items = [
        ('kitchen-after', 'Light kitchen with stone island and timber stools', 'Warmth in the details', 'living'),
    ('inspo-entry', 'Timber front door with stone steps and planting', 'A welcoming arrival', 'arrival'),
    ('bathroom-after', 'Calm bathroom with stone bath and sage tiles', 'A quiet start to the day', 'retreat'),
    ('inspo-outdoor', 'Kitchen and dining opening to an alfresco space', 'Indoor and out as one', 'living'),
    ('inspo-materials', 'Oak, stone and brass material samples', 'A palette that ages well', 'materials'),
    ('whole-home-living', 'Open-plan living area with terrace', 'Room to gather', 'living'),
    ('inspo-bedroom', 'Calm main bedroom with sage feature wall', 'A restful retreat', 'retreat'),
    ('extension-rear', 'Glazed rear extension to the garden', 'Space to grow', 'arrival'),
    ('about-planning', 'Material samples in a coastal design workspace', 'Planning before building', 'materials'),
    ('vanity', 'Sunlit marble double vanity', 'Stone, light and everyday detail', 'retreat'),
    ('staircase', 'Curved staircase in a light-filled foyer', 'A sculptural welcome', 'living'),
]
filter_bar = '<div class="filter-bar" role="group" aria-label="Filter design references" data-filter-bar>' + ''.join(f'<button class="filter-btn" type="button" data-filter="{k}" aria-pressed="{"true" if k == "all" else "false"}">{l}</button>' for k, l in GALLERY_FILTERS) + '</div><p class="sr-only" id="filter-status" role="status" aria-live="polite"></p>'
inspiration = f'''<section class="inner-hero"><div class="wrap"><p class="eyebrow inverse">DESIGN INSPIRATION</p><h1>Imagine the <em>possibilities.</em></h1><p>Ideas for light, texture, proportion and better flow. These are AI-generated concept references — not photographs of finished client projects.</p></div><div class="inner-hero-image">{picture('inspo-outdoor', 'AI-generated concept of a kitchen and dining area opening to an alfresco space', '', 'eager', '(max-width:870px) 100vw, 48vw', True)}</div></section><section class="section"><div class="wrap">{split_header('A VISUAL CONVERSATION', 'Details worth <em>exploring.</em>', 'Bring the ideas you like, and we can discuss how they might translate to your own home.')}{filter_bar}<div class="gallery-grid">''' + ''.join(f'<figure class="gallery-card reveal" data-category="{cat}"><div class="frame">{picture(im, alt, "", "lazy", "(max-width:600px) 92vw, (max-width:870px) 46vw, 30vw")}</div><figcaption><span>{i:02d} / DESIGN REFERENCE</span><h3>{name}</h3><small>AI-generated concept, not a completed project</small></figcaption></figure>' for i, (im, alt, name, cat) in enumerate(gallery_items, 1)) + '''</div><p class="image-note">All images are AI-generated concepts for design discussion only, not photographs or proof of completed renovations by Milestone Renovate.</p></div></section>''' + cta()

CATEGORY_OPTIONS = [('kitchen', 'Kitchen renovation'), ('bathroom', 'Bathroom renovation'), ('whole_home', 'Whole-home renovation'), ('extension', 'Extension or addition'), ('other', 'Something else')]
TIMELINE_OPTIONS = [('asap', 'As soon as practical'), ('3_6_months', 'In 3–6 months'), ('6_plus_months', 'In 6+ months'), ('exploring', 'Just exploring')]
BUDGET_OPTIONS = [('under_50k', 'Under $50,000'), ('50k_100k', '$50,000–$100,000'), ('100k_250k', '$100,000–$250,000'), ('250k_plus', '$250,000+'), ('discuss', 'Prefer to discuss')]


def options(pairs, blank=None):
    first = f'<option value="">{blank}</option>' if blank else ''
    return first + ''.join(f'<option value="{v}">{l}</option>' for v, l in pairs)


def field(name, label, control, hint='', wide=False):
    hint_html = f'<small class="hint" id="{name}-hint">{hint}</small>' if hint else ''
    return f'<div class="field{" wide" if wide else ""}"><label for="{name}">{label}</label>{control}{hint_html}<p class="field-error" id="{name}-error" role="alert" hidden></p></div>'


contact_form = f'''<form class="quote-form" id="quote-form" data-enquiry-form novalidate><h3>Your renovation brief</h3><p>Fields marked * are required.</p><div class="form-error-summary" id="form-error" role="alert" tabindex="-1" hidden></div><div class="field-grid">{field('name', 'Full name *', '<input id="name" name="name" autocomplete="name" required minlength="2" maxlength="120" aria-describedby="name-error">')}{field('phone', 'Phone *', '<input id="phone" name="phone" autocomplete="tel" type="tel" inputmode="tel" required maxlength="20" aria-describedby="phone-error">')}{field('email', 'Email *', '<input id="email" name="email" autocomplete="email" type="email" required maxlength="254" aria-describedby="email-error">')}{field('category', 'Project type *', f'<select id="category" name="category" required aria-describedby="category-error">{options(CATEGORY_OPTIONS, "Select a service")}</select>')}{field('suburb', 'Suburb', '<input id="suburb" name="suburb" autocomplete="address-level2" maxlength="80" aria-describedby="suburb-error">')}{field('postcode', 'Postcode', '<input id="postcode" name="postcode" autocomplete="postal-code" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" aria-describedby="postcode-error postcode-hint">', 'Suburb or postcode is required.')}{field('timeline', 'Preferred timeframe', f'<select id="timeline" name="timeline">{options(TIMELINE_OPTIONS, "Not sure yet")}</select>')}{field('budgetRange', 'Approximate budget (optional)', f'<select id="budgetRange" name="budgetRange">{options(BUDGET_OPTIONS, "Prefer to discuss")}</select>')}{field('details', 'Tell us about your project *', '<textarea id="details" name="details" rows="5" required minlength="10" maxlength="4000" aria-describedby="details-error" placeholder="Which spaces, what would you like to change, and any ideas you have so far?"></textarea>', wide=True)}</div><div class="hp-field" aria-hidden="true"><label>Leave this field empty<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div><div class="field consent-field"><label class="consent" for="consent"><input type="checkbox" id="consent" name="consent" required aria-describedby="consent-error"><span>I agree to Milestone Renovate contacting me about my enquiry and storing my details for that purpose, as described in the <a href="/privacy">privacy notice</a>. *</span></label><p class="field-error" id="consent-error" role="alert" hidden></p></div><button class="btn btn-dark form-submit" type="submit" data-submit>Send enquiry <span aria-hidden="true">↗</span></button><p class="form-status" id="form-status" role="status" aria-live="polite"></p><noscript><p class="form-error-summary">This form needs JavaScript. Please call <a href="{PHONE_HREF}">{PHONE}</a> instead.</p></noscript></form><div class="form-success" id="form-success" role="status" tabindex="-1" hidden><p class="eyebrow">ENQUIRY RECEIVED</p><h3>Thank you.</h3><p>Your enquiry has been stored securely and passed to the Milestone team. Your reference is <strong data-reference></strong>.</p><p class="fine-print">Please quote this reference if you call us on <a href="{PHONE_HREF}">{PHONE}</a>.</p></div>'''

contact = f'''<section class="inner-hero contact-bg"><div class="wrap"><p class="eyebrow inverse">START A CONVERSATION</p><h1>Tell us what you <em>have in mind.</em></h1><p>A few details will help the Milestone team understand your renovation idea and the next practical steps.</p></div></section><section class="section contact-section"><div class="wrap contact-grid"><div><p class="eyebrow">RENOVATION ENQUIRIES</p><h2>Great spaces begin<br><em>with a conversation.</em></h2><p>Whether you have a detailed plan or a rough idea, share what you know. Prefer a guided approach? Try the <a class="inline-link" href="/plan-your-renovation">renovation questionnaire</a>.</p><div class="contact-info"><span>PHONE</span><a href="{PHONE_HREF}">{PHONE}</a><span>EMAIL</span><a href="mailto:{EMAIL}">{EMAIL}</a><span>BASED IN</span><p>North Sydney, NSW (Milestone Development)</p></div><p class="fine-print">Your details are used only to respond to your enquiry. See the <a class="inline-link" href="/privacy">privacy notice</a>.</p></div><div>{contact_form}</div></div></section>'''

privacy = f'''<section class="inner-hero compact"><div class="wrap"><p class="eyebrow inverse">WEBSITE INFORMATION</p><h1>Privacy <em>notice.</em></h1></div></section><section class="section"><div class="wrap legal"><p class="fine-print">Last updated {PRIVACY_UPDATED}. This notice is a working draft and must be reviewed against the confirmed trading entity and legal advice before public launch.</p><h2>What we collect</h2><p>When you submit an enquiry we collect the details you enter: your name, phone number, email address, suburb and/or postcode, the type of renovation, optional budget and timing, your project notes and any questionnaire answers. We also record the time you agreed to be contacted, the page you submitted from, and a one-way hashed form of your IP address used only to limit abuse. We do not store your raw IP address.</p><h2>Why we collect it</h2><p>To respond to your enquiry, discuss your renovation and prepare any follow-up you request. We do not sell your information.</p><h2>Where it is stored and who sees it</h2><p>Enquiries are stored in a secured database hosted by Supabase, accessible only to authorised Milestone staff and our service providers. A notification email may be sent to the Milestone team through Resend so they can follow up. Our website is hosted on Vercel.</p><h2>Consent</h2><p>You must tick the consent box before an enquiry is accepted. You can ask us to correct or delete your enquiry at any time.</p><h2>Cookies and analytics</h2><p>This website does not currently use advertising cookies or analytics. Your browser may keep a temporary key in session storage so that retrying a failed submission does not create a duplicate enquiry.</p><h2>Images and fonts</h2><p>All images and fonts are served from this website. The images are AI-generated concept imagery, not photographs of completed projects.</p><h2>Contact us</h2><p>For privacy requests contact <a href="mailto:{EMAIL}">{EMAIL}</a> or call <a href="{PHONE_HREF}">{PHONE}</a>.</p></div></section>'''

# --- service detail pages ----------------------------------------------------------------------------------
pdetails = {
    'kitchen-renovations': {
        'name': 'Kitchen renovations',
        'lead': 'The heart of home,',
        'tail': 'reconsidered.',
        'desc': 'Reimagine how you cook, host, and live. We plan ergonomic workflows, bespoke architectural cabinetry, resilient stone surfaces, and refined lighting for Sydney homes.',
        'img': 'kitchen-after',
        'cat': 'kitchen',
        'intro_h2': 'Balancing Sydney living with culinary craft.',
        'intro_lead': 'A kitchen is the most demanding, heavily lived-in space in any Australian home.',
        'intro_p1': 'Whether adapting the compact footprint of an Eastern Suburbs Victorian terrace, opening up a North Shore Federation bungalow, or redesigning an open-plan living hub in the Hills, our design process starts with how your household moves and cooks.',
        'intro_p2': 'We integrate practical working zones—preparation, cooking, washing, and social hosting—ensuring cabinetry heights, aisle widths, appliance ventilation, and natural daylight work harmoniously.',
        'focus': [
            ('Layout & Movement', 'Carefully zoned workflows, generous island proportions, and intuitive transitions into living and outdoor dining spaces.'),
            ('Bespoke Cabinetry', 'Full-height joinery, concealed sculleries, integrated pantries, and premium soft-close drawer systems built for everyday durability.'),
            ('Materials & Lighting', 'Engineered quartz, quartzite, tactile timber veneers, and layered task-and-ambient architectural LED lighting.'),
        ],
        'technical': [
            ('Structural Load Paths', 'Assessing load-bearing wall removals with structural engineers to create open-plan dining and living sightlines.'),
            ('Electrical & 3-Phase Power', 'Reviewing main switchboard capacity for modern induction cooktops, dual pyrolytic ovens, and concealed rangehood ducting.'),
            ('Plumbing & Exhaust Runs', 'Planning waste stack relocations, water filtration lines, and external ducting paths that comply with Australian Standards.'),
        ],
        'tools': [
            ('Design Studio', '/renovation-design-studio', 'Explore materials, color palettes, and joinery aesthetics.'),
            ('Approvals Guide', '/approvals-guide', 'Check if internal layout alterations qualify as Exempt Development.'),
            ('15-Min Strategy Call', '/booking', 'Review preliminary layouts and budget priorities with an advisor.'),
        ],
    },
    'bathroom-renovations': {
        'name': 'Bathroom renovations',
        'lead': 'Sanctuary and routine,',
        'tail': 'crafted for longevity.',
        'desc': 'Explore a more considered bathroom balance: spatial efficiency, water management, custom vanities, and tactile materials designed for everyday serenity.',
        'img': 'bathroom-after',
        'cat': 'bathroom',
        'intro_h2': 'Serenity engineered with rigorous technical detail.',
        'intro_lead': 'A successful bathroom renovation blends restorative luxury with exacting wet-area construction.',
        'intro_p1': 'From heritage Inner West terrace bathrooms with tight footprints to expansive North Shore ensuites, spatial proportion and waterproofing integrity are paramount. We carefully design falls to waste, recessed shower niches, and in-wall cisterns to maximize usable space.',
        'intro_p2': 'Every detail is planned in advance—from AS 3740 waterproofing membranes and acoustic waste isolation to balanced ventilation that prevents moisture build-up and preserves pristine tile and stone surfaces.',
        'focus': [
            ('Spatial Flow & Wet Areas', 'Walk-in frameless showers, freestanding stone baths, and wall-hung fixtures that elevate visual scale and simplify cleaning.'),
            ('Custom Joinery & Storage', 'Bespoke timber and polyurethane vanities, recessed mirrored shaving cabinets, and integrated charging drawers.'),
            ('Surfaces & Tapware', 'Large-format porcelain slabs, fluted feature tiles, brushed brass or gunmetal tapware, and heated towel elements.'),
        ],
        'technical': [
            ('Waterproofing to AS 3740', 'Dual-layer membrane systems, bonded screed drainage falls, and compliant perimeter leak-stop flanges for complete peace of mind.'),
            ('In-Wall Framework & Services', 'Precision nogging and studwork for wall-hung basins, concealed cisterns, and thermostatic mixer bodies.'),
            ('Subfloor & Acoustic Isolation', 'Structural subfloor verification, acoustic lagging on PVC waste pipes, and quiet mechanical exhaust ventilation.'),
        ],
        'tools': [
            ('Bathroom Cost Planner', '/bathroom-renovation-cost', 'Explore scope drivers, fixtures, and layout complexities.'),
            ('Design Studio', '/renovation-design-studio', 'Compare 6 photographed bathroom style directions and palettes.'),
            ('Approvals Guide', '/approvals-guide', 'Confirm internal wet-area renovation planning guidelines.'),
        ],
    },
    'home-renovations': {
        'name': 'Whole-home renovations',
        'lead': 'Make your home feel',
        'tail': 'new again.',
        'desc': 'Reconsider the relationship between rooms, improve daily flow, and explore the latent potential waiting within your existing architectural footprint.',
        'img': 'whole-home-living',
        'cat': 'whole_home',
        'intro_h2': 'Harmonizing existing character with contemporary living.',
        'intro_lead': 'Whole-home renovations allow you to preserve the soul of your residence while completely transforming how it lives.',
        'intro_p1': 'Many classic Sydney residences suffer from disjointed room layouts, dark internal hallways, and disconnected rear gardens. Rather than knocking down and starting over, our approach unifies floor levels, aligns sightlines, and brings natural light deep into the home.',
        'intro_p2': 'We balance the delicate restoration of original heritage mouldings, cornices, and fireplaces with high-performance double glazing, continuous timber flooring, and zoned ducted climate control for year-round comfort.',
        'focus': [
            ('Cohesive Spatial Planning', 'Eliminating awkward pinch points, opening hallways to natural light, and creating purposeful connections between living zones.'),
            ('Architectural Continuity', 'Respecting original period character in heritage zones while delivering refined, contemporary interiors.'),
            ('Envelope & Climate Comfort', 'Upgrading ceiling insulation, subfloor ventilation, double-glazed windows, and multi-zone HVAC systems.'),
        ],
        'technical': [
            ('Comprehensive Structural Review', 'Detailed engineering inspection of existing load-bearing walls, foundations, roof trusses, and subfloor timbers.'),
            ('Electrical & Data Backbone', 'Complete switchboard modernisation, whole-home smart lighting, structured Cat6 cabling, and future-proofed EV conduits.'),
            ('Staging & Logistics Planning', 'Evaluating construction sequencing, site hoarding, and whether works can be staged or require temporary relocation.'),
        ],
        'tools': [
            ('Quote & Scope Audit', '/quote-audit', 'Have existing renovation quotes reviewed for missing allowances.'),
            ('Approvals Guide', '/approvals-guide', 'Check CDC vs Council DA requirements for structural alterations.'),
            ('15-Min Strategy Call', '/booking', 'Discuss feasibility, architectural vision, and approximate timeframes.'),
        ],
    },
    'extensions': {
        'name': 'Extensions & additions',
        'lead': 'More space for',
        'tail': 'what matters.',
        'desc': 'Explore ways to expand your home while respecting its architectural identity, neighborhood character, and your family’s future living requirements.',
        'img': 'extension-rear',
        'cat': 'extension',
        'intro_h2': 'Expanding your footprint with architectural intent.',
        'intro_lead': 'An extension should feel like a natural evolution of your home, not an awkward afterthought.',
        'intro_p1': 'Whether you require an expansive open-plan ground floor rear addition opening to a level lawn, or a second-storey addition creating a private parents’ retreat, our team focuses on architectural cohesion and structural integrity.',
        'intro_p2': 'We guide you through the regulatory landscape across Sydney councils—navigating Complying Development (CDC) fast-track criteria under the NSW Housing SEPP, or preparing rigorous Development Applications (DA) where heritage or site constraints require it.',
        'focus': [
            ('Ground-Floor Garden Living', 'Expansive pavilion extensions featuring floor-to-ceiling glass sliding doors, sheltered alfresco decks, and seamless level thresholds.'),
            ('First-Floor Master Suites', 'Thoughtfully engineered second-storey additions capturing district breezes and views without overshadowing neighbours.'),
            ('Roofline & Material Harmony', 'Carefully resolved roof junctions, cladding transitions, and complementary masonry matching your original home.'),
        ],
        'technical': [
            ('CDC vs Council DA Strategy', 'Assessing lot size, boundary setbacks, building height plane, and site coverage against NSW Housing Code benchmarks.'),
            ('Civil & Stormwater Drainage', 'Designing on-site stormwater detention (OSD), rainwater harvesting, and overland flow path management.'),
            ('Boundary & Footing Engineering', 'Deep piering, underpinning existing foundations, and acoustic party-wall construction for boundary developments.'),
        ],
        'tools': [
            ('Approvals Checker', '/approvals-guide', 'Evaluate your property against 20-day CDC fast-track rules.'),
            ('Quote & Scope Audit', '/quote-audit', 'Verify certifier allowances, engineering, and civil costs in builder quotes.'),
            ('15-Min Strategy Call', '/booking', 'Review site plans, setback constraints, and feasibility.'),
        ],
    },
}

SERVICE_META = {
    'kitchen-renovations': 'Kitchen renovations in Sydney: plan layout, cabinetry, storage, lighting and finishes with Milestone Renovate, sister brand of Milestone Development.',
    'bathroom-renovations': 'Bathroom renovations in Sydney: plan space, storage, fixtures, waterproofing and finishes with Milestone Renovate, sister brand of Milestone Development.',
    'home-renovations': 'Whole-home renovations in Sydney: rework flow, living spaces and finishes with practical planning from Milestone Renovate.',
    'extensions': 'Home extensions and additions in Sydney: explore more space that respects your existing home with Milestone Renovate, sister brand of Milestone Development.',
}

# --- planning questionnaire --------------------------------------------------------------------------------
CHOICES = {
    'category': [('kitchen', 'Kitchen', 'Layout, cabinetry, benchtops and appliances'), ('bathroom', 'Bathroom', 'Tiling, fixtures, waterproofing and layout'), ('whole_home', 'Whole home', 'Several rooms, flow and finishes'), ('extension', 'Extension or addition', 'More space for your household'), ('other', 'Something else', 'Tell us about it in the notes')],
    'propertyType': [('house', 'House', ''), ('townhouse', 'Townhouse', ''), ('apartment', 'Apartment', ''), ('strata_unit', 'Strata unit', 'Body corporate rules may apply'), ('other', 'Other', '')],
    'layoutChange': [('none', 'Keep the current layout', ''), ('minor', 'Minor adjustments', ''), ('major', 'Major layout change', ''), ('not_sure', 'Not sure yet', '')],
    'roomSize': [('small', 'Compact', ''), ('medium', 'Average', ''), ('large', 'Generous', ''), ('not_sure', 'Not sure', '')],
    'finishLevel': [('essential', 'Essential and practical', 'Durable, straightforward finishes'), ('mid_range', 'Mid-range', 'A balance of quality and value'), ('premium', 'Premium and bespoke', 'Custom detail and high-end materials'), ('not_sure', 'Not sure yet', '')],
}
SCOPE_LABELS = {'new_layout': 'Change the layout', 'new_cabinetry': 'New cabinetry', 'new_benchtops': 'New benchtops', 'new_appliances': 'New appliances', 'relocate_plumbing': 'Move plumbing', 'new_tiling': 'New tiling', 'new_fixtures': 'New fixtures and fittings', 'waterproofing': 'Waterproofing', 'walk_in_shower': 'Walk-in shower', 'accessibility': 'Accessibility features', 'structural_changes': 'Structural changes', 'new_flooring': 'New flooring', 'painting': 'Painting', 'lighting_electrical': 'Lighting and electrical', 'single_storey_extension': 'Single-storey extension', 'second_storey': 'Second storey', 'open_plan': 'Open-plan living', 'outdoor_connection': 'Connection to outdoors'}
SCOPE_BY_CATEGORY = {
    'kitchen': ['new_layout', 'new_cabinetry', 'new_benchtops', 'new_appliances', 'relocate_plumbing', 'new_flooring', 'lighting_electrical', 'structural_changes'],
    'bathroom': ['new_layout', 'new_tiling', 'new_fixtures', 'waterproofing', 'walk_in_shower', 'accessibility', 'relocate_plumbing'],
    'whole_home': ['open_plan', 'new_layout', 'new_flooring', 'painting', 'lighting_electrical', 'structural_changes'],
    'extension': ['single_storey_extension', 'second_storey', 'open_plan', 'outdoor_connection', 'structural_changes'],
    'other': ['new_layout', 'new_flooring', 'painting', 'lighting_electrical', 'accessibility'],
}


def choice(kind, name, value, label, desc=''):
    d = f'<small>{desc}</small>' if desc else ''
    return f'<label class="choice"><input type="{kind}" name="{name}" value="{value}"><span class="choice-body"><b>{label}</b>{d}</span></label>'


def choices(kind, name):
    return ''.join(choice(kind, name, v, l, d) for v, l, d in CHOICES[name])


def step(step_id, title, inner, optional=False):
    opt = '<span class="optional">Optional</span>' if optional else ''
    return f'<fieldset class="wizard-step" data-step="{step_id}"><legend tabindex="-1">{title}{opt}</legend>{inner}<p class="field-error" id="{step_id}-error" role="alert" hidden></p></fieldset>'


scope_groups = ''.join(
    f'<div class="choice-grid" data-scope-for="{cat}" hidden>' + ''.join(choice('checkbox', 'scope', s, SCOPE_LABELS[s]) for s in scopes) + '</div>'
    for cat, scopes in SCOPE_BY_CATEGORY.items()
)

wizard_steps = ''.join([
    step('category', 'What are you planning to renovate?', f'<div class="choice-grid">{choices("radio", "category")}</div>'),
    step('location', 'Where is the property?', f'''<div class="field-grid">{field('suburb', 'Suburb', '<input id="suburb" name="suburb" autocomplete="address-level2" maxlength="80">')}{field('postcode', 'Postcode', '<input id="postcode" name="postcode" autocomplete="postal-code" inputmode="numeric" maxlength="4">', 'Suburb or postcode is required.')}</div>'''),
    step('property', 'What type of property is it?', f'<div class="choice-grid">{choices("radio", "propertyType")}</div>', True),
    step('scope', 'What changes are you considering?', f'<p class="step-hint">Select anything that applies.</p>{scope_groups}<p class="subhead">How much would the layout change?</p><div class="choice-grid">{choices("radio", "layoutChange")}</div>', True),
    step('size', 'Roughly how big is the space?', f'<div class="choice-grid">{choices("radio", "roomSize")}</div>', True),
    step('finish', 'What design and finish level suits you?', f'<div class="choice-grid">{choices("radio", "finishLevel")}</div>', True),
    step('budget', 'Budget and timing', f'''<div class="field-grid">{field('budgetRange', 'Approximate budget', f'<select id="budgetRange" name="budgetRange">{options(BUDGET_OPTIONS, "Prefer to discuss")}</select>')}{field('timeline', 'Preferred timeframe', f'<select id="timeline" name="timeline">{options(TIMELINE_OPTIONS, "Not sure yet")}</select>')}</div><p class="fine-print">A budget range helps us suggest practical options. It is never a quote or commitment.</p>''', True),
    step('notes', 'Anything else we should know?', f'''{field('details', 'Project notes', '<textarea id="details" name="details" rows="5" maxlength="4000" placeholder="Ideas, must-haves, constraints, access or anything else useful."></textarea>', wide=True)}<p class="fine-print">Please do not include sensitive information such as payment details.</p>''', True),
    step('contact', 'How can we reach you?', f'''<div class="field-grid">{field('name', 'Full name *', '<input id="name" name="name" autocomplete="name" maxlength="120">')}{field('phone', 'Phone *', '<input id="phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="20">')}{field('email', 'Email *', '<input id="email" name="email" type="email" autocomplete="email" maxlength="254">', wide=True)}</div><div class="hp-field" aria-hidden="true"><label>Leave this field empty<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div><div class="field consent-field"><label class="consent" for="consent"><input type="checkbox" id="consent" name="consent"><span>I agree to Milestone Renovate contacting me about my enquiry and storing my details for that purpose, as described in the <a href="/privacy">privacy notice</a>. *</span></label><p class="field-error" id="consent-error" role="alert" hidden></p></div>'''),
])

plan = f'''<section class="inner-hero compact"><div class="wrap"><p class="eyebrow inverse">PLAN YOUR RENOVATION</p><h1>Let’s shape your <em>brief.</em></h1><p>Nine short steps. Skip anything you are unsure about — you can always discuss it with the team.</p></div></section><section class="section wizard-section"><div class="wrap wizard-wrap"><form class="wizard" id="wizard" data-wizard novalidate><div class="wizard-head"><p class="wizard-step-label" id="wizard-step-label" aria-live="polite">Step 1 of 9</p><progress id="wizard-progress" max="9" value="1" aria-labelledby="wizard-step-label"></progress></div><div class="form-error-summary" id="form-error" role="alert" tabindex="-1" hidden></div>{wizard_steps}<div class="wizard-actions"><button class="btn btn-outline" type="button" data-back>Back</button><button class="btn btn-dark" type="button" data-next>Continue <span aria-hidden="true">→</span></button><button class="btn btn-dark" type="submit" data-submit>Send my brief <span aria-hidden="true">↗</span></button></div><p class="form-status" id="form-status" role="status" aria-live="polite"></p><noscript><p class="form-error-summary">This questionnaire needs JavaScript. Please use the <a href="/contact">contact form</a> or call <a href="{PHONE_HREF}">{PHONE}</a>.</p></noscript></form><div class="form-success" id="form-success" role="status" tabindex="-1" hidden><p class="eyebrow">BRIEF RECEIVED</p><h2>Thank you — we have your brief.</h2><p>Your enquiry has been stored securely and passed to the Milestone team. Your reference is <strong data-reference></strong>.</p><p>The team will be in touch to talk through your priorities and next steps. Please quote this reference if you call us on <a href="{PHONE_HREF}">{PHONE}</a>.</p><a class="btn btn-dark" href="/">Back to home <span aria-hidden="true">↗</span></a></div></div></section>'''

# --- interactive planning experiences ---------------------------------------------------------------------
calculator = planner_page(field)
studio = studio_page({room: concept_image_data(key) for room, key in [('bathroom', 'bathroom'), ('kitchen', 'kitchen'), ('living', 'whole-home'), ('workspace', 'workspace')]}, bathroom_style_imagery())
booking = booking_page(field)
quote_audit = quote_audit_page(field)
approvals = approvals_page()

not_found = '''<section class="inner-hero compact"><div class="wrap"><p class="eyebrow inverse">PAGE NOT FOUND</p><h1>That page has <em>moved.</em></h1><p>Try the links below, or call us.</p><a class="btn btn-ruby" href="/">Back to home <span aria-hidden="true">↗</span></a></div></section>'''


# --- write everything ---------------------------------------------------------------------------------------
def write(name, content):
    (OUT / name).write_text(content, encoding='utf-8')


def build():
    OUT.mkdir(exist_ok=True)
    for slug, d in pdetails.items():
        service = d['name']
        lead, tail = d['lead'], d['tail']
        desc = d['desc']
        img = d['img']
        cat = d['cat']
        seo_title = f"{service} Sydney | Milestone Renovate"
        seo_desc = SERVICE_META[slug]

        focus_cards = ''.join(
            f'<article><span>0{i} / ARCHITECTURAL FOCUS</span><h3>{escape(title)}</h3><p>{escape(text)}</p></article>'
            for i, (title, text) in enumerate(d['focus'], 1)
        )
        tech_cards = ''.join(
            f'<article><span>0{i} / PLANNING &amp; SITE REALITY</span><h3>{escape(title)}</h3><p>{escape(text)}</p></article>'
            for i, (title, text) in enumerate(d['technical'], 1)
        )
        tools_html = ''.join(
            f'<a class="platform-card" href="{url}"><span class="platform-card-badge">INTERACTIVE PLANNING</span><h3>{escape(label)}</h3><p>{escape(summary)}</p><span class="platform-card-cta">Explore tool <span aria-hidden="true">↗</span></span></a>'
            for label, url, summary in d['tools']
        )

        detail = f'''<section class="inner-hero"><div class="wrap"><p class="eyebrow inverse">MILESTONE RENOVATE / SERVICES</p><h1>{lead}<br><em>{tail}</em></h1><p>{desc}</p><div class="hero-buttons"><a class="btn btn-ruby" href="/plan-your-renovation?category={cat}">Plan this renovation <span aria-hidden="true">↗</span></a><a class="btn btn-gold" href="/booking">Book 15-min call <span aria-hidden="true">↗</span></a></div></div><div class="inner-hero-image">{picture(img, 'AI-generated ' + service.lower() + ' concept image', loading='eager', sizes='(max-width:870px) 100vw, 48vw')}</div></section>
<section class="section"><div class="wrap intro-grid"><div>{kicker(escape(service.upper()))}<h2>{d['intro_h2']}</h2></div><div><p class="lead">{d['intro_lead']}</p><p>{d['intro_p1']}</p><p>{d['intro_p2']}</p><a class="text-link" href="/plan-your-renovation?category={cat}">Start your renovation brief <span aria-hidden="true">↗</span></a></div></div></section>
<section class="section services-surface"><div class="wrap">{split_header('ARCHITECTURAL PRINCIPLES', 'Designed for how<br><em>you live every day.</em>', 'Every space is shaped around natural light, spatial proportion, and functional longevity.')}<div class="value-grid">{focus_cards}</div><p class="image-note">All imagery on this page is AI-generated concept imagery for design discussion, not completed project photography.</p></div></section>
<section class="section"><div class="wrap">{split_header('TECHNICAL &amp; PLANNING RIGOUR', 'Practical execution<br><em>before work begins.</em>', 'Early engineering, service planning, and statutory clarity protect your renovation budget.')}<div class="value-grid">{tech_cards}</div></div></section>
<section class="section surface-alt"><div class="wrap">{split_header('PLANNING SUITE', 'Explore our interactive<br><em>renovation tools.</em>', 'Clarity at every stage: test styles, check planning pathways, and audit builder scopes.')}<div class="platform-tools">{tools_html}</div></div></section>{cta()}'''

        write(slug + '.html', shell(seo_title, seo_desc, detail, 'Services', slug, crumbs=[('Home', '/'), ('Services', '/services'), (service, '/' + slug)], service_info={'name': service, 'category': cat}))

    pages = [
        ('index.html', 'Milestone Renovate | Thoughtful Home Renovations Sydney', 'Thoughtful kitchen, bathroom, whole-home and extension renovations for Sydney homes, from Milestone Renovate, sister brand of Milestone Development.', home, 'Home', '', dict(home=True, scripts=['interactions.js', 'postcode-entry.js'])),
        ('services.html', 'Home Renovation Services Sydney | Milestone Renovate', 'Explore whole-home renovations, kitchens, bathrooms, and extensions with Milestone Renovate in Sydney.', services, 'Services', 'services', dict(crumbs=[('Home', '/'), ('Services', '/services')])),
        ('about.html', 'About Milestone Renovate | Our Renovation Approach', 'Meet Milestone Renovate, the renovation-focused sister brand of Milestone Development, and explore our thoughtful approach.', about, 'Our Approach', 'about', dict(crumbs=[('Home', '/'), ('Our Approach', '/about')])),
        ('inspiration.html', 'Renovation Inspiration & Concepts | Milestone Renovate', 'Explore AI-generated architectural design references and renovation ideas for Sydney homes.', inspiration + concept_gallery(picture), 'Inspiration', 'inspiration', dict(crumbs=[('Home', '/'), ('Inspiration', '/inspiration')], scripts=['interactions.js'])),
        ('contact.html', 'Renovation Enquiries | Milestone Renovate', 'Speak with Milestone Renovate about home renovations, kitchens, bathrooms and extensions. Send a short enquiry or call 1800 008 883.', contact, 'Contact', 'contact', dict(crumbs=[('Home', '/'), ('Contact', '/contact')], scripts=['enquiry-form.js'])),
        ('privacy.html', 'Privacy Notice | Milestone Renovate', 'How Milestone Renovate collects, stores and uses the details you share when you make a renovation enquiry.', privacy, '', 'privacy', dict(crumbs=[('Home', '/'), ('Privacy', '/privacy')])),
        ('plan-your-renovation.html', 'Plan Your Renovation | Guided Brief | Milestone Renovate', 'Answer a few short questions about your kitchen, bathroom, whole-home or extension renovation and share your brief with the Milestone Renovate team.', plan, '', 'plan-your-renovation', dict(crumbs=[('Home', '/'), ('Plan Your Renovation', '/plan-your-renovation')], scripts=['wizard-ui.js'])),
        ('bathroom-renovation-cost.html', 'Bathroom Renovation Cost Planner | Milestone Renovate', 'Explore bathroom renovation scope in Sydney. Compare layouts, finishes and site considerations before a site assessment. Planning guidance, not a quote.', calculator, 'Cost Planner', 'bathroom-renovation-cost', dict(crumbs=[('Home', '/'), ('Bathroom Cost Planner', '/bathroom-renovation-cost')], scripts=['calculator-ui.js'])),
        ('booking.html', 'Book a 15-Minute Strategy Call | Milestone Renovate', 'Schedule a complimentary 15-minute phone strategy session with a senior Milestone renovation consultant. Review plans, costs and approvals.', booking, '', 'booking', dict(crumbs=[('Home', '/'), ('Book Consultation', '/booking')], scripts=['booking-ui.js'])),
        ('quote-audit.html', 'Complimentary Renovation Quote & Scope Audit | Milestone Renovate', 'Have an existing builder quote reviewed by Sydney construction estimators. Uncover prime cost allowances, omitted certifier allowances, and scope gaps.', quote_audit, '', 'quote-audit', dict(crumbs=[('Home', '/'), ('Quote Audit', '/quote-audit')], scripts=['quote-audit-ui.js'])),
        ('approvals-guide.html', 'NSW Council DA vs CDC Approvals Checker | Milestone Renovate', 'Check if your Sydney renovation qualifies for fast-track 20-day Complying Development (CDC) or requires a Council DA under NSW Housing Code.', approvals, 'Approvals', 'approvals-guide', dict(crumbs=[('Home', '/'), ('Approvals Guide', '/approvals-guide')], scripts=['approvals-checker.js'])),
    ]
    pages.append(('renovation-design-studio.html', 'Renovation Design Studio Sydney | Milestone Renovate', 'Create a visual renovation moodboard for your Sydney bathroom, kitchen or living space. Explore materials, colours and layout priorities, then share your brief.', studio, 'Design Studio', 'renovation-design-studio', dict(crumbs=[('Home', '/'), ('Design Studio', '/renovation-design-studio')], scripts=['design-studio.js'])))
    for concept in CONCEPTS:
        slug = 'concepts/' + concept['slug']
        (OUT / 'concepts').mkdir(exist_ok=True)
        pages.append((slug + '.html', concept['title'] + ' | Renovation Concept | Milestone Renovate', 'Explore this AI-generated renovation concept, its design direction and material ideas. A discussion reference, not a completed Milestone Renovate project.', concept_page(concept, picture), 'Inspiration', slug, dict(crumbs=[('Home', '/'), ('Inspiration', '/inspiration'), (concept['title'], '/' + slug)])))
    for filename, title, desc, content, active, slug, kw in pages:
        write(filename, shell(title, desc, content, active, slug, **kw))
    write('404.html', shell('Page not found | Milestone Renovate', 'The page you were looking for could not be found.', not_found, noindex=True, slug='404'))

    write('robots.txt', f'User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: {SITE}/sitemap.xml\n')

    # Truthful modification dates reflecting actual substantive content revisions.
    # Pages that have not undergone substantive content changes retain their original revision date,
    # preventing false lastmod refresh when build scripts are modified.
    PAGE_LASTMOD = {
        '': '2026-10-12',
        'services': '2026-10-10',
        'about': '2026-10-10',
        'inspiration': '2026-10-11',
        'contact': '2026-10-10',
        'privacy': '2026-10-10',
        'plan-your-renovation': '2026-10-10',
        'bathroom-renovation-cost': '2026-10-12',
        'booking': '2026-10-12',
        'quote-audit': '2026-10-12',
        'approvals-guide': '2026-10-12',
        'renovation-design-studio': '2026-10-11',
        'kitchen-renovations': '2026-10-12',
        'bathroom-renovations': '2026-10-12',
        'home-renovations': '2026-10-12',
        'extensions': '2026-10-12',
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
        'redirects': [{'source': '/:path*', 'has': [{'type': 'host', 'value': 'www.milestonerenovate.com'}], 'destination': 'https://milestonerenovate.com/:path*', 'permanent': True}],
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
