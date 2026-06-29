-- Rename application status values and add Ghosted / Withdrawn.

alter table public.applications
  drop constraint if exists applications_status_valid;

update public.applications
set status = case status
  when 'Interview' then 'In progress'
  when 'Offer' then 'Accepted'
  else status
end
where status in ('Interview', 'Offer');

alter table public.applications
  add constraint applications_status_valid
  check (status in ('Applied', 'In progress', 'Accepted', 'Rejected', 'Ghosted', 'Withdrawn'));
