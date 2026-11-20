-- Close the Supabase security-linter warnings without dropping tables, functions, policies, or rows.
-- Search paths are pinned, anonymous execute is removed from definer functions,
-- and the blanket "allow everything" policies stop granting access. The policies stay in place.

-- ---------------------------------------------------------------------------
-- Pin search_path on every public function that does not already set one.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND (
        p.proconfig IS NULL
        OR NOT EXISTS (
          SELECT 1
          FROM unnest(p.proconfig) AS cfg
          WHERE cfg LIKE 'search_path=%'
        )
      )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = public, extensions',
      fn.schema_name,
      fn.function_name,
      fn.args
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Anonymous users cannot call security-definer functions.
-- Signed-in users keep the functions the app and table triggers use.
-- service_role keeps the functions used by scheduled jobs.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  fn record;
  is_trigger boolean;
  keep_for_signed_in boolean;
  signed_in_functions text[] := ARRAY[
    'accept_trade',
    'add_league_coins',
    'auto_start_due_marketplaces',
    'buy_avatar',
    'cancel_trade',
    'claim_league_lifecycle_emails',
    'claim_marketplace_turn_emails',
    'create_league_data_for_user',
    'create_trade',
    'delete_league_clean',
    'equip_avatar',
    'get_current_marketplace_turn',
    'get_league_wins_leaderboard',
    'get_lineup_player_breakdown',
    'get_marketplace_turn_email_extras',
    'get_marketplace_turn_history',
    'get_player_weekly_performance',
    'get_recent_winners',
    'get_total_points_leaderboard',
    'get_trade_notifications',
    'get_user_trades',
    'get_weekly_top_performers',
    'initialize_league_coin_balance',
    'is_five_minute_draft_league',
    'join_league_atomic',
    'list_joinable_public_leagues',
    'lookup_league_by_join_code',
    'mark_notification_seen',
    'marketplace_turn_timeout_hours',
    'marketplace_turn_timeout_interval',
    'marketplace_turn_timeout_label',
    'process_league_payouts',
    'skip_expired_marketplace_turns',
    'touch_last_active',
    'user_is_league_participant',
    'withdraw_from_marketplace_draft'
  ];
