
-- Add proof_photo_url column to delivery_trackings
ALTER TABLE public.delivery_trackings ADD COLUMN IF NOT EXISTS proof_photo_url text;

-- Create storage bucket for delivery proof photos
INSERT INTO storage.buckets (id, name, public) VALUES ('delivery-proofs', 'delivery-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload delivery proofs
CREATE POLICY "Authenticated users can upload delivery proofs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'delivery-proofs');

-- Allow public read access to delivery proofs
CREATE POLICY "Anyone can view delivery proofs"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'delivery-proofs');
