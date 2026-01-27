-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY,
    timezone TEXT NOT NULL,
    country_code TEXT,
    city_id TEXT,
    gender TEXT,
    push_opt_in BOOLEAN DEFAULT FALSE,
    streak_days INTEGER DEFAULT 0,
    last_pulse_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on timezone for cron notifications
CREATE INDEX idx_users_timezone ON users(timezone);
CREATE INDEX idx_users_country_code ON users(country_code) WHERE country_code IS NOT NULL;
CREATE INDEX idx_users_city_id ON users(city_id) WHERE city_id IS NOT NULL;

-- Pulse windows table (optional - can be computed on the fly)
CREATE TABLE pulse_windows (
    id TEXT PRIMARY KEY, -- format: date|window_type|timezone
    date DATE NOT NULL,
    window_type TEXT NOT NULL CHECK (window_type IN ('morning', 'afternoon', 'night')),
    tz TEXT NOT NULL,
    starts_at_utc TIMESTAMPTZ NOT NULL,
    ends_at_utc TIMESTAMPTZ NOT NULL
);

-- Pulses table
CREATE TABLE pulses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    window_id TEXT NOT NULL,
    mood TEXT NOT NULL CHECK (mood IN ('hype', 'overwhelmed', 'calm', 'chaos', 'low', 'focused')),
    country_code TEXT,
    city_id TEXT,
    gender TEXT,
    reaction_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, window_id)
);

-- Indexes for pulses
CREATE INDEX idx_pulses_window_id ON pulses(window_id);
CREATE INDEX idx_pulses_user_id ON pulses(user_id);
CREATE INDEX idx_pulses_created_at ON pulses(created_at);

-- Reactions table
CREATE TABLE reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pulse_id UUID NOT NULL REFERENCES pulses(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL CHECK (emoji IN ('heart', 'laugh', 'fire', 'hug', 'skull')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(pulse_id, from_user_id)
);

CREATE INDEX idx_reactions_pulse_id ON reactions(pulse_id);

-- Global window aggregates
CREATE TABLE aggregates_global_window (
    window_id TEXT PRIMARY KEY,
    mood_counts JSONB DEFAULT '{"hype": 0, "overwhelmed": 0, "calm": 0, "chaos": 0, "low": 0, "focused": 0}'::jsonb,
    total_count INTEGER DEFAULT 0,
    top_cities JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Country window aggregates
CREATE TABLE aggregates_country_window (
    window_id TEXT NOT NULL,
    country_code TEXT NOT NULL,
    mood_counts JSONB DEFAULT '{"hype": 0, "overwhelmed": 0, "calm": 0, "chaos": 0, "low": 0, "focused": 0}'::jsonb,
    total_count INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (window_id, country_code)
);

-- City window aggregates
CREATE TABLE aggregates_city_window (
    window_id TEXT NOT NULL,
    city_id TEXT NOT NULL,
    mood_counts JSONB DEFAULT '{"hype": 0, "overwhelmed": 0, "calm": 0, "chaos": 0, "low": 0, "focused": 0}'::jsonb,
    total_count INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (window_id, city_id)
);

-- Notification templates
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    cooldown_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification jobs queue
CREATE TABLE notification_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES notification_templates(id),
    audience_type TEXT NOT NULL CHECK (audience_type IN ('all', 'tags', 'users')),
    audience_payload JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    dedupe_key TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX idx_notification_jobs_status ON notification_jobs(status) WHERE status = 'pending';

-- Badges table
CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    condition JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User badges
CREATE TABLE user_badges (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, badge_id)
);

-- Insert default notification templates
INSERT INTO notification_templates (type, title, body, cooldown_minutes) VALUES
('window_open', 'Morning Pulse Open! 🌍', 'How are you feeling right now? Share your mood with the world.', 180),
('window_open_afternoon', 'Afternoon Pulse Open! 🌍', 'Time for your afternoon check-in. How''s it going?', 180),
('window_open_night', 'Night Pulse Open! 🌍', 'End your day by sharing how you''re feeling.', 180),
('streak_reminder', 'Don''t break your streak! 🔥', 'You have a pulse window open. Keep your streak going!', 60),
('city_trend', '{{city}} is feeling {{mood}}', '{{percentage}}% of people in your city are {{mood}} right now', 30);

-- Insert default badges
INSERT INTO badges (name, description, icon, condition) VALUES
('First Pulse', 'Shared your first mood with the world', '🌟', '{"type": "pulse_count", "count": 1}'),
('Week Warrior', 'Maintained a 7-day streak', '🔥', '{"type": "streak", "days": 7}'),
('Month Master', 'Maintained a 30-day streak', '👑', '{"type": "streak", "days": 30}'),
('Early Bird', 'Submitted 10 morning pulses', '🌅', '{"type": "window_count", "window": "morning", "count": 10}'),
('Night Owl', 'Submitted 10 night pulses', '🦉', '{"type": "window_count", "window": "night", "count": 10}'),
('Reactor', 'Sent 50 reactions to other pulses', '❤️', '{"type": "reaction_count", "count": 50}');

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulses ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregates_global_window ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregates_country_window ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregates_city_window ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can read and update their own data
CREATE POLICY "Users can read own data" ON users
    FOR SELECT USING (true);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (true);

CREATE POLICY "Users can insert own data" ON users
    FOR INSERT WITH CHECK (true);

-- Pulses are readable by all, writable by owner
CREATE POLICY "Pulses are publicly readable" ON pulses
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own pulses" ON pulses
    FOR INSERT WITH CHECK (true);

-- Reactions are readable by all, writable by sender
CREATE POLICY "Reactions are publicly readable" ON reactions
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own reactions" ON reactions
    FOR INSERT WITH CHECK (true);

-- Aggregates are publicly readable
CREATE POLICY "Global aggregates are publicly readable" ON aggregates_global_window
    FOR SELECT USING (true);

CREATE POLICY "Global aggregates are insertable" ON aggregates_global_window
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Global aggregates are updateable" ON aggregates_global_window
    FOR UPDATE USING (true);

CREATE POLICY "Country aggregates are publicly readable" ON aggregates_country_window
    FOR SELECT USING (true);

CREATE POLICY "Country aggregates are insertable" ON aggregates_country_window
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Country aggregates are updateable" ON aggregates_country_window
    FOR UPDATE USING (true);

CREATE POLICY "City aggregates are publicly readable" ON aggregates_city_window
    FOR SELECT USING (true);

CREATE POLICY "City aggregates are insertable" ON aggregates_city_window
    FOR INSERT WITH CHECK (true);

CREATE POLICY "City aggregates are updateable" ON aggregates_city_window
    FOR UPDATE USING (true);
