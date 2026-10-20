"""Server-rendered planning experiences and truthful, extensible concept records."""
from html import escape
from typing import Callable, TypedDict
import json
from site_constants import EMAIL, PHONE, PHONE_HREF


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
    return '''<form class="postcode-entry" action="/plan-your-renovation" method="get" data-postcode-entry><label for="planning-postcode">Where is your renovation?</label><div class="postcode-start"><input id="planning-postcode" name="postcode" autocomplete="postal-code" inputmode="numeric" pattern="[0-9]{4}" minlength="4" maxlength="4" placeholder="Your postcode" aria-describedby="postcode-note postcode-error" required><button class="btn btn-primary" type="submit">Start my plan <span aria-hidden="true">↗</span></button></div><p id="postcode-error" class="field-error" role="alert" hidden></p><p id="postcode-note" class="fine-print">Start with your location. No contact details needed to explore.</p></form>'''


def trust_ribbon() -> str:
    return '''<section class="section-trust-ribbon"><div class="wrap trust-ribbon-grid">
<div class="trust-pill"><span class="trust-badge-icon">✓</span><div><strong>Structured Planning</strong><small>Guided briefs &amp; pre-construction feasibility</small></div></div>
<div class="trust-pill"><span class="trust-badge-icon">✓</span><div><strong>Transparent Scopes</strong><small>Clear scope breakdowns &amp; step-by-step reviews</small></div></div>
<div class="trust-pill"><span class="trust-badge-icon">✓</span><div><strong>Milestone Heritage</strong><small>Connected to Milestone Development construction</small></div></div>
<div class="trust-pill"><span class="trust-badge-icon">✓</span><div><strong>Specialised Focus</strong><small>Dedicated to existing Sydney residential renovations</small></div></div>
</div></section>'''


def platform_tools(picture: Callable[..., str]) -> str:
    return f'''<section class="section platform-intro"><div class="wrap"><div class="section-header"><div><p class="eyebrow">YOUR HOME. YOUR POSSIBILITIES.</p><h2>A clearer picture.<br><em>A considered plan.</em></h2></div><p>Explore a design direction, understand your bathroom scope, then bring the details together in one useful brief. Start wherever you feel ready.</p></div><div class="platform-tools"><a class="platform-card" href="/renovation-design-studio"><div class="frame">{picture('inspo-materials', 'Home study with a desk, notebooks and a woven chair', sizes='(max-width:768px) 90vw, 42vw')}</div><div><span class="eyebrow">01 / DESIGN STUDIO</span><h3>Find the feeling<br><em>of home.</em></h3><p>Build a visual moodboard with colours, materials, lighting and practical priorities.</p><span class="text-link">Create your design direction ↗</span><small>Interactive moodboard · concept references</small></div></a><a class="platform-card" href="/bathroom-renovation-cost"><div class="frame">{picture('vanity', 'Brisbane bathroom with twin basins, wall-mounted taps and a wide mirror', sizes='(max-width:768px) 90vw, 42vw')}</div><div><span class="eyebrow">02 / BATHROOM PLANNER</span><h3>Understand the<br><em>moving parts.</em></h3><p>Compare scope choices, explore layout drivers and prepare for a site assessment.</p><span class="text-link">Explore your bathroom scope ↗</span><small>Scope planning · practical guide</small></div></a><a class="platform-card" href="/quote-audit"><div class="frame">{picture('kitchen-after', 'Detailed kitchen and joinery finishes', sizes='(max-width:768px) 90vw, 42vw')}</div><div><span class="eyebrow">03 / QUOTE AUDIT</span><h3>Get an expert<br><em>second opinion.</em></h3><p>Have an existing builder quote? We’ll review the line items and PC allowances to uncover hidden exclusions.</p><span class="text-link">Request a quote audit ↗</span><small>Free scope check · Quote review</small></div></a></div><div class="planning-index"><div><span>04 / 15-MIN STRATEGY CALL</span><p>Want direct advice before putting hammer to nail?</p><a class="text-link" href="/booking">Book a strategy call ↗</a></div><div><span>05 / COMPLETE BRIEF</span><p>Ready to get started? Send your project brief.</p><a class="text-link" href="/plan-your-renovation">Plan your renovation ↗</a></div></div></div></section>'''


