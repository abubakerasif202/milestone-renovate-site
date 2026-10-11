"""Renovation cost calculator page (bathroom and kitchen indicative ranges).

All numbers shown in the public methodology are read from public/js/lib/pricing-config.js through
scripts/export-pricing.mjs, so the page, the engine and the tests cannot drift apart.
"""
from __future__ import annotations

import json
import subprocess
from html import escape
from pathlib import Path

ROOT = Path(__file__).parent


def load_pricing() -> dict:
    out = subprocess.run(['node', str(ROOT / 'scripts' / 'export-pricing.mjs')], capture_output=True, text=True, check=True, encoding='utf-8')
    return json.loads(out.stdout)


def _card(name: str, value: str, title: str, meta: str, checked: bool = False) -> str:
    return (f'<label class="calc-card"><input type="radio" name="{name}" value="{value}"{" checked" if checked else ""}>'
            f'<span class="calc-card-body"><span class="calc-card-title">{escape(title)}</span><span class="calc-card-meta">{escape(meta)}</span></span></label>')


def _toggle(name: str, label: str, hint: str, group: str, off: bool = False) -> str:
    # `off` renders the inactive project's controls hidden and disabled in the HTML so JS never causes layout shift.
    return (f'<label class="calc-toggle" data-for="{group}"{" hidden" if off else ""}><input type="checkbox" name="{name}"{" disabled" if off else ""}>'
            f'<span class="calc-toggle-ui" aria-hidden="true"></span>'
            f'<span class="calc-toggle-text"><strong>{escape(label)}</strong><small>{escape(hint)}</small></span></label>')


def _step(number: int, title: str, body: str, legend_hint: str = '', group: str = '') -> str:
    attrs = f' data-for="{group}"' if group else ''
    hint = f'<p class="calc-step-hint">{escape(legend_hint)}</p>' if legend_hint else ''
    return (f'<fieldset class="calc-step"{attrs}><legend><span class="calc-step-num" aria-hidden="true">{number}</span>'
            f'<span class="calc-step-title">{escape(title)}</span></legend>{hint}{body}</fieldset>')


def _aud(n: float) -> str:
    return f'${n:,.0f}'


