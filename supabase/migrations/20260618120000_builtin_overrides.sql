-- Overrides for hardcoded built-in levels (admin-only writes, public reads)
CREATE TABLE public.admin_builtin_overrides (
  id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  builtin_level_id TEXT       NOT NULL,   -- e.g. "fr-v-a1-1"
  card_id         TEXT        NOT NULL,   -- original card ID (to edit/hide) or new UUID (to add)
  english         TEXT        NOT NULL DEFAULT '',
  target          TEXT        NOT NULL DEFAULT '',
  alternatives    JSONB       NOT NULL DEFAULT '[]'::jsonb,
  transliteration TEXT,
  position        INTEGER     NOT NULL DEFAULT 0,
  hidden          BOOLEAN     NOT NULL DEFAULT false,  -- true = remove this card
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_builtin_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated users can read admin_builtin_overrides"
  ON public.admin_builtin_overrides FOR SELECT
  USING (auth.role() = 'authenticated');

-- Atomic replace: wipe then re-insert all overrides for a level
CREATE OR REPLACE FUNCTION public.admin_save_builtin_overrides(
  p_level_id  TEXT,
  p_overrides JSONB
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT email FROM auth.users WHERE id = auth.uid()) != 'davejayden49@gmail.com' THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  DELETE FROM admin_builtin_overrides WHERE builtin_level_id = p_level_id;

  INSERT INTO admin_builtin_overrides
    (builtin_level_id, card_id, english, target, alternatives, transliteration, position, hidden)
  SELECT
    p_level_id,
    c->>'card_id',
    COALESCE(c->>'english', ''),
    COALESCE(c->>'target', ''),
    COALESCE(c->'alternatives', '[]'::jsonb),
    NULLIF(c->>'transliteration', ''),
    COALESCE((c->>'position')::int, 0),
    COALESCE((c->>'hidden')::boolean, false)
  FROM jsonb_array_elements(p_overrides) AS c
  WHERE (c->>'card_id') IS NOT NULL;
END;
$$;
