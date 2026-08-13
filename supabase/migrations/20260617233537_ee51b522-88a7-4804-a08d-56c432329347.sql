
ALTER TABLE public.withdrawals
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'quiz';

-- Backfill referral rows based on legacy marker
UPDATE public.withdrawals
SET source = 'referral'
WHERE state_of_residence = 'Referral' OR address LIKE 'Referral payout%';

ALTER TABLE public.withdrawals
  DROP CONSTRAINT IF EXISTS withdrawals_source_check;
ALTER TABLE public.withdrawals
  ADD CONSTRAINT withdrawals_source_check CHECK (source IN ('quiz','referral'));

-- Daily quiz withdrawal limit (₦100 per user per day, identified by email)
CREATE OR REPLACE FUNCTION public.enforce_quiz_daily_withdrawal_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _today_total integer;
BEGIN
  IF NEW.source = 'quiz' THEN
    SELECT COALESCE(SUM(amount), 0) INTO _today_total
    FROM public.withdrawals
    WHERE source = 'quiz'
      AND lower(email) = lower(NEW.email)
      AND status IN ('pending','completed')
      AND created_at >= date_trunc('day', now() AT TIME ZONE 'Africa/Lagos') AT TIME ZONE 'Africa/Lagos';
    IF _today_total + NEW.amount > 100 THEN
      RAISE EXCEPTION 'Daily quiz withdrawal limit of ₦100 reached. Try again tomorrow.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS withdrawals_quiz_daily_limit ON public.withdrawals;
CREATE TRIGGER withdrawals_quiz_daily_limit
  BEFORE INSERT ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.enforce_quiz_daily_withdrawal_limit();
