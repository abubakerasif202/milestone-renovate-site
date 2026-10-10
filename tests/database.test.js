import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

// Runs the real migration on in-process Postgres and checks the RLS / constraint model.
let db;
const migration = readFileSync(new URL('../supabase/migrations/20261010000000_enquiries.sql', import.meta.url), 'utf8');

const row = (over = {}) => ({
  reference: 'MR-ABCD2345', key: crypto.randomUUID(), ...over,
});
const insertSql = `insert into public.enquiries
  (reference, idempotency_key, dedupe_hash, category, name, phone, email, suburb, postcode, source, consent_at, consent_version)
  values ($1, $2, 'h', 'kitchen', 'Jo Bloggs', '0412345678', 'jo@example.com', 'Sydney', '2000', 'contact-form', now(), 'v1')
  returning id`;

before(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    grant usage on schema public to anon, authenticated, service_role;
  `);
  await db.exec(migration);
});
after(() => db.close());

const asRole = async (role, fn) => {
  await db.exec(`set role ${role}`);
  try { return await fn(); } finally { await db.exec('reset role'); }
};

test('service_role can insert and read enquiries; status trigger records history', async () => {
  const r = row();
  const id = await asRole('service_role', async () => (await db.query(insertSql, [r.reference, r.key])).rows[0].id);
  await asRole('service_role', () => db.query(`update public.enquiries set status = 'contacted' where id = $1`, [id]));
  const events = await db.query('select from_status, to_status from public.enquiry_status_events where enquiry_id = $1 order by created_at, to_status', [id]);
  assert.deepEqual(events.rows.map((e) => e.to_status).sort(), ['contacted', 'new']);
});

for (const role of ['anon', 'authenticated']) {
  test(`${role} cannot read, insert, update or delete enquiries`, async () => {
    await assert.rejects(asRole(role, () => db.query('select * from public.enquiries')), /permission denied/);
    await assert.rejects(asRole(role, () => db.query(insertSql, ['MR-ZZZZ2222', crypto.randomUUID()])), /permission denied/);
    await assert.rejects(asRole(role, () => db.query(`update public.enquiries set status = 'won'`)), /permission denied/);
    await assert.rejects(asRole(role, () => db.query('delete from public.enquiries')), /permission denied/);
    await assert.rejects(asRole(role, () => db.query('select * from public.enquiry_notes')), /permission denied/);
    await assert.rejects(asRole(role, () => db.query('select * from public.enquiry_pipeline_summary')), /permission denied/);
  });
}

test('RLS denies even if table privileges were granted back (defence in depth)', async () => {
  await db.exec('grant select on public.enquiries to anon');
  try {
    const rows = await asRole('anon', async () => (await db.query('select * from public.enquiries')).rows);
    assert.equal(rows.length, 0, 'no policy means no visible rows');
  } finally {
    await db.exec('revoke select on public.enquiries from anon');
  }
});

test('constraints reject bad data', async () => {
  const bad = (sql, params) => assert.rejects(asRole('service_role', () => db.query(sql, params)), /violates|check constraint/);
  await bad(insertSql.replace("'jo@example.com'", "'not-an-email'"), ['MR-BBBB2222', crypto.randomUUID()]);
  await bad(insertSql.replace("'2000'", "'20'"), ['MR-CCCC2222', crypto.randomUUID()]);
  await bad(insertSql, ['bad-ref', crypto.randomUUID()]);
  const r = row({ reference: 'MR-DUPE2222' });
  await asRole('service_role', () => db.query(insertSql, [r.reference, r.key]));
  await bad(insertSql, [r.reference, crypto.randomUUID()]); // duplicate reference
  await bad(insertSql, ['MR-EEEE2222', r.key]); // duplicate idempotency key
  await bad(insertSql.replace("'Sydney', '2000'", 'null, null'), ['MR-FFFF2222', crypto.randomUUID()]); // no location
});
