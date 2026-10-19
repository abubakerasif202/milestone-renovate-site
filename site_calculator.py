"""Static shells for the bathroom model and the separate kitchen market guide."""
import json
import subprocess
from html import escape
from pathlib import Path

ROOT = Path(__file__).parent

def load_pricing():
    return json.loads(subprocess.run(['node', str(ROOT / 'scripts/export-pricing.mjs')], capture_output=True, text=True, check=True, encoding='utf-8').stdout)

def _choices(name, values, default):
    return '<div class="bc-choices">' + ''.join(f'<label class="bc-choice"><input type="radio" name="{name}" value="{key}"{" checked" if key == default else ""}><span>{escape(value["label"])}</span></label>' for key, value in values.items()) + '</div>'

def calculator_page(pricing, cta_html):
    model = pricing['bathroomModel']
    details = ''.join(f'<fieldset><legend>{title}</legend>{_choices(key, model[key], default)}</fieldset>' for key, title, default in [('size', 'Bathroom size', 'small'), ('subfloor', 'Subfloor', 'timber')])
    extras = ''.join(f'<label class="bc-choice"><input type="checkbox" name="{key}"><span>{escape(value["label"])}</span></label>' for key, value in model['extras'].items())
    return f'''<section class="inner-hero compact"><div class="wrap"><p class="eyebrow inverse">BATHROOM COST PLANNER</p><h1>Your bathroom.<br><em>A clearer starting point.</em></h1><p>Explore your renovation choices with an immediate indicative estimate in Australian dollars. No contact details needed to calculate.</p></div></section>
<section class="section"><div class="wrap"><p class="planning-banner"><strong>Indicative estimate, not a binding quote.</strong> Final cost and timing depend on site inspection, selected finishes, site conditions, approvals and agreed scope. <a href="/estimate-disclaimer">Read the disclaimer</a>.</p>
<noscript><p>This calculator requires JavaScript. <a href="/contact">Contact Milestone Renovate</a> for a quote.</p></noscript>
<form data-bathroom-calculator class="bc-layout" novalidate aria-label="Bathroom renovation cost calculator">
<div class="bc-controls"><section class="bc-panel"><h2>1. Bathroom details</h2>{details}
<fieldset><legend>Property access</legend>{_choices('property', {'ground': {'label': 'Ground floor'}, 'apartment': {'label': 'Apartment'}}, 'ground')}
<fieldset data-lift hidden disabled><legend>Is there a lift?</legend>{_choices('lift', {'yes': {'label': 'Yes, a lift is available'}, 'no': {'label': 'No, stairs only'}}, 'yes')}</fieldset></fieldset></section>
<section class="bc-panel"><h2>2. Scope &amp; optional savings</h2><p>Choose any that apply. Wall removal and layout changes need assessment. DIY work must meet applicable safety and licensing requirements.</p><div class="bc-choices">{extras}</div></section>
<section class="bc-panel"><h2>3. Package type</h2><fieldset><legend>Who sources the materials?</legend>{_choices('package', model['package'], 'labour_only')}</fieldset></section>
<button class="btn btn-outline" type="button" data-reset>Reset estimate</button>
<p>Planning another space? <a href="/kitchen-renovation-cost">Kitchen cost guide</a> · <a href="/plan-your-renovation?category=extension">Extension brief</a> · <a href="/plan-your-renovation?category=whole_home">Whole-home brief</a></p></div>
<aside class="bc-summary" aria-label="Live estimate and enquiry"><div class="bc-panel"><h2>4. Your live estimate</h2><div role="status" aria-live="polite" aria-atomic="true" data-live><p class="bc-price" data-price>${model["baseCost"]:,}–${model["baseCost"] + model["costSpread"]:,}</p><p>AUD · <strong data-weeks>{model["baseWeeks"]:g}–{model["baseWeeks"] + model["weeksSpread"]:g} weeks</strong></p></div><p class="fine-print">Indicative only. This is a planning range; a written quote confirms inclusions, tax treatment, cost and timing.</p><a href="#bathroom-enquiry" class="btn btn-gold">Request My Renovation Quote</a></div>
<section class="bc-panel" id="bathroom-enquiry"><h2>Request your quote</h2><p>Share your estimate with Milestone Renovate. Enter an email address or Australian phone number.</p>
<div data-errors role="alert" tabindex="-1" hidden></div>
<label for="bc-name">Full name</label><input id="bc-name" name="name" autocomplete="name" maxlength="120" required>
<label for="bc-postcode">Australian postcode</label><input id="bc-postcode" name="postcode" autocomplete="postal-code" inputmode="numeric" maxlength="4" pattern="[0-9]{{4}}" required>
<label for="bc-email">Email address</label><input id="bc-email" name="email" type="email" autocomplete="email" maxlength="254">
<label for="bc-phone">Phone number</label><input id="bc-phone" name="phone" type="tel" autocomplete="tel" maxlength="40">
<label for="bc-message">Message (optional)</label><textarea id="bc-message" name="message" maxlength="4000" rows="3"></textarea>
<div class="bc-honeypot" aria-hidden="true"><label>Leave empty<input name="website" tabindex="-1" autocomplete="off"></label></div>
<label class="bc-consent"><input type="checkbox" name="consent" required><span>I agree to Milestone Renovate contacting me about this enquiry and have read the <a href="/privacy">Privacy Policy</a>.</span></label>
<button type="submit" class="btn btn-gold" data-send disabled>Request My Renovation Quote</button><p role="status" data-submit-status></p>
<p><a data-contact-fallback href="/contact">Prefer the contact form? Carry your estimate through ↗</a></p></section></aside></form>
<section class="bc-method" id="how-it-works"><h2>How your estimate works</h2><p>The starting range is $20,000–$30,000 and 2–3 weeks for a small bathroom, timber subfloor, ground-floor access and labour-only package. Your selections add or subtract fixed amounts. The upper range is always $10,000 and one week above the lower range. No postcode adjustment or multiplier is applied.</p><details><summary>View each cost and time adjustment</summary><dl>{''.join(f'<dt>{escape(value["label"])}</dt><dd>{value["cost"]:+,} AUD · {value["weeks"]:+g} weeks</dd>' for key in ['size', 'subfloor', 'access', 'extras', 'package'] for value in model[key].values())}</dl></details></section></div></section>''' + cta_html

