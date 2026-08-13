
ALTER TABLE public.pending_bank_transfers DROP CONSTRAINT IF EXISTS pending_bank_transfers_reference_code_key;
CREATE INDEX IF NOT EXISTS idx_pending_transfers_reference_code ON public.pending_bank_transfers (reference_code);

CREATE OR REPLACE FUNCTION public.credit_wallet_from_transfer(_transfer_id uuid, _admin_id uuid, _admin_note text DEFAULT NULL)
RETURNS jsonb
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

  INSERT INTO public.business_wallets (business_user_id, balance_ngn)
  VALUES (_t.user_id, 0)
  ON CONFLICT (business_user_id) DO NOTHING;

  UPDATE public.business_wallets
     SET balance_ngn = balance_ngn + _t.wallet_credit_ngn,
         updated_at = now()
   WHERE business_user_id = _t.user_id;

  UPDATE public.wallet_transactions
     SET status = 'successful',
         confirmed_by = _admin_id,
         confirmed_at = now(),
         admin_note = _admin_note,
         description = 'Bank transfer confirmed by admin'
   WHERE provider_reference = _t.id::text
   RETURNING id INTO _tx_id;

  IF _tx_id IS NULL THEN
    INSERT INTO public.wallet_transactions
      (business_user_id, amount, type, status, payment_method, payment_provider,
       provider_reference, reference_code, description, confirmed_by, confirmed_at, admin_note)
    VALUES
      (_t.user_id, _t.wallet_credit_ngn, 'credit', 'successful', 'bank_transfer',
       'paga_manual', _t.id::text, _t.reference_code,
       'Bank transfer confirmed by admin', _admin_id, now(), _admin_note)
    RETURNING id INTO _tx_id;
  END IF;

  UPDATE public.pending_bank_transfers
     SET status = 'confirmed', confirmed_by = _admin_id, confirmed_at = now(), admin_note = _admin_note
   WHERE id = _transfer_id;

  RETURN jsonb_build_object('ok', true, 'wallet_tx_id', _tx_id);
END;
$$;
