-- Migration 018: Backfill pulses with NULL city_id with random cities
-- This populates the map by assigning random cities to existing pulses
-- NOTE: Uses CROSS JOIN + ROW_NUMBER to get a different random city per row

-- Step 1: Create a temporary table with city IDs
CREATE TEMPORARY TABLE _cities (idx SERIAL, city_id TEXT NOT NULL);
INSERT INTO _cities (city_id) VALUES
  ('buenos-aires'), ('cordoba'), ('rosario'), ('mendoza'), ('la-plata'), ('tucuman'), ('mar-del-plata'),
  ('new-york'), ('los-angeles'), ('chicago'), ('houston'), ('miami'), ('san-francisco'), ('seattle'),
  ('sao-paulo'), ('rio-de-janeiro'), ('brasilia'), ('salvador'), ('fortaleza'),
  ('mexico-city'), ('guadalajara'), ('monterrey'), ('cancun'),
  ('madrid'), ('barcelona'), ('valencia'), ('sevilla'),
  ('london'), ('manchester'), ('birmingham'), ('edinburgh'),
  ('berlin'), ('munich'), ('hamburg'), ('frankfurt'),
  ('paris'), ('lyon'), ('marseille'), ('toulouse'),
  ('santiago'), ('valparaiso'), ('concepcion'),
  ('bogota'), ('medellin'), ('cali'), ('barranquilla');

-- Step 2: Assign a different random city to each pulse
UPDATE pulses p
SET city_id = c.city_id
FROM (
  SELECT id, city_id FROM (
    SELECT
      pulses.id,
      _cities.city_id,
      ROW_NUMBER() OVER (PARTITION BY pulses.id ORDER BY random()) AS rn
    FROM pulses
    CROSS JOIN _cities
  ) ranked
  WHERE rn = 1
) c
WHERE p.id = c.id;

-- Step 3: Assign a different random city to each user
UPDATE users u
SET city_id = c.city_id
FROM (
  SELECT id, city_id FROM (
    SELECT
      users.id,
      _cities.city_id,
      ROW_NUMBER() OVER (PARTITION BY users.id ORDER BY random()) AS rn
    FROM users
    CROSS JOIN _cities
  ) ranked
  WHERE rn = 1
) c
WHERE u.id = c.id;

DROP TABLE _cities;

-- Step 4: Rebuild aggregates_city_window from scratch
TRUNCATE aggregates_city_window;

INSERT INTO aggregates_city_window (window_id, city_id, mood_counts, total_count, updated_at)
SELECT
  p.window_id,
  p.city_id,
  jsonb_object_agg(p.mood, p.cnt),
  SUM(p.cnt)::integer,
  NOW()
FROM (
  SELECT window_id, city_id, mood, COUNT(*)::integer AS cnt
  FROM pulses
  WHERE city_id IS NOT NULL
  GROUP BY window_id, city_id, mood
) p
GROUP BY p.window_id, p.city_id;
