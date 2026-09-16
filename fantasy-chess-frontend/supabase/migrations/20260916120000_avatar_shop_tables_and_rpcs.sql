-- Avatar shop: catalog, ownership, and atomic buy/equip RPCs.
-- Replaces the fetch-avatars / buy-avatar / equip-avatar edge functions so the
-- shop no longer depends on empty JSON responses from those functions.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS selected_avatar_url TEXT;

CREATE TABLE IF NOT EXISTS public.avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL DEFAULT 0 CHECK (price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.avatars ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.avatars ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.avatars ADD COLUMN IF NOT EXISTS price INTEGER;
ALTER TABLE public.avatars ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.user_avatars (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  avatar_id UUID NOT NULL REFERENCES public.avatars(id) ON DELETE CASCADE,
  owned BOOLEAN NOT NULL DEFAULT TRUE,
  equipped BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (user_id, avatar_id)
);

ALTER TABLE public.user_avatars ADD COLUMN IF NOT EXISTS owned BOOLEAN DEFAULT TRUE;
ALTER TABLE public.user_avatars ADD COLUMN IF NOT EXISTS equipped BOOLEAN DEFAULT FALSE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.user_avatars'::regclass
      AND contype IN ('p', 'u')
      AND pg_get_constraintdef(oid) ILIKE '%user_id%'
      AND pg_get_constraintdef(oid) ILIKE '%avatar_id%'
  ) THEN
    ALTER TABLE public.user_avatars
      ADD CONSTRAINT user_avatars_user_id_avatar_id_key UNIQUE (user_id, avatar_id);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_table THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_avatars_user_id ON public.user_avatars(user_id);
CREATE INDEX IF NOT EXISTS idx_user_avatars_equipped ON public.user_avatars(user_id, equipped)
  WHERE equipped = TRUE;

ALTER TABLE public.avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_avatars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view avatars" ON public.avatars;
CREATE POLICY "Anyone can view avatars"
  ON public.avatars
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can view their own avatars" ON public.user_avatars;
CREATE POLICY "Users can view their own avatars"
  ON public.user_avatars
  FOR SELECT
  USING (user_id = auth.uid());

GRANT SELECT ON public.avatars TO anon, authenticated;
GRANT SELECT ON public.user_avatars TO authenticated;

CREATE OR REPLACE FUNCTION public.buy_avatar(p_avatar_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_price integer;
  v_coins integer;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT price INTO v_price
  FROM public.avatars
  WHERE id = p_avatar_id;

  IF v_price IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Avatar not found');
  END IF;

  SELECT coins INTO v_coins
  FROM public.users
  WHERE id = v_user_id
  FOR UPDATE;

  IF v_coins IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_avatars
    WHERE user_id = v_user_id
      AND avatar_id = p_avatar_id
      AND COALESCE(owned, false) = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already own this avatar');
  END IF;

  IF v_coins < v_price THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not enough coins');
  END IF;

  UPDATE public.users
  SET coins = coins - v_price
  WHERE id = v_user_id;

  UPDATE public.user_avatars
  SET owned = true
  WHERE user_id = v_user_id
    AND avatar_id = p_avatar_id;

  IF NOT FOUND THEN
    INSERT INTO public.user_avatars (user_id, avatar_id, owned, equipped)
    VALUES (v_user_id, p_avatar_id, true, false);
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.equip_avatar(p_avatar_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_image_url text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_avatars
    WHERE user_id = v_user_id
      AND avatar_id = p_avatar_id
      AND COALESCE(owned, false) = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You do not own this avatar');
  END IF;

  SELECT image_url INTO v_image_url
  FROM public.avatars
  WHERE id = p_avatar_id;

  UPDATE public.user_avatars
  SET equipped = false
  WHERE user_id = v_user_id
    AND COALESCE(equipped, false) = true;

  UPDATE public.user_avatars
  SET equipped = true
  WHERE user_id = v_user_id
    AND avatar_id = p_avatar_id;

  IF v_image_url IS NOT NULL THEN
    UPDATE public.users
    SET selected_avatar_url = v_image_url
    WHERE id = v_user_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.buy_avatar(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.equip_avatar(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.buy_avatar(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.equip_avatar(UUID) TO authenticated;

INSERT INTO public.avatars (id, name, image_url, price)
SELECT seed.id, seed.name, seed.image_url, seed.price
FROM (
  VALUES
    ('11111111-1111-4111-8111-111111111111'::uuid, 'Pawn', '/avatars/pawn.svg', 25),
    ('22222222-2222-4222-8222-222222222222'::uuid, 'Bishop', '/avatars/bishop.svg', 50),
    ('33333333-3333-4333-8333-333333333333'::uuid, 'Knight', '/avatars/knight.svg', 75),
    ('44444444-4444-4444-8444-444444444444'::uuid, 'Rook', '/avatars/rook.svg', 100),
    ('55555555-5555-4555-8555-555555555555'::uuid, 'Queen', '/avatars/queen.svg', 150),
    ('66666666-6666-4666-8666-666666666666'::uuid, 'King', '/avatars/king.svg', 200)
) AS seed(id, name, image_url, price)
WHERE NOT EXISTS (SELECT 1 FROM public.avatars LIMIT 1);
