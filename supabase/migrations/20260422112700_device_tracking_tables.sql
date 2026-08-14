-- Backfill migration: emergency_contacts, sos_alerts, tracking_sessions and
-- tracking_points were created directly on the original project without ever
-- being captured as a migration, so a fresh database (built from this
-- migration history alone) fails at 20260422112726, which only adds RLS
-- policies assuming these tables already exist. Reconstructed from the
-- generated src/integrations/supabase/types.ts (which reflects the live
-- schema) and the comment in 20260422112726 grouping these four tables as
-- "scope by device_id presence" (device-based SOS/live-tracking sharing,
-- no user_id — these are used by unauthenticated riders/contacts via a
-- device id, not logged-in accounts).
-- Timestamped just before 20260422112725/112726 so it applies first.

CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  relationship text,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_device_id ON public.emergency_contacts (device_id);
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.sos_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  trigger_type text NOT NULL,
  lat double precision,
  lng double precision,
  postcode text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_device_id ON public.sos_alerts (device_id);
ALTER TABLE public.sos_alerts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.tracking_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  share_code text NOT NULL,
  is_active boolean DEFAULT true,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  last_lat double precision,
  last_lng double precision,
  last_updated timestamptz
);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_device_id ON public.tracking_sessions (device_id);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_share_code ON public.tracking_sessions (share_code);
ALTER TABLE public.tracking_sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.tracking_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.tracking_sessions(id) ON DELETE CASCADE,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  postcode text,
  recorded_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tracking_points_session_id ON public.tracking_points (session_id);
ALTER TABLE public.tracking_points ENABLE ROW LEVEL SECURITY;