def booking_page(field: Callable[..., str]) -> str:
    date_slots = [('Tomorrow', 'Tomorrow'), ('In 2 Days', 'In 2 Days'), ('This Thursday', 'This Thursday'), ('This Friday', 'This Friday'), ('Next Monday', 'Next Monday')]
    time_slots = [('9:00 AM', '9:00 AM'), ('11:00 AM', '11:00 AM'), ('1:30 PM', '1:30 PM'), ('3:30 PM', '3:30 PM'), ('5:00 PM', '5:00 PM')]
    date_pills = ''.join(f'<button type="button" class="slot-pill" data-slot-date="{v}" aria-pressed="{"true" if i==0 else "false"}">{l}</button>' for i, (v, l) in enumerate(date_slots))
    time_pills = ''.join(f'<button type="button" class="slot-pill" data-slot-time="{v}" aria-pressed="{"true" if i==0 else "false"}">{l}</button>' for i, (v, l) in enumerate(time_slots))

    return f'''<section class="inner-hero compact"><div class="wrap"><p class="eyebrow">15-MINUTE STRATEGY CALL</p><h1>Schedule your <em>consultation.</em></h1><p>Request a call with the Milestone Renovate team. Talk through your plans, budget priorities and the practical next steps before committing to anything.</p></div></section>
<section class="section"><div class="wrap contact-grid">
<div>
  <p class="eyebrow">PRE-CONSULTATION PREPARATION</p>
  <h2>What we’ll cover in <em>15 minutes:</em></h2>
  <div class="value-grid prep-value-grid">
    <article><span>01 / FEASIBILITY</span><h3>Scope &amp; Space Review</h3><p>Discuss the rooms you want to rework, layout possibilities, and structural walls.</p></article>
    <article><span>02 / BUDGET</span><h3>Realistic Cost Benchmarks</h3><p>Review realistic Sydney market figures for your chosen finish level.</p></article>
    <article><span>03 / NEXT STEPS</span><h3>A Sensible Next Stage</h3><p>Agree what should happen next, such as a site assessment or a detailed brief.</p></article>
  </div>
  <div class="contact-info"><span>PREFER TO CALL DIRECTLY?</span><a href="{PHONE_HREF}">{PHONE}</a><p>Or email <a href="mailto:{EMAIL}">{EMAIL}</a>.</p></div>
</div>
<div>
  <form class="quote-form" id="booking-form" data-booking-form novalidate>
    <h3>Choose a preferred time</h3>
    <p>Pick the day and time that suits you and share a few details. The team will contact you to confirm a time.</p>
    <div class="form-error-summary" id="form-error" role="alert" tabindex="-1" hidden></div>
    
    <fieldset class="slot-group">
      <legend class="slot-label">1. Preferred Consultation Day *</legend>
      <div class="slot-pill-grid">{date_pills}</div>
      <input type="hidden" id="bookingDate" name="bookingDate" value="Tomorrow">
    </fieldset>

    <fieldset class="slot-group">
      <legend class="slot-label">2. Preferred Time Slot (Sydney time) *</legend>
      <div class="slot-pill-grid">{time_pills}</div>
      <input type="hidden" id="bookingTime" name="bookingTime" value="9:00 AM">
    </fieldset>

    <div class="field-grid booking-fields">
      {field('name', 'Full name *', '<input id="name" name="name" autocomplete="name" required minlength="2" maxlength="120" aria-describedby="name-error">')}
      {field('phone', 'Phone *', '<input id="phone" name="phone" autocomplete="tel" type="tel" inputmode="tel" required maxlength="20" aria-describedby="phone-error">')}
      {field('email', 'Email *', '<input id="email" name="email" autocomplete="email" type="email" required maxlength="254" aria-describedby="email-error">')}
      {field('category', 'Primary service *', '<select id="category" name="category" required><option value="whole_home">Whole-home renovation</option><option value="kitchen">Kitchen renovation</option><option value="bathroom">Bathroom renovation</option><option value="other">Other project</option></select>')}
      {field('suburb', 'Suburb', '<input id="suburb" name="suburb" autocomplete="address-level2" maxlength="80">')}
      {field('postcode', 'Postcode', '<input id="postcode" name="postcode" autocomplete="postal-code" inputmode="numeric" maxlength="4" pattern="[0-9]{4}">', 'Suburb or postcode required.')}
      {field('details', 'Any specific questions or floor plan notes?', '<textarea id="details" name="details" rows="3" maxlength="4000" placeholder="e.g. Removing load-bearing wall between kitchen and dining, hoping to start mid-year."></textarea>', wide=True)}
    </div>

    <div class="hp-field" aria-hidden="true"><label>Leave this field empty<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
    
    <div class="field consent-field">
      <label class="consent" for="consent">
        <input type="checkbox" id="consent" name="consent" required>
        <span>I agree to Milestone Renovate contacting me to confirm this call and storing my details as described in the <a href="/privacy">privacy notice</a>. *</span>
      </label>
      <p class="field-error" id="consent-error" role="alert" hidden></p>
    </div>

    <button class="btn btn-primary form-submit" type="submit" data-submit>Request Strategy Call <span aria-hidden="true">↗</span></button>
    <p class="form-status" id="form-status" role="status" aria-live="polite"></p>
  </form>

  <div class="form-success" id="booking-success" role="status" tabindex="-1" hidden>
    <p class="eyebrow">CALL REQUESTED</p>
    <h3>Thank you — your call request is in.</h3>
    <p>You asked for <strong data-confirmed-time>Tomorrow at 9:00 AM</strong>. Your reference is <strong data-reference></strong>.</p>
    <p class="fine-print">A member of the Milestone team will contact you on the number you provided to confirm a time. Need to change anything? Call us on <a href="{PHONE_HREF}">{PHONE}</a> quoting your reference.</p>
    <a class="btn btn-dark" href="/">Back to home ↗</a>
  </div>
</div>
</div></section>'''


