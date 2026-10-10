-- Milestone Renovate: lead / enquiry storage.
-- Access model: RLS is enabled with NO policies for anon/authenticated, so only the
-- server (service_role, which bypasses RLS) can read or write. Browsers never touch the DB.

create type public.enquiry_status as enum
  ('new', 'contacted', 'consultation_booked', 'quoted', 'won', 'lost');

create type public.renovation_category as enum
  ('kitchen', 'bathroom', 'whole_home', 'extension', 'other');

create table public.enquiries (
  id               uuid primary key default gen_random_uuid(),
  reference        text not null unique check (reference ~ '^MR-[A-Z0-9]{8}$'),
  idempotency_key  uuid not null unique,
  dedupe_hash      text not null,
  status           public.enquiry_status not null default 'new',
  category         public.renovation_category not null,
  name             text not null check (char_length(name) between 2 and 120),
  phone            text not null check (char_length(phone) between 8 and 20),
  email            text not null check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  suburb           text check (suburb is null or char_length(suburb) between 2 and 80),
  postcode         text check (postcode is null or postcode ~ '^[0-9]{4}$'),
  budget_range     text check (budget_range in ('under_50k','50k_100k','100k_250k','250k_plus','discuss')),
  timeline         text check (timeline in ('asap','3_6_months','6_plus_months','exploring')),
  details          text check (details is null or char_length(details) <= 4000),
  wizard_data      jsonb,
  source           text not null check (source in ('contact-form','wizard','calculator')),
  source_page      text check (source_page is null or char_length(source_page) <= 200),
  consent_at       timestamptz not null,
  consent_version  text not null,
  ip_hash          text,
  assigned_to      text,
  last_contacted_at timestamptz,
  internal_notes   text,
  notification_status text not null default 'pending'
                   check (notification_status in ('pending','sent','failed','skipped')),
  notified_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint enquiries_location_present check (suburb is not null or postcode is not null)
);

create index enquiries_status_created_idx on public.enquiries (status, created_at desc);
create index enquiries_category_idx       on public.enquiries (category);
create index enquiries_dedupe_idx         on public.enquiries (dedupe_hash, created_at desc);
create index enquiries_ip_recent_idx      on public.enquiries (ip_hash, created_at desc) where ip_hash is not null;
create index enquiries_assigned_idx       on public.enquiries (assigned_to) where assigned_to is not null;

create table public.enquiry_notes (
  id          uuid primary key default gen_random_uuid(),
  enquiry_id  uuid not null references public.enquiries(id) on delete cascade,
  author      text not null,
  body        text not null check (char_length(body) between 1 and 4000),
  created_at  timestamptz not null default now()
);
create index enquiry_notes_enquiry_idx on public.enquiry_notes (enquiry_id, created_at desc);

create table public.enquiry_status_events (
  id          uuid primary key default gen_random_uuid(),
  enquiry_id  uuid not null references public.enquiries(id) on delete cascade,
  from_status public.enquiry_status,
  to_status   public.enquiry_status not null,
  created_at  timestamptz not null default now()
);
create index enquiry_status_events_idx on public.enquiry_status_events (enquiry_id, created_at);

create function public.enquiries_touch() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    insert into public.enquiry_status_events (enquiry_id, from_status, to_status)
    values (new.id, null, new.status);
  elsif new.status is distinct from old.status then
    insert into public.enquiry_status_events (enquiry_id, from_status, to_status)
    values (new.id, old.status, new.status);
  end if;
  return new;
end $$;

create trigger enquiries_before_update before update on public.enquiries
  for each row execute function public.enquiries_touch();
create trigger enquiries_after_insert after insert on public.enquiries
  for each row execute function public.enquiries_touch();

-- Internal reporting (server / future admin only; invoker rights so RLS still applies).
create view public.enquiry_pipeline_summary with (security_invoker = true) as
  select date_trunc('week', created_at)::date as week,
         category, status, count(*) as enquiries
  from public.enquiries
  group by 1, 2, 3;

-- Lock everything down.
alter table public.enquiries             enable row level security;
alter table public.enquiry_notes         enable row level security;
alter table public.enquiry_status_events enable row level security;
alter table public.enquiries             force row level security;

revoke all on public.enquiries, public.enquiry_notes, public.enquiry_status_events,
              public.enquiry_pipeline_summary from anon, authenticated;
grant select, insert, update on public.enquiries to service_role;
grant select, insert, update on public.enquiry_notes, public.enquiry_status_events to service_role;
grant select on public.enquiry_pipeline_summary to service_role;
-- Intentionally no RLS policies: anon/authenticated are denied all access.
-- A protected admin UI later should add explicit policies for an `admin` role claim.
