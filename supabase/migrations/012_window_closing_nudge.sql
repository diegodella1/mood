-- Migration 012: Add window closing soon nudge rule
-- This adds a nudge rule that alerts users 30 minutes before a window closes
-- if they haven't submitted their pulse yet.

-- Add the window closing soon nudge rule
INSERT INTO nudge_rules (name, description, priority, conditions, inline_template, max_per_window)
VALUES
(
    'Window Closing Soon',
    'Remind users 30 minutes before the window closes if they have not pulsed',
    30, -- Higher priority than general window open reminder
    '{"window_closing_soon": true, "minutes_before_close": 30}',
    '{"title": "⏰ Window closing soon!", "body": "Only 30 minutes left to share your mood. Don''t miss it!"}',
    1
)
ON CONFLICT DO NOTHING;

-- Update the "Streak at Risk" rule to use window_closing_soon condition for better accuracy
UPDATE nudge_rules
SET conditions = '{"window_closing_soon": true, "minutes_before_close": 30, "has_streak": true, "streak_at_risk": true}'
WHERE name = 'Streak at Risk' AND conditions::text LIKE '%is_last_window_of_day%';
