-- Align database text limits with the application validation limits.

update public.job_searches
set name = left(name, 30)
where char_length(name) > 30;

update public.applications
set
  role = left(role, 30),
  company = left(company, 30),
  location = case
    when char_length(location) > 30 then left(location, 30)
    else location
  end
where char_length(role) > 30
   or char_length(company) > 30
   or char_length(location) > 30;

update public.timeline_events
set event = left(event, 30)
where char_length(event) > 30;

alter table public.job_searches
  drop constraint if exists job_searches_name_len,
  add constraint job_searches_name_len
  check (char_length(name) between 1 and 30);

alter table public.applications
  drop constraint if exists applications_role_len,
  add constraint applications_role_len
  check (char_length(role) between 1 and 30),
  drop constraint if exists applications_company_len,
  add constraint applications_company_len
  check (char_length(company) between 1 and 30),
  drop constraint if exists applications_location_len,
  add constraint applications_location_len
  check (location is null or char_length(location) <= 30);

alter table public.timeline_events
  drop constraint if exists timeline_events_event_len,
  add constraint timeline_events_event_len
  check (char_length(event) between 1 and 30),
  drop constraint if exists timeline_events_note_len,
  add constraint timeline_events_note_len
  check (note is null or char_length(note) <= 2000);
