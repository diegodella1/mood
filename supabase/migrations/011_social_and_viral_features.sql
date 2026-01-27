-- Migration 011: Social and Viral Features
-- Friends system, shared streaks, live counter, lucky drops, secret achievements

-- ============================================
-- FRIENDS SYSTEM
-- ============================================

-- Follows table (asymmetric - can follow without being followed back)
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: can't follow same person twice
  UNIQUE(follower_id, following_id),

  -- Can't follow yourself
  CHECK (follower_id != following_id)
);

-- Indexes for follows
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_created ON follows(created_at DESC);

-- Add follower counts to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;

-- ============================================
-- FRIEND STREAKS (Snapchat-style)
-- ============================================

CREATE TABLE IF NOT EXISTS friend_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  streak_days INTEGER DEFAULT 0,
  max_streak_ever INTEGER DEFAULT 0,
  last_user_a_pulse DATE,
  last_user_b_pulse DATE,
  streak_started_at DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure user_a_id < user_b_id to prevent duplicates
  CHECK (user_a_id < user_b_id),
  UNIQUE(user_a_id, user_b_id)
);

CREATE INDEX IF NOT EXISTS idx_friend_streaks_user_a ON friend_streaks(user_a_id);
CREATE INDEX IF NOT EXISTS idx_friend_streaks_user_b ON friend_streaks(user_b_id);
CREATE INDEX IF NOT EXISTS idx_friend_streaks_days ON friend_streaks(streak_days DESC);

-- ============================================
-- LIVE ACTIVITY TRACKING
-- ============================================

