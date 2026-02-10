-- Mavjud RLS policy larni tekshirish
SELECT * FROM pg_policies WHERE tablename IN ('partners', 'banners');

-- Partners jadvali uchun barcha policy larni o'chirib tashlash
DROP POLICY IF EXISTS "Service role can insert partners" ON public.partners;
DROP POLICY IF EXISTS "Service role can update partners" ON public.partners;
DROP POLICY IF EXISTS "Service role can select partners" ON public.partners;
DROP POLICY IF EXISTS "Service role can delete partners" ON public.partners;

-- Banners jadvali uchun barcha policy larni o'chirib tashlash
DROP POLICY IF EXISTS "Service role can insert banners" ON public.banners;
DROP POLICY IF EXISTS "Service role can update banners" ON public.banners;
DROP POLICY IF EXISTS "Service role can select banners" ON public.banners;
DROP POLICY IF EXISTS "Service role can delete banners" ON public.banners;

-- Yangi service role policy larni yaratish
-- Partners jadvali uchun
CREATE POLICY "Service role can insert partners" ON public.partners
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update partners" ON public.partners
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can select partners" ON public.partners
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can delete partners" ON public.partners
  FOR DELETE
  TO service_role
  USING (true);

-- Banners jadvali uchun
CREATE POLICY "Service role can insert banners" ON public.banners
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update banners" ON public.banners
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can select banners" ON public.banners
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can delete banners" ON public.banners
  FOR DELETE
  TO service_role
  USING (true);

-- Tekshirish
SELECT * FROM pg_policies WHERE tablename IN ('partners', 'banners');
