-- Allow longer application details while keeping application and database
-- validation aligned.

alter table public.applications
  drop constraint if exists applications_role_len,
  add constraint applications_role_len
  check (char_length(role) between 1 and 100),
  drop constraint if exists applications_company_len,
  add constraint applications_company_len
  check (char_length(company) between 1 and 100),
  drop constraint if exists applications_location_len,
  add constraint applications_location_len
  check (location is null or char_length(location) <= 100);
