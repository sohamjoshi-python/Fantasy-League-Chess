/**
 * Browser Debug Script for Discord Data
 * Run this in the browser console on your league page
 */

async function debugDiscordData() {
  console.log('🔍 Debugging Discord Data in Browser...');
  console.log('=' .repeat(50));
  
  try {
    // Get the current league ID from the URL
    const leagueId = window.location.pathname.split('/').pop();
    
    console.log('Current League ID:', leagueId);
    
    // Try to access Supabase client from the React app
    let supabase = null;
    
    // Method 1: Try to get it from the React app's global scope
    if (window.supabase) {
      supabase = window.supabase;
      console.log('✅ Found Supabase client in window.supabase');
    } else if (window.__SUPABASE__) {
      supabase = window.__SUPABASE__;
      console.log('✅ Found Supabase client in window.__SUPABASE__');
    } else {
      // Method 2: Try to access it from the React component
      console.log('🔍 Looking for Supabase client in React app...');
      
      // Check if we can access it through the React dev tools
      const reactRoot = document.querySelector('#root');
      if (reactRoot && reactRoot._reactInternalFiber) {
        console.log('✅ Found React root, trying to access Supabase...');
      }
      
      // Method 3: Create a temporary Supabase client
      console.log('🔧 Creating temporary Supabase client...');
      
      // Try to get the URL and key from the page
      const scripts = document.querySelectorAll('script');
      let supabaseUrl = null;
      let supabaseKey = null;
      
      for (const script of scripts) {
        if (script.textContent && script.textContent.includes('VITE_SUPABASE_URL')) {
          const urlMatch = script.textContent.match(/VITE_SUPABASE_URL["']?\s*:\s*["']([^"']+)["']/);
          const keyMatch = script.textContent.match(/VITE_SUPABASE_ANON_KEY["']?\s*:\s*["']([^"']+)["']/);
          
          if (urlMatch) supabaseUrl = urlMatch[1];
          if (keyMatch) supabaseKey = keyMatch[1];
        }
      }
      
      if (supabaseUrl && supabaseKey) {
        console.log('✅ Found Supabase credentials in page');
        
        // Import Supabase client dynamically
        try {
          const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.38.4');
          supabase = createClient(supabaseUrl, supabaseKey);
          console.log('✅ Created temporary Supabase client');
        } catch (importError) {
          console.error('❌ Failed to import Supabase client:', importError);
        }
      } else {
        console.log('❌ Could not find Supabase credentials');
        console.log('Please check the page source for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
        return;
      }
    }
    
    if (!supabase) {
      console.error('❌ No Supabase client available');
      return;
    }
    
    // Get the league data
    const { data: league, error } = await supabase
      .from('leagues')
      .select('id, name, discord_server_id, discord_invite_link, created_at')
      .eq('id', leagueId)
      .single();
    
    if (error) {
      console.error('❌ Error fetching league:', error);
      return;
    }
    
    console.log('📋 League Data:');
    console.log('   Name:', league.name);
    console.log('   ID:', league.id);
    console.log('   Discord Server ID:', league.discord_server_id || '❌ Missing');
    console.log('   Discord Invite Link:', league.discord_invite_link || '❌ Missing');
    console.log('   Created:', league.created_at);
    
    if (league.discord_server_id && league.discord_invite_link) {
      console.log('   ✅ Discord data present');
    } else {
      console.log('   ❌ Discord data missing');
      
      // Test creating Discord channel
      console.log('\n🧪 Testing Discord channel creation...');
      
      try {
        const response = await supabase.functions.invoke('discord-bot', {
          body: {
            action: 'create_league_channel',
            leagueName: league.name,
            leagueId: league.id
          }
        });
        
        console.log('Discord bot response:', response);
        
        if (response.data && response.data.success) {
          console.log('✅ Discord channel created successfully!');
          
          // Refresh the page to see the new Discord link
          console.log('🔄 Refreshing page to show Discord link...');
          window.location.reload();
        } else {
          console.log('❌ Failed to create Discord channel:', response.error);
        }
      } catch (error) {
        console.error('❌ Error testing Discord creation:', error);
      }
    }
    
  } catch (error) {
    console.error('❌ Error in debug function:', error);
  }
}

// Instructions
console.log('🔧 Discord Data Debug Script');
console.log('=' .repeat(50));
console.log('');
console.log('To run this debug script:');
console.log('1. Open your browser console (F12)');
console.log('2. Navigate to a league page');
console.log('3. Copy and paste this entire script');
console.log('4. Press Enter to run');
console.log('');
console.log('This will:');
console.log('- Check if Discord data exists for the current league');
console.log('- Test creating a Discord channel if missing');
console.log('- Show detailed information about the league');
console.log('');

// Run the debug function
debugDiscordData(); 