-- Allow user-supplied audio per collection entry (recorded or uploaded),
-- stored as a base64 data URI for short word/phrase clips.
alter table public.collection_entries
  add column if not exists audio_url text;
