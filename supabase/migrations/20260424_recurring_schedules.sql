-- Recurring transaction schedules.
--
-- Backs the "Recurring" toggle on Add / Edit Transaction. When the user
-- marks a transaction recurring, we silently insert a RecurringSchedule
-- row pointing back at the template transaction. The recurring scheduler
-- (src/infrastructure/recurring/recurring-scheduler-core.ts) scans
-- `is_active = true` rows whose `next_due_date <= now()` and posts a fresh
-- transaction copied from the template, then advances `next_due_date`.
--
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS public.recurring_schedules (
  id                       text PRIMARY KEY,
  user_id                  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_transaction_id  text NOT NULL,
  wallet_id                text NOT NULL,
  category_id              text NOT NULL,
  type                     text NOT NULL CHECK (type IN ('income', 'expense')),
  amount                   bigint NOT NULL CHECK (amount > 0),
  currency                 text NOT NULL CHECK (char_length(currency) = 3),
  merchant                 text NOT NULL DEFAULT '',
  description              text NOT NULL DEFAULT '',
  tags                     text[] NOT NULL DEFAULT '{}'::text[],
  cadence                  text NOT NULL CHECK (cadence IN ('daily','weekly','biweekly','monthly','quarterly','yearly')),
  next_due_date            bigint NOT NULL,
  is_active                boolean NOT NULL DEFAULT true,
  created_at               bigint NOT NULL,
  updated_at               bigint NOT NULL
);

-- One active schedule per template transaction. Filtered unique index so
-- soft-deactivated rows don't block re-toggling on the same template.
CREATE UNIQUE INDEX IF NOT EXISTS recurring_schedules_user_template_active_idx
  ON public.recurring_schedules (user_id, template_transaction_id)
  WHERE is_active;

-- Hot path used by the scheduler's due-scan: per-user, only active rows,
-- ordered by next_due_date.
CREATE INDEX IF NOT EXISTS recurring_schedules_user_active_due_idx
  ON public.recurring_schedules (user_id, is_active, next_due_date);

-- ----------------------------------------------------------------------
-- Row-level security
-- ----------------------------------------------------------------------
ALTER TABLE public.recurring_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recurring_schedules_select ON public.recurring_schedules;
CREATE POLICY recurring_schedules_select
  ON public.recurring_schedules
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS recurring_schedules_insert ON public.recurring_schedules;
CREATE POLICY recurring_schedules_insert
  ON public.recurring_schedules
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS recurring_schedules_update ON public.recurring_schedules;
CREATE POLICY recurring_schedules_update
  ON public.recurring_schedules
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS recurring_schedules_delete ON public.recurring_schedules;
CREATE POLICY recurring_schedules_delete
  ON public.recurring_schedules
  FOR DELETE
  USING (auth.uid() = user_id);
