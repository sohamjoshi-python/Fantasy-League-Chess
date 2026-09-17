import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key (bypasses RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { botId, leagueId } = await req.json()

    if (!botId || !leagueId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing botId or leagueId" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      )
    }

    console.log(`Processing bot marketplace turn for bot ${botId} in league ${leagueId}`)

    // Get league info for marketplace order and turn logic
    const { data: league, error: leagueError } = await supabase
      .from("leagues")
      .select("id, marketplace_order, current_marketplace_turn, marketplace_completed, member_ids")
      .eq("id", leagueId)
      .single()

    if (leagueError || !league) {
      console.error("Failed to fetch league:", leagueError)
      return new Response(
        JSON.stringify({ success: false, error: leagueError || "No league found" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      )
    }

    console.log(`League found: ${league.id}, current turn: ${league.current_marketplace_turn}`)

    // Check if it's the bot's turn
    const currentMarketplaceUserId = league.marketplace_order[league.current_marketplace_turn]
    if (currentMarketplaceUserId !== botId) {
      console.log(`Not bot's turn. Current user: ${currentMarketplaceUserId}, Bot: ${botId}`)
      return new Response(
        JSON.stringify({ success: false, error: "Not bot's turn" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      )
    }

    console.log(`Bot's turn confirmed. Processing...`)

    // Get bot's coin balance
    const { data: botBalance, error: balanceError } = await supabase
      .from("league_coin_balances")
      .select("coin_balance")
      .eq("bot_id", botId)
      .eq("league_id", leagueId)
      .maybeSingle()

    if (balanceError || !botBalance) {
      console.error("Failed to fetch bot balance:", balanceError)
      return new Response(
        JSON.stringify({ success: false, error: "Failed to fetch bot balance" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      )
    }

    const botCoins = botBalance.coin_balance || 0
    console.log(`Bot has ${botCoins} coins`)

    // Check if bot has 0 coins - if so, remove from marketplace order
    if (botCoins <= 0) {
      console.log(`Bot has 0 coins, removing from marketplace order`)
      
      // Remove bot from marketplace order
      const newMarketplaceOrder = league.marketplace_order.filter(id => id !== botId)
      console.log(`New marketplace order: ${newMarketplaceOrder.length} participants`)
      
      // Check if marketplace order is now empty
      if (newMarketplaceOrder.length === 0) {
        console.log(`Marketplace order is empty, ending marketplace`)
        const { error: leagueUpdateError } = await supabase
          .from("leagues")
          .update({
            marketplace_completed: true,
            marketplace_order: []
          })
          .eq("id", leagueId)
        
        if (leagueUpdateError) {
          console.error("Failed to end marketplace:", leagueUpdateError)
          return new Response(
            JSON.stringify({ success: false, error: leagueUpdateError }),
            { 
              status: 500, 
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            }
          )
        }
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            action: "removed_zero_coins", 
            reason: "Bot removed from marketplace due to 0 coins, marketplace ended",
            newMarketplaceOrder: [],
            marketplaceCompleted: true
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        )
      }
      
      // Update league with new marketplace order
      const { error: leagueUpdateError } = await supabase
        .from("leagues")
        .update({
          marketplace_order: newMarketplaceOrder
        })
        .eq("id", leagueId)
      
      if (leagueUpdateError) {
        console.error("Failed to update marketplace order:", leagueUpdateError)
        return new Response(
          JSON.stringify({ success: false, error: leagueUpdateError }),
          { 
            status: 500, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        )
      }
      
      // Record the removal action
      const { error: turnError } = await supabase
        .from("marketplace_turns")
        .insert({
          league_id: leagueId,
          bot_id: botId,
          turn_number: league.current_marketplace_turn,
          action_type: "removed",
          reason: "Zero coins"
        })

      if (turnError) {
        console.error("Failed to record marketplace turn:", turnError)
        // Continue anyway, this is not critical
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          action: "removed_zero_coins", 
          reason: "Bot removed from marketplace due to 0 coins",
          newMarketplaceOrder,
          marketplaceCompleted: false
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      )
    }

    // Get or create bot team
    let { data: team } = await supabase
      .from("teams")
      .select("id, player_ids")
      .eq("bot_id", botId)
      .eq("league_id", leagueId)
      .maybeSingle()

    if (!team) {
      console.log("Creating new team for bot")
      // Create a team for the bot
      const { data: newTeam, error: createError } = await supabase
        .from("teams")
        .insert({ 
          bot_id: botId, 
          league_id: leagueId, 
          player_ids: [],
          created_at: new Date().toISOString()
        })
        .select("id, player_ids")
        .single()
      
      if (createError) {
        console.error("Failed to create bot team:", createError)
        // If we can't create a team, just skip the turn
        const newMarketplaceTurn = league.current_marketplace_turn + 1
        const isMarketplaceComplete = newMarketplaceTurn >= league.marketplace_order.length
        const { error: leagueUpdateError } = await supabase
          .from("leagues")
          .update({
            current_marketplace_turn: newMarketplaceTurn,
            marketplace_completed: isMarketplaceComplete
          })
          .eq("id", leagueId)
        
        if (leagueUpdateError) {
          console.error("Failed to update league turn:", leagueUpdateError)
          return new Response(
            JSON.stringify({ success: false, error: leagueUpdateError }),
            { 
              status: 500, 
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            }
          )
        }
        return new Response(
          JSON.stringify({ success: true, action: "skip", reason: "Could not create team" }),
          { 
            status: 200, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        )
      }
      team = newTeam
      console.log("Bot team created successfully")
    }

    // Check if bot team is full
    if ((team.player_ids?.length || 0) >= 10) {
      console.log("Bot team is full, skipping turn")
      
      // Bot team is full, skip turn
      const newMarketplaceTurn = league.current_marketplace_turn + 1
      const isMarketplaceComplete = newMarketplaceTurn >= league.marketplace_order.length
      const { error: leagueUpdateError } = await supabase
        .from("leagues")
        .update({
          current_marketplace_turn: newMarketplaceTurn,
          marketplace_completed: isMarketplaceComplete
        })
        .eq("id", leagueId)
      
      if (leagueUpdateError) {
        console.error("Failed to update league turn:", leagueUpdateError)
        return new Response(
          JSON.stringify({ success: false, error: leagueUpdateError }),
          { 
            status: 500, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        )
      }
      
      // Record the skip action
      const { error: turnError } = await supabase
        .from("marketplace_turns")
        .insert({
          league_id: leagueId,
          bot_id: botId,
          turn_number: league.current_marketplace_turn,
          action_type: "skip",
          reason: "Team full"
        })

      if (turnError) {
        console.error("Failed to record marketplace turn:", turnError)
        // Continue anyway, this is not critical
      }
      
      return new Response(
        JSON.stringify({ success: true, action: "skip", reason: "Team is full" }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      )
    }

    // Get available chess players
    const { data: availablePlayers, error: playersError } = await supabase
      .from("chess_players")
      .select("*")
      .order("elo", { ascending: false })

    if (playersError) {
      console.error("Failed to fetch chess players:", playersError)
      return new Response(
        JSON.stringify({ success: false, error: "Failed to fetch chess players" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      )
    }

    // Get all teams in this league to see which players are already owned
    const { data: allTeams, error: teamsError } = await supabase
      .from("teams")
      .select("player_ids")
      .eq("league_id", leagueId)

    if (teamsError) {
      console.error("Failed to fetch teams:", teamsError)
      return new Response(
        JSON.stringify({ success: false, error: "Failed to fetch teams" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      )
    }

    // Create set of owned player IDs in this league
    const ownedPlayerIds = new Set()
    allTeams?.forEach(team => {
      team.player_ids?.forEach((id) => ownedPlayerIds.add(id))
    })

    // Filter out owned players and find the best affordable player
    const available = availablePlayers.filter(player => !ownedPlayerIds.has(player.id))
    console.log(`Found ${available.length} available players`)
    
    // Calculate player price based on ELO
    const calculatePlayerPrice = (elo) => {
      if (elo >= 3000) return 50      // World Champion level
      if (elo >= 2800) return 45      // Super GM level
      if (elo >= 2600) return 40      // GM level
      if (elo >= 2400) return 35      // IM level
      if (elo >= 2200) return 30      // FM level
      if (elo >= 2000) return 25      // Expert level
      if (elo >= 1800) return 20      // Class A
      if (elo >= 1600) return 15      // Class B
      if (elo >= 1400) return 10      // Class C
      return 5                         // Beginner
    }

    let selectedPlayer = null
    let selectedPrice = 0

    for (const player of available) {
      const price = calculatePlayerPrice(player.elo)
      if (price > botCoins) continue

      const { error: buyError } = await supabase
        .from("teams")
        .update({
          player_ids: [...(team.player_ids || []), player.id]
        })
        .eq("id", team.id)

      if (!buyError) {
        selectedPlayer = player
        selectedPrice = price
        break
      }

      const alreadyOwned = /already owned/i.test(String(buyError.message || "")) || buyError.code === "23505"
      if (alreadyOwned) {
        console.log(`Player ${player.name} was already taken, trying next`)
        continue
      }

      console.error("Failed to add player to bot team:", buyError)
      return new Response(
        JSON.stringify({ success: false, error: "Failed to add player to bot team" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      )
    }

    if (selectedPlayer && selectedPrice > 0) {
      console.log(`Bot will buy ${selectedPlayer.name} (ELO: ${selectedPlayer.elo}) for ${selectedPrice} coins`)
      
      // Deduct coins from bot
      const { error: balanceUpdateError } = await supabase
        .from("league_coin_balances")
        .update({
          coin_balance: botCoins - selectedPrice
        })
        .eq("bot_id", botId)
        .eq("league_id", leagueId)

      if (balanceUpdateError) {
        console.error("Failed to update bot balance:", balanceUpdateError)
        return new Response(
          JSON.stringify({ success: false, error: "Failed to update bot balance" }),
          { 
            status: 500, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        )
      }

      // Record the marketplace action
      const { error: turnError } = await supabase
        .from("marketplace_turns")
        .insert({
          league_id: leagueId,
          bot_id: botId,
          turn_number: league.current_marketplace_turn,
          action_type: "buy",
          player_id: selectedPlayer.id,
          price: selectedPrice
        })

      if (turnError) {
        console.error("Failed to record marketplace turn:", turnError)
        // Continue anyway, this is not critical
      }

      // Advance marketplace turn
      const newMarketplaceTurn = league.current_marketplace_turn + 1
      const isMarketplaceComplete = newMarketplaceTurn >= league.marketplace_order.length
      const { error: leagueUpdateError } = await supabase
        .from("leagues")
        .update({
          current_marketplace_turn: newMarketplaceTurn,
          marketplace_completed: isMarketplaceComplete
        })
        .eq("id", leagueId)

      if (leagueUpdateError) {
        console.error("Failed to update league turn:", leagueUpdateError)
        return new Response(
          JSON.stringify({ success: false, error: leagueUpdateError }),
          { 
            status: 500, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        )
      }

      console.log(`Bot turn completed successfully. New turn: ${newMarketplaceTurn}`)
      return new Response(
        JSON.stringify({ 
          success: true, 
          action: "buy", 
          player: selectedPlayer,
          price: selectedPrice,
          newBalance: botCoins - selectedPrice,
          newMarketplaceTurn,
          marketplaceCompleted: isMarketplaceComplete
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      )
    } else {
      console.log("Bot cannot afford any players, skipping turn")
      
      // Bot can't afford any players, skip turn
      const newMarketplaceTurn = league.current_marketplace_turn + 1
      const isMarketplaceComplete = newMarketplaceTurn >= league.marketplace_order.length
      const { error: leagueUpdateError } = await supabase
        .from("leagues")
        .update({
          current_marketplace_turn: newMarketplaceTurn,
          marketplace_completed: isMarketplaceComplete
        })
        .eq("id", leagueId)

      if (leagueUpdateError) {
        console.error("Failed to update league turn:", leagueUpdateError)
        return new Response(
          JSON.stringify({ success: false, error: leagueUpdateError }),
          { 
            status: 500, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        )
      }

      // Record the skip action
      const { error: turnError } = await supabase
        .from("marketplace_turns")
        .insert({
          league_id: leagueId,
          bot_id: botId,
          turn_number: league.current_marketplace_turn,
          action_type: "skip",
          reason: "Cannot afford any players"
        })

      if (turnError) {
        console.error("Failed to record marketplace turn:", turnError)
        // Continue anyway, this is not critical
      }

      console.log(`Bot turn skipped. New turn: ${newMarketplaceTurn}`)
      return new Response(
        JSON.stringify({ 
          success: true, 
          action: "skip", 
          reason: "Cannot afford any players",
          newMarketplaceTurn,
          marketplaceCompleted: isMarketplaceComplete
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      )
    }

  } catch (error) {
    console.error("Error in process-bot-marketplace-turn:", error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    )
  }
})