-- Track active sessions for "X people pulsing now"
CREATE TABLE IF NOT EXISTS active_sessions (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  current_window TEXT,
  is_pulsing BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_active_sessions_time ON active_sessions(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_active_sessions_pulsing ON active_sessions(is_pulsing) WHERE is_pulsing = true;

-- ============================================
-- LUCKY DROPS & REWARDS
-- ============================================

CREATE TABLE IF NOT EXISTS lucky_drops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  drop_type TEXT NOT NULL, -- 'shield', 'badge', 'special_emoji', 'xp_boost'
  drop_value JSONB DEFAULT '{}',
  claimed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  claimed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_lucky_drops_user ON lucky_drops(user_id);
CREATE INDEX IF NOT EXISTS idx_lucky_drops_unclaimed ON lucky_drops(user_id, claimed) WHERE claimed = false;

-- Special emojis unlocked by user
CREATE TABLE IF NOT EXISTS user_special_emojis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  emoji_name TEXT,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT, -- 'lucky_drop', 'achievement', 'event', 'purchase'

  UNIQUE(user_id, emoji)
);

-- ============================================
-- SECRET ACHIEVEMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS secret_achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  hint TEXT, -- Vague hint shown before unlock
  icon TEXT NOT NULL,
  rarity TEXT DEFAULT 'rare', -- 'common', 'rare', 'epic', 'legendary'
  xp_reward INTEGER DEFAULT 0,
  shield_reward INTEGER DEFAULT 0,
  is_secret BOOLEAN DEFAULT true, -- Hidden until earned
  trigger_condition JSONB NOT NULL, -- Machine-readable condition
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User's earned secret achievements
CREATE TABLE IF NOT EXISTS user_secret_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES secret_achievements(id),
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  context JSONB DEFAULT '{}', -- Extra data about how it was earned

  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_secret_achievements_user ON user_secret_achievements(user_id);

-- ============================================
-- FRIEND ACTIVITY FEED
-- ============================================

-- Cached friend activity for quick feed loading
CREATE TABLE IF NOT EXISTS friend_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'pulse', 'badge', 'streak_milestone', 'joined'
  emoji TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_friend_activity_user ON friend_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_friend_activity_time ON friend_activity(created_at DESC);

-- Note: Cleanup of old activity is handled by cron job, not partial index
-- (PostgreSQL doesn't allow NOW() in index predicates)

-- ============================================
-- FUNCTIONS
-- ============================================

-- Follow a user
CREATE OR REPLACE FUNCTION follow_user(p_follower_id UUID, p_following_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Can't follow yourself
  IF p_follower_id = p_following_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'cannot_follow_self');
  END IF;

  -- Check if already following
  IF EXISTS (SELECT 1 FROM follows WHERE follower_id = p_follower_id AND following_id = p_following_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_following');
  END IF;

  -- Create follow
  INSERT INTO follows (follower_id, following_id)
  VALUES (p_follower_id, p_following_id);

  -- Update counts
  UPDATE users SET following_count = following_count + 1 WHERE id = p_follower_id;
  UPDATE users SET followers_count = followers_count + 1 WHERE id = p_following_id;

  -- Initialize friend streak if mutual follow
  IF EXISTS (SELECT 1 FROM follows WHERE follower_id = p_following_id AND following_id = p_follower_id) THEN
    INSERT INTO friend_streaks (user_a_id, user_b_id, streak_days)
    VALUES (LEAST(p_follower_id, p_following_id), GREATEST(p_follower_id, p_following_id), 0)
    ON CONFLICT (user_a_id, user_b_id) DO NOTHING;
  END IF;

  -- Log activity
  INSERT INTO friend_activity (user_id, activity_type, metadata)
  VALUES (p_follower_id, 'followed', jsonb_build_object('following_id', p_following_id));

  RETURN jsonb_build_object('success', true, 'is_mutual', EXISTS (
    SELECT 1 FROM follows WHERE follower_id = p_following_id AND following_id = p_follower_id
  ));
END;
$$;

-- Unfollow a user
CREATE OR REPLACE FUNCTION unfollow_user(p_follower_id UUID, p_following_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete follow
  DELETE FROM follows WHERE follower_id = p_follower_id AND following_id = p_following_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_following');
  END IF;

  -- Update counts
  UPDATE users SET following_count = GREATEST(0, following_count - 1) WHERE id = p_follower_id;
  UPDATE users SET followers_count = GREATEST(0, followers_count - 1) WHERE id = p_following_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Get friends feed (people you follow)
CREATE OR REPLACE FUNCTION get_friends_feed(p_user_id UUID, p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  emoji TEXT,
  activity_type TEXT,
  created_at TIMESTAMPTZ,
  metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fa.user_id,
    u.display_name,
    fa.emoji,
    fa.activity_type,
    fa.created_at,
    fa.metadata
  FROM friend_activity fa
  JOIN follows f ON f.following_id = fa.user_id AND f.follower_id = p_user_id
  JOIN users u ON u.id = fa.user_id
  WHERE fa.created_at > NOW() - INTERVAL '24 hours'
  ORDER BY fa.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Update friend streaks when user pulses
CREATE OR REPLACE FUNCTION update_friend_streaks(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_updated INTEGER := 0;
  v_streak RECORD;
BEGIN
  -- Find all friend streaks involving this user
  FOR v_streak IN
    SELECT * FROM friend_streaks
    WHERE user_a_id = p_user_id OR user_b_id = p_user_id
  LOOP
    -- Update the appropriate last_pulse field
    IF v_streak.user_a_id = p_user_id THEN
      UPDATE friend_streaks
      SET last_user_a_pulse = v_today, updated_at = NOW()
      WHERE id = v_streak.id AND (last_user_a_pulse IS NULL OR last_user_a_pulse < v_today);
    ELSE
      UPDATE friend_streaks
      SET last_user_b_pulse = v_today, updated_at = NOW()
      WHERE id = v_streak.id AND (last_user_b_pulse IS NULL OR last_user_b_pulse < v_today);
    END IF;

    -- Check if both pulsed today - increment streak
    IF v_streak.last_user_a_pulse = v_today AND v_streak.last_user_b_pulse = v_today THEN
      -- Already counted today
      CONTINUE;
    END IF;

    -- After our update, check again
    SELECT * INTO v_streak FROM friend_streaks WHERE id = v_streak.id;

    IF v_streak.last_user_a_pulse = v_today AND v_streak.last_user_b_pulse = v_today THEN
      UPDATE friend_streaks
      SET
        streak_days = streak_days + 1,
        max_streak_ever = GREATEST(max_streak_ever, streak_days + 1),
        streak_started_at = COALESCE(streak_started_at, v_today)
      WHERE id = v_streak.id;
      v_updated := v_updated + 1;
    END IF;
  END LOOP;

  RETURN v_updated;
END;
$$;

-- Get live pulse count
CREATE OR REPLACE FUNCTION get_live_pulse_count(p_window TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_active_now INTEGER;
  v_pulsing_now INTEGER;
  v_recent_pulses INTEGER;
BEGIN
  -- Users active in last 5 minutes
  SELECT COUNT(*) INTO v_active_now
  FROM active_sessions
  WHERE last_seen > NOW() - INTERVAL '5 minutes';

  -- Users currently pulsing
  SELECT COUNT(*) INTO v_pulsing_now
  FROM active_sessions
  WHERE is_pulsing = true AND last_seen > NOW() - INTERVAL '1 minute';

  -- Pulses in last hour
  SELECT COUNT(*) INTO v_recent_pulses
  FROM pulses
  WHERE created_at > NOW() - INTERVAL '1 hour';

  RETURN jsonb_build_object(
    'active_now', v_active_now,
    'pulsing_now', v_pulsing_now,
    'pulses_last_hour', v_recent_pulses,
    'timestamp', NOW()
  );
END;
$$;

-- Update user active session
CREATE OR REPLACE FUNCTION update_active_session(
  p_user_id UUID,
  p_window TEXT DEFAULT NULL,
  p_is_pulsing BOOLEAN DEFAULT false
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO active_sessions (user_id, last_seen, current_window, is_pulsing)
  VALUES (p_user_id, NOW(), p_window, p_is_pulsing)
  ON CONFLICT (user_id) DO UPDATE SET
    last_seen = NOW(),
    current_window = COALESCE(p_window, active_sessions.current_window),
    is_pulsing = p_is_pulsing;
END;
$$;

-- Roll for lucky drop (called after pulse)
CREATE OR REPLACE FUNCTION roll_lucky_drop(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_roll FLOAT;
  v_drop_type TEXT;
  v_drop_value JSONB;
  v_drop_id UUID;
BEGIN
  -- 5% chance of lucky drop
  v_roll := random();

  IF v_roll > 0.05 THEN
    RETURN jsonb_build_object('dropped', false);
  END IF;

  -- Determine drop type (weighted)
  v_roll := random();
  IF v_roll < 0.60 THEN
    -- 60% chance: shield
    v_drop_type := 'shield';
    v_drop_value := jsonb_build_object('amount', 1);
  ELSIF v_roll < 0.85 THEN
    -- 25% chance: special emoji
    v_drop_type := 'special_emoji';
    v_drop_value := jsonb_build_object(
      'emoji', (ARRAY['🌟', '💫', '✨', '🎯', '🎪', '🎨', '🎭', '🌈', '🦋', '🔮'])[floor(random() * 10 + 1)],
      'name', 'Lucky Find'
    );
  ELSE
    -- 15% chance: XP boost (placeholder for future)
    v_drop_type := 'xp_boost';
    v_drop_value := jsonb_build_object('multiplier', 2, 'duration_hours', 24);
  END IF;

  -- Create the drop
  INSERT INTO lucky_drops (user_id, drop_type, drop_value, expires_at)
  VALUES (p_user_id, v_drop_type, v_drop_value, NOW() + INTERVAL '24 hours')
  RETURNING id INTO v_drop_id;

  RETURN jsonb_build_object(
    'dropped', true,
    'drop_id', v_drop_id,
    'type', v_drop_type,
    'value', v_drop_value
  );
END;
$$;

-- Claim a lucky drop
CREATE OR REPLACE FUNCTION claim_lucky_drop(p_user_id UUID, p_drop_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_drop RECORD;
BEGIN
  -- Get and lock the drop
  SELECT * INTO v_drop
  FROM lucky_drops
  WHERE id = p_drop_id AND user_id = p_user_id AND claimed = false
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'drop_not_found');
  END IF;

  -- Check expiration
  IF v_drop.expires_at IS NOT NULL AND v_drop.expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'drop_expired');
  END IF;

  -- Apply the reward
  CASE v_drop.drop_type
    WHEN 'shield' THEN
      UPDATE users SET streak_shields = streak_shields + (v_drop.drop_value->>'amount')::INTEGER
      WHERE id = p_user_id;
    WHEN 'special_emoji' THEN
      INSERT INTO user_special_emojis (user_id, emoji, emoji_name, source)
      VALUES (p_user_id, v_drop.drop_value->>'emoji', v_drop.drop_value->>'name', 'lucky_drop')
      ON CONFLICT (user_id, emoji) DO NOTHING;
    WHEN 'xp_boost' THEN
      -- Future: implement XP system
      NULL;
  END CASE;

  -- Mark as claimed
  UPDATE lucky_drops SET claimed = true, claimed_at = NOW() WHERE id = p_drop_id;

  RETURN jsonb_build_object('success', true, 'type', v_drop.drop_type, 'value', v_drop.drop_value);
END;
$$;

-- Check and award secret achievements
CREATE OR REPLACE FUNCTION check_secret_achievements(p_user_id UUID, p_context JSONB DEFAULT '{}')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_achievement RECORD;
  v_earned JSONB := '[]'::JSONB;
  v_user RECORD;
  v_condition JSONB;
  v_matches BOOLEAN;
BEGIN
  -- Get user data
  SELECT * INTO v_user FROM users WHERE id = p_user_id;

  -- Check each secret achievement
  FOR v_achievement IN
    SELECT * FROM secret_achievements
    WHERE id NOT IN (SELECT achievement_id FROM user_secret_achievements WHERE user_id = p_user_id)
  LOOP
    v_matches := false;
    v_condition := v_achievement.trigger_condition;

    -- Check different condition types
    CASE v_condition->>'type'
      WHEN 'time_pulse' THEN
        -- Pulsed at specific time
        IF (p_context->>'hour')::INTEGER = (v_condition->>'hour')::INTEGER
           AND (p_context->>'minute')::INTEGER = (v_condition->>'minute')::INTEGER THEN
          v_matches := true;
        END IF;

      WHEN 'streak_milestone' THEN
        IF v_user.streak_days >= (v_condition->>'days')::INTEGER THEN
          v_matches := true;
        END IF;

      WHEN 'emoji_streak' THEN
        -- Same emoji X days in a row (check in context)
        IF (p_context->>'same_emoji_streak')::INTEGER >= (v_condition->>'days')::INTEGER THEN
          v_matches := true;
        END IF;

      WHEN 'first_pulse_window' THEN
        -- First person to pulse in a window
        IF (p_context->>'is_first_in_window')::BOOLEAN = true THEN
          v_matches := true;
        END IF;

      WHEN 'friend_count' THEN
        IF v_user.followers_count >= (v_condition->>'count')::INTEGER THEN
          v_matches := true;
        END IF;

      WHEN 'night_owl' THEN
        -- Pulsed between 2am-5am local time
        IF (p_context->>'hour')::INTEGER BETWEEN 2 AND 4 THEN
          v_matches := true;
        END IF;

      WHEN 'early_bird' THEN
        -- Pulsed between 5am-6am local time
        IF (p_context->>'hour')::INTEGER BETWEEN 5 AND 6 THEN
          v_matches := true;
        END IF;

      ELSE
        -- Unknown condition type
        CONTINUE;
    END CASE;

    IF v_matches THEN
      -- Award achievement
      INSERT INTO user_secret_achievements (user_id, achievement_id, context)
      VALUES (p_user_id, v_achievement.id, p_context)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;

      -- Apply rewards
      IF v_achievement.shield_reward > 0 THEN
        UPDATE users SET streak_shields = streak_shields + v_achievement.shield_reward WHERE id = p_user_id;
      END IF;

      v_earned := v_earned || jsonb_build_object(
        'id', v_achievement.id,
        'name', v_achievement.name,
        'description', v_achievement.description,
        'icon', v_achievement.icon,
        'rarity', v_achievement.rarity
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object('earned', v_earned);
END;
$$;

-- ============================================
-- SEED SECRET ACHIEVEMENTS
-- ============================================

INSERT INTO secret_achievements (id, name, description, hint, icon, rarity, shield_reward, trigger_condition) VALUES
  ('night_owl', 'Night Owl', 'Pulsed between 2-5 AM', 'The city sleeps...', '🦉', 'rare', 1, '{"type": "night_owl"}'),
  ('early_bird', 'Early Bird', 'Pulsed between 5-6 AM', 'Dawn breaks...', '🐦', 'rare', 1, '{"type": "early_bird"}'),
  ('triple_three', 'Triple Three', 'Pulsed at 3:33', 'Some times are special...', '3️⃣', 'epic', 2, '{"type": "time_pulse", "hour": 3, "minute": 33}'),
  ('eleven_eleven', 'Make a Wish', 'Pulsed at 11:11', 'Wishes come true...', '🌠', 'epic', 2, '{"type": "time_pulse", "hour": 11, "minute": 11}'),
  ('midnight', 'Midnight Pulse', 'Pulsed at exactly midnight', 'When one day becomes another...', '🕛', 'rare', 1, '{"type": "time_pulse", "hour": 0, "minute": 0}'),
  ('consistent_7', 'Mood Rock', 'Same emoji 7 days in a row', 'Consistency is key...', '🪨', 'epic', 2, '{"type": "emoji_streak", "days": 7}'),
  ('first_pulse', 'Trailblazer', 'First to pulse in a window', 'Be the first...', '🏃', 'legendary', 3, '{"type": "first_pulse_window"}'),
  ('popular_10', 'Rising Star', 'Reached 10 followers', 'People notice you...', '⭐', 'rare', 1, '{"type": "friend_count", "count": 10}'),
  ('popular_50', 'Local Celebrity', 'Reached 50 followers', 'Your vibe attracts...', '🌟', 'epic', 2, '{"type": "friend_count", "count": 50}'),
  ('popular_100', 'Influencer', 'Reached 100 followers', 'The people have spoken...', '👑', 'legendary', 3, '{"type": "friend_count", "count": 100}'),
  ('streak_30', 'Monthly Devotee', 'Maintained 30 day streak', 'Dedication unlocks secrets...', '📅', 'epic', 2, '{"type": "streak_milestone", "days": 30}'),
  ('streak_100', 'Centurion Secret', 'Reached 100 day streak', 'Legends are born...', '💎', 'legendary', 5, '{"type": "streak_milestone", "days": 100}')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- CLEANUP CRON SUPPORT
-- ============================================

-- Function to reset friend streaks at midnight (for users who didn't both pulse)
CREATE OR REPLACE FUNCTION reset_broken_friend_streaks()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_yesterday DATE := CURRENT_DATE - 1;
  v_reset INTEGER := 0;
BEGIN
  -- Reset streaks where both users didn't pulse yesterday
  UPDATE friend_streaks
  SET
    streak_days = 0,
    streak_started_at = NULL
  WHERE
    streak_days > 0 AND
    (last_user_a_pulse IS NULL OR last_user_a_pulse < v_yesterday OR
     last_user_b_pulse IS NULL OR last_user_b_pulse < v_yesterday);

  GET DIAGNOSTICS v_reset = ROW_COUNT;
  RETURN v_reset;
END;
$$;

-- Cleanup old active sessions
CREATE OR REPLACE FUNCTION cleanup_stale_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM active_sessions WHERE last_seen < NOW() - INTERVAL '1 hour';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- Cleanup old friend activity
CREATE OR REPLACE FUNCTION cleanup_old_activity()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM friend_activity WHERE created_at < NOW() - INTERVAL '7 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lucky_drops ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_special_emojis ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_secret_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_activity ENABLE ROW LEVEL SECURITY;

-- Follows: users can see their own follows, public can see followers count
CREATE POLICY "Users can manage own follows" ON follows
  FOR ALL USING (auth.uid()::UUID = follower_id OR auth.role() = 'service_role');

CREATE POLICY "Service role full access to follows" ON follows
  FOR ALL USING (auth.role() = 'service_role');

-- Friend streaks: users can see their own
CREATE POLICY "Users can see own friend streaks" ON friend_streaks
  FOR SELECT USING (auth.uid()::UUID IN (user_a_id, user_b_id) OR auth.role() = 'service_role');

CREATE POLICY "Service role manages friend streaks" ON friend_streaks
  FOR ALL USING (auth.role() = 'service_role');

-- Lucky drops: users can only see their own
CREATE POLICY "Users see own drops" ON lucky_drops
  FOR SELECT USING (auth.uid()::UUID = user_id OR auth.role() = 'service_role');

CREATE POLICY "Service role manages drops" ON lucky_drops
  FOR ALL USING (auth.role() = 'service_role');

-- Special emojis: users see own
CREATE POLICY "Users see own emojis" ON user_special_emojis
  FOR SELECT USING (auth.uid()::UUID = user_id OR auth.role() = 'service_role');

CREATE POLICY "Service role manages emojis" ON user_special_emojis
  FOR ALL USING (auth.role() = 'service_role');

-- Secret achievements: users see own
CREATE POLICY "Users see own achievements" ON user_secret_achievements
  FOR SELECT USING (auth.uid()::UUID = user_id OR auth.role() = 'service_role');

CREATE POLICY "Service role manages achievements" ON user_secret_achievements
  FOR ALL USING (auth.role() = 'service_role');

-- Active sessions: service role only
CREATE POLICY "Service role manages sessions" ON active_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- Friend activity: can see activity of people you follow
CREATE POLICY "Users see followed activity" ON friend_activity
  FOR SELECT USING (
    auth.role() = 'service_role' OR
    user_id IN (SELECT following_id FROM follows WHERE follower_id = auth.uid()::UUID)
  );

CREATE POLICY "Service role manages activity" ON friend_activity
  FOR ALL USING (auth.role() = 'service_role');

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION follow_user TO authenticated, anon;
GRANT EXECUTE ON FUNCTION unfollow_user TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_friends_feed TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_live_pulse_count TO authenticated, anon;
GRANT EXECUTE ON FUNCTION update_active_session TO authenticated, anon;
GRANT EXECUTE ON FUNCTION roll_lucky_drop TO authenticated, anon;
GRANT EXECUTE ON FUNCTION claim_lucky_drop TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_secret_achievements TO authenticated, anon;
