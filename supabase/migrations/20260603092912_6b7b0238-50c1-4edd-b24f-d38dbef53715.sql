REVOKE EXECUTE ON FUNCTION public.expire_old_quiz_credits(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.register_quiz_play(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.record_quiz_score(uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_quiz_balance() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.available_quiz_balance(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.expire_old_quiz_credits(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.register_quiz_play(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_quiz_score(uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_quiz_balance() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.available_quiz_balance(uuid) TO authenticated, service_role;