
-- Make storage buckets private so they no longer allow anonymous listing.
-- Individual files remain readable via the existing SELECT policies on storage.objects
-- (accessed by exact path), but the bucket itself will not enumerate its contents.
UPDATE storage.buckets SET public = false WHERE id IN ('delivery-proofs', 'delivery-photos');
