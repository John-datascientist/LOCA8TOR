ALTER TABLE public.user_referral_balances REPLICA IDENTITY FULL;
ALTER TABLE public.device_referrals REPLICA IDENTITY FULL;
ALTER TABLE public.device_referral_claims REPLICA IDENTITY FULL;
ALTER TABLE public.withdrawals REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.user_referral_balances; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.device_referrals;       EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.device_referral_claims; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawals;            EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;