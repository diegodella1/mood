-- Migration 006: Critical fixes for production readiness
-- Fixes: atomic transactions, shield usage, diamond permanence, aggregate race conditions

-- ============================================================================
-- 1. FIX DIAMOND AURA PERMANENCE
-- ============================================================================
-- Drop and recreate the trigger to NEVER remove diamond aura once earned

CREATE OR REPLACE FUNCTION update_max_streak()
RETURNS TRIGGER AS $$
BEGIN
    -- Update max_streak_ever if current streak is higher
    IF NEW.streak_days > COALESCE(OLD.max_streak_ever, 0) THEN
        NEW.max_streak_ever := NEW.streak_days;
    END IF;

    -- DIAMOND IS PERMANENT - once earned, never removed
    IF OLD.aura = 'diamond' THEN
        NEW.aura := 'diamond';
    ELSIF NEW.streak_days >= 100 THEN
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

-- ============================================================================
-- 2. ATOMIC AGGREGATE INCREMENT (fixes race condition)
-- ============================================================================

-- Global aggregate increment
CREATE OR REPLACE FUNCTION increment_global_aggregate(
    p_window_id TEXT,
    p_mood TEXT
) RETURNS void AS $$
BEGIN
    INSERT INTO aggregates_global_window (window_id, mood_counts, total_count, top_cities)
    VALUES (
        p_window_id,
        jsonb_build_object(p_mood, 1),
        1,
        '[]'::jsonb
    )
    ON CONFLICT (window_id) DO UPDATE SET
        mood_counts = COALESCE(aggregates_global_window.mood_counts, '{}'::jsonb) ||
            jsonb_build_object(
                p_mood,
                COALESCE((aggregates_global_window.mood_counts->>p_mood)::integer, 0) + 1
            ),
        total_count = aggregates_global_window.total_count + 1,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Country aggregate increment
CREATE OR REPLACE FUNCTION increment_country_aggregate(
    p_window_id TEXT,
    p_country_code TEXT,
    p_mood TEXT
) RETURNS void AS $$
BEGIN
    IF p_country_code IS NULL THEN
        RETURN;
    END IF;

    INSERT INTO aggregates_country_window (window_id, country_code, mood_counts, total_count)
    VALUES (
        p_window_id,
        p_country_code,
        jsonb_build_object(p_mood, 1),
        1
    )
    ON CONFLICT (window_id, country_code) DO UPDATE SET
        mood_counts = COALESCE(aggregates_country_window.mood_counts, '{}'::jsonb) ||
            jsonb_build_object(
                p_mood,
                COALESCE((aggregates_country_window.mood_counts->>p_mood)::integer, 0) + 1
            ),
        total_count = aggregates_country_window.total_count + 1,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- City aggregate increment
CREATE OR REPLACE FUNCTION increment_city_aggregate(
    p_window_id TEXT,
    p_city_id TEXT,
    p_mood TEXT
) RETURNS void AS $$
BEGIN
    IF p_city_id IS NULL THEN
        RETURN;
    END IF;

    INSERT INTO aggregates_city_window (window_id, city_id, mood_counts, total_count)
    VALUES (
        p_window_id,
        p_city_id,
        jsonb_build_object(p_mood, 1),
        1
    )
    ON CONFLICT (window_id, city_id) DO UPDATE SET
        mood_counts = COALESCE(aggregates_city_window.mood_counts, '{}'::jsonb) ||
            jsonb_build_object(
                p_mood,
                COALESCE((aggregates_city_window.mood_counts->>p_mood)::integer, 0) + 1
            ),
        total_count = aggregates_city_window.total_count + 1,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. ATOMIC PULSE SUBMISSION WITH SHIELD USAGE
-- ============================================================================

CREATE OR REPLACE FUNCTION submit_pulse_atomic(
    p_user_id UUID,
    p_window_id TEXT,
    p_mood TEXT,
    p_pulse_date DATE
) RETURNS TABLE (
    pulse_id UUID,
    new_streak INTEGER,
    shield_used BOOLEAN,
    streak_lost INTEGER,
    aura TEXT
) AS $$
DECLARE
    v_user RECORD;
    v_pulse_id UUID;
    v_new_streak INTEGER;
    v_shield_used BOOLEAN := FALSE;
    v_streak_lost INTEGER := 0;
    v_diff_days INTEGER;
