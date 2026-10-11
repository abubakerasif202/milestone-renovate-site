"""Server-rendered planning experiences and truthful, extensible concept records."""
from html import escape
from typing import Callable, TypedDict
import json


class ConceptRecord(TypedDict):
    slug: str
    title: str
    category: str
    image: str
    scope: str
    approach: str
    materials: str
    before: str | None
    after: str | None
    status: str
    suburb: str | None


def postcode_entry() -> str:
    return '''<form class="postcode-entry" action="/plan-your-renovation" method="get" data-postcode-entry><label for="planning-postcode">Where is your renovation?</label><div class="postcode-start"><input id="planning-postcode" name="postcode" autocomplete="postal-code" inputmode="numeric" pattern="[0-9]{4}" minlength="4" maxlength="4" placeholder="Your postcode" aria-describedby="postcode-note postcode-error" required><button class="btn btn-ruby" type="submit">Start my plan <span aria-hidden="true">↗</span></button></div><p id="postcode-error" class="field-error" role="alert" hidden></p><p id="postcode-note" class="fine-print">Start with your location. No contact details needed to explore.</p></form>'''


def platform_tools(picture: Callable[..., str]) -> str:
    return f'''<section class="section platform-intro"><div class="wrap"><div class="section-header"><div><p class="eyebrow">YOUR HOME. YOUR POSSIBILITIES.</p><h2>A clearer picture.<br><em>A considered plan.</em></h2></div><p>Explore a design direction, understand your bathroom scope, then bring the details together in one useful brief. Start wherever you feel ready.</p></div><div class="platform-tools"><a class="platform-card" href="/renovation-design-studio"><div class="frame">{picture('inspo-materials', 'AI-generated concept of timber, stone and brass material samples', sizes='(max-width:768px) 90vw, 42vw')}</div><div><span class="eyebrow">01 / DESIGN STUDIO</span><h3>Find the feeling<br><em>of home.</em></h3><p>Build a visual moodboard with colours, materials, lighting and practical priorities.</p><span class="text-link">Create your design direction ↗</span><small>Interactive moodboard · concept references</small></div></a><a class="platform-card" href="/bathroom-renovation-cost"><div class="frame">{picture('vanity', 'AI-generated bathroom concept with a marble double vanity', sizes='(max-width:768px) 90vw, 42vw')}</div><div><span class="eyebrow">02 / BATHROOM PLANNER</span><h3>Understand the<br><em>moving parts.</em></h3><p>Compare scope choices, see practical considerations and prepare for a site assessment.</p><span class="text-link">Explore your bathroom scope ↗</span><small>Scope planning · no unapproved prices</small></div></a></div><div class="planning-index"><span>03 / BRING IT TOGETHER</span><p>Already know what matters? Turn your ideas into a renovation brief.</p><a class="text-link" href="/plan-your-renovation">Plan your renovation ↗</a></div></div></section>'''


def studio_page(imagery: dict[str, dict]) -> str:
    image_data = escape(json.dumps(imagery), quote=True)
    return f'''<section class="inner-hero compact"><div class="wrap"><p class="eyebrow">SYDNEY RENOVATION DESIGN STUDIO</p><h1>A space that feels<br><em>like you.</em></h1><p>Explore colours, textures and the way you want to live. Create a personal design direction for your bathroom, kitchen or living space.</p></div></section><section class="section studio-section"><div class="wrap"><div class="planning-banner"><b>Your visual moodboard.</b> This studio combines your selections with existing concept references. It does not generate a new image or a measured design. All imagery is labelled AI-generated concept imagery, not completed Milestone work.</div><section data-design-studio data-studio-imagery="{image_data}" aria-label="Interactive renovation design studio"><div data-studio-app></div><p data-studio-status role="status" aria-live="polite"></p><noscript><p>The interactive studio needs JavaScript. Explore the design directions below or <a class="inline-link" href="/contact">speak with our team</a>.</p></noscript></section></div></section><section class="section surface-alt"><div class="wrap intro-grid"><div><p class="eyebrow">A DIRECTION, NOT A SPECIFICATION</p><h2>Beautiful ideas.<br><em>Practical questions.</em></h2></div><div><p>Explore Contemporary Australian, warm minimalism, modern luxury, Scandinavian, Mediterranean-inspired, timeless classic, natural stone and timber, or architectural monochrome.</p><p>Your summary brings together wall and floor finishes, joinery, surfaces, fittings, lighting, layout, storage and accessibility priorities. Materials, dimensions, availability and suitability need review before any specification or construction.</p><p>Print your board, share its selections, or carry it into your renovation questionnaire. No name, email or phone number is needed to explore.</p><a class="text-link" href="/bathroom-renovation-cost">Consider your bathroom scope ↗</a></div></div></section>'''


