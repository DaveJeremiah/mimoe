-- ─── Admin Levels (global, visible to all authenticated users) ───────────────

CREATE TABLE public.admin_levels (
  id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title      TEXT        NOT NULL,
  tab        TEXT        NOT NULL CHECK (tab IN ('vocabulary', 'phrases')),
  language   TEXT        NOT NULL DEFAULT 'french',
  dialect    TEXT,
  cefr       TEXT        CHECK (cefr IN ('A1', 'A2', 'B1')),
  position   INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated users can read admin_levels"
  ON public.admin_levels FOR SELECT
  USING (auth.role() = 'authenticated');

-- ─── Admin Cards ──────────────────────────────────────────────────────────────

CREATE TABLE public.admin_cards (
  id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level_id        UUID        NOT NULL REFERENCES public.admin_levels(id) ON DELETE CASCADE,
  english         TEXT        NOT NULL,
  target          TEXT        NOT NULL,
  alternatives    JSONB       NOT NULL DEFAULT '[]'::jsonb,
  transliteration TEXT,
  position        INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated users can read admin_cards"
  ON public.admin_cards FOR SELECT
  USING (auth.role() = 'authenticated');

-- No INSERT/UPDATE/DELETE policies: all writes go through SECURITY DEFINER RPCs
-- that verify the caller is the admin email.

-- ─── Helper: admin-only guard ─────────────────────────────────────────────────

-- ─── RPC: get_admin_stats ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result JSON;
BEGIN
  IF (SELECT email FROM auth.users WHERE id = auth.uid()) != 'davejayden49@gmail.com' THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM auth.users),
    'sessions_today', (
      SELECT COUNT(*) FROM study_sessions WHERE started_at >= CURRENT_DATE
    ),
    'sessions_this_week', (
      SELECT COUNT(*) FROM study_sessions
      WHERE started_at >= date_trunc('week', CURRENT_DATE)
    ),
    'total_sessions', (SELECT COUNT(*) FROM study_sessions),
    'streak_leaderboard', (
      SELECT COALESCE(json_agg(row_to_json(s) ORDER BY s.current_streak DESC), '[]'::json)
      FROM (
        SELECT
          sk.user_id,
          sk.current_streak,
          sk.longest_streak,
          COALESCE(au.raw_user_meta_data->>'nickname', au.email) AS display_name,
          au.email
        FROM streaks sk
        JOIN auth.users au ON au.id = sk.user_id
        ORDER BY sk.current_streak DESC
        LIMIT 10
      ) s
    ),
    'top_cards', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT
          card_id, english, target, language,
          COUNT(*) AS study_count,
          ROUND(AVG(CASE WHEN correct THEN 1.0 ELSE 0.0 END) * 100) AS accuracy_pct
        FROM card_results
        GROUP BY card_id, english, target, language
        ORDER BY study_count DESC
        LIMIT 15
      ) t
    )
  ) INTO result;
  RETURN result;
END;
$$;

-- ─── RPC: get_all_users ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result JSON;
BEGIN
  IF (SELECT email FROM auth.users WHERE id = auth.uid()) != 'davejayden49@gmail.com' THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT COALESCE(json_agg(row_to_json(u) ORDER BY u.created_at DESC), '[]'::json)
  INTO result
  FROM (
    SELECT
      au.id,
      au.email,
      au.created_at,
      au.last_sign_in_at,
      COALESCE(au.raw_user_meta_data->>'nickname', '') AS display_name,
      COALESCE(au.raw_user_meta_data->>'country', '')  AS country,
      COALESCE(sk.current_streak, 0)                   AS current_streak,
      COALESCE(sk.longest_streak, 0)                   AS longest_streak,
      (SELECT COUNT(*) FROM study_sessions ss WHERE ss.user_id = au.id) AS session_count,
      (SELECT COUNT(*) FROM collections    c  WHERE c.user_id  = au.id) AS collections_count,
      (SELECT COUNT(*) FROM bookmarks      bk WHERE bk.user_id = au.id) AS bookmarks_count,
      (SELECT COUNT(*) FROM custom_levels  cl WHERE cl.user_id = au.id) AS custom_levels_count
    FROM auth.users au
    LEFT JOIN streaks sk ON sk.user_id = au.id
    ORDER BY au.created_at DESC
  ) u;
  RETURN result;
END;
$$;

-- ─── RPC: get_session_trends ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_session_trends(days_back INTEGER DEFAULT 30)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result JSON;
BEGIN
  IF (SELECT email FROM auth.users WHERE id = auth.uid()) != 'davejayden49@gmail.com' THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.day), '[]'::json)
  INTO result
  FROM (
    SELECT
      date_trunc('day', started_at)::date AS day,
      COUNT(*)                            AS sessions,
      COUNT(DISTINCT user_id)             AS active_users,
      COALESCE(SUM(correct_count), 0)     AS correct_cards
    FROM study_sessions
    WHERE started_at >= CURRENT_DATE - days_back
    GROUP BY 1
    ORDER BY 1
  ) t;
  RETURN result;
END;
$$;

-- ─── RPC: admin_upsert_level ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_upsert_level(
  p_id       UUID,
  p_title    TEXT,
  p_tab      TEXT,
  p_language TEXT,
  p_dialect  TEXT,
  p_cefr     TEXT,
  p_position INTEGER
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE out_id UUID;
BEGIN
  IF (SELECT email FROM auth.users WHERE id = auth.uid()) != 'davejayden49@gmail.com' THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO admin_levels(title, tab, language, dialect, cefr, position)
    VALUES (p_title, p_tab, p_language, p_dialect, p_cefr, p_position)
    RETURNING id INTO out_id;
  ELSE
    UPDATE admin_levels
    SET title = p_title, tab = p_tab, language = p_language,
        dialect = p_dialect, cefr = p_cefr, position = p_position,
        updated_at = now()
    WHERE id = p_id;
    out_id := p_id;
  END IF;
  RETURN out_id;
END;
$$;

-- ─── RPC: admin_delete_level ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_delete_level(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT email FROM auth.users WHERE id = auth.uid()) != 'davejayden49@gmail.com' THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  DELETE FROM admin_levels WHERE id = p_id;
END;
$$;

-- ─── RPC: admin_replace_cards ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_replace_cards(
  p_level_id UUID,
  p_cards    JSONB
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT email FROM auth.users WHERE id = auth.uid()) != 'davejayden49@gmail.com' THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  DELETE FROM admin_cards WHERE level_id = p_level_id;

  INSERT INTO admin_cards(level_id, english, target, alternatives, transliteration, position)
  SELECT
    p_level_id,
    c->>'english',
    c->>'target',
    COALESCE(c->'alternatives', '[]'::jsonb),
    NULLIF(c->>'transliteration', ''),
    COALESCE((c->>'position')::int, 0)
  FROM jsonb_array_elements(p_cards) AS c
  WHERE (c->>'english') IS NOT NULL AND (c->>'target') IS NOT NULL;
END;
$$;
