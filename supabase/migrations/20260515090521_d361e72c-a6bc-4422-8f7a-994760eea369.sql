CREATE INDEX IF NOT EXISTS idx_postcode_history_user_id ON public.postcode_history(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_trackings_share_code ON public.delivery_trackings(share_code);
CREATE INDEX IF NOT EXISTS idx_delivery_trackings_business_rider_id ON public.delivery_trackings(business_rider_id);
CREATE INDEX IF NOT EXISTS idx_delivery_trackings_status ON public.delivery_trackings(status);
CREATE INDEX IF NOT EXISTS idx_business_riders_business_user_id ON public.business_riders(business_user_id);
CREATE INDEX IF NOT EXISTS idx_device_referrals_device_id ON public.device_referrals(device_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_riders_user_id ON public.riders(user_id);
CREATE INDEX IF NOT EXISTS idx_postcodes_created_at ON public.postcodes(created_at DESC);