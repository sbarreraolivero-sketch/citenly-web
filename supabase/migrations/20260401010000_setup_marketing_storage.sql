-- =============================================
-- STORAGE: Public Bucket for Marketing Assets
-- =============================================

-- 1. Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketing-assets', 'marketing-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS Policies for 'marketing-assets' bucket
-- Note: 'public' means the object can be read by anyone with the link, 
-- but we still restrict WHO can upload/delete.

-- ALLOW SELECT (Public Read)
-- This is technically not needed for a public bucket for simple URL access, 
-- but good to have for explicit query visibility.
CREATE POLICY "Public Access to Marketing Assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'marketing-assets');

-- ALLOW INSERT (Upload) - Only authenticated members of the clinic
CREATE POLICY "Authenticated clinic members can upload marketing assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'marketing-assets'
  AND auth.role() = 'authenticated'
  AND (
    -- Path: {clinic_id}/{filename}
    (storage.foldername(name))[1]::uuid = (
      SELECT clinic_id FROM public.user_profiles WHERE id = auth.uid()
    )
  )
);

-- ALLOW DELETE - Only authenticated members of the clinic
CREATE POLICY "Authenticated clinic members can delete marketing assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'marketing-assets'
  AND auth.role() = 'authenticated'
  AND (
    (storage.foldername(name))[1]::uuid = (
      SELECT clinic_id FROM public.user_profiles WHERE id = auth.uid()
    )
  )
);
