import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function distributeWeeklyCoins() {
  try {
    console.log('Starting weekly coin distribution...');

    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email');

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    // Get all bots
    const { data: bots, error: botsError } = await supabase
      .from('bots')
      .select('id, name');

    if (botsError) {
      throw new Error(`Failed to fetch bots: ${botsError.message}`);
    }

    console.log(`Found ${users.length} users and ${bots.length} bots`);

    // Distribute coins to users
    for (const user of users) {
      const { error } = await supabase.rpc('award_coins', {
        p_user_id: user.id,
        p_bot_id: null,
        p_amount: 50,
        p_transaction_type: 'weekly_award',
        p_description: 'Weekly coin distribution'
      });

      if (error) {
        console.error(`Failed to award coins to user ${user.email}:`, error);
      } else {
        console.log(`Awarded 50 coins to user: ${user.email}`);
      }
    }

    // Distribute coins to bots
    for (const bot of bots) {
      const { error } = await supabase.rpc('award_coins', {
        p_user_id: null,
        p_bot_id: bot.id,
        p_amount: 50,
        p_transaction_type: 'weekly_award',
        p_description: 'Weekly coin distribution'
      });

      if (error) {
        console.error(`Failed to award coins to bot ${bot.name}:`, error);
      } else {
        console.log(`Awarded 50 coins to bot: ${bot.name}`);
      }
    }

    console.log('Weekly coin distribution completed successfully!');
  } catch (error) {
    console.error('Error distributing weekly coins:', error);
    process.exit(1);
  }
}

// Run the distribution
distributeWeeklyCoins(); 