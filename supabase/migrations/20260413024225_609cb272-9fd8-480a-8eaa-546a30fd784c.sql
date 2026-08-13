
-- Contact messages table
CREATE TABLE public.contact_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  user_id UUID,
  status TEXT NOT NULL DEFAULT 'unread',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit contact messages"
ON public.contact_messages FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Authenticated users can read all contact messages"
ON public.contact_messages FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can update contact messages"
ON public.contact_messages FOR UPDATE
TO authenticated
USING (true);

-- Referrals table
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL,
  referral_code TEXT NOT NULL,
  referred_user_id UUID,
  referred_email TEXT,
  credits_earned INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own referrals"
ON public.referrals FOR SELECT
TO authenticated
USING (referrer_id IN (SELECT r.id FROM riders r WHERE r.user_id = auth.uid()));

CREATE POLICY "Users can insert referrals"
ON public.referrals FOR INSERT
TO authenticated
WITH CHECK (referrer_id IN (SELECT r.id FROM riders r WHERE r.user_id = auth.uid()));

CREATE POLICY "Admins can read all referrals"
ON public.referrals FOR SELECT
TO authenticated
USING (true);

-- Add referral_code to riders
ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
