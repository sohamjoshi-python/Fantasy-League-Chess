// Script to update existing leagues with Discord role IDs
import { createClient } from '@supabase/supabase-js';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SB_URL;
const supabaseServiceKey = process.env.SB_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateExistingLeagueRoles() {
  console.log('🔧 Updating existing leagues with Discord role IDs...\n');

  try {
    // Get all leagues with Discord channels but no role IDs
    const { data: leagues, error } = await supabase
      .from('leagues')
      .select('id, name, discord_server_id, discord_invite_link, discord_role_id')
      .not('discord_server_id', 'is', null)
      .is('discord_role_id', null);

    if (error) {
      console.error('❌ Error fetching leagues:', error);
      return;
    }

    console.log(`Found ${leagues.length} leagues without role IDs:`);
    leagues.forEach(league => {
      console.log(`- ${league.name} (Channel: ${league.discord_server_id})`);
    });
    console.log('');

    // For each league, we need to manually find the role ID
    // You'll need to check your Discord server and match channel IDs to role IDs
    console.log('📋 Manual Role ID Mapping Needed:');
    console.log('Please check your Discord server and map these channel IDs to role IDs:');
    
    leagues.forEach(league => {
      console.log(`League: ${league.name}`);
      console.log(`Channel ID: ${league.discord_server_id}`);
      console.log(`Expected Role Name: League-${league.id.slice(0, 8)}`);
      console.log(`Role ID: [MANUAL LOOKUP NEEDED]`);
      console.log('');
    });

    // Example of how to update once you have the role IDs:
    console.log('💡 To update a league, run SQL like this:');
    console.log('UPDATE leagues SET discord_role_id = \'ROLE_ID_HERE\' WHERE id = \'LEAGUE_ID_HERE\';');
    console.log('');

    // Check Discord API for all roles
    console.log('🔍 Checking Discord API for all roles...');
    const discordResponse = await fetch('https://discord.com/api/v10/guilds/' + process.env.DISCORD_MAIN_SERVER_ID + '/roles', {
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (discordResponse.ok) {
      const roles = await discordResponse.json();
      console.log('✅ All Discord roles:');
      roles.forEach(role => {
        if (role.name.startsWith('League-')) {
          console.log(`- ${role.name} (ID: ${role.id})`);
        }
      });
    } else {
      console.error('❌ Discord API error:', discordResponse.status, discordResponse.statusText);
    }

  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

// Run the script
updateExistingLeagueRoles().then(() => {
  console.log('\n🏁 Update script completed!');
  console.log('\n📋 Next Steps:');
  console.log('1. Check your Discord server for the role names');
  console.log('2. Match channel IDs to role IDs');
  console.log('3. Run SQL updates to fix the missing role IDs');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
}); 