-- PRD v1.1: Configurable Backend System
-- Central configuration, City Flips, Global Shifts, City Battles, Nudges, A2HS

-- ============================================
-- 1. APP_CONFIG: Central configuration table
-- ============================================
CREATE TABLE IF NOT EXISTS app_config (
    id TEXT PRIMARY KEY DEFAULT 'main',
    config JSONB NOT NULL DEFAULT '{
        "windows": {
            "enabled": true,
            "schedule": {
                "morning": {"start": 8, "end": 11},
                "afternoon": {"start": 13, "end": 16},
                "night": {"start": 20, "end": 23}
            },
            "tolerance_minutes": 5
        },
        "privacy": {
            "min_city_pulses": 10,
            "min_segment_pulses": 5
        },
        "push": {
            "daily_cap_default": 5,
            "quiet_hours": {"start": 22, "end": 8},
            "priorities": ["streak_risk", "reaction", "flip", "battle", "shift", "nudge"]
        },
        "flip": {
            "enabled": true,
            "min_city_pulses": 20,
            "min_delta_points": 5,
            "rate_limit_per_city_window": 1
        },
        "shift": {
            "enabled": true,
            "min_global_pulses": 100,
            "min_delta_points": 10,
            "frequency": "per_window"
        },
        "battles": {
            "enabled": false,
            "scoring_mode": "per_capita_bucket"
        },
        "a2hs": {
            "enabled": true,
            "cooldown_hours": 72,
            "trigger_after_pulses": 1
        },
        "nudges": {
            "enabled": true,
            "dedupe_window_minutes": 180
        }
    }',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default config
INSERT INTO app_config (id, config) VALUES ('main', (
    SELECT config FROM app_config WHERE id = 'main'
)) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. WINDOW_SCHEDULES: Per-timezone schedules
-- ============================================
CREATE TABLE IF NOT EXISTS window_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timezone_bucket TEXT NOT NULL, -- e.g., 'UTC-5', 'UTC+1', or 'default'
    window_type TEXT NOT NULL, -- morning, afternoon, night
    start_hour INT NOT NULL,
    end_hour INT NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(timezone_bucket, window_type)
);

-- Default schedules
INSERT INTO window_schedules (timezone_bucket, window_type, start_hour, end_hour) VALUES
    ('default', 'morning', 8, 11),
    ('default', 'afternoon', 13, 16),
    ('default', 'night', 20, 23)
ON CONFLICT (timezone_bucket, window_type) DO NOTHING;

-- ============================================
-- 3. CITY_FLIPS: Event log for city mood flips
-- ============================================
CREATE TABLE IF NOT EXISTS city_flips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city_id TEXT NOT NULL,
    window_id TEXT NOT NULL,
    previous_mood TEXT NOT NULL,
    new_mood TEXT NOT NULL,
    delta_points INT NOT NULL,
    total_pulses INT NOT NULL,
    notification_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_city_flips_city_window ON city_flips(city_id, window_id);
CREATE INDEX idx_city_flips_created ON city_flips(created_at DESC);

-- ============================================
-- 4. GLOBAL_SHIFTS: Event log for global mood shifts
-- ============================================
CREATE TABLE IF NOT EXISTS global_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    window_id TEXT NOT NULL,
    previous_top_mood TEXT NOT NULL,
    new_top_mood TEXT NOT NULL,
    delta_points INT NOT NULL,
    total_pulses INT NOT NULL,
    audience_target TEXT DEFAULT 'global', -- global, tz_bucket, top_countries
    notification_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_global_shifts_window ON global_shifts(window_id);
CREATE INDEX idx_global_shifts_created ON global_shifts(created_at DESC);

-- ============================================
-- 5. CITY_BATTLES: Weekly battle definitions
-- ============================================
CREATE TABLE IF NOT EXISTS city_battles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    city_a_id TEXT NOT NULL,
    city_a_name TEXT NOT NULL,
    city_b_id TEXT NOT NULL,
    city_b_name TEXT NOT NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    scoring_mode TEXT DEFAULT 'per_capita_bucket', -- per_capita_bucket, total
    status TEXT DEFAULT 'scheduled', -- scheduled, active, completed, cancelled

    -- Configurable copy/assets
    copy JSONB DEFAULT '{
        "start_title": "City Battle Begins!",
        "start_body": "{city_a} vs {city_b} - Who will pulse more?",
        "mid_title": "Close Battle!",
        "mid_body": "Only {diff} points apart!",
        "end_title": "Battle Complete!",
        "end_body": "{winner} wins with {score} points!"
    }',

    -- Push schedule (when to send notifications)
    push_schedule JSONB DEFAULT '{
        "start": true,
        "mid_close_match_threshold": 10,
        "end": true
    }',

    -- Visual assets
    assets JSONB DEFAULT '{
        "card_color_a": "#3b82f6",
        "card_color_b": "#ef4444",
        "badge_winner": "trophy"
    }',

    winner_city_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_city_battles_status ON city_battles(status);
CREATE INDEX idx_city_battles_dates ON city_battles(start_at, end_at);

