-- ============================================
-- Migration 015: Engagement Engine
-- ============================================
-- Adds XP system, daily challenges, engagement
-- escalation tracking, referral tiers, and
-- mood card sharing infrastructure.
-- ============================================


-- ============================================
-- 1. XP SYSTEM
-- ============================================

-- XP tracking columns on users
ALTER TABLE users ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS xp_level INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS xp_multiplier NUMERIC(3,1) DEFAULT 1.0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS xp_multiplier_expires_at TIMESTAMPTZ;

-- XP transaction log
CREATE TABLE IF NOT EXISTS xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  source TEXT NOT NULL, -- 'pulse', 'reaction_given', 'reaction_received', 'streak_bonus', 'challenge', 'lucky_drop', 'battle', 'referral'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_transactions_user ON xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created ON xp_transactions(created_at DESC);

-- Function to award XP with multiplier support
CREATE OR REPLACE FUNCTION award_xp(p_user_id UUID, p_amount INTEGER, p_source TEXT, p_metadata JSONB DEFAULT '{}')
RETURNS TABLE(new_xp INTEGER, new_level INTEGER, leveled_up BOOLEAN) AS $$
DECLARE
  v_multiplier NUMERIC;
  v_final_amount INTEGER;
  v_old_level INTEGER;
  v_new_level INTEGER;
  v_new_xp INTEGER;
BEGIN
  -- Get current multiplier (check if expired)
  SELECT
    CASE
      WHEN xp_multiplier_expires_at IS NOT NULL AND xp_multiplier_expires_at > NOW()
      THEN u.xp_multiplier
      ELSE 1.0
    END,
    u.xp_level
  INTO v_multiplier, v_old_level
  FROM users u WHERE u.id = p_user_id;

  v_final_amount := CEIL(p_amount * v_multiplier);

  -- Record transaction
  INSERT INTO xp_transactions (user_id, amount, source, metadata)
  VALUES (p_user_id, v_final_amount, p_source, p_metadata);

  -- Update user XP
  UPDATE users SET xp = xp + v_final_amount WHERE id = p_user_id
  RETURNING xp INTO v_new_xp;

  -- Calculate level: level = floor(sqrt(xp / 100)) + 1
  -- Level 2 at 100xp, level 3 at 400xp, level 5 at 1600xp, etc.
  v_new_level := GREATEST(1, FLOOR(SQRT(v_new_xp::NUMERIC / 100)) + 1);

  -- Update level if changed
  IF v_new_level != v_old_level THEN
    UPDATE users SET xp_level = v_new_level WHERE id = p_user_id;
  END IF;

  new_xp := v_new_xp;
  new_level := v_new_level;
  leveled_up := v_new_level > v_old_level;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- 2. DAILY CHALLENGES
-- ============================================

-- Challenge definitions (generated daily)
CREATE TABLE IF NOT EXISTS daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_date DATE NOT NULL DEFAULT CURRENT_DATE,
  challenge_type TEXT NOT NULL, -- 'pulse_all_windows', 'react_to_n', 'early_bird', 'mood_match', 'streak_maintain', 'social_pulse'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 25,
  condition JSONB NOT NULL, -- { "type": "react_to_n", "target": 3 }
  difficulty TEXT NOT NULL DEFAULT 'easy', -- 'easy', 'medium', 'hard'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_challenges_date_type ON daily_challenges(challenge_date, challenge_type);

