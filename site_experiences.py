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


def trust_ribbon() -> str:
    return '''<section class="section-trust-ribbon"><div class="wrap trust-ribbon-grid">
<div class="trust-pill"><span class="trust-badge-icon">✓</span><div><strong>Structured Planning</strong><small>Guided briefs &amp; pre-construction feasibility</small></div></div>
<div class="trust-pill"><span class="trust-badge-icon">✓</span><div><strong>Transparent Scopes</strong><small>Clear scope breakdowns &amp; step-by-step reviews</small></div></div>
<div class="trust-pill"><span class="trust-badge-icon">✓</span><div><strong>Milestone Heritage</strong><small>Connected to Milestone Development construction</small></div></div>
<div class="trust-pill"><span class="trust-badge-icon">✓</span><div><strong>Specialised Focus</strong><small>Dedicated to existing Sydney residential renovations</small></div></div>
</div></section>'''


def platform_tools(picture: Callable[..., str]) -> str:
    return f'''<section class="section platform-intro"><div class="wrap"><div class="section-header"><div><p class="eyebrow">YOUR HOME. YOUR POSSIBILITIES.</p><h2>A clearer picture.<br><em>A considered plan.</em></h2></div><p>Explore a design direction, understand your bathroom scope, check council approvals, then bring the details together in one useful brief. Start wherever you feel ready.</p></div><div class="platform-tools"><a class="platform-card" href="/renovation-design-studio"><div class="frame">{picture('inspo-materials', 'AI-generated concept of timber, stone and brass material samples', sizes='(max-width:768px) 90vw, 42vw')}</div><div><span class="eyebrow">01 / DESIGN STUDIO</span><h3>Find the feeling<br><em>of home.</em></h3><p>Build a visual moodboard with colours, materials, lighting and practical priorities.</p><span class="text-link">Create your design direction ↗</span><small>Interactive moodboard · concept references</small></div></a><a class="platform-card" href="/bathroom-renovation-cost"><div class="frame">{picture('vanity', 'AI-generated bathroom concept with a marble double vanity', sizes='(max-width:768px) 90vw, 42vw')}</div><div><span class="eyebrow">02 / BATHROOM PLANNER</span><h3>Understand the<br><em>moving parts.</em></h3><p>Compare scope choices, explore layout drivers and prepare for a site assessment.</p><span class="text-link">Explore your bathroom scope ↗</span><small>Scope planning · practical guide</small></div></a><a class="platform-card" href="/approvals-guide"><div class="frame">{picture('about-planning', 'Architectural plans and council planning drawings', sizes='(max-width:768px) 90vw, 42vw')}</div><div><span class="eyebrow">03 / APPROVALS CHECKER</span><h3>Do I need a<br><em>DA or CDC?</em></h3><p>Check if your renovation qualifies for fast-track 20-day Complying Development or requires Council DA.</p><span class="text-link">Check approval pathway ↗</span><small>NSW Housing Code · SEPP guide</small></div></a><a class="platform-card" href="/quote-audit"><div class="frame">{picture('kitchen-after', 'Detailed kitchen and joinery finishes', sizes='(max-width:768px) 90vw, 42vw')}</div><div><span class="eyebrow">04 / QUOTE AUDIT</span><h3>Get an expert<br><em>second opinion.</em></h3><p>Have an existing builder quote? We’ll review the line items and PC allowances to uncover hidden exclusions.</p><span class="text-link">Request a quote audit ↗</span><small>Free scope check · Sydney estimators</small></div></a></div><div class="planning-index"><div><span>05 / 15-MIN STRATEGY CALL</span><p>Want direct advice before putting hammer to nail?</p><a class="text-link" href="/booking">Book a strategy call ↗</a></div><div><span>06 / COMPLETE BRIEF</span><p>Ready to get started? Send your project brief.</p><a class="text-link" href="/plan-your-renovation">Plan your renovation ↗</a></div></div></div></section>'''


