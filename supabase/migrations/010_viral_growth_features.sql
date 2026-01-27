-- Migration 010: Viral Growth Features
-- Adds: Referral system, usernames, leaderboards, share tracking

-- ============================================
-- 1. USER IDENTITY (Optional Usernames)
-- ============================================

-- Add display name and referral code to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;

-- Generate unique referral code for user
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- No confusing chars (0/O, 1/I/L)
  code TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN code;
END;
$$;

-- Auto-generate referral code on user creation
CREATE OR REPLACE FUNCTION set_user_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  new_code TEXT;
  attempts INTEGER := 0;
BEGIN
  -- Try up to 10 times to generate unique code
  LOOP
    new_code := generate_referral_code();
    BEGIN
      NEW.referral_code := new_code;
      RETURN NEW;
    EXCEPTION WHEN unique_violation THEN
      attempts := attempts + 1;
      IF attempts >= 10 THEN
        -- Fallback: use part of UUID
        NEW.referral_code := upper(substring(NEW.id::text, 1, 6));
        RETURN NEW;
      END IF;
    END;
  END LOOP;
END;
$$;

CREATE TRIGGER trigger_set_referral_code
  BEFORE INSERT ON users
  FOR EACH ROW
  WHEN (NEW.referral_code IS NULL)
  EXECUTE FUNCTION set_user_referral_code();

-- Backfill existing users with referral codes
UPDATE users SET referral_code = generate_referral_code() WHERE referral_code IS NULL;

-- Index for referral code lookups
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by) WHERE referred_by IS NOT NULL;

-- ============================================
-- 2. REFERRAL TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  reward_given BOOLEAN DEFAULT FALSE,
  reward_type TEXT, -- 'shield', 'badge', etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referred_id) -- Each user can only be referred once
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_created ON referrals(created_at DESC);

