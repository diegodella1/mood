-- 017: Core Loop Value + Social Improvements + Simplification
-- Adds mood notes, pulse history, personal insights, friend mood comparison

-- 1. Add note column to pulses
ALTER TABLE pulses ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE pulses ADD CONSTRAINT pulses_note_max_length CHECK (char_length(note) <= 280);

-- 2. Index for efficient history queries
CREATE INDEX IF NOT EXISTS idx_pulses_user_created ON pulses(user_id, created_at DESC);

-- 3. Function: get_pulse_history (pulses grouped by date for a month)
CREATE OR REPLACE FUNCTION get_pulse_history(
  p_user_id UUID,
  p_year INT,
  p_month INT
)
RETURNS TABLE (
  pulse_date DATE,
  pulse_id UUID,
  mood TEXT,
  note TEXT,
  window_id TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql STABLE
AS $$
  SELECT
    p.created_at::date AS pulse_date,
    p.id AS pulse_id,
    p.mood,
    p.note,
    p.window_id,
    p.created_at
  FROM pulses p
  WHERE p.user_id = p_user_id
    AND EXTRACT(YEAR FROM p.created_at) = p_year
    AND EXTRACT(MONTH FROM p.created_at) = p_month
  ORDER BY p.created_at DESC;
$$;

-- 4. Function: get_personal_insights
CREATE OR REPLACE FUNCTION get_personal_insights(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  result JSONB;
  total INT;
  most_common TEXT;
  mood_by_dow JSONB;
  week_pulses JSONB;
  current_mood_streak INT;
BEGIN
  -- Total pulses
  SELECT COUNT(*) INTO total FROM pulses WHERE user_id = p_user_id;

  -- Most common mood (all time)
  SELECT mood INTO most_common
  FROM pulses
  WHERE user_id = p_user_id
  GROUP BY mood
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  -- Mood by day of week (0=Sun, 6=Sat)
  SELECT COALESCE(jsonb_object_agg(dow, top_mood), '{}'::jsonb) INTO mood_by_dow
  FROM (
    SELECT
      EXTRACT(DOW FROM created_at)::int AS dow,
      mood AS top_mood
    FROM (
      SELECT
        created_at,
        mood,
        ROW_NUMBER() OVER (
          PARTITION BY EXTRACT(DOW FROM created_at)
          ORDER BY COUNT(*) OVER (PARTITION BY EXTRACT(DOW FROM created_at), mood) DESC
        ) AS rn
      FROM pulses
      WHERE user_id = p_user_id
    ) ranked
    WHERE rn = 1
  ) sub;

  -- Last 7 days pulses (one per day, most recent per day)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'date', pulse_date,
    'mood', mood
  ) ORDER BY pulse_date), '[]'::jsonb) INTO week_pulses
  FROM (
    SELECT DISTINCT ON (created_at::date)
      created_at::date AS pulse_date,
      mood
    FROM pulses
    WHERE user_id = p_user_id
      AND created_at >= NOW() - INTERVAL '7 days'
    ORDER BY created_at::date DESC, created_at DESC
  ) recent;

  -- Current mood streak (consecutive days with same mood)
  WITH daily_moods AS (
    SELECT DISTINCT ON (created_at::date)
      created_at::date AS d,
      mood
    FROM pulses
    WHERE user_id = p_user_id
    ORDER BY created_at::date DESC, created_at DESC
  ),
  streak AS (
    SELECT d, mood,
      ROW_NUMBER() OVER (ORDER BY d DESC) AS rn
    FROM daily_moods
  )
  SELECT COUNT(*) INTO current_mood_streak
  FROM streak
  WHERE mood = (SELECT mood FROM streak WHERE rn = 1)
    AND rn <= (
      SELECT MIN(s2.rn) - 1
      FROM streak s2
      WHERE s2.mood != (SELECT mood FROM streak WHERE rn = 1)
        AND s2.rn > 1
      UNION ALL
      SELECT MAX(rn) FROM streak
      LIMIT 1
    );

  -- If no pulses, mood streak is 0
  IF total = 0 THEN
    current_mood_streak := 0;
  END IF;

  result := jsonb_build_object(
    'total_pulses', total,
    'most_common_mood', most_common,
    'mood_by_day_of_week', mood_by_dow,
    'week_pulses', week_pulses,
    'mood_streak', current_mood_streak
  );

  RETURN result;
END;
$$;

-- 5. Function: get_friends_same_mood
CREATE OR REPLACE FUNCTION get_friends_same_mood(
  p_user_id UUID,
  p_window_id TEXT,
  p_mood TEXT
)
RETURNS TABLE (
  friend_id UUID,
  display_name TEXT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    u.id AS friend_id,
    u.display_name
  FROM follows f
  JOIN pulses p ON p.user_id = f.following_id
  JOIN users u ON u.id = f.following_id
  WHERE f.follower_id = p_user_id
    AND p.window_id = p_window_id
    AND p.mood = p_mood
  LIMIT 10;
$$;

-- 6. Function: count_friends_pulsed_today
CREATE OR REPLACE FUNCTION count_friends_pulsed_today(p_user_id UUID)
RETURNS INT
LANGUAGE sql STABLE
AS $$
  SELECT COUNT(DISTINCT p.user_id)::int
  FROM follows f
  JOIN pulses p ON p.user_id = f.following_id
  WHERE f.follower_id = p_user_id
    AND p.created_at::date = CURRENT_DATE;
$$;

-- 7. Disable window-closing nudges by default (reduce notification spam)
UPDATE nudge_rules
SET enabled = false
WHERE conditions->>'window_closing_soon' = 'true';
