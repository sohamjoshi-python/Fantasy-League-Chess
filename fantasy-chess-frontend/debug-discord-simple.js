/**
 * Simple Discord Debug Script
 * Uses existing debug functions in the frontend
 */

async function debugDiscordSimple() {
  console.log('🔍 Simple Discord Debug...');
  console.log('=' .repeat(50));
  
  try {
    // Use the existing debug function to get all leagues
    console.log('📋 Getting all leagues...');
    const { data: leagues, error } = await window.debugGetLeagues();
    
    if (error) {
      console.error('❌ Error fetching leagues:', error);
      return;
    }
    
    console.log(`Found ${leagues.length} leagues:`);
    
    // Find the current league by URL
    const currentLeagueId = window.location.pathname.split('/').pop();
    console.log('Current League ID from URL:', currentLeagueId);
    
    const currentLeague = leagues.find(league => league.id === currentLeagueId);
    
    if (currentLeague) {
      console.log('\n📋 Current League Data:');
      console.log('   Name:', currentLeague.name);
      console.log('   ID:', currentLeague.id);
      console.log('   Discord Server ID:', currentLeague.discord_server_id || '❌ Missing');
      console.log('   Discord Invite Link:', currentLeague.discord_invite_link || '❌ Missing');
      
      if (currentLeague.discord_server_id && currentLeague.discord_invite_link) {
        console.log('   ✅ Discord data present');
      } else {
        console.log('   ❌ Discord data missing');
        
        // Try to create Discord channel
        console.log('\n🧪 Creating Discord channel...');
        
        try {
          // Use the existing Supabase session
          const session = await window.getSupabaseSession();
          console.log('Session available:', !!session);
          
          // Try to invoke the Discord bot function
          const response = await fetch('/api/functions/v1/discord-bot', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}`
            },
            body: JSON.stringify({
              action: 'create_league_channel',
              leagueName: currentLeague.name,
              leagueId: currentLeague.id
            })
          });
          
          const result = await response.json();
          console.log('Discord bot response:', result);
          
          if (response.ok && result.success) {
            console.log('✅ Discord channel created!');
            console.log('🔄 Refreshing page...');
            window.location.reload();
          } else {
            console.log('❌ Failed to create Discord channel:', result);
          }
        } catch (error) {
          console.error('❌ Error creating Discord channel:', error);
        }
      }
    } else {
      console.log('❌ Current league not found in database');
    }
    
    // Show all leagues with Discord data
    console.log('\n📊 All Leagues Discord Status:');
    leagues.forEach((league, index) => {
      const hasDiscord = league.discord_server_id && league.discord_invite_link;
      console.log(`${index + 1}. ${league.name}: ${hasDiscord ? '✅' : '❌'} Discord`);
    });
    
  } catch (error) {
    console.error('❌ Error in debug function:', error);
  }
}

// Instructions
console.log('🔧 Simple Discord Debug Script');
console.log('=' .repeat(50));
console.log('');
console.log('This script uses existing debug functions in the app');
console.log('Make sure you are on a league page');
console.log('');

// Run the debug function
debugDiscordSimple(); 