BEGIN
    -- Lock the user row to prevent race conditions
    SELECT * INTO v_user
    FROM users
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found: %', p_user_id;
    END IF;

    -- Calculate streak
    v_new_streak := COALESCE(v_user.streak_days, 0);

    IF v_user.last_pulse_date IS NOT NULL THEN
        v_diff_days := p_pulse_date - v_user.last_pulse_date;

        IF v_diff_days = 1 THEN
            -- Consecutive day: increment streak
            v_new_streak := v_new_streak + 1;
        ELSIF v_diff_days > 1 THEN
            -- Missed days: check for shield
            IF COALESCE(v_user.streak_shields, 0) > 0 THEN
                -- Use shield to protect streak
                v_shield_used := TRUE;
                -- Streak stays the same (protected)
            ELSE
                -- No shield: record lost streak and reset
                v_streak_lost := v_user.streak_days;
                v_new_streak := 1;

                -- Record in streak history
                INSERT INTO streak_history (user_id, streak_lost)
                VALUES (p_user_id, v_streak_lost);
            END IF;
        END IF;
        -- If v_diff_days = 0 (same day), streak stays the same
    ELSE
        -- First pulse ever
        v_new_streak := 1;
    END IF;

    -- Insert pulse (will fail on duplicate constraint if already submitted)
    INSERT INTO pulses (user_id, window_id, mood, country_code, city_id, gender)
    SELECT
        p_user_id,
        p_window_id,
        p_mood,
        v_user.country_code,
        v_user.city_id,
        v_user.gender
    RETURNING id INTO v_pulse_id;

    -- Update user (only if pulse insert succeeded)
    UPDATE users
    SET
        streak_days = v_new_streak,
        last_pulse_date = p_pulse_date,
        streak_shields = CASE
            WHEN v_shield_used THEN streak_shields - 1
            ELSE streak_shields
        END,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Update aggregates atomically
    PERFORM increment_global_aggregate(p_window_id, p_mood);
    PERFORM increment_country_aggregate(p_window_id, v_user.country_code, p_mood);
    PERFORM increment_city_aggregate(p_window_id, v_user.city_id, p_mood);

    -- Return result
    RETURN QUERY
    SELECT
        v_pulse_id,
        v_new_streak,
        v_shield_used,
        v_streak_lost,
        (SELECT u.aura FROM users u WHERE u.id = p_user_id);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. GRANT SHIELDS ON STREAK MILESTONES (every 7 days of streak)
-- ============================================================================

CREATE OR REPLACE FUNCTION grant_shields_on_milestone()
RETURNS TRIGGER AS $$
BEGIN
    -- Grant a shield every 7 days of streak (at 7, 14, 21, 28, etc.)
    -- But only if it's a new milestone (OLD streak was below this threshold)
    IF NEW.streak_days > OLD.streak_days
       AND NEW.streak_days % 7 = 0
       AND NEW.streak_shields < 3 THEN
        NEW.streak_shields := LEAST(NEW.streak_shields + 1, 3);
        NEW.shields_last_granted := CURRENT_DATE;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_grant_shields ON users;
CREATE TRIGGER trigger_grant_shields
    BEFORE UPDATE OF streak_days ON users
    FOR EACH ROW
    EXECUTE FUNCTION grant_shields_on_milestone();