BEGIN
  FOR fn IN
    SELECT
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS args,
      p.oid
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.prosecdef
  LOOP
    SELECT EXISTS (
      SELECT 1
      FROM pg_trigger AS trg
      WHERE trg.tgfoid = fn.oid
        AND NOT trg.tgisinternal
    ) INTO is_trigger;

    keep_for_signed_in := is_trigger OR fn.function_name = ANY (signed_in_functions);

    -- Signup trigger is fired by the auth service, not by a signed-in browser session.
    IF fn.function_name = 'handle_new_user' THEN
      keep_for_signed_in := false;
    END IF;

    EXECUTE format(
      'REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon',
      fn.function_name,
      fn.args
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role',
      fn.function_name,
      fn.args
    );

    IF keep_for_signed_in THEN
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated',
        fn.function_name,
        fn.args
      );
    ELSE
      EXECUTE format(
        'REVOKE ALL ON FUNCTION public.%I(%s) FROM authenticated',
        fn.function_name,
        fn.args
      );
    END IF;

    IF fn.function_name = 'handle_new_user' THEN
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION public.%I(%s) TO supabase_auth_admin',
        fn.function_name,
        fn.args
      );
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Replace blanket write access with the access the app actually uses.
-- The old policies are altered, not removed.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'users_signed_in_can_read_profiles'
  ) THEN
    CREATE POLICY users_signed_in_can_read_profiles
      ON public.users
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'leagues' AND policyname = 'leagues_creator_can_insert'
  ) THEN
    CREATE POLICY leagues_creator_can_insert
      ON public.leagues
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = creator_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'leagues' AND policyname = 'leagues_members_can_update'
  ) THEN
    CREATE POLICY leagues_members_can_update
      ON public.leagues
      FOR UPDATE
      TO authenticated
      USING (
        auth.uid() = creator_id
        OR auth.uid() = ANY (COALESCE(member_ids, ARRAY[]::uuid[]))
      )
      WITH CHECK (
        auth.uid() = creator_id
        OR auth.uid() = ANY (COALESCE(member_ids, ARRAY[]::uuid[]))
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'lineups' AND policyname = 'lineups_owner_can_insert'
  ) THEN
    CREATE POLICY lineups_owner_can_insert
      ON public.lineups
      FOR INSERT
      TO authenticated
      WITH CHECK (
        user_id = auth.uid()
        OR (
          bot_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.leagues
            WHERE leagues.id = lineups.league_id
              AND (
                auth.uid() = leagues.creator_id
                OR auth.uid() = ANY (COALESCE(leagues.member_ids, ARRAY[]::uuid[]))
              )
          )
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'lineups' AND policyname = 'lineups_owner_can_update'
  ) THEN
    CREATE POLICY lineups_owner_can_update
      ON public.lineups
      FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'teams' AND policyname = 'teams_owner_can_insert'
  ) THEN
    CREATE POLICY teams_owner_can_insert
      ON public.teams
      FOR INSERT
      TO authenticated
      WITH CHECK (
        user_id = auth.uid()
        OR (
          bot_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.leagues
            WHERE leagues.id = teams.league_id
              AND (
                auth.uid() = leagues.creator_id
                OR auth.uid() = ANY (COALESCE(leagues.member_ids, ARRAY[]::uuid[]))
              )
          )
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'teams' AND policyname = 'teams_owner_can_update'
  ) THEN
    CREATE POLICY teams_owner_can_update
      ON public.teams
      FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coin_transactions' AND policyname = 'coin_transactions_owner_can_insert'
  ) THEN
    CREATE POLICY coin_transactions_owner_can_insert
      ON public.coin_transactions
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coin_transactions' AND policyname = 'coin_transactions_owner_can_read'
  ) THEN
    CREATE POLICY coin_transactions_owner_can_read
      ON public.coin_transactions
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id OR bot_id IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'league_coin_balances' AND policyname = 'league_coin_balances_owner_can_read'
  ) THEN
    CREATE POLICY league_coin_balances_owner_can_read
      ON public.league_coin_balances
      FOR SELECT
      TO authenticated
      USING (
        auth.uid() = user_id
        OR EXISTS (
          SELECT 1
          FROM public.leagues
          WHERE leagues.id = league_coin_balances.league_id
            AND (
              auth.uid() = leagues.creator_id
              OR auth.uid() = ANY (COALESCE(leagues.member_ids, ARRAY[]::uuid[]))
            )
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'league_coin_balances' AND policyname = 'league_coin_balances_owner_can_update'
  ) THEN
    CREATE POLICY league_coin_balances_owner_can_update
      ON public.league_coin_balances
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'bots',
    'chess_players',
    'coin_transactions',
    'league_coin_balances',
    'leagues',
    'lineups',
    'marketplace_turns',
    'teams',
    'users'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = tbl
        AND policyname = 'Enable all operations for all users'
    ) THEN
      IF tbl = 'users' THEN
        EXECUTE
          'ALTER POLICY "Enable all operations for all users" ON public.users USING (auth.uid() = id) WITH CHECK (auth.uid() = id)';
      ELSE
        EXECUTE format(
          'ALTER POLICY "Enable all operations for all users" ON public.%I USING (false) WITH CHECK (false)',
          tbl
        );
      END IF;
    END IF;
  END LOOP;

  -- These write policies are literal "true", which the linter flags, but draft
  -- ownership updates still run as the signed-in user. Require a real session
  -- instead of leaving them open to everyone.
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'chess_players'
      AND policyname = 'Authenticated users can update chess_players'
  ) THEN
    ALTER POLICY "Authenticated users can update chess_players"
      ON public.chess_players
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'chess_players'
      AND policyname = 'System can insert chess_players'
  ) THEN
    ALTER POLICY "System can insert chess_players"
      ON public.chess_players
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
