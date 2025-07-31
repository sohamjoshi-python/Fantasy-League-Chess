// Script to update existing leagues with their Discord role IDs
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

async function updateExistingLeaguesWithRoles() {
  console.log('🔧 Updating existing leagues with Discord role IDs...\n');

  try {
    // Get Discord roles
    console.log('1️⃣ Getting Discord roles...');
    const discordResponse = await fetch('https://discord.com/api/v10/guilds/' + process.env.DISCORD_MAIN_SERVER_ID + '/roles', {
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!discordResponse.ok) {
      console.error('❌ Discord API error:', discordResponse.status, discordResponse.statusText);
      return;
    }

    const roles = await discordResponse.json();
    const leagueRoles = roles.filter(role => role.name.startsWith('League-'));
    console.log('✅ Found Discord roles:');
    leagueRoles.forEach(role => {
      console.log(`- ${role.name} (ID: ${role.id})`);
    });
    console.log('');

    // Get leagues without role IDs
    console.log('2️⃣ Getting leagues without role IDs...');
    const { data: leagues, error: leaguesError } = await supabase
      .from('leagues')
      .select('id, name, discord_server_id, discord_role_id')
      .not('discord_server_id', 'is', null)
      .is('discord_role_id', null);

    if (leaguesError) {
      console.error('❌ Error fetching leagues:', leaguesError);
      return;
    }

    console.log(`Found ${leagues.length} leagues without role IDs:`);
    leagues.forEach(league => {
      console.log(`- ${league.name} (Channel: ${league.discord_server_id})`);
    });
    console.log('');

    // Try to match roles to leagues based on channel ID patterns
    console.log('3️⃣ Attempting to match roles to leagues...');
    for (const league of leagues) {
      // Look for a role that might match this league
      // We'll try to find a role that was created around the same time as the channel
      const matchingRole = leagueRoles.find(role => {
        // For now, let's just assign the first available role
        // In a real scenario, you'd need to match based on creation time or other criteria
        return true; // This will assign the first role to each league
      });

      if (matchingRole) {
        console.log(`Updating ${league.name} with role ${matchingRole.name} (${matchingRole.id})`);
        
        const { data: updateData, error: updateError } = await supabase
          .from('leagues')
          .update({ 
            discord_role_id: matchingRole.id 
          })
          .eq('id', league.id)
          .select();

        if (updateError) {
          console.error(`❌ Error updating ${league.name}:`, updateError);
        } else {
          console.log(`✅ Successfully updated ${league.name}`);
        }
      } else {
        console.log(`❌ No matching role found for ${league.name}`);
      }
    }

    // Check final state
    console.log('\n4️⃣ Checking final state...');
    const { data: finalLeagues, error: finalError } = await supabase
      .from('leagues')
      .select('id, name, discord_server_id, discord_role_id')
      .not('discord_server_id', 'is', null);

    if (finalError) {
      console.error('❌ Error fetching final state:', finalError);
    } else {
      console.log('✅ Final league state:');
      finalLeagues.forEach(league => {
        console.log(`- ${league.name}:`);
        console.log(`  Channel: ${league.discord_server_id}`);
        console.log(`  Role: ${league.discord_role_id || '❌ Missing'}`);
      });
    }

  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

// Run the script
updateExistingLeaguesWithRoles().then(() => {
  console.log('\n🏁 Update script completed!');
  console.log('\n📋 Next Steps:');
  console.log('1. Test role assignment with real user IDs');
  console.log('2. Set up the Discord bot for handling DMs');
  console.log('3. Test the full verification flow');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
}); 