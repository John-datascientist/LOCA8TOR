
ALTER TABLE public.subscription_payments
  ADD COLUMN IF NOT EXISTS account_reference text,
  ADD COLUMN IF NOT EXISTS mandate_status text;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS account_reference text,
  ADD COLUMN IF NOT EXISTS mandate_status text,
  ADD COLUMN IF NOT EXISTS payer_bank_id text,
  ADD COLUMN IF NOT EXISTS payer_bank_account_number text,
  ADD COLUMN IF NOT EXISTS payer_bank_name text;

CREATE INDEX IF NOT EXISTS idx_subscriptions_account_reference
  ON public.subscriptions(account_reference);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_account_reference
  ON public.subscription_payments(account_reference);
