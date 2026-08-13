-- Add reference_code support to wallet_transactions
ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS reference_code text,
  ADD COLUMN IF NOT EXISTS confirmed_by uuid,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_note text;

CREATE INDEX IF NOT EXISTS idx_wallet_tx_reference_code ON public.wallet_transactions (reference_code);

-- Pending bank transfers awaiting admin confirmation
CREATE TABLE IF NOT EXISTS public.pending_bank_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reference_code text NOT NULL UNIQUE,
  amount_ngn numeric NOT NULL CHECK (amount_ngn > 0),
  wallet_credit_ngn numeric NOT NULL CHECK (wallet_credit_ngn > 0),
  paga_fee_ngn numeric NOT NULL DEFAULT 0 CHECK (paga_fee_ngn >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','rejected')),
  proof_url text,
  admin_note text,
  confirmed_by uuid,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.pending_bank_transfers TO authenticated;
GRANT ALL ON public.pending_bank_transfers TO service_role;

ALTER TABLE public.pending_bank_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own pending transfers"
  ON public.pending_bank_transfers FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_super_admin((auth.jwt() ->> 'email')));

CREATE POLICY "Users create own pending transfers"
  ON public.pending_bank_transfers FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Super admins update pending transfers"
  ON public.pending_bank_transfers FOR UPDATE TO authenticated
  USING (is_super_admin((auth.jwt() ->> 'email')))
  WITH CHECK (is_super_admin((auth.jwt() ->> 'email')));

CREATE INDEX IF NOT EXISTS idx_pending_transfers_status ON public.pending_bank_transfers (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pending_transfers_user ON public.pending_bank_transfers (user_id, created_at DESC);

CREATE TRIGGER trg_pending_transfers_updated
  BEFORE UPDATE ON public.pending_bank_transfers
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- RPC to credit wallet atomically (called by admin-confirm function with service role)
CREATE OR REPLACE FUNCTION public.credit_wallet_from_transfer(
  _transfer_id uuid,
  _admin_id uuid,
  _admin_note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _t public.pending_bank_transfers%ROWTYPE;
  _tx_id uuid;
BEGIN
  SELECT * INTO _t FROM public.pending_bank_transfers WHERE id = _transfer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'transfer_not_found'; END IF;
  IF _t.status <> 'pending' THEN RAISE EXCEPTION 'already_processed'; END IF;

  -- Ensure wallet row exists
  INSERT INTO public.business_wallets (business_user_id, balance_ngn)
  VALUES (_t.user_id, 0)
  ON CONFLICT (business_user_id) DO NOTHING;

  UPDATE public.business_wallets
     SET balance_ngn = balance_ngn + _t.wallet_credit_ngn,
         updated_at = now()
   WHERE business_user_id = _t.user_id;

  INSERT INTO public.wallet_transactions
    (business_user_id, amount, type, status, payment_method, payment_provider,
     provider_reference, reference_code, description, confirmed_by, confirmed_at, admin_note)
  VALUES
    (_t.user_id, _t.wallet_credit_ngn, 'credit', 'successful', 'bank_transfer',
     'paga_manual', _t.reference_code, _t.reference_code,
     'Bank transfer confirmed by admin', _admin_id, now(), _admin_note)
  RETURNING id INTO _tx_id;

  UPDATE public.pending_bank_transfers
     SET status = 'confirmed', confirmed_by = _admin_id, confirmed_at = now(), admin_note = _admin_note
   WHERE id = _transfer_id;

  RETURN jsonb_build_object('ok', true, 'wallet_tx_id', _tx_id);
END;
$$;

REVOKE ALL ON FUNCTION public.credit_wallet_from_transfer(uuid,uuid,text) FROM public;
GRANT EXECUTE ON FUNCTION public.credit_wallet_from_transfer(uuid,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.reject_pending_transfer(
  _transfer_id uuid,
  _admin_id uuid,
  _admin_note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.pending_bank_transfers
     SET status = 'rejected', confirmed_by = _admin_id, confirmed_at = now(), admin_note = _admin_note
   WHERE id = _transfer_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found_or_processed'; END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.reject_pending_transfer(uuid,uuid,text) FROM public;
GRANT EXECUTE ON FUNCTION public.reject_pending_transfer(uuid,uuid,text) TO service_role;