def booking_page(field: Callable[..., str]) -> str:
    date_slots = [('Tomorrow', 'Tomorrow'), ('In 2 Days', 'In 2 Days'), ('This Thursday', 'This Thursday'), ('This Friday', 'This Friday'), ('Next Monday', 'Next Monday')]
    time_slots = [('9:00 AM', '9:00 AM'), ('11:00 AM', '11:00 AM'), ('1:30 PM', '1:30 PM'), ('3:30 PM', '3:30 PM'), ('5:00 PM', '5:00 PM')]
    date_pills = ''.join(f'<button type="button" class="slot-pill" data-slot-date="{v}" aria-pressed="{"true" if i==0 else "false"}">{l}</button>' for i, (v, l) in enumerate(date_slots))
    time_pills = ''.join(f'<button type="button" class="slot-pill" data-slot-time="{v}" aria-pressed="{"true" if i==0 else "false"}">{l}</button>' for i, (v, l) in enumerate(time_slots))

    return f'''<section class="inner-hero compact"><div class="wrap"><p class="eyebrow">15-MINUTE STRATEGY CALL</p><h1>Schedule your <em>consultation.</em></h1><p>Speak directly with a senior Milestone renovation consultant. Review your plans, discuss budget parameters and understand council feasibility before committing.</p></div></section>
<section class="section"><div class="wrap contact-grid">
<div>
  <p class="eyebrow">PRE-CONSULTATION PREPARATION</p>
  <h2>What we’ll cover in <em>15 minutes:</em></h2>
  <div class="value-grid prep-value-grid">
    <article><span>01 / FEASIBILITY</span><h3>Scope &amp; Space Review</h3><p>Discuss the rooms you want to rework, layout possibilities, and structural walls.</p></article>
    <article><span>02 / BUDGET</span><h3>Realistic Cost Benchmarks</h3><p>Review realistic Sydney market figures for your chosen finish level.</p></article>
    <article><span>03 / APPROVALS</span><h3>Fast-Track CDC vs DA</h3><p>Identify whether your project qualifies for 20-day private certifier approval.</p></article>
  </div>
  <div class="contact-info"><span>PREFER TO CALL DIRECTLY?</span><a href="tel:1800008883">1800 008 883</a><p>Monday to Friday, 8:30am – 5:30pm AEST</p></div>
</div>
<div>
  <form class="quote-form" id="booking-form" data-booking-form novalidate>
    <h3>Choose your consultation time</h3>
    <p>Select a slot and share a few details so we can prepare your review.</p>
    <div class="form-error-summary" id="form-error" role="alert" tabindex="-1" hidden></div>
    
    <fieldset class="slot-group">
      <legend class="slot-label">1. Preferred Consultation Day *</legend>
      <div class="slot-pill-grid">{date_pills}</div>
      <input type="hidden" id="bookingDate" name="bookingDate" value="Tomorrow">
    </fieldset>

    <fieldset class="slot-group">
      <legend class="slot-label">2. Preferred Time Slot (AEST) *</legend>
      <div class="slot-pill-grid">{time_pills}</div>
      <input type="hidden" id="bookingTime" name="bookingTime" value="9:00 AM">
    </fieldset>

    <div class="field-grid booking-fields">
      {field('name', 'Full name *', '<input id="name" name="name" autocomplete="name" required minlength="2" maxlength="120" aria-describedby="name-error">')}
      {field('phone', 'Phone *', '<input id="phone" name="phone" autocomplete="tel" type="tel" inputmode="tel" required maxlength="20" aria-describedby="phone-error">')}
      {field('email', 'Email *', '<input id="email" name="email" autocomplete="email" type="email" required maxlength="254" aria-describedby="email-error">')}
      {field('category', 'Primary service *', '<select id="category" name="category" required><option value="whole_home">Whole-home renovation</option><option value="kitchen">Kitchen renovation</option><option value="bathroom">Bathroom renovation</option><option value="extension">Extension or addition</option><option value="other">Other project</option></select>')}
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

    <button class="btn btn-ruby form-submit" type="submit" data-submit>Confirm Strategy Call <span aria-hidden="true">↗</span></button>
    <p class="form-status" id="form-status" role="status" aria-live="polite"></p>
  </form>

  <div class="form-success" id="booking-success" role="status" tabindex="-1" hidden>
    <p class="eyebrow">CONSULTATION CONFIRMED</p>
    <h3>Your strategy call is booked.</h3>
    <p>We look forward to speaking with you on <strong data-confirmed-time>Tomorrow at 9:00 AM</strong>. Your reference is <strong data-reference></strong>.</p>
    <p class="fine-print">A senior consultant will call your provided number at the scheduled time. Need to reschedule? Call us on <a href="tel:1800008883">1800 008 883</a> quoting your reference.</p>
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
      {field('category', 'Renovation scope *', '<select id="category" name="category" required><option value="whole_home">Whole-home renovation</option><option value="kitchen">Kitchen renovation</option><option value="bathroom">Bathroom renovation</option><option value="extension">Extension or addition</option><option value="other">Other renovation</option></select>')}
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

    <button class="btn btn-ruby form-submit" type="submit" data-submit>Request Free Quote Audit <span aria-hidden="true">↗</span></button>
    <p class="form-status" id="form-status" role="status" aria-live="polite"></p>
  </form>

  <div class="form-success" id="quote-audit-success" role="status" tabindex="-1" hidden>
    <p class="eyebrow">QUOTE RECEIVED FOR AUDIT</p>
    <h3>Thank you — our estimators are reviewing your scope.</h3>
    <p>Your quote audit reference is <strong data-reference></strong>.</p>
    <p class="fine-print">A senior construction estimator will review your breakdown against current NSW trade pricing and get back to you with our scope assessment. Quote <a href="tel:1800008883">1800 008 883</a> for priority queries.</p>
    <a class="btn btn-dark" href="/">Back to home ↗</a>
  </div>
</div>
</div></section>'''


