
REVOKE EXECUTE ON FUNCTION public.bump_streak_on_session() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