def planner_page(field: Callable[..., str]) -> str:
    def select(name, label, pairs, selected=None):
        opts = ''.join(f'<option value="{v}"' + (' selected' if v == selected else '') + f'>{t}</option>' for v, t in pairs)
        return field(name, label, f'<select id="{name}" name="{name}">{opts}</select>')

    def section(title, content):
        return f'<fieldset class="planner-section"><legend>{title}</legend><div class="field-grid">{content}</div></fieldset>'

    measurements = ''.join(field(n, t, f'<input id="{n}" name="{n}" type="number" inputmode="decimal" min="1" max="10" step="0.1" value="{v}" required>') for n, t, v in [('lengthM', 'Length (metres) *', '2.5'), ('widthM', 'Width (metres) *', '2')])
    measurements += field('areaInputM2', 'Or enter known floor area (m²)', '<input id="areaInputM2" name="areaInputM2" type="number" inputmode="decimal" min="1" max="100" step="0.1" placeholder="Optional">', 'When supplied, this area replaces length × width.')
    scope = select('renovationType', 'Renovation type', [('refresh', 'Cosmetic refresh'), ('full_refit', 'Full renovation, same layout'), ('full_refit_layout', 'Full renovation, new layout')], 'full_refit')
    scope += select('finish', 'Finish level', [('essential', 'Essential'), ('mid_range', 'Contemporary'), ('premium', 'Premium')], 'mid_range')
    scope += select('plumbing', 'Plumbing changes', [('none', 'Retain fixture positions'), ('minor', 'Minor adjustments'), ('major', 'Relocate fixtures')])
    scope += select('structural', 'Walls and structure', [('none', 'No wall changes'), ('wall_removal', 'Wall removal to investigate'), ('structural', 'Structural changes to investigate'), ('unknown', 'Needs assessment')])
    site = select('floorConstruction', 'Existing floor construction', [('unknown', 'Not sure — assess on site'), ('concrete', 'Concrete'), ('timber', 'Timber')])
    site += select('access', 'Location and access', [('ground', 'Ground floor'), ('upper', 'Upper floor'), ('apartment', 'Apartment')])
    fixtures = select('shower', 'Shower', [('new', 'New shower'), ('retain', 'Retain existing'), ('walk_in', 'Walk-in shower')])
    fixtures += select('bath', 'Bath', [('none', 'No bath'), ('retain', 'Retain existing'), ('new', 'New built-in bath'), ('freestanding', 'Freestanding bath')])
    fixtures += select('vanity', 'Vanity', [('single', 'Single vanity'), ('retain', 'Retain existing'), ('double', 'Double vanity'), ('custom', 'Custom joinery')])
    fixtures += select('toilet', 'Toilet', [('new', 'New toilet'), ('retain', 'Retain existing'), ('concealed', 'Concealed cistern')])
    finishes = select('waterproofing', 'Waterproofing', [('assess', 'Assess existing system'), ('replace', 'Replace as part of renovation')])
    finishes += select('tiling', 'Tiling', [('retain', 'Retain where suitable'), ('floor', 'Floor tiling'), ('wet_zones', 'Floor and wet zones'), ('full_height', 'Full-height tiling')], 'wet_zones')
    checks = '<fieldset class="planner-section check-group"><legend>Practical priorities and upgrades</legend>' + ''.join(f'<label class="check"><input type="checkbox" name="{n}"><span>{t}</span></label>' for n, t in [('accessibility', 'Accessibility considerations'), ('strata', 'Strata approvals or building rules'), ('olderHome', 'Older home / hidden conditions'), ('limitedAccess', 'Restricted deliveries or site access'), ('underfloorHeating', 'Underfloor heating'), ('featureLighting', 'Feature lighting'), ('customStorage', 'Additional custom storage')]) + '</fieldset>'
    timing = select('timeframe', 'When would you like to begin?', [('exploring', 'Just exploring'), ('0_3', 'Within 3 months'), ('3_6', 'In 3–6 months'), ('6_12', 'In 6–12 months'), ('12_plus', 'In 12+ months')])
    form = f'''<form class="calc-form" id="calc-form" data-calculator novalidate><p class="eyebrow">01 / DEFINE YOUR SPACE</p><h2>Your bathroom,<br><em>considered.</em></h2><div class="planner-presets" role="group" aria-label="Bathroom size presets"><button type="button" data-calc-preset="small">Small · 3.6 m²</button><button type="button" data-calc-preset="medium">Medium · 6 m²</button><button type="button" data-calc-preset="large">Large · 9 m²</button></div>{section('Measurements', measurements)}{section('Renovation scope', scope)}{section('Existing site', site)}{section('Fixtures and joinery', fixtures)}{section('Waterproofing and tiling', finishes)}{checks}{section('Your intended timing', timing)}<button class="btn btn-dark form-submit" type="submit">Update planning guide ↗</button></form>'''
    return f'''<section class="inner-hero compact"><div class="wrap"><p class="eyebrow">SYDNEY BATHROOM RENOVATION PLANNER</p><h1>Less guesswork.<br><em>More perspective.</em></h1><p>Explore your bathroom’s dimensions, finishes and practical constraints. Compare possibilities before requesting a site assessment.</p></div></section><section class="section calc-section"><div class="wrap"><div class="planning-banner" role="note"><b>Scope planning — not a quote.</b> No approved Milestone rate card or construction-duration assumptions are published. This guide shows relative complexity and cost drivers, without invented prices or build times.</div><div class="calc-grid">{form}<div class="calc-result" id="calc-result" aria-live="polite"><p class="eyebrow">02 / YOUR PLANNING PROFILE</p><div data-result><h2>Start with your space.</h2><p>Enable JavaScript to compare your selections. Pricing, dimensions, existing conditions, approvals and construction timing require a site assessment.</p><a class="btn btn-gold" href="/plan-your-renovation?category=bathroom">Request a site assessment ↗</a></div></div></div><div class="calc-notes"><h2>How this planning guide works</h2><p>Floor area is length × width, or the known area you enter. The profile combines unitless scope points for size, renovation type, finish level, plumbing and site considerations. Additional selections highlight practical work and uncertainty. It is a conversation aid, not an engineering assessment.</p><p>Compare retaining a layout or simplifying finishes while keeping essential site and accessibility requirements. These alternatives indicate scope changes; they do not promise a saving or override waterproofing, structural or accessibility needs.</p><h3>What still needs review</h3><p>Concealed damage, hazardous materials, structural engineering, approvals, product availability, trade sequencing and access arrangements cannot be established here. Your preferred start date is a preference, not a construction programme.</p><a class="text-link" href="/renovation-design-studio">Explore colours and materials in the Design Studio ↗</a></div></div></section>'''


