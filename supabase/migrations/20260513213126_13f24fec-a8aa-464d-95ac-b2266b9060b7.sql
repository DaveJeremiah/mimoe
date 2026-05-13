
-- custom_levels
CREATE TABLE public.custom_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  tab TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'french',
  dialect TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.custom_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select custom_levels" ON public.custom_levels FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert custom_levels" ON public.custom_levels FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update custom_levels" ON public.custom_levels FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete custom_levels" ON public.custom_levels FOR DELETE USING (auth.uid() = user_id);

-- custom_cards
CREATE TABLE public.custom_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  level_id UUID NOT NULL REFERENCES public.custom_levels(id) ON DELETE CASCADE,
  english TEXT NOT NULL,
  target TEXT NOT NULL,
  alternatives JSONB NOT NULL DEFAULT '[]'::jsonb,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.custom_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select custom_cards" ON public.custom_cards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert custom_cards" ON public.custom_cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update custom_cards" ON public.custom_cards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete custom_cards" ON public.custom_cards FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_custom_cards_level ON public.custom_cards(level_id);

-- collections
CREATE TABLE public.collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'french',
  dialect TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select collections" ON public.collections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert collections" ON public.collections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update collections" ON public.collections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete collections" ON public.collections FOR DELETE USING (auth.uid() = user_id);

-- collection_entries
CREATE TABLE public.collection_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  english TEXT NOT NULL,
  target TEXT NOT NULL,
  alternatives JSONB NOT NULL DEFAULT '[]'::jsonb,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.collection_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select collection_entries" ON public.collection_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert collection_entries" ON public.collection_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update collection_entries" ON public.collection_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete collection_entries" ON public.collection_entries FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_collection_entries_collection ON public.collection_entries(collection_id);

-- bookmarks
CREATE TABLE public.bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  card_id TEXT NOT NULL,
  english TEXT NOT NULL,
  target TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'french',
  source TEXT NOT NULL DEFAULT 'level',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, card_id, language)
);
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select bookmarks" ON public.bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert bookmarks" ON public.bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update bookmarks" ON public.bookmarks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete bookmarks" ON public.bookmarks FOR DELETE USING (auth.uid() = user_id);

-- study_sessions
CREATE TABLE public.study_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  language TEXT NOT NULL,
  source TEXT NOT NULL,
  source_id TEXT,
  total_cards INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select study_sessions" ON public.study_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert study_sessions" ON public.study_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update study_sessions" ON public.study_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete study_sessions" ON public.study_sessions FOR DELETE USING (auth.uid() = user_id);

-- card_results
CREATE TABLE public.card_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID REFERENCES public.study_sessions(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL,
  english TEXT NOT NULL,
  target TEXT NOT NULL,
  language TEXT NOT NULL,
  correct BOOLEAN NOT NULL DEFAULT false,
  attempts INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.card_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select card_results" ON public.card_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert card_results" ON public.card_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update card_results" ON public.card_results FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete card_results" ON public.card_results FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_card_results_session ON public.card_results(session_id);

-- streaks
CREATE TABLE public.streaks (
  user_id UUID NOT NULL PRIMARY KEY,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select streaks" ON public.streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert streaks" ON public.streaks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update streaks" ON public.streaks FOR UPDATE USING (auth.uid() = user_id);

-- updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_custom_levels_updated BEFORE UPDATE ON public.custom_levels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_collections_updated BEFORE UPDATE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- streak update on session insert
CREATE OR REPLACE FUNCTION public.bump_streak_on_session()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today DATE := (NEW.started_at AT TIME ZONE 'UTC')::date;
  existing public.streaks%ROWTYPE;
BEGIN
  SELECT * INTO existing FROM public.streaks WHERE user_id = NEW.user_id;
  IF NOT FOUND THEN
    INSERT INTO public.streaks (user_id, current_streak, longest_streak, last_active_date, updated_at)
    VALUES (NEW.user_id, 1, 1, today, now());
  ELSIF existing.last_active_date = today THEN
    -- no change
    NULL;
  ELSIF existing.last_active_date = today - INTERVAL '1 day' THEN
    UPDATE public.streaks
      SET current_streak = existing.current_streak + 1,
          longest_streak = GREATEST(existing.longest_streak, existing.current_streak + 1),
          last_active_date = today,
          updated_at = now()
      WHERE user_id = NEW.user_id;
  ELSE
    UPDATE public.streaks
      SET current_streak = 1,
          longest_streak = GREATEST(existing.longest_streak, 1),
          last_active_date = today,
          updated_at = now()
      WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bump_streak AFTER INSERT ON public.study_sessions
  FOR EACH ROW EXECUTE FUNCTION public.bump_streak_on_session();