def _methodology(pricing: dict) -> str:
    sources = ''.join(
        f'<tr><td><a href="{escape(s["url"])}" target="_blank" rel="noopener">{escape(s["title"])}</a></td><td>{escape(s["date"])}</td><td>{escape(s["gst"])}</td></tr>'
        for s in pricing['sources'])
    labels = pricing['tierLabels']

    def tier_rows(project: str) -> str:
        rows = ''
        for finish in ('essential', 'mid_range', 'premium'):
            t = pricing['tiers'][project][finish]
            published = ' · '.join(f'{escape(r["label"])}: {_aud(r["low"])}–{_aud(r["high"])}' for r in t['rows'])
            rows += f'<tr><th scope="row">{escape(labels[finish])}</th><td>{published}</td><td><strong>{escape(t["meanLabel"])}</strong></td></tr>'
        return rows

    adj_labels = {'layoutChange': 'Layout change (plumbing relocation)', 'wallRemoval': 'Wall removal', 'recessedNiche': 'Recessed niche', 'apartment': 'Apartment access and strata', 'timberFloor': 'Timber floor', 'olderHome': 'Older home (hidden conditions)', 'diyDemolition': 'You demolish (saving)'}

    def basis(b: str) -> str:
        return 'Published figure' if b == 'source' else 'Planning allowance'

    adjustments = ''.join(
        f'<tr><th scope="row">{escape(adj_labels[k])}</th><td>{"−" if v["low"] < 0 else "+"}{_aud(abs(v["low"]))}{"" if v["low"] == v["high"] else "–" + _aud(abs(v["high"]))}</td><td><span class="calc-basis calc-basis-{v["basis"]}">{basis(v["basis"])}</span></td><td>{escape(v["note"])}</td></tr>'
        for k, v in pricing['adjustments'].items())
    sizes = ''.join(
        f'<tr><th scope="row">{escape(v["label"])} ({escape(v["area"])})</th><td>×{v["factor"]}</td><td><span class="calc-basis calc-basis-{v["basis"]}">{basis(v["basis"])}</span></td><td>{escape(v["note"])}</td></tr>'
        for v in pricing['sizes'].values())
    quote_only = ''.join(f'<li>{escape(v)}</li>' for v in pricing['quoteOnly'].values())
    return f'''<section class="section calc-method" id="how-it-works"><div class="wrap"><p class="eyebrow">HOW THE ESTIMATE WORKS</p><h2>Transparent by design.<br><em>Here is the arithmetic.</em></h2>
<p class="lead">These ranges are indicative Sydney market benchmarks compiled from published 2026 cost guides. They are not Milestone Renovate prices or quotes. Pricing last reviewed {escape(pricing["reviewed"])} (version {escape(pricing["version"])}).</p>
<h3>1. Base range per finish level</h3>
<p>Each base range is the equal-weight average of the published lows and of the published highs from two independent Sydney sources: an aggregator of marketplace and trade data and a Sydney builder’s guide. They differ materially, so we do not lean on either. All figures include GST.</p>
<div class="calc-table-wrap" role="region" tabindex="0" aria-label="Bathroom base ranges table"><table class="calc-table"><caption>Bathroom, base range (medium size, supply and install)</caption><thead><tr><th scope="col">Finish</th><th scope="col">Published ranges</th><th scope="col">Base range used</th></tr></thead><tbody>{tier_rows("bathroom")}</tbody></table></div>
<div class="calc-table-wrap" role="region" tabindex="0" aria-label="Kitchen base ranges table"><table class="calc-table"><caption>Kitchen, base range (appliances excluded)</caption><thead><tr><th scope="col">Finish</th><th scope="col">Published ranges</th><th scope="col">Base range used</th></tr></thead><tbody>{tier_rows("kitchen")}</tbody></table></div>
<h3>2. Bathroom size</h3>
<div class="calc-table-wrap" role="region" tabindex="0" aria-label="Bathroom size multipliers table"><table class="calc-table"><thead><tr><th scope="col">Size</th><th scope="col">Multiplier</th><th scope="col">Basis</th><th scope="col">Note</th></tr></thead><tbody>{sizes}</tbody></table></div>
<h3>3. Existing conditions and options (bathroom)</h3>
<div class="calc-table-wrap" role="region" tabindex="0" aria-label="Bathroom adjustments table"><table class="calc-table"><thead><tr><th scope="col">Item</th><th scope="col">Adjustment (incl. GST)</th><th scope="col">Basis</th><th scope="col">Note</th></tr></thead><tbody>{adjustments}</tbody></table></div>
<p><strong>Published figure</strong> means the number comes from, or is derived from, a cited source. <strong>Planning allowance</strong> means no published figure exists and Milestone has set a cautious allowance that will be calibrated against real quotes. Final results are rounded down (low) and up (high) to the nearest $500.</p>
<h3>4. Timelines</h3>
<p>Bathroom: {pricing["timelines"]["bathroom"]["onSiteWeeks"][0]}–{pricing["timelines"]["bathroom"]["onSiteWeeks"][1]} weeks on site, with extra lead time for strata approval or custom-order items. Kitchen: {pricing["timelines"]["kitchen"]["onSiteWeeks"][0]}–{pricing["timelines"]["kitchen"]["onSiteWeeks"][1]} weeks on site and {pricing["timelines"]["kitchen"]["overallWeeks"][0]}–{pricing["timelines"]["kitchen"]["overallWeeks"][1]} weeks from design sign-off to completion because cabinetry is manufactured to order.</p>
<h3>5. What is not estimated online</h3>
<ul>{quote_only}<li>Labour-only pricing is not estimated; if you supply your own fixtures we quote labour separately.</li></ul>
<h3>Sources</h3>
<div class="calc-table-wrap" role="region" tabindex="0" aria-label="Sources table"><table class="calc-table"><thead><tr><th scope="col">Source</th><th scope="col">Date</th><th scope="col">GST</th></tr></thead><tbody>{sources}</tbody></table></div>
<p class="fine-print">Estimates are indicative only and are not a quote, offer or contract. See the <a href="/estimate-disclaimer">Cost Estimate Disclaimer</a>, the <a href="/terms">Terms of Use</a> and the <a href="/privacy">Privacy Policy</a>.</p></div></section>'''


