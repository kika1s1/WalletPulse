-- Universal search schema.
--
-- This migration brings ranked + fuzzy full-text search to WalletPulse.
-- It is split into idempotent steps so it is safe to re-run, and so that
-- individual steps can be applied manually via the dashboard if needed.
--
-- Applied remotely via MCP on 2026-04-23. Safe to re-run.
--
-- WARNING: step 2 converts transactions.tags from a JSON-encoded TEXT
-- column to a native TEXT[] column. Older app clients that write
-- JSON.stringify(tags) into the column will fail against the new schema
-- and must be upgraded. See docs/search.md for the rollout plan.

-- ---------------------------------------------------------------------------
-- 1. Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;

-- `unaccent` is not immutable by default, which means Postgres cannot use
-- it inside a generated column expression. Wrap it in an immutable helper.
-- `f_unaccent` is the conventional name for this wrapper in the Postgres
-- community.
CREATE OR REPLACE FUNCTION public.f_unaccent(text)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT public.unaccent('public.unaccent', $1) $$;

-- ---------------------------------------------------------------------------
-- 2. Migrate transactions.tags from TEXT (JSON-encoded) to TEXT[]
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  col_type text;
BEGIN
  SELECT data_type INTO col_type
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name   = 'transactions'
     AND column_name  = 'tags';

  IF col_type IS NULL THEN
    RAISE NOTICE 'transactions.tags does not exist — skipping tag migration';
    RETURN;
  END IF;

  IF col_type = 'ARRAY' THEN
    RAISE NOTICE 'transactions.tags is already an array — skipping tag migration';
    RETURN;
  END IF;

  -- Stage a new column, backfill from the JSON text, then swap atomically.
  ALTER TABLE public.transactions
    ADD COLUMN IF NOT EXISTS tags_new text[] NOT NULL DEFAULT '{}'::text[];

  UPDATE public.transactions
     SET tags_new = COALESCE(
           (
             SELECT ARRAY(
               SELECT jsonb_array_elements_text(nullif(tags, '')::jsonb)
             )
           ),
           '{}'::text[]
         )
   WHERE tags IS NOT NULL
     AND tags <> ''
     AND tags_new = '{}'::text[];

  ALTER TABLE public.transactions DROP COLUMN tags;
  ALTER TABLE public.transactions RENAME COLUMN tags_new TO tags;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Generated search columns on transactions
-- ---------------------------------------------------------------------------
-- Single denormalised lowercase, diacritic-free text column used for fast
-- substring + trigram similarity matching. Tags are joined into the text
-- so `tag:work` operator searches still hit this index.
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS search_text text GENERATED ALWAYS AS (
    lower(public.f_unaccent(
      coalesce(merchant,      '') || ' ' ||
      coalesce(description,   '') || ' ' ||
      coalesce(notes,         '') || ' ' ||
      coalesce(location_name, '') || ' ' ||
      coalesce(template_name, '') || ' ' ||
      coalesce(currency,      '') || ' ' ||
      coalesce(array_to_string(tags, ' '), '')
    ))
  ) STORED;

-- Weighted tsvector for ranked full-text search. Field weights give
-- merchant the highest boost because that's the most meaningful signal
-- when a user types "uber".
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS search_tsv tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(merchant,      '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description,   '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(notes,         '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(location_name, '')), 'D')
  ) STORED;

-- ---------------------------------------------------------------------------
-- 4. Generated search columns on peripheral entities
-- ---------------------------------------------------------------------------
ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS search_text text GENERATED ALWAYS AS (
    lower(public.f_unaccent(
      coalesce(name, '') || ' ' || coalesce(currency, '')
    ))
  ) STORED;

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS search_text text GENERATED ALWAYS AS (
    lower(public.f_unaccent(
      coalesce(name, '') || ' ' || coalesce(icon, '')
    ))
  ) STORED;

-- Budgets don't have a native name column but we still want them searchable
-- by their linked category, period, currency. The best we can do without
-- denormalising is to stringify the ids + currency + period.
ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS search_text text GENERATED ALWAYS AS (
    lower(public.f_unaccent(
      coalesce(currency, '') || ' ' || coalesce(period, '')
    ))
  ) STORED;

-- ---------------------------------------------------------------------------
-- 5. Indexes
-- ---------------------------------------------------------------------------
-- Trigram GIN for fuzzy ILIKE + similarity() ranking.
CREATE INDEX IF NOT EXISTS transactions_search_trgm_idx
  ON public.transactions USING GIN (search_text public.gin_trgm_ops);

-- Full-text GIN for websearch_to_tsquery + ts_rank_cd.
CREATE INDEX IF NOT EXISTS transactions_search_tsv_idx
  ON public.transactions USING GIN (search_tsv);

-- Array-contains (`tags @> ARRAY[...]`).
CREATE INDEX IF NOT EXISTS transactions_tags_idx
  ON public.transactions USING GIN (tags);

-- Compound btree indexes for common filtered-listing queries.
CREATE INDEX IF NOT EXISTS transactions_user_date_idx
  ON public.transactions (user_id, transaction_date DESC);

CREATE INDEX IF NOT EXISTS transactions_user_wallet_date_idx
  ON public.transactions (user_id, wallet_id, transaction_date DESC);

CREATE INDEX IF NOT EXISTS transactions_user_cat_date_idx
  ON public.transactions (user_id, category_id, transaction_date DESC);

-- Dedup lookup used by the notification parser pipeline.
CREATE UNIQUE INDEX IF NOT EXISTS transactions_user_srchash_idx
  ON public.transactions (user_id, source_hash)
  WHERE source_hash <> '';

-- Peripheral entity trigram indexes — low-cardinality so a lighter touch
-- is fine, but keeps the query shape uniform with the RPC.
CREATE INDEX IF NOT EXISTS wallets_search_trgm_idx
  ON public.wallets USING GIN (search_text public.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS categories_search_trgm_idx
  ON public.categories USING GIN (search_text public.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS budgets_search_trgm_idx
  ON public.budgets USING GIN (search_text public.gin_trgm_ops);
