-- Migration 013: Custom Windows System
-- Allows admins to create custom time windows (one-time events or recurring)
-- with special rewards, notifications, and targeting options.

-- Custom Windows table
CREATE TABLE IF NOT EXISTS custom_windows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Basic info
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(10) DEFAULT '🎉',
    color VARCHAR(7) DEFAULT '#8B5CF6',
    banner_url TEXT,

    -- Schedule (user's local time)
    start_hour INTEGER NOT NULL CHECK (start_hour >= 0 AND start_hour <= 23),
    end_hour INTEGER NOT NULL CHECK (end_hour >= 0 AND end_hour <= 23),

    -- Event type
    event_type VARCHAR(20) NOT NULL DEFAULT 'one_time'
        CHECK (event_type IN ('one_time', 'recurring')),

    -- Fields for one_time events
    event_date DATE, -- Required for one_time

    -- Fields for recurring events (simple recurrence)
    recurrence_rule JSONB,
    -- Options:
    -- Daily: {"frequency": "daily"}
    -- Weekly: {"frequency": "weekly", "daysOfWeek": ["friday", "saturday"]}
    -- Monthly: {"frequency": "monthly", "dayOfMonth": 15}
    recurrence_start DATE,  -- Start date for recurrence
    recurrence_end DATE,    -- End date (optional)

    -- Rewards
    xp_multiplier DECIMAL(3,2) DEFAULT 1.0,
    bonus_badge_id VARCHAR(50),
    lucky_drop_boost DECIMAL(3,2) DEFAULT 1.0,

    -- Notifications
    notify_on_open BOOLEAN DEFAULT true,
    notify_before_close BOOLEAN DEFAULT true,
    notify_minutes_before INTEGER DEFAULT 30,
    custom_notification_title TEXT,
    custom_notification_body TEXT,

    -- Targeting
    target_timezones TEXT[],
    target_countries TEXT[],
    min_streak_days INTEGER DEFAULT 0,

    -- Status
    status VARCHAR(20) DEFAULT 'draft'
        CHECK (status IN ('draft', 'scheduled', 'active', 'completed', 'cancelled')),
    priority INTEGER DEFAULT 100,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for custom_windows
CREATE INDEX idx_custom_windows_status ON custom_windows(status);
CREATE INDEX idx_custom_windows_event_type ON custom_windows(event_type);
CREATE INDEX idx_custom_windows_event_date ON custom_windows(event_date);
CREATE INDEX idx_custom_windows_priority ON custom_windows(priority DESC);

-- Custom Window Participations table
CREATE TABLE IF NOT EXISTS custom_window_participations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    custom_window_id UUID NOT NULL REFERENCES custom_windows(id) ON DELETE CASCADE,
    window_instance_id VARCHAR(100) NOT NULL, -- Unique per window occurrence (e.g., "windowId_2024-01-15")
    pulse_id UUID REFERENCES pulses(id) ON DELETE SET NULL,
    xp_earned INTEGER DEFAULT 0,
    bonus_applied BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, window_instance_id)
);

-- Indexes for participations
CREATE INDEX idx_custom_window_participations_user_id ON custom_window_participations(user_id);
CREATE INDEX idx_custom_window_participations_window_id ON custom_window_participations(custom_window_id);
CREATE INDEX idx_custom_window_participations_instance_id ON custom_window_participations(window_instance_id);
CREATE INDEX idx_custom_window_participations_created_at ON custom_window_participations(created_at DESC);

-- Trigger for updated_at on custom_windows
CREATE TRIGGER update_custom_windows_updated_at
    BEFORE UPDATE ON custom_windows
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE custom_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_window_participations ENABLE ROW LEVEL SECURITY;

-- Policies for custom_windows (viewable when active or scheduled)
CREATE POLICY "Custom windows are viewable when active or scheduled" ON custom_windows
    FOR SELECT USING (status IN ('active', 'scheduled'));

-- Policies for participations
CREATE POLICY "Users can view own participations" ON custom_window_participations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create participations" ON custom_window_participations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add custom_window_id to pulses table for tracking which window a pulse was submitted during
ALTER TABLE pulses ADD COLUMN IF NOT EXISTS custom_window_id UUID REFERENCES custom_windows(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_pulses_custom_window_id ON pulses(custom_window_id);
