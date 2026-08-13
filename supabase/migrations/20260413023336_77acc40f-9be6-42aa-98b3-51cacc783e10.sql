
-- Create the delivery-photos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('delivery-photos', 'delivery-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view delivery photos (needed for tracking pages)
CREATE POLICY "Anyone can view delivery photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'delivery-photos');

-- Authenticated users can upload delivery photos
CREATE POLICY "Authenticated users can upload delivery photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'delivery-photos');

-- Authenticated users can update their own photos
CREATE POLICY "Authenticated users can update delivery photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'delivery-photos');