-- Per-user challenge progress
CREATE TABLE IF NOT EXISTS user_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES daily_challenges(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  target INTEGER NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  xp_claimed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_challenges_user ON user_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenges_date ON user_challenges(created_at DESC);

-- Function to generate daily challenges (called by cron)
CREATE OR REPLACE FUNCTION generate_daily_challenges(p_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_day_of_week INTEGER;
BEGIN
  -- Don't regenerate if already exists
  IF EXISTS (SELECT 1 FROM daily_challenges WHERE challenge_date = p_date) THEN
    RETURN 0;
  END IF;

  v_day_of_week := EXTRACT(DOW FROM p_date);

  -- Always: Perfect Day challenge (all 3 windows)
  INSERT INTO daily_challenges (challenge_date, challenge_type, title, description, icon, xp_reward, condition, difficulty)
  VALUES (p_date, 'pulse_all_windows', 'Perfect Day', 'Pulse in all 3 windows today', '✨', 50, '{"type": "pulse_all_windows", "target": 3}', 'medium');
  v_count := v_count + 1;

  -- Always: Social challenge (react to pulses)
  INSERT INTO daily_challenges (challenge_date, challenge_type, title, description, icon, xp_reward, condition, difficulty)
  VALUES (p_date, 'react_to_n', 'Spread the Love', 'React to 3 pulses today', '❤️', 25, '{"type": "react_to_n", "target": 3}', 'easy');
  v_count := v_count + 1;

  -- Rotating challenge based on day of week
  CASE v_day_of_week
    WHEN 0 THEN -- Sunday: Easy day
      INSERT INTO daily_challenges (challenge_date, challenge_type, title, description, icon, xp_reward, condition, difficulty)
      VALUES (p_date, 'early_bird', 'Sunday Rise', 'Pulse in the morning window', '🌅', 20, '{"type": "pulse_in_window", "window": "morning"}', 'easy');
    WHEN 1 THEN -- Monday: Motivation
      INSERT INTO daily_challenges (challenge_date, challenge_type, title, description, icon, xp_reward, condition, difficulty)
      VALUES (p_date, 'streak_maintain', 'Monday Momentum', 'Keep your streak alive!', '🔥', 30, '{"type": "streak_maintain"}', 'easy');
    WHEN 2 THEN -- Tuesday
      INSERT INTO daily_challenges (challenge_date, challenge_type, title, description, icon, xp_reward, condition, difficulty)
      VALUES (p_date, 'react_to_n', 'Empathy Day', 'React to 5 pulses', '🤗', 35, '{"type": "react_to_n", "target": 5}', 'medium');
    WHEN 3 THEN -- Wednesday: Social
      INSERT INTO daily_challenges (challenge_date, challenge_type, title, description, icon, xp_reward, condition, difficulty)
      VALUES (p_date, 'social_pulse', 'Midweek Sync', 'Pulse when your city is trending', '🏙️', 40, '{"type": "social_pulse"}', 'medium');
    WHEN 4 THEN -- Thursday
      INSERT INTO daily_challenges (challenge_date, challenge_type, title, description, icon, xp_reward, condition, difficulty)
      VALUES (p_date, 'early_bird', 'Early Riser', 'Pulse before 9 AM', '🐦', 30, '{"type": "pulse_before_hour", "hour": 9}', 'medium');
    WHEN 5 THEN -- Friday: Party
      INSERT INTO daily_challenges (challenge_date, challenge_type, title, description, icon, xp_reward, condition, difficulty)
      VALUES (p_date, 'react_to_n', 'Friday Vibes', 'React to 7 pulses', '🎉', 45, '{"type": "react_to_n", "target": 7}', 'hard');
    WHEN 6 THEN -- Saturday: Chill
      INSERT INTO daily_challenges (challenge_date, challenge_type, title, description, icon, xp_reward, condition, difficulty)
      VALUES (p_date, 'mood_match', 'Weekend Match', 'Match your city''s top mood', '🎯', 35, '{"type": "mood_match"}', 'medium');
  END CASE;
  v_count := v_count + 1;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- 3. ENGAGEMENT TRACKING FOR ESCALATION
-- ============================================

-- Track days since last pulse for escalation engine
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_pulse_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS days_inactive INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS escalation_level INTEGER DEFAULT 0; -- 0=active, 1=day1miss, 2=day2miss, 3=day3miss, 4=day5miss, 5=breakup_sent
ALTER TABLE users ADD COLUMN IF NOT EXISTS winback_sent_at TIMESTAMPTZ;


-- ============================================
-- 4. REFERRAL TIERS
-- ============================================

-- Referral reward tiers
CREATE TABLE IF NOT EXISTS referral_tiers (
  tier INTEGER PRIMARY KEY,
  referrals_required INTEGER NOT NULL,
  reward_type TEXT NOT NULL, -- 'shield', 'badge', 'special_emoji', 'xp_boost'
  reward_value JSONB NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL
);

INSERT INTO referral_tiers (tier, referrals_required, reward_type, reward_value, title, description) VALUES
  (1, 1, 'shield', '{"amount": 1}', 'First Friend', 'Invite your first friend'),
  (2, 3, 'badge', '{"badge_id": "referral_3"}', 'Connector', 'Bring 3 friends to the pulse'),
  (3, 5, 'special_emoji', '{"emoji": "⭐", "name": "Star Recruiter"}', 'Star Recruiter', 'Your crew is growing!'),
  (4, 10, 'xp_boost', '{"multiplier": 2, "duration_hours": 48}', 'Ambassador', 'You''re an official ambassador'),
  (5, 25, 'badge', '{"badge_id": "referral_25"}', 'Legendary Recruiter', 'Your influence is legendary')
ON CONFLICT (tier) DO NOTHING;


-- ============================================
-- 5. MOOD CARD SHARING
-- ============================================

-- Track share events for viral loop
ALTER TABLE share_events ADD COLUMN IF NOT EXISTS card_type TEXT DEFAULT 'weekly'; -- 'weekly', 'daily', 'streak', 'badge'
ALTER TABLE share_events ADD COLUMN IF NOT EXISTS card_data JSONB DEFAULT '{}';
