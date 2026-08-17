-- Migration 019: Harden RLS, recovery codes, and revoke dangerous anon grants
-- App identity is cookie-session + service role. Anon key must not mutate data.

-- ============================================
-- 1. EMAIL VERIFICATION COLUMNS
-- ============================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verify_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verify_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verify_attempts INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_users_pending_email ON users(pending_email) WHERE pending_email IS NOT NULL;

-- ============================================
-- 2. RECOVERY CODES RLS
-- ============================================

ALTER TABLE recovery_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages recovery codes" ON recovery_codes;
CREATE POLICY "Service role manages recovery codes" ON recovery_codes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE recovery_codes FROM anon, authenticated;
GRANT ALL ON TABLE recovery_codes TO service_role;

-- ============================================
-- 3. STRICT USER / PULSE / REACTION POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can insert own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can read own data" ON users;

CREATE POLICY "Public read limited users" ON users
  FOR SELECT USING (true);

CREATE POLICY "Service role insert users" ON users
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service role update users" ON users
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE users FROM anon, authenticated;
GRANT SELECT (id, display_name, aura, streak_days, city_id, country_code, created_at) ON users TO anon, authenticated;
GRANT ALL ON TABLE users TO service_role;

DROP POLICY IF EXISTS "Users can insert own pulses" ON pulses;
CREATE POLICY "Service role insert pulses" ON pulses
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Users can insert own reactions" ON reactions;
CREATE POLICY "Service role insert reactions" ON reactions
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own participations" ON event_participations;
DROP POLICY IF EXISTS "Users can join events" ON event_participations;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'event_participations') THEN
    EXECUTE 'CREATE POLICY "Service role manages participations" ON event_participations FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DROP POLICY IF EXISTS "Users can manage own alert status" ON user_alerts;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_alerts') THEN
    EXECUTE 'CREATE POLICY "Service role manages user alerts" ON user_alerts FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- ============================================
-- 4. RATE LIMIT TABLE
-- ============================================

REVOKE INSERT, SELECT, DELETE ON TABLE rate_limit_log FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE rate_limit_log TO service_role;
GRANT USAGE, SELECT ON SEQUENCE rate_limit_log_id_seq TO service_role;

-- ============================================
-- 5. REVOKE DANGEROUS RPC GRANTS FROM ANON
-- ============================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS fn
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'follow_user',
        'unfollow_user',
        'roll_lucky_drop',
        'claim_lucky_drop',
        'update_active_session',
        'check_secret_achievements',
        'get_friends_feed',
        'process_referral',
        'track_share',
        'increment_mood_match',
        'record_battle_participation',
        'check_action_rate_limit',
        'get_user_reactions_received',
        'get_user_badge_stats',
        'generate_recovery_code',
        'verify_recovery_code'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.fn);
  END LOOP;
END $$;
