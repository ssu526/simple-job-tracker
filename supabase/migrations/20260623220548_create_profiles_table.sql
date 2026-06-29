-- Baseline schema for SimpleJobTracker.
--
-- This first migration is intentionally safe to apply to databases that were
-- originally created with the project's former manual SQL setup files. Future
-- migrations should contain only the incremental change being introduced.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.job_searches (
  id           bigint generated always as identity primary key,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name         text not null,
  date_created date not null default (now() at time zone 'utc')::date,
  created_at   timestamptz not null default now()
);

create table if not exists public.applications (
  id            bigint generated always as identity primary key,
  job_search_id bigint not null references public.job_searches (id) on delete cascade,
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  role          text not null,
  company       text not null,
  location      text,
  status        text not null default 'Applied',
  follow_up     boolean not null default false,
  created_at    timestamptz not null default now()
);

-- Existing manually-created databases may predate the follow-up feature.
alter table public.applications
  add column if not exists follow_up boolean not null default false;

create table if not exists public.timeline_events (
  id             bigint generated always as identity primary key,
  application_id bigint not null references public.applications (id) on delete cascade,
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  event          text not null,
  date           date not null,
  note           text,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Data constraints
-- ---------------------------------------------------------------------------

alter table public.job_searches
  drop constraint if exists job_searches_name_len,
  add constraint job_searches_name_len
  check (char_length(name) between 1 and 100);

alter table public.applications
  drop constraint if exists applications_role_len,
  add constraint applications_role_len
  check (char_length(role) between 1 and 120),
  drop constraint if exists applications_company_len,
  add constraint applications_company_len
  check (char_length(company) between 1 and 120),
  drop constraint if exists applications_location_len,
  add constraint applications_location_len
  check (location is null or char_length(location) <= 120),
  drop constraint if exists applications_status_valid,
  add constraint applications_status_valid
  check (status in ('Applied', 'In progress', 'Accepted', 'Rejected', 'Ghosted', 'Withdrawn'));

alter table public.timeline_events
  drop constraint if exists timeline_events_event_len,
  add constraint timeline_events_event_len
  check (char_length(event) between 1 and 120),
  drop constraint if exists timeline_events_note_len,
  add constraint timeline_events_note_len
  check (note is null or char_length(note) <= 1000);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists job_searches_user_id_created_idx
  on public.job_searches (user_id, created_at);

create index if not exists applications_user_id_idx
  on public.applications (user_id);

create index if not exists applications_job_search_id_idx
  on public.applications (job_search_id);

create index if not exists applications_search_status_created_idx
  on public.applications (job_search_id, status, created_at desc, id desc);

create index if not exists applications_follow_up_created_idx
  on public.applications (job_search_id, created_at desc, id desc)
  where follow_up;

create index if not exists timeline_events_user_id_idx
  on public.timeline_events (user_id);

create index if not exists timeline_events_application_id_idx
  on public.timeline_events (application_id);

-- ---------------------------------------------------------------------------
-- Grants and row-level security
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

revoke all on public.job_searches from anon;
revoke all on public.applications from anon;
revoke all on public.timeline_events from anon;

grant all on public.job_searches to authenticated;
grant all on public.applications to authenticated;
grant all on public.timeline_events to authenticated;

alter table public.job_searches enable row level security;
alter table public.applications enable row level security;
alter table public.timeline_events enable row level security;

drop policy if exists "Users manage their own job searches" on public.job_searches;
drop policy if exists "Users manage their own applications" on public.applications;
drop policy if exists "Users manage their own timeline events" on public.timeline_events;
drop policy if exists "Users can read their own job searches" on public.job_searches;
drop policy if exists "Users can create their own job searches" on public.job_searches;
drop policy if exists "Users can update their own job searches" on public.job_searches;
drop policy if exists "Users can delete their own job searches" on public.job_searches;
drop policy if exists "Users can read their own applications" on public.applications;
drop policy if exists "Users can create applications in their own searches" on public.applications;
drop policy if exists "Users can update applications in their own searches" on public.applications;
drop policy if exists "Users can delete applications in their own searches" on public.applications;
drop policy if exists "Users can read their own timeline events" on public.timeline_events;
drop policy if exists "Users can create events in their own applications" on public.timeline_events;
drop policy if exists "Users can update events in their own applications" on public.timeline_events;
drop policy if exists "Users can delete events in their own applications" on public.timeline_events;

create policy "Users can read their own job searches"
  on public.job_searches for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can create their own job searches"
  on public.job_searches for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own job searches"
  on public.job_searches for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own job searches"
  on public.job_searches for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can read their own applications"
  on public.applications for select
  to authenticated
  using (
    auth.uid() = user_id
    and exists (
      select 1
      from public.job_searches
      where job_searches.id = applications.job_search_id
        and job_searches.user_id = auth.uid()
    )
  );

create policy "Users can create applications in their own searches"
  on public.applications for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.job_searches
      where job_searches.id = applications.job_search_id
        and job_searches.user_id = auth.uid()
    )
  );

create policy "Users can update applications in their own searches"
  on public.applications for update
  to authenticated
  using (
    auth.uid() = user_id
    and exists (
      select 1
      from public.job_searches
      where job_searches.id = applications.job_search_id
        and job_searches.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.job_searches
      where job_searches.id = applications.job_search_id
        and job_searches.user_id = auth.uid()
    )
  );

create policy "Users can delete applications in their own searches"
  on public.applications for delete
  to authenticated
  using (
    auth.uid() = user_id
    and exists (
      select 1
      from public.job_searches
      where job_searches.id = applications.job_search_id
        and job_searches.user_id = auth.uid()
    )
  );

create policy "Users can read their own timeline events"
  on public.timeline_events for select
  to authenticated
  using (
    auth.uid() = user_id
    and exists (
      select 1
      from public.applications
      where applications.id = timeline_events.application_id
        and applications.user_id = auth.uid()
    )
  );

create policy "Users can create events in their own applications"
  on public.timeline_events for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.applications
      where applications.id = timeline_events.application_id
        and applications.user_id = auth.uid()
    )
  );

create policy "Users can update events in their own applications"
  on public.timeline_events for update
  to authenticated
  using (
    auth.uid() = user_id
    and exists (
      select 1
      from public.applications
      where applications.id = timeline_events.application_id
        and applications.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.applications
      where applications.id = timeline_events.application_id
        and applications.user_id = auth.uid()
    )
  );

create policy "Users can delete events in their own applications"
  on public.timeline_events for delete
  to authenticated
  using (
    auth.uid() = user_id
    and exists (
      select 1
      from public.applications
      where applications.id = timeline_events.application_id
        and applications.user_id = auth.uid()
    )
  );
