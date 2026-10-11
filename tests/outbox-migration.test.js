import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

// Applies the original migration, inserts a "legacy" lead, then applies the outbox migration on top.
const sql = (name) => readFileSync(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8');
let db;
let legacyId;

before(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    grant usage on schema public to anon, authenticated, service_role;
  `);
  await db.exec(sql('20261010000000_enquiries.sql'));
  legacyId = (await db.query(`insert into public.enquiries
    (reference, idempotency_key, dedupe_hash, category, name, phone, email, postcode, source, consent_at, consent_version, notification_status)
    values ('MR-LEGACY22', gen_random_uuid(), 'h', 'kitchen', 'Old Lead', '0412345678', 'old@example.com', '2000', 'contact-form', now(), 'v1', 'failed')
    returning id`)).rows[0].id;
  await db.exec(sql('20261011000000_notification_outbox.sql'));
});
after(() => db.close());

const asRole = async (role, fn) => {
  await db.exec(`set role ${role}`);
  try { return await fn(); } finally { await db.exec('reset role'); }
};

test('existing leads survive the migration and become retryable with safe defaults', async () => {
  const { rows } = await db.query('select reference, notification_status, notification_attempts, notification_next_attempt_at, notification_claimed_at from public.enquiries where id = $1', [legacyId]);
  assert.equal(rows[0].reference, 'MR-LEGACY22');
  assert.equal(rows[0].notification_status, 'failed');
  assert.equal(rows[0].notification_attempts, 0);
  assert.equal(rows[0].notification_next_attempt_at, null);
  assert.equal(rows[0].notification_claimed_at, null);
});

test('service_role can record attempts, errors, retry times and leases', async () => {
  await asRole('service_role', () => db.query(
    `update public.enquiries set notification_attempts = 3, notification_last_error = 'resend_500',
       notification_next_attempt_at = now() + interval '1 hour', notification_claimed_at = now() where id = $1`, [legacyId]));
  const { rows } = await db.query('select notification_attempts, notification_last_error from public.enquiries where id = $1', [legacyId]);
  assert.deepEqual(rows[0], { notification_attempts: 3, notification_last_error: 'resend_500' });
});

test('constraints reject negative attempts and oversized error text', async () => {
  await assert.rejects(db.query('update public.enquiries set notification_attempts = -1'), /check constraint/);
  await assert.rejects(db.query('update public.enquiries set notification_last_error = $1', ['x'.repeat(101)]), /check constraint/);
});

test('notification health view reports counts to service_role only', async () => {
  const rows = await asRole('service_role', async () => (await db.query('select * from public.enquiry_notification_health')).rows);
  assert.equal(rows.find((r) => r.notification_status === 'failed').enquiries, 1);
  for (const role of ['anon', 'authenticated']) {
    await assert.rejects(asRole(role, () => db.query('select * from public.enquiry_notification_health')), /permission denied/);
  }
});
