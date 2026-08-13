REVOKE EXECUTE ON FUNCTION public.create_rider_referral(text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.record_referral_signup(text, uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.credit_referral_on_postcode() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_rider_referral(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_referral_signup(text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.credit_referral_on_postcode() TO authenticated;