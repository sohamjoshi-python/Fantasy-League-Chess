-- Ending a turn with only one other manager left must close the snake draft.
-- Unique remaining participants < 2 means the turn-based marketplace is over.

CREATE OR REPLACE FUNCTION public.withdraw_from_marketplace_draft(p_league_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_id uuid;
    league_row public.leagues%ROWTYPE;
    old_order uuid[];
    new_order uuid[] := ARRAY[]::uuid[];
    withdrawn uuid[];
    old_turn integer;
    new_turn integer := 0;
    old_picker uuid;
    new_picker uuid;
    order_len integer;
    i integer;
    remaining_unique integer := 0;
    completed boolean := false;
BEGIN
    caller_id := auth.uid();
    IF caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO league_row
    FROM public.leagues
    WHERE id = p_league_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'League not found';
    END IF;

    IF COALESCE(league_row.marketplace_started, false) = false
       OR COALESCE(league_row.marketplace_completed, false) = true THEN
        RAISE EXCEPTION 'Draft is not active';
    END IF;

    old_order := COALESCE(league_row.marketplace_order, ARRAY[]::uuid[]);
    order_len := COALESCE(array_length(old_order, 1), 0);
    IF order_len = 0 OR NOT (caller_id = ANY (old_order)) THEN
        RAISE EXCEPTION 'You are not in this draft';
    END IF;

    old_turn := GREATEST(COALESCE(league_row.current_marketplace_turn, 0), 0);
    old_picker := old_order[old_turn + 1];

    FOR i IN 1..order_len LOOP
        IF old_order[i] IS NOT DISTINCT FROM caller_id THEN
            CONTINUE;
        END IF;
        new_order := new_order || old_order[i];
        IF i <= old_turn THEN
            new_turn := new_turn + 1;
        END IF;
    END LOOP;

    remaining_unique := COALESCE((
        SELECT COUNT(DISTINCT participant_id)
        FROM unnest(new_order) AS participant_id
    ), 0);

    IF remaining_unique < 2 THEN
        new_turn := 0;
        completed := true;
        new_picker := NULL;
    ELSIF new_turn >= COALESCE(array_length(new_order, 1), 0) THEN
        completed := true;
        new_picker := NULL;
    ELSE
        new_picker := new_order[new_turn + 1];
    END IF;

    withdrawn := COALESCE(league_row.marketplace_withdrawn_ids, ARRAY[]::uuid[]);
    IF NOT (caller_id = ANY (withdrawn)) THEN
        withdrawn := withdrawn || caller_id;
    END IF;

    UPDATE public.leagues
    SET marketplace_order = new_order,
        current_marketplace_turn = new_turn,
        marketplace_withdrawn_ids = withdrawn,
        marketplace_completed = CASE WHEN completed THEN true ELSE marketplace_completed END,
        draft_completed = CASE WHEN completed THEN true ELSE draft_completed END,
        marketplace_turn_email_sent_for = CASE
            WHEN new_picker IS DISTINCT FROM old_picker THEN NULL
            ELSE marketplace_turn_email_sent_for
        END
    WHERE id = p_league_id;

    IF NOT completed AND new_picker IS NOT NULL AND new_picker IS DISTINCT FROM old_picker THEN
        BEGIN
            PERFORM public.dispatch_marketplace_turn_emails(p_league_id);
        EXCEPTION WHEN undefined_function THEN
            NULL;
        END;
    END IF;

    RETURN jsonb_build_object(
        'marketplace_order', to_jsonb(new_order),
        'current_marketplace_turn', new_turn,
        'marketplace_completed', completed
    );
END;
$$;