def quote_audit_page(field: Callable[..., str]) -> str:
    return f'''<section class="inner-hero compact"><div class="wrap"><p class="eyebrow">COMPLIMENTARY SECOND OPINION</p><h1>Renovation quote &amp; <em>scope audit.</em></h1><p>Already received a quote from another builder? We’ll review the line items, allowances, provisional sums and omitted compliance items so you avoid costly budget blowouts.</p></div></section>
<section class="section"><div class="wrap contact-grid">
<div>
  <p class="eyebrow">WHY GET A SECOND OPINION</p>
  <h2>Protect your home from <em>hidden exclusions.</em></h2>
  <div class="value-grid prep-value-grid">
    <article><span>CHECK 01</span><h3>Unrealistic Prime Cost (PC) Allowances</h3><p>Builders often quote unrealistically low fixture allowances that result in significant cost variations when you actually pick tiles and fittings.</p></article>
    <article><span>CHECK 02</span><h3>Omitted Fees &amp; Certifier Allowances</h3><p>We check whether required certifier fees, engineering sign-offs, and essential trade allowances were omitted from the scope.</p></article>
    <article><span>CHECK 03</span><h3>Structural &amp; Subfloor Assumptions</h3><p>Discover whether waste relocations, joist strengthening, and subfloor ventilation are properly specified or left as open-ended variations.</p></article>
  </div>
  <p class="fine-print">100% confidential. We review your figures against current Sydney trade benchmarks without sharing your details with external parties.</p>
</div>
<div>
  <form class="quote-form" id="quote-audit-form" data-quote-audit-form novalidate>
    <h3>Submit quote details for review</h3>
    <p>Paste your quote scope, itemised breakdown, or key questions.</p>
    <div class="form-error-summary" id="form-error" role="alert" tabindex="-1" hidden></div>
    
    <div class="field-grid">
      {field('name', 'Full name *', '<input id="name" name="name" autocomplete="name" required minlength="2" maxlength="120">')}
      {field('phone', 'Phone *', '<input id="phone" name="phone" autocomplete="tel" type="tel" inputmode="tel" required maxlength="20">')}
      {field('email', 'Email *', '<input id="email" name="email" autocomplete="email" type="email" required maxlength="254">')}
      {field('category', 'Renovation scope *', '<select id="category" name="category" required><option value="whole_home">Whole-home renovation</option><option value="kitchen">Kitchen renovation</option><option value="bathroom">Bathroom renovation</option><option value="other">Other renovation</option></select>')}
      {field('quotedAmount', 'Quoted total (AUD)', '<input id="quotedAmount" name="quotedAmount" placeholder="e.g. 85,000">')}
      {field('builderName', 'Quoting builder (optional)', '<input id="builderName" name="builderName" placeholder="Builder or company name">')}
      {field('suburb', 'Suburb', '<input id="suburb" name="suburb" autocomplete="address-level2" maxlength="80">')}
      {field('postcode', 'Postcode', '<input id="postcode" name="postcode" autocomplete="postal-code" inputmode="numeric" maxlength="4" pattern="[0-9]{4}">', 'Suburb or postcode required.')}
      {field('details', 'Quote breakdown, inclusions &amp; questions *', '<textarea id="details" name="details" rows="5" required minlength="10" maxlength="4000" placeholder="Paste line items, prime cost allowances, or specific concerns you have regarding the quote."></textarea>', wide=True)}
    </div>

    <div class="hp-field" aria-hidden="true"><label>Leave this field empty<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>

    <div class="field consent-field">
      <label class="consent" for="consent">
        <input type="checkbox" id="consent" name="consent" required>
        <span>I agree to Milestone Renovate reviewing my quote details and contacting me with an assessment as described in the <a href="/privacy">privacy notice</a>. *</span>
      </label>
      <p class="field-error" id="consent-error" role="alert" hidden></p>
    </div>

    <button class="btn btn-primary form-submit" type="submit" data-submit>Request Free Quote Audit <span aria-hidden="true">↗</span></button>
    <p class="form-status" id="form-status" role="status" aria-live="polite"></p>
  </form>

  <div class="form-success" id="quote-audit-success" role="status" tabindex="-1" hidden>
    <p class="eyebrow">QUOTE RECEIVED FOR AUDIT</p>
    <h3>Thank you — we have your quote.</h3>
    <p>Your quote audit reference is <strong data-reference></strong>.</p>
    <p class="fine-print">A member of the Milestone team will review your breakdown and get back to you with a scope assessment. If you need to add anything, call <a href="{PHONE_HREF}">{PHONE}</a> and quote your reference.</p>
    <a class="btn btn-dark" href="/">Back to home ↗</a>
  </div>
</div>
</div></section>'''


