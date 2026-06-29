begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

select ok(
  has_function_privilege(
    'authenticated',
    'public.get_application_status_counts(bigint)',
    'execute'
  ),
  'authenticated users can execute the status-count function'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.get_application_status_counts(bigint)',
    'execute'
  ),
  'anonymous users cannot execute the status-count function'
);

insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-000000000101', 'db-owner@example.test'),
  ('00000000-0000-0000-0000-000000000102', 'db-other@example.test');

insert into public.job_searches (id, user_id, name)
overriding system value
values
  (910001, '00000000-0000-0000-0000-000000000101', 'Owner search'),
  (910002, '00000000-0000-0000-0000-000000000102', 'Other search'),
  (910003, '00000000-0000-0000-0000-000000000101', 'Empty search');

insert into public.applications (
  id,
  job_search_id,
  user_id,
  role,
  company,
  status,
  follow_up
)
overriding system value
values
  (920001, 910001, '00000000-0000-0000-0000-000000000101', 'Role 1', 'Acme', 'Applied', true),
  (920002, 910001, '00000000-0000-0000-0000-000000000101', 'Role 2', 'Acme', 'Applied', false),
  (920003, 910001, '00000000-0000-0000-0000-000000000101', 'Role 3', 'Acme', 'In progress', true),
  (920004, 910001, '00000000-0000-0000-0000-000000000101', 'Role 4', 'Acme', 'Accepted', false),
  (920005, 910001, '00000000-0000-0000-0000-000000000101', 'Role 5', 'Acme', 'Rejected', false),
  (920006, 910001, '00000000-0000-0000-0000-000000000101', 'Role 6', 'Acme', 'Ghosted', false),
  (920007, 910001, '00000000-0000-0000-0000-000000000101', 'Role 7', 'Acme', 'Withdrawn', false),
  (920008, 910002, '00000000-0000-0000-0000-000000000102', 'Other role', 'Other', 'Applied', false);

insert into public.timeline_events (
  id,
  application_id,
  user_id,
  event,
  date
)
overriding system value
values
  (930001, 920001, '00000000-0000-0000-0000-000000000101', 'Applied', '2026-06-01'),
  (930002, 920008, '00000000-0000-0000-0000-000000000102', 'Applied', '2026-06-01');

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000101',
  true
);

select results_eq(
  $$ select id from public.job_searches order by id $$,
  $$ values (910001::bigint), (910003::bigint) $$,
  'job-search select policy exposes only owned rows'
);

select results_eq(
  $$ select id from public.applications order by id $$,
  $$
    values
      (920001::bigint),
      (920002::bigint),
      (920003::bigint),
      (920004::bigint),
      (920005::bigint),
      (920006::bigint),
      (920007::bigint)
  $$,
  'application select policy exposes only owned rows'
);

select results_eq(
  $$ select id from public.timeline_events order by id $$,
  $$ values (930001::bigint) $$,
  'timeline-event select policy exposes only owned rows'
);

select lives_ok(
  $$
    insert into public.job_searches (user_id, name)
    values (
      '00000000-0000-0000-0000-000000000101',
      'Allowed search'
    )
  $$,
  'a user can insert their own job search'
);

select throws_ok(
  $$
    insert into public.applications (
      job_search_id,
      user_id,
      role,
      company
    )
    values (
      910002,
      '00000000-0000-0000-0000-000000000101',
      'Blocked role',
      'Blocked company'
    )
  $$,
  '42501',
  null,
  'a user cannot insert an application into another user search'
);

select throws_ok(
  $$
    insert into public.timeline_events (
      application_id,
      user_id,
      event,
      date
    )
    values (
      920008,
      '00000000-0000-0000-0000-000000000101',
      'Blocked event',
      '2026-06-26'
    )
  $$,
  '42501',
  null,
  'a user cannot insert an event into another user application'
);

select results_eq(
  $$
    update public.applications
    set role = 'Blocked update'
    where id = 920008
    returning id
  $$,
  $$ select null::bigint where false $$,
  'a user cannot update another user application'
);

select results_eq(
  $$
    delete from public.timeline_events
    where id = 930002
    returning id
  $$,
  $$ select null::bigint where false $$,
  'a user cannot delete another user timeline event'
);

select results_eq(
  $$
    select
      all_count,
      applied_count,
      in_progress_count,
      accepted_count,
      rejected_count,
      ghosted_count,
      withdrawn_count,
      follow_up_count
    from public.get_application_status_counts(910001)
  $$,
  $$ values (7::bigint, 2::bigint, 1::bigint, 1::bigint, 1::bigint, 1::bigint, 1::bigint, 2::bigint) $$,
  'status-count function returns all status and follow-up counts'
);

select results_eq(
  $$ select * from public.get_application_status_counts(910003) $$,
  $$ values (0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint) $$,
  'status-count function returns zeroes for an empty search'
);

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000102',
  true
);

select throws_ok(
  $$ select * from public.get_application_status_counts(910001) $$,
  '42501',
  'Unauthorized',
  'status-count function rejects another user search'
);

select throws_ok(
  $$ select * from public.get_application_status_counts(999999) $$,
  '42501',
  'Unauthorized',
  'status-count function rejects a missing search'
);

select * from finish();

rollback;
