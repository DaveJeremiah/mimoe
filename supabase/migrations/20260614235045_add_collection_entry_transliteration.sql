-- Optional romanized reading per collection entry (shown for Arabic).
alter table public.collection_entries
  add column if not exists transliteration text;