def studio_page(imagery: dict[str, dict], style_imagery: dict[str, dict]) -> str:
    image_data = escape(json.dumps(imagery), quote=True)
    style_data = escape(json.dumps(style_imagery), quote=True)
    return f'''<section class="inner-hero compact"><div class="wrap"><p class="eyebrow">SYDNEY RENOVATION DESIGN STUDIO</p><h1>A space that feels<br><em>like you.</em></h1><p>Explore colours, textures and the way you want to live. Create a personal design direction for your bathroom, kitchen or living space.</p></div></section><section class="section studio-section"><div class="wrap"><div class="planning-banner"><b>Your visual moodboard.</b> This studio combines your selections with existing concept references. It does not generate a new image or a measured design. Owner-supplied Milestone photographs and licensed style references are individually labelled. The board does not show a new completed project or render your selections.</div><section data-design-studio data-studio-imagery="{image_data}" data-studio-style-imagery="{style_data}" aria-label="Interactive renovation design studio"><div data-studio-app></div><p data-studio-status role="status" aria-live="polite"></p><noscript><p>The interactive studio needs JavaScript. Explore the design directions below or <a class="inline-link" href="/contact">speak with our team</a>.</p></noscript></section></div></section><section class="section surface-alt"><div class="wrap intro-grid"><div><p class="eyebrow">A DIRECTION, NOT A SPECIFICATION</p><h2>Beautiful ideas.<br><em>Practical questions.</em></h2></div><div><p>Explore Contemporary Australian, warm minimalism, modern luxury, Scandinavian, Mediterranean, timeless classic, industrial, natural stone and timber, or architectural monochrome.</p><p>Your summary brings together wall and floor finishes, joinery, surfaces, fittings, lighting, layout, storage and accessibility priorities. Materials, dimensions, availability and suitability need review before any specification or construction.</p><p>Print your board, share its selections, or carry it into your renovation questionnaire. No name, email or phone number is needed to explore.</p><a class="text-link" href="/bathroom-renovation-cost">Consider your bathroom scope ↗</a></div></div></section>'''


