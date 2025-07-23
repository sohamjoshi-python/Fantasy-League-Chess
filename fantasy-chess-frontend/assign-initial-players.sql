-- Assign initial players to each user's team
-- This gives each user 10yers to start with (similar to the old draft system)

-- Step 1: Create a function to assign initial players
CREATE OR REPLACE FUNCTION assign_initial_players_to_user(
  p_user_id UUID,
  p_league_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_players_assigned INTEGER := 0;
  v_player_record RECORD;
BEGIN
  -- Get10andom players from marketplace for this league
  FOR v_player_record IN 
    SELECT 
      pm.id as marketplace_id,
      pm.player_username,
      pm.player_elo,
      pm.price
    FROM player_marketplace pm
    WHERE pm.league_id = p_league_id
      AND pm.seller_id IS NULL  -- System-owned players only
      AND pm.sold_at IS NULL    -- Not already sold
    ORDER BY RANDOM()
    LIMIT 10
  LOOP
    -- Add player to users team
    INSERT INTO user_players (
      user_id, 
      bot_id, 
      league_id, 
      player_username, 
      player_elo, 
      purchase_price, 
      purchased_at
    ) VALUES (
      p_user_id,
      NULL,  -- Not a bot
      p_league_id,
      v_player_record.player_username,
      v_player_record.player_elo,0,  -- Free initial assignment
      NOW()
    );

    -- Mark player as sold in marketplace
    UPDATE player_marketplace 
    SET sold_at = NOW()
    WHERE id = v_player_record.marketplace_id;

    v_players_assigned := v_players_assigned +1
  END LOOP;

  -- Record the transaction
  INSERT INTO coin_transactions (
    user_id, bot_id, league_id, amount, transaction_type, description
  ) VALUES (
    p_user_id, NULL, p_league_id,0bonus,   Assigned  ||v_players_assigned ||initial players to team
  );

  RETURN v_players_assigned;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step2gn initial players to all users in all leagues
DO $$
DECLARE
  v_user_record RECORD;
  v_players_assigned INTEGER;
BEGIN
  FOR v_user_record IN 
    SELECT DISTINCT
      u.id as user_id,
      l.id as league_id,
      l.name as league_name
    FROM users u
    JOIN league_members lm ON u.id = lm.user_id
    JOIN leagues l ON lm.league_id = l.id
    WHERE NOT EXISTS (
      SELECT 1 FROM user_players up 
      WHERE up.user_id = u.id AND up.league_id = l.id
    )
  LOOP
    v_players_assigned := assign_initial_players_to_user(v_user_record.user_id, v_user_record.league_id);
    RAISE NOTICE 'Assigned % players to user % in league %', v_players_assigned, v_user_record.user_id, v_user_record.league_name;
  END LOOP;
END $$;

-- Step 3: Verify the assignments
SELECT 
  l.name as league_name,
  u.email,
  COUNT(up.id) as players_assigned,
  STRING_AGG(up.player_username, ', ' ORDER BY up.player_elo DESC) as player_list
FROM leagues l
JOIN league_members lm ON l.id = lm.league_id
JOIN users u ON lm.user_id = u.id
LEFT JOIN user_players up ON u.id = up.user_id AND l.id = up.league_id
WHERE up.purchase_price = 0  -- Initial players only
GROUP BY l.id, l.name, u.id, u.email
ORDER BY l.name, u.email; 