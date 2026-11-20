-- The linter warns when a signed-in user can call a SECURITY DEFINER function
-- through the public API. The functions stay. They move to a schema the API
-- does not expose, and public keeps a normal wrapper with the same name so the
-- app and scheduled jobs can still call them.

CREATE SCHEMA IF NOT EXISTS app_private;

REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
GRANT USAGE ON SCHEMA app_private TO authenticated, service_role, supabase_auth_admin;

DO $migrate$
DECLARE
  fn record;
  sig text;
  call_args text;
  stmt text;
  names text[];
  modes "char"[];
  all_types oid[];
  i integer;
  mode text;
BEGIN
  FOR fn IN
    SELECT
      p.oid,
      p.proname,
      p.pronargs,
      p.proretset,
      p.proargnames,
      p.proargmodes,
      p.proallargtypes,
      p.proargtypes,
      pg_get_function_identity_arguments(p.oid) AS ident_args,
      pg_get_function_result(p.oid) AS result_type
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.proname = ANY (ARRAY[
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
        'dispatch_marketplace_turn_emails_from_league',
        'equip_avatar',
        'get_current_marketplace_turn',
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
        'sync_league_player_ownership',
        'user_is_league_participant',
        'withdraw_from_marketplace_draft'
      ])
  LOOP
    EXECUTE format(
      'ALTER FUNCTION public.%I(%s) SET SCHEMA app_private',
      fn.proname,
      fn.ident_args
    );

    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION app_private.%I(%s) TO authenticated, service_role',
      fn.proname,
      fn.ident_args
    );

    -- Trigger functions are not API endpoints. The trigger keeps the same function.
    IF fn.result_type = 'trigger' THEN
      CONTINUE;
    END IF;

    sig := '';
    call_args := '';
    names := fn.proargnames;
    modes := fn.proargmodes;

    IF fn.proallargtypes IS NOT NULL THEN
      all_types := fn.proallargtypes;
    ELSIF fn.pronargs > 0 THEN
      all_types := string_to_array(fn.proargtypes::text, ' ')::oid[];
    ELSE
      all_types := ARRAY[]::oid[];
    END IF;

    IF names IS NOT NULL THEN
      FOR i IN 1..array_length(names, 1) LOOP
        mode := CASE WHEN modes IS NULL THEN 'i' ELSE modes[i]::text END;
        IF mode IN ('i', 'b', 'v') AND names[i] IS NOT NULL AND names[i] <> '' THEN
          IF sig <> '' THEN
            sig := sig || ', ';
            call_args := call_args || ', ';
          END IF;
          sig := sig || format('%I %s', names[i], format_type(all_types[i], NULL));
          call_args := call_args || quote_ident(names[i]);
        END IF;
      END LOOP;
    END IF;

    IF fn.result_type = 'void' THEN
      stmt := format('PERFORM app_private.%I(%s);', fn.proname, call_args);
    ELSIF fn.proretset THEN
      stmt := format('RETURN QUERY SELECT * FROM app_private.%I(%s);', fn.proname, call_args);
    ELSE
      stmt := format('RETURN app_private.%I(%s);', fn.proname, call_args);
    END IF;

    EXECUTE format(
      $sql$
        CREATE FUNCTION public.%I(%s)
        RETURNS %s
        LANGUAGE plpgsql
        SECURITY INVOKER
        SET search_path = app_private, public, extensions
        AS $body$
        BEGIN
          %s
        END;
        $body$
      $sql$,
      fn.proname,
      sig,
      fn.result_type,
      stmt
    );

    EXECUTE format(
      'REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon',
      fn.proname,
      fn.ident_args
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated, service_role',
      fn.proname,
      fn.ident_args
    );
  END LOOP;
END
$migrate$;

NOTIFY pgrst, 'reload schema';