CONCEPTS: list[ConceptRecord] = [
    dict(slug='warm-kitchen', title='Warmth in the details', category='Kitchen', image='kitchen-after', scope='An island, storage and a generous place to gather.', approach='Explore the relationship between light surfaces and warm timber tones.', materials='Stone-look surfaces, timber tones and understated fittings.', before=None, after=None, status='concept', suburb=None),
    dict(slug='calm-bathroom', title='A quiet start to the day', category='Bathroom', image='bathroom-after', scope='Bathing, storage and a calm material direction.', approach='Balance soft colour, texture and clear circulation.', materials='Light tiling, pale surfaces and restrained fixtures.', before=None, after=None, status='concept', suburb=None),
    dict(slug='connected-living', title='Room to gather', category='Living space', image='whole-home-living', scope='An open living space with a connection to the outdoors.', approach='Consider daylight, furniture movement and shared spaces.', materials='Timber tones, pale surfaces and glazing.', before=None, after=None, status='concept', suburb=None),
]


def concept_gallery(picture: Callable[..., str], caption: Callable[[str], str]) -> str:
    return '<section class="section surface-alt"><div class="wrap"><p class="eyebrow">CONCEPT STUDIES</p><h2>Read the idea.<br><em>Explore the detail.</em></h2><p>Photographs are captioned by source. Design notes are discussion prompts, not site-specific project records.</p><div class="case-study-grid">' + ''.join(f'<a class="case-study" href="/concepts/{c["slug"]}"><div class="frame">{picture(c["image"], "Renovation inspiration photograph", sizes="(max-width:768px) 90vw, 30vw")}</div><div class="case-study-content"><span class="eyebrow">{escape(c["category"])} / CONCEPT</span><h3>{escape(c["title"])}</h3><p>{escape(c["scope"])}</p><small>{escape(caption(c["image"]))}</small><span class="text-link">Explore this concept ↗</span></div></a>' for c in CONCEPTS) + '</div></div></section>'


def concept_page(record: ConceptRecord, picture: Callable[..., str], caption: Callable[[str], str]) -> str:
    c = record
    comparison = ''
    return f'''<section class="inner-hero"><div class="wrap"><p class="eyebrow">{escape(c['category'])} / CONCEPT STUDY</p><h1>{escape(c['title'])}</h1><p>{escape(caption(c["image"]))}. This page explores a design direction rather than documenting a site-specific case study.</p></div><div class="inner-hero-image">{picture(c['image'], 'Renovation inspiration photograph', loading='eager', priority=True)}</div></section><section class="section"><div class="wrap intro-grid"><div><p class="eyebrow">DESIGN IN DISCUSSION</p><h2>An idea to<br><em>build a brief around.</em></h2><dl class="case-study-meta"><dt>Status</dt><dd>Design discussion with reference photography</dd><dt>Location</dt><dd>Not a site-specific project</dd><dt>Category</dt><dd>{escape(c['category'])}</dd></dl></div><div><h3>Scope to explore</h3><p>{escape(c['scope'])}</p><h3>Design approach</h3><p>{escape(c['approach'])}</p><h3>Materials and finishes</h3><p>{escape(c['materials'])} These are visual directions, not verified product specifications.</p><a class="btn btn-primary" href="/renovation-design-studio">Create your own design direction ↗</a></div></div></section>{comparison}'''
