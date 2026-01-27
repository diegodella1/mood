-- Migration: Allow emoji-based moods instead of legacy mood strings
-- The application now supports any emoji as a mood, not just the 6 legacy moods
-- We need to drop the CHECK constraint that restricts mood to specific strings

-- Drop the old CHECK constraint
ALTER TABLE pulses DROP CONSTRAINT IF EXISTS pulses_mood_check;

-- Add a new, more permissive constraint that just ensures mood is not empty
-- This allows any emoji or text while still maintaining data quality
ALTER TABLE pulses ADD CONSTRAINT pulses_mood_not_empty CHECK (char_length(mood) > 0 AND char_length(mood) <= 20);

-- Note: The application validates emojis using isValidEmoji() before insertion
-- The database constraint is now just a basic sanity check
