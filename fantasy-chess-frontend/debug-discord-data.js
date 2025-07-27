#!/usr/bin/env node

/**
 * Debug Discord Data
 * Checks if Discord data is being saved and retrieved correctly
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load environment variables
const envPath = path.join(process.cwd(), '.env');
let envVars = {};

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      envVars[key.trim()] = value.trim();
    }
  });
}

const SUPABASE_URL = envVars.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function debugDiscordData() {
  console.log('🔍 Debugging Discord Data...');
  console.log('=' .repeat(50));
  
  try {
    // Get all leagues with Discord data
    console.log('\n📋 Checking all leagues for Discord data...');
    
    const { data: leagues, error: leaguesError } = await supabase
      .from('leagues')
      .select('id, name, discord_server_id, discord_invite_link, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (leaguesError) {
      console.error('❌ Error fetching leagues:', leaguesError);
      return;
    }
    
    console.log(`Found ${leagues.length} leagues:`);
    
    leagues.forEach((league, index) => {
      console.log(`\n${index + 1}. League: ${league.name}`);
      console.log(`   ID: ${league.id}`);
      console.log(`   Discord Server ID: ${league.discord_server_id || '❌ Missing'}`);
      console.log(`   Discord Invite Link: ${league.discord_invite_link || '❌ Missing'}`);
      console.log(`   Created: ${league.created_at}`);
      
      if (league.discord_server_id && league.discord_invite_link) {
        console.log(`   ✅ Discord data present`);
      } else {
        console.log(`   ❌ Discord data missing`);
      }
    });
    
    // Check if there are any leagues with partial Discord data
    const partialDiscord = leagues.filter(league => 
      (league.discord_server_id && !league.discord_invite_link) ||
      (!league.discord_server_id && league.discord_invite_link)
    );
    
    if (partialDiscord.length > 0) {
      console.log('\n⚠️  Leagues with partial Discord data:');
      partialDiscord.forEach(league => {
        console.log(`   - ${league.name}: server_id=${!!league.discord_server_id}, invite_link=${!!league.discord_invite_link}`);
      });
    }
    
    // Test creating a Discord channel for a league without Discord data
    const leagueWithoutDiscord = leagues.find(league => !league.discord_server_id && !league.discord_invite_link);
    
    if (leagueWithoutDiscord) {
      console.log(`\n🧪 Testing Discord channel creation for: ${leagueWithoutDiscord.name}`);
      
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/discord-bot`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'create_league_channel',
            leagueName: leagueWithoutDiscord.name,
            leagueId: leagueWithoutDiscord.id
          })
        });
        
        const result = await response.json();
        console.log('Discord bot response:', result);
        
        if (response.ok && result.success) {
          console.log('✅ Discord channel created successfully!');
          
          // Check if the data was saved to the database
          const { data: updatedLeague } = await supabase
            .from('leagues')
            .select('discord_server_id, discord_invite_link')
            .eq('id', leagueWithoutDiscord.id)
            .single();
          
          console.log('Updated league data:', updatedLeague);
        } else {
          console.log('❌ Failed to create Discord channel:', result);
        }
      } catch (error) {
        console.error('❌ Error testing Discord creation:', error);
      }
    }
    
  } catch (error) {
    console.error('❌ Error in debug function:', error);
  }
}

debugDiscordData().catch(console.error); 