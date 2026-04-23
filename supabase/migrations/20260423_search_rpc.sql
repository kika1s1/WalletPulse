-- search_everything RPC — a single ranked query across transactions, wallets,
-- categories, and budgets. Called from the client via supabase.rpc().
--
-- Applied remotely via MCP on 2026-04-23. Safe to re-run.
--
-- Design notes:
--   * `security invoker` — the function runs as the calling user so RLS
--     policies on each table apply automatically. We still assert
--     `user_id = auth.uid()` defensively inside each subquery because RLS
--     can be bypassed by roles with `bypassrls` set.
--   * Transaction ranking = ts_rank_cd(search_tsv, websearch_to_tsquery)
--     plus similarity(search_text, query) as a tiebreaker / fuzzy fallback.
--   * Peripheral entity ranking = similarity(search_text, query).
--   * Keyset pagination is applied only to transactions (the unbounded set).
--     Peripheral entities are always fully included up to `p_limit` each.
--   * `p_filters` is a JSONB blob so callers can add new filters without
--     changing the RPC signature. See docs/search.md for the schema.

CREATE OR REPLACE FUNCTION public.search_everything(
  p_query      text,
  p_filters    jsonb  DEFAULT '{}'::jsonb,
  p_after_date bigint DEFAULT NULL,
  p_after_id   uuid   DEFAULT NULL,
  p_limit      int    DEFAULT 50
)
RETURNS TABLE (
  entity  text,
  id      uuid,
  rank    real,
  payload jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
  v_uid        uuid    := auth.uid();
  v_norm       text    := lower(public.f_unaccent(coalesce(p_query, '')));
  v_has_query  boolean := length(trim(v_norm)) > 0;
  v_tsq        tsquery;
  v_limit      int     := greatest(1, least(coalesce(p_limit, 50), 200));

  -- Filter extraction. Using -> / ->> so missing keys become NULL and
  -- the corresponding predicate is dropped by the `OR x IS NULL` guard.
  f_wallet_id    uuid    := nullif(p_filters->>'walletId',   '')::uuid;
  f_category_id  uuid    := nullif(p_filters->>'categoryId', '')::uuid;
  f_type         text    := nullif(p_filters->>'type',       '');
  f_source       text    := nullif(p_filters->>'source',     '');
  f_currency     text    := nullif(p_filters->>'currency',   '');
  f_merchant     text    := nullif(p_filters->>'merchant',   '');
  f_start_ms     bigint  := nullif(p_filters->>'startMs',    '')::bigint;
  f_end_ms       bigint  := nullif(p_filters->>'endMs',      '')::bigint;
  f_min_amount   bigint  := nullif(p_filters->>'minAmount',  '')::bigint;
  f_max_amount   bigint  := nullif(p_filters->>'maxAmount',  '')::bigint;
  f_tags         text[]  := CASE
                              WHEN p_filters ? 'tags'
                                AND jsonb_typeof(p_filters->'tags') = 'array'
                              THEN ARRAY(
                                SELECT jsonb_array_elements_text(p_filters->'tags')
                              )
                              ELSE NULL
                            END;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_has_query THEN
    -- websearch_to_tsquery accepts user-friendly syntax (quoted phrases,
    -- `-term` negation, implicit AND). We pass the raw (non-unaccented)
    -- query so quoted phrases survive intact.
    v_tsq := websearch_to_tsquery('simple', p_query);
  END IF;

  RETURN QUERY
  -- ---------------------------------------------------------------
  -- Transactions
  -- ---------------------------------------------------------------
  SELECT
    'transaction'::text AS entity,
    t.id,
    (
      CASE WHEN v_has_query AND v_tsq IS NOT NULL
           THEN coalesce(ts_rank_cd(t.search_tsv, v_tsq), 0)
           ELSE 0
      END
      +
      CASE WHEN v_has_query
           THEN coalesce(public.similarity(t.search_text, v_norm), 0) * 0.5
           ELSE 0
      END
    )::real AS rank,
    to_jsonb(t.*) AS payload
  FROM public.transactions t
  WHERE t.user_id = v_uid
    AND (f_wallet_id    IS NULL OR t.wallet_id    = f_wallet_id)
    AND (f_category_id  IS NULL OR t.category_id  = f_category_id)
    AND (f_type         IS NULL OR t.type         = f_type)
    AND (f_source       IS NULL OR t.source       = f_source)
    AND (f_currency     IS NULL OR t.currency     = f_currency)
    AND (f_merchant     IS NULL OR t.merchant     = f_merchant)
    AND (f_start_ms     IS NULL OR t.transaction_date >= f_start_ms)
    AND (f_end_ms       IS NULL OR t.transaction_date <= f_end_ms)
    AND (f_min_amount   IS NULL OR t.amount       >= f_min_amount)
    AND (f_max_amount   IS NULL OR t.amount       <= f_max_amount)
    AND (f_tags         IS NULL OR t.tags        @> f_tags)
    AND (
      NOT v_has_query
      OR (v_tsq IS NOT NULL AND t.search_tsv @@ v_tsq)
      OR t.search_text ILIKE '%' || v_norm || '%'
      OR public.similarity(t.search_text, v_norm) > 0.2
    )
    AND (
      p_after_date IS NULL
      OR t.transaction_date < p_after_date
      OR (t.transaction_date = p_after_date AND t.id < p_after_id)
    )
  ORDER BY
    CASE WHEN v_has_query THEN 0 ELSE 1 END,                   -- relevance first when querying
    rank DESC,
    t.transaction_date DESC,
    t.id DESC
  LIMIT v_limit

  UNION ALL

  -- ---------------------------------------------------------------
  -- Wallets
  -- ---------------------------------------------------------------
  SELECT
    'wallet'::text,
    w.id,
    CASE WHEN v_has_query
         THEN coalesce(public.similarity(w.search_text, v_norm), 0)::real
         ELSE 0::real
    END AS rank,
    to_jsonb(w.*)
  FROM public.wallets w
  WHERE w.user_id = v_uid
    AND v_has_query
    AND (
      w.search_text ILIKE '%' || v_norm || '%'
      OR public.similarity(w.search_text, v_norm) > 0.2
    )
  ORDER BY rank DESC
  LIMIT 20

  UNION ALL

  -- ---------------------------------------------------------------
  -- Categories
  -- ---------------------------------------------------------------
  SELECT
    'category'::text,
    c.id,
    CASE WHEN v_has_query
         THEN coalesce(public.similarity(c.search_text, v_norm), 0)::real
         ELSE 0::real
    END AS rank,
    to_jsonb(c.*)
  FROM public.categories c
  WHERE c.user_id = v_uid
    AND v_has_query
    AND (
      c.search_text ILIKE '%' || v_norm || '%'
      OR public.similarity(c.search_text, v_norm) > 0.2
    )
  ORDER BY rank DESC
  LIMIT 20

  UNION ALL

  -- ---------------------------------------------------------------
  -- Budgets
  -- ---------------------------------------------------------------
  SELECT
    'budget'::text,
    b.id,
    CASE WHEN v_has_query
         THEN coalesce(public.similarity(b.search_text, v_norm), 0)::real
         ELSE 0::real
    END AS rank,
    to_jsonb(b.*)
  FROM public.budgets b
  WHERE b.user_id = v_uid
    AND v_has_query
    AND (
      b.search_text ILIKE '%' || v_norm || '%'
      OR public.similarity(b.search_text, v_norm) > 0.2
    )
  ORDER BY rank DESC
  LIMIT 20;
END;
$$;

-- Expose the RPC to authenticated users. RLS on each underlying table
-- still applies because `security invoker` is the default.
GRANT EXECUTE ON FUNCTION public.search_everything(text, jsonb, bigint, uuid, int)
  TO authenticated;
