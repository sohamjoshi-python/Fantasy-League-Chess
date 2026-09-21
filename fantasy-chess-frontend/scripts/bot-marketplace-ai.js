#!/usr/bin/env node

/**
 * Bot Marketplace AI Script
 * 
 * This script allows bots to automatically participate in the star points marketplace
 * by buying players strategically based on their ELO ratings and available star points.
 * 
 * Usage:
 * node scripts/bot-marketplace-ai.js [leagueId] [botId]
 * 
 * If no parameters are provided, it will process all bots in all active leagues.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SB_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function botMarketplaceAI() {
  try {
    console.log('Starting bot marketplace AI...');

    // Get all bots
    const { data: bots, error: botsError } = await supabase
      .from('bots')
      .select('id, name, coin_balance');

    if (botsError) {
      throw new Error(`Failed to fetch bots: ${botsError.message}`);
    }

    console.log(`Found ${bots.length} bots`);

    for (const bot of bots) {
      console.log(`Processing bot: ${bot.name} (${bot.coin_balance} coins)`);

      // Get available marketplace listings
      const { data: listings, error: listingsError } = await supabase
        .from('player_marketplace')
        .select('*')
        .is('sold_at', null)
        .order('player_elo', { ascending: false }); // Highest ELO first

      if (listingsError) {
        console.error(`Failed to fetch marketplace listings for bot ${bot.name}:`, listingsError);
        continue;
      }

      if (listings.length === 0) {
        console.log(`No marketplace listings available for bot ${bot.name}`);
        continue;
      }

      // Bot buying strategy: Buy the highest ELO player they can afford
      let purchased = false;
      for (const listing of listings) {
        if (listing.price <= bot.coin_balance && listing.price > 0) {
          console.log(`Bot ${bot.name} attempting to buy ${listing.player_username} for ${listing.price} coins`);

          const { data, error } = await supabase.rpc('buy_player_from_marketplace', {
            p_marketplace_id: listing.id,
            p_buyer_id: null,
            p_buyer_bot_id: bot.id
          });

          if (error) {
            console.error(`Failed to purchase ${listing.player_username} for bot ${bot.name}:`, error);
            continue;
          }

          if (data) {
            console.log(`Bot ${bot.name} successfully purchased ${listing.player_username} for ${listing.price} coins`);
            purchased = true;
            break; // Only buy one player per run
          }
        }
      }

      if (!purchased) {
        console.log(`Bot ${bot.name} couldn't afford any players or no suitable players available`);
      }
    }

    console.log('Bot marketplace AI completed successfully!');
  } catch (error) {
    console.error('Error running bot marketplace AI:', error);
    process.exit(1);
  }
}

// Run the bot AI
botMarketplaceAI(); 