def calculator_page(pricing: dict, cta_html: str) -> str:
    project = ''.join([
        _card('project', 'bathroom', 'Bathroom', 'Full renovation', True),
        _card('project', 'kitchen', 'Kitchen', 'Full renovation'),
        '<a class="calc-card calc-card-link" href="/plan-your-renovation?category=whole_home"><span class="calc-card-body"><span class="calc-card-title">Whole home</span><span class="calc-card-meta">Detailed quote only</span></span></a>',
        '<a class="calc-card calc-card-link" href="/plan-your-renovation?category=extension"><span class="calc-card-body"><span class="calc-card-title">Extension</span><span class="calc-card-meta">Detailed quote only</span></span></a>',
    ])
    sizes = pricing['sizes']
    size = ''.join(_card('size', k, v['label'], v['area'], k == 'medium') for k, v in sizes.items())
    floor = _card('floor', 'concrete', 'Concrete slab', 'Ground-level slab', True) + _card('floor', 'timber', 'Timber or stumps', 'Bearers and joists')
    access = _card('access', 'ground', 'Ground access', 'House or ground-floor', True) + _card('access', 'apartment', 'Apartment', 'Lift, strata, shared walls')
    toggles_b = ''.join([
        _toggle('layoutChange', 'Change the layout', 'Moving the vanity, shower, bath or toilet', 'bathroom'),
        _toggle('wallRemoval', 'Remove a wall', 'Needs a structural assessment first', 'bathroom'),
        _toggle('recessedNiche', 'Recessed shower niche', 'Built-in shelf in the shower wall', 'bathroom'),
        _toggle('olderHome', 'Older home', 'Bathroom is original or from before the 1990s; allows for hidden conditions', 'bathroom'),
    ])
    toggles_k = ''.join([
        _toggle('layoutChange', 'Change the layout', 'Not separately priced; confirmed in your quote', 'kitchen', True),
        _toggle('wallRemoval', 'Remove a wall', 'Not separately priced; needs a structural assessment', 'kitchen', True),
    ])
    finish = ''.join([
        _card('finish', 'essential', 'Standard', 'Budget-friendly fittings, existing layout'),
        _card('finish', 'mid_range', 'Mid-range', 'Quality fixtures, tiles and joinery', True),
        _card('finish', 'premium', 'Premium', 'High-end materials and custom detailing'),
    ])
    supply = _card('supply', 'supply_install', 'Milestone supplies and installs', 'Priced in this estimate', True) + _card('supply', 'own_supply', 'I will supply some items', 'Labour-only is quoted separately')
    diy = _toggle('diyDemolition', 'I will do the demolition myself', 'Saving uses published demolition costs. Licensed asbestos rules still apply.', 'bathroom')
    steps = ''.join([
        _step(1, 'Project type', f'<div class="cc-grid cc-grid-4">{project}</div>', 'Pick the room you are planning. Whole-home and extension costs vary too much for an online range.'),
        _step(2, 'Size and scope', f'<div class="cc-grid cc-grid-3" data-for="bathroom">{size}</div><p class="calc-note" data-for="kitchen" hidden>Published kitchen ranges are not split by size, so the estimate does not change with room size. Tell us about your layout in the next step and we will confirm it in your quote.</p>'),
        _step(3, 'Existing conditions', f'<div class="cc-grid cc-grid-2" data-for="bathroom">{floor}</div><div class="cc-grid cc-grid-2" data-for="bathroom">{access}</div><div class="calc-toggles">{toggles_b}{toggles_k}</div>'),
        _step(4, 'Finish level', f'<div class="cc-grid cc-grid-3">{finish}</div>'),
        _step(5, 'Materials and inclusions', f'<div class="cc-grid cc-grid-2">{supply}</div><div class="calc-toggles">{diy}</div><p class="calc-note" data-for="kitchen" hidden>Kitchen appliances (fridge, cooktop, oven, dishwasher, rangehood) are not included in the range.</p>'),
    ])
    hero = '<section class="inner-hero compact calc-hero"><div class="wrap"><p class="eyebrow inverse">COST PLANNER</p><h1>Renovation cost<br><em>calculator.</em></h1><p>Indicative Sydney ranges in Australian dollars, with timelines and the assumptions behind them. No sign-up needed.</p></div></section>'
    app = f'''<section class="section calc-section"><div class="wrap">
<div class="planning-banner calc-banner" role="note"><strong>Indicative estimate, not a quote.</strong> Ranges are market benchmarks, not Milestone prices. Actual costs depend on inspection, plans, selections, site conditions and a written quotation. <a href="/estimate-disclaimer">Read the disclaimer</a>.</div>
<noscript><p class="form-error-summary">The calculator needs JavaScript. You can still <a href="/plan-your-renovation">share your brief</a> or call us for a detailed quote.</p></noscript>
<div class="calc-layout"><form class="cc-form" id="calculator" data-calculator aria-label="Renovation cost calculator" novalidate><a class="cc-live" href="#calc-result" aria-label="Jump to your full estimate">Estimating…</a>{steps}</form>
<aside class="calc-summary" id="calc-result" aria-label="Your estimate" tabindex="-1"><div class="calc-summary-inner" data-result><p class="calc-loading" role="status">Loading your estimate…</p></div></aside></div></div></section>'''
    return hero + app + _methodology(pricing) + cta_html