-- ============================================================================
-- 5. HELPER FUNCTION TO GET USER BADGE STATS (fixes N+1 query)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_badge_stats(p_user_id UUID)
RETURNS TABLE (
    current_streak INTEGER,
    total_pulses BIGINT,
    perfect_days BIGINT,
    reactions_received BIGINT,
    reactions_given BIGINT,
    unique_moods BIGINT,
    morning_pulses BIGINT,
    night_pulses BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH pulse_stats AS (
        SELECT
            COUNT(*) as total,
            COUNT(DISTINCT mood) as unique_moods,
            COUNT(*) FILTER (WHERE window_id LIKE '%|morning|%') as morning,
            COUNT(*) FILTER (WHERE window_id LIKE '%|night|%') as night
        FROM pulses
        WHERE user_id = p_user_id
    ),
    perfect_days_calc AS (
        SELECT COUNT(*) as cnt
        FROM (
            SELECT
                SPLIT_PART(window_id, '|', 1) as pulse_date,
                COUNT(DISTINCT SPLIT_PART(window_id, '|', 2)) as windows
            FROM pulses
            WHERE user_id = p_user_id
            GROUP BY SPLIT_PART(window_id, '|', 1)
            HAVING COUNT(DISTINCT SPLIT_PART(window_id, '|', 2)) >= 3
        ) sub
    ),
    reactions_stats AS (
        SELECT
            COALESCE((
                SELECT COUNT(*)
                FROM reactions r
                JOIN pulses p ON r.pulse_id = p.id
                WHERE p.user_id = p_user_id
            ), 0) as received,
            COALESCE((
                SELECT COUNT(*)
                FROM reactions
                WHERE from_user_id = p_user_id
            ), 0) as given
    )
    SELECT
        COALESCE(u.streak_days, 0)::INTEGER,
        COALESCE(ps.total, 0),
        COALESCE(pd.cnt, 0),
        COALESCE(rs.received, 0),
        COALESCE(rs.given, 0),
        COALESCE(ps.unique_moods, 0),
        COALESCE(ps.morning, 0),
        COALESCE(ps.night, 0)
    FROM users u
    CROSS JOIN pulse_stats ps
    CROSS JOIN perfect_days_calc pd
    CROSS JOIN reactions_stats rs
    WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. ADD MISSING INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_pulses_user_window ON pulses(user_id, window_id);
CREATE INDEX IF NOT EXISTS idx_pulses_window_mood ON pulses(window_id, mood);
CREATE INDEX IF NOT EXISTS idx_reactions_pulse ON reactions(pulse_id);
CREATE INDEX IF NOT EXISTS idx_reactions_from_user ON reactions(from_user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_users_streak ON users(streak_days DESC);
CREATE INDEX IF NOT EXISTS idx_users_last_pulse ON users(last_pulse_date);

-- ============================================================================
-- 7. ADD RATE LIMITING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier TEXT NOT NULL, -- user_id or IP
    endpoint TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(identifier, endpoint, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON rate_limits(identifier, endpoint, window_start);

-- Function to check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_identifier TEXT,
    p_endpoint TEXT,
    p_max_requests INTEGER,
    p_window_seconds INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    v_window_start TIMESTAMPTZ;
    v_count INTEGER;
BEGIN
    v_window_start := date_trunc('second', NOW() - (p_window_seconds || ' seconds')::interval);

    SELECT COALESCE(SUM(request_count), 0) INTO v_count
    FROM rate_limits
    WHERE identifier = p_identifier
      AND endpoint = p_endpoint
      AND window_start >= v_window_start;

    IF v_count >= p_max_requests THEN
        RETURN FALSE; -- Rate limited
    END IF;

    -- Record this request
    INSERT INTO rate_limits (identifier, endpoint, window_start)
    VALUES (p_identifier, p_endpoint, date_trunc('minute', NOW()))
    ON CONFLICT (identifier, endpoint, window_start)
    DO UPDATE SET request_count = rate_limits.request_count + 1;

    RETURN TRUE; -- Allowed
END;
$$ LANGUAGE plpgsql;

-- Cleanup old rate limit records (run periodically via cron)
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void AS $$
BEGIN
    DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. FIX UNIQUE CONSTRAINT FOR AGGREGATES (needed for UPSERT)
-- ============================================================================

-- Make sure unique constraints exist for upserts
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'aggregates_global_window_window_id_key'
    ) THEN
        ALTER TABLE aggregates_global_window
        ADD CONSTRAINT aggregates_global_window_window_id_key UNIQUE (window_id);
    END IF;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'aggregates_country_window_unique'
    ) THEN
        ALTER TABLE aggregates_country_window
        ADD CONSTRAINT aggregates_country_window_unique UNIQUE (window_id, country_code);
    END IF;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'aggregates_city_window_unique'
    ) THEN
        ALTER TABLE aggregates_city_window
        ADD CONSTRAINT aggregates_city_window_unique UNIQUE (window_id, city_id);
    END IF;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

-- ============================================================================
-- DONE
-- ============================================================================
COMMENT ON FUNCTION submit_pulse_atomic IS 'Atomic pulse submission with shield usage and aggregate updates. Prevents race conditions.';
COMMENT ON FUNCTION get_user_badge_stats IS 'Efficient single-query badge stats calculation. Fixes N+1 query issue.';
COMMENT ON FUNCTION check_rate_limit IS 'Simple rate limiting function. Returns FALSE if rate limited.';