def approvals_page() -> str:
    return '''<section class="inner-hero compact"><div class="wrap"><p class="eyebrow">NSW PLANNING &amp; APPROVALS GUIDE</p><h1>Do I need a <em>DA or CDC?</em></h1><p>Navigating Sydney council planning approvals can seem overwhelming. Use our interactive feasibility checker to find out whether your renovation qualifies for fast-track 20-day CDC approval or requires a formal Council DA.</p></div></section>
<section class="section"><div class="wrap" data-approvals-checker>
<div class="approvals-grid">
<div class="approvals-form-card">
  <form id="approvals-form">
    <p class="eyebrow">NSW HOUSING CODE CHECKER</p>
    <h2>Check your approval pathway</h2>
    
    <fieldset class="approvals-group">
      <legend>1. Heritage or critical environmental zoning?</legend>
      <label class="check-radio"><input type="radio" name="heritage" value="no" checked><span>No — Standard residential suburban zoning</span></label>
      <label class="check-radio"><input type="radio" name="heritage" value="yes"><span>Yes — Heritage conservation area, listed item, or flame zone</span></label>
      <label class="check-radio"><input type="radio" name="heritage" value="unsure"><span>Unsure — Need Section 10.7 planning certificate check</span></label>
    </fieldset>

    <fieldset class="approvals-group">
      <legend>2. What is the extent of proposed building work?</legend>
      <label class="check-radio"><input type="radio" name="scope" value="internal_only" checked><span>Purely internal renovations (kitchen, bathroom, internal walls)</span></label>
      <label class="check-radio"><input type="radio" name="scope" value="ground_extension"><span>Ground-floor extension or alterations to external walls</span></label>
      <label class="check-radio"><input type="radio" name="scope" value="second_storey"><span>Second-storey addition / roofline alteration</span></label>
    </fieldset>

    <fieldset class="approvals-group">
      <legend>3. Boundary setbacks and building envelope</legend>
      <label class="check-radio"><input type="radio" name="setbacks" value="compliant" checked><span>Will meet standard setbacks (0.9m–1.5m side boundaries)</span></label>
      <label class="check-radio"><input type="radio" name="setbacks" value="non_compliant"><span>Will build closer to boundary or requires boundary wall</span></label>
      <label class="check-radio"><input type="radio" name="setbacks" value="unsure"><span>Unsure / Depends on site survey</span></label>
    </fieldset>

    <fieldset class="approvals-group">
      <legend>4. Property type and lot size</legend>
      <label class="check-radio"><input type="radio" name="lotSize" value="standard" checked><span>Standard freestanding house (lot &gt; 450 m²)</span></label>
      <label class="check-radio"><input type="radio" name="lotSize" value="small"><span>Compact lot or semi / terrace (&lt; 300 m²)</span></label>
      <label class="check-radio"><input type="radio" name="lotSize" value="strata"><span>Strata apartment or townhouse</span></label>
    </fieldset>
  </form>
</div>
<div class="approvals-result-card" data-approvals-result>
  <!-- Rendered interactively by approvals-checker.js -->
</div>
</div>
</div></section>
<section class="section surface-alt"><div class="wrap">
  <div class="section-header"><div><p class="eyebrow">THE TWO APPROVAL PATHWAYS</p><h2>Understanding the NSW Planning Portal</h2></div><p>Every Sydney council operates under the NSW Environmental Planning and Assessment Act. Here is how CDC and DA compare.</p></div>
  <div class="comparison-grid">
    <div class="comparison-card">
      <span class="badge-tag">FAST TRACK</span>
      <h3>Complying Development (CDC)</h3>
      <p class="lead-sm">Fast-tracked approval issued by an Accredited Private Certifier under State Environmental Planning Policy (SEPP).</p>
      <ul>
        <li><strong>Turnaround:</strong> 20–30 business days.</li>
        <li><strong>Approval Body:</strong> Private Certifier (no council committee meetings).</li>
        <li><strong>Neighbour Involvement:</strong> 14-day statutory notice only; cannot formally object if standards are met.</li>
        <li><strong>Best for:</strong> Standard home additions, internal renovations, and compliant extensions.</li>
      </ul>
    </div>
    <div class="comparison-card">
      <span class="badge-tag">CUSTOM MERIT</span>
      <h3>Council Development Application (DA)</h3>
      <p class="lead-sm">Formal assessment by your local council planners against the Local Environmental Plan (LEP) and Development Control Plan (DCP).</p>
      <ul>
        <li><strong>Turnaround:</strong> 60–120+ days depending on council backlog.</li>
        <li><strong>Approval Body:</strong> Local Council Assessment Team / Planning Panel.</li>
        <li><strong>Neighbour Involvement:</strong> Public exhibition period with formal public submissions.</li>
        <li><strong>Best for:</strong> Heritage items, non-compliant setbacks, large second storeys, or steep sites.</li>
      </ul>
    </div>
  </div>
</div></section>'''


