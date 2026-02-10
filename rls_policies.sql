-- Service role uchun RLS policy lari
-- Bu policy lar backend dan service_role bilan so'rovlar uchun ishlaydi

-- Profiles jadvali uchun service role policy
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
CREATE POLICY "Service role can insert profiles" ON public.profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update profiles" ON public.profiles;
CREATE POLICY "Service role can update profiles" ON public.profiles
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can select profiles" ON public.profiles;
CREATE POLICY "Service role can select profiles" ON public.profiles
  FOR SELECT
  TO service_role
  USING (true);

-- User roles jadvali uchun service role policy
DROP POLICY IF EXISTS "Service role can insert user_roles" ON public.user_roles;
CREATE POLICY "Service role can insert user_roles" ON public.user_roles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update user_roles" ON public.user_roles;
CREATE POLICY "Service role can update user_roles" ON public.user_roles
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can select user_roles" ON public.user_roles;
CREATE POLICY "Service role can select user_roles" ON public.user_roles
  FOR SELECT
  TO service_role
  USING (true);

-- Partners jadvali uchun service role policy
DROP POLICY IF EXISTS "Service role can insert partners" ON public.partners;
CREATE POLICY "Service role can insert partners" ON public.partners
  FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update partners" ON public.partners;
CREATE POLICY "Service role can update partners" ON public.partners
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can select partners" ON public.partners;
CREATE POLICY "Service role can select partners" ON public.partners
  FOR SELECT
  TO service_role
  USING (true);

DROP POLICY IF EXISTS "Service role can delete partners" ON public.partners;
CREATE POLICY "Service role can delete partners" ON public.partners
  FOR DELETE
  TO service_role
  USING (true);

-- Banners jadvali uchun service role policy
DROP POLICY IF EXISTS "Service role can insert banners" ON public.banners;
CREATE POLICY "Service role can insert banners" ON public.banners
  FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update banners" ON public.banners;
CREATE POLICY "Service role can update banners" ON public.banners
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can select banners" ON public.banners;
CREATE POLICY "Service role can select banners" ON public.banners
  FOR SELECT
  TO service_role
  USING (true);

DROP POLICY IF EXISTS "Service role can delete banners" ON public.banners;
CREATE POLICY "Service role can delete banners" ON public.banners
  FOR DELETE
  TO service_role
  USING (true);
