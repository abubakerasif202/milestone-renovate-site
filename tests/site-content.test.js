import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const pub = (f) => new URL(`../public/${f}`, import.meta.url);
const html = (f) => readFileSync(pub(f), 'utf8');
const pages = [...readdirSync(pub('')).filter((f) => f.endsWith('.html')), ...readdirSync(pub('concepts')).map((f) => `concepts/${f}`)];

test('team section publishes the user-confirmed names, portrait mapping and factual copy', () => {
  const about = html('about.html');
  assert.match(about, /id="team"/);
  for (const text of ['MEET THE TEAM', 'A hands-on team. Thoughtful renovations.', 'Careful attention to detail.',
    'James Creswick', 'Kamala Najafi', 'Muhammad Mohsini',
    'Meet James Creswick, Kamala Najafi and Muhammad Mohsini.']) {
    assert.ok(about.includes(text), text);
  }
  assert.equal((about.match(/class="team-card"/g) || []).length, 3);
  const at = (name) => about.indexOf(`<h3>${name}</h3>`);
  assert.ok(at('James Creswick') > 0 && at('James Creswick') < at('Kamala Najafi') && at('Kamala Najafi') < at('Muhammad Mohsini'), 'order James, Kamala, Muhammad');
  const cards = about.split('class="team-card"').slice(1).map((c) => c.split('</article>')[0]);
  assert.deepEqual(cards.map((card) => card.match(/src="([^"]+)"/)?.[1]), [
    '/assets/img/team/james-creswick-800.webp',
    '/assets/img/team/kamala-najafi-800.webp',
    '/assets/img/team/muhammad-mohsini-800.webp',
  ]);
  assert.match(cards[0], /alt="James Creswick, smiling with light-brown hair in a green Milestone Development shirt"/);
  assert.match(cards[1], /alt="Kamala Najafi, dark-haired and bearded in a green Milestone Renovate shirt"/);
  assert.match(cards[2], /alt="Muhammad Mohsini, clean-shaven with dark hair in a green Milestone Renovate shirt"/);
  assert.doesNotMatch(cards.join(' '), /team-role|years of .*experience|speciali[sz]es|builder-led|project delivery/i);
  assert.equal((about.match(/width="1122" height="1402"/g) || []).length, 3);

  const ld = JSON.parse(about.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1]);
  const people = ld['@graph'].filter((item) => item['@type'] === 'Person');
  assert.deepEqual(people.map((person) => person.name), ['James Creswick', 'Kamala Najafi', 'Muhammad Mohsini']);
  assert.deepEqual(people.map((person) => person.image), [
    'https://milestonerenovate.com/assets/img/team/james-creswick-1122.webp',
    'https://milestonerenovate.com/assets/img/team/kamala-najafi-1122.webp',
    'https://milestonerenovate.com/assets/img/team/muhammad-mohsini-1122.webp',
  ]);
});

test('portrait files are published and the full-size variant is the unmodified supplied image', () => {
  const confirmedPortraitHashes = {
    'james-creswick': '321b78739b8c0af31fa100fbbc2d2ea6c331deb7331840009bca7d43e9482466',
    'kamala-najafi': '688f0ac75f87bd3b023b9e46183177444baaf7f5e59a53e22feea7eb1e0826f4',
    'muhammad-mohsini': 'fdb825c5754edda7c619a88df237b0c24c243c9eaf4168b2f7dd83839de9eb85',
  };
  for (const [slug, sha256] of Object.entries(confirmedPortraitHashes)) {
    for (const w of [480, 800, 1122]) assert.ok(existsSync(pub(`assets/img/team/${slug}-${w}.webp`)), `${slug}-${w}`);
    const source = readFileSync(new URL(`../assets/team/${slug}.webp`, import.meta.url));
    assert.equal(createHash('sha256').update(source).digest('hex'), sha256, `${slug} is the confirmed original portrait`);
    assert.ok(readFileSync(pub(`assets/img/team/${slug}-1122.webp`)).equals(source));
  }
  for (const stale of ['kamal-najafi', 'mohammad-mohsini']) for (const w of [480, 800, 1122]) assert.ok(!existsSync(pub(`assets/img/team/${stale}-${w}.webp`)), `${stale}-${w} is removed`);
});