-- ============================================
-- 6. CITY_BATTLE_SCORES: Computed scores
-- ============================================
CREATE TABLE IF NOT EXISTS city_battle_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    battle_id UUID NOT NULL REFERENCES city_battles(id) ON DELETE CASCADE,
    city_id TEXT NOT NULL,
    window_id TEXT,
    raw_pulses INT DEFAULT 0,
    weighted_score DECIMAL(10,2) DEFAULT 0,
    mood_breakdown JSONB DEFAULT '{}',
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(battle_id, city_id, window_id)
);

CREATE INDEX idx_battle_scores_battle ON city_battle_scores(battle_id);

-- ============================================
-- 7. USER_PROMPTS: Track A2HS and other prompts
-- ============================================
CREATE TABLE IF NOT EXISTS user_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prompt_type TEXT NOT NULL, -- a2hs, push_permission, etc.
    shown_at TIMESTAMPTZ DEFAULT NOW(),
    action_taken TEXT, -- dismissed, accepted, ignored
    action_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_user_prompts_user ON user_prompts(user_id, prompt_type);
CREATE INDEX idx_user_prompts_shown ON user_prompts(shown_at DESC);

-- ============================================
-- 8. NOTIFICATION_DELIVERIES: Audit log
-- ============================================
CREATE TABLE IF NOT EXISTS notification_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES notification_jobs(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    onesignal_id TEXT,
    notification_type TEXT NOT NULL, -- window_open, flip, shift, battle, nudge, reaction
    title TEXT,
    body TEXT,
    status TEXT DEFAULT 'sent', -- sent, delivered, clicked, failed
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_notification_deliveries_user ON notification_deliveries(user_id);
CREATE INDEX idx_notification_deliveries_type ON notification_deliveries(notification_type);
CREATE INDEX idx_notification_deliveries_sent ON notification_deliveries(sent_at DESC);

-- ============================================
-- 9. NUDGE_RULES: Declarative nudge rules
-- ============================================
CREATE TABLE IF NOT EXISTS nudge_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    enabled BOOLEAN DEFAULT TRUE,
    priority INT DEFAULT 50, -- lower = higher priority

    -- Targeting
    target_cohort TEXT DEFAULT 'all', -- all, new_users, streak_users, inactive
    target_query JSONB DEFAULT '{}', -- additional SQL-like conditions

    -- Conditions
    conditions JSONB NOT NULL DEFAULT '{
        "window_active": true,
        "user_has_not_pulsed": true,
        "minutes_into_window": 30
    }',

    -- Timing
    check_interval_minutes INT DEFAULT 15,
    cooldown_minutes INT DEFAULT 180, -- per user
    max_per_window INT DEFAULT 1,

    -- Templates (can reference notification_templates or inline)
    template_id UUID REFERENCES notification_templates(id),
    inline_template JSONB DEFAULT '{
        "title": "Time to pulse!",
        "body": "Share how you are feeling right now"
    }',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_nudge_rules_enabled ON nudge_rules(enabled, priority);

-- ============================================
-- 10. NUDGE_DELIVERIES: Track nudge sends
-- ============================================
CREATE TABLE IF NOT EXISTS nudge_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES nudge_rules(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    window_id TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    converted BOOLEAN DEFAULT FALSE, -- did user pulse after?
    converted_at TIMESTAMPTZ
);

CREATE INDEX idx_nudge_deliveries_user_window ON nudge_deliveries(user_id, window_id);
CREATE INDEX idx_nudge_deliveries_rule ON nudge_deliveries(rule_id);

-- ============================================
-- 11. Add tracking fields to existing tables
-- ============================================

-- Add daily notification count to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS notifications_today INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notifications_reset_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS quiet_hours_override JSONB;

-- ============================================
-- 12. Triggers for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_app_config_updated_at
    BEFORE UPDATE ON app_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_window_schedules_updated_at
    BEFORE UPDATE ON window_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_city_battles_updated_at
    BEFORE UPDATE ON city_battles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nudge_rules_updated_at
    BEFORE UPDATE ON nudge_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 13. Default nudge rules
-- ============================================
INSERT INTO nudge_rules (name, description, conditions, inline_template) VALUES
(
    'Window Open Reminder',
    'Remind users who have not pulsed 30 minutes into the window',
    '{"window_active": true, "user_has_not_pulsed": true, "minutes_into_window": 30}',
    '{"title": "Window is open!", "body": "Share your mood before the window closes"}'
),
(
    'Streak at Risk',
    'Alert users who might lose their streak',
    '{"window_active": true, "user_has_not_pulsed": true, "has_streak": true, "is_last_window_of_day": true}',
    '{"title": "Streak at risk! 🔥", "body": "Don''t lose your {streak_days} day streak!"}'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 14. RLS Policies
-- ============================================
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE window_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE city_flips ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE city_battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE city_battle_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE nudge_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE nudge_deliveries ENABLE ROW LEVEL SECURITY;

-- Public read for active battles
CREATE POLICY "Active battles are viewable" ON city_battles
    FOR SELECT USING (status IN ('active', 'completed'));

-- Users can see their own prompts
CREATE POLICY "Users can view own prompts" ON user_prompts
    FOR ALL USING (true);
