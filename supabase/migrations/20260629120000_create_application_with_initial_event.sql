create or replace function public.create_application_with_initial_event(
  p_job_search_id bigint,
  p_role text,
  p_company text,
  p_location text default null,
  p_date date default current_date
)
returns table (
  application_id bigint,
  role text,
  company text,
  location text,
  status text,
  follow_up boolean,
  application_created_at timestamptz,
  event_id bigint,
  event text,
  event_date date,
  event_note text
)
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  created_application public.applications;
  created_event public.timeline_events;
begin
  if not exists (
    select 1
    from public.job_searches
    where id = p_job_search_id
      and user_id = auth.uid()
  ) then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  insert into public.applications (
    job_search_id,
    user_id,
    role,
    company,
    location,
    status,
    follow_up
  )
  values (
    p_job_search_id,
    auth.uid(),
    p_role,
    p_company,
    p_location,
    'Applied',
    false
  )
  returning * into created_application;

  insert into public.timeline_events (
    application_id,
    user_id,
    event,
    date
  )
  values (
    created_application.id,
    auth.uid(),
    'Applied',
    p_date
  )
  returning * into created_event;

  return query
  select
    created_application.id,
    created_application.role,
    created_application.company,
    created_application.location,
    created_application.status,
    created_application.follow_up,
    created_application.created_at,
    created_event.id,
    created_event.event,
    created_event.date,
    created_event.note;
end;
$$;

revoke all on function public.create_application_with_initial_event(
  bigint, text, text, text, date
) from public;
revoke all on function public.create_application_with_initial_event(
  bigint, text, text, text, date
) from anon;
grant execute on function public.create_application_with_initial_event(
  bigint, text, text, text, date
) to authenticated;
