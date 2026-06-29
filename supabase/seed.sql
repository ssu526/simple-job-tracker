-- Local demo accounts
--
--   demo.small@example.com  (40 applications)
--   demo.large@example.com  (120 applications)
--
-- These passwordless accounts are intended for magic-link sign-in. Fixed UUIDs
-- make the seed deterministic. Removing either user first also removes all of
-- their existing demo data through the foreign-key cascades.

delete from auth.users
where id in (
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002'
)
or email in ('demo.small@example.com', 'demo.large@example.com');

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  email_change_token_current,
  reauthentication_token,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'demo.small@example.com',
    '',
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Alex Demo"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'demo.large@example.com',
    '',
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Morgan Demo"}'::jsonb,
    now(),
    now()
  );

insert into auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
values
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '{"sub":"10000000-0000-4000-8000-000000000001","email":"demo.small@example.com","email_verified":true}'::jsonb,
    'email',
    now(),
    now(),
    now()
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    '{"sub":"10000000-0000-4000-8000-000000000002","email":"demo.large@example.com","email_verified":true}'::jsonb,
    'email',
    now(),
    now(),
    now()
  );

insert into public.job_searches (user_id, name, date_created, created_at)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'Product & Design Roles',
    current_date - 120,
    now() - interval '120 days'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'Engineering Roles',
    current_date - 240,
    now() - interval '240 days'
  );

-- Generate 40 applications for the smaller account and 120 for the larger
-- account. Array lookups provide repeatable but varied demo content.
with demo_users as (
  select *
  from (
    values
      ('10000000-0000-4000-8000-000000000001'::uuid, 40, 120),
      ('10000000-0000-4000-8000-000000000002'::uuid, 120, 240)
  ) as users(user_id, application_count, search_age_days)
),
demo_searches as (
  select js.id, js.user_id, du.application_count, du.search_age_days
  from public.job_searches js
  join demo_users du on du.user_id = js.user_id
)
insert into public.applications (
  job_search_id,
  user_id,
  role,
  company,
  location,
  status,
  follow_up,
  created_at
)
select
  ds.id,
  ds.user_id,
  (array[
    'Software Engineer', 'Product Designer', 'Data Analyst',
    'Product Manager', 'Frontend Developer', 'UX Researcher',
    'Backend Developer', 'Design Engineer'
  ])[1 + ((n - 1) % 8)],
  (array[
    'Northstar Labs', 'Maple Systems', 'Orbit Works', 'Brightside',
    'Acorn Digital', 'Lakehouse', 'Juniper AI', 'Copper Cloud',
    'Daybreak', 'Evergreen Tech'
  ])[1 + ((n - 1) % 10)],
  (array[
    'Toronto, ON', 'Remote', 'Vancouver, BC', 'Montreal, QC',
    'New York, NY', 'Ottawa, ON'
  ])[1 + ((n - 1) % 6)],
  case
    when ds.user_id = '10000000-0000-4000-8000-000000000002' and n = 1
      then 'Accepted'
    else
      (array[
        'Applied', 'In progress', 'Rejected', 'Ghosted',
        'Withdrawn', 'Applied', 'In progress'
      ])[1 + ((n - 1) % 7)]
  end,
  n % 9 = 0,
  now() - make_interval(
    days => greatest(1, ds.search_age_days - (n * ds.search_age_days / ds.application_count))
  )
from demo_searches ds
cross join lateral generate_series(1, ds.application_count) as series(n);

-- Give every application at most seven timeline events. Applied applications
-- only have their initial event, in-progress applications end at a non-terminal
-- step, and completed applications end with an event matching their status.
insert into public.timeline_events (
  application_id,
  user_id,
  event,
  date,
  note,
  created_at
)
select
  application.id,
  application.user_id,
  case
    when event_number = event_count
      and application.status in ('Accepted', 'Rejected', 'Withdrawn', 'Ghosted')
      then application.status
    else
      (array[
        'Applied', 'Recruiter screen', 'Hiring manager call',
        'Take-home exercise', 'Panel interview', 'Final interview'
      ])[event_number]
  end,
  (application.created_at + make_interval(days => (event_number - 1) * 4))::date,
  case
    when event_number = event_count
      and application.status in ('Accepted', 'Rejected', 'Withdrawn', 'Ghosted')
      then 'Hiring process closed with a final outcome.'
    else case event_number
      when 1 then 'Application sent through the company careers page.'
      when 2 then 'Discussed the role, team, and hiring process.'
      when 3 then 'Conversation focused on experience and role expectations.'
      when 4 then 'Completed the requested exercise and shared the result.'
      when 5 then 'Met with several members of the prospective team.'
      when 6 then 'Final conversation and time for remaining questions.'
    end
  end,
  application.created_at + make_interval(days => (event_number - 1) * 4)
from public.applications application
cross join lateral (
  select case application.status
    when 'Applied' then 1
    when 'In progress' then 2 + ((application.id - 1) % 5)::integer
    else 2 + ((application.id - 1) % 6)::integer
  end as event_count
) event_totals
cross join lateral generate_series(1, event_count) as events(event_number)
where application.user_id in (
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002'
);
