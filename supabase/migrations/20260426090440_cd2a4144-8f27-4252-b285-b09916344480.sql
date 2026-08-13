
-- ============== STORAGE: owner-scoped writes ==============

-- Drop overly-permissive policies
DROP POLICY IF EXISTS "Authenticated users can upload delivery proofs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view delivery proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload delivery photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update delivery photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view delivery photos" ON storage.objects;

-- Helper: first folder segment must equal auth.uid()
-- delivery-proofs bucket
CREATE POLICY "Owners upload to own folder in delivery-proofs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'delivery-proofs'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Owners update own files in delivery-proofs"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'delivery-proofs'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'delivery-proofs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Owners delete own files in delivery-proofs"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'delivery-proofs'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Owners read own files in delivery-proofs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'delivery-proofs'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_super_admin((auth.jwt() ->> 'email'))
  )
);

-- delivery-photos bucket
CREATE POLICY "Owners upload to own folder in delivery-photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'delivery-photos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Owners update own files in delivery-photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'delivery-photos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'delivery-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Owners delete own files in delivery-photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'delivery-photos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Owners read own files in delivery-photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'delivery-photos'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_super_admin((auth.jwt() ->> 'email'))
  )
);

-- ============== REALTIME: restrict public subscriptions ==============

-- tracking_points: drop public read; only super admin direct read
DROP POLICY IF EXISTS "Public reads tracking points" ON public.tracking_points;

CREATE POLICY "Super admins read tracking points"
ON public.tracking_points FOR SELECT TO authenticated
USING (public.is_super_admin((auth.jwt() ->> 'email')));

-- tracking_sessions: existing super-admin read remains; ensure no anon SELECT exists
-- (no broad SELECT policy currently; nothing to drop)
