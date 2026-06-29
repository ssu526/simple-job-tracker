create or replace function public.get_application_status_counts(
  p_job_search_id bigint
)
returns table (
  all_count bigint,
  applied_count bigint,
  in_progress_count bigint,
  accepted_count bigint,
  rejected_count bigint,
  ghosted_count bigint,
  withdrawn_count bigint,
  follow_up_count bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.job_searches
    where id = p_job_search_id
      and user_id = auth.uid()
  ) then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  return query
  select
    count(*) as all_count,
    count(*) filter (where status = 'Applied') as applied_count,
    count(*) filter (where status = 'In progress') as in_progress_count,
    count(*) filter (where status = 'Accepted') as accepted_count,
    count(*) filter (where status = 'Rejected') as rejected_count,
    count(*) filter (where status = 'Ghosted') as ghosted_count,
    count(*) filter (where status = 'Withdrawn') as withdrawn_count,
    count(*) filter (where follow_up) as follow_up_count
  from public.applications
  where job_search_id = p_job_search_id
    and user_id = auth.uid();
end;
$$;

revoke all on function public.get_application_status_counts(bigint) from public;
revoke all on function public.get_application_status_counts(bigint) from anon;
grant execute on function public.get_application_status_counts(bigint) to authenticated;
