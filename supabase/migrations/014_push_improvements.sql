-- Push notification improvements: daily cap, mid-battle dedup, atomic increment

-- Column for daily notification cap tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS notifications_today integer DEFAULT 0;

-- Flag to track if mid-battle notification was already sent
ALTER TABLE city_battles ADD COLUMN IF NOT EXISTS mid_notif_sent boolean DEFAULT false;

-- RPC to atomically increment the daily notification counter
CREATE OR REPLACE FUNCTION increment_notifications_today(p_user_id uuid)
RETURNS void AS $$
  UPDATE users SET notifications_today = notifications_today + 1 WHERE id = p_user_id;
$$ LANGUAGE sql;
