-- Migration: Add streak shields and aura system
-- Implements "Pulse Journey" retention mechanics

-- Add shields to users table (streak protection)
ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_shields INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS shields_last_granted DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS max_streak_ever INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS aura TEXT DEFAULT NULL;

-- Add constraint for shields (max 3)
ALTER TABLE users ADD CONSTRAINT users_shields_max CHECK (streak_shields >= 0 AND streak_shields <= 3);

-- Track streak history for "streak rescue" feature
CREATE TABLE IF NOT EXISTS streak_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    streak_lost INTEGER NOT NULL,
    lost_at TIMESTAMPTZ DEFAULT NOW(),
    rescued BOOLEAN DEFAULT FALSE,
    rescued_at TIMESTAMPTZ
);

CREATE INDEX idx_streak_history_user_recent ON streak_history(user_id, lost_at DESC);

-- Function to grant shields every 14 days
-- Called from cron or on user activity
CREATE OR REPLACE FUNCTION grant_streak_shields()
RETURNS void AS $$
BEGIN
    UPDATE users
    SET
        streak_shields = LEAST(streak_shields + 1, 3),
        shields_last_granted = CURRENT_DATE
    WHERE
        shields_last_granted IS NULL
        OR shields_last_granted <= CURRENT_DATE - INTERVAL '14 days';
END;
$$ LANGUAGE plpgsql;

-- Update max_streak_ever when streak increases
CREATE OR REPLACE FUNCTION update_max_streak()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.streak_days > OLD.streak_days AND NEW.streak_days > OLD.max_streak_ever THEN
        NEW.max_streak_ever := NEW.streak_days;
    END IF;

    -- Auto-assign aura based on streak
    IF NEW.streak_days >= 100 THEN
        NEW.aura := 'diamond';
    ELSIF NEW.streak_days >= 30 THEN
        NEW.aura := 'lightning';
    ELSIF NEW.streak_days >= 7 THEN
        NEW.aura := 'fire';
    ELSE
        NEW.aura := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for max streak and aura updates
DROP TRIGGER IF EXISTS trigger_update_max_streak ON users;
CREATE TRIGGER trigger_update_max_streak
    BEFORE UPDATE OF streak_days ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_max_streak();

-- Add comment explaining the aura system
COMMENT ON COLUMN users.aura IS 'User aura: fire (7+ days), lightning (30+ days), diamond (100+ days, permanent)';
COMMENT ON COLUMN users.streak_shields IS 'Protects streak from breaking. Max 3, granted 1 every 14 days.';

-- Insert "Streak at Risk" nudge rule (if not exists)
INSERT INTO nudge_rules (
    name,
    description,
    enabled,
    priority,
    target_cohort,
    conditions,
    max_per_window,
    inline_template
) VALUES (
    'Streak at Risk',
    'Notify users with active streaks who havent pulsed today during the last window',
    TRUE,
    10, -- High priority
    'streak_users',
    '{"window_active": true, "streak_at_risk": true}',
    1,
    '{"title": "Your streak is at risk! 🔥", "body": "This is your last chance today. Don''t lose your streak!"}'
) ON CONFLICT DO NOTHING;
