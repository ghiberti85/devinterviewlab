-- Persists brute-force attempt counts across serverless cold starts
CREATE TABLE IF NOT EXISTS brute_force_log (
  ip TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  first_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  blocked_at TIMESTAMPTZ
);

-- Not user-owned; only accessible via SECURITY DEFINER functions below
ALTER TABLE brute_force_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON brute_force_log FROM authenticated, anon;

-- Returns (allowed, retry_after_sec) for the given IP
CREATE OR REPLACE FUNCTION bf_check(p_ip TEXT)
RETURNS TABLE(allowed BOOLEAN, retry_after_sec INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec brute_force_log%ROWTYPE;
  now_ts TIMESTAMPTZ := NOW();
  block_ms CONSTANT BIGINT := 15 * 60 * 1000;
  window_ms CONSTANT BIGINT := 15 * 60 * 1000;
  max_attempts CONSTANT INTEGER := 10;
  elapsed_ms BIGINT;
BEGIN
  SELECT * INTO rec FROM brute_force_log WHERE ip = p_ip;

  IF NOT FOUND THEN
    RETURN QUERY SELECT TRUE, NULL::INTEGER;
    RETURN;
  END IF;

  IF rec.blocked_at IS NOT NULL THEN
    elapsed_ms := EXTRACT(EPOCH FROM (now_ts - rec.blocked_at))::BIGINT * 1000;
    IF elapsed_ms < block_ms THEN
      RETURN QUERY SELECT FALSE, CEIL((block_ms - elapsed_ms) / 1000.0)::INTEGER;
      RETURN;
    END IF;
    DELETE FROM brute_force_log WHERE ip = p_ip;
    RETURN QUERY SELECT TRUE, NULL::INTEGER;
    RETURN;
  END IF;

  IF EXTRACT(EPOCH FROM (now_ts - rec.first_at))::BIGINT * 1000 > window_ms THEN
    DELETE FROM brute_force_log WHERE ip = p_ip;
    RETURN QUERY SELECT TRUE, NULL::INTEGER;
    RETURN;
  END IF;

  IF rec.count >= max_attempts THEN
    UPDATE brute_force_log SET blocked_at = now_ts WHERE ip = p_ip;
    RETURN QUERY SELECT FALSE, CEIL(block_ms / 1000.0)::INTEGER;
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, NULL::INTEGER;
END;
$$;

-- Records a failed attempt for the given IP
CREATE OR REPLACE FUNCTION bf_record_failure(p_ip TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec brute_force_log%ROWTYPE;
  now_ts TIMESTAMPTZ := NOW();
  window_ms CONSTANT BIGINT := 15 * 60 * 1000;
  max_attempts CONSTANT INTEGER := 10;
BEGIN
  SELECT * INTO rec FROM brute_force_log WHERE ip = p_ip;

  IF NOT FOUND THEN
    INSERT INTO brute_force_log (ip, count, first_at, blocked_at)
    VALUES (p_ip, 1, now_ts, NULL);
    RETURN;
  END IF;

  IF EXTRACT(EPOCH FROM (now_ts - rec.first_at))::BIGINT * 1000 > window_ms THEN
    UPDATE brute_force_log SET count = 1, first_at = now_ts, blocked_at = NULL WHERE ip = p_ip;
    RETURN;
  END IF;

  IF rec.count + 1 >= max_attempts THEN
    UPDATE brute_force_log SET count = rec.count + 1, blocked_at = now_ts WHERE ip = p_ip;
  ELSE
    UPDATE brute_force_log SET count = rec.count + 1 WHERE ip = p_ip;
  END IF;
END;
$$;

-- Clears attempts for an IP (called on successful login)
CREATE OR REPLACE FUNCTION bf_reset(p_ip TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM brute_force_log WHERE ip = p_ip;
END;
$$;

-- Allow the anon role to call these functions (no direct table access)
GRANT EXECUTE ON FUNCTION bf_check(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION bf_record_failure(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION bf_reset(TEXT) TO anon, authenticated;

-- Auto-clean rows older than 24h (runs as a periodic Supabase cron if enabled)
CREATE INDEX IF NOT EXISTS brute_force_log_first_at_idx ON brute_force_log (first_at);
