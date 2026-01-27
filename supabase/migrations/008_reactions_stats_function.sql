-- Migration 008: Add efficient reactions stats function
-- This prevents N+1 queries and DoS via query bomb

-- Function to get reactions received stats for a user
CREATE OR REPLACE FUNCTION get_user_reactions_received(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_total_reactions INTEGER;
  v_unique_reactors INTEGER;
  v_reactions_by_type JSONB;
BEGIN
  -- Get total count and unique reactors in a single query
  SELECT
    COUNT(*)::INTEGER,
    COUNT(DISTINCT r.user_id)::INTEGER
  INTO v_total_reactions, v_unique_reactors
  FROM reactions r
  INNER JOIN pulses p ON r.pulse_id = p.id
  WHERE p.user_id = p_user_id;

  -- Get reactions by type (top 10)
  SELECT COALESCE(jsonb_object_agg(emoji, cnt), '{}'::JSONB)
  INTO v_reactions_by_type
  FROM (
    SELECT r.emoji, COUNT(*)::INTEGER as cnt
    FROM reactions r
    INNER JOIN pulses p ON r.pulse_id = p.id
    WHERE p.user_id = p_user_id
    GROUP BY r.emoji
    ORDER BY cnt DESC
    LIMIT 10
  ) sub;

  -- Build result
  v_result := jsonb_build_object(
    'totalReactions', v_total_reactions,
    'uniqueReactors', v_unique_reactors,
    'reactionsByType', v_reactions_by_type
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_reactions_received(UUID) TO authenticated, anon, service_role;

-- Add index for faster reaction queries on pulse_id
CREATE INDEX IF NOT EXISTS idx_reactions_pulse_id ON reactions(pulse_id);

-- Add composite index for the JOIN pattern
CREATE INDEX IF NOT EXISTS idx_pulses_user_id_id ON pulses(user_id, id);

COMMENT ON FUNCTION get_user_reactions_received IS
'Efficiently aggregates reaction stats for a user. Returns total reactions, unique reactors, and top 10 emoji counts.';