def kitchen_calculator_page(pricing, cta_html):
    finishes = _choices('finish', {key: {'label': value} for key, value in pricing['tierLabels'].items()}, 'mid_range')
    return f'''<section class="inner-hero compact"><div class="wrap"><p class="eyebrow inverse">KITCHEN COST GUIDE</p><h1>A starting point<br><em>for your kitchen.</em></h1><p>Indicative Sydney market ranges in Australian dollars, separate from the bathroom calculator.</p></div></section><section class="section"><div class="wrap"><div class="bc-layout"><form data-kitchen-calculator class="bc-panel"><h2>Kitchen selections</h2><fieldset><legend>Finish level</legend>{finishes}</fieldset><label class="bc-choice"><input type="checkbox" name="layoutChange"><span>Change the layout (quoted separately)</span></label><label class="bc-choice"><input type="checkbox" name="wallRemoval"><span>Remove a wall (quoted separately)</span></label><label class="bc-choice"><input type="checkbox" name="ownSupply"><span>I will supply some items (labour quoted separately)</span></label></form><aside class="bc-panel" data-kitchen-result aria-live="polite"></aside></div><h2>Published market guide</h2><p>Kitchen ranges use the equal-weight average of two published Sydney guides, rounded out to $500. Appliances, design and approval fees, hazardous material removal and contingency are excluded. Layout changes and wall removal are not separately priced. Cabinetry manufacture adds lead time: 2–3 weeks on site; 10–14 weeks overall. This is an indicative market guide, not a quotation.</p><ul>{''.join(f'<li><a href="{escape(source["url"])}" rel="noopener" target="_blank">{escape(source["title"])}</a></li>' for source in pricing['sources'] if source['id'] in ['wtd-kitchen', 'mh-guide'])}</ul><p><a href="/bathroom-renovation-cost">Bathroom calculator</a> · <a href="/estimate-disclaimer">Estimate disclaimer</a></p></div></section>''' + cta_html