-- Function to process referral and give rewards
CREATE OR REPLACE FUNCTION process_referral(
  p_referral_code TEXT,
  p_new_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referrer_id UUID;
  v_result JSONB;
BEGIN
  -- Find referrer by code
  SELECT id INTO v_referrer_id
  FROM users
  WHERE referral_code = upper(p_referral_code);

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid referral code');
  END IF;

  -- Can't refer yourself
  IF v_referrer_id = p_new_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot refer yourself');
  END IF;

  -- Check if user was already referred
  IF EXISTS (SELECT 1 FROM referrals WHERE referred_id = p_new_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User already referred');
  END IF;

  -- Record referral
  INSERT INTO referrals (referrer_id, referred_id, referral_code, reward_given, reward_type)
  VALUES (v_referrer_id, p_new_user_id, upper(p_referral_code), TRUE, 'shield');

  -- Update referred_by on new user
  UPDATE users SET referred_by = v_referrer_id WHERE id = p_new_user_id;

  -- Give rewards: 1 shield to referrer, 1 shield to new user
  UPDATE users SET streak_shields = COALESCE(streak_shields, 0) + 1
  WHERE id IN (v_referrer_id, p_new_user_id);

  -- Increment referrer's count
  UPDATE users SET referral_count = COALESCE(referral_count, 0) + 1
  WHERE id = v_referrer_id;

  RETURN jsonb_build_object(
    'success', true,
    'referrer_id', v_referrer_id,
    'reward', 'Both users received 1 shield'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION process_referral(TEXT, UUID) TO authenticated, anon, service_role;

-- ============================================
-- 3. SHARE TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS share_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  share_type TEXT NOT NULL, -- 'pulse', 'badge', 'streak', 'profile', 'leaderboard'
  share_context JSONB, -- Additional data (badge_id, streak_days, etc.)
  platform TEXT, -- 'native', 'clipboard', 'twitter', etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_share_events_user ON share_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_share_events_type ON share_events(share_type, created_at DESC);

-- Function to track share
CREATE OR REPLACE FUNCTION track_share(
  p_user_id UUID,
  p_share_type TEXT,
  p_share_context JSONB DEFAULT '{}'::JSONB,
  p_platform TEXT DEFAULT 'unknown'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_share_id UUID;
BEGIN
  INSERT INTO share_events (user_id, share_type, share_context, platform)
  VALUES (p_user_id, p_share_type, p_share_context, p_platform)
  RETURNING id INTO v_share_id;

  RETURN v_share_id;
END;
$$;

GRANT EXECUTE ON FUNCTION track_share(UUID, TEXT, JSONB, TEXT) TO authenticated, anon, service_role;

-- ============================================
-- 4. LEADERBOARD VIEWS
-- ============================================

-- Global stats for share cards
CREATE OR REPLACE FUNCTION get_global_pulse_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM users),
    'total_pulses', (SELECT COUNT(*) FROM pulses),
    'active_today', (SELECT COUNT(DISTINCT user_id) FROM pulses WHERE created_at > NOW() - INTERVAL '24 hours'),
    'top_streak', (SELECT MAX(streak_days) FROM users),
    'diamond_users', (SELECT COUNT(*) FROM users WHERE aura = 'diamond')
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_global_pulse_stats() TO authenticated, anon, service_role;

-- City leaderboard
CREATE OR REPLACE FUNCTION get_city_leaderboard(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  city_id TEXT,
  total_pulses BIGINT,
  active_users BIGINT,
  avg_streak NUMERIC,
  rank BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.city_id,
    COUNT(DISTINCT p.id) AS total_pulses,
    COUNT(DISTINCT u.id) AS active_users,
    ROUND(AVG(u.streak_days), 1) AS avg_streak,
    ROW_NUMBER() OVER (ORDER BY COUNT(DISTINCT p.id) DESC) AS rank
  FROM users u
  LEFT JOIN pulses p ON u.id = p.user_id AND p.created_at > NOW() - INTERVAL '7 days'
  WHERE u.city_id IS NOT NULL
  GROUP BY u.city_id
  ORDER BY total_pulses DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_city_leaderboard(INTEGER) TO authenticated, anon, service_role;

-- User rank in city
CREATE OR REPLACE FUNCTION get_user_city_rank(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_city TEXT;
  v_user_streak INTEGER;
  v_city_rank INTEGER;
  v_city_total INTEGER;
  v_global_rank INTEGER;
  v_global_total INTEGER;
BEGIN
  -- Get user's city and streak
  SELECT city_id, streak_days INTO v_user_city, v_user_streak
  FROM users WHERE id = p_user_id;

  IF v_user_city IS NULL THEN
    -- No city set, return global rank only
    SELECT COUNT(*) INTO v_global_total FROM users WHERE streak_days > 0;
    SELECT COUNT(*) + 1 INTO v_global_rank
    FROM users WHERE streak_days > v_user_streak;

    RETURN jsonb_build_object(
      'city_id', NULL,
      'city_rank', NULL,
      'city_total', NULL,
      'global_rank', v_global_rank,
      'global_total', v_global_total,
      'streak_days', v_user_streak
    );
  END IF;

  -- Calculate city rank
  SELECT COUNT(*) INTO v_city_total FROM users WHERE city_id = v_user_city AND streak_days > 0;
  SELECT COUNT(*) + 1 INTO v_city_rank
  FROM users WHERE city_id = v_user_city AND streak_days > v_user_streak;

  -- Calculate global rank
  SELECT COUNT(*) INTO v_global_total FROM users WHERE streak_days > 0;
  SELECT COUNT(*) + 1 INTO v_global_rank
  FROM users WHERE streak_days > v_user_streak;

  RETURN jsonb_build_object(
    'city_id', v_user_city,
    'city_rank', v_city_rank,
    'city_total', v_city_total,
    'global_rank', v_global_rank,
    'global_total', v_global_total,
    'streak_days', v_user_streak
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_city_rank(UUID) TO authenticated, anon, service_role;

-- ============================================
-- 5. BATTLE VISIBILITY FOR USERS
-- ============================================

-- Function to get active battles for a user's city
CREATE OR REPLACE FUNCTION get_user_battles(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_city_id TEXT;
  v_battles JSONB;
BEGIN
  -- Get user's city
  SELECT city_id INTO v_city_id FROM users WHERE id = p_user_id;

  IF v_city_id IS NULL THEN
    RETURN '[]'::JSONB;
  END IF;

  -- Get battles involving user's city
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', b.id,
      'city_a', b.city_a_name,
      'city_b', b.city_b_name,
      'city_a_id', b.city_a_id,
      'city_b_id', b.city_b_id,
      'status', b.status,
      'start_at', b.start_at,
      'end_at', b.end_at,
      'winner', b.winner_city_id,
      'user_city', v_city_id
    ) ORDER BY b.start_at DESC
  ), '[]'::JSONB)
  INTO v_battles
  FROM city_battles b
  WHERE (b.city_a_id = v_city_id OR b.city_b_id = v_city_id)
    AND b.status IN ('active', 'completed')
    AND b.start_at > NOW() - INTERVAL '7 days';

  RETURN v_battles;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_battles(UUID) TO authenticated, anon, service_role;

-- ============================================
-- 6. NOTIFICATION URGENCY HELPERS
-- ============================================

-- Function to get users who need FOMO notifications
CREATE OR REPLACE FUNCTION get_users_for_fomo_nudge(p_window_type TEXT, p_minutes_remaining INTEGER)
RETURNS TABLE (
  user_id UUID,
  streak_days INTEGER,
  timezone TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.streak_days, u.timezone
  FROM users u
  WHERE u.push_opt_in = TRUE
    AND u.streak_days > 0  -- Only users with streaks to protect
    AND NOT EXISTS (
      -- Hasn't pulsed today
      SELECT 1 FROM pulses p
      WHERE p.user_id = u.id
        AND p.created_at > NOW() - INTERVAL '24 hours'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION get_users_for_fomo_nudge(TEXT, INTEGER) TO service_role;

-- ============================================
-- 7. INDEXES FOR PERFORMANCE
-- ============================================

-- Leaderboard queries
CREATE INDEX IF NOT EXISTS idx_users_city_streak ON users(city_id, streak_days DESC) WHERE city_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_streak_rank ON users(streak_days DESC) WHERE streak_days > 0;

-- Share tracking
CREATE INDEX IF NOT EXISTS idx_share_events_daily ON share_events(created_at DESC) WHERE created_at > NOW() - INTERVAL '24 hours';

COMMENT ON TABLE referrals IS 'Tracks user referrals for viral growth. Each user can only be referred once.';
COMMENT ON TABLE share_events IS 'Tracks share actions for analytics and viral loop optimization.';
