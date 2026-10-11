import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

const pub = (f) => new URL(`../public/${f}`, import.meta.url);
const html = (f) => readFileSync(pub(f), 'utf8');
const pages = [...readdirSync(pub('')).filter((f) => f.endsWith('.html')), ...readdirSync(pub('concepts')).map((f) => `concepts/${f}`)];

test('team section publishes both portraits, titles and the approved biographies', () => {
  const about = html('about.html');
  assert.match(about, /id="team"/);
  for (const text of ['MEET THE TEAM', 'Experienced leadership. Thoughtful renovations.', 'Exceptional attention to detail.',
    'Mohammad Mohsini', 'Construction &amp; Project Delivery', 'With 10 years of experience across residential and commercial construction',
    'James Creswick', 'Renovation Specialist', 'James Creswick specialises in supporting renovation and extension projects',
    'Great renovations begin with clear planning, practical experience and people who take responsibility for the details.']) {
    assert.ok(about.includes(text), text);
  }
  assert.equal((about.match(/class="team-card"/g) || []).length, 2);
  assert.match(about, /alt="Portrait of Mohammad Mohsini, Construction &amp; Project Delivery at Milestone Renovate"/);
  assert.match(about, /alt="Portrait of James Creswick, Renovation Specialist at Milestone Renovate"/);
  assert.match(about, /width="1122" height="1402"/);
});

test('portrait files are published and the full-size variant is the unmodified supplied image', () => {
  for (const slug of ['mohammad-mohsini', 'james-creswick']) {
    for (const w of [480, 800, 1122]) assert.ok(existsSync(pub(`assets/img/team/${slug}-${w}.webp`)), `${slug}-${w}`);
    assert.ok(readFileSync(pub(`assets/img/team/${slug}-1122.webp`)).equals(readFileSync(new URL(`../assets/team/${slug}.webp`, import.meta.url))));
  }
});

test('team is reachable from the about hero and the footer on every page', () => {
  assert.match(html('about.html'), /href="#team"/);
  for (const f of pages) assert.match(html(f), /href="\/about#team">Meet the Team/, f);
});

test('no draft, legal-review or placeholder language is published anywhere', () => {
  const banned = /working draft|draft version|needs legal review|pending legal|before public launch|lorem ipsum|\bTODO\b|\bTBC\b|\[insert|approval for this brand/i;
  for (const f of pages) assert.doesNotMatch(html(f), banned, f);
});

test('legal pages exist, are linked from every footer, and are in the sitemap', () => {
  const sitemap = html('sitemap.xml').replace(/\r/g, '');
  for (const [file, slug] of [['privacy.html', 'privacy'], ['terms.html', 'terms'], ['estimate-disclaimer.html', 'estimate-disclaimer']]) {
    assert.ok(existsSync(pub(file)), file);
    assert.ok(sitemap.includes(`https://milestonerenovate.com/${slug}</loc>`), slug);
    for (const f of pages) assert.ok(html(f).includes(`href="/${slug}"`), `${f} -> ${slug}`);
  }
});

test('privacy policy describes the real providers and does not invent registration or retention facts', () => {
  const t = html('privacy.html');
  for (const must of ['Supabase', 'Resend', 'Vercel', 'oaic.gov.au', '1300 363 992', 'Australian Privacy Principles', 'Spam Act 2003', 'does not use advertising cookies']) assert.ok(t.includes(must), must);
  assert.doesNotMatch(t, /\bABN\b|ACN|\b\d{2} \d{3} \d{3} \d{3}\b|retain(ed)? for \d+|\d+ (years|months)/i);
});

test('terms and disclaimer keep consumer-law rights, separate website terms from building contracts, and call estimates indicative', () => {
  const terms = html('terms.html'); const dis = html('estimate-disclaimer.html');
  assert.match(terms, /Australian Consumer Law/);
  assert.match(terms, /does not replace one|do not replace one/);
  assert.match(terms, /\$5,000/);
  assert.match(dis, /not a quotation, an offer, a fixed price or a contract/);
  assert.match(dis, /Australian Consumer Law/);
  assert.match(dis, /include GST/);
});

test('the official business email is milestonerenovate.com and no Milestone Development email remains', () => {
  for (const f of pages) {
    const t = html(f);
    assert.doesNotMatch(t, /admin@milestonedevelopment/, f);
    for (const m of t.matchAll(/mailto:([^"]+)"/g)) assert.equal(m[1], 'admin@milestonerenovate.com', f);
  }
  const home = html('index.html');
  assert.match(home, /"email": "admin@milestonerenovate\.com"/);
  assert.match(html('contact.html'), /mailto:admin@milestonerenovate\.com/);
  assert.match(html('privacy.html'), /mailto:admin@milestonerenovate\.com/);
  assert.match(html('terms.html'), /mailto:admin@milestonerenovate\.com/);
});