# No completed-project record is published until its facts and photography are approved.
CONCEPTS: list[ConceptRecord] = [
    dict(slug='warm-kitchen', title='Warmth in the details', category='Kitchen', image='kitchen-after', scope='An island, storage and a generous place to gather.', approach='Explore the relationship between light surfaces and warm timber tones.', materials='Stone-look surfaces, timber tones and understated fittings.', before='compare-before', after='compare-after', status='concept', suburb=None),
    dict(slug='calm-bathroom', title='A quiet start to the day', category='Bathroom', image='bathroom-after', scope='Bathing, storage and a calm material direction.', approach='Balance soft colour, texture and clear circulation.', materials='Sage tones, stone-look surfaces and restrained fixtures.', before=None, after=None, status='concept', suburb=None),
    dict(slug='connected-living', title='Room to gather', category='Living space', image='whole-home-living', scope='An open living space with a connection to the outdoors.', approach='Consider daylight, furniture movement and shared spaces.', materials='Timber tones, pale surfaces and glazing.', before=None, after=None, status='concept', suburb=None),
]


def concept_gallery(picture: Callable[..., str]) -> str:
    return '<section class="section surface-alt"><div class="wrap"><p class="eyebrow">CONCEPT STUDIES</p><h2>Read the idea.<br><em>Explore the detail.</em></h2><p>Design references for discussion. No client location or completed-project claim is attached to these concepts.</p><div class="case-study-grid">' + ''.join(f'<a class="case-study" href="/concepts/{c["slug"]}"><div class="frame">{picture(c["image"], "AI-generated " + c["category"].lower() + " concept", sizes="(max-width:768px) 90vw, 30vw")}</div><div class="case-study-content"><span class="eyebrow">{escape(c["category"])} / CONCEPT</span><h3>{escape(c["title"])}</h3><p>{escape(c["scope"])}</p><span class="text-link">Explore this concept ↗</span></div></a>' for c in CONCEPTS) + '</div></div></section>'


def concept_page(record: ConceptRecord, picture: Callable[..., str]) -> str:
    c = record
    comparison = ''
    if c['before'] and c['after']:
        comparison = f'''<section class="section surface-alt"><div class="wrap"><h2>A visual exploration.</h2><p>Both views are AI-generated demonstrations, not a documented renovation. The comparison is a separate reference for design discussion.</p><div class="case-study-grid"><figure>{picture(c['before'], 'AI-generated dated kitchen reference')}<figcaption>Before · concept</figcaption></figure><figure>{picture(c['after'], 'AI-generated reimagined kitchen reference')}<figcaption>After · concept</figcaption></figure></div></div></section>'''
    return f'''<section class="inner-hero"><div class="wrap"><p class="eyebrow">{escape(c['category'])} / CONCEPT STUDY</p><h1>{escape(c['title'])}</h1><p>AI-generated design reference. Not a completed Milestone Renovate project.</p></div><div class="inner-hero-image">{picture(c['image'], 'AI-generated ' + c['category'].lower() + ' concept', loading='eager', priority=True)}</div></section><section class="section"><div class="wrap intro-grid"><div><p class="eyebrow">DESIGN IN DISCUSSION</p><h2>An idea to<br><em>build a brief around.</em></h2><dl class="case-study-meta"><dt>Status</dt><dd>AI-generated concept</dd><dt>Location</dt><dd>Not a site-specific project</dd><dt>Category</dt><dd>{escape(c['category'])}</dd></dl></div><div><h3>Scope to explore</h3><p>{escape(c['scope'])}</p><h3>Design approach</h3><p>{escape(c['approach'])}</p><h3>Materials and finishes</h3><p>{escape(c['materials'])} These are visual directions, not verified product specifications.</p><a class="btn btn-ruby" href="/renovation-design-studio">Create your own design direction ↗</a></div></div></section>{comparison}'''
