-- search_everything: relax merchant filter from exact match to substring
-- match. The previous behaviour required typing the full normalized
-- merchant string, which made the chip useless when the merchant value
-- was something like "Uber Eats Inc." vs the user-entered "Uber".
--
-- Idempotent — safe to re-run. This file is the third revision of the
-- same RPC; it builds on top of 20260425_search_filter_flags.sql.
--
-- Each SELECT in the UNION ALL chain is wrapped in parens because the
-- plpgsql parser otherwise refuses LIMIT followed by UNION inside
-- RETURN QUERY (the previous migrations were applied through the
-- dashboard SQL editor which tolerates the unparenthesised form).

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

  f_wallet_id        uuid    := nullif(p_filters->>'walletId',   '')::uuid;
  f_category_id      uuid    := nullif(p_filters->>'categoryId', '')::uuid;
  f_type             text    := nullif(p_filters->>'type',       '');
  f_source           text    := nullif(p_filters->>'source',     '');
  f_currency         text    := nullif(p_filters->>'currency',   '');
  f_merchant         text    := nullif(p_filters->>'merchant',   '');
  f_merchant_norm    text    := CASE
                                  WHEN f_merchant IS NULL THEN NULL
                                  ELSE '%' || lower(public.f_unaccent(f_merchant)) || '%'
                                END;
  f_start_ms         bigint  := nullif(p_filters->>'startMs',    '')::bigint;
  f_end_ms           bigint  := nullif(p_filters->>'endMs',      '')::bigint;
  f_min_amount       bigint  := nullif(p_filters->>'minAmount',  '')::bigint;
  f_max_amount       bigint  := nullif(p_filters->>'maxAmount',  '')::bigint;
  f_has_receipt      boolean := coalesce((p_filters->>'hasReceipt')::boolean, false);
  f_has_notes        boolean := coalesce((p_filters->>'hasNotes')::boolean, false);
  f_has_location     boolean := coalesce((p_filters->>'hasLocation')::boolean, false);
  f_has_tags         boolean := coalesce((p_filters->>'hasTags')::boolean, false);
  f_is_recurring     boolean := coalesce((p_filters->>'isRecurring')::boolean, false);
  f_is_template      boolean := coalesce((p_filters->>'isTemplate')::boolean, false);
  f_is_uncategorized boolean := coalesce((p_filters->>'isUncategorized')::boolean, false);
  f_tags             text[]  := CASE
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
    v_tsq := websearch_to_tsquery('simple', p_query);
  END IF;

  RETURN QUERY
  (
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
      AND (f_wallet_id        IS NULL OR t.wallet_id        = f_wallet_id)
      AND (f_category_id      IS NULL OR t.category_id      = f_category_id)
      AND (f_type             IS NULL OR t.type             = f_type)
      AND (f_source           IS NULL OR t.source           = f_source)
      AND (f_currency         IS NULL OR t.currency         = f_currency)
      AND (
        f_merchant_norm IS NULL
        OR lower(public.f_unaccent(coalesce(t.merchant, ''))) LIKE f_merchant_norm
      )
      AND (f_start_ms         IS NULL OR t.transaction_date >= f_start_ms)
      AND (f_end_ms           IS NULL OR t.transaction_date <= f_end_ms)
      AND (f_min_amount       IS NULL OR t.amount           >= f_min_amount)
      AND (f_max_amount       IS NULL OR t.amount           <= f_max_amount)
      AND (f_tags             IS NULL OR t.tags             @> f_tags)
      AND (NOT f_has_receipt      OR coalesce(t.receipt_uri, '') <> '')
      AND (NOT f_has_notes        OR coalesce(t.notes, '') <> '')
      AND (NOT f_has_location     OR t.location_name IS NOT NULL OR t.location_lat IS NOT NULL OR t.location_lng IS NOT NULL)
      AND (NOT f_has_tags         OR array_length(t.tags, 1) > 0)
      AND (NOT f_is_recurring     OR t.is_recurring = true)
      AND (NOT f_is_template      OR t.is_template = true)
      AND (NOT f_is_uncategorized OR t.category_id IS NULL)
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
      CASE WHEN v_has_query THEN 0 ELSE 1 END,
      rank DESC,
      t.transaction_date DESC,
      t.id DESC
    LIMIT v_limit
  )
  UNION ALL
  (
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
  )
  UNION ALL
  (
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
  )
  UNION ALL
  (
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
    LIMIT 20
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_everything(text, jsonb, bigint, uuid, int)
  TO authenticated;
