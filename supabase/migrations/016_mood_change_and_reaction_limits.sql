-- Migration 016: Mood change support + window-level reaction limit
-- Allows users to change their mood once per window
-- Limits reactions to 1 per window per user

-- Track whether a pulse mood was changed
ALTER TABLE pulses ADD COLUMN IF NOT EXISTS mood_changed BOOLEAN DEFAULT FALSE;
ALTER TABLE pulses ADD COLUMN IF NOT EXISTS original_mood TEXT;

-- Function to atomically change a pulse mood and update aggregates
CREATE OR REPLACE FUNCTION change_pulse_mood(
    p_user_id UUID,
    p_window_id TEXT,
    p_new_mood TEXT
) RETURNS TABLE (
    pulse_id UUID,
    old_mood TEXT,
    new_mood TEXT
) AS $$
DECLARE
    v_pulse RECORD;
BEGIN
    -- Lock the pulse row
    SELECT * INTO v_pulse
    FROM pulses p
    WHERE p.user_id = p_user_id AND p.window_id = p_window_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pulse not found';
    END IF;

    IF v_pulse.mood_changed THEN
        RAISE EXCEPTION 'Mood already changed';
    END IF;

    IF v_pulse.mood = p_new_mood THEN
        RAISE EXCEPTION 'Same mood selected';
    END IF;

    -- Update pulse: save original mood, set new mood, mark as changed
    UPDATE pulses
    SET mood = p_new_mood,
        original_mood = v_pulse.mood,
        mood_changed = TRUE,
        updated_at = NOW()
    WHERE id = v_pulse.id;

    -- Update global aggregates: decrement old, increment new (total stays same)
    UPDATE aggregates_global_window
    SET mood_counts = (
            COALESCE(mood_counts, '{}'::jsonb) ||
            jsonb_build_object(
                v_pulse.mood,
                GREATEST(COALESCE((mood_counts->>v_pulse.mood)::integer, 1) - 1, 0)
            )
        ) || jsonb_build_object(
            p_new_mood,
            COALESCE((mood_counts->>p_new_mood)::integer, 0) + 1
        ),
        updated_at = NOW()
    WHERE window_id = p_window_id;

    -- Update country aggregates
    IF v_pulse.country_code IS NOT NULL THEN
        UPDATE aggregates_country_window
        SET mood_counts = (
                COALESCE(mood_counts, '{}'::jsonb) ||
                jsonb_build_object(
                    v_pulse.mood,
                    GREATEST(COALESCE((mood_counts->>v_pulse.mood)::integer, 1) - 1, 0)
                )
            ) || jsonb_build_object(
                p_new_mood,
                COALESCE((mood_counts->>p_new_mood)::integer, 0) + 1
            ),
            updated_at = NOW()
        WHERE window_id = p_window_id AND country_code = v_pulse.country_code;
    END IF;

    -- Update city aggregates
    IF v_pulse.city_id IS NOT NULL THEN
        UPDATE aggregates_city_window
        SET mood_counts = (
                COALESCE(mood_counts, '{}'::jsonb) ||
                jsonb_build_object(
                    v_pulse.mood,
                    GREATEST(COALESCE((mood_counts->>v_pulse.mood)::integer, 1) - 1, 0)
                )
            ) || jsonb_build_object(
                p_new_mood,
                COALESCE((mood_counts->>p_new_mood)::integer, 0) + 1
            ),
            updated_at = NOW()
        WHERE window_id = p_window_id AND city_id = v_pulse.city_id;
    END IF;

    RETURN QUERY SELECT v_pulse.id, v_pulse.mood, p_new_mood;
END;
$$ LANGUAGE plpgsql;
