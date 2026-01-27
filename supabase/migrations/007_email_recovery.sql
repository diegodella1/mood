-- Migration 007: Email recovery system
-- Simple email-based account recovery without full auth

-- Add email to users (optional, for recovery only)
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;

-- Recovery codes table
CREATE TABLE IF NOT EXISTS recovery_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recovery_codes_code ON recovery_codes(code) WHERE used_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_recovery_codes_user ON recovery_codes(user_id);

-- Function to generate recovery code
CREATE OR REPLACE FUNCTION generate_recovery_code(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_code TEXT;
BEGIN
    -- Generate 6-digit code
    v_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');

    -- Invalidate any existing unused codes for this user
    UPDATE recovery_codes
    SET used_at = NOW()
    WHERE user_id = p_user_id AND used_at IS NULL;

    -- Insert new code (expires in 15 minutes)
    INSERT INTO recovery_codes (user_id, code, expires_at)
    VALUES (p_user_id, v_code, NOW() + INTERVAL '15 minutes');

    RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- Function to verify recovery code and return user_id
CREATE OR REPLACE FUNCTION verify_recovery_code(p_code TEXT)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Find valid code
    SELECT user_id INTO v_user_id
    FROM recovery_codes
    WHERE code = p_code
      AND used_at IS NULL
      AND expires_at > NOW();

    IF v_user_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Mark code as used
    UPDATE recovery_codes
    SET used_at = NOW()
    WHERE code = p_code AND used_at IS NULL;

    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

-- Cleanup old recovery codes (run via cron)
CREATE OR REPLACE FUNCTION cleanup_recovery_codes()
RETURNS void AS $$
BEGIN
    DELETE FROM recovery_codes
    WHERE expires_at < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;
