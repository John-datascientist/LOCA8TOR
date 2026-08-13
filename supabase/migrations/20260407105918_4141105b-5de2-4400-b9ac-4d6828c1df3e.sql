
-- Add pickup/dropoff coordinates to delivery_trackings
ALTER TABLE public.delivery_trackings 
  ADD COLUMN IF NOT EXISTS pickup_lat double precision,
  ADD COLUMN IF NOT EXISTS pickup_lng double precision,
  ADD COLUMN IF NOT EXISTS dropoff_lat double precision,
  ADD COLUMN IF NOT EXISTS dropoff_lng double precision,
  ADD COLUMN IF NOT EXISTS eta_minutes integer;

-- Enable realtime for delivery_trackings
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_trackings;