test('removed extension, second-storey and approvals content is not published or linked', () => {
  const banned = [/href="\/approvals-guide"/, /href="\/extensions"/, /category=extension/, /second[ -]storey/i, /complying development/i, /Development Application/, /\bCDC\b/];
  for (const f of pages) for (const re of banned) assert.doesNotMatch(html(f), re, `${f} ${re}`);
  const sitemap = html('sitemap.xml');
  assert.ok(!sitemap.includes('/extensions') && !sitemap.includes('/approvals-guide'));
  for (const f of ['extensions.html', 'approvals-guide.html', 'js/approvals-checker.js']) assert.ok(!existsSync(pub(f)), f);
  const plan = html('plan-your-renovation.html');
  assert.doesNotMatch(plan, /value="extension"/);
  assert.doesNotMatch(plan, /value="second_storey"/);
});

test('vercel.json permanently redirects the removed pages to /services', () => {
  const { redirects } = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  for (const source of ['/extensions', '/approvals-guide']) {
    const r = redirects.find((x) => x.source === source);
    assert.ok(r, source);
    assert.equal(r.destination, '/services');
    assert.equal(r.permanent, true);
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
  assert.doesNotMatch(t, /\bABN\b|\b\d{2} \d{3} \d{3} \d{3}\b|retain(ed)? for \d+|\d+ (years|months)/i);
  // The only company number allowed is the one verified on the NSW Fair Trading register (licence 501094C).
  for (const [, acn] of t.matchAll(/ACN\s+([\d ]{9,11})/g)) assert.equal(acn.trim(), '697 166 715');
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

test('legal pages present Milestone Renovate as a brand operated under Milestone Development, not a separate entity', () => {
  for (const f of ['privacy.html', 'terms.html']) {
    const t = html(f);
    assert.match(t, /renovation brand operated under/, f);
    assert.match(t, /Milestone Development operating as Milestone Renovate/, f);
    assert.doesNotMatch(t, /sister brand|sister website|Milestone Renovate Pty|Milestone Renovate Limited|\bABN\b|licence (no|number)\.? ?\d|Lic(ence)? ?#? ?\d{4,}/i, f);
  }
  for (const f of pages) assert.doesNotMatch(html(f), /sister (brand|website)/i, f);
});

test('contracts and quotations are described as issued by the responsible contracting entity', () => {
  for (const f of ['terms.html', 'estimate-disclaimer.html']) {
    assert.match(html(f), /issued by the contracting entity\s+responsible for the work|issued by the contracting entity responsible for the work/, f);
  }
});

test('privacy policy states the Sydney database and the real overseas processing arrangements', () => {
  const t = html('privacy.html');
  assert.match(t, /hosted in Sydney, Australia/);
  assert.match(t, /Japan \(Tokyo\)/);
  assert.match(t, /Microsoft 365/);
  assert.match(t, /may be handled in other countries/);
  assert.doesNotMatch(t, /such as the United States/);
});

test('the shared phone 1800 008 883 is used everywhere and no other number appears', () => {
  for (const f of pages) {
    const t = html(f);
    for (const m of t.matchAll(/href="tel:([^"]+)"/g)) assert.equal(m[1], '1800008883', f);
    assert.doesNotMatch(t.replace(/1800 ?008 ?883/g, '').replace(/1300 363 992/g, '') /* OAIC complaints line, privacy page only */, /\b1[38]00[ -]?\d{3}[ -]?\d{3}\b|\b0[2378] ?\d{4} ?\d{4}\b/, f);
  }
  assert.match(html('index.html'), /"telephone": "1800 008 883"/);
  for (const f of ['public/js/lib/enquiry-client.js', 'public/js/booking-ui.js']) {
    assert.match(readFileSync(new URL(`../${f}`, import.meta.url), 'utf8'), /1800 008 883/, f);
  }
});