def studio_page(imagery: dict[str, dict], style_imagery: dict[str, dict]) -> str:
    image_data = escape(json.dumps(imagery), quote=True)
    style_data = escape(json.dumps(style_imagery), quote=True)
    return f'''<section class="inner-hero compact"><div class="wrap"><p class="eyebrow">SYDNEY RENOVATION DESIGN STUDIO</p><h1>A space that feels<br><em>like you.</em></h1><p>Explore colours, textures and the way you want to live. Create a personal design direction for your bathroom, kitchen or living space.</p></div></section><section class="section studio-section"><div class="wrap"><div class="planning-banner"><b>Your visual moodboard.</b> This studio combines your selections with existing concept references. It does not generate a new image or a measured design. All imagery is labelled AI-generated concept imagery, not completed Milestone work.</div><section data-design-studio data-studio-imagery="{image_data}" data-studio-style-imagery="{style_data}" aria-label="Interactive renovation design studio"><div data-studio-app></div><p data-studio-status role="status" aria-live="polite"></p><noscript><p>The interactive studio needs JavaScript. Explore the design directions below or <a class="inline-link" href="/contact">speak with our team</a>.</p></noscript></section></div></section><section class="section surface-alt"><div class="wrap intro-grid"><div><p class="eyebrow">A DIRECTION, NOT A SPECIFICATION</p><h2>Beautiful ideas.<br><em>Practical questions.</em></h2></div><div><p>Explore Contemporary Australian, warm minimalism, modern luxury, Scandinavian, Mediterranean, timeless classic, industrial, natural stone and timber, or architectural monochrome.</p><p>Your summary brings together wall and floor finishes, joinery, surfaces, fittings, lighting, layout, storage and accessibility priorities. Materials, dimensions, availability and suitability need review before any specification or construction.</p><p>Print your board, share its selections, or carry it into your renovation questionnaire. No name, email or phone number is needed to explore.</p><a class="text-link" href="/bathroom-renovation-cost">Consider your bathroom scope ↗</a></div></div></section>'''


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
