-- Allow timeline notes to hold full job descriptions and longer recruiting
-- context while keeping the database aligned with application validation.

alter table public.timeline_events
  drop constraint if exists timeline_events_note_len,
  add constraint timeline_events_note_len
  check (note is null or char_length(note) <= 10000);
