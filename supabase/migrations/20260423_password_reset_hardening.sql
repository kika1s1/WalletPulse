-- Harden password_reset_tokens for attempt limiting and rate-limit lookups.
-- Applied remotely via MCP on 2026-04-23. Safe to re-run.

ALTER TABLE public.password_reset_tokens
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;

-- Fast lookup of recent tokens for a given user (rate limiting in send-reset-email).
CREATE INDEX IF NOT EXISTS idx_reset_tokens_user_created_at
  ON public.password_reset_tokens (user_id, created_at DESC);

-- Clear any stale unused tokens so users aren't blocked by historical bad state.
UPDATE public.password_reset_tokens
   SET used = true
 WHERE used = false
   AND expires_at < now();
