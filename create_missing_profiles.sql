-- Eski foydalanuvchilar uchun profile yaratish
-- Avval qaysi user larning profiles i yo'qligini ko'ramiz

SELECT 
  u.id as auth_user_id,
  u.email,
  p.user_id as profile_user_id
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.user_id
WHERE p.user_id IS NULL;

-- Yo'q profile larni yaratish (telegram_id ni null qoldiramiz)
INSERT INTO public.profiles (user_id, status)
SELECT 
  u.id,
  'active'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.user_id = u.id
);

-- User roles larni yaratish
INSERT INTO public.user_roles (user_id, role)
SELECT 
  u.id,
  'user'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id
);

-- Natijani tekshirish
SELECT 
  u.id as auth_user_id,
  u.email,
  p.user_id as profile_user_id,
  ur.user_id as role_user_id,
  ur.role
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.user_id
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
ORDER BY u.created_at DESC;
